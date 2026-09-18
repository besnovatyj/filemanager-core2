/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import type {Node} from '@/domain/node/Node';
import {VirtualPath} from '@/domain/path/VirtualPath';
import {DEFAULT_NAME_RULES, type NameRules} from '@/domain/naming/NameRules';
import {NameValidator} from '@/domain/naming/NameValidator';
import {uniqueName} from '@/domain/naming/uniqueName';
import {splitName} from '@/domain/naming/nameParts';
import {createNameMatcher} from '@/domain/search/nameMatcher';
import {sortNodes} from '@/domain/sorting/comparators';
import type {MountCapabilities, MountInfo} from '@/domain/capabilities/Capabilities';
import type {ConflictStrategy} from '@/domain/conflict/ConflictResolution';
import type {DescribeResponse} from '@/api/contract/describe';
import {CONTRACT_NAME, CONTRACT_VERSION} from '@/api/contract/describe';
import type {
  CallOptions, ContentRequest, ContentResponse, DeleteRequest, ListRequest, ListResponse, MkdirRequest,
  RenameRequest, StatRequest, TransferRequest, TreeRequest, TreeResponse, UploadRequest, UploadResponse, SearchRequest, SearchResponse} from '@/api/contract/operations';
import type {ItemResult, OperationReport} from '@/api/contract/report';
import type {ErrorBody} from '@/api/contract/errors';
import {ApiError} from '@/api/codec/ApiError';
import {sleep} from '@/shared/lib/timing';
import type {FsClient} from './FsClient';

interface MemoryFile {
  kind: 'file';
  content: string;
  mtime: number;
}

interface MemoryDir {
  kind: 'dir';
  mtime: number;
}

type Entry = MemoryFile | MemoryDir;

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

const ALL_CAPS: MountCapabilities = {
  list: true, stat: true, content: true, download: true, mkdir: true, rename: true, move: true, copy: true,
  delete: true, upload: true, publicUrl: false, visibility: false, thumbnail: false, search: true, directories: 'native',
};

/**
 * Файловая система в памяти, реализующая контракт bescms-fs так же строго, как сервер:
 * те же коды ошибок, стратегии конфликтов, отчёты, правила имён.
 *
 * Назначение: демо-страница без бэкенда и тесты фич (весь фронтенд проверяется без сервера —
 * это и есть смысл порта {@link FsClient}). Не для продакшена.
 */
export class MemoryFsClient implements FsClient {
  private readonly entries = new Map<string, Map<string, Entry>>(); // mountId → relPath → entry ('' = корень)
  private readonly mounts: MountInfo[];
  private readonly baseUrls = new Map<string, string>();
  private readonly naming: NameRules;
  private readonly validator: NameValidator;
  private readonly latency: number;
  private readonly allowed: Set<string>;

  constructor(options: MemoryFsClientOptions) {
    this.naming = {...DEFAULT_NAME_RULES, ...(options.naming ?? {})};
    this.validator = new NameValidator(this.naming);
    this.latency = options.latencyMs ?? 0;
    this.allowed = new Set(options.allowedOperations ?? ['describe', 'list', 'tree', 'stat', 'content', 'download', 'mkdir', 'rename', 'move', 'copy', 'delete', 'upload', 'search']);
    this.mounts = options.mounts.map((m) => ({
      id: m.id,
      label: m.label,
      ...(m.icon ? {icon: m.icon} : {}),
      root: `/${m.id}`,
      readOnly: m.readOnly ?? false,
      capabilities: {...ALL_CAPS, publicUrl: Boolean(m.baseUrl), ...(m.capabilities ?? {})},
    }));
    for (const m of options.mounts) {
      const table = new Map<string, Entry>();
      table.set('', {kind: 'dir', mtime: now()});
      this.entries.set(m.id, table);
      if (m.baseUrl) this.baseUrls.set(m.id, m.baseUrl.replace(/\/$/, ''));
      for (const [rel, content] of Object.entries(m.files ?? {})) {
        const clean = rel.replace(/^\/+/, '');
        if (clean.endsWith('/')) {
          this.ensureDir(m.id, clean.replace(/\/+$/, ''));
        } else {
          const parent = clean.includes('/') ? clean.slice(0, clean.lastIndexOf('/')) : '';
          this.ensureDir(m.id, parent);
          table.set(clean, {kind: 'file', content, mtime: now() - Math.floor(Math.random() * 86_400 * 30)});
        }
      }
    }
  }

  // ---------------------------------------------------------------- операции

  async describe(): Promise<DescribeResponse> {
    await this.delay();
    const operations: DescribeResponse['operations'] = {};
    for (const name of this.allowed) {
      operations[name] = {method: name === 'download' ? 'GET' : 'POST', ...(['move', 'copy', 'delete'].includes(name) ? {batch: true} : {})};
    }
    return {
      contract: {name: CONTRACT_NAME, version: CONTRACT_VERSION},
      server: {name: 'memory', version: '0'},
      operations,
      mounts: this.mounts,
      defaultMount: this.mounts[0]?.id ?? null,
      naming: this.naming,
      upload: {maxFileSize: 10 * 1024 * 1024, maxFilesPerRequest: 1, allowedExtensions: null, allowedMime: null, chunked: false},
      features: {jobs: false, thumbnails: false, search: true, write: false, archive: false},
      limits: {listPageSize: 2000, maxBatchItems: 500, contentMaxBytes: 1_048_576},
    };
  }

  async list(request: ListRequest, options: CallOptions = {}): Promise<ListResponse> {
    await this.delay(options.signal);
    this.assertAllowed('list');
    const path = this.parse(request.path);
    if (path.isRoot) {
      return {node: this.rootNode(), items: this.mounts.map((m) => this.mountNode(m)), nextCursor: null, total: this.mounts.length, sorted: false};
    }
    const {mount, rel} = this.resolveDir(path);
    let items = this.childrenOf(mount, rel);
    if (request.filter?.kinds) {
      const kinds = new Set(request.filter.kinds);
      items = items.filter((n) => kinds.has(n.kind === 'file' ? 'file' : 'dir'));
    }
    if (request.filter?.nameContains) {
      const needle = request.filter.nameContains.toLowerCase();
      items = items.filter((n) => n.name.toLowerCase().includes(needle));
    }
    items = sortNodes(items, request.sort ?? {by: 'name', dir: 'asc'});
    const limit = Math.min(request.limit ?? 2000, 2000);
    const offset = request.cursor ? Number(request.cursor) : 0;
    const page = items.slice(offset, offset + limit);
    return {
      node: this.nodeAt(mount, rel),
      items: page,
      nextCursor: offset + limit < items.length ? String(offset + limit) : null,
      total: items.length,
      sorted: true,
    };
  }

  async search(request: SearchRequest, options: CallOptions = {}): Promise<SearchResponse> {
    await this.delay(options.signal);
    this.assertAllowed('search');
    const path = this.parse(request.path);
    const matcher = createNameMatcher(request.query);
    const recursive = request.recursive ?? true;
    const kinds = request.kinds ? new Set(request.kinds) : null;
    const limit = Math.min(request.limit ?? 500, 500);
    const roots = path.isRoot
      ? this.mounts.map((m) => ({mount: m.id, rel: ''}))
      : [this.resolveDir(path)];
    const items: Node[] = [];
    let scanned = 0;
    let truncated = false;
    for (const {mount, rel} of roots) {
      const prefix = rel === '' ? '' : rel + '/';
      for (const key of this.table(mount).keys()) {
        if (key === '' || !key.startsWith(prefix) || key === rel) continue;
        if (!recursive && key.slice(prefix.length).includes('/')) continue;
        scanned++;
        const node = this.nodeAt(mount, key);
        if (kinds && !kinds.has(node.kind === 'file' ? 'file' : 'dir')) continue;
        if (!matcher.matches(node.name)) continue;
        items.push(node);
        if (items.length >= limit) { truncated = true; break; }
      }
      if (truncated) break;
    }
    items.sort((a, b) => (a.kind === 'file' ? 1 : 0) - (b.kind === 'file' ? 1 : 0) || a.path.localeCompare(b.path, undefined, {numeric: true, sensitivity: 'base'}));
    const node = path.isRoot ? this.rootNode() : this.nodeAt(roots[0]?.mount ?? '', roots[0]?.rel ?? '');
    return {node, items, truncated, scanned};
  }

  async tree(request: TreeRequest, options: CallOptions = {}): Promise<TreeResponse> {
    const listing = await this.list({path: request.path, filter: {kinds: ['dir']}}, options);
    return {node: listing.node, items: listing.items};
  }

  async stat(request: StatRequest, options: CallOptions = {}): Promise<Node> {
    await this.delay(options.signal);
    this.assertAllowed('stat');
    const path = this.parse(request.path);
    if (path.isRoot) return this.rootNode();
    const {mount, rel, entry} = this.resolveExisting(path);
    const node = this.nodeAt(mount, rel);
    if (entry.kind === 'file' && node.ext && ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(node.ext)) {
      return {...node, meta: {...(node.meta ?? {}), image: {width: 800, height: 600}}};
    }
    return node;
  }

  async content(request: ContentRequest, options: CallOptions = {}): Promise<ContentResponse> {
    await this.delay(options.signal);
    this.assertAllowed('content');
    const path = this.parse(request.path);
    const {mount, rel, entry} = this.resolveExisting(path);
    if (entry.kind !== 'file') throw new ApiError('not_found', `Объект не найден: ${request.path}`, {path: request.path});
    const max = Math.min(request.maxBytes ?? 1_048_576, 1_048_576);
    return {
      node: this.nodeAt(mount, rel),
      content: entry.content.slice(0, max),
      encoding: 'utf-8',
      truncated: entry.content.length > max,
      binary: entry.content.includes('\0'),
    };
  }

  async mkdir(request: MkdirRequest, options: CallOptions = {}): Promise<Node> {
    await this.delay(options.signal);
    this.assertAllowed('mkdir');
    const parent = this.parse(request.parent);
    const {mount, rel} = this.resolveDir(parent);
    this.assertWritable(mount);
    const name = this.approveName(request.name);
    const target = join(rel, name);
    if (this.table(mount).has(target)) throw new ApiError('exists', `Объект с таким именем уже существует: ${parent.child(name)}`, {path: parent.child(name).toString()});
    this.table(mount).set(target, {kind: 'dir', mtime: now()});
    return this.nodeAt(mount, target);
  }

  async rename(request: RenameRequest, options: CallOptions = {}): Promise<Node> {
    await this.delay(options.signal);
    this.assertAllowed('rename');
    const path = this.parse(request.path);
    if (path.isMountRoot) throw new ApiError('invalid_operation', 'Точку монтирования нельзя переименовать', {path: request.path});
    const {mount, rel} = this.resolveExisting(path);
    this.assertWritable(mount);
    const name = this.approveName(request.name);
    const parentRel = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '';
    const target = join(parentRel, name);
    if (target === rel) return this.nodeAt(mount, rel);
    if (this.table(mount).has(target)) throw new ApiError('exists', `Объект с таким именем уже существует: ${name}`, {path: (path.parent() as VirtualPath).child(name).toString()});
    this.moveSubtree(mount, rel, mount, target);
    return this.nodeAt(mount, target);
  }

  async move(request: TransferRequest, options: CallOptions = {}): Promise<OperationReport> {
    return this.transfer('move', request, options);
  }

  async copy(request: TransferRequest, options: CallOptions = {}): Promise<OperationReport> {
    return this.transfer('copy', request, options);
  }

  async delete(request: DeleteRequest, options: CallOptions = {}): Promise<OperationReport> {
    await this.delay(options.signal);
    this.assertAllowed('delete');
    const items: ItemResult[] = request.paths.map((source) => {
      try {
        const path = this.parse(source);
        if (path.isRoot || path.isMountRoot) throw new ApiError('invalid_operation', 'Точку монтирования удалить нельзя', {path: source});
        const {mount, rel} = this.resolveExisting(path);
        this.assertWritable(mount);
        this.removeSubtree(mount, rel);
        return {source, status: 'ok'};
      } catch (error) {
        return {source, status: 'failed', error: toBody(error)};
      }
    });
    return report('delete', items);
  }

  async upload(request: UploadRequest, options: CallOptions = {}): Promise<UploadResponse> {
    this.assertAllowed('upload');
    const dir = this.parse(request.path);
    const {mount, rel} = this.resolveDir(dir);
    this.assertWritable(mount);
    const requested = request.name || request.file.name;
    const sanitized = sanitize(requested, this.validator);
    const violation = this.validator.validate(sanitized);
    if (violation?.rule === 'blocked_extension') {
      throw new ApiError('policy_rejected', `Расширение .${String(violation.params?.ext)} запрещено политикой безопасности`, {details: {rule: 'extension_blocklist'}});
    }
    if (request.file.size > 10 * 1024 * 1024) {
      throw new ApiError('too_large', 'Файл превышает лимит 10 МБ', {details: {rule: 'max_file_size'}});
    }
    // Прогресс — имитируем по шагам, чтобы демо показывало полосу.
    const steps = 5;
    for (let i = 1; i <= steps; i++) {
      await this.delay(options.signal, this.latency / steps);
      options.onProgress?.(i / steps);
    }
    let name = sanitized;
    const table = this.table(mount);
    const exists = (n: string): boolean => table.has(join(rel, n));
    if (exists(name)) {
      switch (request.onConflict ?? 'fail') {
        case 'overwrite':
          if (table.get(join(rel, name))?.kind === 'dir') throw new ApiError('invalid_operation', 'Нельзя заменить папку файлом', {path: dir.child(name).toString()});
          break;
        case 'rename':
          name = uniqueName(name, exists);
          break;
        default:
          throw new ApiError('exists', `Объект с таким именем уже существует: ${name}`, {path: dir.child(name).toString()});
      }
    }
    const text = request.file.type.startsWith('text/') || request.file.size < 64 * 1024 ? await request.file.text().catch(() => '') : '\0binary';
    table.set(join(rel, name), {kind: 'file', content: text, mtime: now()});
    const node = this.nodeAt(mount, join(rel, name));
    return {node, renamed: node.name !== requested, requestedName: requested};
  }

  async uploadFinalize(): Promise<UploadResponse> {
    throw new ApiError('unsupported', 'tus не поддерживается клиентом в памяти');
  }

  thumbnailUrl(path: string): string | null {
    // Миниатюр в памяти нет — та же картинка, что и для превью (браузер сам уменьшит).
    return this.previewUrl(path);
  }

  previewUrl(path: string): string | null {
    // В памяти байт изображений нет — для демо отдаём публичный URL узла, если он есть.
    try {
      const {mount, rel} = this.resolveExisting(this.parse(path));
      return this.nodeAt(mount, rel).url;
    } catch {
      return null;
    }
  }

  downloadUrl(path: string): string | null {
    // Скачивание из памяти: data-URL c содержимым (только для демо).
    try {
      const {entry} = this.resolveExisting(this.parse(path));
      if (entry.kind !== 'file') return null;
      return `data:application/octet-stream;charset=utf-8,${encodeURIComponent(entry.content)}`;
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------- внутренности

  private async transfer(operation: 'move' | 'copy', request: TransferRequest, options: CallOptions): Promise<OperationReport> {
    await this.delay(options.signal);
    this.assertAllowed(operation);
    const targetDir = this.parse(request.target);
    const {mount: dstMount, rel: dstRel} = this.resolveDir(targetDir);
    this.assertWritable(dstMount);
    const strategy: ConflictStrategy = request.onConflict ?? 'fail';

    const items: ItemResult[] = request.sources.map((source) => {
      try {
        const path = this.parse(source);
        if (path.isRoot || path.isMountRoot) throw new ApiError('invalid_operation', 'Точку монтирования нельзя переместить или скопировать', {path: source});
        if (path.equals(targetDir) || path.isAncestorOf(targetDir)) throw new ApiError('invalid_operation', 'Нельзя переместить папку в саму себя', {path: source});
        const {mount: srcMount, rel: srcRel, entry} = this.resolveExisting(path);
        if (operation === 'move') this.assertWritable(srcMount);
        const violation = this.validator.validate(path.name);
        if (violation?.rule === 'blocked_extension') throw new ApiError('policy_rejected', `Расширение .${String(violation.params?.ext)} запрещено`, {path: source, details: {rule: 'extension_blocklist'}});

        const srcParent = srcRel.includes('/') ? srcRel.slice(0, srcRel.lastIndexOf('/')) : '';
        if (operation === 'move' && srcMount === dstMount && srcParent === dstRel) {
          return {source, status: 'skipped', target: source};
        }
        let name = path.name;
        const table = this.table(dstMount);
        const exists = (n: string): boolean => table.has(join(dstRel, n));
        let overwrite = false;
        if (exists(name)) {
          switch (strategy) {
            case 'skip':
              return {source, status: 'skipped', target: targetDir.child(name).toString()};
            case 'rename':
              name = uniqueName(name, exists);
              break;
            case 'overwrite': {
              const existing = table.get(join(dstRel, name));
              if (entry.kind !== 'file' || existing?.kind !== 'file') {
                throw new ApiError('invalid_operation', 'Перезапись папки не поддерживается', {path: targetDir.child(name).toString()});
              }
              overwrite = true;
              break;
            }
            default:
              throw new ApiError('exists', `Объект с таким именем уже существует: ${name}`, {path: targetDir.child(name).toString()});
          }
        }
        const target = join(dstRel, name);
        if (overwrite) table.delete(target);
        if (operation === 'move') this.moveSubtree(srcMount, srcRel, dstMount, target);
        else this.copySubtree(srcMount, srcRel, dstMount, target);
        const node = this.nodeAt(dstMount, target);
        return {source, status: 'ok', target: node.path, node};
      } catch (error) {
        return {source, status: 'failed', error: toBody(error)};
      }
    });
    return report(operation, items);
  }

  private delay(signal?: AbortSignal, ms = this.latency): Promise<void> {
    if (signal?.aborted) return Promise.reject(ApiError.aborted());
    return ms > 0 ? sleep(ms).then(() => { if (signal?.aborted) throw ApiError.aborted(); }) : Promise.resolve();
  }

  private assertAllowed(operation: string): void {
    if (!this.allowed.has(operation)) throw new ApiError('forbidden', 'Операция запрещена', {httpStatus: 403});
  }

  private parse(raw: string): VirtualPath {
    try {
      return VirtualPath.parse(raw);
    } catch {
      throw new ApiError('path_invalid', `Некорректный путь: ${raw}`, {path: raw});
    }
  }

  private table(mountId: string): Map<string, Entry> {
    const table = this.entries.get(mountId);
    if (!table) throw new ApiError('mount_unknown', `Неизвестная точка монтирования: '${mountId}'`, {path: `/${mountId}`});
    return table;
  }

  private mountInfo(mountId: string): MountInfo {
    const info = this.mounts.find((m) => m.id === mountId);
    if (!info) throw new ApiError('mount_unknown', `Неизвестная точка монтирования: '${mountId}'`, {path: `/${mountId}`});
    return info;
  }

  private assertWritable(mountId: string): void {
    if (this.mountInfo(mountId).readOnly) throw new ApiError('forbidden', `Хранилище '${mountId}' доступно только для чтения`, {path: `/${mountId}`, details: {reason: 'read_only'}});
  }

  private approveName(name: string): string {
    const normalized = this.validator.normalize(name);
    const violation = this.validator.validate(normalized);
    if (violation) {
      if (violation.rule === 'blocked_extension') throw new ApiError('policy_rejected', `Расширение .${String(violation.params?.ext)} запрещено политикой безопасности`, {details: {rule: 'extension_blocklist', ...violation.params}});
      throw new ApiError('name_invalid', 'Недопустимое имя', {details: {rule: violation.rule, name, ...violation.params}});
    }
    return normalized;
  }

  private resolveDir(path: VirtualPath): {mount: string; rel: string} {
    if (path.isRoot) throw new ApiError('invalid_operation', 'Операция неприменима к виртуальному корню', {path: '/'});
    const mount = path.mount as string;
    const rel = path.segments.join('/');
    const entry = this.table(mount).get(rel);
    if (!entry || entry.kind !== 'dir') throw new ApiError('not_found', `Объект не найден: ${path}`, {path: path.toString()});
    return {mount, rel};
  }

  private resolveExisting(path: VirtualPath): {mount: string; rel: string; entry: Entry} {
    if (path.isRoot) throw new ApiError('invalid_operation', 'Операция неприменима к виртуальному корню', {path: '/'});
    const mount = path.mount as string;
    const rel = path.segments.join('/');
    const entry = this.table(mount).get(rel);
    if (!entry) throw new ApiError('not_found', `Объект не найден: ${path}`, {path: path.toString()});
    return {mount, rel, entry};
  }

  private ensureDir(mount: string, rel: string): void {
    const table = this.table(mount);
    const parts = rel === '' ? [] : rel.split('/');
    let current = '';
    for (const part of parts) {
      current = join(current, part);
      if (!table.has(current)) table.set(current, {kind: 'dir', mtime: now()});
    }
  }

  private childrenOf(mount: string, rel: string): Node[] {
    const prefix = rel === '' ? '' : rel + '/';
    const result: Node[] = [];
    for (const key of this.table(mount).keys()) {
      if (key === '' || !key.startsWith(prefix) || key === rel) continue;
      if (key.slice(prefix.length).includes('/')) continue;
      result.push(this.nodeAt(mount, key));
    }
    return result;
  }

  private nodeAt(mount: string, rel: string): Node {
    const entry = this.table(mount).get(rel);
    if (!entry) throw new ApiError('not_found', `Объект не найден: /${mount}/${rel}`, {path: `/${mount}/${rel}`});
    if (rel === '') return this.mountNode(this.mountInfo(mount));
    const name = rel.includes('/') ? rel.slice(rel.lastIndexOf('/') + 1) : rel;
    const path = `/${mount}/${rel}`;
    if (entry.kind === 'dir') {
      const hasChildren = [...this.table(mount).keys()].some((k) => k.startsWith(rel + '/') && this.table(mount).get(k)?.kind === 'dir');
      return {path, name, kind: 'dir', mount, size: null, mtime: entry.mtime, mime: null, ext: null, url: null, visibility: null, meta: {hasChildren}};
    }
    const ext = splitName(name).ext;
    const baseUrl = this.baseUrls.get(mount);
    return {
      path, name, kind: 'file', mount,
      size: new TextEncoder().encode(entry.content).length,
      mtime: entry.mtime,
      mime: mimeByExt(ext),
      ext,
      url: baseUrl ? `${baseUrl}/${rel.split('/').map(encodeURIComponent).join('/')}` : null,
      visibility: null,
    };
  }

  private mountNode(info: MountInfo): Node {
    return {
      path: info.root, name: info.id, kind: 'mount', mount: info.id, size: null, mtime: null, mime: null, ext: null, url: null, visibility: null,
      meta: {label: info.label, icon: info.icon ?? 'drive', readOnly: info.readOnly, hasChildren: null},
    };
  }

  private rootNode(): Node {
    return {path: '/', name: '', kind: 'dir', mount: null, size: null, mtime: null, mime: null, ext: null, url: null, visibility: null, meta: {label: '/', hasChildren: this.mounts.length > 0}};
  }

  private moveSubtree(srcMount: string, srcRel: string, dstMount: string, dstRel: string): void {
    this.copySubtree(srcMount, srcRel, dstMount, dstRel);
    this.removeSubtree(srcMount, srcRel);
  }

  private copySubtree(srcMount: string, srcRel: string, dstMount: string, dstRel: string): void {
    const src = this.table(srcMount);
    const dst = this.table(dstMount);
    const entry = src.get(srcRel) as Entry;
    dst.set(dstRel, entry.kind === 'file' ? {...entry, mtime: now()} : {kind: 'dir', mtime: now()});
    if (entry.kind === 'dir') {
      for (const [key, value] of [...src.entries()]) {
        if (key.startsWith(srcRel + '/')) {
          dst.set(dstRel + key.slice(srcRel.length), value.kind === 'file' ? {...value} : {kind: 'dir', mtime: value.mtime});
        }
      }
    }
  }

  private removeSubtree(mount: string, rel: string): void {
    const table = this.table(mount);
    for (const key of [...table.keys()]) {
      if (key === rel || key.startsWith(rel + '/')) table.delete(key);
    }
  }
}

function join(parent: string, name: string): string {
  return parent === '' ? name : `${parent}/${name}`;
}

function now(): number {
  return Math.floor(Date.now() / 1000);
}

function report(operation: string, items: ItemResult[]): OperationReport {
  return {
    operation,
    total: items.length,
    succeeded: items.filter((i) => i.status === 'ok').length,
    failed: items.filter((i) => i.status === 'failed').length,
    skipped: items.filter((i) => i.status === 'skipped').length,
    items,
  };
}

function toBody(error: unknown): ErrorBody {
  const e = ApiError.wrap(error);
  const code = (e.code === 'network' || e.code === 'aborted' || e.code === 'contract' || e.code === 'decode') ? 'internal' : e.code;
  return {code, message: e.message, ...(e.path ? {path: e.path} : {}), ...(Object.keys(e.details).length ? {details: e.details} : {})};
}

/** Упрощённая санитизация имени загрузки (зеркало серверной для демо). */
function sanitize(name: string, validator: NameValidator): string {
  let clean = validator.normalize(name).replace(/^.*[/\\]/, '');
  clean = clean.replace(/[\p{Cc}\p{Cf}]/gu, '_');
  for (const ch of DEFAULT_NAME_RULES.forbiddenChars) clean = clean.split(ch).join('_');
  clean = clean.trim().replace(/[. ]+$/, '').replace(/^\.+/, '').trim();
  return clean === '' ? 'file' : clean;
}

const MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  txt: 'text/plain', md: 'text/markdown', json: 'application/json', html: 'text/html', css: 'text/css', js: 'text/javascript',
  pdf: 'application/pdf', zip: 'application/zip', mp3: 'audio/mpeg', mp4: 'video/mp4', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

function mimeByExt(ext: string | null): string | null {
  return ext ? MIME[ext] ?? null : null;
}
