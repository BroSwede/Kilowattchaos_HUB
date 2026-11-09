import { q, isDemoDb } from '@/lib/db';
import { getTeam, today } from '@/lib/team';
import { json, requireUser } from '@/lib/api';

export async function GET() {
  const u = await requireUser(); if (u instanceof Response) return u;
  const team = await getTeam();
  const roster = await q<{ id: string; name: string; color: string; role: string; title: string; subs: string; here: boolean }>(
    `SELECT u.id, u.display_name AS name, u.color, u.role, u.title, u.subs,
            EXISTS (SELECT 1 FROM checkins c WHERE c.user_id = u.id AND c.day = $1::date) AS here
       FROM users u WHERE u.status = 'active' ORDER BY u.role DESC, u.display_name`, [today()]);
  return json({
    user: { id: u.id, name: u.display_name, role: u.role, color: u.color, title: u.title, subs: u.subs ? u.subs.split(',') : [] },
    team: { name: team?.name ?? 'Kilowattchaos', chatEnabled: !!team?.chat_enabled },
    roster: roster.map((r) => ({ ...r, subs: r.subs ? r.subs.split(',') : [] })),
    demo: isDemoDb(),
  });
}
