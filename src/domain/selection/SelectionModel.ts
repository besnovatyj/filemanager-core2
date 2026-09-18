/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

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

export const EMPTY_SELECTION: SelectionState = Object.freeze({
  selected: new Set<string>(),
  anchor: null,
  focus: null,
});

export function isSelected(state: SelectionState, id: string): boolean {
  return state.selected.has(id);
}

/** Клик по элементу с модификаторами (как в проводнике). */
export function click(state: SelectionState, order: readonly string[], id: string, mods: ClickModifiers = {}): SelectionState {
  if (mods.shift && state.anchor !== null) {
    const range = rangeBetween(order, state.anchor, id);
    const selected = mods.ctrl ? new Set([...state.selected, ...range]) : new Set(range);
    return {selected, anchor: state.anchor, focus: id};
  }
  if (mods.ctrl) {
    const selected = new Set(state.selected);
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    return {selected, anchor: id, focus: id};
  }
  return {selected: new Set([id]), anchor: id, focus: id};
}

/**
 * Нажатие кнопки мыши на уже выделенном элементе без модификаторов НЕ сбрасывает остальные
 * (иначе нельзя перетащить группу). Сброс до одного элемента делается на отпускании кнопки,
 * если перетаскивания не было — см. {@link clickRelease}.
 */
export function pressOn(state: SelectionState, order: readonly string[], id: string, mods: ClickModifiers = {}): SelectionState {
  if (!mods.ctrl && !mods.shift && state.selected.has(id)) {
    return {...state, focus: id};
  }
  return click(state, order, id, mods);
}

/** Отпускание без перетаскивания на выделенном элементе — оставить только его. */
export function clickRelease(state: SelectionState, id: string, mods: ClickModifiers = {}): SelectionState {
  if (!mods.ctrl && !mods.shift && state.selected.has(id) && state.selected.size > 1) {
    return {selected: new Set([id]), anchor: id, focus: id};
  }
  return state;
}

export function selectOnly(id: string): SelectionState {
  return {selected: new Set([id]), anchor: id, focus: id};
}

export function selectAll(state: SelectionState, order: readonly string[]): SelectionState {
  return {selected: new Set(order), anchor: state.anchor ?? order[0] ?? null, focus: state.focus ?? order[0] ?? null};
}

export function invert(state: SelectionState, order: readonly string[]): SelectionState {
  const selected = new Set(order.filter((id) => !state.selected.has(id)));
  return {selected, anchor: state.anchor, focus: state.focus};
}

export function clear(): SelectionState {
  return EMPTY_SELECTION;
}

/** Явно задать множество (рамка выделения). */
export function setSelected(state: SelectionState, ids: Iterable<string>, additive = false): SelectionState {
  const selected = additive ? new Set([...state.selected, ...ids]) : new Set(ids);
  const first = selected.values().next().value ?? null;
  return {selected, anchor: state.anchor ?? first, focus: state.focus ?? first};
}

/** Удалить из выделения исчезнувшие элементы (после удаления/обновления листинга). */
export function retain(state: SelectionState, order: readonly string[]): SelectionState {
  const alive = new Set(order);
  const selected = new Set([...state.selected].filter((id) => alive.has(id)));
  if (selected.size === state.selected.size && (state.focus === null || alive.has(state.focus))) {
    return state;
  }
  return {
    selected,
    anchor: state.anchor !== null && alive.has(state.anchor) ? state.anchor : null,
    focus: state.focus !== null && alive.has(state.focus) ? state.focus : null,
  };
}

/**
 * Клавиатурная навигация: сдвиг фокуса на `delta` позиций (±1 — стрелки, ±columns — в плитке,
 * ±page — PageUp/Down), Home/End через {@link moveFocusTo}.
 *  - без модификаторов — выделяется только новый фокус;
 *  - Shift — диапазон от якоря;
 *  - Ctrl — двигается только фокус, выделение не меняется.
 */
export function moveFocus(state: SelectionState, order: readonly string[], delta: number, mods: ClickModifiers = {}): SelectionState {
  if (order.length === 0) return state;
  const currentIndex = state.focus !== null ? order.indexOf(state.focus) : -1;
  const nextIndex = clamp(currentIndex === -1 ? (delta > 0 ? 0 : order.length - 1) : currentIndex + delta, 0, order.length - 1);
  return moveFocusTo(state, order, order[nextIndex] as string, mods);
}

export function moveFocusTo(state: SelectionState, order: readonly string[], id: string, mods: ClickModifiers = {}): SelectionState {
  if (mods.ctrl) {
    return {...state, focus: id};
  }
  if (mods.shift) {
    const anchor = state.anchor ?? state.focus ?? id;
    return {selected: new Set(rangeBetween(order, anchor, id)), anchor, focus: id};
  }
  return selectOnly(id);
}

/** Пробел при Ctrl-навигации: переключить выделение фокусного элемента. */
export function toggleFocus(state: SelectionState): SelectionState {
  if (state.focus === null) return state;
  const selected = new Set(state.selected);
  if (selected.has(state.focus)) selected.delete(state.focus);
  else selected.add(state.focus);
  return {selected, anchor: state.focus, focus: state.focus};
}

function rangeBetween(order: readonly string[], a: string, b: string): string[] {
  const ia = order.indexOf(a);
  const ib = order.indexOf(b);
  if (ia === -1 || ib === -1) return ib === -1 ? [] : [b];
  const [from, to] = ia < ib ? [ia, ib] : [ib, ia];
  return order.slice(from, to + 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
