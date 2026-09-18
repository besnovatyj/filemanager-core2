/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {describe, expect, it} from 'vitest';
import {OperationQueue} from './OperationQueue';
import {sleep} from '@/shared/lib/timing';

describe('OperationQueue', () => {
  it('mutation-задачи выполняются строго по одной', async () => {
    const q = new OperationQueue();
    const log: string[] = [];
    const spec = (name: string) => ({
      kind: 'other' as const, lane: 'mutation' as const, label: name,
      execute: async () => {
        log.push(`start ${name}`);
        await sleep(5);
        log.push(`end ${name}`);
        return name;
      },
    });
    const a = q.enqueue(spec('a'));
    const b = q.enqueue(spec('b'));
    await Promise.all([a.wait(), b.wait()]);
    expect(log).toEqual(['start a', 'end a', 'start b', 'end b']);
    expect(a.status.peek()).toBe('done');
  });

  it('upload-полоса параллельна до лимита', async () => {
    const q = new OperationQueue({uploadConcurrency: 2});
    let concurrent = 0;
    let peak = 0;
    const spec = () => ({
      kind: 'upload' as const, lane: 'upload' as const, label: 'u',
      execute: async () => {
        concurrent++;
        peak = Math.max(peak, concurrent);
        await sleep(5);
        concurrent--;
      },
    });
    await Promise.all([q.enqueue(spec()).wait(), q.enqueue(spec()).wait(), q.enqueue(spec()).wait()]);
    expect(peak).toBe(2);
  });

  it('ошибка помечает failed, отмена — cancelled, прогресс ограничен 0..1', async () => {
    const q = new OperationQueue();
    const failed = q.enqueue({kind: 'other', lane: 'mutation', label: 'f', execute: async () => { throw new Error('boom'); }});
    await failed.wait().catch(() => undefined);
    expect(failed.status.peek()).toBe('failed');
    expect((failed.error as Error).message).toBe('boom');

    const slow = q.enqueue({
      kind: 'other', lane: 'mutation', label: 's',
      execute: (ctx) => new Promise<void>((_, reject) => {
        ctx.progress(5);
        ctx.signal.addEventListener('abort', () => reject(new DOMException('x', 'AbortError')));
      }),
    });
    await sleep(1);
    expect(slow.progress.peek()).toBe(1);
    slow.cancel();
    await slow.wait().catch(() => undefined);
    expect(slow.status.peek()).toBe('cancelled');
  });

  it('clearFinished оставляет только активные', async () => {
    const q = new OperationQueue();
    const done = q.enqueue({kind: 'other', lane: 'mutation', label: 'd', execute: async () => 1});
    await done.wait();
    q.enqueue({kind: 'other', lane: 'mutation', label: 'p', execute: () => new Promise(() => undefined)});
    q.clearFinished();
    expect(q.tasks.peek().map((t) => t.label)).toEqual(['p']);
  });
});
