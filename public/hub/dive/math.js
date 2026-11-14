// How it works: the basic algorithms and math behind driving. Shaping the joystick, the robot loop,
// proportional control (turn to an angle) and driving a set distance by counting encoder ticks.
import { THREE, C, mat, metal, plastic, mesh, cyl, box, ball, group, clamp, lerp, TAU } from './kit.js';
import { miniMotor } from './motor.js';
import { mecanumWheel, miniBot, field, gamepad, screen, graph, flatArrow, fmt } from './works.js';

// Joystick shaping: ignore tiny values (deadzone), then bend the rest (power 1, 2 or 3) keeping the sign.
export function shape(x, dead, pow) {
  const a = Math.abs(x);
  if (a <= dead) return 0;
  return Math.sign(x) * ((a - dead) / (1 - dead)) ** pow;
}

// Turn-to-angle simulation. The code runs every 20 ms and sees the heading one loop late, like a real robot.
export function simTurn(kP, kD, target = 90, T = 3) {
  const K = 400, tau = 0.1, loop = 0.02, h = 0.002, stick = 0.02;
  let th = 0, w = 0, u = 0, seen = 0, seenW = 0;
  const pts = [[0, 0]];
  let peak = 0, settle = null;
  for (let t = 0, n = 0; t < T; t += h, n++) {
    if (n % 10 === 0) {
      const raw = clamp(kP * (target - seen) - kD * seenW, -1, 1);
      u = Math.abs(raw) < stick ? 0 : raw;
      seen = th; seenW = w;
    }
    w += ((K * u - w) / tau) * h;
    th += w * h;
    peak = Math.max(peak, th);
    if (Math.abs(target - th) > 3) settle = null; else if (settle === null) settle = t;
    if (n % 5 === 4) pts.push([t + h, th]);
  }
  const end = pts[pts.length - 1][1], over = Math.max(0, peak - target);
  const tail = pts.slice(-80).map((p) => p[1]), hi = Math.max(...tail), lo = Math.min(...tail);
  const verdict = hi > target + 2 && lo < target - 2 ? 'wobble' : hi - lo > 3 && end < target - 3 ? 'slow' : Math.abs(target - end) > 3 ? 'short' : over > 8 ? 'over' : settle > 1.2 ? 'slow' : 'good';
  return { pts, over, settle, end, verdict };
}
const VERDICT = {
  good: ['Just right', 'good', 'Fast, and it stops on the mark. This is what tuning feels like when it works.'],
  slow: ['Too slow', '', 'It gets there, but it crawls. A bigger kP pushes harder for the same error.'],
  short: ['Stops short', 'warn', 'Near the target the error is small, so power = kP × error is too weak to beat friction. The robot gives up early. Raise kP.'],
  over: ['Overshoots', 'warn', 'kP is so big that the robot is still going fast when it reaches 90°. It sails past and has to come back. Lower kP, or add some kD as a brake.'],
  wobble: ['Wobbles', 'warn', 'Far too much kP. It overshoots, over-corrects, overshoots again and never settles. Mentors call this oscillating.'],
};

export default function math() {
  // ------------------------------------------------------------ 1. Joystick shaping
  const stick = {
    id: 'stick', tab: 'Joystick math',
    title: 'Cleaning up the joystick',
    lead: 'A joystick gives a number from <b>-1 to 1</b>. Two problems. A worn stick never rests at exactly 0, so the robot creeps. And small moves are hard: a tiny nudge already gives a lot of power. Two small bits of math fix both. A <b>deadzone</b> treats tiny numbers as 0. <b>Squaring</b> the number makes the middle of the stick gentle while full stick is still full power.',
    try: 'Leave the stick near the middle and shrink the deadzone to 0. Then compare Straight and Squared.',
    controls: [
      { type: 'knob', id: 'ms_x', label: 'Stick', min: -1, max: 1, step: 0.01, value: 0.04, fmt: (v) => fmt(v) },
      { id: 'ms_dead', label: 'Deadzone', min: 0, max: 0.3, step: 0.01, value: 0.05, fmt: (v) => v.toFixed(2) },
      { type: 'seg', id: 'ms_curve', label: 'Curve', value: 2, options: [[1, 'Straight'], [2, 'Squared'], [3, 'Cubed']] },
    ],
    readouts: [['ms_in', 'Stick says'], ['ms_dz', 'After the deadzone'], ['ms_out', 'Motor power']],
    more: [
      ['Show me the squared math', 'Half stick is 0.5. Squared, that is 0.5 × 0.5 = <b>0.25</b>, so half stick gives a quarter power. Full stick is 1 × 1 = 1, still full power. You get fine control at low speed without losing top speed.'],
      ['Squaring a negative number makes it positive. Then how does reverse work?', 'Good catch. The code squares the size and then puts the sign back: <code>power = x * Math.abs(x)</code>. So -0.5 becomes -0.25, not +0.25.'],
      ['How big should the deadzone be?', 'Just bigger than the worst number your stick rests at. Let go of the stick, read the telemetry on the Driver Hub, and add a little. 0.05 suits most gamepads. Too big and the stick feels dead in the middle.'],
      ['Why stretch the rest after the deadzone?', 'If you only zero out the small numbers, power would jump from 0 straight to 0.05 as you leave the deadzone. Stretching what is left so it starts again from 0 keeps the motion smooth.'],
    ],
    build(st, S, ui) {
      const pad = gamepad(1.5);
      pad.g.position.set(-5.4, 0.7, 3.4);
      pad.g.rotation.x = 0.2;
      const scr = screen(9.6, 6.4, 768);
      scr.g.position.set(0.8, 4.6, -2.2);
      scr.g.rotation.x = -0.12;
      const legs = group(box(0.3, 1.6, 0.3, metal(C.alu, 0.4), { r: 0.04, pos: [-3.2, 0.7, -2.4] }), box(0.3, 1.6, 0.3, metal(C.alu, 0.4), { r: 0.04, pos: [3.2, 0.7, -2.4] }), box(8, 0.16, 1.6, metal(C.alu, 0.4), { r: 0.04, pos: [0, 0.08, -2.4] }));
      const mm = miniMotor(0.42, 1.3);
      const w = mecanumWheel(1.3, 0.9, 1);
      w.g.position.x = 2.4;
      const drive = group(mm.g, w.g);
      drive.position.set(4.6, 1.3, 3.4);
      drive.rotation.y = -0.5;
      st.add(pad.g, scr.g, legs, drive);
      st.label('Stick', pad.g, { dy: 54 });
      const lw = st.label('Motor', drive, { dy: 62 });
      let key = '';
      return {
        view: { pos: [0, 8.5, 23], target: [0, 3.3, 0.4] },
        tick(dt) {
          const x = S.ms_x, d = S.ms_dead, p = Number(S.ms_curve), out = shape(x, d, p), dz = shape(x, d, 1);
          pad.setStick(0, 0, x);
          w.spin.rotation.x -= dt * out * 9; mm.shaft.rotation.x -= dt * out * 9;
          const k = `${x}|${d}|${p}`;
          if (k !== key) {
            key = k;
            const g = graph(scr, { title: 'Stick in, motor power out', x0: -1, x1: 1, y0: -1, y1: 1, xl: 'stick', yl: 'power' });
            g.grid([-1, -0.5, 0, 0.5, 1], [-1, -0.5, 0, 0.5, 1]);
            if (d > 0) { scr.ctx.fillStyle = 'rgba(240,122,42,0.22)'; scr.ctx.fillRect(g.X(-d), g.Y(1), g.X(d) - g.X(-d), g.Y(-1) - g.Y(1)); g.text('deadzone', 0, 0.86, '#F07A2A', 'center'); }
            g.line([[-1, -1], [1, 1]], 'rgba(244,244,240,0.35)', 2, [8, 8]);
            const pts = [];
            for (let i = 0; i <= 200; i++) { const v = -1 + i / 100; pts.push([v, shape(v, d, p)]); }
            g.line(pts, C.volt, 5);
            g.line([[x, -1], [x, out]], 'rgba(244,244,240,0.5)', 2);
            g.line([[-1, out], [x, out]], 'rgba(244,244,240,0.5)', 2);
            g.dot(x, out, '#FFFFFF', 11);
            scr.flush();
          }
          lw.text(`Motor: power ${fmt(out)}`);
          ui.hud(`<pre>double x = gamepad1.left_stick_x;          <i>// ${fmt(x)}</i>\nif (Math.abs(x) < ${d.toFixed(2)}) x = 0;             <i>// deadzone</i>\npower = ${p === 1 ? 'x' : p === 2 ? 'x * Math.abs(x)' : 'x * x * x'};${' '.repeat(p === 1 ? 26 : p === 2 ? 12 : 18)}<i>// ${fmt(out)}</i></pre>`);
          ui.out('ms_in', fmt(x), Math.abs(x) <= d ? 'inside the deadzone' : '');
          ui.out('ms_dz', fmt(dz));
          ui.out('ms_out', fmt(out), out === 0 ? 'stopped' : `${Math.round(Math.abs(out) * 100)}% ${out > 0 ? 'forwards' : 'backwards'}`);
          ui.tone('ms_out', d === 0 && Math.abs(x) > 0 && Math.abs(x) < 0.08 ? 'warn' : '');
          ui.note(d === 0 && Math.abs(x) > 0 && Math.abs(x) < 0.08 ? '<b>Creeping.</b> Nobody is touching the stick, but it rests a hair off centre and with no deadzone that hair reaches the motor.' : Math.abs(x) <= d ? 'The stick is inside the orange band, so the code calls it 0. The robot sits still even though the stick is not perfectly centred.' : p === 1 ? 'Straight line: power equals stick. Simple, but twitchy at low speed.' : `With the ${p === 2 ? 'squared' : 'cubed'} curve the yellow line sags under the dashed one: the same stick push gives less power, until both meet at full stick.`, d === 0 && Math.abs(x) > 0 && Math.abs(x) < 0.08 ? 'warn' : '');
        },
      };
    },
  };

  // ------------------------------------------------------------ 2. The loop
  const loopCh = {
    id: 'loop', tab: 'The loop',
    title: 'Read, decide, act. Again. Forever.',
    lead: 'A robot program is not a list that runs once. It is a <b>loop</b>: <b>read</b> the sensors and gamepad, <b>decide</b> what to do, <b>set</b> the motors, then go straight back to the top. A good loop goes round about every 20 milliseconds, which is 50 times a second. Between two laps the robot is blind: it keeps doing whatever it was last told.',
    try: 'Make the loop slow and the robot fast. Watch how far past the line it stops.',
    controls: [
      { id: 'ml_ms', label: 'One lap of the loop takes', min: 10, max: 300, step: 10, value: 20, unit: ' ms' },
      { type: 'knob', id: 'ml_v', label: 'Robot speed', min: 0.3, max: 2, step: 0.1, value: 1.2, fmt: (v) => `${v.toFixed(1)} m/s` },
    ],
    readouts: [['ml_hz', 'Laps per second'], ['ml_gap', 'Robot moves between looks', 'speed × lap time'], ['ml_over', 'Stopped past the line by', 'this run']],
    more: [
      ['Show me the math', 'Distance between looks = speed × lap time. At 1.2 m/s with a 20 ms loop: 1.2 × 0.020 = 0.024 m = <b>2.4 cm</b>. With a 300 ms loop: 1.2 × 0.3 = <b>36 cm</b>. The robot can be anywhere up to that far past the line before it even notices.'],
      ['What makes a loop slow?', 'Anything that waits. <code>sleep(500)</code> freezes the whole loop for half a second. Reading many sensors one by one, or doing camera vision every lap, adds up too.'],
      ['Where is the loop in our code?', 'In a LinearOpMode it is <code>while (opModeIsActive()) { ... }</code>. Everything inside the curly brackets is one lap.'],
    ],
    build(st, S, ui) {
      const U = 0.1; // scene units per centimetre
      const fl = field(22, 8, { wall: false });
      fl.scale.z = 0.42;
      const bot = miniBot({ k: 0.95 });
      bot.g.rotation.y = -Math.PI / 2;
      const half = (bot.L * 0.95) / 2, wallX = 9.4, lineX = wallX - 50 * U;
      const wall = group(box(0.4, 2.6, 7.4, mat('#D9DDDC', { opacity: 0.45, rough: 0.2 }), { r: 0.05, pos: [wallX + 0.2, 1.3, 0] }), box(0.5, 0.14, 7.6, metal('#2B2F30', 0.5), { r: 0.03, pos: [wallX + 0.2, 2.67, 0] }));
      const line = box(0.14, 0.03, 8.2, mat(C.volt, { glow: true, glowPower: 0.5 }), { r: 0, pos: [lineX, 0.02, 0] });
      const eye = box(0.3, 0.3, 0.5, plastic(C.blue, 0.4), { r: 0.05, pos: [0, 1.0, -half - 0.05] });
      bot.g.add(eye);
      const beam = cyl(0.05, 1, new THREE.MeshBasicMaterial({ color: '#FF5A4F', toneMapped: false, transparent: true }), { axis: 'x', seg: 8 });
      beam.userData.noShadow = true;
      const nMax = 90;
      const dots = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 14), new THREE.MeshBasicMaterial({ color: '#F4F4F0', toneMapped: false }), nMax);
      dots.count = 0; dots.userData.noShadow = true; dots.frustumCulled = false;
      // The loop itself: three stops on a ring above the robot.
      const ring = group(mesh(new THREE.TorusGeometry(1.5, 0.06, 8, 48), mat('#F4F4F0', { opacity: 0.55 }), null, [Math.PI / 2, 0, 0]));
      const stops = [C.teal, C.volt, C.orange].map((c, i) => { const b = ball(0.26, mat(c, { glow: true, glowPower: 0.4 })); const a = (i / 3) * TAU - Math.PI / 2; b.position.set(Math.cos(a) * 1.5, 0, Math.sin(a) * 1.5); ring.add(b); return b; });
      const bead = ball(0.17, new THREE.MeshBasicMaterial({ color: '#FFFFFF', toneMapped: false }));
      ring.add(bead);
      ring.traverse((o) => { o.userData.noShadow = true; });
      st.add(fl, bot.g, wall, line, beam, dots, ring);
      st.label('Stop here: 50 cm from the wall', new THREE.Vector3(lineX, 0, 4.2), { tone: 'volt' });
      st.label('Wall', new THREE.Vector3(wallX, 2.8, 0), { dy: -14 });
      ['1 Read', '2 Decide', '3 Act'].forEach((s, i) => st.label(s, stops[i], { dy: -14 }));
      const lb = st.label('', bot.g, { dy: 58 });
      const tmp = new THREE.Object3D();
      let x = 0, phase = 0, state = 'go', rest = 0, over = 0, flash = 0, n = 0;
      const reset = () => { x = -8.6; phase = Math.random(); state = 'go'; over = 0; n = 0; dots.count = 0; };
      reset();
      return {
        view: { pos: [0, 13, 27], target: [0, 1.3, 0.6] },
        groundY: -0.16,
        change() { reset(); },
        tick(dt) {
          const lap = S.ml_ms / 1000, v = S.ml_v;
          const SLOW = lap > 0.1 ? 4 : 2.5; // slowed down so a lap can be seen
          const front = () => x + half;
          if (state === 'go') {
            const step = (dt / SLOW);
            x += v * 100 * U * step;
            phase += step / lap;
            while (phase >= 1) {
              phase -= 1; flash = 1;
              if (n < nMax) { tmp.position.set(front(), 0.03, 2.9); tmp.updateMatrix(); dots.setMatrixAt(n++, tmp.matrix); dots.count = n; dots.instanceMatrix.needsUpdate = true; }
              if (front() >= lineX) { state = 'stop'; over = (front() - lineX) / U; rest = 2.2; break; }
            }
            if (front() >= wallX) { x = wallX - half; state = 'crash'; over = 50; rest = 2.2; }
            bot.wheels.forEach((w) => { w.spin.rotation.x -= v * 100 * U * step / (bot.R * 0.95); });
          } else { rest -= dt; if (rest <= 0) reset(); }
          flash = Math.max(0, flash - dt * 5);
          bot.g.position.set(x, 0, 0);
          ring.position.set(x, 3.6, 0);
          const a = phase * TAU - Math.PI / 2;
          bead.position.set(Math.cos(a) * 1.5, 0, Math.sin(a) * 1.5);
          stops.forEach((b, i) => b.scale.setScalar(Math.floor(phase * 3) === i && state === 'go' ? 1.5 : 1));
          const gap = wallX - front();
          beam.visible = gap > 0.05;
          beam.scale.set(Math.max(0.01, gap), 1, 1); beam.position.set(front() + gap / 2, 0.95, 0);
          beam.material.opacity = 0.15 + flash * 0.85;
          lb.text(state === 'crash' ? 'Bonk! Never saw the line in time' : state === 'stop' ? `Stopped ${over.toFixed(0)} cm late` : `Sensor: ${Math.round(gap / U)} cm`);
          const step3 = state === 'go' ? Math.floor(phase * 3) : -1;
          const hi = (i, s) => (step3 === i ? `<i>${s}</i>` : s);
          ui.hud(`<pre>while (opModeIsActive()) {\n  ${hi(0, 'cm = sensor.getDistance(DistanceUnit.CM);')}\n  ${hi(1, 'if (cm < 50) power = 0;')}\n  ${hi(2, 'motor.setPower(power);')}\n}</pre><span class="chip">Shown <b>${SLOW}×</b> slower</span>`);
          ui.out('ml_hz', String(Math.round(1 / lap)));
          ui.out('ml_gap', `${(v * lap * 100).toFixed(1)} cm`, `${v.toFixed(1)} m/s × ${lap.toFixed(2)} s`);
          ui.tone('ml_gap', v * lap * 100 > 25 ? 'warn' : v * lap * 100 < 5 ? 'good' : '');
          ui.out('ml_over', state === 'go' ? '…' : state === 'crash' ? 'Hit the wall' : `${over.toFixed(1)} cm`);
          ui.note(state === 'crash' ? '<b>Crash.</b> The robot covered more than 50 cm between two looks, so it reached the wall before the loop came round again.' : v * lap * 100 > 25 ? `Each white dot is one look. They are <b>${(v * lap * 100).toFixed(0)} cm apart</b>, so the robot can be that far past the line before it finds out.` : v * lap * 100 < 5 ? 'The white dots are packed tight: the robot checks so often that it stops almost exactly on the line.' : 'Each white dot on the floor is one lap of the loop: one look at the sensor. The robot only stops on a dot.', state === 'crash' ? 'warn' : '');
        },
      };
    },
  };

  // ------------------------------------------------------------ 3. Proportional control
  const pid = {
    id: 'pid', tab: 'Turn to 90°',
    title: 'Steering by how wrong you are',
    lead: 'How do you make a robot turn to exactly 90°? Every lap of the loop, work out the <b>error</b>: target minus where you are now. Then set the turning power to <b>kP × error</b>. Far from the target, the error is big, so the power is big. Close to it, the power fades away. This is <b>proportional control</b>, the P in PID. The whole skill is picking the number <b>kP</b>.',
    try: 'Turn kP up until the robot overshoots, then add kD to calm it down.',
    controls: [
      { type: 'knob', id: 'mp_kp', label: 'kP (how hard to push)', min: 0.001, max: 0.1, step: 0.001, value: 0.004, fmt: (v) => v.toFixed(3) },
      { type: 'knob', id: 'mp_kd', label: 'kD (the brake)', min: 0, max: 0.004, step: 0.0002, value: 0, fmt: (v) => v.toFixed(4) },
      { type: 'button', id: 'mp_go', label: 'Turn again' },
    ],
    readouts: [['mp_v', 'Verdict'], ['mp_o', 'Overshoot', 'how far past 90°'], ['mp_s', 'Settled in', 'within 3° and staying']],
    more: [
      ['Show me one lap of the math', 'Say the robot is at 30° and the target is 90°. Error = 90 - 30 = 60°. With kP = 0.01, power = 0.01 × 60 = <b>0.6</b>. Later, at 85°: error is 5°, power is 0.05. The robot eases in by itself.'],
      ['What does kD do?', 'kD looks at how <b>fast</b> the robot is turning and pushes back against it: power = kP × error - kD × speed. It is a brake that is strongest exactly when the robot is rushing at the target, so you can use a bigger kP without overshooting.'],
      ['Why not just "turn until the IMU says 90"?', 'Because the robot is still spinning when it gets there and the loop only checks every 20 ms. It would coast past every time. Slowing down as you get close is what makes the stop accurate.'],
      ['And the I in PID?', 'I adds up the error over time. It helps when the robot stops a little short and stays there, by slowly building up more power. Most FTC turns work fine with just P and D.'],
    ],
    build(st, S, ui) {
      const plate = cyl(5.4, 0.24, mat('#8D9391', { rough: 0.9 }), { pos: [-5.4, -0.12, 1.2], seg: 64 });
      const cx = -5.4, cz = 1.2;
      const marks = group();
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * TAU, big = i % 6 === 0;
        const b = box(big ? 0.1 : 0.05, 0.02, big ? 0.7 : 0.35, C.white, { r: 0, pos: [cx + Math.sin(a) * 4.8, 0.012, cz - Math.cos(a) * 4.8] });
        b.rotation.y = -a;
        marks.add(b);
      }
      const goal = flatArrow(C.volt, 0.24), gp = group(goal);
      gp.position.set(cx, 0.05, cz); gp.rotation.y = Math.PI / 2; goal.set(4.6);
      const bot = miniBot({ k: 1.05 });
      bot.g.position.set(cx, 0, cz);
      const scr = screen(10.4, 6.8, 800);
      scr.g.position.set(5.2, 4.3, -1.4);
      scr.g.rotation.set(-0.1, -0.22, 0);
      const stand = group(box(0.3, 1.2, 0.3, metal(C.alu, 0.4), { r: 0.04, pos: [5.2, 0.5, -1.6] }), box(5, 0.16, 1.8, metal(C.alu, 0.4), { r: 0.04, pos: [5.2, 0.08, -1.6] }));
      st.add(plate, marks, gp, bot.g, scr.g, stand);
      st.label('Target: 90°', new THREE.Vector3(cx - 5.2, 0.2, cz), { tone: 'volt' });
      st.label('0°', new THREE.Vector3(cx, 0.2, cz - 5.3));
      const lb = st.label('', bot.g, { dy: 62 });
      let sim = null, key = '', t = 0, drawn = -1;
      const run = () => { sim = simTurn(S.mp_kp, S.mp_kd); key = `${S.mp_kp}|${S.mp_kd}`; t = -0.4; drawn = -1; };
      run();
      const at = (tt) => { const i = clamp(tt / 0.01, 0, sim.pts.length - 1), a = sim.pts[Math.floor(i)], b = sim.pts[Math.min(sim.pts.length - 1, Math.floor(i) + 1)]; return lerp(a[1], b[1], i % 1); };
      return {
        view: { pos: [0, 13, 25.5], target: [0, 2.0, 0.6] },
        groundY: -0.24,
        change() { run(); },
        tick(dt) {
          if (`${S.mp_kp}|${S.mp_kd}` !== key) run();
          t += dt;
          if (t > 3.9) t = -0.5;
          const tt = clamp(t, 0, 3), th = at(tt), prev = at(Math.max(0, tt - 0.02));
          bot.g.rotation.y = (th * Math.PI) / 180;
          const rate = (th - prev) / 0.02;
          bot.wheels.forEach((w) => { w.spin.rotation.x += w.sx * rate * dt * 0.05; });
          const err = 90 - th, pw = clamp(S.mp_kp * err - S.mp_kd * rate, -1, 1);
          const step = Math.floor(tt * 30);
          if (step !== drawn) {
            drawn = step;
            const g = graph(scr, { title: 'Heading over time', x0: 0, x1: 3, y0: 0, y1: 150, xl: 'seconds', yl: 'degrees' });
            g.grid([0, 1, 2, 3], [0, 30, 60, 90, 120, 150]);
            scr.ctx.fillStyle = 'rgba(232,245,66,0.13)'; scr.ctx.fillRect(g.X(0), g.Y(93), g.X(3) - g.X(0), g.Y(87) - g.Y(93));
            g.line([[0, 90], [3, 90]], C.volt, 2, [10, 8]);
            g.text('target 90°', 2.96, 97, C.volt, 'right');
            g.line(sim.pts, 'rgba(244,244,240,0.22)', 3);
            g.line(sim.pts.filter((p) => p[0] <= tt), '#FFFFFF', 5);
            g.dot(tt, th, C.volt, 10);
            scr.flush();
          }
          const V = VERDICT[sim.verdict];
          lb.text(`${th.toFixed(0)}°  error ${err.toFixed(0)}°`);
          ui.hud(`<pre>error = 90 - heading;              <i>// ${err.toFixed(1)}</i>\npower = kP * error - kD * speed;   <i>// ${fmt(pw)}</i></pre>`);
          ui.out('mp_v', V[0]);
          ui.tone('mp_v', V[1]);
          ui.out('mp_o', `${sim.over.toFixed(0)}°`);
          ui.out('mp_s', sim.settle === null ? 'never' : `${sim.settle.toFixed(1)} s`);
          ui.note(`<b>${V[0]}.</b> ${V[2]}`, V[1] === 'warn' ? 'warn' : '');
        },
      };
    },
  };

  // ------------------------------------------------------------ 4. Drive a distance
  const TPR = 537.7, CIRC = 327; // ticks per wheel turn, mm per wheel turn (π × 104, rounded like the text)
  const drive = {
    id: 'drive', tab: 'Drive a distance',
    title: 'Drive exactly 120 cm, with no driver',
    lead: 'In autonomous nobody holds the gamepad. To drive a set distance the code turns <b>centimetres into encoder ticks</b>, then runs the motors until the count gets there. One wheel turn is 327 mm and 537.7 ticks, so <b>ticks = distance ÷ 327 × 537.7</b>. Stopping is the hard part: a moving robot does not stop the instant you cut the power.',
    try: 'Run it both ways and compare how far each one misses.',
    controls: [
      { id: 'md_cm', label: 'Distance to drive', min: 30, max: 180, step: 5, value: 120, unit: ' cm' },
      { type: 'seg', id: 'md_how', label: 'How to stop', value: 'bang', options: [['bang', 'Cut power at the count'], ['ramp', 'Slow down near the end']] },
      { type: 'knob', id: 'md_pow', label: 'Power', min: 0.3, max: 1, step: 0.05, value: 0.8, fmt: (v) => fmt(v) },
      { type: 'button', id: 'md_go', label: 'Go' },
    ],
    readouts: [['md_t', 'Target ticks'], ['md_n', 'Ticks counted'], ['md_e', 'Missed by']],
    more: [
      ['Show me the ticks math', 'For 120 cm: 1200 mm ÷ 327 mm = 3.67 wheel turns. 3.67 × 537.7 = <b>1,973 ticks</b>. The code drives until the encoder says 1,973.'],
      ['Why does cutting power overshoot?', 'The robot weighs several kilograms and is moving at over a metre a second. Like a bike when you stop pedalling, it rolls on. The faster it was going, the further it coasts.'],
      ['How does "slow down near the end" work?', 'It is proportional control again, like turning to 90°. Error = target ticks - ticks so far. Power = kP × error, capped at your chosen power. Far away it drives at full speed. In the last 25 cm the power fades, so there is almost no speed left to coast with.'],
      ['Is there a built-in way?', 'Yes. <code>motor.setTargetPosition(ticks)</code> with <code>RUN_TO_POSITION</code> mode makes the Control Hub do the slow-down for you. It is the same idea, running inside the hub.'],
    ],
    build(st, S, ui) {
      const U = 1 / 12.5, x0 = -9;
      const fl = field(22, 8, { wall: false });
      fl.scale.z = 0.4;
      const bot = miniBot({ k: 0.9 });
      bot.g.rotation.y = -Math.PI / 2;
      const half = (bot.L * 0.9) / 2;
      const flag = group(cyl(0.05, 2.6, metal(C.steel, 0.3), { pos: [0, 1.3, 0], seg: 8 }), box(1.1, 0.7, 0.05, mat(C.volt, { glow: true, glowPower: 0.3 }), { r: 0.02, pos: [0.55, 2.2, 0] }), box(0.12, 0.03, 8, mat(C.volt, { glow: true, glowPower: 0.5 }), { r: 0, pos: [0, 0.02, 0] }));
      flag.children[0].position.z = flag.children[1].position.z = -3.6;
      const tape = box(1, 0.03, 0.2, mat(C.orange, { glow: true, glowPower: 0.5 }), { r: 0, pos: [0, 0.03, 3.4] });
      st.add(fl, bot.g, flag, tape);
      for (let cm = 0; cm <= 200; cm += 50) {
        st.add(box(0.06, 0.02, 0.9, C.white, { r: 0, pos: [x0 + half + cm * U, 0.012, 3.9] }));
        st.label(cm === 0 ? 'Start' : `${cm} cm`, new THREE.Vector3(x0 + half + cm * U, 0, 4.7));
      }
      const lf = st.label('Target', flag, { dy: -74, tone: 'volt' });
      const lb = st.label('', bot.g, { dy: 58 });
      let x = 0, v = 0, state = 'go', rest = 0, key = '';
      const reset = () => { x = 0; v = 0; state = 'go'; key = `${S.md_cm}|${S.md_how}|${S.md_pow}`; };
      reset();
      return {
        view: { pos: [0, 11.5, 23], target: [0, 1.0, 0.8] },
        groundY: -0.16,
        change() { reset(); },
        tick(dt) {
          if (`${S.md_cm}|${S.md_how}|${S.md_pow}` !== key) reset();
          const target = (S.md_cm * 10 / CIRC) * TPR, ticks = (x * 1000 / CIRC) * TPR, left = target - ticks;
          let u = 0;
          if (state === 'go') {
            if (S.md_how === 'bang') u = left > 0 ? S.md_pow : 0;
            else u = left > 4 ? clamp(left / 420, 0.07, S.md_pow) : 0;
            if (u === 0) { state = 'coast'; }
          }
          // Motors in BRAKE mode: the robot loses speed quickly, but not instantly.
          const tau = u > 0 ? 0.22 : 0.13;
          v += ((1.7 * u - v) / tau) * dt;
          x += v * dt;
          if (state === 'coast' && v < 0.01) { state = 'done'; rest = 2.4; v = 0; }
          if (state === 'done') { rest -= dt; if (rest <= 0) reset(); }
          bot.g.position.set(x0 + x * 100 * U, 0, 0);
          bot.wheels.forEach((w) => { w.spin.rotation.x -= (v * dt * 100 * U) / (bot.R * 0.9); });
          flag.position.x = x0 + half + S.md_cm * U;
          const miss = x * 100 - S.md_cm;
          tape.visible = miss > 0.3;
          tape.scale.x = Math.max(0.01, miss * U); tape.position.x = flag.position.x + (miss * U) / 2;
          lf.text(`Target: ${S.md_cm} cm`);
          lb.text(state === 'done' ? `Stopped ${Math.abs(miss).toFixed(1)} cm ${miss >= 0 ? 'past' : 'short'}` : state === 'coast' ? 'Power 0, still rolling' : `Power ${fmt(u)}`);
          ui.hud(`<pre>target = ${S.md_cm} * 10 / 327 * 537.7;        <i>// ${Math.round(target)} ticks</i>\n${S.md_how === 'bang' ? `if (ticks < target) power = ${fmt(S.md_pow)}; else power = 0;` : `power = Math.min(${fmt(S.md_pow)}, kP * (target - ticks));`}   <i>// ${fmt(u)}</i></pre>`);
          ui.out('md_t', Math.round(target).toLocaleString('en-US'), `${S.md_cm} cm ÷ 32.7 × 537.7`);
          ui.out('md_n', Math.round(ticks).toLocaleString('en-US'), `${(x * 100).toFixed(0)} cm so far`);
          ui.out('md_e', state === 'go' ? '…' : `${Math.abs(miss).toFixed(1)} cm`, state === 'go' ? '' : miss >= 0 ? 'too far' : 'short');
          ui.tone('md_e', state === 'go' ? '' : Math.abs(miss) > 4 ? 'warn' : 'good');
          ui.label('md_go', state === 'done' ? 'Go again' : 'Driving…');
          ui.note(S.md_how === 'bang' ? (state === 'go' ? 'Full power until the encoder reaches the target count, then power 0.' : `The count was reached on the line, but the robot was still doing ${fmt(S.md_pow * 1.7, 1)} m/s. It <b>coasted ${Math.max(0, miss).toFixed(0)} cm</b> past. The orange strip shows the miss.`) : (state === 'go' ? 'Power = kP × ticks left. Watch the power number fall as the robot nears the flag.' : `By slowing down over the last 25 cm it arrived with almost no speed left: <b>${Math.abs(miss).toFixed(1)} cm</b> off.`), state !== 'go' && Math.abs(miss) > 4 ? 'warn' : '');
        },
      };
    },
  };

  return { title: 'Algorithms and math', chapters: [stick, loopCh, pid, drive] };
}
