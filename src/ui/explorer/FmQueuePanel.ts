/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {css, adoptStyles} from '@/shared/dom/css';
import {h} from '@/shared/dom/html';
import {DisposableStore} from '@/shared/lib/Disposable';
import {effect} from '@/shared/reactive/signal';
import {t} from '@/shared/i18n/i18n';
import type {Task} from '@/domain/operations/Task';
import {ApiError} from '@/api/codec/ApiError';
import {icon} from '@/ui/icons';
import {base} from '@/ui/theme/tokens';
import {apiErrorMessage} from '@/features';
import type {ExplorerDeps} from './deps';

const styles = css`
  :host { display: flex; flex-direction: column; max-height: 180px; border-top: 1px solid var(--fm-border); background: var(--fm-bg); }
  header { display: flex; align-items: center; gap: 8px; padding: 4px 8px; font-weight: 600; border-bottom: 1px solid var(--fm-border); }
  header .grow { flex: 1; }
  .list { overflow: auto; }
  .empty { padding: 8px 12px; color: var(--fm-fg-muted); }
  .task { display: grid; grid-template-columns: 1fr auto 28px; align-items: center; gap: 8px; padding: 4px 8px; }
  .task .label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .task .status { color: var(--fm-fg-muted); font-size: 0.92em; }
  .task .status.is-failed { color: var(--fm-danger); }
  .task .status.is-done { color: var(--fm-success); }
  .bar { grid-column: 1 / -1; height: 3px; background: var(--fm-border); border-radius: 2px; overflow: hidden; }
  .bar > i { display: block; height: 100%; background: var(--fm-accent); transition: width 0.15s; }
  .bar.is-indeterminate > i { width: 30% !important; animation: fm-indeterminate 1.2s infinite linear; }
  @keyframes fm-indeterminate { from { transform: translateX(-100%); } to { transform: translateX(400%); } }
`;

/** Панель операций: каждая задача очереди — строка с прогрессом и кнопкой отмены. */
export class FmQueuePanel extends HTMLElement {
  private deps!: ExplorerDeps;
  private readonly disposables = new DisposableStore();
  private readonly rowDisposers = new Map<string, () => void>();
  private list!: HTMLElement;

  bind(deps: ExplorerDeps): void {
    this.deps = deps;
  }

  connectedCallback(): void {
    if (this.shadowRoot) return;
    const root = this.attachShadow({mode: 'open'});
    adoptStyles(root, base, styles);
    this.list = h('div', {class: 'list'});
    root.append(
      h('header', {}, icon('tasks'), h('span', {text: t('queue.title')}), h('span', {class: 'grow'}),
        h('button', {class: 'fm-btn', type: 'button', text: t('queue.clear'), on: {click: () => this.deps.ctx.queue.clearFinished()}}),
        h('button', {class: 'fm-btn fm-btn--icon', type: 'button', title: t('dialog.close'), on: {click: () => this.deps.ctx.view.queuePaneVisible.set(false)}}, icon('close'))),
      this.list,
    );
    this.disposables.add(effect(() => this.render(this.deps.ctx.queue.tasks.value)));
  }

  disconnectedCallback(): void {
    this.disposables.dispose();
    for (const d of this.rowDisposers.values()) d();
    this.rowDisposers.clear();
  }

  private render(tasks: readonly Task[]): void {
    for (const d of this.rowDisposers.values()) d();
    this.rowDisposers.clear();
    if (tasks.length === 0) {
      this.list.replaceChildren(h('div', {class: 'empty', text: t('queue.empty')}));
      return;
    }
    this.list.replaceChildren(...[...tasks].reverse().map((task) => this.renderTask(task)));
  }

  private renderTask(task: Task): HTMLElement {
    const status = h('span', {class: 'status'});
    const fill = h('i');
    const bar = h('div', {class: 'bar'}, fill);
    const cancel = h('button', {class: 'fm-btn fm-btn--icon', type: 'button', title: t('queue.cancel'), on: {click: () => task.cancel()}}, icon('cancel'));
    const row = h('div', {class: 'task'}, h('span', {class: 'label', text: task.label, title: task.label}), status, cancel, bar);
    const dispose = effect(() => {
      const s = task.status.value;
      const p = task.progress.value;
      status.className = `status is-${s}`;
      status.textContent = s === 'failed' ? apiErrorMessage(ApiError.wrap(task.error)) : t(`queue.status.${s}`);
      cancel.hidden = task.isFinished;
      bar.hidden = s !== 'running' && s !== 'queued';
      bar.classList.toggle('is-indeterminate', s === 'running' && p === null);
      fill.style.width = `${Math.round((p ?? 0) * 100)}%`;
    });
    this.rowDisposers.set(task.id, dispose);
    return row;
  }
}

if (!customElements.get('fm-queue-panel')) {
  customElements.define('fm-queue-panel', FmQueuePanel);
}
