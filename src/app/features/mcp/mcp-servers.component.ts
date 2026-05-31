import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { ApiService } from '../../core/api.service';
import { DialogService } from '../../shared/dialogs/dialog.service';
import { ToastService } from '../../shared/dialogs/toast.service';
import { McpServerFormComponent } from './mcp-server-form.dialog';

interface McpServer {
  id: string;
  title: string;
  description: string;
  registryUrl: string;
  githubUrl: string;
  regularConfig: string;
  dockerConfig: string;
  createdAt: string;
}

@Component({
  selector: 'app-mcp-servers',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    NzCardModule, NzButtonModule, NzIconModule, NzInputModule, NzTableModule,
    NzEmptyModule, NzSpinModule, NzToolTipModule,
  ],
  template: `
    <div class="page-header">
      <div>
        <h1>MCP Servers</h1>
        <div class="subtitle">Catalogue of Model Context Protocol servers available to agents.</div>
      </div>
      <span class="spacer"></span>
      <button nz-button nzType="primary" (click)="openCreate()">
        <span nz-icon nzType="plus"></span> New MCP server
      </button>
    </div>

    <nz-spin [nzSpinning]="loading()">
      @if (servers().length === 0) {
        <nz-card class="empty">
          <nz-empty nzNotFoundContent="No MCP servers yet">
            <button nz-button nzType="primary" (click)="openCreate()">
              <span nz-icon nzType="plus"></span> Add your first MCP server
            </button>
          </nz-empty>
        </nz-card>
      } @else {
        <nz-card>
          <nz-table [nzData]="servers()" nzSize="middle" [nzShowPagination]="false">
            <thead>
              <tr>
                <th>Title</th>
                <th>Description</th>
                <th>Registry</th>
                <th>GitHub</th>
                <th class="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (s of servers(); track s.id) {
                <tr>
                  <td><strong>{{ s.title }}</strong></td>
                  <td class="muted-cell">{{ s.description || '—' }}</td>
                  <td>
                    @if (s.registryUrl) {
                      <a [href]="s.registryUrl" target="_blank" rel="noopener">
                        <span nz-icon nzType="link"></span>
                      </a>
                    } @else { <span class="muted">—</span> }
                  </td>
                  <td>
                    @if (s.githubUrl) {
                      <a [href]="s.githubUrl" target="_blank" rel="noopener">
                        <span nz-icon nzType="fork"></span>
                      </a>
                    } @else { <span class="muted">—</span> }
                  </td>
                  <td class="actions-col">
                    <button nz-button nzType="text" nzSize="small" (click)="openEdit(s)" nz-tooltip="Edit">
                      <span nz-icon nzType="edit"></span>
                    </button>
                    <button nz-button nzType="text" nzDanger nzSize="small" (click)="remove(s)" nz-tooltip="Delete">
                      <span nz-icon nzType="delete"></span>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </nz-table>
        </nz-card>
      }
    </nz-spin>
  `,
  styles: [`
    .page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    h1 { font-size: 22px; font-weight: 600; margin: 0; }
    .subtitle { color: var(--c-text-subtle); font-size: 13px; }
    .spacer { flex: 1; }
    .muted { color: var(--c-text-subtle); }
    .muted-cell { color: var(--c-text-subtle); max-width: 360px; }
    .actions-col { width: 110px; text-align: right; white-space: nowrap; }
    .empty { padding: 36px; text-align: center; }
  `],
})
export class McpServersComponent implements OnInit {
  api = inject(ApiService);
  modal = inject(NzModalService);
  confirmer = inject(DialogService);
  toast = inject(ToastService);

  servers = signal<McpServer[]>([]);
  loading = signal(false);

  async ngOnInit() { await this.refresh(); }

  async refresh() {
    this.loading.set(true);
    try {
      const list = await firstValueFrom(this.api.get<McpServer[]>('/mcp-servers'));
      this.servers.set(list);
    } finally {
      this.loading.set(false);
    }
  }

  openCreate() {
    const ref = this.modal.create<McpServerFormComponent, any>({
      nzTitle: 'New MCP server',
      nzContent: McpServerFormComponent,
      nzWidth: 760,
      nzOkText: 'Create',
      nzCancelText: 'Cancel',
      nzWrapClassName: 'no-anim-modal',
      nzOnOk: (instance) => instance.submit(),
    });
    ref.afterClose.subscribe(async (res) => {
      if (!res) return;
      try {
        await firstValueFrom(this.api.post('/mcp-servers', res));
        await this.refresh();
        this.toast.success('MCP server created');
      } catch (err: any) {
        this.toast.error(err?.error?.message || 'Could not create');
      }
    });
  }

  openEdit(s: McpServer) {
    const ref = this.modal.create<McpServerFormComponent, any>({
      nzTitle: 'Edit MCP server',
      nzContent: McpServerFormComponent,
      nzData: s,
      nzWidth: 760,
      nzOkText: 'Save',
      nzCancelText: 'Cancel',
      nzWrapClassName: 'no-anim-modal',
      nzOnOk: (instance) => instance.submit(),
    });
    ref.afterClose.subscribe(async (res) => {
      if (!res) return;
      try {
        await firstValueFrom(this.api.patch(`/mcp-servers/${s.id}`, res));
        await this.refresh();
        this.toast.success('MCP server saved');
      } catch (err: any) {
        this.toast.error(err?.error?.message || 'Could not save');
      }
    });
  }

  async remove(s: McpServer) {
    const mode = await this.confirmer.archiveOrDelete({
      title: `Remove "${s.title}"?`,
      message:
        'Archive keeps it recoverable from the Archived section. Permanent delete wipes the MCP server entry.',
      archiveLabel: 'Archive',
      permanentLabel: 'Delete permanently',
    });
    if (!mode) return;
    await firstValueFrom(this.api.delete(`/mcp-servers/${s.id}?mode=${mode}`));
    await this.refresh();
    this.toast.success(mode === 'archive' ? 'MCP server archived' : 'MCP server deleted');
  }
}
