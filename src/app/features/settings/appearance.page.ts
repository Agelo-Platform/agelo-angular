import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { ThemeService } from '../../core/theme.service';

type ThemePref = 'light' | 'dark' | 'system';

@Component({
  selector: 'app-settings-appearance',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    NzCardModule, NzIconModule, NzRadioModule,
  ],
  template: `
    <nz-card nzTitle="Appearance" class="card">
      <p class="muted small">Choose how Agelo looks. System Default follows your operating-system preference.</p>
      <nz-radio-group [ngModel]="value()" (ngModelChange)="setTheme($event)">
        <label nz-radio-button nzValue="light">
          <span nz-icon nzType="sun"></span> Light
        </label>
        <label nz-radio-button nzValue="dark">
          <span nz-icon nzType="moon"></span> Dark
        </label>
        <label nz-radio-button nzValue="system">
          <span nz-icon nzType="desktop"></span> System Default
        </label>
      </nz-radio-group>
    </nz-card>
  `,
  styles: [`
    .card { margin-bottom: 16px; }
    .muted { color: var(--c-text-subtle); }
    .small { font-size: 13px; margin-top: 0; margin-bottom: 12px; }
  `],
})
export class SettingsAppearancePage {
  theme = inject(ThemeService);

  value = computed<ThemePref>(() => this.theme.preference());

  async setTheme(value: ThemePref) {
    if (this.theme.preference() === value) return;
    await this.theme.set(value);
  }
}
