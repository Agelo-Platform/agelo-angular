import { Component, DestroyRef, Input, OnChanges, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { ApiService } from '../../core/api.service';
import { ProjectContextService } from '../../core/project-context.service';
import { CardTypesPanel } from './card-types.panel';
import { ColumnsPanel } from './columns.panel';
import { RelationshipDiagram } from './relationship-diagram';
import { TransitionDiagram } from './transition-diagram';
import { PresetFieldsPanel } from './preset-fields.panel';

export interface CardType {
  id: string;
  name: string;
  commentsEnabled: boolean;
  agentPickupEnabled: boolean;
  customFields: CustomField[];
}
export interface CustomField {
  id: string;
  name: string;
  label: string;
  type: 'text'|'textarea'|'datetime'|'link'|'multi_select'|'tags'|'time'|'prompt'|'file'|'sub_cards';
  required: boolean;
  order: number;
  config?: any;
  validation?: string | null;
}
export interface BoardColumn {
  id: string;
  name: string;
  order: number;
  agentCanModerate: boolean;
}
export interface CardRelationship {
  id: string;
  parentTypeId: string;
  childTypeId: string;
}
export interface StatusTransition {
  id: string;
  fromColumnId: string;
  toColumnId: string;
}
export interface BoardFlow {
  cardTypes: CardType[];
  columns: BoardColumn[];
  relationships: CardRelationship[];
  transitions: StatusTransition[];
}

@Component({
  selector: 'app-board-flow',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    NzTabsModule, NzIconModule, NzButtonModule, NzSpinModule,
    CardTypesPanel, ColumnsPanel, RelationshipDiagram, TransitionDiagram,
    PresetFieldsPanel,
  ],
  template: `
    <div class="page-header">
      <div>
        <h1>Board Flow Manager</h1>
        <div class="subtitle">
          Design the workflow for this organization: card types, custom fields,
          relationships, columns, and allowed status transitions.
        </div>
      </div>
    </div>

    <nz-spin [nzSpinning]="loading()">
      @if (flow(); as f) {
        <div class="bf-section-toggle">
          <button
            nz-button
            [nzType]="section() === 'workflow' ? 'primary' : 'default'"
            (click)="section.set('workflow')"
          >
            <span nz-icon nzType="apartment"></span>
            Columns &amp; Transitions
          </button>
          <button
            nz-button
            [nzType]="section() === 'types' ? 'primary' : 'default'"
            (click)="section.set('types')"
          >
            <span nz-icon nzType="appstore"></span>
            Card types &amp; Relations
          </button>
          <button
            nz-button
            [nzType]="section() === 'presets' ? 'primary' : 'default'"
            (click)="section.set('presets')"
          >
            <span nz-icon nzType="tag"></span>
            Preset fields
          </button>
        </div>

        <ng-template #cardTypesTab>
          <span nz-icon nzType="appstore"></span> Card types
        </ng-template>
        <ng-template #relationshipsTab>
          <span nz-icon nzType="fork"></span> Relationships
        </ng-template>
        <ng-template #columnsTab>
          <span nz-icon nzType="apartment"></span> Columns
        </ng-template>
        <ng-template #transitionsTab>
          <span nz-icon nzType="partition"></span> Transitions
        </ng-template>

        @if (section() === 'workflow') {
          <nz-tabset>
            <nz-tab [nzTitle]="columnsTab">
              <app-columns-panel
                [orgId]="orgId"
                [projectId]="effectiveProjectId() ?? ''"
                [columns]="f.columns"
                (changed)="refresh()"
              />
            </nz-tab>

            <nz-tab [nzTitle]="transitionsTab">
              <app-transition-diagram
                [orgId]="orgId"
                [projectId]="effectiveProjectId() ?? ''"
                [columns]="f.columns"
                [transitions]="f.transitions"
                (changed)="refresh()"
              />
            </nz-tab>
          </nz-tabset>
        } @else if (section() === 'types') {
          <nz-tabset>
            <nz-tab [nzTitle]="cardTypesTab">
              <app-card-types-panel
                [orgId]="orgId"
                [projectId]="effectiveProjectId() ?? ''"
                [cardTypes]="f.cardTypes"
                (changed)="refresh()"
              />
            </nz-tab>

            <nz-tab [nzTitle]="relationshipsTab">
              <app-relationship-diagram
                [orgId]="orgId"
                [projectId]="effectiveProjectId() ?? ''"
                [cardTypes]="f.cardTypes"
                [relationships]="f.relationships"
                (changed)="refresh()"
              />
            </nz-tab>
          </nz-tabset>
        } @else {
          <app-preset-fields-panel></app-preset-fields-panel>
        }
      }
    </nz-spin>
  `,
  styles: [`
    .bf-section-toggle { display: flex; gap: 6px; margin-bottom: 16px; }
  `],
})
export class BoardFlowComponent implements OnChanges, OnInit {
  @Input() orgId = '';
  @Input() projectId = '';
  api = inject(ApiService);
  projectCtx = inject(ProjectContextService);
  route = inject(ActivatedRoute);
  flow = signal<BoardFlow | null>(null);
  loading = signal(false);
  section = signal<'workflow' | 'types' | 'presets'>('workflow');

  private destroyRef = inject(DestroyRef);

  ngOnInit() {
    // Sync the inner section toggle with the `?section=` query param so a
    // deep link can land directly on either pane. Auto-unsubscribe on
    // component destroy via takeUntilDestroyed.
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((qp) => {
        const v = qp.get('section');
        if (v === 'types' || v === 'workflow' || v === 'presets') this.section.set(v);
      });
  }

  effectiveProjectId(): string | null {
    return this.projectId || this.projectCtx.activeProjectId();
  }

  async ngOnChanges() {
    if (!this.orgId) return;
    await this.projectCtx.refresh(this.orgId);
    if (this.projectId && this.projectId !== this.projectCtx.activeProjectId()) {
      this.projectCtx.setActive(this.projectId);
    }
    await this.refresh();
  }

  async refresh() {
    if (!this.orgId) return;
    this.loading.set(true);
    try {
      const projectId = this.effectiveProjectId();
      const params: Record<string, string> = projectId ? { projectId } : {};
      const f = await firstValueFrom(
        this.api.get<BoardFlow>(`/organizations/${this.orgId}/board-flow`, params),
      );
      this.flow.set(f);
    } finally {
      this.loading.set(false);
    }
  }
}
