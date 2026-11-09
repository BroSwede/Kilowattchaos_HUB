// After flow.cjs: visit every zone page as a student and a mentor at phone and desktop width, in the artifact edition.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const [BASE, SHOTS, VENDOR] = process.argv.slice(2);
const MOCK = fs.readFileSync(path.join(__dirname, 'mock-claude.js'), 'utf8');
const ROUTES = ['home/dashboard', 'home/shop-tv', 'home/customize', 'robot/3d-explorer', 'robot/versions', 'robot/subsystems', 'robot/specs-and-parts', 'robot/ar-and-vr', 'build/ideas', 'build/mechanism-lab', 'build/print-shop', 'build/parts-and-inventory', 'learn/paths', 'learn/first-and-biobuzz', 'learn/setup-and-faq', 'learn/build-tips', 'learn/ai-agents', 'learn/glossary', 'code/biobuzz-arena', 'code/our-code', 'code/snippets', 'code/challenges', 'crew/chat', 'crew/inspiration', 'crew/people', 'crew/feedback', 'logbook/calendar', 'logbook/sessions', 'logbook/progress', 'logbook/competitions', 'logbook/portfolio'];
(async () => {
  const b = await chromium.launch(); let bad = 0;
  const state = path.join(SHOTS, 'mockdb.json');
  for (const [who, size] of [['kid1', [390, 844, 1]], ['eric&owner=1', [1440, 900, 0]], ['kid1', [1440, 900, 0]], ['eric&owner=1', [390, 844, 1]]]) {
    const ctx = await b.newContext({ viewport: { width: size[0], height: size[1] }, isMobile: !!size[2], hasTouch: !!size[2] });
    await ctx.addInitScript(MOCK);
    if (fs.existsSync(state)) await ctx.addInitScript((d) => { if (!localStorage.getItem('kwc-mock-db')) localStorage.setItem('kwc-mock-db', d); }, fs.readFileSync(state, 'utf8'));
    if (VENDOR) await ctx.route('https://cdn.jsdelivr.net/npm/**', (r) => { const rest = new URL(r.request().url()).pathname.replace(/^\/npm\//, ''); const [pkg, ...p] = rest.split('/'); const f = path.join(VENDOR, pkg.replace('@', '-'), 'package', ...p); return fs.existsSync(f) ? r.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' }); });
    await ctx.route('**/assets/starterbot*', (r) => r.fulfill({ status: 404, body: '' }));
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
    p.on('console', (m) => { if (m.type() === 'error' && !/404|starterbot|robot file|TUNNEL/.test(m.text())) errs.push('console ' + m.text().slice(0, 200)); });
    await p.goto(`${BASE}/index.html?as=${who}`); await p.waitForSelector('#hello', { state: 'visible', timeout: 15000 }); await p.waitForTimeout(1200);
    for (const r of ROUTES) {
      await p.evaluate((r) => { location.hash = r; }, r); await p.waitForTimeout(900);
      const m = await p.evaluate(() => { const cw = document.documentElement.clientWidth; const nr = [...document.querySelectorAll('.zv')].some((e) => /didn.t load/.test(e.textContent)); const wide = document.documentElement.scrollWidth > cw + 1; return { nr, wide }; });
      if (m.nr || m.wide) { bad++; console.log('✗', who, size[0], r, m.nr ? 'NOT-READY' : '', m.wide ? 'WIDE' : ''); }
      if (size[0] === 390 && who === 'kid1') await p.screenshot({ path: `${SHOTS}/tour-${r.replace('/', '_')}.png` });
    }
    if (errs.length) { bad += errs.length; console.log(who, size[0], errs.slice(0, 6).join('\n')); }
    await ctx.close();
  }
  console.log(bad ? `${bad} problems` : 'all clean'); await b.close();
})();
