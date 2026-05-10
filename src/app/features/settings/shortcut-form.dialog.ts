import { Component, Inject, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NZ_MODAL_DATA, NzModalRef } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzButtonModule } from 'ng-zorro-antd/button';

export interface ShortcutFormData {
  /** When provided, the form pre-populates for an edit. */
  shortcut?: {
    id: string;
    key: string;
    action: string;
    target: string;
    label?: string | null;
  };
}

export interface ShortcutFormResult {
  key: string;
  action: string;
  target: string;
  label?: string;
}

const PORTAL_TARGETS: Array<{ label: string; target: string }> = [
  { label: 'Home',                 target: '/home' },
  { label: 'Organizations',        target: '/organizations' },
  { label: 'Projects',             target: '/projects' },
  { label: 'Board',                target: '/org/{orgId}/board' },
  { label: 'Board flow',           target: '/org/{orgId}/board-flow' },
  { label: 'Teams',                target: '/org/{orgId}/teams' },
  { label: 'Prompt library',       target: '/prompts' },
  { label: 'Roles & permissions',  target: '/permissions' },
  { label: 'MCP servers',          target: '/mcp-servers' },
  { label: 'Archived',             target: '/archive' },
  { label: 'Settings → Profile',   target: '/settings/profile' },
  { label: 'Settings → Appearance',target: '/settings/appearance' },
  { label: 'Settings → Security',  target: '/settings/security' },
  { label: 'Settings → API keys',  target: '/settings/api-keys' },
  { label: 'Settings → Shortcuts', target: '/settings/shortcuts' },
];

const CUSTOM_OPTION = '__custom__';

/** How long to wait between chord steps before auto-stopping. */
const CHORD_STEP_TIMEOUT_MS = 1500;

/** Build a normalized combo string for a KeyboardEvent.
 * Mirrors the format consumed by `core/shortcut-listener.service.ts` so the
 * captured value matches what the global listener parses. */
function eventCombo(ev: KeyboardEvent): string {
  const k = (ev.key || '').toLowerCase();
  // Skip when only a modifier was pressed.
  if (k === 'control' || k === 'alt' || k === 'shift' || k === 'meta' || k === 'os' || k === '') {
    return '';
  }
  let key = k;
  if (key === ' ') key = 'space';
  if (key === 'escape') key = 'esc';
  // Modifiers in canonical order: ctrl, alt, shift, meta.
  const parts: string[] = [];
  if (ev.ctrlKey) parts.push('ctrl');
  if (ev.altKey) parts.push('alt');
  if (ev.shiftKey) parts.push('shift');
  if (ev.metaKey) parts.push('meta');
  parts.push(key);
  return parts.join('+');
}

@Component({
  selector: 'app-shortcut-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    NzFormModule, NzInputModule, NzSelectModule, NzButtonModule,
  ],
  template: `
    <form class="form" nz-form nzLayout="vertical" (submit)="submit($event)">
      <nz-form-item>
        <nz-form-label>Key combo</nz-form-label>
        <nz-form-control [nzExtra]="keyHelp">
          <div class="key-row">
            <input
              nz-input
              readonly
              [value]="recording() ? 'Press your shortcut…' : (key || 'Click record then press a key')"
              (focus)="startRecording()"
              (blur)="stopRecording()"
              (click)="startRecording()"
              placeholder="Click record then press a key"
              name="key"
              autocomplete="off"
            />
            <button
              nz-button
              nzType="default"
              type="button"
              (click)="recording() ? stopRecording() : startRecording()"
            >
              {{ recording() ? 'Stop' : 'Record' }}
            </button>
          </div>
          <ng-template #keyHelp>
            <span class="muted small">
              Click <strong>Record</strong> and press your shortcut. For chord
              shortcuts, press the second combo within
              {{ chordTimeoutMs / 1000 }}s (e.g. <code>ctrl+b</code> then
              <code>o</code>). Press <code>Esc</code> to cancel.
            </span>
          </ng-template>
        </nz-form-control>
      </nz-form-item>

      <nz-form-item>
        <nz-form-label>Action</nz-form-label>
        <nz-form-control>
          <nz-select [(ngModel)]="action" name="action">
            <nz-option nzValue="navigate" nzLabel="Navigate to a page"></nz-option>
          </nz-select>
        </nz-form-control>
      </nz-form-item>

      <nz-form-item>
        <nz-form-label>Target page</nz-form-label>
        <nz-form-control>
          <nz-select
            [(ngModel)]="targetSelect"
            name="targetSelect"
            (ngModelChange)="onSelectTarget($event)"
            nzPlaceHolder="Select a page…"
          >
            @for (t of targets; track t.target) {
              <nz-option [nzValue]="t.target" [nzLabel]="t.label"></nz-option>
            }
            <nz-option [nzValue]="customOption" nzLabel="Custom path…"></nz-option>
          </nz-select>
        </nz-form-control>
      </nz-form-item>

      @if (targetSelect === customOption) {
        <nz-form-item>
          <nz-form-label>Custom path</nz-form-label>
          <nz-form-control>
            <input
              nz-input
              [(ngModel)]="customTarget"
              name="customTarget"
              placeholder="/my/custom/path"
            />
          </nz-form-control>
        </nz-form-item>
      }

      <nz-form-item>
        <nz-form-label nzNoColon>Label (optional)</nz-form-label>
        <nz-form-control>
          <input
            nz-input
            [(ngModel)]="label"
            name="label"
            placeholder="e.g. Open board"
          />
        </nz-form-control>
      </nz-form-item>
    </form>
  `,
  styles: [`
    .muted { color: var(--c-text-subtle); }
    .small { font-size: 12px; }
    .form { padding-top: 4px; }
    .key-row { display: flex; gap: 8px; align-items: stretch; }
    .key-row input { flex: 1; }
  `],
})
export class ShortcutFormComponent implements OnInit, OnDestroy {
  targets = PORTAL_TARGETS;
  customOption = CUSTOM_OPTION;
  chordTimeoutMs = CHORD_STEP_TIMEOUT_MS;

  key = '';
  action = 'navigate';
  targetSelect: string = '';
  customTarget = '';
  label = '';

  recording = signal(false);
  /** Snapshot of `key` taken when recording starts so Esc can restore it. */
  private keyBeforeRecord = '';
  /** First combo captured during a chord recording. */
  private firstCombo = '';
  private chordTimer: any = null;

  constructor(
    private ref: NzModalRef,
    @Inject(NZ_MODAL_DATA) private data: ShortcutFormData,
  ) {}

  ngOnInit(): void {
    const s = this.data?.shortcut;
    if (!s) return;
    this.key = s.key;
    this.action = s.action || 'navigate';
    this.label = s.label ?? '';
    const known = PORTAL_TARGETS.find((t) => t.target === s.target);
    if (known) {
      this.targetSelect = known.target;
    } else {
      this.targetSelect = CUSTOM_OPTION;
      this.customTarget = s.target;
    }
  }

  ngOnDestroy(): void {
    this.detachListener();
  }

  startRecording() {
    if (this.recording()) {
      // Clicking the input again restarts recording from scratch.
      this.detachListener();
      this.firstCombo = '';
    } else {
      this.keyBeforeRecord = this.key;
    }
    this.firstCombo = '';
    this.recording.set(true);
    document.addEventListener('keydown', this.onKeyDown, true);
  }

  stopRecording() {
    if (!this.recording()) return;
    this.recording.set(false);
    this.detachListener();
  }

  private detachListener() {
    document.removeEventListener('keydown', this.onKeyDown, true);
    if (this.chordTimer) {
      clearTimeout(this.chordTimer);
      this.chordTimer = null;
    }
  }

  private onKeyDown = (ev: KeyboardEvent) => {
    // Always block default browser handling while recording so combos like
    // ctrl+s don't trigger the page Save dialog.
    ev.preventDefault();
    ev.stopPropagation();

    // Cancel + restore previous value on Escape.
    if ((ev.key || '').toLowerCase() === 'escape' && !this.firstCombo) {
      this.key = this.keyBeforeRecord;
      this.stopRecording();
      return;
    }

    const combo = eventCombo(ev);
    if (!combo) return; // modifier-only — keep waiting

    if (!this.firstCombo) {
      // Record the first combo and wait briefly for an optional chord step.
      this.firstCombo = combo;
      this.key = combo;
      this.chordTimer = setTimeout(() => {
        this.stopRecording();
      }, CHORD_STEP_TIMEOUT_MS);
      return;
    }

    // Second step of a chord — combine and finish.
    this.key = `${this.firstCombo} ${combo}`;
    this.stopRecording();
  };

  onSelectTarget(value: string) {
    if (value !== CUSTOM_OPTION) this.customTarget = '';
  }

  resolvedTarget(): string {
    return this.targetSelect === CUSTOM_OPTION
      ? this.customTarget.trim()
      : (this.targetSelect || '').trim();
  }

  canSubmit(): boolean {
    return !!this.key.trim() && !!this.action.trim() && !!this.resolvedTarget();
  }

  submit(ev?: Event) {
    if (ev) ev.preventDefault();
    if (!this.canSubmit()) return;
    const out: ShortcutFormResult = {
      key: this.key.trim().toLowerCase(),
      action: this.action,
      target: this.resolvedTarget(),
      label: this.label.trim() || undefined,
    };
    this.ref.close(out);
  }
}
