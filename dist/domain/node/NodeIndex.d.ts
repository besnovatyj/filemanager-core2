import type { Node } from './Node';
/**
 * Плоский индекс узлов по пути с быстрым доступом к детям папки.
 * Используется кэшем каталогов: одна структура и для списка, и для дерева, и для DnD-проверок.
 */
export declare class NodeIndex {
    private readonly byPath;
    private readonly children;
    get(path: string): Node | undefined;
    has(path: string): boolean;
    /** Дети папки в порядке вставки (сортировка — забота представления). */
    childrenOf(path: string): Node[];
    /** Известны ли дети папки (пустой список ≠ неизвестно). */
    hasListing(path: string): boolean;
    /** Полностью заменяет листинг папки. */
    setListing(path: string, items: Node[]): void;
    /** Добавляет/обновляет узел внутри уже известного листинга родителя. */
    upsert(node: Node): void;
    /** Удаляет узел вместе с поддеревом и убирает из листинга родителя. */
    remove(path: string): void;
    /** Сбрасывает листинг папки (дети остаются неизвестными). */
    invalidate(path: string): void;
    clear(): void;
    private removeSubtree;
}
//# sourceMappingURL=NodeIndex.d.ts.map