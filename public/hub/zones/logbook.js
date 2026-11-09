// Logbook zone: Calendar, Sessions, Progress, Competitions, Portfolio.
// Season dates (kickoff Sep 12 2026, Hub doors open Dec 1 2026) are real. Meetings, meets, notes, goals and
// schedules are sample data until the Hub opens.
import { $, $$, esc, clamp, icon, tag, SAMPLE, strip, av, avStack, dot, bar, lineChart, copyText, KIDS, MENTOR } from './common.js';
import { STAGES, SUBSYS } from './robot.js';
import { MATRIX } from './build.js';

const D = (y, m, d) => new Date(y, m, d);
const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const key = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const same = (a, b) => key(a) === key(b);
const fmtLong = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
const fmtShort = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const fmtMon = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
const fmtMD = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const NAMES = KIDS.map((k) => k.n);

// ================================================================= Calendar data
const C = { meet: 'var(--text)', big: 'var(--sys-launcher)', hub: 'var(--volt)', due: 'var(--warn)', out: 'var(--sys-power)', off: 'var(--stone)' };
const KICKOFF = D(2026, 8, 12);
const FIRST_MONTH = D(2026, 8, 1), LAST_MONTH = D(2027, 3, 1);
const BREAK_A = D(2026, 11, 21), BREAK_B = D(2027, 0, 1);
const OFFSEASON = D(2027, 2, 22), SEASON_END = D(2027, 3, 30);
const NO_MEETING = [key(D(2026, 10, 26))];
const inBreak = (d) => d >= BREAK_A && d <= BREAK_B;
// [date, kind, title, time, more]
const FIXED = [
  [KICKOFF, 'meet', 'Season kickoff', 'All day', 'BIOBUZZ was revealed. Week 1 of the season.'],
  [D(2026, 10, 16), 'hub', 'Lab cards on the shop TV', 'All week', 'The Mechanism Lab cards go up on the shop TV this week.'],
  [D(2026, 10, 26), 'off', 'Thanksgiving, no meeting', '', 'Enjoy the break. The next meeting is Tuesday.'],
  [D(2026, 11, 1), 'hub', 'Hub doors open', 'All day', 'The real calendar and session notes open today.'],
  [D(2026, 11, 7), 'hub', 'Competitions and portfolio helper', 'All day', 'Phase 2 starts: the Competitions page and the portfolio helper.'],
  [D(2026, 11, 11), 'due', 'Register for League meet 1', 'By 5:00 PM', 'Coach registers the team. Bring your permission slip.'],
  [D(2026, 11, 12), 'out', 'Library robot demo', '10:00 AM', "Nova's outreach demo at the library."],
  [D(2026, 11, 21), 'off', 'Winter break starts', '', 'No meetings until January.'],
  [D(2027, 0, 8), 'due', 'Portfolio draft to Coach', 'By 5:00 PM', 'Every section at least started.'],
  [D(2027, 0, 16), 'big', 'League meet 1', '7:30 AM', 'Our first league meet.'],
  [D(2027, 0, 22), 'due', 'Register for League meet 2', 'By 5:00 PM', ''],
  [D(2027, 1, 6), 'big', 'League meet 2', '7:30 AM', ''],
  [D(2027, 1, 19), 'due', 'Register for the League tournament', 'By 5:00 PM', ''],
  [D(2027, 2, 6), 'big', 'League tournament', '7:30 AM', ''],
  [OFFSEASON, 'hub', 'Off-season starts', 'All day', 'Make the robot yours: new ideas, new skills.'],
];
function eventsOn(d) {
  const out = FIXED.filter((f) => same(f[0], d)).map(([, kind, t, time, more]) => ({ kind, t, time, more }));
  const wd = d.getDay();
  if ((wd === 2 || wd === 4) && d > KICKOFF && d <= SEASON_END && !inBreak(d) && !NO_MEETING.includes(key(d))) {
    out.unshift({ kind: 'meet', t: d >= OFFSEASON ? 'Off-season meeting' : 'Team meeting', time: '3:30 PM', more: '3:30 to 5:30 PM · Shop room', meeting: true });
  }
  return out;
}
const LEGEND = [['meet', 'Meeting'], ['big', 'Meet'], ['hub', 'Hub milestone'], ['due', 'Deadline'], ['out', 'Outreach'], ['off', 'No meeting']];

// ================================================================= Session notes (all sample)
const NOTES = [
  { id: 'n1105', d: D(2026, 10, 5), title: 'Gecko wheels closer: 7 of 10', came: ['Sparky', 'Pixel', 'Gizmo', 'Byte', 'Nova', 'Echo'], scribe: 'Nova',
    goal: 'Get the intake picking up more balls from a pile, and test the launcher from 4 ft.',
    did: [['intake', 'Moved the gecko wheels 4 mm closer together. Pile pickup went from 5 to 7 of 10 balls.'], ['launcher', 'Ten shots from 4 ft: 6 of 10 landed in the target box.'], ['drivetrain', 'Byte finished the drive-forward autonomous and ran it twice on the floor.']],
    tests: [['Pile pickup, 4 mm closer', '7 of 10 balls', 'intake'], ['Ten shots from 4 ft', '6 of 10 in the target box', 'launcher']],
    problems: [['A bearing on the frame keeps popping out.', 'Pinned by Gizmo'], ['Balls sometimes jam where the intake meets the hopper.', 'Pinned by Pixel']],
    photos: ['Gecko wheels, 4 mm closer', 'The 10-ball test pile', 'Target box from 4 ft'],
    refl: [['I like', 'Pixel', 'The 4 mm change made a big difference for one small move.'], ['I wonder', 'Sparky', 'Would the shots land better with a hood?'], ['What if', 'Nova', 'What if we try 6 mm and see if it squeezes too hard?']],
    next: [['Try the gecko wheels 6 mm closer', ['Pixel', 'Nova'], 'Tuesday'], ["Measure the flywheel's top speed", ['Sparky'], 'Tuesday'], ['Print 4 intake roller hubs', ['Nova'], 'Thursday'], ['Fix the popping bearing', ['Rivet'], 'Tuesday']] },
  { id: 'n1103', d: D(2026, 10, 3), title: 'Servo gate timing', came: ['Sparky', 'Pixel', 'Gizmo', 'Byte', 'Rivet', 'Echo', 'Nova'], scribe: 'Echo',
    goal: 'Make the ball path feed one ball at a time into the flywheel.',
    did: [['ballpath', 'Tested the servo gate ten times. Two balls slipped through together 3 of 10 times.'], ['ballpath', 'Gizmo printed a gate arm for the hopper servo.'], ['drivetrain', 'Byte started the drive-forward autonomous.']],
    tests: [['Servo gate, ten feeds', '3 of 10 double-feeds', 'ballpath']],
    problems: [['The gate opens too fast, so a second ball follows the first.', 'Pinned by Gizmo']],
    photos: ['The servo gate arm', 'Two balls in the gate'],
    refl: [['I like', 'Gizmo', 'Counting every feed showed us exactly how often it fails.'], ['I wonder', 'Echo', 'Does the battery level change the servo speed?'], ['What if', 'Byte', 'What if the code waits a little longer between balls?']],
    next: [['Try a longer gate pause between balls', ['Gizmo'], 'Thursday'], ['Finish the drive-forward auto', ['Byte'], 'Thursday']] },
  { id: 'n1029', d: D(2026, 9, 29), title: 'Launcher wobble and battery runtime', came: ['Sparky', 'Gizmo', 'Byte', 'Nova', 'Rivet', 'Echo'], scribe: 'Gizmo',
    goal: 'Find out why the launcher shakes, and how long a battery lasts.',
    did: [['structure', 'At full speed the launcher mount wobbles where you can see it. We need a brace.'], ['power', 'Echo drove hard on one battery: it lasted about 9 minutes.'], ['launcher', 'Sparky and Rivet held the mount by hand and the shots got steadier.']],
    tests: [['Launcher mount flex', 'Visible wobble at full speed', 'structure'], ['Battery runtime', 'About 9 minutes of hard driving', 'power']],
    problems: [['The launcher mount bends at full speed.', 'Pinned by Rivet']],
    photos: ['The launcher mount', 'Battery and charger'],
    refl: [['I like', 'Echo', 'Now we know how many batteries a meet needs.'], ['I wonder', 'Rivet', 'Should the brace be metal or printed?'], ['What if', 'Sparky', 'What if we add the brace on both sides?']],
    next: [['Design a brace for the launcher mount', ['Rivet'], 'Tuesday'], ['Label and rotate the three batteries', ['Echo'], 'Tuesday']] },
  { id: 'n1027', d: D(2026, 9, 27), title: 'Flywheel spin-up', came: ['Sparky', 'Pixel', 'Gizmo', 'Byte', 'Nova', 'Rivet', 'Echo'], scribe: 'Sparky',
    goal: 'Time how fast the flywheel gets up to speed.',
    did: [['launcher', 'Timed the flywheel with telemetry: 1.4 s to full speed on a fresh battery.'], ['intake', 'Pixel and Nova planned a gecko wheel spacing test.'], ['drivetrain', 'Byte checked the 1.1 strafe factor from Oct 20. It still drives straight.']],
    tests: [['Flywheel spin-up', '1.4 s to full speed', 'launcher']],
    problems: [],
    photos: ['Flywheel and motor', 'Telemetry on the Driver Station'],
    refl: [['I like', 'Sparky', 'Telemetry gave us a real number, not a guess.'], ['I wonder', 'Byte', 'Is it slower on a tired battery?'], ['What if', 'Pixel', 'What if we time it again at the end of a meeting?']],
    next: [['Test the launcher mount at full speed', ['Rivet', 'Sparky'], 'Thursday'], ['Time a battery run', ['Echo'], 'Thursday']] },
  { id: 'n1022', d: D(2026, 9, 22), title: 'Intake baseline from a pile', came: ['Sparky', 'Pixel', 'Byte', 'Nova', 'Rivet', 'Echo'], scribe: 'Pixel',
    goal: 'Measure how well the stock intake picks balls up from a pile.',
    did: [['intake', 'Pile pickup with the stock gecko wheel spacing: 5 of 10 balls.'], ['intake', 'Balls that missed rolled off the side of the wheels.'], ['drivetrain', 'Strafe test from Oct 20 rechecked: drift is gone with the 1.1 factor.']],
    tests: [['Pile pickup, stock spacing', '5 of 10 balls', 'intake']],
    problems: [['Balls roll off the side of the intake.', 'Pinned by Nova']],
    photos: ['Stock intake', 'The 10-ball test pile'],
    refl: [['I like', 'Nova', 'Using the same 10-ball pile makes tests fair.'], ['I wonder', 'Pixel', 'Would more squeeze help the wheels grab?'], ['What if', 'Rivet', 'What if we move the wheels closer?']],
    next: [['Plan a closer gecko wheel spacing', ['Pixel', 'Nova'], 'Tuesday']] },
];
const allNotes = (ctx) => [...(ctx.state.newNotes || []), ...NOTES];

// ================================================================= Calendar
function calendar(view, ctx) {
  const today = dayStart(new Date());
  const startMonth = ctx.state.calMonth ? new Date(ctx.state.calMonth) : clampMonth(D(today.getFullYear(), today.getMonth(), 1));
  let month = startMonth;
  let sel = ctx.state.calSel ? new Date(ctx.state.calSel) : (today >= FIRST_MONTH && today < D(2027, 4, 1) ? today : month);
  ctx.state.calSel = null;
  const rsvp = ctx.state.rsvp || (ctx.state.rsvp = {});
  const noteFor = (d) => NOTES.find((n) => same(n.d, d));
  view.innerHTML = `<div class="zv">
    ${strip('Every meeting, meet and deadline in one place. Pick a day to see what is happening and tell the team if you can come. The real calendar opens on December 1.', [tag('Opens Dec 1'), SAMPLE],
      `<button class="btn soft pill sm" type="button" data-sub="Google">${icon('calendar', 'i sm')}Google</button><button class="btn soft pill sm" type="button" data-sub="Apple">${icon('calendar', 'i sm')}Apple</button><button class="btn soft pill sm" type="button" data-sub="Outlook">${icon('calendar', 'i sm')}Outlook</button>`)}
    <article class="card c8">
      <div class="cal-head"><button class="icon-btn sm" type="button" id="calPrev" aria-label="Previous month"><svg class="i sm" viewBox="0 0 24 24" aria-hidden="true" style="fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round"><path d="m15 6-6 6 6 6"/></svg></button><h4 id="calMonth" aria-live="polite"></h4><button class="btn ghost pill sm" type="button" id="calToday">Today</button><button class="icon-btn sm" type="button" id="calNext" aria-label="Next month"><svg class="i sm" viewBox="0 0 24 24" aria-hidden="true" style="fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round"><path d="m9 6 6 6-6 6"/></svg></button></div>
      <div class="cal" id="calGrid"></div>
      <div class="legend">${LEGEND.map(([k, t]) => `<span><i class="${k === 'hub' ? 'lb-volt' : ''}" style="--c:${C[k]}"></i>${t}</span>`).join('')}<span><i class="lb-brk"></i>Winter break</span></div>
    </article>
    <article class="card c4" id="calAgenda"></article>
  </div>`;
  const grid = () => {
    $('#calMonth', view).textContent = fmtMon.format(month);
    $('#calPrev', view).disabled = month <= FIRST_MONTH;
    $('#calNext', view).disabled = month >= LAST_MONTH;
    const first = D(month.getFullYear(), month.getMonth(), 1);
    const start = D(first.getFullYear(), first.getMonth(), 1 - first.getDay());
    const last = D(month.getFullYear(), month.getMonth() + 1, 0);
    const weeks = Math.ceil((first.getDay() + last.getDate()) / 7);
    let h = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => `<span class="dow">${d}</span>`).join('');
    for (let i = 0; i < weeks * 7; i++) {
      const d = D(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const ev = eventsOn(d);
      const cls = ['day', d.getMonth() !== month.getMonth() ? 'out' : '', same(d, today) ? 'today' : '', inBreak(d) ? 'brk' : ''].filter(Boolean).join(' ');
      const label = `${fmtLong.format(d)}${same(d, today) ? ', today' : ''}${inBreak(d) ? ', winter break' : ''}. ${ev.length ? ev.map((e) => e.t).join(', ') : 'Nothing planned'}.`;
      const chips = ev.slice(0, 2).map((e) => `<span class="ev${e.kind === 'big' ? ' big' : e.kind === 'hub' ? ' hub' : ''}" style="--c:${C[e.kind]}">${e.kind === 'hub' ? '' : '<i></i>'}<span>${e.meeting ? `Meeting ${e.time.replace(' PM', '')}` : esc(e.t)}</span></span>`).join('');
      const more = ev.length > 2 ? `<span class="cap lb-more">+${ev.length - 2} more</span>` : '';
      const dots = ev.length ? `<span class="dots">${ev.slice(0, 3).map((e) => `<i class="${e.kind === 'hub' ? 'lb-volt' : ''}" style="--c:${C[e.kind]}"></i>`).join('')}</span>` : '';
      h += `<button type="button" class="${cls}" data-day="${key(d)}" aria-pressed="${same(d, sel)}" aria-label="${esc(label)}"><span class="dn">${d.getDate()}</span>${chips}${more}${dots}</button>`;
    }
    $('#calGrid', view).innerHTML = h;
  };
  const agenda = () => {
    const ev = eventsOn(sel);
    const isPast = sel < today;
    const note = noteFor(sel);
    const m = ctx.nextMeeting ? ctx.nextMeeting(new Date()) : null;
    const isNext = m && same(m.start, sel);
    $('#calAgenda', view).innerHTML = `<div class="card-head"><h3 class="card-title">${same(sel, today) ? 'Today' : fmtLong.format(sel)}</h3>${same(sel, today) ? `<span class="tag">${fmtShort.format(sel)}</span>` : ''}</div>
      ${inBreak(sel) ? `<p class="lead">Winter break. No meetings from December 21 to January 1.</p>` : ''}
      <div class="agenda2">${ev.length ? ev.map((e, i) => {
        const k = `${key(sel)}-${i}`;
        const r = rsvp[k] || '';
        const rs = e.meeting && !isPast ? `<div class="rs" role="group" aria-label="Can you come?">${[['going', 'Going'], ['maybe', 'Maybe'], ['no', "Can't make it"]].map(([v, t]) => `<button class="btn soft pill sm lb-rsvp" type="button" data-rsvp="${k}" data-v="${v}" aria-pressed="${r === v}">${t}</button>`).join('')}</div>` : '';
        const t = e.time && e.time !== 'All day' && e.time !== 'All week' ? e.time.replace(/ (AM|PM)$/, '') : '';
        const ap = (e.time.match(/AM|PM/) || [''])[0];
        return `<div class="agi"><time>${t || '<small>' + (e.time || 'All day') + '</small>'}${t ? `<small>${e.time.startsWith('By') ? '' : ap}</small>` : ''}</time><div style="min-width:0"><div class="what">${e.kind === 'hub' ? '' : dot(C[e.kind], 8) + ' '}${esc(e.t)}${e.kind === 'big' ? ' ' + tag('Sample') : ''}</div><div class="cap">${esc(e.more || '')}</div>
          ${e.meeting && isNext ? `<ul class="bul lb-plan">${(ctx.AGENDA || []).map((a) => `<li>${a.t} · ${esc(a.what)}</li>`).join('')}</ul>` : ''}
          ${rs}
          ${e.meeting && isPast ? (note ? `<div class="rs"><button class="btn soft pill sm" type="button" data-note="${note.id}">${icon('note', 'i sm')}Open the session note</button></div>` : '<div class="cap">No session note for this one in the preview.</div>') : ''}
          ${e.kind === 'big' ? `<div class="rs"><button class="btn soft pill sm" type="button" data-goto="logbook|Competitions">${icon('trophy', 'i sm')}Get ready</button></div>` : ''}
        </div></div>`;
      }).join('') : `<p class="lead">Nothing planned on this day.</p>`}</div>
      <hr class="hr">
      <p class="cap" style="font-weight:400">Meetings are Tuesdays and Thursdays, 3:30 to 5:30 PM in the shop room. The meets and deadlines here are samples, not real event dates.</p>`;
  };
  grid(); agenda();
  const show = (d) => { month = clampMonth(D(d.getFullYear(), d.getMonth(), 1)); ctx.state.calMonth = +month; grid(); };
  view.addEventListener('click', (e) => {
    const s = e.target.closest('[data-sub]');
    if (s) { ctx.toast(`The real calendar feed for ${s.dataset.sub} arrives on December 1. Until then these dates are samples.`); return; }
    if (e.target.closest('#calPrev')) { show(D(month.getFullYear(), month.getMonth() - 1, 1)); return; }
    if (e.target.closest('#calNext')) { show(D(month.getFullYear(), month.getMonth() + 1, 1)); return; }
    if (e.target.closest('#calToday')) { sel = today; show(today); agenda(); return; }
    const dbtn = e.target.closest('[data-day]');
    if (dbtn) {
      const [y, mo, da] = dbtn.dataset.day.split('-').map(Number);
      sel = D(y, mo - 1, da);
      if (sel.getMonth() !== month.getMonth()) show(sel);
      else $$('[data-day]', view).forEach((b) => b.setAttribute('aria-pressed', String(b === dbtn)));
      agenda();
      if (matchMedia('(max-width: 1099px)').matches) $('#calAgenda', view).scrollIntoView({ behavior: ctx.reduced ? 'auto' : 'smooth', block: 'nearest' });
      return;
    }
    const r = e.target.closest('[data-rsvp]');
    if (r) {
      const k = r.dataset.rsvp, v = r.dataset.v;
      rsvp[k] = rsvp[k] === v ? '' : v;
      $$(`[data-rsvp="${k}"]`, view).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === rsvp[k])));
      ctx.toast(rsvp[k] === 'going' ? 'Thanks! Coach can see you are coming.' : rsvp[k] === 'maybe' ? "Got it. Tell the team when you know." : rsvp[k] === 'no' ? 'Thanks for letting us know. The session note will catch you up.' : 'Answer cleared.');
      return;
    }
    const n = e.target.closest('[data-note]');
    if (n) { ctx.state.note = n.dataset.note; ctx.go('logbook', 'Sessions'); }
  });
}
function clampMonth(m) { return m < FIRST_MONTH ? FIRST_MONTH : m > LAST_MONTH ? LAST_MONTH : m; }

// ================================================================= Sessions
function sessions(view, ctx) {
  let cur = ctx.state.note || NOTES[0].id;
  ctx.state.note = null;
  let editing = false;
  view.innerHTML = `<div class="zv">
    ${strip('One note per meeting: who came, what we tried, the numbers, and what is next. Good notes make the Engineering Portfolio much easier to write. Session notes open on December 1.', [tag('Opens Dec 1'), SAMPLE],
      `<button class="btn primary pill sm" type="button" id="sessNew">${icon('plus', 'i sm')}Start today's note</button>`)}
    <article class="card c4">
      <div class="card-head"><h3 class="card-title">Session notes</h3><span class="tag" id="sessCount"></span></div>
      <div class="notes-list" id="sessList"></div>
    </article>
    <article class="card c8" id="sessView"></article>
  </div>`;
  const sysName = (k) => (ctx.SYS && ctx.SYS[k] ? ctx.SYS[k].name : 'Note');
  const sysC = (k) => (ctx.SYS && ctx.SYS[k] ? ctx.SYS[k].c : 'var(--stone)');
  const list = () => {
    const notes = allNotes(ctx);
    $('#sessCount', view).textContent = `${notes.length} notes`;
    $('#sessList', view).innerHTML = notes.map((n) => `<button class="it" type="button" data-n="${n.id}" aria-pressed="${!editing && n.id === cur}"><span class="oc2">${icon('note', 'i sm')}</span><div class="grow"><div class="t">${esc(n.title)}</div><div class="meta cap">${fmtShort.format(n.d)} · ${n.came.length} came</div></div><span class="end">${avStack(n.came.slice(0, 3), 22)}</span></button>`).join('');
  };
  const note = () => {
    const n = allNotes(ctx).find((x) => x.id === cur) || NOTES[0];
    const latest = n.id === NOTES[0].id;
    $('#sessView', view).innerHTML = `<div class="card-head"><h3 class="card-title">${esc(n.title)}</h3>${n.mine ? tag('Yours', 'volt') : tag('Sample')}</div>
      <div class="row wrap between"><span class="cap">${fmtLong.format(n.d)} · 3:30 to 5:30 PM · Shop room</span>${latest ? `<span class="editing">${av('Echo', 18)}Echo is editing</span>` : ''}</div>
      <div class="row wrap lb-who"><span class="row">${avStack(n.came, 26)}<span class="cap">${n.came.length} of 7 came${n.coach !== false ? ', with Coach' : ''}</span></span><span class="row">${av(n.scribe, 22)}<span class="cap">Notes by ${esc(n.scribe)}</span></span></div>
      <div class="note-sec"><h4>Goal for the day</h4><p class="lb-p">${esc(n.goal)}</p></div>
      <div class="note-sec"><h4>What we did</h4><div>${n.did.map(([s, t]) => `<div class="did"><b>${dot(sysC(s), 8)}${esc(sysName(s))}</b><span>${esc(t)}</span></div>`).join('')}</div></div>
      ${n.tests.length ? `<div class="note-sec"><h4>Tests</h4><div class="items">${n.tests.map(([t, r, s]) => `<div class="it"><span class="oc2">${icon('sliders', 'i sm')}</span><div class="grow"><div class="t">${esc(t)}</div><div class="meta cap">${s ? `${esc(sysName(s))} · ` : ''}<b class="lb-res">${esc(r)}</b></div></div></div>`).join('')}</div></div>` : ''}
      <div class="note-sec"><h4>Problems and pins</h4>${n.problems.length ? `<ul class="checks">${n.problems.map(([t, w]) => `<li><span class="ci warn">${icon('alert')}</span><span>${esc(t)} <span class="cap">${esc(w)}</span></span></li>`).join('')}</ul>` : '<p class="cap" style="font-weight:400">No problems pinned this time.</p>'}</div>
      <div class="note-sec"><h4>Photos</h4><div class="photos2">${(n.photos.length ? n.photos : ['Photo of the part']).map((p) => `<span title="${esc(p)}"><i class="lb-ph">${icon('camera')}<b>Photo of the part</b><small>${esc(p)}</small></i></span>`).join('')}<button class="lb-addph" type="button" data-toast="Photo uploads arrive with session notes on December 1. Take photos of parts and tests, never of faces.">${icon('plus')}<span>Add a photo</span></button></div></div>
      <div class="note-sec"><h4>Reflections</h4><div class="refl">${n.refl.map(([k, w, t]) => `<div>${av(w, 26)}<span><b>${k}</b> · ${esc(w)}<br>${esc(t)}</span></div>`).join('')}</div></div>
      <div class="note-sec"><h4>Next steps</h4><div class="items">${n.next.map(([t, who, when]) => `<div class="it"><span class="oc2">${icon('check', 'i sm')}</span><div class="grow"><div class="t">${esc(t)}</div><div class="meta cap">${esc(who.join(' and '))}${when ? ` · ${esc(when)}` : ''}</div></div><span class="end">${avStack(who, 24)}</span></div>`).join('')}</div></div>
      <div class="card-foot"><span class="cap">Notes like this one feed the Portfolio.</span><div class="row"><button class="btn soft pill sm" type="button" id="sessCopy">${icon('note', 'i sm')}Copy as text</button><button class="btn soft pill sm" type="button" data-goto="logbook|Portfolio">${icon('book', 'i sm')}Portfolio</button></div></div>`;
    $('#sessCopy', view).addEventListener('click', () => copyText(asText(n, sysName), ctx.toast));
  };
  const form = () => {
    const now = new Date();
    const m = ctx.nextMeeting ? ctx.nextMeeting(now) : null;
    const opts = ['', ...(ctx.SYS_ORDER || [])].map((k) => `<option value="${k}">${k ? esc(sysName(k)) : 'Pick a subsystem'}</option>`).join('');
    $('#sessView', view).innerHTML = `<div class="card-head"><h3 class="card-title">Today's note</h3>${tag(fmtShort.format(now))}</div>
      <p class="lead">${m && same(m.start, now) ? 'Fill this in during the meeting.' : `There's no meeting today, so this is practice. The next one is ${m ? fmtLong.format(m.start) : 'soon'}.`} Write what happened in your own words, with numbers.</p>
      <div class="note-sec"><h4>Who came</h4><div class="chips" id="sessCame">${NAMES.map((k) => `<button class="chip" type="button" data-came="${k}" aria-pressed="${k === 'Sparky'}">${av(k, 20)}${k}</button>`).join('')}</div></div>
      <div class="form-grid">
        <label class="field"><span>Who is taking notes</span><select class="inp" id="sessScribe">${NAMES.map((k) => `<option${k === 'Sparky' ? ' selected' : ''}>${k}</option>`).join('')}</select></label>
        <label class="field"><span>Title</span><input class="inp" id="sessTitle" placeholder="Like: Gecko wheels 6 mm closer"></label>
        <label class="field full"><span>Goal for the day</span><textarea class="inp" id="sessGoal" rows="2" placeholder="What do we want to find out or finish today?"></textarea></label>
      </div>
      <div class="note-sec"><h4>What we did</h4>${[0, 1, 2].map((i) => `<div class="lb-didf"><select class="inp" data-dsys="${i}" aria-label="Subsystem for row ${i + 1}">${opts}</select><input class="inp" data-dtxt="${i}" aria-label="What happened, row ${i + 1}" placeholder="What happened, with a number"></div>`).join('')}</div>
      <div class="form-grid">
        <label class="field"><span>Tests and results</span><textarea class="inp" id="sessTests" rows="3" placeholder="One per line, like: Pile pickup, 6 mm: 8 of 10"></textarea></label>
        <label class="field"><span>Problems and pins</span><textarea class="inp" id="sessProb" rows="3" placeholder="One per line"></textarea></label>
        <label class="field"><span>I like</span><textarea class="inp" id="sessLike" rows="2"></textarea></label>
        <label class="field"><span>I wonder</span><textarea class="inp" id="sessWonder" rows="2"></textarea></label>
        <label class="field"><span>What if</span><textarea class="inp" id="sessWhatif" rows="2"></textarea></label>
        <label class="field"><span>Next steps</span><textarea class="inp" id="sessNext" rows="2" placeholder="One per line, like: Print the hubs (Nova)"></textarea><small>Put a name in brackets so everyone knows who owns it.</small></label>
      </div>
      <div class="card-foot"><button class="btn ghost pill" type="button" id="sessCancel">Cancel</button><button class="btn primary pill" type="button" id="sessSave">${icon('check', 'i sm')}Save note</button></div>`;
    $('#sessGoal', view).focus({ preventScroll: true });
  };
  const save = () => {
    const v = (id) => $(id, view).value.trim();
    const lines = (id) => v(id).split('\n').map((s) => s.trim()).filter(Boolean);
    const goal = v('#sessGoal');
    const did = [0, 1, 2].map((i) => [$(`[data-dsys="${i}"]`, view).value, $(`[data-dtxt="${i}"]`, view).value.trim()]).filter(([, t]) => t);
    if (!goal && !did.length) { ctx.toast('Write the goal for the day or one thing you did first.'); $('#sessGoal', view).focus(); return; }
    const scribe = $('#sessScribe', view).value;
    const came = $$('[data-came][aria-pressed="true"]', view).map((b) => b.dataset.came);
    const n = {
      id: `new${Date.now()}`, mine: true, d: dayStart(new Date()), title: v('#sessTitle') || 'Today\'s session', came: came.length ? came : [scribe], scribe, goal: goal || 'Not written yet.',
      did: did.length ? did : [['', 'Nothing written yet.']],
      tests: lines('#sessTests').map((t) => { const [a, ...b] = t.split(':'); return [a.trim(), b.join(':').trim() || 'Result not written', '']; }),
      problems: lines('#sessProb').map((t) => [t, `Pinned by ${scribe}`]),
      photos: [],
      refl: [['I like', v('#sessLike')], ['I wonder', v('#sessWonder')], ['What if', v('#sessWhatif')]].filter(([, t]) => t).map(([k, t]) => [k, scribe, t]),
      next: lines('#sessNext').map((t) => { const m = t.match(/^(.*?)\s*\(([^)]+)\)\s*$/); const who = m ? m[2].split(/,| and /).map((s) => s.trim()).filter((s) => NAMES.includes(s) || s === 'Coach') : []; return [m ? m[1] : t, who.length ? who : [scribe], '']; }),
    };
    (ctx.state.newNotes || (ctx.state.newNotes = [])).unshift(n);
    editing = false; cur = n.id; list(); note();
    ctx.toast('Saved. Your note is at the top of the list. In this preview it stays until you reload.');
  };
  list(); note();
  view.addEventListener('click', (e) => {
    const b = e.target.closest('[data-n]');
    if (b) {
      cur = b.dataset.n; editing = false; list(); note();
      if (matchMedia('(max-width: 1099px)').matches) $('#sessView', view).scrollIntoView({ behavior: ctx.reduced ? 'auto' : 'smooth', block: 'start' });
      return;
    }
    if (e.target.closest('#sessNew')) { editing = true; list(); form(); if (matchMedia('(max-width: 1099px)').matches) $('#sessView', view).scrollIntoView({ behavior: ctx.reduced ? 'auto' : 'smooth', block: 'start' }); return; }
    const c = e.target.closest('[data-came]');
    if (c) { c.setAttribute('aria-pressed', String(c.getAttribute('aria-pressed') !== 'true')); return; }
    if (e.target.closest('#sessCancel')) { editing = false; list(); note(); return; }
    if (e.target.closest('#sessSave')) save();
  });
}
function asText(n, sysName) {
  return [`${n.title} (${fmtLong.format(n.d)})`, `Came: ${n.came.join(', ')}. Notes by ${n.scribe}.`, `Goal: ${n.goal}`, 'What we did:', ...n.did.map(([s, t]) => `- ${sysName(s)}: ${t}`),
    ...(n.tests.length ? ['Tests:', ...n.tests.map(([t, r]) => `- ${t}: ${r}`)] : []), ...(n.problems.length ? ['Problems:', ...n.problems.map(([t, w]) => `- ${t} (${w})`)] : []),
    'Reflections:', ...n.refl.map(([k, w, t]) => `- ${k} (${w}): ${t}`), 'Next steps:', ...n.next.map(([t, who]) => `- ${t} (${who.join(' and ')})`)].join('\n');
}

// ================================================================= Portfolio sections (shared with Progress)
const SECS = [
  { id: 'team', t: 'Team', ic: 'users', st: 'Drafted', by: 'Echo' },
  { id: 'outreach', t: 'Outreach', ic: 'chat', st: 'Started', by: 'Nova' },
  { id: 'design', t: 'Design process', ic: 'bulb', st: 'Started', by: 'Pixel' },
  { id: 'robot', t: 'Robot overview', ic: 'bot', st: 'Drafted', by: 'Echo' },
  { id: 'intake', t: 'Intake', ic: 'wrench', st: 'Drafted', by: 'Pixel' },
  { id: 'launcher', t: 'Launcher', ic: 'zap', st: 'Started', by: 'Sparky' },
  { id: 'code', t: 'Code', ic: 'code', st: 'Empty', by: 'Byte' },
];

// ================================================================= Progress
function meetingsHeld(until) {
  let n = 0;
  for (let d = D(2026, 8, 13); d < until; d = D(d.getFullYear(), d.getMonth(), d.getDate() + 1)) if (eventsOn(d).some((e) => e.meeting)) n++;
  return n;
}
function progress(view, ctx) {
  const { SYS, SYS_ORDER } = ctx;
  const drafted = SECS.filter((s) => s.st === 'Drafted').length;
  const GOALS = [
    ['Intake: pick up from a pile', 7, 8, 'of 10 balls', 'intake'],
    ['Launcher: shots in the target box from 4 ft', 6, 8, 'of 10 shots', 'launcher'],
    ['Drive-forward autonomous works 5 runs in a row', 2, 5, 'runs', 'drivetrain'],
    ['Portfolio sections drafted', drafted, SECS.length, 'sections', null],
    ['Outreach hours', 6, 20, 'hours', null],
  ];
  const held = meetingsHeld(dayStart(new Date()));
  const avgAtt = (NOTES.reduce((a, n) => a + n.came.length, 0) / NOTES.length).toFixed(1);
  view.innerHTML = `<div class="zv">
    ${strip('How far the team has come this season, and how far is left. Goals are set together with Coach, and the numbers come from session notes and tests.', [SAMPLE])}
    <article class="card c7">
      <div class="card-head"><h3 class="card-title">Season goals</h3>${tag('Sample goals')}</div>
      <div class="goals">${GOALS.map(([t, v, g, u, s]) => `<div class="goal"><div class="row"><span class="t row" style="gap:8px">${s ? dot(SYS[s].c, 8) : dot('var(--stone)', 8)}${t}</span><span class="v">${v} <span class="cap">${u.startsWith('of') ? `${u}, goal ${g}` : `of ${g} ${u}`}</span></span></div>${bar((v / g) * 100, `${t}: ${v} of ${g}`)}</div>`).join('')}</div>
    </article>
    <article class="card c5">
      <div class="card-head"><h3 class="card-title">Subsystem status</h3>${tag('Sample')}</div>
      <div class="board lb-board">${STAGES.map((s, i) => `<div class="col"><h5>${s}</h5>${SYS_ORDER.filter((k) => SUBSYS[k].status === i).map((k) => `<button class="sbtn" type="button" data-sys="${k}" aria-label="${SYS[k].name}: ${s}. Open its page.">${dot(SYS[k].c, 8)}${SYS[k].name}</button>`).join('')}</div>`).join('')}</div>
      <p class="cap" style="font-weight:400">Pick a subsystem to open its page in Robot, Subsystems.</p>
    </article>
    <article class="card c7">
      <div class="card-head"><h3 class="card-title">Intake: balls picked up from a pile</h3>${tag('Sample tests')}</div>
      ${lineChart({ points: [5, 7, 8], max: 10, w: matchMedia('(max-width: 759px)').matches ? 340 : 560, h: matchMedia('(max-width: 759px)').matches ? 220 : 200, labels: ['Oct 22 · stock', 'Nov 5 · 4 mm', '6 mm goal'], unit: '/10', highlight: 1, dashedFrom: 1, ariaLabel: 'Intake pile pickup: 5 of 10 with stock spacing on October 22, 7 of 10 with the gecko wheels 4 mm closer on November 5. The goal for the 6 mm test is 8 of 10.' })}
      <p class="cap" style="font-weight:400">Solid points are measured. The dashed point is the goal for the 6 mm test on Tuesday, not a result yet.</p>
    </article>
    <article class="card c5">
      <div class="card-head"><h3 class="card-title">Season so far</h3>${tag('Sample')}</div>
      <div class="kpis lb-kpis">
        <div class="kpi"><div class="lab">Meetings held</div><div class="val">${held}</div></div>
        <div class="kpi"><div class="lab">Average attendance</div><div class="val">${avgAtt}<small>of 7</small></div></div>
        <div class="kpi"><div class="lab">Ideas</div><div class="val">23</div></div>
        <div class="kpi"><div class="lab">Prints</div><div class="val">14</div></div>
        <div class="kpi"><div class="lab">Commits</div><div class="val">31</div></div>
        <div class="kpi"><div class="lab">Season week</div><div class="val">${ctx.seasonWeek ? ctx.seasonWeek(new Date()) : ''}</div></div>
      </div>
      <p class="cap" style="font-weight:400">Meetings are counted from the sample calendar. Attendance is the average of the last ${NOTES.length} session notes.</p>
    </article>
  </div>`;
  view.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sys]');
    if (b) { ctx.state.sys = b.dataset.sys; ctx.go('robot', 'Subsystems'); }
  });
}

// ================================================================= Competitions
const MEET1 = new Date(2027, 0, 16, 7, 30);
const PACK = [
  ['Robot', ['The robot', 'Three charged batteries', 'Battery charger', 'Driver Station phone and cable', 'Two gamepads', 'Spare servo and spare gecko wheels']],
  ['Tools', ['Hex keys and screwdrivers', 'Zip ties and tape', 'Spare screws and nuts', 'Safety glasses for everyone', 'Power strip and extension cord']],
  ['Team', ['Team shirts', 'Printed Engineering Portfolio', 'Permission slips', 'Water and snacks', 'Our pit sign']],
];
const INSPECT = ['Robot fits inside the starting size', 'Battery is held down tight and the main switch is easy to reach', 'No sharp edges or loose parts', 'All wires are tied down and away from moving parts', 'Team number signs are on the robot', 'Control Hub and Driver Station software are up to date', 'Robot stops when the Driver Station says stop'];
function competitions(view, ctx) {
  let packed = [];
  try { packed = JSON.parse(ctx.local.get('kwc-pack') || '[]'); if (!Array.isArray(packed)) packed = []; } catch (e) { packed = []; }
  const total = PACK.reduce((a, [, l]) => a + l.length, 0);
  const tick = (id, label, on, kind) => `<button class="tick" type="button" role="checkbox" aria-checked="${on}" data-${kind}="${esc(id)}"><span class="bx">${icon('check')}</span><span>${esc(label)}</span></button>`;
  view.innerHTML = `<div class="zv">
    ${strip('Everything for meet day: how long is left, the plan for the day, what to pack and a practice inspection. The event date and schedule are samples until the league posts the real ones.', [tag('Phase 2 · Dec 7–18'), SAMPLE])}
    <article class="card c7">
      <div class="card-head"><h3 class="card-title">League meet 1</h3>${tag('Sample date')}</div>
      <div class="countdown" id="compCount" role="timer" aria-label="Time until League meet 1"></div>
      <p class="lead">Saturday, January 16, 2027. Load-in at 7:30 AM. The venue is announced by the league.</p>
      <div class="row wrap"><button class="btn soft pill sm" type="button" id="compCal">${icon('calendar', 'i sm')}See it on the calendar</button><button class="btn soft pill sm" type="button" data-goto="logbook|Portfolio">${icon('book', 'i sm')}Get the portfolio ready</button></div>
    </article>
    <article class="card c5">
      <div class="card-head"><h3 class="card-title">The day</h3>${tag('Sample schedule')}</div>
      <div class="sched">${[['7:30', 'Load-in and set up the pit'], ['8:00', 'Robot inspection'], ['9:00', 'Judging interview'], ['10:00', 'Qualification matches start'], ['12:00', 'Lunch'], ['1:00', 'More matches'], ['3:30', 'Awards']].map(([t, w]) => `<div><time>${t}</time><span>${w}</span></div>`).join('')}</div>
      <p class="cap" style="font-weight:400">The real schedule comes from the event, usually about a week before.</p>
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
    <article class="card">
      <div class="card-head"><h3 class="card-title">Results</h3></div>
      <div class="lb-empty"><span class="oc2">${icon('trophy', 'i sm')}</span><div><b>No results yet</b><p class="cap" style="font-weight:400">After League meet 1, match scores, awards and what we learned show up here.</p></div></div>
    </article>
  </div>`;
  const count = () => {
    const ms = Math.max(0, MEET1 - Date.now());
    const d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.floor((ms % 36e5) / 6e4);
    $('#compCount', view).innerHTML = ms ? `<span><b>${d}</b> <span class="cap">days</span></span><span><b>${h}</b> <span class="cap">hours</span></span><span><b>${m}</b> <span class="cap">min</span></span>` : '<b>Today!</b>';
  };
  const packUI = () => {
    $('#packCount', view).textContent = `${packed.length} of ${total} packed`;
    $('.prog i', view).style.width = `${(packed.length / total) * 100}%`;
    $('.prog', view).setAttribute('aria-label', `${packed.length} of ${total} packed`);
  };
  const inspUI = () => { const n = $$('[data-ins][aria-checked="true"]', view).length; $('#inspCount', view).textContent = `${n} of ${INSPECT.length}`; };
  count(); packUI(); inspUI();
  const timer = setInterval(count, 10000);
  view.addEventListener('click', (e) => {
    const p = e.target.closest('[data-pk]');
    if (p) {
      const id = p.dataset.pk, on = !packed.includes(id);
      packed = on ? [...packed, id] : packed.filter((x) => x !== id);
      p.setAttribute('aria-checked', String(on));
      ctx.local.set('kwc-pack', JSON.stringify(packed));
      packUI();
      if (on && packed.length === total) ctx.toast('Everything is packed. Have a great meet!');
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
    if (e.target.closest('#compCal')) { ctx.state.calMonth = +D(2027, 0, 1); ctx.state.calSel = +D(2027, 0, 16); ctx.go('logbook', 'Calendar'); }
  });
  return () => clearInterval(timer);
}

// ================================================================= Portfolio
const NOTE = (id) => NOTES.find((n) => n.id === id);
const PF = {
  team: { kick: 'Our team', title: 'Meet Kilowattchaos', lines: [92, 100, 84, 96, 60],
    facts: [['Who we are', '7 students in 7th grade and our mentor, Coach. Each of us owns at least one subsystem.'], ['How we work', `We meet on Tuesdays and Thursdays. Average attendance is ${(NOTES.reduce((a, n) => a + n.came.length, 0) / NOTES.length).toFixed(1)} of 7 over the last ${NOTES.length} sessions.`]],
    src: [['People', 'crew|People', 'users'], ['5 session notes', 'notes', 'note']], built: 'Built from: People, 5 session notes' },
  outreach: { kick: 'Outreach', title: 'Sharing robotics', lines: [88, 70],
    facts: [['Planned', "Nova's robot demo at the library in December."], ['So far', '6 outreach hours logged (sample).']],
    src: [['Calendar: Library robot demo', 'logbook|Calendar', 'calendar']], built: 'Built from: 1 calendar event' },
  design: { kick: 'Design process', title: 'How we choose', lines: [96, 88, 72],
    facts: [['Test, measure, change one thing', 'Intake: stock spacing picked up 5 of 10. Moving the gecko wheels 4 mm closer made it 7 of 10.'], ['Counting failures', 'Servo gate: two balls slipped through together 3 of 10 times, so next we try a longer pause.']],
    src: [['Ideas board', 'build|Ideas', 'bulb'], ['Decision matrix', 'build|Mechanism Lab', 'sliders'], ['Session notes Oct 22, Nov 3, Nov 5', 'notes', 'note']], built: 'Built from: 3 session notes, 2 tests, Ideas', matrix: true },
  robot: { kick: 'Robot overview', title: 'Our robot', lines: [90, 76], img: true,
    facts: [['Starting point', 'The goBILDA StarterBot: 418 parts in seven subsystems.'], ['Changed so far', 'Gecko wheels 4 mm closer, a printed gate arm, and a brace planned for the launcher mount.']],
    src: [['Robot, Versions', 'robot|Versions', 'commit'], ['Robot, Subsystems', 'robot|Subsystems', 'bot']], built: 'Built from: StarterBot CAD, 7 subsystem pages' },
  intake: { kick: 'Subsystem', title: 'Intake', lines: [94, 100, 66],
    facts: [['Oct 22', 'Stock gecko wheel spacing: 5 of 10 balls from a pile.'], ['Nov 5', 'Gecko wheels 4 mm closer: 7 of 10 balls.'], ['Next', 'Try 6 mm closer. Goal: 8 of 10.']],
    src: [['Session note Oct 22', 'n1022', 'note'], ['Session note Oct 27', 'n1027', 'note'], ['Session note Nov 5', 'n1105', 'note']], built: 'Built from: 3 session notes, 2 tests' },
  launcher: { kick: 'Subsystem', title: 'Launcher', lines: [86, 74],
    facts: [['Oct 27', 'Flywheel spin-up: 1.4 s to full speed on a fresh battery.'], ['Oct 29', 'The mount wobbles at full speed. We are adding a brace.'], ['Nov 5', 'Ten shots from 4 ft: 6 of 10 in the target box.']],
    src: [['Session note Oct 27', 'n1027', 'note'], ['Session note Oct 29', 'n1029', 'note'], ['Session note Nov 5', 'n1105', 'note']], built: 'Built from: 3 session notes, 3 tests' },
  code: { kick: 'Subsystem', title: 'Code', lines: [],
    facts: [['Facts waiting for you', 'Oct 20: a 1.1 strafe factor fixed a 3 in. drift over 6 ft. Nov 5: the drive-forward autonomous ran on the floor.']],
    src: [['Code, Our code', 'code|Our code', 'code'], ['Session note Nov 5', 'n1105', 'note']], built: 'Built from: 1 session note, commits', empty: true },
};
function matrixHtml() {
  const tot = MATRIX.s.map((row) => row.reduce((a, v, j) => a + v * MATRIX.crit[j][1], 0));
  const best = Math.max(...tot), max = MATRIX.crit.reduce((a, c) => a + 5 * c[1], 0);
  return `<table class="pmx"><caption>Decision matrix · Launcher (score 1 to 5, times the weight)</caption><thead><tr><th>Option</th>${MATRIX.crit.map(([c, w]) => `<th>${esc(c)}<small>×${w}</small></th>`).join('')}<th>Total</th></tr></thead>
    <tbody>${MATRIX.opts.map((o, i) => `<tr class="${tot[i] === best ? 'win' : ''}"><th>${esc(o)}</th>${MATRIX.s[i].map((v) => `<td>${v}</td>`).join('')}<td><b>${tot[i]}</b><small>/${max}</small></td></tr>`).join('')}</tbody></table>`;
}
function portfolio(view, ctx) {
  let cur = ctx.state.pfSec || 'robot';
  const status = (s) => (s.id === 'design' && ctx.state.matrixSaved ? 'Drafted' : s.st);
  view.innerHTML = `<div class="zv">
    ${strip("A helper for FIRST's Engineering Portfolio. It gathers the facts from session notes, tests and decisions, and you write the story in your own words, because judges want to hear from you.", [tag('Phase 2 · Dec 7–18'), SAMPLE],
      `<button class="btn soft pill sm" type="button" data-toast="Export arrives in Phase 7, March 22 to April 30. Until then, copy the facts and write in a doc.">${icon('printer', 'i sm')}Export PDF</button><button class="btn soft pill sm" type="button" data-toast="Export to Google Docs arrives in Phase 7, March 22 to April 30.">${icon('note', 'i sm')}Google Docs</button>`)}
    <article class="card c4">
      <div class="card-head"><h3 class="card-title">Sections</h3><span class="tag" id="pfCount"></span></div>
      <div class="secs" id="pfSecs"></div>
      <div class="callout lb-soft">${icon('bulb')}<div><b>Your words, not the Hub's.</b> The helper only collects facts and numbers. Judges want to hear how the team thinks, so each of you writes your own part.</div></div>
    </article>
    <article class="card c8">
      <div class="card-head"><h3 class="card-title" id="pfTitle"></h3><span class="tag" id="pfBy"></span></div>
      <div class="lb-pf"><div class="paper" id="pfPaper" aria-label="Page preview"></div><div class="stack-v lb-pfside" id="pfSide"></div></div>
    </article>
  </div>`;
  const secs = () => {
    $('#pfCount', view).textContent = `${SECS.filter((s) => status(s) === 'Drafted').length} of ${SECS.length} drafted`;
    $('#pfSecs', view).innerHTML = SECS.map((s) => { const st = status(s); return `<button type="button" data-sec="${s.id}" aria-pressed="${s.id === cur}"><span class="oc2 lb-oc">${icon(s.ic, 'i sm')}</span><span><span class="t">${s.t}</span><span class="cap" style="display:block">${s.by}</span></span><span class="st${st === 'Drafted' ? ' solid' : ''}">${st === 'Empty' ? '' : dot(st === 'Drafted' ? 'var(--volt)' : 'var(--warn)', 8)}${st}</span></button>`; }).join('');
  };
  const page = () => {
    const s = SECS.find((x) => x.id === cur), p = PF[cur];
    const mx = p.matrix && ctx.state.matrixSaved;
    $('#pfTitle', view).textContent = s.t;
    $('#pfBy', view).textContent = `${status(s)} · ${s.by}`;
    const ln = (w) => `<div class="ln" style="width:${w}%"></div>`;
    $('#pfPaper', view).innerHTML = `<div class="pk">Kilowattchaos · ${esc(p.kick)}</div><div class="ph1">${esc(p.title)}</div>
      ${p.empty ? `<div class="blk lb-dash"><b>Nothing written yet</b><span>${esc(p.facts[0][1])}</span></div>` : ''}
      ${p.img ? `<div class="img" style="aspect-ratio:16/10"><img src="/hub/assets/poster.webp" alt="The team's StarterBot robot, a render from the CAD model"></div>` : ''}
      ${p.lines.slice(0, 3).map(ln).join('')}
      ${p.empty ? '' : p.facts.slice(0, mx ? 1 : 3).map(([k, v]) => `<div class="blk"><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join('')}
      ${p.matrix ? (mx ? matrixHtml() : '<div class="blk lb-dash"><b>Decision matrix goes here</b><span>Save the launcher matrix in Build, Mechanism Lab to add it.</span></div>') : ''}
      ${p.lines.slice(3).map(ln).join('')}
      <div class="src">${esc(mx ? p.built.replace('Ideas', 'Ideas, the decision matrix') : p.built)}</div>`;
    $('#pfSide', view).innerHTML = `<h4 class="sub">Hub sources</h4>
      <div class="items">${p.src.map(([t, to, ic]) => {
        const attr = to === 'notes' ? 'data-pnote="n1105"' : /^n\d/.test(to) ? `data-pnote="${to}"` : `data-goto="${to}"`;
        return `<button class="it" type="button" ${attr}><span class="oc2">${icon(ic, 'i sm')}</span><div class="grow"><div class="t">${esc(t)}</div></div>${icon('arrow', 'i sm')}</button>`;
      }).join('')}</div>
      ${p.matrix && !mx ? `<div class="callout lb-soft">${icon('sliders')}<div>The launcher decision matrix is not saved yet. Score it together in the Mechanism Lab and press Save to Portfolio.<div style="margin-top:8px"><button class="btn primary pill sm" type="button" data-goto="build|Mechanism Lab">${icon('arrow', 'i sm')}Open the decision matrix</button></div></div></div>` : ''}
      ${mx ? `<p class="cap" style="font-weight:400">The matrix is live: change a score in the Mechanism Lab and it changes here too.</p>` : ''}
      <h4 class="sub">Facts to use</h4>
      <ul class="bul">${p.facts.map(([k, v]) => `<li><b>${esc(k)}:</b> ${esc(v)}</li>`).join('')}</ul>
      <div class="row wrap"><button class="btn soft pill sm" type="button" id="pfCopy">${icon('note', 'i sm')}Copy the facts</button></div>
      <p class="cap" style="font-weight:400">Use the facts as a starting point, then explain them your way: what you tried, why, and what you learned.</p>`;
    $('#pfCopy', view).addEventListener('click', () => copyText(`${s.t}\n${p.facts.map(([k, v]) => `- ${k}: ${v}`).join('\n')}`, ctx.toast));
  };
  secs(); page();
  view.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sec]');
    if (b) {
      cur = b.dataset.sec; ctx.state.pfSec = cur;
      $$('[data-sec]', view).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      page();
      if (matchMedia('(max-width: 1099px)').matches) $('#pfTitle', view).scrollIntoView({ behavior: ctx.reduced ? 'auto' : 'smooth', block: 'start' });
      return;
    }
    const n = e.target.closest('[data-pnote]');
    if (n) { ctx.state.note = n.dataset.pnote; ctx.go('logbook', 'Sessions'); }
  });
}

export const LOGBOOK = { Calendar: calendar, Sessions: sessions, Progress: progress, Competitions: competitions, Portfolio: portfolio };
