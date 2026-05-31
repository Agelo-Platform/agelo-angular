import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { AgeloWorld } from '../world';

function activeOrgId(world: AgeloWorld): string {
  return world.vars['org']?.id ?? '';
}

Given(
  'the active organization has {int} cards distributed across columns',
  async function (this: AgeloWorld, count: number) {
    const orgId = activeOrgId(this);
    const flow = await this.api.get(`/organizations/${orgId}/board-flow`, {
      token: this.authToken!,
    });
    const taskType = flow.cardTypes.find((t: any) => t.name === 'Task');
    const cols = [...flow.columns].sort((a: any, b: any) => a.order - b.order);
    for (let i = 0; i < count; i++) {
      await this.api.post(
        `/organizations/${orgId}/cards`,
        {
          title: `Analytics card ${i + 1}`,
          typeId: taskType.id,
          columnId: cols[i % cols.length].id,
        },
        { token: this.authToken! },
      );
    }
  },
);

When('I open the home page', async function (this: AgeloWorld) {
  const orgId = activeOrgId(this);
  await this.page.goto(`${AgeloWorld.frontendUrl}/org/${orgId}/home`);
  await expect(this.page.getByRole('heading', { name: 'Home' })).toBeVisible();
});

Then('the total card count shown is {int}', async function (this: AgeloWorld, n: number) {
  // ng-zorro statistic renders the value under .ant-statistic-content-value.
  await expect(
    this.page.locator('.stat-card .ant-statistic-content-value').first(),
  ).toContainText(String(n));
});

Then('the per-column breakdown is rendered as bars', async function (this: AgeloWorld) {
  await expect(this.page.locator('.bar-row').first()).toBeVisible();
});

Then('the team count and agent count are shown', async function (this: AgeloWorld) {
  await expect(this.page.locator('.stat-card').filter({ hasText: 'Teams' })).toBeVisible();
  await expect(this.page.locator('.stat-card').filter({ hasText: 'Agents' })).toBeVisible();
});
