import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Canonical Agelo logo. Renders an inline SVG so the gradient and
 * floating-dot animation stay sharp at any size and adapt to dark/light
 * mode through CSS variables. The wordmark is optional — pass
 * `[showWordmark]="false"` for compact spots like the brand bar.
 *
 * The SVG ids are scoped (`agelo-grad-<uid>`) so multiple instances on a
 * single page don't collide on shared `<linearGradient>` ids.
 */
@Component({
  selector: 'app-agelo-logo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="agelo" [class.compact]="!showWordmark" [style.gap.px]="gap">
      <svg
        class="mark"
        [attr.width]="size"
        [attr.height]="markHeight"
        viewBox="0 0 58 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            [attr.id]="'agelo-grad-full-' + uid"
            x1="0" y1="0" x2="58" y2="64"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stop-color="#7b5fff" />
            <stop offset="100%" stop-color="#2edab0" />
          </linearGradient>
          <linearGradient
            [attr.id]="'agelo-grad-muted-' + uid"
            x1="0" y1="0" x2="58" y2="64"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stop-color="#7b5fff" stop-opacity="0.38" />
            <stop offset="100%" stop-color="#2edab0" stop-opacity="0.38" />
          </linearGradient>
        </defs>

        <!-- Kanban columns -->
        <rect x="1"  y="30" width="14" height="30" rx="4"
              [attr.fill]="'url(#agelo-grad-muted-' + uid + ')'" />
        <rect x="22" y="20" width="14" height="40" rx="4"
              [attr.fill]="'url(#agelo-grad-full-' + uid + ')'" />
        <rect x="43" y="35" width="14" height="25" rx="4"
              [attr.fill]="'url(#agelo-grad-muted-' + uid + ')'" />

        <!-- Connectors -->
        <line x1="15" y1="18" x2="22" y2="14"
              [attr.stroke]="'url(#agelo-grad-full-' + uid + ')'"
              stroke-width="1.8" stroke-dasharray="3.5 2.5" opacity="0.55" />
        <line x1="36" y1="14" x2="43" y2="20"
              [attr.stroke]="'url(#agelo-grad-full-' + uid + ')'"
              stroke-width="1.8" stroke-dasharray="3.5 2.5" opacity="0.55" />

        <!-- Agent dots -->
        <g class="d1"><circle cx="8"  cy="14" r="7"
              [attr.fill]="'url(#agelo-grad-full-' + uid + ')'" /></g>
        <g class="d2"><circle cx="29" cy="7"  r="7"
              [attr.fill]="'url(#agelo-grad-full-' + uid + ')'" /></g>
        <g class="d3"><circle cx="50" cy="18" r="7"
              [attr.fill]="'url(#agelo-grad-full-' + uid + ')'" /></g>
      </svg>

      @if (showWordmark) {
        <span class="wordmark" [style.font-size.px]="wordmarkSize">
          ag<span class="grad">elo</span>
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
    .mark {
      flex-shrink: 0;
      filter: drop-shadow(0 2px 6px rgba(123, 95, 255, 0.18));
    }
    .wordmark {
      font-family: 'Syne', 'DM Sans', sans-serif;
      font-weight: 800;
      letter-spacing: -1.5px;
      color: var(--c-text);
    }
    .wordmark .grad {
      background: linear-gradient(120deg, #7b5fff, #2edab0);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    /* Subtle floating dots — paused under prefers-reduced-motion. */
    @keyframes agelo-float {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(-2px); }
    }
    .d1 { animation: agelo-float 2.4s ease-in-out infinite 0s; transform-origin: center; }
    .d2 { animation: agelo-float 2.4s ease-in-out infinite 0.3s; transform-origin: center; }
    .d3 { animation: agelo-float 2.4s ease-in-out infinite 0.6s; transform-origin: center; }
    @media (prefers-reduced-motion: reduce) {
      .d1, .d2, .d3 { animation: none !important; }
    }
  `],
})
export class AgeloLogoComponent {
  /** Width of the SVG mark in px. The mark keeps a 58:64 aspect ratio. */
  @Input() size = 28;
  /** When false, only the icon mark is rendered (no `agelo` wordmark). */
  @Input() showWordmark = true;
  /** Gap between mark and wordmark, in px. */
  @Input() gap = 8;

  /** Random per-instance id so SVG `<defs>` don't collide on a page. */
  readonly uid = Math.random().toString(36).slice(2, 9);

  get markHeight(): number {
    return Math.round((this.size * 64) / 58);
  }

  get wordmarkSize(): number {
    return Math.round(this.size * 0.78);
  }
}
