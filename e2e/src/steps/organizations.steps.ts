import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { AgeloWorld } from '../world';

When('I open the organizations page', async function (this: AgeloWorld) {
  await this.page.goto(AgeloWorld.frontendUrl + '/organizations');
  await expect(this.page.getByRole('heading', { name: 'Organizations', exact: true })).toBeVisible();
});

When(
  'I create an organization titled {string} with color {string}',
  async function (this: AgeloWorld, title: string, color: string) {
    await this.page.getByRole('button', { name: /new organization/i }).click();
    const modal = this.page.locator('.ant-modal-content').last();
    await expect(modal).toBeVisible();
    await modal.locator('input[name=title]').fill(title);
    await modal.locator('input[name=color]').evaluate(
      (el: HTMLInputElement, c) => { el.value = c; el.dispatchEvent(new Event('input', { bubbles: true })); },
      color,
    );
    await modal.locator('.ant-modal-footer .ant-btn-primary').click();
    await expect(this.page.locator('.org-card').filter({ hasText: title })).toBeVisible();
  },
);

Then('{string} appears in the organizations list', async function (this: AgeloWorld, title: string) {
  await expect(this.page.locator('.org-card').filter({ hasText: title })).toBeVisible();
});

When('I rename {string} to {string}', async function (this: AgeloWorld, from: string, to: string) {
  // Use API for determinism.
  const list = await this.api.get<any[]>('/organizations', { token: this.authToken! });
  const o = list.find((x) => x.title === from)!;
  await this.api.patch(`/organizations/${o.id}`, { title: to }, { token: this.authToken! });
  await this.page.reload();
  await expect(this.page.locator('.org-card').filter({ hasText: to })).toBeVisible();
});

When('I delete the organization {string}', async function (this: AgeloWorld, title: string) {
  const card = this.page.locator('.org-card').filter({ hasText: title });
  await card.locator('.more').click();
  // Click "Delete" in the dropdown menu.
  await this.page.locator('.ant-dropdown-menu-item').filter({ hasText: /delete/i }).click();
  // Archive-or-permanent prompt — choose permanent so the org disappears
  // from the live list (matches the legacy "delete" semantics).
  await this.page.locator('.app-archive-modal .permanent-btn').click();
  await expect(this.page.locator('.org-card').filter({ hasText: title })).toHaveCount(0);
});

Then('{string} is no longer in the organizations list', async function (this: AgeloWorld, title: string) {
  await expect(this.page.locator('.org-card').filter({ hasText: title })).toHaveCount(0);
});

Given('an organization {string} exists', async function (this: AgeloWorld, title: string) {
  if (!this.authToken) throw new Error('not signed in');
  const list = await this.api.get<any[]>('/organizations', { token: this.authToken });
  if (!list.find((o) => o.title === title)) {
    await this.api.post(
      '/organizations',
      { title, color: '#0C66E4' },
      { token: this.authToken },
    );
  }
});

Given(
  'an organization {string} exists and is active',
  async function (this: AgeloWorld, title: string) {
    if (!this.authToken) throw new Error('not signed in');
    let list = await this.api.get<any[]>('/organizations', { token: this.authToken });
    let org = list.find((o) => o.title === title);
    if (!org) {
      org = await this.api.post(
        '/organizations',
        { title, color: '#0C66E4' },
        { token: this.authToken },
      );
    }
    this.vars['org'] = org;
    await this.page.goto(AgeloWorld.frontendUrl + '/organizations');
    await this.page.evaluate((id) => {
      localStorage.setItem('agelo.activeOrgId', id);
    }, org!.id);
  },
);

When(
  'I try to create another organization titled {string}',
  async function (this: AgeloWorld, title: string) {
    await this.page.goto(AgeloWorld.frontendUrl + '/organizations');
    await this.page.getByRole('button', { name: /new organization/i }).click();
    const modal = this.page.locator('.ant-modal-content').last();
    await modal.locator('input[name=title]').fill(title);
    await modal.locator('.ant-modal-footer .ant-btn-primary').click();
  },
);

Then('I see an organization creation error', async function (this: AgeloWorld) {
  const list = await this.api.get<any[]>('/organizations', { token: this.authToken! });
  const matches = list.filter((o) => o.title === 'Globex');
  if (matches.length !== 1) {
    throw new Error(`expected exactly one Globex, found ${matches.length}`);
  }
});
