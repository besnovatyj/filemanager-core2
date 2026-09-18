/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {t} from '@/shared/i18n/i18n';
import {uniqueName} from '@/domain/naming/uniqueName';
import type {CommandRegistry} from '@/commands/CommandRegistry';
import type {CommandContext} from '@/commands/CommandContext';
import {nameViolationMessage} from './nameMessages';
import type {Feature} from './Feature';

/** Создание папки: диалог с именем по умолчанию «Новая папка (N)», валидация на лету, задача в очереди. */
export class CreateFolderFeature implements Feature {
  init(_ctx: CommandContext, commands: CommandRegistry): void {
    commands.register({
      id: 'new-folder', group: 'file', order: 20, icon: 'folder-plus', shortcuts: ['Ctrl+Shift+N'],
      label: () => t('cmd.newFolder'),
      canExecute: (c) => {
        const dir = c.currentDir();
        return dir !== null && c.capabilities().canWriteInto(dir, 'mkdir');
      },
      execute: async (c) => {
        const parent = c.currentPath();
        const existing = new Set(c.dirs.directory(parent).peek().items.map((n) => n.name));
        const validator = c.session.nameValidator.peek();
        const name = await c.dialogs.prompt({
          title: t('dialog.newFolder.title'),
          label: t('dialog.newFolder.label'),
          value: uniqueName(t('dialog.newFolder.default'), (n) => existing.has(n)),
          validate: (value) => {
            const violation = validator.validate(value);
            if (violation) return nameViolationMessage(violation);
            return existing.has(validator.normalize(value)) ? t('error.exists') : null;
          },
        });
        if (name === null) return;

        const node = await c.queue.run({
          kind: 'mkdir', lane: 'mutation', label: t('queue.task.mkdir', {name}), paths: [parent],
          execute: (task) => c.client.mkdir({parent, name}, {signal: task.signal}),
        });
        c.dirs.applyAdded(node);
        c.selection.selectOnly(node.path);
      },
    });
  }

  dispose(): void {
    // подписок нет
  }
}
