/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {css, adoptStyles} from '@/shared/dom/css';
import {h} from '@/shared/dom/html';
import {DisposableStore} from '@/shared/lib/Disposable';
import {effect, untracked} from '@/shared/reactive/signal';
import {t} from '@/shared/i18n/i18n';
import {formatBytes} from '@/shared/format/bytes';
import {formatDateTime} from '@/shared/format/date';
import {displayName, isImage, isText, type Node} from '@/domain/node/Node';
import {ApiError} from '@/api/codec/ApiError';
import {fileIcon, folderIcon, icon} from '@/ui/icons';
import {base} from '@/ui/theme/tokens';
import type {ExplorerDeps} from './deps';

const styles = css`
  :host { display: flex; flex-direction: column; min-width: 0; min-height: 0; background: var(--fm-bg-alt); border-left: 1px solid var(--fm-border); overflow: hidden; }
  header { display: flex; align-items: center; gap: 8px; padding: 6px 8px 6px 12px; border-bottom: 1px solid var(--fm-border); font-weight: 600; min-height: 36px; }
  header .name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  header .close { display: none; }
  :host([narrow]) header .close { display: inline-flex; }
  .body { flex: 1; overflow: auto; display: flex; flex-direction: column; gap: 12px; padding: 12px; }
  .media { display: flex; align-items: center; justify-content: center; min-height: 120px; background: var(--fm-bg); border: 1px solid var(--fm-border); border-radius: var(--fm-radius); overflow: hidden; }
  .media img { max-width: 100%; max-height: 50vh; object-fit: contain; display: block; }
  .media .big { width: 64px; height: 64px; }
  .media .big svg { width: 100%; height: 100%; }
  .text { margin: 0; padding: 8px; background: var(--fm-bg); border: 1px solid var(--fm-border); border-radius: var(--fm-radius); font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; white-space: pre-wrap; word-break: break-word; max-height: 50vh; overflow: auto; user-select: text; }
  .hint { color: var(--fm-fg-muted); font-size: 0.92em; display: flex; align-items: center; gap: 6px; }
  table { border-collapse: collapse; width: 100%; }
  th { text-align: left; padding: 3px 8px 3px 0; color: var(--fm-fg-muted); font-weight: 500; white-space: nowrap; vertical-align: top; width: 1%; }
  td { padding: 3px 0; word-break: break-all; user-select: text; }
  .empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--fm-fg-muted); text-align: center; padding: 24px; }
  .actions { display: flex; gap: 8px; }
`;

/** Сколько байт текста запрашивать для предпросмотра (полный файл не нужен). */
const TEXT_PREVIEW_BYTES = 64 * 1024;
/** Пауза после смены выделения, чтобы не дёргать сервер при прокрутке стрелками. */
const DEBOUNCE_MS = 200;

/**
 * Область предпросмотра (правая панель): один выбранный узел — изображение / начало текстового
 * файла / метаданные; для остальных типов — иконка и скачивание. Ничего не запрашивает, пока
 * панель скрыта; смена выделения отменяет незавершённый запрос (AbortController).
 *
 * Источник картинки: публичный `url` узла, а если его нет — операция `preview` бэкенда
 * (только растровые форматы, тип по содержимому — см. SECURITY.md).
 */
export class FmPreviewPane extends HTMLElement {
  private deps!: ExplorerDeps;
  private readonly disposables = new DisposableStore();
  private body!: HTMLElement;
  private heading!: HTMLElement;
  private abort: AbortController | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  bind(deps: ExplorerDeps): void {
    this.deps = deps;
  }

  connectedCallback(): void {
    if (this.shadowRoot) return;
    const root = this.attachShadow({mode: 'open'});
    adoptStyles(root, base, styles);
    this.heading = h('span', {class: 'name'});
    this.body = h('div', {class: 'body'});
    root.append(
      h('header', {}, icon('panel-right'), this.heading,
        h('button', {class: 'fm-btn fm-btn--icon close', type: 'button', title: t('dialog.close'), on: {click: () => this.deps.ctx.view.previewVisible.set(false)}}, icon('close'))),
      this.body,
    );

    this.disposables.add(effect(() => { this.toggleAttribute('narrow', this.deps.ctx.viewport.narrow.value); }));
    // Реакция на выделение — с паузой: при навигации стрелками сервер не должен получать запрос на каждый шаг.
    this.disposables.add(effect(() => {
      const visible = this.deps.ctx.view.previewVisible.value;
      const single = this.deps.ctx.selection.single.value;
      const count = this.deps.ctx.selection.count.value;
      const dir = this.deps.ctx.currentDir();
      if (!visible) return;
      this.cancelPending();
      this.timer = setTimeout(() => untracked(() => this.render(single, count, dir)), DEBOUNCE_MS);
    }));
  }

  disconnectedCallback(): void {
    this.cancelPending();
    this.disposables.dispose();
  }

  private cancelPending(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.abort?.abort();
    this.abort = null;
  }

  private render(single: Node | null, count: number, dir: Node | null): void {
    const node = single ?? (count === 0 ? dir : null);
    this.heading.textContent = node ? displayName(node) : '';
    if (!node) {
      this.body.replaceChildren(h('div', {class: 'empty'}, icon('info'), h('span', {text: count > 1 ? t('preview.multiple') : t('preview.select')})));
      return;
    }
    const media = h('div', {class: 'media'});
    const meta = this.metaTable(node);
    const actions = h('div', {class: 'actions'});
    if (node.kind === 'file' && this.deps.commands.get('download')) {
      actions.appendChild(h('button', {class: 'fm-btn fm-btn--outline', type: 'button', on: {click: () => void this.deps.commands.execute('download')}}, icon('download'), h('span', {text: t('cmd.download')})));
    }
    this.body.replaceChildren(media, meta, actions);

    if (node.kind !== 'file') {
      media.appendChild(h('div', {class: 'big'}, node.kind === 'mount' ? icon('drive') : folderIcon(64)));
      return;
    }
    if (isImage(node) && node.ext !== 'svg') {
      this.renderImage(node, media, meta);
      return;
    }
    if (isText(node) && this.deps.ctx.capabilities().can('content', node)) {
      this.renderText(node, media);
      return;
    }
    media.appendChild(h('div', {class: 'big'}, fileIcon(node.ext, 64)));
    media.appendChild(h('div', {class: 'hint', text: t('preview.unavailable'), style: {marginLeft: '12px'}}));
  }

  private renderImage(node: Node, media: HTMLElement, meta: HTMLElement): void {
    const caps = this.deps.ctx.capabilities();
    const src = node.url && /^(https?:\/\/|\/)/.test(node.url)
      ? node.url
      : (caps.can('preview', node) ? this.deps.ctx.client.previewUrl(node.path) : null);
    if (!src) {
      media.appendChild(h('div', {class: 'big'}, fileIcon(node.ext, 64)));
      return;
    }
    const spinner = h('span', {class: 'fm-spinner'});
    media.appendChild(spinner);
    const img = h('img', {attrs: {alt: displayName(node), src, draggable: 'false'}, hidden: true});
    img.addEventListener('load', () => {
      spinner.remove();
      img.hidden = false;
      this.appendRow(meta, t('dialog.properties.dimensions'), `${img.naturalWidth} × ${img.naturalHeight}`);
    });
    img.addEventListener('error', () => {
      spinner.remove();
      img.remove();
      media.append(h('div', {class: 'big'}, fileIcon(node.ext, 64)), h('div', {class: 'hint', text: t('preview.failed'), style: {marginLeft: '12px'}}));
    });
    media.appendChild(img);
  }

  private renderText(node: Node, media: HTMLElement): void {
    media.appendChild(h('span', {class: 'fm-spinner'}));
    const controller = new AbortController();
    this.abort = controller;
    this.deps.ctx.client.content({path: node.path, maxBytes: TEXT_PREVIEW_BYTES}, {signal: controller.signal}).then((res) => {
      if (controller.signal.aborted) return;
      const pre = h('pre', {class: 'text', text: res.binary ? '' : res.content});
      media.replaceWith(pre);
      if (res.binary) pre.replaceWith(h('div', {class: 'media'}, h('div', {class: 'big'}, fileIcon(node.ext, 64)), h('div', {class: 'hint', text: t('preview.binary'), style: {marginLeft: '12px'}})));
      else if (res.truncated) pre.insertAdjacentElement('afterend', h('div', {class: 'hint'}, icon('info'), h('span', {text: t('preview.truncated')})));
    }).catch((error: unknown) => {
      if (controller.signal.aborted || ApiError.wrap(error).isAborted) return;
      media.replaceChildren(h('div', {class: 'big'}, fileIcon(node.ext, 64)), h('div', {class: 'hint fm-danger', text: t('preview.failed'), style: {marginLeft: '12px'}}));
    });
  }

  private metaTable(node: Node): HTMLElement {
    const table = h('table', {}, h('tbody'));
    const kind = node.kind === 'dir' ? t('kind.dir') : node.kind === 'mount' ? t('kind.mount') : node.ext ? t('kind.file.ext', {ext: node.ext.toUpperCase()}) : t('kind.file');
    this.appendRow(table, t('dialog.properties.kind'), kind);
    if (node.kind === 'file') this.appendRow(table, t('dialog.properties.size'), formatBytes(node.size));
    if (node.mtime !== null) this.appendRow(table, t('dialog.properties.mtime'), formatDateTime(node.mtime));
    if (node.mime) this.appendRow(table, t('dialog.properties.mime'), node.mime);
    this.appendRow(table, t('dialog.properties.path'), node.path);
    if (node.url) this.appendRow(table, t('dialog.properties.url'), node.url);
    return table;
  }

  private appendRow(table: HTMLElement, label: string, value: string): void {
    (table.querySelector('tbody') as HTMLElement).appendChild(h('tr', {}, h('th', {text: label}), h('td', {text: value})));
  }
}

if (!customElements.get('fm-preview-pane')) {
  customElements.define('fm-preview-pane', FmPreviewPane);
}
