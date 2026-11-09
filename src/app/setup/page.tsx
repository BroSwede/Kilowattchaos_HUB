import { redirect } from 'next/navigation';
import Brand from '@/components/Brand';
import Err from '@/components/Err';
import { hasMentor } from '@/lib/team';
import { setupAction } from '../actions';

export const dynamic = 'force-dynamic';
type P = { searchParams: Promise<{ e?: string }> };
export default async function Setup({ searchParams }: P) {
  if (await hasMentor()) redirect('/login');
  const sp = await searchParams;
  const needKey = !!process.env.SETUP_KEY;
  return (
    <main className="auth"><div className="auth-card">
      <Brand sub="First-time setup" />
      <h1>Set up the hub</h1>
      <p className="lead">This makes the first mentor account and the team&apos;s Team Code. It only works once.</p>
      <Err e={sp.e} />
      {!needKey && process.env.NODE_ENV === 'production' ? (
        <p className="err">Add a SETUP_KEY environment variable in Vercel (Settings, Environment Variables), redeploy, then come back here.</p>
      ) : null}
      <form className="stack" action={setupAction}>
        {needKey ? <label>Setup key<small>The SETUP_KEY value you put in Vercel.</small><input type="password" name="key" required /></label> : null}
        <label>Team name<input type="text" name="team" defaultValue="Kilowattchaos" /></label>
        <label>Your display name<small>What students see, like Coach Eric.</small><input type="text" name="name" required maxLength={20} /></label>
        <label>Password<input type="password" name="password" required minLength={8} autoComplete="new-password" /></label>
        <button className="btn" type="submit">Create mentor account</button>
      </form>
    </div></main>
  );
}
