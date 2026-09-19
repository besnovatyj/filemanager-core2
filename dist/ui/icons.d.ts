/** SVG-элемент иконки по имени; неизвестное имя → пустой квадрат (видно при разработке). */
export declare function icon(name: string, className?: string): SVGElement;
export declare function hasIcon(name: string): boolean;
/**
 * Иконка типа файла: документ с «загнутым уголком» и подписью расширения (как у проводника для
 * неизвестных типов). Один универсальный рисунок вместо десятков картинок: масштабируется, тем
 * не мешает. Изображения панель содержимого при желании заменит превью.
 */
export declare function fileIcon(ext: string | null, size?: number): SVGElement;
/** Иконка папки (закрашенная) — заметнее контурной в списке. */
export declare function folderIcon(size?: number, open?: boolean): SVGElement;
//# sourceMappingURL=icons.d.ts.map