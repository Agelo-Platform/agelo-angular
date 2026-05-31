import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzModalService } from 'ng-zorro-antd/modal';
import { ApiService } from '../../core/api.service';
import { OrgContextService, OrganizationSummary } from '../../core/org-context.service';
import { DialogService } from '../../shared/dialogs/dialog.service';
import { ToastService } from '../../shared/dialogs/toast.service';
import { OrganizationFormComponent } from './organization-form.dialog';

@Component({
  selector: 'app-organizations',
  standalone: true,
  imports: [
    CommonModule,
    NzCardModule, NzButtonModule, NzIconModule, NzDropDownModule,
    NzToolTipModule, NzEmptyModule, NzSpinModule,
  ],
  template: `
    <div class="page-header">
      <div>
        <h1>Organizations</h1>
        <div class="subtitle">
          Top-level containers — boards, teams and cards are isolated per
          organization.
        </div>
      </div>
      <div class="spacer"></div>
      <button nz-button nzType="primary" (click)="openCreate()">
        <span nz-icon nzType="plus"></span> New organization
      </button>
    </div>

    <nz-spin [nzSpinning]="loading()">
      @if (orgs().length === 0 && !loading()) {
        <nz-card class="empty">
          <nz-empty
            nzNotFoundImage="simple"
            nzNotFoundContent="No organizations yet"
          >
            <ng-template #nzNotFoundFooter>
              <button nz-button nzType="primary" (click)="openCreate()">
                <span nz-icon nzType="plus"></span> Create organization
              </button>
            </ng-template>
          </nz-empty>
        </nz-card>
      }

      <div class="org-grid">
        @for (o of orgs(); track o.id) {
          <nz-card class="org-card" (click)="open(o)" [nzBordered]="true">
            <div class="color-strip" [style.background]="o.color"></div>
            <div class="card-head">
              <div>
                <h3 class="title">{{ o.title }}</h3>
                <div class="muted small">Created {{ o.createdAt | slice:0:10 }}</div>
              </div>
              <a nz-dropdown [nzDropdownMenu]="menu" class="more" (click)="$event.stopPropagation()">
                <span nz-icon nzType="more"></span>
              </a>
              <nz-dropdown-menu #menu="nzDropdownMenu">
                <ul nz-menu>
                  <li nz-menu-item (click)="openEdit(o); $event.stopPropagation()">
                    <span nz-icon nzType="edit"></span> Edit
                  </li>
                  <li nz-menu-item nzDanger (click)="remove(o); $event.stopPropagation()">
                    <span nz-icon nzType="delete"></span> Delete
                  </li>
                </ul>
              </nz-dropdown-menu>
            </div>
            <div class="stats">
              <div class="stat">
                <span nz-icon nzType="team"></span>
                <span>{{ o.stats?.teams ?? 0 }} teams</span>
              </div>
              <div class="stat">
                <span nz-icon nzType="robot"></span>
                <span>{{ o.stats?.agents ?? 0 }} agents</span>
              </div>
              <div class="stat">
                <span nz-icon nzType="appstore"></span>
                <span>{{ o.stats?.cards ?? 0 }} cards</span>
              </div>
            </div>
            <div class="card-actions">
              <a class="open-link">
                Open <span nz-icon nzType="arrow-right"></span>
              </a>
            </div>
          </nz-card>
        }
      </div>
    </nz-spin>
  `,
  styles: [`
    .spacer { flex: 1; }
    .org-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }
    .org-card {
      position: relative;
      cursor: pointer;
      overflow: hidden;
      transition: transform .12s, box-shadow .12s;
    }
    .org-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-overflow) !important;
    }
    .color-strip {
      position: absolute; top: 0; left: 0; right: 0; height: 4px;
    }
    .card-head { display: flex; align-items: flex-start; padding-top: 4px; }
    .card-head > div:first-child { flex: 1; }
    .title { margin: 0 0 4px; font-size: 16px; font-weight: 600; }
    .muted { color: var(--c-text-subtle); }
    .small { font-size: 12px; }
    .more { padding: 4px 8px; color: var(--c-text-subtle); font-size: 18px; line-height: 1; }
    .stats { display: flex; flex-direction: column; gap: 6px; padding: 12px 0 8px; }
    .stat { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--c-text-subtle); }
    .stat .anticon { color: var(--c-text-subtlest); }
    .card-actions { display: flex; justify-content: flex-end; padding-top: 4px; }
    .open-link { color: var(--c-primary); font-size: 13px; font-weight: 500; }
    .empty { padding: 36px; }
  `],
})
export class OrganizationsComponent implements OnInit {
  api = inject(ApiService);
  ctx = inject(OrgContextService);
  modal = inject(NzModalService);
  confirmer = inject(DialogService);
  toast = inject(ToastService);
  router = inject(Router);

  orgs = signal<OrganizationSummary[]>([]);
  loading = signal(false);

  async ngOnInit() {
    await this.refresh();
  }

  async refresh() {
    this.loading.set(true);
    try {
      const list = await firstValueFrom(this.api.get<OrganizationSummary[]>('/organizations'));
      this.orgs.set(list);
      this.ctx.orgs.set(list);
    } finally {
      this.loading.set(false);
    }
  }

  openCreate() {
    const ref = this.modal.create<OrganizationFormComponent, { title: string; color: string }>({
      nzTitle: 'New organization',
      nzContent: OrganizationFormComponent,
      nzWidth: 480,
      nzOkText: 'Create',
      nzCancelText: 'Cancel',
      nzOnOk: (instance) => instance.submit(),
    });
    ref.afterClose.subscribe(async (res) => {
      if (!res) return;
      try {
        await firstValueFrom(this.api.post('/organizations', res));
        await this.refresh();
        this.toast.success('Organization created');
      } catch (err: any) {
        this.toast.error(err?.error?.message || 'Could not create');
      }
    });
  }

  openEdit(o: OrganizationSummary) {
    const ref = this.modal.create<OrganizationFormComponent, { title: string; color: string }>({
      nzTitle: 'Edit organization',
      nzContent: OrganizationFormComponent,
      nzData: { title: o.title, color: o.color },
      nzWidth: 480,
      nzOkText: 'Save',
      nzCancelText: 'Cancel',
      nzOnOk: (instance) => instance.submit(),
    });
    // Populate the form with current values via @Input.
    ref.componentInstance!.title = o.title;
    ref.componentInstance!.color = o.color;
    ref.afterClose.subscribe(async (res) => {
      if (!res) return;
      try {
        await firstValueFrom(this.api.patch(`/organizations/${o.id}`, res));
        await this.refresh();
        this.toast.success('Saved');
      } catch (err: any) {
        this.toast.error(err?.error?.message || 'Could not save');
      }
    });
  }

  async remove(o: OrganizationSummary) {
    const mode = await this.confirmer.archiveOrDelete({
      title: `Remove "${o.title}"?`,
      message:
        'Archive keeps the organization recoverable from the Archived section. Permanent delete also removes all boards, teams, agents, and cards.',
      archiveLabel: 'Archive',
      permanentLabel: 'Delete permanently',
    });
    if (!mode) return;
    await firstValueFrom(this.api.delete(`/organizations/${o.id}?mode=${mode}`));
    if (this.ctx.activeOrgId() === o.id) this.ctx.setActive(null);
    await this.refresh();
    this.toast.success(mode === 'archive' ? 'Organization archived' : 'Organization deleted');
  }

  open(o: OrganizationSummary) {
    this.ctx.setActive(o.id);
    this.router.navigate(['/org', o.id, 'home']);
  }
}
