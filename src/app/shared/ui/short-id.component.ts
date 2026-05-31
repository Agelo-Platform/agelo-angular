import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { ToastService } from '../dialogs/toast.service';

/**
 * Compact GUID display: shows the first 8 characters in a monospace chip.
 * Hover reveals the full id; click copies it to the clipboard. Used
 * everywhere on the platform for visual consistency per the UX request:
 * "Try to keep these kinds of UI/UX improvements consistent across the
 * whole Agelo platform."
 */
@Component({
  selector: 'app-short-id',
  standalone: true,
  imports: [CommonModule, NzIconModule, NzToolTipModule],
  template: `
    <span
      class="short-id mono"
      [nz-tooltip]="tooltip"
      (click)="copy($event)"
      role="button"
      tabindex="0"
      (keydown.enter)="copy($event)"
    >
      {{ display }}<span class="dots">…</span>
      <span nz-icon nzType="copy" class="copy-ic"></span>
    </span>
  `,
  styles: [`
    .short-id {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 1px 6px;
      font-size: 12px;
      background: var(--c-surface-2);
      border: 1px solid var(--c-border);
      border-radius: 3px;
      color: var(--c-text-subtle);
      cursor: pointer;
      user-select: none;
      transition: background .12s ease, color .12s ease;
    }
    .short-id:hover { background: var(--c-primary-bg-subtle); color: var(--c-primary); }
    .copy-ic { font-size: 11px; opacity: .7; }
    .dots { opacity: .5; }
  `],
})
export class ShortIdComponent {
  @Input() id = '';
  @Input() length = 8;
  @Input() label = 'id';

  toast = inject(ToastService);

  get display(): string {
    return (this.id || '').slice(0, this.length);
  }

  get tooltip(): string {
    return `${this.label}: ${this.id} — click to copy`;
  }

  async copy(ev: Event) {
    ev.stopPropagation();
    if (!this.id) return;
    try {
      await navigator.clipboard.writeText(this.id);
      this.toast.success(`${this.label} copied`);
    } catch {
      this.toast.error('Could not copy — select the id manually');
    }
  }
}
