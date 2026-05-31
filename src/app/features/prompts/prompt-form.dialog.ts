import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { ApiService } from '../../core/api.service';

interface Category { id: string; name: string; }

@Component({
  selector: 'app-prompt-form',
  standalone: true,
  imports: [CommonModule, FormsModule, NzFormModule, NzInputModule, NzSelectModule],
  template: `
    <form class="form" nz-form nzLayout="vertical" (submit)="submit($event)">
      <nz-form-item>
        <nz-form-label>Title</nz-form-label>
        <nz-form-control>
          <input nz-input [(ngModel)]="title" name="title" />
        </nz-form-control>
      </nz-form-item>

      <nz-form-item>
        <nz-form-label>Category</nz-form-label>
        <nz-form-control [nzExtra]="cats().length === 0 ? 'Create a category first.' : ''">
          <nz-select [(ngModel)]="categoryId" name="cat" nzPlaceHolder="Select…">
            @for (c of cats(); track c.id) {
              <nz-option [nzValue]="c.id" [nzLabel]="c.name"></nz-option>
            }
          </nz-select>
        </nz-form-control>
      </nz-form-item>

      <nz-form-item>
        <nz-form-label>Initial version</nz-form-label>
        <nz-form-control>
          <input nz-input [(ngModel)]="initialVersion" name="ver" />
        </nz-form-control>
      </nz-form-item>

      <nz-form-item>
        <nz-form-label>Initial content (markdown)</nz-form-label>
        <nz-form-control>
          <textarea
            nz-input
            [(ngModel)]="initialContent"
            name="content"
            rows="6"
          ></textarea>
        </nz-form-control>
      </nz-form-item>
    </form>
  `,
  styles: [`.form { padding-top: 4px; }`],
})
export class PromptFormComponent implements OnInit {
  api = inject(ApiService);
  ref = inject(NzModalRef);

  cats = signal<Category[]>([]);
  title = '';
  categoryId = '';
  initialVersion = '1.0.0';
  initialContent = '';

  async ngOnInit() {
    const list = await firstValueFrom(this.api.get<Category[]>('/prompt-categories'));
    this.cats.set(list);
    if (list.length === 1) this.categoryId = list[0].id;
  }

  canSubmit() {
    return !!this.title.trim() && !!this.categoryId;
  }

  submit(ev?: Event) {
    if (ev) ev.preventDefault();
    if (!this.canSubmit()) return;
    this.ref.close({
      title: this.title.trim(),
      categoryId: this.categoryId,
      initialVersion: this.initialVersion || '1.0.0',
      initialContent:
        this.initialContent || `# ${this.title.trim()}\n\nWrite the prompt body here.\n`,
    });
  }
}
