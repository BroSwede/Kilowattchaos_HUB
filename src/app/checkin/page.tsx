import { redirect } from 'next/navigation';
import Brand from '@/components/Brand';
import Err from '@/components/Err';
import { activeUser } from '@/lib/auth';
import { checkinAction } from '../actions';

export const dynamic = 'force-dynamic';
type P = { searchParams: Promise<{ e?: string; c?: string; done?: string }> };
export default async function Checkin({ searchParams }: P) {
  const sp = await searchParams;
  const u = await activeUser();
  if (!u) redirect(`/login?next=${encodeURIComponent(`/checkin${sp.c ? `?c=${sp.c}` : ''}`)}`);
  return (
    <main className="auth"><div className="auth-card">
      <Brand />
      {sp.done ? (<>
        <h1>You&apos;re checked in, {u.display_name}</h1>
        <p className="lead">Your face shows up on the shop TV. Safety glasses on!</p>
        <a className="btn" href="/hub">Open the hub</a>
      </>) : (<>
        <h1>Check in</h1>
        <p className="lead">Type the word on the shop TV, or scan its code with your phone.</p>
        <Err e={sp.e} />
        <form className="stack" action={checkinAction}>
          <label>Today&apos;s code<input type="text" name="code" required defaultValue={sp.c ?? ''} autoCapitalize="characters" /></label>
          <button className="btn" type="submit">Check in</button>
        </form>
      </>)}
    </div></main>
  );
}
