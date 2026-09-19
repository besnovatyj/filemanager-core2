import type { CommandRegistry } from '../commands/CommandRegistry.d.ts';
import type { CommandContext } from '../commands/CommandContext.d.ts';
import type { Feature } from './Feature';
/** Файл вместе с относительным путём папок (при перетаскивании каталога из ОС). */
export interface UploadEntry {
    file: File;
    /** Подпапки относительно целевой директории, например ['photos', '2026']. */
    dirs: string[];
}
/**
 * Загрузка файлов: кнопка (диалог выбора), drop из ОС (включая папки через
 * `webkitGetAsEntry`), прогресс по каждой задаче, конфликты через диалог с «применить ко всем».
 *
 * Каждый файл — отдельная задача полосы `upload` (параллельность ограничена очередью), поэтому
 * прогресс и отмена индивидуальны, а один упавший файл не рушит остальные.
 */
export declare class UploadFeature implements Feature {
    private ctx;
    private input;
    init(ctx: CommandContext, commands: CommandRegistry): void;
    /** Открыть системный диалог выбора файлов. */
    private pickFiles;
    /**
     * Загрузить набор файлов в папку. Для файлов с `dirs` сначала создаются подпапки
     * (одна `mkdir`-задача на уникальный путь; уже существующие — пропускаются).
     */
    uploadFiles(entries: UploadEntry[], targetDir: string): Promise<void>;
    /** Разобрать DataTransfer (drop из ОС) в записи с относительными папками. */
    entriesFromDataTransfer(dt: DataTransfer): Promise<UploadEntry[]>;
    private walkEntry;
    /** Создать цепочку подпапок; вернуть путь конечной либо null при неисправимой ошибке. */
    private ensureDirs;
    dispose(): void;
}
//# sourceMappingURL=UploadFeature.d.ts.map