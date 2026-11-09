// Crew zone: Chat, Inspiration, People, Feedback.
// Everything here is sample data. Kids appear by display name and robot avatar only. Chat stays off until a
// second YPP-screened adult is in place, mentors can read every channel, and there are no private messages.
import { $, $$, esc, icon, tag, SAMPLE, strip, av, dot, pill, seg, wireSeg, drawer, closeDrawer, codeBlock, KIDS, KID, MENTOR } from './common.js';
import { SUBSYS } from './robot.js';

const EMOJI = ['👍', '🎉', '💡', '❤️', '😂', '👀'];
const ME = 'Sparky';

// ================================================================= Chat
const CHANS = [
  { id: 'announcements', name: 'announcements', topic: 'Mentors post here, and everyone can react.', un: 1, ro: true },
  { id: 'general', name: 'general', topic: 'Anything about the team. Kind and on topic.', un: 3 },
  { id: 'build', name: 'build', topic: 'Building, prototyping and testing the robot.', un: 2 },
  { id: 'build-gecko', name: 'Intake: gecko spacing', parent: 'build', topic: 'A thread in #build about how far apart the gecko wheels go.', un: 0 },
  { id: 'build-hood', name: 'Launcher hood', parent: 'build', topic: 'A thread in #build about the adjustable hood over the flywheel.', un: 1 },
  { id: 'help', name: 'help', topic: 'Stuck? Ask here. No question is too small, and a mentor answers too.', un: 1 },
  { id: 'shoutouts', name: 'shoutouts', topic: 'Thank a teammate. Shoutouts show on the shop TV.', un: 0 },
];
const CH = Object.fromEntries(CHANS.map((c) => [c.id, c]));
const chLabel = (c) => (c.parent ? `#${CH[c.parent].name} › ${c.name}` : `#${c.name}`);

// Live cards: [icon, title, detail, action]. Actions: 'goto:zone|Sub' or 'issue'.
const CARD = {
  intake: ['bulb', 'Intake test: 7 of 10 balls', 'Gecko wheels 4 mm closer · Nov 5', 'goto:build|Ideas'],
  print: ['printer', '4 roller hubs printing', '62% done on Printer 1', 'goto:build|Print Shop'],
  issue: ['pin', 'Pinned issue', 'The bearing next to the flywheel keeps popping out', 'issue'],
  event: ['calendar', 'League meet 1', 'Sat Jan 16 (sample)', 'goto:logbook|Competitions'],
};
const POLL = { q: 'What should we call the robot? Vote once, and you can change it.', opts: ['Chaos Engine', 'Sir Spins-a-Lot', 'Volt Runner', 'The Bumblebot'], base: [3, 1, 2, 1], mine: null };

// [who, time, body html, extra, reactions]. Day separators come from strings in the list.
const R = (o) => Object.fromEntries(Object.entries(o).map(([e, n]) => [e, { n, me: false }]));
const MSGS = {
  announcements: [
    'Thursday, Nov 5',
    ['Coach', '5:40 PM', 'No meeting on Thursday, Nov 26. Happy Thanksgiving, everyone! We meet again on Tuesday, Dec 1.', null, R({ '👍': 5, '🎉': 2 })],
    'Friday, Nov 6',
    ['Coach', '4:05 PM', 'The first league meet is on the calendar. Start thinking about what the robot needs to do <b>every single time</b> by then.', { card: 'event' }, R({ '👀': 4, '🎉': 1 })],
    ['Coach', '4:07 PM', 'The Hub opens for the whole team on Dec 1. Chat stays off until a second screened adult joins me, so keep asking questions at meetings for now.', null, R({ '👍': 6 })],
  ],
  general: [
    'Thursday, Nov 5',
    ['Nova', '3:58 PM', 'Who wants to help plan the library robot demo in December?', null, R({ '👍': 3, '🎉': 1 })],
    ['Pixel', '4:20 PM', 'We need a robot name before the league meet. Vote!', { poll: true }, R({ '💡': 2 })],
    ['Rivet', '4:22 PM', 'Chaos Engine has my vote 😂', null, R({ '😂': 4 })],
    'Friday, Nov 6',
    ['Gizmo', '3:31 PM', 'Has anyone seen the 2.5 mm hex key? It keeps walking away.', null, R({ '👀': 2 })],
    ['Coach', '3:40 PM', 'It lives on the tool wall now, with a label under it. Please put it back there when you finish.', null, R({ '👍': 4, '💡': 1 })],
  ],
  build: [
    'Thursday, Nov 5',
    ['Pixel', '4:48 PM', 'Moved the gecko wheels 4 mm closer and ran the pile test again:', { card: 'intake' }, R({ '🎉': 4, '👍': 2 })],
    ['Gizmo', '5:02 PM', 'Pinned this so we don\'t forget it next time:', { card: 'issue' }, R({ '👀': 3 })],
    ['Sparky', '5:15 PM', 'Flywheel spin-up is 1.4 s on a fresh battery. I\'ll test a tired one on Tuesday.', null, R({ '💡': 2 })],
    'Friday, Nov 6',
    ['Rivet', '3:36 PM', 'New roller hubs for the intake are on the printer:', { card: 'print' }, R({ '👍': 3 })],
  ],
  'build-gecko': [
    'Thursday, Nov 5',
    ['Pixel', '4:52 PM', 'Next try: 6 mm closer. Any guesses before we test?', null, R({ '💡': 1 })],
    ['Nova', '4:55 PM', 'I think the balls start getting squished too much. My guess is 8 of 10.', null, R({ '👍': 2 })],
    ['Coach', '4:58 PM', 'Great question. Write your guesses in the session note before you test, then compare. That\'s the kind of thing judges love to see.', null, R({ '👍': 3 })],
  ],
  'build-hood': [
    'Friday, Nov 6',
    ['Sparky', '3:45 PM', 'Sketching a hood with three angle settings: near, middle and far. It\'s in Onshape.', null, R({ '🎉': 2 })],
    ['Rivet', '3:49 PM', 'The launcher mount needs a brace first, or the hood will wobble at full speed.', null, R({ '💡': 2 })],
  ],
  help: [
    'Thursday, Nov 5',
    ['Echo', '4:10 PM', 'My autonomous drives way too far. It should go 24 inches and it goes off the tape. Here\'s the line:', { code: 'static final double TICKS_PER_INCH = 537.7 / 104;' }, R({ '👀': 2 })],
    ['Byte', '4:16 PM', 'Found it! 104 is the wheel diameter in millimeters. You need the distance around the wheel (the circumference) in inches:', { code: 'static final double TICKS_PER_INCH = 537.7 / (Math.PI * 104 / 25.4);' }, R({ '💡': 4, '🎉': 2 })],
    ['Echo', '4:31 PM', 'It stops right on the tape now. Thank you!!', null, R({ '❤️': 3 })],
    ['Coach', '4:35 PM', 'Lovely teamwork, you two. Byte, that one deserves a shoutout in #shoutouts.', null, R({ '👍': 4 })],
  ],
  shoutouts: [
    'Thursday, Nov 5',
    ['Echo', '4:40 PM', 'Shoutout to Byte for finding my ticks-per-inch bug! 🎉', null, R({ '❤️': 5, '🎉': 2 })],
    'Friday, Nov 6',
    ['Pixel', '5:20 PM', 'Shoutout to Rivet for staying to the end to brace the launcher mount.', null, R({ '🎉': 3 })],
    ['Coach', '5:28 PM', 'Shoutout to everyone for putting the tools back on the wall this week. The shop looks great.', null, R({ '❤️': 4, '👍': 3 })],
  ],
};
// Give each message an id and a reactions object once.
for (const [cid, list] of Object.entries(MSGS)) {
  list.forEach((m, i) => { if (typeof m !== 'string') MSGS[cid][i] = { id: `${cid}-${i}`, who: m[0], t: m[1], body: m[2], x: m[3] || {}, r: m[4] || {} }; });
}
const MEMBERS_ON = ['Coach', 'Sparky', 'Pixel', 'Byte'];
let lastChan = 'general';
let msgSeq = 0;

// Sample chat hours: Monday to Friday, 3 PM to 8 PM, local time.
function chatHours(now = new Date()) {
  const d = now.getDay(), h = now.getHours();
  const weekday = d >= 1 && d <= 5;
  if (weekday && h >= 15 && h < 20) return { open: true, text: 'Open now, until 8 PM' };
  if (weekday && h < 15) return { open: false, text: 'Closed, opens today at 3 PM' };
  if (d >= 1 && d <= 4) return { open: false, text: 'Closed, opens tomorrow at 3 PM' };
  return { open: false, text: 'Closed, opens Monday at 3 PM' };
}
const timeNow = () => new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const roleTag = (who) => (who === MENTOR.n ? '<span class="tag dark role">Mentor</span>' : '');

function liveCard(key) {
  const [ic, t, d, act] = CARD[key];
  const attr = act === 'issue' ? 'data-issue="1"' : `data-goto="${act.slice(5)}"`;
  return `<button class="live-card" type="button" ${attr}><span class="oc2${act === 'issue' ? ' volt' : ''}">${icon(ic, 'i sm')}</span><span class="grow"><b>${t}</b><span class="cap">${d}</span></span>${icon('arrow', 'i sm')}</button>`;
}
function pollHtml() {
  const tot = POLL.base.reduce((a, b) => a + b, 0) + (POLL.mine === null ? 0 : 1);
  return `<div class="poll" role="group" aria-label="${esc(POLL.q)}"><span class="cap">${POLL.q} ${tot} votes (sample)</span>${POLL.opts.map((o, i) => {
    const n = POLL.base[i] + (POLL.mine === i ? 1 : 0), pct = tot ? Math.round((n / tot) * 100) : 0;
    return `<button type="button" data-vote="${i}" aria-pressed="${POLL.mine === i}"><i style="width:${pct}%"></i><span>${o}</span><span class="num">${pct}%</span></button>`;
  }).join('')}</div>`;
}
function reactsHtml(m) {
  const list = Object.entries(m.r).filter(([, v]) => v.n + (v.me ? 1 : 0) > 0);
  return `<div class="reacts">${list.map(([e, v]) => {
    const n = v.n + (v.me ? 1 : 0);
    return `<button class="react" type="button" data-react="${e}" aria-pressed="${v.me}" aria-label="${e} ${n}, ${v.me ? 'remove your reaction' : 'add yours'}">${e} <span class="num">${n}</span></button>`;
  }).join('')}<button class="react add" type="button" data-addr="1" aria-label="Add a reaction" aria-expanded="false">${icon('plus', 'i sm')}</button><span class="epick" hidden>${EMOJI.map((e) => `<button type="button" data-react="${e}" aria-label="React with ${e}">${e}</button>`).join('')}</span></div>`;
}
function msgHtml(m) {
  const x = m.x;
  return `<div class="msg${m.local ? ' local' : ''}" data-mid="${m.id}">
    ${av(m.who, 36)}
    <div class="mcol">
      <div class="who">${m.who}${m.who === ME ? ' <span class="cap">(you)</span>' : ''}${roleTag(m.who)}<time>${m.t}</time></div>
      <div class="body">${m.body}</div>
      ${x.card ? liveCard(x.card) : ''}${x.poll ? pollHtml() : ''}${x.code ? codeBlock(x.code) : ''}
      ${m.local ? `<span class="cap local-note">${icon('alert', 'i sm')}Only on this device (preview). Nobody else sees it.</span>` : ''}
      ${reactsHtml(m)}
    </div>
    <div class="msg-acts"><button type="button" data-quick="1" aria-label="React with a thumbs up" title="Thumbs up">👍</button><button type="button" data-reply="1" aria-label="Reply to ${m.who}" title="Reply">${icon('chat', 'i sm')}</button>${m.who === ME ? '' : `<button type="button" data-report="1" aria-label="Report this message" title="Report">${icon('flag', 'i sm')}</button>`}</div>
  </div>`;
}
function msgsHtml(list) {
  return list.map((m) => (typeof m === 'string' ? `<div class="day-sep" role="separator">${m}</div>` : msgHtml(m))).join('');
}
const findMsg = (cid, id) => MSGS[cid].find((m) => typeof m !== 'string' && m.id === id);

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE = /(?:\+?\d[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/;

function chatPage(view, ctx) {
  let cur = ctx.state.chan && CH[ctx.state.chan] ? ctx.state.chan : lastChan;
  delete ctx.state.chan;
  const draft = ctx.state.chatDraft || '';
  delete ctx.state.chatDraft;
  const hrs = chatHours();
  view.innerHTML = `<div class="zv">
    ${strip('Team channels for questions, progress and thank-yous. This page is a preview with sample messages, and nothing you type leaves this device.', [tag('Phase 2 · Dec 7–18'), SAMPLE])}
    <div class="safety-bar" role="note">
      <span class="oc2 volt">${icon('alert', 'i sm')}</span>
      <span class="sb-txt"><b>Chat stays off until a second YPP-screened adult joins Coach.</b> Mentors can read every channel, and there are no private messages, ever.</span>
      <span id="chatHrs">${pill(hrs.text, hrs.open ? 'var(--ok)' : 'var(--stone)')}</span>
      <span class="cap">Sample hours: Mon–Fri, 3–8 PM</span>
    </div>
    <div class="chat">
      <nav class="ch-side" aria-label="Channels">
        <h5>Channels</h5>
        ${CHANS.map((c) => `<button class="chn${c.parent ? ' thread' : ''}" type="button" data-ch="${c.id}" aria-current="${c.id === cur}">${c.parent ? icon('chat', 'i sm') : '<span class="hash">#</span>'}<span class="cn">${c.name}</span>${c.un ? `<span class="un" aria-label="${c.un} unread">${c.un}</span>` : ''}</button>`).join('')}
        <p class="cap ch-side-note">Unread counts are sample data.</p>
      </nav>
      <section class="ch-main" aria-label="Messages">
        <div class="ch-pick"><select class="inp" id="chatPick" aria-label="Channel">${CHANS.map((c) => `<option value="${c.id}"${c.id === cur ? ' selected' : ''}>${esc(chLabel(c))}${c.un ? ` (${c.un} new)` : ''}</option>`).join('')}</select></div>
        <div class="ch-head" id="chatHead"></div>
        <div class="msgs" id="chatMsgs" aria-live="polite"></div>
        <div class="typing" id="chatNote" aria-live="polite"></div>
        <div class="composer">
          <label class="sr" for="chatIn">Message</label>
          <textarea class="inp" id="chatIn" rows="1" placeholder="Message"></textarea>
          <button class="icon-btn solid" type="button" id="chatSend" aria-label="Send">${icon('arrow')}</button>
        </div>
      </section>
      <aside class="ch-mem" aria-label="Members">
        <h5>Online (sample)</h5>
        ${MEMBERS_ON.map((n) => member(n, true)).join('')}
        <h5>Offline</h5>
        ${KIDS.map((k) => k.n).filter((n) => !MEMBERS_ON.includes(n)).map((n) => member(n, false)).join('')}
        <div class="mem-note">${icon('users', 'i sm')}<span>A second mentor is needed before chat turns on. Coach is the only screened adult right now.</span></div>
      </aside>
    </div>
  </div>`;
  const msgsEl = $('#chatMsgs', view), inp = $('#chatIn', view), note = $('#chatNote', view);
  const hint = () => {
    const h = chatHours();
    if (CH[cur].ro) return 'Only mentors post in #announcements. You can still react to posts.';
    return h.open ? 'Enter sends. Shift+Enter starts a new line.' : 'Chat is closed right now, but in this preview you can still try the composer.';
  };
  const setNote = (t, warn = false) => { note.textContent = t; note.classList.toggle('warn', warn); };
  const show = () => {
    lastChan = cur;
    const c = CH[cur];
    c.un = 0;
    $$('.chn', view).forEach((b) => {
      b.setAttribute('aria-current', String(b.dataset.ch === cur));
      if (b.dataset.ch === cur) { const u = $('.un', b); if (u) u.remove(); }
    });
    const opt = $(`#chatPick option[value="${cur}"]`, view);
    if (opt) opt.textContent = chLabel(c);
    $('#chatPick', view).value = cur;
    $('#chatHead', view).innerHTML = `<span class="hash-lg">${c.parent ? icon('chat', 'i sm') : '#'}</span><b>${esc(c.parent ? c.name : c.name)}</b><span class="topic" title="${esc(c.topic)}">${c.topic}</span>${cur === 'shoutouts' ? `<button class="btn ghost pill sm ch-tv" type="button" data-goto="home|Shop TV">${icon('max', 'i sm')}Shop TV</button>` : ''}`;
    msgsEl.innerHTML = msgsHtml(MSGS[cur]);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    inp.disabled = !!c.ro;
    $('#chatSend', view).disabled = !!c.ro;
    inp.placeholder = c.ro ? 'Only mentors post here' : `Message ${chLabel(c)}`;
    setNote(hint());
  };
  const rerenderMsg = (m) => {
    const el = $(`.msg[data-mid="${m.id}"]`, msgsEl);
    if (el) el.outerHTML = msgHtml(m);
  };
  const toggleReact = (m, e) => {
    if (!m.r[e]) m.r[e] = { n: 0, me: false };
    m.r[e].me = !m.r[e].me;
    rerenderMsg(m);
    const again = $(`.msg[data-mid="${m.id}"] .reacts [data-react="${e}"]`, msgsEl);
    if (again) again.focus({ preventScroll: true });
  };
  const send = () => {
    if (CH[cur].ro) return;
    const text = inp.value.trim();
    if (!text) { setNote('Type a message first.'); return; }
    if (EMAIL.test(text) || PHONE.test(text)) {
      setNote('That looks like an email address or a phone number. To keep everyone safe, personal info stays out of chat. Ask Coach if you need to share something like that.', true);
      return;
    }
    const list = MSGS[cur];
    const last = [...list].reverse().find((m) => typeof m === 'string');
    if (last !== 'Today') list.push('Today');
    list.push({ id: `${cur}-new-${++msgSeq}`, who: ME, t: timeNow(), body: esc(text).replace(/\n/g, '<br>'), x: {}, r: {}, local: true });
    inp.value = '';
    msgsEl.innerHTML = msgsHtml(list);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    setNote(chatHours().open ? 'Sent, only on this device (preview).' : 'Sent in the preview, even though chat is closed. Only you can see it.');
  };
  view.addEventListener('click', (e) => {
    const chn = e.target.closest('[data-ch]');
    if (chn) { cur = chn.dataset.ch; show(); return; }
    const msgEl = e.target.closest('.msg');
    const m = msgEl && findMsg(cur, msgEl.dataset.mid);
    if (!m) return;
    const r = e.target.closest('[data-react]');
    if (r) { toggleReact(m, r.dataset.react); return; }
    if (e.target.closest('[data-addr]')) {
      const b = e.target.closest('[data-addr]'), pk = $('.epick', msgEl), open = pk.hidden;
      pk.hidden = !open;
      b.setAttribute('aria-expanded', String(open));
      if (open) $('button', pk).focus({ preventScroll: true });
      return;
    }
    if (e.target.closest('[data-quick]')) { toggleReact(m, '👍'); return; }
    if (e.target.closest('[data-reply]')) {
      if (CH[cur].ro) { ctx.toast('Only mentors post in #announcements. React instead, or ask in #general.'); return; }
      inp.value = `@${m.who} ${inp.value.replace(/^@\S+\s/, '')}`;
      inp.focus();
      inp.setSelectionRange(inp.value.length, inp.value.length);
      return;
    }
    if (e.target.closest('[data-report]')) { ctx.toast('Reported privately to Coach. Thank you for speaking up.'); return; }
    if (e.target.closest('[data-issue]')) { ctx.showIssue(); return; }
    const v = e.target.closest('[data-vote]');
    if (v) {
      const i = +v.dataset.vote;
      POLL.mine = POLL.mine === i ? null : i;
      const p = $('.poll', msgEl);
      p.outerHTML = pollHtml();
      const nb = $(`.msg[data-mid="${m.id}"] [data-vote="${i}"]`, msgsEl);
      if (nb) nb.focus({ preventScroll: true });
      ctx.toast(POLL.mine === null ? 'Vote removed.' : `You voted for ${POLL.opts[i]}. You can change it any time.`);
    }
  });
  $('#chatPick', view).addEventListener('change', (e) => { cur = e.target.value; show(); });
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); }
  });
  inp.addEventListener('input', () => {
    if (note.classList.contains('warn') && !EMAIL.test(inp.value) && !PHONE.test(inp.value)) setNote(hint());
    inp.style.height = 'auto';
    inp.style.height = `${Math.min(140, inp.scrollHeight)}px`;
  });
  $('#chatSend', view).addEventListener('click', send);
  show();
  if (draft && !CH[cur].ro) {
    inp.value = draft;
    inp.focus({ preventScroll: true });
    inp.setSelectionRange(draft.length, draft.length);
  }
  const tick = setInterval(() => {
    const h = chatHours();
    $('#chatHrs', view).innerHTML = pill(h.text, h.open ? 'var(--ok)' : 'var(--stone)');
    if (!note.classList.contains('warn') && /^(Enter sends|Chat is closed)/.test(note.textContent)) setNote(hint());
  }, 30000);
  return () => clearInterval(tick);
}
function member(n, on) {
  return `<div class="mem">${av(n, 26)}<span>${n}${n === ME ? ' <span class="cap">(you)</span>' : ''}</span>${roleTag(n)}<span class="${on ? 'on' : 'off'}" role="img" aria-label="${on ? 'Online' : 'Offline'}"></span></div>`;
}

// ================================================================= Inspiration
const COLLS = [
  ['all', 'Everything', 'layers', 'var(--solid)'], ['intake', 'Intakes', 'focus', '#0E8F9E'], ['launcher', 'Launchers', 'zap', '#C2611A'],
  ['ballpath', 'Ball paths', 'sliders', '#7A5BD6'], ['drivetrain', 'Drivetrains', 'gamepad', '#2340A8'], ['prints', 'Clever prints', 'printer', '#4F5049'], ['outreach', 'Outreach', 'sparkle', '#C42D6B'],
];
const SRC = { video: 'YouTube', photo: 'Photo', cad: 'Onshape', link: 'Guide' };
const SRC_IC = { video: 'play', photo: 'image', cad: 'layers', link: 'book' };
// [collection, type, title, why, who, likes, ours, thumb height, gradient]
const POSTS = [
  ['intake', 'video', "Another team's two-stage intake", 'Soft wheels grab from a pile, then a second roller takes the ball, so it hardly ever jams.', 'Pixel', 6, false, 170, ['#0B6F7A', '#0E8F9E']],
  ['launcher', 'video', 'A flywheel launcher with an adjustable hood', 'One motor and three shot angles. Very close to what Sparky is sketching for us.', 'Sparky', 5, false, 210, ['#A3480F', '#F07A2A']],
  ['intake', 'cad', 'Our gecko wheel spacing test rig', 'You can swap the spacers in about 30 seconds, so testing 4 mm against 6 mm is quick.', 'Pixel', 4, true, 150, ['#1B5E66', '#3BA7B2']],
  ['ballpath', 'photo', 'A servo gate that lets one ball through at a time', 'The arm blocks the second ball while the first one leaves. It might fix our double-feed.', 'Gizmo', 7, false, 190, ['#5B3FA8', '#9F7FF0']],
  ['drivetrain', 'link', 'Game Manual 0, a free community guide to FTC', 'Written by people in the FTC community. The drivetrain pages explain mecanum wheels really clearly.', 'Byte', 8, false, 130, ['#1E2E78', '#2340A8'], 'https://gm0.org/'],
  ['prints', 'photo', 'Printed cable clips that snap onto the channel', 'No zip ties to cut, and the wires stay away from the wheels.', 'Echo', 5, true, 160, ['#3A3D38', '#6B6E6C']],
  ['drivetrain', 'video', 'Checking mecanum wheels before blaming the code', 'Lift the robot and spin each wheel on its own. A wheel on backwards looks exactly like a code bug.', 'Byte', 3, false, 180, ['#24346E', '#4F67C9']],
  ['launcher', 'cad', 'Our launcher hood, first sketch', 'Three holes for the hood angle. Rivet says the mount needs a brace first.', 'Sparky', 4, true, 140, ['#8A3B12', '#C2611A']],
  ['outreach', 'photo', 'A robot demo table at a library (photo of the table only)', 'Visitors drive a small robot with a gamepad. Good ideas for our December demo.', 'Nova', 6, false, 200, ['#8E1F4C', '#C42D6B']],
  ['prints', 'video', 'Heat-set inserts in printed parts', 'Brass threads pressed in with a hot iron, with a mentor, so screws stop stripping the plastic.', 'Rivet', 5, false, 170, ['#2F3737', '#5C5E54']],
  ['intake', 'photo', "Another team's intake with bendy flaps", 'Flexible flaps push balls in without needing exact spacing. Worth a quick prototype.', 'Nova', 2, false, 150, ['#0E6E77', '#57B9C2']],
].map(([coll, type, t, why, who, likes, ours, h, g, url], i) => ({ id: `p${i}`, coll, type, t, why, who, likes, ours, h, g, url, liked: false }));
const FILTERS = [['all', 'All'], ['video', 'Videos'], ['photo', 'Photos'], ['cad', 'CAD'], ['ours', 'Ours']];
let inspColl = 'all', inspFilter = 'all';

function postHtml(p) {
  const n = p.likes + (p.liked ? 1 : 0);
  const thumbInner = p.type === 'video' ? `<span class="play">${icon('play', 'i lg')}</span>` : icon(SRC_IC[p.type], 'i lg');
  const thumb = `<span class="ithumb" style="height:${p.h}px;background:linear-gradient(140deg, ${p.g[0]}, ${p.g[1]})">${thumbInner}<span class="src"><span class="st">${p.pending ? 'Waiting for a mentor' : p.src || SRC[p.type]}</span></span>${p.ours ? '<span class="ours"><span class="st volt">Ours</span></span>' : ''}</span>`;
  const open = p.url && !p.pending
    ? `<a class="btn ghost pill sm" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">${icon('arrow', 'i sm')}Open gm0.org</a>`
    : `<button class="btn ghost pill sm" type="button" data-open="${p.id}">${icon('arrow', 'i sm')}Open</button>`;
  return `<article class="ipost" data-pid="${p.id}">
    ${thumb}
    <div class="t">${esc(p.t)}</div>
    <p class="why"><b>Why it's cool:</b> ${esc(p.why)}</p>
    <div class="row wrap"><span class="row grow" style="gap:6px">${av(p.who, 22)}<span class="cap">${p.who}</span></span>
      <button class="react" type="button" data-like="${p.id}" aria-pressed="${p.liked}" aria-label="Like, ${n} likes">❤️ <span class="num">${n}</span></button>${open}</div>
  </article>`;
}

function inspiration(view, ctx) {
  if (ctx.state.inspTag && COLLS.some((c) => c[0] === ctx.state.inspTag)) { inspColl = ctx.state.inspTag; inspFilter = 'all'; }
  delete ctx.state.inspTag;
  view.innerHTML = `<div class="zv">
    ${strip('Videos, photos and CAD worth studying, sorted into collections. Every post says why it is cool, so we learn from it instead of just scrolling.', [tag('Phase 2 · Dec 7–18'), SAMPLE])}
    <div class="colls" id="inspColls" role="group" aria-label="Collections"></div>
    <article class="card c8">
      <div class="card-head insp-head"><h3 class="card-title" id="inspTitle">Everything</h3><div class="chips" id="inspChips" role="group" aria-label="Filter posts">${FILTERS.map(([v, t]) => `<button class="chip" type="button" data-filt="${v}" aria-pressed="${v === inspFilter}">${t}</button>`).join('')}</div></div>
      <div class="insp" id="inspGrid"></div>
      <p class="cap">All posts are sample data. Other teams are described, never named.</p>
    </article>
    <article class="card c4">
      <div class="card-head"><h3 class="card-title">Share something</h3></div>
      <form class="stack-v insp-form" id="inspForm" novalidate>
        <label class="fl"><span class="cap">Link</span><input class="inp" id="inspLink" type="url" inputmode="url" placeholder="https://www.youtube.com/…" autocomplete="off"><span class="ferr" id="inspLinkErr" aria-live="polite"></span></label>
        <label class="fl"><span class="cap">Title</span><input class="inp" id="inspT" type="text" maxlength="80" placeholder="A launcher with a really fast spin-up"><span class="ferr" id="inspTErr" aria-live="polite"></span></label>
        <label class="fl"><span class="cap">Collection</span><select class="inp" id="inspColl">${COLLS.slice(1).map(([id, n]) => `<option value="${id}"${id === inspColl ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="fl"><span class="cap">Why it's cool (required)</span><textarea class="inp" id="inspWhy" maxlength="200" placeholder="What could we learn from it?"></textarea><span class="ferr" id="inspWhyErr" aria-live="polite"></span></label>
        <button class="btn primary pill" type="submit">${icon('plus', 'i sm')}Share it</button>
      </form>
      <div class="callout">${icon('alert')}<div><b>A mentor checks new posts</b> before everyone sees them. Only links from YouTube, Onshape and team websites are allowed, and no photos of faces.</div></div>
    </article>
  </div>`;
  const draw = () => {
    $('#inspColls', view).innerHTML = COLLS.map(([id, n, ic, c]) => {
      const cnt = id === 'all' ? POSTS.length : POSTS.filter((p) => p.coll === id).length;
      return `<button class="coll" type="button" data-coll="${id}" aria-pressed="${id === inspColl}"><span class="ccov" style="background:${c}${id === 'all' ? ';color:var(--on-solid)' : ''}">${icon(ic, 'i sm')}</span><span><b>${n}</b><span>${cnt} post${cnt === 1 ? '' : 's'}</span></span></button>`;
    }).join('');
    $('#inspTitle', view).textContent = COLLS.find((c) => c[0] === inspColl)[1];
    $$('[data-filt]', view).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filt === inspFilter)));
    const list = POSTS.filter((p) => (inspColl === 'all' || p.coll === inspColl) && (inspFilter === 'all' || (inspFilter === 'ours' ? p.ours : p.type === inspFilter)));
    $('#inspGrid', view).innerHTML = list.length ? list.map(postHtml).join('') : `<p class="lead insp-empty">Nothing here yet. Be the first to share one.</p>`;
  };
  draw();
  const sel = $('.coll[aria-pressed="true"]', view);
  if (sel && inspColl !== 'all') sel.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  view.addEventListener('click', (e) => {
    const c = e.target.closest('[data-coll]');
    if (c) { inspColl = c.dataset.coll; draw(); $(`[data-coll="${inspColl}"]`, view).focus({ preventScroll: true }); if (inspColl !== 'all') $('#inspColl', view).value = inspColl; return; }
    const f = e.target.closest('[data-filt]');
    if (f) { inspFilter = f.dataset.filt; draw(); return; }
    const l = e.target.closest('[data-like]');
    if (l) {
      const p = POSTS.find((x) => x.id === l.dataset.like);
      p.liked = !p.liked;
      const n = p.likes + (p.liked ? 1 : 0);
      l.setAttribute('aria-pressed', String(p.liked));
      l.setAttribute('aria-label', `Like, ${n} likes`);
      $('.num', l).textContent = n;
      return;
    }
    const o = e.target.closest('[data-open]');
    if (o) {
      const p = POSTS.find((x) => x.id === o.dataset.open);
      ctx.toast(p.pending ? 'Coach checks this post first. Then it opens for everyone.' : 'This is a sample post. In the Hub it opens the video, photo or CAD.');
    }
  });
  const errs = { link: $('#inspLinkErr', view), t: $('#inspTErr', view), why: $('#inspWhyErr', view) };
  const linkInfo = (v) => {
    let u;
    try { u = new URL(v); } catch (err) { return null; }
    if (!/^https?:$/.test(u.protocol)) return null;
    const h = u.hostname.replace(/^www\.|^m\./, '');
    if (h === 'youtube.com' || h === 'youtu.be') return { src: 'YouTube', type: 'video' };
    if (h === 'onshape.com' || h.endsWith('.onshape.com')) return { src: 'Onshape', type: 'cad' };
    if (/(instagram|tiktok|facebook|snapchat|discord|x)\.com$|^twitter\.com$/.test(h)) return { bad: true };
    return { src: 'Team site', type: 'link' };
  };
  const setErr = (k, msg) => {
    errs[k].textContent = msg;
    const field = { link: '#inspLink', t: '#inspT', why: '#inspWhy' }[k];
    $(field, view).setAttribute('aria-invalid', String(!!msg));
  };
  ['inspLink', 'inspT', 'inspWhy'].forEach((id, i) => $(`#${id}`, view).addEventListener('input', () => setErr(['link', 't', 'why'][i], '')));
  $('#inspForm', view).addEventListener('submit', (e) => {
    e.preventDefault();
    const link = $('#inspLink', view).value.trim(), t = $('#inspT', view).value.trim(), why = $('#inspWhy', view).value.trim();
    const info = link ? linkInfo(link) : null;
    let ok = true;
    if (!link) { setErr('link', 'Paste a link to the video, CAD or page.'); ok = false; }
    else if (!info) { setErr('link', "That doesn't look like a web link. It should start with https://"); ok = false; }
    else if (info.bad) { setErr('link', 'Social media links are not allowed. Try YouTube, Onshape or a team website.'); ok = false; }
    if (!t) { setErr('t', 'Give it a short title.'); ok = false; }
    if (why.length < 10) { setErr('why', why ? 'Tell us a little more, so the team knows what to look for.' : "Say why it's cool. That's how we learn from it."); ok = false; }
    if (!ok) { const first = $('[aria-invalid="true"]', view); if (first) first.focus(); return; }
    const coll = $('#inspColl', view).value;
    const cc = COLLS.find((c) => c[0] === coll)[3];
    POSTS.unshift({ id: `p${POSTS.length}`, coll, type: info.type, src: info.src, t, why, who: ME, likes: 0, ours: false, h: 140, g: ['#2F3737', cc.startsWith('var') ? '#5C5E54' : cc], liked: false, pending: true });
    e.target.reset();
    $('#inspColl', view).value = coll;
    inspColl = coll; inspFilter = 'all';
    draw();
    ctx.toast('Shared. Coach checks new posts before everyone sees them.');
  });
}

// ================================================================= People
const BADGE_IC = {
  'Shop safety': 'alert', 'Onshape Basics': 'layers', 'CAD for FTC': 'bot', 'First print': 'printer', 'Mechanisms 101': 'wrench', Driver: 'gamepad', Helper: 'users',
  'Java OpModes': 'code', 'First commit': 'commit', 'Arena drill': 'play', 'Challenge winner': 'trophy', 'Prototype pro': 'bulb', Wiring: 'zap', Outreach: 'sparkle',
  Builder: 'wrench', Portfolio: 'note', 'Battery care': 'zap',
};
const COACH = { n: 'Coach', role: 'Mentor · YPP-screened', skills: ['Safety', 'Building', 'Java'], work: 'Finding a second screened mentor so chat can turn on' };
const ownedBy = (n) => Object.entries(SUBSYS).filter(([, s]) => s.owners.includes(n)).map(([id]) => id);

function personCard(k) {
  const you = k.n === ME;
  return `<button class="person" type="button" data-person="${k.n}" aria-label="Open ${k.n}'s profile">
    <span class="row">${av(k.n, 48)}<span class="grow stack-v" style="gap:0"><span class="nm">${k.n}${you ? ' <span class="cap">(you)</span>' : ''}</span><span class="cap">${k.role}</span></span>
      <span class="st" title="${k.badges.length} badges">${icon('trophy', 'i sm')}${k.badges.length}</span></span>
    <span class="chipline">${k.skills.map((s) => tag(s)).join('')}</span>
    <span class="work"><b>Working on</b>${k.work}</span>
  </button>`;
}

function people(view, ctx) {
  view.innerHTML = `<div class="zv">
    ${strip('Who does what on the team, what everyone is working on, and the badges they have earned.', [tag('Phase 2 · Dec 7–18'), SAMPLE])}
    <div class="robot-note">${icon('users')}<span><b>Privacy rule:</b> display names and robot avatars only. No last names, schools, face photos or contact details, anywhere in the Hub.</span></div>
    <div class="people" id="peopleGrid">
      ${KIDS.map(personCard).join('')}
      <button class="person" type="button" data-person="Coach" aria-label="Open Coach's profile">
        <span class="row">${av('Coach', 48)}<span class="grow stack-v" style="gap:0"><span class="nm">Coach</span><span class="cap">${COACH.role}</span></span></span>
        <span class="chipline">${COACH.skills.map((s) => tag(s)).join('')}</span>
        <span class="work"><b>Working on</b>${COACH.work}</span>
      </button>
      <div class="person ghost">
        <span class="row"><span class="oc2">${icon('plus', 'i sm')}</span><span class="nm">Second mentor needed</span></span>
        <p class="lead">FIRST's Youth Protection Program asks for two screened adults. A second mentor unlocks chat and lets us follow the two-adult rule at every meeting.</p>
        <button class="btn soft pill sm" type="button" data-toast="Thank you! Ask a grown-up to talk to Coach. FIRST screens every mentor before they join.">${icon('help', 'i sm')}Know someone who could help?</button>
      </div>
    </div>
  </div>`;
  view.addEventListener('click', (e) => {
    const b = e.target.closest('[data-person]');
    if (b) openPerson(b.dataset.person, ctx);
  });
}

function openPerson(n, ctx) {
  const isCoach = n === MENTOR.n;
  const k = isCoach ? { ...COACH, badges: [], stats: null } : KID[n];
  const subs = ownedBy(n);
  const you = n === ME;
  const html = `<div class="pf-head">${av(n, 72)}<div><h3>${n}${you ? ' <span class="cap">(you)</span>' : ''}</h3><p class="lead">${k.role}${isCoach ? ' (sample)' : ''}</p></div></div>
    <div class="chipline">${k.skills.map((s) => tag(s)).join('')}</div>
    <div class="work-box"><span class="cap">Working on</span><div>${k.work}</div></div>
    ${k.stats ? `<h4>Contributions</h4><div class="contrib">${['Ideas', 'Prints', 'Commits', 'Notes'].map((l, i) => `<div><b>${k.stats[i]}</b><span>${l}</span></div>`).join('')}</div>` : ''}
    ${k.badges.length ? `<h4>Badges <span class="cap">${k.badges.length}</span></h4><div class="medals">${k.badges.map((b) => `<div class="medal2"><span class="m">${icon(BADGE_IC[b] || 'trophy', 'i sm')}</span>${b}</div>`).join('')}</div>` : ''}
    ${subs.length ? `<h4>Subsystems ${isCoach ? 'they help with' : 'they own'}</h4><div class="chips">${subs.map((id) => `<button class="chip" type="button" data-sys="${id}">${dot(ctx.SYS[id] ? ctx.SYS[id].c : 'var(--stone)', 8)}${ctx.SYS[id] ? ctx.SYS[id].name : id}</button>`).join('')}</div>` : ''}
    ${isCoach ? '<p class="lead">Coach can read every channel, and so will the second mentor. That keeps chat safe for everyone.</p>' : ''}
    ${you ? '<p class="cap">This is your profile. Teammates see exactly this.</p>' : `<button class="btn primary pill" type="button" id="pfThanks">${icon('chat', 'i sm')}Say thanks in #shoutouts</button>`}
    <p class="cap">Sample profile.</p>`;
  const el = drawer(html, { label: `${n}'s profile` });
  $$('[data-sys]', el).forEach((b) => b.addEventListener('click', () => { ctx.state.sys = b.dataset.sys; closeDrawer(); ctx.go('robot', 'Subsystems'); }));
  const t = $('#pfThanks', el);
  if (t) t.addEventListener('click', () => {
    ctx.state.chan = 'shoutouts';
    ctx.state.chatDraft = `Shoutout to ${n} for `;
    closeDrawer();
    ctx.go('crew', 'Chat');
  });
}

// ================================================================= Feedback
const COLS = [['review', 'Under review', 'clock'], ['planned', 'Planned', 'calendar'], ['progress', 'In progress', 'wrench'], ['shipped', 'Shipped', 'check']];
const FTYPE = { idea: ['Idea', 'bulb'], broken: ["Something's broken", 'alert'], love: ['I love this', 'sparkle'] };
const IDEAS = [
  ['review', 'idea', 'Let us pick the color of our robot avatar', 'Nova', 4],
  ['review', 'broken', 'The print queue jumps to the top when it refreshes', 'Rivet', 2],
  ['review', 'idea', 'A sound on the shop TV when a print finishes', 'Gizmo', 5],
  ['planned', 'idea', 'Quiz mode for the Glossary', 'Pixel', 6],
  ['planned', 'idea', "Show who's checked in to the meeting on Home", 'Gizmo', 3],
  ['progress', 'idea', 'A timer for each Arena drill', 'Byte', 7],
  ['progress', 'love', 'Bigger shoutouts on the shop TV', 'Echo', 4],
  ['shipped', 'idea', 'Night shift theme for evening meetings', 'Echo', 9],
  ['shipped', 'idea', 'Gecko wheel spacing in the Mechanism Lab', 'Pixel', 6],
].map(([col, type, t, who, v], i) => ({ id: `f${i}`, col, type, t, who, v, me: false }));
const NEWS = [
  ['Nov 6', 'Night shift theme', 'Echo', 'Dark colors for evening meetings, from Echo\'s idea.'],
  ['Nov 3', 'Gecko wheel spacing in the Mechanism Lab', 'Pixel', 'Try spacing before printing anything, suggested by Pixel.'],
  ['Oct 29', 'Bigger buttons on phones', 'Nova', 'Nova noticed the buttons were hard to tap on a small phone.'],
  ['Oct 27', 'Arena practice drill', 'Byte', 'Byte asked for a drill to practice before driving the real robot.'],
];
let fbType = 'idea';

function ideaHtml(it) {
  const [tl, ic] = FTYPE[it.type];
  const n = it.v + (it.me ? 1 : 0);
  return `<div class="ridea${it.mine ? ' mine' : ''}">
    <span class="row" style="gap:6px"><span class="st">${icon(ic, 'i sm')}${tl}</span>${it.mine ? '<span class="st volt">New</span>' : ''}</span>
    <div class="t">${esc(it.t)}</div>
    <div class="row between"><span class="row" style="gap:6px">${av(it.who, 22)}<span class="cap">${it.who}${it.who === ME ? ' (you)' : ''}</span></span>
      <button class="react" type="button" data-fvote="${it.id}" aria-pressed="${it.me}" aria-label="Vote for this, ${n} votes">▲ <span class="num">${n}</span></button></div>
  </div>`;
}

function feedback(view, ctx) {
  const draft = ctx.state.fbDraft || '';
  delete ctx.state.fbDraft;
  view.innerHTML = `<div class="zv">
    ${strip('Tell us what to build next, what is broken and what you love about the Hub. Vote for the ideas you want most.', [tag('Phase 2 · Dec 7–18'), SAMPLE])}
    <article class="card">
      <div class="card-head"><h3 class="card-title">Roadmap</h3>${tag('Sample ideas')}</div>
      <div class="road" id="fbRoad"></div>
      <p class="cap">${icon('code', 'i sm')} Some of these you could build yourself in Student Dev Mode, which arrives in Phase 7.</p>
    </article>
    <article class="card c7">
      <div class="card-head"><h3 class="card-title">Send feedback</h3></div>
      ${seg('ftype', Object.entries(FTYPE).map(([v, [t, ic]]) => [v, `${icon(ic, 'i sm')}${t}`]), fbType, 'Kind of feedback')}
      <label class="sr" for="fbText">Your feedback</label>
      <textarea class="inp" id="fbText" maxlength="300" placeholder="${fbPlaceholder()}">${esc(draft)}</textarea>
      <span class="ferr" id="fbErr" aria-live="polite"></span>
      <div class="row between wrap"><span class="cap">Coach reads new ideas every Friday.</span><button class="btn primary pill" type="button" id="fbSend">${icon('arrow', 'i sm')}Send</button></div>
    </article>
    <article class="card c5">
      <div class="card-head"><h3 class="card-title">What's new</h3>${tag('Sample')}</div>
      <div class="items">${NEWS.map(([d, t, who, x]) => `<div class="it">${av(who, 32)}<div class="grow"><div class="t">${t}</div><div class="meta cap" style="font-weight:400">${x}</div></div><span class="end cap">${d}</span></div>`).join('')}</div>
    </article>
  </div>`;
  const road = () => {
    $('#fbRoad', view).innerHTML = COLS.map(([id, name, ic]) => {
      const list = IDEAS.filter((x) => x.col === id);
      return `<section class="rcol" aria-label="${name}"><h4 class="row">${icon(ic, 'i sm')}<span class="grow">${name}</span><span class="tag">${list.length}</span></h4>${list.map(ideaHtml).join('')}</section>`;
    }).join('');
  };
  road();
  wireSeg(view, 'ftype', (v) => { fbType = v; $('#fbText', view).placeholder = fbPlaceholder(); });
  view.addEventListener('click', (e) => {
    const b = e.target.closest('[data-fvote]');
    if (!b) return;
    const it = IDEAS.find((x) => x.id === b.dataset.fvote);
    it.me = !it.me;
    const n = it.v + (it.me ? 1 : 0);
    b.setAttribute('aria-pressed', String(it.me));
    b.setAttribute('aria-label', `Vote for this, ${n} votes`);
    $('.num', b).textContent = n;
  });
  const txt = $('#fbText', view), err = $('#fbErr', view);
  txt.addEventListener('input', () => { err.textContent = ''; });
  $('#fbSend', view).addEventListener('click', () => {
    const t = txt.value.trim();
    if (t.length < 5) { err.textContent = 'Write a few words first, so Coach knows what you mean.'; txt.focus(); return; }
    if (EMAIL.test(t) || PHONE.test(t)) { err.textContent = 'Please leave out email addresses and phone numbers. Coach can find you at the next meeting.'; txt.focus(); return; }
    IDEAS.unshift({ id: `f${IDEAS.length}`, col: 'review', type: fbType, t, who: ME, v: 0, me: true, mine: true });
    txt.value = '';
    road();
    ctx.toast('Thanks! It is in Under review. Coach reads new ideas every Friday.');
  });
  if (draft) { txt.focus({ preventScroll: true }); txt.setSelectionRange(draft.length, draft.length); }
}
function fbPlaceholder() {
  return { idea: 'I wish the Hub could…', broken: 'What happened, and where?', love: 'What do you love, and why?' }[fbType];
}

export const CREW = { Chat: chatPage, Inspiration: inspiration, People: people, Feedback: feedback };
