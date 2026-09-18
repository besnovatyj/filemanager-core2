/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {listen, type DisposeFn} from '@/shared/lib/Disposable';

/** Порог в px, после которого нажатие считается перетаскиванием, а не кликом. */
export const DRAG_THRESHOLD = 4;

/**
 * Контекстное меню: правая кнопка на десктопе, долгое нажатие на touch-экране.
 * Одна точка, чтобы каждая панель не реализовывала long-press по-своему.
 */
export function onContextMenu(
  target: HTMLElement,
  handler: (event: PointerEvent | MouseEvent, origin: {x: number; y: number}) => void,
  options: {longPressMs?: number} = {},
): DisposeFn {
  const longPressMs = options.longPressMs ?? 500;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let start: {x: number; y: number} | null = null;

  const cancel = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    start = null;
  };

  const disposers = [
    listen(target, 'contextmenu', (event) => {
      event.preventDefault();
      handler(event, {x: event.clientX, y: event.clientY});
    }),
    listen(target, 'pointerdown', (event) => {
      if (event.pointerType !== 'touch') return;
      start = {x: event.clientX, y: event.clientY};
      timer = setTimeout(() => {
        timer = null;
        if (start) {
          handler(event, start);
          start = null;
        }
      }, longPressMs);
    }),
    listen(target, 'pointermove', (event) => {
      if (!start) return;
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > DRAG_THRESHOLD * 2) {
        cancel();
      }
    }),
    listen(target, 'pointerup', cancel),
    listen(target, 'pointercancel', cancel),
  ];

  return () => {
    cancel();
    disposers.forEach((d) => d());
  };
}

/** Найти ближайший элемент с атрибутом в пути события (учитывает shadow DOM). */
export function closestInPath(event: Event, selector: string): HTMLElement | null {
  for (const node of event.composedPath()) {
    if (node instanceof HTMLElement && node.matches(selector)) {
      return node;
    }
  }
  return null;
}
