import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzModalService } from 'ng-zorro-antd/modal';
import { ApiService } from '../../core/api.service';
import { CategoryFormComponent } from './category-form.dialog';
import { PromptFormComponent } from './prompt-form.dialog';
import { ToastService } from '../../shared/dialogs/toast.service';

interface Category { id: string; name: string; }
interface Prompt {
  id: string;
  title: string;
  category: { id: string; name: string };
  tags: string[];
  versions: { id: string; version: string; createdAt: string }[];
  updatedAt: string;
}

@Component({
  selector: 'app-prompts',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    NzCardModule, NzButtonModule, NzIconModule, NzInputModule, NzTagModule,
    NzSpinModule, NzEmptyModule,
  ],
  template: `
    <div class="page-header">
      <div>
        <h1>Prompt Library</h1>
        <div class="subtitle">
          Global library — versioned prompts shared across all organizations.
        </div>
      </div>
      <div class="spacer"></div>
      <button nz-button nzType="primary" (click)="newPrompt()">
        <span nz-icon nzType="plus"></span> New prompt
      </button>
    </div>

    <nz-spin [nzSpinning]="loading()">
      <div class="lib-grid">
        <nz-card class="cats-card" nzTitle="Categories" [nzExtra]="catExtra">
          <ng-template #catExtra>
            <button nz-button nzType="text" (click)="newCategory()" nz-tooltip="New category">
              <span nz-icon nzType="plus"></span>
            </button>
          </ng-template>
          <ul class="cat-list">
            <li
              [class.active]="!filterCat()"
              (click)="filterCat.set(null); refreshPrompts()"
            >
              <span nz-icon nzType="folder-open"></span>
              <span>All</span>
              <span class="cnt">{{ totalPrompts }}</span>
            </li>
            @for (c of cats(); track c.id) {
              <li
                [class.active]="filterCat() === c.id"
                (click)="filterCat.set(c.id); refreshPrompts()"
              >
                <span nz-icon nzType="folder-open"></span>
                <span>{{ c.name }}</span>
                <span class="cnt">{{ countByCategory(c.id) }}</span>
              </li>
            } @empty {
              <li class="muted empty-li">No categories yet.</li>
            }
          </ul>
        </nz-card>

        <div class="content-col">
          <nz-card class="search-card">
            <input
              nz-input
              type="text"
              [(ngModel)]="search"
              (ngModelChange)="onSearchChange()"
              placeholder="Search by title…"
            />
          </nz-card>

          @if (prompts().length === 0 && !loading()) {
            <nz-card class="empty">
              <nz-empty
                nzNotFoundImage="simple"
                nzNotFoundContent="No prompts yet"
              >
                <ng-template #nzNotFoundFooter>
                  <button nz-button nzType="primary" (click)="newPrompt()">
                    <span nz-icon nzType="plus"></span> New prompt
                  </button>
                </ng-template>
              </nz-empty>
            </nz-card>
          }

          <div class="prompt-grid">
            @for (p of prompts(); track p.id) {
              <nz-card
                class="prompt-card"
                tabindex="0"
                (click)="open(p)"
                (keyup.enter)="open(p)"
              >
                <div class="head">
                  <span nz-icon nzType="bulb" class="prompt-icon"></span>
                  <div>
                    <h3 class="title">{{ p.title }}</h3>
                    <div class="muted small">Updated {{ p.updatedAt | slice:0:10 }}</div>
                  </div>
                </div>
                <div class="chips">
                  <nz-tag>{{ p.category?.name }}</nz-tag>
                  <nz-tag nzColor="blue">v{{ p.versions[0]?.version }}</nz-tag>
                  <nz-tag>{{ p.versions.length }} version{{ p.versions.length === 1 ? '' : 's' }}</nz-tag>
                </div>
              </nz-card>
            }
          </div>
        </div>
      </div>
    </nz-spin>
  `,
  styles: [`
    .spacer { flex: 1; }
    .lib-grid {
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 16px;
      align-items: start;
    }
    @media (max-width: 800px) { .lib-grid { grid-template-columns: 1fr; } }

    .cat-list { list-style: none; margin: 0; padding: 0; }
    .cat-list li {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 10px; border-radius: var(--radius);
      cursor: pointer; font-size: 14px;
    }
    .cat-list li:hover { background: var(--c-surface-hover); }
    .cat-list li.active {
      background: var(--c-primary-bg-subtle);
      color: var(--c-primary);
      font-weight: 500;
    }
    .cat-list li.active .anticon { color: var(--c-primary); }
    .cat-list li .anticon { font-size: 16px; color: var(--c-text-subtle); }
    .cat-list li .cnt {
      margin-left: auto;
      font-size: 11px;
      color: var(--c-text-subtle);
      background: var(--c-surface-2);
      padding: 2px 8px; border-radius: 999px;
    }
    .empty-li { padding: 8px 10px; cursor: default; color: var(--c-text-subtle); }

    .content-col { display: flex; flex-direction: column; gap: 16px; }

    .prompt-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }
    .prompt-card { cursor: pointer; transition: transform .12s, box-shadow .12s; }
    .prompt-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-overflow) !important;
    }
    .head { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 12px; }
    .prompt-icon { font-size: 22px; color: var(--c-primary); padding-top: 2px; }
    .title { margin: 0 0 4px; font-size: 16px; font-weight: 600; }
    .muted { color: var(--c-text-subtle); }
    .small { font-size: 12px; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .empty { padding: 36px; text-align: center; }
  `],
})
export class PromptsComponent implements OnInit {
  api = inject(ApiService);
  modal = inject(NzModalService);
  toast = inject(ToastService);
  router = inject(Router);

  cats = signal<Category[]>([]);
  prompts = signal<Prompt[]>([]);
  filterCat = signal<string | null>(null);
  search = '';
  loading = signal(false);

  countsByCat = new Map<string, number>();
  totalPrompts = 0;

  private debounce: any = null;

  async ngOnInit() {
    await Promise.all([this.refreshCats(), this.refreshPrompts()]);
    await this.refreshCounts();
  }

  async refreshCats() {
    const list = await firstValueFrom(this.api.get<Category[]>('/prompt-categories'));
    this.cats.set(list);
  }

  async refreshPrompts() {
    this.loading.set(true);
    try {
      const params: Record<string, string> = {};
      if (this.search) params['search'] = this.search;
      if (this.filterCat()) params['categoryId'] = this.filterCat()!;
      const list = await firstValueFrom(this.api.get<Prompt[]>('/prompts', params));
      this.prompts.set(list);
    } finally {
      this.loading.set(false);
    }
  }

  async refreshCounts() {
    const all = await firstValueFrom(this.api.get<Prompt[]>('/prompts'));
    this.totalPrompts = all.length;
    this.countsByCat.clear();
    for (const p of all) {
      const id = p.category?.id;
      if (!id) continue;
      this.countsByCat.set(id, (this.countsByCat.get(id) ?? 0) + 1);
    }
  }

  countByCategory(id: string): number {
    return this.countsByCat.get(id) ?? 0;
  }

  onSearchChange() {
    clearTimeout(this.debounce);
    this.debounce = setTimeout(() => this.refreshPrompts(), 250);
  }

  newCategory() {
    const ref = this.modal.create<CategoryFormComponent, string>({
      nzTitle: 'New category',
      nzContent: CategoryFormComponent,
      nzWidth: 480,
      nzOkText: 'Create',
      nzCancelText: 'Cancel',
      nzOnOk: (instance) => instance.submit(),
    });
    ref.afterClose.subscribe(async (name) => {
      if (!name) return;
      try {
        await firstValueFrom(this.api.post('/prompt-categories', { name }));
        await this.refreshCats();
        await this.refreshCounts();
        this.toast.success(`Category "${name}" created`);
      } catch (err: any) {
        this.toast.error(err?.error?.message || 'Could not create category');
      }
    });
  }

  newPrompt() {
    const ref = this.modal.create<PromptFormComponent, any>({
      nzTitle: 'New prompt',
      nzContent: PromptFormComponent,
      nzWidth: 600,
      nzOkText: 'Create',
      nzCancelText: 'Cancel',
      nzOnOk: (instance) => instance.submit(),
    });
    ref.afterClose.subscribe(async (data) => {
      if (!data) return;
      try {
        const p = await firstValueFrom(this.api.post<{ id: string }>('/prompts', data));
        await this.refreshPrompts();
        await this.refreshCounts();
        this.router.navigate(['/prompts', p.id]);
      } catch (err: any) {
        this.toast.error(err?.error?.message || 'Could not create prompt');
      }
    });
  }

  open(p: Prompt) {
    this.router.navigate(['/prompts', p.id]);
  }
}
