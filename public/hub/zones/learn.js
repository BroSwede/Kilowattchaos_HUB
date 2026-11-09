// Learn zone: Paths, FIRST and BIOBUZZ, Setup and FAQ, Build tips, AI agents, Glossary.
// FIRST facts and links are real. Progress, badges and team details are sample data.
import { $, $$, esc, clamp, icon, tag, SAMPLE, strip, avStack, bar, seg, wireSeg, acc, copyText, codeBlock, drawer, closeDrawer, gl, GLOSSARY, KIDS } from './common.js';

const TYPE_IC = { Read: 'book', Do: 'wrench', Quiz: 'check', Sim: 'sliders', Explore: 'focus', Challenge: 'trophy' };
const soft = 'background:var(--raised);color:var(--text)';

// ================================================================= Paths
// Steps: [title, type, minutes, go: [zone, sub tab] or null, lesson: [intro, steps[], tip] or null]
const PATHS = [
  { id: 'safety', t: 'Shop safety', ic: 'alert', badge: 'Shop safety', d: 'Glasses, tools, batteries and what to do when something goes wrong. Everyone finishes this before using a tool.', steps: [
    ['Safety glasses on, every time', 'Read', 3], ['Which tools need a mentor next to you', 'Read', 5], ['Batteries: charging, carrying and storing', 'Read', 4], ['Walk the shop with a mentor', 'Do', 10], ['Safety quiz', 'Quiz', 5]] },
  { id: 'onshape', t: 'Onshape Basics', ic: 'layers', badge: 'Onshape Basics', d: 'Sketch, extrude and put parts together in the browser CAD the team uses. Works on Chromebooks.', steps: [
    ['Join the team Onshape classroom', 'Do', 5], ['Sketch a bracket', 'Do', 20], ['Extrude it, round the corners, add holes', 'Do', 15], ['Mate two parts together', 'Do', 20], ['Share it with Coach', 'Do', 5]] },
  { id: 'cad', t: 'CAD for FTC', ic: 'bot', badge: 'CAD for FTC', d: 'Design with real goBILDA parts, the same ones on our StarterBot, so what you draw is what you can build.', steps: [
    ['Onshape Lesson 1: bring in real goBILDA parts', 'Do', 25, null, ['goBILDA puts a CAD file (a STEP file) on every product page, so you never have to draw a motor or a channel yourself.', ['Find the 5203 Yellow Jacket motor on gobilda.com. It is the motor on our drivetrain.', 'Download its STEP file from the product page.', 'In your Onshape document, click <b>Import</b> and pick the file.', 'Put it in an assembly next to a U-channel and mate them together.', 'Take a screenshot and post it in #build.'], 'Stuck? Pixel finished this path and is happy to help.']],
    ['Model a channel with the right hole pattern', 'Do', 20], ['Build a mini drivetrain assembly', 'Do', 40], ['Find our StarterBot parts in 3D', 'Explore', 10, ['robot', 'Specs and parts']], ['Design a part for the Print Shop', 'Do', 30, ['build', 'Print Shop']]] },
  { id: 'mech', t: 'Mechanisms 101', ic: 'wrench', badge: 'Mechanisms 101', d: 'Gears, wheels, intakes and launchers: how they work and how to test them.', steps: [
    ['Gears, torque and speed', 'Read', 8], ['Try the intake compression sim', 'Sim', 10, ['build', 'Mechanism Lab']], ['How a flywheel launches a ball', 'Read', 6], ['Build a two-wheel test rig', 'Do', 30], ['Mechanisms quiz', 'Quiz', 5]] },
  { id: 'java', t: 'Java OpModes', ic: 'code', badge: 'Java OpModes', d: 'Write the programs the robot runs, in OnBot Java, from "Hello" to driving.', steps: [
    ['Set up OnBot Java on your device', 'Do', 10, ['learn', 'Setup and FAQ']], ['Your first OpMode: Hello Robot', 'Do', 15], ['Read the gamepad', 'Do', 15], ['Drive a motor with a stick', 'Do', 20],
    ['Telemetry: make the robot talk', 'Do', 10, ['code', 'Snippets'], ['Telemetry puts numbers on the Driver Station screen while your OpMode runs. It is the fastest way to find out what the robot thinks is happening.', ['Inside your loop, add <code>telemetry.addData("Left stick", gamepad1.left_stick_y);</code>', 'Add <code>telemetry.update();</code> at the end of the loop, or nothing shows.', 'Build it, run it and move the stick. The number should follow your thumb.', 'Add one more line that shows something you care about, like a motor power.'], 'Snippets has a ready-made version called "Telemetry you can read".']],
    ['Change our TeleOp, with Byte', 'Do', 30, ['code', 'Our code']]] },
  { id: 'drive', t: 'Driving', ic: 'gamepad', badge: 'Driver', d: 'Field sense and smooth driving, practiced in the Arena before the real robot.', steps: [
    ['Drive the Arena practice drill', 'Do', 10, ['code', 'BioBuzz Arena']], ['Collect 10 pollen in under 40 seconds', 'Challenge', 10, ['code', 'BioBuzz Arena']], ['Driver Station: Init, Start, Stop', 'Read', 5], ['Practice with the real robot', 'Do', 30]] },
  { id: 'print', t: '3D printing', ic: 'printer', badge: 'First print', d: 'From an Onshape part to a printed one that fits, without wasting a spool.', steps: [
    ['What an STL and a slicer are', 'Read', 5], ['Why prints fail', 'Read', 6, ['learn', 'Build tips']], ['Request your first print', 'Do', 10, ['build', 'Print Shop']], ['Check that it fits, then log it', 'Do', 10]] },
  { id: 'wire', t: 'Wiring and power', ic: 'zap', badge: 'Wiring', d: 'The Control Hub, ports, batteries and wires that survive a match.', steps: [
    ['Inside the Control Hub', 'Read', 6, null, ["The Control Hub is the robot's brain: it runs your code and talks to every motor, servo and sensor.", ['Find the four motor ports (0 to 3) and the six servo ports (0 to 5).', 'Find where the sensors plug in.', 'Look at our robot: which port is each drive motor on? The names are in the hardware map in Code, Our code.', 'Ask Echo to show you the battery and the power switch.'], 'Never plug or unplug a wire while the robot is powered on.']],
    ['Motor and servo ports', 'Read', 6], ['Battery care and the main switch', 'Read', 5], ['Crimp and label a wire', 'Do', 20], ['Wiring check with Echo', 'Do', 10]] },
  { id: 'port', t: 'Portfolio and outreach', ic: 'note', badge: 'Portfolio', d: 'Tell the story of how we designed the robot, and share it with people outside the team.', steps: [
    ['What judges look for', 'Read', 6],
    ['Write a good session note', 'Do', 10, ['logbook', 'Sessions'], ['A good note makes the portfolio almost write itself. Judges love seeing what you tried, what happened and what you changed.', ['Write what you tried in one line, with numbers: "Gecko wheels 4 mm closer: 7 of 10 balls."', 'Add one photo of the part or the test, not of people.', 'Write one "I like", one "I wonder" and one "What if".', 'List the next steps, with a name on each.'], '']],
    ['Take photos that tell a story', 'Read', 5], ['Draft one portfolio section', 'Do', 30, ['logbook', 'Portfolio']], ['Practice the judging interview', 'Do', 20]] },
];
// Sparky's sample progress (steps done). It matches Sparky's badges in Crew, People.
const PROG = { safety: 5, onshape: 5, cad: 0, mech: 5, java: 4, drive: 4, print: 4, wire: 0, port: 1 };
const isDone = (p) => PROG[p.id] >= p.steps.length;
const mins = (p) => p.steps.reduce((a, s) => a + s[2], 0);

function paths(view, ctx) {
  let cur = ctx.state.path || 'cad';
  view.innerHTML = `<div class="zv">
    ${strip('Short paths that end in a badge. Each step is a few minutes of reading or doing, and many open the right place in the Hub. Mentors see who is stuck and can help.', [tag('Phase 3 · Jan 4–22'), SAMPLE])}
    <article class="card">
      <div class="card-head"><h3 class="card-title">Your paths</h3><span class="tag" id="pathSum"></span></div>
      <div class="paths" id="pathGrid"></div>
    </article>
    <article class="card c8" id="pathDetail"></article>
    <article class="card c4">
      <div class="card-head"><h3 class="card-title">Team badges</h3>${tag('Sample')}</div>
      <div class="items" id="teamBadges"></div>
    </article>
  </div>`;
  const grid = () => {
    const doneN = PATHS.filter(isDone).length;
    $('#pathSum').textContent = `${doneN} of ${PATHS.length} badges`;
    $('#pathGrid').innerHTML = PATHS.map((p) => {
      const n = PROG[p.id], all = p.steps.length, d = isDone(p);
      return `<button class="path" type="button" data-path="${p.id}" aria-pressed="${p.id === cur}">
        <span class="row"><span class="oc2${d ? ' solid' : ''}">${icon(p.ic, 'i sm')}</span>${d ? `<span class="st volt">${icon('check', 'i sm')}Badge earned</span>` : n ? '<span class="st">In progress</span>' : '<span class="st">New</span>'}</span>
        <h4>${p.t}</h4>
        <span class="cap">${n} of ${all} steps · about ${mins(p)} min</span>
        ${bar((n / all) * 100, `${n} of ${all} steps done`)}
      </button>`;
    }).join('');
    $('#teamBadges').innerHTML = PATHS.map((p) => {
      const who = KIDS.filter((k) => (k.n === 'Sparky' ? isDone(p) : k.badges.includes(p.badge))).map((k) => k.n);
      return `<div class="it"><span class="oc2">${icon(p.ic, 'i sm')}</span><div class="grow"><div class="t">${p.badge}</div><div class="meta cap">${who.length} of 7</div></div><span class="end">${who.length ? avStack(who.slice(0, 5), 22) : '<span class="cap">Nobody yet</span>'}</span></div>`;
    }).join('');
  };
  const detail = (pop) => {
    const p = PATHS.find((x) => x.id === cur), n = PROG[p.id];
    $('#pathDetail').innerHTML = `<div class="card-head"><span class="oc2${isDone(p) ? ' solid' : ''}">${icon(p.ic, 'i sm')}</span><h3 class="card-title">${p.t}</h3><span class="tag">${n} of ${p.steps.length}</span></div>
      <p class="lead">${p.d}</p>
      ${pop ? `<div class="badge-pop" role="status"><span class="medal">${icon('trophy', 'i lg')}</span><div><b>Badge earned: ${p.badge}</b><div>It's on your profile in Crew, People, and Coach gets a note to say well done.</div></div></div>` : ''}
      <ol class="lsteps">${p.steps.map(([t, type, m, go, les], i) => {
        const st = i < n ? 'done' : i === n ? 'now' : 'lock';
        const acts = st === 'done' ? `<span class="cap row" style="gap:4px">${icon('check', 'i sm')}Done</span>${i === n - 1 ? '<button class="btn ghost pill sm" type="button" data-undo="1">Undo</button>' : ''}`
          : st === 'now' ? `${les ? `<button class="btn soft pill sm" type="button" data-lesson="${i}">Open</button>` : go ? `<button class="btn soft pill sm" type="button" data-go="${i}">${icon('arrow', 'i sm')}Open</button>` : ''}<button class="btn primary pill sm" type="button" data-done="1">Mark done</button>`
            : '<span class="cap">Locked</span>';
        return `<li class="lstep ${st}"><span class="n">${st === 'done' ? icon('check', 'i sm') : i + 1}</span><div style="min-width:0"><div class="t">${t}</div><div class="cap row" style="gap:6px">${icon(TYPE_IC[type], 'i sm')}${type} · ${m} min${go ? ` · opens ${go[1]}` : ''}</div></div><div class="row">${acts}</div></li>`;
      }).join('')}</ol>`;
  };
  grid(); detail(false);
  const markDone = () => {
    const p = PATHS.find((x) => x.id === cur);
    if (isDone(p)) return;
    PROG[p.id]++;
    const fin = isDone(p);
    grid(); detail(fin);
    if (fin) ctx.toast(`Badge earned: ${p.badge}.`);
    const next = $('#pathDetail .lstep.now [data-done]');
    if (next) next.focus({ preventScroll: true });
  };
  view.addEventListener('click', (e) => {
    const pb = e.target.closest('[data-path]');
    if (pb) {
      cur = pb.dataset.path; ctx.state.path = cur;
      $$('[data-path]', view).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.path === cur)));
      detail(false);
      if (matchMedia('(max-width: 1099px)').matches) $('#pathDetail').scrollIntoView({ behavior: ctx.reduced ? 'auto' : 'smooth', block: 'start' });
      return;
    }
    if (e.target.closest('[data-done]')) { markDone(); return; }
    if (e.target.closest('[data-undo]')) { PROG[cur] = Math.max(0, PROG[cur] - 1); grid(); detail(false); return; }
    const g = e.target.closest('[data-go]');
    if (g) { const s = PATHS.find((x) => x.id === cur).steps[+g.dataset.go]; ctx.go(s[3][0], s[3][1]); return; }
    const l = e.target.closest('[data-lesson]');
    if (l) {
      const p = PATHS.find((x) => x.id === cur), i = +l.dataset.lesson, [t, type, m, go, les] = p.steps[i];
      const el = drawer(`<span class="cap">${p.t} · step ${i + 1} of ${p.steps.length}</span><h3>${t}</h3>
        <div class="row wrap"><span class="st">${icon(TYPE_IC[type], 'i sm')}${type}</span><span class="st">${icon('clock', 'i sm')}${m} min</span></div>
        <p>${les[0]}</p>
        <ol class="bul">${les[1].map((x) => `<li>${x}</li>`).join('')}</ol>
        ${les[2] ? `<div class="callout" style="${soft}">${icon('bulb')}<div>${les[2]}</div></div>` : ''}
        <div class="row wrap">${go ? `<button class="btn soft pill" type="button" data-lgo="1">${icon('arrow', 'i sm')}Open ${go[1]}</button>` : ''}<button class="btn primary pill" type="button" data-ldone="1">${icon('check', 'i sm')}Mark done</button></div>`, { label: t });
      el.addEventListener('click', (ev) => {
        if (ev.target.closest('[data-ldone]')) { closeDrawer(); markDone(); }
        if (ev.target.closest('[data-lgo]')) { closeDrawer(); ctx.go(go[0], go[1]); }
      });
    }
  });
}

// ================================================================= FIRST and BIOBUZZ
const CORE = [
  ['Discovery', 'We explore new skills and ideas.', 'Trying the gecko wheels 4 mm closer when nobody knew if it would work.'],
  ['Innovation', 'We use creativity and persistence to solve problems.', 'Ten tests on the servo gate so far, and still going.'],
  ['Impact', 'We apply what we learn to improve our world.', "Nova's robot demo at the library in December."],
  ['Inclusion', 'We respect each other and embrace our differences.', 'Everyone gets Arena time, not just the drivers.'],
  ['Teamwork', 'We are stronger when we work together.', 'Pixel measures, Nova writes it down, then they swap.'],
  ['Fun', 'We enjoy and celebrate what we do!', 'Shoutouts on the shop TV at the end of every meeting.'],
];
const LINKS = [
  ['Competition Manual', 'The official game and robot rules', 'https://ftc.game/manual/'],
  ['Team Updates', 'Rule changes during the season', 'https://ftc.game/tu-latest'],
  ['Field resources', 'Field drawings and CAD', 'https://ftc-resources.firstinspires.org/ftc/field'],
  ['Scoring calculator', 'Work out a match score', 'https://ftc.game/calculator'],
  ['Rules chatbot', "FIRST's AI helper for the manual", 'https://ftc-cmchatbot.firstinspires.org/'],
  ['FTC Docs', 'Control Hub and programming guides', 'https://ftc-docs.firstinspires.org/'],
  ['Community forum', 'Questions and answers from other teams', 'https://ftc-community.firstinspires.org/'],
];
const QUIZ = {
  q: "Before a match, your alliance partner's robot won't connect to their Driver Station. What's the most Gracious Professionalism thing to do?",
  a: [
    ["Stay out of it. It's their robot.", "Not quite. You're on the same alliance, and helping each other is how alliances win."],
    ['Offer help: a spare cable, a calm extra pair of hands, or your team\'s coder.', "Yes. Helping a partner, even one you'll play against later, is Gracious Professionalism and Coopertition in one move."],
    ['Ask the referee to start without them.', 'That helps nobody. The referees decide the timing, and your alliance needs both robots.'],
    ['Complain about them online after the match.', 'No. Talk to people, not about them. It is in our team agreement too.'],
  ],
  right: 1,
};
const AGREE = ['Be kind and helpful, to teammates and to other teams.', 'Compete hard and treat everyone well: Gracious Professionalism.', 'Safety first: glasses on, and tools only with a mentor nearby.', 'Keep personal info private. Display names and robot avatars only.', 'Team chat only, no private messages. Mentors can see everything.', 'Ask for help, and help when someone asks you.', 'Tell a mentor if something feels wrong, online or in the shop.'];
const COMP_FAQ = [
  ['What happens at a league meet?', 'You play several matches, each with a different alliance partner, and your scores count toward the league rankings. Judged awards usually happen at tournaments and qualifiers. Each event\'s page says what to expect.'],
  ["What's inspection?", 'Before you play, inspectors check that the robot follows the robot rules and is safe. Practice with the checklist in Logbook, Competitions, and bring the official checklist from the manual.'],
  ['What do judges ask?', "How you designed things, what you tried that didn't work, and how the team works together. Everyone should be ready to talk about their own part. Your session notes are the best practice."],
  ['What if our robot breaks?', "Fix it in the pits. Ask other teams for a part or a hand. That's Coopertition, and they'll ask you too."],
  ['Who registers the team?', 'Coach registers the team with FIRST. Each of you is added in the FIRST Dashboard, and a parent or guardian fills in the consent and release form.'],
  ['Can families come?', 'Yes. Most events are free to watch. Check the event page for the schedule.'],
  ['Where do official answers come from?', 'The Competition Manual, the Team Updates and the official Q&A. When a rule question matters for the robot, Coach asks the Q&A and the answer gets pinned here.'],
];
function seasonStep(d = new Date()) {
  const m = d.getMonth();
  if (m === 8 && d.getDate() < 12) return 0;
  if (m >= 8) return 1;
  if (m <= 1) return 2;
  if (m === 2) return 3;
  if (m === 3) return 4;
  return -1;
}
function first(view, ctx) {
  const now = seasonStep();
  let cv = 0;
  view.innerHTML = `<div class="zv">
    ${strip("What FIRST is, how a season runs, and where BIOBUZZ's official rules live. Game rules stay as links to FIRST's own pages, so nothing here goes out of date.", [tag('Opens Dec 1'), tag('Game guide fills in after the manual')])}
    <article class="card c7 stretch">
      <div class="card-head"><h3 class="card-title">How an FTC season runs</h3><span class="tag">BIOBUZZ 2026–27</span></div>
      <div class="season-run">${['Kickoff|Sep 12 · the game is revealed', 'Build and practice|Design, build, test', 'Meets and qualifiers|Winter · matches and judging', 'Championships|Late winter · state or region', 'FIRST Championship|April · teams earn a spot'].map((s, i) => { const [a, b] = s.split('|'); return `<div class="${i === now ? 'now' : ''}">${a}<span>${i === now ? `We are here · ${b}` : b}</span></div>`; }).join('')}</div>
      <h4 class="sub">What a match looks like</h4>
      <div class="items">
        <div class="it"><span class="oc2">${icon('bot', 'i sm')}</span><div class="grow"><div class="t">${gl('Autonomous')}</div><div class="meta cap">The robot runs your code by itself. Hands off the controllers.</div></div><span class="st">30 s</span></div>
        <div class="it"><span class="oc2">${icon('gamepad', 'i sm')}</span><div class="grow"><div class="t">Driver-controlled (${gl('TeleOp')})</div><div class="meta cap">Two drivers per team, using gamepads.</div></div><span class="st">2 min</span></div>
        <div class="it"><span class="oc2">${icon('flag', 'i sm')}</span><div class="grow"><div class="t">Endgame</div><div class="meta cap">The last part of driver control, often with bonus tasks.</div></div><span class="st">End</span></div>
      </div>
      <p class="cap" style="font-weight:400">Two ${gl('alliances', 'Alliance')} of two teams play each match, red against blue. Timings here are from recent seasons; BIOBUZZ's exact timing and scoring are in the Competition Manual.</p>
    </article>
    <article class="card c5 stretch">
      <div class="card-head"><h3 class="card-title">FIRST Core Values</h3></div>
      <div class="cv" id="cv">${CORE.map(([n], i) => `<button type="button" data-cv="${i}" aria-pressed="${i === cv}">${n}</button>`).join('')}</div>
      <div id="cvBody"></div>
    </article>
    <article class="card c6 stretch">
      <div class="card-head"><span class="oc2">${icon('users', 'i sm')}</span><h3 class="card-title">The two big ideas</h3></div>
      <div class="cmp">
        <div><h5>${gl('Gracious Professionalism')}</h5><p class="lead">Compete hard, and treat everyone with respect and kindness while you do.</p><ul class="bul"><li>Cheer for good plays, even the other alliance's.</li><li>Say thank you to volunteers and referees.</li><li>Win and lose the same way: kindly.</li></ul></div>
        <div><h5>${gl('Coopertition')}</h5><p class="lead">Help other teams and learn from them, even while you compete.</p><ul class="bul"><li>Lend a spare part in the pits.</li><li>Explain how your intake works if someone asks.</li><li>Scout to learn, never to make fun.</li></ul></div>
      </div>
    </article>
    <article class="card c6 stretch">
      <div class="card-head"><span class="oc2 volt">${icon('book', 'i sm')}</span><h3 class="card-title">BIOBUZZ game guide</h3><span class="tag">Official links</span></div>
      <p class="lead">The kid-friendly guide to scoring and field elements gets written after the team reads the manual together. Until then, these are FIRST's own pages.</p>
      <div class="links">${LINKS.map(([t, s, u]) => `<a href="${u}" target="_blank" rel="noopener noreferrer"><span>${t}<small>${s}</small></span>${icon('arrow', 'i sm')}</a>`).join('')}</div>
      <p class="cap" style="font-weight:400">Team Updates can change the rules mid-season. Coach posts a summary in #announcements each time one comes out.</p>
    </article>
    <article class="card c6 stretch">
      <div class="card-head"><span class="oc2">${icon('help', 'i sm')}</span><h3 class="card-title">Question of the week</h3>${tag('Gracious Professionalism')}</div>
      <p><b>${QUIZ.q}</b></p>
      <div class="quiz" id="quiz">${QUIZ.a.map(([a], i) => `<button type="button" data-q="${i}"><span class="oc2" style="width:28px;height:28px">${'ABCD'[i]}</span><span>${a}</span></button>`).join('')}</div>
      <div id="quizOut" aria-live="polite"></div>
    </article>
    <article class="card c6 stretch">
      <div class="card-head"><span class="oc2">${icon('check', 'i sm')}</span><h3 class="card-title">Our team agreement</h3>${tag('Sample')}</div>
      <p class="lead">What everyone agreed to at sign-up. Parents and guardians agreed to it too.</p>
      <ul class="checks">${AGREE.map((a) => `<li><span class="ci ok">${icon('check')}</span>${a}</li>`).join('')}</ul>
      <div class="card-foot"><span class="cap">You agreed when you signed up · sample</span><button class="btn ghost pill sm" type="button" data-toast="Coach can update the agreement in Coach tools. Everyone re-agrees after a change.">${icon('note', 'i sm')}Changes</button></div>
    </article>
    <article class="card">
      <div class="card-head"><h3 class="card-title">Competition questions</h3></div>
      <div class="accs">${COMP_FAQ.map(([q, a], i) => acc(q, a, i === 0)).join('')}</div>
    </article>
  </div>`;
  const cvDraw = () => {
    const [n, d, ours] = CORE[cv];
    $('#cvBody').innerHTML = `<p style="font:500 22px/28px Outfit,sans-serif">${d}</p><div class="callout" style="${soft}">${icon('sparkle')}<div><b>On our team:</b> ${ours} <span class="muted">(sample)</span></div></div><p class="cap" style="font-weight:400">${n} is one of the six FIRST Core Values. Judges look for them in how you work, not just in what you say.</p>`;
  };
  cvDraw();
  $('#cv').addEventListener('click', (e) => { const b = e.target.closest('[data-cv]'); if (!b) return; cv = +b.dataset.cv; $$('#cv button').forEach((o) => o.setAttribute('aria-pressed', String(o === b))); cvDraw(); });
  $('#quiz').addEventListener('click', (e) => {
    const b = e.target.closest('[data-q]');
    if (!b) return;
    const i = +b.dataset.q;
    $$('#quiz button').forEach((o) => o.removeAttribute('data-res'));
    b.dataset.res = i === QUIZ.right ? 'right' : 'wrong';
    if (i !== QUIZ.right) $(`#quiz [data-q="${QUIZ.right}"]`).dataset.res = 'right';
    $('#quizOut').innerHTML = `<div class="verdict${i === QUIZ.right ? ' good' : ''}">${icon(i === QUIZ.right ? 'check' : 'bulb')}<div>${QUIZ.a[i][1]}</div></div>`;
  });
}

// ================================================================= Setup and FAQ
const DEVICES = [['cb', 'Chromebook'], ['win', 'Windows'], ['mac', 'Mac'], ['ph', 'Phone or tablet']];
const WORKS = [
  ['The Hub', 'home', { cb: 'y', win: 'y', mac: 'y', ph: 'y' }, 'Any up-to-date browser. On a phone, add it to your home screen.'],
  ['3D robot', 'bot', { cb: 'y', win: 'y', mac: 'y', ph: 'm' }, 'The full 28-million-triangle robot, a 143 MB download. Use Wi-Fi, and close other tabs on older phones.'],
  ['BioBuzz Arena', 'gamepad', { cb: 'y', win: 'y', mac: 'y', ph: 'y' }, 'Keyboard or gamepad on a laptop, touch controls on a phone.'],
  ['OnBot Java and Blocks', 'code', { cb: 'y', win: 'y', mac: 'y', ph: 'm' }, "In the browser, on the robot's Wi-Fi. It works on a phone, but the screen is tiny."],
  ['Android Studio', 'code', { cb: 'n', win: 'y', mac: 'y', ph: 'n' }, 'Later in the season, for bigger code. Needs a Windows or Mac laptop with 8 GB of memory or more.'],
  ['Onshape', 'layers', { cb: 'y', win: 'y', mac: 'y', ph: 'm' }, 'Full CAD in the browser. The phone app is great for looking, harder for building.'],
  ['Print Shop upload', 'printer', { cb: 'y', win: 'y', mac: 'y', ph: 'y' }, 'Upload an STL from Files or Downloads.'],
  ['Gamepad in the Arena', 'gamepad', { cb: 'y', win: 'y', mac: 'y', ph: 'm' }, 'USB or Bluetooth on laptops. Some phones work with a Bluetooth controller.'],
  ['Driver Station app', 'sliders', { cb: 'n', win: 'n', mac: 'n', ph: 'm' }, "Android only. The team's Driver Hub or an Android phone runs it; iPhones can't."],
];
const DEV_TIPS = {
  cb: ['Keep ChromeOS up to date: Settings, About ChromeOS.', 'OnBot Java and Blocks run right in Chrome.', "A school-managed Chromebook may block the robot's Wi-Fi. If it does, tell Coach and pair up with a teammate for now."],
  win: ['Use Chrome or Edge.', 'Android Studio runs here later in the season.', "If the robot's Wi-Fi won't connect, forget the network and join it again."],
  mac: ['Use Chrome, Safari or Firefox.', 'Android Studio runs here later in the season.', "If your Mac jumps back to another Wi-Fi, pick the robot's network again."],
  ph: ['The Hub, the Arena and the 3D robot all work here.', 'Add the Hub to your home screen so it opens like an app.', 'For OnBot Java, a laptop is much easier.'],
};
const HELLO = `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;

// Your first OpMode. It says hello, then shows the left stick.
@TeleOp(name = "Hello Robot", group = "Learn")
public class HelloRobot extends LinearOpMode {
    @Override
    public void runOpMode() {
        telemetry.addLine("Hello from Kilowattchaos!");
        telemetry.update();

        waitForStart();   // waits here until you press Start

        while (opModeIsActive()) {
            telemetry.addData("Left stick Y", gamepad1.left_stick_y);
            telemetry.update();
        }
    }
}`;
const OBJ_STEPS = [
  ['Turn on the robot', 'Flip the main switch and give the Control Hub about 30 seconds to start up.'],
  ["Join the robot's Wi-Fi", "Its network name is on the label on the Control Hub. Coach has the password."],
  ['Open the Robot Controller page', 'In Chrome, go to <span class="mono">192.168.43.1:8080</span>.'],
  ['Click OnBot Java', 'It is at the top of the page. Your team code is in the TeamCode folder.'],
  ['Make a new file', 'Click the plus, name it <b>HelloRobot</b>, choose TeleOp and click OK.'],
  ['Paste the code and build', 'Paste the code below, then click the wrench to build. "Build SUCCESSFUL" means it worked.'],
  ['Run it', 'On the Driver Station, pick Hello Robot from the TeleOp list, press Init, then Start.'],
];
const DEV_FAQ = [
  ["My laptop can't see the robot's Wi-Fi", 'Check the robot is on and has had a minute to start. Move closer. If your device is managed by a school, it may block other networks. Tell Coach, and pair up with a teammate whose device connects.'],
  ['The build has red errors', 'Read the first error only, and look at its line number. A missing <b>;</b> or <b>}</b> causes most of them. Still stuck? Post the error in #help.'],
  ['Where does my code live?', "On the Control Hub. It also gets copied into the team's code repository, so nothing is lost. Code, Our code shows it."],
  ['Can I code at home?', 'Yes. Try ideas in the BioBuzz Arena and Snippets. OnBot Java needs the robot, so build those changes at the next meeting.'],
  ['Which gamepad is which?', 'On the Driver Station, press Start and A together on a gamepad to make it gamepad 1, the driver. Start and B makes it gamepad 2, the operator.'],
  ['The Hub is slow on my phone', 'Close other tabs, and turn off low power mode while you use the 3D robot. Robot, Specs and parts has everything without 3D.'],
  ['How do I install the Hub like an app?', 'On Android in Chrome: menu, then Add to Home screen. On an iPhone in Safari: Share, then Add to Home Screen.'],
  ['How do I switch to Night shift?', 'Tap the moon at the top. The Hub remembers your choice on this device.'],
];
function detectDevice() {
  const ua = navigator.userAgent;
  if (/CrOS/.test(ua)) return 'cb';
  if (/Android|iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ph';
  if (/Mac/.test(ua)) return 'mac';
  return 'win';
}
const works = (v) => (v === 'y' ? `<span class="works y">${icon('check', 'i sm')}Works</span>` : v === 'm' ? `<span class="works m">${icon('alert', 'i sm')}With limits</span>` : `<span class="works n">${icon('x', 'i sm')}Not on this one</span>`);
function setup(view, ctx) {
  const auto = detectDevice();
  let dev = ctx.state.device || auto;
  view.innerHTML = `<div class="zv">
    ${strip("Everyone uses their own device, so this page shows what works on yours. OnBot Java comes first: it runs in a browser on the robot's Wi-Fi, so it works on Chromebooks.", [tag('Opens Dec 1')])}
    <article class="card c7">
      <div class="card-head"><h3 class="card-title">What works on your device</h3></div>
      <div class="row wrap">${seg('dev', DEVICES, dev, 'Your device')}<span class="cap" id="devAuto"></span></div>
      <div class="items" id="worksList"></div>
    </article>
    <article class="card c5">
      <div class="card-head"><span class="oc2 volt">${icon('bulb', 'i sm')}</span><h3 class="card-title" id="tipsTitle"></h3></div>
      <ul class="bul" id="devTips"></ul>
      <hr class="hr">
      <h4 class="sub">Before you switch Wi-Fi</h4>
      <p class="lead">On the robot's Wi-Fi your device has no internet, so the Hub won't load. Copy the code you need first, or keep it open in a tab.</p>
    </article>
    <article class="card c7">
      <div class="card-head"><span class="oc2 solid">${icon('code', 'i sm')}</span><h3 class="card-title">Your first OnBot Java program</h3><span class="tag">About 15 minutes</span></div>
      <ol class="lsteps">${OBJ_STEPS.map(([t, d], i) => `<li class="lstep"><span class="n">${i + 1}</span><div style="min-width:0"><div class="t">${t}</div><div class="cap" style="font-weight:400;font-size:13px;line-height:19px">${d}</div></div><div class="row">${i === 2 ? '<button class="btn soft pill sm" type="button" id="copyAddr">Copy</button>' : ''}</div></li>`).join('')}</ol>
      <div class="code-head"><span class="path">TeamCode/HelloRobot.java</span><button class="btn ghost pill sm" type="button" id="copyHello" style="margin-left:auto">Copy code</button></div>
      ${codeBlock(HELLO)}
      <p class="cap" style="font-weight:400">Try it at home first: Snippets has the same idea, and the Arena shows what your stick does.</p>
    </article>
    <article class="card c5">
      <div class="card-head"><h3 class="card-title">Device questions</h3></div>
      <div class="accs">${DEV_FAQ.map(([q, a]) => acc(q, a)).join('')}</div>
    </article>
  </div>`;
  const draw = () => {
    const name = DEVICES.find((d) => d[0] === dev)[1];
    $('#devAuto').textContent = dev === auto ? 'This looks like your device' : `This device looks like: ${DEVICES.find((d) => d[0] === auto)[1]}`;
    $('#worksList').innerHTML = WORKS.map(([t, ic, w, note]) => `<div class="it"><span class="oc2">${icon(ic, 'i sm')}</span><div class="grow"><div class="t">${t}</div><div class="meta cap" style="font-weight:400">${note}</div></div><span class="end">${works(w[dev])}</span></div>`).join('');
    $('#tipsTitle').textContent = `Tips for ${name === 'Phone or tablet' ? 'phones and tablets' : name}`;
    $('#devTips').innerHTML = DEV_TIPS[dev].map((t) => `<li>${t}</li>`).join('');
  };
  draw();
  wireSeg(view, 'dev', (v) => { dev = v; ctx.state.device = v; draw(); });
  $('#copyAddr').addEventListener('click', () => copyText('http://192.168.43.1:8080', ctx.toast));
  $('#copyHello').addEventListener('click', () => copyText(HELLO, ctx.toast));
}

// ================================================================= Build tips
const TIPS = [
  ['bolt', 'Heat-set inserts', 'Screws in plastic strip out. Press a brass insert into the hole with a hot iron, with a mentor, and screw into metal instead.', 'Printing'],
  ['wrench', 'Thread-locker, carefully', 'Blue thread-locker stops screws shaking loose on metal parts. Keep it off printed and clear plastic parts, because it can crack them.', 'Hardware'],
  ['zap', 'Wire it like you will fix it', 'Leave a little slack, add strain relief, label both ends, and keep wires away from anything that spins.', 'Wiring'],
  ['check', 'Check before every match', 'Wheel screws, battery strap, every plug pushed in, and nothing loose in the intake. Two minutes saves a match.', 'Habit'],
  ['layers', 'Hex beats round', "Wheels and gears on a hex shaft can't slip. Put a collar on each side so nothing slides along it.", 'Hardware'],
  ['focus', 'Measure the real part', 'Measure with calipers before you design around a part. The CAD and the real thing often differ by a little.', 'Habit'],
];
const FAILS = [
  ['Warping', 'Corners lift off the bed.', 'Clean the bed, add a brim, keep drafts away.'],
  ['Spaghetti', 'The part came loose mid-print.', 'Check the first layer; use glue stick on the bed.'],
  ['Stringing', 'Thin hairs between parts.', 'Dry the filament; lower the temperature a little.'],
  ['Layer split', 'The part snaps along a layer line.', 'Print a bit hotter, or turn the part (see above).'],
  ['Holes too small', "A shaft or screw won't fit.", 'Print a test strip, or drill the hole to size.'],
];
function ribsArt(t) {
  const L = 250, x0 = 34, y0 = 52, h = t * 3.2;
  const tip = Math.min(64, 26 * Math.pow(3 / t, 3));
  const pts = [];
  for (let i = 0; i <= 24; i++) { const k = i / 24; pts.push([x0 + k * L, y0 + tip * (k * k * (3 - k)) / 2]); }
  const top = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const bot = pts.slice().reverse().map((p) => `L${p[0].toFixed(1)} ${(p[1] + h).toFixed(1)}`).join(' ');
  const [ex, ey] = pts[pts.length - 1];
  return `<svg viewBox="0 0 320 150" role="img" aria-label="A ${t} mm plate bending under a load">
    <defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="var(--stone)" stroke-width="2"/></pattern></defs>
    <rect x="16" y="20" width="18" height="110" fill="url(#hatch)"/><line x1="34" y1="20" x2="34" y2="130" stroke="var(--text)" stroke-width="2"/>
    <rect x="${x0}" y="${y0}" width="${L}" height="${h}" fill="none" stroke="var(--stone)" stroke-dasharray="4 4"/>
    <path d="${top} ${bot} Z" fill="var(--solid)" opacity=".9"/>
    <path d="M${ex - 12} ${ey - 30}v22" stroke="var(--negative)" stroke-width="3" stroke-linecap="round"/><path d="m${ex - 18} ${ey - 14} 6 7 6-7" fill="none" stroke="var(--negative)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="${x0 + L}" y="146" text-anchor="end" font-size="11" fill="var(--muted)" font-family="Inter">Bend at the tip: ${Math.round(Math.pow(3 / t, 3) * 100)}% of a 3 mm plate</text>
  </svg>`;
}
function orientArt(o) {
  const lines = (x, y, w, hh) => { let s = ''; for (let yy = y + 4; yy < y + hh; yy += 4) s += `<line x1="${x}" y1="${yy}" x2="${x + w}" y2="${yy}"/>`; return s; };
  const arrow = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--negative)" stroke-width="3" stroke-linecap="round"/><circle cx="${x2}" cy="${y2}" r="4" fill="var(--negative)"/>`;
  let part = '';
  if (o === 'flat') part = `<rect x="50" y="104" width="220" height="24" rx="6" fill="var(--solid)"/><g stroke="var(--on-solid)" stroke-opacity=".35">${lines(52, 104, 216, 24)}</g><circle cx="74" cy="116" r="6" fill="var(--card)"/>${arrow(258, 70, 258, 98)}`;
  else if (o === 'edge') part = `<rect x="50" y="78" width="220" height="50" rx="8" fill="var(--solid)"/><g stroke="var(--on-solid)" stroke-opacity=".35">${lines(52, 78, 216, 50)}</g><path d="M68 103a8 8 0 0 1 16 0v1h-16z" fill="var(--card)"/><path d="M68 104a8 8 0 0 0 16 0" fill="var(--card)"/><path d="M70 97l6-4 6 4" stroke="var(--warn)" stroke-width="2" fill="none"/>${arrow(258, 40, 258, 72)}`;
  else part = `<rect x="146" y="18" width="28" height="110" rx="6" fill="var(--solid)"/><g stroke="var(--on-solid)" stroke-opacity=".35">${lines(148, 18, 24, 110)}</g><circle cx="160" cy="40" r="6" fill="var(--card)"/>${arrow(214, 30, 180, 30)}<path d="M146 112l8 -2 6 3 8 -3 6 2" stroke="var(--negative)" stroke-width="2.4" fill="none"/>`;
  return `<svg viewBox="0 0 320 150" role="img" aria-label="Printed arm, ${o === 'flat' ? 'lying flat' : o === 'edge' ? 'on its edge' : 'standing up'}, with layer lines and the load"><line x1="20" y1="129" x2="300" y2="129" stroke="var(--text)" stroke-width="2"/><text x="300" y="145" text-anchor="end" font-size="11" fill="var(--muted)" font-family="Inter">Print bed</text>${part}</svg>`;
}
const ORIENT = {
  flat: ['good', 'Strong.', 'The layers run along the arm, so the load pulls along the lines, not between them.'],
  edge: ['good', 'Strong, with droopy holes.', 'Still strong, but holes through the side print with a saggy top. Ream them or add supports.'],
  up: ['bad', 'Weak.', 'The load tries to peel the layers apart. Arms printed standing up snap at a layer line.'],
};
function fitArt(gap) {
  const R = 40, r = R - gap * 30;
  return `<svg viewBox="0 0 320 150" role="img" aria-label="Bearing in a printed hole with a ${gap.toFixed(2)} mm gap"><rect x="90" y="5" width="140" height="140" rx="22" fill="var(--solid)" opacity=".9"/><circle cx="160" cy="75" r="${R}" fill="var(--card)"/><circle cx="160" cy="75" r="${clamp(r, 20, 52)}" fill="none" stroke="${gap < -0.15 ? 'var(--negative)' : 'var(--text)'}" stroke-width="7"/><circle cx="160" cy="75" r="12" fill="var(--well)" stroke="var(--text)" stroke-width="2"/>${gap < -0.15 ? '<path d="M98 30l12 10-6 6 12 10" stroke="var(--negative)" stroke-width="2.6" fill="none"/>' : ''}<text x="236" y="140" font-size="11" fill="var(--muted)" font-family="Inter">Gap drawn 30× bigger</text></svg>`;
}
function fitVerdict(g) {
  if (g < -0.15) return ['bad', 'Too tight.', 'The part cracks when you press the bearing in.'];
  if (g < 0) return ['good', 'Press fit.', 'Needs a firm push or a clamp. Great for bearings that must not move.'];
  if (g <= 0.15) return ['good', 'Snug.', 'Slides in with a little push. Good for a shaft that should not wobble.'];
  if (g <= 0.3) return ['', 'Slip fit.', 'Slides freely. Good for something that spins on a shaft.'];
  return ['bad', 'Loose.', 'It wobbles. Add a shim or print the hole a little smaller.'];
}
function buildtips(view, ctx) {
  let t = 3, o = 'flat', gap = 0.05;
  view.innerHTML = `<div class="zv">
    ${strip('Quick rules of thumb for parts that hold up in a match. The three cards on top are tiny experiments: change the numbers and watch what happens.', [tag('Phase 6 · Mar 1–19'), tag('The numbers are rules of thumb')])}
    <article class="card c4 stretch">
      <div class="card-head"><span class="oc2">${icon('sliders', 'i sm')}</span><h3 class="card-title">Thicker is stiffer, fast</h3></div>
      <div class="sim-art" id="ribArt"></div>
      <div class="ctrl"><label for="ribT">Plate thickness <output id="ribV"></output></label><input type="range" id="ribT" min="2" max="8" step="0.5" value="3"></div>
      <div class="readout" id="ribR"></div>
      <div id="ribVerdict"></div>
      <p class="cap" style="font-weight:400">Stiffness grows with thickness × thickness × thickness. That's why a thin, tall rib stiffens a part with very little plastic.</p>
    </article>
    <article class="card c4 stretch">
      <div class="card-head"><span class="oc2">${icon('layers', 'i sm')}</span><h3 class="card-title">Which way to print it</h3></div>
      <div class="sim-art" id="orArt"></div>
      ${seg('or', [['flat', 'Flat'], ['edge', 'On its edge'], ['up', 'Standing up']], o, 'Print orientation')}
      <div id="orVerdict"></div>
      <p class="cap" style="font-weight:400">Printed parts are weakest between layers. Turn the part so the load runs along the layer lines.</p>
    </article>
    <article class="card c4 stretch">
      <div class="card-head"><span class="oc2">${icon('focus', 'i sm')}</span><h3 class="card-title">Press fits</h3></div>
      <div class="sim-art" id="fitArt"></div>
      <div class="ctrl"><label for="fitG">Gap after printing <output id="fitV"></output></label><input type="range" id="fitG" min="-0.3" max="0.5" step="0.05" value="0.05"></div>
      <div id="fitVerdict"></div>
      <p class="cap" style="font-weight:400">Printers usually make holes 0.1 to 0.3 mm smaller than the CAD. Print a test strip with five hole sizes on your printer and use the one that fits.</p>
    </article>
    <article class="card c8">
      <div class="card-head"><h3 class="card-title">Rules of thumb</h3></div>
      <div class="tips">${TIPS.map(([ic, h, p, k]) => `<div class="tipc"><div class="row"><span class="oc2">${icon(ic, 'i sm')}</span><span class="tag line" style="margin-left:auto">${k}</span></div><h4>${h}</h4><p>${p}</p></div>`).join('')}</div>
    </article>
    <article class="card c4" id="fails">
      <div class="card-head"><span class="oc2">${icon('printer', 'i sm')}</span><h3 class="card-title">Why prints fail</h3></div>
      <div class="items">${FAILS.map(([n, what, fix]) => `<div class="it" style="align-items:flex-start"><div class="grow"><div class="t">${n}</div><div class="meta cap" style="font-weight:400">${what} <b style="color:var(--text);font-weight:500">Fix:</b> ${fix}</div></div></div>`).join('')}</div>
      <button class="btn soft pill" type="button" data-goto="build|Print Shop">${icon('printer', 'i sm')}Request a print</button>
    </article>
  </div>`;
  const verdict = ([k, b, s]) => `<div class="verdict${k === 'good' ? ' good' : ''}">${icon(k === 'bad' ? 'alert' : 'check')}<div><b>${b}</b> ${s}</div></div>`;
  const rib = () => {
    $('#ribArt').innerHTML = ribsArt(t);
    $('#ribV').textContent = `${t} mm`;
    const st = Math.pow(t / 3, 3), wt = t / 3;
    $('#ribR').innerHTML = `<div><b>${st.toFixed(st < 10 ? 1 : 0)}×</b><span>Stiffness</span></div><div><b>${wt.toFixed(1)}×</b><span>Weight</span></div><div><b>${(t * 0.25).toFixed(1)}×</b><span>Print time</span></div>`;
    $('#ribVerdict').innerHTML = verdict(t <= 2.5 ? ['bad', 'Floppy.', 'Fine for a cover, not for anything holding a motor.'] : t < 4 ? ['', 'OK for light brackets.', 'Add a rib if it holds anything that spins.'] : t <= 6 ? ['good', 'Stiff.', 'Good for motor and bearing mounts.'] : ['', 'Very stiff, but heavy.', 'A rib gets you here with far less plastic.']);
  };
  const orient = () => { $('#orArt').innerHTML = orientArt(o); $('#orVerdict').innerHTML = verdict(ORIENT[o]); };
  const fit = () => {
    $('#fitArt').innerHTML = fitArt(gap);
    $('#fitV').textContent = `${gap > 0 ? '+' : ''}${gap.toFixed(2)} mm`;
    $('#fitVerdict').innerHTML = verdict(fitVerdict(gap));
  };
  rib(); orient(); fit();
  $('#ribT').addEventListener('input', (e) => { t = +e.target.value; rib(); });
  wireSeg(view, 'or', (v) => { o = v; orient(); });
  $('#fitG').addEventListener('input', (e) => { gap = Math.round(+e.target.value * 100) / 100; fit(); });
}

// ================================================================= AI agents
const LOOP = [['Ask', 'Say what you want in plain words, with the file name.'], ['Plan', 'The agent writes a plan. You read it before it changes anything.'], ['Change', 'It edits the files, on its own branch.'], ['Test', 'Run it in the Arena, then on the robot with the wheels off the floor.'], ['Review', 'Read every line it changed. Ask it to explain anything new.'], ['Commit', 'Save it with a clear message that says AI helped.']];
const RULES = ['Under 13? A mentor drives the agent and you co-pilot. That is the rule for every AI tool here.', 'Never paste passwords, real names, your school or photos into an AI tool.', 'Read every change before you keep it. You are the one who answers for the code.', 'Test in the Arena first, then on the robot with the wheels off the floor.', 'The agent works on a branch, never straight on the code the robot runs.', 'Say when AI helped: in the commit message, and to judges if they ask.'];
const RECIPES = [
  ['Explain it like I am new', 'Explain what this file does, step by step, in plain words. Then tell me the one line I should understand first.'],
  ['Plan before you change', "Before changing anything, write a short plan: which files you'll touch and why. Wait for me to say go."],
  ['Find the bug', "This OpMode should [what it should do], but it [what it does instead]. Find the likely cause. Don't change code yet; show me where to look."],
  ['Add telemetry', 'Add telemetry so I can see [the value] on the Driver Station while it runs. Change nothing else.'],
  ['Make it safer', "Check this code for ways a motor could keep running when it shouldn't. List them, then fix only the ones I pick."],
  ['Write me a practice task', 'Write a short practice task for a 7th grader learning [topic], with one hint and a way to check it worked.'],
];
const AGENTS_MD = `# AGENTS.md · Kilowattchaos robot code

## About this repo
FTC robot code for team Kilowattchaos, BIOBUZZ season 2026–27.
Our code is in TeamCode/src/main/java/org/firstinspires/ftc/teamcode/.

## Rules for agents
- Write a plan first and wait for a "go" before changing files.
- Only change files inside teamcode/. Never edit FtcRobotController/.
- Keep motor powers between -1 and 1. Never remove stop or safety code.
- Use our hardware names: frontLeft, frontRight, backLeft, backRight,
  intake, launcher, hopperServo.
- Add telemetry for any new value you compute.
- One idea per commit, with a message a 7th grader can read.
- End every commit message with "AI-assisted".

## Checking your work
- It must build: ./gradlew assembleDebug
- Tell us how to test it in the BioBuzz Arena before the real robot.

## Style
- Explain anything new in a short comment.
- Name things for what they do: launcherAtSpeed, not flag2.`;
function agents(view, ctx) {
  view.innerHTML = `<div class="zv">
    ${strip("AI coding agents can read, change and test code for you. Used well, they teach you as they go. This is how the team uses them safely, with OpenCode on a mentor's laptop.", [tag('Phase 4 · Jan 25–Feb 12'), tag('Mentor-led for under 13')])}
    <article class="card c7 stretch">
      <div class="card-head"><h3 class="card-title">Autocomplete or agent?</h3></div>
      <div class="cmp">
        <div><h5>${icon('sparkle', 'i sm')} Autocomplete</h5><p class="lead">Guesses the next few words or lines while you type. You stay in charge of every line.</p><ul class="bul"><li>Fast for small things</li><li>Works inside one file</li><li>Easy to accept a wrong guess</li></ul></div>
        <div><h5>${icon('bot', 'i sm')} Agent</h5><p class="lead">Reads the project, makes a plan, edits several files and runs commands, then shows you what changed.</p><ul class="bul"><li>Good for bigger changes</li><li>Can explain the whole project</li><li>Needs a careful review every time</li></ul></div>
      </div>
      <h4 class="sub">The loop we use</h4>
      <div class="loop">${LOOP.map(([n], i) => `${i ? `<span class="arr">${icon('arrow', 'i sm')}</span>` : ''}<span class="lp"><span class="oc2${i === 4 ? ' volt' : ''}">${i + 1}</span>${n}</span>`).join('')}</div>
      <div class="items">${LOOP.map(([n, d], i) => `<div class="it"><span class="oc2${i === 4 ? ' volt' : ''}">${i + 1}</span><div class="grow"><div class="t">${n}</div><div class="meta cap" style="font-weight:400">${d}</div></div></div>`).join('')}</div>
    </article>
    <article class="card c5 stretch">
      <div class="card-head"><span class="oc2 solid">${icon('alert', 'i sm')}</span><h3 class="card-title">Safe-use rules</h3></div>
      <ul class="checks">${RULES.map((r) => `<li><span class="ci ok">${icon('check')}</span>${r}</li>`).join('')}</ul>
      <div class="callout" style="${soft}">${icon('users')}<div>AI tools have age rules, and most need you to be 13 or older. The team runs agents on a mentor's account, so nobody under 13 signs up for anything.</div></div>
    </article>
    <article class="card">
      <div class="card-head"><h3 class="card-title">Prompts that work</h3><span class="tag">Copy, then fill in the [brackets]</span></div>
      <div class="recipes">${RECIPES.map(([t, p], i) => `<div class="recipe"><div class="row between"><b style="font-weight:500">${t}</b><button class="btn ghost pill sm" type="button" data-copy="${i}">Copy</button></div><p>${esc(p)}</p></div>`).join('')}</div>
    </article>
    <article class="card c7">
      <div class="card-head"><span class="oc2">${icon('note', 'i sm')}</span><h3 class="card-title">AGENTS.md for our repo</h3><span class="tag">Template</span></div>
      <p class="lead">Agents like OpenCode read a file called AGENTS.md before they start. It's where the team writes its house rules once, so nobody has to repeat them in every prompt.</p>
      <div class="code-head"><span class="path">AGENTS.md</span><button class="btn ghost pill sm" type="button" id="copyAgents" style="margin-left:auto">Copy</button></div>
      ${codeBlock(AGENTS_MD, 'md')}
    </article>
    <article class="card c5">
      <div class="card-head"><span class="oc2">${icon('book', 'i sm')}</span><h3 class="card-title">Saying when AI helped</h3></div>
      <p>Judges want to hear what <b>you</b> learned. If an agent helped, say what you asked it, what it got wrong and what you changed yourself.</p>
      <div class="code-head"><span class="path">A good commit message</span></div>
      <pre class="code" tabindex="0"><code>Launcher: wait until at speed before feeding

Gizmo found balls feeding before the flywheel was ready.
AI-assisted: the agent found the timing bug; Gizmo tested it.</code></pre>
      <button class="btn soft pill" type="button" data-goto="code|Our code">${icon('code', 'i sm')}See our commits</button>
    </article>
  </div>`;
  view.addEventListener('click', (e) => {
    const c = e.target.closest('[data-copy]');
    if (c) copyText(RECIPES[+c.dataset.copy][1], ctx.toast);
  });
  $('#copyAgents').addEventListener('click', () => copyText(AGENTS_MD, ctx.toast));
}

// ================================================================= Glossary
const ANIM = {
  gear: '<g class="a-spin"><circle cx="12" cy="12" r="7.6" stroke-width="3.2" stroke-dasharray="2.6 2.4"/><circle cx="12" cy="12" r="5.4"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/></g>',
  squish: '<rect x="3" y="3" width="18" height="2.4" rx="1.2" fill="currentColor" stroke="none"/><rect x="3" y="18.6" width="18" height="2.4" rx="1.2" fill="currentColor" stroke="none"/><circle class="a-squish" cx="12" cy="12" r="5"/>',
  wheel: '<g class="a-spin"><circle cx="12" cy="12" r="8.4"/><path d="M12 3.6v16.8M3.6 12h16.8M6.1 6.1l11.8 11.8M17.9 6.1 6.1 17.9"/></g>',
  code: '<path d="m8 7-5 5 5 5M16 7l5 5-5 5"/><path class="a-bob" d="M13.6 5 10.4 19"/>',
  wave: '<path class="a-dash" d="M2 12c2.5-5.5 5-5.5 7.5 0s5 5.5 7.5 0 3.5-3.5 5-2"/>',
  path: '<path class="a-dash" d="M4 19c2-6 6-3 8-8s5-6 8-6"/><circle cx="4" cy="19" r="2" fill="currentColor"/><circle cx="20" cy="5" r="2"/>',
  bolt: '<g class="a-bob"><path d="M8 3h8l2 3.4-2 3.4H8L6 6.4z"/><path d="M10 9.8V21h4V9.8M10 13h4M10 16.4h4"/></g>',
  heart: '<path class="a-bob" d="M12 20s-7.5-4.6-7.5-10A4 4 0 0 1 12 7.6a4 4 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20z"/>',
  check: '<circle cx="12" cy="12" r="8.6"/><path class="a-bob" d="m8 12.3 2.8 2.8L16.2 9.6"/>',
  layers: '<path class="a-bob" d="m12 3.5 8.5 4.3L12 12 3.5 7.8z"/><path d="m3.5 12 8.5 4.3 8.5-4.3M3.5 16.2l8.5 4.3 8.5-4.3"/>',
};
const animSvg = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ANIM[k] || ANIM.check}</svg>`;
function glossary(view, ctx) {
  let cat = 'All', q = ctx.state.glossQ || '';
  const cats = ['All', ...new Set(GLOSSARY.map((g) => g[1]))];
  const day = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 864e5);
  const wod = GLOSSARY[day % GLOSSARY.length];
  view.innerHTML = `<div class="zv">
    ${strip('Every word with a dotted underline in the Hub opens one of these. Search, or pick a group. Kids can suggest new words.', [tag(`${GLOSSARY.length} words`), tag('Phase 3 · Jan 4–22')])}
    <article class="card c4 stretch">
      <div class="card-head"><span class="oc2 volt">${icon('sparkle', 'i sm')}</span><h3 class="card-title">Word of the day</h3></div>
      <div class="term" style="background:transparent;padding:0"><span class="anim">${animSvg(wod[3])}</span><b style="font:500 22px/28px Outfit,sans-serif">${wod[0]}</b><p>${wod[1]}</p></div>
      <p>${wod[2]}</p>
      <div class="card-foot"><span class="cap">Changes every day</span><button class="btn ghost pill sm" type="button" id="suggestWord">${icon('plus', 'i sm')}Suggest a word</button></div>
    </article>
    <article class="card c8 stretch">
      <div class="tools"><div class="chips" id="glF">${cats.map((c) => `<button class="chip" type="button" data-c="${c}" aria-pressed="${c === cat}">${c}</button>`).join('')}</div><input class="inp" type="search" id="glQ" placeholder="Search words" aria-label="Search the glossary" value="${esc(q)}"></div>
      <p class="cap" id="glN" aria-live="polite"></p>
      <div class="gloss" id="gloss"></div>
    </article>
  </div>`;
  const draw = () => {
    const ql = q.trim().toLowerCase();
    const list = GLOSSARY.filter(([t, c, d]) => (cat === 'All' || c === cat) && (!ql || t.toLowerCase().includes(ql) || d.toLowerCase().includes(ql)));
    $('#glN').textContent = `${list.length} word${list.length === 1 ? '' : 's'}`;
    $('#gloss').innerHTML = list.map(([t, c, d, a]) => `<div class="term"><span class="anim">${animSvg(a)}</span><b>${t} <span class="cap" style="margin-left:4px">${c}</span></b><p>${d}</p></div>`).join('') || `<p class="lead">No word matches "${esc(q)}". Suggest it, and it gets added after a mentor checks the definition.</p>`;
  };
  draw();
  $('#glF').addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (!b) return; cat = b.dataset.c; $$('#glF .chip').forEach((o) => o.setAttribute('aria-pressed', String(o === b))); draw(); });
  $('#glQ').addEventListener('input', (e) => { q = e.target.value; ctx.state.glossQ = q; draw(); });
  $('#suggestWord').addEventListener('click', () => { ctx.state.fbDraft = 'Glossary: please add the word '; ctx.go('crew', 'Feedback'); });
}

export const LEARN = { Paths: paths, 'FIRST and BIOBUZZ': first, 'Setup and FAQ': setup, 'Build tips': buildtips, 'AI agents': agents, Glossary: glossary };
