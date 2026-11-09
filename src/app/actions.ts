'use server';
import { redirect } from 'next/navigation';
import { randomBytes } from 'node:crypto';
import { q, one } from '@/lib/db';
import { newId, nameKey, hashPassword, checkPassword, startSession, endSession, currentUser, activeUser, audit } from '@/lib/auth';
import { ensureTeam, getTeam, hasMentor, makeTeamCode, checkinCode, today } from '@/lib/team';
import { AVATAR_COLORS } from '@/lib/colors';

const s = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const back = (path: string, e: string): never => redirect(`${path}${path.includes('?') ? '&' : '?'}e=${encodeURIComponent(e)}`);
const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9 _-]{1,18}[A-Za-z0-9]$/;

function checkName(name: string, path: string) {
  if (!NAME_RE.test(name)) back(path, 'Pick a display name of 3 to 20 letters or numbers.');
}
function checkPw(pw: string, path: string) {
  if (pw.length < 8) back(path, 'Use a password of at least 8 characters. Three short words work well.');
}

// ---------------------------------------------------------------- first mentor
export async function setupAction(f: FormData) {
  if (await hasMentor()) redirect('/login');
  const key = process.env.SETUP_KEY;
  if (process.env.NODE_ENV === 'production' && !key) back('/setup', 'Set SETUP_KEY in the Vercel project settings first.');
  if (key && s(f, 'key') !== key) back('/setup', "That setup key doesn't match.");
  const name = s(f, 'name'), pw = s(f, 'password');
  checkName(name, '/setup'); checkPw(pw, '/setup');
  await ensureTeam(s(f, 'team') || 'Kilowattchaos');
  const id = newId();
  await q(`INSERT INTO users (id, display_name, name_key, role, status, color, password_hash, title)
           VALUES ($1, $2, $3, 'mentor', 'active', '#4F5049', $4, 'Mentor')`, [id, name, nameKey(name), await hashPassword(pw)]);
  await audit(id, 'setup');
  await startSession(id);
  redirect('/mentor');
}

// ---------------------------------------------------------------- sign in / out
export async function loginAction(f: FormData) {
  const name = s(f, 'name'), pw = s(f, 'password');
  const u = await one<{ id: string; password_hash: string; status: string }>('SELECT id, password_hash, status FROM users WHERE name_key = $1', [nameKey(name)]);
  if (!u || !(await checkPassword(pw, u.password_hash))) back('/login', "That name and password don't match.");
  if (u!.status === 'disabled') back('/login', 'This account is turned off. Talk to a mentor.');
  await startSession(u!.id);
  const next = s(f, 'next');
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/hub');
}
export async function logoutAction() { await endSession(); redirect('/login'); }

// ---------------------------------------------------------------- student sign-up
export async function joinAction(f: FormData) {
  const t = await getTeam();
  if (!t) back('/join', 'The hub is not set up yet. Ask your mentor.');
  if (s(f, 'code').toUpperCase() !== t!.team_code.toUpperCase()) back('/join', "That Team Code isn't right. Your mentor has it.");
  const name = s(f, 'name'), pw = s(f, 'password'), parent = s(f, 'parent').toLowerCase();
  checkName(name, '/join'); checkPw(pw, '/join');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(parent)) back('/join', "Add a parent or guardian's email so a mentor can get their OK.");
  if (f.get('agree') !== 'on') back('/join', 'Read the Team Code and tick the box to agree.');
  const color = AVATAR_COLORS.includes(s(f, 'color')) ? s(f, 'color') : AVATAR_COLORS[0];
  if (await one('SELECT 1 FROM users WHERE name_key = $1', [nameKey(name)])) back('/join', 'Someone already has that name. Try another.');
  const id = newId();
  await q(`INSERT INTO users (id, display_name, name_key, role, status, color, password_hash, parent_email, consent_token)
           VALUES ($1, $2, $3, 'student', 'pending', $4, $5, $6, $7)`,
    [id, name, nameKey(name), color, await hashPassword(pw), parent, randomBytes(18).toString('base64url')]);
  await audit(id, 'join');
  await startSession(id);
  redirect('/pending');
}

// ---------------------------------------------------------------- parent consent (link a mentor sends to the parent)
export async function consentAction(f: FormData) {
  const token = s(f, 'token');
  const u = await one<{ id: string }>("SELECT id FROM users WHERE consent_token = $1 AND role = 'student'", [token]);
  if (!u) back('/consent/x', 'This link has expired. Ask the mentor for a new one.');
  const who = s(f, 'guardian');
  if (who.length < 3) back(`/consent/${token}`, 'Type your full name to sign.');
  if (f.get('agree') !== 'on') back(`/consent/${token}`, 'Tick the box to give permission.');
  await q('UPDATE users SET consent_name = $1, consent_at = now() WHERE id = $2', [who.slice(0, 120), u!.id]);
  await audit(u!.id, 'consent', who);
  redirect(`/consent/${token}?done=1`);
}

// ---------------------------------------------------------------- check in by code (typed or scanned)
export async function checkinAction(f: FormData) {
  const u = await activeUser();
  if (!u) redirect('/login?next=/checkin');
  const t = (await getTeam())!;
  if (s(f, 'code').toUpperCase() !== checkinCode(t.checkin_secret)) back('/checkin', "That isn't today's code. It's on the shop TV.");
  await q('INSERT INTO checkins (user_id, day) VALUES ($1, $2::date) ON CONFLICT DO NOTHING', [u!.id, today()]);
  redirect('/checkin?done=1');
}

// ---------------------------------------------------------------- mentor tools
async function mentor() {
  const u = await currentUser();
  if (!u || u.role !== 'mentor' || u.status !== 'active') redirect('/login?next=/mentor');
  return u!;
}
export async function approveAction(f: FormData) {
  const m = await mentor(); const id = s(f, 'id');
  const kid = await one<{ consent_at: string | null }>("SELECT consent_at FROM users WHERE id = $1 AND role = 'student'", [id]);
  if (!kid) back('/mentor', 'Not found.');
  if (!kid!.consent_at && f.get('paper') !== 'on') back('/mentor', 'Get parent permission first: send the link, or tick "Paper form on file".');
  await q(`UPDATE users SET status = 'active', approved_by = $1, approved_at = now(),
           consent_at = COALESCE(consent_at, now()), consent_name = COALESCE(consent_name, 'Paper form on file') WHERE id = $2`, [m.id, id]);
  await audit(m.id, 'approve', id);
  redirect('/mentor?ok=Approved');
}
export async function setStatusAction(f: FormData) {
  const m = await mentor(); const id = s(f, 'id'); const st = s(f, 'status');
  if (!['active', 'disabled'].includes(st) || id === m.id) back('/mentor', 'Not allowed.');
  await q('UPDATE users SET status = $1 WHERE id = $2', [st, id]);
  if (st === 'disabled') await q('DELETE FROM sessions WHERE user_id = $1', [id]);
  await audit(m.id, `status:${st}`, id);
  redirect('/mentor');
}
export async function removeAction(f: FormData) {
  const m = await mentor(); const id = s(f, 'id');
  if (id === m.id) back('/mentor', "You can't remove yourself.");
  await q("DELETE FROM users WHERE id = $1 AND role = 'student'", [id]);
  await audit(m.id, 'remove-user', id);
  redirect('/mentor?ok=Removed, with everything they posted');
}
export async function resetPasswordAction(f: FormData) {
  const m = await mentor(); const id = s(f, 'id');
  const words = ['volt', 'gear', 'hive', 'bolt', 'spark', 'servo', 'amp', 'rotor', 'nectar', 'pollen'];
  const b = randomBytes(3);
  const pw = `${words[b[0] % 10]}-${words[b[1] % 10]}-${100 + (b[2] % 900)}`;
  await q('UPDATE users SET password_hash = $1 WHERE id = $2', [await hashPassword(pw), id]);
  await q('DELETE FROM sessions WHERE user_id = $1', [id]);
  await audit(m.id, 'reset-password', id);
  redirect(`/mentor?pw=${encodeURIComponent(pw)}&for=${encodeURIComponent(id)}`);
}
export async function profileAction(f: FormData) {
  const m = await mentor(); const id = s(f, 'id');
  await q('UPDATE users SET title = $1, subs = $2 WHERE id = $3', [s(f, 'title').slice(0, 60), s(f, 'subs').slice(0, 120), id]);
  await audit(m.id, 'profile', id);
  redirect('/mentor?ok=Saved');
}
export async function rotateCodeAction() {
  const m = await mentor();
  await q('UPDATE team SET team_code = $1 WHERE id = 1', [makeTeamCode()]);
  await audit(m.id, 'rotate-team-code');
  redirect('/mentor?ok=New Team Code made. The old one stops working now.');
}
export async function chatAction(f: FormData) {
  const m = await mentor();
  const on = s(f, 'on') === '1'; const adult = s(f, 'adult');
  if (on && adult.length < 3) back('/mentor', 'Name the second youth-protection-trained adult before turning chat on.');
  await q('UPDATE team SET chat_enabled = $1, second_adult = $2 WHERE id = 1', [on, on ? adult.slice(0, 80) : null]);
  await audit(m.id, on ? 'chat-on' : 'chat-off', adult);
  redirect(`/mentor?ok=Chat is ${on ? 'on' : 'off'}`);
}
export async function addMentorAction(f: FormData) {
  const m = await mentor();
  const name = s(f, 'name'), pw = s(f, 'password');
  checkName(name, '/mentor'); checkPw(pw, '/mentor');
  if (await one('SELECT 1 FROM users WHERE name_key = $1', [nameKey(name)])) back('/mentor', 'That name is taken.');
  await q(`INSERT INTO users (id, display_name, name_key, role, status, color, password_hash, title)
           VALUES ($1, $2, $3, 'mentor', 'active', '#4F5049', $4, 'Mentor')`, [newId(), name, nameKey(name), await hashPassword(pw)]);
  await audit(m.id, 'add-mentor', name);
  redirect('/mentor?ok=Mentor added');
}
