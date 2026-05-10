import { Given, When, Then } from '@cucumber/cucumber';
import { AgeloWorld } from '../world';

// Module #16 — File attachments. JWT-only. The .NET backend lives at
// /api/v1/files and mirrors the legacy NestJS contract: upload returns
// metadata, list-by-field returns the metadata array, content download
// streams raw bytes with the security headers (X-Content-Type-Options,
// Content-Security-Policy: default-src 'none'; sandbox).

function activeOrgId(world: AgeloWorld): string {
  return world.vars['org']?.id ?? '';
}

async function findCardId(world: AgeloWorld, title: string): Promise<string> {
  const orgId = activeOrgId(world);
  const cards = await world.api.get<any[]>(`/organizations/${orgId}/cards`, {
    token: world.authToken!,
  });
  const c = cards.find((x) => x.title === title);
  if (!c) throw new Error(`card '${title}' not found in org ${orgId}`);
  return c.id;
}

async function findFieldId(
  world: AgeloWorld,
  cardId: string,
  fieldName: string,
): Promise<string> {
  // Resolve via the card detail so we always pick the field bound to
  // that card's type — the org may carry several types each with the
  // same field name (we only have "Task" today, but defensive).
  const card = await world.api.get<any>(`/cards/${cardId}`, {
    token: world.authToken!,
  });
  const f = card.type.customFields.find((x: any) => x.name === fieldName);
  if (!f) throw new Error(`field '${fieldName}' not on card type ${card.type.name}`);
  return f.id;
}

async function uploadFile(
  world: AgeloWorld,
  cardTitle: string,
  fieldName: string,
  filename: string,
  contentType: string,
  base64: string,
) {
  const cardId = await findCardId(world, cardTitle);
  const fieldId = await findFieldId(world, cardId, fieldName);
  const raw = await world.api.postRaw(
    '/files',
    { cardId, fieldId, filename, contentType, base64 },
    { token: world.authToken! },
  );
  world.vars['fileRaw'] = raw;
  world.vars['fileCardId'] = cardId;
  world.vars['fileFieldId'] = fieldId;
  if (raw.ok) {
    world.vars['file'] = raw.json;
  }
  return raw;
}

When(
  'I upload a small text file {string} to the {string} field of that card',
  async function (this: AgeloWorld, filename: string, fieldName: string) {
    const cardTitle = this.vars['lastCardTitle'];
    const base64 = Buffer.from(`hello ${filename}`).toString('base64');
    const raw = await uploadFile(this, cardTitle, fieldName, filename, 'text/plain', base64);
    if (!raw.ok) {
      throw new Error(`upload failed ${raw.status}: ${raw.text}`);
    }
  },
);

Then('the upload succeeds and returns metadata', async function (this: AgeloWorld) {
  const r = this.vars['fileRaw'];
  if (!r || !r.ok) {
    throw new Error(`expected upload ok, got ${r?.status}: ${r?.text}`);
  }
  const meta = this.vars['file'];
  if (!meta || !meta.id || !meta.cardId || !meta.fieldId || !meta.filename) {
    throw new Error(`upload returned malformed metadata: ${JSON.stringify(meta)}`);
  }
});

Then(
  'the file is listed for the card\'s {string} field',
  async function (this: AgeloWorld, fieldName: string) {
    const cardId = this.vars['fileCardId'];
    const fieldId = await findFieldId(this, cardId, fieldName);
    const list = await this.api.get<any[]>(
      `/files/card/${cardId}/field/${fieldId}`,
      { token: this.authToken! },
    );
    const want = this.vars['file'];
    if (!list.find((m) => m.id === want.id)) {
      throw new Error(`file ${want.id} not in list-for-field`);
    }
  },
);

Given(
  'I have uploaded a small text file {string} to the {string} field of that card',
  async function (this: AgeloWorld, filename: string, fieldName: string) {
    const cardTitle = this.vars['lastCardTitle'];
    const base64 = Buffer.from(`hello ${filename}`).toString('base64');
    const raw = await uploadFile(this, cardTitle, fieldName, filename, 'text/plain', base64);
    if (!raw.ok) {
      throw new Error(`upload failed ${raw.status}: ${raw.text}`);
    }
  },
);

When('I download that file', async function (this: AgeloWorld) {
  const f = this.vars['file'];
  // The download endpoint returns raw bytes — go through the raw helper
  // so we can assert on response headers (X-Content-Type-Options,
  // Content-Security-Policy, Content-Disposition).
  this.vars['download'] = await this.api.getRaw(`/files/${f.id}/content`, {
    token: this.authToken!,
  });
});

Then('the download status is {int}', async function (this: AgeloWorld, expected: number) {
  const d = this.vars['download'];
  if (d.status !== expected) {
    throw new Error(`expected ${expected}, got ${d.status}: ${d.text}`);
  }
});

Then(
  'the download Content-Type starts with {string}',
  async function (this: AgeloWorld, prefix: string) {
    const d = this.vars['download'];
    const ct = d.headers['content-type'] ?? '';
    if (!ct.startsWith(prefix)) {
      throw new Error(`Content-Type='${ct}' does not start with '${prefix}'`);
    }
  },
);

Then(
  'the download response sets X-Content-Type-Options to {string}',
  async function (this: AgeloWorld, expected: string) {
    const d = this.vars['download'];
    const v = d.headers['x-content-type-options'];
    if (v !== expected) {
      throw new Error(`X-Content-Type-Options='${v}', expected '${expected}'`);
    }
  },
);

Then(
  'the download Content-Security-Policy contains {string}',
  async function (this: AgeloWorld, needle: string) {
    const d = this.vars['download'];
    const v = d.headers['content-security-policy'] ?? '';
    if (!v.includes(needle)) {
      throw new Error(`CSP='${v}' does not contain '${needle}'`);
    }
  },
);

When(
  'I attempt to upload a file with content type {string} to the {string} field',
  async function (this: AgeloWorld, contentType: string, fieldName: string) {
    const cardTitle = this.vars['lastCardTitle'];
    // 1-byte payload — the validator runs the MIME allow-list before it
    // looks at the content size, so even an empty-ish blob will be
    // rejected at the MIME stage.
    const base64 = Buffer.from('x').toString('base64');
    await uploadFile(this, cardTitle, fieldName, 'malicious.sh', contentType, base64);
  },
);

When(
  'I attempt to upload a small text file {string} to the {string} field of that card',
  async function (this: AgeloWorld, filename: string, fieldName: string) {
    const cardTitle = this.vars['lastCardTitle'];
    const base64 = Buffer.from(`hello ${filename}`).toString('base64');
    await uploadFile(this, cardTitle, fieldName, filename, 'text/plain', base64);
  },
);

Then(
  'the file upload fails with status {int}',
  async function (this: AgeloWorld, expected: number) {
    const r = this.vars['fileRaw'];
    if (!r) throw new Error('no upload response captured');
    if (r.status !== expected) {
      throw new Error(`expected ${expected}, got ${r.status}: ${r.text}`);
    }
  },
);

When('I delete that uploaded file', async function (this: AgeloWorld) {
  const f = this.vars['file'];
  const res = await this.api.delete<{ ok: boolean }>(`/files/${f.id}`, {
    token: this.authToken!,
  });
  if (!res.ok) throw new Error(`delete returned ok=false: ${JSON.stringify(res)}`);
});

Then(
  'the file is no longer listed for the card\'s {string} field',
  async function (this: AgeloWorld, fieldName: string) {
    const cardId = this.vars['fileCardId'];
    const fieldId = await findFieldId(this, cardId, fieldName);
    const list = await this.api.get<any[]>(
      `/files/card/${cardId}/field/${fieldId}`,
      { token: this.authToken! },
    );
    const f = this.vars['file'];
    if (list.find((m) => m.id === f.id)) {
      throw new Error(`file ${f.id} still listed after delete`);
    }
  },
);
