import { q, one } from '@/lib/db';
import { audit } from '@/lib/auth';
import { KINDS, MAX_BYTES } from '@/lib/kinds';
import { json, fail, requireUser, sameOrigin } from '@/lib/api';

type Ctx = { params: Promise<{ kind: string; id: string }> };

async function load(kind: string, id: string) {
  return one<{ id: string; user_id: string; data: Record<string, unknown> }>('SELECT id, user_id, data FROM records WHERE kind = $1 AND id = $2', [kind, id]);
}

export async function PATCH(req: Request, { params }: Ctx) {
  if (!sameOrigin(req)) return fail(403, 'Wrong origin.');
  const u = await requireUser(); if (u instanceof Response) return u;
  const { kind, id } = await params; const rule = KINDS[kind];
  if (!rule) return fail(404, 'Unknown kind.');
  const rec = await load(kind, id); if (!rec) return fail(404, 'Not found.');
  const mine = rec.user_id === u.id, mentor = u.role === 'mentor';
  const ok = mentor || (rule.edit === 'any' && rule.see === 'team') || (rule.edit === 'author' && mine);
  if (!ok) return fail(403, 'You can only change your own.');
  const body = await req.json().catch(() => null);
  const patch = body && typeof body === 'object' ? (body as { data?: unknown }).data ?? body : null;
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return fail(400, 'Send a JSON object.');
  const next = { ...rec.data, ...(patch as object) };
  const text = JSON.stringify(next);
  if (text.length > (rule.max ?? MAX_BYTES)) return fail(413, 'That is too long.');
  const [row] = await q('UPDATE records SET data = $1::jsonb, updated_at = now() WHERE id = $2 RETURNING id, user_id, data, created_at, updated_at', [text, id]);
  return json({ item: row });
}

export async function DELETE(req: Request, { params }: Ctx) {
  if (!sameOrigin(req)) return fail(403, 'Wrong origin.');
  const u = await requireUser(); if (u instanceof Response) return u;
  const { kind, id } = await params; const rule = KINDS[kind];
  if (!rule) return fail(404, 'Unknown kind.');
  const rec = await load(kind, id); if (!rec) return fail(404, 'Not found.');
  if (rec.user_id !== u.id && u.role !== 'mentor') return fail(403, 'You can only remove your own.');
  await q('DELETE FROM records WHERE id = $1', [id]);
  if (rec.user_id !== u.id) await audit(u.id, `remove:${kind}`, JSON.stringify(rec.data).slice(0, 300));
  return json({ ok: true });
}
