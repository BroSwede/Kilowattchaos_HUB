// Preview mode: the hub with no sign-in and no database, for showing the team what is coming.
// Everything starts as made-up sample content, and anything a visitor adds stays in this browser tab only.
// Nothing is ever sent to the server. Turn preview off with HUB_MODE=live in Vercel when the team goes live.
import { buildSamples, SAMPLE_CREW, SAMPLE_MENTOR } from './sample.js';

const DAY = 864e5, HOUR = 36e5, MIN = 6e4;
// The nickname typed on the pretend sign-in page (if any), kept for this tab only.
function visitorName() {
  let n = '';
  try {
    const q = new URLSearchParams(location.search).get('as');
    if (q !== null) sessionStorage.setItem('kwc-preview-name', q);
    n = sessionStorage.getItem('kwc-preview-name') || '';
  } catch (e) { /* storage blocked */ }
  n = n.replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 20);
  const taken = new Set(['Coach Lee', 'Sparky', 'Nova', 'Pixel', 'Bolt', 'Comet', 'Gizmo', 'Echo'].map((x) => x.toLowerCase()));
  return n && !taken.has(n.toLowerCase()) ? n : 'Visitor';
}
export const VISITOR = { id: 'preview-visitor', name: visitorName(), role: 'student', color: '#E8F542', title: 'Guest', subs: [] };

export const PREVIEW_ME = {
  user: VISITOR,
  team: { name: 'Kilowattchaos', chatEnabled: true },
  roster: [
    { id: 'sample-Coach Lee', name: SAMPLE_MENTOR, color: '#4F5049', role: 'mentor', title: 'Head mentor', subs: [], here: true },
    ...SAMPLE_CREW.map(([name, color], i) => ({ id: `sample-${name}`, name, color, role: 'student', title: '', subs: [], here: i < 5 })),
    { ...VISITOR, here: false },
  ],
  demo: false,
  preview: true,
};

let seq = 0;
function seed() {
  const now = Date.now();
  const rec = (author, data, agoMs) => {
    const t = new Date(now - agoMs).toISOString();
    return { id: `preview-${++seq}`, sample: true, user_id: `sample-${author}`, author, data, created_at: t, updated_at: t };
  };
  const store = {};
  // The Home dashboard's samples (meetings, tasks, prints...) so every zone shows the same made-up season.
  const s = buildSamples(VISITOR, false);
  const map = { event: 'events', rsvp: 'rsvps', competition: 'comps', task: 'tasks', agenda: 'agenda', print: 'prints', session: 'sessions', version: 'versions', shoutout: 'shoutouts' };
  for (const [kind, key] of Object.entries(map)) store[kind] = s[key];

  // ---- Chat: a few days of made-up team talk in every channel.
  const say = (who, channel, text, agoMs) => rec(who, { channel, text }, agoMs);
  const chat = [
    say(SAMPLE_MENTOR, 'announcements', 'Welcome to the hub, everyone! This is where meeting news goes. Safety glasses on every build day, please.', 3 * DAY),
    say(SAMPLE_MENTOR, 'announcements', 'Saturday build day is on: 10 to 1 in Room 114. Bring a lunch. We are testing the launcher.', 20 * HOUR),
    say('Nova', 'general', 'Does anyone know if we meet on Thursday this week?', 2 * DAY),
    say('Echo', 'general', 'Yes! Same time, 3:30. Check the calendar on Home.', 2 * DAY - 10 * MIN),
    say('Comet', 'general', 'I made a robot avatar that looks like it is sleeping 😴', 26 * HOUR),
    say('Sparky', 'general', 'lol mine looks angry', 26 * HOUR - 4 * MIN),
    say('Pixel', 'build', 'The intake drops balls when it is fully loaded. I think the second roller sits too low.', 2 * DAY + 3 * HOUR),
    say('Gizmo', 'build', 'I printed a 4 mm spacer for it. It fed 10 balls in a row after that!', 2 * DAY),
    say('Bolt', 'build', 'Front left mecanum wheel is wobbly again. Can someone help me tighten the hub screws on Thursday?', 9 * HOUR),
    say('Sparky', 'build', 'Launcher log so far: 6 of 10 at 1,500 rpm, 8 of 10 at 1,900 rpm. Trying 2,100 next.', 5 * HOUR),
    say('Nova', 'code', 'My drive-off-the-line auto works but it drifts left. Is that the strafe fix thing?', 30 * HOUR),
    say(SAMPLE_MENTOR, 'code', 'Good catch. Try the 1.1 multiplier on strafe, and drive slower at the start so the wheels do not slip.', 29 * HOUR),
    say('Comet', 'code', 'Field-centric drive finally clicked for me. The robot drives the same way no matter where it faces.', 6 * HOUR),
    say('Echo', 'help', 'How do I charge the battery? I do not want to break it.', 28 * HOUR),
    say(SAMPLE_MENTOR, 'help', 'Great question to ask! Use the team charger only, plug the battery in first, then the wall. A mentor checks it before every meet.', 27 * HOUR),
    say('Pixel', 'help', 'What does "compression" mean on the launcher sim?', 3 * HOUR),
    say('Sparky', 'help', 'It is how much the wheel squishes the ball. More squish = more grip, but too much slows the wheel down.', 2 * HOUR),
    say('Nova', 'shoutouts', 'Shoutout to Gizmo for finding the ball path jam!', 2 * DAY - HOUR),
    say('Bolt', 'shoutouts', 'Thanks Echo for labeling all the wires. Super easy to find stuff now.', 4 * HOUR),
  ];
  store.chat = chat;
  const react = (msg, who, emoji) => rec(who, { chat: msg.id, emoji }, 0);
  const votes = [
    react(chat[1], 'Sparky', '🎉'), react(chat[1], 'Nova', '🎉'), react(chat[1], 'Bolt', '👍'),
    react(chat[5], 'Comet', '😂'), react(chat[5], 'Echo', '😂'),
    react(chat[7], 'Pixel', '🎉'), react(chat[7], 'Nova', '💡'),
    react(chat[9], 'Bolt', '👀'), react(chat[9], SAMPLE_MENTOR, '👍'),
    react(chat[12], 'Nova', '💡'), react(chat[16], 'Pixel', '❤️'), react(chat[17], 'Gizmo', '❤️'), react(chat[18], 'Echo', '❤️'),
  ];

  // ---- Build ideas: a board with cards in every column, votes and "I like / I wonder / What if" replies.
  const idea = (who, d, agoMs) => rec(who, { tags: [], link: '', pinned: false, ...d }, agoMs);
  const ideas = [
    idea('Pixel', { kind: 'prob', t: 'Intake drops balls when the robot is full', sys: 'intake', st: 'On the robot', pinned: true, d: 'Once three balls are inside, the fourth bounces off the roller. A 4 mm spacer under the second roller fixed most of it.', tags: ['More reliable'] }, 6 * DAY),
    idea('Sparky', { kind: 'idea', t: 'Adjustable hood so we can shoot from two spots', sys: 'launcher', st: 'Prototyping', d: 'A servo tilts the hood between a near angle and a far angle. Try it on the launcher sim first: 48 degrees for near, about 38 for far.', tags: ['Faster', 'Seen on another team'] }, 5 * DAY),
    idea('Nova', { kind: 'idea', t: 'Auto that scores the preload, then parks', sys: 'drivetrain', st: 'Exploring', d: 'Drive forward, shoot the preloaded ball, then strafe into the parking zone. Should be about 8 seconds.', tags: ['Autonomous'] }, 4 * DAY),
    idea('Bolt', { kind: 'prob', t: 'Front left wheel keeps coming loose', sys: 'drivetrain', st: 'Exploring', d: 'The set screws back out after a few matches. Maybe thread locker, or a clamping hub instead?', tags: ['More reliable'] }, 3 * DAY),
    idea('Gizmo', { kind: 'idea', t: 'Ball counter light so the driver knows when we are full', sys: 'ballpath', st: 'New', d: 'A distance sensor at the top of the ball path, and the LED turns green at three balls.', tags: ['Easier to build'] }, 2 * DAY),
    idea('Comet', { kind: 'idea', t: 'Cable chain to keep wires out of the wheels', sys: 'power', st: 'New', d: 'Printed cable chain along the frame rail so nothing can get pulled into the drivetrain.', tags: ['More reliable', 'Easier to build'] }, 30 * HOUR),
    idea('Echo', { kind: 'idea', t: 'Wider intake that grabs from the wall and corners', sys: 'intake', st: 'New', d: 'Saw a team use flexible flaps on the sides so balls along the wall get pulled in too.', tags: ['Wall and corner', 'Seen on another team'] }, 20 * HOUR),
    idea('Sparky', { kind: 'idea', t: 'Two flywheels instead of one', sys: 'launcher', st: 'Parked', d: 'More consistent shots, but it is heavier and needs another motor. Parked until we know if one wheel is good enough.', tags: ['Faster'] }, 7 * DAY),
    idea('Bolt', { kind: 'idea', t: 'Lighter top plate with holes cut in it', sys: 'structure', st: 'Prototyping', d: 'Pocketing the top plate could save about 150 g. We are cutting a cardboard copy first.', tags: ['Lighter'] }, 4 * DAY),
  ];
  const reply = (to, who, lens, text, agoMs) => rec(who, { replyTo: to.id, lens, text }, agoMs);
  const replies = [
    reply(ideas[0], 'Gizmo', 'I like', 'The spacer works great. It fed 10 balls in a row.', 2 * DAY),
    reply(ideas[1], 'Nova', 'I wonder', 'I wonder if the servo is fast enough to switch during a match?', 3 * DAY),
    reply(ideas[1], SAMPLE_MENTOR, 'What if', 'What if we test both angles on the sim and write the numbers in the notebook first?', 2 * DAY),
    reply(ideas[2], 'Comet', 'I like', 'I can help with the strafe part. I just learned field-centric.', DAY),
    reply(ideas[3], 'Pixel', 'What if', 'What if we use the clamping hubs from the parts bin?', 2 * DAY),
    reply(ideas[4], 'Echo', 'I like', 'This would help the driver so much!', 20 * HOUR),
    reply(ideas[6], 'Pixel', 'I wonder', 'I wonder if the flaps would push balls away too?', 10 * HOUR),
  ];
  store.idea = [...ideas, ...replies];
  const up = (i, who) => rec(who, { idea: ideas[i].id }, 0);
  votes.push(
    ...['Gizmo', 'Nova', 'Bolt', 'Echo', 'Comet'].map((w) => up(0, w)),
    ...['Nova', 'Pixel', 'Bolt', 'Comet'].map((w) => up(1, w)),
    ...['Sparky', 'Echo', 'Comet'].map((w) => up(2, w)),
    ...['Pixel', 'Gizmo'].map((w) => up(3, w)),
    ...['Echo', 'Sparky', 'Nova'].map((w) => up(4, w)),
    up(5, 'Bolt'), up(6, 'Gizmo'), up(6, 'Pixel'), up(8, 'Sparky'),
  );

  // ---- Hub feedback roadmap.
  const fb = (who, type, text, status, agoMs) => rec(who, { type, text, status }, agoMs);
  const feedback = [
    fb('Nova', 'idea', 'A timer on the Shop TV that counts down to the end of the meeting', 'planned', 4 * DAY),
    fb('Pixel', 'love', 'The launcher sim with the knobs is so fun', 'done', 3 * DAY),
    fb('Bolt', 'idea', 'Let us add photos to the build ideas', 'review', DAY),
    fb('Echo', 'broken', 'The robot takes a long time to load on my tablet', 'doing', 2 * DAY),
  ];
  store.feedback = feedback;
  votes.push(rec('Sparky', { feedback: feedback[0].id }, 0), rec('Comet', { feedback: feedback[0].id }, 0), rec('Gizmo', { feedback: feedback[1].id }, 0));

  store.vote = votes;
  return store;
}

let store = null;
const db = () => (store = store || seed());
const copy = (r) => ({ ...r, data: { ...r.data } });

export const previewApi = {
  me: async () => PREVIEW_ME,
  list: async (kind) => (db()[kind] || []).map(copy),
  create: async (kind, data) => {
    const t = new Date().toISOString();
    const r = { id: `local-${++seq}`, user_id: VISITOR.id, author: VISITOR.name, data: { ...data }, created_at: t, updated_at: t };
    (db()[kind] = db()[kind] || []).unshift(r);
    return copy(r);
  },
  update: async (kind, id, data) => {
    const r = (db()[kind] || []).find((x) => x.id === id);
    if (!r) throw new Error('That is not here any more.');
    Object.assign(r, { data: { ...r.data, ...data }, updated_at: new Date().toISOString() });
    return copy(r);
  },
  remove: async (kind, id) => { db()[kind] = (db()[kind] || []).filter((x) => x.id !== id); return { ok: true }; },
  checkinInfo: async () => ({ code: 'VOLT42', url: `${location.origin}/hub`, svg: '', total: 7, here: PREVIEW_ME.roster.filter((p) => p.here && p.role === 'student').map((p) => ({ name: p.name, color: p.color })) }),
  checkin: async () => { throw new Error('Check-in is turned off in the preview.'); },
};
