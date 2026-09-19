import { type DisposeFn } from '../lib/Disposable.d.ts';
/** Порог в px, после которого нажатие считается перетаскиванием, а не кликом. */
export declare const DRAG_THRESHOLD = 4;
/**
 * Контекстное меню: правая кнопка на десктопе, долгое нажатие на touch-экране.
 * Одна точка, чтобы каждая панель не реализовывала long-press по-своему.
 */
export declare function onContextMenu(target: HTMLElement, handler: (event: PointerEvent | MouseEvent, origin: {
    x: number;
    y: number;
}) => void, options?: {
    longPressMs?: number;
}): DisposeFn;
/** Найти ближайший элемент с атрибутом в пути события (учитывает shadow DOM). */
export declare function closestInPath(event: Event, selector: string): HTMLElement | null;
//# sourceMappingURL=pointer.d.ts.map