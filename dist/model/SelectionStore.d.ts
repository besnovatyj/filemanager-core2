import { type ReadonlySignal } from '../shared/reactive/signal.d.ts';
import type { Node } from '../domain/node/Node.d.ts';
import * as Sel from '../domain/selection/SelectionModel.d.ts';
import type { ClickModifiers } from '../domain/selection/SelectionModel.d.ts';
/**
 * Выделение в текущей папке. Порядок элементов (после сортировки/фильтра) задаёт представление
 * через {@link setOrder} — модель выделения оперирует только идентификаторами.
 */
export declare class SelectionStore {
    readonly state: import("../shared/reactive/signal.d.ts").Signal<Sel.SelectionState>;
    /** Узлы текущей папки в порядке показа — источник для «выделить всё», диапазонов, стрелок. */
    readonly order: import("../shared/reactive/signal.d.ts").Signal<readonly Node[]>;
    readonly orderedPaths: ReadonlySignal<readonly string[]>;
    readonly selectedPaths: ReadonlySignal<readonly string[]>;
    readonly selectedNodes: ReadonlySignal<readonly Node[]>;
    readonly count: ReadonlySignal<number>;
    readonly single: ReadonlySignal<Node | null>;
    readonly focusPath: ReadonlySignal<string | null>;
    /** Представление сообщает актуальный порядок; исчезнувшие элементы выпадают из выделения. */
    setOrder(nodes: readonly Node[]): void;
    isSelected(path: string): boolean;
    click(path: string, mods?: ClickModifiers): void;
    pressOn(path: string, mods?: ClickModifiers): void;
    release(path: string, mods?: ClickModifiers): void;
    selectOnly(path: string): void;
    setSelected(paths: Iterable<string>, additive?: boolean): void;
    selectAll(): void;
    invert(): void;
    clear(): void;
    moveFocus(delta: number, mods?: ClickModifiers): void;
    moveFocusTo(path: string, mods?: ClickModifiers): void;
    toggleFocus(): void;
}
//# sourceMappingURL=SelectionStore.d.ts.map