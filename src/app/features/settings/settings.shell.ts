import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-settings-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, NzIconModule],
  template: `
    <div class="settings-page">
      <div class="page-header">
        <div>
          <h1>Settings</h1>
          <div class="subtitle">Manage your account, security, and integration credentials.</div>
        </div>
      </div>

      <div class="settings-layout">
        <nav class="sub-nav">
          <a routerLink="profile" routerLinkActive="active">
            <span nz-icon nzType="user"></span>
            <span class="lbl">
              <strong>Profile</strong>
              <span class="muted small">Display name and avatar</span>
            </span>
          </a>
          <a routerLink="appearance" routerLinkActive="active">
            <span nz-icon nzType="bg-colors"></span>
            <span class="lbl">
              <strong>Appearance</strong>
              <span class="muted small">Theme and visual preferences</span>
            </span>
          </a>
          <a routerLink="security" routerLinkActive="active">
            <span nz-icon nzType="lock"></span>
            <span class="lbl">
              <strong>Security</strong>
              <span class="muted small">Change your password</span>
            </span>
          </a>
          <a routerLink="api-keys" routerLinkActive="active">
            <span nz-icon nzType="key"></span>
            <span class="lbl">
              <strong>API keys</strong>
              <span class="muted small">For agents and the MCP server</span>
            </span>
          </a>
          <a routerLink="personal-access-tokens" routerLinkActive="active">
            <span nz-icon nzType="safety-certificate"></span>
            <span class="lbl">
              <strong>Personal access tokens</strong>
              <span class="muted small">Bearer tokens scoped to your account</span>
            </span>
          </a>
          <a routerLink="shortcuts" routerLinkActive="active">
            <span nz-icon nzType="thunderbolt"></span>
            <span class="lbl">
              <strong>Shortcuts</strong>
              <span class="muted small">Keyboard shortcuts to navigate the portal</span>
            </span>
          </a>
          <a routerLink="data" routerLinkActive="active">
            <span nz-icon nzType="download"></span>
            <span class="lbl">
              <strong>Data export</strong>
              <span class="muted small">Download a database snapshot</span>
            </span>
          </a>
          <a routerLink="about" routerLinkActive="active">
            <span nz-icon nzType="info-circle"></span>
            <span class="lbl">
              <strong>About</strong>
              <span class="muted small">Version &amp; product info</span>
            </span>
          </a>
        </nav>

        <section class="sub-content">
          <router-outlet />
        </section>
      </div>
    </div>
  `,
  styles: [`
    .settings-layout {
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 24px;
    }
    .sub-nav {
      background: var(--c-surface);
      border: 1px solid var(--c-border);
      border-radius: var(--radius);
      padding: 8px;
      height: fit-content;
      display: flex; flex-direction: column;
    }
    .sub-nav a {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 10px 12px;
      border-radius: var(--radius);
      color: var(--c-text);
      text-decoration: none;
      cursor: pointer;
    }
    .sub-nav a:hover { background: var(--c-surface-hover); }
    .sub-nav a.active {
      background: var(--c-primary-bg-subtle);
      color: var(--c-primary);
    }
    .sub-nav a.active .anticon { color: var(--c-primary); }
    .sub-nav .anticon { font-size: 18px; padding-top: 2px; color: var(--c-text-subtle); }
    .sub-nav .lbl { display: flex; flex-direction: column; gap: 2px; }
    .small { font-size: 12px; }
    .muted { color: var(--c-text-subtle); }
    .sub-content { min-width: 0; }
    @media (max-width: 800px) {
      .settings-layout { grid-template-columns: 1fr; }
    }
  `],
})
export class SettingsShellComponent {}
