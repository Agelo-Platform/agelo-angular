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
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzModalService } from 'ng-zorro-antd/modal';
import { ApiService } from '../../core/api.service';
import { BoardColumn } from './board-flow.component';
import { DialogService } from '../../shared/dialogs/dialog.service';
import { ColumnFormComponent } from './column-form.dialog';

@Component({
  selector: 'app-columns-panel',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DragDropModule,
    NzCardModule, NzButtonModule, NzIconModule, NzInputModule, NzSwitchModule,
    NzToolTipModule, NzEmptyModule,
  ],
  template: `
    <div class="header">
      <div class="muted">
        Columns appear left → right on the kanban board. Drag rows to reorder.
      </div>
      <div class="spacer"></div>
      <button nz-button nzType="primary" (click)="newColumn()">
        <span nz-icon nzType="plus"></span> New column
      </button>
    </div>

    @if (columns.length === 0) {
      <nz-card class="empty">
        <nz-empty
          nzNotFoundImage="simple"
          nzNotFoundContent="No columns yet"
        ></nz-empty>
        <p class="muted center">Add columns like "TODO", "In Progress", "Review", "Done".</p>
      </nz-card>
    } @else {
      <nz-card>
        <div class="cols-list" cdkDropList (cdkDropListDropped)="onReorder($event)">
          @for (c of sorted(); track c.id) {
            <div class="col-row" cdkDrag>
              <button nz-button nzType="text" cdkDragHandle class="drag" nz-tooltip="Drag to reorder">
                <span nz-icon nzType="more"></span>
              </button>
              <input
                nz-input
                class="name-field"
                [value]="c.name"
                (change)="patch(c, { name: $any($event.target).value })"
              />
              <label class="toggle">
                <nz-switch
                  [ngModel]="c.agentCanModerate"
                  (ngModelChange)="patch(c, { agentCanModerate: $event })"
                ></nz-switch>
                Agent moderation
              </label>
              <span class="spacer"></span>
              <button nz-button nzType="text" nzDanger (click)="remove(c)" nz-tooltip="Delete column">
                <span nz-icon nzType="delete"></span>
              </button>
            </div>
          }
        </div>
      </nz-card>
    }
  `,
  styles: [`
    .header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .muted { color: var(--c-text-subtle); font-size: 14px; }
    .center { text-align: center; }
    .spacer { flex: 1; }
    .empty { text-align: center; padding: 36px; }
    .cols-list { display: flex; flex-direction: column; }
    .col-row {
      display: flex; align-items: center; gap: 12px;
      padding: 8px 4px;
      border-bottom: 1px solid var(--c-border-subtle);
      background: var(--c-surface);
    }
    .col-row:last-child { border-bottom: none; }
    .col-row.cdk-drag-preview {
      box-shadow: var(--shadow-overflow) !important;
      border-radius: var(--radius);
      border: 1px solid var(--c-border);
    }
    .drag { color: var(--c-text-subtle); cursor: grab; }
    .name-field { width: 220px; }
    .toggle { display: flex; align-items: center; gap: 8px; font-size: 13px; }
  `],
})
export class ColumnsPanel {
  @Input() orgId = '';
  @Input() projectId = '';
  @Input() columns: BoardColumn[] = [];
  @Output() changed = new EventEmitter<void>();
  api = inject(ApiService);
  modal = inject(NzModalService);
  confirmer = inject(DialogService);

  // Plain method (not a `computed`): inputs are not signals, so a
  // `computed` would never re-evaluate when the parent passes a new array.
  sorted(): BoardColumn[] {
    return [...this.columns].sort((a, b) => a.order - b.order);
  }

  newColumn() {
    const ref = this.modal.create<ColumnFormComponent, any>({
      nzTitle: 'New column',
      nzContent: ColumnFormComponent,
      nzOkText: 'Create',
      nzCancelText: 'Cancel',
      nzOnOk: (instance) => instance.submit(),
    });
    ref.afterClose.subscribe(async (data) => {
      if (!data) return;
      const order = this.columns.length;
      await firstValueFrom(
        this.api.post(`/organizations/${this.orgId}/columns`, {
          name: data.name,
          order,
          agentCanModerate: data.agentCanModerate,
          projectId: this.projectId || undefined,
        }),
      );
      this.changed.emit();
    });
  }

  async patch(c: BoardColumn, patch: Partial<BoardColumn>) {
    await firstValueFrom(this.api.patch(`/organizations/${this.orgId}/columns/${c.id}`, patch));
    this.changed.emit();
  }

  async remove(c: BoardColumn) {
    const ok = await this.confirmer.confirm({
      title: `Delete column "${c.name}"?`,
      message: 'All cards in this column will be deleted along with the column.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    await firstValueFrom(this.api.delete(`/organizations/${this.orgId}/columns/${c.id}`));
    this.changed.emit();
  }

  async onReorder(ev: CdkDragDrop<unknown>) {
    if (ev.previousIndex === ev.currentIndex) return;
    const list = [...this.sorted()];
    moveItemInArray(list, ev.previousIndex, ev.currentIndex);
    await firstValueFrom(
      this.api.patch(`/organizations/${this.orgId}/columns`, {
        ids: list.map((c) => c.id),
        projectId: this.projectId || undefined,
      }),
    );
    this.changed.emit();
  }
}
