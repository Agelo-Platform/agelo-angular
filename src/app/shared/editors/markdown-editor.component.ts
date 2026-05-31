import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  forwardRef,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { MarkdownModule } from 'ngx-markdown';

interface InsertOp {
  before: string;
  after: string;
  placeholder?: string;
}

/**
 * Markdown editor with toolbar, keyboard shortcuts, and live preview.
 *
 * Shortcuts:
 *   Ctrl/Cmd+B  bold
 *   Ctrl/Cmd+I  italic
 *   Ctrl/Cmd+K  link
 *   Ctrl/Cmd+E  inline code
 *   Ctrl/Cmd+Shift+C  code block
 *   Ctrl/Cmd+Shift+1/2/3  heading
 *   Ctrl/Cmd+Shift+L  unordered list
 *   Ctrl/Cmd+Shift+O  ordered list
 *   Ctrl/Cmd+Shift+Q  blockquote
 *   Ctrl/Cmd+P  toggle preview-only
 */
@Component({
  selector: 'app-markdown-editor',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    NzButtonModule, NzIconModule, NzToolTipModule,
    MarkdownModule,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MarkdownEditorComponent),
      multi: true,
    },
  ],
  template: `
    <div class="md-wrap" [class.compact]="compact">
      <div class="md-toolbar">
        <button nz-button nzType="text" nzSize="small" nz-tooltip="Bold (Ctrl+B)" (click)="apply({ before: '**', after: '**', placeholder: 'bold' })" type="button"><strong>B</strong></button>
        <button nz-button nzType="text" nzSize="small" nz-tooltip="Italic (Ctrl+I)" (click)="apply({ before: '*', after: '*', placeholder: 'italic' })" type="button"><em>I</em></button>
        <button nz-button nzType="text" nzSize="small" nz-tooltip="Heading" (click)="applyLine('### ')" type="button">H</button>
        <button nz-button nzType="text" nzSize="small" nz-tooltip="Link (Ctrl+K)" (click)="apply({ before: '[', after: '](url)', placeholder: 'text' })" type="button"><span nz-icon nzType="link"></span></button>
        <button nz-button nzType="text" nzSize="small" nz-tooltip="Inline code (Ctrl+E)" (click)="apply({ before: '\`', after: '\`', placeholder: 'code' })" type="button">&lt;/&gt;</button>
        <button nz-button nzType="text" nzSize="small" nz-tooltip="Code block (Ctrl+Shift+C)" (click)="codeBlock()" type="button">&#123;&#125;</button>
        <button nz-button nzType="text" nzSize="small" nz-tooltip="Bulleted list" (click)="applyLine('- ')" type="button">•</button>
        <button nz-button nzType="text" nzSize="small" nz-tooltip="Numbered list" (click)="applyLine('1. ')" type="button">1)</button>
        <button nz-button nzType="text" nzSize="small" nz-tooltip="Quote" (click)="applyLine('> ')" type="button">"</button>
        <span class="spacer"></span>
        <button nz-button nzType="text" nzSize="small" [class.active]="!previewOnly() && showPreview" (click)="setSplit()" type="button"><span nz-icon nzType="appstore"></span> Split</button>
        <button nz-button nzType="text" nzSize="small" [class.active]="previewOnly()" (click)="togglePreview()" type="button"><span nz-icon nzType="bulb"></span> Preview</button>
      </div>

      <div class="md-body" [style.height]="height" [class.preview-only]="previewOnly()" [class.split]="!previewOnly() && showPreview">
        @if (!previewOnly()) {
          <textarea
            #ta
            class="md-ta mono"
            [(ngModel)]="value"
            (ngModelChange)="onModelChange($event)"
            (keydown)="onKeyDown($event)"
            [placeholder]="placeholder"
            spellcheck="true"
            autocomplete="off"
          ></textarea>
        }
        @if (previewOnly() || showPreview) {
          <div class="md-preview markdown-body">
            @if (value.trim()) {
              <markdown [data]="value"></markdown>
            } @else {
              <p class="muted small">Nothing to preview yet.</p>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .md-wrap { display: flex; flex-direction: column; border: 1px solid var(--c-border); border-radius: var(--radius); overflow: hidden; background: var(--c-surface-1); }
    .md-toolbar { display: flex; align-items: center; gap: 2px; padding: 4px 6px; background: var(--c-surface-2); border-bottom: 1px solid var(--c-border); flex-wrap: wrap; }
    .md-toolbar button.active { background: var(--c-primary-bg-subtle); color: var(--c-primary); }
    .spacer { flex: 1; }
    .md-body { display: grid; grid-template-columns: 1fr; }
    .md-body.split { grid-template-columns: 1fr 1fr; }
    .md-body.split .md-ta { border-right: 1px solid var(--c-border); }
    .md-ta { width: 100%; height: 100%; padding: 12px; font-size: 13px; line-height: 1.6; border: none; outline: none; resize: none; background: transparent; color: var(--c-text); box-sizing: border-box; }
    .md-preview { padding: 12px 16px; overflow: auto; min-height: 0; }
    .compact .md-toolbar { padding: 2px 4px; }
    .compact .md-toolbar button { padding: 0 6px !important; height: 24px !important; line-height: 24px; min-width: 0 !important; }
  `],
})
export class MarkdownEditorComponent implements ControlValueAccessor {
  @Input() height = '260px';
  @Input() placeholder = 'Write Markdown… **bold**, *italic*, \`code\`, [links](url)';
  @Input() compact = false;
  @Input() showPreview = true;
  @Output() valueChange = new EventEmitter<string>();

  @ViewChild('ta', { static: false }) ta?: ElementRef<HTMLTextAreaElement>;

  value = '';
  previewOnly = signal(false);

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(v: any) { this.value = v == null ? '' : String(v); }
  registerOnChange(fn: any) { this.onChange = fn; }
  registerOnTouched(fn: any) { this.onTouched = fn; }

  onModelChange(v: string) {
    this.value = v;
    this.onChange(v);
    this.valueChange.emit(v);
  }

  setSplit() { this.previewOnly.set(false); this.showPreview = true; }
  togglePreview() { this.previewOnly.update((v) => !v); }

  apply(op: InsertOp) {
    const ta = this.ta?.nativeElement;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = this.value.slice(start, end) || op.placeholder || '';
    const next = this.value.slice(0, start) + op.before + sel + op.after + this.value.slice(end);
    this.value = next;
    this.onChange(next);
    this.valueChange.emit(next);
    queueMicrotask(() => {
      ta.focus();
      const cursor = start + op.before.length + sel.length;
      ta.selectionStart = ta.selectionEnd = cursor;
    });
  }

  applyLine(prefix: string) {
    const ta = this.ta?.nativeElement;
    if (!ta) return;
    const start = ta.selectionStart;
    const lineStart = this.value.lastIndexOf('\n', start - 1) + 1;
    const next = this.value.slice(0, lineStart) + prefix + this.value.slice(lineStart);
    this.value = next;
    this.onChange(next);
    this.valueChange.emit(next);
    queueMicrotask(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + prefix.length;
    });
  }

  codeBlock() {
    this.apply({ before: '\n```\n', after: '\n```\n', placeholder: 'code' });
  }

  onKeyDown(ev: KeyboardEvent) {
    const mod = ev.ctrlKey || ev.metaKey;
    if (!mod) return;

    if (ev.shiftKey) {
      switch (ev.key.toLowerCase()) {
        case 'c': ev.preventDefault(); this.codeBlock(); return;
        case 'l': ev.preventDefault(); this.applyLine('- '); return;
        case 'o': ev.preventDefault(); this.applyLine('1. '); return;
        case 'q': ev.preventDefault(); this.applyLine('> '); return;
        case '!':
        case '1': ev.preventDefault(); this.applyLine('# '); return;
        case '@':
        case '2': ev.preventDefault(); this.applyLine('## '); return;
        case '#':
        case '3': ev.preventDefault(); this.applyLine('### '); return;
      }
      return;
    }

    switch (ev.key.toLowerCase()) {
      case 'b': ev.preventDefault(); this.apply({ before: '**', after: '**', placeholder: 'bold' }); return;
      case 'i': ev.preventDefault(); this.apply({ before: '*', after: '*', placeholder: 'italic' }); return;
      case 'k': ev.preventDefault(); this.apply({ before: '[', after: '](url)', placeholder: 'text' }); return;
      case 'e': ev.preventDefault(); this.apply({ before: '`', after: '`', placeholder: 'code' }); return;
      case 'p': ev.preventDefault(); this.togglePreview(); return;
    }
  }
}
