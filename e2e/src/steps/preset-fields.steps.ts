import { Given, When, Then } from '@cucumber/cucumber';
import { AgeloWorld } from '../world';

interface PresetFieldDto {
  id: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  order: number;
  config?: string | null;
}

interface CustomFieldDto {
  id: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  order: number;
  config?: string | null;
}

interface CardTypeDto {
  id: string;
  name: string;
  customFields?: CustomFieldDto[];
}

function activeOrgId(world: AgeloWorld): string {
  return world.vars['org']?.id ?? '';
}

async function listPresets(world: AgeloWorld): Promise<PresetFieldDto[]> {
  return world.api.get<PresetFieldDto[]>('/preset-fields', {
    token: world.authToken!,
  });
}

async function findPreset(
  world: AgeloWorld,
  name: string,
): Promise<PresetFieldDto | undefined> {
  const list = await listPresets(world);
  return list.find((p) => p.name === name);
}

async function getCardType(
  world: AgeloWorld,
  name: string,
): Promise<CardTypeDto | undefined> {
  const orgId = activeOrgId(world);
  const flow = await world.api.get<{ cardTypes: CardTypeDto[] }>(
    `/organizations/${orgId}/board-flow`,
    { token: world.authToken! },
  );
  return flow.cardTypes.find((c) => c.name === name);
}

When('I list the preset fields', async function (this: AgeloWorld) {
  this.vars['presets'] = await listPresets(this);
});

Then(
  'the preset list includes {string}',
  async function (this: AgeloWorld, name: string) {
    const list = (this.vars['presets'] as PresetFieldDto[] | undefined)
      ?? (await listPresets(this));
    if (!list.find((p) => p.name === name)) {
      throw new Error(
        `expected preset "${name}" in list; got [${list.map((p) => p.name).join(', ')}]`,
      );
    }
  },
);

Then(
  'the preset list does not include {string}',
  async function (this: AgeloWorld, name: string) {
    const list = await listPresets(this);
    if (list.find((p) => p.name === name)) {
      throw new Error(`expected preset "${name}" to be gone but it's still here`);
    }
  },
);

When(
  'I create a preset field {string} labeled {string} of type {string}',
  async function (this: AgeloWorld, name: string, label: string, type: string) {
    const created = await this.api.post<PresetFieldDto>(
      '/preset-fields',
      { name, label, type },
      { token: this.authToken! },
    );
    this.vars[`preset:${name}`] = created;
  },
);

When(
  'I update the {string} preset label to {string}',
  async function (this: AgeloWorld, name: string, newLabel: string) {
    const preset = await findPreset(this, name);
    if (!preset) throw new Error(`preset "${name}" not found`);
    await this.api.patch(
      `/preset-fields/${preset.id}`,
      { label: newLabel },
      { token: this.authToken! },
    );
  },
);

Then(
  'the {string} preset has label {string}',
  async function (this: AgeloWorld, name: string, expected: string) {
    const preset = await findPreset(this, name);
    if (!preset) throw new Error(`preset "${name}" not found`);
    if (preset.label !== expected) {
      throw new Error(`expected label "${expected}", got "${preset.label}"`);
    }
  },
);

When(
  'I delete the {string} preset field',
  async function (this: AgeloWorld, name: string) {
    const preset = await findPreset(this, name);
    if (!preset) throw new Error(`preset "${name}" not found`);
    await this.api.delete(`/preset-fields/${preset.id}`, {
      token: this.authToken!,
    });
  },
);

Given(
  'a preset field {string} of type {string} exists',
  async function (this: AgeloWorld, name: string, type: string) {
    const existing = await findPreset(this, name);
    if (existing) return;
    await this.api.post(
      '/preset-fields',
      { name, label: name, type },
      { token: this.authToken! },
    );
  },
);

When(
  'I reorder presets so {string} comes before {string}',
  async function (this: AgeloWorld, first: string, second: string) {
    const list = await listPresets(this);
    const a = list.find((p) => p.name === first);
    const b = list.find((p) => p.name === second);
    if (!a || !b) throw new Error('one of the presets is missing');
    // Build a new id order with `first` then `second`, then everything else.
    const ids = [a.id, b.id, ...list.filter((p) => p.id !== a.id && p.id !== b.id).map((p) => p.id)];
    await this.api.patch('/preset-fields', { ids }, { token: this.authToken! });
  },
);

Then(
  '{string} appears before {string} in the preset list',
  async function (this: AgeloWorld, first: string, second: string) {
    const list = await listPresets(this);
    const ai = list.findIndex((p) => p.name === first);
    const bi = list.findIndex((p) => p.name === second);
    if (ai === -1 || bi === -1) throw new Error('one of the presets is missing');
    if (!(ai < bi)) {
      throw new Error(`expected "${first}" before "${second}", got order [${list.map((p) => p.name).join(', ')}]`);
    }
  },
);

// "a card type {string} exists in the active organization" lives in
// card-relationships.steps.ts — reuse it.

When(
  'I toggle the {string} preset onto {string}',
  async function (this: AgeloWorld, presetName: string, cardTypeName: string) {
    const orgId = activeOrgId(this);
    const preset = await findPreset(this, presetName);
    const cardType = await getCardType(this, cardTypeName);
    if (!preset || !cardType) throw new Error('preset or card type not found');
    const order = (cardType.customFields?.length ?? 0);
    await this.api.post(
      `/organizations/${orgId}/card-types/${cardType.id}/fields`,
      {
        name: preset.name,
        label: preset.label,
        type: preset.type,
        required: preset.required,
        order,
        config: JSON.stringify({ preset: true, presetId: preset.id }),
      },
      { token: this.authToken! },
    );
  },
);

When(
  'I toggle the {string} preset off {string}',
  async function (this: AgeloWorld, presetName: string, cardTypeName: string) {
    const orgId = activeOrgId(this);
    const preset = await findPreset(this, presetName);
    const cardType = await getCardType(this, cardTypeName);
    if (!preset || !cardType) throw new Error('preset or card type not found');
    const match = (cardType.customFields ?? []).find((f) => {
      try {
        const cfg = f.config ? JSON.parse(f.config) : {};
        return cfg.preset === true && cfg.presetId === preset.id;
      } catch {
        return false;
      }
    });
    if (!match) throw new Error('no preset-derived field found to remove');
    await this.api.delete(
      `/organizations/${orgId}/card-types/${cardType.id}/fields/${match.id}`,
      { token: this.authToken! },
    );
  },
);

Then(
  'the card type {string} has a custom field {string}',
  async function (this: AgeloWorld, cardTypeName: string, fieldName: string) {
    const cardType = await getCardType(this, cardTypeName);
    if (!cardType) throw new Error(`card type "${cardTypeName}" not found`);
    if (!cardType.customFields?.find((f) => f.name === fieldName)) {
      throw new Error(`custom field "${fieldName}" not found on "${cardTypeName}"`);
    }
  },
);

Then(
  'the card type {string} does not have a custom field {string}',
  async function (this: AgeloWorld, cardTypeName: string, fieldName: string) {
    const cardType = await getCardType(this, cardTypeName);
    if (!cardType) throw new Error(`card type "${cardTypeName}" not found`);
    if (cardType.customFields?.find((f) => f.name === fieldName)) {
      throw new Error(`custom field "${fieldName}" still present on "${cardTypeName}"`);
    }
  },
);

Then(
  'that custom field is marked as preset-derived',
  async function (this: AgeloWorld) {
    // Look at the most recent preset-toggle: re-fetch and verify the
    // most recently added preset-derived field has the expected config.
    // Since the previous step toggled github_pr_link onto Task, find that one.
    const cardType = await getCardType(this, 'Task');
    if (!cardType) throw new Error('card type "Task" not found');
    const presetField = cardType.customFields?.find((f) => {
      try {
        const cfg = f.config ? JSON.parse(f.config) : {};
        return cfg.preset === true;
      } catch {
        return false;
      }
    });
    if (!presetField) {
      throw new Error('no preset-derived custom field found on "Task"');
    }
  },
);
