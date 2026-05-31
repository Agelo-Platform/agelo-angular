import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Canonical Agelo logo — the "A · Card" mark.
 *
 * The mark is a stylized "A" with a card cut as negative space inside;
 * the fill is a vertical gradient indigo→cyan (#4F46E5 → #06B6D4) that
 * sits cleanly on both light and dark surfaces with no retint needed.
 * Paired with the "agelo" wordmark in Space Grotesk SemiBold — deep
 * indigo (#312E81) on light backgrounds, light indigo (#C7D2FE) on
 * dark.
 *
 * Use `variant="invert"` on dark surfaces (lifts the wordmark to the
 * light-indigo tint) or `variant="mono"` for ink-on-paper printing
 * (everything collapses to deep indigo, no gradient).
 *
 * The `<linearGradient>` gets a per-instance id so multiple logos on
 * the same page don't collide on the SVG `url(#…)` reference.
 */
@Component({
  selector: 'app-agelo-logo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="agelo"
      [class.compact]="!showWordmark"
      [class.invert]="variant === 'invert'"
      [style.gap.px]="gap"
    >
      <svg
        class="mark"
        [attr.height]="size"
        [attr.width]="size"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        @if (variant !== 'mono') {
          <defs>
            <linearGradient [attr.id]="gradId" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#4F46E5" />
              <stop offset="1" stop-color="#06B6D4" />
            </linearGradient>
          </defs>
        }
        <path
          [attr.fill]="markFill"
          fill-rule="evenodd"
          d="M50 12 L88 88 L69 88 L62 70 L38 70 L31 88 L12 88 Z M43.5 47 h13 a3 3 0 0 1 3 3 v12 a3 3 0 0 1 -3 3 h-13 a3 3 0 0 1 -3 -3 v-12 a3 3 0 0 1 3 -3 z"
        />
      </svg>

      @if (showWordmark) {
        <span class="wm-stack">
          <span class="wordmark" [style.font-size.px]="wordmarkSize">agelo</span>
          @if (showTagline) {
            <span class="tagline" [style.font-size.px]="taglineSize">
              Prompt&nbsp;Driven&nbsp;Development
            </span>
          }
        </span>
      }
    </span>
  `,
  styles: [`
    :host { display: inline-flex; }
    .agelo {
      display: inline-flex;
      align-items: center;
      line-height: 1;
      user-select: none;
    }
    .agelo.compact { gap: 0 !important; }
    .mark { flex-shrink: 0; }
    .wm-stack { display: inline-flex; flex-direction: column; gap: 2px; }
    .wordmark {
      font-family: 'Space Grotesk', var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, sans-serif);
      font-weight: 600;
      letter-spacing: -0.03em;
      /* --logo-word lets dark mode lift the wordmark to light indigo
         (it's deep indigo by default and would lose contrast on a dark
         sidebar). */
      color: var(--logo-word, #312E81);
    }
    .agelo.invert .wordmark { color: #C7D2FE; }
    .tagline {
      font-family: var(--font-mono, ui-monospace, 'SF Mono', SFMono-Regular, Menlo, monospace);
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: var(--c-text-subtle, #64748B);
      font-weight: 500;
      margin-top: 2px;
    }
    .agelo.invert .tagline { color: rgba(255,255,255,0.55); }
  `],
})
export class AgeloLogoComponent {
  /** Height of the SVG mark in px. The mark is square (100×100). */
  @Input() size = 28;
  /** Render the "agelo" wordmark beside the mark. */
  @Input() showWordmark = true;
  /** Tiny "Prompt Driven Development" tagline under the wordmark (login/footer). */
  @Input() showTagline = false;
  /** Gap between mark and wordmark, in px. */
  @Input() gap = 9;
  /** 'color' (default), 'invert' for dark backgrounds, 'mono' for ink-on-paper. */
  @Input() variant: 'color' | 'invert' | 'mono' = 'color';

  /** Per-instance gradient id so multiple logos on a page don't collide. */
  readonly gradId = 'ageloGrad-' + Math.random().toString(36).slice(2, 9);

  /** Deep indigo — the brand's ink color, used for the mono variant. */
  private readonly INK = '#312E81';

  /** Fill for the mark path: gradient url for color/invert, flat ink for mono. */
  get markFill(): string {
    return this.variant === 'mono' ? this.INK : `url(#${this.gradId})`;
  }

  get wordmarkSize(): number {
    return Math.round(this.size * 0.95);
  }

  get taglineSize(): number {
    return Math.max(9, Math.round(this.size * 0.32));
  }
}
