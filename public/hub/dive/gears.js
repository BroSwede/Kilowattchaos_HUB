// How it works: gears. Trading speed for turning force, why a planetary gearbox is so small,
// and why our drive motors are geared 19.2 to 1. Motor numbers match the Motor deep dive.
import { THREE, C, mat, metal, plastic, mesh, cyl, box, group, gearGeo, clamp, lerp, TAU } from './kit.js';
import { miniBot } from './works.js';
import { miniMotor, gearbox } from './motor.js';

const FREE_RPM = 6000, STALL_A = 9.2, IDLE_A = 0.25, STALL_NM = 0.15; // the bare motor at 12 V
const WHEEL = 0.104, ROBOT_KG = 10, GRIP = 0.8;                       // wheel diameter (m); robot mass and tyre grip are estimates
const kill = (o) => { o.traverse((m) => { if (m.isMesh) m.geometry.dispose(); }); o.removeFromParent(); };

export default function gears() {
  // ------------------------------------------------------------ 1. Small drives big
  const ratio = {
    id: 'ratio', tab: 'Speed or muscle',
    title: 'A small gear driving a big one',
    big: 'Gears trade speed for turning force: slow the output down 3 times and it pushes 3 times harder.',
    lead: 'When a small gear drives a big gear, the big one turns <b>slower</b>, because the small gear has to go round several times to move all of the big gear’s teeth. But the big gear turns with more <b>turning force</b>, which engineers call <b>torque</b>. Count the teeth and divide: that number is the <b>gear ratio</b>.',
    real: 'Our intake does the opposite on purpose: a <b>100-tooth</b> gear drives a <b>20-tooth</b> gear, so the intake shaft spins 5 times faster than its motor, with one fifth of the force.',
    try: 'Make the driven gear bigger and watch the load it can lift, and how slowly it lifts it.',
    controls: [
      { id: 'gr_a', label: 'Teeth on the motor’s gear', min: 10, max: 40, step: 2, value: 20 },
      { id: 'gr_b', label: 'Teeth on the driven gear', min: 10, max: 100, step: 2, value: 60 },
      { type: 'knob', id: 'gr_rpm', label: 'Motor speed', min: 30, max: 312, step: 6, value: 120, unit: ' rpm' },
    ],
    readouts: [['gr_r', 'Gear ratio', 'driven teeth ÷ motor teeth'], ['gr_o', 'Output speed', 'motor speed ÷ ratio'], ['gr_t', 'Turning force', 'compared with the motor'], ['gr_w', 'Can lift', 'blocks on the rope']],
    more: [
      ['Show me the math', '60 teeth ÷ 20 teeth = <b>3</b>. The small gear must turn 3 times to push all 60 teeth of the big gear past. So 120 rpm in gives 120 ÷ 3 = <b>40 rpm</b> out, with <b>3 times</b> the turning force.'],
      ['Why is nothing free?', 'Power is speed times force. Gears cannot add power, they only swap one for the other. A little is even lost to rubbing teeth, so you always get slightly less out than you put in.'],
      ['Which way does the big gear turn?', 'The opposite way. Two gears that touch always turn in opposite directions. Put a third gear in between and the last one turns the same way as the first.'],
      ['What is torque?', 'Turning force. Think of a spanner on a nut: push harder, or use a longer spanner, and you get more torque. A motor’s torque is what lets a wheel shove the robot forward.'],
    ],
    build(st, S, ui) {
      const M = 0.1, Y = 4.5;
      const floor = box(24, 0.3, 8, mat('#8D9391', { rough: 0.9 }), { r: 0.05, pos: [3, -3.15, -0.5] });
      const plate = box(18, 12.5, 0.3, metal(C.alu, 0.42), { r: 0.08, pos: [3, 3.2, -1.1] });
      const mm = miniMotor(0.45, 1.0, true);
      mm.g.rotation.y = -Math.PI / 2;
      const drum = group(cyl(0.55, 0.9, plastic(C.orange, 0.4), { axis: 'z', seg: 28 }), cyl(0.8, 0.08, C.dark, { axis: 'z', seg: 28, pos: [0, 0, 0.45] }), cyl(0.8, 0.08, C.dark, { axis: 'z', seg: 28, pos: [0, 0, -0.45] }), box(0.5, 0.1, 0.95, C.white, { r: 0, pos: [0.3, 0, 0] }));
      const rope = cyl(0.045, 1, mat('#E9E1D0', { rough: 0.9 }), { seg: 8 });
      const stack = group();
      const blocks = Array.from({ length: 10 }, (_, i) => { const b = box(1.5, 0.52, 1.5, plastic(i % 2 ? C.volt : '#3A3F41', 0.5), { r: 0.06, pos: [0, 0.3 + i * 0.56, 0] }); stack.add(b); return b; });
      st.add(floor, plate, mm.g, drum, rope, stack);
      let gA = null, gB = null, key = '', th = 0, lift = 0;
      const la = st.label('Motor gear', mm.g, { off: new THREE.Vector3(0, 0, 2.2), dy: -40, tone: 'volt' }), lb = st.label('Driven gear', drum, { dy: -60 });
      const lw = st.label('Load', stack, { off: new THREE.Vector3(1.6, 0.6, 0) });
      return {
        view: { pos: [4, 4, 27], target: [3.4, 2.2, 0] },
        groundY: -3.3,
        tick(dt) {
          const a = S.gr_a, b = S.gr_b, rpm = S.gr_rpm, r = b / a, rA = (a * M) / 2, rB = (b * M) / 2;
          if (key !== `${a}|${b}`) {
            key = `${a}|${b}`;
            if (gA) { kill(gA); kill(gB); }
            gA = mesh(gearGeo({ teeth: a, pitchR: rA, m: M, width: 0.5, bore: 0.14, hex: true }), metal(C.volt, 0.4));
            gB = mesh(gearGeo({ teeth: b, pitchR: rB, m: M, width: 0.5, bore: 0.14, hex: true }), metal('#C3C8CA', 0.32));
            gA.material.metalness = 0.4;
            gA.position.set(-rA, Y, 0); gB.position.set(rB, Y, 0);
            st.add(gA, gB);
            mm.g.position.set(-rA, Y, -3.4);
            drum.position.set(rB, Y, 0.75);
          }
          th += (rpm / 60) * TAU * dt * 0.25;
          gA.rotation.z = th;
          gB.rotation.z = Math.PI / b - (th * a) / b;
          drum.rotation.z = gB.rotation.z;
          // The rope winds onto the drum: slower output, slower lift. More ratio, more blocks.
          const n = clamp(Math.round(r * 2), 1, 10), top = Y - 1.6 - n * 0.56;
          lift += ((rpm / 60 / r) * 0.25 * TAU * 0.55 * dt);
          if (lift > top + 2.9) lift = 0;
          blocks.forEach((bl, i) => { bl.visible = i < n; });
          const x = rB + 0.55, y0 = -3 + lift, yTop = y0 + n * 0.56 + 0.04;
          stack.position.set(x, y0, 0.75);
          rope.scale.y = Math.max(0.01, Y - yTop); rope.position.set(x, (Y + yTop) / 2, 0.75);
          la.text(`${a} teeth`); lb.text(`${b} teeth`); lw.text(`${n} block${n > 1 ? 's' : ''}`);
          const txt = r >= 1 ? `${+r.toFixed(2)} to 1` : `1 to ${+(1 / r).toFixed(2)}`;
          ui.hud(`<span class="chip">Shown <b>4×</b> slower than real life</span>`);
          ui.out('gr_r', txt, `${b} ÷ ${a}`);
          ui.out('gr_o', `${Math.round(rpm / r)} rpm`, `${rpm} ÷ ${+r.toFixed(2)}`);
          ui.out('gr_t', `× ${+r.toFixed(2)}`);
          ui.out('gr_w', String(n));
          ui.note(r > 1.05 ? `<b>Geared down.</b> The output is ${+r.toFixed(1)} times slower and ${+r.toFixed(1)} times stronger. Good for lifting and pushing.` : r < 0.95 ? `<b>Geared up.</b> The output is ${+(1 / r).toFixed(1)} times faster but that much weaker. Good for an intake or a flywheel.` : '<b>Same size, same speed.</b> Nothing is traded. The output just turns the other way.');
        },
        dispose() { if (gA) { kill(gA); kill(gB); } },
      };
    },
  };

  // ------------------------------------------------------------ 2. Spur or planetary
  const planet = {
    id: 'planet', tab: 'Inside the gearbox',
    title: 'Same ratio, a third of the size',
    big: 'A planetary gearbox gets a big ratio in a small space by stacking small stages and sharing the load between three gears.',
    lead: 'Two plain gears side by side are called <b>spur gears</b>. To slow a motor 19 times with just two of them, one gear would need 19 times more teeth than the other. It would be wider than your hand. A <b>planetary</b> gearbox does the same job inside the motor’s own tube: a small centre gear turns three <b>planet gears</b> that walk around inside a toothed ring.',
    real: 'Each of our drive motors has <b>two planetary stages</b> stacked up: one slows it 3.7 times, the next 5.2 times. 3.7 × 5.2 = <b>19.2</b>.',
    try: 'Switch between one stage and both. Compare how big the plain gear on the right has to be.',
    controls: [
      { type: 'seg', id: 'gp_st', label: 'Planetary stages', value: 'both', options: [['a', 'One stage: 3.7'], ['b', 'One stage: 5.2'], ['both', 'Both: 19.2 (ours)']] },
      { type: 'knob', id: 'gp_rpm', label: 'Motor speed', min: 600, max: 6000, step: 100, value: 6000, unit: ' rpm' },
    ],
    readouts: [['gp_r', 'Ratio'], ['gp_o', 'Output speed', 'both gearboxes'], ['gp_p', 'Planetary is', 'across'], ['gp_s', 'Plain gears are', 'across']],
    more: [
      ['Where do 3.7 and 5.2 come from?', 'Count teeth. The ring has 46. With a 17-tooth centre gear, one stage slows things by 1 + 46 ÷ 17 = <b>3.7</b>. With an 11-tooth centre gear it is 1 + 46 ÷ 11 = <b>5.2</b>.'],
      ['Why does stacking multiply?', 'The slow output of the first stage is the input of the second. Slow something 3.7 times, then slow that 5.2 times, and you have slowed it 3.7 × 5.2 = 19.2 times in total.'],
      ['Why three planets?', 'They share the push, so each tooth carries a third of the load and the teeth can be small. Two plain gears only ever touch at one tooth.'],
      ['So are plain gears bad?', 'No. They are simple, cheap and easy to see and fix, which is why our intake uses a 100-tooth and a 20-tooth gear out in the open. They are just a poor fit for big ratios in small spaces.'],
    ],
    build(st, S, ui) {
      const M = 0.1, MM = 6; // one scene unit is about 6 mm
      const floor = box(40, 0.3, 12, mat('#8D9391', { rough: 0.9 }), { r: 0.05, pos: [6, -10.2, -1] });
      st.add(floor);
      let box0 = null, pin = null, bigG = null, key = '', th = 0, markP = null, markS = null;
      const lp = st.label('Planetary', new THREE.Vector3(-8.5, 4.4, 1.5), { tone: 'volt' }), ls = st.label('Two plain gears', new THREE.Vector3(1, 4.2, 0));
      return {
        view: { pos: [-7, 6, 47], target: [4.5, 0.4, 0] },
        groundY: -10.3,
        tick(dt) {
          const sel = S.gp_st, suns = sel === 'a' ? [17] : sel === 'b' ? [11] : [17, 11], rpm = S.gp_rpm;
          const r = suns.reduce((k, s) => k * (1 + 46 / s), 1), big = Math.round(r * 10);
          if (key !== sel) {
            key = sel;
            for (const o of [box0 && box0.g, pin, bigG]) if (o) kill(o);
            box0 = gearbox(suns, M, 0.55, 2.4);
            box0.g.position.set(-8.5, 0, 1.5);
            box0.g.rotation.y = Math.PI - 0.75; // turned so you look in from the motor side and see the planets
            markP = group(cyl(0.22, 1.6, metal(C.steel, 0.3), { axis: 'z', seg: 6, pos: [0, 0, 1.3] }), box(1.9, 0.2, 0.12, C.white, { r: 0, pos: [0.95, 0, 2.0] }));
            box0.stages[box0.stages.length - 1].carrier.add(markP);
            const R = (big * M) / 2;
            pin = mesh(gearGeo({ teeth: 10, pitchR: 0.5, m: M, width: 0.55, bore: 0.15, hex: true }), metal(C.volt, 0.4));
            pin.material.metalness = 0.4;
            pin.position.set(0, 0, 0);
            bigG = mesh(gearGeo({ teeth: big, pitchR: R, m: M, width: 0.55, bore: 0.2, hex: true }), metal('#C3C8CA', 0.32));
            bigG.position.set(0.5 + R, 0, 0);
            markS = box(R * 0.5, 0.16, 0.1, C.white, { r: 0, pos: [R * 0.6, 0, 0.3] });
            bigG.add(markS);
            st.add(box0.g, pin, bigG);
          }
          th += (rpm / FREE_RPM) * 9 * dt;
          const out = box0.update(th);
          pin.rotation.z = th;
          bigG.rotation.z = (big % 2 ? 0 : Math.PI / big) - th * (10 / big);
          void out;
          const across = (big * M + 1.0 + 0.3) * MM;
          lp.text(`Planetary: ${suns.length} stage${suns.length > 1 ? 's' : ''}`);
          ls.text(`Plain gears: 10 and ${big} teeth`);
          ui.hud('<span class="chip">Slowed right down so you can see the teeth</span><span class="chip">The white stripes turn at the same speed</span>');
          ui.out('gp_r', `${r.toFixed(1)} to 1`, suns.map((s) => (1 + 46 / s).toFixed(1)).join(' × '));
          ui.out('gp_o', `${Math.round(rpm / r)} rpm`, `${rpm} ÷ ${r.toFixed(1)}`);
          ui.out('gp_p', '38 mm', `and ${suns.length > 1 ? 'two stages' : 'one stage'} long`);
          ui.out('gp_s', `${Math.round(across)} mm`);
          ui.tone('gp_s', across > 60 ? 'warn' : '');
          ui.note(sel === 'both' ? `<b>19.2 to 1.</b> The planetary gearbox is still 38 mm across, just a little longer. Two plain gears would need about ${Math.round(across)} mm. That would not fit beside a wheel.` : `<b>One stage.</b> A small ratio is easy either way. Now pick both stages and watch the plain gear grow.`);
        },
        dispose() { for (const o of [box0 && box0.g, pin, bigG]) if (o) kill(o); },
      };
    },
  };

  // ------------------------------------------------------------ 3. Why 19.2 to 1
  const RATIOS = ['3.7', '5.2', '13.7', '19.2', '26.9', '50.9'];
  const drive = {
    id: 'drive', tab: 'Why 19.2 to 1?',
    title: 'Picking the gearing for a drivetrain',
    big: 'The best drive gearing is fast enough to cross the field, and strong enough that the tyres slip before the motors give up.',
    lead: 'The same motor comes with different gearboxes. A <b>low ratio</b> is fast but weak: load it and it slows right down, or stops. A <b>high ratio</b> is strong but slow. A robot can also only push as hard as its tyres <b>grip</b>. Past that point the wheels just spin, so more gearing buys nothing except a slower robot.',
    real: 'Our four drive motors are <b>19.2 to 1</b>, 312 rpm, on 104 mm wheels: about 1.7 metres a second. At that ratio the wheels slip before the motors stall, which is the safe way round.',
    try: 'Pick a low ratio and make the box heavy until the motors stall. Then try ours.',
    controls: [
      { type: 'seg', id: 'gd_r', label: 'Gearbox ratio', value: '19.2', options: RATIOS.map((r) => [r, r === '19.2' ? '19.2 (ours)' : r]) },
      { id: 'gd_box', label: 'Box to push', min: 0, max: 30, step: 1, value: 8, unit: ' kg' },
    ],
    readouts: [['gd_v', 'Top speed', 'with nothing to push'], ['gd_f', 'Motors can push', 'all four, just before they stall'], ['gd_g', 'Tyres can push', 'before they slip'], ['gd_n', 'With this box']],
    more: [
      ['Show me the math for top speed', 'The bare motor spins 6,000 rpm. Divide by 19.2 and the wheel turns 312 rpm, which is 5.2 turns a second. One turn of a 104 mm wheel is 327 mm. 5.2 × 327 mm = <b>1.7 m/s</b>.'],
      ['What is a stall, and why is it bad?', 'The motor is pushing as hard as it can and not turning. It pulls its biggest current, about 9 amps each, and all of that energy turns into heat. Four stalled drive motors can blow the 20 amp fuse or cook themselves.'],
      ['Why is slipping the “safe” limit?', 'When the tyres slip, the motors are still turning, so the current stays lower and nothing overheats. A drivetrain geared so that grip runs out first protects itself.'],
      ['Is 19.2 the only good answer?', 'No. Some teams pick 13.7 to 1 for more speed and accept higher current and twitchier driving. These numbers assume a robot of about 10 kg and fairly grippy wheels, which are estimates. Mecanum wheels grip less than plain ones.'],
    ],
    build(st, S, ui) {
      const floor = box(26, 0.2, 8, mat('#8D9391', { rough: 0.9 }), { r: 0.04, pos: [2, -0.1, 0] });
      const lines = Array.from({ length: 9 }, () => { const l = box(0.06, 0.02, 8, mat('#767C7A', { rough: 0.9 }), { r: 0 }); l.userData.noShadow = true; st.add(l); return l; });
      const bot = miniBot({ k: 1, top: true });
      bot.g.rotation.y = -Math.PI / 2;
      bot.nose.visible = false;
      const crate = group(box(1, 1, 1, plastic('#B98A4E', 0.7, 0.1), { r: 0.04 }), box(1.02, 0.14, 1.02, mat('#8A6336', { rough: 0.8 }), { r: 0.02, pos: [0, 0.3, 0] }), box(1.02, 0.14, 1.02, mat('#8A6336', { rough: 0.8 }), { r: 0.02, pos: [0, -0.3, 0] }));
      st.add(floor, bot.g, crate);
      const bars = [C.volt, C.orange, C.teal].map((c, i) => { const b = box(0.5, 1, 0.5, mat(c, { glow: true, glowPower: 0.25 }), { r: 0.05 }); st.add(b, box(0.7, 0.1, 0.7, C.dark, { r: 0.03, pos: [-6.5 + i * 1.3, 0.05, 2.6] })); return b; });
      const lbl = ['Speed', 'Motors', 'Grip'].map((t, i) => st.label(t, bars[i], { dy: -30, tone: i === 0 ? 'volt' : '' }));
      const ls = st.label('', bot.g, { off: new THREE.Vector3(0, 2.2, 0), tone: 'warn' });
      const lc = st.label('Box', crate, { dy: -50 });
      let scroll = 0, shake = 0;
      return {
        view: { pos: [3, 6, 15.5], target: [0.2, 0.9, 0] },
        groundY: -0.2,
        tick(dt) {
          const r = +S.gd_r, kg = S.gd_box;
          const vFree = (Math.PI * WHEEL * (FREE_RPM / r)) / 60, fStall = (4 * STALL_NM * r * 0.83) / (WHEEL / 2), grip = ROBOT_KG * 9.81 * GRIP;
          const need = kg ? 0.5 * kg * 9.81 + 3 : 3;
          const stall = need >= fStall && fStall <= grip, slip = need > grip && !stall;
          const v = stall || slip ? 0 : vFree * (1 - need / fStall);
          const amps = stall ? STALL_A : IDLE_A + (STALL_A - IDLE_A) * clamp(Math.min(need, grip) / fStall, 0, 1);
          const k = 0.45 + kg * 0.035;
          crate.scale.setScalar(k);
          crate.visible = kg > 0;
          shake += dt;
          const jig = stall ? Math.sin(shake * 55) * 0.012 : 0;
          bot.g.position.x = -1.2 + jig;
          crate.position.set(-1.2 + bot.L / 2 + 0.25 + k / 2 + jig, k / 2, 0);
          const shown = v * 1.6;
          scroll = (scroll + shown * dt) % 2.6;
          lines.forEach((l, i) => l.position.set(13 - i * 2.6 - scroll, 0.012, 0));
          const spin = slip ? vFree * 1.6 * 0.8 : shown;
          for (const w of bot.wheels) w.spin.rotation.x -= (spin / bot.R) * dt;
          const hs = [0.15 + Math.min(vFree, 9) * 0.5, 0.15 + Math.min(fStall, 500) / 70, 0.15 + grip / 70];
          bars.forEach((b, i) => { b.scale.y = lerp(b.scale.y, hs[i], 0.2); b.position.set(-6.5 + i * 1.3, 0.1 + b.scale.y / 2, 2.6); });
          lbl[0].text(`${vFree.toFixed(1)} m/s`); lbl[1].text(`${Math.round(fStall)} N`); lbl[2].text(`${Math.round(grip)} N`);
          ls.show(stall || slip); ls.text(stall ? 'Motors stalled' : 'Wheels slipping');
          lc.text(`${kg} kg box needs ${Math.round(need)} N`); lc.show(kg > 0);
          ui.out('gd_v', `${vFree.toFixed(1)} m/s`, `${Math.floor(FREE_RPM / r)} rpm at the wheel`);
          ui.out('gd_f', `${Math.round(fStall)} N`, `about ${Math.round(fStall / 9.81)} kg of shove`);
          ui.out('gd_g', `${Math.round(grip)} N`, 'about a 10 kg robot');
          ui.out('gd_n', stall ? 'Stalled' : slip ? 'Wheels spin' : `${v.toFixed(2)} m/s`, `${amps.toFixed(1)} A in each motor`);
          ui.tone('gd_n', stall ? 'warn' : slip ? '' : 'good');
          ui.tone('gd_f', fStall < grip ? 'warn' : '');
          ui.note(stall ? `<b>Stalled.</b> The box needs ${Math.round(need)} N but the motors can only give ${Math.round(fStall)} N at this ratio. Each one is pulling ${STALL_A} amps and turning it all into heat.`
            : slip ? `<b>Wheels spinning.</b> The motors could push ${Math.round(fStall)} N, but the tyres only grip ${Math.round(grip)} N. No gearbox can fix that. Nothing overheats, though.`
            : r === 19.2 ? `<b>Our gearing.</b> ${vFree.toFixed(1)} m/s flat out, and the motors (${Math.round(fStall)} N) are stronger than the grip (${Math.round(grip)} N), so the wheels slip before a motor ever stalls.`
            : fStall < grip ? `<b>Fast but weak.</b> ${vFree.toFixed(1)} m/s with no load, but the motors run out of push at ${Math.round(fStall)} N, long before the tyres slip. A heavy box will stall them.`
            : r > 19.2 ? `<b>Strong but slow.</b> The extra push is wasted, because the tyres slip at ${Math.round(grip)} N anyway. All you really get is a top speed of ${vFree.toFixed(1)} m/s.`
            : `<b>A sporty choice.</b> Faster than ours, and still stronger than the grip. The price is more current and a twitchier robot.`, stall ? 'warn' : '');
        },
      };
    },
  };

  return { title: 'Gears', chapters: [ratio, planet, drive] };
}
