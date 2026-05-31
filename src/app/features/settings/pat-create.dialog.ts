import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { ToastService } from '../../shared/dialogs/toast.service';
import {
  PAT_SECTIONS,
  PatCreated,
  PatLevel,
  PatPermissions,
  PatSection,
  PatService,
} from '../../core/pat.service';

/**
 * "New Personal Access Token" form. Renders the same per-section
 * radio matrix the API expects, plus shortcut buttons that mass-toggle
 * every row to read or write. The dialog resolves with the freshly
 * created PAT so the parent page can chain into the reveal modal.
 */
@Component({
  selector: 'app-pat-create',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    NzFormModule, NzInputModule, NzRadioModule, NzDatePickerModule,
    NzButtonModule, NzIconModule,
  ],
  template: `
    <p class="muted">
      Generate a token tied to your account. Pick the surface areas it
      can access, then copy the raw value once on the next screen.
    </p>
    <form class="form" nz-form nzLayout="vertical" (submit)="submit($event)">
      <nz-form-item>
        <nz-form-label nzRequired>Name</nz-form-label>
        <nz-form-control>
          <input
            nz-input
            [(ngModel)]="name"
            name="name"
            placeholder="e.g. ci-deploy-bot"
          />
        </nz-form-control>
      </nz-form-item>

      <nz-form-item>
        <nz-form-label>Expires (optional)</nz-form-label>
        <nz-form-control>
          <nz-date-picker
            [(ngModel)]="expiresAt"
            name="expiresAt"
            nzPlaceHolder="No expiry"
            class="full"
          ></nz-date-picker>
          <div class="muted small hint">
            Leave blank to keep the token valid until you revoke it.
          </div>
        </nz-form-control>
      </nz-form-item>

      <div class="perms-head">
        <strong>Permissions</strong>
        <div class="bulk">
          <button nz-button nzSize="small" type="button" (click)="setAll('read')">
            <span nz-icon nzType="eye"></span> All read
          </button>
          <button nz-button nzSize="small" type="button" (click)="setAll('write')">
            <span nz-icon nzType="edit"></span> All write
          </button>
          <button nz-button nzSize="small" type="button" (click)="setAll('none')">
            Clear
          </button>
        </div>
      </div>

      <div class="perms-grid">
        <div class="grid-row grid-head">
          <div class="cell label">Section</div>
          <div class="cell">None</div>
          <div class="cell">Read</div>
          <div class="cell">Write</div>
        </div>
        @for (s of sections; track s.key) {
          <div class="grid-row">
            <div class="cell label">{{ s.label }}</div>
            <nz-radio-group
              class="cells"
              [ngModel]="permissions[s.key] ?? 'none'"
              (ngModelChange)="setLevel(s.key, $event)"
              [name]="'p_' + s.key"
            >
              <div class="cell">
                <label nz-radio nzValue="none"></label>
              </div>
              <div class="cell">
                <label nz-radio nzValue="read"></label>
              </div>
              <div class="cell">
                <label nz-radio nzValue="write"></label>
              </div>
            </nz-radio-group>
          </div>
        }
      </div>
    </form>
  `,
  styles: [`
    .muted { color: var(--c-text-subtle); font-size: 13px; margin-top: 0; margin-bottom: 12px; }
    .small { font-size: 12px; }
    .hint { margin-top: 4px; }
    .full { width: 100%; }
    .form { padding-top: 0; }

    .perms-head {
      display: flex; align-items: center; justify-content: space-between;
      margin: 16px 0 8px;
    }
    .perms-head .bulk { display: flex; gap: 6px; }

    .perms-grid {
      border: 1px solid var(--c-border);
      border-radius: var(--radius);
      overflow: hidden;
    }
    .grid-row {
      display: grid;
      grid-template-columns: 1fr 192px;
      align-items: center;
      border-bottom: 1px solid var(--c-border-subtle);
    }
    .grid-row:last-child { border-bottom: none; }
    .grid-row.grid-head {
      grid-template-columns: 1fr 64px 64px 64px;
      background: var(--c-surface-2);
      font-weight: 500;
      font-size: 12px;
      text-transform: uppercase;
      color: var(--c-text-subtle);
    }
    .cells {
      display: grid;
      grid-template-columns: 64px 64px 64px;
    }
    .cell {
      padding: 8px 12px;
      text-align: center;
    }
    .cell.label { text-align: left; font-weight: 500; }
    /* Center the radio circle inside its cell — ng-zorro renders the
       label inline-block; we want it visually centered in the column. */
    .cells .cell label { display: block; }
  `],
})
export class PatCreateComponent {
  private ref = inject(NzModalRef);
  private pats = inject(PatService);
  private toast = inject(ToastService);

  sections = PAT_SECTIONS;
  name = '';
  expiresAt: Date | null = null;
  // Plain object so ngModel two-way binding works without extra plumbing.
  permissions: PatPermissions = {};

  setLevel(section: PatSection, level: PatLevel) {
    if (level === 'none') {
      // Drop the key entirely so we send a compact wire payload.
      const next = { ...this.permissions };
      delete next[section];
      this.permissions = next;
    } else {
      this.permissions = { ...this.permissions, [section]: level };
    }
  }

  setAll(level: PatLevel) {
    if (level === 'none') {
      this.permissions = {};
      return;
    }
    const next: PatPermissions = {};
    for (const s of this.sections) next[s.key] = level;
    this.permissions = next;
  }

  /**
   * Returns the freshly created PAT to the parent dialog. The parent
   * relays it into the reveal modal so the user can copy the raw token
   * exactly once before it disappears.
   */
  async submit(ev?: Event): Promise<PatCreated | null> {
    if (ev) ev.preventDefault();
    if (!this.name.trim()) {
      this.toast.error('Name is required');
      return null;
    }
    try {
      const res = await firstValueFrom(
        this.pats.create({
          name: this.name.trim(),
          permissions: this.permissions,
          // ng-zorro emits a Date — convert to ISO so the backend's
          // DateTime? deserializer is happy. Null → omit field.
          expiresAt: this.expiresAt ? this.expiresAt.toISOString() : null,
        }),
      );
      this.ref.close(res);
      return res;
    } catch {
      // The interceptor already surfaces toast errors; close with
      // null so the parent doesn't try to reveal nothing.
      this.ref.close(null);
      return null;
    }
  }
}
