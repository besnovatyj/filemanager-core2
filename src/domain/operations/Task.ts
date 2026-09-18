/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {signal, type ReadonlySignal, type Signal} from '@/shared/reactive/signal';
import {uid} from '@/shared/lib/uid';

export type TaskStatus = 'queued' | 'running' | 'done' | 'failed' | 'cancelled';

/** Вид задачи — для подписи и группировки в панели операций. */
export type TaskKind = 'upload' | 'move' | 'copy' | 'delete' | 'mkdir' | 'rename' | 'other';

/**
 * Полоса исполнения: задачи одной полосы идут последовательно, разные полосы — параллельно.
 * `mutation` — операции над структурой (по одной, чтобы кэш не «догонял» две правки сразу);
 * `upload` — загрузки (несколько параллельно, ограничено очередью).
 */
export type TaskLane = 'mutation' | 'upload';

export interface TaskContext {
  /** Сигнал отмены — исполнитель обязан передать его транспорту. */
  readonly signal: AbortSignal;
  /** Отчёт о прогрессе 0..1 (null — неопределённый). */
  progress(fraction: number | null): void;
}

export interface TaskSpec<R> {
  kind: TaskKind;
  lane: TaskLane;
  /** Подпись для панели операций. */
  label: string;
  /** Пути, которых касается задача (для инвалидации кэша и подсветки). */
  paths?: string[];
  execute(ctx: TaskContext): Promise<R>;
}

/**
 * Задача очереди операций: статус, прогресс, результат/ошибка, отмена.
 * Состояние — сигналы, чтобы панель операций перерисовывала ровно одну строку.
 */
export class Task<R = unknown> {
  readonly id = uid('task');
  readonly kind: TaskKind;
  readonly lane: TaskLane;
  readonly label: string;
  readonly paths: readonly string[];
  readonly createdAt = Date.now();

  private readonly statusSignal: Signal<TaskStatus> = signal<TaskStatus>('queued');
  private readonly progressSignal: Signal<number | null> = signal<number | null>(null);
  private readonly controller = new AbortController();
  private readonly settled: Promise<R>;
  private resolveSettled!: (value: R) => void;
  private rejectSettled!: (reason: unknown) => void;
  private resultValue: R | undefined;
  private errorValue: unknown;

  constructor(private readonly spec: TaskSpec<R>) {
    this.kind = spec.kind;
    this.lane = spec.lane;
    this.label = spec.label;
    this.paths = spec.paths ?? [];
    this.settled = new Promise<R>((resolve, reject) => {
      this.resolveSettled = resolve;
      this.rejectSettled = reject;
    });
    // Не оставляем «unhandled rejection», если владелец не ждёт результат.
    this.settled.catch(() => undefined);
  }

  get status(): ReadonlySignal<TaskStatus> {
    return this.statusSignal;
  }

  get progress(): ReadonlySignal<number | null> {
    return this.progressSignal;
  }

  get result(): R | undefined {
    return this.resultValue;
  }

  get error(): unknown {
    return this.errorValue;
  }

  get isFinished(): boolean {
    const s = this.statusSignal.peek();
    return s === 'done' || s === 'failed' || s === 'cancelled';
  }

  /** Промис завершения (для вызывающего кода: дождаться результата команды). */
  wait(): Promise<R> {
    return this.settled;
  }

  cancel(): void {
    if (this.isFinished) return;
    this.controller.abort();
    if (this.statusSignal.peek() === 'queued') {
      this.finish('cancelled', undefined, new DOMException('Задача отменена', 'AbortError'));
    }
  }

  /** Вызывается очередью. */
  async run(): Promise<void> {
    if (this.statusSignal.peek() !== 'queued') return;
    this.statusSignal.set('running');
    try {
      const result = await this.spec.execute({
        signal: this.controller.signal,
        progress: (fraction) => this.progressSignal.set(fraction === null ? null : Math.min(1, Math.max(0, fraction))),
      });
      this.finish('done', result, undefined);
    } catch (error) {
      const cancelled = this.controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError');
      this.finish(cancelled ? 'cancelled' : 'failed', undefined, error);
    }
  }

  private finish(status: TaskStatus, result: R | undefined, error: unknown): void {
    this.resultValue = result;
    this.errorValue = error;
    this.statusSignal.set(status);
    if (status === 'done') {
      this.progressSignal.set(1);
      this.resolveSettled(result as R);
    } else {
      this.rejectSettled(error);
    }
  }
}
