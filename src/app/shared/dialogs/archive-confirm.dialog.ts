import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NZ_MODAL_DATA, NzModalRef } from 'ng-zorro-antd/modal';

export interface ArchiveConfirmData {
  title: string;
  message: string;
  archiveLabel?: string;
  permanentLabel?: string;
  cancelLabel?: string;
}

export type ArchiveConfirmResult = 'archive' | 'permanent' | null;

/**
 * Two-action soft/hard delete prompt used across every entity type per
 * Feature 019. Returns 'archive' (soft delete), 'permanent' (hard delete),
 * or null when the SA cancels.
 */
@Component({
  selector: 'app-archive-confirm',
  standalone: true,
  imports: [CommonModule, NzButtonModule, NzIconModule],
  template: `
    <div class="ac">
      <p class="msg">{{ data.message }}</p>
      <div class="hints">
        <div class="hint">
          <span nz-icon nzType="folder-open" class="hint-ic"></span>
          <div class="hint-body">
            <div class="hint-title">Archive</div>
            <div class="hint-text">
              Moves it to the Archived section. Nothing is lost — restore any time.
            </div>
          </div>
        </div>
        <div class="hint danger">
          <span nz-icon nzType="warning" class="hint-ic"></span>
          <div class="hint-body">
            <div class="hint-title">Permanent delete</div>
            <div class="hint-text">
              Wipes it from the database. This cannot be undone.
            </div>
          </div>
        </div>
      </div>
      <div class="actions">
        <button nz-button class="cancel-btn" (click)="cancel()">
          {{ data.cancelLabel ?? 'Cancel' }}
        </button>
        <button nz-button (click)="archive()" class="archive-btn">
          <span nz-icon nzType="folder-open"></span>
          <span>{{ data.archiveLabel ?? 'Archive' }}</span>
        </button>
        <button nz-button nzType="primary" nzDanger (click)="permanent()" class="permanent-btn">
          <span nz-icon nzType="delete"></span>
          <span>{{ data.permanentLabel ?? 'Delete permanently' }}</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .msg { margin: 0 0 16px; color: var(--c-text); line-height: 1.55; }
    .hints { display: flex; flex-direction: column; gap: 10px; margin: 0 0 20px; }
    .hint {
      display: grid;
      grid-template-columns: 24px 1fr;
      gap: 12px;
      align-items: start;
      padding: 12px 14px;
      background: var(--c-surface-2);
      border: 1px solid var(--c-border);
      border-radius: var(--radius);
    }
    .hint.danger {
      border-color: rgba(201, 55, 44, 0.35);
      background: rgba(201, 55, 44, 0.06);
    }
    .hint-ic {
      font-size: 18px;
      line-height: 24px;
      color: var(--c-primary);
    }
    .hint.danger .hint-ic { color: var(--c-danger); }
    .hint-body { min-width: 0; }
    .hint-title {
      font-weight: 600; color: var(--c-text); font-size: 13px;
      margin-bottom: 2px;
    }
    .hint.danger .hint-title { color: var(--c-danger); }
    .hint-text { font-size: 13px; color: var(--c-text-subtle); line-height: 1.5; }
    .actions {
      display: flex;
      justify-content: flex-end;
      flex-wrap: wrap;
      gap: 10px;
    }
    .actions button { display: inline-flex; align-items: center; gap: 6px; }
  `],
})
export class ArchiveConfirmComponent {
  constructor(
    private ref: NzModalRef<ArchiveConfirmComponent, ArchiveConfirmResult>,
    @Inject(NZ_MODAL_DATA) public data: ArchiveConfirmData,
  ) {}

  cancel() { this.ref.close(null); }
  archive() { this.ref.close('archive'); }
  permanent() { this.ref.close('permanent'); }
}
