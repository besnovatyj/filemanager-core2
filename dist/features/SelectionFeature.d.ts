import type { CommandRegistry } from '../commands/CommandRegistry.d.ts';
import type { CommandContext } from '../commands/CommandContext.d.ts';
import type { Feature } from './Feature';
/** Команды выделения: всё / обратить / снять. Клавиатурная навигация живёт в панели содержимого. */
export declare class SelectionFeature implements Feature {
    init(_ctx: CommandContext, commands: CommandRegistry): void;
    dispose(): void;
}
//# sourceMappingURL=SelectionFeature.d.ts.map