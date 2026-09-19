import type { CommandRegistry } from '../../commands/CommandRegistry.d.ts';
export type MenuEntry = {
    type: 'separator';
} | {
    type: 'item';
    id: string;
    label: string;
    icon?: string;
    shortcut?: string;
    disabled?: boolean;
    checked?: boolean;
    danger?: boolean;
    onSelect: () => void;
};
/**
 * Всплывающее меню (контекстное и выпадающее): позиционируется в пределах окна, закрывается по
 * клику вне/Escape/потере фокуса, навигация стрелками, Enter/Space — выбор. Один экземпляр на
 * приложение; каждое открытие — новый список пунктов.
 */
export declare class FmMenu extends HTMLElement {
    /** Подписки текущего открытия; после dispose() копилка одноразова, поэтому на каждое открытие — новая. */
    private disposables;
    private entries;
    private focused;
    private onCloseCallback;
    connectedCallback(): void;
    /** Открыть меню в точке (clientX/Y). */
    open(entries: MenuEntry[], at: {
        x: number;
        y: number;
    }, onClose?: () => void): void;
    close(): void;
    get isOpen(): boolean;
    private render;
    private select;
    private setFocused;
    private onKeyDown;
}
/** Пункты меню из команд реестра (в порядке групп; между группами — разделители). */
export declare function menuFromCommands(commands: CommandRegistry, groups: string[]): MenuEntry[];
//# sourceMappingURL=FmMenu.d.ts.map