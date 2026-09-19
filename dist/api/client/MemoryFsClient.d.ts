import type { Node } from '../../domain/node/Node.d.ts';
import { type NameRules } from '../../domain/naming/NameRules.d.ts';
import type { MountCapabilities } from '../../domain/capabilities/Capabilities.d.ts';
import type { DescribeResponse } from '../contract/describe.d.ts';
import type { CallOptions, ContentRequest, ContentResponse, DeleteRequest, ListRequest, ListResponse, MkdirRequest, RenameRequest, StatRequest, TransferRequest, TreeRequest, TreeResponse, UploadRequest, UploadResponse, SearchRequest, SearchResponse, ArchiveRequest, ExtractRequest, ExtractResponse } from '../contract/operations.d.ts';
import type { OperationReport } from '../contract/report.d.ts';
import type { FsClient } from './FsClient';
export interface MemoryMountSpec {
    id: string;
    label: string;
    icon?: string;
    readOnly?: boolean;
    baseUrl?: string;
    /** Начальное содержимое: относительный путь → текст (папки создаются автоматически; путь с '/' на конце — пустая папка). */
    files?: Record<string, string>;
    capabilities?: Partial<MountCapabilities>;
}
export interface MemoryFsClientOptions {
    mounts: MemoryMountSpec[];
    /** Искусственная задержка ответов, мс — чтобы в демо были видны спиннеры и прогресс. */
    latencyMs?: number;
    naming?: Partial<NameRules>;
    /** Какие операции «разрешены пользователю» (по умолчанию все). */
    allowedOperations?: string[];
}
/**
 * Файловая система в памяти, реализующая контракт bescms-fs так же строго, как сервер:
 * те же коды ошибок, стратегии конфликтов, отчёты, правила имён.
 *
 * Назначение: демо-страница без бэкенда и тесты фич (весь фронтенд проверяется без сервера —
 * это и есть смысл порта {@link FsClient}). Не для продакшена.
 */
export declare class MemoryFsClient implements FsClient {
    private readonly entries;
    private readonly mounts;
    private readonly baseUrls;
    private readonly naming;
    private readonly validator;
    private readonly latency;
    private readonly allowed;
    constructor(options: MemoryFsClientOptions);
    describe(): Promise<DescribeResponse>;
    list(request: ListRequest, options?: CallOptions): Promise<ListResponse>;
    /** Демо-архив: файл `.zip`, содержимое — список упакованных путей (настоящего ZIP в памяти нет). */
    archive(request: ArchiveRequest, options?: CallOptions): Promise<UploadResponse>;
    extract(request: ExtractRequest, options?: CallOptions): Promise<ExtractResponse>;
    search(request: SearchRequest, options?: CallOptions): Promise<SearchResponse>;
    tree(request: TreeRequest, options?: CallOptions): Promise<TreeResponse>;
    stat(request: StatRequest, options?: CallOptions): Promise<Node>;
    content(request: ContentRequest, options?: CallOptions): Promise<ContentResponse>;
    mkdir(request: MkdirRequest, options?: CallOptions): Promise<Node>;
    rename(request: RenameRequest, options?: CallOptions): Promise<Node>;
    move(request: TransferRequest, options?: CallOptions): Promise<OperationReport>;
    copy(request: TransferRequest, options?: CallOptions): Promise<OperationReport>;
    delete(request: DeleteRequest, options?: CallOptions): Promise<OperationReport>;
    upload(request: UploadRequest, options?: CallOptions): Promise<UploadResponse>;
    uploadFinalize(): Promise<UploadResponse>;
    thumbnailUrl(path: string): string | null;
    previewUrl(path: string): string | null;
    downloadUrl(path: string): string | null;
    private transfer;
    private delay;
    private assertAllowed;
    private parse;
    private table;
    private mountInfo;
    private assertWritable;
    private approveName;
    private resolveDir;
    private resolveExisting;
    private ensureDir;
    private childrenOf;
    private nodeAt;
    private mountNode;
    private rootNode;
    private moveSubtree;
    private copySubtree;
    private removeSubtree;
}
//# sourceMappingURL=MemoryFsClient.d.ts.map