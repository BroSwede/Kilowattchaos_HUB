// How it works: the REV Control Hub (the robot's brain) and the REV Driver Hub (the screen in the drivers' hands).
// Both models are REV's own CAD (REV-31-1595 and REV-31-1596), converted from the original STEP files with every face kept.
import { THREE, C, mat, metal, plastic, mesh, cyl, box, ball, group, tube, curveOf, Flow, part, loadModel, clamp, lerp, smooth, TAU } from './kit.js';
import { miniMotor } from './motor.js';
import { mecanumWheel, gamepad, screen, graph, fmt } from './works.js';

const [CH, DH] = await Promise.all([loadModel('control-hub.glb'), loadModel('driver-hub.glb')]);
// Looks only: REV's STEP paints the lid light grey, the real one is dark. The shape is untouched.
{
  const lid = CH.getObjectByName('c3');
  if (lid) { lid.material = new THREE.MeshPhysicalMaterial({ color: '#363B3D', roughness: 0.5, metalness: 0.1, clearcoat: 0.3, clearcoatRoughness: 0.4 }); lid.material.userData.shared = true; }
  const wall = CH.getObjectByName('c1');
  if (wall) { wall.material = new THREE.MeshStandardMaterial({ color: '#25292A', roughness: 0.6 }); wall.material.userData.shared = true; }
}

// A hub at `K` scene units per millimetre. at(x, y, z) gives a point on it, in REV's millimetres, that labels can follow.
function hub(src, K) {
  const g = group(src.clone(true));
  g.children[0].scale.setScalar(K);
  g.at = (x, y, z) => { const o = new THREE.Object3D(); o.position.set(x * K, y * K, z * K); g.add(o); return o; };
  return g;
}
// The Driver Hub with a live Driver Station screen laid over its glass.
function driverHub(K) {
  const g = hub(DH, K);
  const c = document.createElement('canvas'); c.width = 604; c.height = 380;
  const x = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const face = mesh(new THREE.PlaneGeometry(118 * K, 73 * K), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), [0, 9.75 * K, 1.9 * K], [-Math.PI / 2, 0, 0]);
  face.userData.noShadow = true;
  g.add(face);
  let last = '';
  g.draw = (lines, running = true) => {
    const key = lines.join('|') + running;
    if (key === last) return;
    last = key;
    x.fillStyle = '#15181A'; x.fillRect(0, 0, 604, 380);
    x.fillStyle = '#2A2F31'; x.fillRect(0, 0, 604, 54);
    x.fillStyle = '#F4F4F0'; x.font = '600 24px Inter, sans-serif'; x.textBaseline = 'middle'; x.textAlign = 'left';
    x.fillText('TeleOp: BioBuzz Drive', 18, 28);
    x.fillStyle = running ? '#3E9A5B' : '#6E7577'; x.beginPath(); x.arc(566, 27, 11, 0, TAU); x.fill();
    x.font = '500 23px "JetBrains Mono", monospace';
    lines.forEach((l, i) => { x.fillStyle = i % 2 ? '#E8F542' : '#C9CDCB'; x.fillText(l, 18, 92 + i * 38); });
    x.fillStyle = running ? '#D8452B' : '#3E9A5B'; x.beginPath(); x.roundRect(430, 286, 150, 70, 16); x.fill();
    x.fillStyle = '#fff'; x.font = '600 26px Inter, sans-serif'; x.textAlign = 'center'; x.fillText(running ? 'STOP' : 'INIT', 505, 322);
    tex.needsUpdate = true;
  };
  g.draw(['gamepad1: ready']);
  return g;
}
// Radio waves: arcs that grow from `from` toward +X and fade as they go.
function waves(n, reach, color = C.volt) {
  const g = group(), arcs = [];
  for (let i = 0; i < n; i++) {
    const m = mesh(new THREE.TorusGeometry(1, 0.035, 6, 28, 1.3), new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, toneMapped: false }));
    m.rotation.z = -0.65; m.userData.noShadow = true;
    g.add(m); arcs.push(m);
  }
  g.step = (t, power = 1) => arcs.forEach((m, i) => { const p = (((t + i / n) % 1) + 1) % 1; m.scale.setScalar(lerp(0.5, reach, p)); m.material.opacity = Math.sin(p * Math.PI) * 0.85 * power; });
  g.step(0);
  return g;
}
// A drive motor with a mecanum wheel on its shaft, lying along X.
function motorWheel(k = 0.42) {
  const mm = miniMotor(k, 1.3);
  const w = mecanumWheel(1.25, 0.9, 1);
  w.g.position.x = (1.94 + 1.3 + 1.45) * k + 0.4;
  const g = group(mm.g, w.g);
  return { g, spin(d) { w.spin.rotation.x += d; mm.shaft.rotation.x += d; } };
}

// Where things are on the Control Hub, in millimetres from its centre: [x, y, z] of the middle, [w, h, d] of the opening.
const PORTS = {
  motor: { at: [5, 20, 66.5], size: [52, 3, 6], grp: 'motors', name: 'Motor ports', n: '4', tip: '<b>4 motor ports</b>, numbered 0 to 3. Each has two fat pins that carry the power to one motor. Our four drive motors plug in here.' },
  enc: { at: [10.8, 20, 58], size: [46, 3, 10], grp: 'motors', name: 'Encoder ports', n: '4', tip: '<b>4 encoder ports</b>, one behind each motor port. A thin 4-wire cable from the back of the motor tells the hub how far the shaft has turned.' },
  servo: { at: [43, 20, -5.5], size: [5, 3, 66], grp: 'servos', name: 'Servo ports', n: '6', tip: '<b>6 servo ports</b>, numbered 0 to 5. Three pins each: ground, 5 volts and signal. A servo turns to an angle you ask for and holds it.' },
  v5: { at: [43, 20, 36.2], size: [5, 3, 14], grp: 'servos', name: '+5 V power', n: '2', tip: '<b>2 extra 5 volt ports</b> for things that only need power, like a light or a camera fan.' },
  analog: { at: [33.1, 20, -56], size: [9, 3, 11], grp: 'sensors', name: 'Analog', n: '4', tip: '<b>4 analog inputs</b> on 2 plugs. Analog means the sensor sends a voltage anywhere from 0 to 3.3 volts, like a dimmer. A potentiometer uses these.' },
  digital: { at: [15.5, 20, -56], size: [21, 3, 11], grp: 'sensors', name: 'Digital', n: '8', tip: '<b>8 digital pins</b> on 4 plugs. Digital means only two answers: on or off. A touch sensor or a limit switch uses these.' },
  i2c: { at: [-5, 20, -56], size: [19, 3, 11], grp: 'sensors', name: 'I2C', n: '4', tip: '<b>4 I2C buses</b>. I2C (say "eye squared see") lets a smart sensor send whole numbers, not just on or off. Colour and distance sensors plug in here.' },
  rs: { at: [-26.5, 20, -55.5], size: [16, 3, 9], grp: 'data', name: 'RS485 and UART', n: '2 + 2', tip: '<b>2 RS485 ports</b> link to an Expansion Hub when you need more than 4 motors. The 2 UART ports beside them are for debugging.' },
  usb: { at: [-51.8, 14, 8], size: [1, 14, 44], grp: 'data', name: 'USB and HDMI', n: '4', tip: 'USB ports for a webcam or a laptop, and HDMI for a screen. The hub is a small Android computer inside.' },
  xt: { at: [-28, 20, 60], size: [11, 3, 12], grp: 'power', name: 'XT30 battery plug', n: '2', tip: '<b>Yellow XT30 plugs</b>. The 12 volt battery comes in here. The second one passes power on to another hub.' },
};
const GROUPS = {
  all: { label: 'All', what: 'Everything on the robot', wire: 'Power, signals and data', view: [[13, 19, 17], [0, 0.6, 0.5]] },
  motors: { label: 'Motors', what: 'Drive, intake and launcher motors', wire: '12 V power out, ticks back', view: [[4, 11, 19], [0.6, 0.8, 4.2]], plug: 'motor', color: C.red },
  servos: { label: 'Servos', what: 'Servos: small motors that hold an angle', wire: '5 V and a signal', view: [[18, 11, 5], [2.6, 0.8, 0.4]], plug: 'servo', color: C.orange },
  sensors: { label: 'Sensors', what: 'Touch, colour and distance sensors', wire: '3.3 V and data', view: [[4, 11, -18.5], [0.6, 0.8, -3.8]], plug: 'i2c', color: C.teal },
  data: { label: 'Data', what: 'Webcam, laptop, a second hub', wire: 'Messages only', view: [[-16, 9.5, -12], [-2.6, 0.8, -2.4]], plug: 'rs', color: C.blue },
  power: { label: 'Power', what: 'The 12 V battery', wire: '12 V in, up to 20 amps', view: [[-8, 10, 17.5], [-1.4, 0.8, 4]], plug: 'xt', color: C.volt },
};

export default function hubs() {
  // ------------------------------------------------------------ 1. Two boxes
  const two = {
    id: 'two', tab: 'Two boxes',
    title: 'One in your hands, one on the robot',
    lead: 'A FIRST Tech Challenge robot is run by two boxes. The <b>Driver Hub</b> is the touchscreen the drive team holds, with the gamepads plugged into it. The <b>Control Hub</b> is bolted to the robot. It is the robot’s brain: it runs your code and feeds every motor. They talk over <b>Wi-Fi</b>, so there is no wire between drivers and robot.',
    try: 'Turn the stick knob. Watch the message cross the gap and the wheel answer.',
    controls: [
      { type: 'knob', id: 'hb_stick', label: 'Push the stick', min: -1, max: 1, step: 0.05, value: 0.5, fmt: (v) => fmt(v) },
      { type: 'seg', id: 'hb_look', label: 'Look at', value: 'both', options: [['both', 'Both'], ['dh', 'Driver Hub'], ['ch', 'Control Hub']] },
      { type: 'seg', id: 'hb_run', label: 'Driver Station', value: 'start', options: [['init', 'Init'], ['start', 'Start'], ['stop', 'Stop']] },
    ],
    readouts: [['hb_s', 'Stick says', 'a number from -1 to 1'], ['hb_m', 'Messages', 'per second, over Wi-Fi'], ['hb_p', 'Motor power', 'set by your code']],
    more: [
      ['Why two boxes and not one?', 'Rules and safety. Nobody may touch the robot during a match, so the drivers need something in their hands that is not on the robot. The Driver Hub also has the big Start and Stop buttons that the field crew trusts.'],
      ['Is the Control Hub a computer?', 'Yes. Inside is a small Android computer, like a phone with no screen, joined to a board full of motor drivers. Your Java OpMode is an app running on it.'],
      ['What do Init, Start and Stop do?', '<b>Init</b> gets the robot ready without moving. <b>Start</b> begins the loop: from now on the gamepads drive the robot. <b>Stop</b> ends the program and cuts motor power. At a competition the field crew calls each one.'],
      ['What if the Wi-Fi drops?', 'The Control Hub notices that messages have stopped and cuts power to the motors on its own. A robot that keeps driving with nobody in control would be dangerous.'],
    ],
    build(st, S, ui) {
      const K = 0.05;
      const dh = driverHub(K);
      dh.rotation.x = 1.0;
      dh.position.set(-4.8, 2.3, -0.6);
      const stand = box(1.2, 0.2, 2.6, metal(C.alu, 0.4), { r: 0.05, pos: [-4.8, 0.1, -1.6] });
      const prop = box(0.9, 3.2, 0.16, metal(C.alu, 0.4), { r: 0.05, pos: [-4.8, 1.5, -1.75] });
      prop.rotation.x = -0.55;
      const pad = gamepad(1.05);
      pad.g.position.set(-4.8, 0.45, 3.4);
      pad.g.rotation.x = 0.12;
      const usb = tube([[-4.8, 0.6, 2.5], [-6.6, 0.3, 1.6], [-6.4, 0.5, 0.8], [-4.8, 0.9, 0.55]], 0.05, C.black, { rough: 0.6 });
      const ch = hub(CH, K);
      ch.position.set(3.6, 0.42, 0);
      ch.rotation.y = Math.PI / 2;
      const rails = group(box(8.4, 0.42, 0.7, metal(C.alu, 0.38), { r: 0.05, pos: [3.6, 0.21, -1.6] }), box(8.4, 0.42, 0.7, metal(C.alu, 0.38), { r: 0.05, pos: [3.6, 0.21, 1.6] }));
      const mw = motorWheel(0.4);
      mw.g.position.set(1.4, 1.3, 5.2);
      const wire = curveOf([[7.1, 1.1, 0.2], [8.0, 0.6, 2.2], [1.2, 0.5, 3.4], [-0.6, 1.0, 4.6], [0.4, 1.3, 5.2]]);
      const flow = new Flow(wire, 8, { size: 0.085 });
      const air = waves(5, 4.4);
      air.position.set(-2.8, 2.6, 0);
      st.add(dh, stand, prop, pad.g, usb, ch, rails, mw.g, tube(wire, 0.07, C.red, { rough: 0.6 }), flow.object, air);
      st.label('Driver Hub', dh, { dy: -96, tip: 'A tough Android touchscreen made by REV. It runs the <b>Driver Station</b> app: pick an OpMode, press INIT, press Start. It sends the gamepad readings to the robot.' });
      st.label('Gamepad', pad.g, { dy: 44, tip: 'Plugged into the Driver Hub by USB. Two gamepads fit, so one person can drive while the other runs the intake and launcher.' });
      st.label('Control Hub', ch, { dy: -64, tip: 'The robot’s brain, also made by REV. It makes its own Wi-Fi network, runs your code, and has ports for motors, servos and sensors.' });
      const lw = st.label('Wi-Fi', air, { dy: -40, tone: 'volt' });
      const lm = st.label('Motor', mw.g, { dy: 54 });
      const views = { both: [[0, 9.5, 27], [0.2, 1.3, 1.6]], dh: [[-8, 6, 13], [-4.8, 1.6, 1]], ch: [[9, 8, 14], [3.2, 0.9, 2]] };
      let shown = 0, t = 0;
      return {
        view: { pos: views[S.hb_look][0], target: views[S.hb_look][1] },
        change(id) { if (id === 'hb_look') st.setView(...views[S.hb_look]); },
        tick(dt) {
          t += dt;
          const s = S.hb_stick, live = S.hb_run === 'start';
          shown = lerp(shown, live ? s : 0, 1 - Math.exp(-dt * 6)); // the wheel answers a moment after the stick
          pad.setStick(0, 0, s);
          air.step(t * 0.7, 0.35 + Math.abs(s) * 0.65);
          flow.advance(dt * shown * 0.9);
          flow.object.visible = Math.abs(shown) > 0.03;
          mw.spin(-dt * shown * 9);
          dh.draw(S.hb_run === 'init' ? ['Status: INIT', 'Robot is ready.', 'Waiting for Start…', `battery       12.6 V`] : S.hb_run === 'stop' ? ['Status: STOPPED', 'Motors off.', 'Press INIT to go again', `battery       12.6 V`] : [`left_stick_y  ${fmt(-s)}`, `drive power   ${fmt(s)}`, `loop time     20 ms`, `battery       12.6 V`], live);
          if (!live) ui.note(S.hb_run === 'init' ? '<b>INIT</b> runs the set-up part of your OpMode: it finds the motors and gets ready. Nothing may move yet. The stick is ignored until Start.' : '<b>STOP</b> ends the OpMode and the Control Hub cuts power to every motor. The big red button is the one the field crew trusts.', ''); else ui.note('<b>Start</b> pressed: the loop is running, so the stick now reaches the wheel.');
          lw.show(S.hb_look === 'both');
          lm.text(`Motor: power ${fmt(shown)}`);
          ui.out('hb_s', fmt(s), s === 0 ? 'stick is centred' : s > 0 ? 'pushed forward' : 'pulled back');
          ui.out('hb_m', '~50');
          ui.out('hb_p', `${Math.round(shown * 100)}%`, Math.abs(shown) < 0.02 ? 'stopped' : shown > 0 ? 'forwards' : 'backwards');
        },
      };
    },
  };

  // ------------------------------------------------------------ 2. Ports tour
  const ports = {
    id: 'ports', tab: 'Ports tour',
    title: 'Every plug on the Control Hub',
    lead: 'Everything on the robot plugs into this box, and <b>every port has a number</b>. Your code uses the same numbers when it says which motor is which. This is REV’s real CAD model, so what you see here is what is on our robot. Pick a group, then tap the labels.',
    try: 'Pick a group, tap a label, then slide the cable into its port.',
    controls: [
      { type: 'seg', id: 'hp_grp', label: 'Show me the ports for', value: 'all', options: Object.entries(GROUPS).map(([k, g]) => [k, g.label]) },
      { id: 'hp_plug', label: 'Plug in a cable', min: 0, max: 100, value: 0, unit: '%' },
    ],
    readouts: [['hp_n', 'Ports in this group'], ['hp_w', 'What plugs in'], ['hp_c', 'The wire carries']],
    more: [
      ['What is the IMU, and where is it?', 'IMU means inertial measurement unit. It is a tiny chip soldered inside the hub that feels which way the hub is turned, like the sensor that rotates your phone screen. There is no plug for it because it is already inside. The Sensors dive shows how to use it.'],
      ['How does the code know which port is which?', 'On the Driver Hub you fill in a <b>configuration</b>: "motor port 0 is called frontLeft". Your code then asks for <code>frontLeft</code> by name. If a wire is in the wrong port, the wrong wheel spins.'],
      ['Why are the plugs different shapes?', 'So you cannot plug a 12 volt motor wire into a 3.3 volt sensor port and burn it. Motor plugs are big, sensor plugs are small, and most are keyed so they only fit one way round.'],
      ['Only 4 motor ports. We have more motors.', 'Add a REV Expansion Hub. It links to the Control Hub through an RS485 port and brings 4 more motor ports, 6 more servo ports and more sensor ports.'],
    ],
    build(st, S, ui) {
      const K = 0.1;
      const ch = hub(CH, K);
      st.add(ch);
      const marks = {};
      for (const [k, p] of Object.entries(PORTS)) {
        const m = box(p.size[0] * K, p.size[1] * K, p.size[2] * K, mat(GROUPS[p.grp].color, { opacity: 0.5, glow: true, glowPower: 0.9 }), { r: 0.03, pos: [p.at[0] * K, p.at[1] * K, p.at[2] * K] });
        m.userData.noShadow = true;
        ch.add(m);
        const anchor = ch.at(p.at[0], p.at[1] + 2, p.at[2]);
        marks[k] = { m, p, l: st.label(`${p.name} (${p.n})`, anchor, { dy: k === 'motor' || k === 'v5' ? 26 : -14, tip: p.tip }) };
      }
      const imu = st.label('IMU inside', ch.at(0, 30, 6), { dy: -10, tip: 'The IMU is a chip inside the hub that feels turning. It tells your code which way the robot is facing, in degrees. No wire needed.' });
      const wifi = st.label('Wi-Fi inside', ch.at(-20, 30, -24), { dy: -10, tip: 'The radio that talks to the Driver Hub is inside too. Keep metal plates from covering the hub or the signal gets weak.' });
      // One cable that goes to whichever group is picked.
      const plug = group();
      const head = box(0.9, 0.7, 0.5, plastic(C.white, 0.5), { r: 0.08 });
      const tail = tube([[0, 0.3, 0], [0, 1.6, 0], [0.5, 3.2, 0.4], [1.6, 4.6, 1.2]], 0.1, C.black, { rough: 0.6 });
      const tail2 = tube([[0.16, 0.3, 0], [0.16, 1.6, 0], [0.7, 3.2, 0.45], [1.8, 4.6, 1.3]], 0.1, C.red, { rough: 0.6 });
      plug.add(head, tail, tail2);
      st.add(plug);
      const lp = st.label('Cable', head, { dy: -30, tone: 'volt' });
      return {
        view: { pos: GROUPS[S.hp_grp].view[0], target: GROUPS[S.hp_grp].view[1] },
        change(id) { if (id === 'hp_grp') { st.setView(...GROUPS[S.hp_grp].view); ui.set('hp_plug', 0); } },
        tick(dt, t) {
          const G = GROUPS[S.hp_grp];
          let n = 0;
          for (const [, mk] of Object.entries(marks)) {
            const on = S.hp_grp === 'all' || mk.p.grp === S.hp_grp;
            mk.m.visible = on;
            mk.m.material.opacity = on ? 0.38 + 0.22 * Math.sin(t * 4) : 0;
            mk.l.show(on);
            if (on) n += mk.p.n.split('+').reduce((a, b) => a + Number(b), 0);
          }
          imu.show(S.hp_grp === 'all' || S.hp_grp === 'sensors');
          wifi.show(S.hp_grp === 'all' || S.hp_grp === 'data');
          plug.visible = !!G.plug;
          const k = smooth(S.hp_plug / 100);
          if (G.plug) {
            const p = PORTS[G.plug].at;
            head.material.color.set(G.plug === 'xt' ? C.volt : G.plug === 'servo' ? C.black : C.white);
            plug.position.set(p[0] * K, lerp(4.2, (p[1] - 5) * K, k), p[2] * K);
            lp.text(k > 0.97 ? 'Click! Plugged in' : 'Cable');
          }
          lp.show(!!G.plug);
          ui.out('hp_n', String(n), S.hp_grp === 'all' ? 'plus the IMU and Wi-Fi inside' : G.label);
          ui.out('hp_w', S.hp_grp === 'all' ? 'Everything' : G.label, G.what);
          ui.out('hp_c', G.wire.split(',')[0], G.wire.split(',')[1] || '');
          ui.note(G.plug && k > 0.97 ? 'Plugged in. On the real robot, do this only with the <b>power switch off</b>.' : S.hp_grp === 'all' ? 'Four sides, four jobs: motors and battery on one end, sensors on the other, servos down one side, USB down the other.' : `${G.what}. Tap a glowing label to see what each port is for.`);
        },
      };
    },
  };

  // ------------------------------------------------------------ Open it up
  // REV's CAD stops at the bare circuit board, so the chips are drawn in roughly where they sit.
  const CHIPS = {
    brain: { label: 'The brain', name: 'Android computer', job: 'Runs your Java OpMode', n: '1 + 1 helper', note: 'A small computer, like the inside of a phone. It runs Android and your OpMode. Next to it is a helper chip that does the split-second work: counting encoder ticks and switching the motor drivers.' },
    drivers: { label: 'Motor drivers', name: 'Motor driver chips', job: 'Switch 12 V to each motor', n: '4', note: 'One for each motor port. The brain only makes tiny 3.3 volt signals. A driver chip is a set of fast electronic switches, called an <b>H-bridge</b>, that turns those signals into real 12 volt power. The next chapter opens one up.' },
    imu: { label: 'IMU', name: 'IMU chip', job: 'Feels turning and tilting', n: '1', note: 'A chip about 4 mm across with a tiny vibrating part inside. When the robot turns, the vibration shifts, and the chip reports how fast it is turning.' },
    wifi: { label: 'Wi-Fi', name: 'Wi-Fi radio', job: 'Talks to the Driver Hub', n: '1', note: 'A radio under a metal shield, with an antenna printed on the board. The hub makes its own Wi-Fi network and the Driver Hub joins it.' },
    power: { label: 'Power', name: 'Voltage regulators', job: '12 V down to 5 V and 3.3 V', n: '2', note: 'Motors get the full battery voltage. Everything else would burn at 12 volts, so regulators step it down: 5 volts for servos and USB, 3.3 volts for the chips and sensors.' },
  };
  const inside = {
    id: 'inside', tab: 'Open it up',
    title: 'What is inside the box',
    lead: 'Slide to cut the case away. Underneath is one circuit board carrying five kinds of parts: a <b>computer</b> that runs your code, <b>motor drivers</b> that switch real power, an <b>IMU</b> that feels turning, a <b>Wi-Fi radio</b>, and <b>regulators</b> that make safe voltages. The case and board are REV’s real CAD. REV’s model leaves the chips out, so they are drawn in about where they sit.',
    try: 'Slide the case open, then pick a part to light up its job.',
    controls: [
      { id: 'hi_open', label: 'Cut the case away', min: 0, max: 100, value: 0, unit: '%' },
      { type: 'seg', id: 'hi_find', label: 'Find', value: 'brain', options: Object.entries(CHIPS).map(([k, c]) => [k, c.label]) },
    ],
    readouts: [['hi_n', 'Part'], ['hi_j', 'Its job'], ['hi_c', 'How many']],
    more: [
      ['Why a computer AND a helper chip?', 'Android is clever but not punctual: it might pause for a few thousandths of a second to do something else. Motors and encoders cannot wait. So a simpler chip that never pauses handles the fast, exact jobs, and the Android computer tells it what to do.'],
      ['Is the Control Hub really two things in one box?', 'Yes. It is the same motor and sensor board as a REV Expansion Hub, with an Android computer added on top. That is why an Expansion Hub looks the same from outside but needs a Control Hub to tell it what to do.'],
      ['Why is the case plastic and not metal?', 'Radio waves cannot pass through metal. A metal box would trap the Wi-Fi inside. It is also why you should not bolt the hub under a big metal plate.'],
    ],
    build(st, S, ui) {
      const K = 0.1;
      const ch = hub(CH, K);
      st.add(ch);
      st.renderer.localClippingEnabled = true;
      const cut = new THREE.Plane(new THREE.Vector3(0, -1, 0), 3.2), cutPins = new THREE.Plane(new THREE.Vector3(0, -1, 0), 3.2);
      for (const [nm, pl] of [['c1', cut], ['c0', cut], ['c3', cut], ['c4', cutPins]]) {
        const o = ch.getObjectByName(nm);
        if (!o) continue;
        o.material = o.material.clone(); o.material.userData.shared = false;
        o.material.clippingPlanes = [pl]; o.material.side = THREE.DoubleSide;
      }
      const pcb = ch.getObjectByName('c8');
      if (pcb) { pcb.material = new THREE.MeshPhysicalMaterial({ color: '#16324A', roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.3 }); }
      const board = group();
      board.position.y = 7.6 * K;
      ch.add(board);
      const legs = metal(C.steel, 0.3);
      // A chip: a black body with a row of metal legs down two sides. Sizes in millimetres.
      const chip = (x, z, w, d, h, color = '#1B1D1E') => {
        const g = group(box(w * K, h * K, d * K, plastic(color, 0.4, 0.4), { r: 0.02, pos: [0, (h * K) / 2, 0] }));
        const n = Math.max(3, Math.round(d / 1.6));
        for (const s of [-1, 1]) for (let i = 0; i < n; i++) g.add(box(0.07, 0.03, 0.05, legs, { r: 0, pos: [s * (w * K) / 2 + s * 0.03, 0.02, ((i + 0.5) / n - 0.5) * d * K * 0.9] }));
        g.position.set(x * K, 0, z * K);
        board.add(g);
        return g;
      };
      const can = (x, z, w, d, h) => { const m = box(w * K, h * K, d * K, metal('#C9CDCB', 0.3), { r: 0.03, pos: [x * K, (h * K) / 2, z * K] }); board.add(m); return m; };
      const parts = { brain: [], drivers: [], imu: [], wifi: [], power: [] };
      const cpu = chip(8, -14, 30, 34, 1.6, '#123A2A');
      cpu.add(box(2.0, 0.22, 2.0, metal('#C9CDCB', 0.28), { r: 0.04, pos: [0, 0.27, -0.2] }), box(0.7, 0.14, 0.9, plastic('#1B1D1E', 0.4), { r: 0.02, pos: [-0.9, 0.23, 1.2] }), box(0.7, 0.14, 0.9, plastic('#1B1D1E', 0.4), { r: 0.02, pos: [0.4, 0.23, 1.2] }));
      const helper = chip(29, 2, 11, 11, 1.6);
      parts.brain.push(cpu, helper);
      for (const x of [-16, -2, 11, 25]) parts.drivers.push(chip(x, 44, 8, 7, 2.2));
      const imuChip = chip(-18, 8, 5, 5, 1.3);
      parts.imu.push(imuChip);
      const radio = can(-25, -27, 13, 16, 2.6);
      const ant = group();
      for (let i = 0; i < 6; i++) ant.add(box(i % 2 ? 0.08 : 0.9, 0.02, i % 2 ? 0.3 : 0.08, mat(C.brass, { metal: 0.8, rough: 0.3 }), { r: 0, pos: [-2.5 + (i % 2 ? (i % 4 === 1 ? 0.45 : -0.45) : 0), 0.012, -4.2 - i * 0.15] }));
      board.add(ant);
      parts.wifi.push(radio, ant);
      const reg1 = chip(-33, 36, 7, 7, 2), reg2 = chip(-33, 24, 6, 6, 2);
      const coil = cyl(0.42, 0.45, plastic('#2B2F30', 0.6), { pos: [-2.2, 0.23, 3.6], seg: 20 }), coil2 = cyl(0.34, 0.4, plastic('#2B2F30', 0.6), { pos: [-2.3, 0.2, 2.4], seg: 20 });
      const cap = cyl(0.3, 0.8, metal('#3A3F40', 0.35), { pos: [-1.3, 0.4, 3.7], seg: 18 });
      board.add(coil, coil2, cap);
      parts.power.push(reg1, reg2, coil, coil2, cap);
      // Glowing markers and data running from the brain to the chosen part.
      const AT = { brain: [8, -14, 34, 38], drivers: [4.5, 44, 54, 11], imu: [-18, 8, 9, 9], wifi: [-25, -30, 17, 26], power: [-28, 31, 20, 24] };
      const marks = {}, flows = {}, lbls = {};
      for (const [k, [x, z, w, d]] of Object.entries(AT)) {
        const m = box(w * K, 0.03, d * K, mat(C.volt, { opacity: 0.5, glow: true, glowPower: 1 }), { r: 0, pos: [x * K, 0.02, z * K] });
        m.userData.noShadow = true;
        board.add(m); marks[k] = m;
        if (k !== 'brain') {
          const f = new Flow(curveOf([[0.8, 0.26 + 7.6 * K, -1.4], [(0.8 + x * K) / 2, 0.5 + 7.6 * K, (-1.4 + z * K) / 2 + 0.6], [x * K, 0.3 + 7.6 * K, z * K]]), 6, { size: 0.07, color: k === 'power' ? C.red : C.volt });
          ch.add(f.object); flows[k] = f;
        }
        const a = new THREE.Object3D(); a.position.set(x * K, 0.5, z * K); board.add(a);
        lbls[k] = st.label(CHIPS[k].name, a, { dy: -18, tip: CHIPS[k].note });
      }
      const lh = st.label('Helper chip', helper, { dy: -16, tip: 'A microcontroller: a simple, very punctual chip. It counts encoder ticks and flips the motor switches thousands of times a second without ever pausing.' });
      const lc = st.label('Case: slide to cut it away', ch.at(20, 31, 20), { tone: 'volt' });
      return {
        view: { pos: [9, 18, 17], target: [0, 0.8, 0.4] },
        dispose() { st.renderer.localClippingEnabled = false; },
        tick(dt, t) {
          const k = smooth(S.hi_open / 100), open = k > 0.75;
          cut.constant = lerp(3.2, 0.5, k); cutPins.constant = lerp(3.2, 1.72, clamp(k * 2, 0, 1));
          board.visible = k > 0.35;
          const cur = S.hi_find, c = CHIPS[cur];
          for (const key of Object.keys(AT)) {
            const on = key === cur;
            marks[key].visible = on;
            marks[key].material.opacity = 0.3 + 0.25 * Math.sin(t * 5);
            lbls[key].show(open && on);
            if (flows[key]) { flows[key].object.visible = on && open; if (on) flows[key].advance(dt * (key === 'power' ? -0.5 : 0.5)); }
          }
          lh.show(open && cur === 'brain');
          lc.show(k < 0.1);
          ui.out('hi_n', c.name);
          ui.out('hi_j', c.job);
          ui.out('hi_c', c.n);
          ui.note(open ? c.note : k < 0.1 ? 'The case is shut. Slide <b>Cut the case away</b> to look inside.' : 'Keep sliding. The lid comes off first, then the walls.');
        },
      };
    },
  };

  // ------------------------------------------------------------ Motor port
  const motorPort = {
    id: 'motor', tab: 'Motor port',
    title: 'Four switches make a motor obey',
    lead: 'A motor port has just two pins. Behind them are four fast switches wired in the shape of a letter H, with the motor as the crossbar. This is an <b>H-bridge</b>. Close one diagonal pair and current runs through the motor one way: forwards. Close the other pair and it runs the other way: reverse. For half speed, the hub does not send half the voltage. It flicks the switch on and off very fast and leaves it on half the time. That trick is called <b>PWM</b>.',
    try: 'Turn the power knob through zero and watch which switches close.',
    controls: [
      { type: 'knob', id: 'hm_pow', label: 'motor.setPower', min: -1, max: 1, step: 0.05, value: 0.5, fmt: (v) => fmt(v) },
      { type: 'seg', id: 'hm_zero', label: 'At power 0', value: 'brake', options: [['brake', 'Brake'], ['float', 'Float']] },
    ],
    readouts: [['hm_d', 'Switch is on', 'of the time'], ['hm_v', 'Motor feels', 'on average'], ['hm_s', 'Switches closed']],
    more: [
      ['What does PWM stand for?', 'Pulse width modulation. "Pulse width" is how long each ON burst lasts. Wide pulses mean lots of power, thin pulses mean a little. The motor is too heavy to follow each flick, so it settles at the average.'],
      ['How fast is the flicking really?', 'Thousands of times every second, far too fast to see or hear. This model slows it down so one on-off cycle takes about a second.'],
      ['What is the difference between Brake and Float?', 'At power 0, <b>Brake</b> closes both bottom switches. That joins the motor’s two wires together, and a spinning motor with its wires joined fights its own motion and stops fast. <b>Float</b> opens all four, so the motor just coasts. In code: <code>setZeroPowerBehavior(BRAKE)</code>.'],
      ['Why must the two switches on one side never close together?', 'That would connect 12 volts straight to ground with no motor in between: a short circuit. The driver chip is built so it can never happen.'],
    ],
    build(st, S, ui) {
      const sw = (x, y) => {
        const bar = box(0.16, 1.1, 0.16, metal(C.brass, 0.3), { r: 0.04, pos: [0, 0.55, 0] });
        const pv = group(bar); pv.position.y = -0.55;
        const led = ball(0.13, mat(C.volt, { glow: true, glowPower: 2 }), { pos: [0.55, 0, 0.2] });
        led.userData.noShadow = true;
        const g = group(box(1.5, 1.7, 0.5, plastic('#1B1D1E', 0.4, 0.4), { r: 0.1, pos: [0, 0, -0.3] }), ball(0.14, metal(C.steel, 0.3), { pos: [0, 0.55, 0] }), ball(0.14, metal(C.steel, 0.3), { pos: [0, -0.55, 0] }), pv, led);
        g.position.set(x, y, 0);
        return { g, pv, led, k: 0 };
      };
      const X = 3.2, yT = 6.6, yB = 0.9, yM = 3.75;
      const s = [sw(-X, 5.2), sw(X, 5.2), sw(-X, 2.3), sw(X, 2.3)]; // top-left, top-right, bottom-left, bottom-right
      const wire = (pts, c) => tube(pts, 0.07, c, { rough: 0.6 });
      const railP = wire([[-5.4, yT, 0], [5.4, yT, 0]], C.red), railN = wire([[-5.4, yB, 0], [5.4, yB, 0]], C.black);
      const frame = group(railP, railN);
      for (const x of [-X, X]) frame.add(wire([[x, yT, 0], [x, 5.75, 0]], C.red), wire([[x, 4.65, 0], [x, 2.85, 0]], C.copper), wire([[x, 1.75, 0], [x, yB, 0]], C.black), wire([[x, yM, 0], [x * 0.42, yM, 0]], C.copper));
      const mw = motorWheel(0.34);
      mw.g.rotation.y = -Math.PI / 2;
      mw.g.position.set(0, yM, -1.0);
      const back = box(11.6, 7.2, 0.14, plastic('#F4F4F0', 0.6), { r: 0.3, pos: [0, 3.75, -0.7] });
      back.userData.noShadow = true;
      const fwd = curveOf([[-5.4, yT, 0.1], [-X, yT, 0.1], [-X, yM, 0.1], [X, yM, 0.1], [X, yB, 0.1], [5.4, yB, 0.1]]);
      const rev = curveOf([[5.4, yT, 0.1], [X, yT, 0.1], [X, yM, 0.1], [-X, yM, 0.1], [-X, yB, 0.1], [-5.4, yB, 0.1]]);
      const loopB = curveOf([[-X, yM, 0.1], [-X, yB, 0.1], [X, yB, 0.1], [X, yM, 0.1], [-X, yM, 0.1]]);
      const fF = new Flow(fwd, 14, { size: 0.1 }), fR = new Flow(rev, 14, { size: 0.1 }), fB = new Flow(loopB, 10, { size: 0.08, color: C.orange });
      const scr = screen(7.6, 5.0, 640);
      scr.g.position.set(10.6, 3.9, 0); scr.g.rotation.y = -0.3;
      const stand = box(3.6, 0.16, 1.6, metal(C.alu, 0.4), { r: 0.04, pos: [10.6, 0.08, -0.2] }), post = box(0.3, 1.4, 0.3, metal(C.alu, 0.4), { r: 0.04, pos: [10.6, 0.7, -0.3] });
      const feet = box(11.6, 0.16, 2.2, metal(C.alu, 0.4), { r: 0.04, pos: [0, 0.08, -0.4] });
      st.add(back, frame, ...s.map((q) => q.g), mw.g, fF.object, fR.object, fB.object, scr.g, stand, post, feet);
      st.label('+12 V from the battery', new THREE.Vector3(-4.6, yT, 0), { dy: -16, tone: 'warn' });
      st.label('Ground', new THREE.Vector3(-4.8, yB, 0), { dy: 22 });
      const names = ['A top', 'B top', 'A bottom', 'B bottom'];
      const ls = s.map((q, i) => st.label(names[i], q.g, { dy: i < 2 ? -44 : 44 }));
      st.label('Motor', mw.g, { dy: -62, tip: 'The motor is the crossbar of the H. Which way current crosses it decides which way it spins.' });
      let t = 0, spin = 0, drawn = '';
      return {
        view: { pos: [4.3, 6.5, 30], target: [4.3, 3.4, 0] },
        tick(dt) {
          const p = S.hm_pow, duty = Math.abs(p), brake = S.hm_zero === 'brake';
          t += dt;
          const ph = (t * 0.9) % 1, on = duty > 0 && ph < duty; // one PWM cycle, slowed right down
          // Which switches are closed right now: [A top, B top, A bottom, B bottom]
          const st4 = p > 0 ? [on, false, false, true] : p < 0 ? [false, on, true, false] : brake ? [false, false, true, true] : [false, false, false, false];
          s.forEach((q, i) => {
            q.k = lerp(q.k, st4[i] ? 1 : 0, 1 - Math.exp(-dt * 30));
            q.pv.rotation.z = (1 - q.k) * 0.6;
            q.led.material.emissiveIntensity = st4[i] ? 2.4 : 0.05;
            q.led.material.color.set(st4[i] ? C.volt : '#3A3F40');
          });
          fF.object.visible = p > 0 && on; fR.object.visible = p < 0 && on;
          if (on) (p > 0 ? fF : fR).advance(dt * 0.5);
          const target = p * 9;
          spin = lerp(spin, target, 1 - Math.exp(-dt * (p === 0 ? (brake ? 7 : 0.7) : 3)));
          fB.object.visible = p === 0 && brake && Math.abs(spin) > 0.3;
          fB.advance(dt * spin * 0.08);
          mw.spin(-dt * spin);
          const key = `${p}|${Math.floor(ph * 40)}`;
          if (key !== drawn) {
            drawn = key;
            const g = graph(scr, { title: 'Volts on the motor pins', x0: 0, x1: 3, y0: -14, y1: 14, xl: 'time (slowed down)', yl: 'volts' });
            g.grid([], [-12, 0, 12]);
            const pts = [], sg = Math.sign(p);
            for (let c = 0; c < 3; c++) pts.push([c, 0], [c, 12 * sg], [c + duty, 12 * sg], [c + duty, 0], [c + 1, 0]);
            if (duty > 0) g.line(pts, C.volt, 4);
            g.line([[0, 12 * p], [3, 12 * p]], '#FFFFFF', 3, [10, 8]);
            g.text(`average ${fmt(12 * p, 1)} V`, 2.95, 12 * p + (p >= 0 ? 1.4 : -3), '#FFFFFF', 'right');
            if (duty > 0) g.dot(1 + ph, on ? 12 * sg : 0, '#FFFFFF', 8);
            scr.flush();
          }
          ui.out('hm_d', `${Math.round(duty * 100)}%`);
          ui.out('hm_v', `${fmt(12 * p, 1)} V`, p === 0 ? 'nothing' : p > 0 ? 'forwards' : 'reverse');
          ui.out('hm_s', p > 0 ? 'A top + B bottom' : p < 0 ? 'B top + A bottom' : brake ? 'Both bottoms' : 'None', p === 0 ? (brake ? 'motor wires joined: brake' : 'motor coasts') : 'one diagonal');
          ui.hud(`<pre>motor.setPower(<i>${fmt(p)}</i>);</pre><span class="chip">PWM shown thousands of times slower</span>`);
          ui.note(p === 0 ? (brake ? '<b>Power 0, Brake.</b> Both bottom switches close and join the motor’s wires. The spinning motor now fights itself and stops quickly.' : '<b>Power 0, Float.</b> All four switches are open. Nothing drives the motor and nothing stops it, so it coasts.') : `<b>Power ${fmt(p)}.</b> The ${p > 0 ? 'A top' : 'B top'} switch is on ${Math.round(duty * 100)}% of the time, so the motor feels ${fmt(12 * duty, 1)} volts on average, pushing it ${p > 0 ? 'forwards' : 'in reverse'}.`);
        },
      };
    },
  };

  // ------------------------------------------------------------ Servo port
  const servoPort = {
    id: 'servo', tab: 'Servo port',
    title: 'A servo listens to how long the pulse is',
    lead: 'A <b>servo</b> is a small motor with its own brain. You do not tell it how hard to push. You tell it <b>what angle to hold</b>. The hub does that with one signal wire, sending a short pulse about 50 times a second. The servo measures <b>how long each pulse lasts</b>, in millionths of a second (microseconds, µs). 500 µs means all the way one side, 1500 µs is the middle, 2500 µs is all the way to the other side.',
    try: 'Turn the pulse knob, or drag the servo arm. Then push on the arm.',
    controls: [
      { type: 'knob', id: 'hv_pw', label: 'Pulse length', min: 500, max: 2500, step: 10, value: 1500, unit: ' µs' },
      { id: 'hv_push', label: 'Push on the arm', min: 0, max: 100, value: 0, unit: '%' },
    ],
    readouts: [['hv_a', 'Arm angle'], ['hv_p', 'In code', 'servo.setPosition'], ['hv_h', 'Servo pushes back']],
    more: [
      ['How does it get from setPosition to a pulse?', '<code>servo.setPosition(x)</code> takes a number from 0 to 1. The hub stretches that onto 500 to 2500 µs: pulse = 500 + x × 2000. So 0.5 gives 1500 µs, the middle.'],
      ['Why three wires?', 'Black is ground, red is 5 volts of power, and the third (white or yellow) is the signal carrying the pulses. That is why servo plugs have three pins.'],
      ['How does the servo hold its angle?', 'Inside is a tiny sensor on the output shaft. The servo keeps comparing "where am I" with "where was I told to be" and drives its motor to shrink the difference. That is the same proportional control as in the Algorithms dive, running inside the servo.'],
      ['Do all servos turn 270°?', 'No. This one sweeps 270°. Many sweep 180°, and some 300°. Some can be switched to spin forever like a slow motor. Check what yours does before you bolt an arm to it.'],
    ],
    build(st, S, ui) {
      const body = group(
        box(4.0, 3.6, 2.0, plastic('#232627', 0.45, 0.4), { r: 0.14, pos: [0, 1.8, 0] }),
        box(5.4, 0.3, 2.0, plastic('#232627', 0.45, 0.4), { r: 0.06, pos: [0, 2.9, 0] }),
        box(4.02, 0.5, 2.02, plastic(C.volt, 0.4), { r: 0.1, pos: [0, 3.36, 0] }),
        cyl(0.62, 0.5, plastic('#232627', 0.45), { axis: 'z', pos: [-1.0, 2.5, 1.1], seg: 28 }),
        cyl(0.3, 0.9, metal(C.brass, 0.3), { axis: 'z', pos: [-1.0, 2.5, 1.3], seg: 20 }),
      );
      for (const sx of [-1, 1]) body.add(cyl(0.16, 0.34, metal(C.steel, 0.3), { pos: [sx * 2.4, 2.92, 0.5], seg: 12 }), cyl(0.16, 0.34, metal(C.steel, 0.3), { pos: [sx * 2.4, 2.92, -0.5], seg: 12 }));
      const arm = group(box(0.7, 3.4, 0.22, metal(C.alu, 0.35), { r: 0.1, pos: [0, 1.35, 0] }), cyl(0.5, 0.24, metal(C.alu, 0.35), { axis: 'z', seg: 24 }), cyl(0.12, 0.3, C.dark, { axis: 'z', seg: 10, pos: [0, 2.6, 0] }), cyl(0.12, 0.3, C.dark, { axis: 'z', seg: 10, pos: [0, 1.6, 0] }));
      arm.position.set(-1.0, 2.5, 1.85);
      const ghostArm = box(0.3, 3.2, 0.06, mat(C.volt, { opacity: 0.4, glow: true }), { r: 0.05, pos: [0, 1.5, 0] });
      const gp = group(ghostArm); gp.position.set(-1.0, 2.5, 1.7);
      ghostArm.userData.noShadow = true;
      const dial = group();
      for (let i = 0; i <= 18; i++) {
        const a = ((i / 18) * 270 - 135) * Math.PI / 180, big = i % 3 === 0;
        const tk = box(big ? 0.1 : 0.05, big ? 0.6 : 0.34, 0.04, big ? C.ink : C.iron, { r: 0, pos: [-1.0 - Math.sin(a) * 4.3, 2.5 + Math.cos(a) * 4.3, -0.2] });
        tk.rotation.z = a;
        dial.add(tk);
      }
      const plate = cyl(5.2, 0.1, plastic('#F4F4F0', 0.6), { axis: 'z', pos: [-1.0, 2.5, -0.3], seg: 64 });
      plate.userData.noShadow = true;
      const K = 0.05, hubG = hub(CH, K);
      hubG.rotation.y = -Math.PI / 2; hubG.position.set(-9.0, 0, 1.5);
      // The servo strip is at hub x = 43 mm, which in this pose faces the camera.
      const p0 = [-9.0 + 0.3, 1.0, 1.5 + 43 * K];
      const wires = [C.black, C.red, C.white].map((c, i) => tube([[p0[0] + i * 0.08, p0[1], p0[2]], [-8.3, 1.6, 4.6 + i * 0.1], [-5.6, 0.3, 4.2 + i * 0.1], [1.4, 0.4 + i * 0.12, 2.0], [2.0, 1.0 + i * 0.12, 0.6]], 0.05, c, { rough: 0.6 }));
      const sig = new Flow(curveOf([[p0[0] + 0.16, p0[1], p0[2]], [-8.3, 1.6, 4.8], [-5.6, 0.3, 4.4], [1.4, 0.64, 2.0], [2.0, 1.24, 0.6]]), 5, { size: 0.09 });
      const scr = screen(7.4, 4.6, 640);
      scr.g.position.set(8.8, 3.8, 0.4); scr.g.rotation.y = -0.32;
      const stand = box(3.6, 0.16, 1.6, metal(C.alu, 0.4), { r: 0.04, pos: [8.8, 0.08, 0.2] }), post = box(0.3, 1.5, 0.3, metal(C.alu, 0.4), { r: 0.04, pos: [8.8, 0.75, 0.1] });
      st.add(plate, dial, body, arm, gp, hubG, ...wires, sig.object, scr.g, stand, post);
      for (const [txt, deg] of [['-135°', -135], ['0°', 0], ['+135°', 135]]) { const a = (deg * Math.PI) / 180; st.label(txt, new THREE.Vector3(-1.0 - Math.sin(-a) * 5.0, 2.5 + Math.cos(a) * 5.0, -0.2)); }
      st.label('Servo', body, { dy: 30, tip: 'Inside: a small motor, a stack of gears, an angle sensor and a control chip. Three wires in: ground, 5 volts and signal.' });
      st.label('Signal wire', new THREE.Vector3(-5.6, 0.5, 4.4), { dy: 18, tone: 'volt' });
      st.label('Servo port', hubG.at(43, 22, 0), { dy: -14 });
      let shown = 0, drawn = '';
      return {
        view: { pos: [0, 8.5, 32], target: [0, 2.9, 0.6] },
        handles: [{ id: 'hv_pw', obj: arm, axis: 'x', span: 260, hint: 'Drag the arm', dy: -70 }],
        tick(dt) {
          const pw = S.hv_pw, want = ((pw - 1500) / 1000) * 135, push = S.hv_push / 100;
          const give = push > 0.85 ? (push - 0.85) * 260 : push * 4, real = want + give;
          shown = lerp(shown, real, 1 - Math.exp(-dt * 9));
          const buzz = push > 0.3 ? Math.sin(performance.now() / 18) * push * 0.6 : 0;
          arm.rotation.z = (-(shown + buzz) * Math.PI) / 180;
          gp.rotation.z = (-want * Math.PI) / 180;
          gp.visible = Math.abs(shown - want) > 3;
          sig.advance(dt * 0.6);
          if (String(pw) !== drawn) {
            drawn = String(pw);
            const g = graph(scr, { title: 'The signal wire', x0: 0, x1: 3000, y0: -0.6, y1: 4.4, xl: 'microseconds (then quiet until 20,000)', yl: 'volts' });
            g.grid([0, 500, 1500, 2500], [0, 3.3]);
            g.line([[0, 0], [0, 3.3], [pw, 3.3], [pw, 0], [3000, 0]], C.volt, 5);
            g.text(`${pw} µs`, pw / 2, 3.65, C.volt, 'center');
            scr.flush();
          }
          ui.out('hv_a', `${want >= 0 ? '+' : ''}${want.toFixed(0)}°`, want === 0 ? 'the middle' : want > 0 ? 'clockwise' : 'anticlockwise');
          ui.out('hv_p', ((pw - 500) / 2000).toFixed(2), `(${pw} - 500) ÷ 2000`);
          ui.out('hv_h', push > 0.85 ? 'Losing' : `${Math.round(push * 100)}%`, push === 0 ? 'nothing to fight' : push > 0.85 ? 'pushed off its angle' : 'of its strength');
          ui.tone('hv_h', push > 0.85 ? 'warn' : '');
          ui.hud(`<pre>servo.setPosition(<i>${((pw - 500) / 2000).toFixed(2)}</i>);   <i>// ${pw} µs pulse, 50 times a second</i></pre>`);
          ui.note(push > 0.85 ? '<b>Too much load.</b> The servo is at full strength and still being pushed off its angle. Held like this it gets hot and can burn out. Use a stronger servo or a shorter arm.' : push > 0.3 ? 'The arm is being pushed, so the servo pushes back just as hard to stay put. You can hear a real one buzz when it does this.' : `A ${pw} µs pulse means “go to ${want.toFixed(0)}° and hold”. The servo keeps holding as long as the pulses keep coming.`, push > 0.85 ? 'warn' : '');
        },
      };
    },
  };

  // ------------------------------------------------------------ Sensor ports
  const KINDS = {
    analog: { label: 'Analog', ctl: 'Turn the dial', wire: (v) => `${(v * 3.3).toFixed(2)} V`, kind: 'Any voltage, 0 to 3.3' },
    digital: { label: 'Digital', ctl: 'Press the button', wire: (v) => (v > 0.5 ? '0 V' : '3.3 V'), kind: 'Only on or off' },
    i2c: { label: 'I2C', ctl: 'Which sensor to ask', wire: () => 'Messages', kind: 'Whole numbers, by address' },
  };
  const sensorPorts = {
    id: 'sensor', tab: 'Sensor ports',
    title: 'Three ways a sensor can talk',
    lead: 'The small white ports come in three kinds, and each speaks a different language. <b>Analog</b> is a voltage that can be anything from 0 to 3.3 volts, like a dimmer switch. <b>Digital</b> has only two answers: on or off. <b>I2C</b> is a real conversation: several smart sensors share the same wires, each has its own <b>address</b>, and the hub calls one by its address and gets numbers back.',
    try: 'Pick a kind of port, then move the slider and read what the code sees.',
    controls: [
      { type: 'seg', id: 'hx_kind', label: 'Kind of port', value: 'analog', options: Object.entries(KINDS).map(([k, v]) => [k, v.label]) },
      { id: 'hx_v', label: 'Turn, press or pick', min: 0, max: 100, value: 35, unit: '%' },
    ],
    readouts: [['hx_w', 'On the wire'], ['hx_c', 'Your code reads'], ['hx_k', 'Kind of answer']],
    more: [
      ['Why 3.3 volts?', 'The chips inside the hub run on 3.3 volts, so that is the biggest signal they can safely read. Sending 5 or 12 volts into a sensor port can destroy it. That is the reason the plugs are shaped differently from motor plugs.'],
      ['Why does a pressed button read 0 volts?', 'The hub gently pulls the pin up to 3.3 volts when nothing is happening. Pressing the button connects the pin to ground, which drags it to 0. So in code, <code>getState()</code> is <b>false</b> when pressed. Almost everyone gets this backwards the first time.'],
      ['What happens if two I2C sensors have the same address?', 'Both answer at once and the hub hears garbage. That is why the hub has four separate I2C buses: two sensors with the same address go on different buses.'],
      ['What are I2C addresses?', 'A number the maker builds into each sensor, usually written in hexadecimal, like 0x29 for the REV distance sensor and 0x52 for the REV colour sensor. Hex is just another way to write a number: 0x29 is 41.'],
    ],
    build(st, S, ui) {
      const K = 0.07, hx = -6.2;
      const ch = hub(CH, K);
      ch.rotation.y = -Math.PI / 2; ch.position.set(hx, 0, 0);
      const port = (px) => [hx + 56 * K, 14 * K, px * K]; // sensor-end ports face +X in this pose
      const pA = port(33), pD = port(15.5), pI = port(-5);
      // Analog: a dial (potentiometer).
      const knob = group(cyl(0.9, 0.5, plastic(C.dark, 0.4), { seg: 32 }), box(0.14, 0.12, 0.8, plastic(C.volt, 0.4), { r: 0.03, pos: [0, 0.28, -0.4] }));
      knob.position.y = 0.75;
      const pot = group(box(2.6, 0.5, 2.6, plastic('#2E63D6', 0.4, 0.5), { r: 0.1, pos: [0, 0.25, 0] }), knob);
      pot.position.set(4.4, 0, 3.2);
      const wA = curveOf([pA, [pA[0] + 1.2, 1.4, pA[2] + 0.6], [2.2, 0.4, 3.0], [3.1, 0.4, 3.2]]);
      const gA = group(pot, tube(wA, 0.06, C.orange, { rough: 0.6 }));
      const fA = new Flow(wA, 7, { size: 0.085, color: C.orange }); gA.add(fA.object);
      // Digital: a touch switch.
      const cap = cyl(0.55, 0.5, plastic(C.red, 0.4), { seg: 28, pos: [0, 0.8, 0] });
      const btn = group(box(2.2, 0.6, 2.2, plastic('#232627', 0.4, 0.5), { r: 0.1, pos: [0, 0.3, 0] }), cyl(0.75, 0.2, metal(C.steel, 0.3), { seg: 28, pos: [0, 0.66, 0] }), cap);
      btn.position.set(4.4, 0, 1.2);
      const wD = curveOf([pD, [pD[0] + 1.4, 1.5, pD[2] + 0.2], [2.4, 0.4, 1.2], [3.3, 0.4, 1.2]]);
      const gD = group(btn, tube(wD, 0.06, C.teal, { rough: 0.6 }));
      const fD = new Flow(wD, 7, { size: 0.085, color: C.teal }); gD.add(fD.object);
      // I2C: two sensors hanging off one shared bus.
      const dev = (c, x) => { const led = ball(0.14, mat(C.volt, { glow: true, glowPower: 2 }), { pos: [0.5, 0.5, 0.5] }); led.userData.noShadow = true; const g = group(box(1.9, 0.4, 1.9, plastic(c, 0.4, 0.5), { r: 0.08, pos: [0, 0.2, 0] }), box(0.7, 0.2, 0.7, plastic(C.black, 0.3), { r: 0.04, pos: [-0.2, 0.5, -0.2] }), led); g.position.set(x, 0, -2.6); return { g, led }; };
      const d1 = dev('#2E63D6', 2.6), d2 = dev('#1F6B45', 6.4);
      const bus = curveOf([pI, [pI[0] + 1.2, 1.5, pI[2] - 0.6], [0.6, 0.5, -1.2], [2.6, 0.5, -1.2], [6.4, 0.5, -1.2]]);
      const gI = group(d1.g, d2.g, tube(bus, 0.06, C.volt, { rough: 0.6 }), tube([[2.6, 0.5, -1.2], [2.6, 0.4, -1.8]], 0.06, C.volt, { rough: 0.6 }), tube([[6.4, 0.5, -1.2], [6.4, 0.4, -1.8]], 0.06, C.volt, { rough: 0.6 }));
      const pk = ball(0.2, new THREE.MeshBasicMaterial({ color: '#FFFFFF', toneMapped: false })); pk.userData.noShadow = true; gI.add(pk);
      st.add(ch, gA, gD, gI);
      const lA = st.label('Dial (potentiometer)', pot, { dy: -44 }), lD = st.label('Touch switch', btn, { dy: -46 });
      const l1 = st.label('Distance sensor, address 0x29', d1.g, { dy: -34 }), l2 = st.label('Colour sensor, address 0x52', d2.g, { dy: 40 });
      const lp = st.label('', pk, { dy: -18, tone: 'volt' });
      let t = 0;
      return {
        view: { pos: [-1.9, 12, 27], target: [-1.9, 0.9, 0.3] },
        tick(dt) {
          const kind = S.hx_kind, v = S.hx_v / 100, Kd = KINDS[kind];
          t += dt;
          gA.visible = kind === 'analog'; gD.visible = kind === 'digital'; gI.visible = kind === 'i2c';
          lA.show(kind === 'analog'); lD.show(kind === 'digital'); l1.show(kind === 'i2c'); l2.show(kind === 'i2c'); lp.show(kind === 'i2c');
          let code = '', read = '', sub = '', note = '';
          if (kind === 'analog') {
            knob.rotation.y = -(v - 0.5) * 4.7;
            fA.advance(-dt * (0.1 + v * 0.8));
            fA.object.scale.setScalar(1);
            read = `${(v * 3.3).toFixed(2)} V`; sub = `${Math.round(v * 270)}° of the dial`;
            code = `double volts = pot.getVoltage();          <i>// ${(v * 3.3).toFixed(2)}</i>\ndouble angle = volts / 3.3 * 270;         <i>// ${Math.round(v * 270)}</i>`;
            note = `The dial lets through <b>${Math.round(v * 100)}%</b> of 3.3 volts. The hub measures that voltage and your code turns it into an angle. Good for an arm that needs to know where it is.`;
          } else if (kind === 'digital') {
            const down = v > 0.5;
            cap.position.y = lerp(cap.position.y, down ? 0.62 : 0.8, 1 - Math.exp(-dt * 20));
            fD.object.visible = !down; fD.advance(dt * 0.4);
            read = down ? 'false' : 'true'; sub = down ? 'pressed' : 'not pressed';
            code = `boolean up = touch.getState();            <i>// ${down ? 'false' : 'true'}</i>\nif (!up) lift.setPower(0);                <i>// ${down ? 'stop!' : 'keep going'}</i>`;
            note = down ? '<b>Pressed.</b> The switch joins the pin to ground, so it reads 0 volts and <code>getState()</code> is false. Backwards from what you would guess.' : 'Not pressed. The hub holds the pin at 3.3 volts, which reads as true. Slide past halfway to press it.';
          } else {
            const who = v > 0.5 ? 1 : 0, addr = who ? '0x52' : '0x29';
            // One conversation: the call goes out along the bus, both sensors hear it, one answers.
            const ph = (t * 0.55) % 1, out = ph < 0.5, k = out ? ph * 2 : 2 - ph * 2;
            bus.getPointAt(clamp(k * (who ? 1 : 0.72), 0, 1), pk.position);
            pk.material.color.set(out ? '#FFFFFF' : C.volt);
            lp.text(out ? `Calling ${addr}…` : (who ? 'R 150  G 60  B 205' : '412 mm'));
            d1.led.material.emissiveIntensity = !who && !out ? 2.6 : 0.05; d2.led.material.emissiveIntensity = who && !out ? 2.6 : 0.05;
            d1.led.material.color.set(!who && !out ? C.volt : '#3A3F40'); d2.led.material.color.set(who && !out ? C.volt : '#3A3F40');
            read = who ? 'Purple' : '412 mm'; sub = `from address ${addr}`;
            code = who ? `int red = color.red();                    <i>// asks 0x52: 150</i>` : `double mm = dist.getDistance(MM);         <i>// asks 0x29: 412</i>`;
            note = `Both sensors share the same wires and both hear every call. Only the one whose address is <b>${addr}</b> answers. Slide to call the other one.`;
          }
          ui.hud(`<pre>${code}</pre>`);
          ui.out('hx_w', Kd.wire(v));
          ui.out('hx_c', read, sub);
          ui.out('hx_k', Kd.label, Kd.kind);
          ui.note(note);
        },
      };
    },
  };

  // ------------------------------------------------------------ 3. Stick to wheel
  const SLOW = 20; // the scene runs this many times slower than real life so the message can be seen
  const signal = {
    id: 'signal', tab: 'Stick to wheel',
    title: 'How a push on the stick reaches a wheel',
    lead: 'You push the stick. The wheel turns. In between, the message makes a trip: <b>gamepad</b>, <b>Driver Hub</b>, through the air by <b>Wi-Fi</b>, into the <b>Control Hub</b>, where your OpMode <b>loop</b> reads it and decides a motor power. Each stop takes a few thousandths of a second (milliseconds, ms). Add them up and you get <b>lag</b>.',
    try: 'Flick the stick knob, then make the Wi-Fi slow and flick again.',
    controls: [
      { type: 'knob', id: 'hs_stick', label: 'Stick', min: -1, max: 1, step: 0.05, value: 0.8, fmt: (v) => fmt(v) },
      { id: 'hs_wifi', label: 'Wi-Fi delay', min: 2, max: 150, value: 10, unit: ' ms' },
      { id: 'hs_loop', label: 'Your loop takes', min: 5, max: 100, value: 20, unit: ' ms' },
    ],
    readouts: [['hs_lag', 'Lag, worst case', 'stick to wheel'], ['hs_hz', 'Loops per second'], ['hs_far', 'Robot rolls on', 'at 1.5 m/s before it reacts']],
    more: [
      ['Where does the lag formula come from?', 'Worst case = Wi-Fi delay + one whole loop + about 3 ms for the hub to tell the motor. The message can arrive just after your loop looked, so it waits for the next lap. On average it waits half a loop.'],
      ['What makes a loop slow?', 'Reading lots of sensors one at a time, using <code>sleep()</code>, or running camera vision in the same loop. A good TeleOp loop takes 10 to 30 ms.'],
      ['What makes Wi-Fi slow?', 'Many robots and phones on the same channel at a competition, or metal between the two hubs. That is why teams turn phone hotspots off at events.'],
      ['Can a human even feel 50 ms?', 'Barely. Under 50 ms feels instant. At 150 ms the robot feels like it is on ice, because it keeps doing the old command while you already changed your mind.'],
    ],
    build(st, S, ui) {
      const K = 0.042;
      const pad = gamepad(0.9);
      pad.g.position.set(-7.6, 0.5, 2.6);
      const dh = driverHub(K);
      dh.rotation.x = 1.0; dh.position.set(-7.6, 2.0, -0.4);
      const prop = box(0.8, 2.8, 0.14, metal(C.alu, 0.4), { r: 0.05, pos: [-7.6, 1.3, -1.4] });
      prop.rotation.x = -0.55;
      const ch = hub(CH, K);
      ch.rotation.y = Math.PI / 2; ch.position.set(1.8, 0.5, 0);
      const base = box(7, 0.5, 5.2, metal(C.alu, 0.4), { r: 0.08, pos: [1.8, 0.25, 0] });
      const mw = motorWheel(0.4);
      mw.g.position.set(7.1, 1.3, 0);
      const pA = curveOf([[-7.6, 0.8, 2.0], [-8.1, 0.5, 1.2], [-7.8, 0.9, 0.5], [-7.6, 1.6, 0.2]]);
      const pB = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-6.4, 3.3, -0.4), new THREE.Vector3(-2.6, 7.0, 0), new THREE.Vector3(1.2, 2.0, 0));
      const pC = curveOf([[4.5, 1.2, 0.5], [5.1, 1.6, 0.6], [5.7, 1.3, 0.2], [6.1, 1.3, 0]]);
      const air = waves(5, 5);
      air.position.set(-5.8, 3.4, 0); air.rotation.z = 0.25;
      // The loop: a ring over the hub. The bright bead goes round once per loop.
      const ring = mesh(new THREE.TorusGeometry(1.25, 0.07, 8, 48), mat('#F4F4F0', { opacity: 0.5 }), [1.8, 3.0, 0], [Math.PI / 2, 0, 0]);
      const bead = ball(0.2, mat(C.volt, { glow: true, glowPower: 1.5 }));
      ring.userData.noShadow = bead.userData.noShadow = true;
      st.add(pad.g, dh, prop, ch, base, mw.g, tube(pA, 0.05, C.black, { rough: 0.6 }), tube(pC, 0.07, C.red, { rough: 0.6 }), air, ring, bead);
      const dot = () => { const b = ball(0.2, new THREE.MeshBasicMaterial({ color: C.volt, toneMapped: false })); b.userData.noShadow = true; b.visible = false; st.add(b); return b; };
      const pool = Array.from({ length: 28 }, dot);
      st.label('1 Gamepad', pad.g, { dy: 44, tip: 'The stick is two tiny dials. The gamepad turns its position into a number from -1 to 1 and sends it down the USB cable.' });
      st.label('2 Driver Hub', dh, { dy: -84, tip: 'Packs both gamepads’ numbers into a small message and sends it by Wi-Fi, about 50 times a second.' });
      st.label('3 Wi-Fi', air, { dy: -70, tone: 'volt', off: new THREE.Vector3(3.2, 2.2, 0) });
      const ll = st.label('4 Your loop', ring, { dy: -26, tip: 'Your OpMode goes round and round: read the gamepad, decide, set the motors. A message that arrives mid-lap has to wait for the next lap.' });
      const lm = st.label('5 Motor', mw.g, { dy: 54 });
      let ts = 0, nextSend = 0, nextLoop = 0, latest = 0, applied = 0, flash = 0;
      const msgs = [], outs = [];
      return {
        view: { pos: [0.4, 10, 31], target: [0.4, 1.4, 0] },
        tick(dt) {
          const wifi = S.hs_wifi, loop = S.hs_loop, stick = S.hs_stick;
          ts += (dt * 1000) / SLOW;
          pad.setStick(0, 0, stick);
          if (ts >= nextSend) { nextSend = ts + 14; msgs.push({ born: ts, val: stick }); }
          if (ts >= nextLoop) { nextLoop = ts + loop; outs.push({ born: ts, val: latest }); flash = 1; }
          let n = 0;
          for (let i = msgs.length - 1; i >= 0; i--) {
            const m = msgs[i], age = ts - m.born;
            if (age > 4 + wifi) { latest = m.val; msgs.splice(i, 1); continue; }
            const b = pool[n++];
            if (!b) continue;
            b.visible = true;
            if (age < 4) pA.getPointAt(age / 4, b.position); else pB.getPoint((age - 4) / wifi, b.position);
            b.scale.setScalar(0.55 + Math.abs(m.val) * 0.6);
          }
          for (let i = outs.length - 1; i >= 0; i--) {
            const m = outs[i], age = ts - m.born;
            if (age > 3) { applied = m.val; outs.splice(i, 1); continue; }
            const b = pool[n++];
            if (!b) continue;
            b.visible = true; pC.getPointAt(clamp(age / 3, 0, 1), b.position); b.scale.setScalar(0.7 + Math.abs(m.val) * 0.7);
          }
          for (; n < pool.length; n++) pool[n].visible = false;
          const ph = 1 - (nextLoop - ts) / loop;
          bead.position.set(1.8 + Math.cos(ph * TAU) * 1.25, 3.0, Math.sin(ph * TAU) * 1.25);
          flash = Math.max(0, flash - dt * 4);
          ring.material.opacity = 0.35 + flash * 0.6;
          air.step(ts / Math.max(30, wifi * 1.2), 0.8);
          mw.spin(-dt * applied * 9);
          dh.draw([`left_stick_y  ${fmt(-stick)}`, `ping          ${wifi} ms`, `loop time     ${loop} ms`]);
          const lag = wifi + loop + 3;
          lm.text(`5 Motor: power ${fmt(applied)}`);
          ll.text(`4 Your loop: ${loop} ms a lap`);
          ui.hud(`<span class="chip">Shown <b>${SLOW}×</b> slower than real life</span><span class="chip">Stick <b>${fmt(stick)}</b> → wheel <b>${fmt(applied)}</b></span>`);
          ui.out('hs_lag', `${lag} ms`, `${wifi} Wi-Fi + ${loop} loop + 3 motor`);
          ui.tone('hs_lag', lag > 120 ? 'warn' : lag <= 50 ? 'good' : '');
          ui.out('hs_hz', String(Math.round(1000 / loop)));
          ui.out('hs_far', `${(lag * 0.15).toFixed(1)} cm`);
          ui.note(lag > 120 ? `<b>${lag} ms of lag.</b> The robot rolls ${(lag * 0.15).toFixed(0)} cm before it even starts to obey. Drivers call this "driving on ice".` : lag <= 50 ? `<b>${lag} ms.</b> That feels instant to a human. This is what a tidy loop and clean Wi-Fi give you.` : `<b>${lag} ms.</b> Drivable, but a sharp driver will feel the robot answer late.`, lag > 120 ? 'warn' : '');
        },
      };
    },
  };

  // ------------------------------------------------------------ 4. Power
  const power = {
    id: 'power', tab: 'Power',
    title: 'Twelve volts in, and one big rule',
    lead: 'The battery plugs into the hub’s yellow <b>XT30</b> port, through the main <b>power switch</b>. The hub then shares that power out: full battery voltage to the motors, a gentle 5 volts to servos and 3.3 volts to sensors. The rule: <b>switch off before you plug or unplug anything</b>.',
    try: 'Flip the switch on, drain the battery with the knob, then try to pull a wire.',
    controls: [
      { type: 'seg', id: 'hw_sw', label: 'Power switch', value: 'on', options: [['off', 'Off'], ['on', 'On']] },
      { type: 'knob', id: 'hw_v', label: 'Battery voltage', min: 6, max: 14, step: 0.1, value: 12.8, fmt: (v) => `${v.toFixed(1)} V` },
      { type: 'seg', id: 'hw_pull', label: 'Sensor wire', value: 'in', options: [['in', 'Plugged in'], ['out', 'Pull it out']] },
    ],
    readouts: [['hw_hub', 'Volts at the hub'], ['hw_led', 'Hub light'], ['hw_top', 'Motor top speed', 'compared with a full battery']],
    more: [
      ['Why never unplug while it is on?', 'For a split second the pins touch the wrong neighbours as the plug slides out. That can send 12 volts into a part built for 3.3 volts and kill it for good. It can also make a tiny spark that wears the metal pins.'],
      ['What does the hub light mean?', 'Green: running and talking to the Driver Hub. Blue: powered up and waiting. Blinking orange: the battery is under 7 volts, which is far too low. Check REV’s guide for the full list.'],
      ['Why does a low battery make the robot slow?', 'A motor’s top speed follows voltage. At 11 volts instead of 13, the same code gives a robot that is about 15% slower. Start every match on a fresh pack.'],
      ['What is an XT30?', 'A small yellow plug with two round gold pins, rated for 30 amps. It is shaped so it only fits one way, so plus and minus can never be swapped.'],
    ],
    build(st, S, ui) {
      const K = 0.07;
      const ch = hub(CH, K);
      ch.rotation.y = Math.PI / 2;
      ch.position.set(3.4, 0, 0);
      const batt = group(part('B_wrap', { scale: 0.75 }), part('B_label', { scale: 0.75 }));
      batt.position.set(-7.6, 0.95, 0.4);
      const sw = group(box(1.3, 0.7, 1.0, plastic(C.dark), { r: 0.1 }), cyl(0.27, 0.16, metal(C.steel, 0.3), { pos: [0, 0.4, 0] }));
      const lever = cyl([0.09, 0.13], 0.7, plastic(C.red), { pos: [0, 0.3, 0], seg: 14 });
      const pivot = group(lever); pivot.position.y = 0.42;
      sw.add(pivot);
      sw.position.set(-3.4, 0.35, 0.4);
      // In this pose the XT30 sits at hub (x -28, z 60) mm, which is world x = 3.4 + 60K, z = 28K.
      const xt = [3.4 + 60 * K, 18 * K, 28 * K];
      const plug = group(part('B_xt30', { scale: 0.8 }));
      plug.position.set(xt[0], xt[1] + 0.75, xt[2]);
      const feedA = curveOf([[-5.4, 1.0, 0.4], [-4.6, 0.9, 0.4], [-4.0, 0.5, 0.4]]);
      const feedB = curveOf([[-2.8, 0.5, 0.4], [-1.6, 0.6, 2.6], [1.5, 0.5, 5.6], [5.8, 1.6, 5.6], [xt[0], 3.6, xt[2] + 0.4], [xt[0], xt[1] + 1.2, xt[2]]]);
      const fA = new Flow(feedA, 4, { size: 0.1 }), fB = new Flow(feedB, 16, { size: 0.1 });
      const led = ball(0.16, mat(C.green, { glow: true, glowPower: 2 }));
      led.userData.noShadow = true;
      const ledAt = ch.at(2, 23.5, -37);
      ledAt.add(led);
      const mw = motorWheel(0.36);
      mw.g.position.set(4.6, 1.2, -6.4);
      const mwire = curveOf([[3.4 + 66 * K, 1.2, -0.3], [9.4, 0.6, -2], [8, 0.9, -5.6], [3.6, 1.2, -6.4]]);
      const fM = new Flow(mwire, 8, { size: 0.085 });
      // A sensor on a thin cable into an I2C port.
      const sens = group(box(0.9, 0.3, 0.7, plastic(C.blue, 0.4), { r: 0.06 }), cyl(0.14, 0.12, C.black, { pos: [0, 0.2, 0], seg: 14 }));
      sens.position.set(-4.6, 0.2, -3.4);
      const port = [3.4 - 56 * K, 14 * K, 5 * K];
      const sPlug = box(0.34, 0.34, 0.5, plastic(C.white, 0.5), { r: 0.05 });
      const sWire = group();
      st.add(ch, batt, sw, plug, tube(feedA, 0.09, C.red, { rough: 0.6 }), tube(feedB, 0.09, C.red, { rough: 0.6 }), fA.object, fB.object, mw.g, tube(mwire, 0.06, C.copper, { metal: 0.5, rough: 0.5 }), fM.object, sens, sPlug, sWire);
      st.label('12 V battery', batt, { dy: -50, tip: 'Ten rechargeable cells in a row. Full is about 13.5 volts, empty is about 11. The Battery dive opens it up.' });
      st.label('Power switch', sw, { dy: -44, tip: 'Breaks the red wire. Off means nothing downstream has power, so it is the first thing to hit when something goes wrong.' });
      st.label('XT30 plug', plug, { dy: -30, tone: 'volt', tip: 'Yellow, two gold pins, only fits one way. 12 volts enters the hub here.' });
      st.label('Hub light', ledAt, { dy: -16 });
      const zap = st.label('Zap! Wrong pins touched', sPlug, { dy: -30, tone: 'warn' });
      const ls = st.label('Colour sensor', sens, { dy: 30 });
      let pull = S.hw_pull === 'out' ? 1 : 0, lastPull = -1, spark = 0, t = 0;
      const drawWire = (k) => {
        st.disposeTree(sWire); sWire.clear();
        sPlug.position.set(port[0] - k * 1.5, port[1] + 0.25 + k * 1.1, port[2] - k * 0.4);
        sWire.add(tube([[sPlug.position.x - 0.1, sPlug.position.y, sPlug.position.z], [-1.8, 1.3 - k * 0.3, -1.0], [-3.6, 0.5, -2.7], [-4.3, 0.3, -3.3]], 0.045, C.black, { rough: 0.6, steps: 30 }));
      };
      return {
        view: { pos: [0.2, 13, 26], target: [0.2, 0.8, -0.4] },
        change(id) { if (id === 'hw_pull' && S.hw_pull === 'out' && S.hw_sw === 'on') spark = 1.6; },
        tick(dt) {
          t += dt;
          const on = S.hw_sw === 'on', v = S.hw_v, alive = on && v >= 7;
          pivot.rotation.z = lerp(pivot.rotation.z, on ? -0.5 : 0.5, 1 - Math.exp(-dt * 14));
          pull = lerp(pull, S.hw_pull === 'out' ? 1 : 0, 1 - Math.exp(-dt * 7));
          if (Math.abs(pull - lastPull) > 0.004) { drawWire(pull); lastPull = pull; }
          spark = Math.max(0, spark - dt);
          const amps = on ? clamp((v - 6) / 6, 0.15, 1.2) : 0;
          fA.object.visible = fB.object.visible = on;
          fM.object.visible = alive;
          fA.advance(dt * amps * 0.9); fB.advance(dt * amps * 0.35); fM.advance(dt * amps * 0.5);
          mw.spin(alive ? -dt * (v / 12) * 8 : 0);
          const col = !on ? '#3A3F40' : v < 7 ? C.orange : C.green;
          led.material.color.set(col); led.material.emissive.set(col);
          led.material.emissiveIntensity = !on ? 0 : v < 7 ? (Math.sin(t * 9) > 0 ? 2.5 : 0.1) : 2;
          zap.show(spark > 0);
          ls.text(S.hw_pull === 'out' ? 'Colour sensor: unplugged' : 'Colour sensor');
          ui.out('hw_hub', on ? `${v.toFixed(1)} V` : '0 V', on ? (v >= 12.4 ? 'fresh battery' : v >= 11.5 ? 'getting tired' : 'swap it') : 'switch is off');
          ui.tone('hw_hub', on && v < 11.5 ? 'warn' : on && v >= 12.4 ? 'good' : '');
          ui.out('hw_led', !on ? 'Dark' : v < 7 ? 'Blinking orange' : 'Green', !on ? 'no power' : v < 7 ? 'battery too low' : 'running');
          ui.out('hw_top', alive ? `${Math.round((v / 13.5) * 100)}%` : '0%');
          ui.note(spark > 0 ? '<b>That is the mistake.</b> You pulled a wire with the power on. For an instant the pins touched the wrong neighbours. Switch off first, every time.'
            : !on ? (S.hw_pull === 'out' ? 'Switch off, wire out. That is the safe order. Plug it back in before you switch on.' : 'Switch off: the red wire is broken, so nothing flows. Now it is safe to plug and unplug.')
              : v < 7 ? 'Under 7 volts the hub cannot run. It blinks orange and the motors stop. In a match this is called a <b>brownout</b>.'
                : v < 11.5 ? `At ${v.toFixed(1)} volts the robot still drives, but everything is slower and weaker. Time for a fresh pack.` : 'Power flows from the battery, through the switch, into the yellow XT30 plug and out to the motor.', spark > 0 || (on && v < 7) ? 'warn' : '');
        },
      };
    },
  };

  return { title: 'Control Hub and Driver Hub', chapters: [two, ports, inside, motorPort, servoPort, sensorPorts, signal, power] };
}
