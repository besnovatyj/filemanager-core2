/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {Upload as TusUpload} from 'tus-js-client';
import type {FsClient} from '@/api/client/FsClient';
import type {DescribeResponse, TusRules} from '@/api/contract/describe';
import type {CallOptions, UploadRequest, UploadResponse} from '@/api/contract/operations';
import {ApiError} from '@/api/codec/ApiError';
import type {UploadStrategy} from './UploadStrategy';

/**
 * Докачиваемая загрузка по протоколу tus (tus-js-client, MIT) + финализация через операцию
 * контракта `upload-finalize` (§9.12).
 *
 * Разделение ответственности: tus доставляет байты во временный файл на сервере (куски, докачка
 * после обрыва, повтор с экспоненциальной паузой); наша операция переносит готовый файл в папку с
 * обычной семантикой (санитизация имени, политика, конфликты). Поэтому при конфликте повтор
 * `upload()` с новой стратегией НЕ гоняет байты заново: id завершённой загрузки запоминается по файлу.
 *
 * Стратегия берёт файлы не меньше `tus.threshold`; мелкие уходят обычным multipart.
 */
export class TusUploadStrategy implements UploadStrategy {
  readonly name = 'tus';
  /** Файлы, чьи байты уже на сервере: повторная финализация без загрузки. */
  private readonly completed = new WeakMap<File, string>();

  /**
   * @param client клиент контракта (для `upload-finalize`)
   * @param headers заголовки для tus-запросов (CSRF, X-Fs-Scope) — функция, т.к. могут обновляться
   * @param describe актуальный ответ describe (параметры tus берутся из него)
   */
  constructor(
    private readonly client: FsClient,
    private readonly headers: () => Record<string, string>,
    private readonly describe: () => DescribeResponse | null,
  ) {}

  canHandle(file: File, describe: DescribeResponse | null): boolean {
    const tus = TusUploadStrategy.rules(describe);
    return tus !== null && file.size >= tus.threshold;
  }

  async upload(request: UploadRequest, options: CallOptions): Promise<UploadResponse> {
    const tus = TusUploadStrategy.rules(this.describe(), request);
    const uploadId = this.completed.get(request.file) ?? await this.transfer(request.file, tus, options);
    this.completed.set(request.file, uploadId);
    try {
      const result = await this.client.uploadFinalize(
        {uploadId, path: request.path, ...(request.name ? {name: request.name} : {}), ...(request.onConflict ? {onConflict: request.onConflict} : {})},
        options.signal ? {signal: options.signal} : {},
      );
      this.completed.delete(request.file);
      return result;
    } catch (error) {
      // Конфликт — байты остаются на сервере для повтора; остальное — забываем загрузку.
      if (!ApiError.wrap(error).isConflict) this.completed.delete(request.file);
      throw error;
    }
  }

  /** Параметры tus из describe; при их отсутствии стратегия неприменима. */
  private static rules(describe: DescribeResponse | null, request?: UploadRequest): TusRules | null {
    const tus = describe?.upload.tus ?? request?.tus ?? null;
    return tus && tus.endpoint ? tus : null;
  }

  private transfer(file: File, tus: TusRules | null, options: CallOptions): Promise<string> {
    if (!tus) return Promise.reject(new ApiError('unsupported', 'tus недоступен'));
    return new Promise<string>((resolve, reject) => {
      const upload = new TusUpload(file, {
        endpoint: tus.endpoint,
        chunkSize: tus.chunkSize,
        retryDelays: [0, 1000, 3000, 5000, 10000],
        metadata: {filename: file.name, filetype: file.type},
        headers: this.headers(),
        // Fingerprint позволяет продолжить загрузку после перезагрузки страницы.
        storeFingerprintForResuming: true,
        removeFingerprintOnSuccess: true,
        onProgress: (sent, total) => options.onProgress?.(total > 0 ? sent / total : 0),
        onError: (error) => reject(new ApiError('network', error.message, {cause: error})),
        onSuccess: () => {
          const id = TusUploadStrategy.idFromUrl(upload.url);
          if (id) resolve(id);
          else reject(new ApiError('decode', 'tus: сервер не вернул идентификатор загрузки'));
        },
      });
      options.signal?.addEventListener('abort', () => {
        void upload.abort(true); // terminate: удалить незавершённую загрузку на сервере
        reject(ApiError.aborted());
      }, {once: true});
      void upload.findPreviousUploads().then((previous) => {
        const last = previous[0];
        if (last) upload.resumeFromPreviousUpload(last);
        upload.start();
      });
    });
  }

  /** Идентификатор загрузки — query `id` либо последний сегмент Location (оба формата допустимы протоколом). */
  private static idFromUrl(url: string | null): string | null {
    if (!url) return null;
    try {
      const parsed = new URL(url, location.href);
      return parsed.searchParams.get('id') ?? parsed.pathname.split('/').filter(Boolean).pop() ?? null;
    } catch {
      return null;
    }
  }
}
