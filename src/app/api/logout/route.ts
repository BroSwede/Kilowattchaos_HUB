import { endSession } from '@/lib/auth';
import { json, fail, sameOrigin } from '@/lib/api';

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, 'Wrong origin.');
  await endSession();
  return json({ ok: true });
}
