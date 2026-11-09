import { redirect } from 'next/navigation';
import Brand from '@/components/Brand';
import { currentUser } from '@/lib/auth';
import { logoutAction } from '../actions';

export const dynamic = 'force-dynamic';
export default async function Pending() {
  const u = await currentUser();
  if (!u) redirect('/login');
  if (u.status === 'active') redirect('/hub');
  return (
    <main className="auth"><div className="auth-card">
      <Brand />
      <h1>{u.status === 'disabled' ? 'Your account is off' : `Almost there, ${u.display_name}`}</h1>
      {u.status === 'disabled'
        ? <p className="lead">A mentor turned this account off. Talk to them at the next meeting.</p>
        : <>
            <p className="lead">A mentor needs to turn your account on. They&apos;ll check with your parent or guardian first.</p>
            <p className="note">You can close this page. Sign in again after your mentor says you&apos;re in.</p>
          </>}
      <form action={logoutAction} style={{ marginTop: 16 }}><button className="btn ghost" type="submit">Sign out</button></form>
    </div></main>
  );
}
