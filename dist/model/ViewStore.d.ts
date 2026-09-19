import { type SortSpec } from '../domain/sorting/comparators.d.ts';
export type ViewMode = 'details' | 'list' | 'tiles' | 'icons';
/**
 * Настройки представления: режим, сортировка, видимость/ширина панелей, фильтр по имени.
 * Всё, кроме фильтра и панели операций, сохраняется в localStorage под ключом хоста
 * (у разных виджетов на одной странице могут быть разные ключи).
 */
export declare class ViewStore {
    private readonly storageKey;
    readonly mode: import("../shared/reactive/signal.d.ts").Signal<ViewMode>;
    readonly sort: import("../shared/reactive/signal.d.ts").Signal<SortSpec>;
    readonly navPaneVisible: import("../shared/reactive/signal.d.ts").Signal<boolean>;
    readonly navPaneWidth: import("../shared/reactive/signal.d.ts").Signal<number>;
    readonly previewVisible: import("../shared/reactive/signal.d.ts").Signal<boolean>;
    readonly previewWidth: import("../shared/reactive/signal.d.ts").Signal<number>;
    readonly queuePaneVisible: import("../shared/reactive/signal.d.ts").Signal<boolean>;
    /** Узкая раскладка: дерево выдвинуто поверх содержимого (не сохраняется). */
    readonly navDrawerOpen: import("../shared/reactive/signal.d.ts").Signal<boolean>;
    readonly windowSize: import("../shared/reactive/signal.d.ts").Signal<{
        width: number;
        height: number;
    } | null>;
    /** Фильтр по имени в текущей папке (не сохраняется). */
    readonly filter: import("../shared/reactive/signal.d.ts").Signal<string>;
    private stopPersist;
    constructor(storageKey: string | null);
    dispose(): void;
    private restore;
    private persist;
}
//# sourceMappingURL=ViewStore.d.ts.map