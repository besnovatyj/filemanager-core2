import type { Node } from '../../domain/node/Node.d.ts';
import type { DescribeResponse } from '../contract/describe.d.ts';
import type { CallOptions, ContentRequest, ContentResponse, DeleteRequest, ListRequest, ListResponse, MkdirRequest, RenameRequest, StatRequest, TransferRequest, TreeRequest, TreeResponse, UploadFinalizeRequest, UploadRequest, UploadResponse, SearchRequest, SearchResponse, ArchiveRequest, ExtractRequest, ExtractResponse } from '../contract/operations.d.ts';
import type { OperationReport } from '../contract/report.d.ts';
/**
 * Порт бэкенда (Ports & Adapters): всё приложение видит только этот интерфейс.
 * Реализации: {@link HttpFsClient} (bescms-fs по HTTP), {@link MemoryFsClient} (в памяти —
 * демо и тесты). Ошибки — всегда {@link ApiError}.
 */
export interface FsClient {
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
    /** Собрать ZIP из путей в папке (§9.16). Ответ — как у upload. */
    archive(request: ArchiveRequest, options?: CallOptions): Promise<UploadResponse>;
    /** Распаковать ZIP (§9.17). */
    extract(request: ExtractRequest, options?: CallOptions): Promise<ExtractResponse>;
    /** Поиск по именам в поддереве (§9.15). Бэкенд без поиска отвечает `unsupported`. */
    search(request: SearchRequest, options?: CallOptions): Promise<SearchResponse>;
    /** Завершение tus-загрузки (§9.12). Бэкенд без tus отвечает `unsupported`. */
    uploadFinalize(request: UploadFinalizeRequest, options?: CallOptions): Promise<UploadResponse>;
    /** URL скачивания через бэкенд (открывается навигацией браузера). null — не поддерживается. */
    downloadUrl(path: string): string | null;
    /** URL inline-предпросмотра изображения через бэкенд (§9.13). null — не поддерживается. */
    previewUrl(path: string): string | null;
    /**
     * URL серверной миниатюры (§9.14), вписанной в квадрат `size`. `version` (обычно mtime) попадает в
     * query, чтобы кэш браузера сбрасывался при изменении файла. null — не поддерживается.
     */
    thumbnailUrl(path: string, size: number, version?: number | null): string | null;
}
//# sourceMappingURL=FsClient.d.ts.map