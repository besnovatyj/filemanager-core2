import type { CommandRegistry } from '../commands/CommandRegistry.d.ts';
import type { CommandContext } from '../commands/CommandContext.d.ts';
import type { TransferFeature } from './TransferFeature';
import type { Feature } from './Feature';
/** Копировать / вырезать / вставить поверх ClipboardStore и TransferFeature. */
export declare class ClipboardFeature implements Feature {
    private readonly transfer;
    constructor(transfer: TransferFeature);
    init(_ctx: CommandContext, commands: CommandRegistry): void;
    dispose(): void;
}
//# sourceMappingURL=ClipboardFeature.d.ts.map