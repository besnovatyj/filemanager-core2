/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {t} from '@/shared/i18n/i18n';
import type {Node} from '@/domain/node/Node';
import {parentPathOf} from '@/domain/node/Node';
import type {CommandRegistry} from '@/commands/CommandRegistry';
import type {CommandContext} from '@/commands/CommandContext';
import type {Feature} from './Feature';

/**
 * Архивы (контракт §9.16–9.17): «Добавить в архив» собирает ZIP из выделения в текущей папке,
 * «Извлечь» распаковывает выбранный `.zip` в новую папку рядом с ним. Обе операции идут через
 * очередь (полоса `mutation`), результат применяется к кэшу фактами; конфликт имён решается
 * стратегией `rename` — как делает проводник («archive (2).zip»), без вопросов пользователю.
 */
export class ArchiveFeature implements Feature {
  private ctx!: CommandContext;

  init(ctx: CommandContext, commands: CommandRegistry): void {
    this.ctx = ctx;
    commands.registerAll([
      {
        id: 'archive', group: 'file', order: 70, icon: 'archive',
        label: () => t('cmd.archive'),
        canExecute: (c) => {
          const dir = c.currentDir();
          const nodes = c.selectedNodes();
          return dir !== null && nodes.length > 0 && !c.search.active.value
            && c.capabilities().can('archive', dir) && c.capabilities().canAll('download', nodes);
        },
        execute: (c) => this.archive([...c.selectedNodes()], c.currentPath()),
      },
      {
        id: 'extract', group: 'file', order: 71, icon: 'extract',
        label: () => t('cmd.extract'),
        canExecute: (c) => {
          const nodes = c.selectedNodes();
          const node = nodes[0];
          if (nodes.length !== 1 || !node || node.kind !== 'file' || node.ext !== 'zip') return false;
          const parent = c.dirs.getNode(parentPathOf(node.path) ?? '/');
          return c.capabilities().can('download', node) && parent !== undefined && c.capabilities().can('extract', parent);
        },
        execute: (c) => this.extract(c.selectedNodes()[0] as Node),
      },
    ]);
  }

  async archive(nodes: Node[], targetDir: string): Promise<void> {
    const paths = nodes.map((n) => n.path);
    const response = await this.ctx.queue.run({
      kind: 'other', lane: 'mutation', label: t('queue.task.archive', {count: paths.length}), paths: [...paths, targetDir],
      execute: (task) => this.ctx.client.archive({paths, target: targetDir, onConflict: 'rename'}, {signal: task.signal}),
    });
    this.ctx.dirs.applyAdded(response.node);
    this.ctx.selection.selectOnly(response.node.path);
  }

  async extract(archive: Node): Promise<void> {
    const response = await this.ctx.queue.run({
      kind: 'other', lane: 'mutation', label: t('queue.task.extract', {name: archive.name}), paths: [archive.path],
      execute: (task) => this.ctx.client.extract({path: archive.path, onConflict: 'rename'}, {signal: task.signal}),
    });
    // Папка назначения новая (или уже была) — её содержимое известно только серверу.
    this.ctx.dirs.applyAdded(response.node);
    this.ctx.dirs.invalidate(response.node.path);
    this.ctx.selection.selectOnly(response.node.path);
    if (response.skipped.length > 0) {
      const names = response.skipped.slice(0, 10).map((s) => `${s.name} — ${s.message}`).join('\n');
      await this.ctx.dialogs.error(
        t('dialog.extract.summary', {extracted: response.extracted, total: response.total, skipped: response.total - response.extracted}) + '\n' + names,
        t('dialog.extract.title'),
      );
    }
  }

  dispose(): void {
    // подписок нет
  }
}
