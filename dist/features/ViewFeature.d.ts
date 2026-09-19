import type { CommandRegistry } from '../commands/CommandRegistry.d.ts';
import type { CommandContext } from '../commands/CommandContext.d.ts';
import type { Feature } from './Feature';
/** Команды представления: режим, сортировка, панели. */
export declare class ViewFeature implements Feature {
    init(_ctx: CommandContext, commands: CommandRegistry): void;
    dispose(): void;
}
//# sourceMappingURL=ViewFeature.d.ts.map