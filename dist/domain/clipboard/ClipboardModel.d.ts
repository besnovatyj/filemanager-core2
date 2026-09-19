/**
 * Буфер обмена файлового менеджера — машина состояний: пусто → скопировано|вырезано → вставлено.
 * Чистые функции; хранение состояния — в `ClipboardStore`.
 *
 * Семантика «вырезано» — как в проводнике: источники помечаются (в UI приглушаются), но не
 * удаляются до вставки; после успешной вставки буфер очищается. После вставки «скопированного»
 * буфер сохраняется — можно вставить ещё раз.
 */
export type ClipboardMode = 'copy' | 'cut';
export interface ClipboardState {
    readonly mode: ClipboardMode | null;
    readonly paths: readonly string[];
}
export declare const EMPTY_CLIPBOARD: ClipboardState;
export declare function copy(paths: readonly string[]): ClipboardState;
export declare function cut(paths: readonly string[]): ClipboardState;
export declare function isEmpty(state: ClipboardState): boolean;
export declare function isCut(state: ClipboardState, path: string): boolean;
/** Состояние после вставки: вырезанное — очистить, скопированное — оставить. */
export declare function afterPaste(state: ClipboardState): ClipboardState;
/** Убрать пути, которых больше нет (удалены, переименованы). */
export declare function withoutPaths(state: ClipboardState, removed: readonly string[]): ClipboardState;
/**
 * Можно ли вставить в папку: буфер не пуст; при «вырезать» цель не совпадает с папкой источника
 * (иначе операция бессмысленна) и не лежит внутри вырезаемой папки.
 */
export declare function canPasteInto(state: ClipboardState, targetDir: string): boolean;
//# sourceMappingURL=ClipboardModel.d.ts.map