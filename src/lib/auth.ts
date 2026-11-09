import { cookies } from 'next/headers';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { q, one } from './db';

export type User = {
  id: string; display_name: string; role: 'mentor' | 'student'; status: 'pending' | 'active' | 'disabled';
  color: string; title: string; subs: string;
};

const COOKIE = 'kwc_session';
const DAYS = 30;
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
export const newId = () => randomUUID();
export const nameKey = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const checkPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export async function startSession(userId: string) {
  const token = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + DAYS * 864e5);
  await q('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)', [sha(token), userId, expires.toISOString()]);
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', expires });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await q('DELETE FROM sessions WHERE token_hash = $1', [sha(token)]);
  jar.delete(COOKIE);
}

/** The signed-in user, or null. Pending and disabled accounts are returned so pages can explain. */
export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  return one<User>(
    `SELECT u.id, u.display_name, u.role, u.status, u.color, u.title, u.subs
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now()`, [sha(token)]);
}

export async function activeUser(): Promise<User | null> {
  const u = await currentUser();
  return u && u.status === 'active' ? u : null;
}

export async function audit(userId: string | null, action: string, detail = '') {
  await q('INSERT INTO audit (user_id, action, detail) VALUES ($1, $2, $3)', [userId, action, detail.slice(0, 500)]);
}
