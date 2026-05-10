import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { ApiService } from '../../core/api.service';
import { AgeloLogoComponent } from '../../shared/brand/agelo-logo.component';

interface About {
  product: string;
  version: string;
  tagline: string;
  docs?: string;
}

@Component({
  selector: 'app-settings-about',
  standalone: true,
  imports: [CommonModule, NzCardModule, NzIconModule, NzTagModule, AgeloLogoComponent],
  template: `
    <nz-card nzTitle="About Agelo">
      <div class="brand-row">
        <app-agelo-logo [size]="48"></app-agelo-logo>
        <div>
          <div class="brand-name">Agelo</div>
          <nz-tag nzColor="blue">v{{ about()?.version || '0.0.1' }}</nz-tag>
        </div>
      </div>

      <p>
        Agelo is a solution-design-driven project management platform
        built for human–AI collaboration. Solution Architects (SAs) design
        board flows — card types, custom fields, columns, and allowed
        status transitions — and AI agents pick up tasks and move them
        through the pipeline.
      </p>

      <h3>What's inside</h3>
      <ul class="features">
        <li><span nz-icon nzType="appstore"></span> Per-project kanban boards with drag-and-drop and validated status transitions.</li>
        <li><span nz-icon nzType="apartment"></span> Visual board flow designer (card types, custom fields, relationships, transitions).</li>
        <li><span nz-icon nzType="bulb"></span> Versioned prompt library with split-pane Markdown editor.</li>
        <li><span nz-icon nzType="robot"></span> Agent self-registration via the MCP server with SA approval.</li>
        <li><span nz-icon nzType="project"></span> Multiple projects per organization, each with its own board.</li>
        <li><span nz-icon nzType="lock"></span> Granular role-based permissions and per-card / per-column agent access.</li>
      </ul>

      <h3>Stack</h3>
      <div class="stack">
        <nz-tag>Angular 18</nz-tag>
        <nz-tag>ng-zorro-antd</nz-tag>
        <nz-tag>Ant Design</nz-tag>
        <nz-tag>CDK drag-drop</nz-tag>
        <nz-tag>ngx-graph</nz-tag>
        <nz-tag>ngx-markdown</nz-tag>
        <nz-tag>NestJS 10</nz-tag>
        <nz-tag>Prisma</nz-tag>
        <nz-tag>MySQL 8</nz-tag>
      </div>
    </nz-card>
  `,
  styles: [`
    .brand-row { display: flex; align-items: center; gap: 16px; padding: 4px 0 16px; }
    .brand-name { font-size: 22px; font-weight: 600; margin-bottom: 6px; }
    p { line-height: 1.55; }
    h3 { margin-top: 16px; margin-bottom: 8px; font-size: 14px; font-weight: 600; }
    .features { list-style: none; padding: 0; margin: 8px 0 16px; display: grid; gap: 10px; }
    .features li { display: flex; align-items: flex-start; gap: 10px; font-size: 14px; }
    .features li .anticon { color: var(--c-primary); }
    .stack { display: flex; flex-wrap: wrap; gap: 6px; padding-bottom: 8px; }
  `],
})
export class SettingsAboutPage implements OnInit {
  api = inject(ApiService);
  about = signal<About | null>(null);

  async ngOnInit() {
    try {
      const a = await firstValueFrom(this.api.get<About>('/admin/about'));
      this.about.set(a);
    } catch {
      this.about.set({
        product: 'Agelo',
        version: '0.0.1',
        tagline: 'Solution-design-driven project management for human-AI collaboration.',
      });
    }
  }
}
