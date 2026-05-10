import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzModalService } from 'ng-zorro-antd/modal';
import { ApiService } from '../../core/api.service';
import { DialogService } from '../../shared/dialogs/dialog.service';
import { ToastService } from '../../shared/dialogs/toast.service';
import { ShortcutListenerService, Shortcut } from '../../core/shortcut-listener.service';
import {
  ShortcutFormComponent,
  ShortcutFormData,
  ShortcutFormResult,
} from './shortcut-form.dialog';

@Component({
  selector: 'app-settings-shortcuts',
  standalone: true,
  imports: [
    CommonModule, DatePipe,
    NzCardModule, NzButtonModule, NzIconModule, NzTableModule, NzTagModule,
    NzToolTipModule, NzEmptyModule,
  ],
  template: `
    <nz-card nzTitle="Shortcuts" [nzExtra]="extraTpl">
      <ng-template #extraTpl>
        <button nz-button nzType="primary" (click)="openCreate()">
          <span nz-icon nzType="plus"></span> New shortcut
        </button>
      </ng-template>
      <p class="muted small">
        Keyboard shortcuts to navigate the portal. Use combos like
        <code>ctrl+shift+b</code> for a single chord, or
        <code>ctrl+b o</code> for a multi-step chord.
      </p>

      @if (shortcuts().length) {
        <nz-table [nzData]="shortcuts()" nzSize="small" [nzShowPagination]="false">
          <thead>
            <tr>
              <th>Key</th>
              <th>Action</th>
              <th>Target</th>
              <th>Label</th>
              <th>Created</th>
              <th class="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (s of shortcuts(); track s.id) {
              <tr>
                <td><code class="mono">{{ s.key }}</code></td>
                <td><nz-tag>{{ s.action }}</nz-tag></td>
                <td><code class="mono">{{ s.target }}</code></td>
                <td>{{ s.label || '—' }}</td>
                <td>{{ s.createdAt | date:'mediumDate' }}</td>
                <td class="actions-col">
                  <button
                    nz-button
                    nzType="text"
                    (click)="openEdit(s)"
                    nz-tooltip="Edit shortcut"
                    aria-label="Edit shortcut"
                  >
                    <span nz-icon nzType="edit"></span>
                  </button>
                  <button
                    nz-button
                    nzType="text"
                    nzDanger
                    (click)="remove(s)"
                    nz-tooltip="Delete shortcut"
                    aria-label="Delete shortcut"
                  >
                    <span nz-icon nzType="delete"></span>
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </nz-table>
      } @else {
        <nz-empty
          nzNotFoundImage="simple"
          nzNotFoundContent="No shortcuts yet"
        ></nz-empty>
      }
    </nz-card>
  `,
  styles: [`
    .small { font-size: 12px; }
    .muted { color: var(--c-text-subtle); }
    .actions-col { width: 110px; text-align: right; }
  `],
})
export class SettingsShortcutsPage implements OnInit {
  api = inject(ApiService);
  modal = inject(NzModalService);
  confirmer = inject(DialogService);
  toast = inject(ToastService);
  listener = inject(ShortcutListenerService);

  /** Bound directly to the global signal so the table refreshes after edits. */
  shortcuts = computed(() => this.listener.shortcuts());

  async ngOnInit() {
    await this.listener.refresh();
  }

  openCreate() {
    const ref = this.modal.create<ShortcutFormComponent, ShortcutFormResult>({
      nzTitle: 'New shortcut',
      nzContent: ShortcutFormComponent,
      nzData: { } as ShortcutFormData as any,
      nzWidth: 560,
      nzOkText: 'Create',
      nzCancelText: 'Cancel',
      nzOnOk: (instance) => instance.submit(),
    });
    ref.afterClose.subscribe(async (data) => {
      if (!data) return;
      try {
        await firstValueFrom(this.api.post('/settings/shortcuts', data));
        this.toast.success('Shortcut created');
        await this.listener.refresh();
      } catch (err: any) {
        this.toast.error(err?.error?.message || 'Could not create shortcut');
      }
    });
  }

  openEdit(s: Shortcut) {
    const ref = this.modal.create<ShortcutFormComponent, ShortcutFormResult>({
      nzTitle: 'Edit shortcut',
      nzContent: ShortcutFormComponent,
      nzData: { shortcut: s } as ShortcutFormData as any,
      nzWidth: 560,
      nzOkText: 'Save changes',
      nzCancelText: 'Cancel',
      nzOnOk: (instance) => instance.submit(),
    });
    ref.afterClose.subscribe(async (data) => {
      if (!data) return;
      try {
        await firstValueFrom(this.api.patch(`/settings/shortcuts/${s.id}`, data));
        this.toast.success('Shortcut updated');
        await this.listener.refresh();
      } catch (err: any) {
        this.toast.error(err?.error?.message || 'Could not update shortcut');
      }
    });
  }

  async remove(s: Shortcut) {
    const ok = await this.confirmer.confirm({
      title: 'Delete shortcut',
      message: `Remove the shortcut "${s.key}"?`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await firstValueFrom(this.api.delete(`/settings/shortcuts/${s.id}`));
      await this.listener.refresh();
    } catch (err: any) {
      this.toast.error(err?.error?.message || 'Could not delete shortcut');
    }
  }
}
