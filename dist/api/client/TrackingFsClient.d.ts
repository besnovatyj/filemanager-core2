import type { Node } from '../../domain/node/Node.d.ts';
import type { DescribeResponse } from '../contract/describe.d.ts';
import type { CallOptions, ContentRequest, ContentResponse, DeleteRequest, ListRequest, ListResponse, MkdirRequest, RenameRequest, StatRequest, TransferRequest, TreeRequest, TreeResponse, UploadFinalizeRequest, UploadRequest, UploadResponse, SearchRequest, SearchResponse, ArchiveRequest, ExtractRequest, ExtractResponse } from '../contract/operations.d.ts';
import type { OperationReport } from '../contract/report.d.ts';
import type { FsClient } from './FsClient';
/** Приёмник событий «запрос начался / закончился» (в приложении — ActivityStore). */
export interface ActivityTracker {
    track<T>(promise: Promise<T>): Promise<T>;
}
/**
 * Декоратор клиента: каждый вызов учитывается трекером активности. Само поведение клиента не
 * меняется — это единственное место, где «все запросы» видны как одно целое, без правок фич.
 */
export declare class TrackingFsClient implements FsClient {
    private readonly inner;
    private readonly activity;
    constructor(inner: FsClient, activity: ActivityTracker);
    describe(options?: CallOptions): Promise<DescribeResponse>;
    list(request: ListRequest, options?: CallOptions): Promise<ListResponse>;
    tree(request: TreeRequest, options?: CallOptions): Promise<TreeResponse>;
    stat(request: StatRequest, options?: CallOptions): Promise<Node>;
    content(request: ContentRequest, options?: CallOptions): Promise<ContentResponse>;
    mkdir(request: MkdirRequest, options?: CallOptions): Promise<Node>;
    rename(request: RenameRequest, options?: CallOptions): Promise<Node>;
    move(request: TransferRequest, options?: CallOptions): Promise<OperationReport>;
    copy(request: TransferRequest, options?: CallOptions): Promise<OperationReport>;
    delete(request: DeleteRequest, options?: CallOptions): Promise<OperationReport>;
    upload(request: UploadRequest, options?: CallOptions): Promise<UploadResponse>;
    archive(request: ArchiveRequest, options?: CallOptions): Promise<UploadResponse>;
    extract(request: ExtractRequest, options?: CallOptions): Promise<ExtractResponse>;
    search(request: SearchRequest, options?: CallOptions): Promise<SearchResponse>;
    uploadFinalize(request: UploadFinalizeRequest, options?: CallOptions): Promise<UploadResponse>;
    downloadUrl(path: string): string | null;
    previewUrl(path: string): string | null;
    thumbnailUrl(path: string, size: number, version?: number | null): string | null;
}
//# sourceMappingURL=TrackingFsClient.d.ts.map