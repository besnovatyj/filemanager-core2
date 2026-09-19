import { type ReadonlySignal } from '../shared/reactive/signal.d.ts';
import { Capabilities } from '../domain/capabilities/Capabilities.d.ts';
import { type NameRules } from '../domain/naming/NameRules.d.ts';
import { NameValidator } from '../domain/naming/NameValidator.d.ts';
import type { DescribeResponse, Limits, UploadRules } from '../api/contract/describe.d.ts';
import type { FsClient } from '../api/client/FsClient.d.ts';
import { ApiError } from '../api/codec/ApiError.d.ts';
export type SessionStatus = 'idle' | 'loading' | 'ready' | 'error';
/**
 * Сессия с бэкендом: результат `describe` и всё, что из него выводится (capabilities, правила
 * имён, лимиты). Загружается один раз при открытии; повторный `load()` — при ошибке или по
 * явному запросу (например, после смены прав).
 */
export declare class SessionStore {
    private readonly client;
    readonly status: import("../shared/reactive/signal.d.ts").Signal<SessionStatus>;
    readonly error: import("../shared/reactive/signal.d.ts").Signal<ApiError | null>;
    readonly describe: import("../shared/reactive/signal.d.ts").Signal<DescribeResponse | null>;
    readonly capabilities: ReadonlySignal<Capabilities>;
    readonly nameRules: ReadonlySignal<NameRules>;
    readonly nameValidator: ReadonlySignal<NameValidator>;
    readonly uploadRules: ReadonlySignal<UploadRules>;
    readonly limits: ReadonlySignal<Limits>;
    readonly defaultMount: ReadonlySignal<string | null>;
    /** Допустимые размеры серверных миниатюр (по возрастанию); пусто — миниатюр нет. */
    readonly thumbnailSizes: ReadonlySignal<readonly number[]>;
    constructor(client: FsClient);
    load(): Promise<void>;
    get isReady(): boolean;
}
//# sourceMappingURL=SessionStore.d.ts.map