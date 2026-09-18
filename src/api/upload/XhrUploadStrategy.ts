/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import type {FsClient} from '@/api/client/FsClient';
import type {CallOptions, UploadRequest, UploadResponse} from '@/api/contract/operations';
import type {UploadStrategy} from './UploadStrategy';

/** Загрузка одним multipart-запросом через операцию `upload` контракта. Подходит всегда — стратегия по умолчанию. */
export class XhrUploadStrategy implements UploadStrategy {
  readonly name = 'xhr';

  constructor(private readonly client: FsClient) {}

  canHandle(): boolean {
    return true;
  }

  upload(request: UploadRequest, options: CallOptions): Promise<UploadResponse> {
    return this.client.upload(request, options);
  }
}
