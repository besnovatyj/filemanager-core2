/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {computed, signal, type ReadonlySignal} from '@/shared/reactive/signal';

/**
 * Счётчик запросов к серверу «в полёте». Питает индикатор в строке состояния: пользователь
 * всегда видит, что менеджер чего-то ждёт, даже если конкретная панель ничего не показывает
 * (например, `stat` для свойств или повторный `list` уже загруженной папки).
 */
export class ActivityStore {
  private readonly pending = signal(0);

  /** Есть ли незавершённые запросы. */
  readonly busy: ReadonlySignal<boolean> = computed(() => this.pending.value > 0);
  /** Число незавершённых запросов. */
  readonly count: ReadonlySignal<number> = this.pending;

  begin(): void {
    this.pending.update((n) => n + 1);
  }

  end(): void {
    this.pending.update((n) => Math.max(0, n - 1));
  }

  /** Обернуть промис: счётчик растёт на время его выполнения. */
  async track<T>(promise: Promise<T>): Promise<T> {
    this.begin();
    try {
      return await promise;
    } finally {
      this.end();
    }
  }
}
