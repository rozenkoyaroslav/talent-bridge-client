// Drives the built demo in a real browser: MSW only runs in a browser, so this is
// the only way to prove the mock mode actually works end to end.
import { chromium } from 'playwright';

const shot = async (page, name) => page.screenshot({ path: `/tmp/tb-${name}.png`, fullPage: false });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', m => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', e => errors.push(String(e)));

await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.waitForSelector('text=Demo mode', { timeout: 15000 });
console.log('login screen:', await page.title());
await shot(page, 'login');

// --- employer -------------------------------------------------------------
await page.getByRole('button', { name: 'Employer', exact: true }).click();
await page.waitForURL('**/candidates', { timeout: 15000 });
await page.waitForSelector('text=Book for a vacancy', { timeout: 15000 });
const cards = await page.locator('text=Book for a vacancy').count();
console.log('employer candidates cards:', cards);
await shot(page, 'candidates');

// Filter genuinely narrows the result set on the mock db.
const before = await page.locator('text=Book for a vacancy').count();
await page.locator('input[placeholder="From"]').fill('19');
await page.locator('input[placeholder="To"]').fill('22');
await page.getByRole('button', { name: 'Apply filters' }).click();
await page.waitForTimeout(1200);
const after = await page.locator('text=Book for a vacancy').count();
console.log(`age filter 19-22: ${before} -> ${after} candidates`);

// --- chat -----------------------------------------------------------------
await page.getByRole('link', { name: 'Chat' }).click();
await page.waitForTimeout(1200);
await page.locator('button').filter({ hasText: /Northwind|Stella|Ada|Support|Direct/ }).first().click().catch(() => {});
await page.waitForTimeout(800);
const chatButtons = await page.locator('li button').count();
console.log('chat conversations:', chatButtons);
if (chatButtons > 0) {
  await page.locator('li button').first().click();
  await page.waitForTimeout(800);
  await page.getByPlaceholder('Write a message…').fill('Can you start on Monday?');
  await page.getByRole('button', { name: 'Send' }).click();
  await page.waitForTimeout(1800);
  const mine = await page.locator('text=Can you start on Monday?').count();
  const replied = await page.locator('.bg-white.text-slate-800').count();
  console.log('sent message rendered:', mine, '| incoming bubbles:', replied);
  await shot(page, 'chat');
}

// --- admin ----------------------------------------------------------------
await page.getByRole('button', { name: 'Sign out' }).click();
await page.waitForURL('**/login', { timeout: 15000 });
await page.getByRole('button', { name: 'Admin', exact: true }).click();
await page.waitForURL('**/admin/analytics', { timeout: 15000 });
await page.waitForSelector('text=Total accounts', { timeout: 15000 });
const total = await page.locator('text=Total accounts').locator('..').locator('p').nth(1).textContent();
console.log('admin analytics total accounts:', total?.trim());
await page.waitForTimeout(1500);
await shot(page, 'analytics');

await page.getByRole('link', { name: 'Users' }).click();
await page.waitForTimeout(1200);
const approveButtons = await page.getByRole('button', { name: 'Approve' }).count();
console.log('pending users with approve action:', approveButtons);
await shot(page, 'admin-users');

// --- student --------------------------------------------------------------
await page.getByRole('button', { name: 'Sign out' }).click();
await page.waitForURL('**/login', { timeout: 15000 });
await page.getByRole('button', { name: 'Student', exact: true }).click();
await page.waitForURL('**/vacancies', { timeout: 15000 });
await page.waitForTimeout(1200);
console.log('student vacancies respond buttons:', await page.getByRole('button', { name: 'Respond' }).count());
await shot(page, 'vacancies');

await page.getByRole('link', { name: 'Profile' }).click();
await page.waitForTimeout(1500);
console.log('profile form loaded:', await page.locator('text=Save profile').count() > 0);
await shot(page, 'profile');

console.log('\nconsole errors:', errors.length ? errors.slice(0, 5) : 'none');
await browser.close();
