/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {css, adoptStyles} from '@/shared/dom/css';
import {h} from '@/shared/dom/html';
import {DisposableStore, listen} from '@/shared/lib/Disposable';
import {t} from '@/shared/i18n/i18n';
import {icon} from '@/ui/icons';
import {base, tokens} from '@/ui/theme/tokens';

const styles = css`
  :host { position: fixed; inset: 0; z-index: 2147481000; display: flex; align-items: center; justify-content: center; background: var(--fm-overlay); }
  .frame {
    position: absolute; display: flex; flex-direction: column; min-width: 480px; min-height: 320px;
    background: var(--fm-bg); border: 1px solid var(--fm-border-strong); border-radius: var(--fm-radius-lg); box-shadow: var(--fm-shadow); overflow: hidden;
  }
  @media (max-width: 640px) { .frame { min-width: 0; min-height: 0; left: 0 !important; top: 0 !important; width: 100vw !important; height: 100dvh !important; border-radius: 0; } .handle { display: none; } }
  .titlebar { display: flex; align-items: center; gap: 8px; height: 36px; padding: 0 4px 0 12px; background: var(--fm-bg-alt); border-bottom: 1px solid var(--fm-border); cursor: move; user-select: none; font-weight: 600; }
  .titlebar .grow { flex: 1; }
  .content { flex: 1; min-height: 0; display: flex; }
  .content ::slotted(*) { flex: 1; min-width: 0; min-height: 0; }
  .handle { position: absolute; z-index: 2; }
  .handle.n { top: -3px; left: 8px; right: 8px; height: 6px; cursor: ns-resize; }
  .handle.s { bottom: -3px; left: 8px; right: 8px; height: 6px; cursor: ns-resize; }
  .handle.e { right: -3px; top: 8px; bottom: 8px; width: 6px; cursor: ew-resize; }
  .handle.w { left: -3px; top: 8px; bottom: 8px; width: 6px; cursor: ew-resize; }
  .handle.ne { top: -4px; right: -4px; width: 12px; height: 12px; cursor: nesw-resize; }
  .handle.nw { top: -4px; left: -4px; width: 12px; height: 12px; cursor: nwse-resize; }
  .handle.se { bottom: -4px; right: -4px; width: 12px; height: 12px; cursor: nwse-resize; }
  .handle.sw { bottom: -4px; left: -4px; width: 12px; height: 12px; cursor: nesw-resize; }
`;

type Edge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

/**
 * Плавающее окно проводника: перетаскивание за заголовок, изменение размера за края/углы,
 * закрытие крестиком/Escape/кликом по фону. Содержимое — через слот (сам `<fm-explorer>`).
 * Размер сообщается наружу (`onResize`) для сохранения в настройках вида.
 */
export class FmWindow extends HTMLElement {
  private readonly disposables = new DisposableStore();
  private frame!: HTMLElement;
  onClose: (() => void) | null = null;
  onResize: ((size: {width: number; height: number}) => void) | null = null;

  connectedCallback(): void {
    if (this.shadowRoot) return;
    const root = this.attachShadow({mode: 'open'});
    adoptStyles(root, tokens, base, styles);
    const title = h('span', {text: this.getAttribute('title') || t('app.title')});
    this.removeAttribute('title');
    const titlebar = h('div', {class: 'titlebar'}, icon('folder'), title, h('span', {class: 'grow'}),
      h('button', {class: 'fm-btn fm-btn--icon', type: 'button', title: t('dialog.close'), on: {click: () => this.close()}}, icon('close')));
    this.frame = h('div', {class: 'frame', role: 'dialog', attrs: {'aria-modal': 'true'}}, titlebar, h('div', {class: 'content'}, h('slot')),
      ...(['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as Edge[]).map((edge) => h('div', {class: `handle ${edge}`, attrs: {'data-edge': edge}})));
    root.appendChild(this.frame);

    this.disposables.add(listen(titlebar, 'pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('button')) return;
      this.drag(e);
    }));
    for (const handle of this.frame.querySelectorAll<HTMLElement>('.handle')) {
      this.disposables.add(listen(handle, 'pointerdown', (e) => this.resize(e, handle.dataset.edge as Edge)));
    }
    // e.target ретаргетируется на хост для любого события изнутри shadow DOM,
    // поэтому «клик по фону» определяем по первому узлу composedPath().
    this.disposables.add(listen(this, 'pointerdown', (e) => {
      if (e.composedPath()[0] === this) this.close();
    }));
    this.disposables.add(listen(this, 'keydown', (e) => {
      if (e.key === 'Escape' && !e.defaultPrevented) {
        e.stopPropagation();
        this.close();
      }
    }));
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    this.disposables.add(() => { document.body.style.overflow = prevOverflow; });
  }

  disconnectedCallback(): void {
    this.disposables.dispose();
  }

  /** Задать размер и отцентрировать. */
  setSize(size: {width: number; height: number} | null): void {
    const width = Math.min(window.innerWidth - 16, size?.width ?? Math.round(window.innerWidth * 0.8));
    const height = Math.min(window.innerHeight - 16, size?.height ?? Math.round(window.innerHeight * 0.8));
    Object.assign(this.frame.style, {
      width: `${width}px`, height: `${height}px`,
      left: `${Math.max(0, (window.innerWidth - width) / 2)}px`, top: `${Math.max(0, (window.innerHeight - height) / 2)}px`,
    });
  }

  close(): void {
    this.onClose?.();
  }

  private drag(e: PointerEvent): void {
    e.preventDefault();
    const start = {x: e.clientX, y: e.clientY, left: this.frame.offsetLeft, top: this.frame.offsetTop};
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    const onMove = (ev: PointerEvent): void => {
      const left = Math.min(window.innerWidth - 60, Math.max(-this.frame.offsetWidth + 120, start.left + ev.clientX - start.x));
      const top = Math.min(window.innerHeight - 40, Math.max(0, start.top + ev.clientY - start.y));
      this.frame.style.left = `${left}px`;
      this.frame.style.top = `${top}px`;
    };
    const onUp = (): void => {
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onUp);
    };
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onUp);
  }

  private resize(e: PointerEvent, edge: Edge): void {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    const start = {x: e.clientX, y: e.clientY, left: this.frame.offsetLeft, top: this.frame.offsetTop, width: this.frame.offsetWidth, height: this.frame.offsetHeight};
    const minW = 480;
    const minH = 320;
    const onMove = (ev: PointerEvent): void => {
      const dx = ev.clientX - start.x;
      const dy = ev.clientY - start.y;
      let {left, top, width, height} = start;
      if (edge.includes('e')) width = Math.max(minW, start.width + dx);
      if (edge.includes('s')) height = Math.max(minH, start.height + dy);
      if (edge.includes('w')) { width = Math.max(minW, start.width - dx); left = start.left + (start.width - width); }
      if (edge.includes('n')) { height = Math.max(minH, start.height - dy); top = start.top + (start.height - height); }
      Object.assign(this.frame.style, {left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px`});
    };
    const onUp = (): void => {
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onUp);
      this.onResize?.({width: this.frame.offsetWidth, height: this.frame.offsetHeight});
    };
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onUp);
  }
}

if (!customElements.get('fm-window')) {
  customElements.define('fm-window', FmWindow);
}
