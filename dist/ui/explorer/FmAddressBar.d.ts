import type { ExplorerDeps } from './deps';
/**
 * Адресная строка: хлебные крошки (клик — переход), по клику в пустое место — текстовый ввод
 * пути (Enter — перейти, Escape — отмена); справа — поле поиска: набор текста фильтрует текущую
 * папку на лету, Enter — поиск по вложенным папкам на сервере (результаты вместо крошек —
 * «Результаты поиска», крестик/Escape закрывают).
 */
export declare class FmAddressBar extends HTMLElement {
    private deps;
    private readonly disposables;
    private crumbs;
    private input;
    private filterInput;
    bind(deps: ExplorerDeps): void;
    connectedCallback(): void;
    disconnectedCallback(): void;
    /** Запуск поиска по тексту поля. Локальный фильтр снимается: результаты показываются целиком, поле держит запрос. */
    private submit;
    private resetSearch;
    /** Вместо крошек — заголовок результатов: запрос, папка поиска и крестик. */
    private renderSearchHeading;
    private renderCrumbs;
    private startEditing;
}
//# sourceMappingURL=FmAddressBar.d.ts.map