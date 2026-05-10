import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';

@Component({
  selector: 'app-team-form',
  standalone: true,
  imports: [CommonModule, FormsModule, NzFormModule, NzInputModule],
  template: `
    <p class="muted">
      Teams group AI agents by role or domain (e.g. backend, frontend, devops).
    </p>
    <form class="form" nz-form nzLayout="vertical" (submit)="submit($event)">
      <nz-form-item>
        <nz-form-label>Name</nz-form-label>
        <nz-form-control nzExtra="Lowercase, no spaces — used as a slug.">
          <input nz-input [(ngModel)]="name" name="name" placeholder="e.g. backend" />
        </nz-form-control>
      </nz-form-item>
    </form>
  `,
  styles: [`
    .muted { color: var(--c-text-subtle); margin-top: 0; }
    .form { padding-top: 4px; }
  `],
})
export class TeamFormComponent {
  @Input() name = '';
  constructor(private ref: NzModalRef) {}
  submit(ev?: Event) {
    if (ev) ev.preventDefault();
    if (!this.name.trim()) return;
    this.ref.close(this.name.trim());
  }
}
