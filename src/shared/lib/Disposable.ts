/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

/** Всё, что нужно освободить: подписку, эффект, DOM-слушатель, таймер. */
export type DisposeFn = () => void;

export interface Disposable {
  dispose(): void;
}

/**
 * Копилка функций освобождения. Компонент/фича собирает в неё всё, что создал, и освобождает
 * одним вызовом — так невозможно забыть отписаться от половины.
 */
export class DisposableStore implements Disposable {
  private items: DisposeFn[] = [];
  private disposed = false;

  /** Регистрирует функцию освобождения (или объект с dispose) и возвращает её же для удобства. */
  add<T extends DisposeFn | Disposable>(item: T): T {
    if (this.disposed) {
      // Владелец уже освобождён — освобождаем сразу, чтобы не течь.
      typeof item === 'function' ? item() : item.dispose();
      return item;
    }
    this.items.push(typeof item === 'function' ? item : () => item.dispose());
    return item;
  }

  /** Освобождает всё в обратном порядке регистрации. Идемпотентно. */
  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    const items = this.items;
    this.items = [];
    for (let i = items.length - 1; i >= 0; i--) {
      try {
        items[i]?.();
      } catch (error) {
        console.error('[DisposableStore] ошибка при освобождении', error);
      }
    }
  }

  get isDisposed(): boolean {
    return this.disposed;
  }
}

/** Подписка на DOM-событие с автоматической отпиской через DisposableStore. */
export function listen<K extends keyof HTMLElementEventMap>(
  target: HTMLElement,
  type: K,
  listener: (event: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions,
): DisposeFn;
export function listen<K extends keyof DocumentEventMap>(
  target: Document,
  type: K,
  listener: (event: DocumentEventMap[K]) => void,
  options?: AddEventListenerOptions,
): DisposeFn;
export function listen<K extends keyof WindowEventMap>(
  target: Window,
  type: K,
  listener: (event: WindowEventMap[K]) => void,
  options?: AddEventListenerOptions,
): DisposeFn;
export function listen(
  target: EventTarget,
  type: string,
  listener: EventListener,
  options?: AddEventListenerOptions,
): DisposeFn;
export function listen(
  target: EventTarget,
  type: string,
  listener: (event: never) => void,
  options?: AddEventListenerOptions,
): DisposeFn {
  target.addEventListener(type, listener as EventListener, options);
  return () => target.removeEventListener(type, listener as EventListener, options);
}
