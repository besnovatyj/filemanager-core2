/**
 * Модель выделения «как в проводнике» — чистые функции над неизменяемым состоянием.
 *
 * Понятия:
 *  - `selected` — множество выделенных идентификаторов (путей);
 *  - `anchor` — якорь для Shift-диапазона (последний клик без Shift);
 *  - `focus` — элемент с клавиатурным фокусом (может быть не выделен: Ctrl+стрелки).
 *
 * Модель ничего не знает о DOM: «порядок элементов» ей передают как массив id в том порядке,
 * в котором они показаны (после сортировки). Поэтому одна модель обслуживает и таблицу,
 * и плитку, и виртуализированный список.
 */
export interface SelectionState {
    readonly selected: ReadonlySet<string>;
    readonly anchor: string | null;
    readonly focus: string | null;
}
export interface ClickModifiers {
    ctrl?: boolean;
    shift?: boolean;
}
export declare const EMPTY_SELECTION: SelectionState;
export declare function isSelected(state: SelectionState, id: string): boolean;
/** Клик по элементу с модификаторами (как в проводнике). */
export declare function click(state: SelectionState, order: readonly string[], id: string, mods?: ClickModifiers): SelectionState;
/**
 * Нажатие кнопки мыши на уже выделенном элементе без модификаторов НЕ сбрасывает остальные
 * (иначе нельзя перетащить группу). Сброс до одного элемента делается на отпускании кнопки,
 * если перетаскивания не было — см. {@link clickRelease}.
 */
export declare function pressOn(state: SelectionState, order: readonly string[], id: string, mods?: ClickModifiers): SelectionState;
/** Отпускание без перетаскивания на выделенном элементе — оставить только его. */
export declare function clickRelease(state: SelectionState, id: string, mods?: ClickModifiers): SelectionState;
export declare function selectOnly(id: string): SelectionState;
export declare function selectAll(state: SelectionState, order: readonly string[]): SelectionState;
export declare function invert(state: SelectionState, order: readonly string[]): SelectionState;
export declare function clear(): SelectionState;
/** Явно задать множество (рамка выделения). */
export declare function setSelected(state: SelectionState, ids: Iterable<string>, additive?: boolean): SelectionState;
/** Удалить из выделения исчезнувшие элементы (после удаления/обновления листинга). */
export declare function retain(state: SelectionState, order: readonly string[]): SelectionState;
/**
 * Клавиатурная навигация: сдвиг фокуса на `delta` позиций (±1 — стрелки, ±columns — в плитке,
 * ±page — PageUp/Down), Home/End через {@link moveFocusTo}.
 *  - без модификаторов — выделяется только новый фокус;
 *  - Shift — диапазон от якоря;
 *  - Ctrl — двигается только фокус, выделение не меняется.
 */
export declare function moveFocus(state: SelectionState, order: readonly string[], delta: number, mods?: ClickModifiers): SelectionState;
export declare function moveFocusTo(state: SelectionState, order: readonly string[], id: string, mods?: ClickModifiers): SelectionState;
/** Пробел при Ctrl-навигации: переключить выделение фокусного элемента. */
export declare function toggleFocus(state: SelectionState): SelectionState;
//# sourceMappingURL=SelectionModel.d.ts.map