import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NZ_MODAL_DATA, NzModalRef } from 'ng-zorro-antd/modal';
import { ToastService } from '../../shared/dialogs/toast.service';

export interface ApiKeyRevealData {
  name: string;
  rawKey: string;
}

@Component({
  selector: 'app-api-key-reveal',
  standalone: true,
  imports: [
    CommonModule,
    NzButtonModule, NzIconModule, NzAlertModule, NzToolTipModule,
  ],
  template: `
    <p class="muted">
      For security reasons, this is the only time the raw key for
      <strong>{{ data.name }}</strong> will be shown. Copy it now and store
      it somewhere safe.
    </p>
    <div class="key-row">
      <code class="key mono">{{ data.rawKey }}</code>
      <button
        nz-button
        nzType="primary"
        class="copy-btn"
        (click)="copy()"
        nz-tooltip="Copy to clipboard"
      >
        <span nz-icon [nzType]="copied ? 'check' : 'copy'"></span>
        {{ copied ? 'Copied' : 'Copy' }}
      </button>
    </div>
    <nz-alert
      class="warn"
      nzType="warning"
      nzShowIcon
      nzMessage="This key will not be shown again. Make sure you save it before closing."
    ></nz-alert>
    <div class="actions">
      <button nz-button (click)="downloadEnv()">
        <span nz-icon nzType="download"></span> Download .env
      </button>
      <button nz-button nzType="primary" (click)="close()">I've saved it</button>
    </div>
  `,
  styles: [`
    .muted { color: var(--c-text-subtle); margin: 0 0 12px; }
    .key-row {
      display: flex; gap: 8px; align-items: center;
      margin-bottom: 12px;
    }
    .key {
      flex: 1; min-width: 0;
      padding: 10px 12px;
      background: var(--c-surface-2);
      border: 1px dashed var(--c-border);
      border-radius: 3px;
      word-break: break-all;
      font-size: 13px;
      color: var(--c-text);
    }
    .copy-btn { flex: 0 0 auto; }
    .warn { margin-bottom: 8px; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; }
  `],
})
export class ApiKeyRevealComponent {
  toast = inject(ToastService);
  copied = false;

  constructor(
    private ref: NzModalRef,
    @Inject(NZ_MODAL_DATA) public data: ApiKeyRevealData,
  ) {}

  async copy() {
    try {
      await navigator.clipboard.writeText(this.data.rawKey);
      this.copied = true;
      this.toast.success('Key copied to clipboard');
      setTimeout(() => (this.copied = false), 2000);
    } catch {
      this.toast.error('Could not copy — select the text manually');
    }
  }

  /**
   * Download the key as a ready-to-source `.env` snippet so operators can
   * drop it straight into an agent's environment. Powers the
   * "Download .env" action on the reveal dialog.
   */
  downloadEnv() {
    const body = `# Agelo API key — ${this.data.name}\n` +
      `# Generated ${new Date().toISOString()}. Store securely; not shown again.\n` +
      `AGELO_API_KEY=${this.data.rawKey}\n`;
    const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agelo.env';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  close() { this.ref.close(); }
}
