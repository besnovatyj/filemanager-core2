/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {signal} from '@/shared/reactive/signal';

/** Порог ширины (px), ниже которого раскладка считается узкой (телефон/узкое окно). */
export const NARROW_WIDTH = 640;

/**
 * Условия отображения: узкая раскладка и «грубый» указатель (палец).
 *
 * `narrow` вычисляется по ширине САМОГО проводника (ResizeObserver в `<fm-explorer>`), а не окна:
 * встроенный в узкую колонку менеджер должен вести себя как на телефоне. `coarse` — по
 * `matchMedia('(pointer: coarse)')`: меняет размеры целей и модель тапов, не раскладку.
 */
export class ViewportStore {
  readonly narrow = signal(false);
  readonly coarse = signal(false);
  private readonly media: MediaQueryList | null;
  private readonly onMedia = (e: MediaQueryListEvent): void => this.coarse.set(e.matches);

  constructor() {
    this.media = typeof matchMedia === 'function' ? matchMedia('(pointer: coarse)') : null;
    if (this.media) {
      this.coarse.set(this.media.matches);
      this.media.addEventListener('change', this.onMedia);
    }
  }

  /** Сообщить фактическую ширину проводника (вызывает корневой элемент). */
  setWidth(width: number): void {
    this.narrow.set(width > 0 && width < NARROW_WIDTH);
  }

  dispose(): void {
    this.media?.removeEventListener('change', this.onMedia);
  }
}
