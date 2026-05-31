import {
  ChangeDetectionStrategy, Component, Inject, OnInit, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NZ_MODAL_DATA, NzModalRef } from 'ng-zorro-antd/modal';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../shared/dialogs/toast.service';
import { CustomField } from './board-flow.component';

export interface PresetField {
  id: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  order: number;
  config?: any;
}

export interface ManagePresetFieldsData {
  orgId: string;
  cardTypeId: string;
  cardTypeName: string;
  /** Snapshot of the card type's current custom fields */
  customFields: CustomField[];
}

export interface ManagePresetFieldsResult {
  /** True if any toggle action persisted a change to the server. */
  dirty: boolean;
}

interface PresetState {
  preset: PresetField;
  /** id of the matching CustomField on this card-type (or null) */
  matchedFieldId: string | null;
  busy: boolean;
}

function parseConfig(raw: unknown): { preset?: boolean; presetId?: string } | null {
  if (!raw) return null;
  if (typeof raw === 'object') return raw as any;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return null;
}

@Component({
  selector: 'app-manage-preset-fields',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule,
    NzButtonModule, NzIconModule, NzTagModule, NzSwitchModule,
    NzEmptyModule, NzSpinModule,
  ],
  template: `
    <p class="muted small">
      Toggle preset fields to add or remove them on this card type. Preset
      fields stay in sync across card types — edit them in the
      <strong>Preset fields</strong> section.
    </p>

    <nz-spin [nzSpinning]="loading()">
      @if (rows().length === 0 && !loading()) {
        <nz-empty
          nzNotFoundImage="simple"
          nzNotFoundContent="No preset fields defined yet"
        ></nz-empty>
      } @else {
        <div class="grid head">
          <div>Name</div>
          <div>Label</div>
          <div>Type</div>
          <div>Enabled</div>
        </div>
        @for (r of rows(); track r.preset.id) {
          <div class="grid row">
            <div><code class="mono">{{ r.preset.name }}</code></div>
            <div>{{ r.preset.label }}</div>
            <div><nz-tag>{{ r.preset.type }}</nz-tag></div>
            <div>
              <nz-switch
                [ngModel]="!!r.matchedFieldId"
                [nzLoading]="r.busy"
                [nzDisabled]="r.busy"
                (ngModelChange)="onToggle(r, $event)"
              ></nz-switch>
            </div>
          </div>
        }
      }
    </nz-spin>

    <div class="actions">
      <button nz-button (click)="close()">Close</button>
    </div>
  `,
  styles: [`
    .muted { color: var(--c-text-subtle); }
    .small { font-size: 13px; }
    .grid {
      display: grid;
      grid-template-columns: 1.4fr 1.4fr 0.9fr 0.7fr;
      gap: 8px;
      align-items: center;
      padding: 6px 4px;
    }
    .head { font-size: 12px; color: var(--c-text-subtle); border-bottom: 1px solid var(--c-border-subtle); }
    .row { border-bottom: 1px solid var(--c-border-subtle); background: var(--c-surface); }
    .row:last-child { border-bottom: none; }
    .actions { display: flex; justify-content: flex-end; margin-top: 16px; }
  `],
})
export class ManagePresetFieldsDialogComponent implements OnInit {
  api = inject(ApiService);
  toast = inject(ToastService);

  rows = signal<PresetState[]>([]);
  loading = signal(false);
  /** Set to true when at least one toggle persisted a change. */
  dirty = signal(false);

  constructor(
    @Inject(NZ_MODAL_DATA) public data: ManagePresetFieldsData,
    private ref: NzModalRef<ManagePresetFieldsDialogComponent, ManagePresetFieldsResult>,
  ) {}

  async ngOnInit() {
    await this.loadPresets();
  }

  private async loadPresets() {
    this.loading.set(true);
    try {
      const presets = await firstValueFrom(this.api.get<PresetField[]>('/preset-fields'));
      this.rows.set(presets.map((p) => this.makeRow(p)));
    } catch (err: any) {
      this.toast.error(err?.error?.message || 'Could not load preset fields');
    } finally {
      this.loading.set(false);
    }
  }

  /** Build a row by matching its preset id against the latest customFields snapshot. */
  private makeRow(p: PresetField): PresetState {
    const fields = this.data.customFields ?? [];
    const match = fields.find((f) => {
      const cfg = parseConfig(f.config);
      return cfg?.preset === true && cfg?.presetId === p.id;
    });
    return { preset: p, matchedFieldId: match?.id ?? null, busy: false };
  }

  async onToggle(row: PresetState, on: boolean) {
    if (row.busy) return;
    this.setRowBusy(row, true);
    try {
      if (on) {
        await this.enable(row);
      } else {
        await this.disable(row);
      }
      this.dirty.set(true);
    } catch (err: any) {
      this.toast.error(err?.error?.message || 'Could not update');
    } finally {
      this.setRowBusy(row, false);
    }
  }

  private async enable(row: PresetState) {
    const p = row.preset;
    const order = this.data.customFields.length;
    const created = await firstValueFrom(
      this.api.post<{ id: string }>(
        `/organizations/${this.data.orgId}/card-types/${this.data.cardTypeId}/fields`,
        {
          name: p.name,
          label: p.label,
          type: p.type,
          required: p.required,
          order,
          config: JSON.stringify({ preset: true, presetId: p.id }),
        },
      ),
    );
    // Track the new field on the local snapshot so subsequent toggles match
    // it, and rebuild rows so the "currently applied" view stays in sync.
    this.data.customFields = [
      ...(this.data.customFields ?? []),
      {
        id: created.id,
        name: p.name,
        label: p.label,
        type: p.type as CustomField['type'],
        required: p.required,
        order,
        config: { preset: true, presetId: p.id },
      },
    ];
    this.rows.update((rs) =>
      rs.map((r) => r.preset.id === p.id ? { ...this.makeRow(r.preset), busy: false } : r),
    );
  }

  private async disable(row: PresetState) {
    if (!row.matchedFieldId) return;
    const removedId = row.matchedFieldId;
    await firstValueFrom(
      this.api.delete(
        `/organizations/${this.data.orgId}/card-types/${this.data.cardTypeId}/fields/${removedId}`,
      ),
    );
    this.data.customFields = (this.data.customFields ?? []).filter((f) => f.id !== removedId);
    this.rows.update((rs) =>
      rs.map((r) => r.preset.id === row.preset.id ? { ...this.makeRow(r.preset), busy: false } : r),
    );
  }

  private setRowBusy(row: PresetState, busy: boolean) {
    this.rows.update((rs) =>
      rs.map((r) => r.preset.id === row.preset.id ? { ...r, busy } : r),
    );
  }

  close() {
    this.ref.close({ dirty: this.dirty() });
  }
}
