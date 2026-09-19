import type { OperationReport } from '../api/contract/report.d.ts';
import type { CommandRegistry } from '../commands/CommandRegistry.d.ts';
import type { CommandContext } from '../commands/CommandContext.d.ts';
import type { Feature } from './Feature';
export type TransferKind = 'move' | 'copy';
/**
 * Перемещение/копирование с интерактивным разрешением конфликтов (контракт §8).
 *
 * Алгоритм: один запрос со стратегией `fail` → элементы с `exists` → для каждого спрашиваем
 * пользователя (или применяем запомненный выбор «ко всем») → повторные запросы по группам
 * стратегий → объединённый отчёт применяется к кэшу. Используется буфером обмена и DnD.
 */
export declare class TransferFeature implements Feature {
    private ctx;
    init(ctx: CommandContext, _commands: CommandRegistry): void;
    transfer(kind: TransferKind, sources: readonly string[], target: string): Promise<OperationReport | null>;
    private applyReport;
    dispose(): void;
}
//# sourceMappingURL=TransferFeature.d.ts.map