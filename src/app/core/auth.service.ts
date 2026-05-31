import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { resolveApiBase } from './api-base';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: 'solution_architect' | 'agent';
  theme: 'light' | 'dark';
  avatarUrl?: string | null;
}

const TOKEN_KEY = 'agelo.token';
const USER_KEY = 'agelo.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly user = signal<AuthUser | null>(this.loadUser());
  readonly token = signal<string | null>(this.loadItem(TOKEN_KEY));
  readonly isAuthed = computed(() => !!this.token());

  async login(email: string, password: string) {
    const res = await firstValueFrom(
      this.http.post<{ token: string; user: AuthUser }>(
        `${resolveApiBase()}/auth/login`,
        { email, password },
      ),
    );
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this.token.set(res.token);
    this.user.set(res.user);
    return res.user;
  }

  logout() {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
    try { localStorage.removeItem(USER_KEY); } catch { /* ignore */ }
    this.token.set(null);
    this.user.set(null);
    this.router.navigate(['/login']);
  }

  setUser(user: AuthUser) {
    this.user.set(user);
    try { localStorage.setItem(USER_KEY, JSON.stringify(user)); } catch { /* ignore */ }
  }

  /**
   * Fetches the SA profile from `/auth/me`. Useful after profile fields
   * (display name, avatar, theme) might have changed server-side.
   */
  async refreshProfile(): Promise<AuthUser | null> {
    try {
      const profile = await firstValueFrom(
        this.http.get<AuthUser>(`${resolveApiBase()}/auth/me`),
      );
      this.setUser(profile);
      return profile;
    } catch {
      return null;
    }
  }

  private loadUser(): AuthUser | null {
    const raw = this.loadItem(USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  // Defensive read — localStorage can throw under SSR, sandboxed iframes,
  // strict CSP, or when the browser is in private mode with storage off.
  private loadItem(key: string): string | null {
    try {
      if (typeof localStorage === 'undefined') return null;
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
}
