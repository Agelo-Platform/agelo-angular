import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../shared/dialogs/toast.service';

@Component({
  selector: 'app-settings-security',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    NzCardModule, NzFormModule, NzInputModule, NzButtonModule,
    NzIconModule, NzAlertModule,
  ],
  template: `
    <nz-card nzTitle="Change password">
      <p class="muted">Minimum 8 characters with at least one number and one special character.</p>
      <form (submit)="submit($event)" class="form" nz-form nzLayout="vertical">
        <nz-form-item>
          <nz-form-label>Current password</nz-form-label>
          <nz-form-control>
            <nz-input-group nzPrefixIcon="lock">
              <input nz-input type="password" [(ngModel)]="cur" name="cur" autocomplete="current-password" placeholder="Current password" />
            </nz-input-group>
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>New password</nz-form-label>
          <nz-form-control>
            <nz-input-group nzPrefixIcon="key">
              <input nz-input type="password" [(ngModel)]="next" name="next" autocomplete="new-password" placeholder="New password (min 8 chars, 1 number, 1 special char)" />
            </nz-input-group>
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Confirm new password</nz-form-label>
          <nz-form-control [nzErrorTip]="confirmError()">
            <nz-input-group nzPrefixIcon="key">
              <input nz-input type="password" [(ngModel)]="confirm" name="confirm" autocomplete="new-password" placeholder="Confirm new password" />
            </nz-input-group>
          </nz-form-control>
        </nz-form-item>

        @if (error()) {
          <nz-alert nzType="error" [nzMessage]="error()!" nzShowIcon></nz-alert>
        }

        <div class="actions">
          <button nz-button nzType="primary" type="submit" [nzLoading]="busy()">
            <span nz-icon nzType="save"></span> Update password
          </button>
        </div>
      </form>
    </nz-card>
  `,
  styles: [`
    .muted { color: var(--c-text-subtle); margin: 0 0 12px; }
    .form { display: flex; flex-direction: column; gap: 4px; }
    .actions { display: flex; justify-content: flex-end; margin-top: 8px; }
    nz-alert { margin-bottom: 8px; }
  `],
})
export class SettingsSecurityPage {
  api = inject(ApiService);
  toast = inject(ToastService);
  cur = '';
  next = '';
  confirm = '';
  busy = signal(false);
  error = signal<string | null>(null);

  confirmError() {
    if (!this.confirm && !this.next) return '';
    if (this.confirm && this.confirm !== this.next) return 'Passwords do not match';
    return '';
  }

  async submit(ev: Event) {
    ev.preventDefault();
    this.error.set(null);
    if (!this.cur || !this.next) {
      this.error.set('Both current and new password are required');
      return;
    }
    if (this.next !== this.confirm) {
      this.error.set('New password and confirmation do not match');
      return;
    }
    this.busy.set(true);
    try {
      await firstValueFrom(
        this.api.post('/settings/password', {
          currentPassword: this.cur,
          newPassword: this.next,
        }),
      );
      this.toast.success('Password updated.');
      this.cur = '';
      this.next = '';
      this.confirm = '';
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Could not update password');
    } finally {
      this.busy.set(false);
    }
  }
}
