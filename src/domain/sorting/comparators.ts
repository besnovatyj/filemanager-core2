/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {isContainer, type Node} from '@/domain/node/Node';
import {naturalCompare} from './naturalCompare';

export type SortKey = 'name' | 'size' | 'mtime' | 'ext' | 'kind';
export type SortDirection = 'asc' | 'desc';

export interface SortSpec {
  readonly by: SortKey;
  readonly dir: SortDirection;
}

export const DEFAULT_SORT: SortSpec = Object.freeze({by: 'name', dir: 'asc'});

/**
 * Компаратор списка: папки всегда над файлами (в любом направлении), внутри групп — по ключу,
 * при равенстве — по имени. Совпадает с серверным {@see Lister::comparator()}, чтобы порядок
 * не «прыгал» между серверной и клиентской сортировкой.
 */
export function nodeComparator(spec: SortSpec): (a: Node, b: Node) => number {
  const sign = spec.dir === 'desc' ? -1 : 1;
  return (a, b) => {
    const ka = isContainer(a) ? 0 : 1;
    const kb = isContainer(b) ? 0 : 1;
    if (ka !== kb) return ka - kb;
    let cmp = 0;
    switch (spec.by) {
      case 'size':
        cmp = (a.size ?? -1) - (b.size ?? -1);
        break;
      case 'mtime':
        cmp = (a.mtime ?? 0) - (b.mtime ?? 0);
        break;
      case 'ext':
        cmp = naturalCompare(a.ext ?? '', b.ext ?? '');
        break;
      default:
        cmp = 0;
    }
    if (cmp === 0) cmp = naturalCompare(a.name, b.name);
    return cmp * sign;
  };
}

export function sortNodes(nodes: readonly Node[], spec: SortSpec): Node[] {
  return [...nodes].sort(nodeComparator(spec));
}

export function toggleSort(current: SortSpec, key: SortKey): SortSpec {
  if (current.by === key) {
    return {by: key, dir: current.dir === 'asc' ? 'desc' : 'asc'};
  }
  return {by: key, dir: 'asc'};
}
