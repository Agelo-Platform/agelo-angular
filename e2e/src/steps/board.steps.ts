import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { AgeloWorld } from '../world';

function activeOrgId(world: AgeloWorld): string {
  return world.vars['org']?.id ?? '';
}

async function ensureFlow(world: AgeloWorld) {
  const orgId = activeOrgId(world);
  const token = world.authToken!;
  let flow = await world.api.get(`/organizations/${orgId}/board-flow`, { token });

  for (const name of ['Feature', 'Task']) {
    if (!flow.cardTypes.find((t: any) => t.name === name)) {
      await world.api.post(
        `/organizations/${orgId}/card-types`, { name }, { token },
      );
    }
  }
  const cols = ['TODO', 'In Progress', 'Review', 'Done'];
  flow = await world.api.get(`/organizations/${orgId}/board-flow`, { token });
  let order = 0;
  for (const name of cols) {
    if (!flow.columns.find((c: any) => c.name === name)) {
      await world.api.post(
        `/organizations/${orgId}/columns`, { name, order }, { token },
      );
    }
    order++;
  }
  flow = await world.api.get(`/organizations/${orgId}/board-flow`, { token });
  const idOf = (n: string) => flow.columns.find((c: any) => c.name === n)!.id;
  const pairs: [string, string][] = [
    ['TODO', 'In Progress'],
    ['In Progress', 'Review'],
    ['Review', 'Done'],
  ];
  for (const [f, t] of pairs) {
    if (
      !flow.transitions.find(
        (x: any) => x.fromColumnId === idOf(f) && x.toColumnId === idOf(t),
      )
    ) {
      await world.api.post(
        `/organizations/${orgId}/transitions`,
        { fromColumnId: idOf(f), toColumnId: idOf(t) },
        { token },
      );
    }
  }
  return await world.api.get(`/organizations/${orgId}/board-flow`, { token });
}

Given(
  'a default board flow is provisioned for that organization',
  async function (this: AgeloWorld) {
    this.vars['flow'] = await ensureFlow(this);
  },
);

Given(
  'a default board flow is provisioned for {string}',
  async function (this: AgeloWorld, _orgTitle: string) {
    this.vars['flow'] = await ensureFlow(this);
  },
);

When('I open the board page', async function (this: AgeloWorld) {
  const orgId = activeOrgId(this);
  await this.page.goto(`${AgeloWorld.frontendUrl}/org/${orgId}/board`);
  await expect(this.page.getByRole('heading', { name: 'Board' })).toBeVisible();
});

When(
  'I create a card titled {string} of type {string} in column {string}',
  async function (this: AgeloWorld, title: string, typeName: string, columnName: string) {
    const orgId = activeOrgId(this);
    const flow = await this.api.get(`/organizations/${orgId}/board-flow`, {
      token: this.authToken!,
    });
    const typeId = flow.cardTypes.find((t: any) => t.name === typeName)!.id;
    const columnId = flow.columns.find((c: any) => c.name === columnName)!.id;

    await this.api.post(
      `/organizations/${orgId}/cards`,
      { title, typeId, columnId },
      { token: this.authToken! },
    );
    await this.page.reload();
    this.vars['lastCardTitle'] = title;
  },
);

Then('the card appears in the {string} column', async function (this: AgeloWorld, columnName: string) {
  const lane = this.page.locator('.kanban-lane', {
    has: this.page.locator('.kanban-lane-head').filter({ hasText: columnName }),
  });
  await expect(lane).toBeVisible();
  await expect(lane.locator('.kanban-card').filter({ hasText: this.vars['lastCardTitle'] }))
    .toBeVisible();
});

When('I open that card', async function (this: AgeloWorld) {
  const title = this.vars['lastCardTitle'];
  const card = title
    ? this.page.locator('.kanban-card').filter({ hasText: title }).first()
    : this.page.locator('.kanban-card').first();
  await card.click();
  // ng-zorro modal renders as .ant-modal
  await expect(this.page.locator('.ant-modal-content').last()).toBeVisible();
});

When('I transition it to {string}', async function (this: AgeloWorld, columnName: string) {
  const modal = this.page.locator('.ant-modal-content').last();
  // Open the rail status select.
  await modal.locator('.rail-select').click();
  // Wait for the PATCH /cards/:id/status to actually complete before
  // reloading — the SPA fires the request from ngModelChange and the
  // page reload would otherwise race ahead of it on a fast machine.
  const patched = this.page.waitForResponse(
    (res) => /\/cards\/[^/]+\/status$/.test(res.url()) && res.request().method() === 'PATCH',
    { timeout: 15_000 },
  );
  await this.page.locator('.ant-select-item-option').filter({ hasText: columnName }).first().click();
  await patched;
  // Close the dialog so the next "card appears in column X" can re-check the board.
  await this.page.keyboard.press('Escape');
  await this.page.reload();
});

Given(
  'a card {string} of type {string} exists in column {string}',
  async function (this: AgeloWorld, title: string, typeName: string, columnName: string) {
    const orgId = activeOrgId(this);
    const flow = await this.api.get(`/organizations/${orgId}/board-flow`, {
      token: this.authToken!,
    });
    const typeId = flow.cardTypes.find((t: any) => t.name === typeName)!.id;
    const columnId = flow.columns.find((c: any) => c.name === columnName)!.id;
    await this.api.post(
      `/organizations/${orgId}/cards`,
      { title, typeId, columnId },
      { token: this.authToken! },
    );
    this.vars['lastCardTitle'] = title;
    await this.page.goto(`${AgeloWorld.frontendUrl}/org/${orgId}/board`);
    await expect(this.page.getByRole('heading', { name: 'Board' })).toBeVisible();
    await expect(this.page.locator('.kanban-card').filter({ hasText: title })).toBeVisible();
  },
);

When('I attempt to transition it directly to {string}', async function (this: AgeloWorld, columnName: string) {
  const orgId = activeOrgId(this);
  const flow = await this.api.get(`/organizations/${orgId}/board-flow`, {
    token: this.authToken!,
  });
  const target = flow.columns.find((c: any) => c.name === columnName)!.id;
  const cards = await this.api.get(`/organizations/${orgId}/cards`, {
    token: this.authToken!,
  });
  const card = cards.find((c: any) => c.title === this.vars['lastCardTitle']);
  this.vars['lastCardId'] = card.id;
  this.vars['rejection'] = null;
  try {
    await this.api.patch(
      `/cards/${card.id}/status`, { toColumnId: target }, { token: this.authToken! },
    );
  } catch (err: any) {
    this.vars['rejection'] = err.message;
  }
});

Then('the transition is rejected with an error', async function (this: AgeloWorld) {
  if (!this.vars['rejection']) throw new Error('expected the transition to be rejected');
});

Then('the card is still in column {string}', async function (this: AgeloWorld, columnName: string) {
  const card = await this.api.get(`/cards/${this.vars['lastCardId']}`, {
    token: this.authToken!,
  });
  if (card.column.name !== columnName) {
    throw new Error(`card moved to ${card.column.name}; expected ${columnName}`);
  }
});

Given(
  'a card type {string} has a custom field {string} of type {string}',
  async function (this: AgeloWorld, typeName: string, fieldName: string, fieldType: string) {
    const orgId = activeOrgId(this);
    const flow = await this.api.get(`/organizations/${orgId}/board-flow`, {
      token: this.authToken!,
    });
    const t = flow.cardTypes.find((x: any) => x.name === typeName)!;
    if (!t.customFields.find((f: any) => f.name === fieldName)) {
      await this.api.post(
        `/organizations/${orgId}/card-types/${t.id}/fields`,
        { name: fieldName, label: fieldName, type: fieldType, order: t.customFields.length },
        { token: this.authToken! },
      );
    }
  },
);

When(
  'I set the field {string} to {string}',
  async function (this: AgeloWorld, fieldName: string, value: string) {
    const orgId = activeOrgId(this);
    const cards = await this.api.get(`/organizations/${orgId}/cards`, {
      token: this.authToken!,
    });
    const card = cards.find((c: any) => c.title === this.vars['lastCardTitle']);
    const flow = await this.api.get(`/organizations/${orgId}/board-flow`, {
      token: this.authToken!,
    });
    const t = flow.cardTypes.find((x: any) => x.id === card.typeId);
    const field = t.customFields.find((f: any) => f.name === fieldName);
    await this.api.patch(
      `/cards/${card.id}`,
      { fieldValues: [{ fieldId: field.id, value }] },
      { token: this.authToken! },
    );
    this.vars['lastCardId'] = card.id;
  },
);

When('I close and reopen the card', async function (this: AgeloWorld) {});

Then(
  'the field {string} shows {string}',
  async function (this: AgeloWorld, fieldName: string, expected: string) {
    const card = await this.api.get(`/cards/${this.vars['lastCardId']}`, {
      token: this.authToken!,
    });
    const field = card.type.customFields.find((f: any) => f.name === fieldName);
    const fv = card.fieldValues.find((v: any) => v.fieldId === field.id);
    if (fv?.value !== expected) {
      throw new Error(`expected ${expected}, got ${fv?.value}`);
    }
  },
);

When('I post the comment {string}', async function (this: AgeloWorld, content: string) {
  const orgId = activeOrgId(this);
  const cards = await this.api.get(`/organizations/${orgId}/cards`, {
    token: this.authToken!,
  });
  const card = cards.find((c: any) => c.title === this.vars['lastCardTitle']);
  const cm = await this.api.post(
    `/cards/${card.id}/comments`, { content }, { token: this.authToken! },
  );
  this.vars['lastCardId'] = card.id;
  this.vars['lastCommentId'] = cm.id;
});

When('I reply to that comment with {string}', async function (this: AgeloWorld, content: string) {
  await this.api.post(
    `/cards/${this.vars['lastCardId']}/comments/${this.vars['lastCommentId']}/replies`,
    { content }, { token: this.authToken! },
  );
});

Then('the card shows the comment with one reply', async function (this: AgeloWorld) {
  const res = await this.api.get(`/cards/${this.vars['lastCardId']}/comments`, {
    token: this.authToken!,
  });
  const top = res.items.find((i: any) => i.id === this.vars['lastCommentId']);
  if (!top || !top.replies || top.replies.length !== 1) {
    throw new Error(`expected one reply, got ${top?.replies?.length ?? 0}`);
  }
});
