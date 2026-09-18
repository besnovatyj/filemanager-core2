/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {t} from '@/shared/i18n/i18n';
import type {Node} from '@/domain/node/Node';
import type {CommandRegistry} from '@/commands/CommandRegistry';
import type {CommandContext} from '@/commands/CommandContext';
import type {Feature} from './Feature';

/** Удаление выделенного: подтверждение → задача → применение отчёта → диалог, если были ошибки. */
export class DeleteFeature implements Feature {
  private ctx!: CommandContext;

  init(ctx: CommandContext, commands: CommandRegistry): void {
    this.ctx = ctx;
    commands.register({
      id: 'delete', group: 'file', order: 50, icon: 'trash', shortcuts: ['Delete'],
      label: () => t('cmd.delete'),
      canExecute: (c) => c.capabilities().canAll('delete', c.selectedNodes()),
      execute: (c) => this.deleteNodes([...c.selectedNodes()]),
    });
  }

  async deleteNodes(nodes: Node[]): Promise<void> {
    if (nodes.length === 0) return;
    const ok = await this.ctx.dialogs.confirm({
      title: t('dialog.delete.title'),
      message: nodes.length === 1
        ? t('dialog.delete.question', {name: (nodes[0] as Node).name})
        : t('dialog.delete.questionMany', {count: nodes.length}),
      confirmLabel: t('dialog.delete.confirm'),
      danger: true,
    });
    if (!ok) return;

    const paths = nodes.map((n) => n.path);
    const report = await this.ctx.queue.run({
      kind: 'delete', lane: 'mutation', label: t('queue.task.delete', {count: paths.length}), paths,
      execute: (task) => this.ctx.client.delete({paths}, {signal: task.signal}),
    });
    this.ctx.dirs.applyReport(report);
    this.ctx.clipboard.forget(paths);
    for (const item of report.items) {
      if (item.status === 'ok') this.ctx.nav.escapeFrom(item.source);
    }
    if (report.failed > 0) {
      await this.ctx.dialogs.report(report, t('dialog.delete.title'));
    }
  }

  dispose(): void {
    // подписок нет
  }
}
