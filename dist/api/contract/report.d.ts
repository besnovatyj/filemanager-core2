import type { Node } from '../../domain/node/Node.d.ts';
import type { ErrorBody } from './errors';
export type ItemStatus = 'ok' | 'skipped' | 'failed';
/** Результат одного элемента пакетной операции (§7). */
export interface ItemResult {
    source: string;
    target?: string;
    status: ItemStatus;
    node?: Node;
    error?: ErrorBody;
}
/** Отчёт пакетной операции (§7). */
export interface OperationReport {
    operation: string;
    total: number;
    succeeded: number;
    failed: number;
    skipped: number;
    items: ItemResult[];
}
//# sourceMappingURL=report.d.ts.map