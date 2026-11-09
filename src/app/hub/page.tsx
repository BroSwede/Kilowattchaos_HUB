import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { isDemoDb } from '@/lib/db';
import { SHELL, SPRITE } from '@/hub/shell';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Kilowattchaos Hub' };

const CSS = ['shell.css', 'zones.css', 'zones-crew.css', 'zones-logbook.css', 'zones-home.css', 'live.css', 'live-home.css', 'live-build.css', 'live-learn.css', 'live-crew.css'];

// The hub itself: the approved preview's markup and zone scripts, now reading and writing the team database.
export default async function Hub() {
  const u = await currentUser();
  if (!u) redirect('/login?next=/hub');
  if (u.status !== 'active') redirect('/pending');
  const demo = isDemoDb()
    ? '<div class="demo-banner">Demo database: anything saved can disappear. Add a Postgres database in Vercel to keep data.</div>'
    : '';
  return (
    <>
      {CSS.map((f) => <link key={f} rel="stylesheet" href={`/hub/${f}`} precedence="default" />)}
      <div id="kwc-root" dangerouslySetInnerHTML={{ __html: demo + SPRITE + SHELL }} />
      <script type="module" src="/hub/app.js" async />
    </>
  );
}
