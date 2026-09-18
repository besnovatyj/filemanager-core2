/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {computed, signal, type ReadonlySignal} from '@/shared/reactive/signal';
import {uid} from '@/shared/lib/uid';
import type {Node} from '@/domain/node/Node';
import type {ConflictChoice} from '@/domain/conflict/ConflictResolution';
import type {OperationReport} from '@/api/contract/report';
import type {ApiError} from '@/api/codec/ApiError';

/** Запрос на диалог — данные, которые UI рендерит; ответ уходит через `resolve`. */
export type DialogRequest =
  | {kind: 'confirm'; title: string; message: string; confirmLabel?: string; danger?: boolean; resolve: (ok: boolean) => void}
  | {kind: 'prompt'; title: string; label: string; value: string; selectStem?: boolean; validate?: (value: string) => string | null; resolve: (value: string | null) => void}
  | {kind: 'conflict'; name: string; remaining: number; resolve: (choice: ConflictChoice | null) => void}
  | {kind: 'error'; title: string; error: ApiError | Error | string; resolve: () => void}
  | {kind: 'report'; title: string; report: OperationReport; resolve: () => void}
  | {kind: 'properties'; nodes: Node[]; detailed: Promise<Node | null>; resolve: () => void};

export interface Dialog {
  readonly id: string;
  readonly request: DialogRequest;
}

/**
 * Очередь модальных диалогов. Фичи ждут ответ промисом; UI рендерит верхний диалог.
 * Так фича не знает ничего про разметку, а диалоги можно тестировать заглушкой стора.
 */
export class DialogStore {
  private readonly stack = signal<readonly Dialog[]>([]);

  /** Верхний (активный) диалог. */
  readonly current: ReadonlySignal<Dialog | null> = computed(() => this.stack.value[this.stack.value.length - 1] ?? null);

  confirm(options: {title: string; message: string; confirmLabel?: string; danger?: boolean}): Promise<boolean> {
    return new Promise((resolve) => this.push({kind: 'confirm', ...options, resolve}));
  }

  prompt(options: {title: string; label: string; value: string; selectStem?: boolean; validate?: (value: string) => string | null}): Promise<string | null> {
    return new Promise((resolve) => this.push({kind: 'prompt', ...options, resolve}));
  }

  conflict(options: {name: string; remaining: number}): Promise<ConflictChoice | null> {
    return new Promise((resolve) => this.push({kind: 'conflict', ...options, resolve}));
  }

  error(error: ApiError | Error | string, title?: string): Promise<void> {
    return new Promise((resolve) => this.push({kind: 'error', title: title ?? '', error, resolve}));
  }

  report(report: OperationReport, title: string): Promise<void> {
    return new Promise((resolve) => this.push({kind: 'report', title, report, resolve}));
  }

  /** `detailed` — промис точных метаданных (stat): диалог открывается сразу, данные подставляются по готовности. */
  properties(nodes: Node[], detailed: Promise<Node | null>): Promise<void> {
    return new Promise((resolve) => this.push({kind: 'properties', nodes, detailed, resolve}));
  }

  /** UI вызывает после того, как пользователь ответил и `resolve` уже дёрнут. */
  close(id: string): void {
    this.stack.update((s) => s.filter((d) => d.id !== id));
  }

  /** Закрыть всё (уничтожение приложения): все ожидающие получают «отмену». */
  closeAll(): void {
    for (const d of this.stack.peek()) cancel(d.request);
    this.stack.set([]);
  }

  private push(request: DialogRequest): void {
    this.stack.update((s) => [...s, {id: uid('dlg'), request}]);
  }
}

function cancel(request: DialogRequest): void {
  switch (request.kind) {
    case 'confirm': request.resolve(false); break;
    case 'prompt': request.resolve(null); break;
    case 'conflict': request.resolve(null); break;
    default: request.resolve();
  }
}
