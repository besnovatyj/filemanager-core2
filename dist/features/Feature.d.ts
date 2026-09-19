import type { CommandRegistry } from '../commands/CommandRegistry.d.ts';
import type { CommandContext } from '../commands/CommandContext.d.ts';
/**
 * Фича — сценарий использования, связывающий сторы, клиент, очередь и диалоги, и регистрирующий
 * свои команды. Фичи не знают о разметке: UI вызывает команды или публичные методы фич
 * (например, `UploadFeature.uploadFiles()` при drop из ОС).
 */
export interface Feature {
    /** Регистрирует команды и подписки. */
    init(ctx: CommandContext, commands: CommandRegistry): void;
    dispose(): void;
}
//# sourceMappingURL=Feature.d.ts.map