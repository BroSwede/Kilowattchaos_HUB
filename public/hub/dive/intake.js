// How it works: the intake and the ball path. Soft wheels grab a ball off the floor, a ramp carries it up,
// and a servo lets one ball at a time reach the flywheel.
// Numbers match the Build zone sims: a 76 mm ball, 48 mm gecko wheels, a 117 rpm motor geared 5 times faster.
import { THREE, C, mat, metal, plastic, mesh, cyl, box, group, tube, gearGeo, curveOf, clamp, lerp, smooth, TAU } from './kit.js';
import { miniBot } from './works.js';
import { miniMotor } from './motor.js';
import { BALL, RECOVER, flywheel, gameBall, arcBand } from './launcher.js';

const U = 1 / 20, RB = (BALL / 2) * U; // scene units per millimetre, and the ball's radius in the scene
const deg = (d) => (d * Math.PI) / 180;
const MOTOR_RPM = 117; // 50.9:1 Yellow Jacket, free speed
const rim = (rpm, d) => (Math.PI * (d / 1000) * rpm) / 60;
// The same bands as the Compression explorer in the Build zone. `c` is millimetres of squeeze.
export function squeeze(c) {
  if (c <= 3) return { key: 'slip', name: 'Slips', text: 'The wheel barely touches the ball, so it rolls off instead of coming in.' };
  if (c <= 8) return { key: 'light', name: 'Light grip', text: 'Fine for one ball at a time, weak on a pile.' };
  if (c <= 16) return { key: 'good', name: 'Good grip', text: 'A solid place to start. Test it on real balls: softer ones need less squeeze.' };
  if (c <= 22) return { key: 'tight', name: 'Very tight', text: 'It grips hard, but the motor works harder and balls can stall halfway.' };
  return { key: 'jam', name: 'Jams', text: 'The ball cannot get through, and the motor strains.' };
}

// ---- A gecko-style wheel: a soft rim held by thin bendy fins. Axle along Z.
export function geckoWheel(R = 1.2, w = 0.75, color = C.teal) {
  const spin = group(), soft = mat(color, { rough: 0.7 });
  spin.add(arcBand(R * 0.88, R, 0, TAU, w, soft), cyl(R * 0.36, w, soft, { axis: 'z', seg: 24 }), cyl(R * 0.2, w * 1.25, metal(C.steel, 0.3), { axis: 'z', seg: 6 }));
  const fin = box(R * 0.58, R * 0.06, w * 0.96, soft, { r: 0 });
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU, f = fin.clone();
    f.position.set(Math.cos(a) * R * 0.62, Math.sin(a) * R * 0.62, 0);
    f.rotation.z = a + 0.5;
    spin.add(f);
  }
  return { g: group(spin), spin, R };
}

export default function intake() {
  // ------------------------------------------------------------ 1. The squeeze
  const grab = {
    id: 'grab', tab: 'The squeeze',
    title: 'Grip comes from squeezing the ball',
    big: 'An intake only pulls a ball in if it squeezes it a little: too loose slips, too tight jams.',
    lead: 'The gap under the intake wheel is a bit <b>smaller than the ball</b>, so the ball has to squash to fit. That squash is called <b>compression</b>, and it gives the wheel grip. Too little and it slips. Too much and it jams.',
    real: 'Our intake uses soft 48 mm gecko wheels, geared to spin 5 times faster than the motor.',
    try: 'Slide the gap from wide to narrow and find where the ball comes in best.',
    fixed: { ig_pow: 100 },
    controls: [
      { id: 'ig_gap', label: 'Gap under the wheel', min: 50, max: 80, step: 1, value: 64, unit: ' mm' },
    ],
    readouts: [['ig_c', 'Squeeze', 'ball 76 mm − gap'], ['ig_g', 'Grip']],
    more: [
      ['Why soft wheels?', 'A soft wheel squashes too, so the squeeze is shared and small mistakes in the gap matter less. It also wraps around the ball a little, which gives more rubber touching the ball.'],
      ['Is this a law?', 'No, a rule of thumb. Real balls vary, wheels wear, and a pile of balls behaves differently from one. Build it adjustable and test on real balls.'],
    ],
    build(st, S, ui) {
      const floor = box(26, 0.3, 7, mat('#8D9391', { rough: 0.9 }), { r: 0.05, pos: [0, -0.15, 0] });
      const wheel = geckoWheel(1.2, 1.5);
      const arm = group(); // everything that moves up and down with the gap
      const plate = box(7.5, 5.2, 0.25, metal(C.alu, 0.42), { r: 0.06, pos: [1.6, 1.4, -1.6] });
      const small = mesh(gearGeo({ teeth: 20, pitchR: 0.5, m: 0.05, width: 0.3, bore: 0.16, hex: true }), metal('#C3C8CA', 0.32), [0, 0, -1.25]);
      const big = mesh(gearGeo({ teeth: 100, pitchR: 2.5, m: 0.05, width: 0.3, bore: 0.2 }), metal(C.brass, 0.35), [2.4, 1.8, -1.25]);
      const mm = miniMotor(0.42, 1.0, true);
      mm.g.rotation.y = -Math.PI / 2;
      mm.g.position.set(2.4, 1.8, -3.9);
      arm.add(plate, wheel.g, small, big, mm.g, cyl(0.2, 3.4, metal(C.steel, 0.3), { axis: 'z', seg: 6, pos: [0, 0, -0.5] }));
      const sq = group(), spin = gameBall(RB);
      sq.add(spin);
      st.add(floor, arm, sq);
      const lg = st.label('Gap', new THREE.Vector3(-3.4, 1.6, 1));
      st.label('100 teeth on the motor', big, { off: new THREE.Vector3(1.2, 2.9, 0) });
      st.label('20 teeth on the shaft: 5× faster', small, { off: new THREE.Vector3(-3.2, 1.8, 0) });
      const lb = st.label('Ball', sq, { dy: 46 });
      const gapBar = box(0.12, 1, 0.12, mat(C.volt, { glow: true, glowPower: 0.6 }), { r: 0 });
      gapBar.userData.noShadow = true;
      st.add(gapBar);
      const SLOW = 10, R = 1.2;
      let x = 9, roll = 0, stuck = 0, turn = 0;
      return {
        view: { pos: [2, 5, 28], target: [0.8, 3.7, 0] },
        groundY: -0.3,
        handles: [{ id: 'ig_gap', obj: wheel.g, hint: 'Drag up or down', dy: -30, span: 200 }],
        tick(dt) {
          const gap = S.ig_gap, pow = S.ig_pow / 100, c = Math.max(0, BALL - gap), sv = squeeze(c);
          const g = gap * U, cy = g + R;
          arm.position.y = cy;
          gapBar.scale.y = g; gapBar.position.set(-2.4, g / 2, 1);
          const vs = rim(MOTOR_RPM * 5 * pow, 48);
          const stall = sv.key === 'jam' || (sv.key === 'tight' && pow < 0.5);
          const k = stall ? 0 : sv.key === 'slip' ? 0.12 : sv.key === 'light' ? 0.6 : sv.key === 'tight' ? 0.55 : 1;
          const vBall = 0.5 * vs * k;
          // How far from the wheel's centre line the ball first touches it.
          const reach = Math.sqrt(Math.max(0, (R + RB) ** 2 - (cy - RB) ** 2));
          const under = Math.abs(x) < reach;
          const drive = 2.6; // the robot rolls up to the ball at about half a metre a second
          let v = drive;
          if (under) v = stall ? (x > reach * 0.72 ? drive : 0) : sv.key === 'slip' ? drive * 0.5 : (vBall * 1000 * U) / SLOW;
          x -= v * dt;
          roll += (v / RB) * dt;
          if (under && stall && v === 0) stuck += dt; else if (!under) stuck = 0;
          if (x < -11 || stuck > 2.4) { x = 9; stuck = 0; }
          const load = stall ? 0 : sv.key === 'tight' ? 0.45 : sv.key === 'light' || sv.key === 'slip' ? 1 : 0.85;
          turn -= ((vs / 0.024) * dt * (under ? load : 1)) / SLOW;
          wheel.spin.rotation.z = turn + (stall && under ? Math.sin(stuck * 60) * 0.03 : 0);
          small.rotation.z = turn; big.rotation.z = -turn / 5;
          const dip = under && reach > 0 ? smooth(1 - Math.abs(x) / reach) : 0, h = 1 - (dip * c * U) / (2 * RB);
          sq.position.set(x, RB * h, 0);
          sq.scale.set(1 + (1 - h) * 0.45, h, 1 + (1 - h) * 0.45);
          spin.rotation.z = roll;
          lg.text(`Gap ${gap} mm`);
          lb.text(stall && under ? 'Stuck' : sv.key === 'slip' && under ? 'Slipping' : `Ball ${BALL.toFixed(0)} mm`);
          ui.hud(`<span class="chip">Shown <b>${SLOW}×</b> slower than real life</span><span class="chip">Intake shaft <b>${Math.round(MOTOR_RPM * 5 * pow)}</b> rpm</span>`);
          ui.out('ig_c', `${c.toFixed(0)} mm`, `${((c / BALL) * 100).toFixed(0)}% of the ball`);
          ui.out('ig_g', sv.name);
          ui.tone('ig_g', sv.key === 'good' ? 'good' : sv.key === 'light' ? '' : 'warn');
          ui.out('ig_v', stall ? '0 m/s' : `${vBall.toFixed(2)} m/s`, `rim speed ${vs.toFixed(2)} m/s`);
          ui.out('ig_m', stall ? 'Stalled' : sv.key === 'tight' ? 'Working hard' : sv.key === 'slip' ? 'Spinning free' : 'Happy');
          ui.tone('ig_m', stall ? 'warn' : '');
          ui.note(stall && sv.key === 'tight' ? '<b>Stalls at low power.</b> A tight squeeze needs a strong push. Add power or open the gap.' : `<b>${sv.name}.</b> ${sv.text} <span style="opacity:.75">Rule of thumb, not a law.</span>`, sv.key === 'good' ? 'good' : sv.key === 'light' ? '' : 'warn');
        },
      };
    },
  };

  // ------------------------------------------------------------ 2. Fast enough?
  const speed = {
    id: 'speed', tab: 'Fast enough?',
    title: 'The intake must beat the robot',
    big: 'An intake only collects if its rim moves faster than the robot is driving. Otherwise the robot just pushes the ball away.',
    lead: 'If the intake’s rim moves <b>slower</b> than the robot drives, the ball is just pushed along the floor. If the rim moves <b>faster</b>, the ball is swept in. Aim for a rim about <b>twice</b> as fast as the robot.',
    real: 'At full speed our robot outruns its own intake, so drivers slow down to collect.',
    try: 'Drive faster until the balls get pushed away.',
    fixed: { is_gear: '5', is_wheel: '48' },
    hud: true,
    controls: [
      { type: 'knob', id: 'is_thr', label: 'Driving at', min: 20, max: 100, step: 5, value: 50, unit: '%' },
    ],
    readouts: [['is_dr', 'Robot speed', 'top speed is about 1.70 m/s'], ['is_rat', 'Intake ÷ robot', 'aim for about 2×']],
    more: [
      ['Show me the math', 'A 48 mm wheel is 0.048 m across, so one turn of its rim is 3.14 × 0.048 = 0.15 m. 585 rpm is 9.75 turns a second. 9.75 × 0.15 = <b>1.47 m/s</b>. At half throttle the robot does 0.85 m/s, so the intake is 1.7 times faster. Good.'],
      ['Can it be too fast?', 'Yes. Past about 3 times the robot’s speed the intake can fling balls away before it grips them. These are free speeds with no load, from goBILDA’s motor ratings. Both the robot and the intake are slower in real life.'],
    ],
    build(st, S, ui) {
      const K = 5.5; // scene units per metre: the robot is 0.45 m wide
      const floor = box(24, 0.16, 9, mat('#8D9391', { rough: 0.92 }), { r: 0.03, pos: [3, -0.08, 0] });
      const lines = Array.from({ length: 9 }, () => { const l = box(0.06, 0.02, 9, mat('#767C7A', { rough: 0.9 }), { r: 0 }); l.userData.noShadow = true; st.add(l); return l; });
      const bot = miniBot({ k: 1, top: true });
      bot.g.rotation.y = -Math.PI / 2;
      bot.nose.visible = false;
      const roller = group(), soft = mat(C.teal, { rough: 0.7 });
      roller.add(cyl(0.09, 2.5, metal(C.steel, 0.3), { axis: 'z', seg: 6 }));
      for (let i = -5; i <= 5; i++) {
        const w = group(cyl(0.13, 0.16, soft, { axis: 'z', seg: 14 }));
        for (let j = 0; j < 6; j++) { const f = box(0.36, 0.05, 0.14, soft, { r: 0 }); f.rotation.z = (j / 6) * TAU + i * 0.4; w.add(f); }
        w.position.z = i * 0.22;
        roller.add(w);
      }
      const arms = group();
      for (const z of [-1.2, 1.2]) arms.add(box(0.9, 0.12, 0.1, metal(C.alu, 0.4), { r: 0.02, pos: [1.75, 0.5, z] }));
      roller.position.set(2.15, 0.36, 0);
      st.add(floor, bot.g, arms, roller);
      const balls = Array.from({ length: 5 }, (_, i) => { const g = gameBall(0.21); st.add(g); return { g, x: 5 + i * 2.2, z: [-0.7, 0.5, 0, -0.3, 0.8][i], st: 'roll', t: 0 }; });
      const lI = st.label('Intake', roller, { dy: -34, tone: 'volt' }), lR = st.label('Robot', bot.g, { off: new THREE.Vector3(-0.4, 1.9, 0) });
      const SLOW = 3;
      let scroll = 0, got = 0, lost = 0, turn = 0;
      return {
        view: { pos: [8.5, 5.2, 9.5], target: [2.6, 0.4, 0] },
        groundY: -0.16,
        change() { got = lost = 0; },
        tick(dt) {
          const thr = S.is_thr / 100, d = +S.is_wheel, vin = rim(MOTOR_RPM * +S.is_gear, d), vdr = rim(312, 104) * thr, r = vin / vdr;
          const ku = K / SLOW, rs = d === 72 ? 1.45 : 1;
          roller.scale.set(rs, rs, 1);
          roller.position.y = 0.3 + 0.07 * rs;
          scroll = (scroll + vdr * ku * dt) % 2.6;
          lines.forEach((l, i) => l.position.set(13.5 - i * 2.6 - scroll, 0.012, 0));
          for (const w of bot.wheels) w.spin.rotation.x -= ((vdr * ku) / bot.R) * dt;
          turn += ((vin * ku) / (0.13 * rs)) * dt;
          roller.rotation.z = turn;
          const front = 2.15 + 0.2 * rs + 0.21;
          for (const b of balls) {
            b.t += dt;
            if (b.st === 'roll') {
              b.x -= vdr * ku * dt; b.g.rotation.z += ((vdr * ku) / 0.21) * dt;
              if (b.x <= front) { b.x = front; b.st = r < 1 ? 'push' : 'in'; b.t = r < 1.5 ? -0.35 : 0; }
            } else if (b.st === 'push') {
              // The robot shoves it along: it rides the bumper for a moment, then squirts out to the side.
              b.x = front + 0.05 * Math.sin(b.t * 30);
              if (b.t > 0.5) b.z += (b.z >= 0 ? 1 : -1) * 1.6 * dt;
              if (Math.abs(b.z) > 1.75) { b.st = 'gone'; lost++; }
            } else if (b.st === 'in') {
              if (b.t > 0) { b.x -= (vin - vdr * 0.4) * ku * dt + 0.6 * dt; b.g.position.y = 0.21 + smooth((front - b.x) / 0.9) * 0.35; b.g.rotation.z += 9 * dt; }
              if (b.x < front - 1.0) { b.st = 'done'; got++; }
            } else if (b.st === 'gone') {
              b.x -= vdr * ku * dt;
            }
            if (b.st === 'done' || b.x < -4) { b.st = 'roll'; b.x = Math.max(...balls.map((o) => o.x), 9) + 2.2; b.z = (Math.random() - 0.5) * 1.8; b.g.position.y = 0.21; }
            b.g.visible = b.st !== 'done';
            if (b.st !== 'in') b.g.position.y = 0.21;
            b.g.position.x = b.x; b.g.position.z = b.z;
          }
          lI.text(`Intake ${vin.toFixed(2)} m/s`);
          lR.text(`Robot ${vdr.toFixed(2)} m/s`);
          ui.hud(`<span class="chip">Collected: <b>${got}</b></span><span class="chip">Pushed away: <b>${lost}</b></span><span class="chip">Shown <b>${SLOW}×</b> slower</span>`);
          ui.out('is_in', `${vin.toFixed(2)} m/s`, `${Math.round(MOTOR_RPM * +S.is_gear)} rpm on ${d} mm`);
          ui.out('is_dr', `${vdr.toFixed(2)} m/s`);
          ui.out('is_rat', `${r.toFixed(2)}×`);
          ui.tone('is_rat', r >= 1.5 && r <= 3 ? 'good' : r < 1 ? 'warn' : '');
          ui.note(r < 1 ? '<b>The robot outruns its intake.</b> Balls get pushed, not pulled. Slow down while collecting, or speed the intake up.' : r < 1.5 ? '<b>Just keeps up.</b> OK if drivers slow down to collect.' : r <= 3 ? '<b>Good.</b> The intake pulls balls in faster than you drive into them. About 2× is a common target.' : '<b>Very fast.</b> Fine, but check it does not fling balls away.', r >= 1.5 && r <= 3 ? 'good' : r < 1 ? 'warn' : '');
        },
      };
    },
  };

  // ------------------------------------------------------------ 3. One at a time
  const path = {
    id: 'path', tab: 'One at a time',
    title: 'The ball path feeds the launcher one ball at a time',
    big: 'A gate holds the balls in a line and lets exactly one through, so the flywheel has time to get back to speed.',
    lead: 'Balls wait in a line behind a small <b>servo</b> arm that works like a gate. To shoot, it opens for a moment and one ball rolls into the flywheel. Open too long and <b>two</b> go, and the second lands short.',
    real: 'This is our hopper servo. How long it opens is a number in the code.',
    try: 'Hold the gate open longer until two balls sneak through.',
    fixed: { ip_wait: 1.5 },
    hud: true,
    controls: [
      { id: 'ip_open', label: 'Gate stays open for', min: 50, max: 700, step: 10, value: 250, unit: ' ms' },
    ],
    readouts: [['ip_n', 'Balls per opening', 'you want exactly 1'], ['ip_r', 'Last shot']],
    more: [
      ['Why not just open the gate and let them all go?', 'Because of the Spin back up chapter in The launcher: each shot takes speed out of the flywheel. Balls that arrive nose to tail meet a slower and slower wheel, so each one lands shorter than the last.'],
      ['Where do these numbers come from?', 'They are sample numbers: balls rolling up the ramp at about 0.3 metres a second, and a flywheel that loses about 14% of its speed per shot. Your robot’s real timing will be different. The pattern is what matters.'],
    ],
    build(st, S, ui) {
      // The line the ball's centre follows: up the ramp, then round the left side of the flywheel.
      const FW = [0, 11], Rw = 2.4, Rc = Rw + RB - 0.3, Rh = Rw + 2 * RB - 0.6;
      const feed = curveOf([[-17, 2.1, 0], [-12, 2.3, 0], [-8, 3.3, 0], [-5.4, 5.4, 0], [-4.25, 8.4, 0], [-Rc, 11, 0]]);
      const LF = feed.getLength(), A0 = Math.PI, A1 = deg(135), LA = Rc * (A0 - A1);
      const at = (s) => {
        if (s <= 0) return [-17 + s, 2.1, 1, 0];
        if (s < LF) { const p = feed.getPointAt(s / LF), t = feed.getTangentAt(s / LF); return [p.x, p.y, t.x, t.y]; }
        const a = A0 - Math.min(s - LF, LA) / Rc;
        return [FW[0] + Math.cos(a) * Rc, FW[1] + Math.sin(a) * Rc, Math.sin(a), -Math.cos(a)];
      };
      const side = (s0, s1, off, n = 40) => Array.from({ length: n + 1 }, (_, i) => { const [x, y, tx, ty] = at(lerp(s0, s1, i / n)); return [x + ty * off, y - tx * off]; });
      const rampM = mat('#D9DDDC', { rough: 0.35, metal: 0.2 }), panelM = mat('#B8E2E8', { opacity: 0.45, rough: 0.2 });
      const lower = side(-2, LF - 3.2, RB + 0.16), upper = side(7, LF, -(RB + 0.16));
      for (const z of [-1.1, 1.1]) {
        st.add(tube(lower.map(([x, y]) => [x, y, z]), 0.15, rampM), tube(upper.map(([x, y]) => [x, y, z]), 0.12, panelM));
      }
      const wheel = flywheel(Rw, 1.3);
      wheel.g.position.set(FW[0], FW[1], 0);
      const hood = arcBand(Rh, Rh + 0.4, deg(133), deg(182), 2.6, plastic(C.orange, 0.42));
      hood.position.set(FW[0], FW[1], 0);
      const back = box(9, 16, 0.25, metal(C.alu, 0.42), { r: 0.06, pos: [-1.5, 7, -1.7] });
      const floor = box(36, 0.2, 9, mat('#8D9391', { rough: 0.9 }), { r: 0.04, pos: [-2, -0.1, -1] });
      // The gate: a servo on the inside of the bend, with an arm that drops across the path.
      const sG = LF - 6.2, [gx, gy, gtx, gty] = at(sG);
      const servo = group(box(1.6, 2.4, 1.2, plastic('#2A2E30', 0.5, 0.4), { r: 0.12 }), cyl(0.36, 0.5, plastic(C.volt, 0.4), { axis: 'z', seg: 20, pos: [0, 0.7, 0.7] }));
      const pivot = [gx - gty * (RB + 1.5), gy + gtx * (RB + 1.5)];
      servo.position.set(pivot[0], pivot[1] - 0.7, -0.9);
      const arm = group(box(2.9, 0.34, 0.3, plastic(C.volt, 0.4), { r: 0.1, pos: [1.25, 0, 0] }));
      arm.position.set(pivot[0], pivot[1], 0);
      const closedA = Math.atan2(-gtx, gty), openA = closedA + 1.35;
      const ANG = deg(45), V0 = 12.96, GG = 12, P = [FW[0] + Math.cos(A1) * Rc, FW[1] + Math.sin(A1) * Rc];
      const ringM = mat(C.volt, { glow: true, glowPower: 0.3 });
      const hoop = group(mesh(new THREE.TorusGeometry(2.9, 0.16, 10, 48), ringM, [0, 0, 0], [0, Math.PI / 2, 0]), cyl(0.12, P[1] - 2.9, metal(C.iron, 0.5), { pos: [0, -(P[1] - 2.9) / 2 - 2.9, 0], seg: 12 }));
      hoop.position.set(P[0] + 14, P[1], 0);
      st.add(floor, back, wheel.g, hood, servo, arm, hoop);
      st.label('Servo gate', arm, { off: new THREE.Vector3(-2.4, 1.6, 0), tone: 'volt' });
      st.label('Ramp', new THREE.Vector3(-11, 0.9, 1.2));
      const lw = st.label('Flywheel', wheel.g, { off: new THREE.Vector3(2.6, -3.2, 0) });
      st.label('Full-speed shots pass through here', hoop, { off: new THREE.Vector3(0, 3.7, 0) });
      const balls = Array.from({ length: 6 }, (_, i) => { const g = gameBall(RB); st.add(g); return { g, s: sG - RB - 0.1 - i * 2 * RB - i * 0.05, fly: -1, f: 1, roll: 0 }; });
      const VF = 0.3 * 1000 * U, SLOW = 2, stop = sG - RB - 0.1;
      let f = 1, clock = 0.6, openFor = 0, armA = closedA, lastN = 0, thisN = 0, lastF = 1, good = 0, bad = 0, shots = 0;
      return {
        view: { pos: [-1.5, 8, 42], target: [-1.5, 7.2, 0] },
        groundY: -0.2,
        change() { good = bad = 0; },
        tick(dt) {
          dt = Math.min(dt, 0.05) / SLOW;
          const open = S.ip_open / 1000, wait = Math.max(S.ip_wait, open + 0.1);
          clock -= dt;
          if (clock <= 0) { clock = wait; openFor = open; lastN = thisN; thisN = 0; }
          const isOpen = openFor > 0;
          openFor -= dt;
          if (!isOpen && openFor > -dt * 1.5 && openFor <= 0) lastN = thisN;
          armA = lerp(armA, isOpen ? openA : closedA, 1 - Math.exp(-dt * 60));
          arm.rotation.z = armA;
          f += ((1 - f) / RECOVER.tau) * dt;
          wheel.spin.rotation.z -= f * 14 * dt;
          const line = balls.filter((b) => b.fly < 0).sort((a, b) => b.s - a.s);
          let ahead = Infinity;
          for (const b of line) {
            const was = b.s;
            let lim = ahead - 2 * RB - 0.02;
            if (!isOpen && b.s < sG) lim = Math.min(lim, stop);
            const v = b.s > LF ? VF * 3 : VF;
            if (b.s > lim) b.s = Math.max(lim, b.s - VF * dt); else b.s = Math.min(lim, b.s + v * dt);
            if (was < sG && b.s >= sG) thisN++;
            if (was < LF && b.s >= LF) { b.f = f; lastF = f; f *= Math.sqrt(1 - RECOVER.take); shots++; if (b.f >= 0.965) good++; else bad++; }
            b.roll += (b.s - was) / RB;
            ahead = b.s;
            const [x, y] = at(b.s);
            const pinch = b.s > LF - 0.6 ? 0.92 : 1;
            b.g.position.set(x, y, 0); b.g.scale.set(pinch, 1, 1); b.g.rotation.z = -b.roll;
            if (b.s >= LF + LA) { b.fly = 0; b.g.scale.set(1, 1, 1); }
          }
          for (const b of balls) {
            if (b.fly < 0) continue;
            b.fly += dt * 1.6;
            const v = V0 * b.f, x = v * Math.cos(ANG) * b.fly, y = v * Math.sin(ANG) * b.fly - 0.5 * GG * b.fly * b.fly;
            b.g.position.set(P[0] + x, P[1] + y, 0); b.g.rotation.z += dt * 12;
            if (P[1] + y < 1.9 || x > 26) { b.fly = -1; b.s = Math.min(...balls.filter((o) => o.fly < 0 && o !== b).map((o) => o.s), stop) - 2 * RB - 0.6; }
          }
          ringM.emissiveIntensity = lerp(ringM.emissiveIntensity, lastF >= 0.965 ? 0.9 : 0.12, 0.1);
          const n = open < 0.127 ? 0 : Math.min(3, 1 + Math.floor((open - 0.127) / 0.254));
          lw.text(`Flywheel ${Math.round(f * 100)}%`);
          ui.hud(`<span class="chip">Through the hoop: <b>${good}</b></span><span class="chip">Short: <b>${bad}</b></span><span class="chip">Shown <b>${SLOW}×</b> slower</span>`);
          ui.out('ip_n', String(n));
          ui.tone('ip_n', n === 1 ? 'good' : 'warn');
          ui.out('ip_f', shots ? `${Math.round(lastF * 100)}%` : '–');
          ui.out('ip_r', !shots ? '–' : lastF >= 0.965 ? 'Through' : 'Short');
          ui.tone('ip_r', !shots ? '' : lastF >= 0.965 ? 'good' : 'warn');
          ui.note(n === 0 ? '<b>Too quick.</b> The gate shuts before the ball is halfway through, and pushes it back.' : n > 1 ? `<b>${n} balls per opening.</b> The first is fine. The next arrives a quarter of a second later, while the flywheel is still slow, so it drops under the hoop.` : wait < 0.6 ? '<b>One ball each time, but too often.</b> The flywheel needs about 0.6 s to get back to speed.' : '<b>One ball, then a pause.</b> Every ball meets a flywheel at full speed.', n === 1 && wait >= 0.6 ? 'good' : 'warn');
        },
      };
    },
  };

  // ------------------------------------------------------------ 4. Jams
  const jam = {
    id: 'jam', tab: 'Jams',
    title: 'Two balls, one doorway',
    big: 'Balls jam when two of them can wedge side by side, so a ball path should be clearly one ball wide or clearly two.',
    lead: 'This is the ball path from above. A channel just wider than <b>one ball</b> works. So does one that is <b>two balls</b> wide. In between is a trap: two balls lock against each other and the walls. That is a <b>wedge</b>.',
    real: 'Gecko wheels at the corners of our intake pull one ball ahead to break the wedge.',
    try: 'Widen the channel until the balls wedge, then switch the side wheel on.',
    hud: true,
    controls: [
      { id: 'ij_w', label: 'Channel width', min: 80, max: 170, step: 2, value: 84, unit: ' mm' },
      { type: 'seg', id: 'ij_wheel', label: 'Side wheel', value: 'off', options: [['off', 'Off'], ['on', 'Spinning']] },
    ],
    readouts: [['ij_fit', 'Channel is', 'a ball is 76 mm across'], ['ij_res', 'Result']],
    more: [
      ['Why do they lock?', 'Each ball is pressed against one wall and against the other ball. Pushing from behind only presses them harder into the walls, like two people stuck shoulder to shoulder in a doorway. The fix is to make one go first.'],
      ['How do I un-jam in a match?', 'Many teams give the driver a button that runs the intake backwards for a moment. Spitting the balls out and pulling them in again usually clears it.'],
    ],
    build(st, S, ui) {
      const floor = box(28, 0.2, 16, mat('#8D9391', { rough: 0.9 }), { r: 0.04, pos: [0, -0.1, 0] });
      const wallM = mat('#D9DDDC', { rough: 0.4, metal: 0.2 });
      const fun = [-1, 1].map(() => box(1, 1.7, 0.3, wallM, { r: 0.05 })), chan = [-1, 1].map(() => box(13, 1.7, 0.3, wallM, { r: 0.05 }));
      const gw = geckoWheel(1.8, 1.1);
      gw.g.rotation.x = Math.PI / 2;
      const post = cyl(0.22, 1.6, metal(C.steel, 0.3), { seg: 6 });
      const A = gameBall(RB), B = gameBall(RB, '#8E6BF0');
      st.add(floor, ...fun, ...chan, gw.g, post, A, B);
      const lj = st.label('Wedged', new THREE.Vector3(-0.5, 2.6, 0), { tone: 'warn' });
      const lw = st.label('Side wheel', gw.g, { off: new THREE.Vector3(0, 1.4, -2.2) });
      const X0 = -12, XM = -2, HALF0 = 6.2;
      let plan = null, t = 0, endT = 0, key = '', through = 0, jams = 0, counted = false;
      const make = (w, on) => {
        const hw = (w * U) / 2, lane = hw - RB;
        if (w < 90 || (on && w < 154)) {
          // One goes first, the other tucks in behind.
          return { kind: on && w >= 90 ? 'wheel' : 'single', a: [[X0 + 1, -2.4], [XM - 1.5, -Math.min(lane, 0.6)], [XM + 2, -lane * (on ? 0.6 : 0)], [13, 0]], b: [[X0, 2.4], [XM - 3.6, 1.2], [XM - 1.6, Math.min(lane, 0.5)], [XM + 1.5, 0], [13, 0]], va: on ? 9 : 6, vb: 5.2 };
        }
        if (w >= 154) return { kind: 'pair', a: [[X0 + 1, -2.4], [XM, -lane], [13, -lane]], b: [[X0 + 1, 2.4], [XM, lane], [13, lane]], va: 6, vb: 6 };
        const L = Math.sqrt(Math.max(0, (2 * RB) ** 2 - (2 * lane) ** 2));
        return { kind: 'jam', a: [[X0 + 1, -2.4], [XM + 0.4 + L, -lane]], b: [[X0, 2.4], [XM + 0.4, lane]], va: 6, vb: 6 };
      };
      // Walk a ball along its list of points at a steady speed.
      const walk = (pts, dist) => {
        for (let i = 1; i < pts.length; i++) {
          const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
          if (dist <= d) return [lerp(pts[i - 1][0], pts[i][0], dist / d), lerp(pts[i - 1][1], pts[i][1], dist / d), false];
          dist -= d;
        }
        return [...pts[pts.length - 1], true];
      };
      return {
        view: { pos: [0, 36, 17], target: [0, 0, 1.2] },
        groundY: -0.2,
        change() { through = jams = 0; },
        tick(dt) {
          const w = S.ij_w, on = S.ij_wheel === 'on', hw = (w * U) / 2;
          if (key !== `${w}|${on}`) { key = `${w}|${on}`; plan = make(w, on); t = 0; counted = false; }
          [-1, 1].forEach((s, i) => {
            const dz = HALF0 - hw, len = Math.hypot(XM - X0, dz);
            fun[i].scale.x = len; fun[i].position.set((X0 + XM) / 2, 0.85, s * ((HALF0 + hw) / 2 + 0.15)); fun[i].rotation.y = s * Math.atan2(dz, XM - X0);
            chan[i].position.set(XM + 6.5, 0.85, s * (hw + 0.15));
          });
          gw.g.position.set(XM + 0.6, 0.9, -(hw + 1.5)); post.position.set(XM + 0.6, 0.8, -(hw + 1.5));
          if (on) gw.spin.rotation.z -= dt * 12;
          lw.text(on ? 'Side wheel: spinning' : 'Side wheel: off');
          t += dt;
          const [ax, az, aEnd] = walk(plan.a, t * plan.va), [bx, bz, bEnd] = walk(plan.b, Math.max(0, t - 0.15) * plan.vb);
          const stuck = plan.kind === 'jam' && aEnd && bEnd, sh = stuck ? Math.sin(t * 50) * 0.03 : 0;
          A.position.set(ax + sh, RB, az); B.position.set(bx - sh, RB, bz);
          if (!stuck) { A.rotation.z = -ax / RB; B.rotation.z = -bx / RB; }
          lj.show(stuck);
          if (aEnd && bEnd && !counted) { counted = true; endT = t; if (plan.kind === 'jam') jams++; else through += 2; }
          if (counted && t - endT > (plan.kind === 'jam' ? 2.8 : 0.4)) { t = 0; counted = false; }
          const res = { single: 'One by one', wheel: 'Wheel sorts them', pair: 'Side by side', jam: 'Jam' }[plan.kind];
          ui.hud(`<span class="chip">Balls through: <b>${through}</b></span><span class="chip">Jams: <b>${jams}</b></span>`);
          ui.out('ij_fit', `${(w / BALL).toFixed(1)} balls wide`);
          ui.out('ij_room', `${Math.round(w - BALL)} mm`);
          ui.out('ij_res', res);
          ui.tone('ij_res', plan.kind === 'jam' ? 'warn' : 'good');
          ui.note(plan.kind === 'jam' ? `<b>Wedged.</b> At ${(w / BALL).toFixed(1)} balls wide, neither ball can pass the other, and neither can go first. Narrow it, widen it, or switch on the side wheel.` : plan.kind === 'wheel' ? '<b>The wheel breaks the tie.</b> It grabs the ball on its side and pulls it ahead, so the other drops in behind.' : plan.kind === 'pair' ? '<b>Two lanes.</b> Wide enough for both at once. That only helps if the next part of the path can also take two.' : '<b>Single file.</b> Only one ball fits, so they have to take turns. This is what you want just before the launcher.', plan.kind === 'jam' ? 'warn' : 'good');
        },
      };
    },
  };

  return { title: 'Intake and ball path', chapters: [grab, speed, path, jam] };
}
