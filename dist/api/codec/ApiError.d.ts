import { type ErrorBody, type ErrorCode } from '../contract/errors.d.ts';
/**
 * Ошибка API на стороне клиента. Единый класс для всех источников:
 *  - конверт `{ok:false, error}` от бэкенда (код — из него);
 *  - не-конвертный ответ хоста (403/404 от фреймворка, HTML-страница ошибки) — код по HTTP-статусу;
 *  - сеть/таймаут/отмена — `network`/`aborted`;
 *  - несовместимый контракт — `contract`.
 *
 * `code` — то, по чему ветвится логика (`exists` → диалог конфликта); `message` — текст для
 * пользователя (от сервера или из словаря).
 */
export type ClientErrorCode = ErrorCode | 'network' | 'aborted' | 'contract' | 'decode';
export declare class ApiError extends Error {
    readonly code: ClientErrorCode;
    readonly options: {
        httpStatus?: number;
        path?: string;
        details?: Record<string, unknown>;
        cause?: unknown;
    };
    constructor(code: ClientErrorCode, message: string, options?: {
        httpStatus?: number;
        path?: string;
        details?: Record<string, unknown>;
        cause?: unknown;
    });
    get httpStatus(): number | undefined;
    get path(): string | undefined;
    get details(): Record<string, unknown>;
    /** Целевой узел уже существует — повод показать диалог замены. */
    get isConflict(): boolean;
    get isAborted(): boolean;
    static fromBody(body: ErrorBody, httpStatus?: number): ApiError;
    /** Ответ без нашего конверта (например, 403 от фреймворка хоста). */
    static fromHttpStatus(status: number, message?: string): ApiError;
    static network(cause: unknown): ApiError;
    static aborted(): ApiError;
    static isApiError(value: unknown): value is ApiError;
    /** Любое исключение → ApiError (для единообразной обработки в фичах). */
    static wrap(value: unknown): ApiError;
}
//# sourceMappingURL=ApiError.d.ts.map