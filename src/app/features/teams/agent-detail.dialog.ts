import { Component, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';

/**
 * Read-only "machine details" panel for an agent. Surfaces the
 * optional spec block captured during agent self-registration —
 * older agents that didn't ship those fields render an explicit
 * "not reported" placeholder instead of confusing blanks.
 */
export interface AgentDetailInput {
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
  osName: string | null;
  osVersion: string | null;
  ramBytes: number | null;
  storageBytes: number | null;
  storageType: string | null;
}

@Component({
  selector: 'app-agent-detail',
  standalone: true,
  imports: [CommonModule, DatePipe, NzIconModule, NzTagModule],
  template: `
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
    dt {
      color: var(--c-text-subtle);
      font-weight: 400;
    }
    dd {
      margin: 0;
      color: var(--c-text);
      word-break: break-word;
    }
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
  `],
})
export class AgentDetailDialog {
  // Modal payload is injected via the v17+ NZ_MODAL_DATA token. The
  // caller passes `{ agent }` through `nzData` on `modal.create()`.
  readonly agent: AgentDetailInput = inject(NZ_MODAL_DATA).agent;

  readonly dash = '—';
  readonly notReported = 'not reported';

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
