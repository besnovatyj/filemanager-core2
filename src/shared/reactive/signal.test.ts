/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {describe, expect, it} from 'vitest';
import {batch, computed, effect, signal, untracked} from './signal';

describe('signal', () => {
  it('хранит и отдаёт значение', () => {
    const s = signal(1);
    expect(s.value).toBe(1);
    s.value = 2;
    expect(s.peek()).toBe(2);
  });

  it('computed пересчитывается лениво и кэшируется', () => {
    const a = signal(2);
    let runs = 0;
    const doubled = computed(() => {
      runs++;
      return a.value * 2;
    });
    expect(runs).toBe(0);
    expect(doubled.value).toBe(4);
    expect(doubled.value).toBe(4);
    expect(runs).toBe(1);
    a.value = 3;
    expect(runs).toBe(1); // ещё не читали
    expect(doubled.value).toBe(6);
    expect(runs).toBe(2);
  });

  it('effect выполняется сразу и при изменениях, dispose останавливает', () => {
    const s = signal('a');
    const seen: string[] = [];
    const stop = effect(() => {
      seen.push(s.value);
    });
    s.value = 'b';
    stop();
    s.value = 'c';
    expect(seen).toEqual(['a', 'b']);
  });

  it('batch откладывает эффекты до конца группы', () => {
    const a = signal(1);
    const b = signal(1);
    let runs = 0;
    effect(() => {
      runs++;
      void (a.value + b.value);
    });
    batch(() => {
      a.value = 2;
      b.value = 2;
    });
    expect(runs).toBe(2); // 1 первичный + 1 после batch
  });

  it('одинаковое значение не уведомляет', () => {
    const s = signal(1);
    let runs = 0;
    effect(() => {
      runs++;
      void s.value;
    });
    s.value = 1;
    expect(runs).toBe(1);
  });

  it('untracked не создаёт зависимость', () => {
    const tracked = signal(1);
    const ignored = signal(1);
    let runs = 0;
    effect(() => {
      runs++;
      void tracked.value;
      untracked(() => ignored.value);
    });
    ignored.value = 2;
    expect(runs).toBe(1);
    tracked.value = 2;
    expect(runs).toBe(2);
  });

  it('цепочка computed → computed → effect обновляется транзитивно', () => {
    const a = signal(1);
    const b = computed(() => a.value + 1);
    const c = computed(() => b.value * 10);
    const seen: number[] = [];
    effect(() => {
      seen.push(c.value);
    });
    a.value = 2;
    expect(seen).toEqual([20, 30]);
  });

  it('cleanup эффекта вызывается перед повторным запуском', () => {
    const s = signal(0);
    const log: string[] = [];
    effect(() => {
      log.push(`run ${s.value}`);
      return () => log.push(`cleanup ${s.value}`);
    });
    s.value = 1;
    expect(log).toEqual(['run 0', 'cleanup 1', 'run 1']);
  });
});
