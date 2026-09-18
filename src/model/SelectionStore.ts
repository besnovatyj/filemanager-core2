/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {computed, signal, type ReadonlySignal} from '@/shared/reactive/signal';
import type {Node} from '@/domain/node/Node';
import * as Sel from '@/domain/selection/SelectionModel';
import type {SelectionState, ClickModifiers} from '@/domain/selection/SelectionModel';

/**
 * Выделение в текущей папке. Порядок элементов (после сортировки/фильтра) задаёт представление
 * через {@link setOrder} — модель выделения оперирует только идентификаторами.
 */
export class SelectionStore {
  readonly state = signal<SelectionState>(Sel.EMPTY_SELECTION);
  /** Узлы текущей папки в порядке показа — источник для «выделить всё», диапазонов, стрелок. */
  readonly order = signal<readonly Node[]>([]);

  readonly orderedPaths: ReadonlySignal<readonly string[]> = computed(() => this.order.value.map((n) => n.path));
  readonly selectedPaths: ReadonlySignal<readonly string[]> = computed(() => [...this.state.value.selected]);
  readonly selectedNodes: ReadonlySignal<readonly Node[]> = computed(() => {
    const selected = this.state.value.selected;
    return this.order.value.filter((n) => selected.has(n.path));
  });
  readonly count: ReadonlySignal<number> = computed(() => this.state.value.selected.size);
  readonly single: ReadonlySignal<Node | null> = computed(() => (this.selectedNodes.value.length === 1 ? (this.selectedNodes.value[0] as Node) : null));
  readonly focusPath: ReadonlySignal<string | null> = computed(() => this.state.value.focus);

  /** Представление сообщает актуальный порядок; исчезнувшие элементы выпадают из выделения. */
  setOrder(nodes: readonly Node[]): void {
    this.order.set(nodes);
    this.state.update((s) => Sel.retain(s, nodes.map((n) => n.path)));
  }

  isSelected(path: string): boolean {
    return this.state.peek().selected.has(path);
  }

  click(path: string, mods: ClickModifiers = {}): void {
    this.state.update((s) => Sel.click(s, this.orderedPaths.peek(), path, mods));
  }

  pressOn(path: string, mods: ClickModifiers = {}): void {
    this.state.update((s) => Sel.pressOn(s, this.orderedPaths.peek(), path, mods));
  }

  release(path: string, mods: ClickModifiers = {}): void {
    this.state.update((s) => Sel.clickRelease(s, path, mods));
  }

  selectOnly(path: string): void {
    this.state.set(Sel.selectOnly(path));
  }

  setSelected(paths: Iterable<string>, additive = false): void {
    this.state.update((s) => Sel.setSelected(s, paths, additive));
  }

  selectAll(): void {
    this.state.update((s) => Sel.selectAll(s, this.orderedPaths.peek()));
  }

  invert(): void {
    this.state.update((s) => Sel.invert(s, this.orderedPaths.peek()));
  }

  clear(): void {
    this.state.set(Sel.clear());
  }

  moveFocus(delta: number, mods: ClickModifiers = {}): void {
    this.state.update((s) => Sel.moveFocus(s, this.orderedPaths.peek(), delta, mods));
  }

  moveFocusTo(path: string, mods: ClickModifiers = {}): void {
    this.state.update((s) => Sel.moveFocusTo(s, this.orderedPaths.peek(), path, mods));
  }

  toggleFocus(): void {
    this.state.update((s) => Sel.toggleFocus(s));
  }
}
