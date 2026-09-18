/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {css, adoptStyles} from '@/shared/dom/css';
import {h} from '@/shared/dom/html';
import {DisposableStore} from '@/shared/lib/Disposable';
import {effect} from '@/shared/reactive/signal';
import {t} from '@/shared/i18n/i18n';
import {button, commandButton} from '@/ui/primitives/button';
import {base} from '@/ui/theme/tokens';
import {VIEW_MENU, type ExplorerDeps} from './deps';

const styles = css`
  :host { display: flex; align-items: center; gap: 2px; height: var(--fm-toolbar-height); padding: 0 6px; border-bottom: 1px solid var(--fm-border); background: var(--fm-bg-alt); overflow-x: auto; scrollbar-width: none; }
  .sep { width: 1px; height: 20px; background: var(--fm-border); margin: 0 4px; flex: none; }
  .grow { flex: 1; }
  .fm-btn { flex: none; }
  .more { display: none; }
  /* Узко: второстепенные кнопки уезжают в меню «ещё», подписи прячутся. */
  :host([narrow]) .is-secondary, :host([narrow]) .sep.is-secondary { display: none; }
  :host([narrow]) .more { display: inline-flex; }
  :host([narrow]) .fm-btn span { display: none; }
`;

/**
 * Панель инструментов: кнопки команд (состояние — из `canExecute`), меню «Вид», в режиме picker —
 * кнопка «Выбрать». Кнопки не содержат логики: только `commands.execute(id)`.
 */
export class FmToolbar extends HTMLElement {
  private deps!: ExplorerDeps;
  private readonly disposables = new DisposableStore();

  bind(deps: ExplorerDeps): void {
    this.deps = deps;
  }

  connectedCallback(): void {
    if (this.shadowRoot) return;
    const root = this.attachShadow({mode: 'open'});
    adoptStyles(root, base, styles);

    const add = (id: string, options: Parameters<typeof commandButton>[2] = {}, secondary = false): void => {
      if (!this.deps.commands.get(id)) {
        console.warn(`[fm-toolbar] команда '${id}' не зарегистрирована — кнопка пропущена`);
        return;
      }
      const {el, dispose} = commandButton(this.deps.commands, id, options);
      if (secondary) el.classList.add('is-secondary');
      this.disposables.add(dispose);
      root.appendChild(el);
    };
    const sep = (secondary = false): void => { root.appendChild(h('span', {class: `sep${secondary ? ' is-secondary' : ''}`})); };

    // Узкая раскладка: гамбургер слева открывает выдвижное дерево (в широкой панель включается справа).
    const drawer = commandButton(this.deps.commands, 'toggle-nav-pane', {icon: 'sidebar'});
    drawer.el.classList.add('more');
    this.disposables.add(drawer.dispose);
    root.appendChild(drawer.el);

    add('back');
    add('forward', {}, true);
    add('up');
    add('refresh', {}, true);
    sep();
    add('new-folder', {iconOnly: false});
    add('upload', {iconOnly: false});
    sep(true);
    add('cut', {}, true);
    add('copy', {}, true);
    add('paste');
    sep(true);
    add('rename', {}, true);
    add('delete', {}, true);
    add('download', {}, true);
    sep(true);
    add('properties', {}, true);
    root.appendChild(h('span', {class: 'grow'}));

    const more = button({icon: 'more', label: t('toolbar.more'), iconOnly: true, title: t('toolbar.more'), onClick: (e) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      this.deps.openMenu(['forward', 'refresh', '|', 'cut', 'copy', '|', 'rename', 'delete', 'download', '|', 'select-all', 'invert-selection', '|', 'properties'], {x: rect.right - 200, y: rect.bottom + 2});
    }});
    more.classList.add('more');
    root.appendChild(more);

    this.disposables.add(effect(() => { this.toggleAttribute('narrow', this.deps.ctx.viewport.narrow.value); }));

    const viewButton = button({icon: 'view-details', label: t('cmd.view.details'), iconOnly: true, title: t('toolbar.view'), onClick: (e) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      this.deps.openMenu(VIEW_MENU, {x: rect.left, y: rect.bottom + 2});
    }});
    root.appendChild(viewButton);
    add('toggle-nav-pane', {}, true);
    add('toggle-preview', {}, true);
    add('toggle-queue', {}, true);
    if (this.deps.ctx.config.mode === 'picker') {
      sep();
      add('pick', {iconOnly: false, variant: 'primary'});
    }
  }

  disconnectedCallback(): void {
    this.disposables.dispose();
  }
}

if (!customElements.get('fm-toolbar')) {
  customElements.define('fm-toolbar', FmToolbar);
}
