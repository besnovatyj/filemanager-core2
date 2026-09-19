import { type ReadonlySignal } from '../shared/reactive/signal.d.ts';
import { VirtualPath } from '../domain/path/VirtualPath.d.ts';
/**
 * Текущая папка и история «назад/вперёд» (как у браузера/проводника).
 * Загрузку содержимого делает DirectoryStore; здесь — только адрес и стек.
 *
 * Корень области (`root`) — нижняя граница навигации: пути вне него отклоняются, «вверх» выше
 * него не работает. Это UI-часть ограничения; серверная — токен области (ExplorerConfig.scope).
 */
export declare class NavigationStore {
    readonly current: import("../shared/reactive/signal.d.ts").Signal<string>;
    /** Корень области видимости; '/' — без ограничений. */
    readonly root: string;
    private readonly backStack;
    private readonly forwardStack;
    readonly canGoBack: ReadonlySignal<boolean>;
    readonly canGoForward: ReadonlySignal<boolean>;
    readonly canGoUp: ReadonlySignal<boolean>;
    readonly currentPath: ReadonlySignal<VirtualPath>;
    constructor(start?: string, root?: string);
    /** Путь внутри области (корень области — тоже внутри). */
    within(path: string): boolean;
    /** Переход в папку с записью в историю. Повтор текущего пути историю не трогает; путь вне области игнорируется. */
    navigate(path: string): void;
    /** Замена текущего пути без записи в историю (например, папка удалена → уйти к родителю). */
    replace(path: string): void;
    back(): void;
    forward(): void;
    up(): void;
    /** Путь исчез (удалён/переименован) — уйти к ближайшему живому предку. */
    escapeFrom(removedPath: string): void;
}
//# sourceMappingURL=NavigationStore.d.ts.map