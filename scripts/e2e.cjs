// End-to-end check of the real flows: setup, join, parent consent, approval, sign-in, hub, check-in.
// Usage: node scripts/e2e.cjs [baseUrl] [shotsDir]   (needs Playwright and a fresh database)
const { chromium } = require('playwright');
(async () => {
const BASE = process.argv[2] || 'http://127.0.0.1:3000';
const SHOTS = process.argv[3] || '/tmp';
const b = await chromium.launch();
const log = [];
const page = async (opts = {}) => {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
  // Optional: serve the three.js CDN files from local copies (KWC_VENDOR=dir holding <pkg@ver>/package/...).
  if (process.env.KWC_VENDOR) await ctx.route('https://cdn.jsdelivr.net/npm/**', (r) => {
    const rest = new URL(r.request().url()).pathname.replace(/^\/npm\//, '');
    const [pkg, ...p] = rest.split('/');
    const f = require('path').join(process.env.KWC_VENDOR, pkg.replace('@', '-'), 'package', ...p);
    return require('fs').existsSync(f) ? r.fulfill({ status: 200, contentType: 'application/javascript', body: require('fs').readFileSync(f) }) : r.fulfill({ status: 404, body: '' });
  });
  await ctx.route('**/hub/model/**', (r) => r.fulfill({ status: 404, body: '' })); // skip the 107 MB robot in tests
  const p = await ctx.newPage();
  p.on('pageerror', (e) => log.push('PAGEERROR ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
  p.on('console', (m) => { if (m.type() === 'error' && !/404|model|HTTP/.test(m.text())) log.push('console ' + m.text().slice(0, 200)); });
  return p;
};
const step = (s) => console.log('·', s);

const m = await page();
await m.goto(BASE + '/');
step('setup at ' + m.url());
if (await m.locator('input[name=key]').count()) await m.fill('input[name=key]', process.env.SETUP_KEY || '');
await m.fill('input[name=name]', 'Coach Eric');
await m.fill('input[name=password]', 'mentor-pass-1');
await m.click('button[type=submit]');
await m.waitForURL('**/mentor');
const teamCode = (await m.textContent('.code-big')).trim();
step('mentor console, team code ' + teamCode);

const k = await page({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await k.goto(BASE + '/join');
await k.fill('input[name=code]', teamCode);
await k.fill('input[name=name]', 'Sparky');
await k.fill('input[name=password]', 'volt-gear-hive');
await k.fill('input[name=parent]', 'parent@example.com');
await k.check('input[name=agree]');
await k.click('button[type=submit]');
await k.waitForURL('**/pending');
step('student pending');

await m.goto(BASE + '/mentor');
const link = (await m.locator('text=/\\/consent\\//').first().textContent()).trim();
const pp = await page({ viewport: { width: 390, height: 844 } });
await pp.goto(link);
await pp.fill('input[name=guardian]', 'Pat Parent');
await pp.check('input[name=agree]');
await pp.click('button[type=submit]');
await pp.waitForSelector('text=Thank you');
step('parent consent recorded');

await m.goto(BASE + '/mentor');
await m.click('button:has-text("Turn on")');
await m.waitForSelector('text=Approved');
step('mentor approved');

await k.goto(BASE + '/hub');
await k.waitForSelector('#hello');
await k.waitForTimeout(2500);
step('hub hello: ' + (await k.textContent('#hello')));
await k.screenshot({ path: `${SHOTS}/e2e-hub-phone.png` });

const info = await k.evaluate(() => fetch('/api/checkin').then((r) => r.json()));
await k.goto(`${BASE}/checkin?c=${info.code}`);
await k.click('button[type=submit]');
await k.waitForSelector('text=checked in');
step('checked in with ' + info.code);

const made = await k.evaluate(() => fetch('/api/records/idea', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { title: 'Test idea' } }) }).then((r) => r.status));
const chat = await k.evaluate(() => fetch('/api/records/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { text: 'hi' } }) }).then((r) => r.status));
const badge = await k.evaluate(() => fetch('/api/records/badge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { name: 'x' } }) }).then((r) => r.status));
step(`idea POST ${made} (want 201), chat POST ${chat} (want 403, chat off), student badge POST ${badge} (want 403)`);
await b.close();
console.log(log.length ? log.join('\n') : 'no page errors');
})();
