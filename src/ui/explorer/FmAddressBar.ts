/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {css, adoptStyles} from '@/shared/dom/css';
import {h} from '@/shared/dom/html';
import {DisposableStore, listen} from '@/shared/lib/Disposable';
import {effect} from '@/shared/reactive/signal';
import {t} from '@/shared/i18n/i18n';
import {VirtualPath} from '@/domain/path/VirtualPath';
import {icon} from '@/ui/icons';
import {base} from '@/ui/theme/tokens';
import type {ExplorerDeps} from './deps';

const styles = css`
  :host { display: flex; align-items: center; gap: 8px; height: 36px; padding: 0 8px; border-bottom: 1px solid var(--fm-border); background: var(--fm-bg); }
  .crumbs {
    flex: 1; display: flex; align-items: center; min-width: 0; height: 28px; padding: 0 4px;
    border: 1px solid var(--fm-border-strong); border-radius: var(--fm-radius); background: var(--fm-bg); cursor: text; overflow: hidden;
  }
  .crumbs:focus-within { outline: 2px solid var(--fm-focus); outline-offset: -1px; }
  .crumb { display: inline-flex; align-items: center; gap: 2px; padding: 0 6px; height: 24px; border-radius: var(--fm-radius); cursor: pointer; white-space: nowrap; flex: none; }
  .crumb:hover { background: var(--fm-bg-hover); }
  .crumb svg { width: 12px; height: 12px; color: var(--fm-fg-muted); }
  .crumbs .fm-input { border: 0; height: 26px; }
  .crumbs .fm-input:focus { outline: none; }
  .filter { position: relative; width: 200px; flex: none; }
  .filter .fm-input { padding-left: 28px; }
  .filter svg { position: absolute; left: 8px; top: 6px; width: 16px; height: 16px; color: var(--fm-fg-muted); pointer-events: none; }
  .filter .clear { position: absolute; right: 2px; top: 2px; width: 24px; height: 24px; }
  .filter .go { position: absolute; left: 2px; top: 2px; width: 24px; height: 24px; }
  .filter .go svg { position: static; pointer-events: none; }
  :host([narrow]) .filter { width: 110px; }
  .crumbs.is-search { cursor: default; gap: 6px; padding-left: 8px; }
  .crumbs.is-search .query { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .crumbs.is-search .root { color: var(--fm-fg-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .crumbs.is-search .close { margin-left: auto; width: 24px; height: 24px; flex: none; }
`;

/**
 * Адресная строка: хлебные крошки (клик — переход), по клику в пустое место — текстовый ввод
 * пути (Enter — перейти, Escape — отмена); справа — поле поиска: набор текста фильтрует текущую
 * папку на лету, Enter — поиск по вложенным папкам на сервере (результаты вместо крошек —
 * «Результаты поиска», крестик/Escape закрывают).
 */
export class FmAddressBar extends HTMLElement {
  private deps!: ExplorerDeps;
  private readonly disposables = new DisposableStore();
  private crumbs!: HTMLElement;
  private input: HTMLInputElement | null = null;
  private filterInput!: HTMLInputElement;

  bind(deps: ExplorerDeps): void {
    this.deps = deps;
  }

  connectedCallback(): void {
    if (this.shadowRoot) return;
    const root = this.attachShadow({mode: 'open'});
    adoptStyles(root, base, styles);

    this.crumbs = h('div', {class: 'crumbs', role: 'navigation', title: this.deps.ctx.nav.current.peek()});
    this.filterInput = h('input', {class: 'fm-input', type: 'search', placeholder: t('search.placeholderRoot'), attrs: {'aria-label': t('cmd.search'), autocomplete: 'off'}});
    const clear = h('button', {class: 'fm-btn fm-btn--icon clear', type: 'button', hidden: true, title: t('cmd.search.clear'), on: {click: () => this.resetSearch()}}, icon('close'));
    // Кнопка-лупа запускает поиск так же, как Enter (на touch Enter на клавиатуре не всегда под рукой).
    const go = h('button', {class: 'fm-btn fm-btn--icon go', type: 'button', title: t('cmd.search'), on: {click: () => this.submit()}}, icon('search'));
    const filter = h('div', {class: 'filter'}, go, this.filterInput, clear);
    root.append(this.crumbs, filter);

    this.disposables.add(effect(() => { this.toggleAttribute('narrow', this.deps.ctx.viewport.narrow.value); }));
    this.disposables.add(listen(this.crumbs, 'click', (e) => {
      // В режиме результатов поиска крошек нет — редактировать путь нечего.
      if (e.target === this.crumbs && !this.deps.ctx.search.active.peek()) this.startEditing();
    }));
    this.disposables.add(listen(this.filterInput, 'input', () => {
      this.deps.ctx.view.filter.set(this.filterInput.value);
      // Поле опустело — активный поиск закрывается вместе с фильтром.
      if (this.filterInput.value === '' && this.deps.ctx.search.active.peek()) this.deps.features.search.clear();
    }));
    this.disposables.add(listen(this.filterInput, 'keydown', (e) => {
      if (e.key === 'Escape') {
        this.resetSearch();
        this.filterInput.blur();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.submit();
      }
      e.stopPropagation();
    }));
    // Ctrl+F (команда `search`) → фокус в поле.
    this.disposables.add(effect(() => {
      if (this.deps.ctx.search.focusRequests.value > 0) {
        this.filterInput.focus();
        this.filterInput.select();
      }
    }));

    this.disposables.add(effect(() => {
      const path = this.deps.ctx.nav.current.value;
      const caps = this.deps.ctx.session.capabilities.value;
      const query = this.deps.ctx.search.active.value ? this.deps.ctx.search.query.value : null;
      void this.deps.ctx.viewport.narrow.value;
      const mountLabel = caps.mount(VirtualPath.parse(path).mount)?.label;
      if (this.input) return;
      if (query !== null) this.renderSearchHeading(query, path, mountLabel);
      else this.renderCrumbs(path, mountLabel);
    }));
    // Подсказка в поле: «Поиск в «Папка»» — если поиск здесь возможен, иначе «Фильтр».
    this.disposables.add(effect(() => {
      const path = this.deps.ctx.nav.current.value;
      const caps = this.deps.ctx.session.capabilities.value;
      if (!this.deps.features.search.available()) {
        this.filterInput.placeholder = t('search.filterOnly');
        return;
      }
      const vp = VirtualPath.parse(path);
      const folder = vp.isRoot ? null : vp.isMountRoot ? (caps.mount(vp.mount)?.label ?? vp.name) : vp.name;
      this.filterInput.placeholder = folder ? t('search.placeholder', {folder}) : t('search.placeholderRoot');
    }));
    this.disposables.add(effect(() => {
      const filterValue = this.deps.ctx.view.filter.value;
      const searching = this.deps.ctx.search.active.value;
      clear.hidden = filterValue === '' && !searching;
      // Поле показывает фильтр, а при активном поиске — его запрос.
      const shown = searching && filterValue === '' ? this.deps.ctx.search.query.value : filterValue;
      if (this.filterInput.value !== shown) this.filterInput.value = shown;
    }));
    // Смена папки сбрасывает фильтр (как в проводнике).
    this.disposables.add(this.deps.ctx.nav.current.subscribe(() => this.deps.ctx.view.filter.set('')));
  }

  disconnectedCallback(): void {
    this.disposables.dispose();
  }

  /** Запуск поиска по тексту поля. Локальный фильтр снимается: результаты показываются целиком, поле держит запрос. */
  private submit(): void {
    const query = this.filterInput.value.trim();
    if (query === '') return;
    this.deps.ctx.view.filter.set('');
    void this.deps.features.search.run(query);
  }

  private resetSearch(): void {
    this.filterInput.value = '';
    this.deps.ctx.view.filter.set('');
    this.deps.features.search.clear();
  }

  /** Вместо крошек — заголовок результатов: запрос, папка поиска и крестик. */
  private renderSearchHeading(query: string, path: string, mountLabel: string | undefined): void {
    const vp = VirtualPath.parse(path);
    const rootLabel = vp.isRoot ? t('app.root') : vp.isMountRoot ? (mountLabel ?? vp.name) : vp.name;
    this.crumbs.classList.add('is-search');
    this.crumbs.title = path;
    this.crumbs.replaceChildren(
      icon('search'),
      h('span', {class: 'query', text: t('search.results', {query})}),
      h('span', {class: 'root', text: rootLabel, title: path}),
      h('button', {class: 'fm-btn fm-btn--icon close', type: 'button', title: t('cmd.search.clear'), on: {click: (e) => { e.stopPropagation(); this.resetSearch(); }}}, icon('close')),
    );
  }

  private renderCrumbs(path: string, mountLabel: string | undefined): void {
    this.crumbs.classList.remove('is-search');
    const vp = VirtualPath.parse(path);
    // Крошки начинаются с корня области: выше него пользователю пути нет.
    const chain = [...vp.ancestors(), vp].filter((p) => this.deps.ctx.nav.within(p.toString()));
    this.crumbs.title = path;
    // Узко: показываем только «…» и последние два сегмента; «…» открывает редактирование пути.
    const narrow = this.deps.ctx.viewport.narrow.peek();
    const shown = narrow && chain.length > 2 ? chain.slice(-2) : chain;
    const ellipsis = shown.length < chain.length
      ? [h('span', {class: 'crumb', text: '…', title: path, on: {click: (e) => { e.stopPropagation(); this.startEditing(); }}}), icon('chevron-right')]
      : [];
    this.crumbs.replaceChildren(...ellipsis, ...shown.flatMap((p, i) => {
      const label = p.isRoot ? t('app.root') : p.isMountRoot ? (mountLabel ?? p.name) : p.name;
      const crumb = h('span', {class: 'crumb', text: label, on: {click: (e) => { e.stopPropagation(); this.deps.ctx.nav.navigate(p.toString()); }}});
      return i < shown.length - 1 ? [crumb, icon('chevron-right')] : [crumb];
    }));
  }

  private startEditing(): void {
    if (this.input) return;
    this.input = h('input', {class: 'fm-input', type: 'text', value: this.deps.ctx.nav.current.peek(), attrs: {spellcheck: 'false'}});
    const finish = (apply: boolean): void => {
      const input = this.input;
      if (!input) return;
      this.input = null;
      if (apply) {
        const normalized = VirtualPath.normalize(input.value);
        if (normalized) this.deps.ctx.nav.navigate(normalized.toString());
      }
      this.renderCrumbs(this.deps.ctx.nav.current.peek(), this.deps.ctx.session.capabilities.peek().mount(VirtualPath.parse(this.deps.ctx.nav.current.peek()).mount)?.label);
    };
    this.input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') finish(true);
      else if (e.key === 'Escape') finish(false);
    });
    this.input.addEventListener('blur', () => finish(false));
    this.crumbs.replaceChildren(this.input);
    this.input.focus();
    this.input.select();
  }
}

if (!customElements.get('fm-address-bar')) {
  customElements.define('fm-address-bar', FmAddressBar);
}
