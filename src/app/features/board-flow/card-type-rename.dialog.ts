import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NZ_MODAL_DATA, NzModalRef } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';

export interface CardTypeRenameData { name: string; }

@Component({
  selector: 'app-card-type-rename',
  standalone: true,
  imports: [CommonModule, FormsModule, NzFormModule, NzInputModule],
  template: `
    <p class="muted">Rename this card type. The internal id is preserved.</p>
    <form class="form" nz-form nzLayout="vertical" (submit)="submit($event)">
      <nz-form-item>
        <nz-form-label>Name</nz-form-label>
        <nz-form-control>
          <input nz-input [(ngModel)]="name" name="name" placeholder="e.g. Feature" />
        </nz-form-control>
      </nz-form-item>
    </form>
  `,
  styles: [`
    .muted { color: var(--c-text-subtle); margin-top: 0; }
    .form { padding-top: 4px; }
  `],
})
export class CardTypeRenameComponent {
  name = '';
  constructor(
    private ref: NzModalRef,
    @Inject(NZ_MODAL_DATA) data: CardTypeRenameData,
  ) {
    this.name = data?.name ?? '';
  }
  submit(ev?: Event) {
    if (ev) ev.preventDefault();
    if (!this.name.trim()) return;
    this.ref.close(this.name.trim());
  }
}
