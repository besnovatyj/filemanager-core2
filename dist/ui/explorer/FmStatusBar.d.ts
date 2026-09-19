import type { ExplorerDeps } from './deps';
/** Строка состояния: число элементов, выделение с суммарным размером, только чтение, активные операции. */
export declare class FmStatusBar extends HTMLElement {
    private deps;
    private readonly disposables;
    bind(deps: ExplorerDeps): void;
    connectedCallback(): void;
    disconnectedCallback(): void;
}
//# sourceMappingURL=FmStatusBar.d.ts.map