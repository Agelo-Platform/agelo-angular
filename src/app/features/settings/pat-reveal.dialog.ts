import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NZ_MODAL_DATA, NzModalRef } from 'ng-zorro-antd/modal';
import { ToastService } from '../../shared/dialogs/toast.service';

export interface PatRevealData {
  name: string;
  rawToken: string;
}

/**
 * Reveal dialog — shows the raw PAT exactly once with a Copy button
 * and a bold warning. Mirrors the API key reveal modal: the parent
 * page is responsible for opening it after a successful create and
 * refreshing the list when it closes.
 */
@Component({
  selector: 'app-pat-reveal',
  standalone: true,
  imports: [
    CommonModule,
    NzButtonModule, NzIconModule, NzAlertModule, NzToolTipModule,
  ],
  template: `
    <p class="muted">
      For security reasons, this is the only time the raw value of
      <strong>{{ data.name }}</strong> will be shown. Copy it now and
      store it somewhere safe.
    </p>
    <div class="key-row">
      <code class="key mono">{{ data.rawToken }}</code>
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
      nzMessage="Save it now — this is the only time you'll see it. If you lose it, revoke and create a new one."
    ></nz-alert>
    <div class="actions">
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
    .actions { display: flex; justify-content: flex-end; }
  `],
})
export class PatRevealComponent {
  toast = inject(ToastService);
  copied = false;

  constructor(
    private ref: NzModalRef,
    @Inject(NZ_MODAL_DATA) public data: PatRevealData,
  ) {}

  async copy() {
    try {
      await navigator.clipboard.writeText(this.data.rawToken);
      this.copied = true;
      this.toast.success('Token copied to clipboard');
      setTimeout(() => (this.copied = false), 2000);
    } catch {
      this.toast.error('Could not copy — select the text manually');
    }
  }

  close() { this.ref.close(); }
}
