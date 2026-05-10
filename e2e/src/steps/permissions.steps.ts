import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { AgeloWorld } from '../world';

When('I open the roles and permissions page', async function (this: AgeloWorld) {
  await this.page.goto(AgeloWorld.frontendUrl + '/permissions');
  await expect(
    this.page.getByRole('heading', { name: /Roles.*Permissions/ }),
  ).toBeVisible();
});

Then('I see the permission {string}', async function (this: AgeloWorld, key: string) {
  await expect(this.page.locator('.perm-row').filter({ hasText: key })).toBeVisible();
});

async function togglePermission(world: AgeloWorld, key: string, granted: boolean) {
  const row = world.page.locator('.perm-row').filter({ hasText: key });
  // ng-zorro switch is rendered as <button class="ant-switch ant-switch-checked">
  const sw = row.locator('button.ant-switch');
  const cls = (await sw.getAttribute('class')) ?? '';
  const currently = cls.includes('ant-switch-checked');
  if (currently === granted) return;
  const wait = world.page.waitForResponse(
    (r) => r.url().includes('/permissions/') && r.request().method() === 'PATCH',
  );
  await sw.click();
  await wait;
}

When('I revoke the permission {string}', async function (this: AgeloWorld, key: string) {
  await togglePermission(this, key, false);
});

When('I grant the permission {string}', async function (this: AgeloWorld, key: string) {
  await togglePermission(this, key, true);
});

Then(
  'the API reports {string} as not granted to the agent role',
  async function (this: AgeloWorld, key: string) {
    const list = await this.api.get<any[]>('/permissions', { token: this.authToken! });
    const p = list.find((x) => x.key === key)!;
    if (p.granted !== false) throw new Error(`expected ${key} revoked`);
  },
);

Then(
  'the API reports {string} as granted to the agent role',
  async function (this: AgeloWorld, key: string) {
    const list = await this.api.get<any[]>('/permissions', { token: this.authToken! });
    const p = list.find((x) => x.key === key)!;
    if (p.granted !== true) throw new Error(`expected ${key} granted`);
  },
);
