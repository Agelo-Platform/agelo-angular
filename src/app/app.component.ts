import { Component, OnInit, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/theme.service';
import { ShortcutListenerService } from './core/shortcut-listener.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class AppComponent implements OnInit {
  private theme = inject(ThemeService);
  // Inject so the service is constructed and its auth-aware effect runs.
  private shortcuts = inject(ShortcutListenerService);

  constructor() {
    // ThemeService applies the persisted theme to <html data-theme>.
    effect(() => this.theme.apply());
  }

  ngOnInit(): void {
    // Touching the property keeps the injection from being tree-shaken.
    void this.shortcuts;
  }
}
