/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {css, adoptStyles} from '@/shared/dom/css';
import {h} from '@/shared/dom/html';
import {DisposableStore, listen} from '@/shared/lib/Disposable';
import {computed, effect, signal, untracked} from '@/shared/reactive/signal';
import {t} from '@/shared/i18n/i18n';
import {formatBytes} from '@/shared/format/bytes';
import {formatDateTime} from '@/shared/format/date';
import {closestInPath, DRAG_THRESHOLD, onContextMenu} from '@/shared/dom/pointer';
import {displayName, isContainer, isImage, parentPathOf, type Node} from '@/domain/node/Node';
import {sortNodes, type SortKey} from '@/domain/sorting/comparators';
import {naturalCompare} from '@/domain/sorting/naturalCompare';
import {fileIcon, folderIcon, icon} from '@/ui/icons';
import {base} from '@/ui/theme/tokens';
import type {Virtualizer} from '@/ui/ports/Virtualizer';
import type {DropContext} from '@/ui/ports/DndAdapter';
import {apiErrorMessage} from '@/features';
import {FOLDER_MENU, ITEM_MENU, type ExplorerDeps} from './deps';

const styles = css`
  :host { display: flex; flex-direction: column; min-width: 0; min-height: 0; background: var(--fm-bg); position: relative; outline: none; user-select: none; }
  .header {
    display: grid; grid-template-columns: var(--fm-columns); align-items: center; height: 28px;
    border-bottom: 1px solid var(--fm-border); background: var(--fm-bg-alt); color: var(--fm-fg-muted); font-size: 0.95em; flex: none;
  }
  .header .col { display: flex; align-items: center; gap: 4px; padding: 0 8px; height: 100%; cursor: pointer; border-right: 1px solid var(--fm-border); overflow: hidden; white-space: nowrap; }
  .header .col:hover { background: var(--fm-bg-hover); color: var(--fm-fg); }
  .header .col svg { width: 12px; height: 12px; }
  .header .col.is-num { justify-content: flex-end; }
  .viewport { flex: 1; overflow: auto; position: relative; min-height: 0; touch-action: pan-y; }
  .viewport:focus-visible { outline: 2px solid var(--fm-focus); outline-offset: -2px; }
  .spacer { position: relative; width: 100%; }
  .layer { position: absolute; left: 0; top: 0; right: 0; }

  .item { position: absolute; display: flex; align-items: center; gap: 6px; cursor: default; border-radius: var(--fm-radius); overflow: hidden; touch-action: manipulation; }
  .item:hover { background: var(--fm-bg-hover); }
  .item.is-selected { background: var(--fm-bg-selected); }
  :host(:not(:focus-within)) .item.is-selected { background: var(--fm-bg-selected-inactive); }
  .item.is-focused { outline: 1px solid var(--fm-focus); outline-offset: -1px; }
  .item.is-cut { opacity: 0.5; }
  .item.is-drop { background: var(--fm-bg-drop); outline: 1px solid var(--fm-accent); outline-offset: -1px; }
  .item .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .item .fm-file-icon { flex: none; }
  /* Расположение найденного (режим результатов поиска): приглушённо, обрезается первым. */
  .item .sub { color: var(--fm-fg-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1 1 0; min-width: 0; }
  .item .sub::before { content: '·'; margin-right: 6px; }
  :host(.mode-tiles) .item .sub::before, :host(.mode-icons) .item .sub::before { content: none; }
  .item img.thumb { object-fit: contain; flex: none; background: var(--fm-bg-alt); }
  .item .check { display: none; flex: none; width: 18px; height: 18px; border: 1.5px solid var(--fm-border-strong); border-radius: 4px; align-items: center; justify-content: center; }
  .item .check svg { width: 14px; height: 14px; stroke-width: 2.5; color: var(--fm-accent-fg); }
  .item.is-selected .check { background: var(--fm-accent); border-color: var(--fm-accent); }
  /* Режим выделения на touch: чекбоксы видны, тапы переключают выделение. */
  :host([selecting]) .item .check { display: inline-flex; }

  /* Класс режима стоит на хосте: изнутри shadow DOM он доступен только через :host(.mode-*). */
  :host(.mode-details) .item { display: grid; grid-template-columns: var(--fm-columns); left: 0; right: 0; }
  :host(.mode-details) .item > * { padding: 0 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: flex; align-items: center; gap: 6px; min-width: 0; }
  :host(.mode-details) .item .meta { color: var(--fm-fg-muted); }
  :host(.mode-details) .item .is-num { justify-content: flex-end; }
  :host(.mode-list) .item { padding: 0 8px; }
  :host(.mode-tiles) .item { padding: 6px 8px; align-items: center; }
  :host(.mode-tiles) .item .text { display: flex; flex-direction: column; min-width: 0; }
  :host(.mode-tiles) .item .meta { color: var(--fm-fg-muted); font-size: 0.92em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  :host(.mode-icons) .item { flex-direction: column; justify-content: flex-start; padding: 8px 4px 4px; text-align: center; }
  :host(.mode-icons) .item .name { white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.25; width: 100%; word-break: break-word; }
  :host(.mode-icons) .item .check { position: absolute; left: 6px; top: 6px; }

  /* Узкая раскладка: в таблице остаются имя и размер. */
  :host([narrow]) .header .col.is-secondary, :host([narrow].mode-details) .item .is-secondary { display: none; }

  .rename { width: 100%; }
  .rename .fm-input { height: 24px; padding: 0 4px; }
  .rename .hint { position: absolute; z-index: 2; margin-top: 2px; padding: 4px 8px; background: var(--fm-bg); border: 1px solid var(--fm-danger); border-radius: var(--fm-radius); color: var(--fm-danger); font-size: 0.92em; box-shadow: var(--fm-shadow); white-space: normal; }

  .rubber { position: absolute; border: 1px solid var(--fm-rubber-border); background: var(--fm-rubber); pointer-events: none; z-index: 3; }
  .state { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--fm-fg-muted); pointer-events: none; }
  .state.is-error { color: var(--fm-danger); pointer-events: auto; }
  .state .fm-btn { pointer-events: auto; }
  .drop-overlay { position: absolute; inset: 4px; border: 2px dashed var(--fm-accent); border-radius: var(--fm-radius-lg); background: var(--fm-bg-drop); display: flex; align-items: center; justify-content: center; color: var(--fm-accent); font-weight: 600; pointer-events: none; z-index: 4; }
`;

const COLUMNS_DETAILS = 'minmax(180px, 1fr) 140px 140px 90px';
const COLUMNS_NARROW = 'minmax(120px, 1fr) 80px';

/**
 * Панель содержимого папки — центр проводника.
 *
 * Ответственность: показать элементы текущей папки в выбранном режиме, дать выделять (клик,
 * Ctrl/Shift, рамка, клавиатура, type-ahead; на touch — тап и режим выделения), открывать
 * (двойной клик/Enter, на touch — тап по папке), переименовывать inline, вызывать контекстное
 * меню, быть источником и целью перетаскивания.
 *
 * Геометрия списка — порт {@link Virtualizer}, перетаскивание — порт {@link DndAdapter}:
 * панель не знает, как они реализованы, и переживёт замену на сторонние библиотеки.
 */
export class FmContentPane extends HTMLElement {
  private deps!: ExplorerDeps;
  private readonly disposables = new DisposableStore();
  private virtualizer!: Virtualizer;
  private viewport!: HTMLElement;
  private header!: HTMLElement;
  private spacer!: HTMLElement;
  private layer!: HTMLElement;
  private rubber!: HTMLElement;
  private stateBox!: HTMLElement;
  private dropOverlay!: HTMLElement;

  /** Элементы после фильтра и сортировки — то, что видит пользователь; при активном поиске — его результаты. */
  private readonly visibleItems = computed<readonly Node[]>(() => {
    const search = this.deps.ctx.search;
    const source = search.active.value ? search.items.value : this.deps.ctx.dirs.directory(this.deps.ctx.nav.current.value).value.items;
    const filter = this.deps.ctx.view.filter.value.trim().toLowerCase();
    const items = filter ? source.filter((n) => n.name.toLowerCase().includes(filter)) : source;
    return sortNodes(items, this.deps.ctx.view.sort.value);
  });

  private readonly layoutVersion = signal(0);
  private rendered = new Map<string, HTMLElement>();
  private renderKey = '';
  private dropTarget: string | null = null;
  private typeAhead = '';
  private typeAheadTimer: ReturnType<typeof setTimeout> | null = null;
  private renameHint: HTMLElement | null = null;
  /** Тип указателя последнего pointerdown (для click-модели на touch). */
  private lastPointerType = 'mouse';

  bind(deps: ExplorerDeps): void {
    this.deps = deps;
    this.virtualizer = deps.createVirtualizer();
    deps.features.rename.inlineSupported = true;
  }

  connectedCallback(): void {
    if (this.shadowRoot) return;
    const root = this.attachShadow({mode: 'open'});
    adoptStyles(root, base, styles);

    this.header = h('div', {class: 'header', role: 'row'});
    this.layer = h('div', {class: 'layer'});
    this.spacer = h('div', {class: 'spacer'}, this.layer);
    this.rubber = h('div', {class: 'rubber', hidden: true});
    this.stateBox = h('div', {class: 'state', hidden: true});
    this.dropOverlay = h('div', {class: 'drop-overlay', hidden: true, text: t('upload.dropHint')});
    this.viewport = h('div', {class: 'viewport', tabindex: 0, role: 'grid', attrs: {'aria-multiselectable': 'true'}}, this.spacer, this.rubber, this.stateBox);
    root.append(this.header, this.viewport, this.dropOverlay);

    this.renderHeader();

    // Порядок элементов → стор выделения (для Ctrl+A, диапазонов, стрелок).
    this.disposables.add(effect(() => {
      const items = this.visibleItems.value;
      untracked(() => this.deps.ctx.selection.setOrder(items));
    }));
    // Режим/ширина/указатель → пересчёт раскладки.
    this.disposables.add(effect(() => {
      const mode = this.deps.ctx.view.mode.value;
      const narrow = this.deps.ctx.viewport.narrow.value;
      void this.deps.ctx.viewport.coarse.value;
      this.className = `mode-${mode}`;
      this.toggleAttribute('narrow', narrow);
      this.style.setProperty('--fm-columns', narrow ? COLUMNS_NARROW : COLUMNS_DETAILS);
      this.header.hidden = mode !== 'details';
      this.recalcLayout();
    }));
    // Режим выделения на touch: есть выделенные элементы и грубый указатель.
    this.disposables.add(effect(() => {
      this.toggleAttribute('selecting', this.deps.ctx.viewport.coarse.value && this.deps.ctx.selection.count.value > 0);
    }));
    // Данные/раскладка/inline-редактор → полная перерисовка видимого диапазона.
    this.disposables.add(effect(() => {
      void this.visibleItems.value;
      void this.layoutVersion.value;
      void this.deps.features.rename.editing.value;
      this.renderVisible(true);
    }));
    // Выделение/буфер → только классы на уже отрендеренных строках. Перерисовывать нельзя:
    // первый клик двойного клика менял бы DOM-узел под курсором, и dblclick уходил бы предку.
    this.disposables.add(effect(() => {
      void this.deps.ctx.selection.state.value;
      void this.deps.ctx.clipboard.state.value;
      this.updateRowStates();
    }));
    this.disposables.add(effect(() => this.renderState()));
    this.disposables.add(effect(() => {
      void this.deps.ctx.view.sort.value;
      this.renderHeader();
    }));
    this.disposables.add(effect(() => {
      const focus = this.deps.ctx.selection.focusPath.value;
      if (focus) untracked(() => this.scrollToPath(focus));
    }));

    const ro = new ResizeObserver(() => this.recalcLayout());
    ro.observe(this.viewport);
    this.disposables.add(() => ro.disconnect());

    this.disposables.add(listen(this.viewport, 'scroll', () => this.renderVisible(false), {passive: true}));
    this.disposables.add(listen(this.viewport, 'pointerdown', (e) => this.onPointerDown(e)));
    this.disposables.add(listen(this.viewport, 'click', (e) => this.onClick(e)));
    this.disposables.add(listen(this.viewport, 'dblclick', (e) => this.onDblClick(e)));
    this.disposables.add(listen(this.viewport, 'keydown', (e) => this.onKeyDown(e)));
    this.disposables.add(onContextMenu(this.viewport, (e, at) => this.onContextMenu(e, at)));
    this.bindDnd();
  }

  disconnectedCallback(): void {
    this.disposables.dispose();
  }

  focusList(): void {
    this.viewport.focus();
  }

  // ---------------------------------------------------------------- раскладка и рендер

  private recalcLayout(): void {
    const changed = this.virtualizer.layout(
      this.deps.ctx.view.mode.peek(),
      this.viewport.clientWidth,
      {coarse: this.deps.ctx.viewport.coarse.peek()},
    );
    if (changed) this.layoutVersion.update((v) => v + 1);
  }

  private renderVisible(force: boolean): void {
    const items = this.visibleItems.peek();
    this.spacer.style.height = `${this.virtualizer.totalHeight(items.length)}px`;
    const {from, to} = this.virtualizer.range(this.viewport.scrollTop, this.viewport.clientHeight, items.length);
    const key = `${this.deps.ctx.view.mode.peek()}|${from}|${to}`;
    if (!force && key === this.renderKey) return;
    this.renderKey = key;

    const selection = this.deps.ctx.selection.state.peek();
    const editing = this.deps.features.rename.editing.peek();
    const fragment = document.createDocumentFragment();
    this.rendered = new Map();
    for (let i = from; i < to; i++) {
      const node = items[i] as Node;
      const el = this.renderItem(node, i, selection.selected.has(node.path), selection.focus === node.path, editing === node.path);
      this.rendered.set(node.path, el);
      fragment.appendChild(el);
    }
    this.layer.replaceChildren(fragment);
  }

  /** Обновить состояние строк на месте (выделение, фокус, «вырезано») без пересоздания DOM. */
  private updateRowStates(): void {
    const selection = this.deps.ctx.selection.state.peek();
    for (const [path, el] of this.rendered) {
      const selected = selection.selected.has(path);
      el.classList.toggle('is-selected', selected);
      el.classList.toggle('is-focused', selection.focus === path);
      el.classList.toggle('is-cut', this.deps.ctx.clipboard.isCut(path));
      el.setAttribute('aria-selected', String(selected));
    }
  }

  private renderItem(node: Node, index: number, selected: boolean, focused: boolean, editing: boolean): HTMLElement {
    const rect = this.virtualizer.rect(index);
    const mode = this.deps.ctx.view.mode.peek();
    const fluid = mode === 'details' || mode === 'list';
    const cut = this.deps.ctx.clipboard.isCut(node.path);
    const el = h('div', {
      class: `item${selected ? ' is-selected' : ''}${focused ? ' is-focused' : ''}${cut ? ' is-cut' : ''}${this.dropTarget === node.path ? ' is-drop' : ''}`,
      role: 'row',
      attrs: {'data-path': node.path, 'data-index': index, 'aria-selected': String(selected), draggable: editing ? 'false' : 'true'},
      style: {left: `${rect.left}px`, top: `${rect.top}px`, width: fluid ? '' : `${rect.width}px`, height: `${rect.height}px`},
    });
    if (fluid) el.style.right = '0';

    const check = h('span', {class: 'check'}, icon('check'));
    const name = editing ? this.renderEditor(node) : h('span', {class: 'name', text: displayName(node), title: node.name});
    // В результатах поиска рядом с именем — где лежит найденное (относительно корня поиска).
    const location = this.deps.ctx.search.active.peek() ? this.locationOf(node) : null;
    const sub = location === null ? null : h('span', {class: 'sub', text: location, title: node.path});
    if (sub && mode === 'icons') el.title = node.path;
    switch (mode) {
      case 'details':
        el.append(
          h('span', {}, check, this.nodeIcon(node, 16), name, ...(sub ? [sub] : [])),
          h('span', {class: 'meta is-secondary', text: formatDateTime(node.mtime)}),
          h('span', {class: 'meta is-secondary', text: this.typeLabel(node)}),
          h('span', {class: 'meta is-num', text: node.kind === 'file' ? formatBytes(node.size) : ''}),
        );
        break;
      case 'tiles':
        el.append(check, this.nodeIcon(node, 40), h('span', {class: 'text'}, name,
          ...(sub ? [sub] : []),
          h('span', {class: 'meta', text: node.kind === 'file' ? `${this.typeLabel(node)} · ${formatBytes(node.size)}` : this.typeLabel(node)})));
        break;
      case 'icons':
        el.append(check, this.nodeIcon(node, 56), name);
        break;
      default:
        el.append(check, this.nodeIcon(node, 16), name, ...(sub ? [sub] : []));
    }
    return el;
  }

  /** Папка найденного узла относительно корня поиска; для прямых детей корня — пусто (`/`). */
  private locationOf(node: Node): string {
    const parent = parentPathOf(node.path) ?? '/';
    const root = this.deps.ctx.search.root.peek();
    if (root === '/') return parent;
    if (parent === root) return '/';
    return parent.startsWith(root + '/') ? parent.slice(root.length) : parent;
  }

  private nodeIcon(node: Node, size: number): Element {
    if (node.kind === 'mount') return icon(node.meta?.icon === 'archive' ? 'archive' : node.meta?.icon === 'cloud' ? 'cloud' : 'drive');
    if (node.kind === 'dir') return folderIcon(size);
    // Картинка вместо иконки — только в крупных режимах (плитка/значки), см. thumbnailSrc().
    const src = size >= 40 && isImage(node) ? this.thumbnailSrc(node, size) : null;
    if (src === null) return fileIcon(node.ext, size);
    const img = h('img', {class: 'thumb', attrs: {src, alt: '', loading: 'lazy', decoding: 'async', draggable: 'false'}, style: {width: `${size}px`, height: `${size}px`}});
    // Не декодировалось / сервер отказал (too_large, unsupported) — молча обычная иконка типа.
    img.addEventListener('error', () => img.replaceWith(fileIcon(node.ext, size)), {once: true});
    return img;
  }

  /**
   * Источник миниатюры: серверная (`thumbnail`, §9.14) — маленький перекодированный файл,
   * подобранный под физический размер ячейки (DPR); иначе публичный URL файла (браузер уменьшит
   * оригинал сам — дороже, но работает без Imagick/GD). Только http(s)/относительные URL,
   * никаких data:/javascript:.
   */
  private thumbnailSrc(node: Node, cssSize: number): string | null {
    const ctx = this.deps.ctx;
    const sizes = ctx.session.thumbnailSizes.peek();
    if (sizes.length > 0 && ctx.capabilities().can('thumbnail', node)) {
      const wanted = Math.ceil(cssSize * Math.min(3, window.devicePixelRatio || 1));
      const size = sizes.find((s) => s >= wanted) ?? sizes[sizes.length - 1] ?? wanted;
      const url = ctx.client.thumbnailUrl(node.path, size, node.mtime);
      if (url !== null) return url;
    }
    return node.url && /^(https?:\/\/|\/)/.test(node.url) ? node.url : null;
  }

  private typeLabel(node: Node): string {
    if (node.kind === 'dir') return t('kind.dir');
    if (node.kind === 'mount') return t('kind.mount');
    return node.ext ? t('kind.file.ext', {ext: node.ext.toUpperCase()}) : t('kind.file');
  }

  private renderHeader(): void {
    const sort = this.deps.ctx.view.sort.peek();
    const col = (key: SortKey, label: string, cls = ''): HTMLElement => {
      const el = h('div', {class: `col${cls}`, role: 'columnheader', text: label, on: {click: () => void this.deps.commands.execute(`sort.${key}`)}});
      if (sort.by === key) el.appendChild(icon(sort.dir === 'asc' ? 'sort-asc' : 'sort-desc'));
      return el;
    };
    this.header.replaceChildren(
      col('name', t('column.name')),
      col('mtime', t('column.mtime'), ' is-secondary'),
      col('ext', t('column.type'), ' is-secondary'),
      col('size', t('column.size'), ' is-num'),
    );
  }

  private renderState(): void {
    const dir = this.deps.ctx.dirs.directory(this.deps.ctx.nav.current.value).value;
    const items = this.visibleItems.value;
    const search = this.deps.ctx.search;
    if (search.active.value) {
      const status = search.status.value;
      const error = search.error.value;
      if (status === 'loading') {
        this.stateBox.className = 'state';
        this.stateBox.replaceChildren(h('span', {class: 'fm-spinner'}), h('span', {text: t('search.loading')}));
        this.stateBox.hidden = false;
      } else if (status === 'error' && error) {
        this.stateBox.className = 'state is-error';
        this.stateBox.replaceChildren(icon('error'), h('span', {text: apiErrorMessage(error)}));
        this.stateBox.hidden = false;
      } else if (status === 'ready' && items.length === 0) {
        this.stateBox.className = 'state';
        this.stateBox.replaceChildren(icon('search'), h('span', {text: t('search.empty')}));
        this.stateBox.hidden = false;
      } else {
        this.stateBox.hidden = true;
      }
      return;
    }
    if (dir.status === 'loading' && dir.items.length === 0) {
      this.stateBox.className = 'state';
      this.stateBox.replaceChildren(h('span', {class: 'fm-spinner'}), h('span', {text: t('app.loading')}));
      this.stateBox.hidden = false;
    } else if (dir.status === 'error' && dir.error) {
      this.stateBox.className = 'state is-error';
      this.stateBox.replaceChildren(icon('error'), h('span', {text: apiErrorMessage(dir.error)}),
        h('button', {class: 'fm-btn fm-btn--outline', type: 'button', text: t('cmd.refresh'), on: {click: () => void this.deps.commands.execute('refresh')}}));
      this.stateBox.hidden = false;
    } else if (dir.status === 'ready' && items.length === 0) {
      this.stateBox.className = 'state';
      this.stateBox.replaceChildren(h('span', {text: t('status.empty')}));
      this.stateBox.hidden = false;
    } else {
      this.stateBox.hidden = true;
    }
  }

  // ---------------------------------------------------------------- inline-переименование

  private renderEditor(node: Node): HTMLElement {
    const input = h('input', {class: 'fm-input', type: 'text', value: node.name, attrs: {spellcheck: 'false', 'aria-label': t('dialog.rename.label')}});
    const wrap = h('div', {class: 'rename'}, input);
    let done = false;
    let busy = false; // blur во время ожидания commit() не должен запускать второй commit
    const finish = async (apply: boolean): Promise<void> => {
      if (done || busy) return;
      if (!apply) {
        done = true;
        this.hideHint();
        this.deps.features.rename.cancel();
        this.focusList();
        return;
      }
      busy = true;
      try {
        const error = await this.deps.features.rename.commit(node, input.value);
        if (error) {
          this.showHint(wrap, error);
          input.classList.add('is-invalid');
          input.focus();
          return;
        }
        done = true;
        this.hideHint();
        this.focusList();
      } finally {
        busy = false;
      }
    };
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') void finish(true);
      else if (e.key === 'Escape') void finish(false);
    });
    input.addEventListener('input', () => {
      const error = this.deps.features.rename.validate(node, input.value);
      input.classList.toggle('is-invalid', error !== null);
      if (error) this.showHint(wrap, error);
      else this.hideHint();
    });
    input.addEventListener('blur', () => void finish(true));
    input.addEventListener('pointerdown', (e) => e.stopPropagation());
    input.addEventListener('click', (e) => e.stopPropagation());
    input.addEventListener('dblclick', (e) => e.stopPropagation());
    requestAnimationFrame(() => {
      input.focus();
      const dot = node.kind === 'file' ? node.name.lastIndexOf('.') : -1;
      input.setSelectionRange(0, dot > 0 ? dot : node.name.length);
      // Виртуальная клавиатура на телефоне может перекрыть поле — подвинем в видимую область.
      input.scrollIntoView({block: 'nearest'});
    });
    return wrap;
  }

  private showHint(anchor: HTMLElement, text: string): void {
    this.hideHint();
    this.renameHint = h('div', {class: 'hint', text});
    anchor.appendChild(this.renameHint);
  }

  private hideHint(): void {
    this.renameHint?.remove();
    this.renameHint = null;
  }

  // ---------------------------------------------------------------- указатель

  /**
   * Мышь: выделение по нажатию (pressOn/release — чтобы группу можно было тащить).
   * Touch: нажатие ничего не выделяет — модель тапов живёт в {@link onClick}.
   */
  private onPointerDown(e: PointerEvent): void {
    this.lastPointerType = e.pointerType;
    if (e.button !== 0 && e.button !== 2) return;
    const itemEl = closestInPath(e, '.item');
    const mods = {ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey};
    if (itemEl?.dataset.path) {
      const path = itemEl.dataset.path;
      if (e.button === 2) {
        if (!this.deps.ctx.selection.isSelected(path)) this.deps.ctx.selection.selectOnly(path);
        return;
      }
      if (e.pointerType === 'touch') return;
      this.deps.ctx.selection.pressOn(path, mods);
      const onUp = (): void => {
        this.deps.ctx.selection.release(path, mods);
        itemEl.removeEventListener('pointerup', onUp);
      };
      itemEl.addEventListener('pointerup', onUp, {once: true});
      return;
    }
    if (e.button === 2 || e.pointerType === 'touch') return; // на touch рамка конфликтует со скроллом
    if (!mods.ctrl && !mods.shift) this.deps.ctx.selection.clear();
    this.startRubberBand(e, mods.ctrl);
  }

  /**
   * Touch-модель (как в мобильных проводниках): тап по папке — открыть; тап по файлу — выделить;
   * когда что-то уже выделено (режим выделения) — тап переключает выделение любого элемента;
   * тап по пустому месту — снять выделение. Long-press (контекстное меню) — см. onContextMenu.
   */
  private onClick(e: MouseEvent): void {
    if (this.lastPointerType !== 'touch') return;
    const itemEl = closestInPath(e, '.item');
    const path = itemEl?.dataset.path;
    const sel = this.deps.ctx.selection;
    if (!path) {
      sel.clear();
      return;
    }
    const node = this.visibleItems.peek().find((n) => n.path === path);
    if (!node) return;
    if (sel.count.peek() > 0) {
      sel.click(path, {ctrl: true});
      return;
    }
    if (isContainer(node)) {
      void this.deps.features.navigation.open(node);
    } else {
      sel.selectOnly(path);
    }
  }

  private startRubberBand(e: PointerEvent, additive: boolean): void {
    const vp = this.viewport;
    const origin = {x: e.clientX, y: e.clientY};
    const base = additive ? new Set(this.deps.ctx.selection.selectedPaths.peek()) : new Set<string>();
    let active = false;
    const toLocal = (clientX: number, clientY: number): {x: number; y: number} => {
      const r = vp.getBoundingClientRect();
      return {x: clientX - r.left + vp.scrollLeft, y: clientY - r.top + vp.scrollTop};
    };
    const start = toLocal(origin.x, origin.y);

    const onMove = (ev: PointerEvent): void => {
      if (!active) {
        if (Math.hypot(ev.clientX - origin.x, ev.clientY - origin.y) < DRAG_THRESHOLD) return;
        active = true;
        vp.setPointerCapture(ev.pointerId);
        this.rubber.hidden = false;
      }
      const cur = toLocal(ev.clientX, ev.clientY);
      const area = {left: Math.min(start.x, cur.x), top: Math.min(start.y, cur.y), width: Math.abs(cur.x - start.x), height: Math.abs(cur.y - start.y)};
      Object.assign(this.rubber.style, {left: `${area.left}px`, top: `${area.top}px`, width: `${area.width}px`, height: `${area.height}px`});
      const r = vp.getBoundingClientRect();
      if (ev.clientY > r.bottom - 20) vp.scrollTop += 12;
      else if (ev.clientY < r.top + 20) vp.scrollTop -= 12;

      const items = this.visibleItems.peek();
      const hits = new Set(base);
      for (const i of this.virtualizer.intersecting(area, items.length, vp.clientWidth)) hits.add((items[i] as Node).path);
      this.deps.ctx.selection.setSelected(hits);
    };
    const onUp = (ev: PointerEvent): void => {
      vp.removeEventListener('pointermove', onMove);
      vp.removeEventListener('pointerup', onUp);
      vp.removeEventListener('pointercancel', onUp);
      if (active) {
        vp.releasePointerCapture(ev.pointerId);
        this.rubber.hidden = true;
      }
    };
    vp.addEventListener('pointermove', onMove);
    vp.addEventListener('pointerup', onUp);
    vp.addEventListener('pointercancel', onUp);
  }

  private onDblClick(e: MouseEvent): void {
    if (this.lastPointerType === 'touch') return;
    const itemEl = closestInPath(e, '.item');
    const path = itemEl?.dataset.path;
    if (!path) return;
    const node = this.visibleItems.peek().find((n) => n.path === path);
    if (node) void this.deps.features.navigation.open(node);
  }

  private onContextMenu(e: PointerEvent | MouseEvent, at: {x: number; y: number}): void {
    const itemEl = closestInPath(e, '.item');
    const path = itemEl?.dataset.path;
    if (path) {
      if (!this.deps.ctx.selection.isSelected(path)) this.deps.ctx.selection.selectOnly(path);
      this.deps.openMenu(ITEM_MENU, at);
    } else {
      this.deps.ctx.selection.clear();
      this.deps.openMenu(FOLDER_MENU, at);
    }
  }

  // ---------------------------------------------------------------- клавиатура

  private onKeyDown(e: KeyboardEvent): void {
    const sel = this.deps.ctx.selection;
    const mods = {ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey};
    const cols = this.virtualizer.columns;
    const pageRows = Math.max(1, Math.floor(this.viewport.clientHeight / Math.max(1, this.virtualizer.cellHeight)));
    // Escape при пустом выделении закрывает результаты поиска (при непустом — Keymap снимает выделение).
    if (e.key === 'Escape' && sel.count.peek() === 0 && this.deps.ctx.search.active.peek()) {
      e.preventDefault();
      e.stopPropagation();
      void this.deps.commands.execute('search.clear');
      return;
    }
    switch (e.key) {
      case 'ArrowDown': sel.moveFocus(cols, mods); break;
      case 'ArrowUp': sel.moveFocus(-cols, mods); break;
      case 'ArrowRight': if (cols > 1) sel.moveFocus(1, mods); else return; break;
      case 'ArrowLeft': if (cols > 1) sel.moveFocus(-1, mods); else return; break;
      case 'PageDown': sel.moveFocus(pageRows * cols, mods); break;
      case 'PageUp': sel.moveFocus(-pageRows * cols, mods); break;
      case 'Home': { const first = sel.orderedPaths.peek()[0]; if (first) sel.moveFocusTo(first, mods); break; }
      case 'End': { const paths = sel.orderedPaths.peek(); const last = paths[paths.length - 1]; if (last) sel.moveFocusTo(last, mods); break; }
      case ' ':
        if (mods.ctrl) sel.toggleFocus();
        else { const f = sel.focusPath.peek(); if (f) sel.selectOnly(f); }
        break;
      default:
        if (e.key.length === 1 && !mods.ctrl && !e.altKey) {
          this.typeAheadKey(e.key);
          break;
        }
        return;
    }
    e.preventDefault();
    e.stopPropagation();
  }

  /** Набор первых букв имени переводит фокус на первый подходящий элемент (как в проводнике). */
  private typeAheadKey(key: string): void {
    if (this.typeAheadTimer) clearTimeout(this.typeAheadTimer);
    this.typeAhead += key.toLowerCase();
    this.typeAheadTimer = setTimeout(() => { this.typeAhead = ''; }, 800);
    const items = this.visibleItems.peek();
    const focus = this.deps.ctx.selection.focusPath.peek();
    const startIdx = focus ? items.findIndex((n) => n.path === focus) : -1;
    const ordered = [...items.slice(startIdx + 1), ...items.slice(0, startIdx + 1)];
    const hit = ordered.find((n) => n.name.toLowerCase().startsWith(this.typeAhead))
      ?? ordered.find((n) => naturalCompare(n.name.slice(0, this.typeAhead.length), this.typeAhead) === 0);
    if (hit) this.deps.ctx.selection.selectOnly(hit.path);
  }

  private scrollToPath(path: string): void {
    const idx = this.visibleItems.peek().findIndex((n) => n.path === path);
    if (idx < 0) return;
    const rect = this.virtualizer.rect(idx);
    const vp = this.viewport;
    if (rect.top < vp.scrollTop) vp.scrollTop = rect.top;
    else if (rect.top + rect.height > vp.scrollTop + vp.clientHeight) vp.scrollTop = rect.top + rect.height - vp.clientHeight;
  }

  // ---------------------------------------------------------------- drag & drop (через порт)

  private bindDnd(): void {
    const caps = (): ReturnType<ExplorerDeps['ctx']['capabilities']> => this.deps.ctx.capabilities();

    this.disposables.add(this.deps.dnd.source(this.viewport, {
      payload: (element) => {
        const path = element?.closest<HTMLElement>('.item')?.dataset.path;
        if (!path) return null;
        if (!this.deps.ctx.selection.isSelected(path)) this.deps.ctx.selection.selectOnly(path);
        const nodes = this.deps.ctx.selection.selectedNodes.peek();
        if (!caps().canAll('move', nodes) && !caps().canAll('copy', nodes)) return null;
        return {kind: 'nodes', paths: this.deps.ctx.selection.selectedPaths.peek()};
      },
    }));

    this.disposables.add(this.deps.dnd.target(this.viewport, {
      resolve: (_point, element) => {
        const overPath = element?.closest<HTMLElement>('.item')?.dataset.path;
        const overNode = overPath ? this.visibleItems.peek().find((n) => n.path === overPath) : undefined;
        if (overNode && isContainer(overNode)) return overNode.path;
        return this.deps.ctx.currentPath();
      },
      canDrop: (target, ctx) => this.canDrop(target, ctx),
      onHover: (target, ctx) => {
        const overItem = target !== null && target !== this.deps.ctx.currentPath();
        this.setDrop(overItem ? target : null, target !== null && !overItem && ctx?.payload === null);
      },
      onDrop: (target, ctx) => {
        if (ctx.payload) {
          void this.deps.features.transfer.transfer(ctx.copy ? 'copy' : 'move', ctx.payload.paths, target);
        } else if (ctx.dataTransfer) {
          void this.deps.features.upload.entriesFromDataTransfer(ctx.dataTransfer)
            .then((entries) => this.deps.features.upload.uploadFiles(entries, target));
        }
      },
    }));
  }

  private canDrop(target: string, ctx: DropContext): boolean {
    const targetNode = target === this.deps.ctx.currentPath() ? this.deps.ctx.currentDir() : this.deps.ctx.dirs.getNode(target);
    if (!targetNode) return false;
    if (ctx.payload) {
      // Во время dragover пути недоступны — берём текущее выделение (источник — эта же панель или дерево).
      const paths = ctx.payload.paths.length ? ctx.payload.paths : this.deps.ctx.selection.selectedPaths.peek();
      if (paths.some((p) => p === target || target.startsWith(p + '/'))) return false;
      if (!ctx.copy && target === this.deps.ctx.currentPath()) return false; // перенос в ту же папку бессмыслен
      return this.deps.ctx.capabilities().canWriteInto(targetNode, ctx.copy ? 'copy' : 'move');
    }
    return this.deps.ctx.capabilities().canWriteInto(targetNode, 'upload');
  }

  private setDrop(path: string | null, showOverlay: boolean): void {
    this.dropOverlay.hidden = !showOverlay;
    if (this.dropTarget === path) return;
    this.dropTarget = path;
    for (const [p, el] of this.rendered) el.classList.toggle('is-drop', p === path);
  }
}

if (!customElements.get('fm-content-pane')) {
  customElements.define('fm-content-pane', FmContentPane);
}
