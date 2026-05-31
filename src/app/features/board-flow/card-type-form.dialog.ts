import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';

/**
 * Form modal returning a new `{ name, color }` payload for the parent
 * to POST against the card-types endpoint. The color picker exposes
 * the eight platform-palette presets (matching the board lozenge
 * styling) plus a free-form hex input for anything else.
 */
@Component({
  selector: 'app-card-type-form',
  standalone: true,
  imports: [CommonModule, FormsModule, NzFormModule, NzInputModule],
  template: `
    <p class="muted">A configurable template for work items. Common types: Feature, User Story, Task.</p>
    <form class="form" nz-form nzLayout="vertical" (submit)="submit($event)">
      <nz-form-item>
        <nz-form-label>Name</nz-form-label>
        <nz-form-control>
          <input nz-input [(ngModel)]="name" name="name" placeholder="e.g. Feature" />
        </nz-form-control>
      </nz-form-item>

      <nz-form-item>
        <nz-form-label>Label color</nz-form-label>
        <nz-form-control>
          <div class="swatches">
            <button
              *ngFor="let p of presets"
              type="button"
              class="sw"
              [class.active]="color === p.hex"
              [style.background]="p.hex"
              [title]="p.name"
              (click)="color = p.hex"
              [attr.aria-label]="p.name"
            ></button>
            <label class="custom">
              <span class="swatch-preview" [style.background]="color"></span>
              <input
                type="color"
                [(ngModel)]="color"
                name="color"
                aria-label="Pick custom color"
              />
            </label>
          </div>
          <p class="hint">Used to tint the type lozenge on cards. Defaults to royal blue.</p>
        </nz-form-control>
      </nz-form-item>
    </form>
  `,
  styles: [`
    .muted { color: var(--c-text-subtle); margin-top: 0; }
    .form { padding-top: 4px; }
    .swatches { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .sw {
      width: 26px; height: 26px;
      border-radius: 50%;
      border: 2px solid var(--c-border);
      cursor: pointer;
      padding: 0;
      transition: transform .12s, border-color .12s;
    }
    .sw:hover { transform: scale(1.08); }
    .sw.active {
      border-color: var(--c-text);
      box-shadow: 0 0 0 2px var(--c-surface), 0 0 0 4px rgba(15,23,42,.18);
    }
    .custom {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 3px 8px;
      border: 1px solid var(--c-border);
      border-radius: 6px;
      cursor: pointer;
    }
    .custom input { width: 36px; height: 22px; border: 0; background: transparent; padding: 0; cursor: pointer; }
    .swatch-preview {
      display: inline-block;
      width: 16px; height: 16px;
      border-radius: 4px;
      box-shadow: 0 0 0 1px var(--c-border);
    }
    .hint { font-size: 12px; color: var(--c-text-subtle); margin: 6px 0 0; }
  `],
})
export class CardTypeFormComponent {
  name = '';
  color = '#1D4ED8';

  /** Platform palette presets — match the lozenge colours rendered on cards. */
  readonly presets: { name: string; hex: string }[] = [
    { name: 'Royal blue', hex: '#1D4ED8' },
    { name: 'Teal',       hex: '#14B8A6' },
    { name: 'Green',      hex: '#16A34A' },
    { name: 'Amber',      hex: '#D97706' },
    { name: 'Red',        hex: '#DC2626' },
    { name: 'Violet',     hex: '#7C3AED' },
    { name: 'Pink',       hex: '#DB2777' },
    { name: 'Navy',       hex: '#0F172A' },
  ];

  constructor(private ref: NzModalRef) {}

  submit(ev?: Event) {
    if (ev) ev.preventDefault();
    if (!this.name.trim()) return;
    this.ref.close({ name: this.name.trim(), color: this.color });
  }
}
