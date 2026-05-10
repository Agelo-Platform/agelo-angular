import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { AgeloWorld } from '../world';

When('I sign in with the bootstrap credentials', async function (this: AgeloWorld) {
  await this.page.fill('input[type=email]', 'architect@agelo.local');
  await this.page.fill('input[type=password]', 'Architect#1');
  await this.page.getByRole('button', { name: /sign in/i }).click();
});

When(
  'I attempt to sign in as {string} with password {string}',
  async function (this: AgeloWorld, email: string, password: string) {
    await this.page.fill('input[type=email]', email);
    await this.page.fill('input[type=password]', password);
    await this.page.getByRole('button', { name: /sign in/i }).click();
  },
);

Then('I am redirected to the organizations page', async function (this: AgeloWorld) {
  await this.page.waitForURL(/\/organizations(\?.*)?$/);
  await expect(
    this.page.getByRole('heading', { name: 'Organizations', exact: true }),
  ).toBeVisible();
});

Then('the user menu shows the SA display name', async function (this: AgeloWorld) {
  await expect(this.page.locator('.user-chip')).toContainText(/Architect/);
});

Then('I see a sign-in error message', async function (this: AgeloWorld) {
  // ng-zorro alert renders as .ant-alert-error.
  await expect(this.page.locator('.ant-alert-error')).toBeVisible();
});

Then('I am back on the login page', async function (this: AgeloWorld) {
  await this.page.waitForURL(/\/login$/);
});
