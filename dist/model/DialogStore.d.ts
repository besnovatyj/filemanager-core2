import { type ReadonlySignal } from '../shared/reactive/signal.d.ts';
import type { Node } from '../domain/node/Node.d.ts';
import type { ConflictChoice } from '../domain/conflict/ConflictResolution.d.ts';
import type { OperationReport } from '../api/contract/report.d.ts';
import type { ApiError } from '../api/codec/ApiError.d.ts';
/** Запрос на диалог — данные, которые UI рендерит; ответ уходит через `resolve`. */
export type DialogRequest = {
    kind: 'confirm';
    title: string;
    message: string;
    confirmLabel?: string;
    danger?: boolean;
    resolve: (ok: boolean) => void;
} | {
    kind: 'prompt';
    title: string;
    label: string;
    value: string;
    selectStem?: boolean;
    validate?: (value: string) => string | null;
    resolve: (value: string | null) => void;
} | {
    kind: 'conflict';
    name: string;
    remaining: number;
    resolve: (choice: ConflictChoice | null) => void;
} | {
    kind: 'error';
    title: string;
    error: ApiError | Error | string;
    resolve: () => void;
} | {
    kind: 'report';
    title: string;
    report: OperationReport;
    resolve: () => void;
} | {
    kind: 'properties';
    nodes: Node[];
    detailed: Promise<Node | null>;
    resolve: () => void;
};
export interface Dialog {
    readonly id: string;
    readonly request: DialogRequest;
}
/**
 * Очередь модальных диалогов. Фичи ждут ответ промисом; UI рендерит верхний диалог.
 * Так фича не знает ничего про разметку, а диалоги можно тестировать заглушкой стора.
 */
export declare class DialogStore {
    private readonly stack;
    /** Верхний (активный) диалог. */
    readonly current: ReadonlySignal<Dialog | null>;
    confirm(options: {
        title: string;
        message: string;
        confirmLabel?: string;
        danger?: boolean;
    }): Promise<boolean>;
    prompt(options: {
        title: string;
        label: string;
        value: string;
        selectStem?: boolean;
        validate?: (value: string) => string | null;
    }): Promise<string | null>;
    conflict(options: {
        name: string;
        remaining: number;
    }): Promise<ConflictChoice | null>;
    error(error: ApiError | Error | string, title?: string): Promise<void>;
    report(report: OperationReport, title: string): Promise<void>;
    /** `detailed` — промис точных метаданных (stat): диалог открывается сразу, данные подставляются по готовности. */
    properties(nodes: Node[], detailed: Promise<Node | null>): Promise<void>;
    /** UI вызывает после того, как пользователь ответил и `resolve` уже дёрнут. */
    close(id: string): void;
    /** Закрыть всё (уничтожение приложения): все ожидающие получают «отмену». */
    closeAll(): void;
    private push;
}
//# sourceMappingURL=DialogStore.d.ts.map