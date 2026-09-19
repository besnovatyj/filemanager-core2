import { type ExplorerDeps } from './deps';
/**
 * Панель содержимого папки — центр проводника.
 *
 * Ответственность: показать элементы текущей папки в выбранном режиме, дать выделять (клик,
 * Ctrl/Shift, рамка, клавиатура, type-ahead; на touch — тап и режим выделения), открывать
 * (двойной клик/Enter, на touch — тап по папке), переименовывать inline, вызывать контекстное
 * меню, быть источником и целью перетаскивания.
 *
 * Геометрия списка — порт {@link Virtualizer}, перетаскивание — порт {@link DndAdapter}:
 * панель не знает, как они реализованы, и переживёт замену на сторонние библиотеки.
 */
export declare class FmContentPane extends HTMLElement {
    private deps;
    private readonly disposables;
    private virtualizer;
    private viewport;
    private header;
    private spacer;
    private layer;
    private rubber;
    private stateBox;
    private dropOverlay;
    /** Элементы после фильтра и сортировки — то, что видит пользователь; при активном поиске — его результаты. */
    private readonly visibleItems;
    private readonly layoutVersion;
    private rendered;
    private renderKey;
    private dropTarget;
    private typeAhead;
    private typeAheadTimer;
    private renameHint;
    /** Тип указателя последнего pointerdown (для click-модели на touch). */
    private lastPointerType;
    bind(deps: ExplorerDeps): void;
    connectedCallback(): void;
    disconnectedCallback(): void;
    focusList(): void;
    private recalcLayout;
    private renderVisible;
    /** Обновить состояние строк на месте (выделение, фокус, «вырезано») без пересоздания DOM. */
    private updateRowStates;
    private renderItem;
    /** Папка найденного узла относительно корня поиска; для прямых детей корня — пусто (`/`). */
    private locationOf;
    private nodeIcon;
    /**
     * Источник миниатюры: серверная (`thumbnail`, §9.14) — маленький перекодированный файл,
     * подобранный под физический размер ячейки (DPR); иначе публичный URL файла (браузер уменьшит
     * оригинал сам — дороже, но работает без Imagick/GD). Только http(s)/относительные URL,
     * никаких data:/javascript:.
     */
    private thumbnailSrc;
    private typeLabel;
    private renderHeader;
    private renderState;
    private renderEditor;
    private showHint;
    private hideHint;
    /**
     * Мышь: выделение по нажатию (pressOn/release — чтобы группу можно было тащить).
     * Touch: нажатие ничего не выделяет — модель тапов живёт в {@link onClick}.
     */
    private onPointerDown;
    /**
     * Touch-модель (как в мобильных проводниках): тап по папке — открыть; тап по файлу — выделить;
     * когда что-то уже выделено (режим выделения) — тап переключает выделение любого элемента;
     * тап по пустому месту — снять выделение. Long-press (контекстное меню) — см. onContextMenu.
     */
    private onClick;
    private startRubberBand;
    private onDblClick;
    private onContextMenu;
    private onKeyDown;
    /** Набор первых букв имени переводит фокус на первый подходящий элемент (как в проводнике). */
    private typeAheadKey;
    private scrollToPath;
    private bindDnd;
    private canDrop;
    private setDrop;
}
//# sourceMappingURL=FmContentPane.d.ts.map