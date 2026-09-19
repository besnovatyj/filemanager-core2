import { type ReadonlySignal } from '../shared/reactive/signal.d.ts';
/**
 * Счётчик запросов к серверу «в полёте». Питает индикатор в строке состояния: пользователь
 * всегда видит, что менеджер чего-то ждёт, даже если конкретная панель ничего не показывает
 * (например, `stat` для свойств или повторный `list` уже загруженной папки).
 */
export declare class ActivityStore {
    private readonly pending;
    /** Есть ли незавершённые запросы. */
    readonly busy: ReadonlySignal<boolean>;
    /** Число незавершённых запросов. */
    readonly count: ReadonlySignal<number>;
    begin(): void;
    end(): void;
    /** Обернуть промис: счётчик растёт на время его выполнения. */
    track<T>(promise: Promise<T>): Promise<T>;
}
//# sourceMappingURL=ActivityStore.d.ts.map