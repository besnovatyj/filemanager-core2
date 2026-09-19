import type { Transport, UploadOptions } from './Transport';
export interface HttpTransportConfig {
    /** Базовый URL API (connector), например '/File/backend/api'. */
    baseUrl: string;
    /** Заголовки хоста (CSRF и т. п.); `X-Requested-With` добавляется всегда. */
    headers?: Record<string, string>;
    /** Таймаут JSON-запросов, мс (0 — без таймаута). Загрузки таймаута не имеют. */
    timeoutMs?: number;
    /** Режим cookies fetch; по умолчанию same-origin (сессия админки). */
    credentials?: RequestCredentials;
    /** Токен области видимости: заголовок `X-Fs-Scope` для XHR/fetch и query `scope` для GET-навигации. */
    scopeToken?: string;
}
/**
 * HTTP-транспорт: `fetch` для JSON, `XMLHttpRequest` для загрузок (у fetch нет прогресса отправки).
 * Все ответы проходят через {@link decodeEnvelope}; сетевые ошибки и отмена — ApiError.
 */
export declare class HttpTransport implements Transport {
    private readonly baseUrl;
    private readonly headers;
    private readonly timeoutMs;
    private readonly credentials;
    private readonly scopeToken;
    constructor(config: HttpTransportConfig);
    urlFor(operation: string, query?: Record<string, string>): string;
    postJson(operation: string, body: unknown, signal?: AbortSignal): Promise<unknown>;
    postMultipart(operation: string, form: FormData, options?: UploadOptions): Promise<unknown>;
}
//# sourceMappingURL=HttpTransport.d.ts.map