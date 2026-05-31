import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { ApiService } from '../../core/api.service';
import { DialogService } from '../../shared/dialogs/dialog.service';
import { ToastService } from '../../shared/dialogs/toast.service';
import { ShortIdComponent } from '../../shared/ui/short-id.component';

interface ArchivedItem {
  type: 'organization' | 'project' | 'team' | 'card' | 'prompt' | 'mcpServer';
  id: string;
  title: string;
  context?: string;
  archivedAt: string;
  metadata?: Record<string, any>;
}

const TYPE_LABEL: Record<ArchivedItem['type'], string> = {
  organization: 'Organization',
  project: 'Project',
  team: 'Team',
  card: 'Card',
  prompt: 'Prompt',
  mcpServer: 'MCP server',
};

const TYPE_ICON: Record<ArchivedItem['type'], string> = {
  organization: 'bank',
  project: 'project',
  team: 'team',
  card: 'appstore',
  prompt: 'bulb',
  mcpServer: 'thunderbolt',
};

@Component({
  selector: 'app-archive',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DatePipe,
    NzCardModule, NzButtonModule, NzIconModule, NzInputModule, NzTableModule,
    NzTagModule, NzPaginationModule, NzSpinModule, NzEmptyModule, NzToolTipModule,
    ShortIdComponent,
  ],
  template: `
    <div class="page-header">
      <div>
        <h1>Archived</h1>
        <div class="subtitle">
          Soft-deleted entities across the entire platform. Restore to bring
          them back, or delete permanently to free space.
        </div>
      </div>
      <span class="spacer"></span>
      <nz-input-group nzPrefixIcon="search" class="search">
        <input nz-input placeholder="Search title…" [(ngModel)]="search" (ngModelChange)="onSearch()" />
      </nz-input-group>
    </div>

    <nz-spin [nzSpinning]="loading()">
      @if (items().length === 0) {
        <nz-card class="empty">
          <nz-empty
            nzNotFoundImage="simple"
            [nzNotFoundContent]="search ? 'No archived items match your search' : 'Nothing archived yet'"
          ></nz-empty>
        </nz-card>
      } @else {
        <nz-card>
          <nz-table [nzData]="items()" nzSize="middle" [nzShowPagination]="false">
            <thead>
              <tr>
                <th class="type-col">Type</th>
                <th>Title</th>
                <th>Context</th>
                <th>Archived</th>
                <th class="id-col">ID</th>
                <th class="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (it of items(); track it.id) {
                <tr>
                  <td>
                    <nz-tag>
                      <span nz-icon [nzType]="iconFor(it.type)"></span>
                      {{ labelFor(it.type) }}
                    </nz-tag>
                  </td>
                  <td><strong>{{ it.title }}</strong></td>
                  <td class="muted-cell">{{ it.context || '—' }}</td>
                  <td class="muted-cell">{{ it.archivedAt | date:'medium' }}</td>
                  <td><app-short-id [id]="it.id" label="id"></app-short-id></td>
                  <td class="actions-col">
                    <button nz-button nzSize="small" (click)="restore(it)" nz-tooltip="Restore">
                      <span nz-icon nzType="reload"></span> Restore
                    </button>
                    <button nz-button nzSize="small" nzDanger (click)="hardDelete(it)" nz-tooltip="Delete permanently">
                      <span nz-icon nzType="delete"></span>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </nz-table>
          <div class="pagination">
            <nz-pagination
              [nzPageIndex]="page()"
              [nzTotal]="total()"
              [nzPageSize]="limit"
              (nzPageIndexChange)="onPage($event)"
            ></nz-pagination>
          </div>
        </nz-card>
      }
    </nz-spin>
  `,
  styles: [`
    .page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    h1 { font-size: 22px; font-weight: 600; margin: 0; }
    .subtitle { color: var(--c-text-subtle); font-size: 13px; }
    .spacer { flex: 1; }
    .search { width: 280px; }
    .empty { padding: 36px; text-align: center; }
    .type-col { width: 140px; }
    .id-col { width: 140px; }
    .actions-col { width: 180px; text-align: right; white-space: nowrap; }
    .muted-cell { color: var(--c-text-subtle); }
    .pagination { display: flex; justify-content: flex-end; padding-top: 12px; }
  `],
})
export class ArchiveComponent implements OnInit {
  api = inject(ApiService);
  router = inject(Router);
  confirmer = inject(DialogService);
  toast = inject(ToastService);

  items = signal<ArchivedItem[]>([]);
  total = signal(0);
  page = signal(1);
  limit = 25;
  search = '';
  loading = signal(false);
  private searchTimer: any = null;

  async ngOnInit() { await this.refresh(); }

  iconFor(t: ArchivedItem['type']) { return TYPE_ICON[t] ?? 'folder-open'; }
  labelFor(t: ArchivedItem['type']) { return TYPE_LABEL[t] ?? t; }

  onSearch() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.refresh(), 250);
  }

  onPage(p: number) {
    this.page.set(p);
    void this.refresh();
  }

  async refresh() {
    this.loading.set(true);
    try {
      const offset = (this.page() - 1) * this.limit;
      const params: Record<string, string> = {
        offset: String(offset),
        limit: String(this.limit),
      };
      if (this.search.trim()) params['search'] = this.search.trim();
      const res = await firstValueFrom(
        this.api.get<{ total: number; items: ArchivedItem[] }>('/archive', params),
      );
      this.items.set(res.items);
      this.total.set(res.total);
    } finally {
      this.loading.set(false);
    }
  }

  async restore(it: ArchivedItem) {
    try {
      await firstValueFrom(this.api.post(`/archive/${it.type}/${it.id}/restore`, {}));
      this.toast.success(`${this.labelFor(it.type)} restored`);
      await this.refresh();
    } catch (err: any) {
      this.toast.error(err?.error?.message || 'Could not restore');
    }
  }

  async hardDelete(it: ArchivedItem) {
    const ok = await this.confirmer.confirm({
      title: `Delete "${it.title}" permanently?`,
      message: 'This cannot be undone. The record will be removed from the database.',
      confirmLabel: 'Delete permanently',
      destructive: true,
    });
    if (!ok) return;
    try {
      await firstValueFrom(this.api.delete(`/archive/${it.type}/${it.id}`));
      this.toast.success('Permanently deleted');
      await this.refresh();
    } catch (err: any) {
      this.toast.error(err?.error?.message || 'Could not delete');
    }
  }
}
