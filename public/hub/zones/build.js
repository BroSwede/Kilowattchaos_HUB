// Build zone: Ideas, Mechanism Lab (cards, sims, decision matrix), Print Shop, Parts and inventory.
// Ideas, votes, matrix scores, prints and team stock are saved in the team database. Mechanism cards and sims are lessons.
import { $, $$, esc, fmt, clamp, icon, tag, strip, av, dot, bar, ring, seg, wireSeg, sw, drawer, closeDrawer, gl } from './common.js';
import { api, session, isMentor, me } from '../api.js';

// ---------------------------------------------------------------- Small shared helpers
const day = (s) => { if (!s) return ''; const d = new Date(s); return isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
const ago = (s) => {
  const m = Math.round((Date.now() - new Date(s)) / 60000);
  if (!(m >= 0)) return day(s);
  if (m < 1) return 'just now'; if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} h ago`;
  return day(s);
};
const empty = (html) => `<div class="live-empty">${html}</div>`;
const fail = (ctx, err) => ctx.toast(err && err.message ? err.message : 'That did not save. Try again.');
const myId = () => (session.user ? session.user.id : '');
const isMine = (r) => r.user_id === myId();
const safeUrl = (u) => (/^https?:\/\/[^\s]+$/i.test(String(u || '').trim()) ? String(u).trim() : '');

// ================================================================= Ideas
// `idea` records: { kind: 'idea'|'prob', t, sys, st, d, pinned, tags: [], link }.
// Replies are `idea` records too: { replyTo: ideaId, lens, text }. Votes are `vote` records: { idea: ideaId }, one per person.
const COLS = ['New', 'Exploring', 'Prototyping', 'On the robot', 'Parked'];
const TAGS = ['Pile pickup', 'Wall and corner', 'Autonomous', 'Faster', 'More reliable', 'Lighter', 'Easier to build', 'Seen on another team'];
const kindLbl = (k) => (k === 'prob' ? `<span class="kind prob">${icon('alert', 'i sm')}Problem</span>` : `<span class="kind">${icon('bulb', 'i sm')}Idea</span>`);

function ideas(view, ctx) {
  const { SYS, SYS_ORDER } = ctx;
  let filt = 'all', recs = [], votes = [], alive = true, loaded = false;
  const sysF = () => ctx.state.ideaSys || '';
  view.innerHTML = `<div class="zv">
    ${strip('One place for anything said about the robot: ideas and problems. Teammates vote and reply with "I like, I wonder, what if", and the idea moves across the board as the team tries it.', [tag('Team board', 'volt')], `<button class="btn primary pill" type="button" id="newIdea">${icon('plus', 'i sm')}New idea</button>`)}
    <article class="card" id="ideaForm" hidden></article>
    <div class="row wrap" style="padding:0 4px"><div class="chips" id="ideaF">${[['all', 'All'], ['prob', 'Problems'], ['idea', 'Ideas'], ['pinned', 'On the robot'], ['mine', 'Mine']].map(([v, t]) => `<button class="chip" type="button" data-f="${v}" aria-pressed="${v === filt}">${t}</button>`).join('')}</div><span id="sysChip"></span></div>
    <div id="ideaEmpty"></div>
    <div class="kan" id="kan"></div>
  </div>`;
  const items = () => recs.filter((r) => !r.data.replyTo && r.data.t);
  const repliesOf = (id) => recs.filter((r) => r.data.replyTo === id).sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  const votesOf = (id) => votes.filter((v) => v.data.idea === id);
  const myVote = (id) => votesOf(id).find(isMine);
  const draw = () => {
    const sf = sysF();
    $('#sysChip').innerHTML = sf && SYS[sf] ? `<button class="chip" type="button" id="clearSys" aria-pressed="true">${dot(SYS[sf].c, 8)}${SYS[sf].name}${icon('x', 'i sm')}</button>` : '';
    const all = items();
    const list = all.filter((r) => { const i = r.data; return (filt === 'all' || (filt === 'pinned' ? i.pinned : filt === 'mine' ? isMine(r) : i.kind === filt)) && (!sf || i.sys === sf); });
    $('#ideaEmpty').innerHTML = !loaded ? '' : !all.length ? empty(`No ideas yet. Got one, or spotted a problem on the robot? Tap <b>New idea</b> and be the first.`) : !list.length ? empty('Nothing matches this filter yet.') : '';
    $('#kan').innerHTML = COLS.map((c) => {
      const its = list.filter((r) => (COLS.includes(r.data.st) ? r.data.st : 'New') === c).sort((a, b) => votesOf(b.id).length - votesOf(a.id).length);
      return `<section class="kcol" aria-label="${c}"><h4>${c}<span class="n">${its.length}</span></h4>${its.map((r) => { const i = r.data, s = SYS[i.sys] || SYS.hardware; return `<button class="kcard" type="button" data-idea="${esc(r.id)}">
        <span class="row between">${kindLbl(i.kind)}${i.pinned ? `<span class="st">${icon('pin', 'i sm')}On the robot</span>` : ''}</span>
        <span class="t">${esc(i.t)}</span>
        <span class="row" style="gap:6px">${dot(s.c, 8)}<span class="cap">${s.name}</span></span>
        ${(i.tags || []).length ? `<span class="row wrap lb-tags">${i.tags.slice(0, 3).map((t) => `<span class="chip-sm">${esc(t)}</span>`).join('')}</span>` : ''}
        <span class="foot">${av(r.author, 22)}<span>${esc(r.author)}</span><span style="margin-left:auto" class="row" title="Votes">${icon('arrow', 'i sm')}${votesOf(r.id).length}</span><span class="row" title="Replies">${icon('chat', 'i sm')}${repliesOf(r.id).length}</span></span>
      </button>`; }).join('') || '<p class="cap" style="padding:8px 4px;font-weight:400">Nothing here yet.</p>'}</section>`;
    }).join('');
  };
  draw();
  Promise.all([api.list('idea'), api.list('vote')]).then(([is, vs]) => {
    if (!alive) return;
    recs = is; votes = vs.filter((v) => v.data && v.data.idea); loaded = true; draw();
    if (ctx.state.openIdea) { const id = ctx.state.openIdea; ctx.state.openIdea = ''; if (recs.some((r) => r.id === id)) openIdea(id); }
  }).catch((err) => { if (alive) fail(ctx, err); });
  $('#ideaF').addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (!b) return; filt = b.dataset.f; $$('#ideaF .chip').forEach((c) => c.setAttribute('aria-pressed', String(c === b))); draw(); });
  view.addEventListener('click', (e) => {
    if (e.target.closest('#clearSys')) { ctx.state.ideaSys = ''; draw(); return; }
    const c = e.target.closest('[data-idea]');
    if (c) openIdea(c.dataset.idea);
  });

  const form = $('#ideaForm');
  $('#newIdea').addEventListener('click', () => {
    form.hidden = !form.hidden;
    if (form.hidden) return;
    const tags = new Set();
    form.innerHTML = `<div class="card-head"><h3 class="card-title">New idea or problem</h3><button class="icon-btn sm" type="button" id="ideaX" aria-label="Close">${icon('x')}</button></div>
      <div class="form-grid">
        <label class="field full"><span>What is it?</span><input class="inp" id="ideaT" maxlength="80" placeholder="The intake drops balls when…" required></label>
        <div class="field"><span>Type</span>${seg('kind', [['idea', `${icon('bulb', 'i sm')}Idea`], ['prob', `${icon('alert', 'i sm')}Problem`]], 'idea', 'Type')}</div>
        <label class="field"><span>Subsystem</span><select class="inp" id="ideaS">${SYS_ORDER.map((k) => `<option value="${k}"${k === sysF() ? ' selected' : ''}>${SYS[k].name}</option>`).join('')}</select></label>
        <label class="field full"><span>Tell the team more</span><textarea class="inp" id="ideaD" maxlength="1200" placeholder="What did you see, and what would you try?"></textarea></label>
        <div class="field full"><span>Tags <small>(pick any)</small></span><div class="chips" id="ideaTags">${TAGS.map((t) => `<button class="chip" type="button" data-tag="${esc(t)}" aria-pressed="false">${esc(t)}</button>`).join('')}</div></div>
        <label class="field full"><span>Inspiration link <small>(optional: a video, photo or guide that gave you the idea)</small></span><input class="inp" id="ideaL" type="url" maxlength="300" placeholder="https://"></label>
        <div class="row full">${sw('ideaPin', false, 'This is about a part on the robot now')}<span>This is about a part on the robot now</span></div>
      </div>
      <div class="card-foot"><span class="cap">Posts to New. Everyone on the team can see it.</span><button class="btn primary pill" type="button" id="ideaPost">Post it</button></div>`;
    let kind = 'idea';
    wireSeg(form, 'kind', (v) => { kind = v; });
    $('#ideaTags').addEventListener('click', (e) => { const b = e.target.closest('[data-tag]'); if (!b) return; const t = b.dataset.tag; if (tags.has(t)) tags.delete(t); else tags.add(t); b.setAttribute('aria-pressed', String(tags.has(t))); });
    $('#ideaPin').addEventListener('click', (e) => e.currentTarget.setAttribute('aria-checked', String(e.currentTarget.getAttribute('aria-checked') !== 'true')));
    $('#ideaX').addEventListener('click', () => { form.hidden = true; });
    $('#ideaT').focus();
    $('#ideaPost').addEventListener('click', async (e) => {
      const t = $('#ideaT').value.trim();
      if (!t) { $('#ideaT').focus(); ctx.toast('Give it a short title first.'); return; }
      const link = $('#ideaL').value.trim();
      if (link && !safeUrl(link)) { $('#ideaL').focus(); ctx.toast('Links start with https://'); return; }
      const btn = e.currentTarget; btn.disabled = true;
      try {
        const rec = await api.create('idea', { kind, t, sys: $('#ideaS').value, st: 'New', d: $('#ideaD').value.trim(), pinned: $('#ideaPin').getAttribute('aria-checked') === 'true', tags: [...tags], link });
        recs.unshift(rec);
        form.hidden = true;
        filt = 'all'; $$('#ideaF .chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.f === 'all')));
        draw();
        ctx.toast('Posted to New. The whole team can see it now.');
      } catch (err) { fail(ctx, err); btn.disabled = false; }
    });
  });

  function openIdea(id) {
    const r = recs.find((x) => x.id === id);
    if (!r) return;
    const i = r.data, s = SYS[i.sys] || SYS.hardware;
    const canEdit = isMine(r) || isMentor();
    const link = safeUrl(i.link);
    const el = drawer(`<div class="row wrap">${kindLbl(i.kind)}<span class="row" style="gap:6px">${dot(s.c, 8)}<span class="cap">${s.name}</span></span>${i.pinned ? `<span class="st">${icon('pin', 'i sm')}On the robot</span>` : ''}</div>
      <h3>${esc(i.t)}</h3>
      <div class="row wrap">${av(r.author, 28)}<span><b style="font-weight:500">${esc(r.author)}</b> <span class="cap">posted it ${esc(ago(r.created_at))}</span></span><span style="margin-left:auto"></span>${canEdit ? `<label class="row" style="gap:8px"><span class="cap">Status</span><select class="inp" id="ideaSt" style="height:36px;width:auto">${COLS.map((c) => `<option${c === i.st ? ' selected' : ''}>${c}</option>`).join('')}</select></label>` : `<span class="st">${esc(COLS.includes(i.st) ? i.st : 'New')}</span>`}</div>
      <p>${i.d ? esc(i.d) : '<span class="muted">No details yet.</span>'}</p>
      ${(i.tags || []).length ? `<div class="row wrap">${i.tags.map((t) => `<span class="chip-sm">${esc(t)}</span>`).join('')}</div>` : ''}
      ${link ? `<a class="btn ghost pill sm" href="${esc(link)}" target="_blank" rel="noopener noreferrer" style="align-self:flex-start">${icon('sparkle', 'i sm')}Inspiration link</a>` : ''}
      <div class="row wrap"><button class="vote" type="button" id="voteBtn" aria-pressed="${!!myVote(id)}">${icon('arrow', 'i sm')}<span>${votesOf(id).length}</span> votes</button><span class="cap" id="voters"></span><button class="btn soft pill sm" type="button" id="seeSys">${icon('focus', 'i sm')}Show ${s.name.toLowerCase()} in 3D</button>${canEdit ? `<button class="btn ghost pill sm" type="button" id="ideaDel">${icon('x', 'i sm')}Remove</button>` : ''}</div>
      <h4>Replies</h4>
      <div class="stack-v" id="replies" style="gap:12px"></div>
      <div class="field"><span>Reply</span>${seg('lens', [['I like', 'I like'], ['I wonder', 'I wonder'], ['What if', 'What if']], 'I like', 'Reply type')}<textarea class="inp" id="replyT" maxlength="600" placeholder="Say what you like, wonder or would try"></textarea></div>
      <div class="row" style="justify-content:flex-end"><button class="btn primary pill" type="button" id="replyGo">Reply</button></div>`, { label: i.t, wide: true });
    const drawReplies = () => {
      const rs = repliesOf(id);
      $('#replies', el).innerHTML = rs.length ? rs.map((x) => `<div class="reply">${av(x.author, 32)}<div class="who">${esc(x.author)}<span>${esc(ago(x.created_at))}</span></div><p><span class="lens">${esc(x.data.lens || '')}</span>${esc(x.data.text || '')}</p></div>`).join('') : empty('No replies yet. Start with "I like", "I wonder" or "What if".');
      const vs = votesOf(id).map((v) => v.author);
      $('#voters', el).textContent = vs.length ? `From ${vs.slice(0, 4).join(', ')}${vs.length > 4 ? ` and ${vs.length - 4} more` : ''}` : '';
    };
    drawReplies();
    let lens = 'I like';
    wireSeg(el, 'lens', (v) => { lens = v; });
    $('#voteBtn', el).addEventListener('click', async (e) => {
      const btn = e.currentTarget; btn.disabled = true;
      try {
        const mine = myVote(id);
        if (mine) { await api.remove('vote', mine.id); votes = votes.filter((v) => v.id !== mine.id); }
        else votes.push(await api.create('vote', { idea: id }));
        btn.setAttribute('aria-pressed', String(!!myVote(id)));
        $('span', btn).textContent = votesOf(id).length;
        drawReplies(); draw();
      } catch (err) { fail(ctx, err); }
      btn.disabled = false;
    });
    const st = $('#ideaSt', el);
    if (st) st.addEventListener('change', async (e) => {
      const prev = i.st, v = e.target.value;
      try { const u = await api.update('idea', id, { st: v }); r.data = u.data; Object.assign(i, u.data); draw(); ctx.toast(`Moved to ${v}.`); }
      catch (err) { e.target.value = prev; fail(ctx, err); }
    });
    $('#seeSys', el).addEventListener('click', () => { closeDrawer(); ctx.focusSystem(i.sys); });
    const del = $('#ideaDel', el);
    if (del) del.addEventListener('click', async () => {
      if (!confirm('Remove this idea? Its replies go too.')) return;
      try {
        await api.remove('idea', id);
        for (const x of repliesOf(id)) { try { await api.remove('idea', x.id); } catch (err) { /* a reply someone else wrote stays hidden with its idea */ } }
        recs = recs.filter((x) => x.id !== id && x.data.replyTo !== id);
        closeDrawer(); draw(); ctx.toast('Removed.');
      } catch (err) { fail(ctx, err); }
    });
    $('#replyGo', el).addEventListener('click', async (e) => {
      const t = $('#replyT', el).value.trim();
      if (!t) { $('#replyT', el).focus(); return; }
      const btn = e.currentTarget; btn.disabled = true;
      try {
        recs.push(await api.create('idea', { replyTo: id, lens, text: t }));
        $('#replyT', el).value = '';
        drawReplies(); draw();
      } catch (err) { fail(ctx, err); }
      btn.disabled = false;
    });
  }
  return () => { alive = false; closeDrawer(); };
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
// The decision matrix the team scores together. Filled from the latest `matrix` record
// ({ topic, opts, crit: [[name, weight]], s: [[scores]], portfolio, winner }) so Logbook > Portfolio shows the team's own scores.
export const MATRIX = {
  topic: 'Launcher',
  opts: ['Single flywheel with hood', 'Dual flywheel', 'Catapult'],
  crit: [['Speed', 3], ['Reliability', 5], ['Build time', 2], ['Weight', 1], ['Cost', 1]],
  s: [[3, 3, 3, 3, 3], [3, 3, 3, 3, 3], [3, 3, 3, 3, 3]],
  rec: null,
};
function applyMatrix(r) {
  const d = r && r.data;
  if (!d || !Array.isArray(d.opts) || !Array.isArray(d.crit) || !Array.isArray(d.s)) return;
  Object.assign(MATRIX, { topic: d.topic || 'Launcher', opts: d.opts, crit: d.crit, s: d.s, rec: r });
}
export const matrixReady = api.list('matrix').then((rs) => { applyMatrix(rs[0]); return MATRIX; }).catch(() => MATRIX);
function lab(view, ctx) {
  let fam = ctx.state.fam || 'intake';
  view.innerHTML = `<div class="zv">
    ${strip(`The design space for BIOBUZZ. Pollen are plastic balls about 3 in. across, picked up off foam tiles: in lines, in piles, against walls and in corners, including in autonomous. Hover a dotted word for its meaning, like ${gl('compression')} or ${gl('surface speed')}.`, [tag('Cards on the shop TV the week of Nov 16'), tag('Try the sims')])}
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
  return matrix($('#matrix'), ctx);
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
  let alive = true, timer = 0, saving = Promise.resolve(), status = '';
  const data = () => ({ topic: MATRIX.topic, opts: MATRIX.opts, crit: MATRIX.crit, s: MATRIX.s });
  const setStat = () => { const t = $('#mxStat', el); if (t) t.textContent = status; };
  const save = (extra = {}) => {
    saving = saving.then(async () => {
      try {
        const body = { ...data(), ...extra };
        if (MATRIX.rec) { const u = await api.update('matrix', MATRIX.rec.id, body); MATRIX.rec = { ...MATRIX.rec, data: u.data, updated_at: u.updated_at }; }
        else MATRIX.rec = await api.create('matrix', body);
        status = 'Saved';
      } catch (err) { status = 'Not saved'; fail(ctx, err); }
      if (alive) setStat();
    });
    return saving;
  };
  const later = () => { clearTimeout(timer); timer = setTimeout(() => { timer = 0; save({ by: me() }); }, 700); };
  const draw = () => {
    const tot = MATRIX.s.map((row) => row.reduce((a, v, j) => a + v * MATRIX.crit[j][1], 0));
    const best = Math.max(...tot), max = MATRIX.crit.reduce((a, c) => a + 5 * c[1], 0);
    const r = MATRIX.rec, d = r ? r.data : null;
    const stat = status || (r ? `Last change by ${d.by || r.author}${r.updated_at ? `, ${day(r.updated_at)}` : ''}${d.portfolio ? ' · in the portfolio' : ''}` : 'Not scored yet');
    el.innerHTML = `<div class="card-head"><h3 class="card-title">Decision matrix · ${esc(MATRIX.topic)}</h3><span class="tag" id="mxStat">${esc(stat)}</span><button class="btn primary pill sm" type="button" id="mxSave">${icon('logbook', 'i sm')}Save to Portfolio</button></div>
      <p class="lead">Score each option from 1 to 5 together, and set how much each thing matters. The highest total wins. Every change saves for the whole team, and the table goes into the Engineering Portfolio as a decision record.</p>
      <div class="mx" style="--n:${MATRIX.crit.length}">
        <div class="mx-row"><span class="mx-h">Option</span>${MATRIX.crit.map(([c, w], j) => `<span class="mx-h">${esc(c)}<br><label><span class="sr">Weight for ${esc(c)}</span><input type="number" min="0" max="5" value="${w}" data-w="${j}"></label></span>`).join('')}<span class="mx-h">Total</span></div>
        ${MATRIX.opts.map((o, i) => `<div class="mx-row${tot[i] === best ? ' win' : ''}"><span class="mx-o">${esc(o)}</span>${MATRIX.s[i].map((v, j) => `<span class="mx-c"><select data-s="${i},${j}" aria-label="${esc(o)}: ${esc(MATRIX.crit[j][0])}">${[1, 2, 3, 4, 5].map((n) => `<option${n === v ? ' selected' : ''}>${n}</option>`).join('')}</select></span>`).join('')}<span class="mx-t">${tot[i]}<span class="cap" style="display:block;font-size:11px">of ${max}</span></span></div>`).join('')}
      </div>`;
    $$('[data-s]', el).forEach((s) => s.addEventListener('change', () => { const [i, j] = s.dataset.s.split(',').map(Number); MATRIX.s[i][j] = +s.value; status = 'Saving…'; draw(); later(); }));
    $$('[data-w]', el).forEach((s) => s.addEventListener('change', () => { MATRIX.crit[+s.dataset.w][1] = clamp(Math.round(+s.value || 0), 0, 5); status = 'Saving…'; draw(); later(); }));
    $('#mxSave', el).addEventListener('click', async (e) => {
      clearTimeout(timer); timer = 0;
      const btn = e.currentTarget; btn.disabled = true;
      const winner = MATRIX.opts[tot.indexOf(best)];
      await save({ by: me(), portfolio: true, winner, savedAt: new Date().toISOString() });
      if (MATRIX.rec && MATRIX.rec.data.portfolio && status === 'Saved') { ctx.state.matrixSaved = true; ctx.toast(`Saved: "${winner}" wins with ${best} points. It's now in Logbook, Portfolio.`); }
      if (alive) { status = ''; draw(); }
    });
  };
  draw();
  api.list('matrix').then((rs) => { if (!alive || !rs[0] || timer) return; applyMatrix(rs[0]); draw(); }).catch(() => {});
  return () => { alive = false; if (timer) { clearTimeout(timer); save({ by: me() }); } };
}

// ================================================================= Print Shop
// `print` records: { name, file (a link), material, color, qty, notes, sys, quality, strength, supports, grams, time,
//   status: 'queued' | 'printing' | 'done' | 'failed', who, printer, pct, reason }.
// Anyone can request. Mentors start, update and finish prints. The requester can cancel a queued one or try a failed one again.
const ST = { queued: ['Queued', 'var(--sys-drivetrain)', 'clock'], printing: ['Printing', 'var(--sys-intake)', 'printer'], done: ['Done', 'var(--ok)', 'check'], failed: ['Failed', 'var(--negative)', 'x'] };
const MATS = ['PLA', 'PETG', 'TPU'];
const COLORS = ['Black', 'Gray', 'White', 'Orange', 'Yellow', 'Blue'];
const REASONS = ['Warping', 'Bed adhesion', 'Spaghetti', 'Clogged nozzle', 'Ran out of filament', 'Something else'];
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
  const { SYS, SYS_ORDER } = ctx;
  const mentor = isMentor();
  let file = null, jobs = [], alive = true, loaded = false, show = mentor ? 'all' : 'mine';
  const pre = { mat: 'PLA', color: 'Black', q: 'Standard', s: 'Standard', sup: false, n: 1 };
  view.innerHTML = `<div class="zv">
    ${strip(mentor ? 'Students send parts with a note. Start a print when it goes on a printer, update how far along it is, and mark it done or failed. Everyone sees the queue.' : "Send a part with a note. A mentor puts it on a printer, and you can follow it here until it's ready to pick up.", [tag('Team queue', 'volt')])}
    <article class="card">
      <div class="steps" aria-label="How a print request moves">${[['Request', 'you'], ['Queued', 'waiting for a printer'], ['Printing', 'a mentor starts it'], ['Done', 'you pick it up']].map(([s, w], i) => `<span class="step${i < 1 ? ' done' : i === 1 ? ' now' : ''}"><span class="n">${i + 1}</span>${s}<small>${w}</small></span>`).join('')}</div>
    </article>
    <article class="card c7" id="psForm"></article>
    <div class="c5 stack-v" style="gap:16px">
      <article class="card"><div class="card-head"><h3 class="card-title">Queue</h3><span class="tag" id="qCount"></span></div>
        <div class="chips" id="qShow">${[['mine', 'My requests'], ['all', 'Everyone']].map(([v, t]) => `<button class="chip" type="button" data-show="${v}" aria-pressed="${v === show}">${t}</button>`).join('')}</div>
        <div class="items" id="queue"></div></article>
      <article class="card"><div class="card-head"><h3 class="card-title">Printers</h3></div><div id="printers"></div></article>
      <article class="card"><div class="card-head"><h3 class="card-title">Why prints fail</h3>${tag('This season')}</div>
        <div id="fails"></div>
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
    if (!file || !file.tris) return '';
    const fits = file.size.every((v, i) => v <= BED[i]);
    const sz = file.size.map((v) => (Math.round(v * 10) / 10).toFixed(1)).join(' × ');
    return `<ul class="checks">
      <li><span class="ci ${fits ? 'ok' : 'bad'}">${icon(fits ? 'check' : 'x')}</span><span>${fits ? 'Fits the bed' : 'Too big for the bed'}: ${sz} mm${fits ? '' : ` (bed is ${BED.join(' × ')} mm)`}</span></li>
      <li><span class="ci ${file.overPct > 5 ? 'warn' : 'ok'}">${icon(file.overPct > 5 ? 'alert' : 'check')}</span><span>${file.overPct > 5 ? `${file.overPct.toFixed(0)}% of the surface hangs steeper than 45°. Supports are on.` : 'No steep overhangs'}</span></li>
      <li><span class="ci ok">${icon('check')}</span><span>${fmt(file.tris)} triangles${file.vol ? ` · ${file.vol.toFixed(1)} cm³ of plastic if solid` : ''}</span></li></ul>`;
  };
  const keep = () => { const f = $('#psForm'); if (!f || !$('#psName', f)) return; pre.name = $('#psName').value; pre.link = $('#psLink').value; pre.why = $('#psWhy').value; pre.sys = $('#psSys').value; };
  const form = () => {
    const e = est();
    $('#psForm').innerHTML = `<div class="card-head"><h3 class="card-title">New print request</h3></div>
      <div class="form-grid">
        <label class="field full"><span>What is the part?</span><input class="inp" id="psName" maxlength="80" placeholder="Intake roller hub" value="${esc(pre.name || '')}"></label>
        <label class="field full"><span>File link <small>(Onshape, Google Drive or another link a mentor can open)</small></span><input class="inp" id="psLink" type="url" maxlength="400" placeholder="https://" value="${esc(pre.link || '')}"></label>
      </div>
      <label class="drop" id="drop">${icon('printer', 'i lg')}<b>${file ? esc(file.name) : 'Check an STL here first (optional)'}</b><span class="cap" style="font-weight:400">${file ? 'Checked right here in your browser. The file is not uploaded, so add a link above too.' : 'Drop an STL or choose one. It is checked in your browser: size, overhangs and a filament guess.'}</span><input type="file" id="psFile" accept=".stl"></label>
      ${checks()}
      <div class="form-grid">
        <label class="field"><span>Material</span><select class="inp" id="psMat">${MATS.map((m) => `<option${m === pre.mat ? ' selected' : ''}>${m}</option>`).join('')}</select></label>
        <label class="field"><span>Color</span><select class="inp" id="psColor">${COLORS.map((m) => `<option${m === pre.color ? ' selected' : ''}>${m}</option>`).join('')}</select></label>
        <div class="field"><span>Quality</span>${seg('q', [['Draft', 'Draft'], ['Standard', 'Standard'], ['Fine', 'Fine']], pre.q, 'Quality')}</div>
        <div class="field"><span>Strength</span>${seg('s', [['Light', 'Light'], ['Standard', 'Standard'], ['Strong', 'Strong']], pre.s, 'Strength')}</div>
        <div class="field"><span>How many</span><span class="stepper"><button type="button" id="nMinus" aria-label="One fewer">${icon('min', 'i sm')}</button><output id="nOut">${pre.n}</output><button type="button" id="nPlus" aria-label="One more">${icon('plus', 'i sm')}</button></span></div>
        <div class="field"><span>Supports</span><span class="row">${sw('psSup', pre.sup, 'Supports')}<span class="cap">${pre.sup ? 'On' : 'Off'}</span></span></div>
        <label class="field full"><span>Which subsystem is it for?</span><select class="inp" id="psSys"><option value="">Not for the robot</option>${SYS_ORDER.map((k) => `<option value="${k}"${k === pre.sys ? ' selected' : ''}>${SYS[k].name}</option>`).join('')}</select></label>
        <label class="field full"><span>Why do you need it?</span><textarea class="inp" id="psWhy" maxlength="400" placeholder="For the intake test on Tuesday">${esc(pre.why || '')}</textarea></label>
      </div>
      <div class="card-foot"><span class="cap">About <b>${e.time}</b> and <b>${e.grams} g</b> of filament · a rough guess, the slicer gives the real one. Mentors set the printer settings, so you never touch temperatures.</span><button class="btn primary pill" type="button" id="psGo">${icon('printer', 'i sm')}Send to mentors</button></div>`;
    const f = $('#psForm');
    wireSeg(f, 'q', (v) => { keep(); pre.q = v; form(); });
    wireSeg(f, 's', (v) => { keep(); pre.s = v; form(); });
    $('#psMat').addEventListener('change', (ev) => { pre.mat = ev.target.value; });
    $('#psColor').addEventListener('change', (ev) => { pre.color = ev.target.value; });
    $('#psSup').addEventListener('click', () => { keep(); pre.sup = !pre.sup; form(); });
    $('#nMinus').addEventListener('click', () => { keep(); pre.n = clamp(pre.n - 1, 1, 12); form(); });
    $('#nPlus').addEventListener('click', () => { keep(); pre.n = clamp(pre.n + 1, 1, 12); form(); });
    const drop = $('#drop'), inp = $('#psFile');
    const take = async (fl) => {
      if (!fl) return;
      keep();
      const ext = fl.name.split('.').pop().toLowerCase();
      if (ext !== 'stl') { ctx.toast('Only STL files can be checked here. Add a link to the file above instead.'); return; }
      if (fl.size > 80e6) { ctx.toast('That file is over 80 MB. Try exporting it with fewer details from Onshape.'); return; }
      try { const r = parseSTL(await fl.arrayBuffer()); file = { name: fl.name, ...r }; pre.sup = r.overPct > 5; if (!pre.name) pre.name = fl.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '); form(); }
      catch (err) { ctx.toast("That STL couldn't be read. Try exporting it again from Onshape."); }
    };
    inp.addEventListener('change', () => take(inp.files[0]));
    ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (ev) => { ev.preventDefault(); drop.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (ev) => { ev.preventDefault(); drop.classList.remove('is-over'); }));
    drop.addEventListener('drop', (ev) => take(ev.dataTransfer && ev.dataTransfer.files[0]));
    $('#psGo').addEventListener('click', async (ev) => {
      keep();
      const name = (pre.name || '').trim(), link = (pre.link || '').trim(), why = (pre.why || '').trim();
      if (!name) { $('#psName').focus(); ctx.toast('Give the part a name first.'); return; }
      if (link && !safeUrl(link)) { $('#psLink').focus(); ctx.toast('Links start with https://'); return; }
      if (!link) { $('#psLink').focus(); ctx.toast('Add a link to the file, so a mentor can open it.'); return; }
      if (!why) { $('#psWhy').focus(); ctx.toast('Tell the mentors why you need it. It helps them decide what prints first.'); return; }
      const e2 = est(), btn = ev.currentTarget; btn.disabled = true;
      try {
        const rec = await api.create('print', { name, file: link, material: pre.mat, color: pre.color, qty: pre.n, notes: why, sys: pre.sys || '', quality: pre.q, strength: pre.s, supports: pre.sup, grams: e2.grams, time: e2.time, status: 'queued', who: me(), printer: '', pct: 0 });
        jobs.unshift(rec);
        file = null; Object.assign(pre, { n: 1, sup: false, name: '', link: '', why: '' });
        form(); queue();
        ctx.toast('Sent. It is in the queue, and you can follow it here.');
      } catch (err) { fail(ctx, err); btn.disabled = false; }
    });
  };
  const jobRow = (r) => {
    const j = r.data, [lbl, c, ic] = ST[j.status] || ST.queued;
    const pct = clamp(Math.round(+j.pct || 0), 0, 100);
    const left = j.status === 'printing' ? ring(pct, `${pct}%`, 44) : `<span class="oc2">${icon(ic, 'i sm')}</span>`;
    const pos = j.status === 'queued' ? jobs.filter((x) => x.data.status === 'queued').sort((a, b) => (a.created_at < b.created_at ? -1 : 1)).findIndex((x) => x.id === r.id) + 1 : 0;
    const mine = isMine(r);
    let acts = '';
    if (mentor && j.status === 'queued') acts = `<button class="btn primary pill sm" type="button" data-job="${esc(r.id)}">Start</button>`;
    else if (mentor && j.status === 'printing') acts = `<button class="btn primary pill sm" type="button" data-job="${esc(r.id)}">Update</button>`;
    else if (j.status === 'failed' && (mine || mentor)) acts = `<button class="btn ghost pill sm" type="button" data-retry="${esc(r.id)}">Try again</button>`;
    else acts = `<button class="btn ghost pill sm" type="button" data-job="${esc(r.id)}">Details</button>`;
    const sub = j.status === 'queued' ? `${pos ? `#${pos} in line` : 'In line'}${j.time ? ` · about ${esc(j.time)}` : ''}`
      : j.status === 'printing' ? `${pct}% done${j.printer ? ` on ${esc(j.printer)}` : ''}`
        : j.status === 'done' ? `Ready to pick up · ${esc(day(r.updated_at))}`
          : `${esc(j.reason || 'Failed')}`;
    return `<div class="job${mine ? ' lb-mine' : ''}">${left}<div style="min-width:0"><div class="what">${esc(j.name || 'Part')}${+j.qty > 1 ? ` ×${+j.qty}` : ''}</div><div class="meta">${av(j.who || r.author, 16)}${esc(j.who || r.author)} · ${dot(c, 7)}${lbl}</div><div class="meta">${sub} · ${esc(j.material || '')} ${esc(j.color || '')}</div></div><div class="acts">${acts}</div></div>`;
  };
  const queue = () => {
    const active = jobs.filter((j) => ['queued', 'printing'].includes(j.data.status));
    $('#qCount').textContent = `${active.length} active`;
    const order = { printing: 0, queued: 1, failed: 2, done: 3 };
    const list = jobs.filter((r) => show === 'all' || isMine(r)).sort((a, b) => (order[a.data.status] ?? 4) - (order[b.data.status] ?? 4) || (a.data.status === 'queued' ? (a.created_at < b.created_at ? -1 : 1) : (a.updated_at > b.updated_at ? -1 : 1)));
    $('#queue').innerHTML = !loaded ? '' : list.length ? list.slice(0, 30).map(jobRow).join('')
      : empty(show === 'mine' ? (jobs.length ? 'You have no requests yet. Fill in the form to send your first part.' : 'No print requests yet. Fill in the form to send the first one.') : 'No print requests yet. Fill in the form to send the first one.');
    const running = jobs.filter((r) => r.data.status === 'printing');
    $('#printers').innerHTML = running.length ? `<div class="printers">${running.map((r) => { const pct = clamp(Math.round(+r.data.pct || 0), 0, 100); return `<div class="printer"><span class="nm">${esc(r.data.printer || 'Printer')}</span><span class="spool"><i style="background:var(--stone)"></i>${esc(r.data.material || '')} · ${esc(r.data.color || '')}</span><span class="row">${ring(pct, `${pct}%`, 44)}<span class="cap">${esc(r.data.name || '')}${+r.data.qty > 1 ? ` ×${+r.data.qty}` : ''}</span></span></div>`; }).join('')}</div>`
      : empty(mentor ? 'Nothing printing right now. Tap <b>Start</b> on a queued part when it goes on a printer.' : 'Nothing printing right now.');
    const failed = jobs.filter((r) => r.data.status === 'failed');
    const by = new Map(); for (const r of failed) { const k = r.data.reason || 'Something else'; by.set(k, (by.get(k) || 0) + 1); }
    const top = [...by.entries()].sort((a, b) => b[1] - a[1]), mx = top.length ? top[0][1] : 1;
    $('#fails').innerHTML = top.length ? `<div class="fails">${top.map(([rsn, n]) => `<div class="fail"><span>${esc(rsn)}</span>${bar((n / mx) * 100, `${rsn}: ${n}`)}<span class="num">${n}</span></div>`).join('')}</div>` : empty('No failed prints yet. When one fails, the reason shows up here so the team can learn from it.');
  };
  const jobDrawer = (r) => {
    const j = r.data, mine = isMine(r), link = safeUrl(j.file);
    const el = drawer(`<div class="row wrap"><span class="st">${dot((ST[j.status] || ST.queued)[1], 8)}${(ST[j.status] || ST.queued)[0]}</span>${j.sys && SYS[j.sys] ? `<span class="row" style="gap:6px">${dot(SYS[j.sys].c, 8)}<span class="cap">${SYS[j.sys].name}</span></span>` : ''}</div>
      <h3>${esc(j.name || 'Part')}${+j.qty > 1 ? ` ×${+j.qty}` : ''}</h3>
      <div class="row wrap">${av(j.who || r.author, 28)}<span><b style="font-weight:500">${esc(j.who || r.author)}</b> <span class="cap">asked ${esc(ago(r.created_at))}</span></span></div>
      ${j.notes ? `<p>"${esc(j.notes)}"</p>` : ''}
      <dl class="facts lb-facts"><dt>Material</dt><dd>${esc(j.material || '')} · ${esc(j.color || '')}</dd><dt>Settings</dt><dd>${esc(j.quality || 'Standard')} quality · ${esc(j.strength || 'Standard')} strength · supports ${j.supports ? 'on' : 'off'}</dd>${j.time ? `<dt>Guess</dt><dd>About ${esc(j.time)} · ${+j.grams || 0} g</dd>` : ''}${j.printer ? `<dt>Printer</dt><dd>${esc(j.printer)}</dd>` : ''}${j.reason ? `<dt>Why it failed</dt><dd>${esc(j.reason)}</dd>` : ''}</dl>
      ${link ? `<a class="btn soft pill sm" href="${esc(link)}" target="_blank" rel="noopener noreferrer" style="align-self:flex-start">${icon('arrow', 'i sm')}Open the file</a>` : '<p class="cap">No file link.</p>'}
      ${mentor && ['queued', 'printing'].includes(j.status) ? `<h4>${j.status === 'queued' ? 'Start the print' : 'Update the print'}</h4>
        <label class="field"><span>Printer</span><input class="inp" id="jdPr" maxlength="40" list="jdPrs" placeholder="Printer 1" value="${esc(j.printer || '')}"><datalist id="jdPrs">${[...new Set(jobs.map((x) => x.data.printer).filter(Boolean))].map((p) => `<option value="${esc(p)}">`).join('')}</datalist></label>
        <div class="ctrl"><label for="jdPct">How far along <output id="jdPctO">${clamp(+j.pct || 0, 0, 100)}%</output></label><input type="range" id="jdPct" min="0" max="100" step="5" value="${clamp(+j.pct || 0, 0, 100)}" style="--fill:${clamp(+j.pct || 0, 0, 100)}%"></div>
        <div class="row wrap"><button class="btn primary pill" type="button" id="jdGo">${icon('printer', 'i sm')}${j.status === 'queued' ? 'Start printing' : 'Save progress'}</button>${j.status === 'printing' ? `<button class="btn soft pill" type="button" id="jdDone">${icon('check', 'i sm')}Done</button>` : ''}</div>
        ${j.status === 'printing' ? `<h4>Did it fail?</h4><div class="row wrap"><select class="inp" id="jdWhy" style="width:auto">${REASONS.map((x) => `<option>${x}</option>`).join('')}</select><button class="btn ghost pill" type="button" id="jdFail">${icon('x', 'i sm')}Mark failed</button></div>` : ''}` : ''}
      ${(mine && j.status === 'queued') || mentor ? `<div class="row" style="justify-content:flex-end"><button class="btn ghost pill sm" type="button" id="jdDel">${icon('x', 'i sm')}${j.status === 'queued' && mine ? 'Cancel request' : 'Remove'}</button></div>` : ''}`, { label: j.name || 'Print' });
    const upd = async (patch, msg) => {
      try { const u = await api.update('print', r.id, patch); r.data = u.data; r.updated_at = u.updated_at; queue(); closeDrawer(); ctx.toast(msg); }
      catch (err) { fail(ctx, err); }
    };
    const pct = $('#jdPct', el);
    if (pct) pct.addEventListener('input', () => { $('#jdPctO', el).textContent = `${pct.value}%`; pct.style.setProperty('--fill', `${pct.value}%`); });
    const go = $('#jdGo', el);
    if (go) go.addEventListener('click', () => { const pr = $('#jdPr', el).value.trim(); if (!pr) { $('#jdPr', el).focus(); ctx.toast('Which printer is it on?'); return; } upd({ status: 'printing', printer: pr, pct: +pct.value }, j.status === 'queued' ? `Printing on ${pr}.` : 'Progress saved.'); });
    const dn = $('#jdDone', el); if (dn) dn.addEventListener('click', () => upd({ status: 'done', pct: 100, printer: $('#jdPr', el).value.trim() || j.printer }, `Done. ${j.who || r.author} can pick it up.`));
    const fl = $('#jdFail', el); if (fl) fl.addEventListener('click', () => upd({ status: 'failed', reason: $('#jdWhy', el).value }, 'Marked failed. The requester can try again.'));
    const del = $('#jdDel', el);
    if (del) del.addEventListener('click', async () => {
      if (!confirm('Remove this print request?')) return;
      try { await api.remove('print', r.id); jobs = jobs.filter((x) => x.id !== r.id); queue(); closeDrawer(); ctx.toast('Removed.'); } catch (err) { fail(ctx, err); }
    });
  };
  form(); queue();
  api.list('print').then((rs) => { if (!alive) return; jobs = rs; loaded = true; if (!mentor && !rs.some(isMine)) { show = 'all'; $$('#qShow .chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.show === show))); } queue(); }).catch((err) => { if (alive) fail(ctx, err); });
  $('#qShow').addEventListener('click', (e) => { const b = e.target.closest('[data-show]'); if (!b) return; show = b.dataset.show; $$('#qShow .chip').forEach((c) => c.setAttribute('aria-pressed', String(c === b))); queue(); });
  $('#queue').addEventListener('click', async (e) => {
    const jb = e.target.closest('[data-job]'), rt = e.target.closest('[data-retry]');
    if (jb) { const r = jobs.find((x) => x.id === jb.dataset.job); if (r) jobDrawer(r); return; }
    if (rt) {
      const r = jobs.find((x) => x.id === rt.dataset.retry); if (!r) return;
      rt.disabled = true;
      try { const u = await api.update('print', r.id, { status: 'queued', pct: 0, printer: '', reason: '', notes: `${r.data.notes || ''}${r.data.reason ? ` (Try again after: ${r.data.reason})` : ''}`.slice(0, 400) }); r.data = u.data; r.updated_at = u.updated_at; queue(); ctx.toast('Back in the queue.'); }
      catch (err) { fail(ctx, err); rt.disabled = false; }
    }
  });
  view.addEventListener('click', (e) => { const g = e.target.closest('[data-go]'); if (g) { const [z, s] = g.dataset.go.split('/'); ctx.go(z, s); } });
  return () => { alive = false; closeDrawer(); };
}

// ================================================================= Parts and inventory
// `inventory` records are team stock: { name, sku, bin, count, low, sys, out: [{ who, n, at }], log: [{ who, act, n, at }] }.
// Part requests are `inventory` records too: { type: 'request', part, n, when, why, st }.
// Mentors add and edit stock. Anyone can check parts out and return them.
const STC = { ok: 'var(--ok)', warn: 'var(--warn)', bad: 'var(--negative)' };
const REQ_ST = ['Sent', 'Ordered', 'In the bin', 'Not this time'];
function inventory(view, ctx) {
  const { SYS, SYS_ORDER } = ctx;
  const mentor = isMentor();
  const parts = ctx.parts();
  if (!parts) { view.innerHTML = `<div class="card"><p class="lead">${icon('clock', 'i sm')} Loading the StarterBot parts list…</p></div>`; return ctx.whenParts(() => ctx.rerender()); }
  let recs = [], alive = true, loaded = false;
  const req = { n: 1 };
  const onRobot = (sku, name) => {
    if (!parts) return null;
    const all = Object.values(parts.parts);
    const n = sku ? all.filter((p) => p[0] === sku).length : 0;
    return n || all.filter((p) => p[2] === name).length || null;
  };
  const names = () => { const p = ctx.parts(); return p ? [...new Set(Object.values(p.parts).map((x) => x[2]))].sort() : []; };
  const skuOf = (name) => { const p = ctx.parts(); if (!p) return ''; const m = new Map(); for (const x of Object.values(p.parts)) if (x[2] === name) m.set(x[0], (m.get(x[0]) || 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || ''; };
  const sysOf = (name) => { const p = ctx.parts(); if (!p) return ''; const x = Object.values(p.parts).find((q) => q[2] === name); return x ? x[1] : ''; };
  const items = () => recs.filter((r) => r.data.type !== 'request' && r.data.name).sort((a, b) => String(a.data.bin || 'zz').localeCompare(String(b.data.bin || 'zz')) || String(a.data.name).localeCompare(String(b.data.name)));
  const reqs = () => recs.filter((r) => r.data.type === 'request');
  const status = (d) => { const n = +d.count || 0, low = Number.isFinite(+d.low) ? +d.low : 1; return n <= 0 ? ['Out', 'bad'] : n <= low ? ['Low', 'warn'] : ['OK', 'ok']; };
  const outN = (d) => (d.out || []).reduce((a, o) => a + (+o.n || 0), 0);
  view.innerHTML = `<div class="zv">
    ${strip("What's in the bins, who has parts checked out, what's running low, and a form to ask the mentors for parts. On-robot counts come from the real CAD.", [tag('Team stock', 'volt')], mentor ? `<button class="btn primary pill" type="button" id="invAdd">${icon('plus', 'i sm')}Add stock</button>` : '')}
    <article class="card" id="invForm" hidden></article>
    <article class="card" id="lowCard" hidden><div class="callout" style="align-items:center">${icon('alert')}<div id="lowTxt"></div></div></article>
    <article class="card c7">
      <div class="card-head"><h3 class="card-title">Bins</h3><span class="tag" id="binN"></span></div>
      <div class="tbl" id="bins"></div>
    </article>
    <div class="c5 stack-v" style="gap:16px">
      <article class="card"><div class="card-head"><h3 class="card-title">Checked out</h3></div><div class="items" id="outs"></div></article>
      <article class="card" id="reqForm">
        <div class="card-head"><h3 class="card-title">Request a part</h3></div>
        <label class="field"><span>Part</span><select class="inp" id="rqP">${names().map((n) => `<option>${esc(n)}</option>`).join('')}<option>Something else</option></select></label>
        <div class="form-grid"><div class="field"><span>How many</span><span class="stepper"><button type="button" id="rqMinus" aria-label="One fewer">${icon('min', 'i sm')}</button><output id="rqN">1</output><button type="button" id="rqPlus" aria-label="One more">${icon('plus', 'i sm')}</button></span></div>
        <div class="field"><span>Needed by</span><select class="inp" id="rqW"><option>This week</option><option>Before the next meet</option><option>Whenever</option></select></div></div>
        <label class="field"><span>What's it for?</span><textarea class="inp" id="rqWhy" maxlength="300" placeholder="Spare wheels for the meet"></textarea></label>
        <div class="card-foot"><span class="cap">The mentors see it in the list below.</span><button class="btn primary pill" type="button" id="rqGo">Send request</button></div>
      </article>
      <article class="card"><div class="card-head"><h3 class="card-title">Requests</h3></div><div class="items" id="reqs"></div></article>
    </div>
  </div>`;
  const COLS = 'lb-inv';
  const draw = () => {
    const its = items();
    $('#binN').textContent = `${its.length} item${its.length === 1 ? '' : 's'}`;
    const low = its.filter((r) => status(r.data)[1] !== 'ok');
    $('#lowCard').hidden = !low.length;
    $('#lowTxt').innerHTML = `<b>Running low:</b> ${low.map((r) => `${esc(r.data.name)} (${+r.data.count > 0 ? `${+r.data.count} left` : 'none left'})`).join(', ')}.`;
    $('#bins').innerHTML = !loaded ? '' : its.length ? `<div class="tr th ${COLS}"><span>Bin</span><span>Part</span><span>Part number</span><span style="text-align:right">In bin</span><span style="text-align:right">On robot</span><span></span></div>`
      + its.map((r) => { const d = r.data, [s, c] = status(d), rb = onRobot(d.sku, d.name), sy = SYS[d.sys]; return `<div class="tr ${COLS}"><span class="mono lb-bin">${esc(d.bin || '')}</span><span class="row" style="gap:6px">${sy ? dot(sy.c, 8) : ''}<span class="nm">${esc(d.name)}</span><span class="st lb-st">${dot(STC[c], 8)}${s}</span></span><span class="sku">${esc(d.sku || '')}</span><span class="q">${+d.count || 0}</span><span class="q lb-rb" style="color:var(--muted)">${rb ?? '—'}</span><span class="go"><button class="btn ghost pill sm" type="button" data-item="${esc(r.id)}">${outN(d) ? `${outN(d)} out` : 'Open'}</button></span></div>`; }).join('')
      : empty(mentor ? 'No stock counted yet. Tap <b>Add stock</b> and count what is in each bin. Spares then show up in Robot, Specs and parts too.' : 'No stock counted yet. A mentor adds what is in each bin, then you can check parts out here.');
    const outs = its.flatMap((r) => (r.data.out || []).map((o, k) => ({ r, o, k })));
    $('#outs').innerHTML = outs.length ? outs.map(({ r, o, k }) => `<div class="it">${av(o.who, 28)}<div class="grow"><div class="t">${esc(r.data.name)} ×${+o.n || 1}</div><div class="meta">${esc(o.who)} · ${esc(ago(o.at))}</div></div>${o.who === me() || mentor ? `<button class="btn ghost pill sm" type="button" data-ret="${esc(r.id)}" data-k="${k}">Return</button>` : ''}</div>`).join('') : empty('Nothing checked out right now.');
    const rq = reqs();
    $('#reqs').innerHTML = rq.length ? rq.map((r) => { const d = r.data; return `<div class="it">${av(r.author, 28)}<div class="grow"><div class="t">${esc(d.part)} ×${+d.n || 1}</div><div class="meta">${esc(r.author)} · ${esc(d.when || '')}${d.why ? ` · "${esc(d.why)}"` : ''}</div></div>${mentor ? `<select class="inp lb-rqst" data-rq="${esc(r.id)}" aria-label="Request status">${REQ_ST.map((s) => `<option${s === (d.st || 'Sent') ? ' selected' : ''}>${s}</option>`).join('')}</select>` : `<span class="st">${esc(d.st || 'Sent')}</span>`}</div>`; }).join('') : empty('No part requests yet.');
  };
  draw();
  api.list('inventory').then((rs) => { if (!alive) return; recs = rs; loaded = true; draw(); }).catch((err) => { if (alive) fail(ctx, err); });

  const save = async (r, patch, msg) => {
    try { const u = await api.update('inventory', r.id, patch); r.data = u.data; draw(); if (msg) ctx.toast(msg); return true; }
    catch (err) { fail(ctx, err); return false; }
  };
  const log = (d, act, n) => [{ who: me(), act, n, at: new Date().toISOString() }, ...(d.log || [])].slice(0, 20);

  // Add or edit stock (mentors)
  const form = $('#invForm');
  const openForm = (r) => {
    const d = r ? r.data : {};
    form.hidden = false;
    form.innerHTML = `<div class="card-head"><h3 class="card-title">${r ? 'Edit stock' : 'Add stock'}</h3><button class="icon-btn sm" type="button" id="ifX" aria-label="Close">${icon('x')}</button></div>
      <div class="form-grid">
        <label class="field full"><span>Part <small>(pick from the robot or type your own)</small></span><input class="inp" id="ifName" maxlength="60" list="ifNames" placeholder="48mm Gecko Wheel" value="${esc(d.name || '')}"><datalist id="ifNames">${names().map((n) => `<option value="${esc(n)}">`).join('')}</datalist></label>
        <label class="field"><span>Part number</span><input class="inp" id="ifSku" maxlength="30" placeholder="3613-4008-0048" value="${esc(d.sku || '')}"></label>
        <label class="field"><span>Bin</span><input class="inp" id="ifBin" maxlength="10" placeholder="C2" value="${esc(d.bin || '')}"></label>
        <label class="field"><span>How many in the bin</span><input class="inp" id="ifCount" type="number" min="0" max="9999" value="${d.count ?? 0}"></label>
        <label class="field"><span>Low when at or under</span><input class="inp" id="ifLow" type="number" min="0" max="999" value="${d.low ?? 1}"></label>
        <label class="field full"><span>Subsystem</span><select class="inp" id="ifSys"><option value="">None</option>${SYS_ORDER.map((k) => `<option value="${k}"${k === d.sys ? ' selected' : ''}>${SYS[k].name}</option>`).join('')}</select></label>
      </div>
      <div class="card-foot"><span class="cap">Everyone sees the stock and can check parts out.</span>${r ? `<button class="btn ghost pill" type="button" id="ifDel">Remove</button>` : ''}<button class="btn primary pill" type="button" id="ifGo">${r ? 'Save' : 'Add it'}</button></div>`;
    $('#ifX').addEventListener('click', () => { form.hidden = true; });
    $('#ifName').addEventListener('change', (e) => { const n = e.target.value.trim(); if (!$('#ifSku').value) $('#ifSku').value = skuOf(n); if (!$('#ifSys').value) $('#ifSys').value = sysOf(n); });
    $('#ifName').focus();
    $('#ifGo').addEventListener('click', async (e) => {
      const name = $('#ifName').value.trim();
      if (!name) { $('#ifName').focus(); ctx.toast('Which part is it?'); return; }
      const data = { name, sku: $('#ifSku').value.trim(), bin: $('#ifBin').value.trim().toUpperCase(), count: clamp(Math.round(+$('#ifCount').value || 0), 0, 9999), low: clamp(Math.round(+$('#ifLow').value || 0), 0, 999), sys: $('#ifSys').value };
      const btn = e.currentTarget; btn.disabled = true;
      try {
        if (r) { await save(r, { ...data, log: log(r.data, 'count', data.count) }, 'Saved.'); }
        else { recs.unshift(await api.create('inventory', { ...data, out: [], log: [{ who: me(), act: 'count', n: data.count, at: new Date().toISOString() }] })); draw(); ctx.toast(`Added ${name}.`); }
        form.hidden = true;
      } catch (err) { fail(ctx, err); }
      btn.disabled = false;
    });
    const del = $('#ifDel');
    if (del) del.addEventListener('click', async () => {
      if (!confirm(`Remove ${d.name} from the stock list?`)) return;
      try { await api.remove('inventory', r.id); recs = recs.filter((x) => x.id !== r.id); form.hidden = true; draw(); ctx.toast('Removed.'); } catch (err) { fail(ctx, err); }
    });
  };
  const add = $('#invAdd'); if (add) add.addEventListener('click', () => { if (!form.hidden) { form.hidden = true; return; } openForm(null); });

  // One item: check out, return, history
  const itemDrawer = (r) => {
    let n = 1;
    const paint = () => {
      const d = r.data, [s, c] = status(d), rb = onRobot(d.sku, d.name);
      return `<div class="row wrap"><span class="st">${dot(STC[c], 8)}${s}</span>${d.bin ? `<span class="cap">Bin <span class="mono">${esc(d.bin)}</span></span>` : ''}${d.sku ? `<span class="cap mono">${esc(d.sku)}</span>` : ''}</div>
        <h3>${esc(d.name)}</h3>
        <div class="kpis"><div class="kpi"><div class="lab">In the bin</div><div class="val">${+d.count || 0}</div></div><div class="kpi"><div class="lab">Checked out</div><div class="val">${outN(d)}</div></div><div class="kpi"><div class="lab">On the robot</div><div class="val">${rb ?? '—'}</div></div></div>
        <h4>Check out</h4>
        <div class="row wrap"><span class="stepper"><button type="button" id="coMinus" aria-label="One fewer">${icon('min', 'i sm')}</button><output id="coN">${n}</output><button type="button" id="coPlus" aria-label="One more">${icon('plus', 'i sm')}</button></span><button class="btn primary pill" type="button" id="coGo"${+d.count > 0 ? '' : ' disabled'}>${+d.count > 0 ? 'Check out' : 'None left'}</button></div>
        <h4>Who has some</h4>
        <div class="items">${(d.out || []).length ? d.out.map((o, k) => `<div class="it">${av(o.who, 24)}<div class="grow"><div class="t">${esc(o.who)} ×${+o.n || 1}</div><div class="meta">${esc(ago(o.at))}</div></div>${o.who === me() || mentor ? `<button class="btn ghost pill sm" type="button" data-dret="${k}">Return</button>` : ''}</div>`).join('') : empty('Nobody has any checked out.')}</div>
        <h4>History</h4>
        <div class="items">${(d.log || []).length ? d.log.slice(0, 8).map((l) => `<div class="it"><div class="grow"><div class="t">${esc(l.who)} ${l.act === 'out' ? `took ${+l.n}` : l.act === 'in' ? `returned ${+l.n}` : `counted ${+l.n}`}</div><div class="meta">${esc(ago(l.at))}</div></div></div>`).join('') : empty('No history yet.')}</div>
        ${mentor ? `<div class="row" style="justify-content:flex-end"><button class="btn ghost pill sm" type="button" id="coEdit">${icon('note', 'i sm')}Edit stock</button></div>` : ''}`;
    };
    const el = drawer('<div id="coBody" class="stack-v" style="gap:14px"></div>', { label: r.data.name });
    const body = $('#coBody', el);
    const wire = () => {
      body.innerHTML = paint();
      $('#coMinus', body).addEventListener('click', () => { n = clamp(n - 1, 1, Math.max(1, +r.data.count || 1)); $('#coN', body).textContent = n; });
      $('#coPlus', body).addEventListener('click', () => { n = clamp(n + 1, 1, Math.max(1, +r.data.count || 1)); $('#coN', body).textContent = n; });
      $('#coGo', body).addEventListener('click', async (e) => {
        const d = r.data; if (!(+d.count > 0)) return;
        const take = Math.min(n, +d.count); e.currentTarget.disabled = true;
        if (await save(r, { count: +d.count - take, out: [...(d.out || []), { who: me(), n: take, at: new Date().toISOString() }], log: log(d, 'out', take) }, `Checked out ${take}. Return it when you're done.`)) { n = 1; wire(); }
        else e.currentTarget.disabled = false;
      });
      $$('[data-dret]', body).forEach((b) => b.addEventListener('click', async () => { if (await doReturn(r, +b.dataset.dret)) wire(); }));
      const ed = $('#coEdit', body); if (ed) ed.addEventListener('click', () => { closeDrawer(); openForm(r); form.scrollIntoView({ behavior: ctx.reduced ? 'auto' : 'smooth', block: 'start' }); });
    };
    wire();
  };
  const doReturn = async (r, k) => {
    const d = r.data, o = (d.out || [])[k]; if (!o) return false;
    const out = d.out.filter((_, i) => i !== k);
    return save(r, { count: (+d.count || 0) + (+o.n || 1), out, log: log(d, 'in', +o.n || 1) }, `Returned ${+o.n || 1}. Thanks!`);
  };
  $('#bins').addEventListener('click', (e) => { const b = e.target.closest('[data-item]'); if (!b) return; const r = recs.find((x) => x.id === b.dataset.item); if (r) itemDrawer(r); });
  $('#outs').addEventListener('click', async (e) => { const b = e.target.closest('[data-ret]'); if (!b) return; const r = recs.find((x) => x.id === b.dataset.ret); if (!r) return; b.disabled = true; if (!(await doReturn(r, +b.dataset.k))) b.disabled = false; });
  $('#reqs').addEventListener('change', async (e) => { const s = e.target.closest('[data-rq]'); if (!s) return; const r = recs.find((x) => x.id === s.dataset.rq); if (r) await save(r, { st: s.value }, `Marked ${s.value}.`); });
  $('#rqMinus').addEventListener('click', () => { req.n = clamp(req.n - 1, 1, 99); $('#rqN').textContent = req.n; });
  $('#rqPlus').addEventListener('click', () => { req.n = clamp(req.n + 1, 1, 99); $('#rqN').textContent = req.n; });
  $('#rqGo').addEventListener('click', async (e) => {
    const why = $('#rqWhy').value.trim();
    if (!why) { $('#rqWhy').focus(); ctx.toast('Say what the part is for, so mentors can order the right thing.'); return; }
    const btn = e.currentTarget; btn.disabled = true;
    try {
      recs.unshift(await api.create('inventory', { type: 'request', part: $('#rqP').value, n: req.n, when: $('#rqW').value, why, st: 'Sent' }));
      $('#rqWhy').value = ''; req.n = 1; $('#rqN').textContent = '1';
      draw();
      ctx.toast('Sent to the mentors.');
    } catch (err) { fail(ctx, err); }
    btn.disabled = false;
  });
  return () => { alive = false; closeDrawer(); };
}

export const BUILD = { Ideas: ideas, 'Mechanism Lab': lab, 'Print Shop': printShop, 'Parts and inventory': inventory };
