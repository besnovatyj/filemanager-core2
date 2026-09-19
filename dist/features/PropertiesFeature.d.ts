import type { CommandRegistry } from '../commands/CommandRegistry.d.ts';
import type { CommandContext } from '../commands/CommandContext.d.ts';
import type { Feature } from './Feature';
/** Свойства: для одного узла — точный `stat` (MIME, размеры изображения), для нескольких — сводка. */
export declare class PropertiesFeature implements Feature {
    init(_ctx: CommandContext, commands: CommandRegistry): void;
    dispose(): void;
}
//# sourceMappingURL=PropertiesFeature.d.ts.map