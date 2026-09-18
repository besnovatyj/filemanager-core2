/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {ApiError} from '@/api/codec/ApiError';
import {decodeEnvelope, parseJsonSafe} from '@/api/codec/envelope';
import type {Transport, UploadOptions} from './Transport';

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
export class HttpTransport implements Transport {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly timeoutMs: number;
  private readonly credentials: RequestCredentials;
  private readonly scopeToken: string | null;

  constructor(config: HttpTransportConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.headers = {'X-Requested-With': 'XMLHttpRequest', ...(config.headers ?? {})};
    this.timeoutMs = config.timeoutMs ?? 60_000;
    this.credentials = config.credentials ?? 'same-origin';
    this.scopeToken = config.scopeToken ?? null;
    if (this.scopeToken) this.headers['X-Fs-Scope'] = this.scopeToken;
  }

  urlFor(operation: string, query: Record<string, string> = {}): string {
    // GET-навигация (download) не умеет заголовков — токен области уходит в query.
    const params = new URLSearchParams(this.scopeToken ? {...query, scope: this.scopeToken} : query).toString();
    return `${this.baseUrl}/${operation}${params ? '?' + params : ''}`;
  }

  async postJson(operation: string, body: unknown, signal?: AbortSignal): Promise<unknown> {
    const controller = new AbortController();
    const onAbort = (): void => controller.abort();
    signal?.addEventListener('abort', onAbort, {once: true});
    const timer = this.timeoutMs > 0 ? setTimeout(() => controller.abort(), this.timeoutMs) : null;

    try {
      const response = await fetch(this.urlFor(operation), {
        method: 'POST',
        credentials: this.credentials,
        headers: {...this.headers, 'Content-Type': 'application/json', Accept: 'application/json'},
        body: JSON.stringify(body ?? {}),
        signal: controller.signal,
      });
      const text = await response.text();
      return decodeEnvelope(response.status, parseJsonSafe(text));
    } catch (error) {
      if (signal?.aborted) throw ApiError.aborted();
      if (controller.signal.aborted) throw new ApiError('network', 'Превышено время ожидания ответа', {cause: error});
      throw ApiError.wrap(error);
    } finally {
      if (timer !== null) clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  }

  postMultipart(operation: string, form: FormData, options: UploadOptions = {}): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', this.urlFor(operation), true);
      xhr.withCredentials = this.credentials === 'include';
      xhr.responseType = 'text';
      for (const [name, value] of Object.entries(this.headers)) {
        xhr.setRequestHeader(name, value);
      }
      xhr.setRequestHeader('Accept', 'application/json');

      const onAbort = (): void => xhr.abort();
      options.signal?.addEventListener('abort', onAbort, {once: true});
      const cleanup = (): void => options.signal?.removeEventListener('abort', onAbort);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && options.onProgress) {
          options.onProgress(event.total > 0 ? event.loaded / event.total : 0);
        }
      };
      xhr.onload = () => {
        cleanup();
        try {
          resolve(decodeEnvelope(xhr.status, parseJsonSafe(xhr.responseText)));
        } catch (error) {
          reject(error);
        }
      };
      xhr.onerror = () => {
        cleanup();
        reject(ApiError.network(new Error('XHR error')));
      };
      xhr.onabort = () => {
        cleanup();
        reject(ApiError.aborted());
      };
      xhr.send(form);
    });
  }
}
