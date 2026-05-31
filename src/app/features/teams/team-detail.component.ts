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
                    <tr class="agent-row" (click)="showDetail(a)" tabindex="0"
                        (keyup.enter)="showDetail(a)"
                        nz-tooltip="Open agent details, activity & logs">
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
                      <td class="actions-col" (click)="$event.stopPropagation()">
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
              @for (l of snippetLangs; track l.id) {
                <button
                  nz-button nzType="text" nzSize="small"
                  [class.active]="snippetLang() === l.id"
                  (click)="snippetLang.set(l.id)"
                >{{ l.label }}</button>
              }
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
              <markdown class="markdown-body" [data]="currentSnippet()"></markdown>
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
    .agent-row { cursor: pointer; transition: background .12s; }
    .agent-row:hover { background: var(--c-surface-3); }
    .agent-row:focus-visible {
      outline: 2px solid var(--c-primary);
      outline-offset: -2px;
    }
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
  readonly snippetLangs = [
    { id: 'ts',     label: 'TypeScript' },
    { id: 'python', label: 'Python' },
    { id: 'csharp', label: 'C#' },
    { id: 'java',   label: 'Java' },
    { id: 'php',    label: 'PHP' },
    { id: 'rust',   label: 'Rust' },
    { id: 'curl',   label: 'cURL' },
  ] as const;
  snippetLang = signal<typeof this.snippetLangs[number]['id']>('ts');

  currentSnippet(): string {
    switch (this.snippetLang()) {
      case 'ts':     return this.snippet;
      case 'python': return this.pythonSnippet;
      case 'csharp': return this.csharpSnippet;
      case 'java':   return this.javaSnippet;
      case 'php':    return this.phpSnippet;
      case 'rust':   return this.rustSnippet;
      case 'curl':   return this.curlSnippet;
    }
  }

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

  // ─── New language snippets (Python, C#, Java, PHP, Rust) ──────────────
  // Same 4-step shape across all five: read onboarding doc, register the
  // agent, poll until approved, read permissions. Each snippet is a
  // standalone copy-runnable file in its respective language.

  get pythonSnippet(): string {
    return [
      '```python',
      '"""agent.py — minimal Agelo agent self-registration in Python."""',
      'import os, socket, time, uuid, json, urllib.request',
      '',
      `BASE = '${this.apiBase}'`,
      `TEAM_ID = '${this.teamId}'`,
      'API_KEY = os.environ["AGELO_API_KEY"]',
      '',
      'AGENT_ID = str(uuid.uuid4())',
      '',
      'def call(method: str, path: str, body=None):',
      '    data = json.dumps(body).encode() if body is not None else None',
      '    req = urllib.request.Request(',
      '        BASE + path, method=method, data=data,',
      '        headers={"content-type": "application/json",',
      '                 "authorization": f"ApiKey {API_KEY}"})',
      '    with urllib.request.urlopen(req) as r:',
      '        return json.loads(r.read() or b"null")',
      '',
      '# 1) Read the team onboarding doc.',
      'onboarding = call("GET", f"/teams/{TEAM_ID}/onboarding")',
      'print("Joining", onboarding["teamName"])',
      'print(onboarding["content"])',
      '',
      '# 2) Register this agent.',
      'call("POST", f"/teams/{TEAM_ID}/agents/register", {',
      '    "id": AGENT_ID,',
      '    "title": "Claude Backend Agent",',
      '    "machineIp": socket.gethostbyname(socket.gethostname()),',
      '    "machineName": socket.gethostname(),',
      '    "llmVersion": "claude-sonnet-4-6",',
      '    "email": "operator@example.com",',
      '})',
      '',
      '# 3) Poll until the SA approves.',
      'while True:',
      '    status = call("GET", f"/agents/{AGENT_ID}/status")["status"]',
      '    if status == "approved": break',
      '    if status == "stopped": raise SystemExit("stopped")',
      '    time.sleep(30)',
      '',
      "# 4) Read this agent's permissions.",
      'perms = call("GET", f"/agents/{AGENT_ID}/permissions")["permissions"]',
      'print("Approved! Granted permissions:", ", ".join(perms))',
      '```',
    ].join('\n');
  }

  get csharpSnippet(): string {
    return [
      '```csharp',
      '// Agent.cs — minimal Agelo agent self-registration in C# (.NET 8).',
      'using System.Net;',
      'using System.Net.Http.Json;',
      '',
      `const string Base = "${this.apiBase}";`,
      `const string TeamId = "${this.teamId}";`,
      'var apiKey  = Environment.GetEnvironmentVariable("AGELO_API_KEY")!;',
      'var agentId = Guid.NewGuid().ToString();',
      '',
      'using var http = new HttpClient { BaseAddress = new Uri(Base) };',
      'http.DefaultRequestHeaders.Add("authorization", $"ApiKey {apiKey}");',
      '',
      'async Task<T?> Call<T>(HttpMethod method, string path, object? body = null)',
      '{',
      '    using var req = new HttpRequestMessage(method, path);',
      '    if (body is not null) req.Content = JsonContent.Create(body);',
      '    using var res = await http.SendAsync(req);',
      '    res.EnsureSuccessStatusCode();',
      '    return await res.Content.ReadFromJsonAsync<T>();',
      '}',
      '',
      '// 1) Read the team onboarding doc.',
      'var onboarding = await Call<JsonDocument>(',
      '    HttpMethod.Get, $"/teams/{TeamId}/onboarding");',
      'Console.WriteLine("Joining " + onboarding!.RootElement.GetProperty("teamName"));',
      '',
      '// 2) Register this agent.',
      'await Call<object>(HttpMethod.Post, $"/teams/{TeamId}/agents/register", new {',
      '    id          = agentId,',
      '    title       = "Claude Backend Agent",',
      '    machineIp   = Dns.GetHostAddresses(Dns.GetHostName())[0].ToString(),',
      '    machineName = Dns.GetHostName(),',
      '    llmVersion  = "claude-sonnet-4-6",',
      '    email       = "operator@example.com"',
      '});',
      '',
      '// 3) Poll until the SA approves.',
      'while (true)',
      '{',
      '    var s = await Call<JsonDocument>(HttpMethod.Get, $"/agents/{agentId}/status");',
      '    var status = s!.RootElement.GetProperty("status").GetString();',
      '    if (status == "approved") break;',
      '    if (status == "stopped") throw new Exception("Registration was stopped");',
      '    await Task.Delay(TimeSpan.FromSeconds(30));',
      '}',
      '',
      "// 4) Read this agent's permissions.",
      'var perms = await Call<JsonDocument>(HttpMethod.Get, $"/agents/{agentId}/permissions");',
      'Console.WriteLine("Approved! Permissions: " + perms!.RootElement.GetProperty("permissions"));',
      '```',
    ].join('\n');
  }

  get javaSnippet(): string {
    return [
      '```java',
      '// Agent.java — minimal Agelo agent self-registration (Java 17+).',
      'import java.net.*;',
      'import java.net.http.*;',
      'import java.net.http.HttpResponse.BodyHandlers;',
      'import java.util.UUID;',
      '',
      'public class Agent {',
      `    static final String BASE = "${this.apiBase}";`,
      `    static final String TEAM_ID = "${this.teamId}";`,
      '    static final String API_KEY = System.getenv("AGELO_API_KEY");',
      '    static final HttpClient HTTP = HttpClient.newHttpClient();',
      '',
      '    static HttpResponse<String> call(String method, String path, String body) throws Exception {',
      '        var b = HttpRequest.newBuilder(URI.create(BASE + path))',
      '            .header("authorization", "ApiKey " + API_KEY)',
      '            .header("content-type", "application/json")',
      '            .method(method, body == null',
      '                ? HttpRequest.BodyPublishers.noBody()',
      '                : HttpRequest.BodyPublishers.ofString(body));',
      '        return HTTP.send(b.build(), BodyHandlers.ofString());',
      '    }',
      '',
      '    public static void main(String[] args) throws Exception {',
      '        var agentId = UUID.randomUUID().toString();',
      '',
      '        // 1) Read the team onboarding doc.',
      '        call("GET", "/teams/" + TEAM_ID + "/onboarding", null);',
      '',
      '        // 2) Register this agent.',
      '        var host = InetAddress.getLocalHost();',
      '        call("POST", "/teams/" + TEAM_ID + "/agents/register",',
      '            String.format("""',
      '                {"id": "%s", "title": "Claude Backend Agent",',
      '                 "machineIp": "%s", "machineName": "%s",',
      '                 "llmVersion": "claude-sonnet-4-6",',
      '                 "email": "operator@example.com"}""",',
      '                agentId, host.getHostAddress(), host.getHostName()));',
      '',
      '        // 3) Poll until the SA approves.',
      '        while (true) {',
      '            var r = call("GET", "/agents/" + agentId + "/status", null);',
      '            if (r.body().contains("approved")) break;',
      '            if (r.body().contains("stopped")) throw new RuntimeException("stopped");',
      '            Thread.sleep(30_000);',
      '        }',
      '',
      "        // 4) Read this agent's permissions.",
      '        call("GET", "/agents/" + agentId + "/permissions", null);',
      '        System.out.println("Approved");',
      '    }',
      '}',
      '```',
    ].join('\n');
  }

  get phpSnippet(): string {
    return [
      '```php',
      '<?php',
      '// agent.php — minimal Agelo agent self-registration in PHP 8.',
      '',
      `const BASE    = '${this.apiBase}';`,
      `const TEAM_ID = '${this.teamId}';`,
      "$apiKey = getenv('AGELO_API_KEY');",
      "$agentId = bin2hex(random_bytes(16));",
      '',
      'function call(string $method, string $path, array|null $body = null): array|null {',
      '    global $apiKey;',
      '    $ctx = stream_context_create([\'http\' => [',
      '        \'method\'  => $method,',
      '        \'header\'  => "authorization: ApiKey $apiKey\\r\\ncontent-type: application/json",',
      '        \'content\' => $body ? json_encode($body) : null,',
      '        \'ignore_errors\' => true,',
      '    ]]);',
      '    $res = file_get_contents(BASE . $path, false, $ctx);',
      '    return $res === false ? null : json_decode($res, true);',
      '}',
      '',
      '// 1) Read the team onboarding doc.',
      'call("GET", "/teams/" . TEAM_ID . "/onboarding");',
      '',
      '// 2) Register this agent.',
      'call("POST", "/teams/" . TEAM_ID . "/agents/register", [',
      '    "id"          => $agentId,',
      '    "title"       => "Claude Backend Agent",',
      '    "machineIp"   => gethostbyname(gethostname()),',
      '    "machineName" => gethostname(),',
      '    "llmVersion"  => "claude-sonnet-4-6",',
      '    "email"       => "operator@example.com",',
      ']);',
      '',
      '// 3) Poll until the SA approves.',
      'while (true) {',
      '    $s = call("GET", "/agents/$agentId/status")["status"];',
      '    if ($s === "approved") break;',
      '    if ($s === "stopped") throw new RuntimeException("stopped");',
      '    sleep(30);',
      '}',
      '',
      "// 4) Read this agent's permissions.",
      '$perms = call("GET", "/agents/$agentId/permissions")["permissions"];',
      'echo "Approved! Permissions: " . implode(", ", $perms) . "\\n";',
      '```',
    ].join('\n');
  }

  get rustSnippet(): string {
    return [
      '```rust',
      '// agent.rs — minimal Agelo agent self-registration (Rust 1.75+).',
      '// Cargo.toml: reqwest = { version = "0.12", features = ["blocking", "json"] }',
      '//             serde_json = "1"; uuid = { version = "1", features = ["v4"] }',
      'use std::{env, thread, time::Duration};',
      'use reqwest::blocking::Client;',
      'use serde_json::{json, Value};',
      '',
      'fn main() -> Result<(), Box<dyn std::error::Error>> {',
      `    let base = "${this.apiBase}";`,
      `    let team_id = "${this.teamId}";`,
      '    let api_key = env::var("AGELO_API_KEY")?;',
      '    let agent_id = uuid::Uuid::new_v4().to_string();',
      '    let http = Client::new();',
      '',
      '    let call = |method: reqwest::Method, path: &str, body: Option<Value>| -> Result<Value, _> {',
      '        let mut req = http.request(method, format!("{base}{path}"))',
      '            .header("authorization", format!("ApiKey {api_key}"))',
      '            .header("content-type", "application/json");',
      '        if let Some(b) = body { req = req.json(&b); }',
      '        req.send()?.error_for_status()?.json::<Value>()',
      '    };',
      '',
      '    // 1) Read the team onboarding doc.',
      '    call(reqwest::Method::GET, &format!("/teams/{team_id}/onboarding"), None)?;',
      '',
      '    // 2) Register this agent.',
      '    let hostname = hostname::get()?.to_string_lossy().into_owned();',
      '    call(reqwest::Method::POST, &format!("/teams/{team_id}/agents/register"), Some(json!({',
      '        "id":          agent_id,',
      '        "title":       "Claude Backend Agent",',
      '        "machineIp":   "127.0.0.1",',
      '        "machineName": hostname,',
      '        "llmVersion":  "claude-sonnet-4-6",',
      '        "email":       "operator@example.com",',
      '    })))?;',
      '',
      '    // 3) Poll until the SA approves.',
      '    loop {',
      '        let s = call(reqwest::Method::GET, &format!("/agents/{agent_id}/status"), None)?;',
      '        match s["status"].as_str() {',
      '            Some("approved") => break,',
      '            Some("stopped") => return Err("stopped".into()),',
      '            _ => thread::sleep(Duration::from_secs(30)),',
      '        }',
      '    }',
      '',
      "    // 4) Read this agent's permissions.",
      '    call(reqwest::Method::GET, &format!("/agents/{agent_id}/permissions"), None)?;',
      '    println!("Approved!");',
      '    Ok(())',
      '}',
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
      orgId: this.orgId,
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
      nzTitle: `${a.title} — agent details`,
      nzContent: AgentDetailDialog,
      nzWidth: 760,
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
    const raw = this.currentSnippet();
    const code = raw.replace(/^```\w+\n|\n```$/g, '');
    try {
      await navigator.clipboard.writeText(code);
      this.toast.success('Snippet copied');
    } catch {
      this.toast.error('Could not copy — select the text manually');
    }
  }
}
