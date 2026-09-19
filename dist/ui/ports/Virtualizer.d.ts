/**
 * Порт виртуализации списка (ADR-11). Панель содержимого не знает, как считаются позиции ячеек:
 * она спрашивает раскладку, видимый диапазон и прямоугольник ячейки. Реализация по умолчанию —
 * {@link UniformGridVirtualizer} (все ячейки одного размера, арифметика). Для переменной высоты
 * подставляется адаптер поверх `@tanstack/virtual-core`, панель при этом не меняется.
 */
export type LayoutMode = 'details' | 'list' | 'tiles' | 'icons';
export interface CellRect {
    left: number;
    top: number;
    width: number;
    height: number;
}
export interface VisibleRange {
    /** Индекс первого элемента для рендера (включительно). */
    from: number;
    /** Индекс за последним (исключительно). */
    to: number;
}
export interface Virtualizer {
    /**
     * Пересчитать раскладку под режим и ширину области. Возвращает true, если геометрия изменилась
     * и нужен полный перерендер.
     */
    layout(mode: LayoutMode, viewportWidth: number, options?: {
        coarse?: boolean;
    }): boolean;
    /** Число колонок (1 для табличных режимов). */
    readonly columns: number;
    /** Высота ячейки (для навигации PageUp/Down). */
    readonly cellHeight: number;
    /** Полная высота содержимого для N элементов. */
    totalHeight(count: number): number;
    /** Прямоугольник ячейки по индексу (координаты относительно начала прокручиваемого содержимого). */
    rect(index: number): CellRect;
    /** Индекс ячейки под точкой (в тех же координатах); -1 — мимо. */
    indexAt(x: number, y: number): number;
    /** Диапазон индексов, который нужно отрендерить при данной прокрутке (с запасом). */
    range(scrollTop: number, viewportHeight: number, count: number): VisibleRange;
    /** Индексы ячеек, пересекающих прямоугольник (рамка выделения). */
    intersecting(area: CellRect, count: number, viewportWidth: number): number[];
}
/**
 * Виртуализация сетки одинаковых ячеек. Размеры на touch-устройствах крупнее
 * (`coarse`): строки 40px вместо 28px — целевые области под палец.
 */
export declare class UniformGridVirtualizer implements Virtualizer {
    private geometry;
    get columns(): number;
    get cellHeight(): number;
    layout(mode: LayoutMode, viewportWidth: number, options?: {
        coarse?: boolean;
    }): boolean;
    totalHeight(count: number): number;
    rect(index: number): CellRect;
    indexAt(x: number, y: number): number;
    range(scrollTop: number, viewportHeight: number, count: number): VisibleRange;
    intersecting(area: CellRect, count: number, viewportWidth: number): number[];
    /** Растягивать ли ячейку на всю ширину (табличные режимы). */
    get fluid(): boolean;
}
//# sourceMappingURL=Virtualizer.d.ts.map