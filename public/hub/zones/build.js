// Build zone: Ideas, Mechanism Lab (cards, sims, decision matrix), Print Shop, Parts and inventory.
import { $, $$, esc, fmt, clamp, icon, tag, SAMPLE, strip, av, dot, pill, bar, ring, seg, wireSeg, sw, drawer, closeDrawer, gl, lineChart, KIDS } from './common.js';

// ================================================================= Ideas
const COLS = ['New', 'Exploring', 'Prototyping', 'On the robot', 'Parked'];
const IDEAS = [
  { id: 1, kind: 'prob', t: 'Intake drops balls from piles', sys: 'intake', by: 'Pixel', st: 'Exploring', votes: 5, replies: 4, tests: 2, pinned: true, d: 'When three or more balls touch, the gecko wheels push some away instead of pulling them in.' },
  { id: 2, kind: 'idea', t: 'Gecko wheels 6 mm closer', sys: 'intake', by: 'Nova', st: 'Prototyping', votes: 4, replies: 3, tests: 2, pinned: false, d: 'More compression should grab balls from a pile. Moving them 4 mm closer took us from 5 to 7 of 10.', rich: true },
  { id: 3, kind: 'idea', t: 'Hood angle for the far shot', sys: 'launcher', by: 'Sparky', st: 'Exploring', votes: 3, replies: 2, tests: 0, pinned: false, d: 'A hood with three settings: close, middle and far. Try the launcher sim in the Mechanism Lab first.' },
  { id: 4, kind: 'prob', t: 'Servo gate lets two balls through', sys: 'ballpath', by: 'Gizmo', st: 'New', votes: 2, replies: 1, tests: 1, pinned: true, d: 'About 3 shots in 10, two balls reach the flywheel together and both miss.' },
  { id: 5, kind: 'prob', t: 'Bearing keeps popping out', sys: 'hardware', by: 'Gizmo', st: 'New', votes: 3, replies: 2, tests: 0, pinned: true, issue: true, d: 'The flange bearing next to the flywheel works loose after a few minutes of shooting.' },
  { id: 6, kind: 'idea', t: "Strap so the battery can't shake loose", sys: 'power', by: 'Echo', st: 'On the robot', votes: 6, replies: 2, tests: 1, pinned: false, d: 'A hook-and-loop strap over the battery mount. On the robot since October 29.' },
  { id: 7, kind: 'idea', t: 'Corner pickup with the 72 mm wheels', sys: 'intake', by: 'Rivet', st: 'New', votes: 1, replies: 0, tests: 0, pinned: false, d: 'Angle the corner wheels 10° more so balls against a wall get pulled in.' },
  { id: 8, kind: 'idea', t: 'Line up with the hive using the camera', sys: 'drivetrain', by: 'Byte', st: 'Parked', votes: 2, replies: 3, tests: 0, pinned: false, d: 'Parked until the autonomous drives straight every time.' },
  { id: 9, kind: 'idea', t: 'Brace the launcher mount', sys: 'structure', by: 'Rivet', st: 'Prototyping', votes: 3, replies: 1, tests: 1, pinned: false, d: 'A diagonal brace from the mount to the frame rail, so the flywheel stops wobbling at full speed.' },
];
const voted = new Set();
let nextId = 10;
const kindLbl = (k) => (k === 'prob' ? `<span class="kind prob">${icon('alert', 'i sm')}Problem</span>` : `<span class="kind">${icon('bulb', 'i sm')}Idea</span>`);

function ideas(view, ctx) {
  const { SYS, SYS_ORDER } = ctx;
  let filt = 'all';
  const sysF = () => ctx.state.ideaSys || '';
  view.innerHTML = `<div class="zv">
    ${strip('One place for anything said about the robot: ideas, problems and pins on the 3D model. Teammates vote and reply with "I like, I wonder, what if", and prototype tests attach to the idea.', [tag('Phase 3 · Jan 4–22'), SAMPLE], `<button class="btn primary pill" type="button" id="newIdea">${icon('plus', 'i sm')}New idea</button>`)}
    <article class="card" id="ideaForm" hidden></article>
    <div class="row wrap" style="padding:0 4px"><div class="chips" id="ideaF">${[['all', 'All'], ['prob', 'Problems'], ['idea', 'Ideas'], ['pinned', 'Pinned on the robot'], ['mine', 'Mine']].map(([v, t]) => `<button class="chip" type="button" data-f="${v}" aria-pressed="${v === filt}">${t}</button>`).join('')}</div><span id="sysChip"></span></div>
    <div class="kan" id="kan"></div>
  </div>`;
  const draw = () => {
    const sf = sysF();
    $('#sysChip').innerHTML = sf ? `<button class="chip" type="button" id="clearSys" aria-pressed="true">${dot(SYS[sf].c, 8)}${SYS[sf].name}${icon('x', 'i sm')}</button>` : '';
    const list = IDEAS.filter((i) => (filt === 'all' || (filt === 'pinned' ? i.pinned : filt === 'mine' ? i.by === 'Sparky' : i.kind === filt)) && (!sf || i.sys === sf));
    $('#kan').innerHTML = COLS.map((c) => {
      const items = list.filter((i) => i.st === c).sort((a, b) => b.votes - a.votes);
      return `<section class="kcol" aria-label="${c}"><h4>${c}<span class="n">${items.length}</span></h4>${items.map((i) => `<button class="kcard" type="button" data-idea="${i.id}">
        <span class="row between">${kindLbl(i.kind)}${i.pinned ? `<span class="st">${icon('pin', 'i sm')}On the robot</span>` : ''}</span>
        <span class="t">${esc(i.t)}</span>
        <span class="row" style="gap:6px">${dot(SYS[i.sys].c, 8)}<span class="cap">${SYS[i.sys].name}</span></span>
        <span class="foot">${av(i.by, 22)}<span>${i.by}</span><span style="margin-left:auto" class="row" title="Votes">${icon('arrow', 'i sm')}${i.votes + (voted.has(i.id) ? 1 : 0)}</span><span class="row" title="Replies">${icon('chat', 'i sm')}${i.replies}</span>${i.tests ? `<span class="row" title="Prototype tests">${icon('flag', 'i sm')}${i.tests}</span>` : ''}</span>
      </button>`).join('') || '<p class="cap" style="padding:8px 4px;font-weight:400">Nothing here yet.</p>'}</section>`;
    }).join('');
  };
  draw();
  $('#ideaF').addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (!b) return; filt = b.dataset.f; $$('#ideaF .chip').forEach((c) => c.setAttribute('aria-pressed', String(c === b))); draw(); });
  view.addEventListener('click', (e) => {
    if (e.target.closest('#clearSys')) { ctx.state.ideaSys = ''; draw(); return; }
    const c = e.target.closest('[data-idea]');
    if (c) openIdea(+c.dataset.idea, ctx, draw);
  });
  const form = $('#ideaForm');
  $('#newIdea').addEventListener('click', () => {
    form.hidden = !form.hidden;
    if (form.hidden) return;
    form.innerHTML = `<div class="card-head"><h3 class="card-title">New idea or problem</h3><button class="icon-btn sm" type="button" id="ideaX" aria-label="Close">${icon('x')}</button></div>
      <div class="form-grid">
        <label class="field full"><span>What is it?</span><input class="inp" id="ideaT" maxlength="80" placeholder="The intake drops balls when…" required></label>
        <div class="field"><span>Type</span>${seg('kind', [['idea', `${icon('bulb', 'i sm')}Idea`], ['prob', `${icon('alert', 'i sm')}Problem`]], 'idea', 'Type')}</div>
        <label class="field"><span>Subsystem</span><select class="inp" id="ideaS">${SYS_ORDER.map((k) => `<option value="${k}">${SYS[k].name}</option>`).join('')}</select></label>
        <label class="field full"><span>Tell the team more</span><textarea class="inp" id="ideaD" placeholder="What did you see, and what would you try?"></textarea><small>Add a sketch from the whiteboard, a photo or a link in the real Hub.</small></label>
        <div class="row full">${sw('ideaPin', false, 'Pin it to a spot on the 3D robot')}<span>Pin it to a spot on the 3D robot</span></div>
      </div>
      <div class="card-foot"><span class="cap">Posts to New. Everyone on the team can see it.</span><button class="btn primary pill" type="button" id="ideaPost">Post it</button></div>`;
    let kind = 'idea';
    wireSeg(form, 'kind', (v) => { kind = v; });
    $('#ideaPin').addEventListener('click', (e) => e.currentTarget.setAttribute('aria-checked', String(e.currentTarget.getAttribute('aria-checked') !== 'true')));
    $('#ideaX').addEventListener('click', () => { form.hidden = true; });
    $('#ideaT').focus();
    $('#ideaPost').addEventListener('click', () => {
      const t = $('#ideaT').value.trim();
      if (!t) { $('#ideaT').focus(); ctx.toast('Give it a short title first.'); return; }
      IDEAS.push({ id: nextId++, kind, t, sys: $('#ideaS').value, by: 'Sparky', st: 'New', votes: 0, replies: 0, tests: 0, pinned: $('#ideaPin').getAttribute('aria-checked') === 'true', d: $('#ideaD').value.trim() || 'No details yet.' });
      form.hidden = true;
      filt = 'all'; $$('#ideaF .chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.f === 'all')));
      draw();
      ctx.toast('Posted to New. In the Hub, teammates get a ping. (Preview only: nothing is saved.)');
    });
  });
}
function openIdea(id, ctx, redraw) {
  const i = IDEAS.find((x) => x.id === id);
  const { SYS } = ctx;
  const replies = i.rich ? [['Pixel', 'I like', '7 of 10 is way better than 5. The balls stopped bouncing off.', 'Nov 5'], ['Rivet', 'I wonder', 'Does more squish make the intake motor work harder? It sounded slower.', 'Nov 5'], ['Byte', 'What if', 'What if we show the intake motor current in telemetry while it grabs?', 'Nov 6']]
    : [['Rivet', 'I wonder', 'Does it happen every time, or only after a few minutes?', 'Nov 4'], ['Echo', 'What if', "What if we film it in slow motion on a phone? Then we'd see exactly when.", 'Nov 5']].slice(0, Math.max(1, Math.min(2, i.replies)));
  const tests = i.rich ? [['Oct 22', 'Stock spacing', '5 of 10 from a pile in 5 s'], ['Nov 5', '4 mm closer', '7 of 10 from a pile in 5 s'], ['Tuesday', '6 mm closer', 'Planned']] : [];
  const el = drawer(`<div class="row wrap">${kindLbl(i.kind)}<span class="row" style="gap:6px">${dot(SYS[i.sys].c, 8)}<span class="cap">${SYS[i.sys].name}</span></span>${i.pinned ? `<span class="st">${icon('pin', 'i sm')}Pinned on the robot</span>` : ''}</div>
    <h3>${esc(i.t)}</h3>
    <div class="row wrap">${av(i.by, 28)}<span><b style="font-weight:500">${i.by}</b> <span class="cap">posted it</span></span><span style="margin-left:auto"></span><label class="row" style="gap:8px"><span class="cap">Status</span><select class="inp" id="ideaSt" style="height:36px;width:auto">${COLS.map((c) => `<option${c === i.st ? ' selected' : ''}>${c}</option>`).join('')}</select></label></div>
    <p>${esc(i.d)}</p>
    <div class="sketch">${icon('note', 'i lg')}<span class="cap" style="position:absolute;margin-top:56px">Sketch from the whiteboard</span></div>
    <div class="row wrap"><button class="vote" type="button" id="voteBtn" aria-pressed="${voted.has(i.id)}">${icon('arrow', 'i sm')}<span>${i.votes + (voted.has(i.id) ? 1 : 0)}</span> votes</button>${i.issue ? `<button class="btn primary pill sm" type="button" id="seeIssue">${icon('pin', 'i sm')}Show it on the robot</button>` : i.pinned ? `<button class="btn soft pill sm" type="button" id="seeSys">${icon('focus', 'i sm')}Show ${SYS[i.sys].name.toLowerCase()} in 3D</button>` : ''}</div>
    ${tests.length ? `<h4>Prototype tests</h4>
      ${lineChart({ points: [5, 7, 8], max: 10, labels: ['Oct 22', 'Nov 5', 'Tuesday'], unit: '/10', highlight: 1, dashedFrom: 1, ariaLabel: 'Balls grabbed from a pile out of 10: 5 at stock spacing, 7 at 4 mm closer, 6 mm closer planned', w: 420, h: 170 })}
      <div class="items">${tests.map(([d, t, r]) => `<div class="it"><span class="oc2">${icon('flag', 'i sm')}</span><div class="grow"><div class="t">${t}</div><div class="meta">${d} · ${r}</div></div></div>`).join('')}</div>` : ''}
    <h4>Replies</h4>
    <div class="stack-v" id="replies" style="gap:12px">${replies.map(([n, lens, t, d]) => `<div class="reply">${av(n, 32)}<div class="who">${n}<span>${d}</span></div><p><span class="lens">${lens}</span>${t}</p></div>`).join('')}</div>
    <div class="field"><span>Reply</span>${seg('lens', [['I like', 'I like'], ['I wonder', 'I wonder'], ['What if', 'What if']], 'I like', 'Reply type')}<textarea class="inp" id="replyT" placeholder="Say what you like, wonder or would try"></textarea></div>
    <div class="row" style="justify-content:flex-end"><button class="btn primary pill" type="button" id="replyGo">Reply</button></div>`, { label: i.t, wide: true });
  let lens = 'I like';
  wireSeg(el, 'lens', (v) => { lens = v; });
  $('#voteBtn', el).addEventListener('click', (e) => {
    if (voted.has(i.id)) voted.delete(i.id); else voted.add(i.id);
    e.currentTarget.setAttribute('aria-pressed', String(voted.has(i.id)));
    $('span', e.currentTarget).textContent = i.votes + (voted.has(i.id) ? 1 : 0);
    redraw();
  });
  $('#ideaSt', el).addEventListener('change', (e) => { i.st = e.target.value; redraw(); ctx.toast(`Moved to ${i.st}. The status history keeps every step for the portfolio.`); });
  const si = $('#seeIssue', el); if (si) si.addEventListener('click', () => { closeDrawer(); ctx.showIssue(); });
  const ss = $('#seeSys', el); if (ss) ss.addEventListener('click', () => { closeDrawer(); ctx.focusSystem(i.sys); });
  $('#replyGo', el).addEventListener('click', () => {
    const t = $('#replyT', el).value.trim();
    if (!t) { $('#replyT', el).focus(); return; }
    $('#replies', el).insertAdjacentHTML('beforeend', `<div class="reply">${av('Sparky', 32)}<div class="who">Sparky<span>Just now</span></div><p><span class="lens">${esc(lens)}</span>${esc(t)}</p></div>`);
    $('#replyT', el).value = '';
    i.replies++; redraw();
  });
}

// ================================================================= Mechanism Lab
const MECHS = {
  intake: [
    { n: 'Flexible roller intake', on: true, diff: 1, how: ['A row of flexible rollers spins on a shaft across the front.', 'The rollers squash against each ball and sweep it to the middle.', 'Gecko wheels pull it up into the ball path.'], pros: ['Wide: grabs across the whole front', 'Forgiving when you drive in crooked'], cons: ['Can push balls away in a tight pile', 'Rollers wear and need swapping'], parts: '16 intake rollers, 48 mm gecko wheels, an 8 mm REX shaft, a 50.9:1 motor' },
    { n: 'Gecko wheel funnel', diff: 1, how: ['Two columns of soft gecko wheels sit at an angle.', 'The angle funnels balls to the middle as you drive.', 'Squeeze between the wheels pulls each ball in.'], pros: ['Few parts, quick to build', 'Great at one ball at a time'], cons: ['Narrow, so you have to aim', 'Weak on balls against a wall'], parts: 'Gecko wheels, hex shafts, one motor, belts or gears' },
    { n: 'Over-the-bumper roller', diff: 2, how: ['A roller on an arm reaches out past the frame.', 'It drops onto balls and spins them back over the bumper.', 'The arm folds in to stay inside the starting size.'], pros: ['Reaches corners and walls', 'Huge pickup zone'], cons: ['A pivot means more to build and break', 'More code: the arm has positions'], parts: 'A roller, arm channel, a servo or motor for the arm' },
    { n: 'Corner wheels on servos', on: true, diff: 2, how: ['Two continuous servos spin 72 mm gecko wheels at the corners.', 'They steer balls at the edges inward.', 'The main rollers take it from there.'], pros: ['Catches what the rollers miss', 'Servos are light'], cons: ['Servos are weaker than motors', 'More wiring and code'], parts: '2 speed servos, 72 mm gecko wheels, ServoBlocks' },
  ],
  ballpath: [
    { n: 'Ramp and servo gate', on: true, diff: 1, how: ['Balls roll up a curved ramp toward the flywheel.', 'A servo arm holds them back.', 'The arm opens to let one ball through at a time.'], pros: ['Simple, tuned in code', 'Holds a few balls ready'], cons: ['Bad timing lets two through', 'Balls can jam where the ramp curves'], parts: 'Ramp panel, hopper panels, the hopper servo' },
    { n: 'Belt conveyor', diff: 2, how: ['Belts on both sides grip the ball.', 'They carry it up at a steady speed.', 'Stop the belt and the ball stops exactly.'], pros: ['Balls move only when the belt does', 'Handles steep climbs'], cons: ['Belt tension needs care', 'More parts and a motor'], parts: 'Timing belts, pulleys, a motor, side plates' },
    { n: 'Indexer wheel', diff: 3, how: ['A wheel with pockets holds one ball each.', 'Turning one step lines up the next ball.', 'A sensor checks the pocket is full before a shot.'], pros: ['Exactly one ball at a time', 'Can count balls'], cons: ['Hardest to build and code', 'Pockets must match the ball'], parts: 'A printed wheel, a servo or motor, a distance sensor' },
  ],
  launcher: [
    { n: 'Single flywheel with hood', on: true, diff: 2, how: ['A heavy wheel spins fast.', 'The ball is squeezed between the wheel and a curved hood.', "It leaves at about half the wheel's surface speed."], pros: ['One motor, steady shots', 'The hood angle tunes the arc'], cons: ['Spins back up between shots', 'Compression must be just right'], parts: 'A 96 mm Hogback wheel, the launcher motor, a mount, a hood' },
    { n: 'Dual flywheel', diff: 2, how: ['Two wheels spin toward each other.', 'The ball shoots out between them.', 'Different speeds add spin.'], pros: ['Fast exit speed', 'Needs less compression'], cons: ['Two motors and more weight', 'Both wheels must match speed'], parts: '2 wheels, 2 motors, a frame that holds the gap' },
    { n: 'Catapult', diff: 2, how: ['An arm is pulled back by a motor or bands.', 'It releases and flings the ball.', 'A stop sets the launch angle.'], pros: ['No spin-up time', 'Fun to build'], cons: ['Slow to reload', 'Less steady shot to shot'], parts: 'An arm, surgical tubing or a motor, a latch' },
    { n: 'Puncher', diff: 3, how: ['A spring-loaded plate is pulled back.', 'It snaps forward and hits the ball.', 'A cam resets it for the next shot.'], pros: ['Quick repeat shots', 'Same power every time'], cons: ['Springs and cams are tricky', 'Loud and hard on parts'], parts: 'A spring, a cam, a slide, a motor' },
  ],
};
const FAM = [['intake', 'Intake'], ['ballpath', 'Ball path'], ['launcher', 'Launcher']];
export const MATRIX = {
  opts: ['Single flywheel with hood', 'Dual flywheel', 'Catapult'],
  crit: [['Speed', 3], ['Reliability', 5], ['Build time', 2], ['Weight', 1], ['Cost', 1]],
  s: [[4, 4, 4, 3, 4], [5, 3, 2, 2, 2], [2, 2, 3, 3, 4]],
};
function lab(view, ctx) {
  let fam = ctx.state.fam || 'intake';
  view.innerHTML = `<div class="zv">
    ${strip(`The design space for BIOBUZZ. Pollen are plastic balls about 3 in. across, picked up off foam tiles: in lines, in piles, against walls and in corners, including in autonomous. Hover a dotted word for its meaning, like ${gl('compression')} or ${gl('surface speed')}.`, [tag('Cards on the shop TV the week of Nov 16'), tag('Sims in Phase 6')])}
    <article class="card">
      <div class="card-head"><h3 class="card-title">Mechanism cards</h3>${seg('fam', FAM, fam, 'Mechanism family')}</div>
      <div class="mechs" id="mechs"></div>
    </article>
    <article class="card c6 stretch" id="simComp"></article>
    <article class="card c6 stretch" id="simSpeed"></article>
    <article class="card" id="simLaunch"></article>
    <article class="card" id="matrix"></article>
  </div>`;
  const drawCards = () => {
    $('#mechs').innerHTML = MECHS[fam].map((m) => `<div class="mech">
      <div class="row between"><h4>${m.n}</h4>${m.on ? '<span class="st volt">On the StarterBot</span>' : ''}</div>
      <div class="row"><span class="cap">Difficulty</span><span class="diff" aria-label="Difficulty ${m.diff} of 3">${[1, 2, 3].map((d) => `<i class="${d <= m.diff ? 'on' : ''}"></i>`).join('')}</span></div>
      <ol>${m.how.map((h) => `<li>${h}</li>`).join('')}</ol>
      <div class="pc"><div><b>Strengths</b>${m.pros.join('<br>')}</div><div><b>Weaknesses</b>${m.cons.join('<br>')}</div></div>
      <p class="cap" style="font-weight:400"><b style="font-weight:500;color:var(--text)">Parts:</b> ${m.parts}</p>
      <div class="row wrap" style="margin-top:auto"><button class="btn soft pill sm" type="button" data-insp="${fam}">${icon('sparkle', 'i sm')}Inspiration</button><button class="btn ghost pill sm" type="button" data-toast="Starter CAD links go to Onshape once the team's document exists.">${icon('arrow', 'i sm')}Starter CAD</button></div>
    </div>`).join('');
  };
  drawCards();
  wireSeg(view, 'fam', (v) => { fam = v; ctx.state.fam = v; drawCards(); });
  view.addEventListener('click', (e) => {
    const b = e.target.closest('[data-insp]');
    if (b) { ctx.state.inspTag = b.dataset.insp; ctx.go('crew', 'Inspiration'); }
  });
  compSim($('#simComp'));
  speedSim($('#simSpeed'));
  launchSim($('#simLaunch'));
  matrix($('#matrix'), ctx);
}
function compSim(el) {
  const BALL = 76.2;
  el.innerHTML = `<div class="card-head"><h3 class="card-title">Compression explorer</h3>${tag('Try it')}</div>
    <p class="lead">How tight should the gap between two 48 mm gecko wheels be for a 3 in. ball?</p>
    <div class="sim-art"><svg viewBox="0 0 300 170" id="compSvg" role="img" aria-label="Two wheels squeezing a ball"></svg></div>
    <div class="ctrl"><label for="gap">Gap between the wheels <output id="gapOut"></output></label><input type="range" id="gap" min="50" max="80" step="1" value="64"></div>
    <div class="verdict" id="compV"></div>`;
  const draw = () => {
    const g = +$('#gap', el).value, c = Math.max(0, BALL - g), pctC = (c / BALL) * 100;
    $('#gap', el).style.setProperty('--fill', `${((g - 50) / 30) * 100}%`);
    $('#gapOut', el).textContent = `${g} mm · ${c.toFixed(0)} mm squeeze (${pctC.toFixed(0)}%)`;
    const s = 1.55, R = 24 * s, cx = 150, cy = 86;
    const lx = cx - (g / 2) * s - R, rx = cx + (g / 2) * s + R;
    const brx = Math.min(BALL / 2, g / 2 + 1.5) * s, bry = (BALL / 2) * s * (1 + Math.max(0, BALL / 2 - g / 2) / (BALL / 2) * 0.42);
    $('#compSvg', el).innerHTML = `<ellipse cx="${cx}" cy="${cy}" rx="${brx}" ry="${Math.min(bry, 76)}" style="fill:var(--sys-ballpath);opacity:.9"/>
      <g style="fill:var(--sys-intake)"><circle cx="${lx}" cy="${cy}" r="${R}"/><circle cx="${rx}" cy="${cy}" r="${R}"/></g>
      <g style="fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;opacity:.85"><path d="M${lx - 12} ${cy - 14} a18 18 0 0 1 24 0"/><path d="M${rx + 12} ${cy - 14} a18 18 0 0 0 -24 0"/></g>
      <path d="M${cx} ${cy + 64} v-22" style="stroke:var(--text);stroke-width:2;stroke-linecap:round"/><path d="M${cx - 6} ${cy + 48} l6 -8 l6 8" style="fill:none;stroke:var(--text);stroke-width:2;stroke-linecap:round;stroke-linejoin:round"/>
      <text x="${cx}" y="16" text-anchor="middle" style="font:500 12px Inter,sans-serif;fill:var(--muted)">Ball 76 mm · gap ${g} mm</text>`;
    const v = $('#compV', el);
    let cls = '', msg;
    if (c <= 3) msg = '<b>Slips.</b> The wheels barely touch the ball, so it rolls off instead of coming in.';
    else if (c <= 8) msg = '<b>Light grip.</b> Fine for one ball at a time, weak on a pile.';
    else if (c <= 16) { msg = '<b>Good grip.</b> A solid place to start. Test it on real pollen, since softer balls need less squeeze.'; cls = 'good'; }
    else if (c <= 22) msg = '<b>Very tight.</b> It grips hard, but the motor works harder and balls can stall halfway.';
    else msg = "<b>Jams.</b> The ball can't get through, and the motor strains.";
    v.className = `verdict ${cls}`;
    v.innerHTML = `${icon(cls ? 'check' : 'alert')}<div>${msg} <span style="opacity:.75">Rule of thumb, not a law.</span></div>`;
  };
  $('#gap', el).addEventListener('input', draw);
  draw();
}
function speedSim(el) {
  const MOTORS = [[1150, '5.2:1 · 1,150 rpm'], [435, '13.7:1 · 435 rpm'], [312, '19.2:1 · 312 rpm'], [223, '26.9:1 · 223 rpm'], [117, '50.9:1 · 117 rpm']];
  el.innerHTML = `<div class="card-head"><h3 class="card-title">Surface-speed matcher</h3>${tag('StarterBot numbers')}</div>
    <p class="lead">Your intake should pull balls in faster than the robot drives into them. Start values are the StarterBot's real parts.</p>
    <div class="form-grid">
      <label class="field"><span>Intake motor</span><select class="inp" id="sMot">${MOTORS.map(([r, t]) => `<option value="${r}"${r === 117 ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="field"><span>Gears</span><select class="inp" id="sGear"><option value="1">1 to 1</option><option value="2">2 to 1 faster</option><option value="5" selected>100 to 20 teeth (5× faster)</option></select></label>
      <label class="field"><span>Intake wheel</span><select class="inp" id="sWheel"><option value="48" selected>48 mm gecko</option><option value="72">72 mm gecko</option></select></label>
      <div class="ctrl"><label for="sThr">Driving at <output id="sThrOut"></output></label><input type="range" id="sThr" min="20" max="100" step="5" value="100"></div>
    </div>
    <div class="readout"><div><b id="sIn"></b><span>Intake surface</span></div><div><b id="sDr"></b><span>Robot speed</span></div><div><b id="sRat"></b><span>Ratio</span></div></div>
    <div class="verdict" id="sV"></div>
    <p class="cap" style="font-weight:400">Free speeds with no load, from goBILDA's motor ratings: a 19.2:1 Yellow Jacket on 104 mm mecanum wheels. Both get slower in real life.</p>`;
  const draw = () => {
    const rpm = +$('#sMot', el).value * +$('#sGear', el).value, d = +$('#sWheel', el).value / 1000;
    const vin = (Math.PI * d * rpm) / 60, thr = +$('#sThr', el).value / 100, vdr = ((Math.PI * 0.104 * 312) / 60) * thr, r = vin / vdr;
    $('#sThr', el).style.setProperty('--fill', `${((thr * 100 - 20) / 80) * 100}%`);
    $('#sThrOut', el).textContent = `${Math.round(thr * 100)}%`;
    $('#sIn', el).textContent = `${vin.toFixed(2)} m/s`;
    $('#sDr', el).textContent = `${vdr.toFixed(2)} m/s`;
    $('#sRat', el).textContent = `${r.toFixed(2)}×`;
    const v = $('#sV', el);
    let cls = '', msg;
    if (r < 1) msg = '<b>The robot outruns its intake.</b> Balls get pushed, not pulled. Slow down while collecting, or speed the intake up.';
    else if (r < 1.5) msg = '<b>Just keeps up.</b> OK if drivers slow down to collect.';
    else if (r <= 3) { msg = '<b>Good.</b> The intake pulls balls in faster than you drive into them. About 2× is a common target.'; cls = 'good'; }
    else msg = "<b>Very fast.</b> Fine, but check it doesn't fling balls away.";
    v.className = `verdict ${cls}`;
    v.innerHTML = `${icon(cls ? 'check' : 'alert')}<div>${msg}</div>`;
  };
  $$('select, input', el).forEach((i) => i.addEventListener('input', draw));
  draw();
}
function launchSim(el) {
  el.innerHTML = `<div class="card-head"><h3 class="card-title">Launcher sim</h3>${tag('Simplified physics')}</div>
    <div class="sim">
      <div class="sim-art"><svg viewBox="0 0 600 300" id="lSvg" role="img" aria-label="Side view of the ball's flight"></svg></div>
      <div class="sim-ctrls">
        <div class="ctrl"><label for="lRpm">Flywheel speed <output id="lRpmO"></output></label><input type="range" id="lRpm" min="500" max="6000" step="50" value="1500"></div>
        <div class="field"><span>Wheel</span>${seg('wheel', [['96', '96 mm Hogback'], ['72', '72 mm']], '96', 'Wheel size')}</div>
        <div class="ctrl"><label for="lAng">Hood angle <output id="lAngO"></output></label><input type="range" id="lAng" min="20" max="70" step="1" value="48"></div>
        <div class="ctrl"><label for="lCmp">Compression <output id="lCmpO"></output></label><input type="range" id="lCmp" min="2" max="24" step="1" value="12"></div>
        <div class="readout"><div><b id="lV"></b><span>Exit speed</span></div><div><b id="lH"></b><span>Highest point</span></div><div><b id="lD"></b><span>Lands at</span></div></div>
        <div class="verdict" id="lVer"></div>
      </div>
    </div>
    <p class="cap" style="font-weight:400">The ball leaves at about half the wheel's surface speed, less when compression is off. No air drag here, so real shots fall shorter. The target box is a sample, not the real hive.</p>`;
  let wheel = 96;
  wireSeg(el, 'wheel', (v) => { wheel = +v; draw(); });
  const draw = () => {
    const rpm = +$('#lRpm', el).value, ang = +$('#lAng', el).value, cmp = +$('#lCmp', el).value;
    [['lRpm', 500, 6000], ['lAng', 20, 70], ['lCmp', 2, 24]].forEach(([id, a, b]) => { const i = $(`#${id}`, el); i.style.setProperty('--fill', `${((+i.value - a) / (b - a)) * 100}%`); });
    $('#lRpmO', el).textContent = `${fmt(rpm)} rpm`;
    $('#lAngO', el).textContent = `${ang}°`;
    $('#lCmpO', el).textContent = `${cmp} mm`;
    const grip = clamp(1 - Math.abs(cmp - 12) / 16, 0.3, 1);
    const v = 0.5 * grip * (Math.PI * (wheel / 1000) * rpm) / 60;
    const th = (ang * Math.PI) / 180, g = 9.81, h0 = 0.3;
    const vy = v * Math.sin(th), vx = v * Math.cos(th);
    const T = (vy + Math.sqrt(vy * vy + 2 * g * h0)) / g;
    const range = vx * T, apex = h0 + (vy * vy) / (2 * g);
    $('#lV', el).textContent = `${v.toFixed(1)} m/s`;
    $('#lH', el).textContent = `${apex.toFixed(2)} m`;
    $('#lD', el).textContent = `${range.toFixed(2)} m`;
    const W = 600, H = 300, mx = 6, my = 3, X = (x) => 40 + (x / mx) * (W - 60), Y = (y) => H - 30 - (y / my) * (H - 50);
    let path = '', hit = false;
    for (let k = 0; k <= 60; k++) {
      const t = (k / 60) * T, x = vx * t, y = h0 + vy * t - 0.5 * g * t * t;
      if (x >= 2.4 && x <= 2.9 && y >= 0.9 && y <= 1.2) hit = true;
      path += `${k ? 'L' : 'M'}${X(Math.min(x, mx + 1)).toFixed(1)} ${Y(Math.max(y, 0)).toFixed(1)} `;
    }
    const grid = [1, 2, 3, 4, 5, 6].map((m) => `<line x1="${X(m)}" x2="${X(m)}" y1="${Y(0)}" y2="${Y(my)}" style="stroke:var(--divider)"/><text x="${X(m)}" y="${H - 12}" text-anchor="middle" style="font:500 11px Inter,sans-serif;fill:var(--muted)">${m} m</text>`).join('')
      + [1, 2, 3].map((m) => `<line x1="${X(0)}" x2="${X(mx)}" y1="${Y(m)}" y2="${Y(m)}" style="stroke:var(--divider)"/><text x="30" y="${Y(m) + 4}" text-anchor="end" style="font:500 11px Inter,sans-serif;fill:var(--muted)">${m} m</text>`).join('');
    $('#lSvg', el).innerHTML = `${grid}<line x1="${X(0)}" x2="${X(mx)}" y1="${Y(0)}" y2="${Y(0)}" style="stroke:var(--text);stroke-width:1.5"/>
      <rect x="${X(2.4)}" y="${Y(1.2)}" width="${X(2.9) - X(2.4)}" height="${Y(0.9) - Y(1.2)}" rx="6" style="fill:${hit ? 'var(--volt)' : 'none'};stroke:var(--text);stroke-width:1.5;stroke-dasharray:${hit ? '0' : '5 4'}"/>
      <text x="${(X(2.4) + X(2.9)) / 2}" y="${Y(1.2) - 8}" text-anchor="middle" style="font:500 11px Inter,sans-serif;fill:var(--muted)">Sample target</text>
      <rect x="${X(0) - 22}" y="${Y(0.31)}" width="44" height="${Y(0) - Y(0.31)}" rx="6" style="fill:var(--solid)"/>
      <path d="${path}" style="fill:none;stroke:var(--sys-launcher);stroke-width:3;stroke-linecap:round"/>
      <circle cx="${X(0)}" cy="${Y(h0)}" r="6" style="fill:var(--sys-ballpath);stroke:var(--text);stroke-width:1.5"/>`;
    const ver = $('#lVer', el);
    ver.className = `verdict ${hit ? 'good' : ''}`;
    ver.innerHTML = hit ? `${icon('check')}<div><b>In the box.</b> Now try it on the robot: write down the speed and angle in the session note.</div>` : `${icon('alert')}<div><b>${range < 2.4 ? 'Short.' : 'Too far or too high.'}</b> ${range < 2.4 ? 'Add speed or raise the hood a little.' : 'Take some speed off or change the hood angle.'}</div>`;
  };
  $$('input[type="range"]', el).forEach((i) => i.addEventListener('input', draw));
  draw();
}
function matrix(el, ctx) {
  const draw = () => {
    const tot = MATRIX.s.map((row) => row.reduce((a, v, j) => a + v * MATRIX.crit[j][1], 0));
    const best = Math.max(...tot), max = MATRIX.crit.reduce((a, c) => a + 5 * c[1], 0);
    el.innerHTML = `<div class="card-head"><h3 class="card-title">Decision matrix · Launcher</h3>${tag('Sample scores')}<button class="btn primary pill sm" type="button" id="mxSave">${icon('logbook', 'i sm')}Save to Portfolio</button></div>
      <p class="lead">Score each option from 1 to 5 together, and set how much each thing matters. The highest total wins, and the whole table saves into the Engineering Portfolio as a decision record.</p>
      <div class="mx" style="--n:${MATRIX.crit.length}">
        <div class="mx-row"><span class="mx-h">Option</span>${MATRIX.crit.map(([c, w], j) => `<span class="mx-h">${c}<br><label><span class="sr">Weight for ${c}</span><input type="number" min="0" max="5" value="${w}" data-w="${j}"></label></span>`).join('')}<span class="mx-h">Total</span></div>
        ${MATRIX.opts.map((o, i) => `<div class="mx-row${tot[i] === best ? ' win' : ''}"><span class="mx-o">${o}</span>${MATRIX.s[i].map((v, j) => `<span class="mx-c"><select data-s="${i},${j}" aria-label="${o}: ${MATRIX.crit[j][0]}">${[1, 2, 3, 4, 5].map((n) => `<option${n === v ? ' selected' : ''}>${n}</option>`).join('')}</select></span>`).join('')}<span class="mx-t">${tot[i]}<span class="cap" style="display:block;font-size:11px">of ${max}</span></span></div>`).join('')}
      </div>`;
    $$('[data-s]', el).forEach((s) => s.addEventListener('change', () => { const [i, j] = s.dataset.s.split(',').map(Number); MATRIX.s[i][j] = +s.value; draw(); }));
    $$('[data-w]', el).forEach((s) => s.addEventListener('change', () => { MATRIX.crit[+s.dataset.w][1] = clamp(Math.round(+s.value || 0), 0, 5); draw(); }));
    $('#mxSave', el).addEventListener('click', () => { ctx.state.matrixSaved = true; ctx.toast(`Saved: "${MATRIX.opts[tot.indexOf(best)]}" wins with ${best} points. It's now in Logbook, Portfolio.`); });
  };
  draw();
}

// ================================================================= Print Shop
const JOBS = [
  { id: 1, n: 'Intake roller hub', q: 4, by: 'Nova', st: 'printing', pct: 62, pr: 'Printer 1', t: '48 min left', g: 36 },
  { id: 2, n: 'Ball ramp guide', q: 1, by: 'Gizmo', st: 'queued', pr: 'Printer 2', t: 'About 2 h · second in line', g: 41 },
  { id: 3, n: 'Spark-bot keychain', q: 1, by: 'Sparky', st: 'waiting', t: 'About 25 min', g: 6, why: 'A thank-you for the library volunteers' },
  { id: 4, n: 'Gate arm', q: 1, by: 'Gizmo', st: 'done', pr: 'Printer 2', t: 'Picked up yesterday', g: 9 },
  { id: 5, n: 'Hood plate', q: 1, by: 'Sparky', st: 'failed', pr: 'Printer 1', t: 'Warping: the corners lifted off the bed', g: 0 },
];
let jobId = 6;
const ST = { waiting: ['Waiting for a mentor', 'var(--stone)'], queued: ['Queued', 'var(--sys-drivetrain)'], printing: ['Printing', 'var(--sys-intake)'], done: ['Done', 'var(--ok)'], failed: ['Failed', 'var(--negative)'], back: ['Sent back with a tip', 'var(--warn)'] };
const BED = [220, 220, 250];
function parseSTL(buf) {
  const dv = new DataView(buf);
  const tris = [];
  const bin = buf.byteLength >= 84 && 84 + dv.getUint32(80, true) * 50 === buf.byteLength;
  if (bin) {
    const n = dv.getUint32(80, true);
    for (let i = 0; i < n; i++) { const o = 84 + i * 50 + 12; const t = new Float32Array(9); for (let k = 0; k < 9; k++) t[k] = dv.getFloat32(o + k * 4, true); tris.push(t); }
  } else {
    const txt = new TextDecoder().decode(buf);
    const re = /vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/g;
    let m, cur = [];
    while ((m = re.exec(txt))) { cur.push(+m[1], +m[2], +m[3]); if (cur.length === 9) { tris.push(cur); cur = []; } }
  }
  if (!tris.length) throw new Error('No triangles found');
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (const t of tris) for (let k = 0; k < 9; k++) { const a = k % 3; if (t[k] < mn[a]) mn[a] = t[k]; if (t[k] > mx[a]) mx[a] = t[k]; }
  let area = 0, over = 0, vol = 0;
  for (const t of tris) {
    const ux = t[3] - t[0], uy = t[4] - t[1], uz = t[5] - t[2], vx = t[6] - t[0], vy = t[7] - t[1], vz = t[8] - t[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, len = Math.hypot(nx, ny, nz), a = len / 2;
    area += a;
    const onBed = Math.max(t[2], t[5], t[8]) - mn[2] < 0.2;
    if (len > 0 && nz / len < -0.7071 && !onBed) over += a;
    vol += (t[0] * (t[4] * t[8] - t[5] * t[7]) - t[1] * (t[3] * t[8] - t[5] * t[6]) + t[2] * (t[3] * t[7] - t[4] * t[6])) / 6;
  }
  return { tris: tris.length, size: mx.map((v, i) => v - mn[i]), overPct: area ? (over / area) * 100 : 0, vol: Math.abs(vol) / 1000 };
}
function printShop(view, ctx) {
  let mentor = false;
  let file = null;
  const pre = { mat: 'PLA · Black · Printer 1', q: 'Standard', s: 'Standard', sup: false, n: 1 };
  view.innerHTML = `<div class="zv">
    ${strip('Send a part with a note. The Hub checks it, a mentor approves it, and you hear when it\'s ready. Until the print bridge arrives, mentors slice and start prints by hand.', [tag('v0 opens Dec 1'), tag('Print bridge in Phase 5'), SAMPLE], seg('view', [['kid', 'Kid view'], ['mentor', 'Mentor view']], 'kid', 'View as'))}
    <article class="card">
      <div class="steps" aria-label="How a print request moves">${[['Submit', 'you'], ['Preset', 'you'], ['Slice', 'mentor, then the bridge'], ['Approve', 'mentor'], ['Print', 'printer'], ['Done', 'you pick it up']].map(([s, w], i) => `<span class="step${i < 2 ? ' done' : i === 2 ? ' now' : ''}"><span class="n">${i + 1}</span>${s}<small>${w}</small></span>`).join('')}</div>
    </article>
    <article class="card c7" id="psForm"></article>
    <div class="c5 stack-v" style="gap:16px">
      <article class="card"><div class="card-head"><h3 class="card-title">Queue</h3><span class="tag" id="qCount"></span></div><div class="items" id="queue"></div></article>
      <article class="card"><div class="card-head"><h3 class="card-title">Printers</h3><span class="tag">Models: tell us yours</span></div>
        <div class="printers"><div class="printer"><span class="nm">Printer 1</span><span class="spool"><i style="background:#222624"></i>PLA · Black</span><span class="row">${ring(62, '62%', 44)}<span class="cap">Roller hubs ×4<br>48 min left</span></span></div>
        <div class="printer"><span class="nm">Printer 2</span><span class="spool"><i style="background:#959897"></i>PETG · Gray</span><span class="row"><span class="oc2">${icon('clock', 'i sm')}</span><span class="cap">Idle · next: ramp guide</span></span></div></div>
      </article>
      <article class="card"><div class="card-head"><h3 class="card-title">Why prints fail</h3>${tag('This season')}</div>
        <div class="fails">${[['Warping', 3], ['Bed adhesion', 2], ['Spaghetti', 1]].map(([r, n]) => `<div class="fail"><span>${r}</span>${bar((n / 3) * 100, `${r}: ${n}`)}<span class="num">${n}</span></div>`).join('')}</div>
        <button class="btn ghost pill sm" type="button" data-go="learn/Build tips">${icon('book', 'i sm')}How to stop warping</button>
      </article>
    </div>
  </div>`;
  const est = () => {
    const base = file && file.vol ? file.vol * 1.24 * ({ Light: 0.32, Standard: 0.45, Strong: 0.65 }[pre.s]) : 9 * ({ Light: 0.8, Standard: 1, Strong: 1.35 }[pre.s]);
    const grams = base * (pre.sup ? 1.12 : 1) * pre.n;
    const mins = (grams / ({ Draft: 18, Standard: 12, Fine: 7 }[pre.q])) * 60;
    return { grams: Math.max(1, Math.round(grams)), time: mins >= 60 ? `${Math.floor(mins / 60)} h ${Math.round(mins % 60)} min` : `${Math.max(5, Math.round(mins))} min` };
  };
  const checks = () => {
    if (!file) return '';
    const fits = file.size.every((v, i) => v <= BED[i]);
    const sz = file.size.map((v) => (Math.round(v * 10) / 10).toFixed(1)).join(' × ');
    return `<ul class="checks">
      <li><span class="ci ${fits ? 'ok' : 'bad'}">${icon(fits ? 'check' : 'x')}</span><span>${fits ? 'Fits the bed' : "Too big for the bed"}: ${sz} mm${fits ? '' : ` (bed is ${BED.join(' × ')} mm)`}</span></li>
      <li><span class="ci ${file.overPct > 5 ? 'warn' : 'ok'}">${icon(file.overPct > 5 ? 'alert' : 'check')}</span><span>${file.overPct > 5 ? `${file.overPct.toFixed(0)}% of the surface hangs steeper than 45°. Supports are on.` : 'No steep overhangs'}</span></li>
      <li><span class="ci ok">${icon('check')}</span><span>${fmt(file.tris)} triangles${file.vol ? ` · ${file.vol.toFixed(1)} cm³ of plastic if solid` : ''}</span></li>
      <li><span class="ci todo"></span><span class="muted">Thin walls and loose pieces get checked when the Hub slices it.</span></li></ul>`;
  };
  const form = () => {
    const e = est();
    $('#psForm').innerHTML = `<div class="card-head"><h3 class="card-title">New print request</h3></div>
      <label class="drop" id="drop">${icon('printer', 'i lg')}<b>${file ? esc(file.name) : 'Drop an STL here, or choose a file'}</b><span class="cap" style="font-weight:400">${file ? (file.real ? 'Checked right here in your browser' : 'Sample part') : 'STL, 3MF or STEP · or "Print this part" on any part in the 3D Explorer'}</span><input type="file" id="psFile" accept=".stl,.3mf,.step,.stp"></label>
      ${file ? '' : `<button class="btn soft pill sm" type="button" id="psSample" style="align-self:flex-start">${icon('sparkle', 'i sm')}Use a sample part</button>`}
      ${checks()}
      <div class="form-grid">
        <label class="field full"><span>Material and color <small>(what's loaded right now)</small></span><select class="inp" id="psMat">${['PLA · Black · Printer 1', 'PETG · Gray · Printer 2'].map((m) => `<option${m === pre.mat ? ' selected' : ''}>${m}</option>`).join('')}</select></label>
        <div class="field"><span>Quality</span>${seg('q', [['Draft', 'Draft'], ['Standard', 'Standard'], ['Fine', 'Fine']], pre.q, 'Quality')}</div>
        <div class="field"><span>Strength</span>${seg('s', [['Light', 'Light'], ['Standard', 'Standard'], ['Strong', 'Strong']], pre.s, 'Strength')}</div>
        <div class="field"><span>How many</span><span class="stepper"><button type="button" id="nMinus" aria-label="One fewer">${icon('min', 'i sm')}</button><output id="nOut">${pre.n}</output><button type="button" id="nPlus" aria-label="One more">${icon('plus', 'i sm')}</button></span></div>
        <div class="field"><span>Supports</span><span class="row">${sw('psSup', pre.sup, 'Supports')}<span class="cap">${pre.sup ? 'On' : 'Off'}</span></span></div>
        <label class="field full"><span>Why do you need it?</span><textarea class="inp" id="psWhy" placeholder="For the intake test on Tuesday"></textarea></label>
      </div>
      <div class="card-foot"><span class="cap">About <b>${e.time}</b> and <b>${e.grams} g</b> of filament · a rough guess, the slicer gives the real one. Mentors set the presets, so you never touch temperatures.</span><button class="btn primary pill" type="button" id="psGo">${icon('printer', 'i sm')}Send to mentors</button></div>`;
    const f = $('#psForm');
    wireSeg(f, 'q', (v) => { pre.q = v; form(); });
    wireSeg(f, 's', (v) => { pre.s = v; form(); });
    $('#psMat').addEventListener('change', (ev) => { pre.mat = ev.target.value; });
    $('#psSup').addEventListener('click', () => { pre.sup = !pre.sup; form(); });
    $('#nMinus').addEventListener('click', () => { pre.n = clamp(pre.n - 1, 1, 12); form(); });
    $('#nPlus').addEventListener('click', () => { pre.n = clamp(pre.n + 1, 1, 12); form(); });
    const sb = $('#psSample');
    if (sb) sb.addEventListener('click', () => { file = { name: 'roller-hub.stl', real: false, tris: 2816, size: [38, 38, 12], overPct: 6.2, vol: 9.4 }; pre.sup = true; form(); });
    const drop = $('#drop'), inp = $('#psFile');
    const take = async (fl) => {
      if (!fl) return;
      const ext = fl.name.split('.').pop().toLowerCase();
      if (ext !== 'stl') { file = { name: fl.name, real: true, tris: 0, size: [0, 0, 0], overPct: 0, vol: 0 }; form(); ctx.toast(`${ext.toUpperCase()} files get checked by the Hub's slicer. STL files are checked right here.`); return; }
      if (fl.size > 80e6) { ctx.toast('That file is over 80 MB. Try exporting it with fewer details from Onshape.'); return; }
      try { const r = parseSTL(await fl.arrayBuffer()); file = { name: fl.name, real: true, ...r }; pre.sup = r.overPct > 5; form(); }
      catch (err) { ctx.toast("That STL couldn't be read. Try exporting it again from Onshape."); }
    };
    inp.addEventListener('change', () => take(inp.files[0]));
    ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (ev) => { ev.preventDefault(); drop.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (ev) => { ev.preventDefault(); drop.classList.remove('is-over'); }));
    drop.addEventListener('drop', (ev) => take(ev.dataTransfer && ev.dataTransfer.files[0]));
    $('#psGo').addEventListener('click', () => {
      if (!file) { ctx.toast('Add a file or use the sample part first.'); return; }
      const why = $('#psWhy').value.trim();
      if (!why) { $('#psWhy').focus(); ctx.toast('Tell the mentors why you need it. It helps them decide what prints first.'); return; }
      const est2 = est();
      JOBS.unshift({ id: jobId++, n: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '), q: pre.n, by: 'Sparky', st: 'waiting', t: `About ${est2.time}`, g: est2.grams, why });
      file = null; pre.n = 1; pre.sup = false;
      form(); queue();
      ctx.toast('Sent. A mentor sees it on their phone with the preview and your note.');
    });
  };
  const queue = () => {
    $('#qCount').textContent = `${JOBS.filter((j) => !['done', 'failed'].includes(j.st)).length} active`;
    $('#queue').innerHTML = JOBS.map((j) => {
      const [lbl, c] = ST[j.st];
      const left = j.st === 'printing' ? ring(j.pct, `${j.pct}%`, 44) : `<span class="oc2">${icon(j.st === 'done' ? 'check' : j.st === 'failed' ? 'x' : j.st === 'queued' ? 'clock' : j.st === 'back' ? 'arrow' : 'printer', 'i sm')}</span>`;
      const acts = mentor && j.st === 'waiting' ? `<div class="acts"><button class="btn primary pill sm" type="button" data-ok="${j.id}">Approve</button><button class="btn ghost pill sm" type="button" data-back="${j.id}">Send back</button></div>` : j.st === 'failed' ? `<div class="acts"><button class="btn ghost pill sm" type="button" data-retry="${j.id}">Try again</button></div>` : '';
      return `<div class="job">${left}<div style="min-width:0"><div class="what">${esc(j.n)}${j.q > 1 ? ` ×${j.q}` : ''}</div><div class="meta">${av(j.by, 16)}${j.by} · ${dot(c, 7)}${lbl}${j.pr ? ` · ${j.pr}` : ''}</div><div class="meta">${esc(j.t)}${j.g ? ` · ${j.g} g` : ''}</div>${mentor && j.why ? `<div class="meta">"${esc(j.why)}"</div>` : ''}</div>${acts}</div>`;
    }).join('');
  };
  form(); queue();
  wireSeg(view, 'view', (v) => { mentor = v === 'mentor'; queue(); if (mentor) ctx.toast('Mentor view: approve or send back requests. In the Hub this lives on your phone.'); });
  $('#queue').addEventListener('click', (e) => {
    const ok = e.target.closest('[data-ok]'), back = e.target.closest('[data-back]'), retry = e.target.closest('[data-retry]');
    const j = JOBS.find((x) => x.id === +((ok || back || retry || {}).dataset || {})[ok ? 'ok' : back ? 'back' : 'retry']);
    if (!j) return;
    if (ok) { j.st = 'queued'; j.pr = 'Printer 2'; j.t = 'Next on Printer 2'; ctx.toast(`Approved. ${j.by} gets a ping.`); }
    if (back) { j.st = 'back'; j.t = 'Tip: rotate it so the layers run along the arm'; ctx.toast(`Sent back to ${j.by} with a tip.`); }
    if (retry) { j.st = 'waiting'; j.t = 'Retry with a brim for better bed grip'; }
    queue();
  });
  view.addEventListener('click', (e) => { const g = e.target.closest('[data-go]'); if (g) { const [z, s] = g.dataset.go.split('/'); ctx.go(z, s); } });
}

// ================================================================= Parts and inventory
const BINS = [
  ['A1', 'Screws and bits', '2800-0004-0010', 180, 'hardware'], ['A2', 'Screws and bits', '2812-0004-0007', 120, 'hardware'], ['A3', 'Screws and bits', '2822-0004-0010', 36, 'hardware'],
  ['B1', 'Bearing / Collar', '1611-0514-4008', 10, 'hardware'], ['B2', 'Hub', '2320-4008-0024', 5, 'hardware'], ['B3', '8mm REX Shaft', '2106-4008-0800', 1, 'hardware'],
  ['C1', 'Intake Roller', '3618-4008-0016', 6, 'intake'], ['C2', '48mm Gecko Wheel', '3613-4008-0048', 4, 'intake'], ['C3', 'Mecanum Wheel', '3625-0100-0104', 0, 'drivetrain'],
  ['D1', 'Drive Motor', '5203-2402-0019', 1, 'drivetrain'], ['D2', 'Speed Servo', '2000-0025-0003', 2, 'intake'], ['D3', '12V Battery', '3100-0012-0020', 2, 'power'],
  ['E1', 'Standoff / Spacer', '1522-0010-0120', 20, 'structure'], ['E2', 'U-Channel', '1121-0010-0264', 3, 'structure'],
];
const LOW = { 'Screws and bits': 50, '8mm REX Shaft': 2, 'Mecanum Wheel': 1, 'Drive Motor': 1, '12V Battery': 2 };
const REQS = [{ p: '48mm Gecko Wheel', n: 4, by: 'Pixel', st: 'Ordered', when: 'Before the next meet' }];
function inventory(view, ctx) {
  const { SYS } = ctx;
  const parts = ctx.parts();
  const onRobot = (sku) => (parts ? Object.values(parts.parts).filter((p) => p[0] === sku).length : null);
  const status = (name, n) => (n === 0 ? ['Out', 'bad'] : n <= (LOW[name] ?? 1) ? ['Low', 'warn'] : ['OK', 'ok']);
  const names = parts ? [...new Set(Object.values(parts.parts).map((p) => p[2]))].sort() : BINS.map((b) => b[1]);
  let req = { n: 1, when: 'This week' };
  view.innerHTML = `<div class="zv">
    ${strip("What's in the bins, what's running low, and a form to ask the mentors for parts. Part numbers and on-robot counts are real; bin counts are samples until someone counts them.", [tag('Planned'), tag('Bin counts are sample')])}
    <article class="card"><div class="callout" style="align-items:center">${icon('alert')}<div><b>Running low:</b> ${BINS.filter((b) => status(b[1], b[3])[1] !== 'ok').map((b) => `${b[1] === 'Screws and bits' ? b[2] : b[1]} (${b[3] === 0 ? 'none left' : `${b[3]} left`})`).join(', ')}.</div></div></article>
    <article class="card c7">
      <div class="card-head"><h3 class="card-title">Bins</h3><span class="tag">${BINS.length} bins</span></div>
      <div class="tbl">
        <div class="tr th" style="grid-template-columns:44px minmax(0,1.6fr) minmax(0,1.2fr) 70px 70px 64px"><span>Bin</span><span>Part</span><span>Part number</span><span style="text-align:right">In bin</span><span style="text-align:right">On robot</span><span></span></div>
        ${BINS.map(([bin, name, sku, n, sys]) => { const [s, c] = status(name, n); const r = onRobot(sku); return `<div class="tr" style="grid-template-columns:44px minmax(0,1.6fr) minmax(0,1.2fr) 70px 70px 64px"><span class="mono">${bin}</span><span class="row" style="gap:6px">${dot(SYS[sys].c, 8)}<span class="nm">${name}</span></span><span class="sku">${sku}</span><span class="q">${n}</span><span class="q" style="color:var(--muted)">${r ?? '—'}</span><span><span class="st" style="height:24px"><span class="ci ${c}" style="width:10px;height:10px"></span>${s}</span></span></div>`; }).join('')}
      </div>
    </article>
    <div class="c5 stack-v" style="gap:16px">
      <article class="card" id="reqForm">
        <div class="card-head"><h3 class="card-title">Request a part</h3></div>
        <label class="field"><span>Part</span><select class="inp" id="rqP">${names.map((n) => `<option>${esc(n)}</option>`).join('')}<option>Something else</option></select></label>
        <div class="form-grid"><div class="field"><span>How many</span><span class="stepper"><button type="button" id="rqMinus" aria-label="One fewer">${icon('min', 'i sm')}</button><output id="rqN">1</output><button type="button" id="rqPlus" aria-label="One more">${icon('plus', 'i sm')}</button></span></div>
        <div class="field"><span>Needed by</span><select class="inp" id="rqW"><option>This week</option><option>Before the next meet</option><option>Whenever</option></select></div></div>
        <label class="field"><span>What's it for?</span><textarea class="inp" id="rqWhy" placeholder="Spare wheels for the meet"></textarea></label>
        <div class="card-foot"><span class="cap">Lands in the mentors' review inbox.</span><button class="btn primary pill" type="button" id="rqGo">Send request</button></div>
      </article>
      <article class="card"><div class="card-head"><h3 class="card-title">Requests</h3></div><div class="items" id="reqs"></div></article>
    </div>
  </div>`;
  const drawReqs = () => { $('#reqs').innerHTML = REQS.map((r) => `<div class="it">${av(r.by, 28)}<div class="grow"><div class="t">${esc(r.p)} ×${r.n}</div><div class="meta">${r.by} · ${esc(r.when)}</div></div><span class="st">${r.st}</span></div>`).join(''); };
  drawReqs();
  $('#rqMinus').addEventListener('click', () => { req.n = clamp(req.n - 1, 1, 99); $('#rqN').textContent = req.n; });
  $('#rqPlus').addEventListener('click', () => { req.n = clamp(req.n + 1, 1, 99); $('#rqN').textContent = req.n; });
  $('#rqGo').addEventListener('click', () => {
    const why = $('#rqWhy').value.trim();
    if (!why) { $('#rqWhy').focus(); ctx.toast('Say what the part is for, so mentors can order the right thing.'); return; }
    REQS.unshift({ p: $('#rqP').value, n: req.n, by: 'Sparky', st: 'Sent', when: $('#rqW').value });
    $('#rqWhy').value = ''; req.n = 1; $('#rqN').textContent = '1';
    drawReqs();
    ctx.toast('Sent to the mentors. You get a ping when it is ordered or in the bin.');
  });
}

export const BUILD = { Ideas: ideas, 'Mechanism Lab': lab, 'Print Shop': printShop, 'Parts and inventory': inventory };
