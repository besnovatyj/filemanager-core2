/** Каноническая форма сочетания из строки конфига (`ctrl+a` → `Ctrl+A`). */
export declare function normalizeShortcut(shortcut: string): string;
/** Каноническая форма сочетания из события клавиатуры. */
export declare function shortcutFromEvent(event: KeyboardEvent): string;
/** Идёт ли событие из поля ввода (там горячие клавиши списка не действуют). */
export declare function isEditableTarget(event: Event): boolean;
//# sourceMappingURL=keys.d.ts.map