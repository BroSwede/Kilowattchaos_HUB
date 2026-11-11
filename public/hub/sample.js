// Filler for the Home dashboard and the Shop TV while the team's own records are empty.
// Each list (events, tasks, prints...) uses these samples only until the team saves its first real record of that
// kind, then the real records take over. Samples are never written to the database. Every date is worked out from
// today, so the dashboard always looks like a team in the middle of its season.

// Seven made-up student nicknames (the hub never uses real names) and a mentor.
export const SAMPLE_CREW = [
  ['Sparky', '#F07A2A'], ['Nova', '#0E8F9E'], ['Pixel', '#B394FF'], ['Bolt', '#2340A8'],
  ['Comet', '#C42D6B'], ['Gizmo', '#9A968A'], ['Echo', '#EBF974'],
];
export const SAMPLE_MENTOR = 'Coach Lee';
export const isSample = (r) => !!(r && r.sample);

const DAY = 864e5;
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const at = (d, h, m = 0) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m);
const plus = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

// The next few Tuesday and Thursday meetings (3:30 to 5:30), counting today if it hasn't ended yet.
function meetingDays(now, count) {
  const out = [];
  for (let i = 0; out.length < count && i < 30; i++) {
    const d = plus(now, i);
    if ((d.getDay() === 2 || d.getDay() === 4) && at(d, 17, 30) > now) out.push(d);
  }
  return out;
}

export function buildSamples(me, mentor) {
  const now = new Date();
  const names = SAMPLE_CREW.map(([n]) => n);
  const [sparky, nova, pixel, bolt, comet, gizmo, echo] = names;
  let seq = 0;
  // Older records first, so "ago" times look natural. Students' own tasks point at them so their view isn't empty.
  const rec = (author, data, ageDays = 1, updatedDays = ageDays) => {
    const created = new Date(now - ageDays * DAY), updated = new Date(now - updatedDays * DAY);
    return { id: `sample-${++seq}`, sample: true, user_id: `sample-${author}`, author, data, created_at: created.toISOString(), updated_at: updated.toISOString() };
  };
  const you = mentor ? null : me.name;
  const meets = meetingDays(now, 4);
  const next = meets[0];

  const events = [
    ...meets.map((d, i) => rec(SAMPLE_MENTOR, {
      title: i === 1 ? 'Team meeting: launcher tuning' : 'Team meeting',
      date: ymd(d), start: '3:30 pm', end: '5:30 pm', where: 'Room 114 (STEM lab)',
      bring: i === 0 ? ['Safety glasses', 'Charged phone for check-in', 'Engineering notebook'] : ['Safety glasses'],
    }, 6)),
    rec(SAMPLE_MENTOR, { title: 'Saturday build day', date: ymd(plus(now, ((6 - now.getDay() + 7) % 7) || 7)), start: '10:00 am', end: '1:00 pm', where: 'Room 114 (STEM lab)', bring: ['Lunch', 'Safety glasses'] }, 5),
  ];
  const nextId = events[0].id;
  const rsvps = [sparky, nova, pixel, bolt, gizmo].map((n, i) => rec(n, { event: nextId, going: true }, 2 - i * 0.3));

  const comps = [
    rec(SAMPLE_MENTOR, { name: 'League Meet 1', date: '2026-12-12', where: 'Central Middle School gym' }, 20),
    rec(SAMPLE_MENTOR, { name: 'League Meet 2', date: '2027-01-16', where: 'Riverside High School' }, 20),
    rec(SAMPLE_MENTOR, { name: 'League Tournament', date: '2027-02-06', where: 'County Expo Center' }, 20),
  ];

  const due = (n) => ymd(plus(now, n));
  const tasks = [
    rec(SAMPLE_MENTOR, { title: 'Measure the flywheel speed at full power', who: [you || sparky], sys: 'launcher', due: due(1), done: false }, 3),
    rec(SAMPLE_MENTOR, { title: 'Write an auto that drives off the start line', who: [you || nova], sys: 'code', due: due(2), done: false }, 4),
    rec(SAMPLE_MENTOR, { title: 'Tighten the mecanum wheel hubs', who: [bolt], sys: 'drivetrain', due: due(0), done: false }, 2),
    rec(SAMPLE_MENTOR, { title: 'Test the new intake roller spacing', who: [pixel], sys: 'intake', due: due(3), done: false }, 2),
    rec(SAMPLE_MENTOR, { title: 'Label every wire at the control hub', who: [comet], sys: 'power', due: due(5), done: false }, 5),
    rec(SAMPLE_MENTOR, { title: 'Photograph the robot for the portfolio', who: [you || echo], sys: 'portfolio', due: due(6), done: false }, 1),
    rec(SAMPLE_MENTOR, { title: 'Sketch two ball path ideas in the notebook', who: [gizmo], sys: 'ballpath', due: due(-1), done: true }, 6, 1),
  ];

  const agenda = [rec(SAMPLE_MENTOR, {
    date: ymd(next),
    items: [
      { time: '3:30 pm', what: 'Check in, safety glasses on, quick huddle', sys: '', who: [] },
      { time: '3:45 pm', what: 'Launcher: test three flywheel speeds and log the shots', sys: 'launcher', who: [sparky, bolt] },
      { time: '3:45 pm', what: 'Code: drive-off-the-line auto in OnBot Java', sys: 'code', who: [nova, comet] },
      { time: '4:30 pm', what: 'Intake: swap rollers and count balls per 10 seconds', sys: 'intake', who: [pixel, gizmo] },
      { time: '5:10 pm', what: 'Notebook time: everyone writes what they learned', sys: 'portfolio', who: [echo] },
      { time: '5:25 pm', what: 'Clean up, batteries on the chargers', sys: '', who: [] },
    ],
  }, 1)];

  const prints = [
    rec(pixel, { name: 'Intake roller spacer (x4)', status: 'printing', progress: 62, printer: 'Bambu A1', who: pixel }, 0.2, 0.05),
    rec(sparky, { name: 'Launcher hood v2', status: 'queued', who: sparky }, 0.15),
    rec(echo, { name: 'Team number plate', status: 'queued', who: echo }, 0.1),
    rec(bolt, { name: 'Battery holder clip', status: 'done', who: bolt }, 1.5, 0.6),
  ];

  const sessions = [
    rec(nova, { date: ymd(plus(now, -9)), title: 'First drive test', summary: 'Drove the StarterBot for the first time. Strafing pulls to the left, so we added a 1.1 fix in code.' }, 9),
    rec(sparky, { date: ymd(plus(now, -7)), title: 'Launcher first shots', summary: 'Launcher scored 6 of 10 from the near spot. Next: try a faster flywheel and log every shot.' }, 7),
    rec(gizmo, { date: ymd(plus(now, -2)), title: 'Ball path jam hunt', summary: 'Found the jam in the ball path: the second roller was too low. Printed a spacer and it fed 10 balls in a row.' }, 2),
  ];

  const versions = [rec(SAMPLE_MENTOR, { name: 'StarterBot v0.2', date: ymd(plus(now, -5)), notes: 'Intake spacers and a stiffer launcher mount.' }, 5)];

  const shoutouts = [
    rec(nova, { to: gizmo, text: 'Gizmo found the ball path jam and fixed it with a tiny printed spacer!' }, 2),
    rec(SAMPLE_MENTOR, { to: you || bolt, text: 'Super careful wiring today. Every connector clicked in and labeled.' }, 1),
    rec(pixel, { to: sparky, text: 'Sparky logged all 30 launcher shots, so we finally know which speed works best.' }, 3),
    rec(echo, { to: comet, text: 'Comet explained field-centric drive to the whole team. It finally makes sense!' }, 4),
  ];

  return { events, rsvps, comps, tasks, agenda, prints, sessions, versions, shoutouts };
}
