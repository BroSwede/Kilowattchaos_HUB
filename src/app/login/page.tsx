import Link from 'next/link';
import Brand from '@/components/Brand';
import Err from '@/components/Err';
import { loginAction } from '../actions';

type P = { searchParams: Promise<{ e?: string; next?: string }> };
export default async function Login({ searchParams }: P) {
  const sp = await searchParams;
  return (
    <main className="auth"><div className="auth-card">
      <Brand />
      <h1>Sign in</h1>
      <p className="lead">Use the display name and password you picked when you joined.</p>
      <Err e={sp.e} />
      <form className="stack" action={loginAction}>
        <input type="hidden" name="next" value={sp.next ?? ''} />
        <label>Display name<input type="text" name="name" autoComplete="username" required autoCapitalize="none" /></label>
        <label>Password<input type="password" name="password" autoComplete="current-password" required /></label>
        <button className="btn" type="submit">Sign in</button>
      </form>
      <div className="links"><Link href="/join">New to the team? Join with the Team Code</Link></div>
      <p className="note" style={{ marginTop: 16 }}>Forgot your password? A mentor can give you a new one.</p>
    </div></main>
  );
}
