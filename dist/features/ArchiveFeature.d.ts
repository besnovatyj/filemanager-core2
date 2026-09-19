import type { Node } from '../domain/node/Node.d.ts';
import type { CommandRegistry } from '../commands/CommandRegistry.d.ts';
import type { CommandContext } from '../commands/CommandContext.d.ts';
import type { Feature } from './Feature';
/**
 * Архивы (контракт §9.16–9.17): «Добавить в архив» собирает ZIP из выделения в текущей папке,
 * «Извлечь» распаковывает выбранный `.zip` в новую папку рядом с ним. Обе операции идут через
 * очередь (полоса `mutation`), результат применяется к кэшу фактами; конфликт имён решается
 * стратегией `rename` — как делает проводник («archive (2).zip»), без вопросов пользователю.
 */
export declare class ArchiveFeature implements Feature {
    private ctx;
    init(ctx: CommandContext, commands: CommandRegistry): void;
    archive(nodes: Node[], targetDir: string): Promise<void>;
    extract(archive: Node): Promise<void>;
    dispose(): void;
}
//# sourceMappingURL=ArchiveFeature.d.ts.map