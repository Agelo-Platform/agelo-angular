import { Given, When, Then } from '@cucumber/cucumber';
import { AgeloWorld } from '../world';

// Module #19 — Cross-aggregate archive feed. SA-only routes under
// /api/v1/archive: GET / (paginated, search by title contains), POST
// /:type/:id/restore, DELETE /:type/:id (hard delete).

interface ArchiveItem {
  type: string;
  id: string;
  title: string;
}

interface ArchiveListResponse {
  total: number;
  offset: number;
  limit: number;
  items: ArchiveItem[];
}

When('I archive that organization', async function (this: AgeloWorld) {
  const org = this.vars['org'];
  await this.api.delete(`/organizations/${org.id}?mode=archive`, {
    token: this.authToken!,
  });
  this.vars['archivedOrgIds'] = (this.vars['archivedOrgIds'] ?? []).concat([org.id]);
});

When('I archive each of those organizations', async function (this: AgeloWorld) {
  const orgs = await this.api.get<any[]>('/organizations', {
    token: this.authToken!,
  });
  const ids: string[] = [];
  for (const t of ['Search Target Alpha', 'Other Org Beta']) {
    const o = orgs.find((x) => x.title === t);
    if (!o) throw new Error(`pre-condition: ${t} should exist`);
    await this.api.delete(`/organizations/${o.id}?mode=archive`, {
      token: this.authToken!,
    });
    ids.push(o.id);
  }
  this.vars['archivedOrgIds'] = ids;
});

Then(
  'the archive feed contains an item titled {string} of type {string}',
  async function (this: AgeloWorld, title: string, type: string) {
    // Walk the paginated archive feed in chunks of 200 (the max) until
    // we either find the row or exhaust the total — keeps the assertion
    // robust even when other scenarios in the suite have padded the
    // archive with their own rows.
    const found = await findInArchive(this, (i) => i.title === title && i.type === type);
    if (!found) {
      throw new Error(`archive missing item type=${type} title='${title}'`);
    }
  },
);

Then(
  'the archive feed does not contain {string}',
  async function (this: AgeloWorld, title: string) {
    const found = await findInArchive(this, (i) => i.title === title);
    if (found) {
      throw new Error(`archive unexpectedly contains '${title}'`);
    }
  },
);

When('I archive that team', async function (this: AgeloWorld) {
  const orgId = this.vars['org'].id;
  const teams = await this.api.get<any[]>(`/organizations/${orgId}/teams`, {
    token: this.authToken!,
  });
  const team = teams.find((t) => t.name === 'Squad-A');
  if (!team) throw new Error('Squad-A not found before archive');
  // Team deletes route under the org-scoped path (mirrors the legacy
  // surface — /teams/:id alone is for the public onboarding read).
  await this.api.delete(
    `/organizations/${orgId}/teams/${team.id}?mode=archive`,
    { token: this.authToken! },
  );
  this.vars['archivedTeamId'] = team.id;
});

When('I restore the archived team', async function (this: AgeloWorld) {
  await this.api.post(
    `/archive/team/${this.vars['archivedTeamId']}/restore`,
    {},
    { token: this.authToken! },
  );
});

Then(
  'the team {string} is active again in the active organization',
  async function (this: AgeloWorld, name: string) {
    const orgId = this.vars['org'].id;
    const teams = await this.api.get<any[]>(`/organizations/${orgId}/teams`, {
      token: this.authToken!,
    });
    if (!teams.find((t) => t.name === name)) {
      throw new Error(`team '${name}' not in active list after restore`);
    }
  },
);

When('I archive that prompt', async function (this: AgeloWorld) {
  const title = this.vars['promptTitle'];
  const list = await this.api.get<any[]>('/prompts', { token: this.authToken! });
  const p = list.find((x) => x.title === title);
  if (!p) throw new Error(`prompt '${title}' not found pre-archive`);
  await this.api.delete(`/prompts/${p.id}?mode=archive`, {
    token: this.authToken!,
  });
  this.vars['archivedPromptId'] = p.id;
});

When('I hard-delete the archived prompt', async function (this: AgeloWorld) {
  await this.api.delete(`/archive/prompt/${this.vars['archivedPromptId']}`, {
    token: this.authToken!,
  });
});

When(
  'I list the archive with search {string}',
  async function (this: AgeloWorld, search: string) {
    const res = await this.api.get<ArchiveListResponse>(
      `/archive?search=${encodeURIComponent(search)}&limit=200`,
      { token: this.authToken! },
    );
    this.vars['archive'] = res;
  },
);

When(
  'I list the archive with offset {int} and limit {int}',
  async function (this: AgeloWorld, offset: number, limit: number) {
    const res = await this.api.get<ArchiveListResponse>(
      `/archive?offset=${offset}&limit=${limit}`,
      { token: this.authToken! },
    );
    this.vars['archive'] = res;
  },
);

Then(
  'the archive feed limit is {int} and offset is {int}',
  async function (this: AgeloWorld, expectedLimit: number, expectedOffset: number) {
    const a = this.vars['archive'];
    if (a.limit !== expectedLimit) {
      throw new Error(`expected limit=${expectedLimit}, got ${a.limit}`);
    }
    if (a.offset !== expectedOffset) {
      throw new Error(`expected offset=${expectedOffset}, got ${a.offset}`);
    }
    if (a.items.length > expectedLimit) {
      throw new Error(`returned ${a.items.length} items > limit ${expectedLimit}`);
    }
  },
);

async function findInArchive(
  world: AgeloWorld,
  pred: (i: ArchiveItem) => boolean,
): Promise<ArchiveItem | null> {
  // A scenario that already issued a `When I list the archive ...` step
  // wants us to scope the assertion to *that* list (e.g. the search
  // filter scenario). Otherwise paginate from scratch.
  const cached = world.vars['archive'] as ArchiveListResponse | undefined;
  if (cached) {
    return cached.items.find(pred) ?? null;
  }
  let offset = 0;
  const limit = 200;
  for (;;) {
    const res = await world.api.get<ArchiveListResponse>(
      `/archive?offset=${offset}&limit=${limit}`,
      { token: world.authToken! },
    );
    const hit = res.items.find(pred);
    if (hit) return hit;
    if (res.items.length < limit) return null;
    offset += limit;
    if (offset >= res.total) return null;
  }
}
