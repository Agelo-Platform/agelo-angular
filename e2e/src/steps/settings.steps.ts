import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { AgeloWorld } from '../world';
import { loginAsSa } from './common.steps';

When('I open the settings page', async function (this: AgeloWorld) {
  await this.page.goto(AgeloWorld.frontendUrl + '/settings');
  await expect(this.page.getByRole('heading', { name: 'Settings' })).toBeVisible();
});

When('I toggle the theme', async function (this: AgeloWorld) {
  // Reset to light first via the API so the scenario is deterministic regardless
  // of state left behind by a previous run (the SA user is shared and the theme
  // persists in the DB).
  await this.api.patch('/settings/theme', { theme: 'light' }, { token: this.authToken! });

  // Theme moved from Profile to a dedicated Appearance settings section.
  await this.page.goto(AgeloWorld.frontendUrl + '/settings/appearance');
  // Wait for the theme radio group to render — the section is rendered as
  // an ng-zorro card (no semantic <h*>), so identify it by the radio buttons.
  await expect(
    this.page.locator('label.ant-radio-button-wrapper').filter({ hasText: 'Light' }),
  ).toBeVisible();
  // Click "Dark" — the assertion below expects dark.
  await this.page.locator('label.ant-radio-button-wrapper').filter({ hasText: 'Dark' }).click();
});

Then('the page is now in dark mode', async function (this: AgeloWorld) {
  await expect(this.page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

Then('the page is still in dark mode', async function (this: AgeloWorld) {
  await expect(this.page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

When(
  'I change the password from {string} to {string}',
  async function (this: AgeloWorld, current: string, next: string) {
    await this.page.goto(AgeloWorld.frontendUrl + '/settings/security');
    await this.page.fill('input[name=cur]', current);
    await this.page.fill('input[name=next]', next);
    // Confirmation field (added 2026-04-28).
    const confirmField = this.page.locator('input[name=confirm]');
    if (await confirmField.count()) await confirmField.fill(next);
    await this.page.getByRole('button', { name: /update password/i }).click();
  },
);

Then(
  'I see a password error mentioning the strength rules',
  async function (this: AgeloWorld) {
    // ng-zorro alert renders within app-settings-security.
    await expect(
      this.page.locator('app-settings-security .ant-alert-error').first(),
    ).toContainText(/password|character|number/i);
  },
);

Then('I see a password success message', async function (this: AgeloWorld) {
  // ng-zorro message renders at .ant-message-notice.
  await expect(this.page.locator('.ant-message-notice').first()).toContainText(/updated/i);
});

Then(
  'I can sign out and sign back in with the new password',
  async function (this: AgeloWorld) {
    const res = await this.api.post<{ token: string; user: any }>('/auth/login', {
      email: 'architect@agelo.local',
      password: 'Architect#2',
    });
    if (!res.token) throw new Error('login with new password did not return a token');
  },
);

Then(
  'I restore the password back to {string}',
  async function (this: AgeloWorld, password: string) {
    const res = await this.api.post<{ token: string }>('/auth/login', {
      email: 'architect@agelo.local',
      password: 'Architect#2',
    });
    await this.api.post(
      '/settings/password',
      { currentPassword: 'Architect#2', newPassword: password },
      { token: res.token },
    );
  },
);

Given('there is at least one organization', async function (this: AgeloWorld) {
  await loginAsSa(this);
  const list = await this.api.get<any[]>('/organizations', { token: this.authToken! });
  if (!list.length) {
    await this.api.post(
      '/organizations',
      { title: 'Settings Org', color: '#0C66E4' },
      { token: this.authToken! },
    );
  }
});

When(
  'I create an API key named {string} for the first organization',
  async function (this: AgeloWorld, name: string) {
    const orgs = await this.api.get<any[]>('/organizations', { token: this.authToken! });
    const orgId = orgs[0].id;
    this.vars['orgId'] = orgId;

    await this.page.goto(AgeloWorld.frontendUrl + '/settings/api-keys');
    await expect(this.page.getByRole('button', { name: /new key/i })).toBeVisible();

    await this.page.getByRole('button', { name: /new key/i }).click();

    // ng-zorro modal — wait for ant-modal-content to appear.
    const modal = this.page.locator('.ant-modal-content').last();
    await expect(modal).toBeVisible();
    await modal.locator('input[name=name]').fill(name);

    // Open the org select inside the modal. The dialog also has an
    // "Expires" select, so target the org one by name to stay unambiguous.
    await modal.locator('nz-select[name="orgId"]').click();
    await this.page.locator('.ant-select-item-option').filter({ hasText: orgs[0].title }).first().click();

    // Click the modal's primary OK button to generate.
    await modal.locator('.ant-modal-footer .ant-btn-primary').click();
    this.vars['keyName'] = name;
  },
);

Then('a raw API key is shown to me exactly once', async function (this: AgeloWorld) {
  // The reveal is rendered by ApiKeyRevealComponent — wrapper class app-key-reveal-modal.
  const reveal = this.page.locator('.app-key-reveal-modal .ant-modal-content').last();
  await expect(reveal).toBeVisible();
  await expect(reveal).toContainText(/ag_ak_/);
  // Dismiss with the "I've saved it" button (the Copy button is also primary).
  await reveal.getByRole('button', { name: /saved it/i }).click();
});

Then('the key appears in the API keys list as active', async function (this: AgeloWorld) {
  const row = this.page.locator('tr').filter({ hasText: this.vars['keyName'] });
  await expect(row).toContainText(/active/i);
});

When('I disable that API key', async function (this: AgeloWorld) {
  const row = this.page.locator('tr').filter({ hasText: this.vars['keyName'] });
  // The disable button has aria-label="Disable key".
  await row.locator('button[aria-label="Disable key"]').first().click();
});

Then('the key is shown as disabled', async function (this: AgeloWorld) {
  const row = this.page.locator('tr').filter({ hasText: this.vars['keyName'] });
  await expect(row).toContainText(/disabled/i);
});

When('I revoke that API key', async function (this: AgeloWorld) {
  const row = this.page.locator('tr').filter({ hasText: this.vars['keyName'] });
  await this.page.mouse.move(0, 0); // clear hover tooltips
  await row.locator('button[aria-label="Revoke key"]').first().click({ force: true });
  // Confirm dialog
  await this.page.locator('.app-confirm-modal .confirm-btn').click();
});

Then('the key no longer appears in the list', async function (this: AgeloWorld) {
  await expect(
    this.page.locator('tr').filter({ hasText: this.vars['keyName'] }),
  ).toHaveCount(0);
});
