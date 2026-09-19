import { type ReadonlySignal } from '../shared/reactive/signal.d.ts';
import { type Node } from '../domain/node/Node.d.ts';
import type { FsClient } from '../api/client/FsClient.d.ts';
import { ApiError } from '../api/codec/ApiError.d.ts';
import { Emitter } from '../shared/lib/Emitter.d.ts';
import type { OperationReport } from '../api/contract/report.d.ts';
export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';
/** Состояние одной папки в кэше. Неизменяемый снимок — сигнал меняется целиком. */
export interface DirectoryState {
    readonly status: LoadStatus;
    /** Узел самой папки (после первой загрузки). */
    readonly node: Node | null;
    /** Дети в порядке сервера; сортировка — в представлении. */
    readonly items: readonly Node[];
    readonly error: ApiError | null;
    readonly loadedAt: number | null;
    /** Есть ли ещё страницы (курсор). */
    readonly nextCursor: string | null;
}
/**
 * Кэш содержимого папок + дерева (только подпапки) с точечными обновлениями по фактам
 * из ответов операций (ARCHITECTURE.md §2.4).
 *
 * Каждая папка — отдельный сигнал: список перерисовывается только для той папки, что изменилась.
 * Полный `list` делается, когда фактов недостаточно (первый заход, refresh, копирование папки).
 */
export declare class DirectoryStore {
    private readonly client;
    /**
     * Факты, применённые к кэшу (для сторов, держащих собственные списки узлов — например,
     * результаты поиска): `removed` — путь исчез вместе с поддеревом, `added` — узел появился,
     * `updated` — метаданные узла заменены.
     */
    readonly changes: Emitter<{
        removed: string;
        added: Node;
        updated: Node;
    }>;
    private readonly dirs;
    private readonly trees;
    private readonly inflight;
    constructor(client: FsClient);
    /** Сигнал состояния папки (создаётся лениво, пустой до загрузки). */
    directory(path: string): ReadonlySignal<DirectoryState>;
    /** Сигнал подпапок (для дерева навигации). */
    tree(path: string): ReadonlySignal<DirectoryState>;
    /** Узел по пути из любого известного листинга (родителя). */
    getNode(path: string): Node | undefined;
    /** Загрузка содержимого папки. Параллельные вызовы для одного пути схлопываются. */
    load(path: string, options?: {
        force?: boolean;
        signal?: AbortSignal;
    }): Promise<void>;
    /** Загрузка только подпапок (дерево). */
    loadTree(path: string, options?: {
        force?: boolean;
    }): Promise<void>;
    /** Новый узел появился (mkdir, upload, copy/move в известную папку). */
    applyAdded(node: Node): void;
    /** Узел исчез (delete, move из папки). Вместе с кэшем его поддерева. */
    applyRemoved(path: string): void;
    /** Узел заменён (rename): старый путь исчез, новый появился — в той же папке. */
    applyReplaced(oldPath: string, node: Node): void;
    /** Обновить метаданные узла (после stat) на месте. */
    applyUpdated(node: Node): void;
    /**
     * Применить отчёт пакетной операции: успешные элементы move — удалить источники и добавить
     * цели; copy — добавить цели; delete — удалить источники. Папки-цели копирования/перемещения
     * получают инвалидацию своего содержимого (дети неизвестны без листинга).
     */
    applyReport(report: OperationReport): void;
    /** Сбросить кэш папки (следующий load перечитает). Поддерево тоже забывается. */
    invalidate(path: string): void;
    invalidateAll(): void;
    private dirSignal;
    private treeSignal;
    private patch;
    private patchTree;
    private dropSubtree;
}
//# sourceMappingURL=DirectoryStore.d.ts.map