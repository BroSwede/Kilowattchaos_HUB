// Robot Lab: the public page at /robot-lab. Lists every deep dive the hub has (same registry), no sign-in.
// Share a single dive with /robot-lab#motor.
import { DIVES, openDive } from './dive/index.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const card = (d) => `<button class="lab-card" type="button" data-dive="${esc(d.key)}">
  <span class="lab-ic" style="--c:var(--sys-${esc(d.sys)})"><svg class="i"><use href="#i-${esc(d.icon || 'sparkle')}"/></svg></span>
  <span class="lab-t">${esc(d.name)}</span><span class="cap">${esc(d.blurb)}</span>${d.chapters ? `<span class="tag">${d.chapters} chapters</span>` : ""}
  <span class="btn primary pill sm lab-go">Open<svg class="i sm"><use href="#i-arrow"/></svg></span></button>`;

const works = DIVES.filter((d) => d.kind === 'works');
const made = DIVES.filter((d) => d.kind !== 'works');
document.getElementById('labWorks').innerHTML = works.map(card).join('') || '<p class="cap">Coming soon.</p>';
document.getElementById('labMade').innerHTML = made.map(card).join('');

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
