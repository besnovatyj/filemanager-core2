/**
 * Незанятое имя в стиле проводника: 'Новая папка' → 'Новая папка (2)'; 'a (2).txt' → 'a (3).txt'.
 * Используется для дефолтного имени новой папки и оптимистичных вставок; сервер делает то же
 * самое при `onConflict: rename`.
 */
export declare function uniqueName(name: string, exists: (candidate: string) => boolean): string;
//# sourceMappingURL=uniqueName.d.ts.map