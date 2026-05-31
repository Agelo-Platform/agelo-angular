import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  forwardRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import json from 'highlight.js/lib/languages/json';
import yaml from 'highlight.js/lib/languages/yaml';
import bash from 'highlight.js/lib/languages/bash';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import markdown from 'highlight.js/lib/languages/markdown';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('markdown', markdown);

/**
 * Lightweight code editor: a textarea overlaying a syntax-highlighted
 * <pre><code>. The textarea is transparent so the highlighted code shows
 * through. Tab key inserts spaces, and a Format button pretty-prints JSON.
 */
@Component({
  selector: 'app-code-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzIconModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CodeEditorComponent),
      multi: true,
    },
  ],
  template: `
    <div class="ed-wrap" [class.readonly]="readonly">
      <div class="ed-head">
        <span class="lang-tag mono">{{ language }}</span>
        <span class="spacer"></span>
        @if (language === 'json' && !readonly) {
          <button nz-button nzType="text" nzSize="small" (click)="formatJson()" type="button">
            <span nz-icon nzType="thunderbolt"></span> Format
          </button>
        }
        @if (!readonly) {
          <button nz-button nzType="text" nzSize="small" (click)="copy()" type="button">
            <span nz-icon nzType="copy"></span> Copy
          </button>
        }
      </div>
      <div class="ed-body" [style.height]="height">
        <pre class="ed-pre"><code #codeEl class="hljs"></code></pre>
        <textarea
          #ta
          class="ed-ta mono"
          [class.readonly]="readonly"
          [readOnly]="readonly"
          [(ngModel)]="value"
          (ngModelChange)="onModelChange($event)"
          (keydown)="onKeyDown($event)"
          (scroll)="syncScroll()"
          spellcheck="false"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
        ></textarea>
      </div>
      @if (jsonError) {
        <div class="json-err mono small">JSON error: {{ jsonError }}</div>
      }
    </div>
  `,
  styles: [`
    .ed-wrap { display: flex; flex-direction: column; border: 1px solid var(--c-border); border-radius: var(--radius); overflow: hidden; background: var(--c-surface-2); }
    .ed-head { display: flex; align-items: center; gap: 4px; padding: 4px 8px; background: var(--c-surface-2); border-bottom: 1px solid var(--c-border); }
    .lang-tag { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--c-text-subtle); padding: 2px 6px; background: var(--c-surface-1); border-radius: 3px; }
    .spacer { flex: 1; }
    .ed-body { position: relative; background: #0d1117; }
    .ed-pre { margin: 0; padding: 12px; font-size: 13px; line-height: 1.55; overflow: auto; height: 100%; box-sizing: border-box; pointer-events: none; white-space: pre; word-wrap: normal; }
    .ed-pre code { background: transparent !important; color: #e6e9f3; font-family: var(--font-mono, ui-monospace, SFMono-Regular, Consolas, monospace); }
    .ed-ta { position: absolute; inset: 0; padding: 12px; font-size: 13px; line-height: 1.55; background: transparent; color: transparent; caret-color: #e6e9f3; border: none; outline: none; resize: none; white-space: pre; overflow: auto; box-sizing: border-box; tab-size: 2; }
    .ed-ta::selection { background: rgba(99, 130, 191, .35); color: transparent; }
    .ed-ta.readonly { caret-color: transparent; }
    .json-err { padding: 6px 10px; color: #ff7875; background: #2a1216; border-top: 1px solid #58181c; }
  `],
})
export class CodeEditorComponent implements OnChanges, ControlValueAccessor {
  @Input() language: 'json' | 'typescript' | 'javascript' | 'yaml' | 'bash' | 'html' | 'css' | 'markdown' | string = 'json';
  @Input() readonly = false;
  @Input() height = '320px';
  @Output() valueChange = new EventEmitter<string>();

  @ViewChild('codeEl', { static: true }) codeEl!: ElementRef<HTMLElement>;
  @ViewChild('ta', { static: true }) ta!: ElementRef<HTMLTextAreaElement>;

  value = '';
  jsonError = '';

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  ngOnChanges(_: SimpleChanges) {
    queueMicrotask(() => this.highlight());
  }

  writeValue(v: any) {
    this.value = v == null ? '' : String(v);
    queueMicrotask(() => {
      this.highlight();
      this.validateJson();
    });
  }
  registerOnChange(fn: any) { this.onChange = fn; }
  registerOnTouched(fn: any) { this.onTouched = fn; }
  setDisabledState(b: boolean) { this.readonly = b; }

  onModelChange(v: string) {
    this.value = v;
    this.onChange(v);
    this.valueChange.emit(v);
    this.highlight();
    this.validateJson();
  }

  onKeyDown(ev: KeyboardEvent) {
    if (ev.key === 'Tab') {
      ev.preventDefault();
      const ta = this.ta.nativeElement;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const v = this.value;
      this.value = v.slice(0, start) + '  ' + v.slice(end);
      this.onChange(this.value);
      this.valueChange.emit(this.value);
      queueMicrotask(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
        this.highlight();
        this.validateJson();
      });
    }
  }

  syncScroll() {
    const ta = this.ta.nativeElement;
    const pre = ta.parentElement?.querySelector('pre') as HTMLElement | null;
    if (pre) {
      pre.scrollTop = ta.scrollTop;
      pre.scrollLeft = ta.scrollLeft;
    }
  }

  formatJson() {
    try {
      const obj = JSON.parse(this.value || '{}');
      this.value = JSON.stringify(obj, null, 2);
      this.onChange(this.value);
      this.valueChange.emit(this.value);
      this.highlight();
      this.validateJson();
    } catch (e: any) {
      this.jsonError = e?.message ?? 'invalid';
    }
  }

  async copy() {
    try {
      await navigator.clipboard.writeText(this.value);
    } catch {/* ignore */}
  }

  private highlight() {
    if (!this.codeEl) return;
    const code = this.codeEl.nativeElement;
    const lang = hljs.getLanguage(this.language) ? this.language : 'plaintext';
    let html: string;
    try {
      html = lang === 'plaintext'
        ? this.escape(this.value)
        : hljs.highlight(this.value, { language: lang, ignoreIllegals: true }).value;
    } catch {
      html = this.escape(this.value);
    }
    // Trailing newline keeps cursor visible at bottom.
    code.innerHTML = html + '\n';
  }

  private validateJson() {
    if (this.language !== 'json') { this.jsonError = ''; return; }
    if (!this.value.trim()) { this.jsonError = ''; return; }
    try { JSON.parse(this.value); this.jsonError = ''; }
    catch (e: any) { this.jsonError = e?.message ?? 'invalid'; }
  }

  private escape(s: string) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
