/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {css, adoptStyles} from '@/shared/dom/css';
import {h} from '@/shared/dom/html';
import {DisposableStore} from '@/shared/lib/Disposable';
import {effect} from '@/shared/reactive/signal';
import {base, tokens} from '@/ui/theme/tokens';
import {splitter} from '@/ui/primitives/splitter';
import {FmToolbar} from '@/ui/explorer/FmToolbar';
import {FmAddressBar} from '@/ui/explorer/FmAddressBar';
import {FmNavPane} from '@/ui/explorer/FmNavPane';
import {FmContentPane} from '@/ui/explorer/FmContentPane';
import {FmStatusBar} from '@/ui/explorer/FmStatusBar';
import {FmQueuePanel} from '@/ui/explorer/FmQueuePanel';
import {FmPreviewPane} from '@/ui/explorer/FmPreviewPane';
import type {ExplorerDeps} from '@/ui/explorer/deps';

const styles = css`
  :host { display: flex; flex-direction: column; width: 100%; height: 100%; min-height: 320px; background: var(--fm-bg); border: 1px solid var(--fm-border); overflow: hidden; }
  :host([embedded]) { border-radius: var(--fm-radius-lg); }
  .body { flex: 1; display: flex; min-height: 0; }
  fm-nav-pane { flex: none; width: var(--fm-nav-width, 240px); border-right: 1px solid var(--fm-border); }
  fm-content-pane { flex: 1; }
  fm-preview-pane { flex: none; width: var(--fm-preview-width, 300px); }
  :host([narrow]) fm-preview-pane { position: absolute; right: 0; top: 0; bottom: 0; width: min(90%, 360px); z-index: 5; box-shadow: var(--fm-shadow); }
  .splitter.preview { cursor: ew-resize; }
  .splitter { flex: none; width: 5px; margin: 0 -2px; cursor: ew-resize; z-index: 1; }
  .splitter:hover, .splitter.is-dragging { background: var(--fm-accent); opacity: 0.5; }
  /* Узкая раскладка: дерево — выдвижная панель поверх содержимого, разделителя нет. */
  :host([narrow]) .body { position: relative; }
  :host([narrow]) .splitter { display: none; }
  :host([narrow]) fm-nav-pane { position: absolute; left: 0; top: 0; bottom: 0; width: min(80%, 320px); z-index: 5; box-shadow: var(--fm-shadow); border-right: 1px solid var(--fm-border); }
  :host([narrow]) .backdrop { position: absolute; inset: 0; background: var(--fm-overlay); z-index: 4; }
`;

/**
 * Композиция проводника: тулбар, адресная строка, панель навигации | содержимое, панель операций,
 * строка состояния. Все части получают общие зависимости через `bind(deps)`.
 *
 * Корневой элемент несёт дизайн-токены (тема) и является целью горячих клавиш.
 */
export class FmExplorer extends HTMLElement {
  private deps!: ExplorerDeps;
  private readonly disposables = new DisposableStore();
  contentPane!: FmContentPane;

  bind(deps: ExplorerDeps): void {
    this.deps = deps;
  }

  connectedCallback(): void {
    if (this.shadowRoot) return;
    const root = this.attachShadow({mode: 'open'});
    adoptStyles(root, tokens, base, styles);
    this.tabIndex = -1;

    const toolbar = new FmToolbar();
    const address = new FmAddressBar();
    const nav = new FmNavPane();
    const content = new FmContentPane();
    const status = new FmStatusBar();
    const queue = new FmQueuePanel();
    const preview = new FmPreviewPane();
    for (const part of [toolbar, address, nav, content, status, queue, preview]) part.bind(this.deps);
    this.contentPane = content;

    const split = splitter(this.deps.ctx.view.navPaneWidth, {min: 140, max: 600, reset: 240});
    this.disposables.add(split.dispose);
    const backdrop = h('div', {class: 'backdrop', hidden: true, on: {click: () => this.deps.ctx.view.navDrawerOpen.set(false)}});
    // Разделитель предпросмотра тянется влево: ширина панели растёт при движении к левому краю.
    const previewSplit = splitter(this.deps.ctx.view.previewWidth, {min: 160, max: 800, reset: 300, invert: true});
    previewSplit.el.classList.add('preview');
    this.disposables.add(previewSplit.dispose);

    root.append(toolbar, address, h('div', {class: 'body'}, backdrop, nav, split.el, content, previewSplit.el, preview), queue, status);

    // Ширина проводника → ViewportStore.narrow (а не ширина окна: встроенный в узкую колонку
    // менеджер должен вести себя как на телефоне).
    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? this.clientWidth;
      this.deps.ctx.viewport.setWidth(width);
    });
    ro.observe(this);
    this.disposables.add(() => ro.disconnect());

    this.disposables.add(effect(() => {
      const narrow = this.deps.ctx.viewport.narrow.value;
      this.toggleAttribute('narrow', narrow);
      this.style.setProperty('--fm-nav-width', `${this.deps.ctx.view.navPaneWidth.value}px`);
      // Узко: дерево — выдвижная панель (navDrawerOpen, не сохраняется); широко — постоянная панель (navPaneVisible).
      const visible = narrow ? this.deps.ctx.view.navDrawerOpen.value : this.deps.ctx.view.navPaneVisible.value;
      nav.hidden = !visible;
      split.el.hidden = !visible || narrow;
      backdrop.hidden = !(narrow && visible);
    }));
    // В узкой раскладке переход в папку закрывает выдвинутое дерево.
    this.disposables.add(this.deps.ctx.nav.current.subscribe(() => {
      if (this.deps.ctx.viewport.narrow.peek()) this.deps.ctx.view.navDrawerOpen.set(false);
    }));
    this.disposables.add(effect(() => {
      queue.hidden = !this.deps.ctx.view.queuePaneVisible.value;
    }));
    this.disposables.add(effect(() => {
      const visible = this.deps.ctx.view.previewVisible.value;
      const narrow = this.deps.ctx.viewport.narrow.value;
      this.style.setProperty('--fm-preview-width', `${this.deps.ctx.view.previewWidth.value}px`);
      preview.hidden = !visible;
      previewSplit.el.hidden = !visible || narrow;
    }));
    // Появилась активная задача — показать панель операций (как в проводнике всплывает окно копирования).
    this.disposables.add(this.deps.ctx.queue.events.on('enqueued', () => {
      if (!this.deps.ctx.view.queuePaneVisible.peek()) this.deps.ctx.view.queuePaneVisible.set(true);
    }));
  }

  disconnectedCallback(): void {
    this.disposables.dispose();
  }
}

if (!customElements.get('fm-explorer')) {
  customElements.define('fm-explorer', FmExplorer);
}
