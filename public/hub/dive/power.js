// How it works: the power budget. How many amps each motor pulls, what happens when everything runs at once,
// and how long a charged battery lasts. Numbers match the Battery and Motor deep dives:
// a 12 V pack of ten 3.0 Ah cells with 0.12 ohms inside, a 20 A fuse, and motors that idle at 0.25 A and stall at 9.2 A.
import { THREE, C, mat, metal, plastic, mesh, cyl, box, group, tube, Flow, part, clamp, lerp, TAU } from './kit.js';
import { miniBot, mecanumWheel, screen, graph } from './works.js';
import { miniMotor } from './motor.js';
import { flywheel } from './launcher.js';
import { geckoWheel } from './intake.js';

const STALL_A = 9.2, IDLE_A = 0.25, PACK_OHM = 0.12, TANK_AH = 3.0, FUSE_A = 20, MATCH_S = 150;
const rest = (soc) => (soc <= 0.03 ? 10.5 : 12 + soc); // volts with nothing running: 13 full, 12 nearly empty
const BROWN = 8; // roughly where the hub starts to struggle

export default function power() {
  // ------------------------------------------------------------ 1. What one motor drinks
  const one = {
    id: 'one', tab: 'One motor',
    title: 'The harder a motor works, the more it drinks',
    big: 'A motor pulls only a little current when it spins freely and a lot when something holds it back.',
    lead: 'Current is measured in <b>amps</b>. A motor spinning freely sips about a quarter of an amp. Make it work and it pulls more. Hold it still, called a <b>stall</b>, and it gulps about <b>9 amps</b>, all turned into heat.',
    real: 'If our intake jams, its motor is stalled until the driver lets go.',
    try: 'Squeeze the brake harder and watch the amps climb.',
    controls: [
      { type: 'knob', id: 'pw_load', label: 'Brake on the shaft', min: 0, max: 100, step: 1, value: 20, unit: '%' },
    ],
    readouts: [['pw_a', 'Current', 'amps'], ['pw_s', 'Speed', 'of the bare motor']],
    more: [
      ['Why more amps when it is slower?', 'A spinning motor also works as a generator. It makes its own voltage that pushes back against the battery. Spinning fast, it pushes back hard and little current gets through. Slowed down, it pushes back less, so more current flows.'],
      ['How long can a motor stay stalled?', 'A few seconds. After that the copper coils get hot enough to damage themselves. Good code stops a motor that is powered but not moving.'],
    ],
    build(st, S, ui) {
      const mm = miniMotor(1, 1.3, true);
      mm.g.position.set(-3, 3, 0);
      const disc = group(cyl(2.3, 0.22, metal('#C3C8CA', 0.3), { axis: 'x', seg: 48 }), cyl(0.7, 0.5, plastic(C.volt, 0.4), { axis: 'x', seg: 24 }));
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; disc.add(cyl(0.2, 0.26, C.dark, { axis: 'x', seg: 12, pos: [0, Math.cos(a) * 1.5, Math.sin(a) * 1.5] })); }
      disc.position.set(2.9, 3, 0);
      const padM = mat('#7A3B2E', { rough: 0.9 });
      const pads = [-1, 1].map((s) => { const p = group(box(0.3, 1.0, 1.3, padM, { r: 0.05 }), box(0.5, 1.4, 1.7, plastic(C.red, 0.4), { r: 0.08, pos: [s * 0.4, 0, 0] })); st.add(p); return p; });
      const stand = group(box(11, 0.4, 5, metal(C.alu, 0.42), { r: 0.08, pos: [0, 0.2, 0] }), box(1.2, 2.2, 3.2, metal(C.alu, 0.42), { r: 0.08, pos: [-3, 1.3, 0] }), box(0.8, 5.6, 0.8, metal(C.alu, 0.42), { r: 0.08, pos: [2.9, 3, -2.6] }), box(0.8, 0.8, 2.4, metal(C.alu, 0.42), { r: 0.08, pos: [2.9, 5.6, -1.6] }));
      const heat = cyl(1.95, 4.4, mat(C.red, { opacity: 0.4, glow: C.red, glowPower: 1 }), { axis: 'x', seg: 32, pos: [-3.2, 3, 0] });
      heat.userData.noShadow = true;
      const wire = [[-13, 0.4, 2], [-9, 0.5, 2.4], [-6.5, 2.2, 1.2], [-5.6, 3, 0.4]];
      const flow = new Flow(wire, 9, { color: C.volt, size: 0.13 });
      const scr = screen(9, 5.6, 760);
      scr.g.position.set(9.5, 5.2, -2.5); scr.g.rotation.y = -0.35;
      st.add(mm.g, disc, stand, heat, tube(wire, 0.12, C.red), flow.object, scr.g);
      const la = st.label('0 A', mm.g, { dy: -70, tone: 'volt' });
      st.label('Brake', pads[0], { off: new THREE.Vector3(0, 1.3, 0) });
      const PICK = { free: 0, drive: 20, push: 60, stall: 100 };
      let th = 0, lastDraw = -1;
      return {
        view: { pos: [2.5, 7, 28], target: [2.2, 3.4, 0] },
        groundY: 0,
        change(id) { if (id === 'pw_pick') ui.set('pw_load', PICK[S.pw_pick]); },
        tick(dt, t) {
          const k = S.pw_load / 100, amps = IDLE_A + (STALL_A - IDLE_A) * k, rpm = 6000 * (1 - k), watts = 12 * amps;
          const heatFrac = clamp(1 - (94 * k * (1 - k)) / watts, 0, 1); // the most a bare motor turns into movement is about 24 W, at half load
          th += (rpm / 6000) * 14 * dt;
          disc.rotation.x = th;
          const gap = 0.28 + (1 - k) * 0.35;
          pads.forEach((p, i) => p.position.set(2.9 + (i ? 1 : -1) * gap, 5.1 + (k >= 1 ? Math.sin(t * 60) * 0.01 : 0), 0));
          heat.material.opacity = clamp((amps - 1) / 9, 0, 1) * 0.55;
          heat.visible = amps > 1.2;
          flow.advance(dt * (0.05 + amps * 0.06));
          la.text(`${amps.toFixed(1)} A`);
          if (Math.abs(k - lastDraw) > 0.004) {
            lastDraw = k;
            const g = graph(scr, { title: 'One motor at 12 V', x0: 0, x1: 100, y0: 0, y1: 10, xl: 'how hard it is working (%)', yl: 'amps' });
            g.grid([0, 25, 50, 75, 100], [0, 2, 4, 6, 8, 10]);
            g.line([[0, IDLE_A], [100, STALL_A]], C.volt, 5);
            g.line([[0, 10], [100, 0]], 'rgba(244,244,240,0.5)', 3, [8, 8]);
            g.text('amps', 70, 7.4, C.volt); g.text('speed', 8, 8.2, 'rgba(244,244,240,0.75)');
            g.dot(k * 100, amps, k >= 1 ? C.red : C.volt, 12);
            scr.flush();
          }
          ui.out('pw_a', `${amps.toFixed(1)} A`);
          ui.tone('pw_a', k >= 1 ? 'warn' : '');
          ui.out('pw_s', `${Math.round(rpm / 100) * 100} rpm`, k >= 1 ? 'not turning' : 'of the bare motor');
          ui.out('pw_w', `${Math.round(watts)} W`, `12 V × ${amps.toFixed(1)} A`);
          ui.out('pw_h', `${Math.round(heatFrac * 100)}%`);
          ui.tone('pw_h', heatFrac > 0.9 ? 'warn' : '');
          ui.note(k >= 1 ? '<b>Stalled.</b> Not turning, pulling its maximum current, and every watt is heating the coils. Let go within a few seconds.' : k < 0.05 ? '<b>Spinning free.</b> Almost no work, almost no current. Most of the little it uses is just friction.' : k > 0.5 ? `<b>Working hard.</b> ${amps.toFixed(1)} amps. Past the halfway point a motor gets slower, hotter and does less useful work.` : `<b>A normal load.</b> ${amps.toFixed(1)} amps. This is where a motor is happiest: plenty of speed left and most of the power going into movement.`, k >= 1 ? 'warn' : '');
        },
      };
    },
  };

  // ------------------------------------------------------------ 2. The power budget
  const DRIVE = { off: [0, 'Off'], cruise: [6, 'Driving'], push: [24, 'Pushing hard'] }, INT = { off: [0, 'Off'], on: [1.5, 'Running'], jam: [STALL_A, 'Jammed'] }, LAU = { off: [0, 'Off'], hold: [2, 'Holding speed'], up: [STALL_A, 'Spinning up'] };
  // One switch instead of three: each step adds one more thing for the battery to feed.
  const MODES = { drive: ['cruise', 'off', 'off'], intake: ['cruise', 'on', 'off'], launch: ['cruise', 'on', 'hold'], worst: ['push', 'jam', 'up'] };
  const budget = {
    id: 'budget', tab: 'Power budget',
    title: 'One battery, everything at once',
    big: 'Every motor that is running adds its amps to the total, and the more amps you pull, the lower the battery’s voltage sinks.',
    lead: 'All the current comes from one battery, through one <b>20 amp fuse</b>. Every running motor adds its amps to the total. As the total grows, the battery’s voltage <b>sags</b>. Stay above 20 amps too long and the fuse blows.',
    real: 'Pushing a robot while the launcher spins up and the intake jams is our worst case.',
    try: 'Switch on one more thing at a time, up to the worst case.',
    controls: [
      { type: 'seg', id: 'pb_mode', label: 'What is running', value: 'drive', options: [['drive', 'Just driving'], ['intake', '+ intake'], ['launch', '+ launcher'], ['worst', 'Worst case']] },
    ],
    readouts: [['pb_a', 'Total current', 'the fuse allows 20 A'], ['pb_v', 'Battery voltage', 'starts at 12.8 V']],
    more: [
      ['Why does the voltage sag?', 'The battery has a little resistance inside, like a narrow pipe. Pushing more current through it uses up some of the push before it ever leaves the pack. Our pack loses about 0.12 volts for every amp. At 30 amps that is 3.6 volts gone.'],
      ['What is a brownout?', 'If the voltage sinks too low, the Control Hub cannot keep its own computer running properly. It may switch off the motors or restart, and the robot sits dead for a while. The exact voltage depends on the hub. The lesson is the same: do not ask for everything at once.'],
    ],
    build(st, S, ui) {
      const table = box(30, 0.3, 17, mat('#8D9391', { rough: 0.9 }), { r: 0.05, pos: [0, -0.15, -0.5] });
      const batt = group(part('B_wrap', { scale: 0.8 }), part('B_label', { scale: 0.8 }));
      batt.position.set(-10.5, 1.2, 0);
      const fuse = part('B_fuse', { scale: 2.6, pos: [-6.4, 0.7, 0] });
      const fuseGlow = box(1.5, 1.0, 1.0, mat(C.hot, { opacity: 0.5, glow: C.hot, glowPower: 1.4 }), { r: 0.1, pos: [-6.4, 0.7, 0] });
      fuseGlow.userData.noShadow = true;
      const hub = part('HUB', { scale: 1.15, pos: [-1.8, 0.75, 0] });
      const w = mecanumWheel(1.4, 1.0, 1);
      const dm = miniMotor(0.42, 1.0, false);
      dm.g.position.set(5.2, 1.5, -5); w.g.position.set(8.4, 1.5, -5);
      const gk = geckoWheel(1.3, 1.1); gk.g.rotation.y = Math.PI / 2; gk.g.position.set(8.2, 1.4, 0);
      const im = miniMotor(0.42, 1.0, false); im.g.position.set(5.2, 1.4, 0);
      const fw = flywheel(1.6, 1.0); fw.g.rotation.y = Math.PI / 2; fw.g.position.set(8.2, 1.7, 5);
      const lm = miniMotor(0.42, 1.0, false); lm.g.position.set(5.2, 1.7, 5);
      const main = [[-8.6, 0.6, 0], [-7.4, 0.7, 0], [-5.4, 0.7, 0], [-3.4, 0.7, 0]];
      const runs = [[[-0.2, 0.7, -0.6], [1.5, 0.5, -3.5], [3.2, 1.2, -5], [4.3, 1.5, -5]], [[-0.2, 0.7, 0], [2, 0.5, 0], [3.4, 1.2, 0], [4.3, 1.4, 0]], [[-0.2, 0.7, 0.6], [1.5, 0.5, 3.5], [3.2, 1.3, 5], [4.3, 1.7, 5]]];
      const fMain = new Flow(main, 7, { color: C.volt, size: 0.14 }), fl = runs.map((r) => new Flow(r, 7, { color: C.volt, size: 0.12 }));
      const scr = screen(10, 5.4, 800);
      scr.g.position.set(7.5, 6.4, -8.5); scr.g.rotation.x = -0.25;
      st.add(table, batt, fuse, fuseGlow, hub, w.g, dm.g, gk.g, im.g, fw.g, lm.g, tube(main, 0.14, C.red), fMain.object, scr.g, ...runs.map((r) => tube(r, 0.1, C.red)), ...fl.map((f) => f.object));
      st.label('12 V battery', batt, { dy: -46 });
      const lf = st.label('20 A fuse', fuse, { dy: -34 });
      const ls = [st.label('Drive', w.g, { dy: -52 }), st.label('Intake', gk.g, { dy: -50 }), st.label('Launcher', fw.g, { dy: -56 })];
      let hot = 0, blown = false, out = 0, tw = 0, ti = 0, tf = 0, lastKey = '';
      return {
        view: { pos: [-0.5, 21, 29], target: [-0.5, 2.2, -1.6] },
        groundY: -0.3,
        change() { blown = false; hot = 0; out = 0; },
        tick(dt) {
          const [pd, pi, pl] = MODES[S.pb_mode], a = [DRIVE[pd][0], INT[pi][0], LAU[pl][0]], want = 1 + a[0] + a[1] + a[2];
          const total = blown ? 0 : want, V = 12.8 - total * PACK_OHM, k = blown ? 0 : V / 12.8;
          // The fuse warms up above 20 A, faster the further over you go, and cools again below it.
          hot = clamp(hot + (total > FUSE_A ? ((total / FUSE_A) ** 2 - 1) * 0.22 : -0.25) * dt, 0, 1);
          if (hot >= 1) blown = true;
          // A blown fuse is swapped for a new one after a few seconds, so nobody gets stuck.
          if (blown) { out += dt; if (out > 4) { blown = false; hot = 0; out = 0; } }
          fuseGlow.material.opacity = blown ? 0 : hot * 0.75;
          fuseGlow.visible = hot > 0.02 && !blown;
          if (!blown) {
            fMain.advance(dt * (0.04 + total * 0.02));
            fl.forEach((f, i) => { f.object.visible = a[i] > 0; f.advance(dt * (0.04 + a[i] * 0.04)); });
            tw += dt * (pd === 'off' ? 0 : pd === 'push' ? 1.2 : 6) * k;
            ti += dt * (pi === 'on' ? 9 : 0) * k;
            tf += dt * (pl === 'off' ? 0 : pl === 'up' ? 7 : 16) * k;
          }
          fMain.object.visible = !blown;
          if (blown) fl.forEach((f) => { f.object.visible = false; });
          w.spin.rotation.x = tw; gk.spin.rotation.z = ti; fw.spin.rotation.z = tf;
          ls[0].text(`Drive ${blown ? 0 : a[0]} A`); ls[1].text(`Intake ${blown ? 0 : a[1]} A`); ls[2].text(`Launcher ${blown ? 0 : a[2]} A`);
          lf.text(blown ? 'Fuse blown' : hot > 0.05 ? 'Fuse heating up' : '20 A fuse');
          const key = `${total.toFixed(1)}|${blown}|${Math.round(hot * 40)}`;
          if (key !== lastKey) {
            lastKey = key;
            const { ctx, W, H } = scr;
            ctx.fillStyle = '#1D2021'; ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#F4F4F0'; ctx.font = '600 28px Inter, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('Total current', 36, 50);
            const x0 = 36, bw = W - 72, max = 45, X = (v) => x0 + (v / max) * bw;
            ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(x0, 80, bw, 70);
            ctx.fillStyle = total > FUSE_A ? '#D8452B' : '#E8F542'; ctx.fillRect(x0, 80, X(total) - x0, 70);
            ctx.fillStyle = '#F4F4F0'; ctx.fillRect(X(FUSE_A) - 2, 66, 4, 98);
            ctx.font = '500 22px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('fuse: 20 A', X(FUSE_A), 190);
            ctx.textAlign = 'left'; ctx.font = '600 28px Inter, sans-serif'; ctx.fillText('Battery voltage', 36, 250);
            const Xv = (v) => x0 + ((v - 6) / 7) * bw;
            ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(x0, 276, bw, 70);
            ctx.fillStyle = 'rgba(216,69,43,0.45)'; ctx.fillRect(x0, 276, Xv(BROWN) - x0, 70);
            if (!blown) { ctx.fillStyle = V < BROWN ? '#D8452B' : '#E8F542'; ctx.fillRect(x0, 276, Math.max(0, Xv(V) - x0), 70); }
            ctx.fillStyle = '#F4F4F0'; ctx.font = '500 22px Inter, sans-serif';
            ctx.fillText('brownout risk', x0 + 6, 372); ctx.textAlign = 'right'; ctx.fillText(blown ? 'no power' : `${V.toFixed(1)} V`, W - 36, 372); ctx.fillText(`${total.toFixed(1)} A`, W - 36, 190);
            scr.flush();
          }
          ui.out('pb_a', `${total.toFixed(1)} A`, blown ? `it was ${want.toFixed(1)} A` : 'the fuse allows 20 A');
          ui.tone('pb_a', total > FUSE_A ? 'warn' : '');
          ui.out('pb_v', blown ? '0 V' : `${V.toFixed(1)} V`, blown ? 'nothing reaches the hub' : `sagging by ${(total * PACK_OHM).toFixed(1)} V`);
          ui.tone('pb_v', blown || V < BROWN ? 'warn' : '');
          ui.out('pb_f', blown ? 'Blown' : hot > 0.05 ? `Heating: ${Math.round(hot * 100)}%` : 'Cool');
          ui.tone('pb_f', blown || hot > 0.05 ? 'warn' : 'good');
          ui.out('pb_s', `${Math.round(k * 100)}%`);
          ui.note(blown ? `<b>The fuse has blown.</b> ${want.toFixed(0)} amps for too long. The robot is dead until someone fits a new fuse. A new fuse goes in after a few seconds. Pick something lighter before it does.`
            : V < BROWN ? `<b>Brownout risk.</b> ${total.toFixed(0)} amps drags the battery down to ${V.toFixed(1)} V. The hub may reset, and the fuse is heating fast.`
            : total > FUSE_A ? `<b>Over budget.</b> ${total.toFixed(0)} amps is more than the fuse allows. A short burst is fine. Hold it and the fuse will go.`
            : total > 12 ? `<b>A busy robot.</b> ${total.toFixed(0)} amps. The battery has sagged to ${V.toFixed(1)} V, so everything is a bit weaker than it was.`
            : `<b>Plenty to spare.</b> ${total.toFixed(1)} amps, including about 1 amp for the hub, servos and sensors.`, blown || total > FUSE_A ? 'warn' : '');
        },
      };
    },
  };

  // ------------------------------------------------------------ 3. Will it last?
  const match = {
    id: 'match', tab: 'Will it last?',
    title: 'One match is easy. The fourth is not.',
    big: 'A charged battery has enough for several matches, but it gets weaker as it empties, so we start every match with a full one.',
    lead: 'The battery holds <b>3,000 mAh</b>: think of a fuel tank. One match of 2 minutes 30 uses only a slice. But a part-empty battery gives <b>lower voltage</b>, which means a slower robot and shorter shots.',
    real: 'Our pit crew swaps in a freshly charged battery before every match.',
    try: 'Play match after match without charging and watch the voltage.',
    fixed: { pm_a: 10 },
    controls: [
      { id: 'pm_n', label: 'Matches played since the last charge', min: 0, max: 8, step: 1, value: 0 },
    ],
    readouts: [['pm_c', 'Charge left'], ['pm_v', 'Voltage while driving', 'a fresh pack gives about 11.8 V']],
    more: [
      ['So why not play seven matches on one charge?', 'Because the last few would be played on a tired battery. The voltage drops as the tank empties, and near the end it falls off a cliff. Motors get weaker, the launcher throws short, and a big burst of current can cause a brownout.'],
      ['How do I know how full it is?', 'The Driver Hub shows the robot’s battery voltage. Rested, a full pack reads about 13 volts or more and a nearly empty one about 12. Check it before you queue for a match.'],
    ],
    build(st, S, ui) {
      const floor = box(26, 0.2, 9, mat('#8D9391', { rough: 0.9 }), { r: 0.04, pos: [0, -0.1, 0] });
      const lines = Array.from({ length: 10 }, () => { const l = box(0.06, 0.02, 9, mat('#767C7A', { rough: 0.9 }), { r: 0 }); l.userData.noShadow = true; st.add(l); return l; });
      const bot = miniBot({ k: 1, top: true });
      bot.g.rotation.y = -Math.PI / 2; bot.g.position.set(3, 0, 1.2); bot.nose.visible = false;
      // A fuel gauge: a glass tube beside the battery with the charge shown as a glowing column.
      const batt = group(part('B_wrap', { scale: 0.62 }), part('B_label', { scale: 0.62 }));
      batt.position.set(-8.2, 1.0, 1.5);
      const glass = cyl(0.62, 5.2, mat('#D9DDDC', { opacity: 0.28, rough: 0.1 }), { seg: 28, pos: [-4.4, 2.7, 1.5] });
      const juiceM = mat(C.volt, { glow: true, glowPower: 0.5 });
      const juice = cyl(0.5, 1, juiceM, { seg: 24 });
      const base = cyl(0.8, 0.2, C.dark, { seg: 28, pos: [-4.4, 0.1, 1.5] });
      const scr = screen(11, 5.6, 840);
      scr.g.position.set(4.5, 7.4, -4.2); scr.g.rotation.x = -0.12;
      st.add(floor, bot.g, batt, glass, juice, base, scr.g);
      const lc = st.label('100%', glass, { off: new THREE.Vector3(0, 3.2, 0), tone: 'volt' });
      const lb = st.label('Robot', bot.g, { off: new THREE.Vector3(0, 2.3, 0) });
      let scroll = 0, lastKey = '';
      const state = (n, a) => { const soc = clamp(1 - (n * a * MATCH_S) / 3600 / TANK_AH, 0, 1); return { soc, v: rest(soc) - a * PACK_OHM }; };
      return {
        view: { pos: [-0.5, 9.5, 28], target: [-0.5, 3.6, 0] },
        groundY: -0.2,
        tick(dt) {
          const n = S.pm_n, a = S.pm_a, use = (a * MATCH_S) / 3600 / TANK_AH, { soc, v } = state(n, a), full = state(0, a).v;
          const k = clamp(v / full, 0, 1), dead = soc <= 0.03;
          const h = 0.05 + soc * 5;
          juice.scale.y = lerp(juice.scale.y, h, 0.2); juice.position.set(-4.4, 0.2 + juice.scale.y / 2, 1.5);
          juiceM.color.set(soc < 0.2 ? C.red : soc < 0.45 ? C.orange : C.volt); juiceM.emissive.copy(juiceM.color);
          const sp = dead ? 0 : 3.4 * k * k;
          scroll = (scroll + sp * dt) % 2.6;
          lines.forEach((l, i) => l.position.set(12 - i * 2.6 - scroll, 0.012, 0));
          for (const w of bot.wheels) w.spin.rotation.x -= (sp / bot.R) * dt;
          lc.text(`${Math.round(soc * 100)}% left`);
          lb.text(dead ? 'Dead on the field' : `${Math.round(k * 100)}% strength`);
          const key = `${n}|${a}`;
          if (key !== lastKey) {
            lastKey = key;
            const g = graph(scr, { title: 'Voltage while driving, match after match', x0: 0, x1: 8, y0: 9, y1: 13, xl: 'matches played since the last charge', yl: 'volts' });
            g.grid([0, 1, 2, 3, 4, 5, 6, 7, 8], [9, 10, 11, 12, 13]);
            g.line(Array.from({ length: 81 }, (_, i) => [i / 10, state(i / 10, a).v]), C.volt, 5);
            g.dot(n, v, soc < 0.2 ? C.red : C.volt, 12);
            scr.flush();
          }
          ui.out('pm_u', `${Math.round(use * 100)}%`, `${(use * TANK_AH).toFixed(2)} of 3.0 amp-hours`);
          ui.out('pm_c', `${Math.round(soc * 100)}%`);
          ui.tone('pm_c', soc < 0.2 ? 'warn' : soc > 0.6 ? 'good' : '');
          ui.out('pm_v', `${v.toFixed(1)} V`, `a fresh pack gives ${full.toFixed(1)} V`);
          ui.out('pm_s', dead ? 'Dead' : `${Math.round(k * 100)}%`);
          ui.tone('pm_s', k < 0.93 ? 'warn' : 'good');
          ui.note(dead ? '<b>Flat.</b> The battery ran out during a match. That also damages the cells.' : soc < 0.2 ? `<b>Nearly empty.</b> Only ${Math.round(soc * 100)}% left. The voltage is about to fall off a cliff, and a burst of current could reset the hub.` : n === 0 ? `<b>Fresh battery.</b> This match will use about ${Math.round(use * 100)}% of it. Full voltage, full speed, shots land where they were tuned.` : `<b>${n} match${n > 1 ? 'es' : ''} without charging.</b> There is ${Math.round(soc * 100)}% left, but the robot is down to ${Math.round(k * 100)}% strength. Shots tuned on a fresh battery now land short.`, soc < 0.2 ? 'warn' : n === 0 ? 'good' : '');
        },
      };
    },
  };

  return { title: 'Power budget', chapters: [one, budget, match] };
}
