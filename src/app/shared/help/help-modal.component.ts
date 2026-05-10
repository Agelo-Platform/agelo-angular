import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalRef } from 'ng-zorro-antd/modal';

@Component({
  selector: 'app-help-modal',
  standalone: true,
  imports: [CommonModule, NzButtonModule, NzIconModule],
  template: `
    <div class="help">
      <p>
        <strong>Agelo</strong> is a solution-design-driven project
        management platform for human–AI collaboration. Architects design
        end-to-end agent flows, SAs configure boards and prompts, and agents
        register themselves to pick up cards.
      </p>
      <ul>
        <li><span nz-icon nzType="appstore"></span> Per-project boards with custom card types, columns, transitions, and fields.</li>
        <li><span nz-icon nzType="robot"></span> Self-registering agents scoped to teams within an organization.</li>
        <li><span nz-icon nzType="bulb"></span> Versioned Prompt Library shared across the platform.</li>
        <li><span nz-icon nzType="thunderbolt"></span> MCP server catalogue agents can plug into.</li>
        <li><span nz-icon nzType="lock"></span> Role-based permissions for agents and users.</li>
      </ul>
      <p class="muted">
        Open-source under the MIT License — free to copy, modify and
        redistribute.
      </p>
      <div class="actions">
        <a nz-button nzType="primary" href="#" target="_blank" rel="noopener">
          <span nz-icon nzType="book"></span> Open detailed documentation
        </a>
        <button nz-button (click)="close()">Close</button>
      </div>
    </div>
  `,
  styles: [`
    .help { line-height: 1.55; }
    .help p { margin: 0 0 12px; }
    .help ul { padding-left: 0; list-style: none; margin: 0 0 16px; }
    .help li { display: flex; gap: 10px; align-items: flex-start; padding: 6px 0; }
    .help li .anticon { color: var(--c-primary); margin-top: 3px; }
    .muted { color: var(--c-text-subtle); font-size: 13px; }
    .actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }
  `],
})
export class HelpModalComponent {
  constructor(private ref: NzModalRef) {}
  close() { this.ref.close(); }
}
