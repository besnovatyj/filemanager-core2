/** Всё, что нужно освободить: подписку, эффект, DOM-слушатель, таймер. */
export type DisposeFn = () => void;
export interface Disposable {
    dispose(): void;
}
/**
 * Копилка функций освобождения. Компонент/фича собирает в неё всё, что создал, и освобождает
 * одним вызовом — так невозможно забыть отписаться от половины.
 */
export declare class DisposableStore implements Disposable {
    private items;
    private disposed;
    /** Регистрирует функцию освобождения (или объект с dispose) и возвращает её же для удобства. */
    add<T extends DisposeFn | Disposable>(item: T): T;
    /** Освобождает всё в обратном порядке регистрации. Идемпотентно. */
    dispose(): void;
    get isDisposed(): boolean;
}
/** Подписка на DOM-событие с автоматической отпиской через DisposableStore. */
export declare function listen<K extends keyof HTMLElementEventMap>(target: HTMLElement, type: K, listener: (event: HTMLElementEventMap[K]) => void, options?: AddEventListenerOptions): DisposeFn;
export declare function listen<K extends keyof DocumentEventMap>(target: Document, type: K, listener: (event: DocumentEventMap[K]) => void, options?: AddEventListenerOptions): DisposeFn;
export declare function listen<K extends keyof WindowEventMap>(target: Window, type: K, listener: (event: WindowEventMap[K]) => void, options?: AddEventListenerOptions): DisposeFn;
export declare function listen(target: EventTarget, type: string, listener: EventListener, options?: AddEventListenerOptions): DisposeFn;
//# sourceMappingURL=Disposable.d.ts.map