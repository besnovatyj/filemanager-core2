import type { Node } from '../domain/node/Node.d.ts';
import type { CommandRegistry } from '../commands/CommandRegistry.d.ts';
import type { CommandContext } from '../commands/CommandContext.d.ts';
import type { Feature } from './Feature';
/**
 * Переименование. Два входа:
 *  - команда `rename` (F2) — включает inline-редактор в панели содержимого (сигнал {@link editing});
 *  - {@link commit} — вызывается редактором с новым именем; при ошибке возвращает текст, и редактор
 *    остаётся открытым для исправления.
 * Если панель не умеет inline (например, узкая раскладка), команда падает на диалог prompt.
 */
export declare class RenameFeature implements Feature {
    /** Путь узла, который сейчас переименовывается inline; null — нет. */
    readonly editing: import("../shared/reactive/signal.d.ts").Signal<string | null>;
    private ctx;
    /** Панель содержимого сообщает, умеет ли она inline-редактор. */
    inlineSupported: boolean;
    init(ctx: CommandContext, commands: CommandRegistry): void;
    /** Локальная проверка имени для подсказки в редакторе. */
    validate(node: Node, value: string): string | null;
    /** Применить новое имя. Возвращает текст ошибки (редактор остаётся) либо null при успехе. */
    commit(node: Node, value: string): Promise<string | null>;
    cancel(): void;
    private viaDialog;
    dispose(): void;
}
//# sourceMappingURL=RenameFeature.d.ts.map