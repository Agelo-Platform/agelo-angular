import { Component, Input, OnChanges, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { MarkdownModule } from 'ngx-markdown';
import { MarkdownEditorComponent } from '../../shared/editors/markdown-editor.component';
import { ApiService } from '../../core/api.service';
import { DialogService } from '../../shared/dialogs/dialog.service';
import { ToastService } from '../../shared/dialogs/toast.service';

interface Version {
  id: string;
  version: string;
  content: string;
  createdAt: string;
}
interface Prompt {
  id: string;
  title: string;
  category: { id: string; name: string };
  tags: string[];
  versions: Version[];
}

@Component({
  selector: 'app-prompt-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, DatePipe,
    NzCardModule, NzButtonModule, NzIconModule, NzInputModule, NzSelectModule,
    NzTabsModule, NzTagModule, NzToolTipModule, MarkdownModule,
    MarkdownEditorComponent,
  ],
  template: `
    @if (prompt(); as p) {
      <div class="page-header detail-header">
        <a nz-button nzType="text" routerLink="/prompts" nz-tooltip="Back to library">
          <span nz-icon nzType="arrow-left"></span>
        </a>
        <div>
          <h1>{{ p.title }}</h1>
          <div class="subtitle">
            <span nz-icon nzType="folder-open"></span>
            {{ p.category?.name }} ·
            <span nz-icon nzType="history"></span>
            {{ p.versions.length }} version{{ p.versions.length === 1 ? '' : 's' }}
          </div>
        </div>
        <div class="spacer"></div>

        <nz-select
          class="version-pick"
          [ngModel]="activeVersionId()"
          (ngModelChange)="switchVersion($event)"
        >
          @for (v of p.versions; track v.id) {
            <nz-option [nzValue]="v.id" [nzLabel]="'v' + v.version + ' · ' + (v.createdAt | date:'short')"></nz-option>
          }
        </nz-select>

        <button
          nz-button
          (click)="downloadMarkdown()"
          nz-tooltip="Download the active version as a .md file"
        >
          <span nz-icon nzType="download"></span> Download
        </button>
        <button nz-button nzDanger (click)="remove()">
          <span nz-icon nzType="delete"></span> Delete
        </button>
      </div>

      <ng-template #editTabTitle>
        <span nz-icon nzType="edit"></span> Edit
      </ng-template>
      <ng-template #saveTabTitle>
        <span nz-icon nzType="save"></span> Save
      </ng-template>
      <ng-template #historyTabTitle>
        <span nz-icon nzType="history"></span> History
      </ng-template>

      <nz-card class="editor-card">
        <nz-tabset>
          <nz-tab [nzTitle]="editTabTitle">
            <app-markdown-editor
              [(ngModel)]="draft"
              name="prompt-body"
              height="480px"
              placeholder="Write the prompt body in Markdown…"
            ></app-markdown-editor>
          </nz-tab>

          <nz-tab [nzTitle]="saveTabTitle">
            <div class="save-pane">
              <p class="muted">
                Save your edits as a new version (recommended) or overwrite
                the version currently selected.
              </p>
              <div class="row">
                <input
                  nz-input
                  class="version-input"
                  [(ngModel)]="newVersionLabel"
                  placeholder="e.g. 1.1.0"
                />
                <button
                  nz-button
                  nzType="primary"
                  (click)="createVersion()"
                  [disabled]="!newVersionLabel.trim()"
                >
                  <span nz-icon nzType="plus"></span> Save as new version
                </button>
                <button nz-button (click)="replaceCurrent()">
                  <span nz-icon nzType="save"></span> Replace current version
                </button>
              </div>
            </div>
          </nz-tab>

          <nz-tab [nzTitle]="historyTabTitle">
            <div class="history-pane">
              <ul class="version-list">
                @for (v of p.versions; track v.id) {
                  <li
                    [class.active]="v.id === activeVersionId()"
                    (click)="switchVersion(v.id)"
                  >
                    <span nz-icon nzType="tag"></span>
                    <div>
                      <div class="ver-title">v{{ v.version }}</div>
                      <div class="muted small">{{ v.createdAt | date:'medium' }}</div>
                    </div>
                  </li>
                }
              </ul>
            </div>
          </nz-tab>
        </nz-tabset>
      </nz-card>
    } @else {
      <p class="muted">Loading…</p>
    }
  `,
  styles: [`
    .detail-header { gap: 16px; align-items: center; }
    .detail-header h1 { font-size: 22px; font-weight: 600; margin: 0; }
    .detail-header .subtitle {
      color: var(--c-text-subtle); font-size: 13px;
      display: flex; align-items: center; gap: 4px; flex-wrap: wrap;
    }
    .spacer { flex: 1; }
    .version-pick { width: 280px; }
    .muted { color: var(--c-text-subtle); }

    .editor-card ::ng-deep .ant-card-body { padding: 0 !important; }
    .md-grid {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 0; min-height: 480px;
    }
    .md-pane { display: flex; flex-direction: column; border-right: 1px solid var(--c-border); }
    .md-pane:last-child { border-right: none; }
    .md-pane-head {
      padding: 6px 12px; font-size: 11px;
      text-transform: uppercase; letter-spacing: .04em;
      background: var(--c-surface-2);
      border-bottom: 1px solid var(--c-border);
    }
    .md-textarea {
      flex: 1; border: none; outline: none;
      padding: 16px; font-size: 13px;
      background: transparent; color: var(--c-text); resize: none;
      min-height: 480px;
    }
    .md-preview { flex: 1; padding: 16px; overflow: auto; min-height: 480px; }

    .save-pane { padding: 16px; }
    .save-pane .row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    .version-input { width: 200px; }

    .history-pane { padding: 8px 0; }
    .version-list { list-style: none; margin: 0; padding: 0; }
    .version-list li {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 16px;
      cursor: pointer;
      border-left: 3px solid transparent;
    }
    .version-list li:hover { background: var(--c-surface-hover); }
    .version-list li.active {
      background: var(--c-primary-bg-subtle);
      border-left-color: var(--c-primary);
    }
    .ver-title { font-weight: 500; }
    .small { font-size: 11px; }
  `],
})
export class PromptDetailComponent implements OnChanges {
  @Input() id = '';
  api = inject(ApiService);
  toast = inject(ToastService);
  router = inject(Router);
  confirmer = inject(DialogService);

  prompt = signal<Prompt | null>(null);
  draft = '';
  activeVersionId = signal<string>('');
  newVersionLabel = '';

  async ngOnChanges() { if (this.id) await this.refresh(); }

  async refresh() {
    const p = await firstValueFrom(this.api.get<Prompt>(`/prompts/${this.id}`));
    this.prompt.set(p);
    if (p.versions.length) {
      const current = this.activeVersionId() || p.versions[0].id;
      this.activeVersionId.set(current);
      const v = p.versions.find((x) => x.id === current) ?? p.versions[0];
      this.draft = v.content;
    }
  }

  switchVersion(versionId: string) {
    const p = this.prompt();
    if (!p) return;
    const v = p.versions.find((x) => x.id === versionId);
    if (!v) return;
    this.activeVersionId.set(versionId);
    this.draft = v.content;
  }

  async createVersion() {
    if (!this.newVersionLabel.trim()) return;
    try {
      await firstValueFrom(
        this.api.post(`/prompts/${this.id}/versions`, {
          version: this.newVersionLabel.trim(),
          content: this.draft,
        }),
      );
      this.toast.success(`Saved as v${this.newVersionLabel}`);
      this.newVersionLabel = '';
      await this.refresh();
    } catch (err: any) {
      this.toast.error(err?.error?.message || 'Could not save');
    }
  }

  async replaceCurrent() {
    const versionId = this.activeVersionId();
    if (!versionId) return;
    const ok = await this.confirmer.confirm({
      title: 'Replace current version?',
      message: 'This overwrites the content of the version currently selected. The version number stays the same.',
      confirmLabel: 'Replace',
      destructive: true,
    });
    if (!ok) return;
    await firstValueFrom(
      this.api.patch(`/prompts/${this.id}/versions/${versionId}`, { content: this.draft }),
    );
    this.toast.success('Version updated');
    await this.refresh();
  }

  async remove() {
    const mode = await this.confirmer.archiveOrDelete({
      title: 'Remove this prompt?',
      message:
        'Archive keeps it recoverable. Permanent delete wipes all versions from the database.',
      archiveLabel: 'Archive',
      permanentLabel: 'Delete permanently',
    });
    if (!mode) return;
    await firstValueFrom(this.api.delete(`/prompts/${this.id}?mode=${mode}`));
    this.router.navigate(['/prompts']);
  }

  /**
   * Download the active version as a Markdown file. Filename is the prompt
   * title slugified plus the version label, e.g. "api-design-reviewer-v1.1.0.md".
   * The body is the version's content as-is — Markdown source, not rendered.
   */
  downloadMarkdown() {
    const p = this.prompt();
    if (!p) return;
    const v = p.versions.find((x) => x.id === this.activeVersionId());
    if (!v) {
      this.toast.warn('No version selected to download');
      return;
    }
    const slug = (p.title || 'prompt')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'prompt';
    const filename = `${slug}-v${v.version}.md`;
    const blob = new Blob([v.content ?? ''], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.toast.success(`Downloaded ${filename}`);
  }
}
