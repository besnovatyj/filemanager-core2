import { type ReadonlySignal } from '../shared/reactive/signal.d.ts';
import * as Clip from '../domain/clipboard/ClipboardModel.d.ts';
import type { ClipboardState } from '../domain/clipboard/ClipboardModel.d.ts';
/** Буфер обмена приложения — обёртка сигнала над доменной моделью. */
export declare class ClipboardStore {
    readonly state: import("../shared/reactive/signal.d.ts").Signal<Clip.ClipboardState>;
    readonly isEmpty: ReadonlySignal<boolean>;
    readonly mode: ReadonlySignal<ClipboardState['mode']>;
    copy(paths: readonly string[]): void;
    cut(paths: readonly string[]): void;
    clear(): void;
    isCut(path: string): boolean;
    canPasteInto(targetDir: string): boolean;
    afterPaste(): void;
    forget(paths: readonly string[]): void;
}
//# sourceMappingURL=ClipboardStore.d.ts.map