/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import type {Node} from './Node';

/**
 * Плоский индекс узлов по пути с быстрым доступом к детям папки.
 * Используется кэшем каталогов: одна структура и для списка, и для дерева, и для DnD-проверок.
 */
export class NodeIndex {
  private readonly byPath = new Map<string, Node>();
  private readonly children = new Map<string, Set<string>>();

  get(path: string): Node | undefined {
    return this.byPath.get(path);
  }

  has(path: string): boolean {
    return this.byPath.has(path);
  }

  /** Дети папки в порядке вставки (сортировка — забота представления). */
  childrenOf(path: string): Node[] {
    const set = this.children.get(path);
    if (!set) return [];
    const result: Node[] = [];
    for (const child of set) {
      const node = this.byPath.get(child);
      if (node) result.push(node);
    }
    return result;
  }

  /** Известны ли дети папки (пустой список ≠ неизвестно). */
  hasListing(path: string): boolean {
    return this.children.has(path);
  }

  /** Полностью заменяет листинг папки. */
  setListing(path: string, items: Node[]): void {
    const old = this.children.get(path);
    if (old) {
      for (const child of old) this.removeSubtree(child);
    }
    const set = new Set<string>();
    for (const item of items) {
      this.byPath.set(item.path, item);
      set.add(item.path);
    }
    this.children.set(path, set);
  }

  /** Добавляет/обновляет узел внутри уже известного листинга родителя. */
  upsert(node: Node): void {
    this.byPath.set(node.path, node);
    const parent = parentOf(node.path);
    if (parent !== null) {
      const set = this.children.get(parent);
      if (set) set.add(node.path);
    }
  }

  /** Удаляет узел вместе с поддеревом и убирает из листинга родителя. */
  remove(path: string): void {
    this.removeSubtree(path);
    const parent = parentOf(path);
    if (parent !== null) this.children.get(parent)?.delete(path);
  }

  /** Сбрасывает листинг папки (дети остаются неизвестными). */
  invalidate(path: string): void {
    const set = this.children.get(path);
    if (set) {
      for (const child of set) this.removeSubtree(child);
      this.children.delete(path);
    }
  }

  clear(): void {
    this.byPath.clear();
    this.children.clear();
  }

  private removeSubtree(path: string): void {
    const set = this.children.get(path);
    if (set) {
      for (const child of set) this.removeSubtree(child);
      this.children.delete(path);
    }
    this.byPath.delete(path);
  }
}

function parentOf(path: string): string | null {
  if (path === '/') return null;
  const idx = path.lastIndexOf('/');
  return idx <= 0 ? '/' : path.slice(0, idx);
}
