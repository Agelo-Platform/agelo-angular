import { Injectable, NgZone, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { safeLocalGet } from './storage.util';

export interface Shortcut {
  id: string;
  key: string;
  action: string;
  target: string;
  label?: string | null;
  createdAt: string;
}

/** Convert a key combo string like "ctrl+shift+b" into a normalized form. */
function normalizeCombo(combo: string): string {
  const tokens = combo.toLowerCase().split('+').map((t) => t.trim()).filter(Boolean);
  // Aliases: meta is treated like cmd. Move modifiers to a stable order.
  const modOrder = ['ctrl', 'alt', 'shift', 'meta', 'cmd'];
  const mods = tokens.filter((t) => modOrder.includes(t)).map((t) => t === 'cmd' ? 'meta' : t);
  const keys = tokens.filter((t) => !modOrder.includes(t));
  const sortedMods = modOrder.filter((m) => mods.includes(m === 'cmd' ? 'meta' : m));
  return [...sortedMods, ...keys].join('+');
}

/** Parse a shortcut.key string into its chord steps. */
function parseChord(raw: string): string[] {
  return raw.split(/\s+/).map((s) => s.trim()).filter(Boolean).map(normalizeCombo);
}

/** Build the normalized combo string for a KeyboardEvent. */
function eventCombo(ev: KeyboardEvent): string {
  const parts: string[] = [];
  if (ev.ctrlKey) parts.push('ctrl');
  if (ev.altKey) parts.push('alt');
  if (ev.shiftKey) parts.push('shift');
  if (ev.metaKey) parts.push('meta');
  // Use ev.key lowercased; fall back to '' for modifier-only events.
  const k = (ev.key || '').toLowerCase();
  // Skip when only a modifier was pressed.
  if (k === 'control' || k === 'alt' || k === 'shift' || k === 'meta' || k === 'os') {
    return '';
  }
  // Normalize a few keys to stable names
  let key = k;
  if (key === ' ') key = 'space';
  if (key === 'escape') key = 'esc';
  parts.push(key);
  return normalizeCombo(parts.join('+'));
}

/** Check whether the event happens inside an editable element. */
function isEditable(target: EventTarget | null): boolean {
  if (!target || !(target instanceof Element)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if ((target as HTMLElement).isContentEditable) return true;
  return false;
}

const CHORD_TIMEOUT_MS = 1000;

@Injectable({ providedIn: 'root' })
export class ShortcutListenerService {
  private api = inject(ApiService);
  private router = inject(Router);
  private auth = inject(AuthService);
  private zone = inject(NgZone);

  /** Reactive list of shortcuts; pages call `refresh()` after edits. */
  readonly shortcuts = signal<Shortcut[]>([]);

  /** Derived map combo-string → list of matching shortcuts. */
  private byFirstStep = computed(() => {
    const out = new Map<string, Shortcut[]>();
    for (const s of this.shortcuts()) {
      const chord = parseChord(s.key);
      if (!chord.length) continue;
      const arr = out.get(chord[0]) ?? [];
      arr.push(s);
      out.set(chord[0], arr);
    }
    return out;
  });

  /** Pending chord state — maps a Shortcut to its remaining steps. */
  private pending: Array<{ shortcut: Shortcut; remaining: string[] }> = [];
  private pendingTimer: any = null;
  private listenerInstalled = false;

  constructor() {
    // Auto-load shortcuts when the user is authenticated; clear on logout.
    // We synchronously write `this.shortcuts` on logout, so we have to
    // opt this effect into Angular's signal-write-from-effect path
    // (otherwise NG0600 fires the moment the SPA boots unauthenticated
    // and this effect runs its first cycle).
    effect(() => {
      const authed = this.auth.isAuthed();
      if (authed) {
        this.refresh().catch(() => { /* swallow */ });
        this.installListener();
      } else {
        this.shortcuts.set([]);
      }
    }, { allowSignalWrites: true });
  }

  async refresh() {
    if (!this.auth.isAuthed()) return;
    try {
      const list = await firstValueFrom(
        this.api.get<Shortcut[]>('/settings/shortcuts'),
      );
      this.shortcuts.set(list);
    } catch {
      // ignore — endpoint may be temporarily unavailable
    }
  }

  /** Resolve `/org/{orgId}/...` placeholders against the active org. */
  resolveTarget(target: string): string | null {
    if (!target.includes('{orgId}')) return target;
    const orgId = safeLocalGet('agelo.activeOrgId');
    if (!orgId) return null;
    return target.replace(/\{orgId\}/g, orgId);
  }

  private installListener() {
    if (this.listenerInstalled) return;
    this.listenerInstalled = true;
    // Run outside Angular zone to avoid unnecessary CD on every keypress.
    this.zone.runOutsideAngular(() => {
      document.addEventListener('keydown', this.onKeyDown);
    });
  }

  private onKeyDown = (ev: KeyboardEvent) => {
    if (isEditable(ev.target)) {
      this.resetPending();
      return;
    }
    const combo = eventCombo(ev);
    if (!combo) return;

    // First check if there are pending chord candidates expecting `combo`.
    if (this.pending.length) {
      const advanced = this.pending
        .filter((p) => p.remaining[0] === combo)
        .map((p) => ({ shortcut: p.shortcut, remaining: p.remaining.slice(1) }));
      if (advanced.length) {
        ev.preventDefault();
        const completed = advanced.find((p) => p.remaining.length === 0);
        if (completed) {
          this.resetPending();
          this.fire(completed.shortcut);
          return;
        }
        this.pending = advanced;
        this.armTimer();
        return;
      }
      // Pending exists but this key doesn't match — fall through to first-step
      // lookup so a fresh chord can start.
      this.resetPending();
    }

    const candidates = this.byFirstStep().get(combo);
    if (!candidates || !candidates.length) return;

    // Single-step shortcuts fire immediately.
    const single = candidates.filter((s) => parseChord(s.key).length === 1);
    if (single.length) {
      ev.preventDefault();
      this.fire(single[0]);
      return;
    }

    // Multi-step: arm pending chord state for all multi-step matches.
    ev.preventDefault();
    this.pending = candidates
      .map((s) => ({ shortcut: s, remaining: parseChord(s.key).slice(1) }))
      .filter((p) => p.remaining.length > 0);
    this.armTimer();
  };

  private armTimer() {
    if (this.pendingTimer) clearTimeout(this.pendingTimer);
    this.pendingTimer = setTimeout(() => this.resetPending(), CHORD_TIMEOUT_MS);
  }

  private resetPending() {
    this.pending = [];
    if (this.pendingTimer) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }
  }

  private fire(s: Shortcut) {
    if (s.action !== 'navigate') return;
    const url = this.resolveTarget(s.target);
    if (!url) return;
    // Re-enter the Angular zone so router navigation triggers CD.
    this.zone.run(() => {
      this.router.navigateByUrl(url).catch(() => { /* ignore */ });
    });
  }
}
