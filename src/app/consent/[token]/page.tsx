import Brand from '@/components/Brand';
import Err from '@/components/Err';
import { one } from '@/lib/db';
import { TEAM_CODE_RULES } from '@/lib/teamcode';
import { consentAction } from '../../actions';

export const dynamic = 'force-dynamic';
type P = { params: Promise<{ token: string }>; searchParams: Promise<{ e?: string; done?: string }> };
export default async function Consent({ params, searchParams }: P) {
  const { token } = await params; const sp = await searchParams;
  const kid = await one<{ display_name: string; consent_at: string | null }>("SELECT display_name, consent_at FROM users WHERE consent_token = $1 AND role = 'student'", [token]);
  if (!kid) return <main className="auth"><div className="auth-card"><Brand /><h1>Link not found</h1><p className="lead">Ask the team&apos;s mentor for a new permission link.</p></div></main>;
  if (sp.done || kid.consent_at) return <main className="auth"><div className="auth-card"><Brand /><h1>Thank you</h1><p className="lead">Permission is recorded for <b>{kid.display_name}</b>. A mentor will turn the account on.</p></div></main>;
  return (
    <main className="auth"><div className="auth-card">
      <Brand sub="Parent or guardian permission" />
      <h1>Permission for {kid.display_name}</h1>
      <p className="lead">Your student asked to join the Kilowattchaos robotics team hub, a private website for our 7th-grade FIRST Tech Challenge team.</p>
      <Err e={sp.e} />
      <div className="panel" style={{ fontSize: 14 }}>
        <b>How the hub keeps students safe</b>
        <ul style={{ margin: '8px 0 0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li>Mentor-supervised team accounts. Students use a nickname and a robot avatar, never a real name or photo.</li>
          <li>No private messages. Team chat stays off until two youth-protection-trained adults are in place, and mentors can see everything.</li>
          <li>Only team members can sign in. Your email is seen by mentors only and used only for team matters.</li>
          <li>You can ask a mentor to remove the account and everything it posted at any time.</li>
        </ul>
        <b style={{ display: 'block', marginTop: 12 }}>The Team Code your student agreed to</b>
        <ol style={{ margin: '8px 0 0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {TEAM_CODE_RULES.map((r) => <li key={r}>{r}</li>)}
        </ol>
      </div>
      <form className="stack" action={consentAction}>
        <input type="hidden" name="token" value={token} />
        <label>Your full name<input type="text" name="guardian" required autoComplete="name" /></label>
        <label className="check"><input type="checkbox" name="agree" required /> I am this student&apos;s parent or guardian and I give permission for them to use the team hub.</label>
        <button className="btn" type="submit">Give permission</button>
      </form>
    </div></main>
  );
}
