/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import type {DisposeFn} from './Disposable';

export type {DisposeFn};

type Listener<T> = (payload: T) => void;

/**
 * Типизированный эмиттер событий для случаев, где событие — по природе событие (задача очереди
 * завершилась, транспорт сообщил прогресс), а не состояние. Для состояния — сигналы.
 *
 * @template Events карта `имя события → тип payload` (`void` — без payload).
 */
export class Emitter<Events extends Record<string, unknown>> {
  private readonly listeners = new Map<keyof Events, Set<Listener<never>>>();

  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): DisposeFn {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener as Listener<never>);
    return () => this.off(event, listener);
  }

  once<K extends keyof Events>(event: K, listener: Listener<Events[K]>): DisposeFn {
    const off = this.on(event, (payload) => {
      off();
      listener(payload);
    });
    return off;
  }

  off<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
    this.listeners.get(event)?.delete(listener as Listener<never>);
  }

  emit<K extends keyof Events>(event: K, ...args: Events[K] extends void ? [] : [Events[K]]): void {
    const set = this.listeners.get(event);
    if (!set) {
      return;
    }
    const payload = args[0] as Events[K];
    for (const listener of [...set]) {
      try {
        (listener as Listener<Events[K]>)(payload);
      } catch (error) {
        console.error(`[Emitter] ошибка в обработчике "${String(event)}"`, error);
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
