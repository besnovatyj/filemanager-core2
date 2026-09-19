import type { CommandContext } from '../../commands/CommandContext.d.ts';
import type { CommandRegistry } from '../../commands/CommandRegistry.d.ts';
import type { NavigationFeature, RenameFeature, UploadFeature, TransferFeature, DeleteFeature, SearchFeature, ArchiveFeature } from '../../features/index.d.ts';
import type { FmMenu, MenuEntry } from '../primitives/FmMenu.d.ts';
import type { DndAdapter } from '../ports/DndAdapter.d.ts';
import type { Virtualizer } from '../ports/Virtualizer.d.ts';
/**
 * Зависимости UI-компонентов проводника. Web Components создаются без аргументов, поэтому
 * получают этот объект через `bind(deps)` сразу после создания (до вставки в DOM).
 */
export interface ExplorerDeps {
    readonly ctx: CommandContext;
    readonly commands: CommandRegistry;
    readonly features: {
        readonly navigation: NavigationFeature;
        readonly rename: RenameFeature;
        readonly upload: UploadFeature;
        readonly transfer: TransferFeature;
        readonly delete: DeleteFeature;
        readonly search: SearchFeature;
        readonly archive: ArchiveFeature;
    };
    /** Общее всплывающее меню приложения. */
    readonly menu: FmMenu;
    /** Адаптер перетаскивания (порт). */
    readonly dnd: DndAdapter;
    /** Фабрика виртуализации списка (порт; экземпляр на панель). */
    createVirtualizer(): Virtualizer;
    /** Открыть меню из команд по списку id ('|' — разделитель). */
    openMenu(ids: readonly string[], at: {
        x: number;
        y: number;
    }, extra?: MenuEntry[]): void;
}
/** Пункты меню по id команд; '|' — разделитель; скрытые и отсутствующие команды пропускаются. */
export declare function entriesFromIds(commands: CommandRegistry, ids: readonly string[]): MenuEntry[];
/** Контекстное меню элемента (файла/папки). */
export declare const ITEM_MENU: readonly string[];
/** Контекстное меню пустого места текущей папки. */
export declare const FOLDER_MENU: readonly string[];
/** Меню «Вид». */
export declare const VIEW_MENU: readonly string[];
//# sourceMappingURL=deps.d.ts.map