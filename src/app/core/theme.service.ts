import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { resolveApiBase } from './api-base';
import { AuthService } from './auth.service';

type ThemePref = 'light' | 'dark' | 'system';

const PREF_STORAGE_KEY = 'agelo.theme.pref';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  /** User-facing preference. May be `'system'`. */
  readonly preference = signal<ThemePref>(this.initialPreference());

  /** Resolved theme actually applied to the document (always concrete). */
  readonly theme = computed<'light' | 'dark'>(() => {
    const p = this.preference();
    if (p !== 'system') return p;
    return this.systemPrefersDark() ? 'dark' : 'light';
  });

  constructor() {
    // Re-apply when the OS theme flips while we're tracking 'system'.
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => {
        if (this.preference() === 'system') this.apply();
      };
      try { mq.addEventListener('change', handler); }
      catch { mq.addListener(handler); /* Safari < 14 */ }
    }
  }

  apply() {
    document.documentElement.setAttribute('data-theme', this.theme());
  }

  /** Set a new preference (light / dark / system) and persist. */
  async set(value: ThemePref) {
    this.preference.set(value);
    this.apply();
    try { localStorage.setItem(PREF_STORAGE_KEY, value); } catch { /* private mode */ }

    const u = this.auth.user();
    if (u) this.auth.setUser({ ...u, theme: this.theme() });

    // Server still only stores light|dark. Don't push 'system'; just rely on
    // local storage so the preference survives reloads.
    if (value !== 'system') {
      await firstValueFrom(
        this.http.patch(`${resolveApiBase()}/settings/theme`, { theme: value }),
      ).catch(() => {});
    }
  }

  /** Backward-compatible toggle between light and dark only. */
  async toggle() {
    const next = this.theme() === 'light' ? 'dark' : 'light';
    await this.set(next);
  }

  private initialPreference(): ThemePref {
    try {
      const raw = localStorage.getItem(PREF_STORAGE_KEY);
      if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
    } catch { /* ignore */ }
    const fromUser = this.auth.user()?.theme;
    if (fromUser === 'light' || fromUser === 'dark') return fromUser;
    return 'light';
  }

  private systemPrefersDark(): boolean {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
}
