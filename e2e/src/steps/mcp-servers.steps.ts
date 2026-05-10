import { Given, When, Then } from '@cucumber/cucumber';
import { AgeloWorld } from '../world';

// Module #15 — MCP server registry. JWT + SA-only.
// Endpoints under /api/v1/mcp-servers — see McpServersController.cs.

When(
  'I create an MCP server titled {string} with regular config {string} and docker config {string}',
  async function (
    this: AgeloWorld,
    title: string,
    regularConfig: string,
    dockerConfig: string,
  ) {
    const created = await this.api.post(
      '/mcp-servers',
      { title, regularConfig, dockerConfig },
      { token: this.authToken! },
    );
    this.vars['mcp'] = created;
  },
);

Then(
  'the MCP server {string} appears in the registry list',
  async function (this: AgeloWorld, title: string) {
    const list = await this.api.get<any[]>('/mcp-servers', {
      token: this.authToken!,
    });
    const match = list.find((m) => m.title === title);
    if (!match) {
      throw new Error(`MCP server '${title}' missing from registry list`);
    }
    this.vars['mcp'] = match;
  },
);

Then(
  'the regularConfig defaults to a JSON object string',
  async function (this: AgeloWorld) {
    const m = this.vars['mcp'];
    // The domain initializer falls back to "{}" when blank — when we did
    // pass a value it's the value we sent. Either way the field must be
    // a syntactically valid JSON object string.
    if (typeof m.regularConfig !== 'string') {
      throw new Error('regularConfig is not a string');
    }
    try {
      const parsed = JSON.parse(m.regularConfig);
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('not an object');
      }
    } catch (err) {
      throw new Error(`regularConfig is not a JSON object: ${m.regularConfig}`);
    }
  },
);

Given(
  'an MCP server titled {string} exists',
  async function (this: AgeloWorld, title: string) {
    const list = await this.api.get<any[]>('/mcp-servers', {
      token: this.authToken!,
    });
    let server = list.find((m) => m.title === title);
    if (!server) {
      server = await this.api.post(
        '/mcp-servers',
        { title },
        { token: this.authToken! },
      );
    }
    this.vars['mcp'] = server;
  },
);

When(
  'I attempt to create another MCP server titled {string}',
  async function (this: AgeloWorld, title: string) {
    this.vars['mcpRaw'] = await this.api.postRaw(
      '/mcp-servers',
      { title },
      { token: this.authToken! },
    );
  },
);

When(
  'I attempt to create an MCP server titled {string} with regular config {string}',
  async function (this: AgeloWorld, title: string, regularConfig: string) {
    this.vars['mcpRaw'] = await this.api.postRaw(
      '/mcp-servers',
      { title, regularConfig },
      { token: this.authToken! },
    );
  },
);

Then(
  'the MCP create call fails with status {int}',
  async function (this: AgeloWorld, expected: number) {
    const r = this.vars['mcpRaw'];
    if (!r) throw new Error('no raw response captured');
    if (r.status !== expected) {
      throw new Error(`expected ${expected}, got ${r.status}: ${r.text}`);
    }
  },
);

When(
  'I update that MCP server with title {string} and regular config {string}',
  async function (this: AgeloWorld, title: string, regularConfig: string) {
    const m = this.vars['mcp'];
    const updated = await this.api.patch(
      `/mcp-servers/${m.id}`,
      { title, regularConfig },
      { token: this.authToken! },
    );
    this.vars['mcp'] = updated;
  },
);

Then(
  'the MCP server\'s regularConfig equals {string}',
  async function (this: AgeloWorld, expected: string) {
    const m = this.vars['mcp'];
    // Compare semantically — the backend stores the string verbatim but
    // an extra space wouldn't change the meaning of the JSON.
    if (m.regularConfig !== expected) {
      throw new Error(
        `expected regularConfig=${expected}, got ${m.regularConfig}`,
      );
    }
  },
);

When('I archive that MCP server', async function (this: AgeloWorld) {
  const m = this.vars['mcp'];
  await this.api.delete(`/mcp-servers/${m.id}?mode=archive`, {
    token: this.authToken!,
  });
});

Then(
  'the MCP server {string} is no longer in the registry list',
  async function (this: AgeloWorld, title: string) {
    const list = await this.api.get<any[]>('/mcp-servers', {
      token: this.authToken!,
    });
    if (list.find((m) => m.title === title)) {
      throw new Error(`MCP '${title}' should be archived but still in list`);
    }
  },
);

When(
  'I permanently delete the archived MCP server {string}',
  async function (this: AgeloWorld, _title: string) {
    // The DELETE /api/v1/mcp-servers/:id route filters out archived
    // rows (returns 404), so we go through the global archive surface
    // for the hard-delete instead — same path the SPA uses for
    // archived items.
    const m = this.vars['mcp'];
    await this.api.delete(`/archive/mcpServer/${m.id}`, {
      token: this.authToken!,
    });
  },
);

Then(
  'the archived MCP server {string} no longer exists',
  async function (this: AgeloWorld, _title: string) {
    const m = this.vars['mcp'];
    // Confirm the row is gone from the global archive feed.
    const archived = await this.api.get<any>('/archive', {
      token: this.authToken!,
    });
    if (archived.items.find((i: any) => i.id === m.id)) {
      throw new Error('archived MCP server still present after hard-delete');
    }
  },
);
