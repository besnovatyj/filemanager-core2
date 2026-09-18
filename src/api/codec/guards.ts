/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import type {Node, NodeKind, NodeMeta, NodePermissions} from '@/domain/node/Node';
import type {DescribeResponse} from '@/api/contract/describe';
import type {ListResponse, TreeResponse, UploadResponse, ContentResponse, SearchResponse} from '@/api/contract/operations';
import type {OperationReport} from '@/api/contract/report';
import type {ErrorBody} from '@/api/contract/errors';
import {ApiError} from './ApiError';

/**
 * Runtime-проверка формы ответов (без внешних схем). Бэкенд эволюционирует; несовпадение
 * контракта должно всплыть здесь понятной ошибкой `decode`, а не `undefined` глубоко в UI.
 *
 * Проверяем обязательные поля и их типы; неизвестные поля игнорируем (правило эволюции §5).
 */

function fail(what: string, value: unknown): never {
  throw new ApiError('decode', `Некорректный ответ сервера: ${what}`, {details: {value}});
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

const KINDS: ReadonlySet<string> = new Set<NodeKind>(['file', 'dir', 'mount']);

export function assertNode(value: unknown): Node {
  if (!isObject(value)) fail('node не объект', value);
  if (typeof value.path !== 'string' || !value.path.startsWith('/')) fail('node.path', value);
  if (typeof value.name !== 'string') fail('node.name', value);
  if (typeof value.kind !== 'string' || !KINDS.has(value.kind)) fail('node.kind', value);
  const nullable = (v: unknown, type: 'string' | 'number'): boolean => v === null || v === undefined || typeof v === type;
  if (!nullable(value.size, 'number') || !nullable(value.mtime, 'number')) fail('node.size/mtime', value);
  if (!nullable(value.mime, 'string') || !nullable(value.ext, 'string') || !nullable(value.url, 'string')) fail('node.mime/ext/url', value);
  const node: Node = {
    path: value.path,
    name: value.name,
    kind: value.kind as NodeKind,
    mount: typeof value.mount === 'string' ? value.mount : null,
    size: typeof value.size === 'number' ? value.size : null,
    mtime: typeof value.mtime === 'number' ? value.mtime : null,
    mime: typeof value.mime === 'string' ? value.mime : null,
    ext: typeof value.ext === 'string' ? value.ext : null,
    url: typeof value.url === 'string' ? value.url : null,
    visibility: value.visibility === 'public' || value.visibility === 'private' ? value.visibility : null,
  };
  // Опциональные поля добавляем только при наличии: exactOptionalPropertyTypes запрещает undefined.
  if (isObject(value.perms)) (node as {perms?: NodePermissions}).perms = value.perms as NodePermissions;
  if (isObject(value.meta)) (node as {meta?: NodeMeta}).meta = value.meta as NodeMeta;
  return node;
}

export function assertNodeList(value: unknown): Node[] {
  if (!Array.isArray(value)) fail('items не массив', value);
  return value.map(assertNode);
}

export function assertListing(value: unknown): ListResponse {
  if (!isObject(value)) fail('list не объект', value);
  return {
    node: assertNode(value.node),
    items: assertNodeList(value.items),
    nextCursor: typeof value.nextCursor === 'string' ? value.nextCursor : null,
    total: typeof value.total === 'number' ? value.total : null,
    sorted: value.sorted === true,
  };
}

export function assertSearch(value: unknown): SearchResponse {
  if (!isObject(value)) fail('search не объект', value);
  return {
    node: assertNode(value.node),
    items: assertNodeList(value.items),
    truncated: value.truncated === true,
    scanned: typeof value.scanned === 'number' ? value.scanned : 0,
  };
}

export function assertTree(value: unknown): TreeResponse {
  if (!isObject(value)) fail('tree не объект', value);
  return {node: assertNode(value.node), items: assertNodeList(value.items)};
}

export function assertNodeResponse(value: unknown): {node: Node} {
  if (!isObject(value)) fail('ответ не объект', value);
  return {node: assertNode(value.node)};
}

export function assertContent(value: unknown): ContentResponse {
  if (!isObject(value)) fail('content не объект', value);
  if (typeof value.content !== 'string') fail('content.content', value);
  return {
    node: assertNode(value.node),
    content: value.content,
    encoding: 'utf-8',
    truncated: value.truncated === true,
    binary: value.binary === true,
  };
}

export function assertUpload(value: unknown): UploadResponse {
  if (!isObject(value)) fail('upload не объект', value);
  return {
    node: assertNode(value.node),
    renamed: value.renamed === true,
    requestedName: typeof value.requestedName === 'string' ? value.requestedName : '',
  };
}

export function assertReport(value: unknown): OperationReport {
  if (!isObject(value) || !isObject(value.report)) fail('report не объект', value);
  const r = value.report;
  if (!Array.isArray(r.items)) fail('report.items', value);
  const items = r.items.map((item: unknown) => {
    if (!isObject(item) || typeof item.source !== 'string') fail('report.item', item);
    const status = item.status;
    if (status !== 'ok' && status !== 'skipped' && status !== 'failed') fail('report.item.status', item);
    return {
      source: item.source,
      status,
      ...(typeof item.target === 'string' ? {target: item.target} : {}),
      ...(item.node !== undefined ? {node: assertNode(item.node)} : {}),
      ...(isObject(item.error) && typeof item.error.code === 'string' && typeof item.error.message === 'string'
        ? {error: item.error as unknown as ErrorBody}
        : {}),
    };
  });
  return {
    operation: typeof r.operation === 'string' ? r.operation : '',
    total: typeof r.total === 'number' ? r.total : items.length,
    succeeded: typeof r.succeeded === 'number' ? r.succeeded : items.filter((i) => i.status === 'ok').length,
    failed: typeof r.failed === 'number' ? r.failed : items.filter((i) => i.status === 'failed').length,
    skipped: typeof r.skipped === 'number' ? r.skipped : items.filter((i) => i.status === 'skipped').length,
    items: items as OperationReport['items'],
  };
}

export function assertDescribe(value: unknown): DescribeResponse {
  if (!isObject(value)) fail('describe не объект', value);
  if (!isObject(value.contract) || typeof value.contract.version !== 'string') fail('describe.contract', value);
  if (!isObject(value.operations)) fail('describe.operations', value);
  if (!Array.isArray(value.mounts)) fail('describe.mounts', value);
  if (!isObject(value.naming) || !isObject(value.upload) || !isObject(value.limits)) fail('describe.naming/upload/limits', value);
  for (const mount of value.mounts) {
    if (!isObject(mount) || typeof mount.id !== 'string' || !isObject(mount.capabilities)) fail('describe.mount', mount);
  }
  // Форма проверена на верхнем уровне; поля внутри доверяем типам контракта (все они опциональны
  // для UI: отсутствие ключа обрабатывают потребители через дефолты).
  return value as unknown as DescribeResponse;
}
