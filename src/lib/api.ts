import { NextResponse } from 'next/server';
import { activeUser, type User } from './auth';

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export const fail = (status: number, error: string) => json({ error }, status);

export async function requireUser(): Promise<User | Response> {
  const u = await activeUser();
  return u ?? fail(401, 'Sign in first.');
}
/** Reject cross-site form posts: the browser always sends Origin on fetch POST/PATCH/DELETE. */
export function sameOrigin(req: Request) {
  const o = req.headers.get('origin');
  if (!o) return true;
  try { return new URL(o).host === new URL(req.url).host || new URL(o).host === req.headers.get('host'); } catch { return false; }
}
