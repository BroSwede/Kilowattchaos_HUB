import { randomBytes, createHmac } from 'node:crypto';
import { q, one } from './db';

export type Team = { name: string; team_code: string; checkin_secret: string; chat_enabled: boolean; second_adult: string | null };

const WORDS = ['VOLT', 'GEAR', 'HEXA', 'BOLT', 'SPARK', 'TORQUE', 'SERVO', 'POLLEN', 'NECTAR', 'HIVE', 'AMP', 'ROTOR', 'PIXEL', 'MOTOR'];
export function makeTeamCode() {
  const w = WORDS[randomBytes(1)[0] % WORDS.length];
  const n = (randomBytes(2).readUInt16BE(0) % 900) + 100;
  return `${w}-${n}`;
}

export async function getTeam(): Promise<Team | null> {
  return one<Team>('SELECT name, team_code, checkin_secret, chat_enabled, second_adult FROM team WHERE id = 1');
}

export async function ensureTeam(name = 'Kilowattchaos'): Promise<Team> {
  await q('INSERT INTO team (id, name, team_code, checkin_secret) VALUES (1, $1, $2, $3) ON CONFLICT (id) DO NOTHING',
    [name, makeTeamCode(), randomBytes(24).toString('base64url')]);
  return (await getTeam())!;
}

/** Today's check-in word, the same for everyone all day, different every day. Local day in the team's time zone. */
export function today(tz = process.env.TEAM_TIMEZONE || 'America/New_York') {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
export function checkinCode(secret: string, day = today()) {
  const h = createHmac('sha256', secret).update(day).digest();
  return WORDS[h[0] % WORDS.length] + '-' + String(h.readUInt16BE(1) % 1000).padStart(3, '0');
}

export async function hasMentor() {
  const r = await one<{ n: string }>("SELECT count(*)::text AS n FROM users WHERE role = 'mentor'");
  return Number(r?.n || 0) > 0;
}
