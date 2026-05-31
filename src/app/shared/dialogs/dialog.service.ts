import { Component, Inject, Injectable, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NZ_MODAL_DATA, NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import {
  ArchiveConfirmComponent,
  ArchiveConfirmData,
  ArchiveConfirmResult,
} from './archive-confirm.dialog';

export type UnsavedChangesResult = 'save' | 'discard' | null;

@Component({
  selector: 'app-unsaved-changes-body',
  standalone: true,
  imports: [CommonModule, NzButtonModule],
  template: `
    <p class="msg">You have unsaved changes. Would you like to save them before closing?</p>
    <div class="actions">
      <button nz-button class="cancel-btn" (click)="stay()">Cancel</button>
      <button nz-button class="discard-btn" (click)="discard()">Discard changes</button>
      <button nz-button nzType="primary" class="save-btn" (click)="save()">Save</button>
    </div>
  `,
  styles: [`
    .msg { margin: 0 0 16px; color: var(--c-text); }
    .actions { display: flex; justify-content: flex-end; gap: 8px; }
  `],
})
export class UnsavedChangesBodyComponent {
  constructor(
    private ref: NzModalRef<UnsavedChangesBodyComponent, UnsavedChangesResult>,
  ) {}

  save() { this.ref.close('save'); }
  discard() { this.ref.close('discard'); }
  stay() { this.ref.close(null); }
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

@Component({
  selector: 'app-confirm-body',
  standalone: true,
  imports: [CommonModule, NzButtonModule],
  template: `
    <p class="msg">{{ data.message }}</p>
    <div class="actions">
      <button nz-button class="cancel-btn" (click)="cancel()">
        {{ data.cancelLabel ?? 'Cancel' }}
      </button>
      <button
        nz-button
        nzType="primary"
        [nzDanger]="!!data.destructive"
        class="confirm-btn"
        (click)="ok()"
      >
        {{ data.confirmLabel ?? 'Confirm' }}
      </button>
    </div>
  `,
  styles: [`
    .msg { margin: 0 0 16px; color: var(--c-text); }
    .actions { display: flex; justify-content: flex-end; gap: 8px; }
  `],
})
export class ConfirmBodyComponent {
  constructor(
    @Inject(NZ_MODAL_DATA) public data: ConfirmOptions,
    private ref: NzModalRef<ConfirmBodyComponent, boolean>,
  ) {}

  ok() { this.ref.close(true); }
  cancel() { this.ref.close(false); }
}

@Injectable({ providedIn: 'root' })
export class DialogService {
  private modal = inject(NzModalService);

  confirm(opts: ConfirmOptions): Promise<boolean> {
    const ref = this.modal.create<ConfirmBodyComponent, boolean>({
      nzTitle: opts.title,
      nzContent: ConfirmBodyComponent,
      nzData: opts as any,
      nzFooter: null,
      nzWidth: 440,
      nzMaskClosable: false,
      nzClosable: true,
      nzWrapClassName: 'app-confirm-modal',
    });
    return ref.afterClose.toPromise().then((v) => !!v);
  }

  unsavedChanges(): Promise<UnsavedChangesResult> {
    const ref = this.modal.create<UnsavedChangesBodyComponent, UnsavedChangesResult>({
      nzTitle: 'Unsaved changes',
      nzContent: UnsavedChangesBodyComponent,
      nzFooter: null,
      nzWidth: 440,
      nzMaskClosable: false,
      nzClosable: true,
      nzWrapClassName: 'app-confirm-modal',
    });
    return ref.afterClose.toPromise().then((v) => v ?? null);
  }

  /**
   * Archive-or-delete prompt (Feature 019). Returns 'archive', 'permanent',
   * or null when the SA cancels. Use the returned value as `?mode=` on the
   * delete request.
   */
  archiveOrDelete(opts: ArchiveConfirmData): Promise<ArchiveConfirmResult> {
    const ref = this.modal.create<ArchiveConfirmComponent, ArchiveConfirmResult>({
      nzTitle: opts.title,
      nzContent: ArchiveConfirmComponent,
      nzData: opts as any,
      nzFooter: null,
      nzWidth: 640,
      nzMaskClosable: false,
      nzClosable: true,
      nzWrapClassName: 'app-archive-modal',
    });
    return ref.afterClose.toPromise().then((v) => v ?? null);
  }
}
