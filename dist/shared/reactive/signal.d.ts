/** Значение, которое можно только читать и на которое можно подписаться. */
export interface ReadonlySignal<T> {
    /** Текущее значение; чтение внутри computed/effect создаёт зависимость. */
    readonly value: T;
    /** Чтение без создания зависимости. */
    peek(): T;
    /** Подписка на изменения; возвращает функцию отписки. Вызывается сразу с текущим значением. */
    subscribe(listener: (value: T) => void): () => void;
}
/** Изменяемый сигнал. */
export interface Signal<T> extends ReadonlySignal<T> {
    value: T;
    set(value: T): void;
    /** Обновление через функцию от предыдущего значения. */
    update(updater: (previous: T) => T): void;
}
/** Создаёт изменяемый сигнал. `equals` — сравнение для подавления лишних уведомлений. */
export declare function signal<T>(initial: T, equals?: (a: T, b: T) => boolean): Signal<T>;
/** Создаёт вычисляемое значение: пересчитывается лениво, только если изменились источники. */
export declare function computed<T>(compute: () => T, equals?: (a: T, b: T) => boolean): ReadonlySignal<T>;
/**
 * Создаёт эффект: выполняется немедленно и при каждом изменении прочитанных сигналов.
 * Функция может вернуть cleanup, который вызовется перед следующим запуском и при dispose.
 *
 * @returns функция остановки эффекта
 */
export declare function effect(fn: () => void | (() => void)): () => void;
/** Группирует несколько записей: эффекты выполнятся один раз после завершения. */
export declare function batch<T>(fn: () => T): T;
/** Выполняет функцию без отслеживания зависимостей. */
export declare function untracked<T>(fn: () => T): T;
//# sourceMappingURL=signal.d.ts.map