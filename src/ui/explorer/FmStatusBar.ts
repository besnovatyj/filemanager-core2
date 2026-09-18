/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {css, adoptStyles} from '@/shared/dom/css';
import {h} from '@/shared/dom/html';
import {DisposableStore} from '@/shared/lib/Disposable';
import {effect} from '@/shared/reactive/signal';
import {plural, t} from '@/shared/i18n/i18n';
import {formatBytes} from '@/shared/format/bytes';
import {VirtualPath} from '@/domain/path/VirtualPath';
import {icon} from '@/ui/icons';
import {base} from '@/ui/theme/tokens';
import type {ExplorerDeps} from './deps';

const styles = css`
  :host { display: flex; align-items: center; gap: 16px; height: var(--fm-status-height); padding: 0 12px; border-top: 1px solid var(--fm-border); background: var(--fm-bg-alt); color: var(--fm-fg-muted); font-size: 0.95em; white-space: nowrap; overflow: hidden; }
  .grow { flex: 1; }
  .badge { display: inline-flex; align-items: center; gap: 4px; }
  .badge svg { width: 12px; height: 12px; }
  button.badge { cursor: pointer; background: none; border: 0; padding: 2px 6px; border-radius: var(--fm-radius); color: inherit; }
  button.badge:hover { background: var(--fm-bg-hover); }
`;

/** Строка состояния: число элементов, выделение с суммарным размером, только чтение, активные операции. */
export class FmStatusBar extends HTMLElement {
  private deps!: ExplorerDeps;
  private readonly disposables = new DisposableStore();

  bind(deps: ExplorerDeps): void {
    this.deps = deps;
  }

  connectedCallback(): void {
    if (this.shadowRoot) return;
    const root = this.attachShadow({mode: 'open'});
    adoptStyles(root, base, styles);
    const count = h('span');
    const selected = h('span');
    const readOnly = h('span', {class: 'badge', hidden: true}, icon('lock'), h('span', {text: t('status.readOnly')}));
    const queue = h('button', {class: 'badge', type: 'button', hidden: true, on: {click: () => void this.deps.commands.execute('toggle-queue')}}, h('span', {class: 'fm-spinner'}), h('span'));
    const busy = h('span', {class: 'badge', hidden: true, role: 'status', attrs: {'aria-live': 'polite'}}, h('span', {class: 'fm-spinner'}), h('span', {text: t('status.busy')}));
    root.append(count, selected, h('span', {class: 'grow'}), readOnly, queue, busy);

    const noun = (n: number): string => plural(n, [t('noun.item.1'), t('noun.item.2'), t('noun.item.5')]);

    this.disposables.add(effect(() => {
      const search = this.deps.ctx.search;
      if (search.active.value) {
        const found = search.items.value.length;
        count.textContent = search.status.value === 'loading'
          ? t('search.loading')
          : search.status.value === 'ready'
            ? (found === 0 ? t('search.empty') : t('search.found', {count: found, noun: noun(found)}) + (search.truncated.value ? ` (${t('search.truncated', {count: found})})` : ''))
            : '';
        return;
      }
      const dir = this.deps.ctx.dirs.directory(this.deps.ctx.nav.current.value).value;
      count.textContent = dir.status === 'ready'
        ? (dir.items.length === 0 ? t('status.empty') : t('status.items', {count: dir.items.length, noun: noun(dir.items.length)}))
        : dir.status === 'loading' ? t('app.loading') : '';
    }));
    this.disposables.add(effect(() => {
      const nodes = this.deps.ctx.selection.selectedNodes.value;
      if (nodes.length === 0) {
        selected.textContent = '';
        return;
      }
      const size = nodes.reduce((sum, n) => sum + (n.size ?? 0), 0);
      const hasSize = nodes.some((n) => n.size !== null);
      selected.textContent = t('status.selected', {count: nodes.length, noun: noun(nodes.length)}) + (hasSize ? `  ${formatBytes(size)}` : '');
    }));
    this.disposables.add(effect(() => {
      const mountId = VirtualPath.parse(this.deps.ctx.nav.current.value).mount;
      readOnly.hidden = !(mountId && this.deps.ctx.session.capabilities.value.mount(mountId)?.readOnly);
    }));
    // Индикатор запросов к серверу — с задержкой 250 мс, чтобы не мигать на быстрых ответах.
    let busyTimer: ReturnType<typeof setTimeout> | null = null;
    this.disposables.add(effect(() => {
      const isBusy = this.deps.ctx.activity.busy.value;
      if (busyTimer !== null) {
        clearTimeout(busyTimer);
        busyTimer = null;
      }
      if (isBusy) {
        busyTimer = setTimeout(() => { busy.hidden = false; }, 250);
      } else {
        busy.hidden = true;
      }
    }));
    this.disposables.add(() => { if (busyTimer !== null) clearTimeout(busyTimer); });
    this.disposables.add(effect(() => {
      const active = this.deps.ctx.queue.tasks.value.filter((task) => !task.isFinished && task.status.value !== 'done');
      queue.hidden = active.length === 0;
      (queue.lastChild as HTMLElement).textContent = `${t('queue.title')}: ${active.length}`;
    }));
  }

  disconnectedCallback(): void {
    this.disposables.dispose();
  }
}

if (!customElements.get('fm-status-bar')) {
  customElements.define('fm-status-bar', FmStatusBar);
}
