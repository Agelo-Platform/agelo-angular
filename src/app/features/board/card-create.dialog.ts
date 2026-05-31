import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';

@Component({
  selector: 'app-card-create',
  standalone: true,
  imports: [CommonModule, FormsModule, NzFormModule, NzInputModule, NzSelectModule],
  template: `
    <form class="form" nz-form nzLayout="vertical" (submit)="submit($event)">
      <nz-form-item>
        <nz-form-label>Title</nz-form-label>
        <nz-form-control>
          <input nz-input [(ngModel)]="title" name="title" placeholder="Short summary of the work" />
        </nz-form-control>
      </nz-form-item>

      <nz-form-item>
        <nz-form-label>Card type</nz-form-label>
        <nz-form-control>
          <nz-select [(ngModel)]="typeId" name="type" nzPlaceHolder="Select type">
            @for (t of cardTypes; track t.id) {
              <nz-option [nzValue]="t.id" [nzLabel]="t.name"></nz-option>
            }
          </nz-select>
        </nz-form-control>
      </nz-form-item>

      <nz-form-item>
        <nz-form-label>Column</nz-form-label>
        <nz-form-control>
          <nz-select [(ngModel)]="columnId" name="col">
            @for (c of columns; track c.id) {
              <nz-option [nzValue]="c.id" [nzLabel]="c.name"></nz-option>
            }
          </nz-select>
        </nz-form-control>
      </nz-form-item>
    </form>
  `,
  styles: [`.form { padding-top: 4px; }`],
})
export class CardCreateComponent {
  @Input() cardTypes: { id: string; name: string }[] = [];
  @Input() columns: { id: string; name: string; order: number }[] = [];
  @Input() defaultColumnId: string | undefined = undefined;

  title = '';
  typeId = '';
  columnId = '';

  constructor(private ref: NzModalRef) {}

  ngOnInit() {
    if (this.cardTypes.length === 1) this.typeId = this.cardTypes[0].id;
    this.columnId =
      this.defaultColumnId ||
      [...this.columns].sort((a, b) => a.order - b.order)[0]?.id ||
      '';
  }

  canSubmit(): boolean {
    return !!this.title.trim() && !!this.typeId && !!this.columnId;
  }

  submit(ev?: Event) {
    if (ev) ev.preventDefault();
    if (!this.canSubmit()) return;
    this.ref.close({
      title: this.title.trim(),
      typeId: this.typeId,
      columnId: this.columnId,
    });
  }
}
