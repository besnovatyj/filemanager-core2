import { type ReadonlySignal } from '../../shared/reactive/signal.d.ts';
import { Emitter } from '../../shared/lib/Emitter.d.ts';
import { Task, type TaskSpec } from './Task';
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
export declare class OperationQueue {
    readonly events: Emitter<QueueEvents>;
    private readonly tasksSignal;
    private readonly running;
    private readonly limits;
    constructor(options?: {
        uploadConcurrency?: number;
    });
    /** Все задачи (включая завершённые — панель показывает историю до очистки). */
    get tasks(): ReadonlySignal<readonly Task[]>;
    enqueue<R>(spec: TaskSpec<R>): Task<R>;
    /** Поставить и дождаться результата — для команд, которым нужен ответ. */
    run<R>(spec: TaskSpec<R>): Promise<R>;
    cancel(id: string): void;
    cancelAll(): void;
    /** Убрать завершённые задачи из списка. */
    clearFinished(): void;
    get activeCount(): number;
    private pump;
}
//# sourceMappingURL=OperationQueue.d.ts.map