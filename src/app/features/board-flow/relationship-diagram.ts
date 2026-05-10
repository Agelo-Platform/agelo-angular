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
import { CardRelationship, CardType } from './board-flow.component';
import { DialogService } from '../../shared/dialogs/dialog.service';

@Component({
  selector: 'app-relationship-diagram',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    NzCardModule, NzButtonModule, NzIconModule, NzSelectModule, NzEmptyModule,
    NgxGraphModule,
  ],
  template: `
    <nz-card class="toolbar">
      <p class="muted">
        One-to-many parent → child relationships between card types.
      </p>
      <div class="add-row">
        <nz-select [(ngModel)]="parent" nzPlaceHolder="Parent" class="sel">
          @for (t of cardTypes; track t.id) {
            <nz-option [nzValue]="t.id" [nzLabel]="t.name"></nz-option>
          }
        </nz-select>
        <span nz-icon nzType="arrow-right" class="muted"></span>
        <nz-select [(ngModel)]="child" nzPlaceHolder="Child" class="sel">
          @for (t of cardTypes; track t.id) {
            <nz-option [nzValue]="t.id" [nzLabel]="t.name"></nz-option>
          }
        </nz-select>
        <button nz-button nzType="primary" [disabled]="!canAdd()" (click)="addRelation()">
          <span nz-icon nzType="plus"></span> Add relationship
        </button>
      </div>
    </nz-card>

    @if (cardTypes.length < 2) {
      <nz-card class="empty">
        <nz-empty
          nzNotFoundImage="simple"
          [nzNotFoundContent]="cardTypes.length === 0 ? 'Add card types first' : 'Add at least two card types'"
        ></nz-empty>
      </nz-card>
    } @else if (relationships.length === 0) {
      <nz-card class="empty">
        <nz-empty
          nzNotFoundImage="simple"
          nzNotFoundContent="No relationships yet"
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
              />
              <svg:text
                alignment-baseline="central"
                text-anchor="middle"
                [attr.x]="node.dimension.width / 2"
                [attr.y]="node.dimension.height / 2"
                class="node-label"
              >{{ node.label }}</svg:text>
            </svg:g>
          </ng-template>

          <ng-template #linkTemplate let-link>
            <svg:g class="edge" (click)="onEdgeClick(link)">
              <svg:path class="line" [attr.d]="link.line" marker-end="url(#arrow)" />
              <svg:text class="edge-label">
                <textPath [attr.href]="'#' + link.id" startOffset="50%" text-anchor="middle">1 → many</textPath>
              </svg:text>
            </svg:g>
          </ng-template>

          <ng-template #defsTemplate>
            <svg:marker id="arrow" viewBox="0 -5 10 10" refX="8" refY="0" markerWidth="8" markerHeight="8" orient="auto">
              <svg:path d="M0,-5L10,0L0,5" class="arrow-path" />
            </svg:marker>
          </ng-template>
        </ngx-graph>
        <div class="hint muted">
          <span nz-icon nzType="bulb"></span>
          Click an edge to remove it. Drag nodes to rearrange.
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
    .node-label { fill: var(--c-text); font-weight: 500; font-size: 14px; }
    .line { fill: none; stroke: var(--c-primary); stroke-width: 2; cursor: pointer; }
    .edge:hover .line { stroke-width: 3; }
    .arrow-path { fill: var(--c-primary); }
    .edge-label { fill: var(--c-text-subtle); font-size: 11px; }
    .hint {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 16px;
      font-size: 12px;
      border-top: 1px solid var(--c-border);
    }
  `],
})
export class RelationshipDiagram {
  @Input() orgId = '';
  @Input() projectId = '';
  @Input() cardTypes: CardType[] = [];
  @Input() relationships: CardRelationship[] = [];
  @Output() changed = new EventEmitter<void>();

  api = inject(ApiService);
  confirmer = inject(DialogService);

  parent = '';
  child = '';
  curve = shape.curveBundle.beta(1);

  nodes = signal<Node[]>([]);
  links = signal<Edge[]>([]);

  ngOnChanges() { this.rebuild(); }

  canAdd(): boolean {
    if (!this.parent || !this.child || this.parent === this.child) return false;
    return !this.relationships.find(
      (r) => r.parentTypeId === this.parent && r.childTypeId === this.child,
    );
  }

  private rebuild() {
    this.nodes.set(this.cardTypes.map((t) => ({
      id: t.id, label: t.name, dimension: { width: 160, height: 56 },
    })));
    this.links.set(this.relationships.map((r) => ({
      id: 'r_' + r.id,
      source: r.parentTypeId,
      target: r.childTypeId,
      label: '1 → many',
      data: { relationshipId: r.id },
    })));
  }

  async addRelation() {
    if (!this.canAdd()) return;
    await firstValueFrom(
      this.api.post(`/organizations/${this.orgId}/relationships`, {
        parentTypeId: this.parent,
        childTypeId: this.child,
        projectId: this.projectId || undefined,
      }),
    );
    this.parent = ''; this.child = '';
    this.changed.emit();
  }

  async onEdgeClick(link: Edge) {
    const id = link.data?.relationshipId;
    if (!id) return;
    const ok = await this.confirmer.confirm({
      title: 'Remove relationship?',
      message: 'Cards already linked under this relationship keep their parent reference.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    await firstValueFrom(this.api.delete(`/organizations/${this.orgId}/relationships/${id}`));
    this.changed.emit();
  }
}
