import { Component, Input, OnChanges, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzModalService } from 'ng-zorro-antd/modal';
import { MarkdownModule } from 'ngx-markdown';
import { ApiService } from '../../core/api.service';
import { DialogService } from '../../shared/dialogs/dialog.service';
import { ToastService } from '../../shared/dialogs/toast.service';
import { AgentDetailDialog, AgentDetailInput } from './agent-detail.dialog';

interface Team {
  id: string;
  name: string;
  onboardingDoc: string;
}

interface Agent {
  id: string;
  title: string;
  status: 'pending' | 'approved' | 'stopped';
  isOnline: boolean;
  machineIp: string;
  machineName: string;
  llmVersion: string;
  email: string;
  registeredAt: string;
  lastSeenAt: string | null;
  // Optional machine spec — older agents may not report these.
  osName: string | null;
  osVersion: string | null;
  ramBytes: number | null;
  storageBytes: number | null;
  storageType: string | null;
  teamId?: string;
  team?: { id: string; name: string };
}

@Component({
  selector: 'app-team-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DatePipe,
    NzCardModule, NzButtonModule, NzIconModule, NzTabsModule, NzTableModule,
    NzTagModule, NzToolTipModule, NzInputModule, NzSpinModule, NzEmptyModule,
    NzBadgeModule, MarkdownModule,
  ],
  template: `
    @if (team(); as t) {
      <div class="page-header">
        <button nz-button nzType="text" (click)="back()">
          <span nz-icon nzType="arrow-left"></span>
        </button>
        <div>
          <h1>{{ t.name }}</h1>
          <div class="subtitle">
            <span nz-icon nzType="robot"></span>
            {{ agents().length }} registered ·
            <span class="muted">{{ pendingCount() }} pending</span>
          </div>
        </div>
      </div>

      <ng-template #agentsTitle>
        <span nz-icon nzType="robot"></span> Agents
        @if (pendingCount() > 0) {
          <nz-badge [nzCount]="pendingCount()" [nzStyle]="{ backgroundColor: '#946F00' }" class="pending-badge"></nz-badge>
        }
      </ng-template>
      <ng-template #onboardingTitle>
        <span nz-icon nzType="book"></span> Onboarding doc
      </ng-template>
      <ng-template #registerTitle>
        <span nz-icon nzType="code"></span> Register an agent
      </ng-template>

      <nz-tabset>
        <nz-tab [nzTitle]="agentsTitle">
          @if (agents().length === 0) {
            <nz-card class="empty">
              <nz-empty
                nzNotFoundImage="simple"
                nzNotFoundContent="No agents yet"
              ></nz-empty>
              <p class="muted center">
                Agents register themselves via the public API using an
                organization-scoped key. See the "Register an agent" tab for a
                runnable TypeScript snippet.
              </p>
            </nz-card>
          } @else {
            <nz-card>
              <nz-table [nzData]="agents()" nzSize="middle" [nzShowPagination]="false">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Status</th>
                    <th>Presence</th>
                    <th>LLM</th>
                    <th>Machine</th>
                    <th>Operator</th>
                    <th>Registered</th>
                    <th class="actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (a of agents(); track a.id) {
                    <tr>
                      <td>
                        <div class="bold">{{ a.title }}</div>
                        <div class="muted small mono">{{ a.id }}</div>
                      </td>
                      <td>
                        @switch (a.status) {
                          @case ('pending')  { <nz-tag nzColor="warning">pending</nz-tag> }
                          @case ('approved') { <nz-tag nzColor="success">approved</nz-tag> }
                          @case ('stopped')  { <nz-tag nzColor="error">stopped</nz-tag> }
                        }
                      </td>
                      <td>
                        @if (a.isOnline) {
                          <span class="dot online" nz-tooltip="Agent flagged itself online"></span>
                          <span class="presence-label">online</span>
                        } @else {
                          <span class="dot offline" nz-tooltip="Agent is offline"></span>
                          <span class="presence-label muted">offline</span>
                        }
                      </td>
                      <td>{{ a.llmVersion }}</td>
                      <td>
                        <div>{{ a.machineName }}</div>
                        <div class="muted small">{{ a.machineIp }}</div>
                      </td>
                      <td>{{ a.email }}</td>
                      <td>{{ a.registeredAt | date:'short' }}</td>
                      <td class="actions-col">
                        @if (a.status === 'pending') {
                          <button nz-button nzType="primary" nzSize="small" (click)="approve(a)">
                            <span nz-icon nzType="check"></span> Approve
                          </button>
                        }
                        @if (a.status === 'approved') {
                          <button nz-button nzType="default" nzSize="small" (click)="stop(a)">
                            <span nz-icon nzType="stop"></span> Stop
                          </button>
                        }
                        @if (a.status === 'stopped') {
                          <button nz-button nzType="primary" nzSize="small" (click)="resume(a)">
                            <span nz-icon nzType="play-circle"></span> Resume
                          </button>
                        }
                        <button nz-button nzType="text" nzSize="small" (click)="showDetail(a)" nz-tooltip="Machine details">
                          <span nz-icon nzType="info-circle"></span>
                        </button>
                        <button nz-button nzType="text" nzDanger nzSize="small" (click)="remove(a)" nz-tooltip="Delete">
                          <span nz-icon nzType="delete"></span>
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </nz-table>
            </nz-card>
          }
        </nz-tab>

        <nz-tab [nzTitle]="onboardingTitle">
          <nz-card [nzExtra]="saveTpl">
            <ng-template #saveTpl>
              <button nz-button nzType="primary" (click)="save()" [nzLoading]="saving()">
                <span nz-icon nzType="save"></span> Save
              </button>
            </ng-template>
            <p class="muted small">
              Markdown read by every agent before it registers. Update any time —
              agents fetch fresh content on next registration.
            </p>
            <div class="md-grid">
              <div class="md-pane">
                <div class="md-pane-head muted">Markdown</div>
                <textarea
                  class="md-textarea mono"
                  [(ngModel)]="docDraft"
                  spellcheck="false"
                ></textarea>
              </div>
              <div class="md-pane">
                <div class="md-pane-head muted">Preview</div>
                <div class="md-preview markdown-body">
                  <markdown [data]="docDraft"></markdown>
                </div>
              </div>
            </div>
          </nz-card>
        </nz-tab>

        <nz-tab [nzTitle]="registerTitle">
          <nz-card>
            <h3>Agent self-registration</h3>
            <p class="muted">
              An agent calls these endpoints from its own runtime. Below is the
              bare-minimum TypeScript snippet — copy, set
              <code>API_KEY</code>, and run.
            </p>
            <div class="endpoints">
              <div><strong>Endpoint base:</strong> <code class="mono">{{ apiBase }}</code></div>
              <div><strong>Team id:</strong> <code class="mono">{{ t.id }}</code></div>
            </div>
            <div class="snippet-tabs">
              <button
                nz-button nzType="text" nzSize="small"
                [class.active]="snippetLang() === 'ts'"
                (click)="snippetLang.set('ts')"
              >TypeScript</button>
              <button
                nz-button nzType="text" nzSize="small"
                [class.active]="snippetLang() === 'curl'"
                (click)="snippetLang.set('curl')"
              >cURL</button>
            </div>
            <div class="snippet-wrap">
              <button
                nz-button
                nzType="text"
                class="copy-btn"
                nz-tooltip="Copy"
                (click)="copySnippet()"
              >
                <span nz-icon nzType="copy"></span>
              </button>
              <markdown class="markdown-body" [data]="snippetLang() === 'ts' ? snippet : curlSnippet"></markdown>
            </div>
            <div class="callout">
              <span nz-icon nzType="bulb"></span>
              <div>
                Generate an API key from
                <strong>Settings → API keys</strong> first. The key is
                organization-scoped and shown only once at creation.
              </div>
            </div>
          </nz-card>
        </nz-tab>
      </nz-tabset>
    } @else {
      <nz-spin nzSpinning="true"></nz-spin>
    }
  `,
  styles: [`
    .page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    h1 { font-size: 22px; font-weight: 600; margin: 0; text-transform: capitalize; }
    .subtitle { display: flex; align-items: center; gap: 4px; color: var(--c-text-subtle); font-size: 13px; }
    .muted { color: var(--c-text-subtle); }
    .small { font-size: 12px; }
    .center { text-align: center; }
    .pending-badge { margin-left: 6px; }
    .actions-col { width: 280px; text-align: right; white-space: nowrap; }
    .dot {
      display: inline-block;
      width: 8px; height: 8px;
      border-radius: 50%;
      margin-right: 6px;
      vertical-align: middle;
    }
    .dot.online { background: #22c55e; box-shadow: 0 0 0 2px rgba(34, 197, 94, .2); }
    .dot.offline { background: #94a3b8; }
    .presence-label { font-size: 12px; vertical-align: middle; }
    .bold { font-weight: 500; }
    .empty { padding: 36px; text-align: center; }

    .md-grid {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 0; min-height: 420px;
      border: 1px solid var(--c-border);
      border-radius: var(--radius);
    }
    .md-pane { display: flex; flex-direction: column; border-right: 1px solid var(--c-border); }
    .md-pane:last-child { border-right: none; }
    .md-pane-head {
      padding: 6px 12px; font-size: 11px;
      text-transform: uppercase; letter-spacing: .04em;
      background: var(--c-surface-2);
      border-bottom: 1px solid var(--c-border);
    }
    .md-textarea {
      flex: 1; border: none; outline: none;
      padding: 12px; font-size: 13px;
      background: transparent; color: var(--c-text); resize: none;
      min-height: 380px;
    }
    .md-preview { flex: 1; padding: 12px; overflow: auto; min-height: 380px; }

    .endpoints { display: flex; gap: 24px; flex-wrap: wrap; padding: 8px 0 16px; font-size: 13px; }
    .endpoints code { background: var(--c-surface-2); padding: 2px 6px; border-radius: 3px; }
    .snippet-wrap {
      position: relative;
      border: 1px solid var(--c-border);
      border-radius: var(--radius);
      overflow: hidden;
    }
    .snippet-wrap ::ng-deep pre {
      margin: 0; padding: 16px;
      background: #0d1117 !important; color: #e6e9f3 !important;
      font-size: 13px; line-height: 1.55;
    }
    .snippet-wrap ::ng-deep code { color: inherit !important; background: transparent !important; }
    .copy-btn {
      position: absolute; top: 6px; right: 6px;
      color: rgba(255,255,255,.7) !important;
      z-index: 2;
    }
    .copy-btn:hover { color: white !important; background: rgba(255,255,255,.1) !important; }
    .snippet-tabs { display: flex; gap: 4px; margin: 12px 0 6px; }
    .snippet-tabs button.active { background: var(--c-primary-bg-subtle); color: var(--c-primary); }
    .callout {
      display: flex; gap: 12px; align-items: flex-start;
      margin-top: 16px;
      padding: 12px;
      background: var(--c-primary-bg-subtle);
      border: 1px solid var(--c-primary-bg-hover);
      border-radius: var(--radius);
      font-size: 13px;
    }
    .callout .anticon { color: var(--c-primary); font-size: 16px; }
  `],
})
export class TeamDetailComponent implements OnChanges {
  @Input() orgId = '';
  @Input() teamId = '';

  api = inject(ApiService);
  router = inject(Router);
  toast = inject(ToastService);
  confirmer = inject(DialogService);
  modal = inject(NzModalService);

  team = signal<Team | null>(null);
  agents = signal<Agent[]>([]);
  docDraft = '';
  saving = signal(false);
  snippetLang = signal<'ts' | 'curl'>('ts');

  pendingCount = computed(() => this.agents().filter((a) => a.status === 'pending').length);

  get apiBase(): string {
    if (typeof window !== 'undefined' && (window as any).__AGELO_API__) {
      return (window as any).__AGELO_API__;
    }
    return location.origin.replace(/\/$/, '') + '/api/v1';
  }

  get snippet(): string {
    return [
      '```typescript',
      '// agent.ts — minimal Agelo agent self-registration in TypeScript',
      "import { randomUUID } from 'crypto';",
      "import * as os from 'os';",
      '',
      `const BASE = '${this.apiBase}';`,
      `const TEAM_ID = '${this.teamId}';`,
      "const API_KEY = process.env.AGELO_API_KEY!; // shown once in Settings → API keys",
      '',
      'const agentId = randomUUID();',
      '',
      'async function call<T>(method: string, path: string, body?: unknown): Promise<T> {',
      '  const res = await fetch(`${BASE}${path}`, {',
      '    method,',
      '    headers: {',
      "      'content-type': 'application/json',",
      '      authorization: `ApiKey ${API_KEY}`,',
      '    },',
      '    body: body ? JSON.stringify(body) : undefined,',
      '  });',
      "  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${await res.text()}`);",
      '  return res.json() as Promise<T>;',
      '}',
      '',
      '// 1) Read the team onboarding doc.',
      'const onboarding = await call<{ teamName: string; content: string }>(',
      "  'GET', `/teams/${TEAM_ID}/onboarding`",
      ');',
      'console.log(`Joining ${onboarding.teamName}`);',
      'console.log(onboarding.content);',
      '',
      '// 2) Register this agent.',
      "await call('POST', `/teams/${TEAM_ID}/agents/register`, {",
      '  id: agentId,',
      "  title: 'Claude Backend Agent',",
      '  machineIp: Object.values(os.networkInterfaces())',
      '    .flat().find((i) => i && !i!.internal && i!.family === "IPv4")?.address ?? "127.0.0.1",',
      '  machineName: os.hostname(),',
      "  llmVersion: 'claude-sonnet-4-6',",
      "  email: 'operator@example.com',",
      '});',
      '',
      "// 3) Poll until the SA approves.",
      'while (true) {',
      "  const { status } = await call<{ status: string }>('GET', `/agents/${agentId}/status`);",
      "  if (status === 'approved') break;",
      "  if (status === 'stopped') throw new Error('Registration was stopped by SA');",
      '  await new Promise((r) => setTimeout(r, 30_000));',
      '}',
      '',
      "// 4) Read this agent's permissions.",
      'const perms = await call<{ permissions: string[] }>(',
      "  'GET', `/agents/${agentId}/permissions`",
      ');',
      'console.log(`Approved! Granted permissions: ${perms.permissions.join(\", \")}`);',
      '```',
    ].join('\n');
  }

  get curlSnippet(): string {
    const base = this.apiBase;
    const teamId = this.teamId;
    return [
      '```bash',
      '# Bare-minimum agent self-registration via cURL.',
      '# Replace AGELO_API_KEY with the value from Settings → API keys.',
      `BASE='${base}'`,
      `TEAM_ID='${teamId}'`,
      "API_KEY=\"$AGELO_API_KEY\"",
      'AGENT_ID=$(uuidgen | tr "[:upper:]" "[:lower:]")',
      '',
      '# 1) Read the team onboarding doc.',
      'curl -sSf "$BASE/teams/$TEAM_ID/onboarding" \\',
      '  -H "authorization: ApiKey $API_KEY"',
      '',
      '# 2) Register this agent.',
      'curl -sSf -X POST "$BASE/teams/$TEAM_ID/agents/register" \\',
      '  -H "authorization: ApiKey $API_KEY" \\',
      '  -H "content-type: application/json" \\',
      '  -d "{',
      '        \\"id\\": \\"$AGENT_ID\\",',
      '        \\"title\\": \\"Claude Backend Agent\\",',
      '        \\"machineIp\\": \\"$(hostname -I | awk \'{print $1}\')\\",',
      '        \\"machineName\\": \\"$(hostname)\\",',
      '        \\"llmVersion\\": \\"claude-sonnet-4-6\\",',
      '        \\"email\\": \\"operator@example.com\\"',
      '      }"',
      '',
      '# 3) Poll until the SA approves.',
      'while true; do',
      '  STATUS=$(curl -sSf "$BASE/agents/$AGENT_ID/status" \\',
      '    -H "authorization: ApiKey $API_KEY" | jq -r .status)',
      '  echo "status=$STATUS"',
      '  [ "$STATUS" = "approved" ] && break',
      '  [ "$STATUS" = "stopped" ] && { echo "stopped" >&2; exit 1; }',
      '  sleep 30',
      'done',
      '',
      "# 4) Read this agent's permissions.",
      'curl -sSf "$BASE/agents/$AGENT_ID/permissions" \\',
      '  -H "authorization: ApiKey $API_KEY"',
      '```',
    ].join('\n');
  }

  async ngOnChanges() {
    if (!this.orgId || !this.teamId) return;
    await this.refresh();
  }

  async refresh() {
    const team = await firstValueFrom(
      this.api.get<Team>(`/organizations/${this.orgId}/teams/${this.teamId}`),
    );
    this.team.set(team);
    this.docDraft = team.onboardingDoc;

    const allAgents = await firstValueFrom(
      this.api.get<Agent[]>(`/organizations/${this.orgId}/agents`),
    );
    this.agents.set(allAgents.filter((a) => (a as any).teamId === this.teamId));
  }

  back() { this.router.navigate(['/org', this.orgId, 'teams']); }

  async save() {
    this.saving.set(true);
    try {
      await firstValueFrom(
        this.api.patch(
          `/organizations/${this.orgId}/teams/${this.teamId}/onboarding`,
          { content: this.docDraft },
        ),
      );
      this.toast.success('Onboarding saved');
    } catch (err: any) {
      this.toast.error(err?.error?.message || 'Could not save');
    } finally {
      this.saving.set(false);
    }
  }

  async approve(a: Agent) {
    await firstValueFrom(this.api.patch(`/agents/${a.id}/approve`, {}));
    await this.refresh();
    this.toast.success(`${a.title} approved`);
  }

  async stop(a: Agent) {
    await firstValueFrom(this.api.patch(`/agents/${a.id}/stop`, {}));
    await this.refresh();
  }

  async resume(a: Agent) {
    try {
      await firstValueFrom(this.api.patch(`/agents/${a.id}/resume`, {}));
      this.toast.success(`${a.title} resumed`);
      await this.refresh();
    } catch (err: any) {
      this.toast.error(err?.error?.message || 'Could not resume agent');
    }
  }

  showDetail(a: Agent) {
    const detail: AgentDetailInput = {
      id: a.id,
      title: a.title,
      status: a.status,
      isOnline: a.isOnline,
      machineIp: a.machineIp,
      machineName: a.machineName,
      llmVersion: a.llmVersion,
      email: a.email,
      registeredAt: a.registeredAt,
      lastSeenAt: a.lastSeenAt,
      osName: a.osName,
      osVersion: a.osVersion,
      ramBytes: a.ramBytes,
      storageBytes: a.storageBytes,
      storageType: a.storageType,
    };
    this.modal.create<AgentDetailDialog, { agent: AgentDetailInput }>({
      nzTitle: `${a.title} — machine details`,
      nzContent: AgentDetailDialog,
      nzWidth: 720,
      nzFooter: null,
      nzData: { agent: detail },
    });
  }

  async remove(a: Agent) {
    const ok = await this.confirmer.confirm({
      title: `Delete agent "${a.title}"?`,
      message: 'The agent record will be removed permanently.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    await firstValueFrom(this.api.delete(`/agents/${a.id}`));
    await this.refresh();
  }

  async copySnippet() {
    const raw = this.snippetLang() === 'ts' ? this.snippet : this.curlSnippet;
    const code = raw.replace(/^```(?:typescript|bash)\n|\n```$/g, '');
    try {
      await navigator.clipboard.writeText(code);
      this.toast.success('Snippet copied');
    } catch {
      this.toast.error('Could not copy — select the text manually');
    }
  }
}
