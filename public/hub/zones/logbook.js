// Logbook zone: Calendar, Sessions, Progress, Competitions, Portfolio. Everything comes from the team database.
// The season dates that are fixed (kickoff Sep 12 2026, Hub doors open Dec 1 2026) stay in code; mentors add
// meetings, events and competitions, and anyone can write session notes and portfolio sections.
import { $, $$, esc, icon, tag, strip, av, avStack, dot, bar, seg, wireSeg, lineChart, copyText } from './common.js';
import { api, session, isMentor, me } from '../api.js';

const D = (y, m, d) => new Date(y, m, d);
const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const pd = (s) => { const [y, m, d] = String(s || '').slice(0, 10).split('-').map(Number); return y ? new Date(y, (m || 1) - 1, d || 1) : null; };
const same = (a, b) => !!a && !!b && ymd(a) === ymd(b);
const fmtLong = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
const fmtFull = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
const fmtShort = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const fmtMon = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
const fmtMD = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const hm = (t) => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`; };
const myId = () => session.user?.id || '';
const isMine = (r) => r.user_id === myId();
const errMsg = (err) => (err && err.message) || 'That did not save. Try again.';
const loading = (t = 'Loading…') => `<div class="live-empty" role="status">${t}</div>`;
const empty = (t) => `<div class="live-empty">${t}</div>`;
const names = () => (session.roster || []).filter((p) => p.role === 'student').map((p) => p.name);
const allNames = () => (session.roster || []).map((p) => p.name);
const safeUrl = (u) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch (e) { return ''; } };
const lines = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);

// ================================================================= Calendar data
const C = { meet: 'var(--text)', big: 'var(--sys-launcher)', hub: 'var(--volt)', due: 'var(--warn)', out: 'var(--sys-power)', off: 'var(--stone)' };
const KINDS = [['meet', 'Meeting'], ['big', 'Competition'], ['due', 'Deadline'], ['out', 'Outreach'], ['off', 'No meeting'], ['hub', 'Milestone']];
const KICKOFF = D(2026, 8, 12);
const FIRST_MONTH = D(2026, 8, 1);
// The fixed, real season dates.
const FIXED = [
  { fixed: true, date: ymd(KICKOFF), kind: 'meet', title: 'Season kickoff', time: '', note: 'BIOBUZZ was revealed. Week 1 of the season.' },
  { fixed: true, date: ymd(D(2026, 11, 1)), kind: 'hub', title: 'Hub doors open', time: '', note: 'The Kilowattchaos Hub opens for the whole team.' },
];
// An event record: { title, start: 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:MM', end, place, kind, note, weekly, until }.
function occurs(ev, d) {
  const s = pd(ev.data.start);
  if (!s) return false;
  if (same(s, d)) return true;
  if (!ev.data.weekly || d < s || d.getDay() !== s.getDay()) return false;
  const u = pd(ev.data.until);
  if (u && d > u) return false;
  return !(ev.data.skip || []).includes(ymd(d));
}
function eventsOn(d, events) {
  const out = FIXED.filter((f) => f.date === ymd(d)).map((f) => ({ ...f }));
  for (const ev of events) {
    if (!occurs(ev, d)) continue;
    const st = String(ev.data.start || ''), en = String(ev.data.end || '');
    out.push({ id: ev.id, rec: ev, kind: ev.data.kind || 'meet', title: ev.data.title || 'Event', time: st.slice(11, 16), end: en.slice(11, 16), place: ev.data.place || '', note: ev.data.note || '', weekly: !!ev.data.weekly });
  }
  return out.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
}
const timeText = (e) => (e.time ? `${hm(e.time)}${e.end ? ` to ${hm(e.end)}` : ''}` : 'All day');

function icsFile(events) {
  const esc2 = (s) => String(s || '').replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
  const dt = (s) => s.replace(/[-:]/g, '') + (s.length > 10 ? '00' : '');
  const out = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kilowattchaos Hub//EN', 'X-WR-CALNAME:Kilowattchaos'];
  const add = (uid, title, start, end, place, note, rrule) => {
    const allDay = start.length <= 10;
    out.push('BEGIN:VEVENT', `UID:${uid}@kilowattchaos-hub`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
      allDay ? `DTSTART;VALUE=DATE:${dt(start)}` : `DTSTART:${dt(start)}`,
      ...(end && !allDay ? [`DTEND:${dt(end)}`] : []), `SUMMARY:${esc2(title)}`, ...(place ? [`LOCATION:${esc2(place)}`] : []), ...(note ? [`DESCRIPTION:${esc2(note)}`] : []), ...(rrule ? [rrule] : []), 'END:VEVENT');
  };
  FIXED.forEach((f, i) => add(`fixed-${i}`, f.title, f.date, '', '', f.note));
  for (const ev of events) {
    const d = ev.data, st = String(d.start || '');
    if (!st) continue;
    const end = d.end && String(d.end).length > 10 ? String(d.end) : '';
    add(ev.id, d.title, st, end, d.place, d.note, d.weekly ? `RRULE:FREQ=WEEKLY${d.until ? `;UNTIL=${String(d.until).replace(/-/g, '')}T235959` : ''}` : '');
  }
  out.push('END:VCALENDAR');
  return out.join('\r\n');
}

// ================================================================= Calendar
function calendar(view, ctx) {
  const today = dayStart(new Date());
  let events = [], rsvps = [], notes = [];
  let lastMonth = D(2027, 7, 1);
  const clampMonth = (m) => (m < FIRST_MONTH ? FIRST_MONTH : m > lastMonth ? lastMonth : m);
  let month = ctx.state.calMonth ? new Date(ctx.state.calMonth) : clampMonth(D(today.getFullYear(), today.getMonth(), 1));
  let sel = ctx.state.calSel ? new Date(ctx.state.calSel) : today;
  ctx.state.calSel = null;
  let editing = null; // null, 'new', or an event record
  view.innerHTML = `<div class="zv">
    ${strip('Every meeting, competition and deadline in one place. Pick a day to see what is happening and tell the team if you can come.', [],
      `<button class="btn soft pill sm" type="button" id="calIcs">${icon('calendar', 'i sm')}Add to my calendar</button>${isMentor() ? `<button class="btn primary pill sm" type="button" id="calAdd">${icon('plus', 'i sm')}Add event</button>` : ''}`)}
    <article class="card c8">
      <div class="cal-head"><button class="icon-btn sm" type="button" id="calPrev" aria-label="Previous month"><svg class="i sm" viewBox="0 0 24 24" aria-hidden="true" style="fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round"><path d="m15 6-6 6 6 6"/></svg></button><h4 id="calMonth" aria-live="polite"></h4><button class="btn ghost pill sm" type="button" id="calToday">Today</button><button class="icon-btn sm" type="button" id="calNext" aria-label="Next month"><svg class="i sm" viewBox="0 0 24 24" aria-hidden="true" style="fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round"><path d="m9 6 6 6-6 6"/></svg></button></div>
      <div class="cal" id="calGrid"></div>
      <div class="legend">${KINDS.map(([k, t]) => `<span><i class="${k === 'hub' ? 'lb-volt' : ''}" style="--c:${C[k]}"></i>${t}</span>`).join('')}</div>
    </article>
    <article class="card c4" id="calAgenda">${loading()}</article>
  </div>`;
  const grid = () => {
    $('#calMonth', view).textContent = fmtMon.format(month);
    $('#calPrev', view).disabled = month <= FIRST_MONTH;
    $('#calNext', view).disabled = month >= lastMonth;
    const first = D(month.getFullYear(), month.getMonth(), 1);
    const start = D(first.getFullYear(), first.getMonth(), 1 - first.getDay());
    const last = D(month.getFullYear(), month.getMonth() + 1, 0);
    const weeks = Math.ceil((first.getDay() + last.getDate()) / 7);
    let h = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => `<span class="dow">${d}</span>`).join('');
    for (let i = 0; i < weeks * 7; i++) {
      const d = D(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const ev = eventsOn(d, events);
      const cls = ['day', d.getMonth() !== month.getMonth() ? 'out' : '', same(d, today) ? 'today' : ''].filter(Boolean).join(' ');
      const label = `${fmtLong.format(d)}${same(d, today) ? ', today' : ''}. ${ev.length ? ev.map((e) => e.title).join(', ') : 'Nothing planned'}.`;
      const chips = ev.slice(0, 2).map((e) => `<span class="ev${e.kind === 'big' ? ' big' : e.kind === 'hub' ? ' hub' : ''}" style="--c:${C[e.kind] || C.meet}">${e.kind === 'hub' ? '' : '<i></i>'}<span>${esc(e.title)}</span></span>`).join('');
      const more = ev.length > 2 ? `<span class="cap lb-more">+${ev.length - 2} more</span>` : '';
      const dots = ev.length ? `<span class="dots">${ev.slice(0, 3).map((e) => `<i class="${e.kind === 'hub' ? 'lb-volt' : ''}" style="--c:${C[e.kind] || C.meet}"></i>`).join('')}</span>` : '';
      h += `<button type="button" class="${cls}" data-day="${ymd(d)}" aria-pressed="${same(d, sel)}" aria-label="${esc(label)}"><span class="dn">${d.getDate()}</span>${chips}${more}${dots}</button>`;
    }
    $('#calGrid', view).innerHTML = h;
  };
  const rsvpFor = (id, d) => rsvps.filter((r) => r.data.event === id && r.data.date === ymd(d));
  const evForm = (ev) => {
    const d = ev ? ev.data : {};
    const st = String(d.start || ymd(sel)), en = String(d.end || '');
    return `<div class="card-head"><h3 class="card-title">${ev ? 'Change event' : 'Add an event'}</h3></div>
      <form class="stack-v kc-evform" id="evForm" novalidate>
        <label class="field"><span>Title</span><input class="inp" name="title" maxlength="80" required value="${esc(d.title || '')}" placeholder="Team meeting"></label>
        <label class="field"><span>Kind</span><select class="inp" name="kind">${KINDS.map(([k, t]) => `<option value="${k}"${(d.kind || 'meet') === k ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
        <label class="field"><span>Date</span><input class="inp" type="date" name="date" required value="${esc(st.slice(0, 10))}"></label>
        <div class="kc-two"><label class="field"><span>Starts</span><input class="inp" type="time" name="t1" value="${esc(st.slice(11, 16))}"></label><label class="field"><span>Ends</span><input class="inp" type="time" name="t2" value="${esc(en.slice(11, 16))}"></label></div>
        <p class="cap kc-hint">Leave the times empty for an all-day event.</p>
        <label class="field"><span>Place</span><input class="inp" name="place" maxlength="80" value="${esc(d.place || '')}" placeholder="Shop room"></label>
        <label class="field"><span>Note</span><textarea class="inp" name="note" rows="2" maxlength="300" placeholder="What to bring, what we will do">${esc(d.note || '')}</textarea></label>
        <label class="kc-check"><input type="checkbox" name="weekly"${d.weekly ? ' checked' : ''}> Repeat every week on this day</label>
        <label class="field"><span>Repeat until</span><input class="inp" type="date" name="until" value="${esc(d.until || '')}"></label>
        <span class="ferr" id="evErr" aria-live="polite"></span>
        <div class="card-foot">${ev ? `<button class="btn ghost pill sm kc-danger" type="button" id="evDel">${icon('x', 'i sm')}Delete</button>` : ''}<button class="btn ghost pill sm" type="button" id="evCancel">Cancel</button><button class="btn primary pill sm" type="submit">${icon('check', 'i sm')}Save</button></div>
      </form>`;
  };
  const agenda = () => {
    const box = $('#calAgenda', view);
    if (editing) { box.innerHTML = evForm(editing === 'new' ? null : editing); wireForm(); return; }
    const ev = eventsOn(sel, events);
    const isPast = sel < today;
    const note = notes.find((n) => n.data.date === ymd(sel));
    box.innerHTML = `<div class="card-head"><h3 class="card-title">${same(sel, today) ? 'Today' : fmtLong.format(sel)}</h3>${same(sel, today) ? `<span class="tag">${fmtShort.format(sel)}</span>` : ''}</div>
      <div class="agenda2">${ev.length ? ev.map((e) => {
        const canRsvp = e.id && !isPast && !['off', 'hub', 'due'].includes(e.kind);
        const rs = e.id ? rsvpFor(e.id, sel) : [];
        const mine = rs.find(isMine);
        const going = rs.filter((r) => r.data.going === 'going').map((r) => r.author);
        const t = e.time ? hm(e.time).replace(/ (AM|PM)$/, '') : '';
        const ap = e.time ? hm(e.time).slice(-2) : '';
        return `<div class="agi"><time>${t ? `${t}<small>${ap}</small>` : '<small>All day</small>'}</time><div style="min-width:0"><div class="what">${e.kind === 'hub' ? '' : dot(C[e.kind] || C.meet, 8) + ' '}${esc(e.title)}${e.weekly ? ` <span class="cap">weekly</span>` : ''}</div>
          <div class="cap">${esc([e.time ? timeText(e) : '', e.place].filter(Boolean).join(' · '))}</div>
          ${e.note ? `<div class="cap" style="font-weight:400">${esc(e.note)}</div>` : ''}
          ${canRsvp ? `<div class="rs" role="group" aria-label="Can you come?">${[['going', 'Going'], ['maybe', 'Maybe'], ['no', "Can't make it"]].map(([v, tx]) => `<button class="btn soft pill sm lb-rsvp" type="button" data-rsvp="${esc(e.id)}" data-v="${v}" aria-pressed="${mine ? mine.data.going === v : false}">${tx}</button>`).join('')}</div>` : ''}
          ${going.length ? `<div class="row kc-going">${avStack(going.slice(0, 6), 22)}<span class="cap">${going.length} going</span></div>` : ''}
          ${e.kind === 'meet' && note ? `<div class="rs"><button class="btn soft pill sm" type="button" data-note="${esc(note.id)}">${icon('note', 'i sm')}Open the session note</button></div>` : ''}
          ${e.kind === 'big' ? `<div class="rs"><button class="btn soft pill sm" type="button" data-goto="logbook|Competitions">${icon('trophy', 'i sm')}Get ready</button></div>` : ''}
          ${isMentor() && e.rec ? `<div class="rs"><button class="btn ghost pill sm" type="button" data-evedit="${esc(e.id)}">${icon('note', 'i sm')}Change</button>${e.weekly ? `<button class="btn ghost pill sm" type="button" data-evskip="${esc(e.id)}">${icon('x', 'i sm')}Cancel just this day</button>` : ''}</div>` : ''}
        </div></div>`;
      }).join('') : `<p class="lead">Nothing planned on this day.</p>${note ? `<div class="rs"><button class="btn soft pill sm" type="button" data-note="${esc(note.id)}">${icon('note', 'i sm')}Open the session note</button></div>` : ''}`}</div>
      ${isMentor() ? `<div class="rs"><button class="btn soft pill sm" type="button" id="calAddDay">${icon('plus', 'i sm')}Add an event on this day</button></div>` : ''}
      <hr class="hr">
      <p class="cap" style="font-weight:400">${events.length ? 'Add the team calendar to your phone or laptop with Add to my calendar.' : isMentor() ? 'No meetings on the calendar yet. Press Add event, and tick Repeat every week for regular meetings.' : 'No meetings on the calendar yet. A mentor adds them here.'}</p>`;
  };
  const wireForm = () => {
    const f = $('#evForm', view);
    $('[name="title"]', f).focus({ preventScroll: true });
    $('#evCancel', view).addEventListener('click', () => { editing = null; agenda(); });
    const del = $('#evDel', view);
    if (del) del.addEventListener('click', async () => {
      if (!confirm('Delete this event for everyone? Repeating events are deleted on every day.')) return;
      try { await api.remove('event', editing.id); events = events.filter((x) => x !== editing); editing = null; grid(); agenda(); ctx.toast('Event deleted.'); }
      catch (err) { ctx.toast(errMsg(err)); }
    });
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = (n) => $(`[name="${n}"]`, f).value.trim();
      const err = $('#evErr', view);
      if (!v('title')) { err.textContent = 'Give the event a title.'; return; }
      if (!v('date')) { err.textContent = 'Pick a date.'; return; }
      if (v('t2') && !v('t1')) { err.textContent = 'Add a start time too, or leave both empty.'; return; }
      const data = { title: v('title'), kind: v('kind'), start: v('t1') ? `${v('date')}T${v('t1')}` : v('date'), end: v('t2') ? `${v('date')}T${v('t2')}` : '', place: v('place'), note: v('note'), weekly: $('[name="weekly"]', f).checked, until: v('until') };
      try {
        if (editing === 'new') events = [await api.create('event', data), ...events];
        else { const u = await api.update('event', editing.id, data); Object.assign(editing, { data: u.data }); }
        sel = pd(data.start); editing = null;
        show(sel); agenda();
        ctx.toast('Saved to the team calendar.');
      } catch (e2) { err.textContent = errMsg(e2); }
    });
  };
  const show = (d) => { month = clampMonth(D(d.getFullYear(), d.getMonth(), 1)); ctx.state.calMonth = +month; grid(); };
  grid();
  (async () => {
    try {
      const [e, r, n] = await Promise.all([api.list('event'), api.list('rsvp'), api.list('session')]);
      events = e; rsvps = r; notes = n;
      for (const ev of events) { const s = pd(ev.data.until || ev.data.start); if (s && s > lastMonth) lastMonth = D(s.getFullYear(), s.getMonth(), 1); }
      grid(); agenda();
    } catch (err) { $('#calAgenda', view).innerHTML = empty(`The calendar did not load. ${esc(errMsg(err))}`); }
  })();
  view.addEventListener('click', async (e) => {
    if (e.target.closest('#calIcs')) {
      try {
        const url = URL.createObjectURL(new Blob([icsFile(events)], { type: 'text/calendar' }));
        const a = document.createElement('a');
        a.href = url; a.download = 'kilowattchaos.ics';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        ctx.toast('Downloaded. Open the file to add the team events to your calendar app.');
      } catch (err) { ctx.toast('The download is blocked here.'); }
      return;
    }
    if (e.target.closest('#calAdd') || e.target.closest('#calAddDay')) { editing = 'new'; agenda(); if (matchMedia('(max-width: 1099px)').matches) $('#calAgenda', view).scrollIntoView({ behavior: ctx.reduced ? 'auto' : 'smooth', block: 'start' }); return; }
    const ed = e.target.closest('[data-evedit]');
    if (ed) { editing = events.find((x) => x.id === ed.dataset.evedit) || null; agenda(); return; }
    const sk = e.target.closest('[data-evskip]');
    if (sk) {
      const ev = events.find((x) => x.id === sk.dataset.evskip);
      try { const u = await api.update('event', ev.id, { skip: [...(ev.data.skip || []), ymd(sel)] }); ev.data = u.data; grid(); agenda(); ctx.toast(`Cancelled on ${fmtLong.format(sel)} only.`); }
      catch (err) { ctx.toast(errMsg(err)); }
      return;
    }
    if (e.target.closest('#calPrev')) { show(D(month.getFullYear(), month.getMonth() - 1, 1)); return; }
    if (e.target.closest('#calNext')) { show(D(month.getFullYear(), month.getMonth() + 1, 1)); return; }
    if (e.target.closest('#calToday')) { sel = today; editing = null; show(today); agenda(); return; }
    const dbtn = e.target.closest('[data-day]');
    if (dbtn) {
      sel = pd(dbtn.dataset.day);
      editing = null;
      if (sel.getMonth() !== month.getMonth()) show(sel);
      else $$('[data-day]', view).forEach((b) => b.setAttribute('aria-pressed', String(b === dbtn)));
      agenda();
      if (matchMedia('(max-width: 1099px)').matches) $('#calAgenda', view).scrollIntoView({ behavior: ctx.reduced ? 'auto' : 'smooth', block: 'nearest' });
      return;
    }
    const r = e.target.closest('[data-rsvp]');
    if (r) {
      const id = r.dataset.rsvp, v = r.dataset.v, date = ymd(sel);
      const mine = rsvps.find((x) => isMine(x) && x.data.event === id && x.data.date === date);
      $$(`[data-rsvp="${CSS.escape(id)}"]`, view).forEach((b) => { b.disabled = true; });
      try {
        if (mine && mine.data.going === v) { await api.remove('rsvp', mine.id); rsvps = rsvps.filter((x) => x !== mine); }
        else if (mine) { const u = await api.update('rsvp', mine.id, { going: v }); mine.data = u.data; }
        else rsvps = [await api.create('rsvp', { event: id, date, going: v }), ...rsvps];
        const now = rsvps.find((x) => isMine(x) && x.data.event === id && x.data.date === date);
        const g = now ? now.data.going : '';
        agenda();
        ctx.toast(g === 'going' ? 'Thanks! The team can see you are coming.' : g === 'maybe' ? 'Got it. Tell the team when you know.' : g === 'no' ? 'Thanks for letting us know. The session note will catch you up.' : 'Answer cleared.');
      } catch (err) { ctx.toast(errMsg(err)); agenda(); }
      return;
    }
    const n = e.target.closest('[data-note]');
    if (n) { ctx.state.note = n.dataset.note; ctx.go('logbook', 'Sessions'); }
  });
}

// ================================================================= Sessions
// A session record: { date, title, goal, did: [[sys, text]], tests: [[test, result]], problems: [text], came: [names],
// scribe, like, wonder, whatif, photos: [links], next: [[text, [names]]] }.
function sessions(view, ctx) {
  let notes = [];
  let cur = ctx.state.note || null;
  ctx.state.note = null;
  let editing = null; // null, 'new' or a record
  view.innerHTML = `<div class="zv">
    ${strip('One note per meeting: who came, what we tried, the numbers, and what is next. Anyone on the team can write or fix a note. Good notes make the Engineering Portfolio much easier to write.', [],
      `<button class="btn primary pill sm" type="button" id="sessNew">${icon('plus', 'i sm')}Start today's note</button>`)}
    <article class="card c4">
      <div class="card-head"><h3 class="card-title">Session notes</h3><span class="tag" id="sessCount"></span></div>
      <div class="notes-list" id="sessList">${loading()}</div>
    </article>
    <article class="card c8" id="sessView">${loading()}</article>
  </div>`;
  const sysName = (k) => (ctx.SYS && ctx.SYS[k] ? ctx.SYS[k].name : 'Note');
  const sysC = (k) => (ctx.SYS && ctx.SYS[k] ? ctx.SYS[k].c : 'var(--stone)');
  const sorted = () => [...notes].sort((a, b) => String(b.data.date).localeCompare(String(a.data.date)) || new Date(b.created_at) - new Date(a.created_at));
  const list = () => {
    const ns = sorted();
    $('#sessCount', view).textContent = `${ns.length} note${ns.length === 1 ? '' : 's'}`;
    $('#sessList', view).innerHTML = ns.length ? ns.map((n) => {
      const came = n.data.came || [];
      return `<button class="it" type="button" data-n="${esc(n.id)}" aria-pressed="${!editing && n.id === cur}"><span class="oc2">${icon('note', 'i sm')}</span><div class="grow"><div class="t">${esc(n.data.title || 'Session note')}</div><div class="meta cap">${pd(n.data.date) ? fmtShort.format(pd(n.data.date)) : ''} · ${came.length} came</div></div><span class="end">${avStack(came.slice(0, 3), 22)}</span></button>`;
    }).join('') : empty('No notes yet. After your next meeting, press Start today\'s note.');
  };
  const note = () => {
    const box = $('#sessView', view);
    const n = notes.find((x) => x.id === cur) || sorted()[0];
    if (!n) {
      box.innerHTML = `<div class="lb-empty"><span class="oc2">${icon('note', 'i sm')}</span><div><b>No session notes yet</b><p class="cap" style="font-weight:400">Write one at your next meeting: who came, what you tried, the numbers and what is next.</p></div></div>`;
      return;
    }
    cur = n.id;
    const d = n.data, date = pd(d.date) || new Date(n.created_at);
    const came = d.came || [], did = d.did || [], tests = d.tests || [], probs = d.problems || [], photos = (d.photos || []).map(safeUrl).filter(Boolean), next = d.next || [];
    const refl = [['I like', d.like], ['I wonder', d.wonder], ['What if', d.whatif]].filter(([, t]) => t);
    const total = names().length;
    box.innerHTML = `<div class="card-head"><h3 class="card-title">${esc(d.title || 'Session note')}</h3>${isMine(n) ? tag('Yours', 'volt') : ''}</div>
      <div class="row wrap between"><span class="cap">${fmtFull.format(date)}</span>${n.updated_at && n.updated_at !== n.created_at && d.editedBy ? `<span class="cap">Last changed by ${esc(d.editedBy)}</span>` : ''}</div>
      <div class="row wrap lb-who"><span class="row">${avStack(came, 26)}<span class="cap">${came.length}${total ? ` of ${total}` : ''} came</span></span>${d.scribe ? `<span class="row">${av(d.scribe, 22)}<span class="cap">Notes by ${esc(d.scribe)}</span></span>` : ''}</div>
      ${d.goal ? `<div class="note-sec"><h4>Goal for the day</h4><p class="lb-p">${esc(d.goal)}</p></div>` : ''}
      <div class="note-sec"><h4>What we did</h4>${did.length ? `<div>${did.map(([s, t]) => `<div class="did"><b>${dot(sysC(s), 8)}${esc(sysName(s))}</b><span>${esc(t)}</span></div>`).join('')}</div>` : '<p class="cap" style="font-weight:400">Nothing written yet.</p>'}</div>
      ${tests.length ? `<div class="note-sec"><h4>Tests</h4><div class="items">${tests.map(([t, r]) => `<div class="it"><span class="oc2">${icon('sliders', 'i sm')}</span><div class="grow"><div class="t">${esc(t)}</div><div class="meta cap"><b class="lb-res">${esc(r || 'Result not written')}</b></div></div></div>`).join('')}</div></div>` : ''}
      <div class="note-sec"><h4>Problems</h4>${probs.length ? `<ul class="checks">${probs.map((t) => `<li><span class="ci warn">${icon('alert')}</span><span>${esc(t)}</span></li>`).join('')}</ul>` : '<p class="cap" style="font-weight:400">No problems written down this time.</p>'}</div>
      <div class="note-sec"><h4>Photos</h4>${photos.length ? `<div class="kc-photos">${photos.map((p) => `<a class="btn soft pill sm" href="${esc(p)}" target="_blank" rel="noopener noreferrer">${icon('camera', 'i sm')}${esc(new URL(p).hostname.replace(/^www\./, ''))}</a>`).join('')}</div>` : '<p class="cap" style="font-weight:400">No photo links yet. Add links to photos of parts and tests, never of faces.</p>'}</div>
      ${refl.length ? `<div class="note-sec"><h4>Reflections</h4><div class="refl">${refl.map(([k, t]) => `<div>${av(d.scribe || n.author, 26)}<span><b>${k}</b><br>${esc(t)}</span></div>`).join('')}</div></div>` : ''}
      ${next.length ? `<div class="note-sec"><h4>Next steps</h4><div class="items">${next.map(([t, who]) => `<div class="it"><span class="oc2">${icon('check', 'i sm')}</span><div class="grow"><div class="t">${esc(t)}</div><div class="meta cap">${esc((who || []).join(' and '))}</div></div><span class="end">${avStack(who || [], 24)}</span></div>`).join('')}</div></div>` : ''}
      <div class="card-foot"><span class="cap">Notes like this one feed the Portfolio.</span><div class="row wrap"><button class="btn soft pill sm" type="button" id="sessEdit">${icon('note', 'i sm')}Edit</button><button class="btn soft pill sm" type="button" id="sessCopy">${icon('note', 'i sm')}Copy as text</button>${isMine(n) || isMentor() ? `<button class="btn ghost pill sm kc-danger" type="button" id="sessDel">${icon('x', 'i sm')}Delete</button>` : ''}</div></div>`;
    $('#sessCopy', view).addEventListener('click', () => copyText(asText(n.data, sysName), ctx.toast));
  };
  const form = async (rec) => {
    const d = rec ? rec.data : {};
    const now = new Date();
    let came = d.came;
    if (!rec) {
      came = [];
      try { const info = await api.checkinInfo(); came = (info.here || []).map((h) => h.name); } catch (err) { /* nobody listed */ }
    }
    const people = allNames();
    for (const n of came || []) if (!people.includes(n)) people.push(n);
    const opts = (v) => ['', ...(ctx.SYS_ORDER || [])].map((k) => `<option value="${k}"${k === v ? ' selected' : ''}>${k ? esc(sysName(k)) : 'Pick a subsystem'}</option>`).join('');
    const did = [...(d.did || [])];
    while (did.length < 3) did.push(['', '']);
    const scribe = d.scribe || me();
    $('#sessView', view).innerHTML = `<div class="card-head"><h3 class="card-title">${rec ? 'Edit the note' : "Today's note"}</h3>${tag(fmtShort.format(rec ? pd(d.date) || now : now))}</div>
      <p class="lead">${rec ? 'Fix or add anything. Everyone on the team can edit notes.' : 'Fill this in during the meeting.'} Write what happened in your own words, with numbers.</p>
      <div class="note-sec"><h4>Who came</h4>${!rec ? '<p class="cap" style="font-weight:400">Everyone who checked in today is picked already.</p>' : ''}<div class="chips" id="sessCame">${people.map((k) => `<button class="chip" type="button" data-came="${esc(k)}" aria-pressed="${(came || []).includes(k)}">${av(k, 20)}${esc(k)}</button>`).join('')}</div></div>
      <div class="form-grid">
        <label class="field"><span>Date</span><input class="inp" type="date" id="sessDate" value="${esc(d.date || ymd(now))}"></label>
        <label class="field"><span>Who is taking notes</span><select class="inp" id="sessScribe">${people.map((k) => `<option${k === scribe ? ' selected' : ''}>${esc(k)}</option>`).join('')}</select></label>
        <label class="field full"><span>Title</span><input class="inp" id="sessTitle" maxlength="80" value="${esc(d.title || '')}" placeholder="Like: Gecko wheels 6 mm closer"></label>
        <label class="field full"><span>Goal for the day</span><textarea class="inp" id="sessGoal" rows="2" placeholder="What do we want to find out or finish today?">${esc(d.goal || '')}</textarea></label>
      </div>
      <div class="note-sec"><h4>What we did</h4><div id="sessDid">${did.map(([s, t], i) => `<div class="lb-didf"><select class="inp" data-dsys="${i}" aria-label="Subsystem for row ${i + 1}">${opts(s)}</select><input class="inp" data-dtxt="${i}" value="${esc(t)}" aria-label="What happened, row ${i + 1}" placeholder="What happened, with a number"></div>`).join('')}</div>
        <button class="btn ghost pill sm" type="button" id="sessMore">${icon('plus', 'i sm')}Another row</button></div>
      <div class="form-grid">
        <label class="field"><span>Tests and results</span><textarea class="inp" id="sessTests" rows="3" placeholder="One per line, like: Pile pickup, 6 mm: 8 of 10">${esc((d.tests || []).map(([a, b]) => (b ? `${a}: ${b}` : a)).join('\n'))}</textarea></label>
        <label class="field"><span>Problems</span><textarea class="inp" id="sessProb" rows="3" placeholder="One per line">${esc((d.problems || []).join('\n'))}</textarea></label>
        <label class="field"><span>I like</span><textarea class="inp" id="sessLike" rows="2">${esc(d.like || '')}</textarea></label>
        <label class="field"><span>I wonder</span><textarea class="inp" id="sessWonder" rows="2">${esc(d.wonder || '')}</textarea></label>
        <label class="field"><span>What if</span><textarea class="inp" id="sessWhatif" rows="2">${esc(d.whatif || '')}</textarea></label>
        <label class="field"><span>Next steps</span><textarea class="inp" id="sessNext" rows="2" placeholder="One per line, like: Print the hubs (Nova)">${esc((d.next || []).map(([t, w]) => (w && w.length ? `${t} (${w.join(', ')})` : t)).join('\n'))}</textarea><small>Put a name in brackets so everyone knows who owns it.</small></label>
        <label class="field full"><span>Photo links</span><textarea class="inp" id="sessPhotos" rows="2" placeholder="One link per line, from the team photo folder">${esc((d.photos || []).join('\n'))}</textarea><small>Photos of parts and tests only, never of faces.</small></label>
      </div>
      <span class="ferr" id="sessErr" aria-live="polite"></span>
      <div class="card-foot"><button class="btn ghost pill" type="button" id="sessCancel">Cancel</button><button class="btn primary pill" type="button" id="sessSave">${icon('check', 'i sm')}Save note</button></div>`;
    $('#sessMore', view).addEventListener('click', () => {
      const i = $$('[data-dtxt]', view).length;
      $('#sessDid', view).insertAdjacentHTML('beforeend', `<div class="lb-didf"><select class="inp" data-dsys="${i}" aria-label="Subsystem for row ${i + 1}">${opts('')}</select><input class="inp" data-dtxt="${i}" aria-label="What happened, row ${i + 1}" placeholder="What happened, with a number"></div>`);
      $(`[data-dtxt="${i}"]`, view).focus();
    });
    $('#sessGoal', view).focus({ preventScroll: true });
  };
  const save = async () => {
    const v = (id) => $(id, view).value.trim();
    const goal = v('#sessGoal');
    const did = $$('[data-dtxt]', view).map((inp) => [$(`[data-dsys="${inp.dataset.dtxt}"]`, view).value, inp.value.trim()]).filter(([, t]) => t);
    if (!goal && !did.length && !v('#sessTitle')) { $('#sessErr', view).textContent = 'Write a title, the goal or one thing you did first.'; $('#sessGoal', view).focus(); return; }
    const scribe = $('#sessScribe', view).value;
    const people = allNames();
    const photos = lines(v('#sessPhotos')).map(safeUrl);
    if (photos.some((p) => !p)) { $('#sessErr', view).textContent = 'Each photo link should start with https://'; $('#sessPhotos', view).focus(); return; }
    const data = {
      date: v('#sessDate') || ymd(new Date()), title: v('#sessTitle') || 'Team meeting', goal, did, scribe,
      came: $$('[data-came][aria-pressed="true"]', view).map((b) => b.dataset.came),
      tests: lines(v('#sessTests')).map((t) => { const [a, ...b] = t.split(':'); return [a.trim(), b.join(':').trim()]; }),
      problems: lines(v('#sessProb')),
      like: v('#sessLike'), wonder: v('#sessWonder'), whatif: v('#sessWhatif'), photos,
      next: lines(v('#sessNext')).map((t) => { const m = t.match(/^(.*?)\s*\(([^)]+)\)\s*$/); const who = m ? m[2].split(/,| and /).map((s) => s.trim()).filter((s) => people.includes(s)) : []; return [m ? m[1] : t, who]; }),
      editedBy: me(),
    };
    const btn = $('#sessSave', view);
    btn.disabled = true;
    try {
      if (editing === 'new') { const n = await api.create('session', data); notes = [n, ...notes]; cur = n.id; }
      else { const u = await api.update('session', editing.id, data); Object.assign(editing, { data: u.data, updated_at: u.updated_at }); cur = editing.id; }
      editing = null; list(); note();
      ctx.toast('Saved. The whole team can see it now.');
    } catch (err) { $('#sessErr', view).textContent = errMsg(err); btn.disabled = false; }
  };
  const toView = () => { if (matchMedia('(max-width: 1099px)').matches) $('#sessView', view).scrollIntoView({ behavior: ctx.reduced ? 'auto' : 'smooth', block: 'start' }); };
  (async () => {
    try { notes = await api.list('session'); list(); note(); }
    catch (err) { $('#sessList', view).innerHTML = empty(`Notes did not load. ${esc(errMsg(err))}`); $('#sessView', view).innerHTML = ''; }
  })();
  view.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-n]');
    if (b) { cur = b.dataset.n; editing = null; list(); note(); toView(); return; }
    if (e.target.closest('#sessNew')) {
      const todays = notes.find((n) => n.data.date === ymd(new Date()));
      if (todays && !confirm('There is already a note for today. Start another one anyway? Press Cancel to edit today\'s note instead.')) { editing = todays; cur = todays.id; list(); await form(todays); toView(); return; }
      editing = 'new'; list(); await form(null); toView(); return;
    }
    if (e.target.closest('#sessEdit')) { editing = notes.find((n) => n.id === cur); list(); await form(editing); toView(); return; }
    if (e.target.closest('#sessDel')) {
      const n = notes.find((x) => x.id === cur);
      if (!n || !confirm('Delete this session note for everyone?')) return;
      try { await api.remove('session', n.id); notes = notes.filter((x) => x !== n); cur = null; list(); note(); ctx.toast('Note deleted.'); }
      catch (err) { ctx.toast(errMsg(err)); }
      return;
    }
    const c = e.target.closest('[data-came]');
    if (c) { c.setAttribute('aria-pressed', String(c.getAttribute('aria-pressed') !== 'true')); return; }
    if (e.target.closest('#sessCancel')) { editing = null; list(); note(); return; }
    if (e.target.closest('#sessSave')) save();
  });
}
function asText(d, sysName) {
  const date = pd(d.date);
  return [`${d.title || 'Session note'}${date ? ` (${fmtLong.format(date)})` : ''}`, `Came: ${(d.came || []).join(', ') || 'not written'}.${d.scribe ? ` Notes by ${d.scribe}.` : ''}`,
    ...(d.goal ? [`Goal: ${d.goal}`] : []), ...((d.did || []).length ? ['What we did:', ...d.did.map(([s, t]) => `- ${sysName(s)}: ${t}`)] : []),
    ...((d.tests || []).length ? ['Tests:', ...d.tests.map(([t, r]) => `- ${t}: ${r}`)] : []), ...((d.problems || []).length ? ['Problems:', ...d.problems.map((t) => `- ${t}`)] : []),
    ...([d.like, d.wonder, d.whatif].some(Boolean) ? ['Reflections:', ...[['I like', d.like], ['I wonder', d.wonder], ['What if', d.whatif]].filter(([, t]) => t).map(([k, t]) => `- ${k}: ${t}`)] : []),
    ...((d.next || []).length ? ['Next steps:', ...d.next.map(([t, who]) => `- ${t}${who && who.length ? ` (${who.join(' and ')})` : ''}`)] : []),
    ...((d.photos || []).length ? ['Photos:', ...d.photos.map((p) => `- ${p}`)] : [])].join('\n');
}

// ================================================================= Portfolio sections (shared with Progress)
const SECS = [
  { id: 'team', t: 'Team', ic: 'users', kick: 'Our team', title: 'Meet Kilowattchaos' },
  { id: 'outreach', t: 'Outreach', ic: 'chat', kick: 'Outreach', title: 'Sharing robotics' },
  { id: 'design', t: 'Design process', ic: 'bulb', kick: 'Design process', title: 'How we choose' },
  { id: 'robot', t: 'Robot overview', ic: 'bot', kick: 'Robot overview', title: 'Our robot', img: true },
  { id: 'intake', t: 'Intake', ic: 'wrench', kick: 'Subsystem', title: 'Intake', sys: 'intake' },
  { id: 'launcher', t: 'Launcher', ic: 'zap', kick: 'Subsystem', title: 'Launcher', sys: 'launcher' },
  { id: 'code', t: 'Code', ic: 'code', kick: 'Subsystem', title: 'Code' },
];
const pfStatus = (rec) => (rec && rec.data.status) || (rec && rec.data.text ? 'Started' : 'Empty');
const pfLatest = (recs, id) => recs.filter((r) => r.data.sec === id).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0];

// ================================================================= Progress
const isDone = (r) => { const d = r.data || {}; return d.done === true || ['done', 'shipped', 'finished', 'picked'].includes(String(d.status || d.st || d.col || '').toLowerCase()); };
function progress(view, ctx) {
  const { SYS } = ctx;
  view.innerHTML = `<div class="zv">
    ${strip('How far the team has come this season. Every number here is counted from what the team saved in the Hub: session notes, tasks, prints, check-ins and the portfolio.', [])}
    <article class="card c7" id="pgStand">${loading()}</article>
    <article class="card c5" id="pgSys">${loading()}</article>
    <article class="card c7" id="pgChart">${loading()}</article>
    <article class="card c5" id="pgKpi">${loading()}</article>
  </div>`;
  const safeList = async (k) => { try { return await api.list(k); } catch (e) { return []; } };
  (async () => {
    const [sess, tasks, prints, ideas, pf] = await Promise.all(['session', 'task', 'print', 'idea', 'portfolio'].map(safeList));
    const students = names().length;
    const hereToday = (session.roster || []).filter((p) => p.here && p.role === 'student').length;
    const tDone = tasks.filter(isDone).length, pDone = prints.filter(isDone).length;
    const drafted = SECS.filter((s) => pfStatus(pfLatest(pf, s.id)) === 'Drafted').length;
    const rows = [
      ['Checked in today', hereToday, students, 'students', 'var(--ok)'],
      ['Tasks finished', tDone, tasks.length, 'tasks', 'var(--sys-drivetrain)'],
      ['Prints done', pDone, prints.length, 'prints', 'var(--sys-intake)'],
      ['Portfolio sections drafted', drafted, SECS.length, 'sections', 'var(--volt)'],
    ];
    $('#pgStand', view).innerHTML = `<div class="card-head"><h3 class="card-title">Where things stand</h3></div>
      <div class="goals">${rows.map(([t, v, g, u, c]) => `<div class="goal"><div class="row"><span class="t row" style="gap:8px">${dot(c, 8)}${t}</span><span class="v">${v} <span class="cap">of ${g} ${u}</span></span></div>${bar(g ? (v / g) * 100 : 0, `${t}: ${v} of ${g}`)}</div>`).join('')}</div>
      ${!tasks.length && !prints.length ? '<p class="cap" style="font-weight:400">No tasks or prints yet. Add them in Build, and they count here.</p>' : ''}`;
    // Which subsystems the notes talk about most.
    const sysCount = {};
    for (const n of sess) for (const [s] of n.data.did || []) if (s) sysCount[s] = (sysCount[s] || 0) + 1;
    const top = Object.entries(sysCount).sort((a, b) => b[1] - a[1]);
    const maxS = top.length ? top[0][1] : 1;
    $('#pgSys', view).innerHTML = `<div class="card-head"><h3 class="card-title">Work by subsystem</h3></div>
      ${top.length ? `<div class="goals">${top.map(([k, n]) => `<button class="goal kc-sysrow" type="button" data-sys="${esc(k)}"><div class="row"><span class="t row" style="gap:8px">${dot(SYS[k] ? SYS[k].c : 'var(--stone)', 8)}${esc(SYS[k] ? SYS[k].name : k)}</span><span class="v">${n} <span class="cap">note row${n === 1 ? '' : 's'}</span></span></div>${bar((n / maxS) * 100, `${n} rows`)}</button>`).join('')}</div><p class="cap" style="font-weight:400">Counted from What we did in the session notes. Pick one to open its page.</p>`
        : empty('Nothing yet. When session notes say which subsystem you worked on, it shows up here.')}`;
    const byDate = [...sess].filter((n) => pd(n.data.date)).sort((a, b) => String(a.data.date).localeCompare(String(b.data.date))).slice(-8);
    const small = matchMedia('(max-width: 759px)').matches;
    $('#pgChart', view).innerHTML = `<div class="card-head"><h3 class="card-title">Attendance at each meeting</h3></div>
      ${byDate.length >= 2 ? `${lineChart({ points: byDate.map((n) => (n.data.came || []).length), max: Math.max(students, ...byDate.map((n) => (n.data.came || []).length), 1), w: small ? 340 : 560, h: small ? 220 : 200, labels: byDate.map((n) => fmtMD.format(pd(n.data.date))), highlight: byDate.length - 1, ariaLabel: `Attendance at the last ${byDate.length} meetings: ${byDate.map((n) => `${fmtMD.format(pd(n.data.date))}, ${(n.data.came || []).length}`).join('; ')}.` })}<p class="cap" style="font-weight:400">From Who came in the last ${byDate.length} session notes.</p>`
        : empty(byDate.length ? 'One note so far. After the next meeting, a chart of who came shows up here.' : 'No session notes yet. After two meetings with notes, a chart of who came shows up here.')}`;
    const avg = sess.length ? (sess.reduce((a, n) => a + (n.data.came || []).length, 0) / sess.length).toFixed(1) : '0';
    const tests = sess.reduce((a, n) => a + (n.data.tests || []).length, 0);
    $('#pgKpi', view).innerHTML = `<div class="card-head"><h3 class="card-title">Season so far</h3></div>
      <div class="kpis lb-kpis">
        <div class="kpi"><div class="lab">Session notes</div><div class="val">${sess.length}</div></div>
        <div class="kpi"><div class="lab">Average attendance</div><div class="val">${avg}${students ? `<small>of ${students}</small>` : ''}</div></div>
        <div class="kpi"><div class="lab">Tests written down</div><div class="val">${tests}</div></div>
        <div class="kpi"><div class="lab">Ideas</div><div class="val">${ideas.length}</div></div>
        <div class="kpi"><div class="lab">Prints</div><div class="val">${prints.length}</div></div>
        <div class="kpi"><div class="lab">Season week</div><div class="val">${ctx.seasonWeek ? ctx.seasonWeek(new Date()) : ''}</div></div>
      </div>`;
  })();
  view.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sys]');
    if (b) { ctx.state.sys = b.dataset.sys; ctx.go('robot', 'Subsystems'); }
  });
}

// ================================================================= Competitions
// A competition record: { name, date: 'YYYY-MM-DD', time, place, results, awards, learned }.
const PACK = [
  ['Robot', ['The robot', 'Three charged batteries', 'Battery charger', 'Driver Station phone and cable', 'Two gamepads', 'Spare servo and spare gecko wheels']],
  ['Tools', ['Hex keys and screwdrivers', 'Zip ties and tape', 'Spare screws and nuts', 'Safety glasses for everyone', 'Power strip and extension cord']],
  ['Team', ['Team shirts', 'Printed Engineering Portfolio', 'Permission slips', 'Water and snacks', 'Our pit sign']],
];
const INSPECT = ['Robot fits inside the starting size', 'Battery is held down tight and the main switch is easy to reach', 'No sharp edges or loose parts', 'All wires are tied down and away from moving parts', 'Team number signs are on the robot', 'Control Hub and Driver Station software are up to date', 'Robot stops when the Driver Station says stop'];
function competitions(view, ctx) {
  let packed = [];
  try { packed = JSON.parse(ctx.local.get('kwc-pack') || '[]'); if (!Array.isArray(packed)) packed = []; } catch (e) { packed = []; }
  let comps = [];
  let editing = null;
  const total = PACK.reduce((a, [, l]) => a + l.length, 0);
  const tick = (id, label, on, kind) => `<button class="tick" type="button" role="checkbox" aria-checked="${on}" data-${kind}="${esc(id)}"><span class="bx">${icon('check')}</span><span>${esc(label)}</span></button>`;
  view.innerHTML = `<div class="zv">
    ${strip('Everything for competition day: how long is left, what to pack, a practice inspection, and our results.', [], isMentor() ? `<button class="btn primary pill sm" type="button" id="compAdd">${icon('plus', 'i sm')}Add a competition</button>` : '')}
    <article class="card c7" id="compNext">${loading()}</article>
    <article class="card c5">
      <div class="card-head"><h3 class="card-title">A typical meet day</h3></div>
      <div class="sched">${[['Morning', 'Load-in and set up the pit'], ['Then', 'Robot inspection'], ['During the day', 'Judging interview'], ['Most of the day', 'Qualification matches'], ['End', 'Awards']].map(([t, w]) => `<div><time>${t}</time><span>${w}</span></div>`).join('')}</div>
      <p class="cap" style="font-weight:400">The real schedule comes from the event, usually about a week before. In an FTC league, the team plays at league meets during the season, and the league tournament at the end decides who moves on.</p>
    </article>
    <article class="card c6">
      <div class="card-head"><h3 class="card-title">Packing list</h3><span class="tag" id="packCount"></span><button class="btn ghost pill sm" type="button" id="packReset">${icon('reset', 'i sm')}Reset</button></div>
      ${bar(0, 'Packed')}
      <div class="pack" id="packList">${PACK.map(([g, items]) => `<div><h5>${g}</h5>${items.map((t) => tick(`${g}:${t}`, t, packed.includes(`${g}:${t}`), 'pk')).join('')}</div>`).join('')}</div>
      <p class="cap" style="font-weight:400">Your ticks are saved on this device.</p>
    </article>
    <article class="card c6">
      <div class="card-head"><h3 class="card-title">Practice inspection</h3><span class="tag" id="inspCount"></span></div>
      <div class="callout lb-soft">${icon('alert')}<div><b>Practice only.</b> These are reminders, not the rules. The official inspection checklist is in FIRST's <a href="https://ftc.game/manual/" target="_blank" rel="noopener">Competition Manual</a>.</div></div>
      <div class="pack" id="inspList">${INSPECT.map((t, i) => tick(String(i), t, false, 'ins')).join('')}</div>
    </article>
    <article class="card" id="compAll">${loading()}</article>
  </div>`;
  const dateOf = (c) => { const d = pd(c.data.date); if (!d) return null; if (c.data.time) { const [h, m] = c.data.time.split(':').map(Number); d.setHours(h, m); } return d; };
  const upcoming = () => comps.filter((c) => dateOf(c) && dayStart(dateOf(c)) >= dayStart(new Date())).sort((a, b) => dateOf(a) - dateOf(b))[0];
  const count = () => {
    const el = $('#compCount', view);
    const c = upcoming();
    if (!el || !c) return;
    const ms = Math.max(0, dateOf(c) - Date.now());
    const d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.floor((ms % 36e5) / 6e4);
    el.innerHTML = ms ? `<span><b>${d}</b> <span class="cap">days</span></span><span><b>${h}</b> <span class="cap">hours</span></span><span><b>${m}</b> <span class="cap">min</span></span>` : '<b>Today!</b>';
  };
  const nextCard = () => {
    const c = upcoming();
    const box = $('#compNext', view);
    if (!c) {
      box.innerHTML = `<div class="card-head"><h3 class="card-title">Next competition</h3></div>
        <div class="lb-empty"><span class="oc2">${icon('trophy', 'i sm')}</span><div><b>No competition on the list yet</b><p class="cap" style="font-weight:400">${isMentor() ? 'When the league posts the dates, press Add a competition. The countdown starts right away.' : 'A mentor adds competitions here when the league posts the dates. Then a countdown appears.'}</p></div></div>`;
      return;
    }
    const d = dateOf(c);
    box.innerHTML = `<div class="card-head"><h3 class="card-title">${esc(c.data.name || 'Competition')}</h3></div>
      <div class="countdown" id="compCount" role="timer" aria-label="Time until ${esc(c.data.name || 'the competition')}"></div>
      <p class="lead">${fmtFull.format(d)}${c.data.time ? `. Starts at ${hm(c.data.time)}` : ''}.${c.data.place ? ` ${esc(c.data.place)}.` : ''}</p>
      <div class="row wrap"><button class="btn soft pill sm" type="button" data-cal="${esc(c.data.date)}">${icon('calendar', 'i sm')}See it on the calendar</button><button class="btn soft pill sm" type="button" data-goto="logbook|Portfolio">${icon('book', 'i sm')}Get the portfolio ready</button></div>`;
    count();
  };
  const compForm = (c) => {
    const d = c ? c.data : {};
    return `<div class="card-head"><h3 class="card-title">${c ? 'Change competition' : 'Add a competition'}</h3></div>
      <form class="form-grid" id="compForm" novalidate>
        <label class="field"><span>Event name</span><input class="inp" name="name" maxlength="80" value="${esc(d.name || '')}" placeholder="League meet 1"></label>
        <label class="field"><span>Place</span><input class="inp" name="place" maxlength="100" value="${esc(d.place || '')}" placeholder="The school or venue"></label>
        <label class="field"><span>Date</span><input class="inp" type="date" name="date" value="${esc(d.date || '')}"></label>
        <label class="field"><span>Start time</span><input class="inp" type="time" name="time" value="${esc(d.time || '')}"></label>
        <label class="field full"><span>Results</span><textarea class="inp" name="results" rows="2" maxlength="600" placeholder="Match scores and our ranking">${esc(d.results || '')}</textarea></label>
        <label class="field"><span>Awards</span><textarea class="inp" name="awards" rows="2" maxlength="300">${esc(d.awards || '')}</textarea></label>
        <label class="field"><span>What we learned</span><textarea class="inp" name="learned" rows="2" maxlength="600">${esc(d.learned || '')}</textarea></label>
        <span class="ferr full" id="compErr" aria-live="polite"></span>
        <div class="card-foot full">${c ? `<button class="btn ghost pill sm kc-danger" type="button" id="compDel">${icon('x', 'i sm')}Delete</button>` : ''}<button class="btn ghost pill sm" type="button" id="compCancel">Cancel</button><button class="btn primary pill sm" type="submit">${icon('check', 'i sm')}Save</button></div>
      </form>`;
  };
  const allCard = () => {
    const box = $('#compAll', view);
    if (editing) {
      box.innerHTML = compForm(editing === 'new' ? null : editing);
      const f = $('#compForm', box);
      $('[name="name"]', f).focus();
      $('#compCancel', box).addEventListener('click', () => { editing = null; allCard(); });
      const del = $('#compDel', box);
      if (del) del.addEventListener('click', async () => {
        if (!confirm('Delete this competition and its results?')) return;
        try { await api.remove('competition', editing.id); comps = comps.filter((x) => x !== editing); editing = null; allCard(); nextCard(); ctx.toast('Deleted.'); } catch (err) { ctx.toast(errMsg(err)); }
      });
      f.addEventListener('submit', async (e) => {
        e.preventDefault();
        const v = (n) => $(`[name="${n}"]`, f).value.trim();
        if (!v('name')) { $('#compErr', box).textContent = 'Give the event a name.'; return; }
        if (!v('date')) { $('#compErr', box).textContent = 'Pick the date.'; return; }
        const data = { name: v('name'), place: v('place'), date: v('date'), time: v('time'), results: v('results'), awards: v('awards'), learned: v('learned') };
        try {
          if (editing === 'new') comps = [await api.create('competition', data), ...comps];
          else { const u = await api.update('competition', editing.id, data); editing.data = u.data; }
          editing = null; allCard(); nextCard(); ctx.toast('Saved.');
        } catch (err) { $('#compErr', box).textContent = errMsg(err); }
      });
      box.scrollIntoView({ behavior: ctx.reduced ? 'auto' : 'smooth', block: 'start' });
      return;
    }
    const list = [...comps].sort((a, b) => String(a.data.date).localeCompare(String(b.data.date)));
    box.innerHTML = `<div class="card-head"><h3 class="card-title">Our competitions and results</h3>${list.length ? tag(String(list.length)) : ''}</div>
      ${list.length ? `<div class="items">${list.map((c) => {
        const d = pd(c.data.date), past = d && d < dayStart(new Date());
        return `<div class="it kc-comp"><span class="oc2">${icon('trophy', 'i sm')}</span><div class="grow"><div class="t">${esc(c.data.name || 'Competition')}</div><div class="meta cap">${d ? fmtFull.format(d) : ''}${c.data.place ? ` · ${esc(c.data.place)}` : ''}</div>
          ${c.data.results ? `<p class="lb-p kc-res"><b>Results:</b> ${esc(c.data.results)}</p>` : past ? '<p class="cap" style="font-weight:400">Results not added yet.</p>' : ''}
          ${c.data.awards ? `<p class="lb-p kc-res"><b>Awards:</b> ${esc(c.data.awards)}</p>` : ''}
          ${c.data.learned ? `<p class="lb-p kc-res"><b>What we learned:</b> ${esc(c.data.learned)}</p>` : ''}</div>
          ${isMentor() ? `<button class="btn ghost pill sm" type="button" data-cedit="${esc(c.id)}">${past ? 'Add results' : 'Change'}</button>` : ''}</div>`;
      }).join('')}</div>` : `<div class="lb-empty"><span class="oc2">${icon('trophy', 'i sm')}</span><div><b>No results yet</b><p class="cap" style="font-weight:400">After each competition, match scores, awards and what we learned show up here.</p></div></div>`}`;
  };
  const packUI = () => {
    $('#packCount', view).textContent = `${packed.length} of ${total} packed`;
    $('.prog i', view).style.width = `${(packed.length / total) * 100}%`;
    $('.prog', view).setAttribute('aria-label', `${packed.length} of ${total} packed`);
  };
  const inspUI = () => { const n = $$('[data-ins][aria-checked="true"]', view).length; $('#inspCount', view).textContent = `${n} of ${INSPECT.length}`; };
  packUI(); inspUI();
  (async () => {
    try { comps = await api.list('competition'); nextCard(); allCard(); }
    catch (err) { $('#compNext', view).innerHTML = empty(`Competitions did not load. ${esc(errMsg(err))}`); $('#compAll', view).innerHTML = ''; }
  })();
  const timer = setInterval(count, 10000);
  view.addEventListener('click', (e) => {
    if (e.target.closest('#compAdd')) { editing = 'new'; allCard(); return; }
    const ce = e.target.closest('[data-cedit]');
    if (ce) { editing = comps.find((c) => c.id === ce.dataset.cedit); allCard(); return; }
    const p = e.target.closest('[data-pk]');
    if (p) {
      const id = p.dataset.pk, on = !packed.includes(id);
      packed = on ? [...packed, id] : packed.filter((x) => x !== id);
      p.setAttribute('aria-checked', String(on));
      ctx.local.set('kwc-pack', JSON.stringify(packed));
      packUI();
      if (on && packed.length === total) ctx.toast('Everything is packed. Have a great competition!');
      return;
    }
    if (e.target.closest('#packReset')) {
      packed = []; ctx.local.set('kwc-pack', '[]');
      $$('[data-pk]', view).forEach((b) => b.setAttribute('aria-checked', 'false'));
      packUI(); ctx.toast('The packing list is cleared.');
      return;
    }
    const i = e.target.closest('[data-ins]');
    if (i) { i.setAttribute('aria-checked', String(i.getAttribute('aria-checked') !== 'true')); inspUI(); return; }
    const cal = e.target.closest('[data-cal]');
    if (cal) { const d = pd(cal.dataset.cal); ctx.state.calMonth = +D(d.getFullYear(), d.getMonth(), 1); ctx.state.calSel = +d; ctx.go('logbook', 'Calendar'); }
  });
  return () => clearInterval(timer);
}

// ================================================================= Portfolio
// A portfolio record: { sec, text, status: 'Started' | 'Drafted', by }. One per section; anyone can edit.
function portfolio(view, ctx) {
  let cur = ctx.state.pfSec || 'robot';
  let recs = [], notes = [], events = [];
  const sysName = (k) => (ctx.SYS && ctx.SYS[k] ? ctx.SYS[k].name : 'Note');
  view.innerHTML = `<div class="zv">
    ${strip("A helper for FIRST's Engineering Portfolio. It gathers facts from the session notes, and you write the story in your own words, because judges want to hear from you. Anyone on the team can write any section.", [],
      `<button class="btn soft pill sm" type="button" id="pfPrint">${icon('printer', 'i sm')}Print or save as PDF</button><button class="btn soft pill sm" type="button" id="pfCopyAll">${icon('note', 'i sm')}Copy everything</button>`)}
    <article class="card c4">
      <div class="card-head"><h3 class="card-title">Sections</h3><span class="tag" id="pfCount"></span></div>
      <div class="secs" id="pfSecs"></div>
      <div class="callout lb-soft">${icon('bulb')}<div><b>Your words, not the Hub's.</b> The helper only collects facts and numbers. Judges want to hear how the team thinks, so each of you writes your own part.</div></div>
    </article>
    <article class="card c8">
      <div class="card-head"><h3 class="card-title" id="pfTitle"></h3><span class="tag" id="pfBy"></span></div>
      <div class="lb-pf"><div class="paper" id="pfPaper" aria-label="Page preview">${loading()}</div><div class="stack-v lb-pfside" id="pfSide"></div></div>
    </article>
  </div>`;
  const factsFor = (s) => {
    const out = [];
    const sorted = [...notes].sort((a, b) => String(a.data.date).localeCompare(String(b.data.date)));
    const when = (n) => (pd(n.data.date) ? fmtMD.format(pd(n.data.date)) : 'Note');
    if (s.id === 'team') {
      const st = names().length;
      out.push(['Who we are', `${st} student${st === 1 ? '' : 's'} on the team, with ${(session.roster || []).filter((p) => p.role === 'mentor').length} mentor${(session.roster || []).filter((p) => p.role === 'mentor').length === 1 ? '' : 's'}.`]);
      if (notes.length) out.push(['How we work', `${notes.length} meeting${notes.length === 1 ? '' : 's'} written up so far, with an average of ${(notes.reduce((a, n) => a + (n.data.came || []).length, 0) / notes.length).toFixed(1)} people at each.`]);
    } else if (s.id === 'outreach') {
      for (const e of events.filter((x) => x.data.kind === 'out')) out.push([pd(e.data.start) ? fmtMD.format(pd(e.data.start)) : 'Event', `${e.data.title}${e.data.place ? ` at ${e.data.place}` : ''}.`]);
    } else if (s.id === 'design') {
      for (const n of sorted) for (const [t, r] of n.data.tests || []) out.push([when(n), `${t}${r ? `: ${r}` : ''}.`]);
    } else if (s.id === 'robot') {
      out.push(['Starting point', 'The goBILDA StarterBot, in seven subsystems.']);
      for (const n of sorted.slice(-3)) for (const [k, t] of (n.data.did || []).slice(0, 1)) out.push([when(n), `${k ? `${sysName(k)}: ` : ''}${t}`]);
    } else if (s.sys) {
      for (const n of sorted) {
        for (const [k, t] of n.data.did || []) if (k === s.sys) out.push([when(n), t]);
        for (const [t, r] of n.data.tests || []) if (new RegExp(s.sys, 'i').test(t)) out.push([when(n), `${t}${r ? `: ${r}` : ''}.`]);
      }
    } else if (s.id === 'code') {
      for (const n of sorted) for (const [, t] of n.data.did || []) if (/code|auto|opmode|java|telemetry|program/i.test(t)) out.push([when(n), t]);
    }
    return out.slice(-6);
  };
  const secs = () => {
    $('#pfCount', view).textContent = `${SECS.filter((s) => pfStatus(pfLatest(recs, s.id)) === 'Drafted').length} of ${SECS.length} drafted`;
    $('#pfSecs', view).innerHTML = SECS.map((s) => {
      const r = pfLatest(recs, s.id), st = pfStatus(r);
      return `<button type="button" data-sec="${s.id}" aria-pressed="${s.id === cur}"><span class="oc2 lb-oc">${icon(s.ic, 'i sm')}</span><span><span class="t">${s.t}</span><span class="cap" style="display:block">${r && r.data.by ? esc(r.data.by) : 'Nobody yet'}</span></span><span class="st${st === 'Drafted' ? ' solid' : ''}">${st === 'Empty' ? '' : dot(st === 'Drafted' ? 'var(--volt)' : 'var(--warn)', 8)}${st}</span></button>`;
    }).join('');
  };
  const paras = (t) => String(t || '').split(/\n{2,}|\n/).map((p) => p.trim()).filter(Boolean);
  const page = () => {
    const s = SECS.find((x) => x.id === cur) || SECS[0];
    const r = pfLatest(recs, s.id), st = pfStatus(r), facts = factsFor(s);
    $('#pfTitle', view).textContent = s.t;
    $('#pfBy', view).textContent = r && r.data.by ? `${st} · ${r.data.by}` : st;
    const text = r ? r.data.text : '';
    $('#pfPaper', view).innerHTML = `<div class="pk">Kilowattchaos · ${esc(s.kick)}</div><div class="ph1">${esc(s.title)}</div>
      ${s.img ? `<div class="img" style="aspect-ratio:16/10"><img src="/hub/assets/poster.webp" alt="The team's StarterBot robot, a render from the CAD model"></div>` : ''}
      ${text ? paras(text).map((p) => `<p class="kc-pp">${esc(p)}</p>`).join('') : `<div class="blk lb-dash"><b>Nothing written yet</b><span>Write this section on the right. The facts below can help you start.</span></div>`}
      ${facts.slice(0, 3).map(([k, v]) => `<div class="blk"><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join('')}
      <div class="src">Built from: ${notes.length} session note${notes.length === 1 ? '' : 's'}</div>`;
    $('#pfSide', view).innerHTML = `<h4 class="sub">Write it</h4>
      <label class="sr" for="pfText">Text for ${esc(s.t)}</label>
      <textarea class="inp kc-pftext" id="pfText" rows="8" maxlength="6000" placeholder="What did we try, why, and what did we learn? Write it like you would explain it to a judge.">${esc(text || '')}</textarea>
      ${seg('pfst', [['Started', 'Started'], ['Drafted', 'Drafted']], st === 'Drafted' ? 'Drafted' : 'Started', 'How done is it')}
      <div class="row wrap"><button class="btn primary pill sm" type="button" id="pfSave">${icon('check', 'i sm')}Save section</button>${r ? `<span class="cap">Last saved ${fmtMD.format(new Date(r.updated_at))}${r.data.by ? ` by ${esc(r.data.by)}` : ''}</span>` : ''}</div>
      <h4 class="sub">Facts to use</h4>
      ${facts.length ? `<ul class="bul">${facts.map(([k, v]) => `<li><b>${esc(k)}:</b> ${esc(v)}</li>`).join('')}</ul><div class="row wrap"><button class="btn soft pill sm" type="button" id="pfCopy">${icon('note', 'i sm')}Copy the facts</button></div>` : `<p class="cap" style="font-weight:400">No facts for this section yet. They come from the session notes: what you did, tests and results.</p>`}
      <div class="items"><button class="it" type="button" data-goto="logbook|Sessions"><span class="oc2">${icon('note', 'i sm')}</span><div class="grow"><div class="t">Session notes</div></div>${icon('arrow', 'i sm')}</button>${s.id === 'design' ? `<button class="it" type="button" data-goto="build|Mechanism Lab"><span class="oc2">${icon('sliders', 'i sm')}</span><div class="grow"><div class="t">Decision matrix</div></div>${icon('arrow', 'i sm')}</button>` : ''}${s.id === 'robot' ? `<button class="it" type="button" data-goto="robot|Versions"><span class="oc2">${icon('commit', 'i sm')}</span><div class="grow"><div class="t">Robot versions</div></div>${icon('arrow', 'i sm')}</button>` : ''}</div>`;
    let pick = st === 'Drafted' ? 'Drafted' : 'Started';
    wireSeg($('#pfSide', view), 'pfst', (v) => { pick = v; });
    const cp = $('#pfCopy', view);
    if (cp) cp.addEventListener('click', () => copyText(`${s.t}\n${facts.map(([k, v]) => `- ${k}: ${v}`).join('\n')}`, ctx.toast));
    $('#pfSave', view).addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      const t = $('#pfText', view).value.trim();
      const data = { sec: s.id, text: t, status: t ? pick : 'Empty', by: me() };
      btn.disabled = true;
      try {
        const latest = pfLatest(recs, s.id);
        if (latest) { const u = await api.update('portfolio', latest.id, data); Object.assign(latest, { data: u.data, updated_at: u.updated_at }); }
        else recs = [await api.create('portfolio', data), ...recs];
        secs(); page();
        ctx.toast(`Saved ${s.t}.`);
      } catch (err) { ctx.toast(errMsg(err)); btn.disabled = false; }
    });
  };
  const allText = () => SECS.map((s) => { const r = pfLatest(recs, s.id); return `${s.title}\n\n${r && r.data.text ? r.data.text : '(not written yet)'}`; }).join('\n\n\n');
  (async () => {
    const safeList = async (k) => { try { return await api.list(k); } catch (e) { return []; } };
    [recs, notes, events] = await Promise.all([safeList('portfolio'), safeList('session'), safeList('event')]);
    secs(); page();
  })();
  secs();
  view.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sec]');
    if (b) {
      cur = b.dataset.sec; ctx.state.pfSec = cur;
      $$('[data-sec]', view).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      page();
      if (matchMedia('(max-width: 1099px)').matches) $('#pfTitle', view).scrollIntoView({ behavior: ctx.reduced ? 'auto' : 'smooth', block: 'start' });
      return;
    }
    if (e.target.closest('#pfCopyAll')) { copyText(allText(), ctx.toast); return; }
    if (e.target.closest('#pfPrint')) {
      const w = window.open('', '_blank');
      if (!w) { ctx.toast('Your browser blocked the print window. Use Copy everything instead.'); return; }
      w.document.write(`<!doctype html><meta charset="utf-8"><title>Kilowattchaos Engineering Portfolio</title><style>body{font:15px/1.5 Georgia,serif;max-width:720px;margin:40px auto;padding:0 20px;color:#222}h1{font:600 28px Inter,sans-serif}h2{font:600 20px Inter,sans-serif;margin-top:32px;page-break-before:auto}.k{font:500 12px Inter,sans-serif;text-transform:uppercase;letter-spacing:.08em;color:#777}</style><h1>Kilowattchaos</h1>${SECS.map((s) => { const r = pfLatest(recs, s.id); return `<div class="k">${esc(s.kick)}</div><h2>${esc(s.title)}</h2>${r && r.data.text ? paras(r.data.text).map((p) => `<p>${esc(p)}</p>`).join('') : '<p><i>Not written yet.</i></p>'}`; }).join('')}`);
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 300);
    }
  });
}

export const LOGBOOK = { Calendar: calendar, Sessions: sessions, Progress: progress, Competitions: competitions, Portfolio: portfolio };
