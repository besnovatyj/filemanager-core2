/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {css, adoptStyles} from '@/shared/dom/css';
import {h} from '@/shared/dom/html';
import {listen, DisposableStore} from '@/shared/lib/Disposable';
import {t} from '@/shared/i18n/i18n';
import {icon} from '@/ui/icons';
import {base, tokens} from '@/ui/theme/tokens';

const styles = css`
  :host {
    position: fixed; inset: 0; z-index: 2147482000; display: flex; align-items: center; justify-content: center;
    background: var(--fm-overlay); font: var(--fm-font-size) / var(--fm-line) var(--fm-font); color: var(--fm-fg);
  }
  .box {
    width: min(440px, calc(100vw - 32px)); max-height: calc(100vh - 32px); display: flex; flex-direction: column;
    background: var(--fm-bg); border: 1px solid var(--fm-border); border-radius: var(--fm-radius-lg); box-shadow: var(--fm-shadow);
  }
  .box.is-wide { width: min(640px, calc(100vw - 32px)); }
  header { display: flex; align-items: center; gap: 8px; padding: 12px 16px 0; font-weight: 600; font-size: 1.05em; }
  header .close { margin-left: auto; }
  .body { padding: 12px 16px; overflow: auto; }
  footer { display: flex; justify-content: flex-end; gap: 8px; padding: 0 16px 12px; }
  .icon-danger { color: var(--fm-danger); }
  .icon-warning { color: var(--fm-warning); }
`;

export interface DialogButton {
  label: string;
  variant?: 'primary' | 'danger' | 'outline' | 'ghost';
  /** Возвращает false, чтобы оставить диалог открытым (валидация). */
  onClick: () => boolean | void | Promise<boolean | void>;
  /** Срабатывает по Enter. */
  isDefault?: boolean;
}

export interface DialogOptions {
  title: string;
  icon?: 'danger' | 'warning' | 'info' | null;
  body: HTMLElement;
  buttons: DialogButton[];
  wide?: boolean;
  /** Что сделать при закрытии крестиком/Escape. */
  onCancel: () => void;
  /** Элемент, получающий фокус при открытии. */
  initialFocus?: HTMLElement;
}

/**
 * Модальный диалог: оверлей, заголовок, произвольное тело, кнопки; фокус-ловушка (Tab не выходит
 * наружу), Escape = отмена, Enter = кнопка по умолчанию. Один диалог за раз рендерит DialogHost.
 */
export class FmDialog extends HTMLElement {
  private readonly disposables = new DisposableStore();
  private options: DialogOptions | null = null;

  connectedCallback(): void {
    if (!this.shadowRoot) {
      const root = this.attachShadow({mode: 'open'});
      adoptStyles(root, tokens, base, styles);
    }
  }

  show(options: DialogOptions): void {
    this.options = options;
    const root = this.shadowRoot as ShadowRoot;
    const defaultButton = options.buttons.find((b) => b.isDefault);

    const buttons = options.buttons.map((b) => {
      const el = h('button', {class: `fm-btn fm-btn--${b.variant ?? 'outline'}`, type: 'button', text: b.label});
      el.addEventListener('click', () => void this.press(b));
      return el;
    });

    const iconEl = options.icon === 'danger' ? icon('error', 'fm-icon icon-danger')
      : options.icon === 'warning' ? icon('warning', 'fm-icon icon-warning')
        : options.icon === 'info' ? icon('info') : null;

    const box = h('div', {class: `box${options.wide ? ' is-wide' : ''}`, role: 'dialog', attrs: {'aria-modal': 'true', 'aria-label': options.title}},
      h('header', {}, iconEl, h('span', {text: options.title}),
        h('button', {class: 'fm-btn fm-btn--icon close', type: 'button', title: t('dialog.close'), on: {click: () => this.cancel()}}, icon('close'))),
      h('div', {class: 'body'}, options.body),
      h('footer', {}, ...buttons),
    );
    root.replaceChildren(box);

    this.disposables.add(listen(this, 'keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.cancel();
      } else if (e.key === 'Enter' && defaultButton && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        e.stopPropagation();
        void this.press(defaultButton);
      } else if (e.key === 'Tab') {
        this.trapFocus(e);
      }
    }));
    // Клик по оверлею — отмена (как Escape).
    this.disposables.add(listen(this, 'pointerdown', (e) => {
      if (e.composedPath()[0] === this) this.cancel(); // см. FmWindow: target ретаргетируется
    }));

    requestAnimationFrame(() => {
      const target = options.initialFocus ?? this.focusable()[0];
      target?.focus();
      if (target instanceof HTMLInputElement) target.select();
    });
  }

  private async press(button: DialogButton): Promise<void> {
    const keep = await button.onClick();
    if (keep !== false) this.dispose();
  }

  private cancel(): void {
    const cb = this.options?.onCancel;
    this.dispose();
    cb?.();
  }

  private dispose(): void {
    this.disposables.dispose();
    this.options = null;
    this.remove();
  }

  private focusable(): HTMLElement[] {
    const root = this.shadowRoot as ShadowRoot;
    return [...root.querySelectorAll<HTMLElement>('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter((el) => !el.hasAttribute('disabled') && !el.hidden);
  }

  private trapFocus(e: KeyboardEvent): void {
    const items = this.focusable();
    if (items.length === 0) return;
    const first = items[0] as HTMLElement;
    const last = items[items.length - 1] as HTMLElement;
    const active = (this.shadowRoot as ShadowRoot).activeElement;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

if (!customElements.get('fm-dialog')) {
  customElements.define('fm-dialog', FmDialog);
}
