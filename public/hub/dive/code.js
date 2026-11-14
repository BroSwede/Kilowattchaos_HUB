// How it works: how the code flows. The two parts of a match and the OpMode that runs in each,
// the names that tie the code to the plugs, and why a plan with no sensors drifts off course.
import { THREE, C, mat, metal, plastic, mesh, cyl, box, ball, group, clamp, lerp, smooth, TAU } from './kit.js';
import { miniBot, field, gamepad, screen } from './works.js';
import { mix } from './wheels.js';

const AUTO = 30, GAP = 8, TELE = 120, TOTAL = AUTO + GAP + TELE;
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
// Draw a few lines of code on a screen, with one line lit.
function codeOn(scr, title, lines, lit, tone = '#E8F542') {
  const { ctx, W, H } = scr, lh = Math.min(46, (H - 80) / lines.length);
  ctx.fillStyle = '#1D2021'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(244,244,240,0.7)'; ctx.font = '600 24px Inter, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(title, 28, 34);
  ctx.font = `500 ${Math.round(lh * 0.56)}px "JetBrains Mono", monospace`;
  lines.forEach((l, i) => {
    const y = 78 + i * lh;
    if (i === lit) { ctx.fillStyle = tone; ctx.beginPath(); ctx.roundRect(16, y - lh / 2 + 3, W - 32, lh - 6, 8); ctx.fill(); }
    ctx.fillStyle = i === lit ? '#222624' : l.startsWith('//') || l.startsWith('  //') ? 'rgba(244,244,240,0.45)' : '#E6E8E4';
    ctx.fillText(l, 28, y);
  });
  scr.flush();
}

export default function code() {
  // ------------------------------------------------------------ 1. The match clock
  const LINES = ['// Autonomous OpMode', '  init      get the motors ready', '  start     the buzzer goes', '  run       follow the plan, 30 s', '  stop', '// TeleOp OpMode', '  init      drivers pick up gamepads', '  start     the buzzer goes', '  loop      read sticks, set motors', '  stop      time is up'];
  const clock = {
    id: 'clock', tab: 'The match clock',
    title: 'Two programs, one match',
    big: 'A match runs two programs in a row: one where the robot drives itself for 30 seconds, then one where the drivers take over for 2 minutes.',
    lead: 'A program for the robot is called an <b>OpMode</b>. Each match uses two. First <b>Autonomous</b>: 30 seconds, hands off, the robot follows a plan. Then <b>TeleOp</b>: 2 minutes with drivers on the sticks.',
    real: 'On our Driver Hub you pick the OpMode, tap <b>Init</b>, then <b>Start</b> at the buzzer.',
    try: 'Drag the match clock and watch which program is running.',
    fixed: { cc_play: 'play' },
    controls: [
      { id: 'cc_t', label: 'Match clock', min: -6, max: TOTAL + 4, step: 1, value: -6, fmt: (v) => (v < 0 ? 'before the match' : v >= TOTAL ? 'match over' : mmss(v)) },
    ],
    readouts: [['cc_p', 'Period'], ['cc_s', 'Step']],
    more: [
      ['What happens in init?', 'The code finds every motor, servo and sensor by name and sets them up, but nothing is allowed to move yet. The robot then waits, sometimes for a minute or more, until Start.'],
      ['Why is TeleOp a loop and Autonomous a list?', 'In TeleOp the robot must keep asking “what are the sticks doing now?”, so the same few lines run again and again, about 50 times a second. Autonomous knows its plan in advance, so it can be written as steps in order. (Inside, those steps are loops too: “keep driving until the encoder says stop”.)'],
    ],
    build(st, S, ui) {
      const X = (t) => -12 + (clamp(t, 0, TOTAL) / TOTAL) * 24;
      const seg = (a, b, color) => box(X(b) - X(a) - 0.08, 0.3, 1.1, mat(color, { rough: 0.5 }), { r: 0.06, pos: [(X(a) + X(b)) / 2, 0.15, 6] });
      const f = field(11, 4);
      f.position.set(-1, 0, -1);
      const bot = miniBot({ k: 0.8 });
      const pad = gamepad(1.1);
      pad.g.position.set(-9.5, 0.6, 2.2); pad.g.rotation.x = 0.35;
      const padStand = box(4, 0.3, 2.6, mat('#2B2F30', { rough: 0.6 }), { r: 0.08, pos: [-9.5, 0.05, 2.2] });
      const scr = screen(9.5, 8.2, 760);
      scr.g.position.set(10.5, 4.8, -2.5); scr.g.rotation.y = -0.45;
      const mark = group(mesh(new THREE.ConeGeometry(0.42, 0.9, 4), mat(C.white, { glow: C.white, glowPower: 0.3 }), [0, 1.0, 0], [Math.PI, 0, 0]), box(0.08, 0.5, 1.2, C.white, { r: 0, pos: [0, 0.25, 0] }));
      st.add(f, bot.g, pad.g, padStand, scr.g, seg(0, AUTO, C.teal), seg(AUTO, AUTO + GAP, '#6E7577'), seg(AUTO + GAP, TOTAL, C.volt), mark);
      st.label('Autonomous 0:30', new THREE.Vector3((X(0) + X(AUTO)) / 2, 0.3, 7.2));
      st.label('TeleOp 2:00', new THREE.Vector3((X(AUTO + GAP) + X(TOTAL)) / 2, 0.3, 7.2), { tone: 'volt' });
      const lp = st.label('Hands off', pad.g, { dy: -40 });
      let acc = 0, lit = -2;
      return {
        view: { pos: [0, 17, 31], target: [0, 1.8, 1.6] },
        groundY: -0.16,
        tick(dt, time) {
          if (S.cc_play === 'play') { acc += dt * 6; if (acc >= 1) { const n = Math.floor(acc); acc -= n; ui.set('cc_t', S.cc_t >= TOTAL + 4 ? -6 : S.cc_t + n); } }
          const t = S.cc_t, auto = t >= 0 && t < AUTO, tele = t >= AUTO + GAP && t < TOTAL, tt = t - AUTO - GAP;
          mark.position.set(X(t), 0.3, 6);
          // Autonomous: a fixed plan. TeleOp: wherever the drivers steer.
          const a = clamp(t, 0, AUTO) / AUTO, d = tele ? tt + (S.cc_play === 'play' ? acc : 0) : t >= TOTAL ? TELE : 0;
          const ax = -1 + smooth(clamp(a * 2.2 - 1.1, 0, 1)) * 2.4, az = 2.6 - smooth(clamp(a * 2, 0, 1)) * 3.6;
          const px = ax + Math.sin(d * 0.33) * 2.2 * Math.min(1, d / 6), pz = az - 1 + Math.cos(d * 0.21) * 2.4 * Math.min(1, d / 6) + Math.min(1, d / 6);
          bot.g.position.set(px, 0, pz);
          bot.g.rotation.y = -smooth(clamp(a * 2.2 - 1.1, 0, 1)) * 0.9 + Math.sin(d * 0.17) * 1.3 * Math.min(1, d / 6);
          const moving = auto || tele;
          for (const w of bot.wheels) w.spin.rotation.x -= moving ? dt * 6 : 0;
          pad.setStick(0, tele ? Math.sin(d * 0.33) : 0, tele ? Math.cos(d * 0.21) : 0);
          pad.setStick(1, tele ? Math.sin(d * 0.17) : 0, 0);
          pad.led.material.emissiveIntensity = tele ? 1.4 : 0.1;
          lp.text(tele ? 'Drivers in control' : auto ? 'Hands off' : t < 0 ? 'Waiting' : t < AUTO + GAP ? 'Pick up the gamepads' : 'Match over');
          const now = t < -3 ? 1 : t < 0 ? 1 : t < 1 ? 2 : t < AUTO - 1 ? 3 : t < AUTO ? 4 : t < AUTO + GAP - 1 ? 6 : t < AUTO + GAP + 1 ? 7 : t < TOTAL ? 8 : 9;
          if (now !== lit) { lit = now; codeOn(scr, 'What the Control Hub is running', LINES, now, now <= 4 ? '#5CC8D3' : '#E8F542'); }
          const loops = tele ? Math.round(tt * 50) : t >= TOTAL ? TELE * 50 : 0;
          ui.out('cc_p', t < 0 ? 'Before the match' : auto ? 'Autonomous' : t < AUTO + GAP ? 'Changeover' : tele ? 'Driver controlled' : 'Finished', auto ? `${AUTO - t} s left` : tele ? `${mmss(TOTAL - t)} left` : '');
          ui.out('cc_o', now <= 4 ? 'Autonomous' : 'TeleOp');
          ui.out('cc_s', LINES[now].trim().split(' ')[0]);
          ui.out('cc_l', loops.toLocaleString('en-US'));
          ui.note(t < 0 ? '<b>Init.</b> The Autonomous OpMode is loaded and has found all its motors. Nothing may move until the buzzer.' : auto ? '<b>Autonomous.</b> Nobody touches a gamepad. The robot follows the steps it was given, using its sensors to stay on course.' : t < AUTO + GAP ? '<b>Changeover.</b> The Autonomous OpMode has stopped. The TeleOp OpMode is in init and the drivers pick up the gamepads.' : tele ? `<b>TeleOp.</b> The loop has run about ${loops.toLocaleString('en-US')} times so far. Each lap reads the sticks and sets the motors.` : '<b>Stop.</b> Time is up. Every motor is set to zero, whatever the sticks are doing.');
          void time;
        },
      };
    },
  };

  // ------------------------------------------------------------ 2. Names must match
  const WN = ['frontLeft', 'frontRight', 'backLeft', 'backRight'];
  const names = {
    id: 'names', tab: 'Names must match',
    title: 'The code only knows motors by name',
    big: 'The code asks for each motor by a name, and that name must match the robot’s configuration letter for letter.',
    lead: 'The code asks for each motor by <b>name</b>, like <code>frontLeft</code>. A list on the Driver Hub, the <b>configuration</b>, says which port each name belongs to. If the two spellings differ by even one letter, the OpMode stops with an error.',
    real: 'Capital letters count: <code>frontLeft</code> and <code>frontleft</code> are different names to the robot.',
    try: 'Change how the configuration spells the name and watch what happens at Init.',
    fixed: { cn_plug: '0', cn_pow: 0.6 },
    controls: [
      { type: 'seg', id: 'cn_name', label: 'The configuration calls port 0', value: 'frontLeft', options: [['frontLeft', 'frontLeft'], ['frontleft', 'frontleft'], ['leftFront', 'leftFront']] },
    ],
    readouts: [['cn_i', 'Init'], ['cn_r', 'Robot']],
    more: [
      ['What does the line of code look like?', '<code>frontLeft = hardwareMap.get(DcMotor.class, "frontLeft");</code> The text in quotes is the name it looks up. Everything after that line uses the variable on the left.'],
      ['How do I check quickly?', 'Lift the robot so the wheels are off the ground, then run a test OpMode that turns one named motor at a time. If the name on the screen and the wheel that turns do not agree, fix the plug or the configuration.'],
    ],
    build(st, S, ui) {
      const f = field(12, 4);
      const bot = miniBot({ k: 1 });
      const scr = screen(11, 6.4, 880);
      scr.g.position.set(5, 6.4, -7); scr.g.rotation.x = -0.2; scr.g.rotation.y = -0.2;
      st.add(f, bot.g, scr.g);
      const lbl = bot.wheels.map((w, i) => st.label(WN[i], w.at, { dy: -8 }));
      let key = '', ph = 0;
      return {
        view: { pos: [1.5, 15, 22], target: [1.2, 4.2, -1.5] },
        groundY: -0.16,
        tick(dt) {
          const cfg = S.cn_name, ok = cfg === 'frontLeft', swap = S.cn_plug === '1', pow = S.cn_pow;
          const p = mix(0, pow, 0).p; // slide right
          const real = swap ? [p[1], p[0], p[2], p[3]] : p; // which power each real wheel gets
          const run = ok && pow > 0.02;
          ph += dt;
          if (run) bot.wheels.forEach((w, i) => { w.spin.rotation.x -= real[i] * 7 * dt; });
          if (run && !swap) { bot.g.position.x = Math.sin(ph * 0.9) * 0 + ((ph * pow * 1.6) % 7) - 3.5; bot.g.rotation.y = 0; } else if (run) { bot.g.position.x = lerp(bot.g.position.x, 0, 0.05); bot.g.rotation.y -= dt * pow * 1.5; } else { bot.g.position.x = lerp(bot.g.position.x, 0, 0.05); bot.g.rotation.y = lerp(bot.g.rotation.y, 0, 0.05); }
          lbl.forEach((l, i) => { const nm = swap && i < 2 ? WN[1 - i] : WN[i]; l.text(ok ? `${nm}: ${real[i] > 0 ? '+' : ''}${real[i].toFixed(1)}` : nm); l.el.classList.toggle('is-warn', swap && i < 2); });
          const k2 = `${cfg}|${swap}`;
          if (k2 !== key) {
            key = k2;
            const { ctx, W, H } = scr;
            ctx.fillStyle = '#1D2021'; ctx.fillRect(0, 0, W, H);
            ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
            ctx.fillStyle = 'rgba(244,244,240,0.7)'; ctx.font = '600 24px Inter, sans-serif'; ctx.fillText('The code asks for', 30, 36); ctx.fillText('Configuration on the Driver Hub', 30, 190);
            ctx.fillStyle = ok ? '#E8F542' : '#D8452B'; ctx.beginPath(); ctx.roundRect(20, 62, W - 40, 60, 10); ctx.fill();
            ctx.fillStyle = ok ? '#222624' : '#fff'; ctx.font = '500 27px "JetBrains Mono", monospace'; ctx.fillText('hardwareMap.get(DcMotor.class, "frontLeft")', 34, 93);
            ctx.font = '500 24px Inter, sans-serif'; ctx.fillStyle = ok ? '#8FD19E' : '#FF9C8A';
            ctx.fillText(ok ? 'Found: port 0' : `Error: no device named "frontLeft"`, 34, 146);
            [[0, cfg], [1, 'frontRight'], [2, 'backLeft'], [3, 'backRight']].forEach(([port, nm], i) => {
              const y = 236 + i * 58, bad = port === 0 && !ok;
              ctx.fillStyle = bad ? 'rgba(216,69,43,0.35)' : 'rgba(255,255,255,0.07)'; ctx.beginPath(); ctx.roundRect(20, y - 24, W - 40, 48, 8); ctx.fill();
              ctx.fillStyle = 'rgba(244,244,240,0.6)'; ctx.font = '500 24px Inter, sans-serif'; ctx.fillText(`Motor port ${port}`, 34, y);
              ctx.fillStyle = '#F4F4F0'; ctx.font = '500 27px "JetBrains Mono", monospace'; ctx.fillText(nm, 300, y);
              if (swap && port < 2) { ctx.fillStyle = '#F07A2A'; ctx.font = '500 22px Inter, sans-serif'; ctx.fillText(`cable from the front-${port ? 'left' : 'right'} wheel`, 520, y); }
            });
            scr.flush();
          }
          ui.out('cn_i', ok ? 'OK' : 'Error');
          ui.tone('cn_i', ok ? 'good' : 'warn');
          ui.out('cn_w', !ok ? 'nothing' : swap ? 'the front-right wheel' : 'the front-left wheel');
          ui.tone('cn_w', ok && !swap ? 'good' : 'warn');
          ui.out('cn_r', !ok ? 'Will not start' : pow < 0.03 ? 'Waiting' : swap ? 'Spins on the spot' : 'Slides right');
          ui.note(!ok ? `<b>Init fails.</b> The code asks for “frontLeft” but the configuration says “${cfg}”. To a computer those are different names. Fix one so they match exactly.` : swap ? '<b>Right name, wrong plug.</b> The code is fine and init passes, but two cables are swapped, so asking to slide right makes the robot twist instead.' : '<b>Everything matches.</b> The name in the code, the name in the configuration and the plug all point at the same wheel.', ok && !swap ? 'good' : 'warn');
        },
      };
    },
  };

  // ------------------------------------------------------------ 3. Plan an autonomous
  const plan = {
    id: 'plan', tab: 'Plan an autonomous',
    title: 'Small errors add up',
    big: 'A plan made only of “drive this long, turn this long” drifts further off with every step, and sensors pull it back on course.',
    lead: 'An autonomous plan is a short list: <b>drive</b>, <b>turn</b>, <b>drive</b>, <b>shoot</b>. Run on timing alone, every step is a little off and the mistakes <b>stack up</b>. Encoders and the gyro correct each step before the next begins.',
    real: 'Our autonomous must end pointing at the goal, with no driver to fix it.',
    try: 'Watch where the shots land with no sensors, then switch the sensors on.',
    fixed: { cp_d: 100, cp_a: 40, cp_e: 5 },
    hud: true,
    controls: [
      { type: 'seg', id: 'cp_s', label: 'The code uses', value: 'off', options: [['off', 'Timing only'], ['on', 'Encoders and gyro']] },
    ],
    readouts: [['cp_m', 'Last shot missed by', 'the target ring is 15 cm'], ['cp_h', 'Shots in the ring']],
    more: [
      ['Why do the errors stack?', 'A 5% error on the first drive puts the robot 5 cm out. A turn that is 3° off then points the next drive the wrong way, and the shot travels further still along that wrong line. A small angle error grows with every centimetre after it.'],
      ['What do the sensors change?', 'They let each step check itself. “Drive until the encoders say 100 cm” does not care how tired the battery is. “Turn until the gyro says 40°” does not care if a wheel slipped. See Sensors and Algorithms and math for how.'],
    ],
    build(st, S, ui) {
      const K = 5.5; // scene units per metre
      const f = field(18, 5);
      const bot = miniBot({ k: 0.62 });
      const ghost = mat(C.white, { opacity: 0.4 });
      const legs = [box(0.14, 0.03, 1, ghost, { r: 0 }), box(0.14, 0.03, 1, ghost, { r: 0 }), box(0.07, 0.03, 1, mat(C.volt, { opacity: 0.6 }), { r: 0 })];
      const ring = mesh(new THREE.TorusGeometry(0.15 * K, 0.07, 8, 40), mat(C.volt, { glow: true, glowPower: 0.7 }), [0, 0.06, 0], [Math.PI / 2, 0, 0]);
      const b = ball(0.21, plastic('#B394FF', 0.5), { seg: 20 });
      const marks = Array.from({ length: 14 }, () => { const m = cyl(0.17, 0.03, mat(C.orange, { glow: true, glowPower: 0.3 }), { seg: 16 }); m.visible = false; m.userData.noShadow = true; return m; });
      for (const o of [...legs, ring, ...marks]) o.userData.noShadow = true;
      st.add(f, bot.g, ...legs, ring, b, ...marks);
      const lg = st.label('Target', ring, { dy: -26, tone: 'volt' });
      const START = [1.5, 6], D2 = 0.6, SHOT = 1.3;
      // Follow the plan from the start. e = [drive error, turn error in degrees, second drive error].
      const route = (d, a, e) => {
        const h1 = 0, p1 = [START[0], START[1] - d * (1 + e[0]) * K];
        const h2 = h1 + ((a + e[1]) * Math.PI) / 180, dir = [-Math.sin(h2), -Math.cos(h2)];
        const p2 = [p1[0] + dir[0] * D2 * (1 + e[2]) * K, p1[1] + dir[1] * D2 * (1 + e[2]) * K];
        return { p1, h2, p2, hit: [p2[0] + dir[0] * SHOT * K, p2[1] + dir[1] * SHOT * K] };
      };
      const put = (m, a, c) => { const dx = c[0] - a[0], dz = c[1] - a[1]; m.scale.z = Math.max(0.01, Math.hypot(dx, dz)); m.position.set((a[0] + c[0]) / 2, 0.03, (a[1] + c[1]) / 2); m.rotation.y = Math.atan2(dx, dz); };
      let key = '', ideal = null, real = null, t = 0, runs = 0, hits = 0, miss = 0, counted = false;
      const fresh = () => {
        const k = (S.cp_e / 100) / (S.cp_s === 'on' ? 8 : 1), r = () => (Math.random() * 2 - 1);
        real = route(S.cp_d / 100, S.cp_a, [r() * k * 2, r() * k * 110 + r() * k * Math.abs(S.cp_a) * 0.6, r() * k * 2]);
        t = 0; counted = false;
      };
      return {
        view: { pos: [1.5, 28, 19], target: [0.5, 0, -3.2] },
        groundY: -0.16,
        tick(dt) {
          const d = S.cp_d / 100, a = S.cp_a, k2 = `${d}|${a}|${S.cp_e}|${S.cp_s}`;
          if (k2 !== key) {
            key = k2; ideal = route(d, a, [0, 0, 0]);
            put(legs[0], START, ideal.p1); put(legs[1], ideal.p1, ideal.p2); put(legs[2], ideal.p2, ideal.hit);
            ring.position.set(ideal.hit[0], 0.06, ideal.hit[1]);
            runs = hits = 0; marks.forEach((m) => { m.visible = false; });
            fresh();
          }
          t += dt;
          const T1 = 0.5 + d * 1.1, T2 = T1 + 0.3 + Math.abs(a) / 110, T3 = T2 + 0.9, T4 = T3 + 0.7;
          let p, h;
          if (t < T1) { const u = smooth(t / T1); p = [lerp(START[0], real.p1[0], u), lerp(START[1], real.p1[1], u)]; h = 0; } else if (t < T2) { p = real.p1; h = real.h2 * smooth((t - T1) / (T2 - T1)); } else if (t < T3) { const u = smooth((t - T2) / (T3 - T2)); p = [lerp(real.p1[0], real.p2[0], u), lerp(real.p1[1], real.p2[1], u)]; h = real.h2; } else { p = real.p2; h = real.h2; }
          bot.g.position.set(p[0], 0, p[1]); bot.g.rotation.y = h;
          for (const w of bot.wheels) w.spin.rotation.x -= t < T3 ? dt * 6 * (t >= T1 && t < T2 ? (w.sx < 0 ? -1 : 1) * Math.sign(a || 1) : 1) : 0;
          const u = clamp((t - T3) / (T4 - T3), 0, 1);
          b.visible = t >= T3;
          b.position.set(lerp(real.p2[0], real.hit[0], u), 0.8 + Math.sin(u * Math.PI) * 2.2 - u * 0.6, lerp(real.p2[1], real.hit[1], u));
          if (t >= T4 && !counted) {
            counted = true; runs++;
            miss = (Math.hypot(real.hit[0] - ideal.hit[0], real.hit[1] - ideal.hit[1]) / K) * 100;
            if (miss <= 15) hits++;
            const m = marks[(runs - 1) % marks.length]; m.visible = true; m.position.set(real.hit[0], 0.03, real.hit[1]);
          }
          if (t > T4 + 0.9) fresh();
          lg.text(S.cp_s === 'on' ? 'Target (sensors on)' : 'Target');
          ui.hud(`<span class="chip">White line: the plan</span><span class="chip">Orange dots: where shots really landed</span>`);
          ui.out('cp_n', String(runs));
          ui.out('cp_m', runs ? `${Math.round(miss)} cm` : '–');
          ui.tone('cp_m', !runs ? '' : miss <= 15 ? 'good' : 'warn');
          ui.out('cp_h', runs ? `${hits} of ${runs}` : '–');
          ui.note(S.cp_e === 0 ? '<b>A perfect robot.</b> With no slop every run is identical. Real robots are never this tidy.' : S.cp_s === 'on' ? '<b>Sensors on.</b> Each step is measured and corrected, so the shots bunch up tightly around the target.' : '<b>Timing only.</b> Every run ends somewhere different, and the turn error matters most because the shot carries it furthest.', S.cp_s === 'on' || S.cp_e === 0 ? 'good' : '');
        },
      };
    },
  };

  return { title: 'How the code flows', chapters: [clock, names, plan] };
}
