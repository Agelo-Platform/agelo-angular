import { When, Then } from '@cucumber/cucumber';
import { AgeloWorld } from '../world';

// Module #20 — Projects + default_kanban provisioner. SA-only.
// /api/v1/organizations/:orgId/projects with template:'default_kanban'
// stages columns Todo/In Progress/Review/Done plus a Task card type
// with 8 standard fields. The provisioner is idempotent — it adopts an
// existing same-name column / type into the new project rather than
// failing on a unique-name collision.

function activeOrgId(world: AgeloWorld): string {
  return world.vars['org']?.id ?? '';
}

async function getFlow(world: AgeloWorld) {
  return world.api.get(`/organizations/${activeOrgId(world)}/board-flow`, {
    token: world.authToken!,
  });
}

const TASK_FIELDS = [
  'github_pr_link',
  'attachments',
  'required_mcp',
  'description',
  'acceptance_criteria',
  'tags',
  'prompts',
  'time_budget',
];

When(
  'I create a project titled {string} with template {string}',
  async function (this: AgeloWorld, title: string, template: string) {
    const orgId = activeOrgId(this);
    const proj = await this.api.post(
      `/organizations/${orgId}/projects`,
      { title, template },
      { token: this.authToken! },
    );
    this.vars['project'] = proj;
  },
);

Then(
  'the project\'s columns include the four default Kanban names',
  async function (this: AgeloWorld) {
    // The provisioner adopts existing same-name columns (case-insensitive
    // under MySQL's default collation) into the new project, so the four
    // canonical names may surface as "Todo" or as a pre-existing
    // case-variant like "TODO". Match on a lowercase compare to stay
    // robust either way — the constraint we actually care about is that
    // the project ends up with all four logical columns.
    const want = ['todo', 'in progress', 'review', 'done'];
    const flow = await getFlow(this);
    const projectId = this.vars['project'].id;
    const projectColumns = flow.columns.filter(
      (col: any) => col.projectId === projectId,
    );
    const haveLower = projectColumns.map((c: any) => String(c.name).toLowerCase());
    for (const name of want) {
      if (!haveLower.includes(name)) {
        throw new Error(
          `column '${name}' missing from project; saw (lowercased): ${haveLower.join(', ')}`,
        );
      }
    }
  },
);

Then(
  'the project\'s Task card type carries the 8 default custom fields',
  async function (this: AgeloWorld) {
    const flow = await getFlow(this);
    const taskType = flow.cardTypes.find((t: any) => t.name === 'Task');
    if (!taskType) throw new Error('Task card type not provisioned');
    const haveNames = taskType.customFields.map((f: any) => f.name);
    for (const need of TASK_FIELDS) {
      if (!haveNames.includes(need)) {
        throw new Error(
          `Task type missing field '${need}'; have: ${haveNames.join(', ')}`,
        );
      }
    }
  },
);

When('I archive that project', async function (this: AgeloWorld) {
  const orgId = activeOrgId(this);
  const p = this.vars['project'];
  await this.api.delete(
    `/organizations/${orgId}/projects/${p.id}?mode=archive`,
    { token: this.authToken! },
  );
});

Then(
  'that project is not in the active projects list',
  async function (this: AgeloWorld) {
    const orgId = activeOrgId(this);
    const p = this.vars['project'];
    const list = await this.api.get<any[]>(
      `/organizations/${orgId}/projects`,
      { token: this.authToken! },
    );
    if (list.find((x) => x.id === p.id)) {
      throw new Error(`project ${p.id} still in active list`);
    }
  },
);

When(
  'I restore the archived project via the archive endpoint',
  async function (this: AgeloWorld) {
    const p = this.vars['project'];
    await this.api.post(
      `/archive/project/${p.id}/restore`,
      {},
      { token: this.authToken! },
    );
  },
);

Then(
  'that project is back in the active projects list',
  async function (this: AgeloWorld) {
    const orgId = activeOrgId(this);
    const p = this.vars['project'];
    const list = await this.api.get<any[]>(
      `/organizations/${orgId}/projects`,
      { token: this.authToken! },
    );
    if (!list.find((x) => x.id === p.id)) {
      throw new Error(`project ${p.id} did not return to active list`);
    }
  },
);

When('I permanently delete that project', async function (this: AgeloWorld) {
  const orgId = activeOrgId(this);
  const p = this.vars['project'];
  await this.api.delete(
    `/organizations/${orgId}/projects/${p.id}?mode=permanent`,
    { token: this.authToken! },
  );
});

Then(
  'no archived project with title {string} remains',
  async function (this: AgeloWorld, title: string) {
    // Walk the global archive feed — if the row is still archived,
    // it would surface under type='project'.
    let offset = 0;
    const limit = 200;
    for (;;) {
      const res = await this.api.get<any>(
        `/archive?offset=${offset}&limit=${limit}`,
        { token: this.authToken! },
      );
      const hit = res.items.find(
        (i: any) => i.type === 'project' && i.title === title,
      );
      if (hit) {
        throw new Error(`archived project '${title}' still present (id=${hit.id})`);
      }
      if (res.items.length < limit) return;
      offset += limit;
      if (offset >= res.total) return;
    }
  },
);
