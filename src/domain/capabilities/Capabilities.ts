/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import type {Node} from '@/domain/node/Node';

/** Физические возможности хранилища (контракт §6, `MountCapabilities`). */
export interface MountCapabilities {
  list: boolean;
  stat: boolean;
  content: boolean;
  download: boolean;
  mkdir: boolean;
  rename: boolean;
  move: boolean;
  copy: boolean;
  delete: boolean;
  upload: boolean;
  publicUrl: boolean;
  visibility: boolean;
  thumbnail: boolean;
  search: boolean;
  directories: 'native' | 'emulated';
}

/** Описание хранилища из `describe.mounts[]`. */
export interface MountInfo {
  id: string;
  label: string;
  icon?: string;
  root: string;
  readOnly: boolean;
  capabilities: MountCapabilities;
}

/** Операция контракта, на которую спрашиваем разрешение. */
export type OperationName =
  | 'describe' | 'list' | 'tree' | 'stat' | 'content' | 'download' | 'preview' | 'thumbnail' | 'search'
  | 'mkdir' | 'rename' | 'move' | 'copy' | 'delete' | 'upload';

const MUTATING: ReadonlySet<OperationName> = new Set(['mkdir', 'rename', 'move', 'copy', 'delete', 'upload']);

/**
 * Сводные возможности: «может ли ТЕКУЩИЙ пользователь выполнить операцию над ЭТИМ узлом».
 * Слияние трёх уровней (ADR, контракт §6):
 *  1. операции, разрешённые пользователю (`describe.operations`) — иначе кнопки нет вообще;
 *  2. capabilities и readOnly хранилища узла;
 *  3. `perms` самого узла (если сервер их прислал).
 *
 * UI спрашивает только этот класс; сервер перепроверяет всё сам.
 */
export class Capabilities {
  private readonly mounts = new Map<string, MountInfo>();

  constructor(
    private readonly allowedOperations: ReadonlySet<OperationName>,
    mounts: readonly MountInfo[],
  ) {
    for (const m of mounts) this.mounts.set(m.id, m);
  }

  static empty(): Capabilities {
    return new Capabilities(new Set(), []);
  }

  /** Разрешена ли операция пользователю вообще (без привязки к узлу). */
  allows(operation: OperationName): boolean {
    return this.allowedOperations.has(operation);
  }

  mount(id: string | null): MountInfo | undefined {
    return id === null ? undefined : this.mounts.get(id);
  }

  allMounts(): MountInfo[] {
    return [...this.mounts.values()];
  }

  /** Может ли пользователь выполнить операцию над узлом (или внутри узла-папки для mkdir/upload/paste). */
  can(operation: OperationName, node: Node): boolean {
    if (!this.allows(operation)) return false;
    if (node.path === '/') {
      // Корень — синтетический: только чтение списка хранилищ.
      return operation === 'list' || operation === 'tree' || operation === 'stat' || operation === 'search';
    }
    const mount = this.mount(node.mount);
    if (!mount) return false;
    if (MUTATING.has(operation) && mount.readOnly) return false;
    if (!this.mountSupports(mount, operation)) return false;

    // Корень хранилища нельзя переименовать/удалить/переместить — это административная сущность.
    if (node.kind === 'mount' && (operation === 'rename' || operation === 'delete' || operation === 'move' || operation === 'copy')) {
      return false;
    }
    // Права узла (если сервер прислал).
    const perms = node.perms;
    if (perms) {
      if (operation === 'rename' && perms.rename === false) return false;
      if (operation === 'delete' && perms.delete === false) return false;
      if ((operation === 'mkdir' || operation === 'upload') && perms.write === false) return false;
      if ((operation === 'list' || operation === 'content' || operation === 'download' || operation === 'preview' || operation === 'thumbnail' || operation === 'search') && perms.read === false) return false;
    }
    return true;
  }

  /** Можно ли положить что-то (paste/upload/mkdir/drop) в эту папку. */
  canWriteInto(dir: Node, via: 'move' | 'copy' | 'upload' | 'mkdir' = 'upload'): boolean {
    if (dir.kind === 'file') return false;
    return this.can(via, dir);
  }

  /** Все узлы поддерживают операцию (для пакетных команд над выделением). */
  canAll(operation: OperationName, nodes: readonly Node[]): boolean {
    return nodes.length > 0 && nodes.every((n) => this.can(operation, n));
  }

  private mountSupports(mount: MountInfo, operation: OperationName): boolean {
    const c = mount.capabilities;
    switch (operation) {
      case 'list': case 'tree': return c.list;
      case 'stat': return c.stat;
      case 'content': return c.content;
      case 'download': case 'preview': return c.download;
      case 'thumbnail': return c.thumbnail && c.download;
      case 'search': return c.search && c.list;
      case 'mkdir': return c.mkdir;
      case 'rename': return c.rename;
      case 'move': return c.move;
      case 'copy': return c.copy;
      case 'delete': return c.delete;
      case 'upload': return c.upload;
      case 'describe': return true;
    }
  }
}
