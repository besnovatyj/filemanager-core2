/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {batch, signal, type ReadonlySignal, type Signal} from '@/shared/reactive/signal';
import {isContainer, parentPathOf, type Node} from '@/domain/node/Node';
import type {FsClient} from '@/api/client/FsClient';
import {ApiError} from '@/api/codec/ApiError';
import {Emitter} from '@/shared/lib/Emitter';
import type {OperationReport} from '@/api/contract/report';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

/** Состояние одной папки в кэше. Неизменяемый снимок — сигнал меняется целиком. */
export interface DirectoryState {
  readonly status: LoadStatus;
  /** Узел самой папки (после первой загрузки). */
  readonly node: Node | null;
  /** Дети в порядке сервера; сортировка — в представлении. */
  readonly items: readonly Node[];
  readonly error: ApiError | null;
  readonly loadedAt: number | null;
  /** Есть ли ещё страницы (курсор). */
  readonly nextCursor: string | null;
}

const EMPTY: DirectoryState = Object.freeze({status: 'idle', node: null, items: [], error: null, loadedAt: null, nextCursor: null});

/**
 * Кэш содержимого папок + дерева (только подпапки) с точечными обновлениями по фактам
 * из ответов операций (ARCHITECTURE.md §2.4).
 *
 * Каждая папка — отдельный сигнал: список перерисовывается только для той папки, что изменилась.
 * Полный `list` делается, когда фактов недостаточно (первый заход, refresh, копирование папки).
 */
export class DirectoryStore {
  /**
   * Факты, применённые к кэшу (для сторов, держащих собственные списки узлов — например,
   * результаты поиска): `removed` — путь исчез вместе с поддеревом, `added` — узел появился,
   * `updated` — метаданные узла заменены.
   */
  readonly changes = new Emitter<{removed: string; added: Node; updated: Node}>();
  private readonly dirs = new Map<string, Signal<DirectoryState>>();
  private readonly trees = new Map<string, Signal<DirectoryState>>();
  private readonly inflight = new Map<string, Promise<void>>();

  constructor(private readonly client: FsClient) {}

  /** Сигнал состояния папки (создаётся лениво, пустой до загрузки). */
  directory(path: string): ReadonlySignal<DirectoryState> {
    return this.dirSignal(path);
  }

  /** Сигнал подпапок (для дерева навигации). */
  tree(path: string): ReadonlySignal<DirectoryState> {
    return this.treeSignal(path);
  }

  /** Узел по пути из любого известного листинга (родителя). */
  getNode(path: string): Node | undefined {
    const parent = parentPathOf(path);
    if (parent === null) return this.dirs.get('/')?.peek().node ?? undefined;
    const fromDir = this.dirs.get(parent)?.peek().items.find((n) => n.path === path);
    if (fromDir) return fromDir;
    const fromTree = this.trees.get(parent)?.peek().items.find((n) => n.path === path);
    if (fromTree) return fromTree;
    return this.dirs.get(path)?.peek().node ?? undefined;
  }

  /** Загрузка содержимого папки. Параллельные вызовы для одного пути схлопываются. */
  load(path: string, options: {force?: boolean; signal?: AbortSignal} = {}): Promise<void> {
    const sig = this.dirSignal(path);
    const state = sig.peek();
    if (!options.force && state.status === 'ready') return Promise.resolve();
    const running = this.inflight.get(path);
    if (running && !options.force) return running;

    sig.set({...state, status: 'loading', error: null});
    const promise = (async () => {
      try {
        const first = await this.client.list({path}, options.signal ? {signal: options.signal} : {});
        let items = first.items;
        let cursor = first.nextCursor;
        // Докачиваем страницы: UI показывает папку целиком (виртуализация справится с объёмом).
        while (cursor) {
          const page = await this.client.list({path, cursor}, options.signal ? {signal: options.signal} : {});
          items = [...items, ...page.items];
          cursor = page.nextCursor;
        }
        batch(() => {
          sig.set({status: 'ready', node: first.node, items, error: null, loadedAt: Date.now(), nextCursor: null});
          // Дерево можно обновить из полного листинга бесплатно.
          this.treeSignal(path).set({
            status: 'ready', node: first.node, items: items.filter(isContainer), error: null, loadedAt: Date.now(), nextCursor: null,
          });
        });
      } catch (error) {
        const apiError = ApiError.wrap(error);
        if (!apiError.isAborted) {
          sig.set({...sig.peek(), status: 'error', error: apiError});
        } else {
          sig.set({...sig.peek(), status: sig.peek().node ? 'ready' : 'idle'});
        }
        throw apiError;
      } finally {
        this.inflight.delete(path);
      }
    })();
    this.inflight.set(path, promise);
    return promise;
  }

  /** Загрузка только подпапок (дерево). */
  async loadTree(path: string, options: {force?: boolean} = {}): Promise<void> {
    const sig = this.treeSignal(path);
    if (!options.force && sig.peek().status === 'ready') return;
    sig.set({...sig.peek(), status: 'loading', error: null});
    try {
      const res = await this.client.tree({path});
      sig.set({status: 'ready', node: res.node, items: res.items, error: null, loadedAt: Date.now(), nextCursor: null});
    } catch (error) {
      sig.set({...sig.peek(), status: 'error', error: ApiError.wrap(error)});
      throw error;
    }
  }

  // ---------------------------------------------------------------- факты из ответов операций

  /** Новый узел появился (mkdir, upload, copy/move в известную папку). */
  applyAdded(node: Node): void {
    const parent = parentPathOf(node.path);
    if (parent === null) return;
    this.patch(parent, (items) => [...items.filter((n) => n.path !== node.path), node]);
    if (isContainer(node)) {
      this.patchTree(parent, (items) => [...items.filter((n) => n.path !== node.path), node]);
    }
    this.changes.emit('added', node);
  }

  /** Узел исчез (delete, move из папки). Вместе с кэшем его поддерева. */
  applyRemoved(path: string): void {
    const parent = parentPathOf(path);
    if (parent !== null) {
      this.patch(parent, (items) => items.filter((n) => n.path !== path));
      this.patchTree(parent, (items) => items.filter((n) => n.path !== path));
    }
    this.dropSubtree(path);
    this.changes.emit('removed', path);
  }

  /** Узел заменён (rename): старый путь исчез, новый появился — в той же папке. */
  applyReplaced(oldPath: string, node: Node): void {
    batch(() => {
      this.applyRemoved(oldPath);
      this.applyAdded(node);
    });
  }

  /** Обновить метаданные узла (после stat) на месте. */
  applyUpdated(node: Node): void {
    const parent = parentPathOf(node.path);
    if (parent === null) return;
    this.patch(parent, (items) => items.map((n) => (n.path === node.path ? node : n)));
    this.changes.emit('updated', node);
  }

  /**
   * Применить отчёт пакетной операции: успешные элементы move — удалить источники и добавить
   * цели; copy — добавить цели; delete — удалить источники. Папки-цели копирования/перемещения
   * получают инвалидацию своего содержимого (дети неизвестны без листинга).
   */
  applyReport(report: OperationReport): void {
    batch(() => {
      for (const item of report.items) {
        if (item.status !== 'ok') continue;
        if (report.operation === 'delete' || report.operation === 'move') {
          this.applyRemoved(item.source);
        }
        if (item.node) {
          this.applyAdded(item.node);
          if (isContainer(item.node)) this.invalidate(item.node.path);
        }
      }
    });
  }

  /** Сбросить кэш папки (следующий load перечитает). Поддерево тоже забывается. */
  invalidate(path: string): void {
    this.dropSubtree(path, /* keepSelf */ true);
    const sig = this.dirs.get(path);
    if (sig) sig.set({...sig.peek(), status: sig.peek().status === 'loading' ? 'loading' : 'idle'});
    const tree = this.trees.get(path);
    if (tree) tree.set({...tree.peek(), status: 'idle'});
  }

  invalidateAll(): void {
    for (const [path] of this.dirs) this.invalidate(path);
  }

  // ---------------------------------------------------------------- внутреннее

  private dirSignal(path: string): Signal<DirectoryState> {
    let sig = this.dirs.get(path);
    if (!sig) {
      sig = signal<DirectoryState>(EMPTY);
      this.dirs.set(path, sig);
    }
    return sig;
  }

  private treeSignal(path: string): Signal<DirectoryState> {
    let sig = this.trees.get(path);
    if (!sig) {
      sig = signal<DirectoryState>(EMPTY);
      this.trees.set(path, sig);
    }
    return sig;
  }

  private patch(path: string, update: (items: readonly Node[]) => readonly Node[]): void {
    const sig = this.dirs.get(path);
    if (!sig || sig.peek().status !== 'ready') return;
    sig.set({...sig.peek(), items: update(sig.peek().items)});
  }

  private patchTree(path: string, update: (items: readonly Node[]) => readonly Node[]): void {
    const sig = this.trees.get(path);
    if (!sig || sig.peek().status !== 'ready') return;
    sig.set({...sig.peek(), items: update(sig.peek().items)});
  }

  private dropSubtree(path: string, keepSelf = false): void {
    for (const map of [this.dirs, this.trees]) {
      for (const [key, sig] of map) {
        if (key === path && keepSelf) continue;
        if (key === path || key.startsWith(path + '/')) {
          sig.set(EMPTY);
          map.delete(key);
        }
      }
    }
  }
}
