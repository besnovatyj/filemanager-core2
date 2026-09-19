/**
 * Внутреннее перетаскивание узлов: пути передаются через HTML5 DnD собственным MIME-типом,
 * чтобы drop-зоны отличали «свои» перетаскивания от файлов ОС (`Files`) и текста.
 */
export declare const DRAG_MIME = "application/x-bescms-fs-paths";
export declare function writeDragPaths(dt: DataTransfer, paths: readonly string[]): void;
export declare function readDragPaths(dt: DataTransfer): string[] | null;
//# sourceMappingURL=dnd.d.ts.map