/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import type {DisposeFn} from '@/shared/lib/Disposable';
import {DisposableStore, listen} from '@/shared/lib/Disposable';
import {DRAG_MIME, readDragPaths, writeDragPaths} from '@/ui/explorer/dnd';

/**
 * Порт перетаскивания. Панели описывают, ЧТО можно тащить и КУДА можно бросить; КАК это делается
 * (HTML5 DnD, Pragmatic drag-and-drop, эмуляция на touch) — дело адаптера.
 *
 * Два вида полезной нагрузки: внутренние узлы (`paths`) и файлы из ОС (`files`, только при drop).
 */
export interface DragPayload {
  readonly kind: 'nodes';
  readonly paths: readonly string[];
}

export interface DropContext {
  /** Внутренние узлы либо null, если тащат файлы из ОС. */
  readonly payload: DragPayload | null;
  /** Ctrl/Alt зажат — копировать, а не перемещать. */
  readonly copy: boolean;
  /** Файлы из ОС (только в момент drop). */
  readonly dataTransfer: DataTransfer | null;
}

export interface DropTargetSpec {
  /** Целевая папка под указателем: путь либо null (мимо цели). `element` — узел из composedPath под курсором. */
  resolve(point: {x: number; y: number}, element: HTMLElement | null): string | null;
  /** Можно ли бросить в цель. */
  canDrop(target: string, ctx: DropContext): boolean;
  /** Подсветка: цель под курсором изменилась (null — ушли). */
  onHover(target: string | null, ctx: DropContext | null): void;
  onDrop(target: string, ctx: DropContext): void;
}

export interface DragSourceSpec {
  /** Что тащим за элемент под указателем; null — не перетаскиваемый элемент. */
  payload(element: HTMLElement | null): DragPayload | null;
}

export interface DndAdapter {
  /** Сделать контейнер источником перетаскивания (делегирование: элементы внутри могут появляться/исчезать). */
  source(container: HTMLElement, spec: DragSourceSpec): DisposeFn;
  /** Сделать контейнер целью сброса. */
  target(container: HTMLElement, spec: DropTargetSpec): DisposeFn;
}

/**
 * Адаптер на нативном HTML5 drag-and-drop. Работает на десктопе и в iOS Safari; на Android
 * HTML5 DnD не поддерживается — там перенос делается через вырезать/вставить.
 */
export class Html5DndAdapter implements DndAdapter {
  source(container: HTMLElement, spec: DragSourceSpec): DisposeFn {
    return listen(container, 'dragstart', (e) => {
      const element = firstHtmlElement(e);
      const payload = spec.payload(element);
      if (!payload || !e.dataTransfer) {
        e.preventDefault();
        return;
      }
      writeDragPaths(e.dataTransfer, payload.paths);
    });
  }

  target(container: HTMLElement, spec: DropTargetSpec): DisposeFn {
    const disposables = new DisposableStore();
    let hovered: string | null = null;

    const contextOf = (e: DragEvent, withFiles: boolean): DropContext | null => {
      const dt = e.dataTransfer;
      if (!dt) return null;
      const internal = dt.types.includes(DRAG_MIME);
      const files = dt.types.includes('Files');
      if (!internal && !files) return null;
      // Во время dragover читать данные нельзя (защита браузера) — пути известны только на drop;
      // источник хранит их сам (SelectionStore), поэтому payload здесь — маркер «внутренний».
      const paths = withFiles ? readDragPaths(dt) : null;
      return {
        payload: internal ? {kind: 'nodes', paths: paths ?? []} : null,
        copy: e.ctrlKey || e.altKey,
        dataTransfer: files ? dt : null,
      };
    };

    const setHover = (target: string | null, ctx: DropContext | null): void => {
      if (hovered === target) return;
      hovered = target;
      spec.onHover(target, ctx);
    };

    disposables.add(listen(container, 'dragover', (e) => {
      const ctx = contextOf(e, false);
      if (!ctx) return setHover(null, null);
      const target = spec.resolve({x: e.clientX, y: e.clientY}, firstHtmlElement(e));
      if (target === null || !spec.canDrop(target, ctx)) return setHover(null, null);
      e.preventDefault();
      e.dataTransfer!.dropEffect = ctx.payload ? (ctx.copy ? 'copy' : 'move') : 'copy';
      setHover(target, ctx);
    }));
    disposables.add(listen(container, 'dragleave', (e) => {
      if (e.relatedTarget && container.contains(e.relatedTarget as Node)) return;
      setHover(null, null);
    }));
    disposables.add(listen(container, 'drop', (e) => {
      const target = hovered;
      setHover(null, null);
      const ctx = contextOf(e, true);
      if (target === null || !ctx) return;
      e.preventDefault();
      if (!spec.canDrop(target, ctx)) return;
      spec.onDrop(target, ctx);
    }));
    disposables.add(listen(container, 'dragend', () => setHover(null, null)));
    return () => disposables.dispose();
  }
}

function firstHtmlElement(e: Event): HTMLElement | null {
  const first = e.composedPath()[0];
  return first instanceof HTMLElement ? first : null;
}
