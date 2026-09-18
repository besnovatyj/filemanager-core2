/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {batch, computed, signal, type ReadonlySignal} from '@/shared/reactive/signal';
import type {Node} from '@/domain/node/Node';
import {createNameMatcher} from '@/domain/search/nameMatcher';
import type {ApiError} from '@/api/codec/ApiError';
import type {LoadStatus} from '@/model/DirectoryStore';

/**
 * Состояние поиска: запрос, корень (папка, из которой искали), результаты и признак усечения.
 *
 * Пока поиск активен (`active`), панель содержимого показывает результаты вместо текущей папки;
 * навигация в другую папку закрывает поиск. Стор — только состояние: запросы к серверу делает
 * `SearchFeature`, а факты операций (удалили/переименовали найденное) применяются точечно через
 * `applyRemoved`/`applyAdded`/`applyUpdated` — тем же способом, что и `DirectoryStore`.
 */
export class SearchStore {
  readonly query = signal('');
  readonly root = signal('/');
  readonly status = signal<LoadStatus>('idle');
  readonly items = signal<readonly Node[]>([]);
  readonly truncated = signal(false);
  readonly error = signal<ApiError | null>(null);
  /** Счётчик запросов «поставь фокус в поле поиска» (Ctrl+F); UI реагирует на изменение. */
  readonly focusRequests = signal(0);

  readonly active: ReadonlySignal<boolean> = computed(() => this.query.value !== '');

  begin(query: string, root: string): void {
    batch(() => {
      this.query.set(query);
      this.root.set(root);
      this.status.set('loading');
      this.error.set(null);
      this.truncated.set(false);
    });
  }

  complete(items: readonly Node[], truncated: boolean): void {
    batch(() => {
      this.items.set(items);
      this.truncated.set(truncated);
      this.status.set('ready');
    });
  }

  fail(error: ApiError): void {
    batch(() => {
      this.items.set([]);
      this.error.set(error);
      this.status.set('error');
    });
  }

  clear(): void {
    if (!this.active.peek() && this.status.peek() === 'idle') return;
    batch(() => {
      this.query.set('');
      this.items.set([]);
      this.truncated.set(false);
      this.error.set(null);
      this.status.set('idle');
    });
  }

  requestFocus(): void {
    this.focusRequests.update((n) => n + 1);
  }

  // ---------------------------------------------------------------- факты операций

  /** Узел (и всё под ним) исчез из хранилища. */
  applyRemoved(path: string): void {
    if (!this.active.peek()) return;
    const prefix = path + '/';
    this.items.update((items) => items.filter((n) => n.path !== path && !n.path.startsWith(prefix)));
  }

  /** Появился узел: попадает в результаты, если лежит под корнем поиска и подходит под запрос. */
  applyAdded(node: Node): void {
    if (!this.active.peek() || !this.within(node.path)) return;
    if (!createNameMatcher(this.query.peek()).matches(node.name)) return;
    this.items.update((items) => [...items.filter((n) => n.path !== node.path), node]);
  }

  /** Метаданные узла обновились (stat) — заменить на месте. */
  applyUpdated(node: Node): void {
    if (!this.active.peek()) return;
    this.items.update((items) => items.map((n) => (n.path === node.path ? node : n)));
  }

  private within(path: string): boolean {
    const root = this.root.peek();
    return root === '/' || path === root || path.startsWith(root + '/');
  }
}
