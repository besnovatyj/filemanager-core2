/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

/** Откладывает вызов до паузы в `wait` мс; повторные вызовы сбрасывают таймер. */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, wait: number): ((...args: A) => void) & {cancel(): void} {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const wrapped = (...args: A): void => {
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, wait);
  };
  wrapped.cancel = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };
  return wrapped;
}

/** Не чаще одного вызова за `wait` мс; последний вызов в окне не теряется. */
export function throttle<A extends unknown[]>(fn: (...args: A) => void, wait: number): (...args: A) => void {
  let last = 0;
  let pending: A | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: A): void => {
    const now = Date.now();
    const remaining = wait - (now - last);
    if (remaining <= 0) {
      last = now;
      fn(...args);
      return;
    }
    pending = args;
    if (timer === null) {
      timer = setTimeout(() => {
        timer = null;
        last = Date.now();
        if (pending) {
          const p = pending;
          pending = null;
          fn(...p);
        }
      }, remaining);
    }
  };
}

/** Промис, разрешающийся через `ms` миллисекунд (для демо-клиента и тестов). */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
