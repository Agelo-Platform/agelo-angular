import {
  ChangeDetectionStrategy, Component, OnInit, inject, signal,
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
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzModalService } from 'ng-zorro-antd/modal';
import { ApiService } from '../../core/api.service';
import { DialogService } from '../../shared/dialogs/dialog.service';
import { ToastService } from '../../shared/dialogs/toast.service';
import { CustomFieldFormComponent } from './custom-field-form.dialog';

interface PresetField {
  id: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  order: number;
  config?: any;
}

@Component({
  selector: 'app-preset-fields-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, DragDropModule,
    NzCardModule, NzButtonModule, NzIconModule, NzTagModule,
    NzToolTipModule, NzEmptyModule,
  ],
  template: `
    <div class="header">
      <div class="muted">
        Preset fields are reusable field templates that any card type can opt
        into via "Manage preset fields". Editing here updates the master.
      </div>
      <div class="spacer"></div>
      <button nz-button nzType="primary" (click)="openCreate()">
        <span nz-icon nzType="plus"></span> New preset
      </button>
    </div>

    @if (presets().length === 0) {
      <nz-card class="empty">
        <nz-empty
          nzNotFoundImage="simple"
          nzNotFoundContent="No preset fields yet"
        ></nz-empty>
        <p class="muted center">
          Define presets like "Acceptance criteria" or "Demo URL" once, and
          reuse them across card types.
        </p>
      </nz-card>
    } @else {
      <nz-card>
        <div class="grid head">
          <div></div>
          <div>Name</div>
          <div>Label</div>
          <div>Type</div>
          <div>Required</div>
          <div>Edit</div>
          <div>Delete</div>
        </div>
        <div class="list" cdkDropList (cdkDropListDropped)="onReorder($event)">
          @for (p of presets(); track p.id) {
            <div class="grid row" cdkDrag>
              <button nz-button nzType="text" cdkDragHandle class="drag" nz-tooltip="Drag to reorder" type="button">
                <span nz-icon nzType="more"></span>
              </button>
              <div><code class="mono">{{ p.name }}</code></div>
              <div>{{ p.label }}</div>
              <div><nz-tag>{{ p.type }}</nz-tag></div>
              <div>
                @if (p.required) {
                  <span nz-icon nzType="check" class="primary"></span>
                } @else {
                  <span class="muted">—</span>
                }
              </div>
              <div>
                <button nz-button nzType="text" (click)="openEdit(p)" nz-tooltip="Edit preset" type="button">
                  <span nz-icon nzType="edit"></span>
                </button>
              </div>
              <div>
                <button nz-button nzType="text" nzDanger (click)="remove(p)" nz-tooltip="Delete preset" type="button">
                  <span nz-icon nzType="delete"></span>
                </button>
              </div>
            </div>
          }
        </div>
      </nz-card>
    }
  `,
  styles: [`
    .header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .spacer { flex: 1; }
    .muted { color: var(--c-text-subtle); font-size: 14px; }
    .center { text-align: center; }
    .empty { text-align: center; padding: 36px; }
    .primary { color: var(--c-primary); }
    .grid {
      display: grid;
      grid-template-columns: 36px 1.4fr 1.4fr 0.9fr 0.7fr 56px 56px;
      gap: 8px;
      align-items: center;
      padding: 6px 4px;
    }
    .head { font-size: 12px; color: var(--c-text-subtle); border-bottom: 1px solid var(--c-border-subtle); }
    .row { border-bottom: 1px solid var(--c-border-subtle); background: var(--c-surface); }
    .row:last-child { border-bottom: none; }
    .row.cdk-drag-preview {
      box-shadow: var(--shadow-overflow) !important;
      border-radius: var(--radius);
      border: 1px solid var(--c-border);
    }
    .drag { color: var(--c-text-subtle); cursor: grab; }
  `],
})
export class PresetFieldsPanel implements OnInit {
  api = inject(ApiService);
  modal = inject(NzModalService);
  toast = inject(ToastService);
  confirmer = inject(DialogService);

  presets = signal<PresetField[]>([]);

  async ngOnInit() {
    await this.refresh();
  }

  async refresh() {
    try {
      const list = await firstValueFrom(this.api.get<PresetField[]>('/preset-fields'));
      list.sort((a, b) => a.order - b.order);
      this.presets.set(list);
    } catch (err: any) {
      this.toast.error(err?.error?.message || 'Could not load preset fields');
    }
  }

  openCreate() {
    const ref = this.modal.create<CustomFieldFormComponent, any>({
      nzTitle: 'New preset field',
      nzContent: CustomFieldFormComponent,
      nzWidth: 560,
      nzOkText: 'Create preset',
      nzCancelText: 'Cancel',
      nzOnOk: (instance) => instance.submit(),
    });
    ref.componentInstance!.mode = 'preset';
    ref.afterClose.subscribe(async (data) => {
      if (!data) return;
      try {
        await firstValueFrom(
          this.api.post('/preset-fields', {
            ...data,
            order: this.presets().length,
          }),
        );
        this.toast.success('Preset created');
        await this.refresh();
      } catch (err: any) {
        this.toast.error(err?.error?.message || 'Could not create preset');
      }
    });
  }

  openEdit(p: PresetField) {
    const ref = this.modal.create<CustomFieldFormComponent, any>({
      nzTitle: `Edit preset "${p.label}"`,
      nzContent: CustomFieldFormComponent,
      nzWidth: 560,
      nzOkText: 'Save changes',
      nzCancelText: 'Cancel',
      nzOnOk: (instance) => instance.submit(),
    });
    ref.componentInstance!.mode = 'preset';
    ref.componentInstance!.field = {
      id: p.id, name: p.name, label: p.label, type: p.type, required: p.required,
    };
    ref.afterClose.subscribe(async (data) => {
      if (!data) return;
      try {
        await firstValueFrom(this.api.patch(`/preset-fields/${p.id}`, data));
        this.toast.success('Preset updated');
        await this.refresh();
      } catch (err: any) {
        this.toast.error(err?.error?.message || 'Could not update preset');
      }
    });
  }

  async remove(p: PresetField) {
    const ok = await this.confirmer.confirm({
      title: `Delete preset "${p.label}"?`,
      message:
        'This deletes only the master preset. Card-type fields previously created from it remain on those card types.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await firstValueFrom(this.api.delete(`/preset-fields/${p.id}`));
      await this.refresh();
    } catch (err: any) {
      this.toast.error(err?.error?.message || 'Could not delete preset');
    }
  }

  async onReorder(ev: CdkDragDrop<unknown>) {
    if (ev.previousIndex === ev.currentIndex) return;
    const list = [...this.presets()];
    moveItemInArray(list, ev.previousIndex, ev.currentIndex);
    // Optimistic update so the row stays at its new position
    this.presets.set(list);
    try {
      await firstValueFrom(
        this.api.patch('/preset-fields', { ids: list.map((p) => p.id) }),
      );
      await this.refresh();
    } catch (err: any) {
      this.toast.error(err?.error?.message || 'Could not reorder');
      await this.refresh();
    }
  }
}
