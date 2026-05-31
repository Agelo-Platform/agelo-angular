import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { AgeloWorld } from '../world';

function activeOrgId(world: AgeloWorld): string {
  return world.vars['org']?.id ?? '';
}

When('I open the teams page', async function (this: AgeloWorld) {
  const orgId = activeOrgId(this);
  await this.page.goto(`${AgeloWorld.frontendUrl}/org/${orgId}/teams`);
  await expect(this.page.getByRole('heading', { name: 'Teams', exact: true })).toBeVisible();
});

When('I create a team named {string}', async function (this: AgeloWorld, name: string) {
  await this.page.getByRole('button', { name: /new team/i }).first().click();
  const modal = this.page.locator('.ant-modal-content').last();
  await expect(modal).toBeVisible();
  await modal.locator('input[name=name]').fill(name);
  await modal.locator('.ant-modal-footer .ant-btn-primary').click();
  await expect(this.page.locator('.team-card').filter({ hasText: name })).toBeVisible();
});

Then('{string} appears in the teams list', async function (this: AgeloWorld, name: string) {
  await expect(this.page.locator('.team-card').filter({ hasText: name })).toBeVisible();
});

When('I open the {string} team', async function (this: AgeloWorld, name: string) {
  await this.page.locator('.team-card').filter({ hasText: name }).click();
  await expect(this.page.getByRole('heading', { name: name, exact: true }).first()).toBeVisible();
});

When('I edit the onboarding doc to {string}', async function (this: AgeloWorld, content: string) {
  // Switch to onboarding tab — second tab in the team detail.
  await this.page.locator('.ant-tabs-tab').filter({ hasText: /onboarding/i }).click();
  await this.page.locator('textarea.md-textarea').first().fill(content.replace(/\\n/g, '\n'));
});

When('I save the onboarding doc', async function (this: AgeloWorld) {
  const wait = this.page.waitForResponse(
    (r) => r.url().includes('/onboarding') && r.request().method() === 'PATCH',
  );
  await this.page.getByRole('button', { name: /^save$/i }).click();
  await wait;
});

Then('the live preview shows a heading {string}', async function (this: AgeloWorld, heading: string) {
  await expect(
    this.page.locator('.md-preview h1').filter({ hasText: heading }),
  ).toBeVisible();
});

Then(
  'the onboarding doc fetched from the API equals the saved content',
  async function (this: AgeloWorld) {
    const orgId = activeOrgId(this);
    const teams = await this.api.get(`/organizations/${orgId}/teams`, {
      token: this.authToken!,
    });
    const team = teams[0];
    const draft = await this.page.locator('textarea.md-textarea').first().inputValue();
    if (team.onboardingDoc !== draft) throw new Error('onboarding mismatch');
  },
);

Given(
  'a team {string} exists in the active organization',
  async function (this: AgeloWorld, name: string) {
    const orgId = activeOrgId(this);
    const list = await this.api.get<any[]>(
      `/organizations/${orgId}/teams`,
      { token: this.authToken! },
    );
    if (!list.find((t) => t.name === name)) {
      await this.api.post(
        `/organizations/${orgId}/teams`,
        { name },
        { token: this.authToken! },
      );
    }
  },
);

Given(
  'an API key exists for the active organization',
  async function (this: AgeloWorld) {
    const orgId = activeOrgId(this);
    const created = await this.api.post(
      '/settings/api-keys',
      { name: `e2e-key-${Date.now()}`, orgId },
      { token: this.authToken! },
    );
    this.vars['apiKey'] = created.rawKey;
  },
);

Given(
  'a team {string} exists in {string}',
  async function (this: AgeloWorld, teamName: string, orgTitle: string) {
    const orgs = await this.api.get<any[]>('/organizations', { token: this.authToken! });
    const org = orgs.find((o) => o.title === orgTitle)!;
    const list = await this.api.get<any[]>(
      `/organizations/${org.id}/teams`,
      { token: this.authToken! },
    );
    if (!list.find((t) => t.name === teamName)) {
      await this.api.post(
        `/organizations/${org.id}/teams`,
        { name: teamName },
        { token: this.authToken! },
      );
    }
    this.vars['teamOrg'] = org;
  },
);

Given(
  'an API key exists for {string}',
  async function (this: AgeloWorld, orgTitle: string) {
    const orgs = await this.api.get<any[]>('/organizations', { token: this.authToken! });
    const org = orgs.find((o) => o.title === orgTitle)!;
    const created = await this.api.post(
      '/settings/api-keys',
      { name: `mcp-key-${Date.now()}`, orgId: org.id },
      { token: this.authToken! },
    );
    this.vars['apiKey'] = created.rawKey;
    this.vars['org'] = org;
  },
);

When(
  'the agent registers via the API as {string} titled {string}',
  async function (this: AgeloWorld, agentId: string, title: string) {
    const orgId = activeOrgId(this);
    const teams = await this.api.get<any[]>(
      `/organizations/${orgId}/teams`,
      { token: this.authToken! },
    );
    const team = teams.find((t) => t.name === 'devops')!;
    await this.api.post(
      `/teams/${team.id}/agents/register`,
      {
        id: agentId, title,
        machineIp: '127.0.0.1', machineName: 'e2e-host',
        llmVersion: 'claude-sonnet-4-6', email: 'agent@example.com',
      },
      { apiKey: this.vars['apiKey'] },
    );
    this.vars['agentId'] = agentId;
  },
);

Then('the agent status is {string}', async function (this: AgeloWorld, expected: string) {
  const status = await this.api.get<{ status: string }>(
    `/agents/${this.vars['agentId']}/status`,
    { apiKey: this.vars['apiKey'] },
  );
  if (status.status !== expected) {
    throw new Error(`expected ${expected}, got ${status.status}`);
  }
});

When('I approve the agent {string}', async function (this: AgeloWorld, agentId: string) {
  await this.api.patch(`/agents/${agentId}/approve`, {}, { token: this.authToken! });
});

When('I stop the agent {string}', async function (this: AgeloWorld, agentId: string) {
  await this.api.patch(`/agents/${agentId}/stop`, {}, { token: this.authToken! });
});

When('I delete the agent {string}', async function (this: AgeloWorld, agentId: string) {
  await this.api.delete(`/agents/${agentId}`, { token: this.authToken! });
});

Then(
  'the agent status becomes {string}',
  async function (this: AgeloWorld, expected: string) {
    const status = await this.api.get<{ status: string }>(
      `/agents/${this.vars['agentId']}/status`,
      { apiKey: this.vars['apiKey'] },
    );
    if (status.status !== expected) {
      throw new Error(`expected ${expected}, got ${status.status}`);
    }
  },
);

Then(
  'the agent {string} no longer appears in the team',
  async function (this: AgeloWorld, agentId: string) {
    const orgId = activeOrgId(this);
    const list = await this.api.get<any[]>(
      `/organizations/${orgId}/agents`,
      { token: this.authToken! },
    );
    if (list.find((a) => a.id === agentId)) {
      throw new Error(`agent ${agentId} still present`);
    }
  },
);

When(
  'I open the {string} team in the UI',
  async function (this: AgeloWorld, name: string) {
    const orgId = activeOrgId(this);
    await this.page.goto(`${AgeloWorld.frontendUrl}/org/${orgId}/teams`);
    await this.page.locator('.team-card').filter({ hasText: name }).click();
  },
);
