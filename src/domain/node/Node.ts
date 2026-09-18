/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

/**
 * Узел виртуальной ФС — единая модель файла, папки и хранилища (контракт §5, ADR-3).
 *
 * Это одновременно доменная модель и wire-формат: сервер отдаёт ровно эту структуру, клиент
 * хранит её как есть (никаких «Entity с сеттерами» — данные неизменяемы, а логика — в функциях
 * рядом). Новые поля контракта добавляются опциональными.
 */
export type NodeKind = 'file' | 'dir' | 'mount';

export interface NodePermissions {
  read?: boolean;
  write?: boolean;
  delete?: boolean;
  rename?: boolean;
}

export interface NodeMeta {
  /** Подпись для UI (у хранилищ и корня). */
  label?: string;
  /** Подсказка иконки: 'drive' | 'archive' | 'cloud' | … */
  icon?: string;
  /** Хранилище только для чтения (у узлов kind=mount). */
  readOnly?: boolean;
  /** Есть ли дочерние папки: true/false — известно, null — не подсчитано. */
  hasChildren?: boolean | null;
  /** Размеры изображения (после stat). */
  image?: {width: number; height: number};
  [key: string]: unknown;
}

export interface Node {
  /** Канонический виртуальный путь — идентификатор узла. */
  readonly path: string;
  readonly name: string;
  readonly kind: NodeKind;
  readonly mount: string | null;
  readonly size: number | null;
  readonly mtime: number | null;
  readonly mime: string | null;
  readonly ext: string | null;
  readonly url: string | null;
  readonly visibility: 'public' | 'private' | null;
  readonly perms?: NodePermissions;
  readonly meta?: NodeMeta;
}

export function isContainer(node: Node): boolean {
  return node.kind !== 'file';
}

export function isFile(node: Node): boolean {
  return node.kind === 'file';
}

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'jpe', 'jfif', 'png', 'apng', 'gif', 'webp', 'avif', 'bmp', 'svg', 'ico']);

/** Изображение, которое браузер отобразит (по MIME или расширению). */
export function isImage(node: Node): boolean {
  if (node.kind !== 'file') return false;
  if (node.mime?.startsWith('image/')) return true;
  return node.ext !== null && IMAGE_EXTENSIONS.has(node.ext);
}

/** Текстовый файл — кандидат на предпросмотр содержимого. */
export function isText(node: Node): boolean {
  if (node.kind !== 'file') return false;
  if (node.mime?.startsWith('text/')) return true;
  return node.ext !== null && ['txt', 'md', 'json', 'xml', 'yml', 'yaml', 'csv', 'log', 'ini', 'html', 'css', 'js', 'ts'].includes(node.ext);
}

/** Человекочитаемая подпись узла (label хранилища либо имя). */
export function displayName(node: Node): string {
  return (node.kind === 'mount' && node.meta?.label) || node.name || '/';
}

/** Копия узла с новым путём (после rename/move — для оптимистичных обновлений кэша). */
export function withPath(node: Node, path: string): Node {
  const name = path === '/' ? '' : (path.split('/').pop() as string);
  const mount = path === '/' ? null : (path.split('/')[1] as string);
  return {...node, path, name, mount};
}

/** Родительский путь строки-пути (без создания VirtualPath). `/` → null. */
export function parentPathOf(path: string): string | null {
  if (path === '/') return null;
  const idx = path.lastIndexOf('/');
  return idx <= 0 ? '/' : path.slice(0, idx);
}
