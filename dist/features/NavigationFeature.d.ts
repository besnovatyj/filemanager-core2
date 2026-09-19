import { type Node } from '../domain/node/Node.d.ts';
import type { CommandRegistry } from '../commands/CommandRegistry.d.ts';
import type { CommandContext } from '../commands/CommandContext.d.ts';
import type { Feature } from './Feature';
/**
 * Навигация: переход в папку, назад/вперёд/вверх, обновление, открытие узла.
 *
 * Слушает `nav.current` и загружает содержимое через DirectoryStore; при недоступной папке
 * (удалена, нет прав) откатывается к ближайшему живому предку — окно никогда не «зависает» на
 * несуществующем пути.
 */
export declare class NavigationFeature implements Feature {
    private readonly disposables;
    private ctx;
    private commands;
    private abort;
    init(ctx: CommandContext, commands: CommandRegistry): void;
    /** Открыть узел: папку — перейти; файл — в picker выбрать, в manager — скачать/открыть. */
    open(node: Node): Promise<void>;
    private reload;
    dispose(): void;
}
//# sourceMappingURL=NavigationFeature.d.ts.map