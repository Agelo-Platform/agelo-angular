import { Component, Input, OnChanges, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { ApiService } from '../../core/api.service';

interface Analytics {
  totalCards: number;
  cardsByStatus: { columnId: string; columnName: string; count: number }[];
  totalTeams: number;
  totalAgents: number;
  approvedAgents: number;
}

interface ActivityItem {
  sequence: number;
  at: string;
  agentId: string;
  agentTitle?: string | null;
  cardId?: string | null;
  action: string;
  message: string;
  level?: string | null;
}

interface ActivityResponse {
  items: ActivityItem[];
  serverTime: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, DatePipe, NzCardModule, NzIconModule, NzSpinModule,
    NzStatisticModule, NzProgressModule, NzButtonModule, NzEmptyModule,
  ],
  template: `
    <div class="page-header">
      <div>
        <h1>Home</h1>
        <div class="subtitle">Analytics for the active organization.</div>
      </div>
    </div>

    <nz-spin [nzSpinning]="loading()">
      @if (data(); as d) {
        <div class="stat-grid">
          <nz-card class="stat-card">
            <nz-statistic
              [nzValue]="d.totalCards"
              nzTitle="Total cards"
              [nzPrefix]="cardIcon"
            ></nz-statistic>
            <ng-template #cardIcon><span nz-icon nzType="appstore"></span></ng-template>
          </nz-card>
          <nz-card class="stat-card">
            <nz-statistic
              [nzValue]="d.totalTeams"
              nzTitle="Teams"
              [nzPrefix]="teamIcon"
            ></nz-statistic>
            <ng-template #teamIcon><span nz-icon nzType="team"></span></ng-template>
          </nz-card>
          <nz-card class="stat-card">
            <nz-statistic
              [nzValue]="d.totalAgents"
              nzTitle="Agents"
              [nzPrefix]="agentIcon"
            ></nz-statistic>
            <ng-template #agentIcon><span nz-icon nzType="robot"></span></ng-template>
            <div class="stat-sub muted">
              <span class="approved-dot"></span>
              {{ d.approvedAgents }} approved
            </div>
          </nz-card>
        </div>

        <nz-card nzTitle="Cards by status" [nzExtra]="byStatusExtra" class="bar-card">
          <ng-template #byStatusExtra>
            <span nz-icon nzType="bulb" class="muted"></span>
          </ng-template>

          @if (d.cardsByStatus.length) {
            <div class="bars">
              @for (s of d.cardsByStatus; track s.columnId) {
                <div class="bar-row">
                  <div class="bar-label">{{ s.columnName }}</div>
                  <nz-progress
                    [nzPercent]="d.totalCards ? Math.round((s.count / d.totalCards) * 100) : 0"
                    [nzShowInfo]="false"
                    nzStrokeColor="#0C66E4"
                  ></nz-progress>
                  <div class="bar-count">{{ s.count }}</div>
                </div>
              }
            </div>
          } @else {
            <p class="muted">
              No columns defined yet. Visit
              <strong>Board Flow</strong> to design your workflow.
            </p>
          }
        </nz-card>

        <div class="lower-grid">
          <nz-card nzTitle="Recent activity" class="activity-card">
            @if (activity().length) {
              <div class="feed">
                @for (a of activity(); track a.sequence) {
                  <div class="feed-row">
                    <span class="av" [class.agent]="true">{{ initials(a.agentTitle || a.agentId) }}</span>
                    <div class="feed-body">
                      <div class="feed-line">
                        <b>{{ a.agentTitle || a.agentId }}</b>
                        <span class="act">{{ a.action }}</span>
                        <span>{{ a.message }}</span>
                        @if (a.cardId) {
                          <span class="card-ref">{{ a.cardId }}</span>
                        }
                      </div>
                      <div class="feed-when">{{ a.at | date:'short' }}</div>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <nz-empty
                nzNotFoundImage="simple"
                nzNotFoundContent="No agent activity yet"
              ></nz-empty>
            }
          </nz-card>

          <nz-card nzTitle="Quick actions" class="quick-card">
            <div class="quick-actions">
              <button nz-button nzBlock class="qa" (click)="goBoard()">
                <span nz-icon nzType="plus"></span> New card
              </button>
              <button nz-button nzBlock class="qa" (click)="go('teams')">
                <span nz-icon nzType="team"></span> Add team
              </button>
              <button nz-button nzBlock class="qa" (click)="goRoot('prompts')">
                <span nz-icon nzType="bulb"></span> Create prompt
              </button>
              <button nz-button nzBlock class="qa" (click)="goRoot('mcp-servers')">
                <span nz-icon nzType="thunderbolt"></span> Register MCP server
              </button>
            </div>
          </nz-card>
        </div>
      } @else if (error()) {
        <nz-card class="empty">
          <span nz-icon nzType="warning"></span>
          <p>{{ error() }}</p>
        </nz-card>
      }
    </nz-spin>
  `,
  styles: [`
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }
    .stat-card { padding: 4px; }
    .stat-card ::ng-deep .ant-statistic-title { color: var(--c-text-subtle); font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
    .stat-card ::ng-deep .ant-statistic-content-value { font-size: 32px; font-weight: 700; }
    .stat-card ::ng-deep .ant-statistic-content-prefix { color: var(--c-primary); margin-right: 8px; }
    .stat-sub { display: flex; align-items: center; gap: 6px; font-size: 12px; margin-top: 4px; }
    .approved-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--c-success); }
    .muted { color: var(--c-text-subtle); }

    .bars { display: flex; flex-direction: column; gap: 10px; }
    .bar-row {
      display: grid;
      grid-template-columns: 160px 1fr 60px;
      gap: 12px; align-items: center;
    }
    .bar-label { font-size: 13px; }
    .bar-count {
      text-align: right;
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }
    .empty { text-align: center; padding: 36px; color: var(--c-text-subtle); }

    /* Recent activity + Quick actions */
    .lower-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 16px;
      margin-top: 16px;
    }
    @media (max-width: 900px) { .lower-grid { grid-template-columns: 1fr; } }
    .feed { display: flex; flex-direction: column; gap: 14px; }
    .feed-row { display: flex; align-items: flex-start; gap: 10px; }
    .av {
      display: inline-grid; place-items: center;
      width: 28px; height: 28px; border-radius: 50%;
      color: #fff; font-size: 11px; font-weight: 600; flex: 0 0 28px;
      background: linear-gradient(135deg, var(--c-primary), var(--c-blue-light));
    }
    .av.agent { background: linear-gradient(135deg, var(--c-teal), #0E9384); }
    .feed-body { flex: 1; font-size: 13px; color: var(--c-text-subtle); min-width: 0; }
    .feed-line { color: var(--c-text); display: flex; flex-wrap: wrap; gap: 6px; align-items: baseline; }
    .feed-line b { color: var(--c-text); }
    .act {
      font-size: 11px; padding: 1px 6px; border-radius: 999px;
      background: var(--c-surface-3); color: var(--c-text-subtle);
    }
    .card-ref { font-family: var(--font-mono); font-size: 11px; color: var(--c-primary); }
    .feed-when { font-size: 11.5px; color: var(--c-text-subtle); margin-top: 2px; }
    .quick-actions { display: flex; flex-direction: column; gap: 8px; }
    .qa { justify-content: flex-start !important; }
  `],
})
export class HomeComponent implements OnChanges {
  @Input() orgId = '';
  @Input() projectId = '';
  api = inject(ApiService);
  router = inject(Router);
  data = signal<Analytics | null>(null);
  activity = signal<ActivityItem[]>([]);
  error = signal<string | null>(null);
  loading = signal(false);

  Math = Math;

  async ngOnChanges() { await this.load(); }

  async load() {
    if (!this.orgId) return;
    this.error.set(null);
    this.loading.set(true);
    try {
      const a = await firstValueFrom(
        this.api.get<Analytics>(`/organizations/${this.orgId}/analytics`),
      );
      this.data.set(a);
      // Recent activity is best-effort — the in-memory feed may be empty
      // and shouldn't block the analytics page.
      void this.loadActivity();
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Failed to load analytics');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadActivity() {
    try {
      const res = await firstValueFrom(
        this.api.get<ActivityResponse>(
          `/organizations/${this.orgId}/agent-activity?limit=8`),
      );
      const items = (res?.items ?? []).slice().sort((a, b) => b.sequence - a.sequence);
      this.activity.set(items);
    } catch {
      this.activity.set([]);
    }
  }

  initials(label: string): string {
    const parts = (label || '?').trim().split(/[\s-_]+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  // Quick actions navigate to the relevant page. "New card" lands on the
  // board (project-scoped when a project is active) where the create modal
  // lives; the others jump to their root/org pages.
  goBoard() {
    if (this.projectId) {
      this.router.navigate(['/org', this.orgId, 'project', this.projectId, 'board']);
    } else {
      this.router.navigate(['/org', this.orgId, 'board']);
    }
  }

  go(seg: string) {
    if (this.projectId) {
      this.router.navigate(['/org', this.orgId, 'project', this.projectId, seg]);
    } else {
      this.router.navigate(['/org', this.orgId, seg]);
    }
  }

  goRoot(seg: string) {
    this.router.navigate(['/' + seg]);
  }
}
