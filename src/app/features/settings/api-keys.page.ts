import { Component, OnInit, inject, signal } from '@angular/core';
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
import { NzMessageService } from 'ng-zorro-antd/message';
import { ApiService } from '../../core/api.service';
import { ApiKeyCreateComponent } from './api-key-create.dialog';
import { ApiKeyRevealComponent } from './api-key-reveal.dialog';
import { DialogService } from '../../shared/dialogs/dialog.service';
import { ToastService } from '../../shared/dialogs/toast.service';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  organization: { id: string; title: string; color: string };
}

@Component({
  selector: 'app-settings-api-keys',
  standalone: true,
  imports: [
    CommonModule, DatePipe,
    NzCardModule, NzButtonModule, NzIconModule, NzTableModule, NzTagModule,
    NzToolTipModule, NzEmptyModule,
  ],
  template: `
    <nz-card nzTitle="API keys" [nzExtra]="extraTpl">
      <ng-template #extraTpl>
        <button nz-button nzType="primary" (click)="openCreate()">
          <span nz-icon nzType="plus"></span> New key
        </button>
      </ng-template>
      <p class="muted small">
        Authenticate AI agents and the MCP server. Keys are scoped to an organization.
      </p>

      @if (keys().length) {
        <nz-table [nzData]="keys()" nzSize="small" [nzShowPagination]="false">
          <thead>
            <tr>
              <th>Name</th>
              <th>Prefix</th>
              <th>Status</th>
              <th>Created</th>
              <th>Last used</th>
              <th class="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (k of keys(); track k.id) {
              <tr>
                <td>
                  <div class="bold">{{ k.name }}</div>
                  <div class="muted small">
                    <span class="dot" [style.background]="k.organization?.color"></span>
                    {{ k.organization?.title }}
                  </div>
                </td>
                <td><code class="mono">{{ k.prefix }}…</code></td>
                <td>
                  @if (k.isActive) {
                    <nz-tag nzColor="success">Active</nz-tag>
                  } @else {
                    <nz-tag nzColor="error">Disabled</nz-tag>
                  }
                </td>
                <td>{{ k.createdAt | date:'mediumDate' }}</td>
                <td>{{ k.lastUsedAt ? (k.lastUsedAt | date:'short') : '—' }}</td>
                <td class="actions-col">
                  <button
                    nz-button
                    nzType="text"
                    [attr.aria-label]="k.isActive ? 'Disable key' : 'Enable key'"
                    [nz-tooltip]="k.isActive ? 'Disable key' : 'Enable key'"
                    (click)="toggle(k)"
                  >
                    <span nz-icon [nzType]="k.isActive ? 'pause-circle' : 'play-circle'"></span>
                  </button>
                  <button
                    nz-button
                    nzType="text"
                    nzDanger
                    aria-label="Revoke key"
                    nz-tooltip="Revoke key"
                    (click)="revoke(k)"
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
          nzNotFoundContent="No API keys yet"
        ></nz-empty>
      }
    </nz-card>
  `,
  styles: [`
    .card-head-row {
      display: flex; align-items: center; gap: 12px;
      padding: 0 0 16px; margin-bottom: 8px;
      border-bottom: 1px solid var(--c-border-subtle);
    }
    .card-head-row h3 { margin: 0; }
    .card-head-row .muted { margin: 0; }
    .spacer { flex: 1; }
    .bold { font-weight: 500; }
    .small { font-size: 12px; }
    .muted { color: var(--c-text-subtle); }
    .dot {
      display: inline-block; width: 8px; height: 8px;
      border-radius: 2px; margin-right: 4px;
      vertical-align: middle;
      border: 1px solid var(--c-border);
    }
    .actions-col { width: 110px; text-align: right; }
  `],
})
export class SettingsApiKeysPage implements OnInit {
  api = inject(ApiService);
  modal = inject(NzModalService);
  confirmer = inject(DialogService);
  toast = inject(ToastService);
  message = inject(NzMessageService);

  keys = signal<ApiKey[]>([]);

  async ngOnInit() { await this.refresh(); }

  async refresh() {
    const list = await firstValueFrom(this.api.get<ApiKey[]>('/settings/api-keys'));
    this.keys.set(list);
  }

  openCreate() {
    const ref = this.modal.create<ApiKeyCreateComponent, any>({
      nzTitle: 'Generate API key',
      nzContent: ApiKeyCreateComponent,
      nzWidth: 480,
      nzOkText: 'Generate',
      nzCancelText: 'Cancel',
      nzOnOk: (instance) => instance.submit(),
    });
    ref.afterClose.subscribe(async (res: any) => {
      if (res?.rawKey) {
        // Show the raw key in a dedicated reveal modal with a copy button.
        const reveal = this.modal.create<ApiKeyRevealComponent, void>({
          nzTitle: 'Copy this key now',
          nzContent: ApiKeyRevealComponent,
          nzData: { name: res.name, rawKey: res.rawKey } as any,
          nzWidth: 560,
          nzFooter: null,
          nzMaskClosable: false,
          nzWrapClassName: 'app-key-reveal-modal',
        });
        await reveal.afterClose.toPromise();
        await this.refresh();
      }
    });
  }

  async toggle(k: ApiKey) {
    await firstValueFrom(
      this.api.patch(`/settings/api-keys/${k.id}`, { isActive: !k.isActive }),
    );
    await this.refresh();
  }

  async revoke(k: ApiKey) {
    const ok = await this.confirmer.confirm({
      title: 'Revoke API key',
      message: `Revoke "${k.name}"? Any agent using this key will be denied immediately.`,
      confirmLabel: 'Revoke',
      destructive: true,
    });
    if (!ok) return;
    await firstValueFrom(this.api.delete(`/settings/api-keys/${k.id}`));
    await this.refresh();
  }
}
