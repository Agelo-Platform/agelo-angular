import { Component, Inject, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NZ_MODAL_DATA, NzModalRef } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { CodeEditorComponent } from '../../shared/editors/code-editor.component';

interface McpData {
  id?: string;
  title?: string;
  description?: string;
  registryUrl?: string;
  githubUrl?: string;
  regularConfig?: string;
  dockerConfig?: string;
}

@Component({
  selector: 'app-mcp-server-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    NzFormModule, NzInputModule, NzTabsModule,
    CodeEditorComponent,
  ],
  template: `
    <ng-template #titleTpl><span>Server details</span></ng-template>
    <ng-template #regularTpl><span>Regular config</span></ng-template>
    <ng-template #dockerTpl><span>Docker config</span></ng-template>

    <nz-tabset class="mcp-tabs">
      <nz-tab [nzTitle]="titleTpl">
        <form nz-form nzLayout="vertical" class="form" (submit)="$event.preventDefault()">
          <div class="row">
            <nz-form-item class="grow">
              <nz-form-label nzRequired>Title</nz-form-label>
              <nz-form-control [nzErrorTip]="!title.trim() ? 'Title is required' : ''">
                <input nz-input [(ngModel)]="title" name="title" placeholder="e.g. github-mcp" />
              </nz-form-control>
            </nz-form-item>
          </div>
          <nz-form-item>
            <nz-form-label>Description</nz-form-label>
            <nz-form-control>
              <textarea
                nz-input
                rows="3"
                [(ngModel)]="description"
                name="description"
                placeholder="What does this MCP server provide?"
              ></textarea>
            </nz-form-control>
          </nz-form-item>
          <div class="row">
            <nz-form-item class="grow">
              <nz-form-label>Registry URL</nz-form-label>
              <nz-form-control [nzErrorTip]="urlError(registryUrl)">
                <input nz-input [(ngModel)]="registryUrl" name="reg" placeholder="https://…" />
              </nz-form-control>
            </nz-form-item>
            <nz-form-item class="grow">
              <nz-form-label>GitHub URL</nz-form-label>
              <nz-form-control [nzErrorTip]="urlError(githubUrl)">
                <input nz-input [(ngModel)]="githubUrl" name="gh" placeholder="https://github.com/…" />
              </nz-form-control>
            </nz-form-item>
          </div>
        </form>
      </nz-tab>
      <nz-tab [nzTitle]="regularTpl">
        <p class="muted small">JSON snippet a client uses to launch the MCP server.</p>
        <app-code-editor
          [(ngModel)]="regularConfig"
          name="reg-cfg"
          language="json"
          height="320px"
        ></app-code-editor>
      </nz-tab>
      <nz-tab [nzTitle]="dockerTpl">
        <p class="muted small">JSON snippet for running the MCP server in Docker.</p>
        <app-code-editor
          [(ngModel)]="dockerConfig"
          name="docker-cfg"
          language="json"
          height="320px"
        ></app-code-editor>
      </nz-tab>
    </nz-tabset>
  `,
  styles: [`
    .form { padding-top: 4px; }
    .row { display: flex; gap: 12px; }
    .grow { flex: 1; }
    .muted { color: var(--c-text-subtle); }
    .small { font-size: 12px; margin: 0 0 8px; }
    :host ::ng-deep .ant-tabs-content-holder { padding-top: 8px; }
  `],
})
export class McpServerFormComponent {
  title = '';
  description = '';
  registryUrl = '';
  githubUrl = '';
  regularConfig = '{\n  \n}';
  dockerConfig = '{\n  \n}';

  constructor(
    private ref: NzModalRef,
    @Optional() @Inject(NZ_MODAL_DATA) data: McpData | null,
  ) {
    if (data) {
      this.title = data.title ?? '';
      this.description = data.description ?? '';
      this.registryUrl = data.registryUrl ?? '';
      this.githubUrl = data.githubUrl ?? '';
      this.regularConfig = data.regularConfig ?? '{}';
      this.dockerConfig = data.dockerConfig ?? '{}';
    }
  }

  urlError(v: string): string {
    if (!v) return '';
    try { new URL(v); return ''; } catch { return 'Must be a valid URL'; }
  }

  validate(): string | null {
    if (!this.title.trim()) return 'Title is required';
    if (this.urlError(this.registryUrl)) return 'Registry URL is invalid';
    if (this.urlError(this.githubUrl)) return 'GitHub URL is invalid';
    for (const f of ['regularConfig', 'dockerConfig'] as const) {
      const val = (this as any)[f] as string;
      if (!val.trim()) continue;
      try { JSON.parse(val); }
      catch { return `${f === 'regularConfig' ? 'Regular' : 'Docker'} config is not valid JSON`; }
    }
    return null;
  }

  submit(): boolean {
    const err = this.validate();
    if (err) return false;
    this.ref.close({
      title: this.title.trim(),
      description: this.description,
      registryUrl: this.registryUrl,
      githubUrl: this.githubUrl,
      regularConfig: this.regularConfig,
      dockerConfig: this.dockerConfig,
    });
    return true;
  }
}
