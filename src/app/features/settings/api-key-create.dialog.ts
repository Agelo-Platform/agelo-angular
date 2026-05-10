import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { ApiService } from '../../core/api.service';

interface Org { id: string; title: string; color: string; }

@Component({
  selector: 'app-api-key-create',
  standalone: true,
  imports: [CommonModule, FormsModule, NzFormModule, NzInputModule, NzSelectModule],
  template: `
    <p class="muted">
      Used by AI agents and the MCP server to authenticate. The raw key is
      shown only once after creation.
    </p>
    <form class="form" nz-form nzLayout="vertical" (submit)="submit($event)">
      <nz-form-item>
        <nz-form-label>Name</nz-form-label>
        <nz-form-control>
          <input
            nz-input
            [(ngModel)]="name"
            name="name"
            placeholder="e.g. claude-agent-dev"
          />
        </nz-form-control>
      </nz-form-item>
      <nz-form-item>
        <nz-form-label>Organization</nz-form-label>
        <nz-form-control>
          <nz-select [(ngModel)]="orgId" name="orgId" nzPlaceHolder="Select…">
            @for (o of orgs(); track o.id) {
              <nz-option [nzValue]="o.id" [nzLabel]="o.title">
                <span class="dot" [style.background]="o.color"></span>
                {{ o.title }}
              </nz-option>
            }
          </nz-select>
        </nz-form-control>
      </nz-form-item>
    </form>
  `,
  styles: [`
    .muted { color: var(--c-text-subtle); font-size: 13px; margin-top: 0; margin-bottom: 12px; }
    .form { padding-top: 0; }
    .dot {
      display: inline-block;
      width: 10px; height: 10px; border-radius: 3px;
      margin-right: 8px; vertical-align: middle;
      border: 1px solid var(--c-border);
    }
  `],
})
export class ApiKeyCreateComponent implements OnInit {
  api = inject(ApiService);
  ref = inject(NzModalRef);

  orgs = signal<Org[]>([]);
  name = '';
  orgId = '';

  async ngOnInit() {
    const list = await firstValueFrom(this.api.get<Org[]>('/organizations'));
    this.orgs.set(list);
    if (list.length === 1) this.orgId = list[0].id;
  }

  async submit(ev?: Event) {
    if (ev) ev.preventDefault();
    if (!this.name || !this.orgId) return;
    try {
      const res = await firstValueFrom(
        this.api.post<{ rawKey: string; id: string; name: string }>(
          '/settings/api-keys',
          { name: this.name, orgId: this.orgId },
        ),
      );
      this.ref.close(res);
    } catch (err: any) {
      // close with error so caller can handle
      this.ref.close(null);
    }
  }
}
