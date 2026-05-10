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
import { ApiService } from '../../core/api.service';
import { TeamFormComponent } from './team-form.dialog';
import { ToastService } from '../../shared/dialogs/toast.service';

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
            <div class="head">
              <span nz-icon nzType="team" class="team-icon"></span>
              <div>
                <h3 class="title">{{ t.name }}</h3>
                <div class="muted small">Created {{ t.createdAt | slice:0:10 }}</div>
              </div>
            </div>
            <div class="stat">
              <span nz-icon nzType="robot"></span>
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
      transition: transform .12s, box-shadow .12s;
    }
    .team-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-overflow) !important;
    }
    .head { display: flex; gap: 12px; align-items: center; }
    .team-icon { color: var(--c-primary); font-size: 22px; }
    .title { margin: 0 0 4px; font-size: 16px; font-weight: 600; text-transform: capitalize; }
    .muted { color: var(--c-text-subtle); }
    .small { font-size: 12px; }
    .stat { display: flex; align-items: center; gap: 8px; padding: 12px 0 4px; color: var(--c-text-subtle); }
    .actions { display: flex; justify-content: flex-end; }
    .open-link { color: var(--c-primary); font-size: 13px; font-weight: 500; }
    .empty { grid-column: 1 / -1; padding: 36px; }
  `],
})
export class TeamsComponent implements OnChanges {
  @Input() orgId = '';
  api = inject(ApiService);
  modal = inject(NzModalService);
  toast = inject(ToastService);
  router = inject(Router);

  teams = signal<Team[]>([]);
  loading = signal(false);

  async ngOnChanges() { if (this.orgId) await this.refresh(); }

  async refresh() {
    this.loading.set(true);
    try {
      const list = await firstValueFrom(
        this.api.get<Team[]>(`/organizations/${this.orgId}/teams`),
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
        await firstValueFrom(
          this.api.post(`/organizations/${this.orgId}/teams`, { name }),
        );
        this.toast.success(`Team "${name}" created`);
        await this.refresh();
      } catch (err: any) {
        this.toast.error(err?.error?.message || 'Could not create team');
      }
    });
  }

  open(t: Team) {
    this.router.navigate(['/org', this.orgId, 'teams', t.id]);
  }
}
