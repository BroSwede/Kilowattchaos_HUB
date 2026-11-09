import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Brand from '@/components/Brand';
import Err from '@/components/Err';
import { q, isDemoDb } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { getTeam, checkinCode } from '@/lib/team';
import { approveAction, setStatusAction, removeAction, resetPasswordAction, profileAction, rotateCodeAction, chatAction, addMentorAction, logoutAction } from '../actions';

export const dynamic = 'force-dynamic';
type Kid = { id: string; display_name: string; role: string; status: string; color: string; title: string; subs: string; parent_email: string | null; consent_token: string | null; consent_name: string | null; consent_at: string | null; created_at: string };
type P = { searchParams: Promise<{ e?: string; ok?: string; pw?: string; for?: string }> };

export default async function Mentor({ searchParams }: P) {
  const u = await currentUser();
  if (!u || u.role !== 'mentor' || u.status !== 'active') redirect('/login?next=/mentor');
  const sp = await searchParams;
  const team = (await getTeam())!;
  const h = await headers();
  const origin = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}`;
  const people = await q<Kid>('SELECT id, display_name, role, status, color, title, subs, parent_email, consent_token, consent_name, consent_at, created_at FROM users ORDER BY status, role DESC, display_name');
  const pending = people.filter((p) => p.status === 'pending');
  const others = people.filter((p) => p.status !== 'pending');
  const recent = await q<{ action: string; detail: string; at: string; name: string | null }>(
    `SELECT a.action, a.detail, a.at, u.display_name AS name FROM audit a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.id DESC LIMIT 25`);
  const pwFor = sp.pw ? people.find((p) => p.id === sp.for)?.display_name : null;

  return (
    <>
      {isDemoDb() ? <div className="demo-banner">Demo database: anything saved here can disappear. Add a Postgres database in Vercel to keep data.</div> : null}
      <main className="auth" style={{ placeItems: 'start center' }}><div className="auth-card wide">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <Brand sub="Mentor tools" />
          <div className="row"><a className="btn volt sm" href="/hub">Open the hub</a>
            <form action={logoutAction}><button className="btn ghost sm" type="submit">Sign out</button></form></div>
        </div>
        <Err e={sp.e} />
        {sp.ok ? <p className="ok">{sp.ok}</p> : null}
        {sp.pw ? <p className="ok">New password for {pwFor}: <b style={{ fontFamily: 'JetBrains Mono, monospace' }}>{sp.pw}</b>. Tell them in person. It isn&apos;t shown again.</p> : null}

        <div className="grid2" style={{ marginTop: 8 }}>
          <section className="panel">
            <h2 style={{ marginTop: 0 }}>Team Code</h2>
            <p className="lead">Students need this to sign up. Make a new one if it gets out.</p>
            <span className="code-big">{team.team_code}</span>
            <form action={rotateCodeAction} style={{ marginTop: 12 }}><button className="btn ghost sm" type="submit">Make a new Team Code</button></form>
            <p style={{ marginTop: 12 }}>Sign-up link: <span className="pill">{origin}/join</span></p>
          </section>
          <section className="panel">
            <h2 style={{ marginTop: 0 }}>Today&apos;s check-in</h2>
            <p className="lead">Shown on the shop TV with a QR code. It changes every day.</p>
            <span className="code-big">{checkinCode(team.checkin_secret)}</span>
            <p style={{ marginTop: 12 }}><a className="lnk" href="/hub#home/shop-tv">Open Shop TV</a></p>
          </section>
        </div>

        <h2>Waiting to join ({pending.length})</h2>
        {pending.length === 0 ? <p className="lead">Nobody is waiting.</p> : (
          <div className="scroll-x"><table><thead><tr><th>Student</th><th>Parent email</th><th>Permission</th><th></th></tr></thead><tbody>
            {pending.map((p) => (
              <tr key={p.id}>
                <td><span className="dot" style={{ background: p.color }} />{p.display_name}</td>
                <td>{p.parent_email}</td>
                <td>{p.consent_at
                  ? <span className="pill good">Signed by {p.consent_name}</span>
                  : <><span className="pill wait">Not yet</span><div style={{ fontSize: 12, marginTop: 6 }}>Send this link to the parent:<br /><span className="pill" style={{ wordBreak: 'break-all' }}>{origin}/consent/{p.consent_token}</span></div></>}</td>
                <td><form action={approveAction} className="row">
                  <input type="hidden" name="id" value={p.id} />
                  {!p.consent_at ? <label className="check" style={{ fontSize: 13 }}><input type="checkbox" name="paper" /> Paper form on file</label> : null}
                  <button className="btn sm" type="submit">Turn on</button>
                </form>
                <form action={removeAction} style={{ marginTop: 6 }}><input type="hidden" name="id" value={p.id} /><button className="btn danger sm" type="submit">Decline</button></form></td>
              </tr>))}
          </tbody></table></div>)}

        <h2>Team</h2>
        <div className="scroll-x"><table><thead><tr><th>Name</th><th>Role on the robot</th><th>Status</th><th></th></tr></thead><tbody>
          {others.map((p) => (
            <tr key={p.id}>
              <td><span className="dot" style={{ background: p.color }} />{p.display_name}{p.role === 'mentor' ? <span className="pill" style={{ marginLeft: 6 }}>Mentor</span> : null}</td>
              <td>{p.role === 'student' ? (
                <form action={profileAction} className="row">
                  <input type="hidden" name="id" value={p.id} />
                  <input type="text" name="title" defaultValue={p.title} placeholder="Intake lead · CAD" style={{ height: 36, width: 170 }} />
                  <select name="subs" defaultValue={p.subs} style={{ height: 36 }}>
                    <option value="">Subsystem…</option>
                    {['launcher', 'intake', 'ballpath', 'drivetrain', 'power', 'structure'].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button className="btn ghost sm" type="submit">Save</button>
                </form>) : p.title}</td>
              <td><span className={`pill ${p.status === 'active' ? 'good' : 'off'}`}>{p.status === 'active' ? 'On' : 'Off'}</span></td>
              <td className="row">{p.id !== u.id ? <>
                <form action={setStatusAction}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="status" value={p.status === 'active' ? 'disabled' : 'active'} /><button className="btn ghost sm" type="submit">{p.status === 'active' ? 'Turn off' : 'Turn on'}</button></form>
                <form action={resetPasswordAction}><input type="hidden" name="id" value={p.id} /><button className="btn ghost sm" type="submit">New password</button></form>
                {p.role === 'student' ? <form action={removeAction}><input type="hidden" name="id" value={p.id} /><button className="btn danger sm" type="submit">Remove</button></form> : null}
              </> : <span className="lead">You</span>}</td>
            </tr>))}
        </tbody></table></div>

        <div className="grid2" style={{ marginTop: 24 }}>
          <section className="panel">
            <h2 style={{ marginTop: 0 }}>Team chat</h2>
            <p className="lead">Chat stays off until a second youth-protection-trained adult is named. Channels only, never private messages. Mentors see everything.</p>
            <form action={chatAction} className="stack">
              <input type="hidden" name="on" value={team.chat_enabled ? '0' : '1'} />
              {!team.chat_enabled ? <label>Second trained adult<input type="text" name="adult" placeholder="Name of the second adult" /></label> : <p>On. Second adult: <b>{team.second_adult}</b></p>}
              <button className={`btn ${team.chat_enabled ? 'danger' : ''} sm`} type="submit">{team.chat_enabled ? 'Turn chat off' : 'Turn chat on'}</button>
            </form>
          </section>
          <section className="panel">
            <h2 style={{ marginTop: 0 }}>Add a mentor</h2>
            <form action={addMentorAction} className="stack">
              <label>Display name<input type="text" name="name" required maxLength={20} /></label>
              <label>Starting password<input type="text" name="password" required minLength={8} /></label>
              <button className="btn sm" type="submit">Add mentor</button>
            </form>
          </section>
        </div>

        <h2>Recent activity</h2>
        <div className="scroll-x"><table><tbody>
          {recent.map((r, i) => <tr key={i}><td style={{ whiteSpace: 'nowrap' }}>{new Date(r.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</td><td>{r.name ?? 'Someone'}</td><td>{r.action}</td><td style={{ color: 'var(--muted)' }}>{r.detail.slice(0, 140)}</td></tr>)}
        </tbody></table></div>
      </div></main>
    </>
  );
}
