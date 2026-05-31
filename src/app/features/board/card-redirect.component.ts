import { Component, Input, OnChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { ApiService } from '../../core/api.service';
import { OrgContextService } from '../../core/org-context.service';
import { ProjectContextService } from '../../core/project-context.service';

/**
 * Deep-link landing page for `/card/:cardId`. Looks up the card to find its
 * organization + project, then redirects to the appropriate board with
 * `?card=<id>` so the board opens the card detail dialog.
 */
@Component({
  selector: 'app-card-redirect',
  standalone: true,
  imports: [CommonModule, NzSpinModule, NzAlertModule],
  template: `
    <div class="wrap">
      @if (error()) {
        <nz-alert nzType="error" [nzMessage]="error()!" nzShowIcon></nz-alert>
      } @else {
        <nz-spin nzSpinning="true" nzTip="Opening card…"></nz-spin>
      }
    </div>
  `,
  styles: [`
    .wrap { display: flex; align-items: center; justify-content: center; min-height: 60vh; }
  `],
})
export class CardRedirectComponent implements OnChanges {
  @Input() cardId = '';
  api = inject(ApiService);
  router = inject(Router);
  orgCtx = inject(OrgContextService);
  projectCtx = inject(ProjectContextService);

  error = signal<string | null>(null);

  async ngOnChanges() {
    if (!this.cardId) return;
    try {
      const card = await firstValueFrom(this.api.get<any>(`/cards/${this.cardId}`));
      const orgId = card.orgId;
      const projectId = card.projectId;
      this.orgCtx.setActive(orgId);
      if (projectId) this.projectCtx.setActive(projectId);
      const url = projectId
        ? ['/org', orgId, 'project', projectId, 'board']
        : ['/org', orgId, 'board'];
      this.router.navigate(url, { queryParams: { card: this.cardId } });
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Could not open this card');
    }
  }
}
