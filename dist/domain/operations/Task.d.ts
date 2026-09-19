import { type ReadonlySignal } from '../../shared/reactive/signal.d.ts';
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
export declare class Task<R = unknown> {
    private readonly spec;
    readonly id: string;
    readonly kind: TaskKind;
    readonly lane: TaskLane;
    readonly label: string;
    readonly paths: readonly string[];
    readonly createdAt: number;
    private readonly statusSignal;
    private readonly progressSignal;
    private readonly controller;
    private readonly settled;
    private resolveSettled;
    private rejectSettled;
    private resultValue;
    private errorValue;
    constructor(spec: TaskSpec<R>);
    get status(): ReadonlySignal<TaskStatus>;
    get progress(): ReadonlySignal<number | null>;
    get result(): R | undefined;
    get error(): unknown;
    get isFinished(): boolean;
    /** Промис завершения (для вызывающего кода: дождаться результата команды). */
    wait(): Promise<R>;
    cancel(): void;
    /** Вызывается очередью. */
    run(): Promise<void>;
    private finish;
}
//# sourceMappingURL=Task.d.ts.map