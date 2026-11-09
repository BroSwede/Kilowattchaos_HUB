import QRCode from 'qrcode';
import { q } from '@/lib/db';
import { getTeam, checkinCode, today } from '@/lib/team';
import { json, fail, requireUser, sameOrigin } from '@/lib/api';

// GET: today's code and a scannable QR (for Shop TV). POST {code}: check yourself in.
export async function GET(req: Request) {
  const u = await requireUser(); if (u instanceof Response) return u;
  const t = await getTeam(); if (!t) return fail(500, 'Team not set up.');
  const code = checkinCode(t.checkin_secret);
  const url = new URL(`/checkin?c=${encodeURIComponent(code)}`, req.url).toString();
  const svg = await QRCode.toString(url, { type: 'svg', margin: 1, color: { dark: '#222624', light: '#ffffff' } });
  const here = await q<{ name: string; color: string }>(
    `SELECT u.display_name AS name, u.color FROM checkins c JOIN users u ON u.id = c.user_id WHERE c.day = $1::date ORDER BY c.at`, [today()]);
  const total = await q<{ n: string }>("SELECT count(*)::text AS n FROM users WHERE status = 'active' AND role = 'student'");
  return json({ code, url, svg, here, total: Number(total[0]?.n || 0) });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, 'Wrong origin.');
  const u = await requireUser(); if (u instanceof Response) return u;
  const t = await getTeam(); if (!t) return fail(500, 'Team not set up.');
  const body = (await req.json().catch(() => ({}))) as { code?: string };
  if (String(body.code || '').trim().toUpperCase() !== checkinCode(t.checkin_secret)) return fail(400, "That isn't today's code.");
  await q('INSERT INTO checkins (user_id, day) VALUES ($1, $2::date) ON CONFLICT DO NOTHING', [u.id, today()]);
  return json({ ok: true });
}
