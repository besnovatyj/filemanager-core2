/**
 * Плавающее окно проводника: перетаскивание за заголовок, изменение размера за края/углы,
 * закрытие крестиком/Escape/кликом по фону. Содержимое — через слот (сам `<fm-explorer>`).
 * Размер сообщается наружу (`onResize`) для сохранения в настройках вида.
 */
export declare class FmWindow extends HTMLElement {
    private readonly disposables;
    private frame;
    onClose: (() => void) | null;
    onResize: ((size: {
        width: number;
        height: number;
    }) => void) | null;
    connectedCallback(): void;
    disconnectedCallback(): void;
    /** Задать размер и отцентрировать. */
    setSize(size: {
        width: number;
        height: number;
    } | null): void;
    close(): void;
    private drag;
    private resize;
}
//# sourceMappingURL=FmWindow.d.ts.map