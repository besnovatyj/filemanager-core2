/** Тег для подсветки CSS в редакторе: css`...`. Ничего не делает, кроме склейки. */
export declare function css(strings: TemplateStringsArray, ...values: (string | number)[]): string;
export declare function sheet(text: string): CSSStyleSheet;
/** Подключает наборы стилей к shadow root (порядок = порядок каскада). */
export declare function adoptStyles(root: ShadowRoot, ...texts: string[]): void;
//# sourceMappingURL=css.d.ts.map