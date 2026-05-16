import {
  Component, EventEmitter, Input, Output, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import {
  CdkDragDrop, DragDropModule, moveItemInArray,
} from '@angular/cdk/drag-drop';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzModalService } from 'ng-zorro-antd/modal';
import { ApiService } from '../../core/api.service';
import { CardType, CustomField } from './board-flow.component';
import { DialogService } from '../../shared/dialogs/dialog.service';
import { ToastService } from '../../shared/dialogs/toast.service';
import { CardTypeFormComponent } from './card-type-form.dialog';
import { CardTypeRenameComponent } from './card-type-rename.dialog';
import { CustomFieldFormComponent } from './custom-field-form.dialog';
import {
  ManagePresetFieldsDialogComponent,
  ManagePresetFieldsData,
  ManagePresetFieldsResult,
} from './manage-preset-fields.dialog';

@Component({
  selector: 'app-card-types-panel',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DragDropModule,
    NzCardModule, NzButtonModule, NzIconModule, NzTagModule, NzSwitchModule,
    NzTableModule, NzCollapseModule, NzToolTipModule, NzEmptyModule,
  ],
  template: `
    <div class="header">
      <div class="muted">Card types are templates for the work items SAs and agents create.</div>
      <div class="spacer"></div>
      <button nz-button nzType="primary" (click)="newType()">
        <span nz-icon nzType="plus"></span> New card type
      </button>
    </div>

    @if (cardTypes.length === 0) {
      <nz-card class="empty">
        <nz-empty
          nzNotFoundImage="simple"
          nzNotFoundContent="No card types yet"
        ></nz-empty>
        <p class="muted center">Create types like "Feature", "User Story", or "Task" to get started.</p>
      </nz-card>
    }

    <div class="types-list">
      @for (t of cardTypes; track t.id) {
        <nz-card class="type-card" [nzTitle]="titleTpl" [nzExtra]="extraTpl">
          <ng-template #titleTpl>
            <span class="type-title">{{ t.name | titlecase }}</span>
            <button
              nz-button
              nzType="text"
              nzSize="small"
              class="rename-btn"
              (click)="rename(t)"
              nz-tooltip="Rename card type"
              type="button"
            >
              <span nz-icon nzType="edit"></span>
            </button>
          </ng-template>
          <ng-template #extraTpl>
            <button nz-button nzType="text" (click)="clone(t)" nz-tooltip="Clone card type" type="button">
              <span nz-icon nzType="copy"></span>
            </button>
            <button nz-button nzType="text" nzDanger (click)="remove(t)" nz-tooltip="Delete card type">
              <span nz-icon nzType="delete"></span>
            </button>
          </ng-template>
          <div class="toggles">
            <label>
              <nz-switch [ngModel]="t.commentsEnabled" (ngModelChange)="patch(t, { commentsEnabled: $event })"></nz-switch>
              Comments enabled
            </label>
            <label>
              <nz-switch [ngModel]="t.agentPickupEnabled" (ngModelChange)="patch(t, { agentPickupEnabled: $event })"></nz-switch>
              Agent pickup enabled
            </label>
          </div>

          <nz-collapse class="fields-panel">
            <nz-collapse-panel
              nzHeader="Custom fields"
              [nzActive]="t.customFields.length > 0"
            >
              @if (t.customFields.length) {
                <div class="fields-grid head">
                  <div></div>
                  <div>Name</div>
                  <div>Label</div>
                  <div>Type</div>
                  <div>Required</div>
                  <div></div>
                  <div></div>
                </div>
                <div class="fields-list" cdkDropList (cdkDropListDropped)="onFieldReorder(t, $event)">
                  @for (f of t.customFields; track f.id) {
                    <div class="fields-grid field-row" cdkDrag>
                      <button nz-button nzType="text" cdkDragHandle class="drag" nz-tooltip="Drag to reorder" type="button">
                        <span nz-icon nzType="more"></span>
                      </button>
                      <div>
                        <code class="mono">{{ f.name }}</code>
                        @if (isPresetDerived(f)) {
                          <nz-tag class="preset-tag" nzColor="blue">preset</nz-tag>
                        }
                      </div>
                      <div>{{ f.label }}</div>
                      <div><nz-tag>{{ f.type }}</nz-tag></div>
                      <div>
                        @if (f.required) {
                          <span nz-icon nzType="check" class="primary"></span>
                        } @else {
                          <span class="muted">—</span>
                        }
                      </div>
                      <div>
                        @if (isPresetDerived(f)) {
                          <button
                            nz-button
                            nzType="text"
                            [disabled]="true"
                            nz-tooltip="Use the Preset Fields section to edit this preset field"
                            type="button"
                          >
                            <span nz-icon nzType="edit"></span>
                          </button>
                        } @else {
                          <button
                            nz-button
                            nzType="text"
                            (click)="editField(t, f)"
                            nz-tooltip="Edit field"
                            type="button"
                          >
                            <span nz-icon nzType="edit"></span>
                          </button>
                        }
                      </div>
                      <div>
                        <button nz-button nzType="text" nzDanger (click)="removeField(t, f)" nz-tooltip="Delete field" type="button">
                          <span nz-icon nzType="delete"></span>
                        </button>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <p class="muted">No fields yet.</p>
              }

              <div class="field-actions">
                <button nz-button (click)="addField(t)">
                  <span nz-icon nzType="plus"></span> Add field
                </button>
                <button nz-button (click)="managePresets(t)">
                  <span nz-icon nzType="appstore"></span> Manage preset fields
                </button>
              </div>
            </nz-collapse-panel>
          </nz-collapse>
        </nz-card>
      }
    </div>
  `,
  styles: [`
    .header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .spacer { flex: 1; }
    .muted { color: var(--c-text-subtle); font-size: 14px; }
    .center { text-align: center; }
    .empty { text-align: center; padding: 36px; }

    .types-list { display: flex; flex-direction: column; gap: 16px; }
    .toggles {
      display: flex; gap: 24px; flex-wrap: wrap;
      padding: 8px 0 12px;
    }
    .toggles label { display: flex; align-items: center; gap: 8px; }
    .order-col { width: 80px; }
    .actions-col { width: 48px; text-align: right; }
    .primary { color: var(--c-primary); }
    .field-actions { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
    .type-title { font-weight: 500; }
    .rename-btn { margin-left: 4px; color: var(--c-text-subtle); }
    .preset-tag { margin-left: 6px; font-size: 10px; }
    .fields-grid {
      display: grid;
      grid-template-columns: 36px 1.4fr 1.4fr 0.9fr 0.7fr 48px 48px;
      gap: 8px;
      align-items: center;
      padding: 6px 4px;
    }
    .fields-grid.head { font-size: 12px; color: var(--c-text-subtle); border-bottom: 1px solid var(--c-border-subtle); }
    .field-row { border-bottom: 1px solid var(--c-border-subtle); background: var(--c-surface); }
    .field-row:last-child { border-bottom: none; }
    .field-row.cdk-drag-preview {
      box-shadow: var(--shadow-overflow) !important;
      border-radius: var(--radius);
      border: 1px solid var(--c-border);
    }
    .drag { color: var(--c-text-subtle); cursor: grab; }
  `],
})
export class CardTypesPanel {
  @Input() orgId = '';
  @Input() projectId = '';
  @Input() cardTypes: CardType[] = [];
  @Output() changed = new EventEmitter<void>();

  api = inject(ApiService);
  modal = inject(NzModalService);
  toast = inject(ToastService);
  confirmer = inject(DialogService);

  /** True when the field's config indicates it was created from a preset. */
  isPresetDerived(f: CustomField): boolean {
    const cfg = this.parseConfig(f.config);
    return !!(cfg && cfg.preset === true);
  }

  private parseConfig(raw: unknown): { preset?: boolean; presetId?: string } | null {
    if (!raw) return null;
    if (typeof raw === 'object') return raw as any;
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch { return null; }
    }
    return null;
  }

  newType() {
    const ref = this.modal.create<CardTypeFormComponent, string>({
      nzTitle: 'New card type',
      nzContent: CardTypeFormComponent,
      nzOkText: 'Create',
      nzCancelText: 'Cancel',
      nzOnOk: (instance) => instance.submit(),
    });
    ref.afterClose.subscribe(async (name) => {
      if (!name) return;
      try {
        await firstValueFrom(
          this.api.post(`/organizations/${this.orgId}/card-types`, {
            name,
            projectId: this.projectId || undefined,
          }),
        );
        this.changed.emit();
      } catch (err: any) {
        this.toast.error(err?.error?.message || 'Could not create');
      }
    });
  }

  rename(t: CardType) {
    const ref = this.modal.create<CardTypeRenameComponent, string>({
      nzTitle: `Rename card type`,
      nzContent: CardTypeRenameComponent,
      nzData: { name: t.name } as any,
      nzOkText: 'Save',
      nzCancelText: 'Cancel',
      nzOnOk: (instance) => instance.submit(),
    });
    ref.afterClose.subscribe(async (name) => {
      if (!name || name === t.name) return;
      try {
        await firstValueFrom(
          this.api.patch(`/organizations/${this.orgId}/card-types/${t.id}`, { name }),
        );
        this.toast.success('Card type renamed');
        this.changed.emit();
      } catch (err: any) {
        this.toast.error(err?.error?.message || 'Could not rename');
      }
    });
  }

  clone(t: CardType) {
    const defaultName = `${t.name}_Copy`;
    const ref = this.modal.create<CardTypeRenameComponent, string>({
      nzTitle: `Clone card type "${t.name}"`,
      nzContent: CardTypeRenameComponent,
      nzData: { name: defaultName } as any,
      nzOkText: 'Clone',
      nzCancelText: 'Cancel',
      nzOnOk: (instance) => instance.submit(),
    });
    ref.afterClose.subscribe(async (name) => {
      if (!name) return;
      try {
        await firstValueFrom(
          this.api.post(`/organizations/${this.orgId}/card-types/${t.id}/clone`, { name }),
        );
        this.toast.success(`"${t.name}" cloned`);
        this.changed.emit();
      } catch (err: any) {
        this.toast.error(err?.error?.message || 'Could not clone card type');
      }
    });
  }

  async remove(t: CardType) {
    const ok = await this.confirmer.confirm({
      title: `Delete card type "${t.name}"?`,
      message: 'All cards of this type, their fields and comments will be deleted.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    await firstValueFrom(this.api.delete(`/organizations/${this.orgId}/card-types/${t.id}`));
    this.changed.emit();
  }

  async patch(t: CardType, patch: Partial<CardType>) {
    await firstValueFrom(this.api.patch(`/organizations/${this.orgId}/card-types/${t.id}`, patch));
    this.changed.emit();
  }

  addField(t: CardType) {
    const ref = this.modal.create<CustomFieldFormComponent, any>({
      nzTitle: `Add custom field to "${t.name}"`,
      nzContent: CustomFieldFormComponent,
      nzWidth: 560,
      nzOkText: 'Add field',
      nzCancelText: 'Cancel',
      nzOnOk: (instance) => instance.submit(),
    });
    ref.componentInstance!.typeName = t.name;
    ref.afterClose.subscribe(async (data) => {
      if (!data) return;
      try {
        await firstValueFrom(
          this.api.post(`/organizations/${this.orgId}/card-types/${t.id}/fields`, {
            ...data,
            order: t.customFields.length,
          }),
        );
        this.changed.emit();
      } catch (err: any) {
        this.toast.error(err?.error?.message || 'Could not add field');
      }
    });
  }

  editField(t: CardType, f: CustomField) {
    if (this.isPresetDerived(f)) return;
    const ref = this.modal.create<CustomFieldFormComponent, any>({
      nzTitle: `Edit field "${f.label}"`,
      nzContent: CustomFieldFormComponent,
      nzWidth: 560,
      nzOkText: 'Save changes',
      nzCancelText: 'Cancel',
      nzOnOk: (instance) => instance.submit(),
    });
    ref.componentInstance!.typeName = t.name;
    ref.componentInstance!.field = {
      id: f.id, name: f.name, label: f.label, type: f.type, required: f.required,
    };
    ref.afterClose.subscribe(async (data) => {
      if (!data) return;
      try {
        await firstValueFrom(
          this.api.patch(
            `/organizations/${this.orgId}/card-types/${t.id}/fields/${f.id}`,
            data,
          ),
        );
        this.toast.success('Field updated');
        this.changed.emit();
      } catch (err: any) {
        this.toast.error(err?.error?.message || 'Could not update field');
      }
    });
  }

  managePresets(t: CardType) {
    const ref = this.modal.create<ManagePresetFieldsDialogComponent, ManagePresetFieldsResult>({
      nzTitle: `Manage preset fields for "${t.name}"`,
      nzContent: ManagePresetFieldsDialogComponent,
      nzData: {
        orgId: this.orgId,
        cardTypeId: t.id,
        cardTypeName: t.name,
        customFields: t.customFields,
      } as ManagePresetFieldsData as any,
      nzWidth: 720,
      nzFooter: null,
      nzMaskClosable: false,
      // If the user dismisses via the X button, ensure the parent still sees
      // the dirty flag so it can refresh.
      nzOnCancel: (instance) => instance.close(),
    });
    ref.afterClose.subscribe((result) => {
      if (result?.dirty) this.changed.emit();
    });
  }

  async removeField(t: CardType, f: CustomField) {
    const ok = await this.confirmer.confirm({
      title: `Delete field "${f.label}"?`,
      message: 'All values stored under this field will be deleted.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    await firstValueFrom(
      this.api.delete(`/organizations/${this.orgId}/card-types/${t.id}/fields/${f.id}`),
    );
    this.changed.emit();
  }

  async onFieldReorder(t: CardType, ev: CdkDragDrop<unknown>) {
    if (ev.previousIndex === ev.currentIndex) return;
    const list = [...t.customFields];
    moveItemInArray(list, ev.previousIndex, ev.currentIndex);
    await firstValueFrom(
      this.api.patch(`/organizations/${this.orgId}/card-types/${t.id}/fields`, {
        ids: list.map((f) => f.id),
      }),
    );
    this.changed.emit();
  }
}
