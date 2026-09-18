/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {css} from '@/shared/dom/css';

/**
 * Дизайн-токены проводника — CSS custom properties на хост-элементе `<fm-explorer>`.
 *
 * Компоненты живут в Shadow DOM и не видят стилей страницы (Bootstrap не переопределяется —
 * конвенция проекта), но custom properties наследуются сквозь shadow-границу, поэтому хост
 * может перекрасить проводник, задав переменные на `fm-explorer` или любом предке.
 * Тёмная тема: `prefers-color-scheme: dark` либо атрибут `data-theme="dark"` на хосте.
 */
export const tokens = css`
  :host {
    --fm-font: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    --fm-font-size: 13px;
    --fm-line: 1.4;
    --fm-radius: 4px;
    --fm-radius-lg: 8px;

    --fm-bg: #ffffff;
    --fm-bg-alt: #f5f6f8;
    --fm-bg-hover: #eef2f7;
    --fm-bg-selected: #cce4f7;
    --fm-bg-selected-inactive: #e5e5e5;
    --fm-bg-drop: #d5ebff;
    --fm-fg: #1f2328;
    --fm-fg-muted: #6b7280;
    --fm-fg-disabled: #a0a6ad;
    --fm-border: #d9dde3;
    --fm-border-strong: #b8bec7;
    --fm-accent: #0067c0;
    --fm-accent-fg: #ffffff;
    --fm-danger: #c42b1c;
    --fm-warning: #9d5d00;
    --fm-success: #0f7b0f;
    --fm-focus: #0067c0;
    --fm-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
    --fm-overlay: rgba(0, 0, 0, 0.35);
    --fm-rubber: rgba(0, 103, 192, 0.15);
    --fm-rubber-border: rgba(0, 103, 192, 0.7);
    --fm-folder: #ffc83d;
    --fm-folder-dark: #e0a800;
    --fm-file: #9aa3ad;
    --fm-file-fg: #ffffff;

    --fm-row-height: 28px;
    --fm-control-height: 28px;
    --fm-toolbar-height: 40px;
    --fm-status-height: 26px;
    --fm-icon-size: 16px;

    color: var(--fm-fg);
    font: var(--fm-font-size) / var(--fm-line) var(--fm-font);
    color-scheme: light;
  }

  :host([data-theme="dark"]) {
    color-scheme: dark;
    --fm-bg: #202020;
    --fm-bg-alt: #2b2b2b;
    --fm-bg-hover: #333333;
    --fm-bg-selected: #0f4b7f;
    --fm-bg-selected-inactive: #3a3a3a;
    --fm-bg-drop: #163e5f;
    --fm-fg: #f0f0f0;
    --fm-fg-muted: #a8a8a8;
    --fm-fg-disabled: #6b6b6b;
    --fm-border: #3d3d3d;
    --fm-border-strong: #5a5a5a;
    --fm-accent: #4cc2ff;
    --fm-accent-fg: #000000;
    --fm-focus: #4cc2ff;
    --fm-overlay: rgba(0, 0, 0, 0.55);
    --fm-rubber: rgba(76, 194, 255, 0.15);
    --fm-rubber-border: rgba(76, 194, 255, 0.7);
    --fm-file: #6f7781;
  }

  /* Палец вместо мыши: крупнее строки, кнопки и иконки (WCAG-цель ≥ 40px). */
  @media (pointer: coarse) {
    :host {
      --fm-row-height: 40px;
      --fm-control-height: 36px;
      --fm-toolbar-height: 48px;
      --fm-status-height: 30px;
      --fm-icon-size: 20px;
      --fm-font-size: 14px;
    }
  }

  @media (prefers-color-scheme: dark) {
    :host(:not([data-theme="light"])) {
      color-scheme: dark;
      --fm-bg: #202020;
      --fm-bg-alt: #2b2b2b;
      --fm-bg-hover: #333333;
      --fm-bg-selected: #0f4b7f;
      --fm-bg-selected-inactive: #3a3a3a;
      --fm-bg-drop: #163e5f;
      --fm-fg: #f0f0f0;
      --fm-fg-muted: #a8a8a8;
      --fm-fg-disabled: #6b6b6b;
      --fm-border: #3d3d3d;
      --fm-border-strong: #5a5a5a;
      --fm-accent: #4cc2ff;
      --fm-accent-fg: #000000;
      --fm-focus: #4cc2ff;
      --fm-overlay: rgba(0, 0, 0, 0.55);
      --fm-rubber: rgba(76, 194, 255, 0.15);
      --fm-rubber-border: rgba(76, 194, 255, 0.7);
      --fm-file: #6f7781;
    }
  }
`;

/** Базовые правила для каждого shadow root: сброс, шрифт, фокус, кнопки, поля. */
export const base = css`
  *, *::before, *::after { box-sizing: border-box; }
  :host { display: block; }
  /* Стили :host компонентов перекрыли бы UA-правило [hidden] — закрепляем явно. */
  :host([hidden]) { display: none !important; }
  [hidden] { display: none !important; }

  button, input, select, textarea { font: inherit; color: inherit; }

  .fm-btn {
    display: inline-flex; align-items: center; gap: 6px;
    height: var(--fm-control-height, 28px); min-width: var(--fm-control-height, 28px); padding: 0 8px; touch-action: manipulation;
    border: 1px solid transparent; border-radius: var(--fm-radius);
    background: transparent; color: var(--fm-fg); cursor: pointer;
    white-space: nowrap; user-select: none;
  }
  .fm-btn:hover:not(:disabled) { background: var(--fm-bg-hover); }
  .fm-btn:active:not(:disabled) { background: var(--fm-bg-selected); }
  .fm-btn[aria-pressed="true"], .fm-btn.is-active { background: var(--fm-bg-selected); }
  .fm-btn:disabled { color: var(--fm-fg-disabled); cursor: default; }
  .fm-btn:focus-visible { outline: 2px solid var(--fm-focus); outline-offset: -2px; }
  .fm-btn--primary { background: var(--fm-accent); color: var(--fm-accent-fg); border-color: var(--fm-accent); }
  .fm-btn--primary:hover:not(:disabled) { filter: brightness(1.08); background: var(--fm-accent); }
  .fm-btn--danger { background: var(--fm-danger); color: #fff; border-color: var(--fm-danger); }
  .fm-btn--danger:hover:not(:disabled) { filter: brightness(1.08); background: var(--fm-danger); }
  .fm-btn--outline { border-color: var(--fm-border-strong); }
  .fm-btn--icon { padding: 0; width: var(--fm-control-height, 28px); justify-content: center; }
  .fm-btn svg { width: var(--fm-icon-size); height: var(--fm-icon-size); flex: none; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }

  .fm-input {
    height: var(--fm-control-height, 28px); padding: 0 8px; border: 1px solid var(--fm-border-strong); border-radius: var(--fm-radius);
    background: var(--fm-bg); color: var(--fm-fg); width: 100%;
  }
  .fm-input:focus { outline: 2px solid var(--fm-focus); outline-offset: -1px; border-color: var(--fm-focus); }
  .fm-input.is-invalid { border-color: var(--fm-danger); }

  .fm-icon { width: var(--fm-icon-size); height: var(--fm-icon-size); flex: none; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
  .fm-muted { color: var(--fm-fg-muted); }
  .fm-danger { color: var(--fm-danger); }
  .fm-truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .fm-spinner {
    width: 16px; height: 16px; border: 2px solid var(--fm-border); border-top-color: var(--fm-accent);
    border-radius: 50%; animation: fm-spin 0.8s linear infinite; flex: none;
  }
  @keyframes fm-spin { to { transform: rotate(360deg); } }
`;
