import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../shared/dialogs/toast.service';

@Component({
  selector: 'app-settings-profile',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    NzCardModule, NzIconModule, NzInputModule, NzButtonModule, NzFormModule,
  ],
  template: `
    <nz-card class="card">
      <div class="head-row">
        <h3 class="card-h">Profile</h3>
        <p class="card-sub">Information shown next to your activity.</p>
      </div>
      <div class="profile-grid">
        <div class="avatar-cell">
          @if (user()?.avatarUrl) {
            <img class="avatar-img" [src]="user()?.avatarUrl" alt="avatar" />
          } @else {
            <div class="avatar-placeholder">{{ initials() }}</div>
          }
          <button nz-button nzSize="small" (click)="fileInput.click()" [nzLoading]="uploading()">
            Change
          </button>
          @if (user()?.avatarUrl) {
            <button nz-button nzSize="small" nzDanger (click)="removeAvatar()">Remove</button>
          }
          <input #fileInput type="file" accept="image/*" hidden (change)="onFile($event)" />
        </div>

        <div class="fields">
          <nz-form-item>
            <nz-form-label>Display name</nz-form-label>
            <nz-form-control [nzErrorTip]="nameError()">
              <input nz-input [(ngModel)]="displayName" name="dn" />
            </nz-form-control>
          </nz-form-item>

          <div class="field">
            <label class="lbl">Email</label>
            <input nz-input [value]="user()?.email" readonly class="ro" />
            <div class="help">Used for login and notifications. Verified.</div>
          </div>

          <div class="field">
            <label class="lbl">Title</label>
            <input nz-input [value]="roleTitle()" readonly class="ro" />
          </div>

          <div class="save-row">
            <button nz-button nzType="primary" (click)="saveName()" [nzLoading]="savingName()" [disabled]="!nameDirty() || !!nameError()">
              <span nz-icon nzType="check"></span> Save changes
            </button>
            <button nz-button nzType="text" (click)="resetName()" [disabled]="!nameDirty()">Cancel</button>
          </div>
        </div>
      </div>
    </nz-card>
  `,
  styles: [`
    .card { margin-bottom: 16px; }
    .head-row { margin-bottom: 16px; }
    .card-h { margin: 0; font-size: 15px; font-weight: 600; }
    .card-sub { margin: 4px 0 0; font-size: 13px; color: var(--c-text-subtle); }
    .profile-grid { display: grid; grid-template-columns: auto 1fr; gap: 24px; align-items: flex-start; }
    .avatar-cell { display: flex; flex-direction: column; gap: 10px; align-items: center; }
    .avatar-img { width: 72px; height: 72px; border-radius: 50%; object-fit: cover; border: 1px solid var(--c-border); }
    .avatar-placeholder {
      width: 72px; height: 72px;
      display: grid; place-items: center;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--c-primary), var(--c-blue-light));
      color: #fff; font-size: 22px; font-weight: 600;
    }
    .fields { max-width: 520px; }
    .field { margin-bottom: 14px; }
    .lbl { display: block; font-size: 12px; font-weight: 600; color: var(--c-text-subtle); margin-bottom: 6px; }
    .ro { background: var(--c-surface-2) !important; color: var(--c-text-subtle) !important; }
    .help { font-size: 12px; color: var(--c-text-subtle); margin-top: 6px; }
    .save-row { display: flex; gap: 8px; margin-top: 4px; }
  `],
})
export class SettingsProfilePage {
  api = inject(ApiService);
  auth = inject(AuthService);
  toast = inject(ToastService);

  user = computed(() => this.auth.user());
  uploading = signal(false);
  savingName = signal(false);
  displayName = this.auth.user()?.displayName ?? '';

  nameDirty() { return this.displayName.trim() !== (this.auth.user()?.displayName ?? ''); }
  nameError() {
    return this.displayName.trim().length === 0 ? 'Display name is required' : '';
  }

  resetName() { this.displayName = this.auth.user()?.displayName ?? ''; }

  /** Avatar fallback initials from the display name. */
  initials(): string {
    const parts = (this.auth.user()?.displayName ?? '?').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  /** Human-readable role used as the read-only "Title" field. */
  roleTitle(): string {
    const role = this.auth.user()?.role ?? '';
    return role
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ') || '—';
  }

  async saveName() {
    if (this.nameError()) return;
    this.savingName.set(true);
    try {
      const res = await firstValueFrom(
        this.api.patch<{ displayName: string }>(
          '/settings/profile',
          { displayName: this.displayName.trim() },
        ),
      );
      const cur = this.auth.user();
      if (cur) this.auth.setUser({ ...cur, displayName: res.displayName });
      this.toast.success('Profile saved');
    } catch (err: any) {
      this.toast.error(err?.error?.message || 'Could not save');
    } finally {
      this.savingName.set(false);
    }
  }

  onFile(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.toast.error('Please choose an image');
      return;
    }
    if (file.size > 1_500_000) {
      this.toast.error('Image must be under ~1.5 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || '');
      this.uploading.set(true);
      try {
        const res = await firstValueFrom(
          this.api.patch<{ avatarUrl: string | null }>(
            '/settings/avatar', { dataUrl },
          ),
        );
        const cur = this.auth.user();
        if (cur) this.auth.setUser({ ...cur, avatarUrl: res.avatarUrl });
        this.toast.success('Avatar updated');
      } catch (err: any) {
        this.toast.error(err?.error?.message || 'Could not upload');
      } finally {
        this.uploading.set(false);
      }
    };
    reader.readAsDataURL(file);
  }

  async removeAvatar() {
    this.uploading.set(true);
    try {
      const res = await firstValueFrom(
        this.api.patch<{ avatarUrl: string | null }>(
          '/settings/avatar', { dataUrl: null },
        ),
      );
      const cur = this.auth.user();
      if (cur) this.auth.setUser({ ...cur, avatarUrl: res.avatarUrl });
      this.toast.success('Avatar removed');
    } finally {
      this.uploading.set(false);
    }
  }
}
