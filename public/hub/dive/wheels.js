// How it works: mecanum wheels. Our StarterBot has four of them, which is why it can slide sideways.
import { THREE, C, mat, metal, plastic, mesh, cyl, box, group, clamp, lerp, smooth, TAU } from './kit.js';
import { mecanumWheel, miniBot, field, flatArrow, fmt } from './works.js';

const NAMES = ['Front left', 'Front right', 'Back left', 'Back right'];
// The mecanum mix: forward, strafe (slide right) and turn (clockwise), each from -1 to 1.
export function mix(f, s, t) {
  const p = [f + s + t, f - s - t, f - s + t, f + s - t];
  const big = Math.max(1, ...p.map(Math.abs));
  return { raw: p, p: p.map((v) => v / big), big };
}

export default function wheels() {
  // ------------------------------------------------------------ 1. Wheel size
  const size = {
    id: 'size', tab: 'Wheel size',
    title: 'One turn of the wheel, one trip round its edge',
    big: 'Every turn moves a wheel forward by the distance around its edge, so speed is turns times that distance.',
    lead: 'Roll a wheel one full turn and it moves forward by the distance around its edge. That distance is the <b>circumference</b>, always <b>π × diameter</b> (π is about 3.14). A bigger wheel goes further per turn. A faster motor makes more turns per minute (<b>rpm</b>). Multiply the two and you get the robot’s speed.',
    real: 'Our wheels are 104 mm across on 312 rpm motors. That is about 1.7 metres a second flat out: wall to wall in a little over two seconds.',
    try: 'Drag the wheel bigger and smaller. Then turn the motor speed knob.',
    controls: [
      { id: 'wz_d', label: 'Wheel diameter', min: 48, max: 140, step: 1, value: 104, unit: ' mm' },
      { type: 'knob', id: 'wz_rpm', label: 'Motor speed', min: 0, max: 435, step: 1, value: 312, unit: ' rpm' },
    ],
    readouts: [['wz_c', 'One turn moves it', 'π × diameter'], ['wz_v', 'Robot speed', 'turns a second × one turn'], ['wz_f', 'In feet', 'per second'], ['wz_x', 'Crosses the field in', '3.66 m wall to wall']],
    more: [
      ['Show me the math for our robot', 'Our wheels are 104 mm across. One turn = 3.14 × 104 = <b>327 mm</b>. Our drive motors spin 312 times a minute, which is 5.2 turns a second. 5.2 × 327 mm = 1,700 mm, so about <b>1.7 metres a second</b>. That is top speed with no load. A real robot with weight on it reaches about three quarters of that.'],
      ['So why not use huge wheels?', 'Because nothing is free. A bigger wheel is a longer lever for the floor to push back on, so the motor has less shove. The robot gets a higher top speed but takes longer to get going, and it loses pushing matches.'],
      ['What is rpm?', 'Revolutions per minute: how many full turns the shaft makes in 60 seconds. Divide by 60 to get turns per second.'],
    ],
    build(st, S, ui) {
      const U = 1 / 35; // scene units per millimetre
      const w = mecanumWheel(104 * U / 2, 0.8, 1);
      const car = group(w.g);
      w.g.rotation.y = Math.PI / 2;
      const mark = cyl(0.09, 0.9, mat(C.volt, { glow: true, glowPower: 0.8 }), { axis: 'x', seg: 10 });
      w.spin.add(mark);
      const floor = box(23, 0.2, 6, mat('#8D9391', { rough: 0.9 }), { r: 0.04, pos: [0, -0.1, 0] });
      const ruler = group();
      for (let i = 0; i <= 14; i++) {
        ruler.add(box(i % 10 === 0 ? 0.1 : 0.05, 0.02, i % 10 === 0 ? 1.3 : i % 2 ? 0.45 : 0.8, C.white, { r: 0, pos: [-10 + i * 50 * U, 0.012, 2.0] }));
      }
      const tape = box(1, 0.05, 0.5, mat(C.volt, { glow: true, glowPower: 0.35 }), { r: 0, pos: [0, 0.03, 0] });
      const end = box(0.08, 0.5, 0.7, C.ink, { r: 0, pos: [0, 0.25, 0] });
      st.add(floor, ruler, tape, end, car);
      st.label('0', new THREE.Vector3(-10, 0, 3.1));
      st.label('0.5 m', new THREE.Vector3(-10 + 500 * U, 0, 3.1));
      const lt = st.label('One turn', tape, { dy: 26, tone: 'volt' });
      const ld = st.label('104 mm', w.g, { dy: -84 });
      let x = 0;
      return {
        view: { pos: [0, 8, 29], target: [0, 1.2, 0] },
        groundY: -0.2,
        handles: [{ id: 'wz_d', obj: w.g, hint: 'Drag to resize', dy: -20, span: 200 }],
        tick(dt) {
          const d = S.wz_d, rpm = S.wz_rpm, c = Math.PI * d, v = (rpm / 60) * c / 1000;
          const k = d / 104, R = (d / 2) * U, cu = c * U;
          w.g.scale.setScalar(k);
          mark.position.set(0, -52 * U + 0.06, 0);
          // Shown 4 times slower than real life, so the eye can follow one turn.
          x += (v * 1000 * U * dt) / 4;
          if (x > 21.5) x = 0;
          car.position.set(-10 + x, R, 0);
          w.spin.rotation.x = x / R;
          const turns = Math.floor(x / cu);
          const x0 = -10 + turns * cu;
          tape.scale.x = cu; tape.position.x = clamp(x0 + cu / 2, -30, 30);
          tape.visible = end.visible = x0 + cu < 11.4;
          end.position.x = x0 + cu;
          lt.text(`One turn = ${Math.round(c)} mm`);
          ld.text(`${d} mm across`);
          ui.hud(`<span class="chip">Shown <b>4×</b> slower than real life</span><span class="chip"><b>${(rpm / 60).toFixed(1)}</b> turns a second</span>`);
          ui.out('wz_c', `${Math.round(c)} mm`, `3.14 × ${d} mm`);
          ui.out('wz_v', `${v.toFixed(2)} m/s`, `${(rpm / 60).toFixed(1)} × ${Math.round(c)} mm`);
          ui.out('wz_f', `${(v * 3.281).toFixed(1)} ft/s`);
          ui.out('wz_x', v > 0.01 ? `${(3.66 / v).toFixed(1)} s` : 'never');
          ui.note(d === 104 && rpm === 312 ? 'These are <b>our robot’s numbers</b>: 104 mm goBILDA mecanum wheels on 312 rpm Yellow Jacket motors. About 1.7 m/s flat out.' : rpm === 0 ? 'Motor stopped. No turns, no distance.' : `Each turn lays down ${Math.round(c)} mm of floor. ${(rpm / 60).toFixed(1)} turns every second makes ${v.toFixed(2)} metres a second.`);
        },
      };
    },
  };

  // ------------------------------------------------------------ 2. One mecanum wheel
  const roller = {
    id: 'roller', tab: 'The rollers',
    title: 'A wheel made of little wheels',
    big: 'Angled rollers turn a plain forward spin into a push that is half forward and half sideways.',
    lead: 'A mecanum wheel has no tyre. Its rim is a ring of small free-spinning <b>rollers</b>, each set at <b>45°</b>. A roller cannot grip in the direction it rolls, so the floor can only push the wheel <b>along the roller’s axle</b>. A plain forward spin becomes a push that is half forward and half sideways.',
    real: 'Look down on our robot and the rollers of the four wheels make an X. Put one wheel on the wrong corner and the robot drifts, or will not slide sideways at all.',
    try: 'Slide the roller angle from 0° to 90° and watch where the floor pushes.',
    controls: [
      { id: 'wr_ang', label: 'Roller angle', min: 0, max: 90, step: 5, value: 45, unit: '°' },
      { type: 'knob', id: 'wr_pow', label: 'Motor power', min: -1, max: 1, step: 0.05, value: 0.7, fmt: (v) => fmt(v) },
      { type: 'seg', id: 'wr_hand', label: 'Rollers lean', value: 'r', options: [['l', 'Left'], ['r', 'Right']] },
    ],
    readouts: [['wr_f', 'Push forward'], ['wr_s', 'Push sideways'], ['wr_d', 'Push points', 'measured from straight ahead']],
    more: [
      ['Why can the floor only push along the roller?', 'Try pushing a rolling pin across a table. Push across it and it just rolls away: no grip. Push along its length and it grips and drags. Each roller is a tiny rolling pin, so only the part of the push that lines up with its axle gets through.'],
      ['What happens at 0° and 90°?', 'At 90° the rollers run around the rim like a normal tyre with a few gaps, so all the push goes forward. That is an <b>omni wheel</b> turned the grippy way. At 0° the rollers line up with the axle and just spin in place: the motor turns and the robot goes nowhere.'],
      ['Why are there left and right wheels?', 'A mecanum wheel comes in two mirror versions. One pushes forward-and-left, the other forward-and-right. A robot needs two of each, placed so the sideways pushes can either cancel out or add up. Put one on the wrong corner and the robot drives like a shopping trolley with a bad wheel.'],
    ],
    build(st, S, ui) {
      const holder = group();
      holder.position.set(-2.8, 2.0, 0);
      let w = null, key = '';
      const floor = cyl(7.4, 0.16, mat('#8D9391', { rough: 0.9 }), { pos: [0, -0.08, 0], seg: 64 });
      // The roller that touches the floor is hidden under the wheel, so a zoomed-in copy lies beside it.
      const D = new THREE.Vector3(2.4, 0, 1.6);
      const pts = [];
      for (let i = 0; i <= 12; i++) { const k = i / 12 - 0.5; pts.push(new THREE.Vector2(Math.max(0.03, 0.42 * (1 - 1.75 * k * k)), k * 2.3)); }
      const demo = mesh(new THREE.LatheGeometry(pts, 20), mat('#232627', { rough: 0.85 }));
      const demoSpin = group(demo, mesh(new THREE.BoxGeometry(0.06, 2.0, 0.06), mat(C.white, { rough: 0.6 }), [0.4, 0, 0]));
      const demoG = group(demoSpin, cyl(0.07, 2.9, metal(C.steel, 0.3), { seg: 8 }));
      demoG.position.set(D.x, 0.46, D.z);
      const aF = flatArrow(C.volt, 0.3), aFwd = flatArrow(C.teal, 0.17), aSide = flatArrow(C.orange, 0.17);
      const pivot = group(aF), pFwd = group(aFwd), pSide = group(aSide);
      pSide.rotation.y = -Math.PI / 2; // +X
      for (const a of [pivot, pFwd, pSide]) a.position.set(D.x, 0.06, D.z);
      pivot.position.y = 1.0;
      st.add(floor, holder, demoG, pivot, pFwd, pSide);
      const lF = st.label('Push from the floor', new THREE.Vector3(), { tone: 'volt', dy: -18 });
      st.label('Axle', holder, { dy: -150 });
      st.label('The roller on the floor, zoomed in', demoG, { dy: 46 });
      const tipPt = new THREE.Vector3();
      st.label('Forward', new THREE.Vector3(-2.8, 0, -5.6), { dy: 0 });
      lF.to(tipPt);
      const up = new THREE.Vector3(0, 1, 0), dv = new THREE.Vector3();
      const rebuild = () => {
        const k = `${S.wr_ang}|${S.wr_hand}`;
        if (k === key) return;
        key = k;
        const rot = w ? w.spin.rotation.x : 0;
        if (w) { holder.remove(w.g); st.disposeTree(w.g); }
        w = mecanumWheel(2.0, 1.5, S.wr_hand === 'r' ? 1 : -1, { lean: (S.wr_ang * Math.PI) / 180 });
        w.spin.rotation.x = rot;
        holder.add(w.g);
        st.ground(-0.16);
      };
      rebuild();
      return {
        view: { pos: [5, 15, 18], target: [0, 1.0, -0.4] },
        groundY: -0.16,
        change() { rebuild(); },
        tick(dt) {
          const th = (S.wr_ang * Math.PI) / 180, p = S.wr_pow, h = S.wr_hand === 'r' ? 1 : -1;
          const fwd = Math.sin(th) ** 2 * p, side = Math.sin(th) * Math.cos(th) * p * h;
          w.spin.rotation.x -= dt * p * 3.2;
          // The rollers themselves spin when part of the push is wasted.
          const slip = Math.cos(th) * p * 9 * dt;
          for (const r of w.rollers) r.roll.rotation.y += slip;
          demoSpin.rotation.y += slip;
          demoG.quaternion.setFromUnitVectors(up, dv.set(Math.cos(th), 0, -h * Math.sin(th)).normalize());
          const L = 6.4;
          const len = Math.hypot(fwd, side) * L;
          pivot.rotation.y = Math.atan2(-side, fwd);
          aF.set(len);
          aFwd.set(fwd * L); aSide.set(side * L);
          tipPt.set(D.x + side * L, 1.2, D.z - fwd * L);
          const deg = S.wr_ang === 0 ? 0 : 90 - S.wr_ang;
          ui.out('wr_f', `${Math.round(Math.abs(fwd) * 100)}%`, fwd < -0.005 ? 'backwards' : 'of the motor’s push');
          ui.out('wr_s', `${Math.round(Math.abs(side) * 100)}%`, Math.abs(side) < 0.005 ? 'none' : side > 0 ? 'to the right' : 'to the left');
          ui.out('wr_d', len < 0.02 ? 'nowhere' : `${deg}° ${deg === 0 ? '' : side > 0 === (p > 0) ? 'right' : 'left'}`);
          lF.show(len > 0.3);
          ui.note(p === 0 ? 'No power, no push. Turn the knob.' : S.wr_ang === 45 ? '<b>45°: the mecanum angle.</b> Half the push goes forward and half goes sideways. Four wheels can now cancel or add those sideways halves.' : S.wr_ang === 0 ? '<b>0°:</b> the rollers just spin on their pins. The motor is working but nothing pushes the robot.' : S.wr_ang === 90 ? '<b>90°:</b> the rollers cannot roll in the drive direction, so the wheel acts like a normal tyre. All forward, nothing sideways.' : 'The yellow arrow always lines up with the roller that is touching the floor. Teal is its forward part, orange its sideways part.');
        },
      };
    },
  };

  // ------------------------------------------------------------ 3. Four wheels
  const MOVES = { drive: [1, 0, 0], strafe: [0, 1, 0], diag: [0.6, 0.6, 0], spin: [0, 0, 1], arc: [0.7, 0, 0.35] };
  const four = {
    id: 'four', tab: 'Four wheels',
    title: 'Three wishes in, four wheel powers out',
    big: 'One line of adding and subtracting per wheel turns what the driver wants into four motor powers.',
    lead: 'The driver asks for three things at once: go <b>forward</b>, slide sideways (<b>strafe</b>) and <b>turn</b>. The robot has four wheels. One line of adding and subtracting per wheel turns three wishes into four motor powers. If any answer is bigger than 1, all four shrink by the same amount, so the robot still goes the way you asked.',
    real: 'This exact math runs in our driver-control program many times a second, every time a stick moves.',
    try: 'Turn the three knobs, or pick a quick move and read the four wheel powers.',
    controls: [
      { type: 'knob', id: 'wf_f', label: 'Forward', min: -1, max: 1, step: 0.05, value: 0, fmt: (v) => fmt(v) },
      { type: 'knob', id: 'wf_s', label: 'Strafe', min: -1, max: 1, step: 0.05, value: 0.7, fmt: (v) => fmt(v) },
      { type: 'knob', id: 'wf_t', label: 'Turn', min: -1, max: 1, step: 0.05, value: 0, fmt: (v) => fmt(v) },
      { type: 'seg', id: 'wf_move', label: 'Quick moves', value: 'strafe', options: [['drive', 'Forward'], ['strafe', 'Strafe'], ['diag', 'Diagonal'], ['spin', 'Spin'], ['arc', 'Curve']] },
    ],
    readouts: [['wf_0', 'Front left'], ['wf_1', 'Front right'], ['wf_2', 'Back left'], ['wf_3', 'Back right']],
    more: [
      ['Why does strafing make the wheels fight each other?', 'To slide right, the front-left and back-right wheels spin forward while the other two spin backward. The forward and backward halves of their pushes cancel. Only the sideways halves are left, and they all point right.'],
      ['What is the "shrink" step for?', 'A motor cannot do more than full power (1). Say you ask for forward 1 and turn 1: the left wheels would need power 2. If you just cut 2 down to 1, the turn disappears. Dividing all four by the biggest one keeps their balance, so the robot still curves.'],
      ['Is strafing as fast as driving?', 'No. The rollers slip a little and half of every wheel’s push is cancelled, so sideways is slower and much weaker than forward. A mecanum robot is nimble, but it loses a pushing match against grippy wheels.'],
      ['Where is this in our code?', 'In Code, Our code, look in TeleOp for four lines that add and subtract <code>y</code>, <code>x</code> and <code>rx</code>. Same math, different letters.'],
    ],
    build(st, S, ui) {
      const fl = field(18, 6);
      const bot = miniBot({ k: 1.0 });
      st.add(fl, bot.g);
      const arrows = bot.wheels.map((w) => { const a = flatArrow(C.volt, 0.2); a.position.copy(w.at.position); bot.g.add(a); return a; });
      const push = bot.wheels.map((w) => { const a = flatArrow(C.orange, 0.1); a.position.set(w.at.position.x + w.sx * 0.7, 0.05, w.at.position.z); const pv = group(a); pv.position.copy(a.position); a.position.set(0, 0, 0); pv.rotation.y = -(w.hand * Math.PI) / 4; bot.g.add(pv); return a; });
      const labels = bot.wheels.map((w, i) => st.label(NAMES[i], w.at, { dy: -22 }));
      const net = flatArrow(C.teal, 0.3), netP = group(net);
      netP.position.y = 1.75;
      bot.g.add(netP);
      st.label('Front', bot.nose, { dy: -4, tone: 'volt' });
      let yaw = 0;
      const pos = new THREE.Vector3(), dir = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
      return {
        view: { pos: [0, 16, 13.5], target: [0, 0, 1.2] },
        groundY: -0.16,
        change(id) {
          if (id === 'wf_move') { const m = MOVES[S.wf_move]; ui.set('wf_f', m[0]); ui.set('wf_s', m[1]); ui.set('wf_t', m[2]); pos.set(0, 0, 0); yaw = 0; }
        },
        tick(dt) {
          const f = S.wf_f, s = S.wf_s, t = S.wf_t, M = mix(f, s, t), p = M.p;
          const vf = (p[0] + p[1] + p[2] + p[3]) / 4, vs = (p[0] - p[1] - p[2] + p[3]) / 4, vt = (p[0] - p[1] + p[2] - p[3]) / 4;
          yaw -= vt * dt * 2.2;
          dir.set(vs * 0.75, 0, -vf).applyAxisAngle(Y, yaw);
          pos.addScaledVector(dir, dt * 3.4);
          // Off one edge, back on at the other: the field here is only a patch.
          if (pos.x > 7.2) pos.x = -7.2; if (pos.x < -7.2) pos.x = 7.2;
          if (pos.z > 4.6) pos.z = -7; if (pos.z < -7) pos.z = 4.6;
          bot.g.position.copy(pos); bot.g.rotation.y = yaw;
          p.forEach((v, i) => {
            bot.wheels[i].spin.rotation.x -= v * dt * 5.5;
            arrows[i].set(v * 1.9);
            push[i].set(v * 1.3);
            labels[i].text(`${['FL', 'FR', 'BL', 'BR'][i]} ${fmt(v)}`);
            ui.out(`wf_${i}`, fmt(v), v > 0.005 ? 'forwards' : v < -0.005 ? 'backwards' : 'stopped');
            ui.tone(`wf_${i}`, Math.abs(M.raw[i]) > 1.001 ? 'warn' : '');
          });
          const sp = Math.hypot(vf, vs * 0.75);
          netP.rotation.y = Math.atan2(-vs * 0.75, vf);
          net.set(sp * 2.6);
          const sg = (v) => (v < 0 ? `- ${fmt(-v)}` : `+ ${fmt(v)}`);
          ui.hud(`<pre>frontLeft  = f + s + t = ${fmt(f)} ${sg(s)} ${sg(t)} = <i>${fmt(M.raw[0])}</i>\nfrontRight = f - s - t = ${fmt(f)} ${sg(-s)} ${sg(-t)} = <i>${fmt(M.raw[1])}</i>\nbackLeft   = f - s + t = ${fmt(f)} ${sg(-s)} ${sg(t)} = <i>${fmt(M.raw[2])}</i>\nbackRight  = f + s - t = ${fmt(f)} ${sg(s)} ${sg(-t)} = <i>${fmt(M.raw[3])}</i>${M.big > 1.001 ? `\n<i>// biggest is ${fmt(M.big)}: divide all four by it</i>` : ''}</pre>`);
          ui.note(M.big > 1.001 ? `One wheel was asked for <b>${fmt(M.big)}</b>, more than full power. All four were divided by ${fmt(M.big)} so the robot keeps its direction.` : f === 0 && s === 0 && t === 0 ? 'All three wishes are 0, so every wheel gets 0. Turn a knob.' : vt === 0 && Math.abs(vf) < 0.01 ? '<b>Strafing.</b> Look at the yellow arrows: two wheels forward, two backward. The orange floor pushes all lean the same sideways way.' : Math.abs(vt) > 0.01 && sp < 0.01 ? '<b>Spinning on the spot.</b> Left wheels one way, right wheels the other.' : 'Yellow: which way each motor spins. Orange: the push each wheel gets from the floor. Teal: where the whole robot goes.');
        },
      };
    },
  };

  // ------------------------------------------------------------ 4. Tank or mecanum
  const tank = {
    id: 'tank', tab: 'Tank or mecanum',
    title: 'Why not just use normal wheels?',
    big: 'Mecanum wheels buy sideways movement and pay for it with grip.',
    lead: 'A robot with normal wheels is called a <b>tank drive</b>. It goes forward, back and turns, but never sideways. To move one step to the right it must turn, drive and turn back. A mecanum robot just slides over. That saves time when lining up, but it costs grip.',
    real: 'Our StarterBot uses mecanum so drivers can slide sideways to line up a shot while the launcher keeps pointing at the goal.',
    try: 'Set how far to the side the goal is, then press Race.',
    controls: [
      { id: 'wt_d', label: 'Goal is this far to the right', min: 20, max: 120, step: 5, value: 60, unit: ' cm' },
      { type: 'button', id: 'wt_go', label: 'Race!' },
    ],
    readouts: [['wt_m', 'Mecanum', 'slides straight there'], ['wt_t', 'Tank', 'turn, drive, turn back'], ['wt_w', 'Mecanum saves']],
    more: [
      ['Where did those times come from?', 'They are estimates. Tank: two quarter turns at about 0.45 s each, plus the drive at 1.5 m/s. Mecanum: a strafe at about 1.1 m/s, since sideways is slower than forward. Both get 0.15 s to get moving.'],
      ['So is mecanum always better?', 'No. Tank wheels grip harder, so a tank robot wins pushing matches and climbs bumps better. It is also simpler to build and to code. Mecanum is the pick when lining up quickly matters more than shoving, which is why the StarterBot uses it.'],
      ['What other drives are there?', 'Swerve drive turns each wheel like a shopping trolley caster with its own steering motor. It is fast in every direction and grips well, but it has twice as many motors and is hard to build.'],
    ],
    build(st, S, ui) {
      const U = 0.1; // scene units per centimetre
      const fl = field(24, 8, { wall: false });
      const m = miniBot({ k: 1.15 }), tk = miniBot({ k: 1.15, tank: true });
      const z = [-4.6, 4.6], x0 = -7;
      const spot = (zz) => { const g = group(); for (const [w, d, px, pz] of [[4.6, 0.12, 0, -2.5], [4.6, 0.12, 0, 2.5], [0.12, 5, -2.3, 0], [0.12, 5, 2.3, 0]]) g.add(box(w, 0.04, d, mat(C.volt, { glow: true, glowPower: 0.5 }), { r: 0, pos: [px, 0.03, pz] })); g.position.z = zz; return g; };
      const spots = z.map(spot);
      st.add(fl, m.g, tk.g, ...spots);
      const lm = st.label('Mecanum', m.g, { dy: -60, tone: 'volt' }), lt = st.label('Tank', tk.g, { dy: -60 });
      st.label('Goal', spots[0], { dy: 0 });
      let t = 0, run = true;
      const times = () => { const d = S.wt_d / 100; return { me: 0.15 + d / 1.1, turn: 0.45, drv: 0.15 + d / 1.5, get ta() { return this.turn * 2 + this.drv; } }; };
      return {
        view: { pos: [0, 22, 20], target: [0, 0, 0.5] },
        groundY: -0.16,
        change(id) { if (id === 'wt_go' || id === 'wt_d') { t = 0; run = true; } },
        tick(dt) {
          const T = times(), d = S.wt_d * U;
          if (run) t += dt * 0.5; // half speed, so the three tank steps can be seen
          if (t > T.ta + 1.2) run = false;
          for (const sp of spots) sp.position.x = x0 + d;
          const km = smooth(clamp(t / T.me, 0, 1));
          m.g.position.set(x0 + d * km, 0, z[0]);
          m.wheels.forEach((w, i) => { if (t < T.me && run) w.spin.rotation.x -= [1, -1, -1, 1][i] * dt * 4; });
          const a = smooth(clamp(t / T.turn, 0, 1)), b = smooth(clamp((t - T.turn) / T.drv, 0, 1)), c = smooth(clamp((t - T.turn - T.drv) / T.turn, 0, 1));
          tk.g.position.set(x0 + d * b, 0, z[1]);
          tk.g.rotation.y = -(a - c) * Math.PI / 2;
          const phase = t < T.turn ? 1 : t < T.turn + T.drv ? 2 : t < T.ta ? 3 : 0;
          tk.wheels.forEach((w) => { if (run && phase) w.spin.rotation.x -= (phase === 2 ? 1 : (phase === 1 ? -w.sx : w.sx)) * dt * 4; });
          lm.text(t >= T.me ? `Mecanum: there in ${T.me.toFixed(1)} s` : 'Mecanum: strafing');
          lt.text(phase === 1 ? 'Tank: 1. turn' : phase === 2 ? 'Tank: 2. drive' : phase === 3 ? 'Tank: 3. turn back' : t >= T.ta ? `Tank: there in ${T.ta.toFixed(1)} s` : 'Tank');
          ui.out('wt_m', `${T.me.toFixed(1)} s`);
          ui.out('wt_t', `${T.ta.toFixed(1)} s`);
          ui.out('wt_w', `${(T.ta - T.me).toFixed(1)} s`, 'every time it lines up');
          ui.tone('wt_m', 'good');
          ui.label('wt_go', run ? 'Racing…' : 'Race again');
          ui.note(`Lining up ${S.wt_d} cm sideways: mecanum about <b>${T.me.toFixed(1)} s</b>, tank about <b>${T.ta.toFixed(1)} s</b>. Do that 15 times in a match and mecanum has saved ${((T.ta - T.me) * 15).toFixed(0)} seconds. The price: less grip when another robot pushes.`);
        },
      };
    },
  };

  return { title: 'Mecanum wheels', chapters: [size, roller, four, tank] };
}
