import {
  Component, Input, OnChanges, computed, inject, signal,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  CdkDragDrop, CdkDropList, DragDropModule, moveItemInArray,
} from '@angular/cdk/drag-drop';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzModalService } from 'ng-zorro-antd/modal';
import { ApiService } from '../../core/api.service';
import { ProjectContextService } from '../../core/project-context.service';
import { ShortIdComponent } from '../../shared/ui/short-id.component';
import { CardCreateComponent } from './card-create.dialog';
import { CardDetailComponent } from './card-detail.dialog';
import { BoardFlow } from '../board-flow/board-flow.component';
import { ToastService } from '../../shared/dialogs/toast.service';

interface CardSummary {
  id: string;
  title: string;
  typeId: string;
  columnId: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  type: { id: string; name: string; agentPickupEnabled: boolean };
  column: { id: string; name: string; agentCanModerate: boolean };
}

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DatePipe, DragDropModule,
    NzButtonModule, NzIconModule, NzToolTipModule, NzSpinModule, NzEmptyModule, ShortIdComponent,
  ],
  template: `
    <div class="page-header">
      <div>
        <h1>Board</h1>
        <div class="subtitle">Drag cards across columns to update their status.</div>
      </div>
      <div class="spacer"></div>
      <button
        nz-button
        nzType="primary"
        (click)="newCard()"
        [disabled]="!flow() || (flow()?.cardTypes?.length ?? 0) === 0 || (flow()?.columns?.length ?? 0) === 0"
      >
        <span nz-icon nzType="plus"></span> Create
      </button>
    </div>

    <nz-spin [nzSpinning]="loading()">
      @if (!flow() || (flow()?.columns?.length ?? 0) === 0) {
        <nz-empty
          nzNotFoundImage="simple"
          nzNotFoundContent="Set up your workflow first"
        >
          <ng-template #nzNotFoundFooter>
            <p class="muted">Define columns and card types in <strong>Board Flow</strong> to start creating cards.</p>
          </ng-template>
        </nz-empty>
      } @else {
        <div class="kanban" cdkDropListGroup>
          @for (col of sortedColumns(); track col.id) {
            <div class="kanban-lane">
              <div class="kanban-lane-head">
                <span class="lane-name">{{ col.name }}</span>
                <span class="count">{{ cardsInColumn(col.id).length }}</span>
                @if (!col.agentCanModerate) {
                  <span nz-icon nzType="lock" class="lock" nz-tooltip="Agents can't move cards in this column"></span>
                }
                <span class="spacer"></span>
                <button nz-button nzType="text" nzSize="small" (click)="newCard(col.id)" nz-tooltip="Add card">
                  <span nz-icon nzType="plus"></span>
                </button>
              </div>
              <div
                class="kanban-lane-body"
                cdkDropList
                [id]="'lane-' + col.id"
                [cdkDropListData]="col.id"
                [cdkDropListEnterPredicate]="enterPredicate(col.id)"
                (cdkDropListDropped)="onDrop($event)"
              >
                @for (card of cardsInColumn(col.id); track card.id) {
                  <div
                    class="kanban-card"
                    cdkDrag
                    [cdkDragData]="card"
                    (click)="open(card)"
                    tabindex="0"
                    (keyup.enter)="open(card)"
                  >
                    <div class="kc-head">
                      <span class="kc-type">{{ card.type?.name }}</span>
                      @if (!card.type?.agentPickupEnabled) {
                        <span nz-icon nzType="lock" class="kc-flag" nz-tooltip="Agents cannot pick up this card type"></span>
                      }
                    </div>
                    <div class="kc-title">{{ card.title }}</div>
                    <div class="kc-meta" (click)="$event.stopPropagation()">
                      <app-short-id [id]="card.id" label="card id"></app-short-id>
                      <span class="spacer"></span>
                      <span nz-icon nzType="clock-circle" class="kc-meta-icon" nz-tooltip="Created"></span>
                      <span [nz-tooltip]="card.createdAt | date:'medium'">
                        {{ card.createdAt | date:'mediumDate' }}
                      </span>
                    </div>
                  </div>
                } @empty {
                  <div class="empty-lane">No cards.</div>
                }
              </div>
            </div>
          }
        </div>
      }
    </nz-spin>
  `,
  styles: [`
    .spacer { flex: 1; }
    .lane-name { letter-spacing: .06em; }
    .lock { font-size: 14px; opacity: .7; color: var(--c-text-subtle); }
    .muted { color: var(--c-text-subtle); }

    .kanban-card {
      background: var(--c-surface);
      border: 1px solid var(--c-border-subtle);
      border-radius: var(--radius);
      padding: var(--sp-3);
      cursor: grab;
      box-shadow: var(--shadow-raised);
      transition: box-shadow .12s, border-color .12s, transform .12s;
      user-select: none;
    }
    .kanban-card:hover {
      box-shadow: var(--shadow-overflow);
      border-color: var(--c-primary);
    }
    .kanban-card:active { cursor: grabbing; }
    .kanban-card.cdk-drag-preview { transform: rotate(1.5deg); }
    .kc-head { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
    .kc-type {
      display: inline-flex; align-items: center;
      font-size: 11px; font-weight: 700;
      letter-spacing: .04em; text-transform: uppercase;
      color: var(--c-primary-hover);
      background: var(--c-primary-bg-subtle);
      padding: 2px 6px; border-radius: var(--radius);
    }
    .kc-flag { font-size: 14px; color: var(--c-text-subtle); }
    .kc-title { font-size: 14px; font-weight: 500; line-height: 1.4; margin-bottom: 8px; color: var(--c-text); }
    .kc-meta {
      display: flex; align-items: center; gap: 4px;
      font-size: 11px;
      color: var(--c-text-subtle);
    }
    .kc-meta-icon { font-size: 12px; }
    .kc-id {
      background: var(--c-surface-2);
      padding: 1px 5px; border-radius: 3px;
      font-size: 10px;
      color: var(--c-text-subtle);
    }
    .empty-lane {
      padding: var(--sp-4) var(--sp-2);
      text-align: center;
      font-size: 12px;
      color: var(--c-text-subtlest);
      font-style: italic;
    }
  `],
})
export class BoardComponent implements OnChanges {
  @Input() orgId = '';
  @Input() projectId = '';

  api = inject(ApiService);
  modal = inject(NzModalService);
  toast = inject(ToastService);
  projectCtx = inject(ProjectContextService);
  route = inject(ActivatedRoute);

  flow = signal<BoardFlow | null>(null);
  cards = signal<CardSummary[]>([]);
  loading = signal(false);

  sortedColumns = computed(() => {
    const cols = this.flow()?.columns ?? [];
    return [...cols].sort((a, b) => a.order - b.order);
  });

  cardsInColumn(colId: string): CardSummary[] {
    return this.cards().filter((c) => c.columnId === colId);
  }

  private effectiveProjectId(): string | null {
    return this.projectId || this.projectCtx.activeProjectId();
  }

  async ngOnChanges() {
    if (!this.orgId) return;
    await this.projectCtx.refresh(this.orgId);
    if (this.projectId && this.projectId !== this.projectCtx.activeProjectId()) {
      this.projectCtx.setActive(this.projectId);
    }
    await this.refresh();
    this.maybeOpenLinkedCard();
  }

  private maybeOpenLinkedCard() {
    const cardId = this.route?.snapshot.queryParamMap.get('card');
    if (!cardId) return;
    const c = this.cards().find((x) => x.id === cardId);
    if (c) this.open(c);
  }

  async refresh() {
    this.loading.set(true);
    try {
      const projectId = this.effectiveProjectId();
      const params: Record<string, string> = projectId ? { projectId } : {};
      const [flow, cards] = await Promise.all([
        firstValueFrom(this.api.get<BoardFlow>(`/organizations/${this.orgId}/board-flow`, params)),
        firstValueFrom(this.api.get<CardSummary[]>(`/organizations/${this.orgId}/cards`, params)),
      ]);
      this.flow.set(flow);
      this.cards.set(cards);
    } finally {
      this.loading.set(false);
    }
  }

  enterPredicate(targetColumnId: string) {
    return (drag: any /* CdkDrag<CardSummary> */, _drop: CdkDropList) => {
      const card = drag?.data as CardSummary | undefined;
      if (!card) return true;
      if (card.columnId === targetColumnId) return true;
      const flow = this.flow();
      if (!flow) return false;
      return flow.transitions.some(
        (t) => t.fromColumnId === card.columnId && t.toColumnId === targetColumnId,
      );
    };
  }

  async onDrop(event: CdkDragDrop<string>) {
    const card = event.item.data as CardSummary;
    const fromColId = event.previousContainer.data;
    const toColId = event.container.data;

    if (event.previousContainer === event.container) {
      const arr = this.cardsInColumn(toColId);
      moveItemInArray(arr, event.previousIndex, event.currentIndex);
      return;
    }

    const next = this.cards().map((c) =>
      c.id === card.id ? { ...c, columnId: toColId } : c,
    );
    this.cards.set(next);

    try {
      await firstValueFrom(
        this.api.patch(`/cards/${card.id}/status`, { toColumnId: toColId }),
      );
      const flow = this.flow();
      const colName = flow?.columns.find((c) => c.id === toColId)?.name;
      this.toast.success(`Moved to "${colName}"`);
    } catch (err: any) {
      const reverted = this.cards().map((c) =>
        c.id === card.id ? { ...c, columnId: fromColId } : c,
      );
      this.cards.set(reverted);
      this.toast.error(err?.error?.message || 'Transition not allowed');
    }
  }

  newCard(defaultColumnId?: string) {
    const flow = this.flow();
    if (!flow) return;
    const ref = this.modal.create<CardCreateComponent, any>({
      nzTitle: 'New card',
      nzContent: CardCreateComponent,
      nzWidth: 480,
      nzOkText: 'Create card',
      nzCancelText: 'Cancel',
      nzOnOk: (instance) => instance.submit(),
    });
    ref.componentInstance!.cardTypes = flow.cardTypes;
    ref.componentInstance!.columns = flow.columns;
    ref.componentInstance!.defaultColumnId = defaultColumnId;
    ref.afterClose.subscribe(async (data) => {
      if (!data) return;
      try {
        const projectId = this.effectiveProjectId() ?? undefined;
        await firstValueFrom(
          this.api.post(`/organizations/${this.orgId}/cards`, { ...data, projectId }),
        );
        await this.refresh();
        this.toast.success('Card created');
      } catch (err: any) {
        this.toast.error(err?.error?.message || 'Could not create card');
      }
    });
  }

  open(card: CardSummary) {
    const ref = this.modal.create<CardDetailComponent, any>({
      nzContent: CardDetailComponent,
      nzWidth: 1200,
      nzClassName: 'card-detail-modal',
      nzFooter: null,
      nzClosable: false,
    });
    ref.componentInstance!.cardId = card.id;
    ref.componentInstance!.orgId = this.orgId;
    ref.afterClose.subscribe(async () => {
      await this.refresh();
    });
  }
}
