/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {describe, expect, it} from 'vitest';
import {MemoryFsClient} from './MemoryFsClient';
import {ApiError} from '@/api/codec/ApiError';

function client(): MemoryFsClient {
  return new MemoryFsClient({
    mounts: [
      {id: 'static', label: 'Static', files: {'docs/a.txt': 'A', 'docs/b.txt': 'B', 'img/': '', 'readme.md': 'hi'}},
      {id: 'zip', label: 'Zip', files: {'x.txt': 'X'}},
      {id: 'ro', label: 'RO', readOnly: true, files: {'y.txt': 'Y'}},
    ],
  });
}

describe('MemoryFsClient (эталон поведения контракта)', () => {
  it('корень перечисляет mount-ы, list отдаёт папки выше файлов', async () => {
    const c = client();
    const root = await c.list({path: '/'});
    expect(root.items.map((n) => n.kind)).toEqual(['mount', 'mount', 'mount']);
    const s = await c.list({path: '/static'});
    expect(s.items.map((n) => n.name)).toEqual(['docs', 'img', 'readme.md']);
  });

  it('mkdir/rename c ошибками контракта', async () => {
    const c = client();
    const dir = await c.mkdir({parent: '/static', name: 'new'});
    expect(dir.path).toBe('/static/new');
    await expect(c.mkdir({parent: '/static', name: 'new'})).rejects.toMatchObject({code: 'exists'});
    await expect(c.mkdir({parent: '/static', name: 'a:b'})).rejects.toMatchObject({code: 'name_invalid'});
    await expect(c.rename({path: '/static/new', name: 'x.php'})).rejects.toMatchObject({code: 'policy_rejected'});
    const renamed = await c.rename({path: '/static/new', name: 'newer'});
    expect(renamed.path).toBe('/static/newer');
    await expect(c.mkdir({parent: '/ro', name: 'z'})).rejects.toMatchObject({code: 'forbidden'});
  });

  it('move между mount-ами с отчётом и стратегиями конфликтов', async () => {
    const c = client();
    const r1 = await c.move({sources: ['/static/docs/a.txt'], target: '/zip'});
    expect(r1.succeeded).toBe(1);
    expect(r1.items[0]?.node?.path).toBe('/zip/a.txt');
    expect((await c.list({path: '/static/docs'})).items.map((n) => n.name)).toEqual(['b.txt']);

    const r2 = await c.copy({sources: ['/zip/x.txt'], target: '/zip'});
    expect(r2.items[0]).toMatchObject({status: 'failed', error: {code: 'exists'}});
    const r3 = await c.copy({sources: ['/zip/x.txt'], target: '/zip', onConflict: 'rename'});
    expect(r3.items[0]?.target).toBe('/zip/x (2).txt');
    const r4 = await c.move({sources: ['/zip/x.txt'], target: '/zip'});
    expect(r4.items[0]?.status).toBe('skipped');

    const r5 = await c.move({sources: ['/static/docs'], target: '/static/docs'});
    expect(r5.items[0]?.error?.code).toBe('invalid_operation');
  });

  it('delete: mount нельзя, папка удаляется с поддеревом', async () => {
    const c = client();
    const r = await c.delete({paths: ['/static', '/static/docs']});
    expect(r.items[0]?.error?.code).toBe('invalid_operation');
    expect(r.items[1]?.status).toBe('ok');
    await expect(c.list({path: '/static/docs'})).rejects.toBeInstanceOf(ApiError);
  });

  it('upload санитизирует имя и сообщает renamed', async () => {
    const c = client();
    const file = new File(['hello'], 'bad:name?.txt', {type: 'text/plain'});
    const res = await c.upload({path: '/static', file});
    expect(res.node.name).toBe('bad_name_.txt');
    expect(res.renamed).toBe(true);
    await expect(c.upload({path: '/static', file: new File(['x'], 'shell.php')})).rejects.toMatchObject({code: 'policy_rejected'});
  });
});

describe('MemoryFsClient.search (§9.15)', () => {
  it('ищет по подстроке рекурсивно от папки и от корня', async () => {
    const c = client();
    const inDocs = await c.search({path: '/static/docs', query: 'a'});
    expect(inDocs.items.map((n) => n.path)).toEqual(['/static/docs/a.txt']);
    const fromRoot = await c.search({path: '/', query: '.txt'});
    expect(fromRoot.items.map((n) => n.path)).toEqual(['/ro/y.txt', '/static/docs/a.txt', '/static/docs/b.txt', '/zip/x.txt']);
    expect(fromRoot.truncated).toBe(false);
  });

  it('маска, вид узла и лимит с признаком усечения', async () => {
    const c = client();
    const dirs = await c.search({path: '/static', query: '*', kinds: ['dir']});
    expect(dirs.items.map((n) => n.name)).toEqual(['docs', 'img']);
    const limited = await c.search({path: '/', query: '*.txt', limit: 2});
    expect(limited.items).toHaveLength(2);
    expect(limited.truncated).toBe(true);
  });
});
