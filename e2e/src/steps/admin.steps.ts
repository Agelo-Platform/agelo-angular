import { When, Then } from '@cucumber/cucumber';
import { AgeloWorld } from '../world';

// Module #20 — Admin "about" + DB export. SA-only routes under
// /api/v1/admin. About returns static product metadata; export streams
// the full DB snapshot as application/json with a download-friendly
// Content-Disposition header. Sensitive fields (passwordHash, keyHash)
// are stripped before serialization.

When('I fetch the admin about payload', async function (this: AgeloWorld) {
  this.vars['about'] = await this.api.get<any>('/admin/about', {
    token: this.authToken!,
  });
});

Then(
  'the admin about response has product {string}',
  async function (this: AgeloWorld, expected: string) {
    const a = this.vars['about'];
    if (a.product !== expected) {
      throw new Error(`expected product=${expected}, got ${a.product}`);
    }
  },
);

Then(
  'the admin about response carries a non-empty version, tagline, and docs URL',
  async function (this: AgeloWorld) {
    const a = this.vars['about'];
    for (const k of ['version', 'tagline', 'docs'] as const) {
      if (typeof a[k] !== 'string' || a[k].length === 0) {
        throw new Error(`about.${k} is empty: ${JSON.stringify(a)}`);
      }
    }
    if (!/^https?:\/\//.test(a.docs)) {
      throw new Error(`about.docs is not an http(s) URL: ${a.docs}`);
    }
  },
);

When('I fetch the admin export', async function (this: AgeloWorld) {
  // Use raw because we need to inspect Content-Type and
  // Content-Disposition headers.
  this.vars['export'] = await this.api.getRaw('/admin/export', {
    token: this.authToken!,
  });
});

Then(
  'the admin export Content-Type starts with {string}',
  async function (this: AgeloWorld, prefix: string) {
    const r = this.vars['export'];
    const ct = r.headers['content-type'] ?? '';
    if (!ct.startsWith(prefix)) {
      throw new Error(`Content-Type='${ct}' does not start with '${prefix}'`);
    }
  },
);

Then(
  'the admin export Content-Disposition contains {string}',
  async function (this: AgeloWorld, needle: string) {
    const r = this.vars['export'];
    const cd = r.headers['content-disposition'] ?? '';
    if (!cd.includes(needle)) {
      throw new Error(`Content-Disposition='${cd}' does not contain '${needle}'`);
    }
  },
);

Then(
  'the admin export filename matches {string} followed by a timestamp and {string}',
  async function (this: AgeloWorld, prefix: string, suffix: string) {
    const r = this.vars['export'];
    const cd = r.headers['content-disposition'] ?? '';
    // The legacy convention is filename="agelo-<ISO with : and . replaced
    // by -><suffix>" — we just need to confirm both ends and that
    // something date-shaped sits between them.
    const m = /filename="([^"]+)"/.exec(cd);
    if (!m) throw new Error(`no filename token in Content-Disposition: ${cd}`);
    const filename = m[1];
    if (!filename.startsWith(prefix) || !filename.endsWith(suffix)) {
      throw new Error(
        `filename '${filename}' does not match ${prefix}<timestamp>${suffix}`,
      );
    }
    const middle = filename.substring(prefix.length, filename.length - suffix.length);
    if (middle.length < 4) {
      throw new Error(`timestamp segment too short in filename: ${filename}`);
    }
  },
);

Then(
  'the admin export body has the aggregate keys',
  async function (this: AgeloWorld) {
    const r = this.vars['export'];
    const body = r.json;
    if (!body || typeof body !== 'object') {
      throw new Error('export body is not an object');
    }
    // The keys are the camelCase Prisma-shaped collections the SPA
    // already consumes. We only require the canonical list — adding
    // new aggregates later is fine.
    const required = [
      'meta',
      'users', 'organizations', 'projects', 'teams', 'agents',
      'cardTypes', 'customFields', 'boardColumns', 'cardRelationships',
      'statusTransitions', 'cards', 'fieldValues', 'comments',
      'promptCategories', 'prompts', 'promptVersions',
      'permissions', 'rolePermissions', 'apiKeys',
    ];
    for (const k of required) {
      if (!(k in body)) {
        throw new Error(`export body missing key '${k}'`);
      }
    }
    // meta carries product/version/exportedAt
    if (!body.meta || typeof body.meta !== 'object') {
      throw new Error('export.meta is not an object');
    }
    for (const k of ['product', 'version', 'exportedAt']) {
      if (typeof body.meta[k] !== 'string' || body.meta[k].length === 0) {
        throw new Error(`export.meta.${k} is empty`);
      }
    }
  },
);

Then(
  'no user in the export carries a passwordHash',
  async function (this: AgeloWorld) {
    const body = this.vars['export'].json;
    for (const u of body.users ?? []) {
      if ('passwordHash' in u) {
        throw new Error(`user ${u.id ?? u.email} leaks passwordHash`);
      }
    }
  },
);

Then(
  'no api key in the export carries a keyHash',
  async function (this: AgeloWorld) {
    const body = this.vars['export'].json;
    for (const k of body.apiKeys ?? []) {
      if ('keyHash' in k) {
        throw new Error(`apiKey ${k.id ?? k.name} leaks keyHash`);
      }
    }
  },
);
