import type { CommandRegistry } from '../commands/CommandRegistry.d.ts';
import type { CommandContext } from '../commands/CommandContext.d.ts';
import type { Feature } from './Feature';
/**
 * Скачивание выделенных файлов. Через `download`-URL бэкенда (attachment) — даже если есть
 * публичный URL: публичный может открыться inline (картинка/PDF), а пользователь просил скачать.
 * Несколько файлов — по одному с паузой (браузеры блокируют пачку одновременных загрузок).
 */
export declare class DownloadFeature implements Feature {
    init(_ctx: CommandContext, commands: CommandRegistry): void;
    dispose(): void;
}
//# sourceMappingURL=DownloadFeature.d.ts.map