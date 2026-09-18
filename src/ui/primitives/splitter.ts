/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {h} from '@/shared/dom/html';
import type {DisposeFn} from '@/shared/lib/Disposable';
import {listen} from '@/shared/lib/Disposable';
import type {Signal} from '@/shared/reactive/signal';

/**
 * Вертикальный разделитель панелей: перетаскивание меняет сигнал ширины панели (слева, либо
 * справа при `invert` — тогда движение влево увеличивает ширину), двойной клик — сброс.
 */
export function splitter(width: Signal<number>, options: {min?: number; max?: number; reset?: number; invert?: boolean} = {}): {el: HTMLElement; dispose: DisposeFn} {
  const min = options.min ?? 140;
  const max = options.max ?? 600;
  const el = h('div', {class: 'splitter', role: 'separator', attrs: {'aria-orientation': 'vertical'}});
  let startX = 0;
  let startWidth = 0;

  const onMove = (e: PointerEvent): void => {
    const delta = e.clientX - startX;
    const next = Math.min(max, Math.max(min, startWidth + (options.invert ? -delta : delta)));
    width.set(next);
  };
  const onUp = (e: PointerEvent): void => {
    el.releasePointerCapture(e.pointerId);
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerup', onUp);
    el.removeEventListener('pointercancel', onUp);
    el.classList.remove('is-dragging');
  };
  const disposeDown = listen(el, 'pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    startX = e.clientX;
    startWidth = width.peek();
    el.setPointerCapture(e.pointerId);
    el.classList.add('is-dragging');
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
  });
  const disposeDbl = listen(el, 'dblclick', () => width.set(options.reset ?? 240));

  return {
    el,
    dispose: () => {
      disposeDown();
      disposeDbl();
    },
  };
}
