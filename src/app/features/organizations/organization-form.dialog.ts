import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';

const PRESETS = [
  '#0C66E4', '#22A06B', '#946F00', '#C9372C',
  '#7A3DF3', '#0AA3A7', '#3A86FF', '#F72585',
];

@Component({
  selector: 'app-organization-form',
  standalone: true,
  imports: [CommonModule, FormsModule, NzFormModule, NzInputModule, NzButtonModule],
  template: `
    <form class="form" nz-form nzLayout="vertical" (submit)="submit($event)">
      <nz-form-item>
        <nz-form-label>Title</nz-form-label>
        <nz-form-control>
          <input nz-input [(ngModel)]="title" name="title" maxlength="60" placeholder="e.g. Acme Inc." />
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
            <input
              type="color"
              [(ngModel)]="color"
              name="color"
              class="custom-color"
            />
          </div>
        </nz-form-control>
      </nz-form-item>
    </form>
  `,
  styles: [`
    .form { padding-top: 4px; }
    .swatches { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
    .swatch {
      width: 28px; height: 28px; border-radius: 3px;
      border: 1px solid var(--c-border);
      cursor: pointer;
    }
    .swatch.selected {
      outline: 2px solid var(--c-primary);
      outline-offset: 2px;
    }
    .custom-color {
      width: 28px; height: 28px; border-radius: 3px;
      border: 1px dashed var(--c-border);
      background: transparent; padding: 0;
    }
  `],
})
export class OrganizationFormComponent {
  @Input() title = '';
  @Input() color = PRESETS[0];

  presets = PRESETS;

  constructor(private ref: NzModalRef) {}

  submit(ev?: Event) {
    if (ev) ev.preventDefault();
    if (!this.title.trim()) return;
    this.ref.close({ title: this.title.trim(), color: this.color });
  }
}
