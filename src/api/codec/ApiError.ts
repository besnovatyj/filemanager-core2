/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {ERROR_CODES, type ErrorBody, type ErrorCode} from '@/api/contract/errors';

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

export class ApiError extends Error {
  constructor(
    readonly code: ClientErrorCode,
    message: string,
    readonly options: {
      httpStatus?: number;
      path?: string;
      details?: Record<string, unknown>;
      cause?: unknown;
    } = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get httpStatus(): number | undefined {
    return this.options.httpStatus;
  }

  get path(): string | undefined {
    return this.options.path;
  }

  get details(): Record<string, unknown> {
    return this.options.details ?? {};
  }

  /** Целевой узел уже существует — повод показать диалог замены. */
  get isConflict(): boolean {
    return this.code === 'exists';
  }

  get isAborted(): boolean {
    return this.code === 'aborted';
  }

  static fromBody(body: ErrorBody, httpStatus?: number): ApiError {
    const code: ClientErrorCode = ERROR_CODES.has(body.code) ? body.code : 'internal';
    const options: ApiError['options'] = {};
    if (httpStatus !== undefined) options.httpStatus = httpStatus;
    if (body.path !== undefined) options.path = body.path;
    if (body.details !== undefined) options.details = body.details;
    return new ApiError(code, body.message, options);
  }

  /** Ответ без нашего конверта (например, 403 от фреймворка хоста). */
  static fromHttpStatus(status: number, message?: string): ApiError {
    const code: ClientErrorCode =
      status === 400 ? 'bad_request'
        : status === 401 || status === 403 ? 'forbidden'
          : status === 404 ? 'not_found'
            : status === 409 ? 'exists'
              : status === 413 ? 'too_large'
                : status === 422 ? 'policy_rejected'
                  : status === 501 ? 'unsupported'
                    : 'internal';
    return new ApiError(code, message ?? `HTTP ${status}`, {httpStatus: status});
  }

  static network(cause: unknown): ApiError {
    return new ApiError('network', 'Сеть недоступна', {cause});
  }

  static aborted(): ApiError {
    return new ApiError('aborted', 'Операция отменена');
  }

  static isApiError(value: unknown): value is ApiError {
    return value instanceof ApiError;
  }

  /** Любое исключение → ApiError (для единообразной обработки в фичах). */
  static wrap(value: unknown): ApiError {
    if (value instanceof ApiError) return value;
    if (value instanceof DOMException && value.name === 'AbortError') return ApiError.aborted();
    if (value instanceof TypeError) return ApiError.network(value); // fetch кидает TypeError при сетевой ошибке
    return new ApiError('internal', value instanceof Error ? value.message : String(value), {cause: value});
  }
}
