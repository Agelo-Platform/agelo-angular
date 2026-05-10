/* eslint-disable no-console */
import { chromium } from 'playwright';

async function main() {
  const FE = process.argv[2] || `http://localhost:4200`;
  const BE = process.argv[3] || `http://localhost:3100/api/v1`;
  console.log(`probing FE=${FE} BE=${BE}`);

  const loginRes = await fetch(`${BE}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'architect@agelo.local',
      password: 'Architect#1',
    }),
  });
  const login = (await loginRes.json()) as any;
  console.log('login:', loginRes.status, login.user?.email);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  await ctx.addInitScript((api: string) => {
    (window as any).__AGELO_API__ = api;
  }, BE);

  const page = await ctx.newPage();
  page.on('console', (m) => console.log(`  [${m.type()}]`, m.text()));
  page.on('pageerror', (e) => console.log(`  [pageerror]`, e.message));

  await page.goto(`${FE}/login`);
  await page.evaluate(([t, u]) => {
    localStorage.setItem('agelo.token', t as string);
    localStorage.setItem('agelo.user', JSON.stringify(u));
  }, [login.token, login.user] as const);

  await page.goto(`${FE}/organizations`);
  await page.waitForTimeout(3000);
  console.log('url=', page.url());
  const h1Texts = await page.locator('h1').allInnerTexts();
  console.log('h1 texts:', h1Texts);
  const appOrg = await page.locator('app-organizations').count();
  console.log('app-organizations element count:', appOrg);

  await browser.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
