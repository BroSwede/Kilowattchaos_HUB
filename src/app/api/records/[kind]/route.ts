import { q } from '@/lib/db';
import { newId, audit } from '@/lib/auth';
import { KINDS, MAX_BYTES } from '@/lib/kinds';
import { getTeam } from '@/lib/team';
import { json, fail, requireUser, sameOrigin } from '@/lib/api';

type Ctx = { params: Promise<{ kind: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const u = await requireUser(); if (u instanceof Response) return u;
  const { kind } = await params; const rule = KINDS[kind];
  if (!rule) return fail(404, 'Unknown kind.');
  const own = rule.see === 'self' && u.role !== 'mentor';
  const rows = await q(
    `SELECT r.id, r.user_id, u.display_name AS author, r.data, r.created_at, r.updated_at
       FROM records r JOIN users u ON u.id = r.user_id
      WHERE r.kind = $1 ${own ? 'AND r.user_id = $2' : ''}
      ORDER BY r.created_at DESC LIMIT 500`, own ? [kind, u.id] : [kind]);
  return json({ items: rows });
}

export async function POST(req: Request, { params }: Ctx) {
  if (!sameOrigin(req)) return fail(403, 'Wrong origin.');
  const u = await requireUser(); if (u instanceof Response) return u;
  const { kind } = await params; const rule = KINDS[kind];
  if (!rule) return fail(404, 'Unknown kind.');
  if (rule.create === 'mentor' && u.role !== 'mentor') return fail(403, 'Only mentors can add this.');
  if (kind === 'chat') {
    const t = await getTeam();
    if (!t?.chat_enabled) return fail(403, 'Chat is off until a second youth-protection-trained adult is set up.');
  }
  const body = await req.json().catch(() => null);
  const data = body && typeof body === 'object' && !Array.isArray(body) ? (body as { data?: unknown }).data ?? body : null;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return fail(400, 'Send a JSON object.');
  const text = JSON.stringify(data);
  if (text.length > (rule.max ?? MAX_BYTES)) return fail(413, 'That is too long.');
  const id = newId();
  const [row] = await q(
    `INSERT INTO records (id, kind, user_id, data) VALUES ($1, $2, $3, $4::jsonb)
     RETURNING id, user_id, data, created_at, updated_at`, [id, kind, u.id, text]);
  if (kind === 'chat' || kind === 'inspiration') await audit(u.id, `post:${kind}`, text.slice(0, 300));
  return json({ item: { ...row, author: u.display_name } }, 201);
}
