import { Component, Inject, Input, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NZ_MODAL_DATA, NzModalRef } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';

const PRESETS = [
  '#0C66E4', '#22A06B', '#946F00', '#C9372C',
  '#7A3DF3', '#0AA3A7', '#3A86FF', '#F72585',
];

interface ProjectFormData {
  title?: string;
  color?: string;
  /** When true, render in edit mode — hides the template picker. */
  editing?: boolean;
}

@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [CommonModule, FormsModule, NzFormModule, NzInputModule, NzIconModule],
  template: `
    <form class="form" nz-form nzLayout="vertical" (submit)="submit($event)">
      <p class="muted">
        Each project has its own dedicated board, columns, and cards. Teams stay
        at the organization level.
      </p>
      <nz-form-item>
        <nz-form-label>Title</nz-form-label>
        <nz-form-control>
          <input nz-input [(ngModel)]="title" name="title" placeholder="e.g. Mobile App" />
        </nz-form-control>
      </nz-form-item>
      <nz-form-item>
        <nz-form-label>Color</nz-form-label>
        <nz-form-control>
          <div class="swatches">
            @for (c of presets; track c) {
              <button
                type="button"
                class="swatch"
                [class.selected]="color === c"
                [style.background]="c"
                (click)="color = c"
              ></button>
            }
            <input type="color" [(ngModel)]="color" name="color" class="custom-color" />
          </div>
        </nz-form-control>
      </nz-form-item>

      @if (!editing) {
        <nz-form-item>
          <nz-form-label>Project type</nz-form-label>
          <nz-form-control>
            <div class="templates">
              <button
                type="button"
                class="tpl"
                [class.selected]="template === 'blank'"
                (click)="template = 'blank'"
              >
                <span nz-icon nzType="folder-open" class="tpl-ic"></span>
                <div class="tpl-body">
                  <div class="tpl-name">Blank</div>
                  <div class="tpl-desc">No columns or cards. Build the workflow from scratch.</div>
                </div>
              </button>
              <button
                type="button"
                class="tpl"
                [class.selected]="template === 'default_kanban'"
                (click)="template = 'default_kanban'"
              >
                <span nz-icon nzType="apartment" class="tpl-ic"></span>
                <div class="tpl-body">
                  <div class="tpl-name">Default Kanban</div>
                  <div class="tpl-desc">
                    Todo → In Progress → Review → Done with bidirectional
                    transitions, plus a Task card type with PR link, Description,
                    Acceptance criteria and more.
                  </div>
                </div>
              </button>
            </div>
          </nz-form-control>
        </nz-form-item>
      }
    </form>
  `,
  styles: [`
    .muted { color: var(--c-text-subtle); margin-top: 0; }
    .form { padding-top: 4px; }
    .swatches { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
    .swatch {
      width: 28px; height: 28px; border-radius: 3px;
      border: 1px solid var(--c-border);
      cursor: pointer;
    }
    .swatch.selected { outline: 2px solid var(--c-primary); outline-offset: 2px; }
    .custom-color {
      width: 28px; height: 28px; border-radius: 3px;
      border: 1px dashed var(--c-border);
      background: transparent; padding: 0;
    }

    .templates { display: flex; flex-direction: column; gap: 8px; }
    .tpl {
      display: grid; grid-template-columns: 28px 1fr; gap: 12px;
      align-items: start; text-align: left;
      padding: 12px 14px; cursor: pointer;
      background: var(--c-surface);
      border: 1px solid var(--c-border);
      border-radius: var(--radius);
    }
    .tpl:hover { border-color: var(--c-primary); }
    .tpl.selected {
      border-color: var(--c-primary);
      background: var(--c-primary-bg-subtle);
    }
    .tpl-ic { font-size: 20px; line-height: 28px; color: var(--c-primary); }
    .tpl-name { font-weight: 600; color: var(--c-text); margin-bottom: 4px; }
    .tpl-desc { font-size: 12px; color: var(--c-text-subtle); line-height: 1.45; }
  `],
})
export class ProjectFormComponent {
  @Input() title = '';
  @Input() color = PRESETS[0];
  template: 'blank' | 'default_kanban' = 'default_kanban';
  editing = false;
  presets = PRESETS;

  constructor(
    private ref: NzModalRef,
    @Optional() @Inject(NZ_MODAL_DATA) data: ProjectFormData | null,
  ) {
    if (data) {
      this.title = data.title ?? '';
      this.color = data.color ?? PRESETS[0];
      this.editing = !!data.editing;
    }
  }

  submit(ev?: Event) {
    if (ev) ev.preventDefault();
    if (!this.title.trim()) return;
    const payload: any = { title: this.title.trim(), color: this.color };
    if (!this.editing) payload.template = this.template;
    this.ref.close(payload);
  }
}
