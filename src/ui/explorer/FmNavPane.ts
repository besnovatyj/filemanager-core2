/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {css, adoptStyles} from '@/shared/dom/css';
import {h} from '@/shared/dom/html';
import {DisposableStore, listen} from '@/shared/lib/Disposable';
import {effect, signal} from '@/shared/reactive/signal';
import {t} from '@/shared/i18n/i18n';
import {onContextMenu, closestInPath} from '@/shared/dom/pointer';
import {displayName, type Node} from '@/domain/node/Node';
import {VirtualPath} from '@/domain/path/VirtualPath';
import {sortNodes} from '@/domain/sorting/comparators';
import {folderIcon, icon} from '@/ui/icons';
import {base} from '@/ui/theme/tokens';
import {ITEM_MENU, type ExplorerDeps} from './deps';

const styles = css`
  :host { display: block; overflow: auto; background: var(--fm-bg-alt); user-select: none; outline: none; }
  .row {
    display: flex; align-items: center; gap: 4px; height: var(--fm-row-height); padding-right: 8px; cursor: default; white-space: nowrap;
  }
  .row:hover { background: var(--fm-bg-hover); }
  .row.is-current { background: var(--fm-bg-selected); }
  :host(:not(:focus-within)) .row.is-current { background: var(--fm-bg-selected-inactive); }
  .row.is-focused { outline: 1px dotted var(--fm-focus); outline-offset: -1px; }
  .row.is-drop { background: var(--fm-bg-drop); outline: 1px solid var(--fm-accent); outline-offset: -1px; }
  .chevron { width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; flex: none; color: var(--fm-fg-muted); border-radius: var(--fm-radius); }
  .chevron:hover { background: var(--fm-bg-hover); color: var(--fm-fg); }
  .chevron svg { width: 12px; height: 12px; }
  .chevron.is-leaf { visibility: hidden; }
  .chevron.is-loading svg { display: none; }
  .chevron.is-loading::after { content: ""; width: 10px; height: 10px; border: 2px solid var(--fm-border); border-top-color: var(--fm-accent); border-radius: 50%; animation: fm-spin 0.8s linear infinite; }
  .label { overflow: hidden; text-overflow: ellipsis; }
  .ro { color: var(--fm-fg-muted); width: 12px; height: 12px; margin-left: 4px; }
`;

interface TreeRow {
  node: Node;
  depth: number;
  expanded: boolean;
  loading: boolean;
  /** null — неизвестно (нужна подгрузка), false — точно нет детей. */
  hasChildren: boolean | null;
}

/**
 * Панель навигации — дерево «Этот компьютер → хранилища → папки» с ленивой подгрузкой
 * (`tree`-операция). Текущая папка подсвечена, её предки раскрываются автоматически.
 * Принимает drop (перемещение/копирование узлов, загрузка файлов из ОС).
 */
export class FmNavPane extends HTMLElement {
  private deps!: ExplorerDeps;
  private readonly disposables = new DisposableStore();
  private readonly expanded = signal<ReadonlySet<string>>(new Set());
  private readonly focused = signal<string | null>(null);
  private rows: TreeRow[] = [];
  private dropTarget: string | null = null;

  bind(deps: ExplorerDeps): void {
    this.deps = deps;
  }

  connectedCallback(): void {
    if (this.shadowRoot) return;
    const root = this.attachShadow({mode: 'open'});
    adoptStyles(root, base, styles);
    this.tabIndex = 0;
    this.setAttribute('role', 'tree');

    // Автораскрытие предков текущего пути + подгрузка их поддеревьев.
    this.disposables.add(effect(() => {
      const current = this.deps.ctx.nav.current.value;
      const vp = VirtualPath.parse(current);
      const root = this.deps.ctx.nav.root;
      // Раскрываем только предков внутри области: выше корня области дерево не показывается.
      const toExpand = [...vp.ancestors(), vp].map(String).filter((p) => this.deps.ctx.nav.within(p));
      if (!toExpand.includes(root)) toExpand.unshift(root);
      this.expanded.update((set) => {
        const next = new Set(set);
        for (const p of toExpand) next.add(p);
        return next;
      });
      for (const p of toExpand) void this.deps.ctx.dirs.loadTree(p).catch(() => undefined);
      this.focused.set(current);
    }));

    // Перерисовка при любом изменении дерева/раскрытия/текущего пути.
    this.disposables.add(effect(() => this.render()));

    this.disposables.add(listen(this, 'click', (e) => this.onClick(e)));
    this.disposables.add(listen(this, 'dblclick', (e) => {
      const row = closestInPath(e, '.row');
      if (row?.dataset.path) this.toggle(row.dataset.path);
    }));
    this.disposables.add(listen(this, 'keydown', (e) => this.onKeyDown(e)));
    this.disposables.add(onContextMenu(this, (e, at) => {
      const row = closestInPath(e, '.row');
      const path = row?.dataset.path;
      if (!path) return;
      this.deps.ctx.nav.navigate(path);
      // Меню элемента открываем для папки как для «текущей»: команды над пустым местом.
      this.deps.openMenu(path === this.deps.ctx.nav.current.peek() ? ['new-folder', 'upload', 'paste', '|', 'refresh', '|', 'properties'] : ITEM_MENU, at);
    }));
    this.bindDnd();
  }

  disconnectedCallback(): void {
    this.disposables.dispose();
  }

  // ---------------------------------------------------------------- рендер

  private collect(path: string, depth: number, out: TreeRow[]): void {
    const state = this.deps.ctx.dirs.tree(path).value;
    const expandedSet = this.expanded.value;
    const node = path === '/' ? this.rootNode() : this.deps.ctx.dirs.getNode(path) ?? state.node ?? (path === this.deps.ctx.nav.root ? this.scopeRootNode(path) : null);
    if (!node) return;
    const isExpanded = expandedSet.has(path);
    const hasChildren = state.status === 'ready' ? state.items.length > 0 : (node.meta?.hasChildren ?? null);
    out.push({node, depth, expanded: isExpanded && hasChildren !== false, loading: state.status === 'loading', hasChildren});
    if (isExpanded && state.status === 'ready') {
      const children = path === '/' ? state.items : sortNodes(state.items, {by: 'name', dir: 'asc'});
      for (const child of children) this.collect(child.path, depth + 1, out);
    }
  }

  private rootNode(): Node {
    return {path: '/', name: '', kind: 'dir', mount: null, size: null, mtime: null, mime: null, ext: null, url: null, visibility: null, meta: {label: t('app.root'), hasChildren: true}};
  }

  /** Корень области, пока его листинг не загружен: синтетический узел по пути. */
  private scopeRootNode(path: string): Node {
    const vp = VirtualPath.parse(path);
    return {path, name: vp.name, kind: vp.isMountRoot ? 'mount' : 'dir', mount: vp.mount, size: null, mtime: null, mime: null, ext: null, url: null, visibility: null, meta: {hasChildren: null}};
  }

  private render(): void {
    const rows: TreeRow[] = [];
    this.collect(this.deps.ctx.nav.root, 0, rows);
    this.rows = rows;
    const current = this.deps.ctx.nav.current.value;
    const focused = this.focused.value;
    const root = this.shadowRoot as ShadowRoot;
    root.replaceChildren(...rows.map((row) => this.renderRow(row, row.node.path === current, row.node.path === focused)));
  }

  private renderRow(row: TreeRow, isCurrent: boolean, isFocused: boolean): HTMLElement {
    const chevron = h('span', {class: `chevron${row.hasChildren === false ? ' is-leaf' : ''}${row.loading ? ' is-loading' : ''}`, attrs: {'data-action': 'toggle'}},
      icon(row.expanded ? 'chevron-down' : 'chevron-right'));
    const iconEl = row.node.path === '/' ? icon('computer')
      : row.node.kind === 'mount' ? icon(row.node.meta?.icon === 'archive' ? 'archive' : row.node.meta?.icon === 'cloud' ? 'cloud' : 'drive')
        : folderIcon(16, isCurrent);
    const el = h('div', {
      class: `row${isCurrent ? ' is-current' : ''}${isFocused ? ' is-focused' : ''}${this.dropTarget === row.node.path ? ' is-drop' : ''}`,
      role: 'treeitem',
      attrs: {'data-path': row.node.path, 'aria-expanded': row.hasChildren === false ? null : String(row.expanded), 'aria-selected': String(isCurrent), 'aria-level': row.depth + 1},
      style: {paddingLeft: `${8 + row.depth * 16}px`},
    }, chevron, iconEl, h('span', {class: 'label', text: displayName(row.node)}),
    row.node.kind === 'mount' && row.node.meta?.readOnly ? icon('lock', 'fm-icon ro') : null);
    return el;
  }

  // ---------------------------------------------------------------- взаимодействие

  private onClick(e: MouseEvent): void {
    const row = closestInPath(e, '.row');
    const path = row?.dataset.path;
    if (!path) return;
    if (closestInPath(e, '[data-action="toggle"]')) {
      this.toggle(path);
      return;
    }
    this.focused.set(path);
    this.deps.ctx.nav.navigate(path);
  }

  private toggle(path: string): void {
    const set = new Set(this.expanded.peek());
    if (set.has(path)) set.delete(path);
    else {
      set.add(path);
      void this.deps.ctx.dirs.loadTree(path).catch(() => undefined);
    }
    this.expanded.set(set);
  }

  private onKeyDown(e: KeyboardEvent): void {
    const paths = this.rows.map((r) => r.node.path);
    const idx = paths.indexOf(this.focused.peek() ?? '');
    const row = this.rows[idx];
    switch (e.key) {
      case 'ArrowDown':
        this.focused.set(paths[Math.min(paths.length - 1, idx + 1)] ?? null);
        break;
      case 'ArrowUp':
        this.focused.set(paths[Math.max(0, idx - 1)] ?? null);
        break;
      case 'ArrowRight':
        if (row && !row.expanded && row.hasChildren !== false) this.toggle(row.node.path);
        else this.focused.set(paths[Math.min(paths.length - 1, idx + 1)] ?? null);
        break;
      case 'ArrowLeft':
        if (row && row.expanded) this.toggle(row.node.path);
        else if (row) {
          const parent = VirtualPath.parse(row.node.path).parent();
          if (parent && this.deps.ctx.nav.within(parent.toString())) this.focused.set(parent.toString());
        }
        break;
      case 'Enter':
      case ' ':
        if (row) this.deps.ctx.nav.navigate(row.node.path);
        break;
      case 'Home':
        this.focused.set(paths[0] ?? null);
        break;
      case 'End':
        this.focused.set(paths[paths.length - 1] ?? null);
        break;
      default:
        return;
    }
    e.preventDefault();
    e.stopPropagation();
    this.shadowRoot?.querySelector('.row.is-focused')?.scrollIntoView({block: 'nearest'});
  }

  // ---------------------------------------------------------------- drag & drop (приём, через порт)

  private bindDnd(): void {
    this.disposables.add(this.deps.dnd.target(this, {
      resolve: (_point, element) => {
        const path = element?.closest<HTMLElement>('.row')?.dataset.path;
        return path && path !== '/' ? path : null;
      },
      canDrop: (target, ctx) => {
        const node = this.deps.ctx.dirs.getNode(target) ?? this.rows.find((r) => r.node.path === target)?.node;
        if (!node) return false;
        if (ctx.payload) {
          const paths = ctx.payload.paths.length ? ctx.payload.paths : this.deps.ctx.selection.selectedPaths.peek();
          if (paths.some((p) => p === target || target.startsWith(p + '/'))) return false;
          return this.deps.ctx.capabilities().canWriteInto(node, ctx.copy ? 'copy' : 'move');
        }
        return this.deps.ctx.capabilities().canWriteInto(node, 'upload');
      },
      onHover: (target) => this.setDropTarget(target),
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

  private setDropTarget(path: string | null): void {
    if (this.dropTarget === path) return;
    this.dropTarget = path;
    this.shadowRoot?.querySelectorAll('.row').forEach((el) => {
      el.classList.toggle('is-drop', (el as HTMLElement).dataset.path === path);
    });
  }
}

if (!customElements.get('fm-nav-pane')) {
  customElements.define('fm-nav-pane', FmNavPane);
}
