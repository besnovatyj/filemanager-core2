/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import type {Node} from '@/domain/node/Node';
import type {DescribeResponse} from '@/api/contract/describe';
import type {
  CallOptions, ContentRequest, ContentResponse, DeleteRequest, ListRequest, ListResponse, MkdirRequest,
  RenameRequest, StatRequest, TransferRequest, TreeRequest, TreeResponse, UploadFinalizeRequest, UploadRequest, UploadResponse, SearchRequest, SearchResponse, ArchiveRequest, ExtractRequest, ExtractResponse} from '@/api/contract/operations';
import type {OperationReport} from '@/api/contract/report';
import {
  assertContent, assertDescribe, assertListing, assertNodeResponse, assertReport, assertTree, assertUpload, assertSearch, assertExtract} from '@/api/codec/guards';
import type {Transport} from '@/api/transport/Transport';
import type {FsClient} from './FsClient';

/**
 * Клиент bescms-fs v1 поверх {@link Transport}: имена операций, формы запросов и проверка ответов.
 * Никакого состояния — только перевод «метод → операция контракта».
 */
export class HttpFsClient implements FsClient {
  constructor(private readonly transport: Transport) {}

  async describe(options: CallOptions = {}): Promise<DescribeResponse> {
    return assertDescribe(await this.transport.postJson('describe', {}, options.signal));
  }

  async list(request: ListRequest, options: CallOptions = {}): Promise<ListResponse> {
    return assertListing(await this.transport.postJson('list', request, options.signal));
  }

  async tree(request: TreeRequest, options: CallOptions = {}): Promise<TreeResponse> {
    return assertTree(await this.transport.postJson('tree', request, options.signal));
  }

  async stat(request: StatRequest, options: CallOptions = {}): Promise<Node> {
    return assertNodeResponse(await this.transport.postJson('stat', request, options.signal)).node;
  }

  async content(request: ContentRequest, options: CallOptions = {}): Promise<ContentResponse> {
    return assertContent(await this.transport.postJson('content', request, options.signal));
  }

  async mkdir(request: MkdirRequest, options: CallOptions = {}): Promise<Node> {
    return assertNodeResponse(await this.transport.postJson('mkdir', request, options.signal)).node;
  }

  async rename(request: RenameRequest, options: CallOptions = {}): Promise<Node> {
    return assertNodeResponse(await this.transport.postJson('rename', request, options.signal)).node;
  }

  async move(request: TransferRequest, options: CallOptions = {}): Promise<OperationReport> {
    return assertReport(await this.transport.postJson('move', request, options.signal));
  }

  async copy(request: TransferRequest, options: CallOptions = {}): Promise<OperationReport> {
    return assertReport(await this.transport.postJson('copy', request, options.signal));
  }

  async delete(request: DeleteRequest, options: CallOptions = {}): Promise<OperationReport> {
    return assertReport(await this.transport.postJson('delete', request, options.signal));
  }

  async upload(request: UploadRequest, options: CallOptions = {}): Promise<UploadResponse> {
    const form = new FormData();
    form.append('path', request.path);
    if (request.name) form.append('name', request.name);
    if (request.onConflict) form.append('onConflict', request.onConflict);
    form.append('file', request.file, request.file.name);
    const uploadOptions: {signal?: AbortSignal; onProgress?: (f: number) => void} = {};
    if (options.signal) uploadOptions.signal = options.signal;
    if (options.onProgress) uploadOptions.onProgress = options.onProgress;
    return assertUpload(await this.transport.postMultipart('upload', form, uploadOptions));
  }

  async archive(request: ArchiveRequest, options: CallOptions = {}): Promise<UploadResponse> {
    return assertUpload(await this.transport.postJson('archive', request, options.signal));
  }

  async extract(request: ExtractRequest, options: CallOptions = {}): Promise<ExtractResponse> {
    return assertExtract(await this.transport.postJson('extract', request, options.signal));
  }

  async search(request: SearchRequest, options: CallOptions = {}): Promise<SearchResponse> {
    return assertSearch(await this.transport.postJson('search', request, options.signal));
  }

  async uploadFinalize(request: UploadFinalizeRequest, options: CallOptions = {}): Promise<UploadResponse> {
    return assertUpload(await this.transport.postJson('upload-finalize', request, options.signal));
  }

  downloadUrl(path: string): string | null {
    return this.transport.urlFor('download', {path});
  }

  previewUrl(path: string): string | null {
    return this.transport.urlFor('preview', {path});
  }

  thumbnailUrl(path: string, size: number, version: number | null = null): string | null {
    const query: Record<string, string> = {path, size: String(size)};
    if (version !== null) query.v = String(version);
    return this.transport.urlFor('thumbnail', query);
  }
}
