import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shell/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'organizations' },
      {
        path: 'organizations',
        loadComponent: () =>
          import('./features/organizations/organizations.component').then(
            (m) => m.OrganizationsComponent,
          ),
      },
      {
        path: 'org/:orgId/home',
        loadComponent: () =>
          import('./features/home/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'org/:orgId/board',
        loadComponent: () =>
          import('./features/board/board.component').then((m) => m.BoardComponent),
      },
      {
        path: 'org/:orgId/flow',
        loadComponent: () =>
          import('./features/board-flow/board-flow.component').then(
            (m) => m.BoardFlowComponent,
          ),
      },
      {
        path: 'org/:orgId/projects',
        loadComponent: () =>
          import('./features/projects/projects.component').then((m) => m.ProjectsComponent),
      },
      // Per-project URLs — bookmarkable; each project gets its own kanban
      // and board flow. The components read `projectId` from the route.
      {
        path: 'org/:orgId/project/:projectId/board',
        loadComponent: () =>
          import('./features/board/board.component').then((m) => m.BoardComponent),
      },
      {
        path: 'org/:orgId/project/:projectId/flow',
        loadComponent: () =>
          import('./features/board-flow/board-flow.component').then(
            (m) => m.BoardFlowComponent,
          ),
      },
      {
        path: 'org/:orgId/project/:projectId/home',
        loadComponent: () =>
          import('./features/home/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'org/:orgId/teams',
        loadComponent: () =>
          import('./features/teams/teams.component').then((m) => m.TeamsComponent),
      },
      {
        path: 'org/:orgId/teams/:teamId',
        loadComponent: () =>
          import('./features/teams/team-detail.component').then(
            (m) => m.TeamDetailComponent,
          ),
      },
      {
        path: 'prompts',
        loadComponent: () =>
          import('./features/prompts/prompts.component').then(
            (m) => m.PromptsComponent,
          ),
      },
      {
        path: 'prompts/:id',
        loadComponent: () =>
          import('./features/prompts/prompt-detail.component').then(
            (m) => m.PromptDetailComponent,
          ),
      },
      {
        path: 'permissions',
        loadComponent: () =>
          import('./features/permissions/permissions.component').then(
            (m) => m.PermissionsComponent,
          ),
      },
      {
        path: 'mcp-servers',
        loadComponent: () =>
          import('./features/mcp/mcp-servers.component').then(
            (m) => m.McpServersComponent,
          ),
      },
      {
        path: 'archived',
        loadComponent: () =>
          import('./features/archive/archive.component').then(
            (m) => m.ArchiveComponent,
          ),
      },
      {
        path: 'card/:cardId',
        loadComponent: () =>
          import('./features/board/card-redirect.component').then(
            (m) => m.CardRedirectComponent,
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings.shell').then(
            (m) => m.SettingsShellComponent,
          ),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'profile' },
          {
            path: 'profile',
            loadComponent: () =>
              import('./features/settings/profile.page').then((m) => m.SettingsProfilePage),
          },
          {
            path: 'appearance',
            loadComponent: () =>
              import('./features/settings/appearance.page').then((m) => m.SettingsAppearancePage),
          },
          {
            path: 'security',
            loadComponent: () =>
              import('./features/settings/security.page').then((m) => m.SettingsSecurityPage),
          },
          {
            path: 'api-keys',
            loadComponent: () =>
              import('./features/settings/api-keys.page').then((m) => m.SettingsApiKeysPage),
          },
          {
            path: 'personal-access-tokens',
            loadComponent: () =>
              import('./features/settings/personal-access-tokens.page').then(
                (m) => m.SettingsPersonalAccessTokensPage,
              ),
          },
          {
            path: 'shortcuts',
            loadComponent: () =>
              import('./features/settings/shortcuts.page').then((m) => m.SettingsShortcutsPage),
          },
          {
            path: 'data',
            loadComponent: () =>
              import('./features/settings/data.page').then((m) => m.SettingsDataPage),
          },
          {
            path: 'about',
            loadComponent: () =>
              import('./features/settings/about.page').then((m) => m.SettingsAboutPage),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
