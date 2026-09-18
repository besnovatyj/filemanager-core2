/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import type {Node} from '@/domain/node/Node';
import type {DescribeResponse} from '@/api/contract/describe';
import type {
  CallOptions, ContentRequest, ContentResponse, DeleteRequest, ListRequest, ListResponse, MkdirRequest,
  RenameRequest, StatRequest, TransferRequest, TreeRequest, TreeResponse, UploadFinalizeRequest, UploadRequest, UploadResponse, SearchRequest, SearchResponse} from '@/api/contract/operations';
import type {OperationReport} from '@/api/contract/report';
import type {FsClient} from './FsClient';

/** Приёмник событий «запрос начался / закончился» (в приложении — ActivityStore). */
export interface ActivityTracker {
  track<T>(promise: Promise<T>): Promise<T>;
}

/**
 * Декоратор клиента: каждый вызов учитывается трекером активности. Само поведение клиента не
 * меняется — это единственное место, где «все запросы» видны как одно целое, без правок фич.
 */
export class TrackingFsClient implements FsClient {
  constructor(private readonly inner: FsClient, private readonly activity: ActivityTracker) {}

  describe(options?: CallOptions): Promise<DescribeResponse> {
    return this.activity.track(this.inner.describe(options));
  }

  list(request: ListRequest, options?: CallOptions): Promise<ListResponse> {
    return this.activity.track(this.inner.list(request, options));
  }

  tree(request: TreeRequest, options?: CallOptions): Promise<TreeResponse> {
    return this.activity.track(this.inner.tree(request, options));
  }

  stat(request: StatRequest, options?: CallOptions): Promise<Node> {
    return this.activity.track(this.inner.stat(request, options));
  }

  content(request: ContentRequest, options?: CallOptions): Promise<ContentResponse> {
    return this.activity.track(this.inner.content(request, options));
  }

  mkdir(request: MkdirRequest, options?: CallOptions): Promise<Node> {
    return this.activity.track(this.inner.mkdir(request, options));
  }

  rename(request: RenameRequest, options?: CallOptions): Promise<Node> {
    return this.activity.track(this.inner.rename(request, options));
  }

  move(request: TransferRequest, options?: CallOptions): Promise<OperationReport> {
    return this.activity.track(this.inner.move(request, options));
  }

  copy(request: TransferRequest, options?: CallOptions): Promise<OperationReport> {
    return this.activity.track(this.inner.copy(request, options));
  }

  delete(request: DeleteRequest, options?: CallOptions): Promise<OperationReport> {
    return this.activity.track(this.inner.delete(request, options));
  }

  upload(request: UploadRequest, options?: CallOptions): Promise<UploadResponse> {
    return this.activity.track(this.inner.upload(request, options));
  }

  search(request: SearchRequest, options?: CallOptions): Promise<SearchResponse> {
    return this.activity.track(this.inner.search(request, options));
  }

  uploadFinalize(request: UploadFinalizeRequest, options?: CallOptions): Promise<UploadResponse> {
    return this.activity.track(this.inner.uploadFinalize(request, options));
  }

  downloadUrl(path: string): string | null {
    return this.inner.downloadUrl(path);
  }

  previewUrl(path: string): string | null {
    return this.inner.previewUrl(path);
  }

  thumbnailUrl(path: string, size: number, version?: number | null): string | null {
    return this.inner.thumbnailUrl(path, size, version);
  }
}
