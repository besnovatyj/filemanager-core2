/**
 * Транспорт — «как доставить операцию до бэкенда». Клиент ({@link HttpFsClient}) знает имена
 * операций и формы данных, транспорт — только URL, заголовки, fetch/XHR, отмену и прогресс.
 * Разделение позволяет подменить транспорт в тестах или добавить, например, ретраи, не трогая клиент.
 */
export interface UploadOptions {
    signal?: AbortSignal;
    onProgress?: (fraction: number) => void;
}
export interface Transport {
    /** POST JSON → `data` конверта (ошибки — ApiError). */
    postJson(operation: string, body: unknown, signal?: AbortSignal): Promise<unknown>;
    /** POST multipart → `data` конверта, с прогрессом отправки. */
    postMultipart(operation: string, form: FormData, options?: UploadOptions): Promise<unknown>;
    /** Абсолютный/относительный URL операции с query (для GET-операций, открываемых навигацией). */
    urlFor(operation: string, query?: Record<string, string>): string;
}
//# sourceMappingURL=Transport.d.ts.map