// Artifact edition: sign-in gate, first-time setup, joining, and mentor tools.
// People are claude.ai viewers of this page; each picks a team display name. The page owner is the head mentor.
import { session, bindStore, checkinCode, today } from './api.js';

const COLORS = ['#F07A2A', '#0E8F9E', '#B394FF', '#E8F542', '#C42D6B', '#9A968A', '#8FD3DC', '#2340A8', '#4FAE6B', '#F2B8C6'];
const RULES = [
  'I use my display name, never my real full name, and I never post where I live, my school schedule, my phone number or photos of faces without a mentor saying OK.',
  'I am kind. I give feedback on ideas, not on people. Gracious Professionalism always.',
  'There are no private messages here. Everything I post can be seen by the team and the mentors.',
  "If something online makes me uncomfortable, I tell a mentor or a parent right away. I won't get in trouble for telling.",
  'I wear safety glasses in the shop and I only use tools I have been checked out on.',
  'I use AI agents with a mentor, on the team laptop, and I read and understand code before it goes on the robot.',
];
const WORDS = ['VOLT', 'GEAR', 'HEXA', 'BOLT', 'SPARK', 'TORQUE', 'SERVO', 'POLLEN', 'NECTAR', 'HIVE', 'AMP', 'ROTOR', 'PIXEL', 'MOTOR'];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rnd = (n) => crypto.getRandomValues(new Uint8Array(n));
const makeTeamCode = () => `${WORDS[rnd(1)[0] % WORDS.length]}-${100 + (((rnd(2)[0] << 8) | rnd(2)[1]) % 900)}`;
const makeSecret = () => [...rnd(24)].map((b) => b.toString(16).padStart(2, '0')).join('');
const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9 _-]{1,18}[A-Za-z0-9]$/;
const nameKey = (s) => s.trim().toLowerCase().replace(/\s+/g, ' ');

const gate = document.getElementById('gate');
const card = (html, wide = false) => { gate.hidden = false; gate.innerHTML = `<main class="auth"><div class="auth-card${wide ? ' wide' : ''}"><div class="brand"><span class="brand-mark" aria-hidden="true">⚡</span><div><b>Kilowattchaos Hub</b><small>Proof of concept · FTC BIOBUZZ 2026–27</small></div></div>${html}</div></main>`; return gate; };
const errBox = (m) => (m ? `<p class="err" role="alert">${esc(m)}</p>` : '');
const swatches = (cur) => `<fieldset style="border:0;padding:0;margin:0"><legend style="font-weight:500;font-size:14px;margin-bottom:8px">Robot avatar color</legend><div class="swatches">${COLORS.map((c, i) => `<label aria-label="Color ${i + 1}"><input type="radio" name="color" value="${c}"${c === (cur || COLORS[0]) ? ' checked' : ''}><span style="background:${c}"></span></label>`).join('')}</div></fieldset>`;

let db, user, uid, isOwner = false, team = null, members = {}, approvals = {};
const timer = setTimeout(() => { if (!db) card(`<h1>This page needs claude.ai</h1><p class="lead">Open it from its claude.ai link while you are signed in. Saving and sign-in come from there.</p>`); }, 10000);

async function boot() {
  card('<h1>Loading…</h1><p class="lead">Getting the team ready.</p>');
  [db, user] = await Promise.all([window.claude?.use('db'), window.claude?.use('user')]);
  clearTimeout(timer);
  if (!db || !user) { card(`<h1>Sign in to claude.ai</h1><p class="lead">Open this page from its claude.ai link while signed in. That's how the hub knows who you are and saves the team's work.</p>`); return; }
  uid = await user.id();
  isOwner = !!(await user.isOwner());
  db.doc('team/settings').onSnapshot((s) => { team = s.exists ? s.data() : null; route(); }, () => card(`<h1>Can't reach the team data</h1><p class="lead">Reload the page in a minute.</p>`));
  db.collection('members').onSnapshot((s) => { members = Object.fromEntries(s.docs.map((d) => [d.id, d.data()])); route(); });
  db.collection('approvals').onSnapshot((s) => { approvals = Object.fromEntries(s.docs.map((d) => [d.id, d.data()])); route(); });
}

let started = false, lastScreen = '';
function route() {
  if (started) { refreshSession(); if (mentorOpen) renderMentor(); return; }
  if (team === null) return isOwner ? screen('setup', setup) : screen('wait', () => card(`<h1>Not set up yet</h1><p class="lead">The head mentor hasn't opened the hub yet. Try again a bit later.</p>`));
  const m = members[uid], a = approvals[uid];
  if (!m) return screen('join', join);
  if (!a || a.status === 'pending') return screen('pending', () => card(`<h1>Almost there, ${esc(m.name)}</h1><p class="lead">A mentor needs to turn your account on. This page updates by itself when they do.</p><p class="note">Students: a mentor checks with your parent or guardian first.</p>`));
  if (a.status === 'disabled') return screen('off', () => card(`<h1>Your account is off</h1><p class="lead">A mentor turned this account off. Talk to them at the next meeting.</p>`));
  start();
}
function screen(name, fn) { if (lastScreen === name) return; lastScreen = name; fn(); }

function setup(e = '') {
  card(`<h1>Set up the hub</h1><p class="lead">You own this page, so you're the head mentor. This makes the team and its Team Code.</p>${errBox(e)}
  <form class="stack" id="f"><label>Team name<input type="text" name="team" value="Kilowattchaos"></label>
  <label>Your display name<small>What students and coaches see, like Coach Eric.</small><input type="text" name="name" required maxlength="20"></label>
  ${swatches('#4F5049')}<button class="btn" type="submit">Create the team</button></form>`);
  gate.querySelector('#f').addEventListener('submit', async (ev) => {
    ev.preventDefault(); const f = new FormData(ev.target); const name = String(f.get('name')).trim();
    if (!NAME_RE.test(name)) return setup('Pick a display name of 3 to 20 letters or numbers.');
    try {
      await db.doc('team/settings').set({ name: String(f.get('team') || 'Kilowattchaos').slice(0, 40), code: makeTeamCode(), secret: makeSecret(), chat: false, adult: '', created: new Date().toISOString() });
      await db.doc(`members/${uid}`).set({ name, key: nameKey(name), color: String(f.get('color') || COLORS[0]), agreed: new Date().toISOString() });
      await db.doc(`approvals/${uid}`).set({ status: 'active', role: 'mentor', title: 'Head mentor', subs: '', by: uid, at: new Date().toISOString() });
    } catch (err) { setup(err.message || 'Could not save.'); }
  });
}

function join(e = '') {
  const owner = isOwner;
  card(`<h1>Join the team</h1><p class="lead">${owner ? 'Pick your display name.' : 'Ask Eric for the Team Code. A mentor turns your account on.'}</p>${errBox(e)}
  <form class="stack" id="f">${owner ? '' : '<label>Team Code<input type="text" name="code" required autocapitalize="characters" placeholder="VOLT-123"></label>'}
  <label>Display name<small>A nickname, not a real name. Coaches can use Coach and a first name.</small><input type="text" name="name" required maxlength="20"></label>
  ${swatches()}
  <div class="panel"><b>The Team Code</b><ol style="margin:8px 0 0;padding-left:20px;display:flex;flex-direction:column;gap:6px;font-size:14px">${RULES.map((r) => `<li>${esc(r)}</li>`).join('')}</ol></div>
  <label class="chk"><input type="checkbox" name="agree" required> I read the Team Code and I agree to it.</label>
  <button class="btn" type="submit">Ask to join</button></form>`);
  gate.querySelector('#f').addEventListener('submit', async (ev) => {
    ev.preventDefault(); const f = new FormData(ev.target); const name = String(f.get('name')).trim();
    if (!owner && String(f.get('code')).trim().toUpperCase() !== String(team.code).toUpperCase()) return join("That Team Code isn't right.");
    if (!NAME_RE.test(name)) return join('Pick a display name of 3 to 20 letters or numbers.');
    if (Object.entries(members).some(([id, m]) => id !== uid && m.key === nameKey(name))) return join('Someone already has that name. Try another.');
    try {
      await db.doc(`members/${uid}`).set({ name, key: nameKey(name), color: String(f.get('color') || COLORS[0]), agreed: new Date().toISOString() });
      if (owner) await db.doc(`approvals/${uid}`).set({ status: 'active', role: 'mentor', title: 'Head mentor', subs: '', by: uid, at: new Date().toISOString() });
    } catch (err) { join(err.code === 'not_granted' ? 'Joining needs edit access to this page. Ask Eric to share it with you as an editor.' : err.message); }
  });
}

function refreshSession() {
  const here = new Set();
  const roster = Object.entries(members).filter(([id]) => approvals[id]?.status === 'active').map(([id, m]) => {
    const a = approvals[id];
    return { id, name: m.name, color: m.color, role: a.role, title: a.title || (a.role === 'mentor' ? 'Mentor' : ''), subs: a.subs ? a.subs.split(',') : [], here: here.has(id) };
  }).sort((x, y) => (x.role === y.role ? x.name.localeCompare(y.name) : x.role === 'student' ? 1 : -1));
  const meRow = roster.find((r) => r.id === uid);
  session.user = meRow ? { id: uid, name: meRow.name, role: meRow.role, color: meRow.color, title: meRow.title, subs: meRow.subs } : session.user;
  session.roster = roster;
  session.team = { name: team?.name || 'Kilowattchaos', chatEnabled: !!team?.chat };
  bindStore({ db, uid, team });
}

async function start() {
  started = true;
  refreshSession();
  try {
    const snap = await db.collection('checkins').where('day', '==', today()).limit(200).get();
    const ids = new Set(snap.docs.map((d) => d.data().user_id));
    session.roster.forEach((r) => { r.here = ids.has(r.id); });
  } catch (e) { /* check-ins are optional */ }
  gate.hidden = true; gate.innerHTML = '';
  window.KWC_ARTIFACT = { openMentor, uid };
  await import('./app.js');
  addFeedbackButton();
}

// ---------------------------------------------------------------- the "Mentor tools" and "Sign out" menu items
document.addEventListener('click', (e) => {
  if (e.target.closest('#meMentor, a[href="/mentor"]')) { e.stopImmediatePropagation(); e.preventDefault(); document.querySelector('.pop')?.remove(); openMentor(); }
  else if (e.target.closest('#meOut')) { e.stopImmediatePropagation(); e.preventDefault(); toast('You are signed in through claude.ai, so there is nothing to sign out of here.'); }
}, true);
function toast(t) { const el = document.getElementById('toast'); if (!el) return; el.textContent = t; el.classList.add('is-on'); setTimeout(() => el.classList.remove('is-on'), 3200); }

let mentorOpen = false, pwMsg = '';
function openMentor() { if (session.user?.role !== 'mentor') return; mentorOpen = true; renderMentor(); }
async function renderMentor() {
  const code = await checkinCode(team.secret);
  const rows = Object.entries(members).map(([id, m]) => ({ id, ...m, a: approvals[id] || { status: 'pending', role: 'student' } }));
  const pending = rows.filter((r) => r.a.status === 'pending'), others = rows.filter((r) => r.a.status !== 'pending');
  gate.hidden = false; gate.classList.add('sheet-mode');
  gate.innerHTML = `<main class="auth" style="place-items:start center"><div class="auth-card wide">
  <div class="row" style="justify-content:space-between"><div class="brand"><span class="brand-mark" aria-hidden="true">⚡</span><div><b>Mentor tools</b><small>${esc(team.name)}</small></div></div><button class="btn ghost sm" id="mClose" type="button">Back to the hub</button></div>
  ${pwMsg ? `<p class="ok">${esc(pwMsg)}</p>` : ''}
  <div class="grid2"><section class="panel"><h2 style="margin-top:0">Team Code</h2><p class="lead">People need it to join. Make a new one if it gets out.</p><span class="code-big">${esc(team.code)}</span><div style="margin-top:12px"><button class="btn ghost sm" id="mRotate" type="button">Make a new Team Code</button></div></section>
  <section class="panel"><h2 style="margin-top:0">Today's check-in</h2><p class="lead">Shown on Shop TV. It changes every day.</p><span class="code-big">${code}</span></section></div>
  <h2>Waiting to join (${pending.length})</h2>${pending.length ? `<div class="scroll-x"><table><thead><tr><th>Name</th><th>Join as</th><th>Permission</th><th></th></tr></thead><tbody>${pending.map((p) => `<tr data-id="${p.id}"><td><span class="dot" style="background:${esc(p.color)}"></span>${esc(p.name)}</td>
    <td><select class="mRole" style="height:36px"><option value="student">Student</option><option value="mentor">Coach or mentor</option></select></td>
    <td><label class="chk" style="font-size:13px"><input type="checkbox" class="mPaper"> Parent permission on file (students)</label></td>
    <td class="row"><button class="btn sm mApprove" type="button">Turn on</button><button class="btn danger sm mDecline" type="button">Decline</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="lead">Nobody is waiting.</p>'}
  <h2>Team</h2><div class="scroll-x"><table><thead><tr><th>Name</th><th>Role on the robot</th><th>Status</th><th></th></tr></thead><tbody>${others.map((p) => `<tr data-id="${p.id}"><td><span class="dot" style="background:${esc(p.color)}"></span>${esc(p.name)}${p.a.role === 'mentor' ? ' <span class="pill">Mentor</span>' : ''}</td>
    <td><div class="row"><input type="text" class="mTitle" value="${esc(p.a.title || '')}" placeholder="Intake lead · CAD" style="height:36px;width:170px"><select class="mSubs" style="height:36px"><option value="">Subsystem…</option>${['launcher', 'intake', 'ballpath', 'drivetrain', 'power', 'structure'].map((s) => `<option${p.a.subs === s ? ' selected' : ''}>${s}</option>`).join('')}</select><button class="btn ghost sm mSave" type="button">Save</button></div></td>
    <td><span class="pill ${p.a.status === 'active' ? 'good' : 'off'}">${p.a.status === 'active' ? 'On' : 'Off'}</span></td>
    <td>${p.id === uid ? '<span class="lead">You</span>' : `<button class="btn ghost sm mToggle" type="button">${p.a.status === 'active' ? 'Turn off' : 'Turn on'}</button>`}</td></tr>`).join('')}</tbody></table></div>
  <section class="panel" style="margin-top:20px"><h2 style="margin-top:0">Team chat</h2><p class="lead">Chat stays off until a second youth-protection-trained adult is named. Channels only, never private messages.</p>
  ${team.chat ? `<p>On. Second adult: <b>${esc(team.adult)}</b></p><button class="btn danger sm" id="mChatOff" type="button">Turn chat off</button>` : `<div class="row"><input type="text" id="mAdult" placeholder="Name of the second adult" style="height:40px"><button class="btn sm" id="mChatOn" type="button">Turn chat on</button></div>`}</section>
  <p class="note" style="margin-top:16px">In this proof of concept, people sign in with their claude.ai account. The real site gives students their own team logins and sends parents a permission link.</p>
  </div></main>`;
  const set = async (path, data) => { try { await db.doc(path).set(data); } catch (e) { pwMsg = e.message; renderMentor(); } };
  const upd = async (path, data) => { try { await db.doc(path).update(data); } catch (e) { pwMsg = e.message; renderMentor(); } };
  gate.querySelector('#mClose').onclick = () => { mentorOpen = false; pwMsg = ''; gate.hidden = true; gate.classList.remove('sheet-mode'); gate.innerHTML = ''; };
  gate.querySelector('#mRotate').onclick = () => upd('team/settings', { code: makeTeamCode() });
  gate.querySelectorAll('.mApprove').forEach((b) => b.onclick = () => {
    const tr = b.closest('tr'); const role = tr.querySelector('.mRole').value;
    if (role === 'student' && !tr.querySelector('.mPaper').checked) { pwMsg = 'Get parent permission first, then tick the box.'; return renderMentor(); }
    pwMsg = ''; set(`approvals/${tr.dataset.id}`, { status: 'active', role, title: role === 'mentor' ? 'Coach' : '', subs: '', by: uid, at: new Date().toISOString(), consent: role === 'student' });
  });
  gate.querySelectorAll('.mDecline').forEach((b) => b.onclick = async () => { try { await db.doc(`members/${b.closest('tr').dataset.id}`).delete(); } catch (e) { pwMsg = e.message; renderMentor(); } });
  gate.querySelectorAll('.mToggle').forEach((b) => b.onclick = () => { const id = b.closest('tr').dataset.id; upd(`approvals/${id}`, { status: approvals[id].status === 'active' ? 'disabled' : 'active' }); });
  gate.querySelectorAll('.mSave').forEach((b) => b.onclick = () => { const tr = b.closest('tr'); upd(`approvals/${tr.dataset.id}`, { title: tr.querySelector('.mTitle').value.slice(0, 60), subs: tr.querySelector('.mSubs').value }); pwMsg = 'Saved.'; });
  const on = gate.querySelector('#mChatOn'), off = gate.querySelector('#mChatOff');
  if (on) on.onclick = () => { const a = gate.querySelector('#mAdult').value.trim(); if (a.length < 3) { pwMsg = 'Name the second trained adult first.'; return renderMentor(); } upd('team/settings', { chat: true, adult: a.slice(0, 80) }); };
  if (off) off.onclick = () => upd('team/settings', { chat: false, adult: '' });
}

// ---------------------------------------------------------------- feedback: pin a comment on whatever screen is open
async function addFeedbackButton() {
  const comments = await window.claude?.use('comments');
  if (!comments) return;
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'fb-fab'; b.textContent = 'Comment on this screen';
  b.addEventListener('click', async () => {
    const zv = document.getElementById('zoneView');
    const target = zv && !zv.hidden ? zv : document.getElementById('bento') || document.body;
    try { await comments.openComposer({ element: target }); } catch (e) { toast('Comments are not available here. Use the comment button in the page frame.'); }
  });
  document.body.appendChild(b);
}

boot();
