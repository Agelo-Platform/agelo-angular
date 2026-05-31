import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzModalService } from 'ng-zorro-antd/modal';
import { DialogService } from '../../shared/dialogs/dialog.service';
import { ToastService } from '../../shared/dialogs/toast.service';
import {
  PAT_SECTIONS,
  PatCreated,
  PatLevel,
  PatListItem,
  PatPermissions,
  PatService,
} from '../../core/pat.service';
import { PatCreateComponent } from './pat-create.dialog';
import { PatRevealComponent } from './pat-reveal.dialog';

/**
 * Personal Access Tokens settings page. Lists, creates, disables /
 * re-enables, and revokes PATs scoped to the calling user. Mirrors
 * the look and grammar of the API keys sibling page on purpose so the
 * two slices read symmetrically; the only structural difference is
 * the per-section permission summary column and the lack of an
 * organization picker (PATs are user-scoped, not org-scoped).
 */
@Component({
  selector: 'app-settings-personal-access-tokens',
  standalone: true,
  imports: [
    CommonModule, DatePipe,
    NzCardModule, NzButtonModule, NzIconModule, NzTableModule, NzTagModule,
    NzToolTipModule, NzEmptyModule,
  ],
  template: `
    <nz-card nzTitle="Personal access tokens" [nzExtra]="extraTpl">
      <ng-template #extraTpl>
        <button nz-button nzType="primary" (click)="openCreate()">
          <span nz-icon nzType="plus"></span> New token
        </button>
      </ng-template>
      <p class="muted small">
        Bearer credentials tied to your user account. Send them as
        <code>Authorization: Bearer agp_…</code> alongside the API.
      </p>

      @if (tokens().length) {
        <nz-table [nzData]="tokens()" nzSize="small" [nzShowPagination]="false">
          <thead>
            <tr>
              <th>Name</th>
              <th>Prefix</th>
              <th>Permissions</th>
              <th>Status</th>
              <th>Last used</th>
              <th>Expires</th>
              <th class="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (t of tokens(); track t.id) {
              <tr>
                <td>
                  <div class="bold">{{ t.name }}</div>
                  <div class="muted small">
                    Created {{ t.createdAt | date:'mediumDate' }}
                  </div>
                </td>
                <td><code class="mono">{{ t.prefix }}…</code></td>
                <td>
                  @if (summarize(t.permissions); as s) {
                    @if (s) {
                      <span class="muted small">{{ s }}</span>
                    } @else {
                      <span class="muted small">—</span>
                    }
                  }
                </td>
                <td>
                  @if (t.isActive) {
                    <nz-tag nzColor="success">Active</nz-tag>
                  } @else {
                    <nz-tag nzColor="error">Disabled</nz-tag>
                  }
                </td>
                <td>{{ t.lastUsedAt ? (t.lastUsedAt | date:'short') : '—' }}</td>
                <td>{{ t.expiresAt ? (t.expiresAt | date:'mediumDate') : 'Never' }}</td>
                <td class="actions-col">
                  <button
                    nz-button
                    nzType="text"
                    [attr.aria-label]="t.isActive ? 'Disable token' : 'Re-enable token'"
                    [nz-tooltip]="t.isActive ? 'Disable token' : 'Re-enable token'"
                    (click)="toggle(t)"
                  >
                    <span nz-icon [nzType]="t.isActive ? 'pause-circle' : 'play-circle'"></span>
                  </button>
                  <button
                    nz-button
                    nzType="text"
                    nzDanger
                    aria-label="Revoke token"
                    nz-tooltip="Revoke token"
                    (click)="revoke(t)"
                  >
                    <span nz-icon nzType="delete"></span>
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </nz-table>
      } @else {
        <nz-empty
          nzNotFoundImage="simple"
          nzNotFoundContent="No personal access tokens yet"
        ></nz-empty>
      }
    </nz-card>
  `,
  styles: [`
    .bold { font-weight: 500; }
    .small { font-size: 12px; }
    .muted { color: var(--c-text-subtle); }
    .actions-col { width: 110px; text-align: right; }
  `],
})
export class SettingsPersonalAccessTokensPage implements OnInit {
  private pats = inject(PatService);
  private modal = inject(NzModalService);
  private confirmer = inject(DialogService);
  private toast = inject(ToastService);

  tokens = signal<PatListItem[]>([]);

  async ngOnInit() { await this.refresh(); }

  async refresh() {
    const list = await firstValueFrom(this.pats.list());
    this.tokens.set(list);
  }

  /**
   * Compact summary like "Read: orgs, teams · Write: cards" for the
   * list table. Sections are shown in the same order as `PAT_SECTIONS`
   * so the output is stable across renders.
   */
  summarize(perms: PatPermissions): string {
    if (!perms) return '';
    const reads: string[] = [];
    const writes: string[] = [];
    for (const s of PAT_SECTIONS) {
      const level: PatLevel | undefined = perms[s.key];
      if (level === 'read') reads.push(s.label);
      if (level === 'write') writes.push(s.label);
    }
    const parts: string[] = [];
    if (reads.length) parts.push(`Read: ${reads.join(', ')}`);
    if (writes.length) parts.push(`Write: ${writes.join(', ')}`);
    return parts.join(' · ');
  }

  openCreate() {
    const ref = this.modal.create<PatCreateComponent, PatCreated | null>({
      nzTitle: 'New personal access token',
      nzContent: PatCreateComponent,
      nzWidth: 640,
      nzOkText: 'Generate',
      nzCancelText: 'Cancel',
      nzOnOk: (instance) => instance.submit(),
    });
    ref.afterClose.subscribe(async (res) => {
      if (res?.rawToken) {
        const reveal = this.modal.create<PatRevealComponent, void>({
          nzTitle: 'Copy this token now',
          nzContent: PatRevealComponent,
          nzData: { name: res.name, rawToken: res.rawToken } as any,
          nzWidth: 560,
          nzFooter: null,
          nzMaskClosable: false,
          nzWrapClassName: 'app-key-reveal-modal',
        });
        await reveal.afterClose.toPromise();
        await this.refresh();
      }
    });
  }

  async toggle(t: PatListItem) {
    try {
      await firstValueFrom(this.pats.update(t.id, { isActive: !t.isActive }));
      this.toast.success(t.isActive ? 'Token disabled' : 'Token re-enabled');
      await this.refresh();
    } catch {
      // The HTTP interceptor surfaces the error toast already.
    }
  }

  async revoke(t: PatListItem) {
    const ok = await this.confirmer.confirm({
      title: 'Revoke personal access token',
      message:
        `Revoke "${t.name}"? Any client using this token will be denied immediately. This cannot be undone.`,
      confirmLabel: 'Revoke',
      destructive: true,
    });
    if (!ok) return;
    await firstValueFrom(this.pats.revoke(t.id));
    this.toast.success('Token revoked');
    await this.refresh();
  }
}
