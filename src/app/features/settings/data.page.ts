import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { AuthService } from '../../core/auth.service';
import { resolveApiBase } from '../../core/api-base';
import { ToastService } from '../../shared/dialogs/toast.service';
import { DialogService } from '../../shared/dialogs/dialog.service';

interface ImportSummary {
  imported: Record<string, number>;
  skipped: Record<string, number>;
}

interface ImportResult {
  summary: ImportSummary;
  sourceMeta: { product: string; version: string; exportedAt: string };
  importedAt: string;
}

@Component({
  selector: 'app-settings-data',
  standalone: true,
  imports: [
    CommonModule, DatePipe,
    NzCardModule, NzButtonModule, NzIconModule,
    NzAlertModule, NzTagModule,
  ],
  template: `
    <nz-card nzTitle="Database export">
      <p class="muted">
        Download a JSON snapshot of every entity in the database — users (no
        passwords), organizations, projects, teams, agents, board flow, cards,
        comments, prompts, permissions, API keys (no raw key values).
      </p>
      <p class="muted small">
        Use this for backups or migrations. Sensitive fields (password
        hashes, raw API keys) are stripped before the file is generated.
      </p>
      @if (lastExportAt()) {
        <p class="muted small">
          <span nz-icon nzType="clock-circle"></span>
          Last export downloaded {{ lastExportAt() | date:'medium' }}
        </p>
      }
      <button nz-button nzType="primary" (click)="exportDb()" [nzLoading]="exporting()">
        <span nz-icon nzType="download"></span> Export database
      </button>
    </nz-card>

    <nz-card nzTitle="Database import" class="mt">
      <p class="muted">
        Restore configuration into this Agelo instance from a JSON snapshot
        produced by the export above. Useful when bootstrapping a fresh
        node from an existing one, or when migrating between environments.
      </p>
      <p class="muted small">
        Rows are matched by their original id and upserted — running the
        same import twice is idempotent. The following groups are
        <strong>skipped</strong> because the export strips their secrets:
      </p>
      <ul class="skipped-list muted small">
        <li><strong>Users</strong> — password hashes are never exported.</li>
        <li><strong>API keys</strong> — the key hash is never exported, so re-imported keys could not authenticate. Mint fresh keys after import.</li>
        <li><strong>Permission catalog &amp; role grants</strong> — seeded automatically on first boot.</li>
      </ul>

      <nz-alert
        nzType="warning"
        nzShowIcon
        nzMessage="Import is irreversible. Always export a backup of the current database first."
        class="mb"
      ></nz-alert>

      <input
        #fileInput
        type="file"
        accept="application/json,.json"
        (change)="onFilePicked($event)"
        hidden
      />
      @if (chosenFile(); as f) {
        <div class="picked muted small">
          <span nz-icon nzType="file"></span>
          <strong>{{ f.name }}</strong>
          <span>({{ formatBytes(f.size) }})</span>
          <button nz-button nzType="text" nzSize="small" (click)="clearFile()" nz-tooltip="Clear">
            <span nz-icon nzType="close"></span>
          </button>
        </div>
      }
      <div class="actions">
        <button nz-button (click)="fileInput.click()" [disabled]="importing()">
          <span nz-icon nzType="folder-open"></span> Choose JSON file…
        </button>
        <button
          nz-button
          nzType="primary"
          nzDanger
          (click)="importDb()"
          [disabled]="!chosenFile()"
          [nzLoading]="importing()"
        >
          <span nz-icon nzType="upload"></span> Import database
        </button>
      </div>

      @if (lastImport(); as r) {
        <div class="result">
          <h4>
            <span nz-icon nzType="check-circle" class="ok"></span>
            Import completed
            <span class="muted small">
              · source export from {{ r.sourceMeta.exportedAt }}
            </span>
          </h4>
          <div class="chip-row">
            @for (e of asEntries(r.summary.imported); track e.key) {
              @if (e.value > 0) {
                <nz-tag nzColor="success">{{ e.key }}: {{ e.value }}</nz-tag>
              }
            }
          </div>
          @if (anyNonZero(r.summary.skipped)) {
            <p class="muted small mt-sm">Skipped from snapshot:</p>
            <div class="chip-row">
              @for (e of asEntries(r.summary.skipped); track e.key) {
                @if (e.value > 0) {
                  <nz-tag>{{ e.key }}: {{ e.value }}</nz-tag>
                }
              }
            </div>
          }
        </div>
      }
    </nz-card>
  `,
  styles: [`
    .muted { color: var(--c-text-subtle); }
    .small { font-size: 12px; }
    .mt { margin-top: 16px; }
    .mb { margin-bottom: 12px; }
    .mt-sm { margin-top: 8px; }
    .skipped-list { margin: 6px 0 12px 0; padding-left: 20px; }
    .skipped-list li { margin: 2px 0; }
    .actions { display: flex; gap: 8px; align-items: center; margin-top: 12px; }
    .picked {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 12px;
      border: 1px solid var(--c-border);
      border-radius: var(--radius);
      background: var(--c-surface-2);
      margin-top: 12px;
      font-size: 13px;
    }
    .picked strong { color: var(--c-text); }
    .picked button { margin-left: auto; }
    .result {
      margin-top: 16px;
      padding: 12px;
      border: 1px solid var(--c-border);
      border-radius: var(--radius);
      background: var(--c-surface);
    }
    .result h4 { margin: 0 0 8px 0; font-size: 14px; display: flex; align-items: center; gap: 6px; }
    .result h4 .ok { color: #22c55e; }
    .chip-row { display: flex; flex-wrap: wrap; gap: 6px; }
  `],
})
export class SettingsDataPage {
  auth = inject(AuthService);
  toast = inject(ToastService);
  confirmer = inject(DialogService);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  exporting = signal(false);
  importing = signal(false);
  lastExportAt = signal<Date | null>(null);
  chosenFile = signal<File | null>(null);
  lastImport = signal<ImportResult | null>(null);

  async exportDb() {
    this.exporting.set(true);
    try {
      const url = resolveApiBase() + '/admin/export';
      const res = await fetch(url, {
        headers: { authorization: `Bearer ${this.auth.token()}` },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Export failed (${res.status}): ${text}`);
      }
      const blob = await res.blob();
      const dispo = res.headers.get('content-disposition') ?? '';
      const fn = /filename="([^"]+)"/.exec(dispo)?.[1] ?? `agelo-${Date.now()}.json`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fn;
      a.click();
      URL.revokeObjectURL(a.href);
      this.lastExportAt.set(new Date());
      this.toast.success('Export downloaded');
    } catch (err: any) {
      this.toast.error(err?.message || 'Export failed');
    } finally {
      this.exporting.set(false);
    }
  }

  onFilePicked(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.chosenFile.set(file);
  }

  clearFile() {
    this.chosenFile.set(null);
    if (this.fileInput?.nativeElement) this.fileInput.nativeElement.value = '';
  }

  async importDb() {
    const file = this.chosenFile();
    if (!file) return;

    const ok = await this.confirmer.confirm({
      title: `Import "${file.name}"?`,
      message:
        'Rows in the snapshot will be upserted into this database. Users, API keys, and the permission catalog are skipped. Make sure you have a current backup before continuing.',
      confirmLabel: 'Import',
      destructive: true,
    });
    if (!ok) return;

    this.importing.set(true);
    this.lastImport.set(null);
    try {
      const url = resolveApiBase() + '/admin/import';
      const form = new FormData();
      form.append('file', file, file.name);
      const res = await fetch(url, {
        method: 'POST',
        headers: { authorization: `Bearer ${this.auth.token()}` },
        body: form,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Import failed (${res.status}): ${text}`);
      }
      const result = (await res.json()) as ImportResult;
      this.lastImport.set(result);
      const total = Object.values(result.summary.imported).reduce((a, b) => a + b, 0);
      this.toast.success(`Imported ${total} row${total === 1 ? '' : 's'}.`);
      this.clearFile();
    } catch (err: any) {
      this.toast.error(err?.message || 'Import failed');
    } finally {
      this.importing.set(false);
    }
  }

  asEntries(o: Record<string, number>): { key: string; value: number }[] {
    return Object.entries(o)
      .map(([key, value]) => ({ key, value }))
      .sort((a, b) => b.value - a.value);
  }

  anyNonZero(o: Record<string, number>): boolean {
    return Object.values(o).some((v) => v > 0);
  }

  formatBytes(n: number): string {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
  }
}
