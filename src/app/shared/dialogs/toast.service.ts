import { Injectable, inject } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';

/**
 * Thin wrapper over NzMessageService so callers don't have to import the
 * ng-zorro symbol in every component.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private message = inject(NzMessageService);

  success(text: string, durationMs = 2500) {
    this.message.success(text, { nzDuration: durationMs });
  }

  error(text: string, durationMs = 4000) {
    this.message.error(text, { nzDuration: durationMs });
  }

  info(text: string, durationMs = 2500) {
    this.message.info(text, { nzDuration: durationMs });
  }

  warn(text: string, durationMs = 3000) {
    this.message.warning(text, { nzDuration: durationMs });
  }
}
