import { Component, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { AuthService } from '../../core/auth.service';
import { resolveApiBase } from '../../core/api-base';
import { ToastService } from '../../shared/dialogs/toast.service';

@Component({
  selector: 'app-settings-data',
  standalone: true,
  imports: [CommonModule, DatePipe, NzCardModule, NzButtonModule, NzIconModule],
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
      <button nz-button nzType="primary" (click)="exportDb()" [nzLoading]="busy()">
        <span nz-icon nzType="download"></span> Export database
      </button>
    </nz-card>
  `,
  styles: [`
    .muted { color: var(--c-text-subtle); }
    .small { font-size: 12px; }
  `],
})
export class SettingsDataPage {
  auth = inject(AuthService);
  toast = inject(ToastService);

  busy = signal(false);
  lastExportAt = signal<Date | null>(null);

  async exportDb() {
    this.busy.set(true);
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
      this.busy.set(false);
    }
  }
}
