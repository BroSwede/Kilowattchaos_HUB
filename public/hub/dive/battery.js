// Battery deep dive: what is inside the 12 V pack, how one cell pushes electrons,
// how wiring cells in rows changes volts, amps and watts, how packs are built, and what it feeds.
import { miniMotor } from './motor.js';
import { THREE, C, mat, metal, plastic, mesh, cyl, box, ball, bench, plateGeo, group, tube, curveOf, Flow, fade, part, ghost, clamp, lerp, smooth, span, TAU } from './kit.js';

const CELL_V = 1.2, CELL_AH = 3.0, CELL_OHM = 0.012;
const WRAP = '#2B8A57';

// One round cell lying along Z with its + button toward +Z (the Blender-modelled cell, resized).
function cell(r = 0.55, len = 2.1) {
  return part('B_cell', { axis: 'z', scale: [r / 0.55, len / 2.1, r / 0.55] });
}
// The real pack is two rows of five cells, nested like oranges in a crate. Top row sits a quarter step left.
const PITCH = 1.125, ROW = 0.974;
const nest = (k) => { const j = k < 5 ? k : 9 - k; return new THREE.Vector3((j - 2) * PITCH + (k < 5 ? -1 : 1) * PITCH / 4, (k < 5 ? 1 : -1) * ROW / 2, 0); };
const nickel = () => metal('#DADCD6', 0.28);
// A welded nickel strip lying in XY, reaching `len` between two cell ends.
function strip(len) {
  const g = group(box(len + 0.46, 0.4, 0.035, nickel(), { r: 0.015 }));
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) g.add(cyl(0.035, 0.04, '#6B6F6C', { axis: 'z', seg: 10, pos: [sx * len / 2 + sy * 0.07, sy * 0.07, 0] }));
  return g;
}

// A spiral band (the rolled-up layers inside a cell), flat in XY and `h` tall along Z.
function spiralGeo(r0, r1, turns, thick, h, phase = 0) {
  const n = Math.ceil(turns * 40), outer = [], inner = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n, a = phase + k * turns * TAU, r = lerp(r0, r1, k);
    outer.push(new THREE.Vector2(Math.cos(a) * (r + thick / 2), Math.sin(a) * (r + thick / 2)));
    inner.push(new THREE.Vector2(Math.cos(a) * (r - thick / 2), Math.sin(a) * (r - thick / 2)));
  }
  const s = new THREE.Shape([...outer, ...inner.reverse()]);
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 4 });
  g.translate(0, 0, -h / 2);
  return g;
}

export default function battery(ctx) {
  // ------------------------------------------------------------ 1. Open it up
  const openUp = {
    id: 'open', tab: 'Open it up',
    title: 'Ten little batteries in a trench coat',
    lead: 'The robot’s 12 V battery is not one battery. Slide to peel off the shrink wrap and you find <b>10 round cells</b> in two nested rows, each about the size of a fat marker cap, welded together in one long chain.',
    try: 'Drag the pink wrap upward on the model, or use the slider.',
    controls: [{ type: 'range', id: 'peel', label: 'Peel it open', min: 0, max: 100, value: 0, unit: '%' }],
    readouts: [['cells', 'Cells in the chain'], ['each', 'Each cell', 'nickel-metal hydride'], ['pack', 'Whole pack', '10 × 1.2 V']],
    more: [
      ['Why 10 cells?', 'One nickel-metal hydride (NiMH) cell makes about 1.2 volts no matter how big it is. That number comes from the chemicals inside, not the size. To get 12 volts you chain 10 of them so their pushes add up: 10 × 1.2 = 12.'],
      ['What are the shiny strips?', 'Thin strips of nickel. A machine spot-welds them to the cell ends with a tiny, very fast burst of electricity. Solder would work too, but the heat from soldering can hurt a cell. A spot weld is over in a few thousandths of a second.'],
      ['What does the fuse do?', 'The fuse is a deliberately weak link. If more than 20 amps flows for too long (a shorted wire, a jammed mechanism), a thin piece of metal inside the fuse melts and breaks the circuit before the wires get hot enough to burn.'],
      ['Why does it get its own plug shape?', 'The yellow XT30 plug only fits one way round. You cannot plug the battery in backwards, which would send current the wrong way through the Control Hub.'],
    ],
    build(st, S, ui) {
      const L = 2.1;
      const pack = group();
      const cells = [], strips = [];
      // Chain order: top row left to right, then bottom row right to left. Every second cell is flipped.
      for (let k = 0; k < 10; k++) {
        const c = cell();
        if (k % 2 === 1) c.rotation.y = Math.PI;
        c.userData.home = nest(k);
        cells.push(c);
        pack.add(c);
      }
      for (let k = 0; k < 9; k++) {
        const s = strip(PITCH);
        s.userData = { a: k, b: k + 1, z: k % 2 === 0 ? L / 2 + 0.085 : -(L / 2 + 0.03) };
        strips.push(s);
        pack.add(s);
      }
      // Leads leave from the back: black from cell 1's minus, red (through the fuse) from cell 10's plus.
      const zb = -(L / 2 + 0.06), h0 = nest(0), h9 = nest(9), zp = zb - 3.5;
      const black = tube([[h0.x, h0.y, zb], [h0.x + 0.1, h0.y + 0.25, zb - 0.8], [-0.9, 0.35, zb - 2.0], [-0.21, 0, zp + 0.6]], 0.085, plastic(C.black, 0.5));
      const red = tube([[h9.x, h9.y, zb], [h9.x + 0.2, h9.y - 0.3, zb - 0.8], [0.7, -0.5, zb - 1.7], [0.21, 0, zp + 0.6]], 0.085, plastic(C.red, 0.5));
      const fuse = part('B_fuse', { scale: 1.5, pos: [0.62, -0.5, zb - 1.55] });
      fuse.rotation.set(0.2, 0.5, 0);
      const plug = part('B_xt30', { scale: 1.3, pos: [0, 0, zp] });
      plug.rotation.x = -Math.PI / 2;
      const leads = group(black, red, fuse, plug);
      const skin = group(part('B_wrap', { axis: 'z' }), part('B_label', { axis: 'z' }));
      const handle = ghost(6.6, 2.6, 2.9);
      st.add(pack, leads, skin, handle);

      const real = ctx.fitReal(ctx.real(), 6.24);
      if (real) {
        // Turn the CAD part so its rows lean the same way as the cells inside.
        real.updateMatrixWorld(true);
        const v = new THREE.Vector3(); let top = 0, bot = 0, nt = 0, nb = 0;
        real.traverse((o) => {
          if (!o.isMesh) return;
          const pos = o.geometry.attributes.position, step = Math.max(1, Math.floor(pos.count / 3000));
          for (let i = 0; i < pos.count; i += step) { v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); if (v.y > 0.3) { top += v.x; nt++; } else if (v.y < -0.3) { bot += v.x; nb++; } }
        });
        if (nt && nb && top / nt > bot / nb) real.rotation.y = Math.PI;
        st.add(real);
      }

      const lbl = {
        cell: st.label('One cell: 1.2 V', cells[2], { off: new THREE.Vector3(0, 0.75, 0), tip: 'Each steel can is a complete little battery. Nickel-metal hydride chemistry always gives about <b>1.2 volts</b>, however big the can is.' }),
        strip: st.label('Nickel strip', strips[2], { tip: 'Spot welded to the cell ends by a burst of current lasting a few thousandths of a second. It carries power from one cell to the next.' }),
        fuse: st.label('20 A fuse', fuse, { dy: 22, tip: 'A deliberately weak link. Too many amps for too long and the thin metal inside melts, before the wires can overheat.' }),
        plug: st.label('XT30 plug', plug, { dy: 26, tip: 'Shaped so it only fits one way. You cannot plug the battery in backwards.' }),
        flip: st.label('Every second cell is flipped', cells[7], { off: new THREE.Vector3(0, -0.8, L / 2), dy: 8, tip: 'Flipping puts the plus end of one cell next to the minus end of its neighbour, so a short strip can join them into one long chain.' }),
        real: st.label('The real part, from the robot’s CAD', new THREE.Vector3(0, 1.9, 0), { tone: 'volt' }),
      };

      const at = new THREE.Vector3();
      function apply() {
        const k = S.peel / 100;
        const off = smooth(span(k, 0.0, 0.3)), spread = smooth(span(k, 0.3, 0.75)), lift = smooth(span(k, 0.55, 1));
        const swap = real ? smooth(span(k, 0.02, 0.1)) : 1; // the real CAD part hands over to the cutaway model
        if (real) fade(real, 1 - swap);
        fade(skin, swap * (1 - off));
        skin.position.y = off * 3.4;
        handle.position.y = off * 3.4;
        for (const c of cells) c.position.copy(c.userData.home).multiply(at.set(1 + spread * 0.38, 1 + spread * 0.75, 1));
        for (const s of strips) {
          const a = cells[s.userData.a].position, b = cells[s.userData.b].position;
          s.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, s.userData.z * (1 + lift * 0.5));
          s.rotation.z = Math.atan2(b.y - a.y, b.x - a.x);
          s.scale.x = lerp(a.distanceTo(b) / PITCH, 1, lift);
        }
        leads.position.z = -lift * 0.6;
        fade(leads, swap);
        fade(pack, swap);
        lbl.real.show(!!real && k < 0.02);
        lbl.cell.show(k > 0.45);
        lbl.strip.show(k > 0.7);
        lbl.flip.show(k > 0.85);
        lbl.fuse.show(k > 0.3);
        lbl.plug.show(k > 0.3);
        ui.out('cells', k > 0.25 ? '10' : '?');
        ui.out('each', k > 0.25 ? '1.2 V' : '?');
        ui.out('pack', '12 V');
        ui.note(k < 0.02 ? 'This is the battery exactly as it sits on the robot. Notice the bumpy sides: you can already count the cells.' : k < 0.5 ? 'The pink shrink wrap is just a plastic jacket. Underneath, two rows of five cells are nested together to save space.' : 'Tap the <b>+</b> labels on the model. Look at the ends: every second cell is flipped, so plus meets minus all along the chain.');
      }
      apply();
      return {
        view: { pos: [6.5, 4.6, 12.5], target: [0, 0.5, -0.6] },
        change: apply,
        handles: [{ obj: handle, id: 'peel', axis: 'y', span: 220, hint: 'Drag the wrap up', hintAt: skin }],
        tick(dt, t) { pack.rotation.y = Math.sin(t * 0.35) * 0.04; },
      };
    },
  };

  // ------------------------------------------------------------ 2. Inside one cell
  const inside = {
    id: 'cell', tab: 'Inside a cell',
    title: 'A cell is a rolled-up chemical sandwich',
    lead: 'Unroll one cell and you get three long ribbons: a <b>plus sheet</b>, a <b>minus sheet</b> and a paper-thin <b>separator</b> soaked in liquid. Chemicals on the minus sheet want to give away electrons. The only way across is the long way round: out of the cell, through your robot and back in.',
    try: 'Drag the steel can down to cut it open, then switch what the cell is doing.',
    controls: [
      { type: 'seg', id: 'cellMode', label: 'What is the cell doing?', value: 'use', options: [['use', 'Powering the robot'], ['charge', 'On the charger'], ['rest', 'Switched off']] },
      { type: 'range', id: 'cut', label: 'Cut the can away', min: 0, max: 100, value: 70, unit: '%' },
    ],
    readouts: [['soc', 'Charge left'], ['cv', 'Cell voltage'], ['dir', 'Electrons flow']],
    more: [
      ['What are the layers made of?', 'The plus sheet is coated in a nickel compound (nickel oxyhydroxide). The minus sheet is a metal alloy that soaks up hydrogen like a sponge, which is where "metal hydride" comes from. The liquid is potassium hydroxide in water. It lets charged atoms (ions) move between the sheets but will not let electrons through.'],
      ['Why roll it up?', 'More sheet area means more chemical reactions at once, which means more amps. Rolling 50 cm of ribbon into a spiral packs a big area into a small can. Engineers call it a "jelly roll".'],
      ['Which way does electricity really flow?', 'Electrons leave the minus end and come back in the plus end. Long ago, before anyone knew electrons existed, scientists guessed current flowed from plus to minus. Circuit diagrams still draw it that way. Both describe the same loop.'],
      ['What does charging do?', 'The charger pushes electrons backwards through the cell. That drives the chemical reaction in reverse and parks the hydrogen back on the minus sheet, ready to go again. A good NiMH cell can do this hundreds of times.'],
    ],
    build(st, S, ui) {
      const H = 5.2, R = 1.5;
      const root = group();
      root.rotation.x = -Math.PI / 2; // spiral geometry is built in XY, stand the cell upright
      const pos = mesh(spiralGeo(0.25, R - 0.2, 5, 0.1, H * 0.9, 0), mat('#2F3336', { rough: 0.7 }));
      const sep = mesh(spiralGeo(0.3, R - 0.15, 5, 0.035, H * 0.92, 0.1), mat('#F1EFE4', { rough: 0.9 }));
      const neg = mesh(spiralGeo(0.35, R - 0.1, 5, 0.1, H * 0.9, 0.2), mat('#7C8FA6', { rough: 0.6, metal: 0.3 }));
      const sep2 = mesh(spiralGeo(0.2, R - 0.25, 5, 0.035, H * 0.92, -0.1), mat('#F1EFE4', { rough: 0.9 }));
      root.add(pos, sep, neg, sep2);
      st.add(root);
      const can = cyl(R + 0.06, H, metal(C.steel, 0.3), { open: true, double: true });
      const jacket = cyl(R + 0.09, H * 0.92, WRAP, { open: true, double: true, rough: 0.45 });
      const bottom = cyl(R + 0.06, 0.1, metal(C.steel, 0.3), { pos: [0, -H / 2, 0] });
      const cap = group(cyl(R + 0.06, 0.12, metal(C.steel, 0.3)), cyl(0.5, 0.28, metal(C.steel, 0.22), { pos: [0, 0.18, 0] }), cyl(R + 0.1, 0.1, C.red, { pos: [0, -0.02, 0] }));
      st.add(can, jacket, bottom, cap);

      // The outside loop: minus (can bottom) → load → plus (cap).
      const loopPts = [[0, -H / 2 - 0.05, 0], [0, -H / 2 - 0.8, 0], [2.6, -H / 2 - 0.8, 0], [4.2, -1, 0], [4.2, 1.6, 0], [2.6, H / 2 + 1.5, 0], [0, H / 2 + 1.5, 0], [0, H / 2 + 0.75, 0]];
      const loop = curveOf(loopPts);
      const wire = tube(loop, 0.07, C.copper, { metal: 0.6, rough: 0.4, steps: 120 });
      const flow = new Flow(loop, 26, { size: 0.11 });
      const lm = miniMotor(0.4, 0.6);
      lm.g.rotation.y = -Math.PI / 2;
      lm.g.position.z = -0.4;
      const fan = group(cyl(0.5, 0.3, plastic(C.dark), { axis: 'x' }), box(0.12, 4.6, 0.5, plastic(C.volt), { r: 0.04 }), box(0.12, 0.5, 4.6, plastic(C.volt), { r: 0.04 }));
      fan.position.x = 5.3;
      lm.g.add(fan);
      const load = group(lm.g);
      load.position.set(4.2, 0.3, 0);
      const charger = box(1.5, 1.9, 1.1, C.volt, { r: 0.18, glow: true, glowPower: 0.25 });
      charger.position.copy(load.position);
      st.add(wire, flow.object, load, charger);

      // Ions hopping between the sheets at the top of the roll.
      const ions = [];
      const ionMat = new THREE.MeshBasicMaterial({ color: C.teal, toneMapped: false });
      for (let i = 0; i < 28; i++) {
        const m = mesh(new THREE.SphereGeometry(0.055, 8, 6), ionMat);
        m.userData = { a: Math.random() * TAU, r: 0.35 + Math.random() * (R - 0.6), p: Math.random() };
        ions.push(m);
        st.add(m);
      }
      const lbl = {
        pos: st.label('Plus sheet (nickel)', new THREE.Vector3(-0.5, H / 2 + 0.2, 0.5), { dy: -16, tip: 'Coated in a nickel compound. This is where electrons come back in after doing their work in the motor.' }),
        neg: st.label('Minus sheet (holds hydrogen)', new THREE.Vector3(1.1, H / 2 - 0.1, -0.6), { dy: -34, tip: 'A metal alloy that soaks up hydrogen like a sponge. Letting that hydrogen go is what frees the electrons.' }),
        ion: st.label('Ions hop across the separator', new THREE.Vector3(-1.5, H / 2 - 0.7, 0.9), { tone: 'teal' }),
        e: st.label('Electrons take the long way', new THREE.Vector3(4.2, 2.5, 0), { tone: 'volt' }),
        load: st.label('Motor', load, { dy: 44 }),
      };
      let soc = S.soc ?? 0.8, topY = H / 2;
      function apply() {
        const k = S.cut / 100;
        const h = H * (1 - k * 0.72);
        can.scale.y = jacket.scale.y = h / H;
        can.position.y = jacket.position.y = -H / 2 + h / 2;
        topY = -H / 2 + h;
        cap.position.y = H / 2 + 0.06 + k * 1.1;
        const mode = S.cellMode;
        load.visible = mode !== 'charge';
        charger.visible = mode === 'charge';
        lbl.load.text(mode === 'charge' ? 'Charger' : 'Motor');
        lbl.load.to(mode === 'charge' ? charger : load);
        lbl.pos.show(k > 0.3); lbl.neg.show(k > 0.3);
      }
      apply();
      return {
        view: { pos: [9, 6.5, 13], target: [1.3, 0.2, 0] },
        change: apply,
        handles: [{ obj: can, id: 'cut', axis: 'y', invert: true, span: 240, hint: 'Drag the can down' }],
        dispose() { S.soc = soc; },
        tick(dt) {
          const mode = S.cellMode;
          let rate = mode === 'use' ? -0.035 : mode === 'charge' ? 0.07 : 0;
          if ((soc <= 0 && rate < 0) || (soc >= 1 && rate > 0)) rate = 0;
          soc = clamp(soc + rate * dt, 0, 1);
          const moving = rate !== 0;
          const dir = mode === 'charge' ? -1 : 1;
          if (moving) flow.advance(dir * dt * 0.16);
          flow.object.visible = moving;
          fan.rotation.x += moving && mode === 'use' ? dt * 9 : 0;
          for (const m of ions) {
            const u = m.userData;
            if (moving) u.p = (u.p + dt * 0.7) % 1;
            const sw = Math.sin(u.p * TAU) * 0.12 * dir;
            m.position.set(Math.cos(u.a) * (u.r + sw), topY + 0.05 + Math.abs(Math.sin(u.p * Math.PI)) * 0.1, Math.sin(u.a) * (u.r + sw));
            m.visible = moving && S.cut > 15;
          }
          lbl.ion.show(moving && S.cut > 30);
          lbl.e.show(moving);
          const v = mode === 'charge' ? 1.38 + soc * 0.07 : mode === 'use' ? (soc <= 0 ? 0.9 : 1.1 + soc * 0.15) : 1.2 + soc * 0.1;
          ui.out('soc', `${Math.round(soc * 100)}%`);
          ui.tone('soc', soc < 0.15 ? 'warn' : '');
          ui.out('cv', `${v.toFixed(2)} V`);
          ui.out('dir', !moving ? 'Nowhere' : mode === 'charge' ? 'Back in' : 'Out to the motor');
          ui.note(mode === 'use' && soc <= 0 ? '<b>Empty.</b> All the hydrogen has crossed over, so nothing is left to push electrons. Switch to "On the charger".'
            : mode === 'charge' && soc >= 1 ? '<b>Full.</b> A smart charger notices the voltage stop climbing and switches off. Overcharging just makes heat.'
            : mode === 'charge' ? 'The charger is pushing electrons backwards. The ions cross back and the cell refills.'
            : mode === 'use' ? 'Yellow dots are electrons leaving the minus end, spinning the motor and returning to the plus end. Teal dots are ions crossing inside to keep things balanced.'
            : 'With no loop outside the cell, the electrons have nowhere to go. The chemicals just wait. That is why a battery keeps its charge on the shelf.', (mode === 'use' && soc <= 0) ? 'warn' : '');
        },
      };
    },
  };

  // ------------------------------------------------------------ 3. Wire it up lab
  const lab = {
    id: 'lab', tab: 'Volts, amps, watts',
    title: 'Build your own pack',
    lead: 'How you connect cells changes what the pack can do. Cells <b>in a chain</b> (plus to minus, called <i>series</i>) add up their volts. Chains <b>side by side</b> (called <i>parallel</i>) share the work, so the pack lasts longer. Build a pack and watch the numbers.',
    try: 'Add cells to the chain, add chains, then turn the knob to make the motor pull harder.',
    controls: [
      { type: 'range', id: 'ser', label: 'Cells in each chain (series)', min: 1, max: 12, value: 10, fmt: (v) => `${v} cell${v === 1 ? '' : 's'}` },
      { type: 'range', id: 'par', label: 'Chains side by side (parallel)', min: 1, max: 3, value: 1, fmt: (v) => `${v} chain${v === 1 ? '' : 's'}` },
      { type: 'knob', id: 'amps', label: 'How hard the motor pulls', min: 1, max: 30, value: 6, fmt: (v) => `${v} amps` },
    ],
    readouts: [['v', 'Volts', 'the push'], ['a', 'Amps', 'the flow'], ['w', 'Watts', 'volts × amps'], ['t', 'Runs for', 'at this pull']],
    more: [
      ['Volts, amps and watts with a water slide', 'Think of a water slide. <b>Volts</b> are how tall the slide is: the push. <b>Amps</b> are how much water is flowing. <b>Watts</b> are the total power of the splash at the bottom: height times flow. A tall slide with a trickle and a short slide with a flood can make the same splash.'],
      ['Why do volts drop when the motor pulls hard?', 'Every cell has a little resistance inside, like a narrow pipe. The more amps you pull, the more push gets used up just getting out of the cell. The pack "sags". Chains side by side split the amps between them, so each one sags less. Watch the volts as you turn the knob.'],
      ['What does 3000 mAh mean?', 'It is the size of the fuel tank. 3000 milliamp-hours means the pack can give 3 amps for one hour, or 6 amps for half an hour, or 30 amps for 6 minutes. Chains side by side add their tanks together. More cells in one chain do not: the same electrons pass through every cell in the chain.'],
      ['Why can’t we just add more cells for more power?', 'FIRST Tech Challenge allows one approved 12 V pack. Motors, the Control Hub and servos are all built for about 12 volts. Too many volts and parts overheat or fail. Too few and the motors are weak. Engineers pick a voltage and design everything around it.'],
    ],
    build(st, S, ui) {
      const packG = group();
      st.add(packG);
      let flow = null, fan = null, motor = null;
      const R = 0.5, Hc = 2.0, DX = 1.2, DZ = 1.55;
      const strip = (w, d, pos) => box(w, 0.06, d, metal('#D9DBD6', 0.3), { r: 0.02, pos });
      const packLbl = st.label('', new THREE.Vector3(0, 2.2, 0), { tone: 'volt' });
      function rebuild() {
        st.disposeTree(packG);
        packG.clear();
        const n = S.ser, p = S.par;
        const x0 = -((n - 1) * DX) / 2, z0 = -((p - 1) * DZ) / 2;
        const yT = Hc / 2 + 0.08, yB = -Hc / 2 - 0.08;
        for (let j = 0; j < p; j++) {
          for (let i = 0; i < n; i++) {
            const c = cell(R, Hc);
            c.rotation.x = i % 2 === 0 ? -Math.PI / 2 : Math.PI / 2; // plus up on even cells
            c.position.set(x0 + i * DX, 0, z0 + j * DZ);
            packG.add(c);
            if (i < n - 1) packG.add(strip(DX + 0.5, 0.4, [x0 + (i + 0.5) * DX, i % 2 === 0 ? yT : yB, z0 + j * DZ]));
          }
        }
        // Bus bars join the chain ends: minus on the left, plus on the right.
        const yEnd = (n - 1) % 2 === 0 ? yT : yB;
        const xl = x0 - 0.95, xr = x0 + (n - 1) * DX + 0.95;
        for (let j = 0; j < p; j++) {
          packG.add(strip(1.2, 0.4, [x0 - 0.45, yB, z0 + j * DZ]), strip(1.2, 0.4, [xr - 0.5, yEnd, z0 + j * DZ]));
        }
        const zs = (p - 1) * DZ + 0.5;
        packG.add(box(0.3, 0.14, zs, C.black, { r: 0.04, pos: [xl, yB, 0] }), box(0.3, 0.14, zs, C.red, { r: 0.04, pos: [xr, yEnd, 0] }));
        const zf = z0 + (p - 1) * DZ + 3.0;
        const pts = [[xl, yB, z0 + (p - 1) * DZ], [xl - 0.2, yB, zf - 1], [xl * 0.5, yB + 0.3, zf], [-1.0, 0, zf], [1.0, 0, zf], [xr * 0.5, yEnd * 0.6, zf], [xr + 0.2, yEnd, zf - 1], [xr, yEnd, z0 + (p - 1) * DZ]];
        const curve = curveOf(pts);
        packG.add(tube(curve, 0.07, C.copper, { metal: 0.6, rough: 0.4, steps: 140 }));
        flow = new Flow(curve, 30, { size: 0.1 });
        packG.add(flow.object);
        const mm = miniMotor(0.42, 0.6);
        motor = mm.g;
        fan = group(cyl(0.5, 0.3, plastic(C.dark), { axis: 'x' }), box(0.12, 4.6, 0.5, plastic(C.volt), { r: 0.04 }), box(0.12, 0.5, 4.6, plastic(C.volt), { r: 0.04 }));
        fan.position.x = 5.3;
        motor.add(fan);
        motor.position.x = -0.5;
        motor.position.z = zf;
        packG.add(motor);
        packLbl.to(new THREE.Vector3(0, Hc / 2 + 1.0, 0));
        st.setView([Math.max(7, n * 0.95), 6.5 + p, 12 + n * 0.75 + p * 1.5], [0, -0.2, zf * 0.42], 500);
      }
      let v = 12, a = 6;
      function apply(id) {
        if (id !== 'amps') rebuild();
        const n = S.ser, p = S.par;
        a = S.amps;
        const open = n * CELL_V;
        v = Math.max(0, n * (CELL_V - CELL_OHM * (a / p)));
        const w = v * a, mins = ((CELL_AH * p) / a) * 60;
        ui.out('v', `${v.toFixed(1)} V`, `${open.toFixed(1)} V when resting`);
        ui.out('a', `${a} A`, p > 1 ? `${(a / p).toFixed(1)} A from each chain` : 'the flow');
        ui.out('w', `${Math.round(w)} W`, 'volts × amps');
        ui.out('t', mins >= 90 ? `${(mins / 60).toFixed(1)} h` : `${Math.round(mins)} min`, `${(CELL_AH * p).toFixed(0)} Ah tank`);
        const over = a / p > 20;
        ui.tone('a', over ? 'warn' : '');
        ui.tone('v', open > 12.5 ? 'warn' : '');
        packLbl.text(`${n} × 1.2 V = ${open.toFixed(1)} V`);
        ui.note(over ? `<b>Fuse blown.</b> Each chain is being asked for ${(a / p).toFixed(0)} amps, more than the 20 amp fuse allows. Add a chain or ease off the knob.`
          : open > 12.5 ? `<b>${open.toFixed(1)} volts is over the limit.</b> The motors would spin faster, but the robot’s electronics are built for a 12 V pack and FTC rules allow nothing bigger.`
          : n === 10 && p === 1 ? '<b>This is the pack on your robot:</b> 10 cells in one chain. 12 volts, 3 amp-hours.'
          : p > 1 ? 'Side by side chains do <b>not</b> add volts. They share the amps, so the pack sags less and lasts longer. It is also heavier.'
          : n < 8 ? 'Fewer cells, less push. The motor still turns, just slowly. Watch the yellow fan.'
          : 'Each cell you add to the chain adds another 1.2 volts of push.', over || open > 12.5 ? 'warn' : '');
      }
      apply();
      return {
        change: apply,
        tick(dt) {
          const blown = S.amps / S.par > 20;
          if (flow) { flow.object.visible = !blown; if (!blown) flow.advance(dt * (0.03 + a * 0.012)); }
          if (fan && !blown) fan.rotation.x += dt * v * 0.9;
        },
      };
    },
  };

  // ------------------------------------------------------------ 4. How it's made
  const STEPS = [
    ['Coat', 'A machine spreads a wet paste of the active chemicals onto a long strip of metal foil, like buttering very long toast. Ovens dry it and rollers squeeze it to an exact thickness.'],
    ['Roll', 'A plus strip, a separator, a minus strip and another separator are wound together into a tight spiral. This is the "jelly roll". It takes about two seconds per cell.'],
    ['Can', 'The roll drops into a steel can. The can is filled with the liquid electrolyte, then the cap is pressed on and crimped shut so nothing leaks.'],
    ['Weld', 'Ten cells are lined up, every second one flipped. Two copper fingers press a nickel strip onto the cell ends and a fast pulse of current welds it in place.'],
    ['Wrap', 'Wires, a fuse and the plug are added. A plastic sleeve is slid over the pack and shrunk tight with hot air. Every pack is charged, tested and labelled before it ships.'],
  ];
  const made = {
    id: 'made', tab: 'How it’s made',
    title: 'From paste to pack',
    lead: 'Battery factories are mostly long machines that do one small job very fast. Step through the line that builds a pack like yours.',
    try: 'Pick a station, then change the line speed.',
    controls: [
      { type: 'seg', id: 'bstep', label: 'Station', value: 0, options: STEPS.map((s, i) => [i, `${i + 1} ${s[0]}`]) },
      { type: 'range', id: 'bspeed', label: 'Line speed', min: 0, max: 200, value: 100, unit: '%' },
    ],
    readouts: [['made', 'Cells made while you watched']],
    more: [
      ['Where do the materials come from?', 'Nickel is mined in places like Indonesia, the Philippines and Canada. The hydrogen-absorbing alloy uses "rare earth" metals such as lanthanum. The can is ordinary steel with a thin nickel plating so it does not rust.'],
      ['Why are cans drawn, not welded?', 'The can starts as a flat steel disc. A press pushes it through a series of ring-shaped dies, stretching it into a cup, a bit like pushing your thumb into clay. This is called deep drawing. It makes a can with no seam that could leak.'],
      ['What happens to old packs?', 'NiMH packs can be recycled. The nickel is valuable and gets melted down for stainless steel or new batteries. Never put one in the bin: take it to a battery drop-off.'],
    ],
    build(st, S, ui) {
      const X = 0; // every station stands on the same spot; only the chosen one shows
      const WHITE = '#D9DAD2';
      const stations = [];
      for (let i = 0; i < 5; i++) {
        const g = group();
        st.add(g);
        stations.push(g);
        st.label(`${i + 1}. ${STEPS[i][0]}`, g, { tone: 'volt', off: new THREE.Vector3(0, 3.6, 0) });
      }
      // 1 Coat: bare foil unwinds, passes under the coating head, dries in the oven, winds up dark.
      const reel = (r, color, x, y) => group(cyl(r, 1.5, color, { axis: 'z', seg: 48, pos: [x, y, 0] }), cyl(0.2, 2.1, metal(C.iron, 0.4), { axis: 'z', pos: [x, y, 0] }), cyl(r + 0.12, 0.06, metal(C.alu, 0.35), { axis: 'z', seg: 48, pos: [x, y, 0.78] }), cyl(r + 0.12, 0.06, metal(C.alu, 0.35), { axis: 'z', seg: 48, pos: [x, y, -0.78] }));
      const foil = box(7.0, 0.03, 1.4, nickel(), { r: 0, pos: [0, -0.5, 0] });
      const coat = box(3.9, 0.05, 1.3, mat('#2A2D30', { rough: 0.85 }), { r: 0, pos: [1.55, -0.49, 0] });
      const roller = cyl(0.42, 1.7, metal(C.steel, 0.22), { axis: 'z', seg: 40, pos: [-0.55, -0.94, 0] });
      const head = mesh(plateGeo([[-1.0, 0.9], [-0.15, 0.9], [-0.15, 0.1], [-0.45, -0.38], [-0.65, -0.38], [-1.0, 0.1]], 1.6, [], 0.03), plastic(WHITE, 0.4));
      const hopper = group(cyl(0.55, 1.1, plastic(C.teal), { pos: [-0.58, 2.35, 0], seg: 40 }), cyl([0.55, 0.1], 0.5, plastic(C.teal), { pos: [-0.58, 1.55, 0], seg: 40 }), cyl(0.09, 0.5, metal(C.steel), { pos: [-0.58, 1.1, 0] }), cyl(0.58, 0.08, metal(C.alu), { pos: [-0.58, 2.93, 0], seg: 40 }));
      const drips = new Flow([[-0.58, 1.3, 0], [-0.58, 0.6, 0], [-0.55, -0.3, 0]], 5, { color: '#2A2D30', size: 0.08 });
      const oven = group(cyl(1.0, 2.3, plastic(WHITE, 0.4), { axis: 'x', open: true, double: true, start: Math.PI, theta: Math.PI, seg: 40, pos: [1.6, -0.55, 0] }));
      for (let i = 0; i < 4; i++) oven.add(cyl(0.05, 1.7, mat(C.hot, { glow: C.hot, glowPower: 2 }), { axis: 'z', seg: 8, pos: [0.8 + i * 0.55, 0.05, 0] }));
      for (const x of [0.45, 2.75]) oven.add(mesh(new THREE.TorusGeometry(1.0, 0.07, 8, 32, Math.PI), plastic(C.volt), [x, -0.55, 0], [0, Math.PI / 2, 0]));
      const stripes = group();
      for (let i = 0; i < 6; i++) stripes.add(box(0.05, 0.06, 1.3, '#4A4E51', { r: 0, pos: [0, -0.48, 0] }));
      stations[0].add(foil, coat, roller, head, hopper, drips.object, oven, stripes, reel(0.7, nickel(), -3.5, -1.2), reel(0.7, mat('#2A2D30', { rough: 0.85 }), 3.5, -1.2), bench(8.6, 2.6, -1.95));
      st.label('Wet paste', hopper, { off: new THREE.Vector3(-0.58, 2.3, 0), tip: 'The active chemicals, ground to a powder and mixed into a paste. The plus strip and the minus strip each get their own recipe.' });
      st.label('Drying oven', oven, { off: new THREE.Vector3(1.6, 0.6, 0), dy: -6, tip: 'Hot air drives off the liquid so only a firm, even coat is left on the foil.' });
      // 2 Roll: three ribbons feed a growing spiral on a spinning pin.
      const roll = mesh(spiralGeo(0.15, 1.1, 5, 0.12, 1.6, 0), mat('#2F3336', { rough: 0.7 }));
      const roll2 = mesh(spiralGeo(0.2, 1.15, 5, 0.05, 1.64, 0.15), mat('#F1EFE4', { rough: 0.9 }));
      const rollG = group(roll, roll2);
      const feeds = group(box(3.4, 0.05, 1.5, '#2F3336', { r: 0, pos: [-2.2, 0.62, 0] }), box(3.4, 0.04, 1.5, '#F1EFE4', { r: 0, pos: [-2.2, 0.1, 0] }), box(3.4, 0.05, 1.5, '#7C8FA6', { r: 0, pos: [-2.2, -0.42, 0] }));
      feeds.children[0].rotation.z = -0.3; feeds.children[2].rotation.z = 0.3;
      stations[1].add(rollG, feeds, cyl(0.1, 2.6, metal(C.steel, 0.2), { axis: 'z' }), reel(0.6, mat('#2F3336', { rough: 0.7 }), -4.1, 1.2), reel(0.5, mat('#F1EFE4', { rough: 0.9 }), -4.2, 0.1), reel(0.6, mat('#7C8FA6', { rough: 0.6, metal: 0.3 }), -4.1, -1.0),
        box(7.4, 4.2, 0.14, plastic(WHITE, 0.4), { r: 0.05, pos: [-1.7, 0.2, -1.1] }), bench(8.2, 2.8, -1.95));
      st.label('Separator', feeds.children[1], { tip: 'A paper-thin sheet that keeps the plus and minus strips from touching, while letting ions soak through.' });
      // 3 Can: the roll drops in, the cap presses on.
      const can = cyl(0.75, 2.2, metal(C.steel, 0.3), { open: true, double: true, pos: [0, -0.4, 0], seg: 48 });
      const canB = cyl(0.75, 0.08, metal(C.steel, 0.3), { pos: [0, -1.5, 0], seg: 48 });
      const jr = group(cyl(0.66, 2.0, '#2F3336', { rough: 0.7 }), mesh(spiralGeo(0.1, 0.62, 5, 0.035, 0.03, 0), mat('#F1EFE4', { rough: 0.9 }), [0, 1.0, 0], [-Math.PI / 2, 0, 0]));
      const capM = group(cyl(0.75, 0.1, metal(C.steel, 0.3), { seg: 48 }), cyl(0.26, 0.2, metal(C.steel, 0.25), { pos: [0, 0.14, 0] }), cyl(0.5, 0.03, '#F1EFE4', { pos: [0, 0.06, 0] }));
      const ram = group(cyl(0.3, 2.2, metal(C.steel, 0.25)), cyl([0.5, 0.8], 0.4, plastic('#D0E80C'), { pos: [0, -1.1, 0], seg: 40 }));
      stations[2].add(can, canB, jr, capM, ram, cyl(1.5, 0.3, mat('#2B2F30', { rough: 0.5, metal: 0.5 }), { pos: [0, -1.7, 0], seg: 48 }), cyl(0.95, 0.25, metal(C.alu, 0.35), { pos: [0, -1.5, 0], seg: 48, open: true, double: true }), bench(5, 3, -1.85),
        cyl(0.22, 6.2, metal(C.alu, 0.35), { pos: [0, 1.2, -1.2] }), box(0.7, 0.5, 1.6, plastic(WHITE, 0.4), { r: 0.1, pos: [0, 4.2, -0.6] }));
      // 4 Weld: electrodes tap a strip onto two cells.
      const c1 = cell(0.55, 2.0); c1.rotation.x = -Math.PI / 2; c1.position.set(-0.6, -0.5, 0);
      const c2 = cell(0.55, 2.0); c2.rotation.x = Math.PI / 2; c2.position.set(0.6, -0.5, 0);
      const ws = box(1.7, 0.06, 0.42, metal('#D9DBD6', 0.3), { r: 0.02, pos: [0, 0.58, 0] });
      const e1 = cyl([0.14, 0.05], 1.6, metal(C.copper, 0.3), { pos: [-0.6, 1.6, 0] });
      const e2 = cyl([0.14, 0.05], 1.6, metal(C.copper, 0.3), { pos: [0.6, 1.6, 0] });
      const whead = group(cyl(0.1, 1.9, metal(C.steel, 0.25), { axis: 'x', pos: [0, 0.75, 0] }), cyl(0.45, 0.9, plastic(WHITE, 0.4), { pos: [0, 1.3, 0], seg: 40 }), cyl(0.2, 2.4, metal(C.alu, 0.35), { pos: [0, 2.9, 0] }));
      const spark1 = ball(0.2, '#FFF3B0', { glow: '#FFD23A', glowPower: 3, pos: [-0.6, 0.66, 0] });
      const spark2 = ball(0.2, '#FFF3B0', { glow: '#FFD23A', glowPower: 3, pos: [0.6, 0.66, 0] });
      spark1.userData.noShadow = spark2.userData.noShadow = true;
      stations[3].add(c1, c2, ws, e1, e2, whead, spark1, spark2, box(2.6, 0.5, 1.4, plastic(C.dark), { r: 0.08, pos: [0, -1.25, 0] }), bench(5, 3, -1.5));
      st.label('Copper electrodes', e1, { dy: -40, tip: 'They squeeze the nickel strip onto the cell, then a burst of current melts a tiny dot of both metals together.' });
      // 5 Wrap: sleeve slides over, a meter checks the volts.
      const mini = group();
      for (let k = 0; k < 10; k++) { const c = cell(0.55 * 0.56, 2.1 * 0.56), h = nest(k); if (k % 2) c.rotation.y = Math.PI; c.position.set(h.x * 0.56, h.y * 0.56 - 0.6, 0); mini.add(c); }
      const sleeve = part('B_wrap', { axis: 'z', scale: 0.57 });
      const meter = group(box(1.6, 1.0, 0.3, C.dark, { r: 0.1 }), box(1.2, 0.5, 0.05, C.volt, { r: 0.04, pos: [0, 0.1, 0.16], glow: true, glowPower: 0.3 }));
      meter.position.set(0, 2.0, 0);
      stations[4].add(mini, sleeve, meter, bench(6, 3, -1.45));
      const meterLbl = st.label('12.6 V  pass', meter, { dy: -30 });

      let ph = 0, count = 0, lastCycle = 0;
      function focus() {
        const i = Number(S.bstep);
        stations.forEach((g, n) => { g.visible = n === i; });
        st.ground(-3.2);
        st.setView([5.5, 4.4, 13.5], [0, -0.4, 0], 0);
        ui.note(`<b>${STEPS[i][0]}.</b> ${STEPS[i][1]}`);
      }
      focus();
      return {
        change(id) { if (id === 'bstep') focus(); },
        tick(dt) {
          ph += dt * (S.bspeed / 100) * 0.45;
          const k = ph % 1;
          if (Math.floor(ph) !== lastCycle) { lastCycle = Math.floor(ph); count += 1; }
          ui.out('made', String(count * 12));
          // 1
          roller.rotation.z = -ph * 6;
          drips.advance(dt * (S.bspeed / 100) * 0.9);
          stripes.children.forEach((s, i) => { s.position.x = -0.35 + ((i / 6 + k) % 1) * 0.75; });
          // 2
          rollG.rotation.z = ph * 5;
          rollG.scale.set(0.45 + k * 0.55, 0.45 + k * 0.55, 1);
          // 3
          const drop = smooth(span(k, 0.05, 0.4)), press = smooth(span(k, 0.5, 0.75)) - smooth(span(k, 0.85, 1));
          jr.position.y = lerp(2.4, -0.45, drop);
          capM.position.y = lerp(2.9, 0.72, smooth(span(k, 0.5, 0.75)));
          capM.visible = k > 0.42;
          ram.position.y = lerp(4.4, 2.05, press);
          // 4
          const tap = Math.sin(clamp((k % 0.5) / 0.5, 0, 1) * Math.PI);
          e1.position.y = e2.position.y = 1.9 - tap * 0.5;
          whead.position.y = 1.9 - tap * 0.5;
          spark1.visible = spark2.visible = tap > 0.93;
          spark1.scale.setScalar(0.6 + Math.random() * 0.9); spark2.scale.setScalar(0.6 + Math.random() * 0.9);
          // 5
          const on = smooth(span(k, 0.05, 0.45));
          sleeve.position.set(lerp(4, 0, on), -0.6, 0);
          sleeve.scale.setScalar(lerp(1.12, 1.0, smooth(span(k, 0.45, 0.65))));
          meterLbl.show(k > 0.7);
          meter.children[1].material.emissiveIntensity = k > 0.7 ? 0.9 : 0.1;
        },
      };
    },
  };

  // ------------------------------------------------------------ 5. On the robot
  const JOBS = { idle: [0.6, 'Sitting still', 0], drive: [7, 'Driving', 4], shoot: [13, 'Driving and launching', 6], push: [34, 'Shoving a wall', 4] };
  const onRobot = {
    id: 'robot', tab: 'On the robot',
    title: 'One battery, everything else',
    lead: 'Every motor, servo and sensor on the robot drinks from this one pack. Power leaves the battery, passes the fuse and the main switch, and reaches the <b>Control Hub</b>. The hub is the robot’s brain <i>and</i> its power board: your code tells it how much to send to each motor.',
    try: 'Pick what the robot is doing, then drain the battery with the knob.',
    controls: [
      { type: 'seg', id: 'job', label: 'What is the robot doing?', value: 'drive', options: Object.entries(JOBS).map(([k, v]) => [k, v[1]]) },
      { type: 'knob', id: 'charge', label: 'Battery charge', min: 10, max: 100, value: 100, unit: '%' },
    ],
    readouts: [['rv', 'Volts at the hub'], ['ra', 'Amps flowing'], ['rw', 'Watts'], ['rt', 'Battery lasts']],
    more: [
      ['Why does the robot feel weaker late in a match?', 'As the pack empties, its voltage drops from about 13 volts to under 12. Motor speed follows voltage, so the same code makes a slower robot. Good teams start every match on a fresh pack and write code that checks battery voltage.'],
      ['What is a brownout?', 'If the motors pull so many amps that the voltage sags very low, the Control Hub does not get enough to keep running and restarts in the middle of the match. Shoving against a wall with all four drive motors is the classic way to cause one.'],
      ['A match is only 2.5 minutes. Why care about runtime?', 'Because sag matters more than the clock. A half-empty pack sags much more under load. The robot does not stop, it just gets sluggish right when you need a fast launcher wheel.'],
    ],
    build(st, S, ui) {
      const batt = group(part('B_wrap', { scale: 0.62 }), part('B_label', { scale: 0.62 }));
      for (let k = 0; k < 10; k++) { const c = cell(0.55 * 0.62, 2.1 * 0.62), h = nest(k); c.rotation.x = k % 2 ? Math.PI / 2 : -Math.PI / 2; c.position.set(h.x * 0.62, 0, -h.y * 0.62); batt.add(c); }
      batt.position.set(-6.5, 0, 0);
      const fuseG = part('B_fuse', { scale: 1.5, pos: [-3.9, 0.9, 0] });
      fuseG.rotation.set(-Math.PI / 2, 0, 0);
      let fuse = null; fuseG.traverse((o) => { if (o.isMesh && o.material.name === 'fuse_yellow') { o.material = o.material.clone(); o.material.userData.shared = false; fuse = o; } });
      const sw = group(box(0.95, 0.5, 0.75, plastic(C.dark), { r: 0.08 }), cyl(0.2, 0.12, metal(C.steel, 0.3), { pos: [0, 0.3, 0] }), cyl([0.07, 0.1], 0.5, plastic(C.red), { pos: [0.1, 0.52, 0], seg: 14 }));
      sw.children[2].rotation.z = -0.4;
      sw.position.set(-2.5, 0.9, 0);
      const hub = part('HUB');
      hub.position.set(0.6, 0, 0);
      st.add(batt, fuseG, sw, hub);
      const feed = curveOf([[-5.0, 0.3, 0], [-4.4, 0.9, 0], [-3.9, 0.9, 0], [-2.5, 0.9, 0], [-1.6, 0.7, 0], [-1.1, 0.2, 0]]);
      const ret = curveOf([[-1.1, -0.2, 0.5], [-3, -0.7, 0.7], [-5.0, -0.3, 0.5]]);
      st.add(tube(feed, 0.08, C.red, { rough: 0.6 }), tube(ret, 0.08, C.black, { rough: 0.6 }));
      const feedFlow = new Flow(feed, 10, { size: 0.1 });
      const retFlow = new Flow(ret, 8, { size: 0.1 });
      st.add(feedFlow.object, retFlow.object);
      const names = ['Drive', 'Drive', 'Drive', 'Drive', 'Launcher', 'Intake'];
      const motors = names.map((nm, i) => {
        const z = (i - 2.5) * 1.55, x = 6.2 + (i % 2) * 0.5;
        const mm = miniMotor(0.3, 1.3), body = mm.g;
        const wheel = i < 4 ? part('W_mecanum', { axis: 'x', scale: 0.42 }) : group(cyl(0.7, 0.34, plastic(i === 4 ? C.orange : C.teal), { axis: 'x', seg: 36 }), box(0.36, 0.16, 1.2, C.dark, { r: 0.03 }));
        wheel.position.x = 1.55 / 0.3;
        wheel.scale.multiplyScalar(1 / 0.3);
        body.add(wheel);
        body.position.set(x, 0, z);
        st.add(body);
        const c = curveOf([[2.3, 0.1, z * 0.35], [3.6, 0.5, z * 0.7], [x - 1.3, 0.1, z]]);
        st.add(tube(c, 0.05, C.copper, { metal: 0.5, rough: 0.5 }));
        const f = new Flow(c, 5, { size: 0.08 });
        st.add(f.object);
        return { body, wheel, f, nm };
      });
      st.label('Battery', batt, { dy: -42 });
      st.label('Fuse', fuseG, { dy: -24, tip: 'Rated for 20 amps. Pick “Shoving a wall” and watch what happens to it.' });
      st.label('Switch', sw, { dy: -34, tip: 'The main power switch. Off means the loop is broken and nothing can flow, so it is the first thing to hit if something goes wrong.' });
      st.label('Control Hub', hub, { dy: -40, tip: 'The robot’s brain and its power board. It takes 12 volts in and hands each motor exactly the share your code asks for.' });
      st.label('4 drive motors', motors[1].body, { dy: 34 });
      st.label('Launcher', motors[4].body, { dy: 30 });
      st.label('Intake', motors[5].body, { dy: 30 });
      const blownLbl = st.label('Fuse blown!', fuseG, { dy: 26, tone: 'warn' });
      let heat = 0, blown = false, v = 12, amps = 0;
      function apply(id) {
        if (id === 'job') { heat = 0; blown = false; fuse.material.color.set('#E9C53A'); }
      }
      apply('job');
      return {
        view: { pos: [2, 11, 25], target: [0.4, -0.5, 0] },
        change: apply,
        tick(dt) {
          const [need, , active] = JOBS[S.job];
          const soc = S.charge / 100;
          const open = 11.3 + soc * 1.9;
          amps = blown ? 0 : need;
          v = Math.max(0, open - amps * (0.1 + (1 - soc) * 0.08));
          if (amps > 20) heat += dt; else heat = Math.max(0, heat - dt);
          if (heat > 2.2 && !blown) { blown = true; fuse.material.color.set('#3A3F3E'); }
          const sp = amps / 60;
          feedFlow.advance(dt * (0.05 + sp)); retFlow.advance(dt * (0.05 + sp));
          feedFlow.object.visible = retFlow.object.visible = !blown;
          motors.forEach((m, i) => {
            const on = !blown && (S.job === 'shoot' ? true : i < active);
            m.f.object.visible = on;
            if (on) { m.f.advance(dt * 0.5); m.wheel.rotation.x += dt * (S.job === 'push' ? 0.15 : v * 0.55); }
          });
          blownLbl.show(blown);
          const brown = v < 8.5 && !blown;
          ui.out('rv', `${v.toFixed(1)} V`, blown ? 'nothing gets through' : brown ? 'brownout!' : v < 11 ? 'sagging' : 'healthy');
          ui.tone('rv', blown || brown ? 'warn' : '');
          ui.out('ra', `${amps.toFixed(1)} A`, amps > 20 ? 'over the 20 A fuse' : '');
          ui.tone('ra', amps > 20 ? 'warn' : '');
          ui.out('rw', `${Math.round(v * amps)} W`);
          const mins = amps > 0 ? ((CELL_AH * soc) / amps) * 60 : 0;
          ui.out('rt', blown ? '0 min' : mins > 120 ? `${(mins / 60).toFixed(1)} h` : `${Math.round(mins)} min`);
          ui.note(blown ? '<b>Pop.</b> Four stalled motors pulled far more than 20 amps, so the fuse melted to protect the wires. Pick another activity to fit a new fuse.'
            : S.job === 'push' ? 'Motors that are powered but cannot turn pull the most current of all. The fuse is heating up…'
            : brown ? '<b>Brownout.</b> The voltage has sagged so low the Control Hub may restart. Charge the battery.'
            : S.job === 'idle' ? 'Even sitting still, the Control Hub, sensors and servos sip a little power.'
            : soc < 0.4 ? 'Same job, tired battery: fewer volts reach the hub, so every motor turns slower.'
            : 'Yellow dots show electrons flowing. Busier robot, faster flow, shorter battery life.', blown || brown ? 'warn' : '');
        },
      };
    },
  };

  return { title: 'The 12 V battery', chapters: [openUp, inside, lab, made, onRobot] };
}
