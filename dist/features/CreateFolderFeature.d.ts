import type { CommandRegistry } from '../commands/CommandRegistry.d.ts';
import type { CommandContext } from '../commands/CommandContext.d.ts';
import type { Feature } from './Feature';
/** Создание папки: диалог с именем по умолчанию «Новая папка (N)», валидация на лету, задача в очереди. */
export declare class CreateFolderFeature implements Feature {
    init(_ctx: CommandContext, commands: CommandRegistry): void;
    dispose(): void;
}
//# sourceMappingURL=CreateFolderFeature.d.ts.map