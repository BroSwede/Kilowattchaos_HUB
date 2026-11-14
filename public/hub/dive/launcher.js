// How it works: the launcher. One Hogback wheel, spun fast, pinches each ball against a curved hood and throws it.
// The numbers match the Launcher sim in the Build zone: a 96 mm wheel, a 76 mm ball, exit speed about half the rim speed.
import { THREE, C, mat, metal, plastic, mesh, cyl, box, ball, group, arrow, clamp, lerp, smooth, TAU } from './kit.js';
import { miniBot, screen, graph } from './works.js';
import { miniMotor } from './motor.js';

export const BALL = 76.2; // mm across
export const BALL_COL = '#B394FF';
const G = 9.81, H0 = 0.3; // gravity, and how high off the floor the ball leaves (metres)
// How much of the wheel's push gets into the ball. Best at 12 mm of squeeze, the same curve as the Build zone sim.
export const grip = (cmp) => clamp(1 - Math.abs(cmp - 12) / 16, 0.3, 1);
// Rim speed in metres a second for a wheel `d` mm across.
export const surface = (rpm, d) => (Math.PI * (d / 1000) * rpm) / 60;
// Sample numbers for one shot on a wheel like ours: it loses about 14% of its speed and wins it back with a 0.4 s time constant.
export const RECOVER = { take: 0.26, tau: 0.4 };
const TARGET = 2400; // rpm that drops a 48 degree shot into the sample goal 2.65 m away

export function flight(v, angDeg) {
  const th = (angDeg * Math.PI) / 180, vx = v * Math.cos(th), vy = v * Math.sin(th);
  const T = (vy + Math.sqrt(vy * vy + 2 * G * H0)) / G;
  return { vx, vy, T, range: vx * T, apex: H0 + (vy * vy) / (2 * G), at: (t) => [vx * t, H0 + vy * t - 0.5 * G * t * t] };
}

// ---- A Hogback-style launcher wheel. Axle along Z, so it reads well from the side.
export function flywheel(R = 2.4, w = 1.3) {
  const spin = group();
  const rubber = mat('#232627', { rough: 0.88 });
  spin.add(cyl(R * 0.94, w, rubber, { axis: 'z', seg: 56 }));
  const hump = box(R * 0.13, R * 0.1, w * 0.98, rubber, { r: R * 0.03 });
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * TAU, b = hump.clone();
    b.position.set(Math.cos(a) * R * 0.955, Math.sin(a) * R * 0.955, 0);
    b.rotation.z = a + Math.PI / 2;
    spin.add(b);
  }
  spin.add(
    cyl(R * 0.62, w * 1.04, mat('#3A3F41', { rough: 0.6, metal: 0.3 }), { axis: 'z', seg: 40 }),
    cyl(R * 0.34, w * 1.12, plastic(C.volt, 0.4), { axis: 'z', seg: 32 }),
    cyl(R * 0.1, w * 1.7, metal(C.steel, 0.25), { axis: 'z', seg: 6 }),
    box(R * 0.5, R * 0.08, w * 1.07, mat(C.white, { rough: 0.6 }), { r: 0, pos: [R * 0.66, 0, 0] }), // one pale stripe so the eye can follow the spin
  );
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.5; spin.add(cyl(R * 0.07, w * 1.06, C.black, { axis: 'z', seg: 12, pos: [Math.cos(a) * R * 0.48, Math.sin(a) * R * 0.48, 0] })); }
  return { g: group(spin), spin, R };
}
// ---- A game ball with two pale bands, so you can see it spin.
export function gameBall(r = 1.905, color = BALL_COL) {
  const band = mat('#E9E1FF', { rough: 0.5 });
  const a = mesh(new THREE.TorusGeometry(r * 0.985, r * 0.045, 8, 40), band), b = a.clone();
  b.rotation.y = Math.PI / 2;
  return group(ball(r, plastic(color, 0.5, 0.3), { seg: 36 }), a, b);
}
// A curved band (the hood) with inner radius r0. Extruded along Z.
export function arcBand(r0, r1, a0, a1, depth, material) {
  const sh = new THREE.Shape(), n = 30;
  for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); sh[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r1, Math.sin(a) * r1); }
  for (let i = n; i >= 0; i--) { const a = lerp(a0, a1, i / n); sh.lineTo(Math.cos(a) * r0, Math.sin(a) * r0); }
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false });
  g.translate(0, 0, -depth / 2);
  return mesh(g, material);
}
const deg = (d) => (d * Math.PI) / 180;

// ---- The robot, a strip of floor with metre marks, and a sample goal. Shared by the two chapters that throw a ball across the room.
function range(st) {
  const M = 4; // scene units per metre
  st.add(box(28, 0.2, 7, mat('#8D9391', { rough: 0.9 }), { r: 0.04, pos: [10, -0.1, 0] }));
  for (let m = 1; m <= 5; m++) {
    st.add(box(0.06, 0.02, 2.4, C.white, { r: 0, pos: [m * M, 0.012, 2.2] }));
    st.label(`${m} m`, new THREE.Vector3(m * M, 0, 3.6));
  }
  const bot = miniBot({ k: 0.72, top: false });
  bot.g.rotation.y = -Math.PI / 2;
  bot.g.position.set(-1.1, 0, 0);
  bot.nose.visible = false;
  const tower = group();
  for (const z of [-0.55, 0.55]) tower.add(box(0.16, 0.9, 0.16, metal(C.alu, 0.4), { r: 0.02, pos: [-0.75, 0.95, z] }), box(0.7, 0.12, 0.12, metal(C.alu, 0.4), { r: 0.02, pos: [-0.45, 1.0, z] }));
  const aim = group(); // pivots at the point where the ball leaves
  aim.position.set(0, H0 * M, 0);
  const wheel = flywheel(0.4, 0.34);
  wheel.g.position.set(-0.5, -0.58, 0);
  const hoodM = plastic(C.orange, 0.45);
  aim.add(wheel.g, box(1.25, 0.07, 0.8, hoodM, { r: 0.02, pos: [-0.62, 0.36, 0] }), box(0.5, 0.07, 0.8, hoodM, { r: 0.02, pos: [-1.05, -0.36, 0] }));
  for (const z of [-0.42, 0.42]) aim.add(box(1.25, 0.8, 0.04, mat('#D9DDDC', { opacity: 0.3, rough: 0.2 }), { r: 0, pos: [-0.62, 0, z] }));
  st.add(bot.g, tower, aim);

  const honey = mat('#E3A72F', { rough: 0.5, glow: '#E3A72F', glowPower: 0.05 });
  const goal = group(
    box(2.0, 0.1, 1.9, honey, { r: 0.03, pos: [0, 0.9 * M - 0.05, 0] }),
    box(0.1, 1.8, 1.9, honey, { r: 0.03, pos: [1.05, 0.9 * M + 0.85, 0] }),
    box(0.1, 0.5, 1.9, honey, { r: 0.03, pos: [-1.05, 0.9 * M + 0.2, 0] }),
    box(2.2, 1.25, 0.06, mat('#E3A72F', { opacity: 0.3, rough: 0.3 }), { r: 0, pos: [0, 0.9 * M + 0.58, -0.95] }),
    cyl(0.12, 0.9 * M, metal(C.iron, 0.5), { pos: [1.05, 0.45 * M, -0.6], seg: 16 }),
    cyl(0.7, 0.08, metal(C.iron, 0.5), { pos: [1.05, 0.04, -0.6], seg: 24 }),
  );
  st.add(goal);
  const lg = st.label('Sample goal', goal, { off: new THREE.Vector3(0, 0.9 * M + 2.1, 0) });
  const dotM = mat(C.volt, { glow: true, glowPower: 0.7 });
  const dots = Array.from({ length: 44 }, () => { const d = ball(0.075, dotM, { seg: 8 }); d.userData.noShadow = true; st.add(d); return d; });
  const b = gameBall(0.3);
  st.add(b);
  let f = null, tEnd = 1, hit = false, tt = 0, far = 2.65;
  return {
    M, aim, wheel, goal, bot,
    // Work out the shot and lay the dotted path. Returns what happened.
    set(v, ang, farM) {
      far = farM;
      f = flight(v, ang);
      hit = false; tEnd = f.T;
      for (let k = 1; k <= 240; k++) {
        const t = (k / 240) * f.T, [x, y] = f.at(t);
        if (x >= far - 0.25 && x <= far + 0.25 && y >= 0.9 && y <= 1.2) { hit = true; tEnd = t; break; }
        if (x > 5.9) { tEnd = t; break; }
      }
      goal.position.x = far * M;
      aim.rotation.z = deg(ang);
      honey.emissiveIntensity = hit ? 0.9 : 0.05;
      dots.forEach((d, i) => { const [x, y] = f.at((i / 43) * tEnd); d.position.set(x * M, Math.max(0.08, y * M), 0); });
      lg.text(hit ? 'In the goal' : 'Sample goal');
      const tf = far / f.vx, yFar = tf < f.T ? f.at(tf)[1] : 0; // how high the ball is when it gets to the goal
      return { hit, range: f.range, apex: f.apex, yFar, short: yFar < 1.05 };
    },
    tick(dt, rimTurnsPerSec) {
      if (!f) return;
      tt += dt * 0.7;
      if (tt > tEnd + 0.9) tt = 0;
      const t = Math.min(tt, tEnd), [x, y] = f.at(t);
      b.position.set(x * M, Math.max(0.3, y * M), 0);
      if (tt < tEnd) b.rotation.z += dt * 9;
      wheel.spin.rotation.z -= clamp(rimTurnsPerSec, 0, 100) * dt * 0.35;
    },
  };
}

export default function launcher() {
  // ------------------------------------------------------------ 1. Wheel to ball
  const speed = {
    id: 'speed', tab: 'Wheel to ball',
    title: 'The ball leaves at half the wheel’s speed',
    big: 'A spinning wheel squeezes the ball against a still wall, and the ball comes out at about half the speed of the wheel’s rim.',
    lead: 'Our launcher is one fast wheel, called a <b>flywheel</b>, next to a curved wall called a <b>hood</b>. The ball is pinched between them. The side touching the wheel is dragged along at the rim’s speed. The side touching the hood is not moving at all. The middle of the ball goes at the average of the two: <b>half</b>. So the ball rolls out, spinning backwards.',
    real: 'Our flywheel is a <b>96 mm Hogback wheel</b> and the balls are 76 mm (3 in.) across. The launcher mount holds the gap fixed, so every ball gets the same squeeze.',
    try: 'Turn the flywheel speed up. Then make the squeeze too loose or too tight.',
    controls: [
      { type: 'knob', id: 'la_rpm', label: 'Flywheel speed', min: 500, max: 6000, step: 50, value: TARGET, unit: ' rpm' },
      { type: 'seg', id: 'la_wheel', label: 'Wheel', value: '96', options: [['96', '96 mm (ours)'], ['72', '72 mm']] },
      { id: 'la_cmp', label: 'Squeeze on the ball', min: 2, max: 24, step: 1, value: 12, unit: ' mm' },
    ],
    readouts: [['la_vs', 'Rim speed', 'π × diameter × turns a second'], ['la_v', 'Ball leaves at', 'about half the rim speed'], ['la_k', 'That is', 'kilometres an hour'], ['la_spin', 'Backspin', 'turns a second']],
    more: [
      ['Show me the math', 'A 96 mm wheel is 0.096 m across, so one turn of the rim is 3.14 × 0.096 = <b>0.30 m</b>. At 2,400 rpm it makes 40 turns a second. 40 × 0.30 = <b>12 m/s</b> at the rim. Half of that is <b>6 m/s</b> for the ball, about 22 km/h.'],
      ['Why exactly half?', 'Think of a pencil rolling under your flat hand on a desk. Your hand moves 10 cm, the pencil only moves 5 cm. The desk side of the pencil is stuck, the hand side moves with your hand, and the middle splits the difference. The hood is the desk and the flywheel is your hand.'],
      ['How do you get more than half?', 'Use two wheels, one on each side, spinning toward each other. Now both sides of the ball are moving, so it leaves at nearly the full rim speed. It costs a second motor, and both wheels must match.'],
      ['Why does squeeze matter?', 'Too loose and the wheel slips across the ball like a tyre on ice. Too tight and the energy goes into squashing the ball instead of throwing it. About 12 mm of squeeze is a good place to start. Rule of thumb, not a law: test it on real balls.'],
    ],
    build(st, S, ui) {
      const U = 1 / 20, rB = (BALL / 2) * U; // scene units per millimetre
      const plate = box(12.5, 13.5, 0.3, metal(C.alu, 0.42), { r: 0.08, pos: [-1.2, -0.6, -1.25] });
      const holes = group();
      for (let i = -6; i <= 6; i++) for (let j = -7; j <= 7; j++) if ((i + j) % 2 === 0 && Math.hypot(i * 0.8 + 1.2, j * 0.8 + 0.6) > 1.2) holes.add(cyl(0.16, 0.32, C.dark, { axis: 'z', seg: 10, pos: [-1.2 + i * 0.8, -0.6 + j * 0.8, -1.25] }));
      const wheel = flywheel(2.4, 1.3);
      const mm = miniMotor(0.5, 1.0, true);
      mm.g.rotation.y = -Math.PI / 2;
      mm.g.position.set(0, 0, -3.6);
      const hoodM = plastic(C.orange, 0.42);
      const hood = arcBand(1, 1.07, deg(133), deg(202), 2.6, hoodM);
      const guide = box(7.2, 0.4, 2.6, hoodM, { r: 0.06 });
      const sq = group(), spin = gameBall(rB);
      sq.add(spin);
      const aW = arrow(1, C.orange, 0.11), aC = arrow(1, C.volt, 0.11), dot = ball(0.22, mat(C.red, { glow: true, glowPower: 0.6 }), { seg: 12 });
      for (const a of [aW, aC, dot]) { a.traverse((o) => { o.userData.noShadow = true; }); a.position.z = 1.6; }
      st.add(plate, holes, mm.g, wheel.g, hood, guide, sq, aW, aC, dot);
      const lw = st.label('Rim', wheel.g, { off: new THREE.Vector3(1.6, -2.9, 0), tone: 'volt' });
      const lb = st.label('Ball', sq, { dy: -44 });
      st.label('Hood: not moving', hood, { off: new THREE.Vector3(-6.6, 1.2, 0) });
      const A0 = deg(200), A1 = deg(135), FEED = 7, OUT = 9, SLOW = 40;
      const tan = (a) => [Math.sin(a), -Math.cos(a)];
      let s = 0, roll = 0;
      return {
        view: { pos: [1.5, 2.5, 30], target: [-0.5, 1.2, 0] },
        groundY: -7.6,
        tick(dt) {
          const d = +S.la_wheel, rpm = S.la_rpm, cmp = S.la_cmp;
          const R = (d / 2) * U, c = cmp * U, Rc = R + rB - c / 2, Rh = R + 2 * rB - c;
          const vs = surface(rpm, d), gk = grip(cmp), v = 0.5 * gk * vs;
          wheel.g.scale.setScalar(R / 2.4);
          hood.scale.set(Rh, Rh, 1);
          const [tx, ty] = tan(A0), P0 = [Math.cos(A0) * Rc, Math.sin(A0) * Rc];
          guide.position.set(Math.cos(A0) * (Rh + 0.2) - tx * (FEED / 2), Math.sin(A0) * (Rh + 0.2) - ty * (FEED / 2), 0);
          guide.rotation.z = Math.atan2(ty, tx);
          wheel.spin.rotation.z -= ((vs / (d / 2000)) * dt) / SLOW;
          const vu = (v * 1000 * U) / SLOW, arcLen = Rc * (A0 - A1);
          s += vu * dt;
          if (s > FEED + arcLen + OUT) s = 0;
          roll += (vu / rB) * dt;
          let p, th = A0, squash = 0;
          const inArc = s >= FEED && s <= FEED + arcLen;
          if (s < FEED) { p = [P0[0] - tx * (FEED - s), P0[1] - ty * (FEED - s)]; squash = smooth(1 - (FEED - s) / 0.9); } else if (inArc) {
            th = A0 - (s - FEED) / Rc; p = [Math.cos(th) * Rc, Math.sin(th) * Rc]; squash = 1;
          } else {
            const o = s - FEED - arcLen, [ex, ey] = tan(A1);
            th = A1; p = [Math.cos(A1) * Rc + ex * o, Math.sin(A1) * Rc + ey * o]; squash = smooth(1 - o / 0.9);
          }
          sq.position.set(p[0], p[1], 0);
          sq.rotation.z = th;
          sq.scale.set(1 - (squash * c) / (2 * rB), 1 + (squash * c) / (5 * rB), 1);
          spin.rotation.z = roll - th;
          // Speed arrows across the ball: full speed on the wheel side, half in the middle, zero on the hood side.
          aW.visible = aC.visible = dot.visible = inArc;
          if (inArc) {
            const [ax, ay] = tan(th), rot = Math.atan2(ay, ax) - Math.PI / 2, L = 1.2 + 3.2 * (vs / 30);
            aW.position.set(Math.cos(th) * (R + 0.1), Math.sin(th) * (R + 0.1), 1.6); aW.rotation.z = rot; aW.scale.set(1, L, 1);
            aC.position.set(p[0], p[1], 2.1); aC.rotation.z = rot; aC.scale.set(1, L * 0.5 * gk, 1);
            dot.position.set(Math.cos(th) * (Rh - 0.1), Math.sin(th) * (Rh - 0.1), 1.6);
          }
          lw.text(`Rim: ${vs.toFixed(1)} m/s`);
          lb.text(`Ball: ${v.toFixed(1)} m/s`);
          ui.hud(`<span class="chip">Shown <b>${SLOW}×</b> slower than real life</span><span class="chip"><b>${(rpm / 60).toFixed(0)}</b> turns a second</span>`);
          ui.out('la_vs', `${vs.toFixed(1)} m/s`, `3.14 × ${d} mm × ${(rpm / 60).toFixed(0)}`);
          ui.out('la_v', `${v.toFixed(1)} m/s`, gk > 0.95 ? 'about half the rim speed' : `only ${Math.round(50 * gk)}% of the rim speed`);
          ui.tone('la_v', gk > 0.8 ? 'good' : 'warn');
          ui.out('la_k', `${(v * 3.6).toFixed(0)} km/h`);
          ui.out('la_spin', `${(v / (Math.PI * BALL / 1000)).toFixed(0)}`);
          ui.note(cmp < 6 ? '<b>Too loose.</b> The wheel barely touches the ball, so it slips and the ball leaves slowly.' : cmp > 18 ? '<b>Too tight.</b> The energy goes into squashing the ball, not throwing it, and the motor works harder.' : `<b>Good squeeze.</b> Rim at ${vs.toFixed(1)} m/s, hood at 0, so the middle of the ball goes ${v.toFixed(1)} m/s. The orange arrow is twice as long as the yellow one.`, cmp < 6 || cmp > 18 ? 'warn' : '');
        },
      };
    },
  };

  // ------------------------------------------------------------ 2. Angle and arc
  const arc = {
    id: 'arc', tab: 'Angle and arc',
    title: 'Speed and angle decide where it lands',
    big: 'Once the ball leaves, only gravity steers it, so its speed and its angle at the start decide the whole flight.',
    lead: 'After the ball leaves the wheel, nothing pushes it any more. Gravity pulls it down the whole way, so its path is a curve called an <b>arc</b>. Two numbers pick the arc: <b>how fast</b> it leaves and at <b>what angle</b>. A steep angle goes high and drops in from above. A flat angle is quick but skims the edge. More speed stretches the whole arc.',
    real: 'The hood sets our launch angle and the code sets the flywheel speed. If drivers shoot from a new spot, one of the two has to change, or the same shot lands short or long.',
    try: 'Get the ball in the goal. Then move the robot back and get it in again.',
    controls: [
      { type: 'knob', id: 'la_rpm', label: 'Flywheel speed', min: 500, max: 6000, step: 50, value: TARGET, unit: ' rpm' },
      { id: 'la_ang', label: 'Launch angle', min: 20, max: 70, step: 1, value: 48, unit: '°' },
      { id: 'la_far', label: 'Distance to the goal', min: 1.5, max: 4.5, step: 0.05, value: 2.65, fmt: (v) => `${v.toFixed(2)} m` },
    ],
    readouts: [['lb_v', 'Ball leaves at', 'half the rim speed'], ['lb_h', 'Highest point', 'above the floor'], ['lb_d', 'Height at the goal', 'the opening is 0.9 to 1.2 m up'], ['lb_r', 'Result']],
    more: [
      ['Why is 45° not always best?', 'On flat ground 45° throws furthest. But our goal is <b>up high</b> and has an opening on top. A steeper shot comes down into the opening, like a basketball shot. A flat shot has to squeeze in past the front edge, so it has less room for error.'],
      ['Two ways to hit the same spot', 'Try 2,400 rpm at 48°. Now try a steeper angle with more speed. Both can land in the goal. The steeper one drops in from above and forgives small speed mistakes. The flatter one gets there sooner.'],
      ['What does this leave out?', 'Air. A real ball is slowed by the air and its backspin lifts it a little. So real shots usually fall a bit shorter than this. The goal here is a sample box, not the real field goal: always tune on the real field.'],
    ],
    build(st, S, ui) {
      const R = range(st);
      const fresh = () => {
        const v = 0.5 * surface(S.la_rpm, 96), r = R.set(v, S.la_ang, S.la_far);
        ui.out('lb_v', `${v.toFixed(1)} m/s`);
        ui.out('lb_h', `${r.apex.toFixed(2)} m`);
        ui.out('lb_d', r.yFar > 0 ? `${r.yFar.toFixed(2)} m` : 'on the floor');
        ui.out('lb_r', r.hit ? 'In' : r.short ? 'Short' : 'Over');
        ui.tone('lb_r', r.hit ? 'good' : 'warn');
        ui.note(r.hit ? '<b>In the goal.</b> Write down the speed, angle and distance. On the real robot that is a line in the session note.' : r.short ? '<b>Short.</b> The ball is too low by the time it reaches the goal. Add flywheel speed, or try a different angle.' : '<b>Over.</b> The ball is still too high when it reaches the goal. Take some speed off, or change the angle.', r.hit ? 'good' : 'warn');
      };
      fresh();
      return {
        view: { pos: [10, 6, 31], target: [10, 3.3, 0] },
        groundY: -0.2,
        change: fresh,
        tick(dt) { R.tick(dt, S.la_rpm / 60); ui.hud('<span class="chip">No air drag, so real shots fall a little shorter</span>'); },
      };
    },
  };

  // ------------------------------------------------------------ 3. Spin back up
  const recover = {
    id: 'recover', tab: 'Spin back up',
    title: 'Every shot steals speed from the wheel',
    big: 'The ball’s energy comes out of the spinning wheel, so the wheel slows down with every shot and needs a moment to speed up again.',
    lead: 'A spinning wheel stores energy, like a wound-up toy. Throwing a ball <b>spends</b> some of it, so the wheel slows down. Then the motor has to top it up again. Fire the next ball too soon and the wheel is still slow, so that ball comes out slower and <b>lands short</b>. The dips on the graph are the shots.',
    real: 'This is why our hopper servo lets balls through <b>one at a time</b>, with a short wait. Three balls in one second sounds great, but the second and third would fall short.',
    try: 'Shorten the time between shots until balls start missing the hoop. Then try a heavier wheel.',
    controls: [
      { id: 'lr_gap', label: 'Time between shots', min: 0.2, max: 2, step: 0.05, value: 1, fmt: (v) => `${v.toFixed(2)} s` },
      { type: 'seg', id: 'lr_mass', label: 'Flywheel', value: '1', options: [['0.5', 'Lighter'], ['1', 'Like ours'], ['2', 'Heavier']] },
    ],
    readouts: [['lr_now', 'Flywheel now', `target ${TARGET.toLocaleString('en-US')} rpm`], ['lr_drop', 'One shot costs', 'of the wheel’s speed'], ['lr_rec', 'Back to speed in', 'to within 3%'], ['lr_last', 'Last ball left at', 'of full speed']],
    more: [
      ['Where does the energy go?', 'Into the ball: moving forward, and spinning. A little is lost squashing it. With numbers like ours the wheel holds roughly 5 joules at 2,400 rpm and each ball takes something like 1 to 1.5 joules. These are estimates: we have not weighed our wheel or the balls.'],
      ['Why does a heavier wheel help?', 'A heavy wheel stores more energy at the same speed, so one ball takes a smaller slice and the dip is smaller. The price: the motor needs longer to spin it up from a stop at the start of the match.'],
      ['How does the code know it is ready?', 'The encoder on the launcher motor reports the speed. Good code checks “is the flywheel within a few percent of the target?” before it lets the servo feed the next ball.'],
    ],
    build(st, S, ui) {
      const wheel = flywheel(2.4, 1.3);
      const rig = group(wheel.g);
      rig.position.set(-9, 5, 0);
      const mm = miniMotor(0.5, 1.0, true);
      mm.g.rotation.y = -Math.PI / 2;
      mm.g.position.set(-9, 5, -3.6);
      const hoodM = plastic(C.orange, 0.42);
      const hood = arcBand(5.9, 6.3, deg(133), deg(205), 2.6, hoodM);
      hood.position.set(-9, 5, 0);
      const stand = group(box(10, 10.5, 0.3, metal(C.alu, 0.42), { r: 0.08, pos: [-10.6, 5.6, -1.5] }), box(1.2, 5, 0.3, metal(C.alu, 0.42), { r: 0.06, pos: [-9, 2.5, -1.3] }), box(5, 0.3, 4, metal(C.alu, 0.42), { r: 0.06, pos: [-9, 0.15, -0.6] }));
      const floor = box(34, 0.2, 9, mat('#8D9391', { rough: 0.9 }), { r: 0.04, pos: [-1, -0.1, -1] });
      // Where the ball leaves: the 135 degree point of the pinch, heading up and to the right.
      const P = [-9 + Math.cos(deg(135)) * 4.2, 5 + Math.sin(deg(135)) * 4.2], ANG = deg(40), V0 = 13.06, GG = 12, HX = P[0] + 14;
      const ringM = mat(C.volt, { glow: true, glowPower: 0.35 });
      const hoop = group(mesh(new THREE.TorusGeometry(2.9, 0.16, 10, 48), ringM, [0, 0, 0], [0, Math.PI / 2, 0]), cyl(0.12, P[1] - 2.9, metal(C.iron, 0.5), { pos: [0, -(P[1] - 2.9) / 2 - 2.9, 0], seg: 12 }));
      hoop.position.set(HX, P[1], 0);
      const scr = screen(14, 6.2, 900);
      scr.g.position.set(5.5, 15.4, -4);
      scr.g.rotation.y = -0.28;
      st.add(floor, stand, mm.g, rig, hood, hoop, scr.g);
      st.label('Full-speed shots pass through here', hoop, { off: new THREE.Vector3(0, 3.6, 0) });
      const lw = st.label('Flywheel', rig, { off: new THREE.Vector3(0, -3.4, 0), tone: 'volt' });
      const balls = Array.from({ length: 6 }, () => { const b = gameBall(1.905); b.visible = false; st.add(b); return { g: b, t: -1, f: 1 }; });
      let f = 0, time = 0, next = 1.6, hist = [], shots = [], last = 1, lastDraw = 0, good = 0, bad = 0;
      return {
        view: { pos: [-13, 11, 37], target: [-1.5, 7.6, 0] },
        groundY: -0.2,
        change(id) { if (id === 'lr_mass') { good = bad = 0; } },
        tick(dt) {
          const I = +S.lr_mass, gap = S.lr_gap, tau = RECOVER.tau * I, keep = Math.sqrt(1 - RECOVER.take / I);
          dt = Math.min(dt, 0.05);
          time += dt;
          f += ((1 - f) / tau) * dt;
          if (time >= next) {
            next = time + gap;
            const b = balls.find((x) => x.t < 0);
            if (b) { b.t = 0; b.f = f; b.g.visible = true; }
            last = f;
            shots.push([time, f]);
            if (f >= 0.965) good++; else bad++;
            f *= keep;
          }
          hist.push([time, f]);
          while (hist.length && hist[0][0] < time - 6) hist.shift();
          while (shots.length && shots[0][0] < time - 6) shots.shift();
          rig.scale.z = lerp(rig.scale.z, I === 0.5 ? 0.6 : I === 2 ? 1.9 : 1, 0.15);
          wheel.spin.rotation.z -= f * 9 * dt;
          for (const b of balls) {
            if (b.t < 0) continue;
            b.t += dt;
            const v = V0 * b.f, x = v * Math.cos(ANG) * b.t, y = v * Math.sin(ANG) * b.t - 0.5 * GG * b.t * b.t;
            b.g.position.set(P[0] + x, P[1] + y, 0);
            b.g.rotation.z += dt * 7;
            if (P[1] + y < 1.9 || x > 24) { b.t = -1; b.g.visible = false; }
          }
          ringM.emissiveIntensity = lerp(ringM.emissiveIntensity, last >= 0.965 ? 0.9 : 0.15, 0.1);
          if (time - lastDraw > 0.05) {
            lastDraw = time;
            const g = graph(scr, { title: 'Flywheel speed', x0: time - 6, x1: time, y0: 1000, y1: 2600, xl: 'the last 6 seconds', yl: 'rpm' });
            g.grid([], [1200, 1600, 2000, 2400]);
            g.line([[time - 6, TARGET], [time, TARGET]], 'rgba(244,244,240,0.6)', 2, [8, 8]);
            g.line(hist.map(([t, v]) => [t, v * TARGET]), C.volt, 5);
            for (const [t, v] of shots) g.dot(t, v * TARGET, v >= 0.965 ? C.volt : C.orange, 10);
            g.text('target', time - 5.9, TARGET + 50, 'rgba(244,244,240,0.75)');
            scr.flush();
          }
          const drop = 1 - keep, rec = drop > 0.03 ? tau * Math.log(drop / 0.03) : 0;
          lw.text(`${Math.round((f * TARGET) / 10) * 10} rpm`);
          ui.out('lr_now', `${(Math.round((f * TARGET) / 10) * 10).toLocaleString('en-US')} rpm`);
          ui.out('lr_drop', `${Math.round(drop * 100)}%`);
          ui.out('lr_rec', `${rec.toFixed(2)} s`);
          ui.out('lr_last', `${Math.round(last * 100)}%`);
          ui.tone('lr_last', last >= 0.965 ? 'good' : 'warn');
          ui.hud(`<span class="chip">Through the hoop: <b>${good}</b></span><span class="chip">Short: <b>${bad}</b></span>`);
          ui.note(gap < rec ? `<b>Too fast.</b> The wheel needs about ${rec.toFixed(2)} s to get back to speed, but the next ball arrives after ${gap.toFixed(2)} s. It leaves slow and drops under the hoop.` : `<b>Enough time.</b> The wheel is back at full speed before each ball arrives, so every shot is the same.`, gap < rec ? 'warn' : 'good');
        },
      };
    },
  };

  // ------------------------------------------------------------ 4. Same shot every time
  const steady = {
    id: 'steady', tab: 'Same shot every time',
    title: 'A tired battery throws short',
    big: 'Tell the motor a speed, not a power, and the shot stays the same even as the battery runs down.',
    lead: 'Set the launcher motor to a fixed <b>power</b> and its speed depends on the battery. A fresh battery spins it fast. Two minutes into a match the voltage has dropped, the wheel turns slower and shots land <b>short</b>. The fix is <b>velocity control</b>: the code reads the wheel’s real speed from the encoder and keeps adding power until it matches the speed you asked for.',
    real: 'Our launcher motor has an encoder on the back, so the code can ask for a speed in ticks per second instead of a power. It is the same “how wrong am I?” idea as the Turn to 90° chapter in Algorithms and math.',
    try: 'Turn the battery down with fixed power and watch the shot fall short. Then switch to velocity control.',
    controls: [
      { type: 'knob', id: 'ls_v', label: 'Battery', min: 11, max: 13.5, step: 0.1, value: 12.8, fmt: (v) => `${v.toFixed(1)} V` },
      { type: 'seg', id: 'ls_mode', label: 'The code sets', value: 'power', options: [['power', 'A fixed power'], ['speed', 'A speed (velocity control)']] },
    ],
    readouts: [['ls_p', 'Motor power', 'what the code sends'], ['ls_rpm', 'Flywheel', `target ${TARGET.toLocaleString('en-US')} rpm`], ['ls_d', 'Height at the goal', 'the opening is 0.9 to 1.2 m up'], ['ls_r', 'Result']],
    more: [
      ['Why does the voltage drop?', 'A battery is strongest just off the charger. As it empties, and whenever lots of motors pull at once, its voltage sags. Driving hard while shooting makes it sag more.'],
      ['How does velocity control work?', 'Many times a second the code compares the speed it wants with the speed the encoder reports. Too slow? Add power. Too fast? Take some away. With a tired battery it simply ends up sending a higher power to reach the same speed.'],
      ['Can it always keep up?', 'Only while there is power to spare. Here the wheel needs about 70% power on a fresh battery, so there is room to add more. If a shot needed 100% power on a fresh battery, there would be nothing left to add when it sags. Leave some headroom.'],
    ],
    build(st, S, ui) {
      const R = range(st);
      const bar = (x, color) => { const b = box(0.5, 1, 0.5, mat(color, { glow: true, glowPower: 0.25 }), { r: 0.05 }); const g = group(box(0.7, 0.12, 0.7, C.dark, { r: 0.03, pos: [x, 0.06, 2.4] }), b); b.position.set(x, 0.6, 2.4); st.add(g); return b; };
      const bV = bar(-4.6, C.power), bP = bar(-3.0, C.volt);
      const lV = st.label('Battery', bV, { dy: -30 }), lP = st.label('Power', bP, { dy: -30, tone: 'volt' });
      const lr = st.label('rpm', R.aim, { off: new THREE.Vector3(-0.4, 1.3, 0) });
      const FULL = 3400; // rpm at 100% power on a 12.8 V battery, so 2,400 rpm needs about 70%
      let rpm = TARGET, shown = -1;
      return {
        view: { pos: [8.2, 6, 35], target: [8.2, 3.3, 0] },
        groundY: -0.2,
        tick(dt) {
          const V = S.ls_v, top = (FULL * V) / 12.8, vel = S.ls_mode === 'speed';
          const p = vel ? clamp(TARGET / top, 0, 1) : TARGET / FULL, want = p * top;
          rpm = lerp(rpm, want, 1 - Math.exp(-dt * 4));
          const key = Math.round(rpm / 5);
          if (key !== shown) {
            shown = key;
            const r = R.set(0.5 * surface(rpm, 96), 48, 2.65);
            ui.out('ls_d', r.yFar > 0 ? `${r.yFar.toFixed(2)} m` : 'on the floor');
            ui.out('ls_r', r.hit ? 'In' : r.short ? 'Short' : 'Over');
            ui.tone('ls_r', r.hit ? 'good' : 'warn');
            ui.note(vel ? `<b>Velocity control.</b> The battery is at ${V.toFixed(1)} V, so the code sends ${Math.round(p * 100)}% power to hold ${TARGET.toLocaleString('en-US')} rpm. The shot does not change.` : r.hit ? `<b>Fixed power, healthy battery.</b> ${Math.round(p * 100)}% power happens to give about the right speed. Now turn the battery down.` : r.short ? `<b>Short.</b> Same ${Math.round(p * 100)}% power, but ${V.toFixed(1)} V only spins the wheel to ${Math.round(rpm / 10) * 10} rpm. The ball drops below the goal.` : `<b>Over.</b> A very fresh battery spins the wheel faster than the shot was tuned for.`, r.hit ? 'good' : 'warn');
          }
          R.tick(dt, rpm / 60);
          const hv = 0.4 + ((V - 10) / 3.5) * 2.6, hp = 0.2 + p * 2.8;
          bV.scale.y = hv; bV.position.y = 0.12 + hv / 2;
          bP.scale.y = hp; bP.position.y = 0.12 + hp / 2;
          lV.text(`${V.toFixed(1)} V`);
          lP.text(`${Math.round(p * 100)}% power`);
          lr.text(`${(Math.round(rpm / 10) * 10).toLocaleString('en-US')} rpm`);
          ui.out('ls_p', `${Math.round(p * 100)}%`, vel ? 'the code adjusts it' : 'never changes');
          ui.out('ls_rpm', `${(Math.round(rpm / 10) * 10).toLocaleString('en-US')} rpm`);
          ui.tone('ls_rpm', Math.abs(rpm - TARGET) < 40 ? 'good' : 'warn');
        },
      };
    },
  };

  return { title: 'The launcher', chapters: [speed, arc, recover, steady] };
}
