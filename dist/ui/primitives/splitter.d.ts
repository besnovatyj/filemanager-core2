import type { DisposeFn } from '../../shared/lib/Disposable.d.ts';
import type { Signal } from '../../shared/reactive/signal.d.ts';
/**
 * Вертикальный разделитель панелей: перетаскивание меняет сигнал ширины панели (слева, либо
 * справа при `invert` — тогда движение влево увеличивает ширину), двойной клик — сброс.
 */
export declare function splitter(width: Signal<number>, options?: {
    min?: number;
    max?: number;
    reset?: number;
    invert?: boolean;
}): {
    el: HTMLElement;
    dispose: DisposeFn;
};
//# sourceMappingURL=splitter.d.ts.map