export interface DialogButton {
    label: string;
    variant?: 'primary' | 'danger' | 'outline' | 'ghost';
    /** Возвращает false, чтобы оставить диалог открытым (валидация). */
    onClick: () => boolean | void | Promise<boolean | void>;
    /** Срабатывает по Enter. */
    isDefault?: boolean;
}
export interface DialogOptions {
    title: string;
    icon?: 'danger' | 'warning' | 'info' | null;
    body: HTMLElement;
    buttons: DialogButton[];
    wide?: boolean;
    /** Что сделать при закрытии крестиком/Escape. */
    onCancel: () => void;
    /** Элемент, получающий фокус при открытии. */
    initialFocus?: HTMLElement;
}
/**
 * Модальный диалог: оверлей, заголовок, произвольное тело, кнопки; фокус-ловушка (Tab не выходит
 * наружу), Escape = отмена, Enter = кнопка по умолчанию. Один диалог за раз рендерит DialogHost.
 */
export declare class FmDialog extends HTMLElement {
    private readonly disposables;
    private options;
    connectedCallback(): void;
    show(options: DialogOptions): void;
    private press;
    private cancel;
    private dispose;
    private focusable;
    private trapFocus;
}
//# sourceMappingURL=FmDialog.d.ts.map