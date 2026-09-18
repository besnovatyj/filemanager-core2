/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {computed, signal, type ReadonlySignal} from '@/shared/reactive/signal';
import * as Clip from '@/domain/clipboard/ClipboardModel';
import type {ClipboardState} from '@/domain/clipboard/ClipboardModel';

/** Буфер обмена приложения — обёртка сигнала над доменной моделью. */
export class ClipboardStore {
  readonly state = signal<ClipboardState>(Clip.EMPTY_CLIPBOARD);
  readonly isEmpty: ReadonlySignal<boolean> = computed(() => Clip.isEmpty(this.state.value));
  readonly mode: ReadonlySignal<ClipboardState['mode']> = computed(() => this.state.value.mode);

  copy(paths: readonly string[]): void {
    this.state.set(Clip.copy(paths));
  }

  cut(paths: readonly string[]): void {
    this.state.set(Clip.cut(paths));
  }

  clear(): void {
    this.state.set(Clip.EMPTY_CLIPBOARD);
  }

  isCut(path: string): boolean {
    return Clip.isCut(this.state.peek(), path);
  }

  canPasteInto(targetDir: string): boolean {
    return Clip.canPasteInto(this.state.peek(), targetDir);
  }

  afterPaste(): void {
    this.state.update(Clip.afterPaste);
  }

  forget(paths: readonly string[]): void {
    this.state.update((s) => Clip.withoutPaths(s, paths));
  }
}
