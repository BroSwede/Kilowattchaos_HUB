// Motor deep dive: the goBILDA Yellow Jacket is a brushed DC motor bolted to a planetary gearbox.
// Open it up, see why magnets and coils make it spin, play with the gearbox, see how the parts are made,
// and find out how your code and the encoder talk to it.
import { THREE, C, mat, metal, plastic, mesh, cyl, box, ball, bench, group, tube, Flow, fade, arrow, part, ghost, gearGeo, ringGeo, plateGeo, clamp, lerp, smooth, span, TAU } from './kit.js';

const RING = 46;                     // teeth on the fixed ring gear of every Yellow Jacket stage
const RATIOS = { '3.7': [17], '5.2': [11], '19.2': [17, 11], '50.9': [17, 17, 17] }; // sun teeth per stage
const stageRatio = (sun) => 1 + RING / sun;
const totalRatio = (suns) => suns.reduce((r, s) => r * stageRatio(s), 1);
const FREE_RPM = 6000, STALL_A = 9.2, IDLE_A = 0.25, STALL_NCM = 15; // bare motor at 12 V

// ---- Rotor: a stack of thin steel plates with five T-shaped teeth, each wrapped in copper wire.
function laminationGeo(len) {
  const pts = [], hub = 0.42, r1 = 0.98, r2 = 1.24, sw = 0.17, beta = 0.5;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    const loc = [[hub, -sw], [r1, -sw]];
    for (let k = 0; k <= 8; k++) { const b = lerp(-beta, beta, k / 8); loc.push([Math.cos(b) * r2, Math.sin(b) * r2]); }
    loc.splice(2, 0, [Math.cos(beta) * r1, -Math.sin(beta) * r1]);
    loc.push([Math.cos(beta) * r1, Math.sin(beta) * r1], [r1, sw], [hub, sw]);
    for (const [x, y] of loc) pts.push([x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]);
  }
  return plateGeo(pts, len);
}
// Returns { g, coils[] } with the axis along Z. The core and the wound coils are the Blender parts.
function rotor(len = 2.4) {
  const k = len / 2.4;
  const g = group(part('M_stack', { axis: 'z', scale: [1, k, 1] }));
  const coils = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    const c = part('M_coil', { axis: 'z', scale: [1, k, 1] });
    c.rotation.z = a;
    c.userData.a = a;
    c.anchor = new THREE.Object3D(); c.anchor.position.set(0.75, 0, 0); c.add(c.anchor);
    c.setMat = (m) => c.traverse((o) => { if (o.isMesh) o.material = m; });
    coils.push(c);
    g.add(c);
  }
  return { g, coils };
}
const commutator = (r = 0.4, len = 0.55) => part('M_commutator', { axis: 'z', scale: [r / 0.45, len / 0.58, r / 0.45] });
// One curved magnet centred on +X, along Z. Returns the group with its own material in userData.m.
function magnet(color, k = 1, len = 2.5) {
  const g = part('M_magnet', { axis: 'z', scale: [k, len / 2.5, k], tint: color });
  g.traverse((o) => { if (o.isMesh) g.userData.m = o.material; });
  return g;
}
// A closed-up motor along X for scenes where it is a prop: can, end bell, gearbox, shaft. `spin` turns the shaft.
export function miniMotor(k = 1, gearLen = 1.3, cap = true) {
  const shaft = part('M_shaft', { axis: 'x', pos: [1.8 + gearLen + 1.2, 0, 0] });
  const can = part('M_can', { axis: 'x' });
  can.rotation.x = 2.2;
  const core = group(part('M_stack', { axis: 'x' }));
  if (k >= 0.5) for (let i = 0; i < 5; i++) { const c = part('M_coil', { axis: 'x' }); c.rotation.x = (i / 5) * TAU; core.add(c); } // wound coils only where the motor is big enough to see them
  const g = group(
    can, core,
    part('M_endbell', { axis: 'x', pos: [-1.95, 0, 0] }),
    cap ? part('M_enc_cap', { axis: 'x', pos: [-2.5, 0, 0] }) : null,
    cyl(1.62, 0.16, plastic(C.volt, 0.45), { axis: 'x', pos: [1.86, 0, 0] }),
    cyl(1.8, gearLen, metal('#4A5052', 0.42), { axis: 'x', seg: 64, pos: [1.94 + gearLen / 2, 0, 0] }),
    part('M_front', { axis: 'x', pos: [1.94 + gearLen + 0.15, 0, 0] }),
    shaft,
  );
  g.scale.setScalar(k);
  return { g, shaft, core };
}
// ---- One planetary stage in the XY plane: sun in the middle, three planets, carrier plate behind.
// update(sunAngle) turns everything so the teeth stay in mesh and returns the carrier angle.
function planetStage(sunT, m, width, tint) {
  const P = (RING - sunT) / 2;                    // planet size by pitch (17.5 or 14.5 "teeth")
  const Pd = 2 * Math.round(P / 2);               // teeth actually drawn: an even count keeps both meshes in phase
  const rs = (sunT * m) / 2, rp = (P * m) / 2;
  const sun = mesh(gearGeo({ teeth: sunT, pitchR: rs, m, width: width * 1.15 }), metal(C.volt, 0.4));
  sun.material.metalness = 0.4;
  const planets = [0, 1, 2].map(() => mesh(gearGeo({ teeth: Pd, pitchR: rp, m, width, bore: rp * 0.3 }), metal('#B9BEC0', 0.35)));
  const carrier = group(cyl((rs + rp) + rp * 0.55, width * 0.3, tint, { axis: 'z', rough: 0.45, metal: 0.3, pos: [0, 0, width * 0.85] }));
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU;
    carrier.add(cyl(rp * 0.28, width * 1.5, metal(C.steel, 0.3), { axis: 'z', seg: 16, pos: [Math.cos(a) * (rs + rp), Math.sin(a) * (rs + rp), width * 0.2] }));
  }
  const g = group(sun, carrier, ...planets);
  const pS = TAU / sunT, pP = TAU / Pd;
  function update(th) {
    const phc = (th * sunT) / (sunT + RING);
    sun.rotation.z = th;
    carrier.rotation.z = phc;
    planets.forEach((p, k) => {
      const ph = phc + (k / 3) * TAU;
      p.position.set(Math.cos(ph) * (rs + rp), Math.sin(ph) * (rs + rp), 0);
      p.rotation.z = ph + Math.PI - pP * (0.5 - (ph - th) / pS);
    });
    return phc;
  }
  update(0);
  return { g, sun, planets, carrier, update };
}
const TINTS = ['#F07A2A', '#0E8F9E', '#B394FF'];
// A whole gearbox along Z: stage 1 at z = 0, each next stage `gap` further on.
function gearbox(suns, m, width, gap) {
  const g = group();
  const stages = suns.map((s, i) => {
    const st = planetStage(s, m, width, TINTS[i]);
    st.g.position.z = i * gap;
    const ring = mesh(ringGeo({ teeth: RING, pitchR: (RING * m) / 2, m, width: width * 1.1, outerR: (RING * m) / 2 + 3.2 * m }), mat('#4A5052', { metal: 0.6, rough: 0.45 }));
    ring.position.z = i * gap;
    st.ring = ring;
    if (i > 0) g.add(cyl(m * 2.2, gap - width, metal(C.steel, 0.3), { axis: 'z', seg: 16, pos: [0, 0, i * gap - gap / 2 + width * 0.4] }));
    g.add(st.g, ring);
    return st;
  });
  function update(th) {
    let a = th;
    for (const st of stages) a = st.update(a);
    return a;
  }
  return { g, stages, update };
}

export default function motor(ctx) {
  const sku = (ctx.part && ctx.part.sku) || '5203-2402-0019';
  const myRatio = /-0051$/.test(sku) ? '50.9' : '19.2';
  const job = ctx.part && /Launcher/.test(ctx.part.name) ? 'launcher' : ctx.part && /Intake/.test(ctx.part.name) ? 'intake' : 'drive';
  const outRpm = FREE_RPM / totalRatio(RATIOS[myRatio]);

  // ------------------------------------------------------------ 1. Open it up
  const openUp = {
    id: 'open', tab: 'Open it up',
    title: 'Two machines bolted together',
    lead: 'A Yellow Jacket is really two things. The back half is an <b>electric motor</b> that spins very fast but is easy to stop with your fingers. The front half is a <b>gearbox</b> that trades that speed for muscle. Slide to pull it apart.',
    try: 'Drag the motor sideways to pull it apart, then tap the + labels.',
    controls: [{ type: 'range', id: 'boom', label: 'Pull it apart', min: 0, max: 100, value: 0, unit: '%' }],
    readouts: [['in', 'Motor spins at', 'no load, 12 V'], ['ratio', 'Gearbox'], ['out', 'Shaft comes out at']],
    more: [
      ['What is each part for?', '<b>Magnets</b> (stator): two curved permanent magnets glued inside the steel can. They never move. <b>Rotor</b>: the spinning stack of steel plates wrapped in copper wire. <b>Commutator and brushes</b>: a rotating switch that keeps flipping the current. <b>Encoder</b>: a tiny magnet and sensors that count turns. <b>Planetary gears</b>: slow the spin down and multiply the turning force.'],
      ['Why is it called "brushed"?', 'Two little blocks of carbon, called brushes, press on the spinning commutator to pass electricity into the rotor. They slowly wear down, like pencil lead. Brushless motors (in drones and electric cars) use electronics to do the switching instead.'],
      ['Why not just use a slower motor?', 'Small electric motors are happiest spinning fast. A motor built to turn slowly with the same power would need to be far bigger and heavier. A small fast motor plus gears is lighter, cheaper and more efficient.'],
    ],
    build(st, S, ui) {
      const root = group();
      root.rotation.y = Math.PI / 2; // parts are modelled along Z; lay the motor along X
      st.add(root);
      const parts = []; // { o, z, dz } assembled z and how far it travels when exploded
      const add = (o, z, dz, name, dy) => { o.position.z = z; root.add(o); const p = { o, z, dz: dz * 0.75 }; parts.push(p); if (name) p.lbl = st.label(name, o, { dy: dy ?? -44, tip: tips[name] }); return o; };
      const tips = {
        'Encoder cover': 'A plastic cup that keeps dust and fingers off the encoder. The four-pin socket on its rim is where the encoder cable plugs in.',
        'Encoder: magnet and sensors': 'A little magnet on the tail of the shaft spins past two sensor chips. Every pass is one "tick", so the robot can count turns.',
        'Brushes': 'Two spring-loaded blocks of carbon. They rub on the spinning copper commutator to pass electricity into the rotor.',
        'Steel can': 'More than a cover. The steel carries the magnetism round from one magnet to the other, which makes both stronger.',
        'Magnets (stator)': 'Two curved permanent magnets glued inside the can. One faces the rotor with its north pole, the other with its south. They never move.',
        'Rotor: steel core and copper coils': 'The part that spins. Five steel teeth, each wrapped in copper wire. Send current through a coil and its tooth becomes a magnet.',
        'Output shaft': 'A hexagon, so a wheel or gear can slide on and cannot slip round.',
      };
      // Encoder cap (rear, -Z)
      add(part('M_enc_cap', { axis: 'z' }), -3.55, -4.2, 'Encoder cover', 52);
      const emag = group(cyl(0.42, 0.16, C.red, { axis: 'z' }), cyl(0.425, 0.162, C.blue, { axis: 'z', start: 0, theta: Math.PI }));
      emag.position.z = 0.3;
      const enc = group(part('M_enc_board', { axis: 'z' }), emag);
      add(enc, -3.35, -3.3, 'Encoder: magnet and sensors');
      add(part('M_endbell', { axis: 'z' }), -2.85, -2.4, 'Brushes', 50);
      const can = part('M_can', { axis: 'z' });
      can.rotation.z = 2.5; // cutaway window toward the camera
      add(can, -0.9, -1.2, 'Steel can');
      const mags = group(magnet(C.red), magnet(C.blue));
      mags.children[0].rotation.z = Math.PI / 2; mags.children[1].rotation.z = -Math.PI / 2;
      add(mags, -0.8, -1.2, 'Magnets (stator)', 60);
      const rot = rotor(2.4);
      const spin = group(rot.g, cyl(0.16, 6.2, metal(C.steel, 0.25), { axis: 'z', pos: [0, 0, -0.2] }));
      const com = commutator(); com.position.z = -1.72; spin.add(com);
      const pin = mesh(gearGeo({ teeth: 17, pitchR: 0.36, m: 0.042, width: 0.5 }), metal(C.volt, 0.4)); pin.position.z = 2.6; spin.add(pin);
      add(spin, -0.8, 2.6, 'Rotor: steel core and copper coils');
      const face = part('M_front', { axis: 'z' });
      add(face, 1.0, 4.0);
      // Gearbox: real tooth counts, stages packed close like the real thing.
      const suns = RATIOS[myRatio];
      const gb = gearbox(suns, 0.063, 0.5, 0.8);
      gb.stages.forEach((sg, i) => {
        root.remove(sg.g); gb.g.remove(sg.g); gb.g.remove(sg.ring);
        sg.ring.material = mat('#4A5052', { metal: 0.6, rough: 0.45 });
        const z = 1.55 + i * 0.8;
        add(sg.ring, z, 5.2 + i * 1.7 + 1.0);
        add(sg.g, z, 5.2 + i * 1.7, i === 0 ? `Planetary gears (${suns.length} stage${suns.length > 1 ? 's' : ''})` : null, 64);
        sg.g.position.x = sg.g.position.y = 0;
      });
      const zEnd = 1.55 + suns.length * 0.8;
      const out = group(part('M_front', { axis: 'z' }), cyl(0.7, 0.3, metal(C.steel, 0.3), { axis: 'z', pos: [0, 0, 0.45] }), part('M_shaft', { axis: 'z', pos: [0, 0, 1.3] }));
      add(out, zEnd - 0.1, 5.2 + suns.length * 1.7 + 1.8, 'Output shaft', 40);
      // Shell that hides the insides until you start pulling.
      const shell = group(cyl(1.79, 3.7, metal('#2E3234', 0.4), { axis: 'z', seg: 64, pos: [0, 0, -0.9] }), cyl(1.8, suns.length * 0.8 + 0.5, metal('#4A5052', 0.4), { axis: 'z', seg: 64, pos: [0, 0, 1.2 + suns.length * 0.4] }), cyl(1.6, 0.22, plastic(C.volt), { axis: 'z', pos: [0, 0, 0.6] }));
      root.add(shell);
      const handle = ghost(9, 3.8, 3.8, [0.6, 0, 0]);
      st.add(handle);
      const real = ctx.fitReal(ctx.real(), 8.6, { shaft: true });
      if (real) { real.position.x = 0.6; st.add(real); }
      const realLbl = st.label('The real part, from the robot’s CAD', new THREE.Vector3(0, 2.8, 0), { tone: 'volt' });
      let th = 0;
      function apply() {
        const k = S.boom / 100;
        const swap = real ? smooth(span(k, 0.02, 0.1)) : 1;
        if (real) fade(real, 1 - swap);
        for (const p of parts) { fade(p.o, swap); p.o.position.z = p.z + p.dz * smooth(span(k, 0.12, 1)); if (p.lbl) p.lbl.show(k > 0.55); }
        fade(shell, swap * (1 - smooth(span(k, 0.08, 0.3))));
        realLbl.show(!!real && k < 0.02);
        ui.out('in', `${FREE_RPM.toLocaleString('en-US')} rpm`);
        ui.out('ratio', `${myRatio} : 1`, `${suns.length} planetary stage${suns.length > 1 ? 's' : ''}`);
        ui.out('out', `${Math.round(outRpm)} rpm`, 'with about ' + Math.round(totalRatio(suns)) + '× the push');
        ui.note(k < 0.02 ? 'This is the motor exactly as it sits on the robot. Drag the slider to see what is hiding inside.' : k < 0.5 ? 'The yellow band is where the motor ends and the gearbox begins.' : 'Tap a <b>+</b> label to see what each part does. Everything on the long steel shaft spins together: rotor, commutator and the small yellow gear that feeds the gearbox.');
        st.setView([4 + k * 5, 5 + k * 3, 13 + k * (11 + suns.length * 2.5)], [0.6 + k * (0.6 + suns.length * 0.5), 0, 0], 0);
      }
      apply();
      return {
        change: apply,
        handles: [{ obj: handle, id: 'boom', axis: 'x', span: 320, hint: 'Drag sideways to pull it apart' }],
        tick(dt) {
          th += dt * 2.2;
          spin.rotation.z = th;
          emag.rotation.z = th;
          const a = gb.update(th);
          out.children[2].rotation.z = a;
        },
      };
    },
  };

  // ------------------------------------------------------------ 2. Why it spins
  const why = {
    id: 'spin', tab: 'Why it spins',
    title: 'Magnets chasing magnets',
    lead: 'Run electricity through a coil of wire and it becomes a magnet you can switch on and off: an <b>electromagnet</b>. Each tooth of the rotor is one. The fixed magnets pull and push on them, the rotor turns, and just as a tooth arrives, the <b>commutator</b> flips its current so it gets shoved onward. It never catches up.',
    try: 'Drag the rotor up or down to change the volts. Push it below zero to reverse.',
    controls: [
      { type: 'range', id: 'volts', label: 'Volts from the Control Hub', min: -12, max: 12, value: 6, fmt: (v) => `${v > 0 ? '+' : ''}${v} V` },
      { type: 'knob', id: 'load', label: 'Load on the shaft', min: 0, max: 100, step: 5, value: 20, unit: '%' },
      { type: 'seg', id: 'slow', label: 'Playback', value: 'slow', options: [['slow', 'Slow motion'], ['fast', 'Faster']] },
    ],
    readouts: [['rpm', 'Speed'], ['amps', 'Current'], ['tq', 'Turning force'], ['heat', 'Wasted as heat']],
    more: [
      ['Red and blue: what am I looking at?', 'Red means a north pole, blue means a south pole. Opposite poles pull together, matching poles push apart. Watch one coil as it goes round: its colour flips every half turn, exactly when it passes a brush.'],
      ['Why does more load mean more amps?', 'A spinning motor is also a generator. It makes its own voltage that pushes back against the battery. The faster it spins, the more it pushes back and the less current flows. Slow the shaft down with a load and the push-back drops, so more current rushes in and the motor fights harder.'],
      ['What is a stall?', 'If the load is too much, the motor stops but the current keeps flowing: about 9 amps in this motor. None of that energy becomes movement. All of it becomes heat in the coils. A stalled motor can cook itself in under a minute.'],
      ['How does the robot go backwards?', 'Swap plus and minus and every electromagnet flips, so the rotor is pushed the other way. Drag the volts below zero to try it. In code, that is <code>motor.setPower(-1)</code>.'],
    ],
    build(st, S, ui) {
      const can = mesh(plateGeo(ringPts(2.05), 2.2, [[0, 0, 1.78]]), metal('#3B4042', 0.45));
      const mN = magnet(C.red, 1.06, 2.2), mS = magnet(C.blue, 1.06, 2.2);
      mN.rotation.z = Math.PI;
      st.add(can, mN, mS);
      const rot = rotor(2.0);
      const spin = group(rot.g, cyl(0.16, 4.6, metal(C.steel, 0.25), { axis: 'z', pos: [0, 0, 0.5] }));
      const com = commutator(0.42, 0.6); com.rotation.y = Math.PI; com.position.z = 1.75; spin.add(com);
      st.add(spin);
      const coilMats = rot.coils.map((c) => { const m = mat(C.copper, { metal: 0.6, rough: 0.38, glow: C.copper, glowPower: 0 }); c.setMat(m); return m; });
      const brush = (sx) => group(box(0.62, 0.3, 0.42, mat('#17191B', { rough: 0.85 }), { r: 0.03, pos: [sx * 0.76, 0, 1.75] }), box(0.4, 0.4, 0.5, metal(C.brass, 0.35), { r: 0.03, pos: [sx * 1.22, 0, 1.75] }));
      const b1 = brush(1), b2 = brush(-1);
      const w1 = tube([[1.2, 0, 1.75], [2.3, 0, 2.0], [2.9, -1.2, 2.0], [2.9, -2.6, 1.2]], 0.07, C.red, { rough: 0.6 });
      const w2 = tube([[-1.2, 0, 1.75], [-2.3, 0, 2.0], [-2.9, -1.2, 2.0], [-2.9, -2.6, 1.2]], 0.07, C.black, { rough: 0.6 });
      st.add(b1, b2, w1, w2);
      const flowIn = new Flow([[2.9, -2.6, 1.2], [2.9, -1.2, 2.0], [2.3, 0, 2.0], [1.2, 0, 1.75]], 6, { size: 0.09 });
      const flowOut = new Flow([[-1.2, 0, 1.75], [-2.3, 0, 2.0], [-2.9, -1.2, 2.0], [-2.9, -2.6, 1.2]], 6, { size: 0.09 });
      st.add(flowIn.object, flowOut.object);
      const push = [arrow(1.1, C.volt, 0.07), arrow(1.1, C.volt, 0.07)];
      push.forEach((a) => st.add(a));
      st.label('N', new THREE.Vector3(-1.58, 0, 1.2), { tone: 'warn' });
      st.label('S', new THREE.Vector3(1.58, 0, 1.2), {});
      st.label('Fixed magnets (the stator)', new THREE.Vector3(-1.4, 1.6, 1.1), { dy: -26, tip: 'Permanent magnets. North on one side, south on the other. They pull and push on whichever coils are switched on.' });
      st.label('Brush', b1, { dy: 26, tip: 'A block of carbon on a spring. It rubs on the commutator to pass current from the wire into the spinning rotor.' });
      st.label('Commutator', new THREE.Vector3(0, 0, 2.1), { dy: -24, tip: 'A ring of five copper bars, one pair per coil. As it turns, each bar slides from one brush to the other, which flips that coil’s current at exactly the right moment.' });
      const coilLbl = st.label('Coil = electromagnet', rot.coils[0].anchor, { tone: 'volt' });
      let th = 0.3, rpm = 0, amps = 0;
      const nCol = new THREE.Color(C.red), sCol = new THREE.Color(C.blue), cu = new THREE.Color(C.copper);
      const handle = ghost(2.7, 2.7, 2.2);
      st.add(handle);
      return {
        view: { pos: [1.6, 1.4, 13], target: [0, -0.2, 0.6] },
        handles: [{ obj: handle, id: 'volts', axis: 'y', span: 300, hint: 'Drag up for more volts', dy: 30 }],
        tick(dt) {
          const V = S.volts, load = S.load / 100, dir = Math.sign(V);
          const free = Math.abs(V) / 12;
          const speed = Math.max(0, free - load);          // fraction of 6000 rpm
          rpm = speed * FREE_RPM;
          const tqFrac = V === 0 ? 0 : Math.min(load, free); // how much of stall torque is being delivered
          amps = V === 0 ? 0 : IDLE_A + (STALL_A - IDLE_A) * tqFrac;
          const stalled = V !== 0 && speed === 0;
          th += dir * speed * dt * (S.slow === 'slow' ? 1.5 : 9);
          spin.rotation.z = th;
          const strength = clamp(amps / 4, 0, 1);
          rot.coils.forEach((c, i) => {
            const a = th + c.userData.a, s = Math.sin(a) * dir; // upper half is south when turning counter-clockwise
            const m = coilMats[i];
            if (V === 0) { m.color.copy(cu); m.emissiveIntensity = 0; return; }
            const k = smooth(clamp(Math.abs(Math.sin(a)) * 2.5, 0, 1));
            m.color.copy(cu).lerp(s > 0 ? sCol : nCol, k * 0.85);
            m.emissive.copy(s > 0 ? sCol : nCol);
            m.emissiveIntensity = k * (0.25 + strength * 0.6);
          });
          const flowing = V !== 0;
          flowIn.object.visible = flowOut.object.visible = flowing;
          if (flowing) { flowIn.advance(dir * dt * (0.08 + amps * 0.05)); flowOut.advance(dir * dt * (0.08 + amps * 0.05)); }
          push.forEach((a, i) => {
            a.visible = flowing;
            const y = i ? -1.75 : 1.75, len = 0.5 + strength * 0.9;
            a.position.set(0, y, 1.3);
            a.rotation.z = (i ? -1 : 1) * dir * (Math.PI / 2);
            a.scale.set(1, len, 1);
          });
          coilLbl.show(S.slow === 'slow' || speed === 0);
          const watts = Math.abs(V) * amps, mech = (rpm / FREE_RPM) * tqFrac * 12 * STALL_A * 0.82;
          ui.out('rpm', `${Math.round(rpm).toLocaleString('en-US')} rpm`, V === 0 ? 'no power' : dir > 0 ? 'forwards' : 'backwards');
          ui.out('amps', `${amps.toFixed(1)} A`);
          ui.out('tq', `${(tqFrac * STALL_NCM).toFixed(1)} N·cm`, 'before the gearbox');
          ui.out('heat', watts > 0 ? `${Math.round(clamp(1 - mech / watts, 0, 1) * 100)}%` : '0%');
          ui.tone('amps', stalled ? 'warn' : '');
          ui.tone('heat', stalled ? 'warn' : '');
          ui.note(V === 0 ? 'No volts, no electromagnets. The rotor coasts to a stop. Drag the volts slider.'
            : stalled ? '<b>Stalled.</b> The load is more than the motor can push at this voltage. Current is at its highest and every bit of it is turning into heat. Give it more volts or less load.'
            : load > free * 0.6 ? 'Working hard: slower, but pulling more current and pushing with more force.'
            : 'Yellow arrows show the push on the rotor. More volts, more speed. More load, more current.', stalled ? 'warn' : '');
        },
      };
    },
  };
  function ringPts(r) { const p = []; for (let i = 0; i < 64; i++) p.push([Math.cos((i / 64) * TAU) * r, Math.sin((i / 64) * TAU) * r]); return p; }

  // ------------------------------------------------------------ 3. Gearbox
  const gears = {
    id: 'gears', tab: 'Planetary gears',
    title: 'Trading speed for muscle',
    lead: 'The small yellow <b>sun gear</b> spins fast. It drives three <b>planet gears</b> that roll around inside a fixed <b>ring gear</b>, like planets orbiting the sun. The planets drag a plate called the <b>carrier</b> round with them, much more slowly. Slower means stronger. Stack stages and the effect multiplies.',
    try: 'Drag the gears sideways to change the motor speed. Follow the yellow bar.',
    controls: [
      { type: 'seg', id: 'ratio', label: 'Pick a gearbox', value: myRatio, options: Object.keys(RATIOS).map((k) => [k, `${k}:1`]) },
      { type: 'range', id: 'mrpm', label: 'Motor speed', min: 0, max: 6000, step: 100, value: 3000, fmt: (v) => `${v.toLocaleString('en-US')} rpm` },
      { type: 'seg', id: 'ringOn', label: 'Ring gear', value: 'show', options: [['show', 'Show'], ['ghost', 'See through']] },
    ],
    readouts: [['gin', 'Sun gear (in)'], ['gout', 'Output shaft'], ['gx', 'Turning force', 'compared with the bare motor'], ['gst', 'Stages']],
    more: [
      ['Where do numbers like 19.2 come from?', 'Count teeth. The ring has 46. With a 17-tooth sun, one stage slows things by 1 + 46 ÷ 17 = <b>3.7</b>. With an 11-tooth sun it is 1 + 46 ÷ 11 = <b>5.2</b>. Your drive motors use one of each: 3.7 × 5.2 = <b>19.2</b>. The intake motor uses three 3.7 stages: 3.7 × 3.7 × 3.7 = <b>50.9</b>.'],
      ['Why planetary and not just two gears?', 'Three planets share the load, so the teeth can be small without breaking. The input and output are in a straight line, so the gearbox is a neat cylinder the same width as the motor. And you can stack stages like pancakes.'],
      ['Is anything lost?', 'A little. Teeth rubbing on teeth turn some energy into heat and noise, roughly 5 to 10 percent per stage. That is why the 50.9:1 gearbox gives a bit less than 50.9 times the force.'],
      ['Which should a robot use?', 'Low ratios for things that must be fast, like a flywheel. High ratios for things that must be strong, like an arm lifting a heavy load. A drivetrain sits in the middle: 19.2:1 on these wheels is about walking pace with plenty of shove.'],
    ],
    build(st, S, ui) {
      const holder = group();
      st.add(holder);
      let gb = null, flag = null, th = 0, lbls = [];
      const m = 0.16;
      function rebuild() {
        st.disposeTree(holder);
        holder.clear();
        const suns = RATIOS[S.ratio], gap = 2.6;
        gb = gearbox(suns, m, 0.9, gap);
        gb.g.position.z = -((suns.length - 1) * gap) / 2;
        holder.add(gb.g);
        gb.g.add(cyl(0.3, 1.6, metal(C.steel, 0.25), { axis: 'z', seg: 20, pos: [0, 0, -1.1] }));
        const zo = (suns.length - 1) * gap + 1.6;
        flag = group(cyl(0.55, 1.6, metal(C.steel, 0.22), { axis: 'z', seg: 6 }), box(5.6, 0.36, 0.24, C.volt, { r: 0.05, pos: [2.7, 0, 0.6] }));
        flag.position.z = zo;
        gb.g.add(flag);
        ringLook();
        st.setView([-(9 + suns.length * 2.5), 4.5, -(13 + suns.length * 3)], [0, 0, 0.4], 600);
      }
      function ringLook() {
        for (const sg of gb.stages) {
          sg.ring.material.transparent = S.ringOn === 'ghost';
          sg.ring.material.opacity = S.ringOn === 'ghost' ? 0.16 : 1;
          sg.ring.material.depthWrite = S.ringOn !== 'ghost';
        }
      }
      const lSun = st.label('Sun gear', new THREE.Vector3(), { tone: 'volt', dy: -4 });
      const lPl = st.label('Planet gear', new THREE.Vector3(), { dy: -30, tip: 'Three of them share the load. Each one spins on its own pin while the whole set walks round inside the ring.' });
      const lRing = st.label('Ring gear (does not turn)', new THREE.Vector3(), { dy: -16, tip: 'Teeth on the inside, 46 of them. It is fixed to the gearbox case, so the planets have something to push against.' });
      const lCar = st.label('Carrier', new THREE.Vector3(), { dy: 20, tip: 'The plate that holds the planet pins. It turns at the speed the planets orbit, which is the slow, strong output of the stage.' });
      const handle = ghost(9, 9, 4);
      st.add(handle);
      function apply(id) {
        if (id !== 'mrpm' && id !== 'ringOn') rebuild();
        if (id === 'ringOn') ringLook();
        const suns = RATIOS[S.ratio], r = totalRatio(suns);
        ui.out('gin', `${S.mrpm.toLocaleString('en-US')} rpm`);
        ui.out('gout', `${Math.round(S.mrpm / r).toLocaleString('en-US')} rpm`, `${r.toFixed(1)}× slower`);
        ui.out('gx', `× ${(r * Math.pow(0.93, suns.length)).toFixed(1)}`);
        ui.out('gst', String(suns.length), suns.map((s) => `${stageRatio(s).toFixed(1)}`).join(' × ') + (suns.length > 1 ? ` = ${r.toFixed(1)}` : ''));
        ui.note(S.ratio === myRatio ? `<b>This is the gearbox in the part you clicked.</b> At full speed its shaft turns about ${Math.round(outRpm)} times a minute.`
          : S.ratio === '3.7' ? 'One stage with a big 17-tooth sun. Fast and not very strong.'
          : S.ratio === '5.2' ? 'A smaller 11-tooth sun has to turn more times to walk the planets round. Slower, stronger.'
          : 'Each stage’s carrier turns the next stage’s sun. Follow the yellow bar on the end to see how slowly the output moves.');
      }
      apply();
      const v = new THREE.Vector3();
      return {
        change: apply,
        handles: [{ obj: handle, id: 'mrpm', axis: 'x', span: 360, hint: 'Drag to change speed', dy: 60 }],
        tick(dt) {
          th += dt * (S.mrpm / 6000) * 5.5;
          const a = gb.update(th);
          flag.rotation.z = a;
          const s0 = gb.stages[0];
          lSun.to(s0.sun.getWorldPosition(v).clone());
          lPl.to(s0.planets[0]);
          lCar.to(gb.stages[gb.stages.length - 1].carrier);
          const R = (RING * m) / 2 + 3.2 * m;
          lRing.to(new THREE.Vector3(0, R, gb.g.position.z));
        },
      };
    },
  };

  // ------------------------------------------------------------ 4. How it's made
  const STEPS = [
    ['Stamp', 'The rotor core is not one lump of steel. A press punches hundreds of thin plates a minute out of a steel strip, each one coated with a film of insulation. They are stacked like a deck of cards. Thin plates waste far less energy as heat than a solid block would.'],
    ['Wind', 'A winding machine whips enamel-coated copper wire around each tooth, hundreds of turns in a few seconds. The enamel is a paint-thin layer of insulation that keeps each turn from shorting to its neighbour.'],
    ['Magnetise', 'The curved magnets are pressed from powder and baked hard. They go into the can as plain grey blocks. Then a huge pulse of current through a coil around the can turns them into permanent magnets in a split second.'],
    ['Cut gears', 'Gears start as plain steel discs. A spinning cutter called a hob, shaped like a screw with teeth, is fed across the disc while both turn in step. It carves every tooth in one pass. Then the gears are heated and quenched to make them hard.'],
    ['Test', 'Rotor, brushes, gears and grease go together. Every motor is run on a test stand that checks its speed, current and noise before it gets a label.'],
  ];
  const made = {
    id: 'made', tab: 'How it’s made',
    title: 'Stamped, wound, zapped and cut',
    lead: 'A motor has more than fifty parts, and almost every one is made by a machine doing a single job over and over. Step through the five big ones.',
    try: 'Pick a station, then change the line speed.',
    controls: [
      { type: 'seg', id: 'mstep', label: 'Station', value: 0, options: STEPS.map((s, i) => [i, `${i + 1} ${s[0]}`]) },
      { type: 'range', id: 'mspeed', label: 'Line speed', min: 0, max: 200, value: 100, unit: '%' },
    ],
    more: [
      ['Where does the copper come from?', 'Copper ore is mined mostly in Chile, Peru and the Congo, crushed, and purified using electricity until it is 99.99% copper. It is pulled through smaller and smaller holes, called dies, until it is a wire thinner than pencil lead.'],
      ['What are the magnets made of?', 'Small motors like this usually use ferrite: iron oxide (basically refined rust) mixed with strontium. It is cheap and does not rust. Stronger motors use neodymium magnets, which are far more powerful and more expensive.'],
      ['Stamping shows up again', 'The motor’s steel can and end plates are stamped too: a press pushes flat sheet through dies to cup it into shape, the same deep-drawing trick used for battery cans.'],
    ],
    build(st, S, ui) {
      const X = 0, stations = []; // every station stands on the same spot; only the chosen one shows
      const WHITE = '#D9DAD2';
      for (let i = 0; i < 5; i++) {
        const g = group(); st.add(g); stations.push(g);
        st.label(`${i + 1}. ${STEPS[i][0]}`, g, { tone: 'volt', off: new THREE.Vector3(0, i === 0 ? 4.2 : 3.6, 0) });
      }
      // 1 Stamp
      const s1 = group(); s1.position.y = -0.65;
      const strip = box(6, 0.05, 1.5, metal('#AEB4B6', 0.35), { r: 0, pos: [0, -0.2, 0] });
      const press = part('F_press', { scale: 0.62, pos: [0, -0.27, 0] });
      const punch = part('F_ram', { pos: [0, 1.6, 0] });
      press.children[0].add(punch);
      const lam = mesh(laminationGeo(0.05), metal('#C3C8CA', 0.3)); lam.rotation.x = Math.PI / 2; lam.scale.setScalar(0.55);
      const stack = group();
      for (let i = 0; i < 14; i++) { const l = mesh(lam.geometry, lam.material); l.rotation.x = Math.PI / 2; l.scale.setScalar(0.55); l.position.set(2.6, -1.66 + i * 0.07, 1.6); stack.add(l); }
      const holes = group();
      for (let i = 0; i < 4; i++) holes.add(cyl(0.66, 0.06, '#2A2D2E', { pos: [0, -0.2, 0], seg: 20 }));
      s1.add(strip, lam, holes);
      stations[0].add(s1, press, stack, cyl(0.75, 0.12, plastic(C.dark), { pos: [2.6, -1.72, 1.6], seg: 32 }));
      st.label('Finished plates', stack, { off: new THREE.Vector3(2.6, -0.5, 1.6), tip: 'Each plate is about half a millimetre thick. A stack of them does the same job as a solid block, but wastes far less energy as heat.' });
      // 2 Wind
      const wr = rotor(2.0); wr.g.rotation.y = Math.PI / 2;
      const spool = group(cyl(0.7, 1.2, mat(C.copper, { metal: 0.7, rough: 0.35 }), { axis: 'z' }), cyl(0.9, 0.1, C.dark, { axis: 'z', pos: [0, 0, 0.65] }), cyl(0.9, 0.1, C.dark, { axis: 'z', pos: [0, 0, -0.65] }));
      spool.position.set(-2.6, 1.6, 0);
      const flyer = group(cyl(0.05, 1.6, metal(C.steel), { pos: [0, 0.8, 0] }), ball(0.12, C.volt, { pos: [0, 1.6, 0], glow: true }));
      const wireFlow = new Flow([[-2.6, 1.6, 0], [-1.2, 2.0, 0], [0, 1.5, 0]], 6, { color: C.copper, size: 0.08 });
      stations[1].add(wr.g, spool, flyer, wireFlow.object, cyl(0.16, 4.4, metal(C.steel, 0.25), { axis: 'x' }), cyl(0.5, 0.7, plastic(WHITE, 0.4), { axis: 'x', pos: [2.3, 0, 0], seg: 40 }), box(0.5, 1.9, 1.2, plastic(WHITE, 0.4), { r: 0.1, pos: [2.9, -0.85, 0] }), cyl(0.12, 3.4, metal(C.alu, 0.35), { pos: [-2.6, -0.1, 0] }), bench(7.4, 3, -1.8));
      st.label('Copper wire', spool, { dy: -34, tip: 'Coated in a paint-thin layer of enamel so the turns do not short against each other. Each tooth gets hundreds of turns.' });
      // 3 Magnetise
      const mc = part('M_can', { axis: 'z', scale: [0.86, 0.68, 0.86] }); mc.rotation.z = -0.4;
      const mg1 = magnet('#8B8F90', 0.86, 2.2); mg1.rotation.z = Math.PI / 2;
      const mg2 = magnet('#8B8F90', 0.86, 2.2); mg2.rotation.z = -Math.PI / 2;
      const zap = group();
      for (let i = 0; i < 5; i++) zap.add(mesh(new THREE.TorusGeometry(1.9, 0.12, 10, 40), mat(C.copper, { metal: 0.7, rough: 0.35, glow: '#FFD23A', glowPower: 0 }), [0, 0, (i - 2) * 0.5]));
      stations[2].add(mc, mg1, mg2, zap, box(3.2, 0.5, 3.2, plastic(C.dark), { r: 0.1, pos: [0, -2.1, 0] }), cyl(0.5, 0.6, plastic(WHITE, 0.4), { pos: [0, -1.75, 0], seg: 32 }), bench(6, 4, -2.35, 0.7));
      const zapLbl = st.label('ZAP', new THREE.Vector3(0, 2.4, 0), { tone: 'warn' });
      // 4 Hob a gear
      const blank = cyl(1.42, 0.7, metal('#9BA1A3', 0.4), { axis: 'z', seg: 48 });
      const cut = mesh(gearGeo({ teeth: 22, pitchR: 1.25, m: 0.114, width: 0.72, bore: 0.3 }), metal('#C3C8CA', 0.3));
      const hob = mesh(gearGeo({ teeth: 10, pitchR: 0.6, m: 0.12, width: 1.6 }), metal('#D9B23A', 0.3));
      hob.rotation.x = Math.PI / 2; hob.position.set(1.95, 0, 0);
      const chips = new Flow([[1.4, 0, 0.2], [1.8, -0.8, 0.8], [2.0, -1.7, 1.4]], 7, { color: '#FFD23A', size: 0.06 });
      const gearG = group(blank, cut);
      stations[3].add(gearG, hob, chips.object, cyl(0.3, 2.6, metal(C.steel, 0.25), { axis: 'z', pos: [0, 0, -1.2] }), cyl(1.0, 0.7, plastic(WHITE, 0.4), { axis: 'z', pos: [0, 0, -2.2], seg: 40 }), cyl(0.2, 3.6, metal(C.steel, 0.25), { pos: [1.95, 0, 0] }), cyl(0.6, 0.8, plastic(WHITE, 0.4), { pos: [1.95, 2.0, 0], seg: 40 }), box(5.5, 4.6, 0.3, plastic(WHITE, 0.4), { r: 0.1, pos: [0.6, 0.3, -2.7] }), bench(6.4, 4.2, -2.0, 0.8));
      st.label('Hob', hob, { dy: -30, tip: 'A cutter shaped like a screw with teeth. It turns in step with the gear blank and carves every tooth as it feeds across.' });
      // 5 Test
      const tmm = miniMotor(0.5), tm = tmm.g;
      tm.position.set(-1.2, -0.6, 0);
      const disc = group(cyl(1.0, 0.25, C.dark, { axis: 'x' }), box(0.27, 1.7, 0.25, C.volt, { r: 0.04 }));
      disc.position.set(1.5, -0.6, 0);
      const cradle = group(box(0.5, 0.75, 2.0, metal(C.iron, 0.5), { r: 0.05, pos: [-1.6, -1.1, 0] }), box(0.5, 0.75, 2.0, metal(C.iron, 0.5), { r: 0.05, pos: [-0.2, -1.1, 0] }));
      const stand = box(4.6, 0.3, 2.2, metal(C.iron, 0.5), { r: 0.06, pos: [0, -1.55, 0] });
      stations[4].add(tm, disc, stand, cradle);
      const testLbl = st.label(`${Math.round(outRpm)} rpm  pass`, new THREE.Vector3(0.5, 1.4, 0), {});
      let ph = 0;
      const grey = new THREE.Color('#8B8F90'), red = new THREE.Color(C.red), blue = new THREE.Color(C.blue);
      function focus() {
        const i = Number(S.mstep);
        stations.forEach((g, n) => { g.visible = n === i; });
        st.ground(-3.2);
        st.setView(i === 0 ? [7, 5, 16.5] : [5.5, 4.4, 13.5], [0, i === 0 ? 0.6 : -0.4, 0], 0);
        ui.note(`<b>${STEPS[i][0]}.</b> ${STEPS[i][1]}`);
      }
      focus();
      return {
        change(id) { if (id === 'mstep') focus(); },
        tick(dt) {
          const sp = S.mspeed / 100;
          ph += dt * sp * 0.5;
          const k = ph % 1;
          // 1: punch comes down, a plate drops out, the strip moves on
          const hit = Math.sin(clamp(span(k, 0.1, 0.5), 0, 1) * Math.PI);
          punch.position.y = 1.6 - hit * 1.1;
          lam.visible = k > 0.3 && k < 0.95;
          lam.position.set(lerp(0, 2.6, smooth(span(k, 0.45, 0.9))), -0.3 + Math.sin(span(k, 0.45, 0.9) * Math.PI) * 0.6 + smooth(span(k, 0.45, 0.9)) * 0.3, lerp(0, 1.6, smooth(span(k, 0.45, 0.9))));
          holes.children.forEach((h, i) => { h.position.x = (i + smooth(span(k, 0.55, 1))) * 1.9 - (k > 0.3 ? 0 : 1.9) * 0; h.visible = i > 0 || k > 0.3; });
          // 2: flyer arm whirls round one tooth, the spool pays out wire
          flyer.rotation.x = ph * 22;
          spool.rotation.z = -ph * 6;
          wireFlow.advance(dt * sp * 1.2);
          wr.g.rotation.x = Math.floor(ph * 0.6) * (TAU / 5);
          // 3: charge up, zap, magnets take their colours
          const z = span(k, 0.45, 0.55), lit = z > 0 && z < 1;
          zap.children.forEach((t) => { t.material.emissiveIntensity = lit ? 2.5 : smooth(span(k, 0.1, 0.45)) * 0.5; });
          const done = smooth(span(k, 0.5, 0.6)) * (1 - smooth(span(k, 0.95, 1)));
          mg1.userData.m.color.copy(grey).lerp(red, done);
          mg2.userData.m.color.copy(grey).lerp(blue, done);
          zapLbl.show(lit && Number(S.mstep) === 2);
          // 4: hob turns, the blank shrinks away to leave teeth
          gearG.rotation.z = ph * 1.2;
          hob.rotation.z = 0; hob.rotation.y = ph * 9;
          const cutK = smooth(span(k, 0.05, 0.85));
          blank.scale.set(1 - cutK * 0.22, 1 - cutK * 0.22, 1.02);
          hob.position.x = 2.1 - cutK * 0.2;
          chips.advance(dt * sp * 1.5);
          chips.object.visible = k > 0.05 && k < 0.85;
          // 5
          disc.rotation.x = tmm.shaft.rotation.x = tmm.core.rotation.x = ph * 14;
          testLbl.show(k > 0.5 && Number(S.mstep) === 4);
        },
      };
    },
  };

  // ------------------------------------------------------------ 5. On the robot
  const ppr = 28 * totalRatio(RATIOS[myRatio]);
  const drives = job === 'drive';
  const onRobot = {
    id: 'robot', tab: 'On the robot',
    title: 'Your code is the throttle',
    lead: `The Control Hub does not just switch this motor on and off. Your code asks for a power between -1 and 1, and the hub flicks the battery on and off thousands of times a second to deliver that fraction. Meanwhile the <b>encoder</b> on the back counts every turn, so your code knows exactly how far the ${drives ? 'wheel' : job === 'launcher' ? 'flywheel' : 'intake'} has gone.`,
    try: 'Drag the wheel up or down, or turn the knob. Watch the sensors blink.',
    controls: [
      { type: 'knob', id: 'pow', label: 'Power in your code', min: -1, max: 1, step: 0.05, value: 0.6, fmt: (v) => v.toFixed(2) },
      { type: 'button', id: 'zero', label: 'Reset the tick counter' },
    ],
    readouts: [['orpm', 'Shaft speed'], ['tps', 'Encoder ticks', 'per second'], ['ticks', 'Ticks counted'], [drives ? 'spd' : 'turns', drives ? 'Robot speed' : 'Shaft turns']],
    more: [
      ['How does an encoder count?', 'A small magnet on the back of the motor shaft spins past two Hall sensors: chips that notice a magnetic field. Each pass makes an electrical pulse, or "tick". There are two sensors, slightly offset, so the hub can tell which one fires first. That tells it which way the motor is turning.'],
      ['Why so many ticks?', `The magnet gives 28 ticks for each turn of the <i>motor</i>. But the motor turns ${totalRatio(RATIOS[myRatio]).toFixed(1)} times for each turn of the output shaft, so you get 28 × ${totalRatio(RATIOS[myRatio]).toFixed(1)} = <b>${ppr.toFixed(1)} ticks per shaft turn</b>. That is fine enough to place a wheel within a fraction of a millimetre.`],
      ['What is this good for?', 'Autonomous mode. "Drive forward 60 cm" becomes "run until the encoder has counted 986 more ticks". It also lets code hold a flywheel at an exact speed even as the battery sags, which makes every shot land in the same place.'],
      ['How does half power work?', 'It is called PWM: pulse width modulation. For half power the hub connects the battery for half of each tiny slice of time. The motor is too heavy to follow the flicker, so it just feels half the push.'],
    ],
    build(st, S, ui) {
      const mm = miniMotor(0.62, 1.3, false), body = mm.g, shaft = mm.shaft;
      const cap = cyl(1.0, 0.9, C.dark, { axis: 'x', open: true, double: true, opacity: 0.28, pos: [-2.0, 0, 0] });
      const board = part('M_enc_board', { axis: 'x', scale: 0.72, pos: [-2.32, 0, 0] });
      const hallA = box(0.14, 0.26, 0.26, C.black, { pos: [-2.22, 0.55, 0.22], glow: C.volt, glowPower: 0 });
      const hallB = box(0.14, 0.26, 0.26, C.black, { pos: [-2.22, 0.55, -0.22], glow: C.volt, glowPower: 0 });
      const mag = group();
      for (let i = 0; i < 14; i++) {
        const sgm = mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.22, 6, 1, false, (i / 14) * TAU, TAU / 14), mat(i % 2 ? C.blue : C.red, { rough: 0.5 }));
        sgm.geometry.rotateZ(-Math.PI / 2);
        mag.add(sgm);
      }
      mag.position.x = -1.95;
      const wheel = group();
      if (drives) {
        wheel.add(part('W_mecanum', { axis: 'x' }));
      } else {
        wheel.add(cyl(1.7, 0.7, job === 'launcher' ? C.orange : C.teal, { axis: 'x', seg: 40, rough: 0.6 }), box(0.72, 3.0, 0.3, C.dark, { r: 0.05 }));
      }
      wheel.position.x = 3.45;
      st.add(body, cap, board, hallA, hallB, mag, wheel);
      st.label('Encoder magnet', mag, { dy: 36, tip: 'A ring of tiny north and south poles on the tail of the motor shaft. It spins with the rotor.' });
      const la = st.label('Hall sensor A', hallA, { dy: -28, tip: 'A chip that notices a magnetic field. It blinks on each time a pole passes. A second sensor next to it fires slightly later, which tells the hub which way the shaft is turning.' });
      st.label(drives ? 'Mecanum wheel' : job === 'launcher' ? 'Flywheel' : 'Intake', wheel, { dy: -84 });
      let th = 0, ticks = S.tickCount || 0;
      const name = drives ? 'leftFront' : job;
      return {
        view: { pos: [-2.5, 4.5, 13.5], target: [0.6, 0, 0] },
        change(id) { if (id === 'zero') ticks = 0; },
        handles: [{ obj: wheel, id: 'pow', axis: 'y', span: 260, hint: 'Drag the wheel to set the power', dy: -20 }],
        dispose() { S.tickCount = ticks; },
        tick(dt) {
          const p = S.pow, rpm = p * outRpm;
          th += dt * p * 2.4;
          wheel.rotation.x = shaft.rotation.x = th;
          mm.core.rotation.x = th * 3.1;
          mag.rotation.x = th * 3.1; // the motor end turns many times faster; slowed here so you can see it
          const pole = Math.floor(((mag.rotation.x / TAU) * 14 % 2 + 2) % 2);
          hallA.material.emissiveIntensity = pole === 0 && p !== 0 ? 2 : 0;
          hallB.material.emissiveIntensity = Math.floor((((mag.rotation.x / TAU) * 14 + 0.5) % 2 + 2) % 2) === 0 && p !== 0 ? 2 : 0;
          const tps = (rpm / 60) * ppr;
          ticks += tps * dt;
          ui.hud(`<pre>${name}.setPower(<i>${p.toFixed(2)}</i>);\nint ticks = ${name}.getCurrentPosition(); <i>// ${Math.round(ticks).toLocaleString('en-US')}</i></pre>`);
          ui.out('orpm', `${Math.round(rpm)} rpm`, p === 0 ? 'stopped' : p > 0 ? 'forwards' : 'backwards');
          ui.out('tps', Math.round(tps).toLocaleString('en-US'));
          ui.out('ticks', Math.round(ticks).toLocaleString('en-US'), `${ppr.toFixed(1)} per shaft turn`);
          if (drives) ui.out('spd', `${(Math.abs(rpm) / 60 * Math.PI * 0.104).toFixed(2)} m/s`, '104 mm wheel');
          else ui.out('turns', (ticks / ppr).toFixed(1));
          la.show(true);
          ui.note(p === 0 ? 'Power 0: the hub sends nothing. The counter holds its number, so the robot still knows where the shaft is.' : Math.abs(p) === 1 ? `Full power: the shaft tops out near ${Math.round(outRpm)} rpm with no load.` : 'Turn the knob. The sensors blink each time a magnet pole passes, and the hub adds or subtracts a tick.');
        },
      };
    },
  };

  return { title: `${myRatio === '50.9' ? 'Intake' : job === 'launcher' ? 'Launcher' : 'Drive'} motor`, chapters: [openUp, why, gears, made, onRobot] };
}
