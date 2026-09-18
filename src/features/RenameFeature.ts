/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {t} from '@/shared/i18n/i18n';
import {signal} from '@/shared/reactive/signal';
import type {Node} from '@/domain/node/Node';
import {ApiError} from '@/api/codec/ApiError';
import type {CommandRegistry} from '@/commands/CommandRegistry';
import type {CommandContext} from '@/commands/CommandContext';
import {apiErrorMessage, nameViolationMessage} from './nameMessages';
import type {Feature} from './Feature';

/**
 * Переименование. Два входа:
 *  - команда `rename` (F2) — включает inline-редактор в панели содержимого (сигнал {@link editing});
 *  - {@link commit} — вызывается редактором с новым именем; при ошибке возвращает текст, и редактор
 *    остаётся открытым для исправления.
 * Если панель не умеет inline (например, узкая раскладка), команда падает на диалог prompt.
 */
export class RenameFeature implements Feature {
  /** Путь узла, который сейчас переименовывается inline; null — нет. */
  readonly editing = signal<string | null>(null);
  private ctx!: CommandContext;
  /** Панель содержимого сообщает, умеет ли она inline-редактор. */
  inlineSupported = false;

  init(ctx: CommandContext, commands: CommandRegistry): void {
    this.ctx = ctx;
    commands.register({
      id: 'rename', group: 'file', order: 40, icon: 'rename', shortcuts: ['F2'],
      label: () => t('cmd.rename'),
      canExecute: (c) => {
        const node = c.selection.single.value;
        return node !== null && c.capabilities().can('rename', node);
      },
      execute: async (c) => {
        const node = c.selection.single.peek();
        if (!node) return;
        if (this.inlineSupported) {
          this.editing.set(node.path);
          return;
        }
        await this.viaDialog(node);
      },
    });
  }

  /** Локальная проверка имени для подсказки в редакторе. */
  validate(node: Node, value: string): string | null {
    const validator = this.ctx.session.nameValidator.peek();
    const violation = validator.validate(value);
    if (violation) return nameViolationMessage(violation);
    const normalized = validator.normalize(value);
    if (normalized === node.name) return null;
    const parent = this.ctx.dirs.directory(parentOf(node.path)).peek();
    return parent.items.some((n) => n.name === normalized) ? t('error.exists') : null;
  }

  /** Применить новое имя. Возвращает текст ошибки (редактор остаётся) либо null при успехе. */
  async commit(node: Node, value: string): Promise<string | null> {
    const name = this.ctx.session.nameValidator.peek().normalize(value.trim());
    if (name === '' || name === node.name) {
      this.editing.set(null);
      return null;
    }
    const local = this.validate(node, name);
    if (local) return local;

    try {
      const renamed = await this.ctx.queue.run({
        kind: 'rename', lane: 'mutation', label: t('queue.task.rename', {name: node.name}), paths: [node.path],
        execute: (task) => this.ctx.client.rename({path: node.path, name}, {signal: task.signal}),
      });
      this.ctx.dirs.applyReplaced(node.path, renamed);
      this.ctx.clipboard.forget([node.path]);
      this.ctx.selection.selectOnly(renamed.path);
      this.editing.set(null);
      // Переименована текущая или родительская папка — путь в адресной строке должен обновиться.
      const current = this.ctx.nav.current.peek();
      if (current === node.path || current.startsWith(node.path + '/')) {
        this.ctx.nav.replace(renamed.path + current.slice(node.path.length));
      }
      return null;
    } catch (error) {
      const apiError = ApiError.wrap(error);
      if (apiError.isAborted) {
        this.editing.set(null);
        return null;
      }
      return apiErrorMessage(apiError);
    }
  }

  cancel(): void {
    this.editing.set(null);
  }

  private async viaDialog(node: Node): Promise<void> {
    const value = await this.ctx.dialogs.prompt({
      title: t('dialog.rename.title'),
      label: t('dialog.rename.label'),
      value: node.name,
      selectStem: node.kind === 'file',
      validate: (v) => this.validate(node, v),
    });
    if (value === null) return;
    const error = await this.commit(node, value);
    if (error) await this.ctx.dialogs.error(error, t('dialog.rename.title'));
  }

  dispose(): void {
    this.editing.set(null);
  }
}

function parentOf(path: string): string {
  const idx = path.lastIndexOf('/');
  return idx <= 0 ? '/' : path.slice(0, idx);
}
