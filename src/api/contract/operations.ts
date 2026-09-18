/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import type {Node} from '@/domain/node/Node';
import type {SortSpec} from '@/domain/sorting/comparators';
import type {ConflictStrategy} from '@/domain/conflict/ConflictResolution';
import type {OperationReport} from './report';
import type {TusRules} from './describe';

/** §9.1 */
export interface ListRequest {
  path: string;
  cursor?: string | null;
  limit?: number;
  sort?: SortSpec;
  filter?: {kinds?: ('file' | 'dir')[]; nameContains?: string; exts?: string[]};
}

export interface ListResponse {
  node: Node;
  items: Node[];
  nextCursor: string | null;
  total: number | null;
  /** Сервер отсортировал по запрошенному ключу (иначе клиент сортирует сам). */
  sorted?: boolean;
}

/** §9.2 */
export interface TreeRequest {
  path: string;
}

export interface TreeResponse {
  node: Node;
  items: Node[];
}

/** §9.3 */
export interface StatRequest {
  path: string;
}

export interface StatResponse {
  node: Node;
}

/** §9.4 */
export interface ContentRequest {
  path: string;
  maxBytes?: number;
}

export interface ContentResponse {
  node: Node;
  content: string;
  encoding: 'utf-8';
  truncated: boolean;
  binary: boolean;
}

/** §9.5 */
export interface MkdirRequest {
  parent: string;
  name: string;
}

/** §9.6 */
export interface RenameRequest {
  path: string;
  name: string;
}

export interface NodeResponse {
  node: Node;
}

/** §9.7 */
export interface TransferRequest {
  sources: string[];
  target: string;
  onConflict?: ConflictStrategy;
}

/** §9.8 */
export interface DeleteRequest {
  paths: string[];
}

export interface ReportResponse {
  report: OperationReport;
}

/** §9.9 */
export interface UploadRequest {
  path: string;
  file: File;
  name?: string;
  onConflict?: ConflictStrategy;
  /** Параметры tus (обычно берутся из describe; здесь — переопределение для стратегии). */
  tus?: TusRules;
}

export interface UploadResponse {
  node: Node;
  renamed: boolean;
  requestedName: string;
}

/** §9.12: завершить tus-загрузку — положить временный файл в папку через ту же семантику, что `upload`. */
export interface UploadFinalizeRequest {
  uploadId: string;
  path: string;
  name?: string;
  onConflict?: ConflictStrategy;
}

/** Опции вызова, общие для всех операций клиента. */
/** §9.15 */
export interface SearchRequest {
  path: string;
  /** Подстрока имени либо маска `*`/`?`. */
  query: string;
  /** Во вложенных папках (по умолчанию true). */
  recursive?: boolean;
  kinds?: ('file' | 'dir')[];
  limit?: number;
}

export interface SearchResponse {
  /** Корень поиска. */
  node: Node;
  items: Node[];
  /** Достигнут лимит результатов или бюджет обхода — список неполный. */
  truncated: boolean;
  /** Просмотрено записей хранилища. */
  scanned: number;
}

/** §9.16 */
export interface ArchiveRequest {
  paths: string[];
  /** Папка, куда положить архив. */
  target: string;
  /** Имя архива (расширение .zip добавится); по умолчанию — имя единственного источника или `archive`. */
  name?: string;
  onConflict?: ConflictStrategy;
}

/** §9.17 */
export interface ExtractRequest {
  path: string;
  /** Папка назначения; без неё рядом с архивом создаётся папка с его именем. */
  target?: string;
  /** Стратегия для файлов, которые уже есть в назначении. */
  onConflict?: ConflictStrategy;
}

export interface ExtractResponse {
  /** Папка, в которую распаковано. */
  node: Node;
  total: number;
  extracted: number;
  /** Пропущенные записи (первые 100): недопустимый путь, политика, конфликт при `fail`. */
  skipped: {name: string; code: string; message: string}[];
}

export interface CallOptions {
  signal?: AbortSignal;
  /** Только для upload: прогресс отправки 0..1. */
  onProgress?: (fraction: number) => void;
}
