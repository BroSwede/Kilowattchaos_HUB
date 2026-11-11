// Crew zone: Chat, Inspiration, People, Feedback. Everything here comes from the team database.
// Kids appear by display name and robot avatar only. Chat posts only when a mentor has switched chat on
// (after naming a second youth-protection-trained adult), mentors can read and remove anything, and there
// are no private messages, ever.
import { $, $$, esc, icon, tag, strip, av, dot, pill, seg, wireSeg, drawer, closeDrawer } from './common.js';
import { api, session, isMentor, me } from '../api.js';

const EMOJI = ['👍', '🎉', '💡', '❤️', '😂', '👀'];
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE = /(?:\+?\d[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/;
const myId = () => session.user?.id || '';
const isMine = (r) => r.user_id === myId();
const canRemove = (r) => isMine(r) || isMentor();
const roleOf = (name) => (session.roster.find((p) => p.name === name) || {}).role;
const roleTag = (who) => (roleOf(who) === 'mentor' ? '<span class="tag dark role">Mentor</span>' : '');
const youTag = (who) => (who === me() ? ' <span class="cap">(you)</span>' : '');
const errMsg = (err) => (err && err.message) || 'That did not save. Try again.';
const loading = (t = 'Loading…') => `<div class="live-empty" role="status">${t}</div>`;
const empty = (t) => `<div class="live-empty">${t}</div>`;

const fmtTime = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
const fmtDay = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
const fmtMD = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
function dayLabel(d) {
  const now = new Date(), y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (dayKey(d) === dayKey(now)) return 'Today';
  if (dayKey(d) === dayKey(y)) return 'Yesterday';
  return fmtDay.format(d);
}
const byOld = (a, b) => new Date(a.created_at) - new Date(b.created_at);

// Votes are shared by several pages (ideas, feedback, chat reactions, inspiration likes); each says what it is for.
const votesFor = (votes, field, id) => votes.filter((v) => v.data && v.data[field] === id);

// ================================================================= Chat
const CHANS = [
  { id: 'announcements', name: 'announcements', topic: 'Mentors post here, and everyone can react.', ro: true },
  { id: 'general', name: 'general', topic: 'Anything about the team. Kind and on topic.' },
  { id: 'build', name: 'build', topic: 'Building, prototyping and testing the robot.' },
  { id: 'code', name: 'code', topic: 'Java, OpModes and BioBuzz XR.' },
  { id: 'help', name: 'help', topic: 'Stuck? Ask here. No question is too small, and a mentor answers too.' },
  { id: 'shoutouts', name: 'shoutouts', topic: 'Thank a teammate for something they did.' },
];
const CH = Object.fromEntries(CHANS.map((c) => [c.id, c]));
let lastChan = 'general';

function chatPage(view, ctx) {
  let cur = ctx.state.chan && CH[ctx.state.chan] ? ctx.state.chan : lastChan;
  delete ctx.state.chan;
  const draft = ctx.state.chatDraft || '';
  delete ctx.state.chatDraft;
  const on = !!session.team.chatEnabled;
  let posts = [], reacts = [], sig = '', loaded = false, alive = true;
  let seen = {};
  try { seen = JSON.parse(ctx.local.get('kwc-chat-seen') || '{}') || {}; } catch (e) { seen = {}; }
  const roster = session.roster || [];
  const here = roster.filter((p) => p.here), away = roster.filter((p) => !p.here);
  const offText = isMentor()
    ? `<b>Chat is off.</b> Turn it on in <a href="/mentor">Mentor tools</a> after you name a second youth-protection-trained adult. Until then, nobody can post.`
    : '<b>Chat is off for now.</b> It turns on once a mentor sets up a second youth-protection-trained adult. Until then, ask your questions at meetings.';
  view.innerHTML = `<div class="zv">
    ${strip('Team channels for questions, progress and thank-yous. Everyone on the team can read every channel.', [tag(on ? 'Chat is on' : 'Chat is off')])}
    <div class="safety-bar" role="note">
      <span class="oc2 volt">${icon('alert', 'i sm')}</span>
      <span class="sb-txt">${on ? '<b>Chat is on.</b>' : offText} Mentors can read every channel, and there are no private messages, ever.</span>
      ${pill(on ? 'On' : 'Off', on ? 'var(--ok)' : 'var(--stone)')}
    </div>
    <div class="chat">
      <nav class="ch-side" aria-label="Channels">
        <h5>Channels</h5>
        ${CHANS.map((c) => `<button class="chn" type="button" data-ch="${c.id}" aria-current="${c.id === cur}"><span class="hash">#</span><span class="cn">${c.name}</span></button>`).join('')}
      </nav>
      <section class="ch-main" aria-label="Messages">
        <div class="ch-pick"><select class="inp" id="chatPick" aria-label="Channel">${CHANS.map((c) => `<option value="${c.id}"${c.id === cur ? ' selected' : ''}>#${esc(c.name)}</option>`).join('')}</select></div>
        <div class="ch-head" id="chatHead"></div>
        <div class="msgs" id="chatMsgs" aria-live="polite">${loading('Loading messages…')}</div>
        <div class="typing" id="chatNote" aria-live="polite"></div>
        <div class="composer">
          <label class="sr" for="chatIn">Message</label>
          <textarea class="inp" id="chatIn" rows="1" maxlength="1500" placeholder="Message"></textarea>
          <button class="icon-btn solid" type="button" id="chatSend" aria-label="Send">${icon('arrow')}</button>
        </div>
      </section>
      <aside class="ch-mem" aria-label="Team">
        <h5>Here today</h5>
        ${here.length ? here.map((p) => member(p.name, true)).join('') : '<p class="cap kc-mem-empty">Nobody has checked in yet today.</p>'}
        <h5>Team</h5>
        ${away.map((p) => member(p.name, false)).join('')}
        ${on ? '' : `<div class="mem-note">${icon('users', 'i sm')}<span>Chat needs two trained adults before it turns on.</span></div>`}
      </aside>
    </div>
  </div>`;
  const msgsEl = $('#chatMsgs', view), inp = $('#chatIn', view), note = $('#chatNote', view), sendBtn = $('#chatSend', view);
  const canPost = () => on && (!CH[cur].ro || isMentor());
  const hint = () => {
    if (!on) return 'Chat is off, so the message box is turned off too.';
    if (CH[cur].ro && !isMentor()) return 'Only mentors post in #announcements. You can still react to posts.';
    return 'Enter sends. Shift+Enter starts a new line.';
  };
  const setNote = (t, warn = false) => { note.textContent = t; note.classList.toggle('warn', warn); };
  const chanPosts = (c) => posts.filter((p) => (p.data.channel || 'general') === c).sort(byOld);
  const unread = (c) => chanPosts(c).filter((p) => !isMine(p) && new Date(p.created_at) > new Date(seen[c] || 0)).length;
  const markSeen = () => {
    const list = chanPosts(cur);
    if (!list.length) return;
    seen[cur] = list[list.length - 1].created_at;
    ctx.local.set('kwc-chat-seen', JSON.stringify(seen));
  };
  const sideCounts = () => {
    $$('.chn', view).forEach((b) => {
      const c = b.dataset.ch, n = c === cur ? 0 : unread(c);
      b.setAttribute('aria-current', String(c === cur));
      const u = $('.un', b);
      if (u) u.remove();
      if (n) b.insertAdjacentHTML('beforeend', `<span class="un" aria-label="${n} new">${n}</span>`);
    });
    $$('#chatPick option', view).forEach((o) => { const n = o.value === cur ? 0 : unread(o.value); o.textContent = `#${CH[o.value].name}${n ? ` (${n} new)` : ''}`; });
  };
  const reactsOf = (m) => {
    const out = {};
    for (const v of votesFor(reacts, 'chat', m.id)) {
      const e = v.data.emoji || '👍';
      if (!out[e]) out[e] = { n: 0, mine: null };
      out[e].n++;
      if (isMine(v)) out[e].mine = v;
    }
    return out;
  };
  const reactsHtml = (m) => {
    const r = reactsOf(m);
    return `<div class="reacts">${Object.entries(r).map(([e, v]) => `<button class="react" type="button" data-react="${e}" aria-pressed="${!!v.mine}" aria-label="${e} ${v.n}, ${v.mine ? 'remove your reaction' : 'add yours'}">${e} <span class="num">${v.n}</span></button>`).join('')}<button class="react add" type="button" data-addr="1" aria-label="Add a reaction" aria-expanded="false">${icon('plus', 'i sm')}</button><span class="epick" hidden>${EMOJI.map((e) => `<button type="button" data-react="${e}" aria-label="React with ${e}">${e}</button>`).join('')}</span></div>`;
  };
  const msgHtml = (m) => {
    const who = m.author;
    const t = new Date(m.created_at);
    return `<div class="msg" data-mid="${esc(m.id)}">
      ${av(who, 36)}
      <div class="mcol">
        <div class="who">${esc(who)}${youTag(who)}${roleTag(who)}<time datetime="${esc(m.created_at)}">${fmtTime.format(t)}</time></div>
        <div class="body">${esc(m.data.text || '').replace(/\n/g, '<br>')}</div>
        ${reactsHtml(m)}
      </div>
      <div class="msg-acts"><button type="button" data-quick="1" aria-label="React with a thumbs up" title="Thumbs up">👍</button>${canPost() ? `<button type="button" data-reply="1" aria-label="Reply to ${esc(who)}" title="Reply">${icon('chat', 'i sm')}</button>` : ''}${canRemove(m) ? `<button type="button" data-del="1" aria-label="Remove this message" title="Remove">${icon('x', 'i sm')}</button>` : ''}</div>
    </div>`;
  };
  const draw = (stick = true) => {
    const list = chanPosts(cur);
    const nearBottom = msgsEl.scrollHeight - msgsEl.scrollTop - msgsEl.clientHeight < 80;
    if (!list.length) {
      msgsEl.innerHTML = empty(on
        ? (CH[cur].ro && !isMentor() ? 'No announcements yet. Mentors post news here.' : `Nothing in #${esc(CH[cur].name)} yet. Say hi and start the conversation.`)
        : `No messages in #${esc(CH[cur].name)}. Posts show up here once chat is on.`);
    } else {
      let last = '', h = '';
      for (const m of list) {
        const d = new Date(m.created_at), k = dayKey(d);
        if (k !== last) { h += `<div class="day-sep" role="separator">${dayLabel(d)}</div>`; last = k; }
        h += msgHtml(m);
      }
      msgsEl.innerHTML = h;
    }
    if (stick || nearBottom) msgsEl.scrollTop = msgsEl.scrollHeight;
  };
  const show = () => {
    lastChan = cur;
    const c = CH[cur];
    $('#chatPick', view).value = cur;
    $('#chatHead', view).innerHTML = `<span class="hash-lg">#</span><b>${esc(c.name)}</b><span class="topic" title="${esc(c.topic)}">${esc(c.topic)}</span>`;
    inp.disabled = !canPost();
    sendBtn.disabled = !canPost();
    inp.placeholder = !on ? 'Chat is off for now' : c.ro && !isMentor() ? 'Only mentors post here' : `Message #${c.name}`;
    setNote(hint());
    if (loaded) { draw(true); markSeen(); sideCounts(); }
  };
  const load = async (first = false) => {
    try {
      const [p, v] = await Promise.all([api.list('chat'), api.list('vote')]);
      if (!alive) return;
      const r = v.filter((x) => x.data && x.data.chat);
      const s = p.map((x) => `${x.id}:${x.updated_at}`).join() + '|' + r.map((x) => x.id).join();
      loaded = true;
      if (!first && s === sig) return;
      if (!first && view.querySelector('.epick:not([hidden])')) return;
      sig = s; posts = p; reacts = r;
      draw(first);
      markSeen(); sideCounts();
    } catch (err) {
      if (first && alive) msgsEl.innerHTML = empty(`Messages did not load. ${esc(errMsg(err))}`);
    }
  };
  const rerenderMsg = (m) => {
    const el = $(`.msg[data-mid="${CSS.escape(m.id)}"]`, msgsEl);
    if (el) el.outerHTML = msgHtml(m);
  };
  const toggleReact = async (m, e) => {
    const mine = reacts.find((v) => isMine(v) && v.data.chat === m.id && (v.data.emoji || '👍') === e);
    try {
      if (mine) { await api.remove('vote', mine.id); reacts = reacts.filter((v) => v !== mine); }
      else { const v = await api.create('vote', { chat: m.id, emoji: e }); reacts = [v, ...reacts]; }
      rerenderMsg(m);
      const again = $(`.msg[data-mid="${CSS.escape(m.id)}"] .reacts [data-react="${e}"]`, msgsEl);
      if (again) again.focus({ preventScroll: true });
    } catch (err) { ctx.toast(errMsg(err)); }
  };
  const send = async () => {
    if (!canPost()) return;
    const text = inp.value.trim();
    if (!text) { setNote('Type a message first.'); return; }
    if (EMAIL.test(text) || PHONE.test(text)) {
      setNote('That looks like an email address or a phone number. To keep everyone safe, personal info stays out of chat. Ask a mentor if you need to share something like that.', true);
      return;
    }
    sendBtn.disabled = true;
    try {
      const m = await api.create('chat', { channel: cur, text });
      posts = [m, ...posts];
      inp.value = ''; inp.style.height = '';
      draw(true); markSeen();
      setNote(hint());
    } catch (err) { setNote(errMsg(err), true); }
    sendBtn.disabled = !canPost();
  };
  view.addEventListener('click', async (e) => {
    const chn = e.target.closest('[data-ch]');
    if (chn) { cur = chn.dataset.ch; show(); return; }
    const msgEl = e.target.closest('.msg');
    const m = msgEl && posts.find((p) => p.id === msgEl.dataset.mid);
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
      inp.value = `@${m.author} ${inp.value.replace(/^@\S+\s/, '')}`;
      inp.focus();
      inp.setSelectionRange(inp.value.length, inp.value.length);
      return;
    }
    if (e.target.closest('[data-del]')) {
      if (!confirm(isMine(m) ? 'Remove your message?' : `Remove this message from ${m.author}?`)) return;
      try {
        await api.remove('chat', m.id);
        posts = posts.filter((p) => p !== m);
        draw(false);
        ctx.toast('Message removed.');
      } catch (err) { ctx.toast(errMsg(err)); }
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
  sendBtn.addEventListener('click', send);
  show();
  load(true);
  if (draft && canPost()) {
    inp.value = draft;
    inp.focus({ preventScroll: true });
    inp.setSelectionRange(draft.length, draft.length);
  }
  const poll = setInterval(() => { if (!document.hidden) load(false); }, 10000);
  return () => { alive = false; clearInterval(poll); };
}
function member(n, here) {
  return `<div class="mem">${av(n, 26)}<span>${esc(n)}${youTag(n)}</span>${roleTag(n)}<span class="${here ? 'on' : 'off'}" role="img" aria-label="${here ? 'Checked in today' : 'Not checked in today'}"></span></div>`;
}

// ================================================================= Inspiration
const COLLS = [
  ['all', 'Everything', 'layers', 'var(--solid)'], ['intake', 'Intakes', 'focus', '#0E8F9E'], ['launcher', 'Launchers', 'zap', '#C2611A'],
  ['ballpath', 'Ball paths', 'sliders', '#7A5BD6'], ['drivetrain', 'Drivetrains', 'gamepad', '#2340A8'], ['prints', 'Clever prints', 'printer', '#4F5049'], ['outreach', 'Outreach', 'sparkle', '#C42D6B'],
];
const COLL = Object.fromEntries(COLLS.map((c) => [c[0], c]));
const SRC_IC = { video: 'play', cad: 'layers', link: 'book' };
const FILTERS = [['all', 'All'], ['video', 'Videos'], ['cad', 'CAD'], ['link', 'Pages'], ['mine', 'Mine']];
const tagKey = (t) => String(t || '').toLowerCase().trim().replace(/[^a-z0-9 ]+/g, '').replace(/\s+/g, '-').slice(0, 30) || 'other';
const tagName = (k) => (COLL[k] ? COLL[k][1] : k.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()));
const tagColor = (k) => (COLL[k] ? COLL[k][3] : '#5C5E54');
let inspColl = 'all', inspFilter = 'all';

function linkInfo(v) {
  let u;
  try { u = new URL(v); } catch (err) { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  const h = u.hostname.replace(/^www\.|^m\./, '');
  if (h === 'youtube.com' || h === 'youtu.be') return { src: 'YouTube', type: 'video' };
  if (h === 'onshape.com' || h.endsWith('.onshape.com')) return { src: 'Onshape', type: 'cad' };
  if (/(^|\.)(instagram|tiktok|facebook|snapchat|discord|x|twitter|reddit)\.com$/.test(h)) return { bad: true };
  return { src: h.length > 22 ? 'Web page' : h, type: 'link' };
}
const hashN = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

function inspiration(view, ctx) {
  if (ctx.state.inspTag) { inspColl = tagKey(ctx.state.inspTag); inspFilter = 'all'; }
  delete ctx.state.inspTag;
  let posts = [], likes = [];
  view.innerHTML = `<div class="zv">
    ${strip('Videos, CAD and pages worth studying, sorted into collections. Every post says why it is cool, so we learn from it instead of just scrolling.', [])}
    <div class="colls" id="inspColls" role="group" aria-label="Collections"></div>
    <article class="card c8">
      <div class="card-head insp-head"><h3 class="card-title" id="inspTitle">Everything</h3><div class="chips" id="inspChips" role="group" aria-label="Filter posts">${FILTERS.map(([v, t]) => `<button class="chip" type="button" data-filt="${v}" aria-pressed="${v === inspFilter}">${t}</button>`).join('')}</div></div>
      <div class="insp" id="inspGrid">${loading()}</div>
      <p class="cap">Describe other teams, but leave out their names and faces.</p>
    </article>
    <article class="card c4">
      <div class="card-head"><h3 class="card-title">Share something</h3></div>
      <form class="stack-v insp-form" id="inspForm" novalidate>
        <label class="fl"><span class="cap">Link</span><input class="inp" id="inspLink" type="url" inputmode="url" placeholder="https://www.youtube.com/…" autocomplete="off"><span class="ferr" id="inspLinkErr" aria-live="polite"></span></label>
        <label class="fl"><span class="cap">Title</span><input class="inp" id="inspT" type="text" maxlength="80" placeholder="A launcher with a really fast spin-up"><span class="ferr" id="inspTErr" aria-live="polite"></span></label>
        <label class="fl"><span class="cap">Collection</span><input class="inp" id="inspColl" list="inspTags" maxlength="30" placeholder="Intakes, Launchers, or a new one"><datalist id="inspTags"></datalist></label>
        <label class="fl"><span class="cap">Why it's cool (required)</span><textarea class="inp" id="inspWhy" maxlength="200" placeholder="What could we learn from it?"></textarea><span class="ferr" id="inspWhyErr" aria-live="polite"></span></label>
        <button class="btn primary pill" type="submit" id="inspGo">${icon('plus', 'i sm')}Share it</button>
      </form>
      <div class="callout">${icon('alert')}<div><b>Keep it safe.</b> Links from YouTube, Onshape and team or guide websites only. No social media, and no photos of faces. Mentors can remove any post.</div></div>
    </article>
  </div>`;
  const tagsInUse = () => {
    const keys = new Set(COLLS.slice(1).map((c) => c[0]));
    for (const p of posts) keys.add(tagKey(p.data.tag));
    return [...keys];
  };
  const postHtml = (p) => {
    const d = p.data, k = tagKey(d.tag);
    const mine = likes.find((l) => isMine(l) && l.data.inspiration === p.id);
    const n = votesFor(likes, 'inspiration', p.id).length;
    const h = 130 + (hashN(p.id) % 5) * 18;
    const c = tagColor(k), c2 = c.startsWith('var') ? '#5C5E54' : c;
    const thumb = `<span class="ithumb" style="height:${h}px;background:linear-gradient(140deg, #2F3737, ${c2})">${d.type === 'video' ? `<span class="play">${icon('play', 'i lg')}</span>` : icon(SRC_IC[d.type] || 'book', 'i lg')}<span class="src"><span class="st">${esc(d.src || 'Link')}</span></span><span class="ours"><span class="st">${esc(tagName(k))}</span></span></span>`;
    const safe = d.link && linkInfo(d.link) && !linkInfo(d.link).bad;
    return `<article class="ipost" data-pid="${esc(p.id)}">
      ${safe ? `<a href="${esc(d.link)}" target="_blank" rel="noopener noreferrer" class="kc-thumb" aria-label="Open ${esc(d.title || 'link')}">${thumb}</a>` : thumb}
      <div class="t">${esc(d.title || 'Untitled')}</div>
      <p class="why"><b>Why it's cool:</b> ${esc(d.note || '')}</p>
      <div class="row wrap"><span class="row grow" style="gap:6px">${av(p.author, 22)}<span class="cap">${esc(p.author)}${youTag(p.author)}</span></span>
        <button class="react" type="button" data-like="${esc(p.id)}" aria-pressed="${!!mine}" aria-label="Like, ${n} likes">❤️ <span class="num">${n}</span></button>
        ${safe ? `<a class="btn ghost pill sm" href="${esc(d.link)}" target="_blank" rel="noopener noreferrer">${icon('arrow', 'i sm')}Open</a>` : ''}
        ${canRemove(p) ? `<button class="icon-btn sm" type="button" data-pdel="${esc(p.id)}" aria-label="Remove this post" title="Remove">${icon('x', 'i sm')}</button>` : ''}</div>
    </article>`;
  };
  const draw = () => {
    const keys = ['all', ...tagsInUse()];
    if (!keys.includes(inspColl)) inspColl = 'all';
    $('#inspColls', view).innerHTML = keys.map((id) => {
      const [, n, ic, c] = COLL[id] || [id, tagName(id), 'sparkle', tagColor(id)];
      const cnt = id === 'all' ? posts.length : posts.filter((p) => tagKey(p.data.tag) === id).length;
      return `<button class="coll" type="button" data-coll="${esc(id)}" aria-pressed="${id === inspColl}"><span class="ccov" style="background:${c}${id === 'all' ? ';color:var(--on-solid)' : ''}">${icon(ic || 'layers', 'i sm')}</span><span><b>${esc(n)}</b><span>${cnt} post${cnt === 1 ? '' : 's'}</span></span></button>`;
    }).join('');
    $('#inspTags', view).innerHTML = tagsInUse().map((k) => `<option value="${esc(tagName(k))}"></option>`).join('');
    $('#inspTitle', view).textContent = inspColl === 'all' ? 'Everything' : tagName(inspColl);
    $$('[data-filt]', view).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filt === inspFilter)));
    const list = posts.filter((p) => (inspColl === 'all' || tagKey(p.data.tag) === inspColl) && (inspFilter === 'all' || (inspFilter === 'mine' ? isMine(p) : p.data.type === inspFilter)));
    $('#inspGrid', view).innerHTML = list.length ? list.map(postHtml).join('') : empty(posts.length ? 'Nothing matches here yet. Try another collection or filter, or share one.' : 'Nothing shared yet. Found a cool intake video or a smart CAD trick? Be the first to share it.');
  };
  (async () => {
    try {
      const [p, v] = await Promise.all([api.list('inspiration'), api.list('vote')]);
      posts = p; likes = v.filter((x) => x.data && x.data.inspiration);
      draw();
      const sel = $('.coll[aria-pressed="true"]', view);
      if (sel && inspColl !== 'all') sel.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    } catch (err) { $('#inspGrid', view).innerHTML = empty(`Posts did not load. ${esc(errMsg(err))}`); }
  })();
  if (inspColl !== 'all') $('#inspColl', view).value = tagName(inspColl);
  view.addEventListener('click', async (e) => {
    const c = e.target.closest('[data-coll]');
    if (c) { inspColl = c.dataset.coll; draw(); const b = $(`[data-coll="${CSS.escape(inspColl)}"]`, view); if (b) b.focus({ preventScroll: true }); if (inspColl !== 'all') $('#inspColl', view).value = tagName(inspColl); return; }
    const f = e.target.closest('[data-filt]');
    if (f) { inspFilter = f.dataset.filt; draw(); return; }
    const l = e.target.closest('[data-like]');
    if (l) {
      const id = l.dataset.like;
      const mine = likes.find((x) => isMine(x) && x.data.inspiration === id);
      l.disabled = true;
      try {
        if (mine) { await api.remove('vote', mine.id); likes = likes.filter((x) => x !== mine); }
        else likes = [await api.create('vote', { inspiration: id }), ...likes];
        const n = votesFor(likes, 'inspiration', id).length;
        l.setAttribute('aria-pressed', String(!mine));
        l.setAttribute('aria-label', `Like, ${n} likes`);
        $('.num', l).textContent = n;
      } catch (err) { ctx.toast(errMsg(err)); }
      l.disabled = false;
      return;
    }
    const d = e.target.closest('[data-pdel]');
    if (d) {
      const p = posts.find((x) => x.id === d.dataset.pdel);
      if (!p || !confirm(isMine(p) ? 'Remove your post?' : `Remove this post from ${p.author}?`)) return;
      try { await api.remove('inspiration', p.id); posts = posts.filter((x) => x !== p); draw(); ctx.toast('Post removed.'); }
      catch (err) { ctx.toast(errMsg(err)); }
    }
  });
  const errs = { link: $('#inspLinkErr', view), t: $('#inspTErr', view), why: $('#inspWhyErr', view) };
  const setErr = (k, msg) => {
    errs[k].textContent = msg;
    $({ link: '#inspLink', t: '#inspT', why: '#inspWhy' }[k], view).setAttribute('aria-invalid', String(!!msg));
  };
  ['inspLink', 'inspT', 'inspWhy'].forEach((id, i) => $(`#${id}`, view).addEventListener('input', () => setErr(['link', 't', 'why'][i], '')));
  $('#inspForm', view).addEventListener('submit', async (e) => {
    e.preventDefault();
    const link = $('#inspLink', view).value.trim(), t = $('#inspT', view).value.trim(), why = $('#inspWhy', view).value.trim();
    const typed = $('#inspColl', view).value.trim();
    const info = link ? linkInfo(link) : null;
    let ok = true;
    if (!link) { setErr('link', 'Paste a link to the video, CAD or page.'); ok = false; }
    else if (!info) { setErr('link', "That doesn't look like a web link. It should start with https://"); ok = false; }
    else if (info.bad) { setErr('link', 'Social media links are not allowed. Try YouTube, Onshape or a team website.'); ok = false; }
    if (!t) { setErr('t', 'Give it a short title.'); ok = false; }
    if (why.length < 10) { setErr('why', why ? 'Tell us a little more, so the team knows what to look for.' : "Say why it's cool. That's how we learn from it."); ok = false; }
    else if (EMAIL.test(why) || PHONE.test(why)) { setErr('why', 'Please leave out email addresses and phone numbers.'); ok = false; }
    if (!ok) { const first = $('[aria-invalid="true"]', view); if (first) first.focus(); return; }
    const known = COLLS.find((c) => c[1].toLowerCase() === typed.toLowerCase() || c[0] === typed.toLowerCase());
    const k = known ? known[0] : tagKey(typed || 'other');
    const btn = $('#inspGo', view);
    btn.disabled = true;
    try {
      const p = await api.create('inspiration', { link, title: t, note: why, tag: k, type: info.type, src: info.src });
      posts = [p, ...posts];
      e.target.reset();
      inspColl = k; inspFilter = 'all';
      $('#inspColl', view).value = tagName(k);
      draw();
      ctx.toast('Shared with the team. Thank you!');
    } catch (err) { ctx.toast(errMsg(err)); }
    btn.disabled = false;
  });
}

// ================================================================= People
const BADGE_IC = {
  'Shop safety': 'alert', 'Onshape Basics': 'layers', 'CAD for FTC': 'bot', 'First print': 'printer', 'Mechanisms 101': 'wrench', Driver: 'gamepad', Helper: 'users',
  'Java OpModes': 'code', 'First commit': 'commit', 'Academy drill': 'play', 'Challenge winner': 'trophy', 'Prototype pro': 'bulb', Wiring: 'zap', Outreach: 'sparkle',
  Builder: 'wrench', Portfolio: 'note', 'Battery care': 'zap',
};
const badgesOf = (badges, p) => badges.filter((b) => b.data && (b.data.to === p.id || (!b.data.to && b.data.toName === p.name)));
const subsOf = (p) => (Array.isArray(p.subs) ? p.subs : String(p.subs || '').split(',')).filter(Boolean);

function personCard(p, badges, ctx) {
  const n = badgesOf(badges, p).length;
  const subs = subsOf(p);
  return `<button class="person" type="button" data-person="${esc(p.id)}" aria-label="Open ${esc(p.name)}'s profile">
    <span class="row">${av(p.name, 48)}<span class="grow stack-v" style="gap:0"><span class="nm">${esc(p.name)}${youTag(p.name)}</span><span class="cap">${esc(p.title || (p.role === 'mentor' ? 'Mentor' : 'Team member'))}</span></span>
      <span class="st" title="${n} badge${n === 1 ? '' : 's'}">${icon('trophy', 'i sm')}${n}</span></span>
    <span class="chipline">${subs.map((s) => tag(`${dot(ctx.SYS[s] ? ctx.SYS[s].c : 'var(--stone)', 8)} ${esc(ctx.SYS[s] ? ctx.SYS[s].name : s)}`)).join('')}${p.role === 'mentor' ? tag('Mentor', 'dark') : ''}</span>
    <span class="work"><b>Today</b>${p.here ? `${dot('var(--ok)', 8)} Checked in` : 'Not checked in yet'}</span>
  </button>`;
}

function people(view, ctx) {
  let badges = [];
  const roster = () => [...(session.roster || [])].sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name) : a.role === 'student' ? -1 : 1));
  view.innerHTML = `<div class="zv">
    ${strip('Who is on the team, which subsystems they own, who is here today and the badges they have earned.', [tag(`${(session.roster || []).filter((p) => p.here).length} here today`)])}
    <div class="robot-note">${icon('users')}<span><b>Privacy rule:</b> display names and robot avatars only. No last names, schools, face photos or contact details, anywhere in the Hub.</span></div>
    <div class="people" id="peopleGrid">${loading()}</div>
  </div>`;
  const draw = () => {
    const list = roster();
    const ghost = session.team.chatEnabled ? '' : `<div class="person ghost">
      <span class="row"><span class="oc2">${icon('plus', 'i sm')}</span><span class="nm">Second trained adult needed</span></span>
      <p class="lead">FIRST's Youth Protection Program asks for two screened adults. A second one lets a mentor turn on chat and helps us follow the two-adult rule at every meeting.</p>
      ${isMentor() ? `<a class="btn soft pill sm" href="/mentor">${icon('users', 'i sm')}Open Mentor tools</a>` : `<button class="btn soft pill sm" type="button" data-toast="Thank you! Ask a grown-up to talk to a mentor. FIRST screens every adult before they help.">${icon('help', 'i sm')}Know someone who could help?</button>`}
    </div>`;
    $('#peopleGrid', view).innerHTML = (list.length ? list.map((p) => personCard(p, badges, ctx)).join('') : empty('Nobody is on the team yet. A mentor shares the Team Code so students can join.')) + ghost;
  };
  (async () => {
    try { badges = await api.list('badge'); } catch (err) { ctx.toast(`Badges did not load. ${errMsg(err)}`); }
    draw();
  })();
  view.addEventListener('click', (e) => {
    const b = e.target.closest('[data-person]');
    if (b) openPerson(b.dataset.person, ctx, badges, (next) => { badges = next; draw(); });
  });
}

async function openPerson(id, ctx, badges, onBadges) {
  const p = (session.roster || []).find((x) => x.id === id);
  if (!p) return;
  const you = p.name === me();
  const subs = subsOf(p);
  const mineBadges = () => badgesOf(badges, p);
  const html = `<div class="pf-head">${av(p.name, 72)}<div><h3>${esc(p.name)}${youTag(p.name)}</h3><p class="lead">${esc(p.title || (p.role === 'mentor' ? 'Mentor' : 'Team member'))}</p></div></div>
    <div class="chipline">${p.role === 'mentor' ? tag('Mentor', 'dark') : ''}${p.here ? tag(`${dot('var(--ok)', 8)} Here today`) : tag('Not checked in today')}</div>
    <h4>Contributions</h4><div class="contrib" id="pfContrib">${['Ideas', 'Prints', 'Shares', 'Notes'].map((l) => `<div><b>…</b><span>${l}</span></div>`).join('')}</div>
    <h4>Badges <span class="cap" id="pfBadgeN"></span></h4><div class="medals" id="pfBadges"></div>
    ${isMentor() ? `<form class="row wrap kc-give" id="pfGive"><label class="sr" for="pfBadgeIn">Badge name</label><input class="inp" id="pfBadgeIn" list="pfBadgeList" maxlength="40" placeholder="Give a badge, like Shop safety"><datalist id="pfBadgeList">${Object.keys(BADGE_IC).map((b) => `<option value="${esc(b)}"></option>`).join('')}</datalist><button class="btn primary pill sm" type="submit">${icon('trophy', 'i sm')}Give badge</button></form>` : ''}
    ${subs.length ? `<h4>Subsystems ${p.role === 'mentor' ? 'they help with' : 'they own'}</h4><div class="chips">${subs.map((s) => `<button class="chip" type="button" data-sys="${esc(s)}">${dot(ctx.SYS[s] ? ctx.SYS[s].c : 'var(--stone)', 8)}${esc(ctx.SYS[s] ? ctx.SYS[s].name : s)}</button>`).join('')}</div>` : ''}
    ${p.role === 'mentor' ? '<p class="lead">Mentors can read every channel. That keeps chat safe for everyone.</p>' : ''}
    ${you ? '<p class="cap">This is your profile. Teammates see exactly this. A mentor sets your title and subsystems.</p>' : session.team.chatEnabled ? `<button class="btn primary pill" type="button" id="pfThanks">${icon('chat', 'i sm')}Say thanks in #shoutouts</button>` : ''}`;
  const el = drawer(html, { label: `${p.name}'s profile` });
  const drawBadges = () => {
    const list = mineBadges();
    $('#pfBadgeN', el).textContent = list.length;
    $('#pfBadges', el).innerHTML = list.length
      ? list.map((b) => `<div class="medal2"><span class="m">${icon(BADGE_IC[b.data.name] || 'trophy', 'i sm')}</span>${esc(b.data.name || 'Badge')}${isMentor() ? `<button class="icon-btn sm kc-unbadge" type="button" data-unbadge="${esc(b.id)}" aria-label="Take back the ${esc(b.data.name)} badge">${icon('x', 'i sm')}</button>` : ''}</div>`).join('')
      : `<p class="cap kc-mem-empty">No badges yet.${isMentor() ? ' Give the first one below.' : ' Mentors give badges for skills you learn.'}</p>`;
  };
  drawBadges();
  $$('[data-sys]', el).forEach((b) => b.addEventListener('click', () => { ctx.state.sys = b.dataset.sys; closeDrawer(); ctx.go('robot', 'Subsystems'); }));
  const t = $('#pfThanks', el);
  if (t) t.addEventListener('click', () => {
    ctx.state.chan = 'shoutouts';
    ctx.state.chatDraft = `Shoutout to ${p.name} for `;
    closeDrawer();
    ctx.go('crew', 'Chat');
  });
  const give = $('#pfGive', el);
  if (give) give.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#pfBadgeIn', el).value.trim();
    if (!name) { $('#pfBadgeIn', el).focus(); return; }
    try {
      const b = await api.create('badge', { to: p.id, toName: p.name, name });
      badges = [b, ...badges]; onBadges(badges);
      $('#pfBadgeIn', el).value = '';
      drawBadges();
      ctx.toast(`${p.name} earned ${name}.`);
    } catch (err) { ctx.toast(errMsg(err)); }
  });
  el.addEventListener('click', async (e) => {
    const u = e.target.closest('[data-unbadge]');
    if (!u) return;
    try {
      await api.remove('badge', u.dataset.unbadge);
      badges = badges.filter((b) => b.id !== u.dataset.unbadge); onBadges(badges);
      drawBadges();
    } catch (err) { ctx.toast(errMsg(err)); }
  });
  // Counts of what this person added, from the shared records.
  const count = async (kind, test = () => true) => { try { return (await api.list(kind)).filter((r) => r.user_id === p.id && test(r)).length; } catch (err) { return 0; } };
  const nums = await Promise.all([count('idea'), count('print'), count('inspiration'), count('session')]);
  const box = $('#pfContrib', el);
  if (box) box.innerHTML = ['Ideas', 'Prints', 'Shares', 'Notes'].map((l, i) => `<div><b>${nums[i]}</b><span>${l}</span></div>`).join('');
}

// ================================================================= Feedback
const COLS = [['review', 'Under review', 'clock'], ['planned', 'Planned', 'calendar'], ['doing', 'In progress', 'wrench'], ['done', 'Shipped', 'check']];
const FTYPE = { idea: ['Idea', 'bulb'], broken: ["Something's broken", 'alert'], love: ['I love this', 'sparkle'] };
let fbType = 'idea';

function feedback(view, ctx) {
  const draft = ctx.state.fbDraft || '';
  delete ctx.state.fbDraft;
  let items = [], votes = [];
  view.innerHTML = `<div class="zv">
    ${strip('Tell us what to build next, what is broken and what you love about the Hub. Vote for the ideas you want most.', [])}
    <article class="card">
      <div class="card-head"><h3 class="card-title">Roadmap</h3>${isMentor() ? tag('You can move cards') : ''}</div>
      <div class="road" id="fbRoad">${loading()}</div>
    </article>
    <article class="card c7">
      <div class="card-head"><h3 class="card-title">Send feedback</h3></div>
      ${seg('ftype', Object.entries(FTYPE).map(([v, [t, ic]]) => [v, `${icon(ic, 'i sm')}${t}`]), fbType, 'Kind of feedback')}
      <label class="sr" for="fbText">Your feedback</label>
      <textarea class="inp" id="fbText" maxlength="300" placeholder="${fbPlaceholder()}">${esc(draft)}</textarea>
      <span class="ferr" id="fbErr" aria-live="polite"></span>
      <div class="row between wrap"><span class="cap">The whole team can see it, and mentors move it along the roadmap.</span><button class="btn primary pill" type="button" id="fbSend">${icon('arrow', 'i sm')}Send</button></div>
    </article>
    <article class="card c5">
      <div class="card-head"><h3 class="card-title">What's new</h3></div>
      <div class="items" id="fbNews">${loading()}</div>
    </article>
  </div>`;
  const ideaHtml = (it) => {
    const d = it.data, [tl, ic] = FTYPE[d.type] || FTYPE.idea;
    const vs = votesFor(votes, 'feedback', it.id), mine = vs.some(isMine), n = vs.length;
    const st = COLS.some((c) => c[0] === d.status) ? d.status : 'review';
    return `<div class="ridea${isMine(it) ? ' mine' : ''}" data-fid="${esc(it.id)}">
      <span class="row" style="gap:6px"><span class="st">${icon(ic, 'i sm')}${tl}</span>${canRemove(it) ? `<button class="icon-btn sm kc-fdel" type="button" data-fdel="${esc(it.id)}" aria-label="Remove this feedback" title="Remove">${icon('x', 'i sm')}</button>` : ''}</span>
      <div class="t">${esc(d.text || '')}</div>
      <div class="row between"><span class="row" style="gap:6px">${av(it.author, 22)}<span class="cap">${esc(it.author)}${it.author === me() ? ' (you)' : ''}</span></span>
        <button class="react" type="button" data-fvote="${esc(it.id)}" aria-pressed="${mine}" aria-label="Vote for this, ${n} votes">▲ <span class="num">${n}</span></button></div>
      ${isMentor() ? `<label class="kc-status"><span class="cap">Status</span><select class="inp" data-fstat="${esc(it.id)}">${COLS.map(([v, t]) => `<option value="${v}"${v === st ? ' selected' : ''}>${t}</option>`).join('')}</select></label>` : ''}
    </div>`;
  };
  const statusOf = (it) => (COLS.some((c) => c[0] === it.data.status) ? it.data.status : 'review');
  const road = () => {
    $('#fbRoad', view).innerHTML = COLS.map(([id, name, ic]) => {
      const list = items.filter((x) => statusOf(x) === id).sort((a, b) => votesFor(votes, 'feedback', b.id).length - votesFor(votes, 'feedback', a.id).length);
      return `<section class="rcol" aria-label="${name}"><h4 class="row">${icon(ic, 'i sm')}<span class="grow">${name}</span><span class="tag">${list.length}</span></h4>${list.length ? list.map(ideaHtml).join('') : `<p class="cap kc-mem-empty">${id === 'review' ? 'Nothing new. Send the first idea below.' : 'Nothing here yet.'}</p>`}</section>`;
    }).join('');
    const done = items.filter((x) => statusOf(x) === 'done').sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 5);
    $('#fbNews', view).innerHTML = done.length
      ? done.map((it) => `<div class="it">${av(it.author, 32)}<div class="grow"><div class="t">${esc(it.data.text)}</div><div class="meta cap" style="font-weight:400">Idea from ${esc(it.author)}</div></div><span class="end cap">${fmtMD.format(new Date(it.updated_at))}</span></div>`).join('')
      : empty('Nothing shipped yet. When a mentor marks an idea as shipped, it shows up here.');
  };
  (async () => {
    try {
      const [f, v] = await Promise.all([api.list('feedback'), api.list('vote')]);
      items = f; votes = v.filter((x) => x.data && x.data.feedback);
      road();
    } catch (err) { $('#fbRoad', view).innerHTML = empty(`Feedback did not load. ${esc(errMsg(err))}`); $('#fbNews', view).innerHTML = ''; }
  })();
  wireSeg(view, 'ftype', (v) => { fbType = v; $('#fbText', view).placeholder = fbPlaceholder(); });
  view.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-fvote]');
    if (b) {
      const id = b.dataset.fvote;
      const mine = votes.find((v) => isMine(v) && v.data.feedback === id);
      b.disabled = true;
      try {
        if (mine) { await api.remove('vote', mine.id); votes = votes.filter((v) => v !== mine); }
        else votes = [await api.create('vote', { feedback: id }), ...votes];
        const n = votesFor(votes, 'feedback', id).length;
        b.setAttribute('aria-pressed', String(!mine));
        b.setAttribute('aria-label', `Vote for this, ${n} votes`);
        $('.num', b).textContent = n;
      } catch (err) { ctx.toast(errMsg(err)); }
      b.disabled = false;
      return;
    }
    const d = e.target.closest('[data-fdel]');
    if (d) {
      const it = items.find((x) => x.id === d.dataset.fdel);
      if (!it || !confirm('Remove this feedback?')) return;
      try { await api.remove('feedback', it.id); items = items.filter((x) => x !== it); road(); ctx.toast('Removed.'); }
      catch (err) { ctx.toast(errMsg(err)); }
    }
  });
  view.addEventListener('change', async (e) => {
    const s = e.target.closest('[data-fstat]');
    if (!s) return;
    const it = items.find((x) => x.id === s.dataset.fstat);
    try {
      const u = await api.update('feedback', it.id, { status: s.value });
      Object.assign(it, { data: u.data, updated_at: u.updated_at });
      road();
      ctx.toast(`Moved to ${COLS.find((c) => c[0] === s.value)[1]}.`);
    } catch (err) { ctx.toast(errMsg(err)); road(); }
  });
  const txt = $('#fbText', view), err = $('#fbErr', view);
  txt.addEventListener('input', () => { err.textContent = ''; });
  $('#fbSend', view).addEventListener('click', async () => {
    const t = txt.value.trim();
    if (t.length < 5) { err.textContent = 'Write a few words first, so a mentor knows what you mean.'; txt.focus(); return; }
    if (EMAIL.test(t) || PHONE.test(t)) { err.textContent = 'Please leave out email addresses and phone numbers. A mentor can find you at the next meeting.'; txt.focus(); return; }
    const btn = $('#fbSend', view);
    btn.disabled = true;
    try {
      const it = await api.create('feedback', { type: fbType, text: t, status: 'review' });
      items = [it, ...items];
      txt.value = '';
      road();
      ctx.toast('Thanks! It is in Under review, and the team can vote on it.');
    } catch (e2) { err.textContent = errMsg(e2); }
    btn.disabled = false;
  });
  if (draft) { txt.focus({ preventScroll: true }); txt.setSelectionRange(draft.length, draft.length); }
}
function fbPlaceholder() {
  return { idea: 'I wish the Hub could…', broken: 'What happened, and where?', love: 'What do you love, and why?' }[fbType];
}

export const CREW = { Chat: chatPage, Inspiration: inspiration, People: people, Feedback: feedback };
