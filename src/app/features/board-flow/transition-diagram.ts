import {
  Component, EventEmitter, Input, Output, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import * as shape from 'd3-shape';
import { NgxGraphModule, Node, Edge } from '@swimlane/ngx-graph';
import { ApiService } from '../../core/api.service';
import { BoardColumn, StatusTransition } from './board-flow.component';
import { DialogService } from '../../shared/dialogs/dialog.service';

@Component({
  selector: 'app-transition-diagram',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    NzCardModule, NzButtonModule, NzIconModule, NzSelectModule, NzEmptyModule,
    NgxGraphModule,
  ],
  template: `
    <nz-card class="toolbar">
      <p class="muted">Allowed status transitions form a directed graph.</p>
      <div class="add-row">
        <nz-select [(ngModel)]="from" nzPlaceHolder="From" class="sel">
          @for (c of sortedCols(); track c.id) {
            <nz-option [nzValue]="c.id" [nzLabel]="c.name"></nz-option>
          }
        </nz-select>
        <span nz-icon nzType="arrow-right" class="muted"></span>
        <nz-select [(ngModel)]="to" nzPlaceHolder="To" class="sel">
          @for (c of sortedCols(); track c.id) {
            <nz-option [nzValue]="c.id" [nzLabel]="c.name"></nz-option>
          }
        </nz-select>
        <button nz-button nzType="primary" [disabled]="!canAdd()" (click)="addTransition()">
          <span nz-icon nzType="plus"></span> Add transition
        </button>
      </div>
    </nz-card>

    @if (columns.length < 2) {
      <nz-card class="empty">
        <nz-empty
          nzNotFoundImage="simple"
          nzNotFoundContent="Add columns first"
        ></nz-empty>
      </nz-card>
    } @else if (transitions.length === 0) {
      <nz-card class="empty">
        <nz-empty
          nzNotFoundImage="simple"
          nzNotFoundContent="No transitions yet"
        ></nz-empty>
      </nz-card>
    } @else {
      <nz-card class="graph-card">
        <ngx-graph
          class="graph"
          [nodes]="nodes()"
          [links]="links()"
          [curve]="curve"
          [draggingEnabled]="true"
          [panningEnabled]="true"
          [zoomSpeed]="0.05"
          [enableZoom]="true"
          [autoCenter]="true"
          (linkClick)="onEdgeClick($any($event))"
        >
          <ng-template #nodeTemplate let-node>
            <svg:g>
              <svg:rect
                [attr.width]="node.dimension.width"
                [attr.height]="node.dimension.height"
                rx="3" ry="3"
                class="node-rect"
                [class.locked]="node.data?.locked"
              />
              <svg:text
                alignment-baseline="central" text-anchor="middle"
                [attr.x]="node.dimension.width / 2"
                [attr.y]="node.dimension.height / 2 - 7"
                class="node-label"
              >{{ node.label }}</svg:text>
              <svg:text
                alignment-baseline="central" text-anchor="middle"
                [attr.x]="node.dimension.width / 2"
                [attr.y]="node.dimension.height / 2 + 12"
                class="node-sub"
              >{{ node.data?.locked ? 'read-only for agents' : 'agents allowed' }}</svg:text>
            </svg:g>
          </ng-template>

          <ng-template #linkTemplate let-link>
            <svg:g class="edge" (click)="onEdgeClick(link)">
              <svg:path class="line" [attr.d]="link.line" marker-end="url(#tarrow)" />
            </svg:g>
          </ng-template>

          <ng-template #defsTemplate>
            <svg:marker id="tarrow" viewBox="0 -5 10 10" refX="8" refY="0" markerWidth="8" markerHeight="8" orient="auto">
              <svg:path d="M0,-5L10,0L0,5" class="arrow-path" />
            </svg:marker>
          </ng-template>
        </ngx-graph>
        <div class="hint muted">
          <span nz-icon nzType="bulb"></span>
          Click an arrow to remove it. Drag nodes to rearrange.
        </div>
      </nz-card>
    }
  `,
  styles: [`
    .toolbar { margin-bottom: 16px; }
    .muted { color: var(--c-text-subtle); }
    .add-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .sel { width: 200px; }
    .empty { text-align: center; padding: 36px; }
    .graph-card { padding: 0 !important; overflow: hidden; }
    .graph-card ::ng-deep .ant-card-body { padding: 0 !important; }
    .graph { display: block; width: 100%; height: 520px; background: var(--c-surface-2); }
    .node-rect { fill: var(--c-surface); stroke: var(--c-primary); stroke-width: 2; }
    .node-rect.locked { stroke-dasharray: 4 3; fill: var(--c-surface-2); }
    .node-label { fill: var(--c-text); font-weight: 500; font-size: 14px; }
    .node-sub   { fill: var(--c-text-subtle); font-size: 10px; }
    .line { fill: none; stroke: var(--c-primary); stroke-width: 2; cursor: pointer; }
    .edge:hover .line { stroke-width: 3; }
    .arrow-path { fill: var(--c-primary); }
    .hint {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 16px;
      font-size: 12px;
      border-top: 1px solid var(--c-border);
    }
  `],
})
export class TransitionDiagram {
  @Input() orgId = '';
  @Input() projectId = '';
  @Input() columns: BoardColumn[] = [];
  @Input() transitions: StatusTransition[] = [];
  @Output() changed = new EventEmitter<void>();

  api = inject(ApiService);
  confirmer = inject(DialogService);

  from = '';
  to = '';
  curve = shape.curveBundle.beta(1);

  nodes = signal<Node[]>([]);
  links = signal<Edge[]>([]);

  sortedCols(): BoardColumn[] {
    return [...this.columns].sort((a, b) => a.order - b.order);
  }

  ngOnChanges() { this.rebuild(); }

  canAdd(): boolean {
    if (!this.from || !this.to || this.from === this.to) return false;
    return !this.transitions.find(
      (t) => t.fromColumnId === this.from && t.toColumnId === this.to,
    );
  }

  private rebuild() {
    this.nodes.set(this.sortedCols().map((c) => ({
      id: c.id, label: c.name,
      dimension: { width: 180, height: 64 },
      data: { locked: !c.agentCanModerate },
    })));
    this.links.set(this.transitions.map((t) => ({
      id: 't_' + t.id,
      source: t.fromColumnId,
      target: t.toColumnId,
      data: { transitionId: t.id },
    })));
  }

  async addTransition() {
    if (!this.canAdd()) return;
    await firstValueFrom(
      this.api.post(`/organizations/${this.orgId}/transitions`, {
        fromColumnId: this.from,
        toColumnId: this.to,
        projectId: this.projectId || undefined,
      }),
    );
    this.from = ''; this.to = '';
    this.changed.emit();
  }

  async onEdgeClick(link: Edge) {
    const id = link.data?.transitionId;
    if (!id) return;
    const ok = await this.confirmer.confirm({
      title: 'Remove transition?',
      message: 'Cards already moved through this transition stay where they are.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    await firstValueFrom(this.api.delete(`/organizations/${this.orgId}/transitions/${id}`));
    this.changed.emit();
  }
}
