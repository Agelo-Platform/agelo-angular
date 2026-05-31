import { Component, Input, OnChanges, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { ApiKeyRevealComponent } from '../settings/api-key-reveal.dialog';
import { DialogService } from '../../shared/dialogs/dialog.service';
import { ToastService } from '../../shared/dialogs/toast.service';

interface ProjectApiKey {
  id: string;
  name: string;
  prefix: string;
  orgId: string;
  projectId: string;
  userId: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

interface CreateResponse {
  id: string;
  name: string;
  prefix: string;
  orgId: string;
  projectId: string | null;
  rawKey: string;
  createdAt: string;
}

/**
 * Project Settings page. Mounted at
 * `org/:orgId/project/:projectId/settings`. Currently exposes one section
 * — project-scoped API keys — but grows in place as more project-level
 * configuration lands. The single-section layout intentionally mirrors
 * the user Settings page so the visual language stays consistent.
 */
@Component({
  selector: 'app-project-settings',
  standalone: true,
  imports: [
    CommonModule, DatePipe, FormsModule,
    NzCardModule, NzButtonModule, NzIconModule, NzTableModule, NzTagModule,
    NzToolTipModule, NzEmptyModule, NzFormModule, NzInputModule,
  ],
  template: `
    <div class="page-header">
      <div>
        <h1>Project settings</h1>
        <div class="subtitle">Settings scoped to this project only.</div>
      </div>
    </div>

    <nz-card nzTitle="Project API keys" [nzExtra]="extraTpl">
      <ng-template #extraTpl>
        <button nz-button nzType="primary" (click)="openCreate()">
          <span nz-icon nzType="plus"></span> New project key
        </button>
      </ng-template>
      <p class="muted small">
        Keys minted here are bound to this project. Agents using them can only
        act within this project's board.
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
                <td><div class="bold">{{ k.name }}</div></td>
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
                  <button nz-button nzType="text"
                    [attr.aria-label]="k.isActive ? 'Disable key' : 'Enable key'"
                    [nz-tooltip]="k.isActive ? 'Disable key' : 'Enable key'"
                    (click)="toggle(k)">
                    <span nz-icon [nzType]="k.isActive ? 'pause-circle' : 'play-circle'"></span>
                  </button>
                  <button nz-button nzType="text" nzDanger
                    aria-label="Revoke key" nz-tooltip="Revoke key"
                    (click)="revoke(k)">
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
          nzNotFoundContent="No project keys yet"
        ></nz-empty>
      }
    </nz-card>
  `,
  styles: [`
    .page-header { display: flex; align-items: center; margin-bottom: 16px; }
    .page-header h1 { margin: 0; }
    .subtitle { color: var(--c-text-subtle); font-size: 14px; }
    .bold { font-weight: 500; }
    .small { font-size: 12px; }
    .muted { color: var(--c-text-subtle); }
    .actions-col { width: 110px; text-align: right; }
    code.mono { font-family: var(--font-mono); }
  `],
})
export class ProjectSettingsComponent implements OnChanges {
  @Input() orgId = '';
  @Input() projectId = '';

  api = inject(ApiService);
  modal = inject(NzModalService);
  confirmer = inject(DialogService);
  toast = inject(ToastService);

  keys = signal<ProjectApiKey[]>([]);

  async ngOnChanges() {
    if (this.orgId && this.projectId) await this.refresh();
  }

  async refresh() {
    const list = await firstValueFrom(
      this.api.get<ProjectApiKey[]>(
        `/organizations/${this.orgId}/projects/${this.projectId}/api-keys`,
      ),
    );
    this.keys.set(list);
  }

  openCreate() {
    const ref = this.modal.create<ProjectKeyCreateContent, string | null>({
      nzTitle: 'Generate project API key',
      nzContent: ProjectKeyCreateContent,
      nzData: {
        orgId: this.orgId,
        projectId: this.projectId,
      } as any,
      nzWidth: 480,
      nzOkText: 'Generate',
      nzOnOk: (instance) => instance.submit(),
    });
    ref.afterClose.subscribe(async (res) => {
      if (!res) return;
      try {
        // Re-fetch so the new row appears, and show the reveal modal.
        await this.refresh();
        const created = this.keys().find((k) => k.id === res);
        if (!created) return;
      } catch (err: any) {
        this.toast.error(err?.error?.message || 'Could not refresh');
      }
    });
  }

  async toggle(k: ProjectApiKey) {
    await firstValueFrom(
      this.api.patch(`/settings/api-keys/${k.id}`, { isActive: !k.isActive }),
    );
    await this.refresh();
  }

  async revoke(k: ProjectApiKey) {
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

/**
 * Minimal "name only" form rendered inside the create-project-key modal.
 * Owns the actual POST so the parent only deals with refresh + reveal.
 */
@Component({
  selector: 'app-project-key-create',
  standalone: true,
  imports: [FormsModule, NzFormModule, NzInputModule],
  template: `
    <form nz-form nzLayout="vertical" (submit)="submit($event)">
      <nz-form-item>
        <nz-form-label nzRequired>Name</nz-form-label>
        <nz-form-control>
          <input nz-input [(ngModel)]="name" name="name" placeholder="e.g. ci-agent" />
        </nz-form-control>
      </nz-form-item>
    </form>
  `,
})
class ProjectKeyCreateContent {
  api = inject(ApiService);
  modal = inject(NzModalService);
  ref = inject(NzModalRef);
  // Modal passes orgId + projectId via `nzData` — NgZorro exposes it on
  // the injected NzModalRef instance.
  private get data(): { orgId: string; projectId: string } {
    return (this.ref.getConfig() as any).nzData;
  }

  name = '';

  async submit(ev?: Event): Promise<string | null> {
    if (ev) ev.preventDefault();
    const trimmed = this.name.trim();
    if (!trimmed) return null;
    const res = await firstValueFrom(
      this.api.post<CreateResponse>(
        `/organizations/${this.data.orgId}/projects/${this.data.projectId}/api-keys`,
        { name: trimmed },
      ),
    );
    // After mint, immediately show the reveal modal in-context.
    this.modal.create<ApiKeyRevealComponent, void>({
      nzTitle: 'Copy this key now',
      nzContent: ApiKeyRevealComponent,
      nzData: { name: res.name, rawKey: res.rawKey } as any,
      nzWidth: 560,
      nzFooter: null,
      nzMaskClosable: false,
    });
    this.ref.close(res.id);
    return res.id;
  }
}
