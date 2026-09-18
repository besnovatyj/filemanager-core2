/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {describe, expect, it} from 'vitest';
import type {Node} from '@/domain/node/Node';
import {naturalCompare} from './naturalCompare';
import {sortNodes, toggleSort} from './comparators';

const node = (name: string, kind: Node['kind'] = 'file', size: number | null = null, mtime: number | null = null): Node => ({
  path: `/s/${name}`, name, kind, mount: 's', size, mtime, mime: null,
  ext: kind === 'file' && name.includes('.') ? (name.split('.').pop() as string) : null, url: null, visibility: null,
});

describe('sorting', () => {
  it('naturalCompare учитывает числа и регистр', () => {
    expect(naturalCompare('file2', 'file10')).toBeLessThan(0);
    expect(naturalCompare('Abc', 'abc')).toBe(0);
  });

  it('папки всегда сверху, внутри — по ключу, desc не меняет группировку', () => {
    const items = [node('b.txt'), node('dir', 'dir'), node('a.txt'), node('10.txt'), node('2.txt')];
    expect(sortNodes(items, {by: 'name', dir: 'asc'}).map((n) => n.name)).toEqual(['dir', '2.txt', '10.txt', 'a.txt', 'b.txt']);
    expect(sortNodes(items, {by: 'name', dir: 'desc'}).map((n) => n.name)).toEqual(['dir', 'b.txt', 'a.txt', '10.txt', '2.txt']);
  });

  it('по размеру, с fallback на имя', () => {
    const items = [node('b', 'file', 5), node('a', 'file', 5), node('c', 'file', 1)];
    expect(sortNodes(items, {by: 'size', dir: 'asc'}).map((n) => n.name)).toEqual(['c', 'a', 'b']);
  });

  it('toggleSort', () => {
    expect(toggleSort({by: 'name', dir: 'asc'}, 'name')).toEqual({by: 'name', dir: 'desc'});
    expect(toggleSort({by: 'name', dir: 'desc'}, 'size')).toEqual({by: 'size', dir: 'asc'});
  });
});
