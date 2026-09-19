import type { DisposeFn } from '../../shared/lib/Disposable.d.ts';
/**
 * Порт перетаскивания. Панели описывают, ЧТО можно тащить и КУДА можно бросить; КАК это делается
 * (HTML5 DnD, Pragmatic drag-and-drop, эмуляция на touch) — дело адаптера.
 *
 * Два вида полезной нагрузки: внутренние узлы (`paths`) и файлы из ОС (`files`, только при drop).
 */
export interface DragPayload {
    readonly kind: 'nodes';
    readonly paths: readonly string[];
}
export interface DropContext {
    /** Внутренние узлы либо null, если тащат файлы из ОС. */
    readonly payload: DragPayload | null;
    /** Ctrl/Alt зажат — копировать, а не перемещать. */
    readonly copy: boolean;
    /** Файлы из ОС (только в момент drop). */
    readonly dataTransfer: DataTransfer | null;
}
export interface DropTargetSpec {
    /** Целевая папка под указателем: путь либо null (мимо цели). `element` — узел из composedPath под курсором. */
    resolve(point: {
        x: number;
        y: number;
    }, element: HTMLElement | null): string | null;
    /** Можно ли бросить в цель. */
    canDrop(target: string, ctx: DropContext): boolean;
    /** Подсветка: цель под курсором изменилась (null — ушли). */
    onHover(target: string | null, ctx: DropContext | null): void;
    onDrop(target: string, ctx: DropContext): void;
}
export interface DragSourceSpec {
    /** Что тащим за элемент под указателем; null — не перетаскиваемый элемент. */
    payload(element: HTMLElement | null): DragPayload | null;
}
export interface DndAdapter {
    /** Сделать контейнер источником перетаскивания (делегирование: элементы внутри могут появляться/исчезать). */
    source(container: HTMLElement, spec: DragSourceSpec): DisposeFn;
    /** Сделать контейнер целью сброса. */
    target(container: HTMLElement, spec: DropTargetSpec): DisposeFn;
}
/**
 * Адаптер на нативном HTML5 drag-and-drop. Работает на десктопе и в iOS Safari; на Android
 * HTML5 DnD не поддерживается — там перенос делается через вырезать/вставить.
 */
export declare class Html5DndAdapter implements DndAdapter {
    source(container: HTMLElement, spec: DragSourceSpec): DisposeFn;
    target(container: HTMLElement, spec: DropTargetSpec): DisposeFn;
}
//# sourceMappingURL=DndAdapter.d.ts.map