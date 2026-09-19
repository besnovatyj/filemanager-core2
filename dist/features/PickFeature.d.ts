import type { CommandRegistry } from '../commands/CommandRegistry.d.ts';
import type { CommandContext } from '../commands/CommandContext.d.ts';
import type { Feature } from './Feature';
/**
 * Режим picker: команда «Выбрать» отдаёт хосту выделенные файлы (с учётом фильтра и
 * множественности) и закрывает окно через переданный колбэк.
 */
export declare class PickFeature implements Feature {
    private readonly close;
    constructor(close: () => void);
    init(_ctx: CommandContext, commands: CommandRegistry): void;
    private pickable;
    dispose(): void;
}
//# sourceMappingURL=PickFeature.d.ts.map