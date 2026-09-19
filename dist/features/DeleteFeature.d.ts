import type { Node } from '../domain/node/Node.d.ts';
import type { CommandRegistry } from '../commands/CommandRegistry.d.ts';
import type { CommandContext } from '../commands/CommandContext.d.ts';
import type { Feature } from './Feature';
/** Удаление выделенного: подтверждение → задача → применение отчёта → диалог, если были ошибки. */
export declare class DeleteFeature implements Feature {
    private ctx;
    init(ctx: CommandContext, commands: CommandRegistry): void;
    deleteNodes(nodes: Node[]): Promise<void>;
    dispose(): void;
}
//# sourceMappingURL=DeleteFeature.d.ts.map