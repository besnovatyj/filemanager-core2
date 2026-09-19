import type { DialogStore } from '../../../model/DialogStore.d.ts';
/**
 * Рендерит верхний диалог из DialogStore в `<fm-dialog>` на `document.body`.
 * Каждому виду запроса — своя функция сборки тела и кнопок; результат уходит в `resolve`.
 */
export declare class DialogHost {
    private readonly dialogs;
    private readonly theme;
    private stop;
    private currentId;
    private element;
    constructor(dialogs: DialogStore, theme: () => string | null);
    attach(): void;
    detach(): void;
    private show;
}
//# sourceMappingURL=DialogHost.d.ts.map