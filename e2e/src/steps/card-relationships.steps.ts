import { Given, When, Then } from '@cucumber/cucumber';
import { AgeloWorld } from '../world';

// Module #4 (relationships + history + restore) — covers
// /api/v1/organizations/:orgId/relationships create, GET
// /cards/:id/history rows, and DELETE /cards/:id?mode=archive →
// POST /cards/:id/restore round-trip.

function activeOrgId(world: AgeloWorld): string {
  return world.vars['org']?.id ?? '';
}

async function getFlow(world: AgeloWorld) {
  return world.api.get(`/organizations/${activeOrgId(world)}/board-flow`, {
    token: world.authToken!,
  });
}

Given(
  'a card type {string} exists in the active organization',
  async function (this: AgeloWorld, name: string) {
    const orgId = activeOrgId(this);
    const flow = await getFlow(this);
    if (!flow.cardTypes.find((t: any) => t.name === name)) {
      await this.api.post(
        `/organizations/${orgId}/card-types`,
        { name },
        { token: this.authToken! },
      );
    }
  },
);

Given(
  'a parent-child relationship from {string} to {string} is registered',
  async function (this: AgeloWorld, parentName: string, childName: string) {
    const orgId = activeOrgId(this);
    const flow = await getFlow(this);
    const parent = flow.cardTypes.find((t: any) => t.name === parentName);
    const child = flow.cardTypes.find((t: any) => t.name === childName);
    if (!parent || !child) {
      throw new Error(`missing card type(s): parent=${!!parent}, child=${!!child}`);
    }
    // The handler is idempotent — calling it twice with the same pair
    // either re-points the row at the project or returns the existing
    // one; either way the relationship exists afterward.
    await this.api.post(
      `/organizations/${orgId}/relationships`,
      { parentTypeId: parent.id, childTypeId: child.id },
      { token: this.authToken! },
    );
  },
);

When(
  'I create a child card {string} of type {string} with that {string} card as parent',
  async function (
    this: AgeloWorld,
    childTitle: string,
    childType: string,
    parentType: string,
  ) {
    const orgId = activeOrgId(this);
    const flow = await getFlow(this);
    const cards = await this.api.get(`/organizations/${orgId}/cards`, {
      token: this.authToken!,
    });
    const parentTypeRow = flow.cardTypes.find((t: any) => t.name === parentType);
    const parent = cards.find((c: any) => c.typeId === parentTypeRow.id);
    if (!parent) throw new Error(`no card of type ${parentType} to use as parent`);

    const childTypeRow = flow.cardTypes.find((t: any) => t.name === childType);
    const todo = flow.columns.find((c: any) => c.name === 'TODO');
    this.vars['childCardRaw'] = await this.api.postRaw(
      `/organizations/${orgId}/cards`,
      {
        title: childTitle,
        typeId: childTypeRow.id,
        columnId: todo.id,
        parentId: parent.id,
      },
      { token: this.authToken! },
    );
  },
);

Then('the child card is created successfully', async function (this: AgeloWorld) {
  const r = this.vars['childCardRaw'];
  if (!r || !r.ok) {
    throw new Error(`expected success, got ${r?.status}: ${r?.text}`);
  }
});

When(
  'I attempt to create a child card {string} of type {string} with a {string} card as parent',
  async function (
    this: AgeloWorld,
    childTitle: string,
    childType: string,
    parentType: string,
  ) {
    const orgId = activeOrgId(this);
    const flow = await getFlow(this);
    const cards = await this.api.get(`/organizations/${orgId}/cards`, {
      token: this.authToken!,
    });
    const parentTypeRow = flow.cardTypes.find((t: any) => t.name === parentType);
    // Pick *any* card of that type (we just need a parent that has the
    // wrong type so the relationship lookup fails).
    const parent = cards.find(
      (c: any) => c.typeId === parentTypeRow.id && !c.archivedAt,
    );
    if (!parent) throw new Error(`no card of type ${parentType} to use as parent`);
    const childTypeRow = flow.cardTypes.find((t: any) => t.name === childType);
    const todo = flow.columns.find((c: any) => c.name === 'TODO');
    this.vars['childCardRaw'] = await this.api.postRaw(
      `/organizations/${orgId}/cards`,
      {
        title: childTitle,
        typeId: childTypeRow.id,
        columnId: todo.id,
        parentId: parent.id,
      },
      { token: this.authToken! },
    );
  },
);

Then(
  'the child card creation fails with status {int}',
  async function (this: AgeloWorld, expected: number) {
    const r = this.vars['childCardRaw'];
    if (!r) throw new Error('no card-create response captured');
    if (r.status !== expected) {
      throw new Error(`expected ${expected}, got ${r.status}: ${r.text}`);
    }
  },
);

Given(
  'an approved agent {string} titled {string} is registered to {string}',
  async function (
    this: AgeloWorld,
    agentId: string,
    agentTitle: string,
    teamName: string,
  ) {
    const orgId = activeOrgId(this);
    const teams = await this.api.get<any[]>(
      `/organizations/${orgId}/teams`,
      { token: this.authToken! },
    );
    const team = teams.find((t) => t.name === teamName);
    if (!team) throw new Error(`team ${teamName} missing pre-register`);
    const list = await this.api.get<any[]>(`/organizations/${orgId}/agents`, {
      token: this.authToken!,
    });
    const existing = list.find((a) => a.id === agentId);
    if (!existing) {
      await this.api.post(
        `/teams/${team.id}/agents/register`,
        {
          id: agentId, title: agentTitle,
          machineIp: '127.0.0.1', machineName: 'history-host',
          llmVersion: 'claude-sonnet-4-6', email: 'history@example.com',
        },
        { apiKey: this.vars['apiKey'] },
      );
      await this.api.patch(
        `/agents/${agentId}/approve`,
        {},
        { token: this.authToken! },
      );
    } else if (existing.status !== 'approved') {
      await this.api.patch(
        `/agents/${agentId}/approve`,
        {},
        { token: this.authToken! },
      );
    }
    this.vars['agentId'] = agentId;
  },
);

When(
  'I patch the card title to {string}',
  async function (this: AgeloWorld, newTitle: string) {
    const orgId = activeOrgId(this);
    const cards = await this.api.get<any[]>(
      `/organizations/${orgId}/cards`,
      { token: this.authToken! },
    );
    const card = cards.find((c) => c.title === this.vars['lastCardTitle']);
    if (!card) throw new Error(`card '${this.vars['lastCardTitle']}' missing`);
    await this.api.patch(
      `/cards/${card.id}`,
      { title: newTitle },
      { token: this.authToken! },
    );
    this.vars['lastCardId'] = card.id;
    this.vars['lastCardTitle'] = newTitle;
  },
);

When(
  'I patch the card\'s assigned agent to {string}',
  async function (this: AgeloWorld, agentId: string) {
    const cardId = this.vars['lastCardId'];
    if (!cardId) throw new Error('no lastCardId set before assigned-agent patch');
    await this.api.patch(
      `/cards/${cardId}`,
      { assignedAgentId: agentId },
      { token: this.authToken! },
    );
  },
);

Then(
  'the card history has at least {int} rows',
  async function (this: AgeloWorld, expected: number) {
    const cardId = this.vars['lastCardId'];
    const history = await this.api.get<any[]>(`/cards/${cardId}/history`, {
      token: this.authToken!,
    });
    if (history.length < expected) {
      throw new Error(`expected ≥${expected} history rows, got ${history.length}`);
    }
    this.vars['cardHistory'] = history;
  },
);

async function assertHistoryHasField(world: AgeloWorld, fieldName: string) {
  const history = world.vars['cardHistory'];
  if (!history.find((h: any) => h.field === fieldName)) {
    const seen = history.map((h: any) => h.field).join(', ');
    throw new Error(`history missing field '${fieldName}'; saw: ${seen}`);
  }
  // Each row should also carry a non-empty userLabel + fieldLabel —
  // the .NET handler resolves the email of the SA actor for the
  // userLabel and a humanized field label for fieldLabel.
  const row = history.find((h: any) => h.field === fieldName);
  if (!row.userLabel || typeof row.userLabel !== 'string') {
    throw new Error(`history row '${fieldName}' missing userLabel`);
  }
  if (!row.fieldLabel || typeof row.fieldLabel !== 'string') {
    throw new Error(`history row '${fieldName}' missing fieldLabel`);
  }
}

Then(
  'the card history records a {string} change',
  async function (this: AgeloWorld, fieldName: string) {
    await assertHistoryHasField(this, fieldName);
  },
);

Then(
  'the card history records an {string} change',
  async function (this: AgeloWorld, fieldName: string) {
    // English-grammar variant — same assertion as the "a" form, but
    // Cucumber treats different leading words as different patterns so
    // we need the duplicate definition.
    await assertHistoryHasField(this, fieldName);
  },
);

When('I archive that card', async function (this: AgeloWorld) {
  const orgId = activeOrgId(this);
  const cards = await this.api.get<any[]>(
    `/organizations/${orgId}/cards`,
    { token: this.authToken! },
  );
  const card = cards.find((c) => c.title === this.vars['lastCardTitle']);
  if (!card) throw new Error(`card '${this.vars['lastCardTitle']}' missing`);
  await this.api.delete(`/cards/${card.id}?mode=archive`, {
    token: this.authToken!,
  });
  this.vars['lastCardId'] = card.id;
});

Then(
  'that card is no longer listed in the org cards feed',
  async function (this: AgeloWorld) {
    const orgId = activeOrgId(this);
    const cards = await this.api.get<any[]>(
      `/organizations/${orgId}/cards`,
      { token: this.authToken! },
    );
    if (cards.find((c) => c.id === this.vars['lastCardId'])) {
      throw new Error('archived card still in active feed');
    }
  },
);

When('I restore that archived card', async function (this: AgeloWorld) {
  await this.api.post(
    `/cards/${this.vars['lastCardId']}/restore`,
    {},
    { token: this.authToken! },
  );
});

Then(
  'that card is listed in the org cards feed',
  async function (this: AgeloWorld) {
    const orgId = activeOrgId(this);
    const cards = await this.api.get<any[]>(
      `/organizations/${orgId}/cards`,
      { token: this.authToken! },
    );
    if (!cards.find((c) => c.id === this.vars['lastCardId'])) {
      throw new Error('restored card not back in active feed');
    }
  },
);
