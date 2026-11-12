// Frame deep dive: the aluminium U-channel, from red rock in the ground to a drilled, anodised rail.
// Ore to metal, extrusion (and how that differs from stamping), hole making, finishing, and why a U.
import { THREE, C, mat, metal, plastic, mesh, cyl, box, ball, bench, group, tube, Flow, part, ghost, plateGeo, clamp, lerp, smooth, span, TAU } from './kit.js';

const ALU = '#CFD2D1';
// Cross-sections, 1 unit = 10 mm. goBILDA channel is 48 mm wide and 48 mm tall with 2.5 mm walls.
const W = 4.8, T = 0.25;
const SHAPES = {
  u: [[-W / 2, 0], [W / 2, 0], [W / 2, -W], [W / 2 - T, -W], [W / 2 - T, -T], [-W / 2 + T, -T], [-W / 2 + T, -W], [-W / 2, -W]],
  l: [[-W / 2, 0], [W / 2, 0], [W / 2, -T], [-W / 2 + T, -T], [-W / 2 + T, -W], [-W / 2, -W]],
  flat: [[-W / 2, 0], [W / 2, 0], [W / 2, -T], [-W / 2, -T]],
  box: [[-W / 2, 0], [W / 2, 0], [W / 2, -W], [-W / 2, -W]],
};
function profileGeo(kind, len, steps = 1) {
  const s = new THREE.Shape(SHAPES[kind].map(([x, y]) => new THREE.Vector2(x, y)));
  if (kind === 'box') {
    const h = new THREE.Path([[-W / 2 + T, -T], [-W / 2 + T, -W + T], [W / 2 - T, -W + T], [W / 2 - T, -T]].map(([x, y]) => new THREE.Vector2(x, y)));
    s.holes.push(h);
  }
  return new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false, steps }); // runs from z = 0 to z = len
}
function tubeProfileGeo(len) {
  const s = new THREE.Shape(); s.absarc(0, -W / 2, W / 2, 0, TAU, false);
  const h = new THREE.Path(); h.absarc(0, -W / 2, W / 2 - T, 0, TAU, true); s.holes.push(h);
  return new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false, curveSegments: 32 });
}
const rock = (r, color) => mesh(new THREE.DodecahedronGeometry(r, 0), mat(color, { rough: 0.9 }));
const heat = (t) => new THREE.Color().setHSL(0.02 + clamp(t, 0, 1) * 0.1, 1, 0.12 + clamp(t, 0, 1) * 0.45); // dull red → bright orange

export default function frame(ctx) {
  // ------------------------------------------------------------ 1. Rock to metal
  const STEPS = [
    ['Mine', 'Aluminium starts as <b>bauxite</b>, a crumbly red-brown rock dug from huge open pits in Australia, Guinea and Brazil. It is red for the same reason rust is: iron. Only about half of it is the stuff we want.'],
    ['Refine', 'The rock is crushed and cooked in hot caustic soda, which dissolves the aluminium part and leaves the rest behind as red mud. Out comes <b>alumina</b>: a fine white powder that looks like sugar. It is aluminium locked tightly to oxygen.'],
    ['Smelt', 'Heat alone cannot pull aluminium and oxygen apart. Electricity can. The powder is dissolved in a glowing bath at 960 °C and an enormous current is driven through it. Liquid aluminium sinks to the bottom of the pot.'],
    ['Cast', 'The liquid metal is mixed with a pinch of magnesium and silicon to make the strong alloy <b>6061</b>, then poured into tall moulds and cooled with water. The result is a log called a <b>billet</b>, as long as a bus.'],
  ];
  const ore = {
    id: 'ore', tab: 'Rock to metal',
    title: 'Your robot used to be red dirt',
    lead: 'Aluminium is the most common metal in the Earth’s crust, but you never find a lump of it lying around. It is always locked up inside rock. Getting it out takes four big steps and a shocking amount of electricity.',
    try: 'Step through the four stages, then slide to see what a kilogram really costs.',
    controls: [
      { type: 'seg', id: 'ostep', label: 'Step', value: 0, options: STEPS.map((s, i) => [i, `${i + 1} ${s[0]}`]) },
      { type: 'range', id: 'kg', label: 'Aluminium you want', min: 0.5, max: 5, step: 0.5, value: 1, fmt: (v) => `${v} kg` },
    ],
    readouts: [['rockKg', 'Bauxite to dig up'], ['kwh', 'Electricity to smelt it'], ['charges', 'Same as charging your robot battery', 'times']],
    more: [
      ['Why does it need so much electricity?', 'Aluminium atoms hold on to oxygen far more tightly than iron does. Breaking that grip takes about 15 kilowatt-hours for every kilogram: enough to run a home fridge for two weeks. Smelters are built next to hydroelectric dams for exactly this reason.'],
      ['It once cost more than gold', 'Before the electric method was invented in 1886 (by two 22-year-olds working separately, Charles Hall and Paul Héroult), aluminium was so hard to make that Napoleon III of France served his most important guests with aluminium cutlery. Everyone else got gold.'],
      ['Is this where the frame of our robot started?', 'Possibly not from rock. Recycling aluminium takes only about 5% of the energy of making it new, and it can be melted and reused forever. A lot of the aluminium in use today has been something else before: a drink can, a window frame, a car.'],
      ['How much is in the robot?', 'One 432 mm side rail of the StarterBot weighs roughly 400 grams. The whole frame is around 2 kg of aluminium. Try setting the slider to 2.'],
    ],
    build(st, S, ui) {
      const X = 0, stations = []; // every step stands on the same spot; only the chosen one shows
      const YEL = '#E8B820';
      for (let i = 0; i < 4; i++) {
        const g = group(); st.add(g); stations.push(g);
        st.label(`${i + 1}. ${STEPS[i][0]}`, g, { tone: 'volt', off: new THREE.Vector3(0, 4.2, 0) });
      }
      // 1 Mine: a pile of red rock and an excavator digging into it.
      for (let i = 0; i < 34; i++) { const r = rock(0.25 + Math.random() * 0.34, i % 4 === 0 ? '#8E4A2E' : i % 5 === 0 ? '#B86A3C' : C.ore); const a = Math.random() * TAU, d = Math.random() * 2.1; r.position.set(Math.cos(a) * d - 1.6, -1.6 + (2.1 - d) * 0.6 + Math.random() * 0.2, Math.sin(a) * d * 0.9); r.rotation.set(Math.random() * 3, Math.random() * 3, 0); stations[0].add(r); }
      const digger = group();
      for (const z of [-0.75, 0.75]) { digger.add(box(3.0, 0.62, 0.5, mat('#1F2223', { rough: 0.9 }), { r: 0.28, pos: [0, -1.5, z] })); for (let i = 0; i < 5; i++) digger.add(cyl(0.2, 0.54, metal(C.iron, 0.5), { axis: 'z', seg: 14, pos: [-1.1 + i * 0.55, -1.5, z] })); }
      digger.add(cyl(0.7, 0.22, metal(C.iron, 0.5), { pos: [0, -1.1, 0], seg: 32 }));
      const upper = group(mesh(plateGeo([[-1.5, 0], [1.3, 0], [1.3, 0.55], [0.4, 0.95], [-1.5, 0.95]], 1.7, [], 0.05), plastic(YEL, 0.45)), mesh(plateGeo([[-0.2, 0.95], [-1.15, 0.95], [-1.15, 1.5], [-0.9, 1.95], [-0.2, 1.95]].reverse(), 0.8, [], 0.04), plastic(YEL, 0.45), [0, 0, 0.42]), box(0.9, 0.62, 0.84, mat('#18222A', { rough: 0.1, metal: 0.6 }), { r: 0.03, pos: [-0.75, 1.5, 0.42] }), box(1.0, 0.7, 1.5, plastic(C.dark), { r: 0.08, pos: [0.75, 1.15, 0] }), cyl(0.09, 0.7, metal(C.steel, 0.3), { pos: [0.9, 1.8, -0.4] }));
      upper.position.y = -1.0;
      const arm = group(mesh(plateGeo([[0, -0.22], [0, 0.22], [-1.6, 1.75], [-2.9, 1.2], [-2.95, 0.95], [-1.6, 1.25]], 0.34, [], 0.03), plastic(YEL, 0.45)));
      const stick = group(mesh(plateGeo([[0.15, 0.2], [-0.15, 0.2], [-0.32, -2.0], [-0.02, -2.0]], 0.26, [], 0.03), plastic(YEL, 0.45)), cyl(0.5, 0.9, mat('#1F2223', { rough: 0.6, metal: 0.4 }), { axis: 'z', open: true, double: true, start: 0.3, theta: 3.4, pos: [-0.3, -2.3, 0] }), cyl(0.07, 1.5, metal(C.steel, 0.2), { pos: [0.25, -0.5, 0] }));
      stick.position.set(-2.9, 1.08, 0);
      arm.add(stick);
      arm.position.set(-0.2, 0.6, -0.35);
      upper.add(arm);
      digger.add(upper);
      digger.position.set(3.2, 0, 0);
      stations[0].add(digger);
      st.label('Bauxite', stations[0], { off: new THREE.Vector3(-1.9, 0.1, 0), tip: 'A soft red-brown rock. Roughly half of it is aluminium locked to oxygen. The red colour is iron, the same thing that makes rust red.' });
      // 2 Refine: red in, white powder out.
      const tank = group(cyl(1.3, 2.8, metal('#8C9396', 0.4), { open: true, double: true, seg: 56, pos: [-0.6, -0.3, 0] }), cyl(1.3, 0.1, metal('#8C9396', 0.4), { seg: 56, pos: [-0.6, -1.7, 0] }), mesh(new THREE.TorusGeometry(1.32, 0.07, 10, 56), metal(C.steel, 0.3), [-0.6, 1.1, 0], [Math.PI / 2, 0, 0]), mesh(new THREE.TorusGeometry(1.32, 0.05, 10, 56), metal(C.steel, 0.3), [-0.6, -0.4, 0], [Math.PI / 2, 0, 0]), tube([[0.7, 0.6, 0], [1.3, 0.75, 0.15], [1.7, 0.6, 0.22]], 0.16, metal(C.steel, 0.3)), box(2.6, 0.12, 1.0, mat('#2B2F30', { rough: 0.8 }), { r: 0.03, pos: [-2.4, 1.72, 0] }), cyl(0.18, 1.0, metal(C.steel, 0.3), { axis: 'z', pos: [-1.15, 1.72, 0] }), cyl(0.18, 1.0, metal(C.steel, 0.3), { axis: 'z', pos: [-3.65, 1.72, 0] }), cyl(0.09, 3.6, metal(C.alu, 0.4), { pos: [-3.4, -0.05, 0.3] }), cyl(0.09, 3.6, metal(C.alu, 0.4), { pos: [-3.4, -0.05, -0.3] }), box(2.2, 0.5, 2.2, plastic('#D9DAD2', 0.4), { r: 0.1, pos: [-0.6, 2.9, 0] }));
      tank.children[5].rotation.z = 0.12;
      const soup = cyl(1.25, 0.1, '#B5532F', { pos: [-0.6, 0.7, 0], rough: 0.3 });
      const paddle = group(cyl(0.08, 3.4, metal(C.steel), { pos: [0, 0.8, 0] }), box(1.8, 0.5, 0.08, metal(C.steel), { r: 0.02, pos: [0, -0.6, 0] }));
      paddle.position.set(-0.6, 0.2, 0);
      const pile = mesh(new THREE.ConeGeometry(1.2, 1.2, 36), mat('#F6F5EF', { rough: 0.95 }), [2.3, -1.2, 0.3]);
      const pour = new Flow([[0.7, 0.6, 0], [1.6, 0.8, 0.2], [2.3, -0.3, 0.3]], 8, { color: '#F6F5EF', size: 0.09 });
      const inFlow = new Flow([[-3.5, 1.75, 0], [-1.3, 2.05, 0], [-0.8, 0.9, 0]], 6, { color: C.ore, size: 0.15 });
      stations[1].add(tank, soup, paddle, pile, pour.object, inFlow.object);
      // 3 Smelt: carbon blocks in a glowing bath, current pouring through.
      const pot = group(box(4.6, 1.5, 2.6, mat('#2A2D2E', { rough: 0.7, metal: 0.4 }), { r: 0.1, pos: [0, -1.0, 0] }), box(4.9, 0.22, 2.9, metal(C.iron, 0.5), { r: 0.05, pos: [0, -0.35, 0] }), box(4.9, 0.22, 2.9, metal(C.iron, 0.5), { r: 0.05, pos: [0, -1.5, 0] }), box(4.2, 0.5, 2.2, mat('#FF7A1A', { glow: '#FF5A00', glowPower: 1.4, rough: 0.3 }), { r: 0.02, pos: [0, -0.25, 0] }), box(4.2, 0.16, 2.2, metal('#E3E6E6', 0.15), { r: 0.02, pos: [0, -0.62, 0] }));
      const anodes = group();
      for (let i = 0; i < 3; i++) anodes.add(box(1.0, 1.5, 1.6, '#1B1D1E', { r: 0.05, pos: [(i - 1) * 1.4, 0.55, 0] }), cyl(0.1, 1.4, metal(C.copper, 0.3), { pos: [(i - 1) * 1.4, 1.9, 0] }));
      const bus = box(4.6, 0.25, 0.4, metal(C.copper, 0.3), { r: 0.04, pos: [0, 2.6, 0] });
      const amps = new Flow([[-3.4, 2.6, 0], [0, 2.6, 0], [1.4, 2.6, 0], [1.4, 0.2, 0]], 10, { size: 0.11 });
      const bubbles = [...Array(10)].map(() => { const b = ball(0.08, '#FFD9A0', { glow: '#FFB040', glowPower: 2 }); b.userData.p = Math.random(); b.userData.x = (Math.random() - 0.5) * 3.8; b.userData.z = (Math.random() - 0.5) * 1.8; pot.add(b); return b; });
      stations[2].add(pot, anodes, bus, amps.object);
      st.label('960 °C', pot, { tone: 'warn', off: new THREE.Vector3(2.9, -0.2, 1.3) });
      st.label('Carbon blocks', anodes, { off: new THREE.Vector3(-1.4, 1.3, 0), dy: -20, tip: 'The current enters through these. Oxygen pulled off the aluminium burns them away slowly, so they have to be replaced every few weeks.' });
      // 4 Cast: a glowing log grows out of the mould.
      const ladle = group(cyl([0.9, 0.7], 1.2, '#2A2D2E', { open: true, double: true }), cyl(0.82, 0.1, mat('#FF8A2A', { glow: '#FF5A00', glowPower: 1.5 }), { pos: [0, 0.4, 0] }));
      ladle.position.set(-1.6, 2.4, 0); ladle.rotation.z = -0.5;
      const stream = new Flow([[-1.0, 2.1, 0], [-0.3, 1.7, 0], [0, 0.6, 0]], 7, { color: '#FF8A2A', size: 0.11 });
      const mould = cyl(0.95, 0.5, metal(C.iron, 0.5), { open: true, double: true, pos: [0, 0.3, 0] });
      const billet = cyl(0.8, 1, mat(ALU, { metal: 0.8, rough: 0.35, glow: '#FF5A00', glowPower: 0 }), {});
      const done = group();
      for (let i = 0; i < 3; i++) done.add(cyl(0.8, 3.2, metal(ALU, 0.35), { axis: 'z', pos: [2.4 + (i % 2) * 0.85 + (i === 2 ? -0.42 : 0), -1.2 + (i === 2 ? 1.4 : 0), 0] }));
      stations[3].add(ladle, stream.object, mould, billet, done);
      let ph = 0;
      function apply(id) {
        if (id !== 'kg') {
          const i = Number(S.ostep);
          stations.forEach((g, n) => { g.visible = n === i; });
          st.ground(-1.85);
          st.setView([5.5, 4.6, 14.5], [0, 0.2, 0], 0);
          ui.note(`<b>${STEPS[i][0]}.</b> ${STEPS[i][1]}`);
        }
        const kg = S.kg;
        ui.out('rockKg', `${(kg * 4).toFixed(0)} kg`, `makes ${(kg * 2).toFixed(0)} kg of alumina`);
        ui.out('kwh', `${(kg * 15).toFixed(0)} kWh`);
        ui.out('charges', Math.round((kg * 15000) / 36).toLocaleString('en-US'));
      }
      apply();
      return {
        change: apply,
        tick(dt) {
          ph += dt * 0.4;
          const k = ph % 1;
          arm.rotation.z = Math.sin(ph * TAU) * 0.14 - 0.05;
          stick.rotation.z = -0.25 + Math.sin(ph * TAU + 1.2) * 0.4;
          upper.rotation.y = Math.sin(ph * TAU * 0.5) * 0.12;
          paddle.rotation.y = ph * 6;
          pour.advance(dt * 0.6); inFlow.advance(dt * 0.4);
          amps.advance(dt * 0.5);
          anodes.position.y = Math.sin(ph * 2) * 0.05;
          for (const b of bubbles) { b.userData.p = (b.userData.p + dt * 0.8) % 1; b.position.set(b.userData.x, -0.5 + b.userData.p * 0.5, b.userData.z); }
          stream.advance(dt * 1.0);
          const h = 0.2 + smooth(span(k, 0, 0.85)) * 2.6;
          billet.scale.y = h;
          billet.position.y = 0.4 - h / 2;
          billet.material.emissiveIntensity = 1.2 * (1 - smooth(span(k, 0.3, 0.9)));
        },
      };
    },
  };

  // ------------------------------------------------------------ 2. Extrude
  const DIES = { u: 'U-channel', tube: 'Round tube', l: 'L angle' };
  const extrude = {
    id: 'extrude', tab: 'Squeeze it',
    title: 'A play-dough press the size of a house',
    lead: 'The channel on your robot is the same shape all the way along. That is the fingerprint of <b>extrusion</b>. A billet is heated until it is soft (not melted), then a ram shoves it through a steel plate with a U-shaped hole, called a <b>die</b>. Out comes 40 metres of U-channel, like toothpaste.',
    try: 'Heat the billet until it glows, then drag the ram to squeeze it through the die.',
    controls: [
      { type: 'knob', id: 'temp', label: 'Billet temperature', min: 20, max: 640, step: 10, value: 480, unit: ' °C' },
      { type: 'range', id: 'ram', label: 'Push the ram', min: 0, max: 100, value: 0, unit: '%' },
      { type: 'seg', id: 'die', label: 'Die shape', value: 'u', options: Object.entries(DIES) },
    ],
    readouts: [['force', 'Force on the ram'], ['len', 'Channel made'], ['qual', 'Result']],
    more: [
      ['Why heat it? Why not melt it?', 'Cold aluminium is too stiff: the press would stall or the die would crack. Melted aluminium would just run out as a puddle. At about 450 to 500 °C it is solid but soft, like stiff clay, and it holds whatever shape the die gives it.'],
      ['How hard does the press push?', 'A medium press pushes with around 2,000 tonnes: the weight of about 1,300 cars balanced on a billet the width of a dinner plate. Pressure inside the container is higher than at the bottom of the deepest ocean trench.'],
      ['What happens after it comes out?', 'The long strand is cooled with air or water, then gripped at both ends and stretched a little to pull it perfectly straight. It is cut into lengths and baked for several hours at about 175 °C. That bake, called T6 tempering, more than doubles its strength.'],
      ['How do we know it was extruded and not stamped?', 'Three clues. The cross-section is identical everywhere along the part. The inside corners are sharp and square. And if you look closely at bare extruded aluminium you can see faint lines running along its length, left by the die.'],
    ],
    build(st, S, ui) {
      const L0 = 4.4; // billet length
      const cont = part('F_container', { axis: 'z', pos: [0, 0, -2.5] });
      cont.rotation.z = 0.35; // cutaway toward the camera
      const dies = { u: part('F_die_u', { axis: 'z', pos: [0, 0, 0.25] }), l: part('F_die_l', { axis: 'z', pos: [0, 0, 0.25] }), tube: part('F_die_tube', { axis: 'z', pos: [0, 0, 0.25] }) };
      const dieP = group(dies.u, dies.l, dies.tube);
      const platen = group(mesh(plateGeo([[-3, -2.9], [3, -2.9], [3, 2.6], [1.6, 3.4], [-1.6, 3.4], [-3, 2.6]], 0.9, [[0, 0, 1.85], [-2.3, 2.0, 0.3], [2.3, 2.0, 0.3], [-2.3, -2.2, 0.3], [2.3, -2.2, 0.3]], 0.06), plastic('#D9DAD2', 0.45)));
      platen.position.z = 0.3;
      platen.scale.z = 0.6;
      const back = platen.clone(); back.position.z = -9.2;
      const rods = group();
      for (const [x, y] of [[-2.3, 2.0], [2.3, 2.0], [-2.3, -2.2], [2.3, -2.2]]) rods.add(cyl(0.26, 11.4, metal(C.steel, 0.2), { axis: 'z', pos: [x, y, -4.1] }));
      const billet = cyl(1.33, 1, mat(ALU, { metal: 0.6, rough: 0.4, glow: '#FF5A00', glowPower: 0 }), { axis: 'z' });
      const ram = group(cyl(1.3, 0.5, metal(C.steel, 0.25), { axis: 'z', seg: 48 }), cyl(0.75, 6, metal(C.steel, 0.2), { axis: 'z', seg: 40, pos: [0, 0, -3.2] }), cyl(1.1, 0.3, metal(C.iron, 0.5), { axis: 'z', seg: 40, pos: [0, 0, -0.4] }));
      const table = group(box(0.12, 0.3, 13, metal(C.alu, 0.4), { r: 0.03, pos: [-1.0, -1.05, 8.2] }), box(0.12, 0.3, 13, metal(C.alu, 0.4), { r: 0.03, pos: [1.0, -1.05, 8.2] }));
      for (let i = 0; i < 16; i++) table.add(cyl(0.16, 1.9, metal(C.steel, 0.3), { axis: 'x', seg: 16, pos: [0, -0.9, 2.2 + i * 0.8] }));
      for (const z of [2.6, 8.2, 13.8]) for (const x of [-1, 1]) table.add(box(0.14, 2.0, 0.14, metal(C.alu, 0.4), { r: 0.02, pos: [x, -2.1, z] }));
      st.add(cont, dieP, billet, ram, table, platen, back, rods, box(6.6, 0.4, 11.6, mat('#2B2F30', { rough: 0.6, metal: 0.4 }), { r: 0.08, pos: [0, -3.1, -4.1] }));
      const holder = group();
      holder.position.set(0, 0, 0.5);
      st.add(holder);
      let prof = null;
      const pMat = mat(ALU, { metal: 0.85, rough: 0.3, glow: '#FF5A00', glowPower: 0 });
      function shape() {
        holder.clear();
        if (prof) prof.geometry.dispose();
        const k = 0.3; // the profile is much smaller than the billet
        prof = mesh(S.die === 'tube' ? tubeProfileGeo(1) : profileGeo(S.die, 1), pMat);
        prof.scale.set(k, k, 0.001);
        prof.position.y = (W / 2) * k;
        holder.add(prof);
        for (const k2 in dies) dies[k2].visible = k2 === S.die;
      }
      st.label('Ram', ram, { dy: -52, tip: 'A hydraulic piston. Oil pumped in behind it pushes with the weight of over a thousand cars.' });
      st.label('Hot billet', billet, { dy: 58, tip: 'A log of 6061 aluminium, heated until it is soft but still solid.' });
      st.label('Die', dieP, { dy: -74, tip: 'A disc of hardened tool steel with the shape of the part cut right through it. Change the die and the same press makes a different part.' });
      const jam = st.label('Jammed', new THREE.Vector3(0, 2.6, -2), { tone: 'warn' });
      let made = 0;
      function apply(id) {
        if (id === 'die' || !prof) shape();
        const t = S.temp;
        const cold = t < 380, hot = t > 560;
        const limit = cold ? 6 + Math.max(0, t - 200) / 180 * 10 : 100;
        if (S.ram > limit) ui.set('ram', Math.floor(limit));
        const k = S.ram / 100;
        const len = L0 * (1 - k * 0.94);
        billet.scale.z = len;
        billet.position.z = -len / 2;
        ram.position.z = -len - 0.25;
        made = k * 12;
        prof.scale.z = Math.max(0.001, made);
        const glow = clamp((t - 300) / 340, 0, 1);
        billet.material.emissive.copy(heat(glow)); billet.material.emissiveIntensity = glow * 1.3;
        pMat.emissive.copy(heat(glow)); pMat.emissiveIntensity = glow * 0.5;
        pMat.roughness = hot ? 0.95 : 0.3;
        pMat.color.set(hot ? '#9C9A92' : ALU);
        jam.show(cold && S.ram >= Math.floor(limit) - 1);
        const tonnes = t >= 640 ? 0 : Math.round(lerp(5200, 900, clamp((t - 20) / 560, 0, 1)));
        ui.out('force', `${tonnes.toLocaleString('en-US')} t`, cold ? 'more than the press has' : 'tonnes');
        ui.tone('force', cold ? 'warn' : '');
        ui.out('len', `${(made * 3.5).toFixed(1)} m`, DIES[S.die]);
        ui.out('qual', cold ? 'Stuck' : hot ? 'Torn surface' : k > 0 ? 'Smooth' : 'Ready');
        ui.tone('qual', cold || hot ? 'warn' : k > 0 ? 'good' : '');
        ui.note(cold ? '<b>Too cold.</b> The billet is too stiff to flow through the die and the press stalls. Turn the temperature up past about 400 °C.'
          : hot ? '<b>Too hot.</b> The metal is nearly melting. It tears and blisters as it squeezes through. Real presses aim for about 450 to 500 °C.'
          : k === 0 ? 'Just right: glowing dull orange and soft as stiff clay. Now push the ram.'
          : k >= 0.99 ? 'The last slice of billet, called the butt, is sheared off and recycled. Then the next billet goes in.'
          : 'Whatever shape the hole in the die is, that is the shape of the part, for as long as you keep pushing.', cold || hot ? 'warn' : '');
      }
      apply();
      return { view: { pos: [18, 9.5, 18], target: [0, -0.6, 1.2] }, groundY: -3.3, change: apply, handles: [{ obj: ram, id: 'ram', axis: 'x', invert: true, span: 260, hint: 'Drag the ram to push', dy: 40 }] };
    },
  };

  // ------------------------------------------------------------ 3. Stamping
  const stamp = {
    id: 'stamp', tab: 'Stamp or squeeze?',
    title: 'The other way to shape metal',
    lead: 'Not every part can be squeezed out like toothpaste. Thin, flat or folded parts are <b>stamped</b>: a press slams a hardened steel punch through a sheet, like a hole punch through paper, and can fold the piece in the same hit. Hit the button and make some brackets.',
    try: 'Tap the yellow press head on the model, or hit the button.',
    controls: [
      { type: 'button', id: 'hit', label: 'Stamp!' },
      { type: 'seg', id: 'fold', label: 'Die set', value: 'flat', options: [['flat', 'Punch a flat plate'], ['bend', 'Punch and fold a bracket']] },
      { type: 'range', id: 'auto', label: 'Auto press', min: 0, max: 120, step: 10, value: 0, fmt: (v) => (v ? `${v} hits a minute` : 'Off') },
    ],
    readouts: [['count', 'Parts made'], ['scrap', 'Scrap to recycle']],
    more: [
      ['So which is the robot’s frame?', 'The <b>U-channel rails are extruded</b>: thick 2.5 mm walls, crisp square corners, the same shape end to end. But stamping is all over the rest of the robot: flat pattern plates, the thin steel plates inside every motor, the motor cans, battery cans, washers, and the metal shells of the servos.'],
      ['Could you stamp a U-channel?', 'Yes, by folding a flat strip twice. Shelf brackets and cheap steel channel are made that way. You can spot them by their rounded outside corners. Folding thick aluminium that sharply tends to crack it, and stamped channel is less precise, which matters when holes on two walls have to line up exactly.'],
      ['When does each one win?', '<b>Extrusion</b>: long parts with a constant, complicated cross-section. The die is cheap. <b>Stamping</b>: thin parts needed by the million. The die is expensive, but each part takes under a second. <b>Machining</b> (next chapter): anything that needs precise holes and pockets.'],
      ['What is a progressive die?', 'The strip moves forward one step each hit, and each step does one more job: pierce the holes, cut the outline, fold the tabs. A finished part drops off the end with every stroke. The machine in the 3D view is a tiny one.'],
    ],
    build(st, S, ui) {
      const press = part('F_press');
      const head = part('F_ram');
      const strip = box(16, 0.1, 2.7, metal(ALU, 0.3), { r: 0, pos: [0, -0.95, 0] });
      const coil = group(cyl(1.5, 2.7, metal(ALU, 0.3), { axis: 'z', seg: 56, pos: [-8.6, -2.4, 0] }), cyl(0.5, 3.2, metal(C.iron, 0.5), { axis: 'z', pos: [-8.6, -2.4, 0] }), box(0.3, 2.4, 0.3, metal(C.alu, 0.4), { r: 0.04, pos: [-8.6, -3.5, 1.55] }), box(0.3, 2.4, 0.3, metal(C.alu, 0.4), { r: 0.04, pos: [-8.6, -3.5, -1.55] }));
      st.add(press, head, strip, coil, bench(9.6, 5.4, -2.3, 2.2));
      const HOLES = [[0, 0, 0.55], [-0.8, -0.8, 0.2], [0.8, -0.8, 0.2], [-0.8, 0.8, 0.2], [0.8, 0.8, 0.2]];
      const flatGeo = plateGeo([[-1.3, -1.3], [1.3, -1.3], [1.3, 1.3], [-1.3, 1.3]], 0.1, HOLES); flatGeo.rotateX(Math.PI / 2);
      const pMat = metal(ALU, 0.3);
      const parts = [];
      let t = -1, count = 0, autoT = 0;
      const voids = group(); st.add(voids);
      function hit() { if (t < 0) t = 0; }
      function drop() {
        count += 1;
        const g = group(mesh(flatGeo, pMat));
        if (S.fold === 'bend') { const tab = mesh(plateGeo([[-1.3, 0], [1.3, 0], [1.3, 1.0], [-1.3, 1.0]], 0.1, [[-0.7, 0.5, 0.18], [0.7, 0.5, 0.18]]), pMat); tab.position.set(0, 0, 1.3); g.add(tab); }
        g.position.set(0, -0.95, 0);
        g.userData = { age: 0, slot: parts.length % 12 };
        parts.push(g); st.add(g);
        if (parts.length > 12) { const old = parts.shift(); st.world.remove(old); }
        const v = box(2.7, 0.12, 2.7, '#26292A', { r: 0, pos: [0, -0.95, 0] });
        v.userData.x = 0; voids.add(v);
        if (voids.children.length > 5) voids.remove(voids.children[0]);
      }
      ui.out('count', '0'); ui.out('scrap', '0 g');
      return {
        view: { pos: [10, 6.5, 17], target: [0.2, 1.2, 0.5] },
        groundY: -4.7,
        change(id) { if (id === 'hit') hit(); },
        taps: [{ obj: head, hint: 'Tap the press to stamp', dy: -30, onTap: hit }],
        tick(dt) {
          if (S.auto > 0) { autoT += dt; if (autoT > 60 / S.auto) { autoT = 0; hit(); } }
          if (t >= 0) {
            const before = t;
            t += dt * (S.auto > 60 ? 3.4 : 2.2);
            if (before < 0.5 && t >= 0.5) drop();
            if (t >= 1) t = -1;
          }
          const k = t < 0 ? 0 : Math.sin(t * Math.PI);
          head.position.y = 2.0 - k * 1.55;
          voids.children.forEach((v, i) => { // punched gaps in the strip step along with it
            v.userData.x = Math.min(v.userData.x + dt * 7, 3.1 * (voids.children.length - i));
            v.position.x = v.userData.x;
          });
          for (const p of parts) {
            const u = p.userData; u.age += dt;
            const a = smooth(span(u.age, 0, 0.7));
            const col = u.slot % 4, row = Math.floor(u.slot / 4);
            p.position.set(lerp(0, -1.5 + col * 0.25, a), lerp(-0.95, -0.9 + u.slot * 0.14, a) + Math.sin(a * Math.PI) * 1.2, lerp(0, 4.2 - row * 0.1, a));
          }
          ui.out('count', String(count));
          ui.out('scrap', `${count * (S.fold === 'bend' ? 6 : 4)} g`, 'the punched-out slugs');
          ui.label('hit', t >= 0 ? 'Bang!' : 'Stamp!');
          ui.note(count === 0 ? 'Press <b>Stamp!</b> or tap the press itself. The yellow head comes down, five punches go through the sheet at once and a finished plate drops out.'
            : S.auto >= 100 ? 'Real stamping presses run even faster than this: several hits a second, all day.'
            : S.fold === 'bend' ? 'Same hit, one more job: the die also folds a tab up at 90 degrees. Notice the fold makes a rounded corner.'
            : `One hit, one part, about a second. Making ${count === 1 ? 'that' : 'those'} on a milling machine would take minutes each.`);
        },
      };
    },
  };

  // ------------------------------------------------------------ 4. Holes
  const UNITS = 5, PITCH = 2.4;
  const HOLE_LIST = [];
  for (let u = 0; u < UNITS; u++) {
    const cx = (u - (UNITS - 1) / 2) * PITCH;
    for (const y of [-1.6, -0.8, 0.8, 1.6]) for (const x of [-0.8, 0.8]) HOLE_LIST.push([cx + x, y, 0.2]);
    HOLE_LIST.push([cx, 0, 0.7]);
  }
  HOLE_LIST.sort((a, b) => (a[2] - b[2]) || (a[0] - b[0]) || (a[1] - b[1])); // all the small holes first, then the tool change
  const SMALL = HOLE_LIST.filter((h) => h[2] < 0.5).length;
  const holes = {
    id: 'holes', tab: 'Add the holes',
    title: 'A robot that drills for robots',
    lead: 'The extrusion is cut to length and clamped in a <b>CNC machine</b>: a computer-controlled mill that moves a spinning cutter to exact positions, over and over, without getting bored. It follows a list of coordinates, a lot like your autonomous code. Every hole lands on an 8 mm grid, accurate to a few hundredths of a millimetre.',
    try: 'Change the speed and the feed. Can you snap the drill?',
    controls: [
      { type: 'range', id: 'rpm', label: 'Spindle speed', min: 500, max: 12000, step: 500, value: 6000, fmt: (v) => `${v.toLocaleString('en-US')} rpm` },
      { type: 'range', id: 'feed', label: 'Feed (how fast it plunges)', min: 10, max: 100, step: 5, value: 45, unit: '%' },
      { type: 'button', id: 'again', label: 'Load a fresh channel' },
    ],
    readouts: [['done', 'Holes cut'], ['tool', 'Tool in the spindle'], ['chip', 'Chip thickness']],
    more: [
      ['Why this hole pattern?', 'goBILDA parts all share one pattern: 4 mm holes on an 8 mm grid, with a big 14 mm hole every 24 mm for shafts and bearings to pass through. Because every part follows the same grid, any part can bolt to any other part, anywhere. It is LEGO for metal.'],
      ['What is "feeds and speeds"?', 'Each cutting edge should slice off a thin, even chip. Spin too slowly for how fast you push and each edge takes too big a bite: the drill snaps. Spin fast but push too gently and the edge just rubs, heats up and goes blunt. Machinists tune both together. Try breaking a drill.'],
      ['Why not punch the holes?', 'Punching thick aluminium leaves ragged, slightly dented holes, and the punch could not reach the inside faces of a U. Drilling and milling leave clean holes exactly where they should be, on all three faces.'],
      ['How does it know where to go?', 'An engineer draws the part in CAD (the same kind of model you can spin on the Robot page). Software turns it into G-code: a long list of moves like "go to X 24.0, Y 8.0, plunge 3 mm". The machine reads it line by line.'],
    ],
    build(st, S, ui) {
      const LEN = UNITS * PITCH;
      const half = LEN / 2;
      const sideGeo = () => plateGeo([[-half, 0], [half, 0], [half, -W], [-half, -W]], T);
      const s1 = mesh(sideGeo(), metal(ALU, 0.3), [0, 0, W / 2 - T / 2]);
      const s2 = mesh(sideGeo(), metal(ALU, 0.3), [0, 0, -W / 2 + T / 2]);
      const top = mesh(new THREE.BufferGeometry(), metal(ALU, 0.3));
      top.rotation.x = Math.PI / 2; // plate is drawn in XY, laid flat as the top of the channel
      const vise = group(box(LEN + 2, 0.8, W + 2.4, '#3A3F3E', { r: 0.08, pos: [0, -W - 0.4, 0], rough: 0.7 }), box(LEN * 0.7, 2.2, 0.8, metal(C.iron, 0.5), { r: 0.06, pos: [0, -W + 1.1, W / 2 + 0.4] }), box(LEN * 0.7, 2.2, 0.8, metal(C.iron, 0.5), { r: 0.06, pos: [0, -W + 1.1, -W / 2 - 0.4] }));
      const spindle = group(part('F_spindle', { pos: [0, 1.2, 0] }));
      const drill = part('F_drill', { pos: [0, 1.2, 0] });
      const mill = part('F_mill', { pos: [0, 1.2, 0] });
      const tool = group(drill, mill); spindle.add(tool);
      for (const z of [-2.6, -1.3, 1.3, 2.6]) vise.add(box(LEN + 2, 0.06, 0.28, mat('#1D2021', { rough: 0.8 }), { r: 0, pos: [0, -W + 0.01, z * 1.15] }));
      for (const sz of [-1, 1]) for (const x of [-3, 0, 3]) vise.add(cyl(0.22, 0.2, metal(C.steel, 0.25), { axis: 'z', seg: 6, pos: [x, -W + 1.3, sz * (W / 2 + 0.85)] }));
      st.add(s1, s2, top, vise, spindle);
      const chips = new Flow([[0, 0.1, 0], [0.7, 0.9, 0.5], [1.5, -0.4, 1.2]], 8, { color: '#F4F4F0', size: 0.06 });
      st.add(chips.object);
      const snap = st.label('Snap! Drill broken', spindle, { tone: 'warn', dy: 60 });
      let n = 0, ph = 0, broken = 0, cur = new THREE.Vector3(-half, 2, 0);
      function plate() {
        top.geometry.dispose();
        top.geometry = plateGeo([[-half, -W / 2], [half, -W / 2], [half, W / 2], [-half, W / 2]], T, HOLE_LIST.slice(0, n));
        top.position.y = -T / 2;
      }
      plate();
      return {
        view: { pos: [13, 11, 24], target: [0, 0.6, 0] },
        change(id) { if (id === 'again') { n = 0; ph = 0; plate(); } },
        handles: [{ obj: spindle, id: 'feed', axis: 'y', invert: true, span: 220, hint: 'Drag down to plunge faster', dy: -60 }],
        tick(dt) {
          const bite = (S.feed / 100) / (S.rpm / 6000); // relative chip load: 0.45 is comfortable
          const tooBig = bite > 1.3, rub = bite < 0.12;
          const big = n >= SMALL;
          drill.visible = !big; mill.visible = big;
          tool.rotation.y += dt * (S.rpm / 6000) * 40;
          if (broken > 0) { broken -= dt; snap.show(true); drill.scale.y = 0.35; chips.object.visible = false; }
          else {
            snap.show(false); drill.scale.y = 1;
            if (n < HOLE_LIST.length) {
              const h = HOLE_LIST[n];
              const target = new THREE.Vector3(h[0], 0, h[1]);
              const dist = Math.hypot(cur.x - target.x, cur.z - target.z);
              if (dist > 0.02 && ph === 0) { cur.x += clamp(target.x - cur.x, -dt * 9, dt * 9); cur.z += clamp(target.z - cur.z, -dt * 9, dt * 9); }
              else {
                ph += dt * (0.6 + (S.feed / 100) * 3.2) * (big ? 0.6 : 1);
                if (ph > 0.25 && tooBig && !big) { broken = 1.6; ph = 0; }
                else if (ph >= 1) { ph = 0; n += 1; plate(); }
              }
              cur.y = 0.9 - Math.sin(clamp(ph, 0, 1) * Math.PI) * 1.1;
              chips.object.visible = ph > 0.15 && ph < 0.8;
              chips.object.position.set(cur.x, 0, cur.z);
              chips.advance(dt * 2);
            } else { cur.y = lerp(cur.y, 2.4, 0.05); chips.object.visible = false; }
          }
          spindle.position.set(cur.x, cur.y - 0.05, cur.z);
          ui.out('done', `${n} / ${HOLE_LIST.length}`);
          ui.out('tool', big ? '14 mm mill' : '4 mm drill', big ? 'for the big bores' : 'for the grid');
          ui.out('chip', tooBig ? 'Too thick' : rub ? 'Dust' : 'Good', tooBig ? 'slow the feed or speed up' : rub ? 'rubbing, not cutting' : 'clean curls');
          ui.tone('chip', tooBig || rub ? 'warn' : 'good');
          ui.note(broken > 0 ? '<b>Snap.</b> Each cutting edge tried to take too big a bite. Turn the spindle speed up or the feed down.'
            : n >= HOLE_LIST.length ? `<b>${HOLE_LIST.length} holes, all within 0.05 mm.</b> The real machine then flips the part and does both side walls the same way.`
            : rub ? 'The cutter is spinning fast but barely moving down. It is rubbing rather than cutting, which makes heat and wears the edge out.'
            : big ? 'Tool change: the small drill is swapped for a wider cutter to open up the 14 mm centre holes.'
            : 'The machine does every 4 mm hole first, row by row, then swaps tools for the big ones.', broken > 0 || rub ? 'warn' : '');
        },
      };
    },
  };

  // ------------------------------------------------------------ 5. Finish
  const DYES = { clear: ['Clear', '#D4D7D6'], black: ['Black', '#2A2D2E'], red: ['Red', '#B5302A'], blue: ['Blue', '#2E55B8'], gold: ['Gold', '#C9A64B'] };
  const finish = {
    id: 'finish', tab: 'Finish it',
    title: 'Growing armour with electricity',
    lead: 'Bare aluminium scratches easily and leaves grey marks on your hands. So the drilled channels are hung on a rack and lowered into an acid bath with electricity running through them. This is <b>anodising</b>. It grows a glass-hard layer out of the metal’s own surface. It is not paint, and it cannot peel.',
    try: 'Drag the rack down into the bath, wait for the layer to grow, then pick a dye.',
    controls: [
      { type: 'range', id: 'mins', label: 'Minutes in the tank', min: 0, max: 60, step: 5, value: 0, unit: ' min' },
      { type: 'seg', id: 'dye', label: 'Dye bath afterwards', value: 'clear', options: Object.entries(DYES).map(([k, v]) => [k, v[0]]) },
    ],
    readouts: [['layer', 'Layer thickness'], ['hard', 'Surface']],
    more: [
      ['What is the layer made of?', 'Aluminium oxide: the same thing as the white alumina powder from chapter 1, and chemically the same as sapphire. The electricity forces oxygen from the bath to bond with the surface. In a way, you are turning the outside of the part back into ore, on purpose.'],
      ['How does the colour get in?', 'The fresh layer is full of microscopic pores, like a sponge. Dip it in dye and the pores soak the colour up. A final dip in hot water swells the pores shut and locks the colour in. goBILDA channel is left clear, which is why it looks silver.'],
      ['How thick is 15 microns?', 'About a fifth of the width of a human hair. That is plenty: the layer is so hard that a steel screwdriver will usually skid across it without leaving a mark.'],
    ],
    build(st, S, ui) {
      const tank = group(box(9, 4.2, 4, '#5E8F8A', { r: 0.1, opacity: 0.28, pos: [0, -1.6, 0] }), box(9.3, 4.5, 4.3, '#3A3F3E', { r: 0.12, opacity: 0.22, pos: [0, -1.7, 0] }));
      const plates = group(box(0.15, 3.4, 3.4, metal('#7B8082', 0.5), { r: 0.02, pos: [-4.1, -1.5, 0] }), box(0.15, 3.4, 3.4, metal('#7B8082', 0.5), { r: 0.02, pos: [4.1, -1.5, 0] }));
      const rack = group(box(7, 0.25, 0.25, metal(C.copper, 0.3), { r: 0.04, pos: [0, 2.2, 0] }));
      const cMat = mat(ALU, { metal: 0.85, rough: 0.3 });
      for (let i = 0; i < 3; i++) {
        const ch = mesh(profileGeo('u', 2.6), cMat);
        ch.scale.setScalar(0.5); ch.rotation.x = Math.PI / 2; ch.position.set((i - 1) * 2.1, 1.6, 0.6);
        rack.add(ch, cyl(0.04, 0.7, metal(C.copper, 0.3), { pos: [(i - 1) * 2.1, 1.9, 0] }));
      }
      const psu = group(box(1.8, 1.4, 1.2, plastic(C.dark), { r: 0.12 }), box(1.0, 0.4, 0.05, C.volt, { r: 0.04, pos: [0, 0.2, 0.62], glow: true, glowPower: 0.4 }), cyl(0.16, 0.12, plastic(C.red), { axis: 'z', pos: [-0.5, -0.35, 0.62] }), cyl(0.16, 0.12, plastic(C.black), { axis: 'z', pos: [0.5, -0.35, 0.62] }), cyl(0.09, 5.6, metal(C.alu, 0.4), { pos: [0, -3.5, 0] }), cyl(0.7, 0.1, metal(C.alu, 0.4), { pos: [0, -6.25, 0], seg: 32 }));
      psu.position.set(-6.4, 2.4, 0);
      const wire = [[-5.5, 2.6, 0], [-4.4, 3.1, 0], [-3.4, 2.2, 0]];
      const cur = new Flow(wire, 6, { size: 0.09 });
      st.add(tank, plates, rack, psu, tube(wire, 0.06, C.red, { rough: 0.6 }), cur.object);
      const bub = [...Array(16)].map(() => { const b = ball(0.06, '#FFFFFF', { opacity: 0.7 }); b.userData = { x: (Math.random() - 0.5) * 6, z: (Math.random() - 0.5) * 2.4, p: Math.random() }; st.add(b); return b; });
      st.label('Acid bath', new THREE.Vector3(3.2, -3.3, 2.1), {});
      st.label('Power supply', psu, { dy: -42 });
      let dip = 0;
      const bare = new THREE.Color(ALU), tmp = new THREE.Color();
      return {
        view: { pos: [5, 5.5, 16], target: [-0.6, -0.2, 0] },
        handles: [{ obj: rack, id: 'mins', axis: 'y', invert: true, span: 260, hint: 'Drag the rack into the bath' }],
        tick(dt) {
          const m = S.mins, on = m > 0;
          dip = lerp(dip, on ? 1 : 0, 1 - Math.pow(0.02, dt));
          rack.position.y = -dip * 2.7;
          cur.object.visible = on; if (on) cur.advance(dt * 0.5);
          for (const b of bub) { b.userData.p = (b.userData.p + dt * 0.5) % 1; b.position.set(b.userData.x, -3.4 + b.userData.p * 3.3, b.userData.z); b.visible = on && dip > 0.8; }
          const um = m * 0.42, k = clamp(um / 15, 0, 1);
          tmp.set(DYES[S.dye][1]);
          cMat.color.copy(bare).lerp(tmp, S.dye === 'clear' ? k * 0.6 : k);
          cMat.roughness = 0.3 + k * 0.25; cMat.metalness = 0.85 - k * (S.dye === 'clear' ? 0.15 : 0.35);
          ui.out('layer', `${um.toFixed(0)} µm`, um >= 25 ? 'hard-coat territory' : um >= 10 ? 'typical for parts like these' : um > 0 ? 'thin' : 'bare metal');
          ui.out('hard', um >= 10 ? 'Glass-hard' : um > 0 ? 'Getting there' : 'Soft');
          ui.tone('hard', um >= 10 ? 'good' : '');
          ui.note(!on ? 'Slide the timer to lower the rack into the bath and switch on the current.'
            : um < 10 ? 'Bubbles are hydrogen gas coming off the side plates. On the channels, an oxide layer is growing a little thicker every minute.'
            : S.dye === 'clear' ? 'Thick enough. Left clear, it is the soft silver of the channel on your robot. Try a dye.'
            : 'The dye soaks into the pores of the layer, so the colour is part of the surface and will not chip off.');
        },
      };
    },
  };

  // ------------------------------------------------------------ 6. Why a U?
  // Stiffness of each cross-section (second moment of area, mm^4) and weight of a 432 mm length (g).
  const SECT = { flat: ['Flat strip', 62.5, 140], l: ['L angle', 53322, 273], u: ['U-channel', 84561, 405], box: ['Box tube', 157468, 553] };
  const E = 69000, SPAN = 432;
  const whyU = {
    id: 'shape', tab: 'Why a U?',
    title: 'Shape beats material',
    lead: 'The frame carries everything: motors, battery, and the shock of hitting a wall. Here is the same aluminium, the same 2.5 mm wall, in four shapes. Rest a weight on the middle of each and see which you would build a robot from.',
    try: 'Drag the weight down to load the beam, then swap the shape.',
    controls: [
      { type: 'seg', id: 'sect', label: 'Cross-section', value: 'u', options: Object.entries(SECT).map(([k, v]) => [k, v[0]]) },
      { type: 'knob', id: 'wkg', label: 'Weight resting on the middle', min: 0, max: 20, step: 1, value: 5, unit: ' kg' },
    ],
    readouts: [['bend', 'Bends in the middle'], ['mass', 'Rail weighs'], ['vs', 'Stiffness vs flat strip']],
    more: [
      ['Why does the shape matter so much?', 'When a beam bends, the top gets squashed and the bottom gets stretched. The middle does almost nothing. Metal far from the middle fights bending hardest, so the best shapes put their metal as far above and below the centre as possible. The tall walls of a U do exactly that.'],
      ['Then why not always use a box tube?', 'A box is stiffer still, and much better at resisting twist. But you cannot reach inside it to tighten a nut. An open U lets you mount motors, bearings and gears <i>inside</i> the rail, with a screwdriver from any side. Engineering is always a trade.'],
      ['Do the holes make it weaker?', 'A little: the holes remove about a quarter of the metal. But they take it from the faces, and the stiffness mostly comes from how far apart the faces are. You lose a bit of strength and gain the ability to bolt anything anywhere, which is a trade worth making.'],
      ['How this connects to the rest of the robot', 'The two long side rails set the distance between the wheels. If they flex, the four mecanum wheels stop touching the floor evenly and the robot drifts when it should slide straight. A stiff frame is what lets your drive code behave the same way twice.'],
    ],
    build(st, S, ui) {
      const LEN = 14, K = 0.42, bMat = metal(ALU, 0.3);
      let beam = null, base = null;
      const holder = group(); st.add(holder);
      const sup = group(mesh(new THREE.CylinderGeometry(0.1, 0.9, 1.6, 3), mat('#3A3F3E', { rough: 0.7 }), [-LEN / 2 + 0.4, -5.7, 0]), mesh(new THREE.CylinderGeometry(0.1, 0.9, 1.6, 3), mat('#3A3F3E', { rough: 0.7 }), [LEN / 2 - 0.4, -5.7, 0]));
      const wt = group();
      for (let i = 0; i < 3; i++) wt.add(cyl(1.25 - i * 0.12, 0.46, mat('#1F2223', { rough: 0.55, metal: 0.6 }), { seg: 48, pos: [0, -0.55 + i * 0.5, 0] }), cyl(1.0 - i * 0.12, 0.47, plastic(C.power, 0.4), { seg: 48, pos: [0, -0.55 + i * 0.5, 0] }));
      wt.add(cyl(0.16, 2.0, metal(C.steel, 0.2), { pos: [0, 0.1, 0] }), mesh(new THREE.TorusGeometry(0.3, 0.07, 10, 24), metal(C.steel, 0.2), [0, 1.3, 0]));
      st.add(sup, wt);
      const real = ctx.fitReal(ctx.real(), LEN * 0.8);
      if (real) { real.position.set(0, 0.6, 0); st.add(real); st.label('The real rail, from the robot’s CAD', real, { tone: 'volt', dy: -48 }); }
      const wl = st.label('5 kg', wt, { dy: 0 });
      function rebuild() {
        st.disposeTree(holder); holder.clear();
        const g = profileGeo(S.sect, LEN, 40);
        g.scale(K, K, 1); g.translate(0, 0, -LEN / 2); g.rotateY(Math.PI / 2); // lay the beam along X
        beam = mesh(g, bMat);
        base = g.attributes.position.array.slice();
        holder.add(beam);
        holder.position.y = -4.9 + (S.sect === 'flat' ? T : W) * K;
      }
      let shown = 0;
      function apply(id) {
        if (id !== 'wkg') rebuild();
        const [, I, grams] = SECT[S.sect];
        const mm = (S.wkg * 9.81 * SPAN ** 3) / (48 * E * I);
        ui.out('bend', mm >= 1 ? `${mm.toFixed(0)} mm` : mm >= 0.01 ? `${mm.toFixed(2)} mm` : `${(mm * 1000).toFixed(0)} µm`, mm > 20 ? 'and it stays bent' : mm < 0.1 ? 'too small to see' : '');
        ui.tone('bend', mm > 5 ? 'warn' : mm < 0.1 && S.wkg > 0 ? 'good' : '');
        ui.out('mass', `${grams} g`);
        ui.out('vs', `× ${Math.round(I / 62.5).toLocaleString('en-US')}`);
        wl.text(`${S.wkg} kg`);
        ui.note(S.sect === 'flat' ? 'A flat strip is hopeless as a beam. All its metal sits right at the centre line, where it does nothing to resist bending.'
          : S.sect === 'l' ? 'One folded edge and it is already hundreds of times stiffer, though an L likes to twist sideways under load.'
          : S.sect === 'u' ? `<b>About ${Math.round(84561 / 62.5).toLocaleString('en-US')} times stiffer than the flat strip for under 3 times the weight.</b> That is why your frame is made of U-channel.`
          : 'The stiffest of all, but closed. You cannot get a wrench inside it, so nothing can be mounted within the rail.', S.sect === 'flat' && S.wkg > 3 ? 'warn' : '');
      }
      apply();
      return {
        view: { pos: [12, 1.5, 17], target: [0, -3.4, 0] },
        groundY: -6.5,
        change: apply,
        handles: [{ obj: wt, id: 'wkg', axis: 'y', invert: true, span: 200, hint: 'Drag down to add weight', dy: -50 }],
        tick(dt) {
          const I = SECT[S.sect][1];
          const mm = (S.wkg * 9.81 * SPAN ** 3) / (48 * E * I);
          const target = clamp(mm / 14, 0, 1.5); // drawn sag in scene units, capped so the strip stays on screen
          shown = lerp(shown, target, 1 - Math.pow(0.004, dt));
          const pos = beam.geometry.attributes.position, a = pos.array;
          for (let i = 0; i < a.length; i += 3) a[i + 1] = base[i + 1] - shown * Math.sin(((base[i] + LEN / 2) / LEN) * Math.PI);
          pos.needsUpdate = true;
          wt.position.set(0, holder.position.y + 0.8 - shown, 0);
        },
      };
    },
  };

  return { title: 'The aluminium frame', chapters: [ore, extrude, stamp, holes, finish, whyU] };
}
