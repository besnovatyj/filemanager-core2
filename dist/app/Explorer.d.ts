import type { OperationQueue } from '../domain/operations/OperationQueue.d.ts';
import type { CommandContext } from '../commands/CommandContext.d.ts';
import type { CommandRegistry } from '../commands/CommandRegistry.d.ts';
import type { Keymap } from '../commands/Keymap.d.ts';
import type { ViewStore, DialogStore } from '../model/index.d.ts';
import type { FmMenu } from '../ui/primitives/FmMenu.d.ts';
import type { DialogHost } from '../ui/explorer/dialogs/DialogHost.d.ts';
import type { FmWindow } from '../ui/explorer/FmWindow.d.ts';
import type { FmExplorer } from '../widgets/FmExplorer.d.ts';
interface ExplorerInternals {
    element: FmExplorer;
    ctx: CommandContext;
    commands: CommandRegistry;
    view: ViewStore;
    dialogs: DialogStore;
    queue: OperationQueue;
    menu: FmMenu;
    dialogHost: DialogHost;
    keymap: Keymap;
    start(): Promise<void>;
    createWindow(): FmWindow;
    onClose(): void;
    dispose(): void;
}
/**
 * Публичный объект проводника, который получает хост из {@link createExplorer}.
 *
 * Жизненный цикл: `open()` (плавающее окно) или `mount(container)` (встроенный) → работа →
 * `close()`/`destroy()`. Повторное открытие после `destroy()` невозможно — создайте новый.
 */
export declare class Explorer {
    private readonly internals;
    private window;
    private started;
    private destroyed;
    constructor(internals: ExplorerInternals);
    /** Корневой элемент `<fm-explorer>` (для стилизации через CSS custom properties, data-theme). */
    get element(): HTMLElement;
    get commands(): CommandRegistry;
    get context(): CommandContext;
    /** Открыть в плавающем модальном окне. */
    open(): Promise<void>;
    /** Встроить в контейнер страницы (без окна). */
    mount(container: HTMLElement): Promise<void>;
    /** Перейти в папку. */
    navigate(path: string): void;
    focus(): void;
    /** Закрыть окно и освободить ресурсы. Вызывает `onClose` конфигурации. */
    close(): void;
    /** Освободить всё без вызова `onClose` (например, при удалении редактора со страницы). */
    destroy(): void;
    private start;
    private assertAlive;
}
export {};
//# sourceMappingURL=Explorer.d.ts.map