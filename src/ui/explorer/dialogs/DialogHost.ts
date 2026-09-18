/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {h} from '@/shared/dom/html';
import {effect} from '@/shared/reactive/signal';
import {t} from '@/shared/i18n/i18n';
import {formatBytes} from '@/shared/format/bytes';
import {formatDateTime} from '@/shared/format/date';
import {displayName, type Node} from '@/domain/node/Node';
import type {ConflictChoice} from '@/domain/conflict/ConflictResolution';
import {ApiError} from '@/api/codec/ApiError';
import type {OperationReport} from '@/api/contract/report';
import type {Dialog, DialogStore} from '@/model/DialogStore';
import {apiErrorMessage} from '@/features';
import {FmDialog, type DialogOptions} from '@/ui/primitives/FmDialog';

/**
 * Рендерит верхний диалог из DialogStore в `<fm-dialog>` на `document.body`.
 * Каждому виду запроса — своя функция сборки тела и кнопок; результат уходит в `resolve`.
 */
export class DialogHost {
  private stop: (() => void) | null = null;
  private currentId: string | null = null;
  private element: FmDialog | null = null;

  constructor(private readonly dialogs: DialogStore, private readonly theme: () => string | null) {}

  attach(): void {
    this.stop = effect(() => {
      const dialog = this.dialogs.current.value;
      if (dialog?.id === this.currentId) return;
      this.element?.remove();
      this.element = null;
      this.currentId = dialog?.id ?? null;
      if (dialog) this.show(dialog);
    });
  }

  detach(): void {
    this.stop?.();
    this.element?.remove();
    this.element = null;
  }

  private show(dialog: Dialog): void {
    const el = new FmDialog();
    const theme = this.theme();
    if (theme) el.dataset.theme = theme;
    document.body.appendChild(el);
    this.element = el;
    const done = (): void => this.dialogs.close(dialog.id);
    const r = dialog.request;
    let options: DialogOptions;
    switch (r.kind) {
      case 'confirm':
        options = {
          title: r.title, icon: r.danger ? 'warning' : 'info', body: h('p', {text: r.message}),
          buttons: [
            {label: r.confirmLabel ?? t('dialog.ok'), variant: r.danger ? 'danger' : 'primary', isDefault: true, onClick: () => { r.resolve(true); done(); }},
            {label: t('dialog.cancel'), onClick: () => { r.resolve(false); done(); }},
          ],
          onCancel: () => { r.resolve(false); done(); },
        };
        break;
      case 'prompt': {
        const input = h('input', {class: 'fm-input', type: 'text', value: r.value, attrs: {spellcheck: 'false'}});
        const hint = h('div', {class: 'fm-danger', style: {minHeight: '1.4em', marginTop: '4px'}});
        input.addEventListener('input', () => { hint.textContent = r.validate?.(input.value) ?? ''; input.classList.toggle('is-invalid', hint.textContent !== ''); });
        if (r.selectStem) {
          requestAnimationFrame(() => { const dot = r.value.lastIndexOf('.'); input.setSelectionRange(0, dot > 0 ? dot : r.value.length); });
        }
        options = {
          title: r.title, body: h('div', {}, h('label', {text: r.label, style: {display: 'block', marginBottom: '4px'}}), input, hint),
          initialFocus: input,
          buttons: [
            {label: t('dialog.ok'), variant: 'primary', isDefault: true, onClick: () => {
              const error = r.validate?.(input.value) ?? null;
              if (error) { hint.textContent = error; input.classList.add('is-invalid'); input.focus(); return false; }
              r.resolve(input.value); done(); return true;
            }},
            {label: t('dialog.cancel'), onClick: () => { r.resolve(null); done(); }},
          ],
          onCancel: () => { r.resolve(null); done(); },
        };
        break;
      }
      case 'conflict': {
        const applyAll = h('input', {type: 'checkbox', id: 'apply-all'});
        const choose = (strategy: ConflictChoice['strategy']) => (): void => { r.resolve({strategy, applyToAll: applyAll.checked}); done(); };
        options = {
          title: t('dialog.conflict.title'), icon: 'warning',
          body: h('div', {}, h('p', {text: t('dialog.conflict.question', {name: r.name})}),
            r.remaining > 1 ? h('label', {style: {display: 'flex', gap: '6px', alignItems: 'center'}}, applyAll, h('span', {text: `${t('dialog.conflict.applyAll')} (${r.remaining})`})) : null),
          buttons: [
            {label: t('dialog.conflict.overwrite'), variant: 'primary', isDefault: true, onClick: choose('overwrite')},
            {label: t('dialog.conflict.rename'), onClick: choose('rename')},
            {label: t('dialog.conflict.skip'), onClick: choose('skip')},
            {label: t('dialog.cancel'), variant: 'ghost', onClick: () => { r.resolve(null); done(); }},
          ],
          onCancel: () => { r.resolve(null); done(); },
        };
        break;
      }
      case 'error': {
        const message = typeof r.error === 'string' ? r.error : r.error instanceof ApiError ? apiErrorMessage(r.error) : r.error.message;
        const details = r.error instanceof ApiError && r.error.path ? h('div', {class: 'fm-muted', text: r.error.path, style: {marginTop: '6px', wordBreak: 'break-all'}}) : null;
        options = {
          title: r.title || t('dialog.error.title'), icon: 'danger', body: h('div', {}, h('p', {text: message, style: {whiteSpace: 'pre-line'}}), details),
          buttons: [{label: t('dialog.ok'), variant: 'primary', isDefault: true, onClick: () => { r.resolve(); done(); }}],
          onCancel: () => { r.resolve(); done(); },
        };
        break;
      }
      case 'report':
        options = {
          title: r.title, icon: r.report.failed > 0 ? 'warning' : 'info', wide: true, body: reportBody(r.report),
          buttons: [{label: t('dialog.ok'), variant: 'primary', isDefault: true, onClick: () => { r.resolve(); done(); }}],
          onCancel: () => { r.resolve(); done(); },
        };
        break;
      case 'properties': {
        // Сначала — данные листинга с пометкой загрузки; после stat тело заменяется точными данными.
        const body = h('div', {}, propertiesBody(r.nodes, null), h('div', {class: 'fm-muted', style: {display: 'flex', gap: '6px', alignItems: 'center', marginTop: '8px'}}, h('span', {class: 'fm-spinner'}), h('span', {text: t('app.loading')})));
        void r.detailed.then((node) => {
          if (el.isConnected) body.replaceChildren(propertiesBody(r.nodes, node));
        });
        options = {
          title: t('dialog.properties.title'), body,
          buttons: [{label: t('dialog.ok'), variant: 'primary', isDefault: true, onClick: () => { r.resolve(); done(); }}],
          onCancel: () => { r.resolve(); done(); },
        };
        break;
      }
      default:
        throw new Error('[DialogHost] неизвестный вид диалога');
    }
    el.show(options);
  }
}

function reportBody(report: OperationReport): HTMLElement {
  const rows = report.items.filter((i) => i.status !== 'ok').map((i) =>
    h('tr', {}, h('td', {class: 'fm-truncate', text: i.source, title: i.source, style: {maxWidth: '260px'}}),
      h('td', {text: i.status === 'skipped' ? t('dialog.conflict.skip') : (i.error ? apiErrorMessage(ApiError.fromBody(i.error)) : t('queue.status.failed'))})));
  return h('div', {}, h('p', {text: t('dialog.report.summary', {ok: report.succeeded, skipped: report.skipped, failed: report.failed})}),
    rows.length ? h('table', {style: {width: '100%', borderCollapse: 'collapse'}}, h('tbody', {}, ...rows)) : null);
}

function propertiesBody(nodes: Node[], detailed: Node | null): HTMLElement {
  const row = (label: string, value: string | null, breakAll = false): HTMLElement | null => value === null || value === '' ? null
    : h('tr', {}, h('th', {text: label, style: {textAlign: 'left', paddingRight: '12px', whiteSpace: 'nowrap', verticalAlign: 'top', color: 'var(--fm-fg-muted)', fontWeight: '500'}}),
      h('td', {text: value, style: breakAll ? {wordBreak: 'break-all'} : {}}));
  if (nodes.length > 1) {
    const size = nodes.reduce((s, n) => s + (n.size ?? 0), 0);
    return h('table', {}, h('tbody', {},
      row(t('dialog.properties.selection', {count: nodes.length}), ''),
      row(t('dialog.properties.size'), formatBytes(size)),
      row(t('dialog.properties.path'), nodes.map((n) => n.path).slice(0, 5).join('\n') + (nodes.length > 5 ? '\n…' : ''), true)));
  }
  const node = detailed ?? (nodes[0] as Node);
  const kind = node.kind === 'dir' ? t('kind.dir') : node.kind === 'mount' ? t('kind.mount') : node.ext ? t('kind.file.ext', {ext: node.ext.toUpperCase()}) : t('kind.file');
  const image = node.meta?.image;
  return h('table', {}, h('tbody', {},
    row(t('column.name'), displayName(node)),
    row(t('dialog.properties.kind'), kind),
    row(t('dialog.properties.path'), node.path, true),
    node.kind === 'file' ? row(t('dialog.properties.size'), formatBytes(node.size)) : null,
    row(t('dialog.properties.mtime'), formatDateTime(node.mtime)),
    node.mime ? row(t('dialog.properties.mime'), node.mime) : null,
    image ? row(t('dialog.properties.dimensions'), `${image.width} × ${image.height}`) : null,
    node.url ? row(t('dialog.properties.url'), node.url, true) : null,
  ));
}
