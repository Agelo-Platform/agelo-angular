import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';

@Component({
  selector: 'app-column-form',
  standalone: true,
  imports: [CommonModule, FormsModule, NzFormModule, NzInputModule, NzCheckboxModule],
  template: `
    <form class="form" nz-form nzLayout="vertical" (submit)="submit($event)">
      <nz-form-item>
        <nz-form-label>Name</nz-form-label>
        <nz-form-control>
          <input nz-input [(ngModel)]="name" name="name" placeholder="e.g. TODO" />
        </nz-form-control>
      </nz-form-item>
      <nz-form-item>
        <nz-form-control>
          <label nz-checkbox [(ngModel)]="agentCanModerate" name="canMod">
            Agents can move cards into this column
          </label>
        </nz-form-control>
      </nz-form-item>
    </form>
  `,
  styles: [`.form { padding-top: 4px; }`],
})
export class ColumnFormComponent {
  name = '';
  agentCanModerate = true;
  constructor(private ref: NzModalRef) {}
  submit(ev?: Event) {
    if (ev) ev.preventDefault();
    if (!this.name.trim()) return;
    this.ref.close({ name: this.name.trim(), agentCanModerate: this.agentCanModerate });
  }
}
