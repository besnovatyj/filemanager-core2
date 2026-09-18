/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

/**
 * Буфер обмена файлового менеджера — машина состояний: пусто → скопировано|вырезано → вставлено.
 * Чистые функции; хранение состояния — в `ClipboardStore`.
 *
 * Семантика «вырезано» — как в проводнике: источники помечаются (в UI приглушаются), но не
 * удаляются до вставки; после успешной вставки буфер очищается. После вставки «скопированного»
 * буфер сохраняется — можно вставить ещё раз.
 */
export type ClipboardMode = 'copy' | 'cut';

export interface ClipboardState {
  readonly mode: ClipboardMode | null;
  readonly paths: readonly string[];
}

export const EMPTY_CLIPBOARD: ClipboardState = Object.freeze({mode: null, paths: []});

export function copy(paths: readonly string[]): ClipboardState {
  return paths.length === 0 ? EMPTY_CLIPBOARD : {mode: 'copy', paths: [...paths]};
}

export function cut(paths: readonly string[]): ClipboardState {
  return paths.length === 0 ? EMPTY_CLIPBOARD : {mode: 'cut', paths: [...paths]};
}

export function isEmpty(state: ClipboardState): boolean {
  return state.mode === null || state.paths.length === 0;
}

export function isCut(state: ClipboardState, path: string): boolean {
  return state.mode === 'cut' && state.paths.includes(path);
}

/** Состояние после вставки: вырезанное — очистить, скопированное — оставить. */
export function afterPaste(state: ClipboardState): ClipboardState {
  return state.mode === 'cut' ? EMPTY_CLIPBOARD : state;
}

/** Убрать пути, которых больше нет (удалены, переименованы). */
export function withoutPaths(state: ClipboardState, removed: readonly string[]): ClipboardState {
  const gone = new Set(removed);
  const paths = state.paths.filter((p) => !gone.has(p) && ![...gone].some((g) => p.startsWith(g + '/')));
  return paths.length === 0 ? EMPTY_CLIPBOARD : {mode: state.mode, paths};
}

/**
 * Можно ли вставить в папку: буфер не пуст; при «вырезать» цель не совпадает с папкой источника
 * (иначе операция бессмысленна) и не лежит внутри вырезаемой папки.
 */
export function canPasteInto(state: ClipboardState, targetDir: string): boolean {
  if (isEmpty(state)) return false;
  for (const path of state.paths) {
    if (targetDir === path || targetDir.startsWith(path + '/')) return false;
  }
  if (state.mode === 'cut') {
    const parents = new Set(state.paths.map(parentOf));
    if (parents.size === 1 && parents.has(targetDir)) return false;
  }
  return true;
}

function parentOf(path: string): string {
  const idx = path.lastIndexOf('/');
  return idx <= 0 ? '/' : path.slice(0, idx);
}
