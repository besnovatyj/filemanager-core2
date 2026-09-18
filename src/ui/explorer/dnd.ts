/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

/**
 * Внутреннее перетаскивание узлов: пути передаются через HTML5 DnD собственным MIME-типом,
 * чтобы drop-зоны отличали «свои» перетаскивания от файлов ОС (`Files`) и текста.
 */
export const DRAG_MIME = 'application/x-bescms-fs-paths';

export function writeDragPaths(dt: DataTransfer, paths: readonly string[]): void {
  dt.setData(DRAG_MIME, JSON.stringify(paths));
  // Текстовое представление — для дропа в сторонние приложения/поля.
  dt.setData('text/plain', paths.join('\n'));
  dt.effectAllowed = 'copyMove';
}

export function readDragPaths(dt: DataTransfer): string[] | null {
  if (!dt.types.includes(DRAG_MIME)) return null;
  try {
    const parsed: unknown = JSON.parse(dt.getData(DRAG_MIME));
    return Array.isArray(parsed) && parsed.every((p) => typeof p === 'string') ? (parsed as string[]) : null;
  } catch {
    return null;
  }
}
