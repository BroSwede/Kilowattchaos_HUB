import Link from 'next/link';
import Brand from '@/components/Brand';
import Err from '@/components/Err';
import { loginAction } from '../actions';
import { isPreview } from '@/lib/mode';

type P = { searchParams: Promise<{ e?: string; next?: string }> };
export default async function Login({ searchParams }: P) {
  const sp = await searchParams;
  if (isPreview()) return <PreviewLogin />;
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

// Testing and building mode: looks like the real sign-in, but nothing is checked. Any name (or none) gets in,
// and the password box is never sent anywhere (it has no name, so the form leaves it out).
function PreviewLogin() {
  return (
    <main className="auth"><div className="auth-card">
      <Brand sub="Testing and building mode" />
      <h1>Sign in</h1>
      <p className="lead">This is a sneak peek, so no account is needed. Type any nickname, or leave it blank, and tap Sign in.</p>
      <form className="stack" action="/hub" method="get">
        <label>Display name<input type="text" name="as" maxLength={20} placeholder="Any nickname works" autoComplete="off" autoCapitalize="none" /></label>
        <label>Password<input type="password" placeholder="Not needed yet" autoComplete="off" /></label>
        <button className="btn" type="submit">Sign in</button>
      </form>
      <p className="note" style={{ marginTop: 16 }}>Everything inside is sample stuff while the hub is being built. Nothing you add is saved, and nobody else sees it.</p>
    </div></main>
  );
}
