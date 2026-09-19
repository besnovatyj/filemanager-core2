import type { Command } from './Command';
import type { CommandContext } from './CommandContext';
/**
 * Реестр команд. Выполнение всегда идёт через {@link execute}: проверка `canExecute`,
 * единая обработка ошибок (диалог ошибки, кроме отмены), защита от исключений в UI.
 */
export declare class CommandRegistry {
    private readonly ctx;
    private readonly commands;
    private readonly byShortcut;
    constructor(ctx: CommandContext);
    register(command: Command): void;
    registerAll(commands: Iterable<Command>): void;
    get(id: string): Command | undefined;
    all(): Command[];
    /** Команды группы, отсортированные по order, без скрытых. */
    group(name: string): Command[];
    forShortcut(combo: string): Command | undefined;
    canExecute(id: string): boolean;
    /** Выполняет команду, если она доступна. Ошибки показывает пользователю (кроме отмены). */
    execute(id: string, arg?: unknown): Promise<boolean>;
    get context(): CommandContext;
}
//# sourceMappingURL=CommandRegistry.d.ts.map