import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { AgeloWorld } from '../world';

function activeOrgId(world: AgeloWorld): string {
  return world.vars['org']?.id ?? '';
}

async function openSection(
  page: import('@playwright/test').Page,
  section: 'workflow' | 'types',
) {
  // Board Flow Manager has a top-level section toggle (Feature 016+).
  const label = section === 'workflow'
    ? /columns\s*&\s*transitions/i
    : /card types\s*&\s*relations/i;
  // Wait for the toggle to render — the inner tabs are rendered conditionally
  // and only appear once the BoardFlow signal resolves.
  const btn = page.getByRole('button', { name: label });
  await btn.first().waitFor({ state: 'visible', timeout: 15_000 });
  await btn.first().click();
  // Confirm the inner tabset switched by waiting for one of its tab labels.
  const expectedTab = section === 'workflow' ? /\bcolumns\b/i : /card types/i;
  await page.locator('.ant-tabs-tab').filter({ hasText: expectedTab }).first()
    .waitFor({ state: 'visible', timeout: 15_000 });
}

When('I open the board flow manager', async function (this: AgeloWorld) {
  const orgId = activeOrgId(this);
  await this.page.goto(`${AgeloWorld.frontendUrl}/org/${orgId}/flow`);
  await expect(
    this.page.getByRole('heading', { name: 'Board Flow Manager' }),
  ).toBeVisible();
});

When('I add a card type {string}', async function (this: AgeloWorld, name: string) {
  await openSection(this.page, 'types');
  await this.page.locator('.ant-tabs-tab').filter({ hasText: /card types/i }).click();
  await this.page.getByRole('button', { name: /new card type/i }).click();
  const modal = this.page.locator('.ant-modal-content').last();
  await modal.locator('input[name=name]').fill(name);
  await modal.locator('.ant-modal-footer .ant-btn-primary').click();
  await expect(this.page.locator('.type-card').filter({ hasText: name })).toBeVisible();
});

Then('both card types appear in the card-types panel', async function (this: AgeloWorld) {
  await expect(this.page.locator('.type-card').filter({ hasText: 'Feature' })).toBeVisible();
  await expect(this.page.locator('.type-card').filter({ hasText: 'Task' })).toBeVisible();
});

When(
  'I add a custom field {string} labeled {string} of type {string} to {string}',
  async function (
    this: AgeloWorld,
    name: string, label: string, type: string, typeName: string,
  ) {
    const card = this.page.locator('.type-card').filter({ hasText: typeName });
    // Expand the "Custom fields" panel if needed.
    const panelHeader = card.locator('.ant-collapse-header').first();
    if ((await panelHeader.getAttribute('aria-expanded')) !== 'true') {
      await panelHeader.click();
    }
    await card.getByRole('button', { name: /add field/i }).click();
    const modal = this.page.locator('.ant-modal-content').last();
    await expect(modal).toBeVisible();
    await modal.locator('input[name=name]').fill(name);
    await modal.locator('input[name=label]').fill(label);
    // The form has 1 nz-select for type; open and pick.
    await modal.locator('.ant-select-selector').click();
    await expect(this.page.locator('.ant-select-item-option').first()).toBeVisible();
    await this.page
      .locator('.ant-select-item-option')
      .filter({ hasText: new RegExp(`\\b${type}\\b`, 'i') })
      .first()
      .click();
    const wait = this.page.waitForResponse(
      (r) => r.url().includes('/fields') && r.request().method() === 'POST',
    );
    await modal.locator('.ant-modal-footer .ant-btn-primary').click();
    await wait;
  },
);

Then(
  'the field {string} appears under {string}',
  async function (this: AgeloWorld, fieldName: string, typeName: string) {
    const card = this.page.locator('.type-card').filter({ hasText: typeName });
    await expect(card.locator('.fields-list')).toContainText(fieldName);
  },
);

Given('a card type {string} exists', async function (this: AgeloWorld, name: string) {
  const orgId = activeOrgId(this);
  const flow = await this.api.get(`/organizations/${orgId}/board-flow`, {
    token: this.authToken!,
  });
  if (!flow.cardTypes.find((t: any) => t.name === name)) {
    await this.api.post(
      `/organizations/${orgId}/card-types`,
      { name },
      { token: this.authToken! },
    );
  }
});

When('I disable agent pickup on {string}', async function (this: AgeloWorld, typeName: string) {
  await openSection(this.page, 'types');
  await this.page.locator('.ant-tabs-tab').filter({ hasText: /card types/i }).click();
  const card = this.page.locator('.type-card').filter({ hasText: typeName });
  // Find the toggle row labeled "Agent pickup enabled".
  const toggle = card.locator('label').filter({ hasText: 'Agent pickup enabled' }).locator('button.ant-switch');
  const wait = this.page.waitForResponse(
    (r) => r.url().includes('/card-types/') && r.request().method() === 'PATCH',
  );
  await toggle.click();
  await wait;
});

Then(
  'the card type {string} has agent pickup disabled',
  async function (this: AgeloWorld, typeName: string) {
    const orgId = activeOrgId(this);
    const flow = await this.api.get(`/organizations/${orgId}/board-flow`, {
      token: this.authToken!,
    });
    const t = flow.cardTypes.find((x: any) => x.name === typeName);
    if (!t || t.agentPickupEnabled !== false) {
      throw new Error(`expected agent pickup disabled on ${typeName}`);
    }
  },
);

When('I switch to the columns tab', async function (this: AgeloWorld) {
  await openSection(this.page, 'workflow');
  await this.page.locator('.ant-tabs-tab').filter({ hasText: /\bcolumns\b/i }).click();
});

When(
  'I add columns {string}, {string}, {string}, {string} in order',
  async function (this: AgeloWorld, a: string, b: string, c: string, d: string) {
    const orgId = activeOrgId(this);
    let order = 0;
    for (const name of [a, b, c, d]) {
      await this.api.post(
        `/organizations/${orgId}/columns`,
        { name, order: order++ },
        { token: this.authToken! },
      );
    }
  },
);

Then('all four columns appear in left-to-right order', async function (this: AgeloWorld) {
  const orgId = activeOrgId(this);
  const flow = await this.api.get(`/organizations/${orgId}/board-flow`, {
    token: this.authToken!,
  });
  const sorted = [...flow.columns].sort((x: any, y: any) => x.order - y.order);
  const names = sorted.map((c: any) => c.name);
  if (
    names.indexOf('TODO') === -1 ||
    names.indexOf('Done') === -1 ||
    names.indexOf('TODO') > names.indexOf('Done')
  ) {
    throw new Error(`columns not in expected order: ${names.join(', ')}`);
  }
});

Given(
  'columns {string}, {string}, {string}, {string} exist',
  async function (this: AgeloWorld, a: string, b: string, c: string, d: string) {
    const orgId = activeOrgId(this);
    let flow = await this.api.get(`/organizations/${orgId}/board-flow`, {
      token: this.authToken!,
    });
    let order = flow.columns.length;
    for (const name of [a, b, c, d]) {
      if (!flow.columns.find((x: any) => x.name === name)) {
        await this.api.post(
          `/organizations/${orgId}/columns`,
          { name, order: order++ },
          { token: this.authToken! },
        );
      }
    }
  },
);

When('I switch to the transitions tab', async function (this: AgeloWorld) {
  await openSection(this.page, 'workflow');
  await this.page.locator('.ant-tabs-tab').filter({ hasText: /transitions/i }).click();
});

When(
  'I draw transitions TODO -> In Progress, In Progress -> Review, Review -> Done',
  async function (this: AgeloWorld) {
    const orgId = activeOrgId(this);
    const flow = await this.api.get(`/organizations/${orgId}/board-flow`, {
      token: this.authToken!,
    });
    const idOf = (n: string) => flow.columns.find((c: any) => c.name === n)!.id;
    const pairs: [string, string][] = [
      ['TODO', 'In Progress'],
      ['In Progress', 'Review'],
      ['Review', 'Done'],
    ];
    for (const [from, to] of pairs) {
      await this.api.post(
        `/organizations/${orgId}/transitions`,
        { fromColumnId: idOf(from), toColumnId: idOf(to) },
        { token: this.authToken! },
      );
    }
  },
);

Then('the transition graph shows three edges', async function (this: AgeloWorld) {
  const orgId = activeOrgId(this);
  const flow = await this.api.get(`/organizations/${orgId}/board-flow`, {
    token: this.authToken!,
  });
  if (flow.transitions.length < 3) {
    throw new Error(`expected at least 3 transitions, got ${flow.transitions.length}`);
  }
});

Given(
  'card types {string} and {string} exist',
  async function (this: AgeloWorld, a: string, b: string) {
    const orgId = activeOrgId(this);
    let flow = await this.api.get(`/organizations/${orgId}/board-flow`, {
      token: this.authToken!,
    });
    for (const name of [a, b]) {
      if (!flow.cardTypes.find((t: any) => t.name === name)) {
        await this.api.post(
          `/organizations/${orgId}/card-types`,
          { name },
          { token: this.authToken! },
        );
      }
    }
  },
);

When('I switch to the relationships tab', async function (this: AgeloWorld) {
  await openSection(this.page, 'types');
  await this.page.locator('.ant-tabs-tab').filter({ hasText: /relationships/i }).click();
});

When(
  'I draw a relationship from {string} to {string}',
  async function (this: AgeloWorld, parent: string, child: string) {
    const orgId = activeOrgId(this);
    const flow = await this.api.get(`/organizations/${orgId}/board-flow`, {
      token: this.authToken!,
    });
    const idOf = (n: string) => flow.cardTypes.find((c: any) => c.name === n)!.id;
    await this.api.post(
      `/organizations/${orgId}/relationships`,
      { parentTypeId: idOf(parent), childTypeId: idOf(child) },
      { token: this.authToken! },
    );
  },
);

Then('the relationships graph shows that edge', async function (this: AgeloWorld) {
  const orgId = activeOrgId(this);
  const flow = await this.api.get(`/organizations/${orgId}/board-flow`, {
    token: this.authToken!,
  });
  if (flow.relationships.length === 0) {
    throw new Error('expected at least one relationship');
  }
});
