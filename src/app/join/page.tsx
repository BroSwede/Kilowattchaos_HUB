import Link from 'next/link';
import Brand from '@/components/Brand';
import Err from '@/components/Err';
import { AVATAR_COLORS } from '@/lib/colors';
import { TEAM_CODE_RULES } from '@/lib/teamcode';
import { joinAction } from '../actions';

type P = { searchParams: Promise<{ e?: string }> };
export default async function Join({ searchParams }: P) {
  const sp = await searchParams;
  return (
    <main className="auth"><div className="auth-card">
      <Brand />
      <h1>Join the team</h1>
      <p className="lead">Your mentor gives you the Team Code. A mentor turns your account on after a parent or guardian says OK.</p>
      <Err e={sp.e} />
      <form className="stack" action={joinAction}>
        <label>Team Code<input type="text" name="code" required autoCapitalize="characters" placeholder="VOLT-123" /></label>
        <label>Display name<small>A nickname, not your real name. Like Sparky or Byte.</small>
          <input type="text" name="name" required maxLength={20} autoComplete="username" autoCapitalize="none" /></label>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 500, fontSize: 14, marginBottom: 8 }}>Robot avatar color</legend>
          <div className="swatches">
            {AVATAR_COLORS.map((c, i) => (
              <label key={c} aria-label={`Color ${i + 1}`}><input type="radio" name="color" value={c} defaultChecked={i === 0} /><span style={{ background: c }} /></label>
            ))}
          </div>
        </fieldset>
        <label>Password<small>At least 8 characters. Three short words are easy to remember.</small>
          <input type="password" name="password" required minLength={8} autoComplete="new-password" /></label>
        <label>Parent or guardian email<small>Only mentors see this. We use it to ask for their permission.</small>
          <input type="email" name="parent" required autoComplete="email" /></label>
        <div className="panel">
          <b>The Team Code</b>
          <ol style={{ margin: '8px 0 0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
            {TEAM_CODE_RULES.map((r) => <li key={r}>{r}</li>)}
          </ol>
        </div>
        <label className="check"><input type="checkbox" name="agree" required /> I read the Team Code and I agree to it.</label>
        <button className="btn" type="submit">Ask to join</button>
      </form>
      <div className="links"><Link href="/login">Already joined? Sign in</Link></div>
    </div></main>
  );
}
