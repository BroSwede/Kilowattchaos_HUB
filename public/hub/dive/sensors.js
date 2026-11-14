// How it works: the sensors. An encoder counts wheel turns, the IMU feels which way the robot faces,
// a distance sensor times a flash of light, and a colour sensor measures red, green and blue.
import { THREE, C, mat, metal, plastic, mesh, cyl, box, ball, group, clamp, lerp, TAU } from './kit.js';
import { miniMotor } from './motor.js';
import { mecanumWheel, miniBot, flatArrow, fmt, wrapDeg } from './works.js';

const TPR = 537.7;       // encoder ticks for one turn of the output shaft (goBILDA 5203, 312 rpm)
const GEAR = 19.2;       // motor turns for one turn of the output shaft
const WHEEL = 104;       // mm

export default function sensors() {
  // ------------------------------------------------------------ 1. Encoder
  const enc = {
    id: 'enc', tab: 'Encoder',
    title: 'Counting turns to measure distance',
    big: 'An encoder counts tiny clicks as the motor turns, and counting clicks tells you distance.',
    lead: 'A motor cannot see how far the robot has gone, but it can <b>count</b>. On the back of each drive motor is a ring of tiny magnets and two sensors that click each time a magnet passes. That is an <b>encoder</b>, and each click is one <b>tick</b>. Our motors give <b>537.7 ticks</b> for one turn of the wheel. Count the ticks and you know the distance.',
    real: 'Every Yellow Jacket motor on our robot has one, the launcher motor too. That is how code can know the flywheel’s speed before it fires.',
    try: 'Drag the wheel along the floor and watch the ticks add up.',
    controls: [
      { id: 'se_turn', label: 'Turn the wheel', min: 0, max: 2, step: 0.01, value: 0.5, fmt: (v) => `${v.toFixed(2)} turns` },
    ],
    readouts: [['se_t', 'Ticks counted'], ['se_w', 'Wheel turns', 'ticks ÷ 537.7'], ['se_d', 'Distance rolled', 'turns × π × 104 mm'], ['se_m', 'Ticks in 1 metre']],
    more: [
      ['Why 537.7 and not a round number?', 'The magnet ring makes 28 ticks for each turn of the little motor inside. The gearbox makes that motor turn 19.2 times for one turn of the wheel. 28 × 19.2 = 537.6, and the exact gear teeth make it 537.7.'],
      ['Why two sensors?', 'With one sensor you can count, but you cannot tell forwards from backwards. Two sensors sit a little apart. Whichever one clicks first tells the hub which way the shaft is turning, so the count goes up or down.'],
      ['Show me the distance math', 'One wheel turn rolls π × 104 mm = 327 mm. So one tick is 327 ÷ 537.7 = <b>0.61 mm</b>. To drive 1 metre you need 1000 ÷ 0.61 = about <b>1,646 ticks</b>.'],
      ['Can the encoder be wrong?', 'The count is exact, but the wheel is not. If a wheel slips on the floor or the robot is bumped sideways, the wheel turned without the robot moving that far. Mecanum wheels slip a lot when strafing, which is why teams add other sensors.'],
    ],
    build(st, S, ui) {
      const U = 1 / 40, R = (WHEEL / 2) * U, cu = Math.PI * WHEEL * U, x0 = -8.2;
      const floor = box(19.5, 0.2, 5, mat('#8D9391', { rough: 0.9 }), { r: 0.04, pos: [0, -0.1, 0] });
      const w = mecanumWheel(R, 0.8, 1);
      w.g.rotation.y = Math.PI / 2;
      const mark = cyl(0.07, 0.9, mat(C.volt, { glow: true, glowPower: 0.8 }), { axis: 'x', seg: 10, pos: [0, -R + 0.05, 0] });
      w.spin.add(mark);
      const mm = miniMotor(0.3, 1.3);
      mm.g.rotation.y = -Math.PI / 2;
      mm.g.position.z = -1.9;
      const car = group(w.g, mm.g);
      // One floor dot for every 20 ticks the wheel has rolled.
      const DOT = 20, nDots = Math.ceil((2 * TPR) / DOT);
      const dots = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 0.03, 0.5), new THREE.MeshBasicMaterial({ color: C.volt, toneMapped: false }), nDots);
      const tmp = new THREE.Object3D();
      for (let i = 0; i < nDots; i++) { tmp.position.set(x0 + ((i + 1) * DOT / TPR) * cu, 0.02, 1.7); tmp.updateMatrix(); dots.setMatrixAt(i, tmp.matrix); }
      dots.userData.noShadow = true;
      // The magnifier: the magnet ring and its two sensors, drawn big.
      const disc = group();
      for (let i = 0; i < 14; i++) disc.add(cyl(1.7, 0.3, plastic(i % 2 ? C.blue : C.red, 0.4), { axis: 'z', seg: 6, start: (i / 14) * TAU, theta: TAU / 14 }));
      disc.add(cyl(1.0, 0.34, metal('#4A5052', 0.4), { axis: 'z', seg: 32 }), cyl(0.22, 0.9, metal(C.steel, 0.25), { axis: 'z', seg: 12 }));
      const head = (a) => {
        const led = ball(0.13, mat(C.volt, { glow: true, glowPower: 2 }), { pos: [0, 0, 0.3] });
        led.userData.noShadow = true;
        const g = group(box(0.5, 0.5, 0.32, plastic(C.black, 0.4), { r: 0.06 }), led);
        g.position.set(Math.cos(a) * 2.15, Math.sin(a) * 2.15, 0.1);
        g.rotation.z = a;
        return { g, led, a };
      };
      const pole = TAU / 14;
      const hA = head(Math.PI / 2), hB = head(Math.PI / 2 - pole * 2.5);
      const card = box(5.6, 5.6, 0.14, plastic('#F4F4F0', 0.5), { r: 0.3, pos: [0, 0.1, -0.3] });
      card.userData.noShadow = true;
      const mag = group(disc, hA.g, hB.g, card);
      mag.position.set(5.6, 5.6, -1.2);
      mag.rotation.x = -0.18;
      st.add(floor, car, dots, mag);
      for (let i = 0; i <= 6; i++) st.add(box(0.05, 0.02, i % 5 === 0 ? 1.0 : 0.6, C.white, { r: 0, pos: [x0 + i * 100 * U, 0.012, -1.6] }));
      st.label('0', new THREE.Vector3(x0, 0, -2.4));
      st.label('500 mm', new THREE.Vector3(x0 + 500 * U, 0, -2.4));
      st.label('Magnet ring on the motor shaft', mag, { dy: -128, tip: 'Seven pairs of north (red) and south (blue) magnets, zoomed in. On the real motor the ring is smaller than a coin and hides under the black cap at the back.' });
      st.label('A', hA.g, { dy: -22, tone: 'volt' });
      st.label('B', hB.g, { dy: -22, tone: 'volt' });
      const lt = st.label('0 ticks', w.g, { dy: -84, tone: 'volt' });
      st.label('Each mark: 20 ticks', new THREE.Vector3(x0 + 0.5 * cu, 0, 2.4), { dy: 6 });
      let shown = S.se_turn;
      return {
        view: { pos: [0, 9, 27], target: [0, 2.4, 0] },
        groundY: -0.2,
        handles: [{ id: 'se_turn', obj: w.g, axis: 'x', span: 520, hint: 'Drag me', dy: -30 }],
        tick(dt) {
          shown = lerp(shown, S.se_turn, 1 - Math.exp(-dt * 12));
          const turns = shown, ticks = Math.round(S.se_turn * TPR), mmRolled = S.se_turn * Math.PI * WHEEL;
          car.position.set(x0 + turns * cu, R, 0);
          w.spin.rotation.x = turns * TAU;
          mm.shaft.rotation.x = turns * TAU;
          dots.count = clamp(Math.floor((turns * TPR) / DOT), 0, nDots);
          const a = turns * TAU * GEAR;
          disc.rotation.z = -a;
          for (const h of [hA, hB]) {
            const on = Math.floor((((h.a + a) / pole) % 2 + 2) % 2) === 0;
            h.led.material.emissiveIntensity = on ? 2.4 : 0.05;
            h.led.material.color.set(on ? C.volt : '#3A3F40');
          }
          lt.text(`${ticks.toLocaleString('en-US')} ticks`);
          ui.hud(`<pre>int ticks = frontLeft.getCurrentPosition();   <i>// ${ticks}</i>\ndouble mm = ticks / 537.7 * Math.PI * 104;    <i>// ${mmRolled.toFixed(0)} mm</i></pre>`);
          ui.out('se_t', ticks.toLocaleString('en-US'));
          ui.out('se_w', S.se_turn.toFixed(2), `${ticks} ÷ 537.7`);
          ui.out('se_d', `${mmRolled.toFixed(0)} mm`, `${S.se_turn.toFixed(2)} × 327 mm`);
          ui.out('se_m', '1,646', '1000 mm ÷ 0.61 mm a tick');
          ui.note(S.se_turn === 0 ? 'Zero ticks. Drag the wheel to the right.' : `The magnet ring has spun <b>${(S.se_turn * GEAR).toFixed(1)} times</b> to turn the wheel ${S.se_turn.toFixed(2)} times. That is the gearbox: 19.2 motor turns for 1 wheel turn. Each tick is only 0.61 mm of floor.`);
        },
      };
    },
  };

  // ------------------------------------------------------------ 2. IMU
  const imu = {
    id: 'imu', tab: 'IMU (gyro)',
    title: 'Which way am I facing?',
    big: 'A chip feels how fast the robot is turning and adds it all up, so the robot knows which way it faces.',
    lead: 'Inside the Control Hub is a motion chip called an <b>IMU</b>. One part of it feels how fast the robot is turning: a <b>gyroscope</b>. The hub adds up all those little turns to answer one question: <b>how many degrees have I turned since the start?</b> That number is the <b>heading</b>. Turning left counts up, turning right counts down.',
    real: 'In autonomous, “turn to face the goal” uses this number. It only works if the robot starts the match pointing the way the code expects.',
    try: 'Spin the robot with the knob. Then let time pass and watch the two arrows drift apart.',
    controls: [
      { type: 'knob', id: 'si_turn', label: 'Turn the robot', min: -180, max: 180, step: 1, value: 35, unit: '°' },
      { id: 'si_time', label: 'Time since the reset', min: 0, max: 150, step: 1, value: 0, unit: ' s' },
      { id: 'si_rate', label: 'Gyro drift', min: 0, max: 10, step: 0.5, value: 3, unit: '° a minute' },
    ],
    readouts: [['si_true', 'Really facing'], ['si_imu', 'IMU says'], ['si_err', 'Off by']],
    more: [
      ['Why does the heading drift?', 'The gyro never measures the angle itself, only how fast the robot is turning. The hub adds up thousands of tiny readings a second. Each one is off by a hair, and the hairs pile up. After a 2.5 minute match the answer can be a few degrees wrong.'],
      ['How do teams fix drift?', 'Reset the heading when the robot is squared up against a wall, or check it against something that does not drift, like a camera looking at an AprilTag on the field wall.'],
      ['What is it used for?', 'Turning to an exact angle in autonomous, driving in a straight line, and <b>field-centric</b> driving, where pushing the stick away from you always sends the robot away from you, whichever way it is facing.'],
      ['What else can an IMU feel?', 'Tipping forward and back (pitch), tipping side to side (roll) and speeding up (acceleration). Your phone uses the same kind of chip to rotate the screen.'],
    ],
    build(st, S, ui) {
      const plate = cyl(6.6, 0.24, mat('#8D9391', { rough: 0.9 }), { pos: [0, -0.12, 0], seg: 72 });
      const ticks = group();
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * TAU, big = i % 9 === 0, r = 5.9;
        const b = box(big ? 0.12 : 0.05, 0.02, big ? 0.9 : i % 3 === 0 ? 0.55 : 0.3, big ? C.volt : C.white, { r: 0, pos: [Math.sin(a) * r, 0.012, -Math.cos(a) * r] });
        b.rotation.y = -a;
        ticks.add(b);
      }
      const bot = miniBot({ k: 1.25 });
      const truth = flatArrow(C.volt, 0.26), believed = flatArrow(C.orange, 0.2);
      const pT = group(truth), pB = group(believed);
      pT.position.y = 0.05; pB.position.y = 0.09;
      truth.set(5.3); believed.set(4.6);
      // The chip, drawn big above the robot. It turns with the robot.
      const chip = group(box(1.9, 0.12, 1.9, plastic('#1F6B45', 0.5, 0.6), { r: 0.04 }), box(0.9, 0.22, 0.9, plastic(C.black, 0.4), { r: 0.04, pos: [0, 0.16, 0] }), cyl(0.05, 1.5, mat(C.volt, { glow: true }), { pos: [0, 0.95, 0], seg: 8 }));
      const swirl = mesh(new THREE.TorusGeometry(0.62, 0.045, 8, 32, 4.6), mat(C.volt, { glow: true }), [0, 1.2, 0], [Math.PI / 2, 0, 0]);
      const tipC = mesh(new THREE.ConeGeometry(0.14, 0.34, 10), mat(C.volt, { glow: true }), [0.62, 1.2, 0], [Math.PI / 2, 0, 0]);
      chip.add(swirl, tipC);
      for (const o of [swirl, tipC]) o.userData.noShadow = true;
      chip.position.y = 3.6;
      bot.g.add(chip);
      st.add(plate, ticks, bot.g, pT, pB);
      for (const [txt, x, z] of [['0°', 0, -7.1], ['+90° (left)', -7.2, 0], ['-90° (right)', 7.2, 0], ['180°', 0, 7.1]]) st.label(txt, new THREE.Vector3(x, 0, z));
      st.label('IMU chip, zoomed in', chip, { dy: -44, tip: 'The real chip is about 4 mm across and sits on the circuit board inside the Control Hub. The yellow swirl is the turn it measures: <b>yaw</b>, spinning flat like a top.' });
      const lB = st.label('IMU thinks', new THREE.Vector3(), { tone: 'warn' });
      const tipB = new THREE.Vector3();
      lB.to(tipB);
      return {
        view: { pos: [0, 17, 15.5], target: [0, 1, 0.8] },
        groundY: -0.24,
        handles: [{ id: 'si_turn', obj: bot.g, axis: 'x', span: 300, invert: true, hint: 'Drag to turn', dy: 40 }],
        tick() {
          const yaw = S.si_turn, err = (S.si_rate * S.si_time) / 60, says = wrapDeg(yaw + err);
          const r = (yaw * Math.PI) / 180, rb = ((yaw + err) * Math.PI) / 180;
          bot.g.rotation.y = r; pT.rotation.y = r; pB.rotation.y = rb;
          pB.visible = err > 0.4;
          tipB.set(-Math.sin(rb) * 4.9, 0.3, -Math.cos(rb) * 4.9);
          lB.show(err > 0.4);
          lB.text(`IMU thinks ${says.toFixed(1)}°`);
          ui.hud(`<pre>double yaw = imu.getRobotYawPitchRollAngles()\n                .getYaw(AngleUnit.DEGREES);   <i>// ${says.toFixed(1)}</i></pre>`);
          ui.out('si_true', `${yaw}°`, yaw === 0 ? 'straight ahead' : yaw > 0 ? 'turned left' : 'turned right');
          ui.out('si_imu', `${says.toFixed(1)}°`);
          ui.out('si_err', `${err.toFixed(1)}°`, err < 1 ? 'spot on' : err < 4 ? 'small, but growing' : 'enough to miss a shot');
          ui.tone('si_err', err >= 4 ? 'warn' : err < 1 ? 'good' : '');
          ui.note(err < 0.4 ? 'Just reset: the IMU and the real robot agree. Slide <b>Time since the reset</b> to the right.' : `After ${S.si_time} s the IMU is <b>${err.toFixed(1)}° off</b>. At 3 metres from the goal, that aims the launcher ${(Math.tan((err * Math.PI) / 180) * 300).toFixed(0)} cm to one side.`, err >= 4 ? 'warn' : '');
        },
      };
    },
  };

  // ------------------------------------------------------------ 3. Distance sensor
  const SURF = {
    white: { label: 'White wall', color: '#F4F4F0', back: 0.9, range: 200 },
    black: { label: 'Black foam', color: '#232627', back: 0.1, range: 110 },
    clear: { label: 'Clear plastic', color: '#BFE3EA', back: 0.04, range: 40, opacity: 0.3 },
  };
  const dist = {
    id: 'dist', tab: 'Distance',
    title: 'Timing a flash of light',
    big: 'A distance sensor times how long a flash of light takes to bounce back.',
    lead: 'A distance sensor is a stopwatch for light. It fires a tiny flash of invisible infrared light, then times how long the flash takes to bounce off something and come back. This is called <b>time of flight</b>. Light is absurdly fast: about <b>30 cm every nanosecond</b> (a billionth of a second). So it has to be a very good stopwatch.',
    real: 'A robot like ours could use one to measure how far it is from the goal, then pick the flywheel speed to match.',
    try: 'Drag the wall closer and further. Then swap what it is made of.',
    controls: [
      { id: 'sd_d', label: 'Distance to the wall', min: 5, max: 200, step: 1, value: 90, unit: ' cm' },
      { type: 'seg', id: 'sd_surf', label: 'The wall is', value: 'white', options: Object.entries(SURF).map(([k, v]) => [k, v.label]) },
    ],
    readouts: [['sd_t', 'Round trip', 'out and back'], ['sd_r', 'Sensor reads'], ['sd_b', 'Light that came back']],
    more: [
      ['Show me the math', 'The light goes there <b>and</b> back, so it travels twice the distance. Time = 2 × distance ÷ speed. For 90 cm: 2 × 90 ÷ 30 = <b>6 nanoseconds</b>. The sensor does it the other way round: distance = time × 30 ÷ 2.'],
      ['How can a chip time a nanosecond?', 'It does not time one flash. It fires many thousands of flashes and measures how the returning light lines up with the outgoing light, then averages. That is how a chip the size of a grain of rice gets within a centimetre or two.'],
      ['Why does black foam work worse?', 'Black soaks up most of the light, so only a little comes back, and from far away that little is too faint to find. Clear plastic lets the flash go straight through, so the sensor may see whatever is behind it instead.'],
      ['Which sensor is this?', 'The REV 2m Distance Sensor. It plugs into an I2C port, reads from about 5 cm to 2 metres, and sees a narrow cone, not a single dot.'],
    ],
    build(st, S, ui) {
      const U = 1 / 12.5, sx = -8.4, y = 1.5;
      const floor = box(20, 0.2, 6, mat('#8D9391', { rough: 0.9 }), { r: 0.04, pos: [0.4, -0.1, 0] });
      const eye = (z, c) => group(cyl(0.2, 0.1, plastic(C.black, 0.3), { axis: 'x', seg: 20, pos: [0.36, 0, z] }), cyl(0.12, 0.12, mat(c, { glow: true, glowPower: 1.2 }), { axis: 'x', seg: 16, pos: [0.37, 0, z] }));
      const sensor = group(
        box(0.6, 1.3, 2.0, plastic('#2E63D6', 0.4, 0.6), { r: 0.1 }),
        box(0.14, 1.0, 1.6, plastic('#1F6B45', 0.5, 0.6), { r: 0.03, pos: [0.3, 0, 0] }),
        eye(-0.42, '#FF5A4F'), eye(0.42, '#7A1F1A'),
        box(0.5, 0.5, 0.5, plastic(C.white, 0.5), { r: 0.06, pos: [-0.4, 0, 0] }),
      );
      sensor.position.set(sx, y, 0);
      const post = group(box(0.5, y, 0.5, metal(C.alu, 0.4), { r: 0.05, pos: [sx - 0.3, y / 2, 0] }), box(1.6, 0.16, 1.6, metal(C.alu, 0.4), { r: 0.04, pos: [sx - 0.3, 0.08, 0] }));
      const wall = group();
      let panel = null, surfKey = '';
      const setSurf = () => {
        if (surfKey === S.sd_surf) return;
        surfKey = S.sd_surf;
        if (panel) { wall.remove(panel); st.disposeTree(panel); }
        const sf = SURF[surfKey];
        panel = group(box(0.3, 3.4, 4.2, mat(sf.color, { rough: surfKey === 'black' ? 0.95 : 0.5, opacity: sf.opacity }), { r: 0.04, pos: [0.15, 1.7, 0] }), box(0.5, 0.2, 4.4, metal('#2B2F30', 0.5), { r: 0.04, pos: [0.15, 0.1, 0] }));
        wall.add(panel);
      };
      setSurf();
      const beam = cyl([1, 0.12], 1, mat('#FF5A4F', { opacity: 0.12 }), { axis: 'x', seg: 24, open: true });
      const out = ball(0.26, new THREE.MeshBasicMaterial({ color: '#FF5A4F', toneMapped: false, transparent: true }));
      out.userData.noShadow = beam.userData.noShadow = true;
      st.add(floor, sensor, post, wall, beam, out);
      for (const cm of [0, 50, 100, 150, 200]) {
        st.add(box(0.06, 0.02, 1.0, C.white, { r: 0, pos: [sx + 0.4 + cm * U, 0.012, 2.3] }));
        st.label(cm === 0 ? '0' : `${cm} cm`, new THREE.Vector3(sx + 0.4 + cm * U, 0, 3.0));
      }
      st.label('Distance sensor', sensor, { dy: -52, tip: 'One eye sends the infrared flash, the other catches what bounces back. The chip between them is the stopwatch.' });
      const lw = st.label('Wall', wall, { dy: -128 });
      let t = 0;
      return {
        view: { pos: [0.6, 8.5, 30], target: [0.6, 1.2, 0] },
        groundY: -0.2,
        handles: [{ id: 'sd_d', obj: wall, axis: 'x', span: 640, hint: 'Drag the wall', dy: -40 }],
        change() { setSurf(); },
        tick(dt) {
          const d = S.sd_d, sf = SURF[S.sd_surf], x0 = sx + 0.4, xw = x0 + d * U, ns = (2 * d) / 30;
          const seen = d <= sf.range, back = Math.round(sf.back * 100 * clamp(1 - d / 400, 0.3, 1));
          wall.position.x = xw;
          beam.scale.set(d * U, 0.1 + d * U * 0.14, 0.1 + d * U * 0.14);
          beam.position.set(x0 + (d * U) / 2, y, 0);
          // One flash: out, back, then a short rest. Slowed down about a hundred million times.
          const leg = 0.35 + d / 160, total = leg * 2 + 0.5;
          t = (t + dt) % total;
          const k = t < leg ? t / leg : t < leg * 2 ? 2 - t / leg : 0;
          out.visible = t < leg * 2;
          out.position.set(lerp(x0, xw, k), y, t < leg ? -0.42 * (1 - k) : 0.42 * (1 - k));
          out.material.opacity = t < leg ? 1 : Math.max(0.25, sf.back + 0.15);
          out.scale.setScalar(t < leg ? 1 : 0.5 + sf.back * 0.5);
          const flown = Math.min(t, leg * 2) / (leg * 2);
          lw.text(sf.label);
          ui.hud(`<span class="chip">Stopwatch <b>${(ns * flown).toFixed(2)} ns</b></span><span class="chip">Shown about <b>100,000,000×</b> slower</span>`);
          ui.out('sd_t', `${ns.toFixed(2)} ns`, `2 × ${d} cm ÷ 30`);
          ui.out('sd_r', seen ? `${d} cm` : 'Nothing', seen ? `${ns.toFixed(2)} ns × 30 ÷ 2` : 'too faint to find');
          ui.tone('sd_r', seen ? '' : 'warn');
          ui.out('sd_b', `${back}%`);
          ui.note(!seen ? (S.sd_surf === 'clear' ? '<b>Clear plastic fools it.</b> Almost all the light goes straight through, so past 40 cm the sensor cannot find the echo.' : `<b>Too far for black foam.</b> It soaks up 90% of the flash. Past about ${sf.range} cm the echo is lost in the noise.`) : `The flash travels ${d} cm out and ${d} cm back: ${2 * d} cm in <b>${ns.toFixed(2)} billionths of a second</b>. In one whole second, light could circle the Earth 7 times.`, seen ? '' : 'warn');
        },
      };
    },
  };

  // ------------------------------------------------------------ 4. Colour sensor
  const PIECES = { purple: ['Purple', [150, 60, 205]], green: ['Green', [45, 185, 75]], yellow: ['Yellow', [240, 200, 40]], red: ['Red', [220, 45, 40]], blue: ['Blue', [40, 95, 215]] };
  const hueOf = ([r, g, b]) => {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (d === 0) return 0;
    const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return (h * 60 + 360) % 360;
  };
  const nameOf = (h) => (h < 20 || h >= 335 ? 'RED' : h < 75 ? 'YELLOW' : h < 170 ? 'GREEN' : h < 255 ? 'BLUE' : 'PURPLE');
  const color = {
    id: 'color', tab: 'Colour',
    title: 'Three numbers for every colour',
    big: 'A colour sensor turns a colour into three numbers: how much red, green and blue bounces back.',
    lead: 'A colour sensor shines white light on whatever is in front of it and measures what bounces back through three tiny filters: <b>red</b>, <b>green</b> and <b>blue</b>. Those three numbers are called <b>RGB</b>. A purple ball sends back lots of red and blue but little green. Your code reads the numbers and decides which game piece it is.',
    real: 'Placed in the ball path, a colour sensor could tell the robot which ball is next in line before it launches.',
    try: 'Pick a game piece, then lift the sensor away and watch the numbers fade.',
    controls: [
      { type: 'seg', id: 'sc_pick', label: 'Game piece', value: 'purple', options: Object.entries(PIECES).map(([k, v]) => [k, v[0]]) },
      { id: 'sc_gap', label: 'Sensor height above it', min: 1, max: 10, step: 0.5, value: 2, unit: ' cm' },
      { type: 'seg', id: 'sc_led', label: 'Sensor light', value: 'on', options: [['on', 'On'], ['off', 'Off']] },
    ],
    readouts: [['sc_r', 'Red'], ['sc_g', 'Green'], ['sc_b', 'Blue'], ['sc_n', 'Robot decides']],
    more: [
      ['What is hue?', 'Hue is one number for "which colour", as an angle round the colour wheel: red is 0°, green is 120°, blue is 240°, purple is near 280°. It stays almost the same whether the piece is close or far, bright or dim, so it is easier to test in code than three numbers.'],
      ['Why does the sensor have its own light?', 'So the answer does not depend on the room. A gym at a competition is lit very differently from our shop. With its own white light and the piece held close, the sensor sees the same colours everywhere.'],
      ['Why do the numbers drop so fast with height?', 'The light spreads out on the way down and again on the way back, so each centimetre further costs a lot. Colour sensors work best 1 to 3 cm from the thing they are looking at.'],
      ['Which sensor is this?', 'The REV Color Sensor V3. It plugs into an I2C port, and as a bonus it can also tell how close something is, up to about 10 cm.'],
    ],
    build(st, S, ui) {
      const tile = box(11, 0.2, 7, mat('#8D9391', { rough: 0.9 }), { r: 0.04, pos: [1.2, -0.1, 0] });
      const ballM = plastic('#9A3CCD', 0.35, 0.6);
      const piece = mesh(new THREE.SphereGeometry(1.25, 40, 24), ballM, [-1.6, 1.25, 0]);
      const dimples = group();
      for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU; dimples.add(cyl(0.16, 0.04, mat('#000000', { opacity: 0.18 }), { axis: 'z', seg: 12, pos: [-1.6 + Math.cos(a) * 0.8, 1.25 + Math.sin(a) * 0.8, 0.98] })); }
      const sens = group(
        box(1.7, 0.16, 1.3, plastic('#1F6B45', 0.5, 0.6), { r: 0.04 }),
        box(0.46, 0.14, 0.46, plastic(C.black, 0.3), { r: 0.04, pos: [0.2, -0.14, 0] }),
        box(0.5, 0.36, 0.5, plastic(C.white, 0.5), { r: 0.06, pos: [-0.5, 0.22, 0] }),
      );
      const ledM = mat(C.white, { glow: '#FFFFFF', glowPower: 2 });
      sens.add(cyl(0.13, 0.1, ledM, { pos: [-0.25, -0.12, 0], seg: 14 }));
      const arm = group(box(0.4, 6, 0.4, metal(C.alu, 0.4), { r: 0.05, pos: [-4.4, 3, 0] }), box(1.4, 0.16, 1.4, metal(C.alu, 0.4), { r: 0.04, pos: [-4.4, 0.08, 0] }));
      const boom = box(3.0, 0.3, 0.4, metal(C.alu, 0.4), { r: 0.05 });
      const cone = cyl([0.14, 1], 1, mat(C.white, { opacity: 0.16 }), { seg: 24, open: true });
      const echo = cyl([0.1, 0.5], 1, mat('#9A3CCD', { opacity: 0.3, glow: true }), { seg: 20, open: true });
      cone.userData.noShadow = echo.userData.noShadow = true;
      // A bar for each of the three numbers, and a swatch of what they add up to.
      const bars = [C.red, C.green, C.blue].map((c, i) => { const b = box(0.8, 1, 0.8, mat(c, { glow: true, glowPower: 0.35 }), { r: 0.05 }); b.position.set(2.6 + i * 1.25, 0.5, 0); return b; });
      const frame = box(3.6, 0.1, 1.2, plastic('#1D2021', 0.4), { r: 0.04, pos: [3.85, 0.05, 0] });
      const swatchM = plastic('#9A3CCD', 0.4, 0.5);
      const swatch = box(3.3, 1.0, 0.2, swatchM, { r: 0.08, pos: [3.85, 0.7, -1.5] });
      st.add(tile, piece, dimples, sens, arm, boom, cone, echo, frame, swatch, ...bars);
      st.label('Colour sensor', sens, { dy: -34, tip: 'A white LED and a chip with three colour filters, side by side on a board the size of a postage stamp.' });
      const lv = ['R', 'G', 'B'].map((n, i) => st.label(n, bars[i], { dy: -30 }));
      const ls = st.label('What the sensor sees', swatch, { dy: 58 });
      const tops = bars.map(() => new THREE.Vector3());
      lv.forEach((l, i) => l.to(tops[i]));
      const cur = [0, 0, 0];
      return {
        view: { pos: [2.6, 9, 20], target: [0.6, 2.6, 0] },
        groundY: -0.2,
        handles: [{ id: 'sc_gap', obj: sens, hint: 'Drag up', dy: -62, span: 260 }],
        tick(dt) {
          const base = PIECES[S.sc_pick][1], gap = S.sc_gap, lit = S.sc_led === 'on';
          const k = lit ? clamp((2 / gap) ** 1.35, 0, 1) : 0.07;
          const rgb = base.map((v) => Math.round(v * k));
          const yS = 2.5 + 0.35 + gap * 0.42;
          sens.position.set(-1.6, yS, 0);
          boom.position.set(-3.0, yS + 0.25, 0);
          ballM.color.setRGB(base[0] / 255, base[1] / 255, base[2] / 255, THREE.SRGBColorSpace);
          const h = yS - 0.2 - 2.5;
          cone.visible = echo.visible = lit;
          cone.scale.set(0.55 + gap * 0.07, h, 0.55 + gap * 0.07); cone.position.set(-1.85, 2.5 + h / 2, 0);
          echo.scale.set(0.5, h, 0.5); echo.position.set(-1.4, 2.5 + h / 2, 0);
          echo.material.color.copy(ballM.color); echo.material.emissive.copy(ballM.color); echo.material.opacity = 0.08 + 0.4 * k;
          ledM.emissiveIntensity = lit ? 2.2 : 0;
          rgb.forEach((v, i) => {
            cur[i] = lerp(cur[i], v, 1 - Math.exp(-dt * 10));
            const hh = 0.06 + (cur[i] / 255) * 4.2;
            bars[i].scale.y = hh; bars[i].position.y = 0.1 + hh / 2;
            tops[i].set(bars[i].position.x, 0.1 + hh, 0);
            lv[i].text(`${'RGB'[i]} ${v}`);
            ui.out(`sc_${'rgb'[i]}`, String(v), 'out of 255');
          });
          swatchM.color.setRGB(cur[0] / 255, cur[1] / 255, cur[2] / 255, THREE.SRGBColorSpace);
          const hue = hueOf(rgb), bright = Math.max(...rgb), ok = bright >= 40;
          const guess = ok ? nameOf(hue) : 'NOT SURE';
          ls.text(ok ? 'What the sensor sees' : 'Too dark to tell');
          ui.out('sc_n', guess, ok ? `hue ${Math.round(hue)}°` : 'numbers too small');
          ui.tone('sc_n', ok ? 'good' : 'warn');
          ui.hud(`<pre>int r = ${rgb[0]}, g = ${rgb[1]}, b = ${rgb[2]};\ndouble hue = <i>${Math.round(hue)}</i>;   <i>// which colour, as an angle</i>\nif (hue > 255 && hue < 335) piece = <i>"PURPLE"</i>;\nif (hue > 75 && hue < 170)  piece = <i>"GREEN"</i>;</pre>`);
          ui.note(!lit ? '<b>Light off.</b> Only weak room light reaches the chip. The three numbers are tiny and the robot cannot be sure.' : !ok ? `<b>${gap} cm is too far.</b> The numbers have faded so much that a small flicker could flip the answer.` : `${PIECES[S.sc_pick][0]}: red ${rgb[0]}, green ${rgb[1]}, blue ${rgb[2]}. The <b>biggest</b> numbers tell you the colour, and the hue angle sums it up in one.`, !ok ? 'warn' : '');
        },
      };
    },
  };

  return { title: 'Sensors', chapters: [enc, imu, dist, color] };
}
