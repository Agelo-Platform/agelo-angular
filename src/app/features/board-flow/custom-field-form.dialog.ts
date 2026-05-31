import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

export const FIELD_TYPES = [
  { value: 'text',         label: 'Text' },
  { value: 'textarea',     label: 'Text area (markdown)' },
  { value: 'datetime',     label: 'Date & time' },
  { value: 'link',         label: 'Link' },
  { value: 'multi_select', label: 'Multi-select' },
  { value: 'tags',         label: 'Tags' },
  { value: 'time',         label: 'Time' },
  { value: 'prompt',       label: 'Prompt' },
  { value: 'file',         label: 'File upload' },
  { value: 'sub_cards',    label: 'Sub cards' },
];

export interface CustomFieldFormSeed {
  id?: string;
  name?: string;
  label?: string;
  type?: string;
  required?: boolean;
  validation?: string | null;
}

/**
 * Reusable form for creating/editing both card-type custom fields and
 * preset fields. The actual API call is done by the caller; the form
 * just collects {name, label, type, required}.
 *
 * mode:
 *   - 'card-field' (default): card-type custom field
 *   - 'preset':              preset field (wording differs slightly)
 */
@Component({
  selector: 'app-custom-field-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    NzFormModule, NzInputModule, NzSelectModule, NzCheckboxModule,
    NzButtonModule, NzIconModule,
  ],
  template: `
    <form class="form" nz-form nzLayout="vertical" (submit)="submit($event)">
      <div class="row">
        <nz-form-item class="grow">
          <nz-form-label>Name (snake_case)</nz-form-label>
          <nz-form-control>
            <input nz-input [(ngModel)]="name" name="name" placeholder="github_pr_link" />
          </nz-form-control>
        </nz-form-item>
        <nz-form-item class="grow">
          <nz-form-label>Display label</nz-form-label>
          <nz-form-control>
            <input nz-input [(ngModel)]="label" name="label" placeholder="GitHub PR Link" />
          </nz-form-control>
        </nz-form-item>
      </div>
      <div class="row">
        <nz-form-item class="grow">
          <nz-form-label>Type</nz-form-label>
          <nz-form-control>
            <nz-select [(ngModel)]="type" name="type">
              @for (t of types; track t.value) {
                <nz-option [nzValue]="t.value" [nzLabel]="t.label"></nz-option>
              }
            </nz-select>
          </nz-form-control>
        </nz-form-item>
      </div>
      <div class="row">
        <nz-form-item class="grow">
          <nz-form-label>Validation <span class="muted small">(optional regex)</span></nz-form-label>
          <nz-form-control>
            <input nz-input class="mono" [(ngModel)]="validation" name="validation"
                   placeholder="^https://github\\.com/" />
            <div class="hint muted small">
              A regex applied at write time. Agents receive a typed 400 on mismatch.
            </div>
          </nz-form-control>
        </nz-form-item>
      </div>
      <div class="row">
        <nz-form-item>
          <nz-form-control>
            <label nz-checkbox [(ngModel)]="required" name="required">Required</label>
          </nz-form-control>
        </nz-form-item>
      </div>
    </form>
  `,
  styles: [`
    .small { font-size: 12px; }
    .muted { color: var(--c-text-subtle); }
    .form { padding-top: 4px; }
    .row { display: flex; gap: 12px; align-items: flex-start; }
    .grow { flex: 1; }
    .mono { font-family: var(--font-mono); }
    .hint { margin-top: 4px; }
  `],
})
export class CustomFieldFormComponent implements OnInit {
  @Input() typeName = '';
  @Input() mode: 'card-field' | 'preset' = 'card-field';
  @Input() field: CustomFieldFormSeed | null = null;

  types = FIELD_TYPES;
  name = '';
  label = '';
  type: any = 'text';
  required = false;
  validation = '';

  constructor(private ref: NzModalRef) {}

  ngOnInit(): void {
    if (this.field) {
      this.name = this.field.name ?? '';
      this.label = this.field.label ?? '';
      this.type = this.field.type ?? 'text';
      this.required = !!this.field.required;
      this.validation = this.field.validation ?? '';
    }
  }

  canSubmit(): boolean {
    return !!this.name.trim() && !!this.label.trim() && !!this.type;
  }

  submit(ev?: Event) {
    if (ev) ev.preventDefault();
    if (!this.canSubmit()) return;
    this.ref.close({
      name: this.name.trim(),
      label: this.label.trim(),
      type: this.type,
      required: this.required,
      // Always send the field so an emptied box clears the regex server-side.
      validation: this.validation.trim(),
    });
  }
}
