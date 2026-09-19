import type { MountInfo } from '../../domain/capabilities/Capabilities.d.ts';
import type { NameRules } from '../../domain/naming/NameRules.d.ts';
export type { MountInfo };
/** Версия контракта, которую реализует этот клиент. */
export declare const CONTRACT_NAME = "bescms-fs";
export declare const CONTRACT_VERSION = "1.0";
export interface OperationInfo {
    method: 'POST' | 'GET';
    batch?: boolean;
    async?: boolean;
    multipart?: boolean;
}
export interface UploadRules {
    maxFileSize: number | null;
    maxFilesPerRequest: number;
    allowedExtensions: string[] | null;
    allowedMime: string[] | null;
    /** Бэкенд поддерживает докачиваемую загрузку по tus; параметры — в `tus`. */
    chunked: boolean;
    tus?: TusRules | null;
}
/** Параметры tus-загрузки (контракт §13). */
export interface TusRules {
    /** URL создания загрузки (POST по протоколу tus); абсолютный или относительный к странице. */
    endpoint: string;
    /** Размер куска, байт. */
    chunkSize: number;
    /** Файлы меньше порога грузятся обычным multipart. */
    threshold: number;
}
export interface FeatureFlags {
    jobs: boolean;
    thumbnails: boolean;
    search: boolean;
    write: boolean;
    archive: boolean;
}
/** Параметры серверных миниатюр (§9.14): допустимые размеры, по возрастанию. */
export interface ThumbnailRules {
    sizes: number[];
}
export interface Limits {
    listPageSize: number;
    maxBatchItems: number;
    contentMaxBytes: number;
    /** Максимум результатов одного `search` (§9.15). */
    searchMaxResults?: number;
    /** Максимум несжатых байт на сборку/распаковку архива (§9.16–9.17). */
    archiveMaxBytes?: number;
}
/** Ответ `describe` (§6). */
export interface DescribeResponse {
    contract: {
        name: string;
        version: string;
    };
    server: {
        name: string;
        version: string;
    };
    operations: Record<string, OperationInfo>;
    mounts: MountInfo[];
    defaultMount: string | null;
    naming: NameRules;
    upload: UploadRules;
    features: FeatureFlags;
    limits: Limits;
    /** Серверные миниатюры; null/отсутствует — операция `thumbnail` недоступна. */
    thumbnails?: ThumbnailRules | null;
    /** Область запроса (по токену X-Fs-Scope); null/отсутствует — без ограничений. */
    scope?: {
        root: string;
    } | null;
}
//# sourceMappingURL=describe.d.ts.map