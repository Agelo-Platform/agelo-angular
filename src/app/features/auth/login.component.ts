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
      <nz-card class="login-card">
        <div class="brand">
          <app-agelo-logo [size]="44"></app-agelo-logo>
        </div>
        <p class="tagline">Prompt Driven Development</p>
        <p class="subtitle">
          Sign in as the Solution Architect to design boards and approve agents.
        </p>

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
      </nz-card>
    </div>
  `,
  styles: [`
    .wrap {
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; padding: 24px;
      background: linear-gradient(180deg, #F7F8F9 0%, #E9F2FF 100%);
    }
    :host-context([data-theme="dark"]) .wrap {
      background: linear-gradient(180deg, #1D2125 0%, #1C2B41 100%);
    }
    .login-card { width: 420px; max-width: 100%; }
    .brand { display: flex; align-items: center; margin-bottom: 4px; }
    .tagline {
      font-size: 10px;
      letter-spacing: 4px;
      text-transform: uppercase;
      color: var(--c-text-subtlest);
      margin: 0 0 8px;
    }
    .subtitle { color: var(--c-text-subtle); margin: 0 0 16px; }
    .form { display: flex; flex-direction: column; }
    .submit { height: 40px; margin-top: 8px; }
    .error { margin-bottom: 16px; }
    .hint {
      font-size: 12px; margin: 12px 0 0;
    }
    .hint code {
      background: var(--c-surface-2);
      padding: 1px 6px; border-radius: 3px;
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
