// Robot zone: 3D Explorer (the Home viewer at full size), Versions, Subsystems, Specs and parts, AR and VR.
import { $, $$, esc, fmt, icon, tag, SAMPLE, strip, av, avStack, dot, pill, bar, seg, wireSeg, copyText, KID } from './common.js';

export const STAGES = ['Idea', 'Prototype', 'Iterate', 'Competition-ready'];
// Sample status for each subsystem. Part counts and blurbs come from the real parts list.
export const SUBSYS = {
  launcher: { status: 2, owners: ['Sparky', 'Rivet'], pins: 0, prints: 1, code: ['subsystems/Launcher.java'], protos: [['Oct 27', 'Flywheel spin-up', '1.4 s to full speed on a fresh battery'], ['Nov 5', 'Ten shots from 4 ft', '6 of 10 landed in the target box']], next: 'Measure top speed under load (Sparky, Tuesday)' },
  ballpath: { status: 1, owners: ['Gizmo', 'Echo'], pins: 1, prints: 1, code: ['subsystems/BallPath.java'], protos: [['Nov 3', 'Servo gate timing', 'Two balls slipped through together 3 of 10 times']], next: 'Try a longer gate pause between balls (Gizmo)' },
  intake: { status: 2, owners: ['Pixel', 'Nova'], pins: 1, prints: 2, code: ['subsystems/Intake.java'], protos: [['Oct 22', 'Pile pickup, stock spacing', '5 of 10 balls'], ['Nov 5', 'Gecko wheels 4 mm closer', '7 of 10 balls']], next: 'Try 6 mm closer (Pixel and Nova, Tuesday)' },
  drivetrain: { status: 3, owners: ['Byte', 'Rivet'], pins: 0, prints: 0, code: ['opmodes/DriveTeleOp.java', 'opmodes/AutoDriveForward.java'], protos: [['Oct 20', 'Strafe test', 'Drifted 3 in. over 6 ft; a 1.1 strafe factor fixed it']], next: 'Tune the drive-forward autonomous (Byte)' },
  structure: { status: 3, owners: ['Rivet', 'Gizmo'], pins: 0, prints: 0, code: [], protos: [['Oct 29', 'Launcher mount flex', 'Visible wobble at full speed; add a brace']], next: 'Stiffen the launcher mount (Rivet)' },
  power: { status: 3, owners: ['Echo'], pins: 0, prints: 0, code: [], protos: [['Oct 29', 'Battery runtime', 'About 9 minutes of hard driving per charge']], next: 'Label and rotate the three batteries (Echo)' },
  hardware: { status: 3, owners: ['Rivet'], pins: 1, prints: 0, code: [], protos: [], next: 'Fix the bearing that keeps popping out (pinned by Gizmo)' },
};

function partsBySys(parts, sys) {
  const by = new Map();
  for (const p of Object.values(parts.parts)) {
    if (sys && p[1] !== sys) continue;
    const e = by.get(p[2]) || { name: p[2], sys: p[1], n: 0, skus: new Map(), size: p.slice(3) };
    e.n++;
    e.skus.set(p[0], (e.skus.get(p[0]) || 0) + 1);
    by.set(p[2], e);
  }
  return [...by.values()].sort((a, b) => b.n - a.n);
}
const loading = (what) => `<div class="card"><p class="lead">${icon('clock', 'i sm')} Loading ${what} from the StarterBot parts list…</p></div>`;

// ---------------------------------------------------------------- 3D Explorer
function explorer(view) {
  view.innerHTML = `<div class="robot-note">${icon('bot')}<span><b>3D Explorer preview.</b> This is the Home robot at full size. Phase 3 (January 4 to 22) adds the section cut, a measure tool, pins and live motion.</span></div>`;
}

// ---------------------------------------------------------------- Versions
const VERSIONS = [
  { id: 'v0', name: 'v0 · StarterBot kit', when: 'Today', who: null, note: "The goBILDA StarterBot straight from goBILDA's STEP file, 418 parts at full CAD detail. This is the robot in the 3D view.", add: 0, chg: 0, del: 0, real: true },
  { id: 'v1', name: 'v1 · Gecko wheels closer', when: 'Sample', who: 'Pixel', note: 'Intake gecko wheels moved 6 mm toward the middle for more compression on a pile.', add: 0, chg: 7, del: 0, parts: [['chg', '48mm Gecko Wheel', 7, 'moved 6 mm inward'], ['chg', 'Compact ServoBlock', 0, 'unchanged']] },
  { id: 'v2', name: 'v2 · One-at-a-time gate', when: 'Sample', who: 'Gizmo', note: 'A printed gate arm on the hopper servo so only one ball reaches the flywheel at a time.', add: 3, chg: 2, del: 1, parts: [['add', 'Gate arm (printed)', 1, 'new part'], ['add', 'M4 screws', 2, 'new'], ['chg', 'Hopper Servo', 1, 'turned 90°'], ['chg', 'Hopper Panel', 1, 'trimmed for the arm'], ['del', 'Standoff / Spacer', 1, 'removed']] },
  { id: 'v3', name: 'v3 · Adjustable hood', when: 'Sample', who: 'Sparky', note: 'A hood over the flywheel with three angle settings for near and far shots.', add: 5, chg: 1, del: 0, parts: [['add', 'Hood plate (printed)', 1, 'new part'], ['add', 'Hood pivot hardware', 4, 'new'], ['chg', 'Launcher Mount', 1, 'new holes for the pivot']] },
];
function versions(view, ctx) {
  let cur = 'v0';
  view.innerHTML = `<div class="zv">
    ${strip('Every named Onshape version becomes a node here, with a picture, notes and the parts that changed. Only v0 is real today: the team has no Onshape document of its own yet.', [tag('Phase 3 · once your Onshape exists'), SAMPLE])}
    <article class="card">
      <div class="card-head"><h3 class="card-title">Robot timeline</h3><span class="tag">4 versions</span></div>
      <div class="vrail" id="vrail">${VERSIONS.map((v) => `<button class="vnode${v.real ? '' : ' sample'}" type="button" data-v="${v.id}" aria-pressed="${v.id === cur}">
        <span class="vthumb">${v.real ? '<img src="/hub/assets/poster.webp" alt="" decoding="async">' : icon(v.id === 'v1' ? 'focus' : v.id === 'v2' ? 'layers' : 'sliders', 'i lg')}<span class="vbadge">${v.real ? '<span class="st solid">In the 3D view</span>' : '<span class="st">Sample</span>'}</span></span>
        <span class="vn">${v.name}</span>
        <span class="meta">${v.who ? `${av(v.who, 18)} ${v.who} · ` : ''}${v.when}</span>
        <span class="chg"><span><i class="c-add"></i>${v.add} added</span><span><i class="c-chg"></i>${v.chg} changed</span>${v.del ? `<span><i class="c-del"></i>${v.del} removed</span>` : ''}</span>
      </button>`).join('')}</div>
    </article>
    <article class="card c7" id="vDetail"></article>
    <article class="card c5">
      <div class="card-head"><h3 class="card-title">Season time-lapse</h3>${tag('Sample')}</div>
      <p class="lead">Scrub through the season and watch the robot change, version by version.</p>
      <div class="scrub"><button class="icon-btn" type="button" id="vPlay" aria-label="Play the time-lapse">${icon('play')}</button><input type="range" id="vScrub" min="0" max="3" step="1" value="0" aria-label="Version" style="--fill:0%"></div>
      <div class="row between"><span class="cap">v0 · kit</span><span class="cap" id="vScrubLbl">v0 · StarterBot kit</span><span class="cap">v3</span></div>
      <hr class="hr">
      <h4 class="sub">How a version gets here</h4>
      <ol class="bul"><li>Save a named version in Onshape, like "Gecko wheels closer".</li><li>The Hub hears about it through a webhook (webhooks don't use up API calls) and syncs it.</li><li>It shows up here with a picture, your note and the parts that changed.</li></ol>
    </article>
  </div>`;
  const detail = () => {
    const v = VERSIONS.find((x) => x.id === cur);
    const prev = VERSIONS[VERSIONS.indexOf(v) - 1];
    $('#vDetail').innerHTML = `<div class="card-head"><h3 class="card-title">${v.name}</h3>${v.real ? tag('Real', 'volt') : tag('Sample')}</div>
      <p>${v.note}</p>
      ${v.real ? `<div class="kpis"><div class="kpi"><div class="lab">Parts</div><div class="val">418</div></div><div class="kpi"><div class="lab">Triangles</div><div class="val">28.1M</div></div><div class="kpi"><div class="lab">On the wire</div><div class="val">143<small>MB</small></div></div></div>
        <div class="row wrap"><button class="btn primary pill" type="button" data-act="open3d">${icon('bot', 'i sm')}Open in 3D</button><span class="cap">The original file from your XR twin replaces this copy as v0 once you share it.</span></div>`
      : `<h4 class="sub">Compared with ${prev.name.split(' · ')[0]}</h4>
        <div class="items">${v.parts.filter((p) => p[2]).map(([k, n, q, w]) => `<div class="it"><span class="oc2"><i class="${k === 'add' ? 'c-add' : k === 'chg' ? 'c-chg' : 'c-del'}" style="width:12px;height:12px;border-radius:50%;display:block"></i></span><div class="grow"><div class="t">${n}${q > 1 ? ` <span class="muted">×${q}</span>` : ''}</div><div class="meta">${w}</div></div><span class="st">${k === 'add' ? 'Added' : k === 'chg' ? 'Changed' : 'Removed'}</span></div>`).join('')}</div>
        <div class="row wrap"><button class="btn soft pill" type="button" data-act="ghost">${icon('layers', 'i sm')}Ghost the old version in 3D</button><span class="cap">Compare mode colors added, changed and removed parts.</span></div>`}`;
  };
  detail();
  const pick = (id) => {
    cur = id;
    $$('.vnode', view).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === cur)));
    const i = VERSIONS.findIndex((x) => x.id === cur);
    const sc = $('#vScrub');
    sc.value = i; sc.style.setProperty('--fill', `${(i / 3) * 100}%`);
    $('#vScrubLbl').textContent = VERSIONS[i].name;
    detail();
  };
  $('#vrail').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (b) pick(b.dataset.v); });
  $('#vScrub').addEventListener('input', (e) => pick(VERSIONS[+e.target.value].id));
  let timer = 0;
  $('#vPlay').addEventListener('click', () => {
    clearInterval(timer);
    let i = 0; pick(VERSIONS[0].id);
    timer = setInterval(() => { i++; if (i > 3) { clearInterval(timer); return; } pick(VERSIONS[i].id); }, ctx.reduced ? 300 : 900);
  });
  view.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (!a) return;
    if (a.dataset.act === 'open3d') ctx.go('robot', '3D Explorer');
    if (a.dataset.act === 'ghost') ctx.toast('Compare mode arrives with Onshape sync in Phase 3: the old version turns to glass and changed parts light up.');
  });
  return () => clearInterval(timer);
}

// ---------------------------------------------------------------- Subsystems
function subsystems(view, ctx) {
  const parts = ctx.parts();
  if (!parts) { view.innerHTML = loading('subsystems'); return ctx.whenParts(() => ctx.rerender()); }
  const { SYS, SYS_ORDER } = ctx;
  let cur = ctx.state.sys || 'intake';
  const counts = {};
  for (const p of Object.values(parts.parts)) counts[p[1]] = (counts[p[1]] || 0) + 1;
  const blurb = (k) => (parts.systems.find((s) => s.id === k) || {}).blurb || '';
  view.innerHTML = `<div class="zv">
    ${strip('One page per subsystem: who owns it, how far along it is, its parts, tests, prints, code and open pins. Part counts and descriptions come from the real CAD.', [tag('Phase 3 · Jan 4–22'), SAMPLE])}
    <div class="c5 stack-v" style="gap:16px">
      <article class="card">
        <div class="card-head"><h3 class="card-title">Status board</h3></div>
        <div class="board">${STAGES.map((s, i) => `<div class="col"><h5>${s}</h5>${SYS_ORDER.filter((k) => SUBSYS[k].status === i).map((k) => `<button class="sbtn" type="button" data-pick="${k}" aria-pressed="${k === cur}">${dot(SYS[k].c, 8)}${SYS[k].name}</button>`).join('')}</div>`).join('')}</div>
      </article>
      <article class="card">
        <div class="items" id="sysList">${SYS_ORDER.map((k) => `<button class="it" type="button" data-pick="${k}" aria-pressed="${k === cur}"><span class="oc2">${dot(SYS[k].c, 12)}</span><div class="grow"><div class="t">${SYS[k].name}</div><div class="meta">${STAGES[SUBSYS[k].status]} · ${counts[k] || 0} parts</div></div><span class="end">${avStack(SUBSYS[k].owners, 24)}</span></button>`).join('')}</div>
      </article>
    </div>
    <article class="card c7" id="sysDetail"></article>
  </div>`;
  const draw = () => {
    const k = cur, s = SUBSYS[k], top = partsBySys(parts, k).slice(0, 6);
    $('#sysDetail').innerHTML = `<div class="sys-head"><span class="big-dot" style="--c:${SYS[k].c}"></span><h3>${SYS[k].name}</h3><span class="st solid">${STAGES[s.status]}</span></div>
      <p>${esc(blurb(k))}</p>
      <div class="stages" aria-label="Stage: ${STAGES[s.status]}">${STAGES.map((st, i) => `<span class="${i < s.status ? 'on' : i === s.status ? 'on cur' : ''}">${st}</span>`).join('')}</div>
      <div class="kpis"><div class="kpi"><div class="lab">Parts</div><div class="val">${counts[k] || 0}</div></div><div class="kpi"><div class="lab">Open pins</div><div class="val">${s.pins}</div></div><div class="kpi"><div class="lab">Prints</div><div class="val">${s.prints}</div></div><div class="kpi"><div class="lab">Code files</div><div class="val">${s.code.length}</div></div></div>
      <div class="row wrap"><span class="cap">Owners</span>${s.owners.map((n) => `<span class="st">${av(n, 18)}${n}</span>`).join('')}</div>
      <div class="callout" style="align-items:center">${icon('arrow')}<div><b>Next:</b> ${s.next}</div></div>
      <h4 class="sub">Main parts <span class="muted" style="font-weight:400">· from the CAD</span></h4>
      <div class="items">${top.map((p) => `<div class="it"><div class="grow"><div class="t">${esc(p.name)} <span class="muted">×${p.n}</span></div><div class="meta">${esc((parts.notes || {})[p.name] || '')}</div></div><button class="btn ghost pill sm" type="button" data-part="${esc(p.name)}">Show</button></div>`).join('')}</div>
      ${s.protos.length ? `<h4 class="sub">Tests <span class="muted" style="font-weight:400">· sample</span></h4><div class="items">${s.protos.map(([d, t, r]) => `<div class="it"><span class="oc2">${icon('flag', 'i sm')}</span><div class="grow"><div class="t">${t}</div><div class="meta">${d} · ${r}</div></div></div>`).join('')}</div>` : ''}
      ${s.code.length ? `<h4 class="sub">Code</h4><div class="row wrap">${s.code.map((c) => `<button class="btn soft pill sm" type="button" data-code="${c}">${icon('code', 'i sm')}<span class="mono" style="font-size:12px">${c}</span></button>`).join('')}</div>` : ''}
      <div class="row wrap" style="margin-top:4px"><button class="btn primary pill" type="button" data-see="${k}">${icon('focus', 'i sm')}See it in 3D</button><button class="btn ghost pill" type="button" data-ideas="1">${icon('bulb', 'i sm')}Ideas for ${SYS[k].name.toLowerCase()}</button></div>`;
  };
  draw();
  view.addEventListener('click', (e) => {
    const p = e.target.closest('[data-pick]');
    if (p) {
      cur = p.dataset.pick; ctx.state.sys = cur;
      $$('[data-pick]', view).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pick === cur)));
      draw();
      if (matchMedia('(max-width: 1099px)').matches) $('#sysDetail').scrollIntoView({ behavior: ctx.reduced ? 'auto' : 'smooth', block: 'start' });
      return;
    }
    const see = e.target.closest('[data-see]'); if (see) { ctx.focusSystem(see.dataset.see); return; }
    const part = e.target.closest('[data-part]'); if (part) { ctx.focusPart(part.dataset.part); return; }
    const code = e.target.closest('[data-code]'); if (code) { ctx.state.file = code.dataset.code; ctx.go('code', 'Our code'); return; }
    if (e.target.closest('[data-ideas]')) { ctx.state.ideaSys = cur; ctx.go('build', 'Ideas'); }
  });
}

// ---------------------------------------------------------------- Specs and parts (real bill of materials)
const SPARES = { 'Mecanum Wheel': 0, '48mm Gecko Wheel': 4, '72mm Gecko Wheel': 1, 'Drive Motor': 1, 'Intake Motor': 0, 'Launcher Motor': 0, 'Speed Servo': 2, 'Hopper Servo': 1, 'Intake Roller': 6, '12V Battery': 2, Hub: 5, '8mm REX Shaft': 1, 'Bearing / Collar': 10, 'Standoff / Spacer': 20, Hardware: 300, 'U-Channel': 3, '15-Hole U-Channel': 0, Flywheel: 0, '100-Tooth Gear': 1, '20-Tooth Gear': 2, 'Compact ServoBlock': 1, 'Quad Block Mount': 4, 'Dual Block Mount': 4, 'Launcher Mount': 0, 'Battery Mount': 0, 'Hopper Panel': 2, 'Ramp Panel': 0 };
function specs(view, ctx) {
  const parts = ctx.parts();
  if (!parts) { view.innerHTML = loading('the bill of materials'); return ctx.whenParts(() => ctx.rerender()); }
  const { SYS, SYS_ORDER } = ctx;
  const rows = partsBySys(parts).sort((a, b) => SYS_ORDER.indexOf(a.sys) - SYS_ORDER.indexOf(b.sys) || b.n - a.n);
  const skus = new Set(Object.values(parts.parts).map((p) => p[0]));
  let filt = '', q = '';
  view.innerHTML = `<div class="zv">
    ${strip('The bill of materials, straight from the StarterBot CAD: every part, its goBILDA part number, how many are on the robot and where. Spare counts are samples until the bins are counted.', [tag('Real parts list', 'volt'), tag('Spares are sample')])}
    <article class="card">
      <div class="kpis"><div class="kpi"><div class="lab">Parts</div><div class="val">${fmt(Object.keys(parts.parts).length)}</div></div><div class="kpi"><div class="lab">Kinds of part</div><div class="val">${rows.length}</div></div><div class="kpi"><div class="lab">Part numbers</div><div class="val">${skus.size}</div></div><div class="kpi"><div class="lab">Size</div><div class="val">45.2 × 45.2 × 30.9<small>cm</small></div></div><div class="kpi"><div class="lab">Weight and cost</div><div class="val" style="color:var(--muted)">Phase 3</div></div></div>
      <p class="cap" style="font-weight:400">Weight and cost fill in from goBILDA's catalog once each part number is matched. The CAD export doesn't carry them.</p>
    </article>
    <article class="card">
      <div class="tools"><div class="chips" id="bomF"><button class="chip" type="button" data-f="" aria-pressed="true">All</button>${SYS_ORDER.map((k) => `<button class="chip" type="button" data-f="${k}" aria-pressed="false">${dot(SYS[k].c, 8)}${SYS[k].name}</button>`).join('')}</div><input class="inp" type="search" id="bomQ" placeholder="Search parts or part numbers" aria-label="Search parts"></div>
      <div class="tbl" id="bom"></div>
    </article>
  </div>`;
  const draw = () => {
    const ql = q.trim().toLowerCase();
    const list = rows.filter((r) => (!filt || r.sys === filt) && (!ql || r.name.toLowerCase().includes(ql) || [...r.skus.keys()].some((s) => s.includes(ql))));
    const total = list.reduce((a, r) => a + r.n, 0);
    $('#bom').innerHTML = `<div class="tr th"><span>Part</span><span>Part number</span><span style="text-align:right">On robot</span><span>Subsystem</span><span>Spares</span><span></span></div>`
      + list.map((r) => {
        const sk = [...r.skus.entries()].sort((a, b) => b[1] - a[1]);
        const sp = SPARES[r.name];
        return `<div class="tr"><span><span class="nm">${esc(r.name)}</span><span class="nt">${esc((parts.notes || {})[r.name] || '')}</span></span>
          <span class="sku">${sk.length > 1 ? `<details><summary>${sk[0][0]} <span class="muted">+${sk.length - 1} more</span></summary><span class="skulist">${sk.map(([s, n]) => `<span>${s} ×${n}</span>`).join('')}</span></details>` : sk[0][0]}</span>
          <span class="q">${r.n}</span>
          <span class="sy row" style="gap:6px">${dot(SYS[r.sys].c, 8)}${SYS[r.sys].name}</span>
          <span class="sp${sp === 0 ? ' low' : ''}">${sp === undefined ? '—' : sp === 0 ? 'None left' : `${sp} spare${sp === 1 ? '' : 's'}`}</span>
          <span class="go"><button class="btn ghost pill sm" type="button" data-part="${esc(r.name)}">${icon('focus', 'i sm')}Show</button></span></div>`;
      }).join('')
      + (list.length ? `<div class="tr" style="font-weight:500"><span>${list.length} kinds shown</span><span></span><span class="q">${total}</span><span></span><span></span><span></span></div>` : '<p class="lead" style="padding:14px 4px">Nothing matches. Try "gecko" or a part number like 3613.</p>');
  };
  draw();
  $('#bomF').addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (!b) return; filt = b.dataset.f; $$('#bomF .chip').forEach((c) => c.setAttribute('aria-pressed', String(c === b))); draw(); });
  $('#bomQ').addEventListener('input', (e) => { q = e.target.value; draw(); });
  $('#bom').addEventListener('click', (e) => { const b = e.target.closest('[data-part]'); if (b) ctx.focusPart(b.dataset.part); });
}

// ---------------------------------------------------------------- AR and VR
function arvr(view, ctx) {
  view.innerHTML = `<div class="zv">
    ${strip('See the robot at real size in your room on a phone, or step inside your BioBuzz XR twin on a Quest 3.', [tag('Planned · tested on your phones first')])}
    <article class="card c6 stretch">
      <div class="card-head"><span class="oc2 volt">${icon('camera', 'i sm')}</span><h3 class="card-title">View in your room</h3></div>
      <p>Place the StarterBot on the floor at its real size, 45 cm across, and walk around it. Great for checking how big a new part will be.</p>
      <ol class="bul"><li>Open the Robot zone on your phone or tablet.</li><li>Tap <b>View in your room</b> and point the camera at the floor.</li><li>Drag to move it, pinch to turn it. It stays at real size.</li></ol>
      <div class="callout" style="background:var(--raised);color:var(--text)">${icon('alert')}<div>A 28-million-triangle model is heavy for phone AR. The full model gets tested on your phones first; if it struggles, AR uses a separate copy labeled "AR copy", or AR stays off if you'd rather have no simplified copy anywhere.</div></div>
      <div class="card-foot"><span class="cap" id="arResult">Checks what this device supports.</span><button class="btn primary pill" type="button" id="arCheck">${icon('camera', 'i sm')}Try on this device</button></div>
    </article>
    <article class="card c6 stretch">
      <div class="card-head"><span class="oc2 solid">${icon('gamepad', 'i sm')}</span><h3 class="card-title">Quest 3 XR twin</h3><span class="tag">Needs the twin's link</span></div>
      <p>Your BioBuzz digital twin runs in the Quest browser for headset sessions: drive the robot on the field at full scale and watch your code run.</p>
      <ul class="checks">
        <li><span class="ci ok">${icon('check')}</span>Same full-fidelity robot as the Hub</li>
        <li><span class="ci ok">${icon('check')}</span>Gamepads and Quest controllers both drive it</li>
        <li><span class="ci todo"></span>Waiting on where the twin's code lives, so the Hub can link it</li>
      </ul>
      <h4 class="sub">Headset rules</h4>
      <ul class="bul"><li>Clear floor space and a mentor in the room.</li><li>Turns of 15 minutes, then pass it on.</li><li>Feel dizzy? Take it off and sit down. That's always OK.</li></ul>
      <div class="card-foot"><span class="cap">The headset opens the twin; no account on the headset needed.</span><button class="btn ghost pill" type="button" id="questBtn">${icon('arrow', 'i sm')}Open on Quest</button></div>
    </article>
  </div>`;
  $('#arCheck').addEventListener('click', async () => {
    const out = $('#arResult');
    out.textContent = 'Checking…';
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    let xr = false;
    try { xr = !!(navigator.xr && await navigator.xr.isSessionSupported('immersive-ar')); } catch (e) { xr = false; }
    out.textContent = xr ? 'This device supports WebXR AR, so "View in your room" can run here.'
      : ios ? 'iPhones and iPads use AR Quick Look, which needs a USDZ copy of the robot. That copy gets tested first.'
        : 'No AR on this device. Open the Hub on a phone or tablet to place the robot in your room.';
  });
  $('#questBtn').addEventListener('click', () => ctx.toast('Once the twin is linked, this opens it in the Quest browser. Tell us where its code lives.'));
}

export const ROBOT = { '3D Explorer': explorer, Versions: versions, Subsystems: subsystems, 'Specs and parts': specs, 'AR and VR': arvr };
