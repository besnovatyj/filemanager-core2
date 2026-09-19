/** Откладывает вызов до паузы в `wait` мс; повторные вызовы сбрасывают таймер. */
export declare function debounce<A extends unknown[]>(fn: (...args: A) => void, wait: number): ((...args: A) => void) & {
    cancel(): void;
};
/** Не чаще одного вызова за `wait` мс; последний вызов в окне не теряется. */
export declare function throttle<A extends unknown[]>(fn: (...args: A) => void, wait: number): (...args: A) => void;
/** Промис, разрешающийся через `ms` миллисекунд (для демо-клиента и тестов). */
export declare function sleep(ms: number): Promise<void>;
//# sourceMappingURL=timing.d.ts.map