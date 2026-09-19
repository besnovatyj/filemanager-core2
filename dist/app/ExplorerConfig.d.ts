import type { Node } from '../domain/node/Node.d.ts';
import type { FsClient } from '../api/client/FsClient.d.ts';
import type { Dictionary } from '../shared/i18n/i18n.d.ts';
import type { DndAdapter } from '../ui/ports/DndAdapter.d.ts';
import type { Virtualizer } from '../ui/ports/Virtualizer.d.ts';
import type { UploadStrategy } from '../api/upload/UploadStrategy.d.ts';
import type { ExplorerMode, ExplorerSettings } from '../model/ExplorerSettings.d.ts';
export type { ExplorerMode, ExplorerSettings };
/**
 * Конфигурация проводника — единственное, что хост передаёт в {@link createExplorer}.
 * Всё необязательное имеет дефолт; обязателен либо `connector`, либо готовый `client`.
 */
export interface ExplorerConfig {
    /** Базовый URL API bescms-fs (например '/File/backend/api'). Игнорируется, если задан `client`. */
    connector?: string;
    /** Заголовки хоста для запросов (CSRF и т. п.). */
    headers?: Record<string, string>;
    /** Готовый клиент (например, MemoryFsClient в демо/тестах). */
    client?: FsClient;
    /** Виртуальный путь при открытии; невалидный/недоступный → корень (области). */
    startPath?: string;
    /**
     * Область видимости: менеджер работает только внутри `root` (редактор конкретной сущности).
     * `token` — подписанный сервером токен области; отправляется заголовком `X-Fs-Scope` и в
     * query `download`, сервер отклоняет пути вне области. Без токена ограничение только в UI
     * (демо, доверенные клиенты).
     */
    scope?: {
        root: string;
        token?: string;
    };
    mode?: ExplorerMode;
    /** picker: разрешить выбор нескольких файлов. */
    pickMultiple?: boolean;
    /** picker: какие файлы можно выбрать (например, только изображения). Папки не выбираются. */
    pickFilter?: (node: Node) => boolean;
    /** picker: пользователь подтвердил выбор. */
    onPick?: (nodes: Node[]) => void;
    /** Окно закрыто (любым способом). */
    onClose?: () => void;
    /** Заголовок окна. */
    title?: string;
    /** Ключ localStorage для настроек вида; null — не сохранять. По умолчанию 'fm2:view'. */
    storageKey?: string | null;
    /** Словарь локализации поверх встроенного русского. */
    dictionary?: Dictionary;
    /** Локаль для форматирования чисел/дат. */
    locale?: string;
    /** Параллельных загрузок. */
    uploadConcurrency?: number;
    /** Таймаут JSON-запросов, мс. */
    timeoutMs?: number;
    /**
     * Замена встроенных реализаций портов (ARCHITECTURE.md §2): перетаскивание, виртуализация,
     * стратегии загрузки. Не задано — HTML5 DnD, сетка одинаковых ячеек, tus + multipart.
     */
    adapters?: {
        dnd?: DndAdapter;
        virtualizer?: () => Virtualizer;
        uploadStrategies?: (client: FsClient) => UploadStrategy[];
    };
}
export declare function resolveConfig(config: ExplorerConfig): ExplorerSettings;
//# sourceMappingURL=ExplorerConfig.d.ts.map