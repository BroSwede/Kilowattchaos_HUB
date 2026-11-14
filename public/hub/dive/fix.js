// How it works: troubleshooting. Power off first, check the simple things in order, and change one thing at a time.
import { THREE, C, mat, metal, plastic, mesh, cyl, box, group, tube, part, clamp, lerp, TAU } from './kit.js';
import { miniBot, mecanumWheel, field } from './works.js';
import { miniMotor } from './motor.js';
import { flywheel } from './launcher.js';

// A glowing ring and a bobbing pointer that mark "look here".
function spotlight() {
  const m = mat(C.volt, { glow: true, glowPower: 0.9 });
  const ring = mesh(new THREE.TorusGeometry(1, 0.07, 8, 40), m, [0, 0, 0], [Math.PI / 2, 0, 0]);
  const tip = mesh(new THREE.ConeGeometry(0.28, 0.7, 4), m, [0, 1.6, 0], [Math.PI, 0, 0]);
  const g = group(ring, tip);
  g.traverse((o) => { o.userData.noShadow = true; });
  const pos = new THREE.Vector3();
  let first = true;
  g.aim = (obj, r, t, tone) => {
    obj.getWorldPosition(pos);
    if (first) { g.position.copy(pos); first = false; } else g.position.lerp(pos, 0.14);
    ring.scale.setScalar(lerp(ring.scale.x, r * (1 + Math.sin(t * 5) * 0.06), 0.2));
    tip.position.y = r * 0.6 + 1.3 + Math.sin(t * 4) * 0.16;
    m.color.set(tone); m.emissive.set(tone);
  };
  return g;
}
// The StarterBot with the extra parts a fault can hide in, and a point to aim at for each.
function patient(k = 1.2) {
  const bot = miniBot({ k: 1 });
  const fw = flywheel(0.5, 0.5);
  fw.g.rotation.y = Math.PI / 2; fw.g.position.set(0, 1.75, -0.9);
  const tower = group(box(0.12, 0.9, 0.12, metal(C.alu, 0.4), { r: 0.02, pos: [-0.38, 1.4, -0.9] }), box(0.12, 0.9, 0.12, metal(C.alu, 0.4), { r: 0.02, pos: [0.38, 1.4, -0.9] }));
  const servo = group(box(0.42, 0.36, 0.22, plastic('#2A2E30', 0.5, 0.4), { r: 0.04 }), box(0.5, 0.06, 0.1, plastic(C.volt, 0.4), { r: 0.02, pos: [0.12, 0.22, 0] }));
  servo.position.set(0.75, 1.25, -0.2);
  const roller = group(cyl(0.07, 2.3, metal(C.steel, 0.3), { axis: 'x', seg: 6 }));
  for (let i = -5; i <= 5; i++) roller.add(cyl(0.16, 0.14, mat(C.teal, { rough: 0.7 }), { axis: 'x', seg: 14, pos: [i * 0.2, 0, 0] }));
  roller.position.set(0, 0.32, -2.05);
  const at = (x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); bot.g.add(o); return o; };
  bot.g.add(fw.g, tower, servo, roller);
  bot.g.scale.setScalar(k);
  return { ...bot, fw, servo, roller, spots: { hub: at(0, 1.15, 0.75), battery: at(0, 1.3, -0.5), plug: at(0.55, 1.2, 0.2), fl: bot.wheels[0].at, br: bot.wheels[3].at, wheels: at(0, 0.7, 0), launcher: at(0, 1.8, -0.9), servo: at(0.75, 1.3, -0.2), intake: at(0, 0.4, -2.05) } };
}

const CASES = {
  connect: { name: 'Will not connect', steps: [
    ['hub', 1.0, 'Is the robot switched on? Look for a light on the Control Hub. No light means no power: check the switch and the battery plug.'],
    ['dh', 1.5, 'On the Driver Hub, look at the Wi-Fi name it has joined. It must be <b>our</b> robot’s network, the one with our team number in it.'],
    ['battery', 1.1, 'Is the battery charged? A weak battery lets the hub start, then drop out again.'],
    ['hub', 1.0, 'Restart in order: robot off, count to five, robot on, wait for the light. Then restart the Driver Station app.'],
  ], found: ['dh', 1.5, 'The Driver Hub had joined <b>another team’s robot</b> on the practice field. Picking our own network fixed it in ten seconds.'] },
  wheel: { name: 'One wheel will not spin', steps: [
    ['hub', 1.0, '<b>Power off.</b> Follow that motor’s power cable to the Control Hub. Is the plug pushed fully home?'],
    ['fl', 1.0, 'Now the other end. Is the plug at the motor seated? Is the cable pinched or cut where it passes the frame?'],
    ['dh', 1.5, 'Power on. In the configuration, is there a motor on that port, with the exact name the code uses?'],
    ['hub', 1.0, 'Still dead? Power off and move the cable to a port you know works. If the wheel now turns, the port or the configuration was the problem.'],
  ], found: ['fl', 1.0, 'The plug at the motor had been tugged <b>half out by a cable tie</b>. It looked connected but was not. Pushed in and re-tied with some slack.'] },
  drift: { name: 'Drifts sideways', steps: [
    ['wheels', 2.6, 'Look straight down on the robot. The rollers of the four mecanum wheels must make an <b>X</b>. One wheel on the wrong corner makes it drift.'],
    ['br', 1.0, 'Lift the robot and run each wheel on its own. Is one slower, or does it slip on its shaft when you hold it gently?'],
    ['dh', 1.5, 'Check the motor directions in the code. On a drivetrain the two sides are mirror images, so one side must be reversed.'],
    ['battery', 1.1, 'Is the weight even? A heavy battery far to one side lifts the opposite wheels, and a wheel with less weight on it grips less.'],
  ], found: ['br', 1.0, 'The clamping screw on the <b>back-right wheel hub</b> had worked loose, so that wheel slipped on its shaft under load. Tightened, and added to the pre-match check.'] },
  short: { name: 'Shots land short', steps: [
    ['battery', 1.1, 'Read the battery voltage on the Driver Hub. A tired battery spins the flywheel slower.'],
    ['launcher', 1.0, 'Is the flywheel up to speed <b>before</b> each ball is fed? Check the code waits for it.'],
    ['launcher', 1.0, 'Power off, then look at the wheel and hood. Is the wheel worn, dusty or loose on its shaft? Has the gap changed?'],
    ['servo', 0.8, 'Is the gate letting two balls through at once? The second always falls short.'],
  ], found: ['battery', 1.1, 'The battery was at <b>11.9 volts</b>: its third match without a charge. A fresh battery put the shots back in.'] },
  reset: { name: 'Resets mid-match', steps: [
    ['plug', 0.8, '<b>Power off.</b> Is the yellow battery plug pushed fully together, and is the battery strapped down so it cannot tug the cable?'],
    ['dh', 1.5, 'Power on and watch the voltage on the Driver Hub while everything runs. Does it dive when you push hard and shoot?'],
    ['intake', 1.2, 'Is something stalled? A jammed intake pulls 9 amps for as long as the button is held.'],
    ['hub', 1.0, 'Power off. Wiggle each cable at the hub gently. A loose power or data cable can cut out on a bump.'],
  ], found: ['plug', 0.8, 'The battery plug was <b>not fully seated</b>. It lost contact for a split second whenever the robot hit the wall. That is a brownout: the hub restarts.'] },
  servo: { name: 'Servo jitters', steps: [
    ['servo', 0.8, 'Is the arm pushing against something it cannot move? A servo that cannot reach its position buzzes and gets hot.'],
    ['hub', 1.0, '<b>Power off.</b> Is the servo plug the right way round and fully in? The three wires must line up with the marks by the port.'],
    ['dh', 1.5, 'Read the code. Is the servo being told two different positions in the same loop? It will twitch between them.'],
    ['battery', 1.1, 'Is the battery low? Servos misbehave when the voltage sags.'],
  ], found: ['dh', 1.5, '<b>Two lines of code</b> were setting the same servo to different positions every loop. Removing one stopped the jitter.'] },
};

export default function fix() {
  // ------------------------------------------------------------ 1. Safe first
  const DO = { look: ['Just look and read the Driver Hub', true, 'dh'], plug: ['Push a plug back in', false, 'hub'], motor: ['Unplug a motor', false, 'fl'], hand: ['Reach in near the wheels', false, 'wheels'] };
  const safe = {
    id: 'safe', tab: 'Safe first',
    title: 'Power off before hands on',
    big: 'Look with the power on, touch with the power off.',
    lead: 'A robot that is switched on can move at any moment: a bumped gamepad, a bug, an OpMode still running. So there is one rule before any fix. You may <b>look</b> and read the Driver Hub with the power on. Before you <b>touch</b> a wire, a plug or anything that moves, switch the robot <b>off</b> and wait for the light on the Control Hub to go out.',
    real: 'Our main power switch is the first thing to find on the robot. Say “power off” out loud before you reach in, so the person holding the Driver Hub knows too.',
    try: 'Pick something to do with the power on. Then switch it off and try again.',
    controls: [
      { type: 'seg', id: 'fs_sw', label: 'Robot power', value: 'on', options: [['on', 'On'], ['off', 'Off']] },
      { type: 'seg', id: 'fs_do', label: 'You want to', value: 'look', options: Object.entries(DO).map(([k, v]) => [k, v[0]]) },
    ],
    readouts: [['fs_s', 'Robot'], ['fs_v', 'Verdict']],
    more: [
      ['Why not plug things in with the power on?', 'A plug that goes in crooked can touch the wrong pins for a moment. With the power on, that can damage the port or the sensor. With the power off, nothing happens.'],
      ['The robot was stopped. Why is it still dangerous?', 'Stopped is not the same as off. If the hub has power, one tap on the Driver Hub or a stuck stick can start the motors. Gears and wheels do not care that a finger is in the way.'],
      ['What else is part of “safe”?', 'Safety glasses in the pit. Long hair tied back. Never pick the robot up by a mechanism. And if a wire, motor or battery is hot or smells odd, power off and tell a mentor.'],
    ],
    build(st, S, ui) {
      const f = field(13, 4, { wall: false });
      const p = patient(1.2);
      const dh = group(box(2.4, 0.2, 1.5, plastic('#2A2E30', 0.5, 0.4), { r: 0.08 }), box(2.0, 0.03, 1.15, mat(C.volt, { glow: true, glowPower: 0.5 }), { r: 0.01, pos: [0, 0.11, 0] }));
      dh.position.set(4.8, 0.55, 2.6); dh.rotation.set(0.45, -0.3, 0);
      const sw = group(box(0.9, 0.5, 0.6, plastic(C.dark, 0.5), { r: 0.06 }));
      const lever = box(0.22, 0.5, 0.3, plastic(C.red, 0.4), { r: 0.05, pos: [0, 0.3, 0] });
      sw.add(lever); sw.position.set(-2.4, 1.0, 1.2);
      const led = mesh(new THREE.SphereGeometry(0.14, 12, 8), mat(C.green, { glow: true, glowPower: 1.5 }));
      p.spots.hub.add(led);
      const live = mat(C.red, { glow: true, glowPower: 0.9 });
      const wires = group(...[[[0, 1.45, -0.6], [0.4, 1.7, 0.2], [0.2, 1.4, 0.9]], [[-0.3, 1.35, 0.9], [-1.4, 1.2, 0.6], [-1.75, 0.9, -1.3]], [[0.3, 1.35, 0.9], [1.4, 1.2, 0.6], [1.75, 0.9, -1.3]], [[-0.3, 1.35, 1.0], [-1.5, 1.1, 1.3], [-1.75, 0.9, 1.4]], [[0.3, 1.35, 1.0], [1.5, 1.1, 1.3], [1.75, 0.9, 1.4]]].map((w) => tube(w.map(([x, y, z]) => [x * 1.2, y * 1.2, z * 1.2]), 0.05, live)));
      const spot = spotlight(), dhAt = new THREE.Object3D();
      dh.add(dhAt);
      st.add(f, p.g, dh, sw, wires, spot);
      st.label('Power switch', sw, { dy: -30 });
      const ll = st.label('Live', p.spots.hub, { dy: -36, tone: 'warn' });
      let tw = 0;
      return {
        view: { pos: [7.5, 8.5, 13.5], target: [1, 1.3, 0.3] },
        groundY: -0.16,
        tick(dt, t) {
          const on = S.fs_sw === 'on', [, okOn, where] = DO[S.fs_do], ok = !on || okOn;
          lever.rotation.z = lerp(lever.rotation.z, on ? -0.5 : 0.5, 0.2);
          led.visible = on;
          live.emissiveIntensity = on ? 0.6 + Math.sin(t * 6) * 0.3 : 0; live.color.set(on ? C.red : '#3A3F41');
          // A powered robot can twitch: an idle stick, a test OpMode, a bug.
          tw = on ? Math.max(0, Math.sin(t * 1.3) - 0.8) * 5 : 0;
          for (const w of p.wheels) w.spin.rotation.x -= tw * dt * 4;
          if (on) p.fw.spin.rotation.z -= dt * 3;
          spot.aim(where === 'dh' ? dhAt : p.spots[where], where === 'wheels' ? 2.9 : where === 'dh' ? 1.5 : 1.0, t, ok ? C.volt : C.red);
          ll.text(on ? 'Live' : 'Off: safe to touch'); ll.el.classList.toggle('is-warn', on);
          ui.out('fs_s', on ? 'Powered' : 'Off');
          ui.tone('fs_s', on ? 'warn' : 'good');
          ui.out('fs_v', ok ? 'OK' : 'Stop');
          ui.tone('fs_v', ok ? 'good' : 'warn');
          ui.note(!on ? '<b>Power is off and the hub light is out.</b> Now it is safe to touch wires, plugs and moving parts.' : okOn ? '<b>Fine.</b> Looking, listening and reading the Driver Hub is how you find most faults, and it needs the power on. Hands stay out.' : S.fs_do === 'hand' ? '<b>Stop.</b> The wheels and flywheel can start without warning. Switch off first.' : '<b>Stop.</b> Plugging or unplugging with the power on can damage a port, and the robot may move while your hand is inside. Switch off first.', ok ? 'good' : 'warn');
        },
      };
    },
  };

  // ------------------------------------------------------------ 2. What do I check?
  const find = {
    id: 'find', tab: 'What do I check?',
    title: 'Something is wrong. Where do I look?',
    big: 'Most faults are simple ones, so check the easy things in the same order every time: power, plugs, configuration, then code.',
    lead: 'Good troubleshooters do not guess. They start with what the robot is <b>doing wrong</b>, called the <b>symptom</b>, and work through a short list from the most likely and easiest thing to check, to the least. Pick a symptom, then step through the checks. The last step shows what the fault turned out to be.',
    real: 'These six are common ones for FIRST Tech Challenge robots like ours. Write what you found in the session note, so the next person starts from your answer instead of from zero.',
    try: 'Pick a symptom, then slide through checks 1 to 4 and on to what we found.',
    controls: [
      { type: 'seg', id: 'fx_sym', label: 'Symptom', value: 'wheel', options: Object.entries(CASES).map(([k, v]) => [k, v.name]) },
      { id: 'fx_step', label: 'Step', min: 1, max: 5, step: 1, value: 1, fmt: (v) => (v > 4 ? 'What we found' : `Check ${v} of 4`) },
    ],
    readouts: [['fx_w', 'Look at'], ['fx_p', 'Power for this check'], ['fx_n', 'Checks done']],
    more: [
      ['Why this order?', 'Because it follows what breaks most often. Loose plugs and flat batteries cause far more trouble than bad code or dead parts. And the early checks take seconds.'],
      ['What if none of these find it?', 'Change <b>one thing at a time</b> and test after each change. If you change three things and it works, you do not know which one mattered. The next chapter is about exactly that.'],
      ['What should I write down?', 'The symptom, what you checked, what you found and what fixed it. Four short lines. A fault that comes back in a match is much faster to fix the second time.'],
    ],
    build(st, S, ui) {
      const f = field(13, 4, { wall: false });
      const p = patient(1.25);
      const dh = group(box(2.6, 0.2, 1.6, plastic('#2A2E30', 0.5, 0.4), { r: 0.08 }), box(2.2, 0.03, 1.25, mat(C.volt, { glow: true, glowPower: 0.5 }), { r: 0.01, pos: [0, 0.11, 0] }));
      dh.position.set(5, 0.6, 2.4); dh.rotation.set(0.45, -0.3, 0);
      const dhAt = new THREE.Object3D();
      dh.add(dhAt);
      const spot = spotlight();
      st.add(f, p.g, dh, spot);
      st.label('Driver Hub', dh, { dy: 34 });
      const NAMES = { hub: 'Control Hub', dh: 'Driver Hub', battery: 'Battery', plug: 'Battery plug', fl: 'Front-left motor', br: 'Back-right wheel', wheels: 'All four wheels', launcher: 'Flywheel and hood', servo: 'Servo', intake: 'Intake' };
      const ln = st.label('', spot, { dy: -64, tone: 'volt' });
      return {
        view: { pos: [7.5, 8.5, 13.5], target: [1.1, 1.5, 0.3] },
        groundY: -0.16,
        change(id) { if (id === 'fx_sym') ui.set('fx_step', 1); },
        tick(dt, t) {
          const c = CASES[S.fx_sym], n = S.fx_step, done = n > 4, [where, r, text] = done ? c.found : c.steps[n - 1];
          const sym = S.fx_sym;
          // Show the symptom on the model.
          const drive = sym === 'drift' ? 1 : sym === 'connect' || sym === 'reset' ? 0 : 0.6;
          p.wheels.forEach((w, i) => { w.spin.rotation.x -= dt * 4 * (sym === 'wheel' && i === 0 ? 0 : sym === 'drift' && i === 3 ? 0.35 : drive); });
          p.g.position.x = sym === 'drift' ? Math.sin(t * 0.8) * 0.5 : lerp(p.g.position.x, 0, 0.1);
          p.fw.spin.rotation.z -= dt * (sym === 'short' ? 5 : sym === 'connect' || sym === 'reset' ? 0 : 12);
          p.servo.rotation.z = sym === 'servo' ? Math.sin(t * 40) * 0.07 : 0;
          spot.aim(where === 'dh' ? dhAt : p.spots[where], r * 1.25, t, done ? C.orange : C.volt);
          ln.text(done ? `Found it: ${NAMES[where]}` : `${n}. ${NAMES[where]}`);
          const off = /Power off/.test(text);
          ui.hud(c.steps.map((s, i) => `<span class="chip">${i < n - 1 || done ? '✓' : i === n - 1 ? '<b>→</b>' : '○'} ${NAMES[s[0]]}</span>`).join(''));
          ui.out('fx_w', NAMES[where]);
          ui.out('fx_p', done ? '–' : off ? 'Off' : 'On, hands out');
          ui.tone('fx_p', off ? 'warn' : '');
          ui.out('fx_n', `${Math.min(n, 4)} of 4`);
          ui.note(done ? `<b>What we found.</b> ${text}` : `<b>Check ${n}.</b> ${text}`, done ? 'good' : '');
        },
      };
    },
  };

  // ------------------------------------------------------------ 3. Swap one thing
  const PARTS = ['motor', 'cable', 'port'];
  const swap = {
    id: 'swap', tab: 'Swap one thing',
    title: 'Is it the motor, the cable or the port?',
    big: 'Swap one part with a working one: if the fault moves with it, that part is the culprit.',
    lead: 'A wheel is dead. Three things are in the chain: the <b>port</b> on the hub, the <b>cable</b>, and the <b>motor</b>. Any of them could be broken, and they all look fine. The trick is a <b>swap test</b>. Trade one part with the same part from a wheel that works, then see which wheel is dead now. If the fault <b>follows</b> the part you moved, you have found it.',
    real: 'Keep a spare motor cable in the pit box for exactly this. Always switch the robot off before you move a plug, and put everything back where it was before the match, or the code will drive the wrong wheel.',
    try: 'Try each swap, watch which wheel is dead, then make your guess.',
    controls: [
      { type: 'seg', id: 'fw_test', label: 'Wiring', value: 'built', options: [['built', 'As built'], ['cables', 'Swap the two cables'], ['ports', 'Swap the two ports']] },
      { type: 'seg', id: 'fw_guess', label: 'The broken part is', value: 'none', options: [['none', 'Not sure yet'], ['motor', 'The motor'], ['cable', 'The cable'], ['port', 'The port']] },
      { type: 'button', id: 'fw_new', label: 'New mystery' },
    ],
    readouts: [['fw_d', 'Dead wheel now'], ['fw_m', 'Did the fault move?'], ['fw_g', 'Your guess']],
    more: [
      ['How do I read the result?', 'The fault moved when you swapped the <b>cables</b>: it is the cable. It moved when you swapped the <b>ports</b>: it is the port (or its configuration). It never moved: it is the <b>motor</b> itself.'],
      ['Why only one swap at a time?', 'If you swap the cable and the port together and the fault moves, you cannot tell which one carried it. One change, one test, one answer.'],
      ['Does this work for other things?', 'Yes. Servos, sensors, gamepads, batteries, even lines of code. Swap in something you know is good and see whether the problem stays or goes.'],
    ],
    build(st, S, ui) {
      const table = box(22, 0.3, 13, mat('#8D9391', { rough: 0.9 }), { r: 0.05, pos: [1, -0.15, 0] });
      const hub = part('HUB', { scale: 1.3, pos: [-6, 0.85, 0] });
      const ports = [-1, 1].map((s) => box(0.7, 0.5, 0.8, plastic(C.volt, 0.4), { r: 0.06, pos: [-3.9, 0.6, s * 1.1] }));
      const units = [-1, 1].map((s) => { const m = miniMotor(0.42, 1.0, false), w = mecanumWheel(1.4, 1.0, s); m.g.position.set(4.6, 1.5, s * 3.2); w.g.position.set(7.8, 1.5, s * 3.2); st.add(m.g, w.g, box(1.4, 0.6, 2.4, metal(C.alu, 0.42), { r: 0.06, pos: [4.6, 0.3, s * 3.2] })); return { m, w, z: s * 3.2, th: 0 }; });
      st.add(table, hub, ...ports);
      const cols = [C.orange, C.teal];
      let cables = [], key = '', fault = PARTS[Math.floor(Math.random() * 3)];
      const lp = [st.label('Port 0', ports[0], { dy: -26 }), st.label('Port 1', ports[1], { dy: 30 })];
      const lw = units.map((u, i) => st.label('', u.w.g, { dy: i ? 60 : -60 }));
      const lc = [st.label('Cable A', new THREE.Vector3(0.4, 0.9, -2.6)), st.label('Cable B', new THREE.Vector3(0.4, 0.9, 2.6))];
      void lp;
      // Which motor (0 = top, 1 = bottom) is dead for this wiring, when the fault is in the top wheel's chain.
      const dead = (test) => (fault === 'cable' && test === 'cables') || (fault === 'port' && test === 'ports') ? 1 : 0;
      return {
        view: { pos: [1, 20, 17], target: [0.6, 0.4, 0.4] },
        groundY: -0.3,
        change(id) { if (id === 'fw_new') { fault = PARTS[Math.floor(Math.random() * 3)]; ui.set('fw_test', 'built'); ui.set('fw_guess', 'none'); key = ''; } },
        tick(dt) {
          const test = S.fw_test, guess = S.fw_guess;
          if (key !== test) {
            key = test;
            for (const c of cables) { c.geometry.dispose(); c.removeFromParent(); }
            // Cable A normally joins port 0 to the top motor. A swap moves one end.
            const ends = test === 'cables' ? [[1, 1], [0, 0]] : test === 'ports' ? [[1, 0], [0, 1]] : [[0, 0], [1, 1]];
            cables = ends.map(([pt, mo], i) => { const z0 = pt ? 1.1 : -1.1, z1 = mo ? 3.2 : -3.2, lift = 0.5 + i * 0.5; return tube([[-3.5, 0.6, z0], [-1.5, lift, z0 + (i ? 0.4 : -0.4)], [1.5, lift, z1 * 0.8], [3.6, 1.4, z1]], 0.13, plastic(cols[i], 0.5)); });
            st.add(...cables);
            ends.forEach(([, mo], i) => lc[i].to(new THREE.Vector3(2.3, 1.2 + i * 0.4, mo ? 2.7 : -2.7))); // each label stays by its own cable, at the motor end
          }
          const d = dead(test), moved = d === 1;
          units.forEach((u, i) => { if (i !== d) u.th += dt * 5; u.w.spin.rotation.x = u.th; lw[i].text(i === d ? 'Dead' : 'Turning'); lw[i].el.classList.toggle('is-warn', i === d); });
          const right = guess === fault;
          ui.label('fw_new', 'New mystery');
          ui.out('fw_d', d ? 'Bottom wheel' : 'Top wheel');
          ui.out('fw_m', test === 'built' ? 'Nothing swapped yet' : moved ? 'Yes, it moved' : 'No, same wheel');
          ui.tone('fw_m', test !== 'built' && moved ? 'good' : '');
          ui.out('fw_g', guess === 'none' ? '–' : right ? 'Correct' : 'Not that one');
          ui.tone('fw_g', guess === 'none' ? '' : right ? 'good' : 'warn');
          ui.hud('<span class="chip">Power off before you move a plug</span>');
          ui.note(guess !== 'none' ? (right ? `<b>Correct: the ${fault}.</b> ${fault === 'motor' ? 'The fault never moved, whatever you swapped, so it has to be the motor itself.' : `The fault jumped to the other wheel only when you swapped the ${fault}s.`} Press New mystery for another.` : `<b>Not the ${guess}.</b> Look again at which swap makes the dead wheel change.`)
            : test === 'built' ? '<b>The top wheel is dead.</b> Motor, cable or port? You cannot tell by looking. Try a swap.'
            : moved ? `<b>The fault moved</b> to the bottom wheel when you swapped the ${test}. What does that tell you?`
            : `<b>Still the top wheel.</b> Swapping the ${test} changed nothing, so the ${test === 'cables' ? 'cable' : 'port'} is fine. Try the other swap.`, guess !== 'none' && right ? 'good' : guess !== 'none' ? 'warn' : '');
        },
        dispose() { for (const c of cables) c.geometry.dispose(); },
      };
    },
  };

  return { title: 'Troubleshooting', chapters: [safe, find, swap] };
}
