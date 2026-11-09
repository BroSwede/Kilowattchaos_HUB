// Artifact edition of the hub's data layer: same interface as public/hub/api.js,
// but stored in the artifact's shared database and signed in through claude.ai.
// gate.js fills `session` (and `ctxState`) before app.js loads.
const S = { db: null, uid: null, team: null };

export const session = { user: null, roster: [], team: { name: 'Kilowattchaos', chatEnabled: false }, demo: false, artifact: true };
export const isMentor = () => session.user?.role === 'mentor';
export const me = () => session.user?.name || '';
export function bindStore({ db, uid, team }) { Object.assign(S, { db, uid, team }); }

const KINDS = {
  task: ['team', 'any', 'any'], idea: ['team', 'any', 'author'], vote: ['team', 'any', 'author'], matrix: ['team', 'any', 'any'],
  print: ['team', 'any', 'any'], inventory: ['team', 'any', 'any'], issue: ['team', 'any', 'any'], version: ['team', 'mentor', 'mentor'],
  progress: ['team', 'any', 'author'], badge: ['team', 'mentor', 'mentor'], challenge: ['team', 'mentor', 'mentor'], submission: ['team', 'any', 'author'],
  arena: ['team', 'any', 'author'], chat: ['team', 'any', 'author'], inspiration: ['team', 'any', 'author'], feedback: ['team', 'any', 'author'],
  word: ['team', 'any', 'author'], event: ['team', 'mentor', 'mentor'], rsvp: ['team', 'any', 'author'], session: ['team', 'any', 'any'],
  photo: ['team', 'any', 'author'], competition: ['team', 'mentor', 'mentor'], portfolio: ['team', 'any', 'any'], shoutout: ['team', 'any', 'author'],
  agenda: ['team', 'mentor', 'mentor'], layout: ['self', 'any', 'author'], pref: ['self', 'any', 'author'],
};
const fail = (m) => { throw new Error(m); };
const rule = (kind) => KINDS[kind] || fail('Unknown kind.');
const nowIso = () => new Date().toISOString();
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
const rec = (snap) => ({ id: snap.id, ...snap.data() });
const why = (e) => (e && e.code === 'not_granted' ? new Error('You can look around, but saving needs edit access to this page. Ask Eric.') : e instanceof Error ? e : new Error(e?.message || 'Could not save.'));

async function load(kind, id) {
  const snap = await S.db.doc(`records/${id}`).get();
  if (!snap.exists || snap.data().kind !== kind) fail('Not found.');
  return rec(snap);
}
const shape = (r) => ({ id: r.id, user_id: r.user_id, author: r.author, data: r.data || {}, created_at: r.created_at, updated_at: r.updated_at });

export const api = {
  async me() { return { user: session.user, team: session.team, roster: session.roster, demo: false }; },
  async list(kind) {
    const [see] = rule(kind);
    const snap = await S.db.collection('records').where('kind', '==', kind).limit(1000).get();
    let items = snap.docs.map(rec);
    if (see === 'self' && !isMentor()) items = items.filter((r) => r.user_id === S.uid);
    return items.sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).map(shape);
  },
  async create(kind, data) {
    const [, create] = rule(kind);
    if (create === 'mentor' && !isMentor()) fail('Only mentors can add this.');
    if (kind === 'chat' && !session.team.chatEnabled) fail('Chat is off until a second youth-protection-trained adult is set up.');
    if (!data || typeof data !== 'object' || Array.isArray(data)) fail('Send an object.');
    if (JSON.stringify(data).length > (kind === 'chat' ? 2000 : 20000)) fail('That is too long.');
    const id = newId(), t = nowIso();
    const r = { kind, user_id: S.uid, author: session.user.name, data, created_at: t, updated_at: t };
    try { await S.db.doc(`records/${id}`).set(r); } catch (e) { throw why(e); }
    return shape({ id, ...r });
  },
  async update(kind, id, patch) {
    const [see, , edit] = rule(kind);
    const r = await load(kind, id);
    const mine = r.user_id === S.uid;
    if (!(isMentor() || (edit === 'any' && see === 'team') || (edit === 'author' && mine))) fail('You can only change your own.');
    const data = { ...(r.data || {}), ...patch };
    if (JSON.stringify(data).length > 20000) fail('That is too long.');
    const t = nowIso();
    try { await S.db.doc(`records/${id}`).update({ data, updated_at: t }); } catch (e) { throw why(e); }
    return shape({ ...r, data, updated_at: t });
  },
  async remove(kind, id) {
    const r = await load(kind, id);
    if (r.user_id !== S.uid && !isMentor()) fail('You can only remove your own.');
    try { await S.db.doc(`records/${id}`).delete(); } catch (e) { throw why(e); }
    return { ok: true };
  },
  async checkinInfo() {
    const code = await checkinCode(S.team.secret);
    const day = today();
    const snap = await S.db.collection('checkins').where('day', '==', day).limit(200).get();
    const ids = new Set(snap.docs.map((d) => d.data().user_id));
    const here = session.roster.filter((r) => ids.has(r.id)).map((r) => ({ name: r.name, color: r.color }));
    const url = location.href.split('#')[0];
    const svg = qrSvg(code);
    return { code, url, svg, here, total: session.roster.filter((r) => r.role === 'student').length };
  },
  async checkin(code) {
    if (String(code || '').trim().toUpperCase() !== (await checkinCode(S.team.secret))) fail("That isn't today's code.");
    try { await S.db.doc(`checkins/${today()}__${S.uid}`).set({ user_id: S.uid, day: today(), at: nowIso() }); } catch (e) { throw why(e); }
    return { ok: true };
  },
};

// ---------------------------------------------------------------- daily code (same scheme as the server)
const WORDS = ['VOLT', 'GEAR', 'HEXA', 'BOLT', 'SPARK', 'TORQUE', 'SERVO', 'POLLEN', 'NECTAR', 'HIVE', 'AMP', 'ROTOR', 'PIXEL', 'MOTOR'];
export function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
export async function checkinCode(secret, day = today()) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(day)));
  return WORDS[h[0] % WORDS.length] + '-' + String(((h[1] << 8) | h[2]) % 1000).padStart(3, '0');
}
function qrSvg(text) {
  const Q = window.qrcode;
  if (!Q) return '';
  const qr = Q(0, 'M'); qr.addData(text); qr.make();
  return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
}
