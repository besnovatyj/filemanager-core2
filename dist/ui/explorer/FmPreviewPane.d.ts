import type { ExplorerDeps } from './deps';
/**
 * Область предпросмотра (правая панель): один выбранный узел — изображение / начало текстового
 * файла / метаданные; для остальных типов — иконка и скачивание. Ничего не запрашивает, пока
 * панель скрыта; смена выделения отменяет незавершённый запрос (AbortController).
 *
 * Источник картинки: публичный `url` узла, а если его нет — операция `preview` бэкенда
 * (только растровые форматы, тип по содержимому — см. SECURITY.md).
 */
export declare class FmPreviewPane extends HTMLElement {
    private deps;
    private readonly disposables;
    private body;
    private heading;
    private abort;
    private timer;
    bind(deps: ExplorerDeps): void;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private cancelPending;
    private render;
    private renderImage;
    private renderText;
    private metaTable;
    private appendRow;
}
//# sourceMappingURL=FmPreviewPane.d.ts.map