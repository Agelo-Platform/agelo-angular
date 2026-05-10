import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { AgeloWorld } from '../world';

When('I open the prompt library', async function (this: AgeloWorld) {
  await this.page.goto(AgeloWorld.frontendUrl + '/prompts');
  await expect(this.page.getByRole('heading', { name: 'Prompt Library' })).toBeVisible();
});

When('I create a category {string}', async function (this: AgeloWorld, name: string) {
  // Drive via API for determinism.
  const existing = await this.api.get<any[]>('/prompt-categories', { token: this.authToken! });
  if (!existing.find((c) => c.name === name)) {
    await this.api.post('/prompt-categories', { name }, { token: this.authToken! });
  }
  await this.page.reload();
  await expect(this.page.locator('.cat-list li').filter({ hasText: name })).toBeVisible();
});

Then('{string} appears in the category list', async function (this: AgeloWorld, name: string) {
  await expect(this.page.locator('.cat-list li').filter({ hasText: name })).toBeVisible();
});

When(
  'I create a prompt titled {string} in category {string}',
  async function (this: AgeloWorld, title: string, category: string) {
    const cats = await this.api.get<any[]>('/prompt-categories', {
      token: this.authToken!,
    });
    const cat = cats.find((c) => c.name === category)!;
    await this.api.post(
      '/prompts',
      {
        title, categoryId: cat.id,
        initialContent: `# ${title}\n\nbody`,
        initialVersion: '1.0.0',
      },
      { token: this.authToken! },
    );
    this.vars['promptTitle'] = title;
  },
);

Then(
  'the prompt {string} exists with one version',
  async function (this: AgeloWorld, title: string) {
    const prompts = await this.api.get<any[]>('/prompts', { token: this.authToken! });
    const p = prompts.find((x) => x.title === title);
    if (!p || (p.versions ?? []).length !== 1) {
      throw new Error(`prompt ${title} not found or wrong version count`);
    }
  },
);

Given(
  'a prompt {string} exists with version {string}',
  async function (this: AgeloWorld, title: string, version: string) {
    const prompts = await this.api.get<any[]>('/prompts', { token: this.authToken! });
    if (!prompts.find((p) => p.title === title)) {
      const cats = await this.api.get<any[]>('/prompt-categories', {
        token: this.authToken!,
      });
      let cat = cats[0];
      if (!cat) {
        cat = await this.api.post(
          '/prompt-categories',
          { name: 'General' },
          { token: this.authToken! },
        );
      }
      await this.api.post(
        '/prompts',
        { title, categoryId: cat.id, initialContent: `# ${title}`, initialVersion: version },
        { token: this.authToken! },
      );
    }
    this.vars['promptTitle'] = title;
  },
);

Given('a prompt {string} exists', async function (this: AgeloWorld, title: string) {
  const prompts = await this.api.get<any[]>('/prompts', { token: this.authToken! });
  if (!prompts.find((p) => p.title === title)) {
    let cats = await this.api.get<any[]>('/prompt-categories', {
      token: this.authToken!,
    });
    let cat = cats[0];
    if (!cat) {
      cat = await this.api.post(
        '/prompt-categories',
        { name: 'General' },
        { token: this.authToken! },
      );
    }
    await this.api.post(
      '/prompts',
      { title, categoryId: cat.id, initialContent: `# ${title}` },
      { token: this.authToken! },
    );
  }
  this.vars['promptTitle'] = title;
});

When('I open the prompt {string}', async function (this: AgeloWorld, title: string) {
  const prompts = await this.api.get<any[]>('/prompts', { token: this.authToken! });
  const p = prompts.find((x) => x.title === title)!;
  this.vars['promptId'] = p.id;
  await this.page.goto(`${AgeloWorld.frontendUrl}/prompts/${p.id}`);
  await expect(
    this.page.locator('.detail-header').getByRole('heading', { name: title }),
  ).toBeVisible();
});

When('I edit the body to {string}', async function (this: AgeloWorld, body: string) {
  // Switch back to Edit tab (it's the default but tests can leave Save tab open).
  const editTab = this.page.locator('.ant-tabs-tab').filter({ hasText: /\bedit\b/i });
  if (await editTab.count()) await editTab.first().click();
  await this.page.locator('app-markdown-editor textarea').first().fill(body);
});

When('I save it as a new version {string}', async function (this: AgeloWorld, version: string) {
  await this.page.locator('.ant-tabs-tab').filter({ hasText: /\bsave\b/i }).click();
  await this.page.locator('.save-pane input').fill(version);
  const wait = this.page.waitForResponse(
    (r) => /\/prompts\/[^/]+\/versions$/.test(r.url()) && r.request().method() === 'POST',
  );
  await this.page.getByRole('button', { name: /save as new version/i }).click();
  await wait;
});

Then(
  'the prompt has versions {string} and {string}',
  async function (this: AgeloWorld, a: string, b: string) {
    const p = await this.api.get(`/prompts/${this.vars['promptId']}`, {
      token: this.authToken!,
    });
    const versions = p.versions.map((v: any) => v.version);
    for (const v of [a, b]) {
      if (!versions.includes(v)) throw new Error(`version ${v} missing`);
    }
  },
);

When('I switch to version {string}', async function (this: AgeloWorld, version: string) {
  const p = await this.api.get(`/prompts/${this.vars['promptId']}`, {
    token: this.authToken!,
  });
  const v = p.versions.find((x: any) => x.version === version)!;
  this.vars['versionId'] = v.id;
  // Open the version select in the header.
  await this.page.locator('.detail-header .ant-select').click();
  await this.page.locator('.ant-select-item-option').filter({ hasText: 'v' + version }).first().click();
});

When('I replace the current version', async function (this: AgeloWorld) {
  await this.page.locator('.ant-tabs-tab').filter({ hasText: /\bsave\b/i }).click();
  const wait = this.page.waitForResponse(
    (r) => /\/prompts\/[^/]+\/versions\/[^/]+$/.test(r.url()) && r.request().method() === 'PATCH',
  );
  await this.page.getByRole('button', { name: /replace current/i }).click();
  // Confirm
  await this.page.locator('.app-confirm-modal .confirm-btn').click();
  await wait;
});

Then(
  'version {string} content equals {string}',
  async function (this: AgeloWorld, version: string, expected: string) {
    const p = await this.api.get(`/prompts/${this.vars['promptId']}`, {
      token: this.authToken!,
    });
    const v = p.versions.find((x: any) => x.version === version);
    if (v.content !== expected) {
      throw new Error(`expected "${expected}", got "${v.content}"`);
    }
  },
);

When('I delete the prompt', async function (this: AgeloWorld) {
  const wait = this.page.waitForResponse(
    (r) => /\/prompts\/[^/]+(\?.*)?$/.test(r.url()) && r.request().method() === 'DELETE',
  );
  await this.page.locator('.detail-header').getByRole('button', { name: /delete/i }).click();
  // Permanent so the prompt is removed from /prompts (which filters out archived).
  await this.page.locator('.app-archive-modal .permanent-btn').click();
  await wait;
});

Then('{string} is no longer in the prompt list', async function (this: AgeloWorld, title: string) {
  const prompts = await this.api.get<any[]>('/prompts', { token: this.authToken! });
  if (prompts.find((p) => p.title === title)) {
    throw new Error(`prompt ${title} still present`);
  }
});
