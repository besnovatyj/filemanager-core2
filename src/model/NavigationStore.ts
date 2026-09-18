/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {batch, computed, signal, type ReadonlySignal} from '@/shared/reactive/signal';
import {VirtualPath} from '@/domain/path/VirtualPath';

/**
 * Текущая папка и история «назад/вперёд» (как у браузера/проводника).
 * Загрузку содержимого делает DirectoryStore; здесь — только адрес и стек.
 *
 * Корень области (`root`) — нижняя граница навигации: пути вне него отклоняются, «вверх» выше
 * него не работает. Это UI-часть ограничения; серверная — токен области (ExplorerConfig.scope).
 */
export class NavigationStore {
  readonly current = signal<string>('/');
  /** Корень области видимости; '/' — без ограничений. */
  readonly root: string;
  private readonly backStack = signal<readonly string[]>([]);
  private readonly forwardStack = signal<readonly string[]>([]);

  readonly canGoBack: ReadonlySignal<boolean> = computed(() => this.backStack.value.length > 0);
  readonly canGoForward: ReadonlySignal<boolean> = computed(() => this.forwardStack.value.length > 0);
  readonly canGoUp: ReadonlySignal<boolean> = computed(() => this.current.value !== this.root);
  readonly currentPath: ReadonlySignal<VirtualPath> = computed(() => VirtualPath.parse(this.current.value));

  constructor(start = '/', root = '/') {
    this.root = VirtualPath.normalize(root)?.toString() ?? '/';
    const canonical = VirtualPath.normalize(start)?.toString() ?? this.root;
    this.current.set(this.within(canonical) ? canonical : this.root);
  }

  /** Путь внутри области (корень области — тоже внутри). */
  within(path: string): boolean {
    return this.root === '/' || path === this.root || path.startsWith(this.root + '/');
  }

  /** Переход в папку с записью в историю. Повтор текущего пути историю не трогает; путь вне области игнорируется. */
  navigate(path: string): void {
    const canonical = VirtualPath.normalize(path)?.toString();
    if (!canonical || canonical === this.current.peek() || !this.within(canonical)) return;
    batch(() => {
      this.backStack.update((s) => [...s, this.current.peek()]);
      this.forwardStack.set([]);
      this.current.set(canonical);
    });
  }

  /** Замена текущего пути без записи в историю (например, папка удалена → уйти к родителю). */
  replace(path: string): void {
    const canonical = VirtualPath.normalize(path)?.toString();
    if (canonical) this.current.set(this.within(canonical) ? canonical : this.root);
  }

  back(): void {
    const stack = this.backStack.peek();
    const target = stack[stack.length - 1];
    if (target === undefined) return;
    batch(() => {
      this.backStack.set(stack.slice(0, -1));
      this.forwardStack.update((s) => [this.current.peek(), ...s]);
      this.current.set(target);
    });
  }

  forward(): void {
    const stack = this.forwardStack.peek();
    const target = stack[0];
    if (target === undefined) return;
    batch(() => {
      this.forwardStack.set(stack.slice(1));
      this.backStack.update((s) => [...s, this.current.peek()]);
      this.current.set(target);
    });
  }

  up(): void {
    if (this.current.peek() === this.root) return;
    const parent = VirtualPath.parse(this.current.peek()).parent();
    if (parent) this.navigate(parent.toString());
  }

  /** Путь исчез (удалён/переименован) — уйти к ближайшему живому предку. */
  escapeFrom(removedPath: string): void {
    const current = this.current.peek();
    if (current === removedPath || current.startsWith(removedPath + '/')) {
      const parent = VirtualPath.parse(removedPath).parent();
      this.replace(parent?.toString() ?? this.root); // replace() сам не даст уйти выше корня области
    }
  }
}
