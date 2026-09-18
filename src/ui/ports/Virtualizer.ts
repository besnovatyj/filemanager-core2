/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

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
  layout(mode: LayoutMode, viewportWidth: number, options?: {coarse?: boolean}): boolean;
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

interface Geometry {
  mode: LayoutMode;
  columns: number;
  cellWidth: number;
  cellHeight: number;
  gap: number;
  /** Ширина растягивается на всю область (табличные режимы). */
  fluid: boolean;
}

const OVERSCAN_ROWS = 3;
const PADDING_X = 4;

/**
 * Виртуализация сетки одинаковых ячеек. Размеры на touch-устройствах крупнее
 * (`coarse`): строки 40px вместо 28px — целевые области под палец.
 */
export class UniformGridVirtualizer implements Virtualizer {
  private geometry: Geometry = {mode: 'details', columns: 1, cellWidth: 0, cellHeight: 28, gap: 0, fluid: true};

  get columns(): number {
    return this.geometry.columns;
  }

  get cellHeight(): number {
    return this.geometry.cellHeight;
  }

  layout(mode: LayoutMode, viewportWidth: number, options: {coarse?: boolean} = {}): boolean {
    const width = Math.max(0, viewportWidth - PADDING_X * 2);
    const coarse = options.coarse === true;
    const row = coarse ? 40 : 28;
    let next: Geometry;
    switch (mode) {
      case 'tiles':
        next = {mode, columns: Math.max(1, Math.floor(width / 240)), cellWidth: 240, cellHeight: coarse ? 68 : 60, gap: 4, fluid: false};
        break;
      case 'icons':
        next = {mode, columns: Math.max(1, Math.floor(width / 112)), cellWidth: 112, cellHeight: coarse ? 120 : 108, gap: 4, fluid: false};
        break;
      case 'list':
        next = {mode, columns: 1, cellWidth: width, cellHeight: row, gap: 0, fluid: true};
        break;
      default:
        next = {mode: 'details', columns: 1, cellWidth: width, cellHeight: row, gap: 0, fluid: true};
    }
    const changed = next.mode !== this.geometry.mode || next.columns !== this.geometry.columns
      || next.cellWidth !== this.geometry.cellWidth || next.cellHeight !== this.geometry.cellHeight;
    this.geometry = next;
    return changed;
  }

  totalHeight(count: number): number {
    const {columns, cellHeight, gap} = this.geometry;
    return Math.max(0, Math.ceil(count / columns) * (cellHeight + gap));
  }

  rect(index: number): CellRect {
    const {columns, cellWidth, cellHeight, gap} = this.geometry;
    const row = Math.floor(index / columns);
    const col = index % columns;
    return {left: PADDING_X + col * (cellWidth + gap), top: row * (cellHeight + gap), width: cellWidth, height: cellHeight};
  }

  indexAt(x: number, y: number): number {
    const {columns, cellWidth, cellHeight, gap} = this.geometry;
    const col = Math.floor((x - PADDING_X) / (cellWidth + gap));
    const row = Math.floor(y / (cellHeight + gap));
    if (col < 0 || col >= columns || row < 0) return -1;
    return row * columns + col;
  }

  range(scrollTop: number, viewportHeight: number, count: number): VisibleRange {
    const {columns, cellHeight, gap} = this.geometry;
    const rowHeight = cellHeight + gap;
    const rows = Math.ceil(count / columns);
    const firstRow = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN_ROWS);
    const lastRow = Math.min(rows - 1, Math.ceil((scrollTop + viewportHeight) / rowHeight) + OVERSCAN_ROWS);
    return {from: firstRow * columns, to: Math.min(count, (lastRow + 1) * columns)};
  }

  intersecting(area: CellRect, count: number, viewportWidth: number): number[] {
    const hits: number[] = [];
    const right = area.left + area.width;
    const bottom = area.top + area.height;
    for (let i = 0; i < count; i++) {
      const c = this.rect(i);
      const cw = this.geometry.fluid ? viewportWidth : c.width;
      if (c.left < right && c.left + cw > area.left && c.top < bottom && c.top + c.height > area.top) hits.push(i);
    }
    return hits;
  }

  /** Растягивать ли ячейку на всю ширину (табличные режимы). */
  get fluid(): boolean {
    return this.geometry.fluid;
  }
}
