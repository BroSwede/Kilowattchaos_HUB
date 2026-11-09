// Local check of the artifact edition with the mock runtime. Usage: node flow.cjs http://127.0.0.1:8790 shotsDir vendorDir
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const [BASE, SHOTS, VENDOR] = process.argv.slice(2);
const MOCK = fs.readFileSync(path.join(__dirname, 'mock-claude.js'), 'utf8');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(MOCK);
  if (VENDOR) await ctx.route('https://cdn.jsdelivr.net/npm/**', (r) => { const rest = new URL(r.request().url()).pathname.replace(/^\/npm\//, ''); const [pkg, ...p] = rest.split('/'); const f = path.join(VENDOR, pkg.replace('@', '-'), 'package', ...p); return fs.existsSync(f) ? r.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' }); });
  await ctx.route('**/assets/starterbot*', (r) => r.fulfill({ status: 404, body: '' }));
  const errs = [];
  const open = async (q) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(q + ' PAGEERROR ' + e.message + ' ' + (e.stack || '').split('\n')[1])); p.on('console', (m) => { if (m.type() === 'error' && !/404|starterbot|robot file/.test(m.text())) errs.push(q + ' console ' + m.text().slice(0, 200)); }); await p.goto(`${BASE}/index.html?${q}`); await p.waitForTimeout(600); return p; };
  const step = (s) => console.log('·', s);

  const o = await open('as=eric&owner=1');
  await o.waitForSelector('#gate h1:has-text("Set up the hub")');
  await o.fill('#gate input[name=name]', 'Coach Eric'); await o.click('#gate button[type=submit]');
  await o.waitForSelector('#hello', { state: 'visible' }); await o.waitForTimeout(1500);
  step('owner in hub: ' + (await o.textContent('#hello')));
  await o.click('#meBtn'); await o.click('#meMentor'); await o.waitForSelector('#gate .code-big');
  const code = (await o.textContent('#gate .code-big')).trim(); step('team code ' + code);
  await o.screenshot({ path: `${SHOTS}/art-mentor.png` });

  const k = await open('as=kid1');
  await k.waitForSelector('#gate h1:has-text("Join the team")');
  await k.fill('#gate input[name=code]', code); await k.fill('#gate input[name=name]', 'Sparky'); await k.check('#gate input[name=agree]'); await k.click('#gate button[type=submit]');
  await k.waitForSelector('#gate h1:has-text("Almost there")'); step('kid pending');
  const c = await open('as=coach1');
  await c.fill('#gate input[name=code]', code); await c.fill('#gate input[name=name]', 'Coach Dana'); await c.check('#gate input[name=agree]'); await c.click('#gate button[type=submit]');
  await c.waitForSelector('#gate h1:has-text("Almost there")'); step('coach pending');

  await o.waitForTimeout(700);
  const rows = o.locator('#gate tr[data-id]');
  const kidRow = o.locator('#gate tr:has-text("Sparky")'); await kidRow.locator('.mPaper').check(); await kidRow.locator('.mApprove').click(); await o.waitForTimeout(700);
  const coachRow = o.locator('#gate tr:has-text("Coach Dana")'); await coachRow.locator('.mRole').selectOption('mentor'); await coachRow.locator('.mApprove').click(); await o.waitForTimeout(700);
  step('approved; rows now ' + (await rows.count()));

  await k.waitForSelector('#hello', { state: 'visible', timeout: 15000 }); await k.waitForTimeout(1500);
  step('kid hub: ' + (await k.textContent('#hello')));
  await k.screenshot({ path: `${SHOTS}/art-kid-home.png` });
  const made = await k.evaluate(async () => { const m = await import('./api.js'); const r = await m.api.create('idea', { title: 'Test idea' }); const l = await m.api.list('idea'); let chat = 'ok'; try { await m.api.create('chat', { text: 'x' }); } catch (e) { chat = e.message; } let badge = 'ok'; try { await m.api.create('badge', { name: 'x' }); } catch (e) { badge = e.message; } const ci = await m.api.checkinInfo(); await m.api.checkin(ci.code); const ci2 = await m.api.checkinInfo(); return { n: l.length, chat, badge, code: ci.code, here: ci2.here.map((h) => h.name), qr: ci.svg.slice(0, 4) }; });
  step('api: ' + JSON.stringify(made));
  await c.waitForSelector('#hello', { state: 'visible', timeout: 15000 });
  step('coach hub: ' + (await c.textContent('#hello')) + ' mentor=' + (await c.evaluate(async () => (await import('./api.js')).isMentor())));
  fs.writeFileSync(path.join(SHOTS, 'mockdb.json'), await o.evaluate(() => localStorage.getItem('kwc-mock-db')));
  await b.close();
  console.log(errs.join('\n') || 'no errors');
})();
