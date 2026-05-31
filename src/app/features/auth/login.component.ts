import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { AuthService } from '../../core/auth.service';
import { AgeloLogoComponent } from '../../shared/brand/agelo-logo.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    NzCardModule, NzFormModule, NzInputModule, NzButtonModule,
    NzIconModule, NzAlertModule,
    AgeloLogoComponent,
  ],
  template: `
    <div class="wrap">
      <div class="login-card">
        <div class="head">
          <app-agelo-logo [size]="40" [showTagline]="true"></app-agelo-logo>
          <p class="subtitle">
            Sign in as the Solution Architect to design boards and approve agents.
          </p>
        </div>

        <form (submit)="submit($event)" class="form" nz-form nzLayout="vertical">
          <nz-form-item>
            <nz-form-label>Email</nz-form-label>
            <nz-form-control>
              <nz-input-group nzPrefixIcon="mail">
                <input
                  nz-input
                  type="email"
                  [(ngModel)]="email"
                  name="email"
                  required
                  autocomplete="username"
                />
              </nz-input-group>
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label>Password</nz-form-label>
            <nz-form-control>
              <nz-input-group nzPrefixIcon="lock">
                <input
                  nz-input
                  type="password"
                  [(ngModel)]="password"
                  name="password"
                  required
                  autocomplete="current-password"
                />
              </nz-input-group>
            </nz-form-control>
          </nz-form-item>

          @if (error()) {
            <nz-alert
              nzType="error"
              [nzMessage]="error()!"
              nzShowIcon
              class="error"
            ></nz-alert>
          }

          <button
            nz-button
            nzType="primary"
            nzBlock
            type="submit"
            [nzLoading]="loading()"
            class="submit"
          >
            Sign in
          </button>

          <p class="hint muted">
            Default bootstrap account configured via
            <code>SA_BOOTSTRAP_EMAIL</code> in your <code>.env</code>.
          </p>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .wrap {
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; padding: 24px;
      background:
        radial-gradient(80% 60% at 100% 0%, var(--c-primary-bg-subtle) 0%, transparent 60%),
        radial-gradient(60% 50% at 0% 100%, var(--c-accent-bg-subtle) 0%, transparent 60%),
        var(--c-bg);
    }
    :host-context([data-theme="dark"]) .wrap {
      background:
        radial-gradient(80% 60% at 100% 0%, rgba(96,165,250,0.18) 0%, transparent 60%),
        radial-gradient(60% 50% at 0% 100%, rgba(45,212,191,0.16) 0%, transparent 60%),
        var(--c-bg);
    }
    .login-card {
      width: 420px; max-width: 100%;
      background: var(--c-surface);
      border: 1px solid var(--c-border);
      border-radius: 14px;
      padding: 36px 32px 28px;
      box-shadow: var(--shadow-overflow);
    }
    .head { margin-bottom: 18px; }
    .subtitle {
      color: var(--c-text-subtle);
      margin: 18px 0 0;
      font-size: 14px;
      line-height: 1.5;
    }
    .form { display: flex; flex-direction: column; }
    .submit { height: 42px; margin-top: 6px; font-weight: 500; }
    .error { margin-bottom: 14px; }
    .hint {
      font-size: 12.5px; margin: 16px 0 0; line-height: 1.55;
      padding-top: 14px;
      border-top: 1px solid var(--c-border-subtle);
    }
    .hint code {
      font-family: var(--font-mono);
      font-size: 12px;
      background: var(--c-surface-3);
      padding: 1px 6px; border-radius: 4px;
      color: var(--c-text);
    }
  `],
})
export class LoginComponent {
  email = 'architect@agelo.local';
  password = '';
  readonly year = new Date().getFullYear();
  error = signal<string | null>(null);
  loading = signal(false);

  private auth = inject(AuthService);
  private router = inject(Router);

  async submit(ev: Event) {
    ev.preventDefault();
    this.error.set(null);
    this.loading.set(true);
    try {
      await this.auth.login(this.email, this.password);
      this.router.navigate(['/organizations']);
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Sign-in failed');
    } finally {
      this.loading.set(false);
    }
  }
}
