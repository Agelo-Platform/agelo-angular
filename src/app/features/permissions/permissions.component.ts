import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { ApiService } from '../../core/api.service';

interface Permission {
  id: string;
  key: string;
  label: string;
  granted: boolean;
}

@Component({
  selector: 'app-permissions',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    NzCardModule, NzIconModule, NzSwitchModule, NzSpinModule,
  ],
  template: `
    <div class="page-header">
      <div>
        <h1>Roles &amp; Permissions</h1>
        <div class="subtitle">
          Toggle agent-role permissions. Card-type and column-level access are
          configured per-organization in <strong>Board Flow Manager</strong>.
        </div>
      </div>
    </div>

    <nz-spin [nzSpinning]="loading()">
      <nz-card nzTitle="Agent role">
        <p class="muted small">
          Controls what agents can read or modify across every organization.
        </p>
        <div class="perm-list">
          @for (p of perms(); track p.id) {
            <div class="perm-row">
              <div class="perm-info">
                <code class="mono">{{ p.key }}</code>
                <div class="perm-label">{{ p.label }}</div>
              </div>
              <nz-switch
                [(ngModel)]="p.granted"
                (ngModelChange)="toggle(p, $event)"
              ></nz-switch>
            </div>
          }
        </div>
      </nz-card>
    </nz-spin>
  `,
  styles: [`
    .muted { color: var(--c-text-subtle); }
    .small { font-size: 13px; margin-bottom: 16px; }
    .perm-list { display: flex; flex-direction: column; }
    .perm-row {
      display: flex; align-items: center; gap: 16px;
      padding: 12px 0;
      border-bottom: 1px solid var(--c-border-subtle);
    }
    .perm-row:last-child { border-bottom: none; }
    .perm-info { flex: 1; min-width: 0; }
    .perm-info code {
      background: var(--c-surface-2);
      padding: 2px 8px; border-radius: 3px;
      font-size: 12px; font-weight: 600;
      color: var(--c-primary);
    }
    .perm-label { color: var(--c-text-subtle); font-size: 13px; margin-top: 4px; }
  `],
})
export class PermissionsComponent implements OnInit {
  api = inject(ApiService);
  perms = signal<Permission[]>([]);
  loading = signal(false);

  async ngOnInit() { await this.refresh(); }

  async refresh() {
    this.loading.set(true);
    try {
      const list = await firstValueFrom(this.api.get<Permission[]>('/permissions'));
      this.perms.set(list);
    } finally {
      this.loading.set(false);
    }
  }

  async toggle(p: Permission, granted: boolean) {
    const list = await firstValueFrom(
      this.api.patch<Permission[]>(`/permissions/${p.id}`, { granted }),
    );
    this.perms.set(list);
  }
}
