import { type ExplorerDeps } from './deps';
/**
 * Панель навигации — дерево «Этот компьютер → хранилища → папки» с ленивой подгрузкой
 * (`tree`-операция). Текущая папка подсвечена, её предки раскрываются автоматически.
 * Принимает drop (перемещение/копирование узлов, загрузка файлов из ОС).
 */
export declare class FmNavPane extends HTMLElement {
    private deps;
    private readonly disposables;
    private readonly expanded;
    private readonly focused;
    private rows;
    private dropTarget;
    bind(deps: ExplorerDeps): void;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private collect;
    private rootNode;
    /** Корень области, пока его листинг не загружен: синтетический узел по пути. */
    private scopeRootNode;
    private render;
    private renderRow;
    private onClick;
    private toggle;
    private onKeyDown;
    private bindDnd;
    private setDropTarget;
}
//# sourceMappingURL=FmNavPane.d.ts.map