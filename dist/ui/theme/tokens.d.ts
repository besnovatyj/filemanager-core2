/**
 * Дизайн-токены проводника — CSS custom properties на хост-элементе `<fm-explorer>`.
 *
 * Компоненты живут в Shadow DOM и не видят стилей страницы (Bootstrap не переопределяется —
 * конвенция проекта), но custom properties наследуются сквозь shadow-границу, поэтому хост
 * может перекрасить проводник, задав переменные на `fm-explorer` или любом предке.
 * Тёмная тема: `prefers-color-scheme: dark` либо атрибут `data-theme="dark"` на хосте.
 */
export declare const tokens: string;
/** Базовые правила для каждого shadow root: сброс, шрифт, фокус, кнопки, поля. */
export declare const base: string;
//# sourceMappingURL=tokens.d.ts.map