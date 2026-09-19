import { type ReadonlySignal } from '../shared/reactive/signal.d.ts';
import type { Node } from '../domain/node/Node.d.ts';
import type { ApiError } from '../api/codec/ApiError.d.ts';
import type { LoadStatus } from './DirectoryStore.d.ts';
/**
 * Состояние поиска: запрос, корень (папка, из которой искали), результаты и признак усечения.
 *
 * Пока поиск активен (`active`), панель содержимого показывает результаты вместо текущей папки;
 * навигация в другую папку закрывает поиск. Стор — только состояние: запросы к серверу делает
 * `SearchFeature`, а факты операций (удалили/переименовали найденное) применяются точечно через
 * `applyRemoved`/`applyAdded`/`applyUpdated` — тем же способом, что и `DirectoryStore`.
 */
export declare class SearchStore {
    readonly query: import("../shared/reactive/signal.d.ts").Signal<string>;
    readonly root: import("../shared/reactive/signal.d.ts").Signal<string>;
    readonly status: import("../shared/reactive/signal.d.ts").Signal<LoadStatus>;
    readonly items: import("../shared/reactive/signal.d.ts").Signal<readonly Node[]>;
    readonly truncated: import("../shared/reactive/signal.d.ts").Signal<boolean>;
    readonly error: import("../shared/reactive/signal.d.ts").Signal<ApiError | null>;
    /** Счётчик запросов «поставь фокус в поле поиска» (Ctrl+F); UI реагирует на изменение. */
    readonly focusRequests: import("../shared/reactive/signal.d.ts").Signal<number>;
    readonly active: ReadonlySignal<boolean>;
    begin(query: string, root: string): void;
    complete(items: readonly Node[], truncated: boolean): void;
    fail(error: ApiError): void;
    clear(): void;
    requestFocus(): void;
    /** Узел (и всё под ним) исчез из хранилища. */
    applyRemoved(path: string): void;
    /** Появился узел: попадает в результаты, если лежит под корнем поиска и подходит под запрос. */
    applyAdded(node: Node): void;
    /** Метаданные узла обновились (stat) — заменить на месте. */
    applyUpdated(node: Node): void;
    private within;
}
//# sourceMappingURL=SearchStore.d.ts.map