// One small query helper over two drivers:
// - DATABASE_URL set (Vercel + Neon/Supabase/any Postgres): the `postgres` driver.
// - not set: PGlite, a real Postgres compiled to WebAssembly, stored in .data/ (or /tmp on Vercel).
//   Fine for a laptop. On Vercel it is a demo only, because /tmp is wiped between requests.
import { SCHEMA } from './schema';

type Row = Record<string, unknown>;
type Runner = (text: string, params: unknown[]) => Promise<Row[]>;

// Cached on globalThis: Next bundles route handlers and pages separately, and each bundle gets its own
// copy of this module. One shared runner means one database connection (and one PGlite folder lock).
const G = globalThis as unknown as { __kwcRunner?: Promise<Runner> | null };

export const isDemoDb = () => !process.env.DATABASE_URL;

async function makeRunner(): Promise<Runner> {
  if (process.env.DATABASE_URL) {
    const postgres = (await import('postgres')).default;
    const sql = postgres(process.env.DATABASE_URL, { max: 3, idle_timeout: 20, prepare: false });
    const run: Runner = async (text, params) => (await sql.unsafe(text, params as never[])) as unknown as Row[];
    await run(SCHEMA, []);
    return run;
  }
  const { PGlite } = await import('@electric-sql/pglite');
  const dir = process.env.PGLITE_DIR || (process.env.VERCEL ? '/tmp/kwc-pglite' : '.data/pglite');
  (await import('node:fs')).mkdirSync(dir, { recursive: true });
  const pg = new PGlite(dir);
  await pg.exec(SCHEMA);
  return async (text, params) => (await pg.query<Row>(text, params)).rows;
}

export async function q<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  if (!G.__kwcRunner) G.__kwcRunner = makeRunner().catch((e) => { G.__kwcRunner = null; throw e; });
  const run = await G.__kwcRunner;
  return (await run(text, params)) as T[];
}

export async function one<T = Row>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await q<T>(text, params);
  return rows[0] ?? null;
}
