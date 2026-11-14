// Robot Lab: the public page at /robot-lab. Lists every deep dive the hub has (same registry), no sign-in.
// Share a single dive with /robot-lab#motor.
import { DIVES, LEVELS, openDive } from './dive/index.js';

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
