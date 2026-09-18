/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {effect, signal} from '@/shared/reactive/signal';
import {DEFAULT_SORT, type SortSpec} from '@/domain/sorting/comparators';

export type ViewMode = 'details' | 'list' | 'tiles' | 'icons';

/** Персистентная часть настроек вида (localStorage). */
interface PersistedView {
  mode?: ViewMode;
  sort?: SortSpec;
  navPaneVisible?: boolean;
  navPaneWidth?: number;
  previewVisible?: boolean;
  previewWidth?: number;
  windowSize?: {width: number; height: number};
}

/**
 * Настройки представления: режим, сортировка, видимость/ширина панелей, фильтр по имени.
 * Всё, кроме фильтра и панели операций, сохраняется в localStorage под ключом хоста
 * (у разных виджетов на одной странице могут быть разные ключи).
 */
export class ViewStore {
  readonly mode = signal<ViewMode>('details');
  readonly sort = signal<SortSpec>(DEFAULT_SORT);
  readonly navPaneVisible = signal(true);
  readonly navPaneWidth = signal(240);
  readonly previewVisible = signal(false);
  readonly previewWidth = signal(300);
  readonly queuePaneVisible = signal(false);
  /** Узкая раскладка: дерево выдвинуто поверх содержимого (не сохраняется). */
  readonly navDrawerOpen = signal(false);
  readonly windowSize = signal<{width: number; height: number} | null>(null);
  /** Фильтр по имени в текущей папке (не сохраняется). */
  readonly filter = signal('');

  private stopPersist: (() => void) | null = null;

  constructor(private readonly storageKey: string | null) {
    this.restore();
    if (storageKey) {
      this.stopPersist = effect(() => this.persist());
    }
  }

  dispose(): void {
    this.stopPersist?.();
  }

  private restore(): void {
    if (!this.storageKey) return;
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as PersistedView;
      if (saved.mode && ['details', 'list', 'tiles', 'icons'].includes(saved.mode)) this.mode.set(saved.mode);
      if (saved.sort && typeof saved.sort.by === 'string') this.sort.set(saved.sort);
      if (typeof saved.navPaneVisible === 'boolean') this.navPaneVisible.set(saved.navPaneVisible);
      if (typeof saved.navPaneWidth === 'number' && saved.navPaneWidth >= 120) this.navPaneWidth.set(saved.navPaneWidth);
      if (typeof saved.previewVisible === 'boolean') this.previewVisible.set(saved.previewVisible);
      if (typeof saved.previewWidth === 'number' && saved.previewWidth >= 160) this.previewWidth.set(saved.previewWidth);
      if (saved.windowSize && typeof saved.windowSize.width === 'number') this.windowSize.set(saved.windowSize);
    } catch {
      // localStorage недоступен или данные битые — работаем с дефолтами.
    }
  }

  private persist(): void {
    const data: PersistedView = {
      mode: this.mode.value,
      sort: this.sort.value,
      navPaneVisible: this.navPaneVisible.value,
      navPaneWidth: this.navPaneWidth.value,
      previewVisible: this.previewVisible.value,
      previewWidth: this.previewWidth.value,
    };
    const size = this.windowSize.value;
    if (size) data.windowSize = size;
    try {
      localStorage.setItem(this.storageKey as string, JSON.stringify(data));
    } catch {
      // квота/приватный режим — не критично
    }
  }
}
