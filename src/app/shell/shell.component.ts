import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
  ActivationEnd,
} from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzModalService } from 'ng-zorro-antd/modal';
import { HelpModalComponent } from '../shared/help/help-modal.component';
import { AgeloLogoComponent } from '../shared/brand/agelo-logo.component';
import { AuthService } from '../core/auth.service';
import { resolveApiBase } from '../core/api-base';
import { ThemeService } from '../core/theme.service';
import { OrgContextService } from '../core/org-context.service';
import { ProjectContextService } from '../core/project-context.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    NzLayoutModule,
    NzMenuModule,
    NzIconModule,
    NzButtonModule,
    NzSelectModule,
    NzDropDownModule,
    NzDividerModule,
    NzToolTipModule,
    AgeloLogoComponent,
  ],
  template: `
    <nz-layout class="shell">
      <nz-sider [nzWidth]="240" class="sider" [nzCollapsedWidth]="0" [nzCollapsed]="!sideOpen()" nzBreakpoint="lg">
        <a class="brand" routerLink="/organizations">
          <app-agelo-logo [size]="26"></app-agelo-logo>
        </a>
        <nz-divider class="divider"></nz-divider>

        <ul nz-menu nzMode="inline" class="nav-menu">
          <!-- Org-scoped block hides on root pages (/organizations, /settings,
               /prompts, …) so the sidebar only shows the items that belong
               to the page the user is actually on. -->
          @if (!isRootDashboard()) {
            @if (orgCtx.activeOrgId(); as oid) {
            <li nz-menu-item [routerLink]="['/org', oid, 'home']" routerLinkActive="ant-menu-item-selected">
              <span nz-icon nzType="appstore"></span>
              <span>Home</span>
            </li>
            <li nz-menu-item [routerLink]="['/org', oid, 'projects']" routerLinkActive="ant-menu-item-selected">
              <span nz-icon nzType="project"></span>
              <span>Projects</span>
            </li>
            @if (projectCtx.activeProjectId(); as pid) {
              <li nz-menu-item [routerLink]="['/org', oid, 'project', pid, 'board']" routerLinkActive="ant-menu-item-selected">
                <span nz-icon nzType="appstore"></span>
                <span>Board</span>
              </li>
              <li nz-menu-item [routerLink]="['/org', oid, 'project', pid, 'flow']" routerLinkActive="ant-menu-item-selected">
                <span nz-icon nzType="apartment"></span>
                <span>Board Flow</span>
              </li>
              <!-- Teams move into the project scope when one is active. -->
              <li nz-menu-item [routerLink]="['/org', oid, 'project', pid, 'teams']" routerLinkActive="ant-menu-item-selected">
                <span nz-icon nzType="team"></span>
                <span>Teams</span>
              </li>
              <li nz-menu-item [routerLink]="['/org', oid, 'project', pid, 'settings']" routerLinkActive="ant-menu-item-selected">
                <span nz-icon nzType="setting"></span>
                <span>Project Settings</span>
              </li>
            } @else {
              <li nz-menu-item [routerLink]="['/org', oid, 'board']" routerLinkActive="ant-menu-item-selected">
                <span nz-icon nzType="appstore"></span>
                <span>Board</span>
              </li>
              <li nz-menu-item [routerLink]="['/org', oid, 'flow']" routerLinkActive="ant-menu-item-selected">
                <span nz-icon nzType="apartment"></span>
                <span>Board Flow</span>
              </li>
              <li nz-menu-item [routerLink]="['/org', oid, 'teams']" routerLinkActive="ant-menu-item-selected">
                <span nz-icon nzType="team"></span>
                <span>Teams</span>
              </li>
            }
            }
          }

          @if (isRootDashboard()) {
            <!-- No divider above the root block: when we get here the
                 org-scoped block is hidden, so a top rule would look
                 stranded. The brand divider above the menu is enough. -->
            <li nz-menu-item routerLink="/organizations" routerLinkActive="ant-menu-item-selected">
              <span nz-icon nzType="bank"></span>
              <span>Organizations</span>
            </li>
            <li nz-menu-item routerLink="/prompts" routerLinkActive="ant-menu-item-selected">
              <span nz-icon nzType="bulb"></span>
              <span>Prompt Library</span>
            </li>
            <li nz-menu-item routerLink="/permissions" routerLinkActive="ant-menu-item-selected">
              <span nz-icon nzType="lock"></span>
              <span>Roles &amp; Permissions</span>
            </li>
            <li nz-menu-item routerLink="/mcp-servers" routerLinkActive="ant-menu-item-selected">
              <span nz-icon nzType="thunderbolt"></span>
              <span>MCP Servers</span>
            </li>
            <li nz-menu-item routerLink="/archived" routerLinkActive="ant-menu-item-selected">
              <span nz-icon nzType="folder-open"></span>
              <span>Archived</span>
            </li>
            <li nz-menu-item routerLink="/settings" routerLinkActive="ant-menu-item-selected">
              <span nz-icon nzType="setting"></span>
              <span>Settings</span>
            </li>
          }
        </ul>
      </nz-sider>

      <nz-layout>
        <nz-header class="brand-bar">
          <button nz-button nzType="text" class="menu-toggle" (click)="sideOpen.set(!sideOpen())">
            <span nz-icon nzType="menu"></span>
          </button>

          <nz-select
            class="org-select"
            nzShowSearch
            nzPlaceHolder="Select organization"
            [ngModel]="orgCtx.activeOrgId()"
            (ngModelChange)="onOrgChange($event)"
          >
            @for (o of orgCtx.orgs(); track o.id) {
              <nz-option [nzValue]="o.id" [nzLabel]="o.title">
                <span class="org-color-dot" [style.background]="o.color"></span>
                {{ o.title }}
              </nz-option>
            }
          </nz-select>

          @if (projectCtx.projects().length > 0) {
            <span class="bc-sep">›</span>
            <nz-select
              class="project-select"
              nzPlaceHolder="Select project"
              [ngModel]="projectCtx.activeProjectId()"
              (ngModelChange)="onProjectChange($event)"
            >
              @for (p of projectCtx.projects(); track p.id) {
                <nz-option [nzValue]="p.id" [nzLabel]="p.title">
                  <span class="org-color-dot" [style.background]="p.color"></span>
                  {{ p.title }}
                </nz-option>
              }
            </nz-select>
          }

          <span class="spacer"></span>

          <button nz-button nzType="text" (click)="theme.toggle()" nz-tooltip="Toggle theme">
            <span nz-icon [nzType]="theme.theme() === 'dark' ? 'moon' : 'sun'"></span>
          </button>

          <a nz-dropdown [nzDropdownMenu]="userMenu" class="user-chip">
            @if (auth.user()?.avatarUrl) {
              <img class="avatar" [src]="auth.user()?.avatarUrl" alt="avatar" />
            } @else {
              <span nz-icon nzType="user"></span>
            }
            <span class="user-name">{{ auth.user()?.displayName }}</span>
            <span nz-icon nzType="down"></span>
          </a>
          <nz-dropdown-menu #userMenu="nzDropdownMenu">
            <ul nz-menu>
              <li nz-menu-item routerLink="/organizations">
                <span nz-icon nzType="bank"></span>
                Root dashboard
              </li>
              <li nz-menu-item routerLink="/settings">
                <span nz-icon nzType="setting"></span>
                Settings
              </li>
              <li nz-menu-item (click)="openSwagger()">
                <span nz-icon nzType="code"></span>
                Open Swagger
              </li>
              <li nz-menu-item (click)="openHelp()">
                <span nz-icon nzType="info-circle"></span>
                Help
              </li>
              <li nz-menu-divider></li>
              <li nz-menu-item (click)="auth.logout()">
                <span nz-icon nzType="logout"></span>
                Sign out
              </li>
            </ul>
          </nz-dropdown-menu>
        </nz-header>

        <nz-content class="content">
          <router-outlet />
        </nz-content>
        <div class="app-footer">
          Powered by Agelo © {{ year }} · MIT License — free to copy, modify and redistribute.
        </div>
      </nz-layout>
    </nz-layout>
  `,
  styles: [`
    :host { display: block; height: 100vh; }
    .shell { height: 100vh; }

    /* ─── Sidebar (white surface, right rule, soft active pills) ─────── */
    .sider {
      background: var(--c-sidebar) !important;
      border-right: 1px solid var(--c-border);
    }
    .brand {
      display: flex; align-items: center;
      height: 56px; padding: 0 18px;
      border-bottom: 1px solid var(--c-border);
      text-decoration: none;
      transition: opacity .12s ease;
    }
    .brand:hover { opacity: .85; }
    .divider {
      margin: 10px 8px !important;
      border-color: var(--c-border) !important;
      min-width: 0 !important;
    }
    .nav-menu {
      background: transparent !important;
      padding: 10px 10px !important;
      border-right: 0 !important;
    }
    .nav-menu .ant-menu-item {
      height: 36px !important;
      line-height: 36px !important;
      margin: 1px 0 !important;
      padding: 0 12px !important;
      border-radius: 6px !important;
      font-size: 13.5px !important;
      color: var(--c-text) !important;
    }
    .nav-menu .ant-menu-item:hover {
      background: var(--c-surface-3) !important;
      color: var(--c-text) !important;
    }
    .nav-menu .ant-menu-item-selected,
    .nav-menu .ant-menu-item.ant-menu-item-selected {
      background: var(--c-primary-bg-subtle) !important;
      color: var(--c-primary) !important;
      font-weight: 500;
    }
    .nav-menu .ant-menu-item-selected::after { display: none !important; }
    .nav-menu .ant-menu-item .anticon {
      color: var(--c-text-subtle) !important;
      font-size: 15px;
    }
    .nav-menu .ant-menu-item-selected .anticon {
      color: var(--c-primary) !important;
    }

    /* ─── Topbar ─────────────────────────────────────────────────────── */
    .brand-bar {
      display: flex; align-items: center; gap: 8px;
      height: 56px; padding: 0 16px;
      background: var(--c-surface);
      border-bottom: 1px solid var(--c-border);
      line-height: 56px;
    }
    .menu-toggle { font-size: 16px; color: var(--c-text-subtle) !important; }
    .org-select, .project-select {
      width: 200px;
    }
    .org-select :where(.ant-select-selector),
    .project-select :where(.ant-select-selector) {
      background: var(--c-surface) !important;
      border-color: var(--c-border) !important;
      border-radius: 6px !important;
      height: 32px !important;
    }
    .org-color-dot {
      display: inline-block;
      width: 8px; height: 8px; border-radius: 999px;
      box-shadow: 0 0 0 2px rgba(15,23,42,.06);
      margin-right: 8px; vertical-align: middle;
    }
    .bc-sep {
      color: var(--c-text-disabled);
      font-size: 16px;
      line-height: 1;
    }
    .spacer { flex: 1; }
    .user-chip {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 6px 10px; cursor: pointer;
      color: var(--c-text); font-weight: 500;
      border-radius: 6px;
      transition: background .12s;
    }
    .user-chip:hover {
      background: var(--c-surface-3);
      color: var(--c-text); text-decoration: none;
    }
    .user-chip .user-name { font-size: 13px; }

    /* ─── Main content + footer ──────────────────────────────────────── */
    .content {
      padding: 24px 28px 36px;
      background: var(--c-bg);
      min-height: calc(100vh - 56px - 49px);
    }
    .app-footer {
      padding: 14px 24px;
      border-top: 1px solid var(--c-border);
      background: var(--c-surface);
      font-size: 12.5px; color: var(--c-text-subtle);
      text-align: center;
    }

    .avatar {
      width: 22px; height: 22px; border-radius: 50%;
      object-fit: cover; border: 1px solid var(--c-border);
    }
  `],
})
export class ShellComponent implements OnInit {
  auth = inject(AuthService);
  theme = inject(ThemeService);
  orgCtx = inject(OrgContextService);
  projectCtx = inject(ProjectContextService);
  private router = inject(Router);
  private modal = inject(NzModalService);

  sideOpen = signal(true);
  readonly year = new Date().getFullYear();

  readonly current = computed(() => this.orgCtx.current());

  /**
   * Tracks the current URL so we can hide the root-only block in the
   * sidebar when the user has drilled into an org or project. Updated
   * on every navigation in `ngOnInit`.
   */
  currentUrl = signal<string>('/');

  /**
   * True when the user is on a root-level page (Organizations list,
   * Prompt Library, Roles & Permissions, MCP Servers, Archived, Settings)
   * — i.e. NOT inside an `/org/:id/...` route. Drives whether the
   * lower sidebar block (root-level nav) is rendered.
   */
  readonly isRootDashboard = computed(() => !this.currentUrl().startsWith('/org/'));

  openHelp() {
    this.modal.create({
      nzTitle: 'About Agelo',
      nzContent: HelpModalComponent,
      nzFooter: null,
      nzWidth: 560,
      nzWrapClassName: 'no-anim-modal',
    });
  }

  openSwagger() {
    // Swagger is hosted by the backend at /api/docs. We resolve it from the
    // same base the SPA's API client uses so it works in dev, e2e, and prod.
    const base = resolveApiBase(); // e.g. http://localhost:3000/api/v1
    let url = '/api/docs';
    try {
      const u = new URL(base);
      u.pathname = '/api/docs';
      u.search = '';
      url = u.toString();
    } catch { /* keep relative fallback */ }
    window.open(url, '_blank', 'noopener');
  }

  async ngOnInit() {
    this.theme.apply();

    // Seed the URL signal with whatever route the user landed on, then
    // keep it in sync via the Router. ActivationEnd fires after every
    // successful navigation including the very first one.
    this.currentUrl.set(this.router.url);
    this.router.events.subscribe((e) => {
      if (e instanceof ActivationEnd) this.currentUrl.set(this.router.url);
    });

    try {
      await this.orgCtx.refresh();
      const orgId = this.orgCtx.activeOrgId();
      if (orgId) await this.projectCtx.refresh(orgId);
    } catch {
      /* may have no orgs yet — fine */
    }
  }

  async onOrgChange(id: string | null) {
    if (!id) return;
    this.orgCtx.setActive(id);
    await this.projectCtx.refresh(id);
    this.router.navigate(['/org', id, 'home']);
  }

  onProjectChange(id: string | null) {
    if (!id) return;
    this.projectCtx.setActive(id);
    const orgId = this.orgCtx.activeOrgId();
    if (!orgId) return;
    const url = this.router.url;
    if (/\/board$|\/project\/[^/]+\/board$/.test(url)) {
      this.router.navigate(['/org', orgId, 'project', id, 'board']);
    } else if (/\/flow$|\/project\/[^/]+\/flow$/.test(url)) {
      this.router.navigate(['/org', orgId, 'project', id, 'flow']);
    } else if (/\/home$|\/project\/[^/]+\/home$/.test(url)) {
      this.router.navigate(['/org', orgId, 'project', id, 'home']);
    }
  }
}
