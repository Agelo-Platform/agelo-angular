import { Component, Input, OnChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { ApiService } from '../../core/api.service';

interface Analytics {
  totalCards: number;
  cardsByStatus: { columnId: string; columnName: string; count: number }[];
  totalTeams: number;
  totalAgents: number;
  approvedAgents: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, NzCardModule, NzIconModule, NzSpinModule, NzStatisticModule, NzProgressModule],
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
  `],
})
export class HomeComponent implements OnChanges {
  @Input() orgId = '';
  @Input() projectId = '';
  api = inject(ApiService);
  data = signal<Analytics | null>(null);
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
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Failed to load analytics');
    } finally {
      this.loading.set(false);
    }
  }
}
