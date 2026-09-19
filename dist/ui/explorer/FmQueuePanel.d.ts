import type { ExplorerDeps } from './deps';
/** Панель операций: каждая задача очереди — строка с прогрессом и кнопкой отмены. */
export declare class FmQueuePanel extends HTMLElement {
    private deps;
    private readonly disposables;
    private readonly rowDisposers;
    private list;
    bind(deps: ExplorerDeps): void;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private render;
    private renderTask;
}
//# sourceMappingURL=FmQueuePanel.d.ts.map