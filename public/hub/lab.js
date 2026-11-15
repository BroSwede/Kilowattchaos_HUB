// Robot Lab: the public page at /robot-lab. Lists every deep dive the hub has (same registry), no sign-in.
// Share a single dive with /robot-lab#motor.
import { DIVES, LEVELS, openDive, topicFor } from './dive/index.js';
import { MATCH, GAME_BASICS, ROBOT_RULES, SAFETY, CORE, LINKS } from './rules-data.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const card = (d) => `<button class="lab-card" type="button" data-dive="${esc(d.key)}">
  <span class="lab-ic" style="--c:var(--sys-${esc(d.sys)})"><svg class="i"><use href="#i-${esc(d.icon || 'sparkle')}"/></svg></span>
  <span class="lab-t">${esc(d.name)}</span><span class="cap">${esc(d.blurb)}</span>
  <span class="lab-row"><span class="tag">${d.kind === 'made' ? 'How it’s made' : 'How it works'}</span><span class="btn primary pill sm lab-go">Open<svg class="i sm"><use href="#i-arrow"/></svg></span></span></button>`;

// Three ordered paths instead of one long list, so a first-time visitor knows where to begin.
document.getElementById('labLevels').innerHTML = LEVELS.map(([lv, name, sub], n) => `<section class="lab-sec${n ? '' : ' is-first'}" aria-labelledby="lab-${lv}">
  <div class="lab-sec-head"><b class="lab-n">${n + 1}</b><h3 class="card-title" id="lab-${lv}">${name}</h3><span class="cap">${sub}</span></div>
  <div class="lab-grid">${DIVES.filter((d) => d.level === lv).map(card).join('')}</div></section>`).join('');

const start = (key) => openDive(key, { onClose: () => { if (location.hash) history.replaceState(null, '', location.pathname); } });
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-dive]');
  if (!b) return;
  history.replaceState(null, '', `#${b.dataset.dive}`);
  start(b.dataset.dive);
});
const fromHash = () => { const k = location.hash.slice(1); if (DIVES.some((d) => d.key === k)) start(k); };
window.addEventListener('hashchange', fromHash);
fromHash();

// ---------------------------------------------------------------- 3D robot: click a part to learn
// Plain words for a 7th grader, by part name. Anything not listed falls back to its system's blurb.
const SAYS = {
  'Drive Motor': 'One of four motors that drive the wheels. Each one spins a mecanum wheel through a built-in gearbox.',
  'Mecanum Wheel': 'A wheel with little angled rollers around it. Four of them let the robot drive forward, sideways and spin.',
  '12V Battery': 'Ten small cells packed together. It powers every motor, servo and the Control Hub.',
  'Battery Mount': 'Holds the battery tight so it can’t bounce loose during a match.',
  '15-Hole U-Channel': 'The two main side rails. Almost everything on the robot bolts to these.',
  'U-Channel': 'Aluminium channel with holes every 8 mm, so parts can bolt on anywhere.',
  'Flywheel': 'A heavy wheel spun really fast. When a ball touches it, the spin throws the ball toward the goal.',
  'Launcher Motor': 'Spins the flywheel. The code keeps its speed steady so every shot goes the same distance.',
  'Launcher Mount': 'Holds the launcher at the right angle to aim shots.',
  'Intake Motor': 'Spins the intake so the soft wheels pull balls off the floor.',
  'Intake Roller': 'Flexible rollers that squeeze and grab balls as the robot drives over them.',
  '48mm Gecko Wheel': 'A soft, grippy wheel in the intake. It squishes around a ball to pull it in.',
  '72mm Gecko Wheel': 'A bigger soft, grippy wheel that pushes balls along the path.',
  'Hopper Panel': 'A wall of the hopper that keeps balls lined up on their way to the launcher.',
  'Ramp Panel': 'The curved ramp that carries balls up toward the flywheel.',
  'Hopper Servo': 'A small motor that moves to an exact angle. It acts as a gate and lets one ball through at a time.',
  'Speed Servo': 'A servo that spins all the way around, used to keep balls moving.',
  'Compact ServoBlock': 'A holder that mounts a servo firmly to the frame.',
  '100-Tooth Gear': 'A big gear. Paired with a small gear, it trades speed for more turning strength.',
  '20-Tooth Gear': 'A small gear. It spins five times for each turn of the 100-tooth gear.',
  '8mm REX Shaft': 'A steel rod that carries spinning parts like wheels and gears.',
  'Hub': 'Clamps a wheel or gear to a shaft so they turn together.',
  'Bearing / Collar': 'Lets a shaft spin smoothly, or stops it sliding sideways.',
  'Standoff / Spacer': 'Holds two parts a fixed distance apart.',
  'Dual Block Mount': 'A small clamp block that joins parts at right angles.',
  'Quad Block Mount': 'Clamps a channel to a shaft or a motor.',
  'Hardware': 'Screws, nuts and small bits that hold the robot together.',
};
const CHIPS = [['Drive Motor', 'Drive motor'], ['Mecanum Wheel', 'Wheel'], ['12V Battery', 'Battery'], ['Flywheel', 'Launcher'], ['Intake Roller', 'Intake'], ['15-Hole U-Channel', 'Frame']];
let viewer = null, partsData = null;
const $ = (id) => document.getElementById(id);
const partCard = $('partCard');
function showPart(info) {
  if (!info) { partCard.hidden = true; return; }
  const sys = (partsData.systems.find((x) => x.id === info.sys) || {});
  $('partSys').textContent = sys.name || '';
  $('partName').textContent = info.name;
  $('partText').textContent = SAYS[info.name] || info.note || sys.blurb || '';
  const key = topicFor(info), d = key && DIVES.find((x) => x.key === key);
  const btn = $('partDive');
  btn.hidden = !d;
  if (d) { btn.dataset.dive = d.key; btn.textContent = d.kind === 'made' ? `See how the ${d.name.toLowerCase()} is made` : `Learn how it works: ${d.name}`; }
  partCard.hidden = false;
}
$('partClose').addEventListener('click', () => viewer && viewer.select(null));
$('resetBtn').addEventListener('click', () => viewer && viewer.resetView());
$('partChips').innerHTML = CHIPS.map(([n, l]) => `<button class="chip" type="button" data-part="${esc(n)}">${esc(l)}</button>`).join('');
$('partChips').addEventListener('click', (e) => {
  const b = e.target.closest('[data-part]');
  if (!b || !viewer) return;
  const id = viewer.findPart(b.dataset.part);
  if (id) viewer.select(id, { frame: true });
});
async function startViewer() {
  const bar = $('loadBar'), lbl = $('loadLbl');
  try {
    partsData = await (await fetch('/hub/data/parts.json')).json();
    const { createViewer } = await import('./viewer.js');
    viewer = await createViewer({
      container: $('viewport'), canvas: $('robotCanvas'), data: partsData,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      dark: matchMedia('(prefers-color-scheme: dark)').matches,
      onProgress(phase, f) {
        if (phase === 'download') { bar.style.transform = `scaleX(${f})`; lbl.textContent = `Loading the robot, ${Math.round(f * 100)}%`; }
        else if (phase === 'unpack') lbl.textContent = 'Unpacking the 3D model';
        else if (phase === 'build') lbl.textContent = 'Building 418 parts';
      },
      onFirstFrame() { $('viewport').classList.add('is-live'); $('loader').classList.add('is-done'); },
      onSelect: showPart,
    });
    window.__labViewer = viewer;
  } catch (err) {
    console.error(err);
    bar.style.transform = 'scaleX(0)';
    lbl.textContent = '3D couldn’t start on this device. The picture is the same robot.';
  }
}
const c = navigator.connection;
if (c && c.saveData) {
  $('loadLbl').innerHTML = 'Data Saver is on. <button class="btn soft pill sm" type="button" id="loadNow">Load the 3D robot (143 MB)</button>';
  $('loadNow').addEventListener('click', startViewer, { once: true });
} else startViewer();

// ---------------------------------------------------------------- Rules and the game (same data as Learn)
const acc = (title, inner, open = false) => `<details class="lab-acc"${open ? ' open' : ''}><summary>${title}</summary><div class="lab-acc-body">${inner}</div></details>`;
const list = (rows) => `<ul class="lab-list">${rows.map(([t, d]) => `<li><b>${esc(t)}</b> ${esc(d)}</li>`).join('')}</ul>`;
$('labRules').innerHTML = [
  acc('What FTC is', '<p>FIRST Tech Challenge (FTC) is a robotics competition for grades 7 to 12. Every September a new game is revealed. Teams design, build and code a robot to play it, then compete at meets and tournaments through the winter.</p>', true),
  acc('A match, step by step', `<ul class="lab-list">${MATCH.map(([, t, len, d]) => `<li><b>${esc(t)}</b> <span class="tag">${esc(len)}</span> ${esc(d)}</li>`).join('')}</ul>`),
  acc('Alliances, scoring and awards', list(GAME_BASICS)),
  acc('Robot rules that matter most', list(ROBOT_RULES)),
  acc('Safety', `<ul class="lab-list">${SAFETY.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`),
  acc('Gracious Professionalism and Coopertition', `<p><b>Gracious Professionalism</b> means competing hard while being kind and respectful. <b>Coopertition</b> means helping other teams, even ones you'll play against, like lending a part in the pits.</p>${list(CORE.map(([t, d]) => [t, d]))}`),
  acc('Official rules and links', `<ul class="lab-list">${LINKS.map(([t, d, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a> ${esc(d)}</li>`).join('')}</ul>`),
].join('');
