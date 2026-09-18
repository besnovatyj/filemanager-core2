/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {t} from '@/shared/i18n/i18n';
import type {ConflictChoice, ConflictStrategy} from '@/domain/conflict/ConflictResolution';
import type {OperationReport, ItemResult} from '@/api/contract/report';
import type {CommandRegistry} from '@/commands/CommandRegistry';
import type {CommandContext} from '@/commands/CommandContext';
import type {Feature} from './Feature';

export type TransferKind = 'move' | 'copy';

/**
 * Перемещение/копирование с интерактивным разрешением конфликтов (контракт §8).
 *
 * Алгоритм: один запрос со стратегией `fail` → элементы с `exists` → для каждого спрашиваем
 * пользователя (или применяем запомненный выбор «ко всем») → повторные запросы по группам
 * стратегий → объединённый отчёт применяется к кэшу. Используется буфером обмена и DnD.
 */
export class TransferFeature implements Feature {
  private ctx!: CommandContext;

  init(ctx: CommandContext, _commands: CommandRegistry): void {
    this.ctx = ctx;
  }

  async transfer(kind: TransferKind, sources: readonly string[], target: string): Promise<OperationReport | null> {
    if (sources.length === 0) return null;
    const label = t(`queue.task.${kind}`, {count: sources.length});

    const run = (paths: string[], strategy: ConflictStrategy): Promise<OperationReport> =>
      this.ctx.queue.run({
        kind, lane: 'mutation', label, paths: [...paths, target],
        execute: (task) => (kind === 'move'
          ? this.ctx.client.move({sources: paths, target, onConflict: strategy}, {signal: task.signal})
          : this.ctx.client.copy({sources: paths, target, onConflict: strategy}, {signal: task.signal})),
      });

    const first = await run([...sources], 'fail');
    const items: ItemResult[] = first.items.filter((i) => !(i.status === 'failed' && i.error?.code === 'exists'));
    const conflicts = first.items.filter((i) => i.status === 'failed' && i.error?.code === 'exists');

    if (conflicts.length > 0) {
      const groups = new Map<ConflictChoice['strategy'], string[]>();
      let remembered: ConflictChoice['strategy'] | null = null;
      for (let i = 0; i < conflicts.length; i++) {
        const item = conflicts[i] as ItemResult;
        let strategy: ConflictChoice['strategy'] | null = remembered;
        if (strategy === null) {
          const choice = await this.ctx.dialogs.conflict({name: basename(item.source), remaining: conflicts.length - i});
          if (choice === null) break; // отмена — оставшиеся не трогаем
          strategy = choice.strategy;
          if (choice.applyToAll) remembered = strategy;
        }
        groups.set(strategy, [...(groups.get(strategy) ?? []), item.source]);
      }
      for (const [strategy, paths] of groups) {
        const retry = await run(paths, strategy);
        items.push(...retry.items);
      }
    }

    const report: OperationReport = {
      operation: kind,
      total: items.length,
      succeeded: items.filter((i) => i.status === 'ok').length,
      failed: items.filter((i) => i.status === 'failed').length,
      skipped: items.filter((i) => i.status === 'skipped').length,
      items,
    };
    this.applyReport(report, target);
    if (report.failed > 0) {
      await this.ctx.dialogs.report(report, t(`cmd.${kind === 'move' ? 'cut' : 'copy'}`));
    }
    return report;
  }

  private applyReport(report: OperationReport, target: string): void {
    this.ctx.dirs.applyReport(report);
    const moved = report.items.filter((i) => i.status === 'ok').map((i) => i.source);
    if (report.operation === 'move') {
      this.ctx.clipboard.forget(moved);
      for (const path of moved) this.ctx.nav.escapeFrom(path);
    }
    // Если целевая папка не была загружена — просто перечитаем при заходе.
    if (this.ctx.dirs.directory(target).peek().status !== 'ready') {
      this.ctx.dirs.invalidate(target);
    }
  }

  dispose(): void {
    // подписок нет
  }
}

function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}
