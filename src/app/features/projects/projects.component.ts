import { Component, Input, OnChanges, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzModalService } from 'ng-zorro-antd/modal';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { ProjectContextService, Project } from '../../core/project-context.service';
import { DialogService } from '../../shared/dialogs/dialog.service';
import { ToastService } from '../../shared/dialogs/toast.service';
import { ProjectFormComponent } from './project-form.dialog';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [
    CommonModule, DatePipe,
    NzCardModule, NzButtonModule, NzIconModule, NzDropDownModule,
    NzEmptyModule, NzSpinModule,
  ],
  template: `
    <div class="page-header">
      <div>
        <h1>Projects</h1>
        <div class="subtitle">
          Each project has its own board, columns, and cards. Teams stay at the
          organization level.
        </div>
      </div>
      <div class="spacer"></div>
      <button nz-button nzType="primary" (click)="newProject()">
        <span nz-icon nzType="plus"></span> New project
      </button>
    </div>

    <nz-spin [nzSpinning]="loading()">
      <div class="grid">
        @for (p of projects(); track p.id) {
          <nz-card class="project-card" (click)="open(p)">
            <div class="color-strip" [style.background]="p.color"></div>
            <div class="card-head">
              <div>
                <h3 class="title">{{ p.title }}</h3>
                <div class="muted small">Created {{ p.createdAt | date:'mediumDate' }}</div>
                <div class="stats">
                  <span class="stat-row">
                    <span nz-icon nzType="appstore" class="stat-ico"></span>
                    {{ p.cardCount ?? 0 }} card{{ (p.cardCount ?? 0) === 1 ? '' : 's' }}
                  </span>
                </div>
              </div>
              <a nz-dropdown [nzDropdownMenu]="m" class="more" (click)="$event.stopPropagation()">
                <span nz-icon nzType="more"></span>
              </a>
              <nz-dropdown-menu #m="nzDropdownMenu">
                <ul nz-menu>
                  <li nz-menu-item (click)="openSettings(p); $event.stopPropagation()">
                    <span nz-icon nzType="setting"></span> Settings
                  </li>
                  <li nz-menu-item (click)="openEdit(p); $event.stopPropagation()">
                    <span nz-icon nzType="edit"></span> Edit
                  </li>
                  <li nz-menu-item nzDanger (click)="remove(p); $event.stopPropagation()">
                    <span nz-icon nzType="delete"></span> Delete
                  </li>
                </ul>
              </nz-dropdown-menu>
            </div>
            <div class="actions">
              <a class="open-link">Open board <span nz-icon nzType="arrow-right"></span></a>
            </div>
          </nz-card>
        } @empty {
          <nz-card class="empty">
            <nz-empty
              nzNotFoundImage="simple"
              nzNotFoundContent="No projects yet"
            >
              <ng-template #nzNotFoundFooter>
                <button nz-button nzType="primary" (click)="newProject()">
                  <span nz-icon nzType="plus"></span> New project
                </button>
              </ng-template>
            </nz-empty>
          </nz-card>
        }
      </div>
    </nz-spin>
  `,
  styles: [`
    .spacer { flex: 1; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }
    .project-card {
      position: relative; cursor: pointer; overflow: hidden;
      transition: transform .12s, box-shadow .12s;
    }
    .project-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-overflow) !important;
    }
    .color-strip { position: absolute; top: 0; left: 0; right: 0; height: 4px; }
    .card-head { display: flex; align-items: flex-start; padding-top: 4px; }
    .card-head > div:first-child { flex: 1; }
    .title { margin: 0 0 4px; font-size: 16px; font-weight: 600; }
    .muted { color: var(--c-text-subtle); }
    .small { font-size: 12px; }
    .stats { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; font-size: 12.5px; color: var(--c-text-subtle); }
    .stat-row { display: inline-flex; align-items: center; gap: 7px; }
    .stat-ico { color: var(--c-text-subtlest); }
    .more { padding: 4px 8px; color: var(--c-text-subtle); font-size: 18px; line-height: 1; }
    .actions { display: flex; justify-content: flex-end; padding-top: 8px; }
    .open-link { color: var(--c-primary); font-size: 13px; font-weight: 500; }
    .empty { grid-column: 1 / -1; padding: 36px; }
  `],
})
export class ProjectsComponent implements OnChanges {
  @Input() orgId = '';
  api = inject(ApiService);
  modal = inject(NzModalService);
  toast = inject(ToastService);
  confirmer = inject(DialogService);
  projectCtx = inject(ProjectContextService);
  router = inject(Router);

  projects = signal<Project[]>([]);
  loading = signal(false);

  async ngOnChanges() {
    if (this.orgId) await this.refresh();
  }

  async refresh() {
    this.loading.set(true);
    try {
      const list = await this.projectCtx.refresh(this.orgId);
      this.projects.set(list);
    } finally {
      this.loading.set(false);
    }
  }

  newProject() {
    const ref = this.modal.create<ProjectFormComponent, any>({
      nzTitle: 'New project',
      nzContent: ProjectFormComponent,
      nzWidth: 560,
      nzOkText: 'Create',
      nzCancelText: 'Cancel',
      nzWrapClassName: 'no-anim-modal',
      nzOnOk: (instance) => instance.submit(),
    });
    ref.afterClose.subscribe(async (data) => {
      if (!data) return;
      try {
        await firstValueFrom(this.api.post(`/organizations/${this.orgId}/projects`, data));
        await this.refresh();
        this.toast.success('Project created');
      } catch (err: any) {
        this.toast.error(err?.error?.message || 'Could not create');
      }
    });
  }

  openEdit(p: Project) {
    const ref = this.modal.create<ProjectFormComponent, any>({
      nzTitle: 'Edit project',
      nzContent: ProjectFormComponent,
      nzData: { title: p.title, color: p.color, editing: true } as any,
      nzWidth: 480,
      nzOkText: 'Save',
      nzCancelText: 'Cancel',
      nzWrapClassName: 'no-anim-modal',
      nzOnOk: (instance) => instance.submit(),
    });
    ref.afterClose.subscribe(async (data) => {
      if (!data) return;
      // Strip template from update payload — only used at creation time.
      const { template: _omit, ...patch } = data;
      try {
        await firstValueFrom(this.api.patch(`/organizations/${this.orgId}/projects/${p.id}`, patch));
        await this.refresh();
        this.toast.success('Project saved');
      } catch (err: any) {
        this.toast.error(err?.error?.message || 'Could not save');
      }
    });
  }

  async remove(p: Project) {
    const mode = await this.confirmer.archiveOrDelete({
      title: `Remove "${p.title}"?`,
      message:
        'Archive keeps the project recoverable from the Archived section. Permanent delete also removes all cards, columns, and board flow data.',
      archiveLabel: 'Archive',
      permanentLabel: 'Delete permanently',
    });
    if (!mode) return;
    await firstValueFrom(
      this.api.delete(`/organizations/${this.orgId}/projects/${p.id}?mode=${mode}`),
    );
    await this.refresh();
    this.toast.success(mode === 'archive' ? 'Project archived' : 'Project deleted');
  }

  open(p: Project) {
    this.projectCtx.setActive(p.id);
    this.router.navigate(['/org', this.orgId, 'project', p.id, 'board']);
  }

  openSettings(p: Project) {
    this.projectCtx.setActive(p.id);
    this.router.navigate(['/org', this.orgId, 'project', p.id, 'settings']);
  }
}
