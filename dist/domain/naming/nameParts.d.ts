/** Основа и расширение имени: 'a.tar.gz' → {stem:'a.tar', ext:'gz'}; '.env' → {stem:'.env', ext:null}. */
export interface NameParts {
    stem: string;
    ext: string | null;
}
export declare function splitName(name: string): NameParts;
export declare function joinName(stem: string, ext: string | null): string;
/** Все dot-сегменты после основы: 'shell.php.jpg' → ['php','jpg'] (для блок-листа). */
export declare function allExtensions(name: string): string[];
/** Длина строки в байтах UTF-8 (лимиты имён считаются в байтах, как в ФС). */
export declare function utf8Length(text: string): number;
//# sourceMappingURL=nameParts.d.ts.map