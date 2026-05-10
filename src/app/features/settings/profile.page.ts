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
    <nz-card nzTitle="Profile photo" class="card">
      <div class="avatar-cell">
        @if (user()?.avatarUrl) {
          <img class="avatar-img" [src]="user()?.avatarUrl" alt="avatar" />
        } @else {
          <div class="avatar-placeholder"><span nz-icon nzType="user"></span></div>
        }
        <div class="avatar-actions">
          <button nz-button nzSize="small" (click)="fileInput.click()" [nzLoading]="uploading()">
            <span nz-icon nzType="edit"></span> Upload image
          </button>
          @if (user()?.avatarUrl) {
            <button nz-button nzSize="small" nzDanger (click)="removeAvatar()">
              <span nz-icon nzType="delete"></span> Remove
            </button>
          }
          <input #fileInput type="file" accept="image/*" hidden (change)="onFile($event)" />
        </div>
      </div>
    </nz-card>

    <nz-card nzTitle="Display name" class="card">
      <div class="profile-fields">
        <nz-form-item>
          <nz-form-label>Display name</nz-form-label>
          <nz-form-control [nzErrorTip]="nameError()">
            <input nz-input [(ngModel)]="displayName" name="dn" />
          </nz-form-control>
        </nz-form-item>
        <div class="muted">{{ user()?.email }}</div>
        <div class="role-tag">
          <span nz-icon nzType="user"></span>
          {{ user()?.role | uppercase }}
        </div>
        <div class="save-row">
          <button nz-button nzType="primary" (click)="saveName()" [nzLoading]="savingName()" [disabled]="!nameDirty() || !!nameError()">
            <span nz-icon nzType="save"></span> Save name
          </button>
        </div>
      </div>
    </nz-card>
  `,
  styles: [`
    .card { margin-bottom: 16px; }
    .avatar-cell { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
    .avatar-img { width: 96px; height: 96px; border-radius: 50%; object-fit: cover; border: 1px solid var(--c-border); }
    .avatar-placeholder {
      width: 96px; height: 96px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 50%;
      background: var(--c-surface-2);
    }
    .avatar-placeholder .anticon { font-size: 36px; color: var(--c-text-subtle); }
    .avatar-actions { display: flex; gap: 6px; }
    .profile-fields { max-width: 400px; }
    .muted { color: var(--c-text-subtle); font-size: 13px; }
    .role-tag {
      display: inline-flex; align-items: center; gap: 4px;
      margin-top: 6px;
      font-size: 11px; font-weight: 700;
      background: var(--c-primary-bg-subtle);
      color: var(--c-primary);
      padding: 2px 8px; border-radius: 3px;
      letter-spacing: .04em;
    }
    .save-row { margin-top: 12px; }
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
