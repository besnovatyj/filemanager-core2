/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {signal, type ReadonlySignal} from '@/shared/reactive/signal';
import {Emitter} from '@/shared/lib/Emitter';
import {Task, type TaskLane, type TaskSpec} from './Task';

export interface QueueEvents extends Record<string, unknown> {
  /** Задача завершилась (любым статусом). */
  settled: Task;
  /** Задача поставлена. */
  enqueued: Task;
}

/**
 * Очередь операций (ARCHITECTURE.md §2.3). Задачи по полосам: `mutation` — строго по одной,
 * `upload` — до `uploadConcurrency` параллельно. Навигация в другую папку задачи не трогает.
 *
 * Пока бэкенд синхронный, задача «выполняется» ровно один HTTP-запрос; с появлением серверных
 * заданий (`jobs`) изменится только исполнитель задачи.
 */
export class OperationQueue {
  readonly events = new Emitter<QueueEvents>();

  private readonly tasksSignal = signal<readonly Task[]>([]);
  private readonly running = new Map<TaskLane, Set<Task>>([['mutation', new Set()], ['upload', new Set()]]);
  private readonly limits: Record<TaskLane, number>;

  constructor(options: {uploadConcurrency?: number} = {}) {
    this.limits = {mutation: 1, upload: options.uploadConcurrency ?? 3};
  }

  /** Все задачи (включая завершённые — панель показывает историю до очистки). */
  get tasks(): ReadonlySignal<readonly Task[]> {
    return this.tasksSignal;
  }

  enqueue<R>(spec: TaskSpec<R>): Task<R> {
    const task = new Task<R>(spec);
    this.tasksSignal.update((list) => [...list, task as Task]);
    this.events.emit('enqueued', task as Task);
    void this.pump(task.lane);
    return task;
  }

  /** Поставить и дождаться результата — для команд, которым нужен ответ. */
  run<R>(spec: TaskSpec<R>): Promise<R> {
    return this.enqueue(spec).wait();
  }

  cancel(id: string): void {
    this.tasksSignal.peek().find((t) => t.id === id)?.cancel();
  }

  cancelAll(): void {
    for (const t of this.tasksSignal.peek()) t.cancel();
  }

  /** Убрать завершённые задачи из списка. */
  clearFinished(): void {
    this.tasksSignal.update((list) => list.filter((t) => !t.isFinished));
  }

  get activeCount(): number {
    return this.tasksSignal.peek().filter((t) => !t.isFinished).length;
  }

  private async pump(lane: TaskLane): Promise<void> {
    const active = this.running.get(lane) as Set<Task>;
    while (active.size < this.limits[lane]) {
      const next = this.tasksSignal.peek().find((t) => t.lane === lane && t.status.peek() === 'queued');
      if (!next) return;
      active.add(next);
      void next.run().finally(() => {
        active.delete(next);
        this.events.emit('settled', next);
        void this.pump(lane);
      });
    }
  }
}
