/**
 * Безопасное создание DOM без innerHTML с данными.
 *
 * Правило проекта (SECURITY.md §3): любые пользовательские строки (имена файлов, пути, сообщения
 * сервера) попадают в DOM только через `textContent`/атрибуты. `innerHTML` допустим лишь для
 * статических шаблонов без данных. Хелпер `h()` делает безопасный путь самым коротким.
 */
type Child = Node | string | null | undefined | false;
export interface Props {
    class?: string;
    id?: string;
    text?: string;
    title?: string;
    role?: string;
    tabindex?: number;
    hidden?: boolean;
    disabled?: boolean;
    type?: string;
    value?: string;
    placeholder?: string;
    href?: string;
    /** Произвольные атрибуты (`aria-*`, `data-*`). */
    attrs?: Record<string, string | number | boolean | null | undefined>;
    /** Инлайновые стили. */
    style?: Partial<CSSStyleDeclaration>;
    /** Слушатели `on: {click: fn}` — без автоматической отписки (для короткоживущих элементов). */
    on?: Partial<{
        [K in keyof HTMLElementEventMap]: (event: HTMLElementEventMap[K]) => void;
    }>;
}
/** Создаёт элемент с атрибутами и детьми; строки становятся текстовыми узлами. */
export declare function h<K extends keyof HTMLElementTagNameMap>(tag: K, props?: Props, ...children: Child[]): HTMLElementTagNameMap[K];
/** Добавляет детей, пропуская пустые значения. */
export declare function append(parent: Node, children: Child[]): void;
/** Заменяет содержимое элемента новыми детьми. */
export declare function replaceChildren(parent: Element, ...children: Child[]): void;
/** Создаёт `<svg>` из строки разметки. Только для ДОВЕРЕННЫХ иконок из кода, не для данных. */
export declare function svg(markup: string, className?: string): SVGElement;
export {};
//# sourceMappingURL=html.d.ts.map