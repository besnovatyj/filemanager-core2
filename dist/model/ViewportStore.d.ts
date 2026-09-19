/** Порог ширины (px), ниже которого раскладка считается узкой (телефон/узкое окно). */
export declare const NARROW_WIDTH = 640;
/**
 * Условия отображения: узкая раскладка и «грубый» указатель (палец).
 *
 * `narrow` вычисляется по ширине САМОГО проводника (ResizeObserver в `<fm-explorer>`), а не окна:
 * встроенный в узкую колонку менеджер должен вести себя как на телефоне. `coarse` — по
 * `matchMedia('(pointer: coarse)')`: меняет размеры целей и модель тапов, не раскладку.
 */
export declare class ViewportStore {
    readonly narrow: import("../shared/reactive/signal.d.ts").Signal<boolean>;
    readonly coarse: import("../shared/reactive/signal.d.ts").Signal<boolean>;
    private readonly media;
    private readonly onMedia;
    constructor();
    /** Сообщить фактическую ширину проводника (вызывает корневой элемент). */
    setWidth(width: number): void;
    dispose(): void;
}
//# sourceMappingURL=ViewportStore.d.ts.map