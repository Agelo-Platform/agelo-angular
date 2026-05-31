import { Component, Input, OnChanges, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { ApiService } from '../../core/api.service';
import { TeamFormComponent } from './team-form.dialog';
import { ToastService } from '../../shared/dialogs/toast.service';
import { DialogService } from '../../shared/dialogs/dialog.service';

interface Team {
  id: string;
  name: string;
  agentCount: number;
  createdAt: string;
}

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [
    CommonModule, DatePipe,
    NzCardModule, NzButtonModule, NzIconModule, NzEmptyModule, NzSpinModule,
    NzDropDownModule,
  ],
  template: `
    <div class="page-header">
      <div>
        <h1>Teams</h1>
        <div class="subtitle">
          Group agents by role or domain. Agents register against a team and
          wait for SA approval.
        </div>
      </div>
      <div class="spacer"></div>
      <button nz-button nzType="primary" (click)="newTeam()">
        <span nz-icon nzType="plus"></span> New team
      </button>
    </div>

    <nz-spin [nzSpinning]="loading()">
      <div class="grid">
        @for (t of teams(); track t.id) {
          <nz-card class="team-card" tabindex="0" (click)="open(t)" (keyup.enter)="open(t)">
            <a nz-dropdown [nzDropdownMenu]="m" class="more" (click)="$event.stopPropagation()">
              <span nz-icon nzType="more"></span>
            </a>
            <nz-dropdown-menu #m="nzDropdownMenu">
              <ul nz-menu>
                <li nz-menu-item (click)="open(t); $event.stopPropagation()">
                  <span nz-icon nzType="arrow-right"></span> Manage
                </li>
                <li nz-menu-item nzDanger (click)="remove(t); $event.stopPropagation()">
                  <span nz-icon nzType="delete"></span> Delete
                </li>
              </ul>
            </nz-dropdown-menu>
            <h3 class="title">
              <span class="team-icon-tile"><span nz-icon nzType="team"></span></span>
              {{ t.name }}
            </h3>
            <div class="muted small">Created {{ t.createdAt | slice:0:10 }}</div>
            <div class="stat">
              <span nz-icon nzType="robot" class="stat-ico"></span>
              <span>{{ t.agentCount }} agent{{ t.agentCount === 1 ? '' : 's' }}</span>
            </div>
            <div class="actions">
              <a class="open-link">Manage <span nz-icon nzType="arrow-right"></span></a>
            </div>
          </nz-card>
        } @empty {
          <nz-card class="empty">
            <nz-empty
              nzNotFoundImage="simple"
              nzNotFoundContent="No teams yet"
            >
              <ng-template #nzNotFoundFooter>
                <button nz-button nzType="primary" (click)="newTeam()">
                  <span nz-icon nzType="plus"></span> New team
                </button>
              </ng-template>
            </nz-empty>
          </nz-card>
        }
      </div>
    </nz-spin>
  `,
  styles: [`
    .spacer { flex: 1; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }
    .team-card {
      cursor: pointer;
      position: relative;
      border-top: 3px solid var(--c-primary) !important;
      transition: transform .12s, box-shadow .12s;
    }
    .team-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-overflow) !important;
    }
    .more {
      position: absolute; top: 12px; right: 12px;
      width: 28px; height: 28px;
      display: inline-flex; align-items: center; justify-content: center;
      border: 1px solid var(--c-border); border-radius: 6px;
      background: var(--c-surface); color: var(--c-text-subtle);
    }
    .more:hover { background: var(--c-surface-3); color: var(--c-text); }
    .title {
      display: inline-flex; align-items: center; gap: 8px;
      margin: 0 0 4px; font-size: 16px; font-weight: 600; text-transform: capitalize;
    }
    .team-icon-tile {
      width: 26px; height: 26px; flex: 0 0 26px;
      display: inline-flex; align-items: center; justify-content: center;
      border-radius: 6px;
      background: var(--c-accent-bg-subtle); color: var(--c-accent-text);
    }
    .muted { color: var(--c-text-subtle); }
    .small { font-size: 12px; }
    .stat { display: flex; align-items: center; gap: 8px; padding: 12px 0 4px; color: var(--c-text-subtle); }
    .stat-ico { color: var(--c-text-subtlest); }
    .actions { display: flex; justify-content: flex-end; }
    .open-link { color: var(--c-primary); font-size: 13px; font-weight: 500; }
    .empty { grid-column: 1 / -1; padding: 36px; }
  `],
})
export class TeamsComponent implements OnChanges {
  @Input() orgId = '';
  // Set by `org/:orgId/project/:projectId/teams`. When present, the list
  // is filtered server-side and new teams are minted with this project.
  @Input() projectId = '';
  api = inject(ApiService);
  modal = inject(NzModalService);
  toast = inject(ToastService);
  confirmer = inject(DialogService);
  router = inject(Router);

  teams = signal<Team[]>([]);
  loading = signal(false);

  async ngOnChanges() { if (this.orgId) await this.refresh(); }

  async refresh() {
    this.loading.set(true);
    try {
      const qs = this.projectId ? `?projectId=${encodeURIComponent(this.projectId)}` : '';
      const list = await firstValueFrom(
        this.api.get<Team[]>(`/organizations/${this.orgId}/teams${qs}`),
      );
      this.teams.set(list);
    } finally {
      this.loading.set(false);
    }
  }

  newTeam() {
    const ref = this.modal.create<TeamFormComponent, string>({
      nzTitle: 'New team',
      nzContent: TeamFormComponent,
      nzWidth: 480,
      nzOkText: 'Create team',
      nzCancelText: 'Cancel',
      nzOnOk: (instance) => instance.submit(),
    });
    ref.afterClose.subscribe(async (name) => {
      if (!name) return;
      try {
        const body: { name: string; projectId?: string } = { name };
        if (this.projectId) body.projectId = this.projectId;
        await firstValueFrom(
          this.api.post(`/organizations/${this.orgId}/teams`, body),
        );
        this.toast.success(`Team "${name}" created`);
        await this.refresh();
      } catch (err: any) {
        this.toast.error(err?.error?.message || 'Could not create team');
      }
    });
  }

  open(t: Team) {
    if (this.projectId) {
      this.router.navigate(
        ['/org', this.orgId, 'project', this.projectId, 'teams', t.id]);
    } else {
      this.router.navigate(['/org', this.orgId, 'teams', t.id]);
    }
  }

  async remove(t: Team) {
    const mode = await this.confirmer.archiveOrDelete({
      title: `Remove "${t.name}"?`,
      message:
        'Archive keeps the team recoverable from the Archived section. Permanent delete also removes its agent registrations.',
      archiveLabel: 'Archive',
      permanentLabel: 'Delete permanently',
    });
    if (!mode) return;
    try {
      await firstValueFrom(
        this.api.delete(`/organizations/${this.orgId}/teams/${t.id}?mode=${mode}`),
      );
      this.toast.success(mode === 'archive' ? 'Team archived' : 'Team deleted');
      await this.refresh();
    } catch (err: any) {
      this.toast.error(err?.error?.message || 'Could not remove team');
    }
  }
}
