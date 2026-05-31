import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { ApiService } from '../../core/api.service';

/**
 * Read-only "machine details + Agent Live" panel for a single agent.
 * The first tab surfaces the optional spec block captured during agent
 * self-registration (older agents that didn't ship those fields show
 * an explicit "not reported" placeholder). The second tab polls the
 * org's in-memory activity ring buffer scoped to this agent's id and
 * offers a Markdown export of the visible window.
 */
export interface AgentDetailInput {
  id: string;
  orgId: string;
  title: string;
  status: 'pending' | 'approved' | 'stopped';
  isOnline: boolean;
  machineIp: string;
  machineName: string;
  llmVersion: string;
  email: string;
  registeredAt: string;
  lastSeenAt: string | null;
  osName: string | null;
  osVersion: string | null;
  ramBytes: number | null;
  storageBytes: number | null;
  storageType: string | null;
}

interface ActivityItem {
  sequence: number;
  at: string;
  orgId: string;
  agentId: string;
  agentTitle?: string | null;
  teamId?: string | null;
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
  selector: 'app-agent-detail',
  standalone: true,
  imports: [
    CommonModule, DatePipe,
    NzIconModule, NzTagModule, NzTabsModule, NzButtonModule, NzEmptyModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nz-tabset>
      <nz-tab nzTitle="Machine details">
        <div class="grid">
          <div class="card">
            <div class="card-head">
              <span nz-icon nzType="laptop"></span>
              <span>Server</span>
            </div>
            <dl>
              <dt>Server name</dt>
              <dd class="mono">{{ agent.machineName || dash }}</dd>
              <dt>Machine IP</dt>
              <dd class="mono">{{ agent.machineIp || dash }}</dd>
              <dt>Operator</dt>
              <dd>{{ agent.email || dash }}</dd>
            </dl>
          </div>

          <div class="card">
            <div class="card-head">
              <span nz-icon nzType="windows"></span>
              <span>Operating system</span>
            </div>
            <dl>
              <dt>OS</dt>
              <dd>{{ agent.osName || notReported }}</dd>
              <dt>Version</dt>
              <dd>{{ agent.osVersion || notReported }}</dd>
            </dl>
          </div>

          <div class="card">
            <div class="card-head">
              <span nz-icon nzType="hdd"></span>
              <span>Hardware</span>
            </div>
            <dl>
              <dt>RAM</dt>
              <dd>{{ formatBytes(agent.ramBytes) }}</dd>
              <dt>Storage</dt>
              <dd>{{ formatBytes(agent.storageBytes) }}</dd>
              <dt>Type</dt>
              <dd>
                @if (agent.storageType) {
                  <nz-tag>{{ agent.storageType }}</nz-tag>
                } @else {
                  {{ notReported }}
                }
              </dd>
            </dl>
          </div>

          <div class="card">
            <div class="card-head">
              <span nz-icon nzType="robot"></span>
              <span>Agent</span>
            </div>
            <dl>
              <dt>Agent ID</dt>
              <dd class="mono small">{{ agent.id }}</dd>
              <dt>LLM</dt>
              <dd>{{ agent.llmVersion }}</dd>
              <dt>Status</dt>
              <dd>
                @switch (agent.status) {
                  @case ('pending')  { <nz-tag nzColor="warning">pending</nz-tag> }
                  @case ('approved') { <nz-tag nzColor="success">approved</nz-tag> }
                  @case ('stopped')  { <nz-tag nzColor="error">stopped</nz-tag> }
                }
                @if (agent.isOnline) {
                  <span class="dot online" aria-label="online"></span>
                  <span class="presence">online</span>
                } @else {
                  <span class="dot offline" aria-label="offline"></span>
                  <span class="presence muted">offline</span>
                }
              </dd>
              <dt>Registered</dt>
              <dd>{{ agent.registeredAt | date:'medium' }}</dd>
              <dt>Last seen</dt>
              <dd>
                @if (agent.lastSeenAt) {
                  {{ agent.lastSeenAt | date:'medium' }}
                } @else {
                  {{ dash }}
                }
              </dd>
            </dl>
          </div>
        </div>
      </nz-tab>

      <nz-tab nzTitle="Activity & logs">
        <div class="al-head">
          <div class="al-title">
            <span nz-icon nzType="thunderbolt" class="bolt"></span>
            <span>{{ items().length }} recent event{{ items().length === 1 ? '' : 's' }}</span>
            <span class="muted small" *ngIf="lastChecked()">
              · refreshed {{ lastChecked() | date:'mediumTime' }}
            </span>
          </div>
          <button nz-button nzSize="small" (click)="refreshNow()">
            <span nz-icon nzType="reload"></span> Refresh
          </button>
          <button nz-button nzType="primary" nzSize="small"
            [disabled]="items().length === 0" (click)="exportMarkdown()">
            <span nz-icon nzType="download"></span> Export as Markdown
          </button>
        </div>

        @if (items().length === 0) {
          <nz-empty
            nzNotFoundImage="simple"
            [nzNotFoundContent]="'No activity from ' + agent.title + ' yet'">
          </nz-empty>
        } @else {
          <ol class="al-feed" reversed>
            @for (it of items(); track it.sequence) {
              <li class="row" [attr.data-level]="it.level ?? 'info'">
                <div class="when">{{ it.at | date:'medium' }}</div>
                <div class="line">
                  <span class="action">{{ it.action }}</span>
                  <span class="msg">{{ it.message }}</span>
                  @if (it.cardId) {
                    <span class="card-id mono">card {{ it.cardId }}</span>
                  }
                </div>
              </li>
            }
          </ol>
        }
      </nz-tab>
    </nz-tabset>
  `,
  styles: [`
    .grid {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .card {
      border: 1px solid var(--c-border);
      border-radius: var(--radius);
      background: var(--c-surface);
      padding: 12px 14px;
    }
    .card-head {
      display: flex; align-items: center; gap: 8px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: .04em;
      color: var(--c-text-subtle);
      margin-bottom: 8px;
    }
    .card-head .anticon { font-size: 14px; }
    dl {
      display: grid;
      grid-template-columns: 110px 1fr;
      gap: 6px 12px;
      margin: 0;
      font-size: 13px;
    }
    dt { color: var(--c-text-subtle); font-weight: 400; }
    dd { margin: 0; color: var(--c-text); word-break: break-word; }
    .mono { font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); }
    .small { font-size: 12px; }
    .muted { color: var(--c-text-subtle); }
    .dot {
      display: inline-block;
      width: 8px; height: 8px;
      border-radius: 50%;
      margin-left: 8px;
      vertical-align: middle;
    }
    .dot.online { background: #22c55e; box-shadow: 0 0 0 2px rgba(34, 197, 94, .2); }
    .dot.offline { background: #94a3b8; }
    .presence { margin-left: 4px; font-size: 12px; vertical-align: middle; }

    /* Activity tab */
    .al-head {
      display: flex; align-items: center; gap: 8px;
      padding: 4px 0 12px;
    }
    .al-title { flex: 1; display: flex; align-items: center; gap: 6px; font-weight: 600; }
    .bolt { color: #F59E0B; }
    .al-feed {
      list-style: none; padding: 0; margin: 0;
      max-height: 420px; overflow-y: auto;
      border: 1px solid var(--c-border);
      border-radius: var(--radius);
      background: var(--c-surface);
    }
    .row {
      padding: 8px 12px;
      border-bottom: 1px solid var(--c-border-subtle, var(--c-border));
      font-size: 13px;
    }
    .row:last-child { border-bottom: 0; }
    .row[data-level='warn'] { background: rgba(245,158,11,0.10); }
    .row[data-level='error'] { background: rgba(220,38,38,0.10); }
    .when { color: var(--c-text-subtle); font-size: 11px; margin-bottom: 2px; }
    .line { display: flex; gap: 8px; flex-wrap: wrap; align-items: baseline; }
    .action {
      font-size: 11px;
      padding: 1px 6px;
      border-radius: 999px;
      background: var(--c-surface-3);
      color: var(--c-text-subtle);
    }
    .msg { color: var(--c-text); }
    .card-id { color: var(--c-text-subtle); font-size: 11px; }
  `],
})
export class AgentDetailDialog implements OnInit, OnDestroy {
  private api = inject(ApiService);
  readonly agent: AgentDetailInput = inject(NZ_MODAL_DATA).agent;

  readonly dash = '—';
  readonly notReported = 'not reported';

  items = signal<ActivityItem[]>([]);
  lastChecked = signal<Date | null>(null);
  private pollHandle: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    void this.refreshNow();
    // Refresh every 3 seconds while the modal is open — matches what
    // the old right-rail did so SAs see new events without manual
    // polling. clearInterval in ngOnDestroy.
    this.pollHandle = setInterval(() => { void this.refreshNow(); }, 3000);
  }

  ngOnDestroy(): void {
    if (this.pollHandle) clearInterval(this.pollHandle);
  }

  async refreshNow(): Promise<void> {
    try {
      const qs = new URLSearchParams({ agentId: this.agent.id, limit: '200' });
      const res = await firstValueFrom(
        this.api.get<ActivityResponse>(
          `/organizations/${this.agent.orgId}/agent-activity?${qs.toString()}`,
        ),
      );
      // Server returns ascending; the feed renders newest-first below
      // so reverse here. Capping at 200 mirrors the sidebar.
      const sorted = (res.items ?? []).slice().sort((a, b) => b.sequence - a.sequence);
      this.items.set(sorted);
      this.lastChecked.set(new Date());
    } catch {
      /* swallow — modal isn't critical, the next tick retries */
    }
  }

  exportMarkdown(): void {
    const lines = this.buildMarkdown();
    const blob = new Blob([lines], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = this.buildFilename();
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    // Give the browser a beat to start the download before revoking.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * Render the in-memory window into a self-contained markdown report.
   * Newest events first so the export reads like a log tail; metadata
   * header makes the file useful out-of-context (which agent, when
   * exported, how many entries).
   */
  private buildMarkdown(): string {
    const now = new Date();
    const header = [
      `# Agent activity — ${this.agent.title}`,
      '',
      `- Agent id: \`${this.agent.id}\``,
      `- Operator: ${this.agent.email}`,
      `- Status: ${this.agent.status}${this.agent.isOnline ? ' (online)' : ''}`,
      `- Exported: ${now.toISOString()}`,
      `- Entries: ${this.items().length} (in-memory; not persisted)`,
      '',
      '---',
      '',
    ];
    const rows = this.items().map((it) => {
      const ts = new Date(it.at).toISOString();
      const card = it.cardId ? ` _(card \`${it.cardId}\`)_` : '';
      const level = it.level && it.level !== 'info' ? ` **[${it.level}]**` : '';
      return `- **${ts}** · _${it.action}_${level} — ${it.message}${card}`;
    });
    return [...header, ...rows, ''].join('\n');
  }

  private buildFilename(): string {
    const safeTitle = this.agent.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'agent';
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `${safeTitle}-${this.agent.id}-${stamp}.md`;
  }

  formatBytes(bytes: number | null): string {
    if (bytes == null || bytes <= 0) return this.notReported;
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    let value = bytes;
    let unitIdx = 0;
    while (value >= 1024 && unitIdx < units.length - 1) {
      value /= 1024;
      unitIdx++;
    }
    const decimals = value >= 100 || unitIdx <= 1 ? 0 : 1;
    return `${value.toFixed(decimals)} ${units[unitIdx]}`;
  }
}
