import { Given, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { AgeloWorld } from '../world';

const SA_EMAIL = 'architect@agelo.local';
const SA_PASSWORD = 'Architect#1';

export async function loginAsSa(world: AgeloWorld, password = SA_PASSWORD) {
  const res = await world.api.post<{ token: string; user: any }>('/auth/login', {
    email: SA_EMAIL,
    password,
  });
  world.authToken = res.token;
  await world.page.goto(AgeloWorld.frontendUrl + '/login');
  await world.page.evaluate(
    ([token, user]) => {
      localStorage.setItem('agelo.token', token as string);
      localStorage.setItem('agelo.user', JSON.stringify(user));
    },
    [res.token, res.user] as const,
  );
  return res.user;
}

Given('the Agelo frontend is open', async function (this: AgeloWorld) {
  await this.page.goto(AgeloWorld.frontendUrl + '/login');
  // The login page brand mark is the inline SVG `<app-agelo-logo>`
  // wordmark, no `<h1>` anymore. Wait for the input row instead.
  await expect(this.page.locator('input[name=email]')).toBeVisible();
});

Given('I am signed in as the Solution Architect', async function (this: AgeloWorld) {
  await loginAsSa(this);
  await this.page.goto(AgeloWorld.frontendUrl + '/organizations');
  await expect(this.page.getByRole('heading', { name: 'Organizations', exact: true })).toBeVisible();
});

Given('the bootstrap SA has signed in', async function (this: AgeloWorld) {
  await loginAsSa(this);
});

When('I reload the application', async function (this: AgeloWorld) {
  await this.page.reload();
});

When('I click {string}', async function (this: AgeloWorld, label: string) {
  if (/sign\s*out/i.test(label)) {
    // Sign out lives inside the user dropdown.
    await this.page.locator('.user-chip').click();
    await this.page.locator('.ant-dropdown-menu-item').filter({ hasText: /sign out/i }).click();
    return;
  }
  await this.page.getByRole('button', { name: label }).first().click();
});
