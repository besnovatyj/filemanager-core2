import type { CommandRegistry } from './CommandRegistry';
/**
 * Горячие клавиши: слушает `keydown` на корне приложения, находит команду по сочетанию и
 * выполняет её. Контекстно-зависим: в полях ввода (адресная строка, inline-переименование)
 * сочетания списка не действуют — там Delete удаляет символ, а не файл.
 *
 * Открытый модальный диалог перехватывает клавиатуру сам (фокус-ловушка), сюда события не доходят.
 */
export declare class Keymap {
    private readonly commands;
    private dispose;
    constructor(commands: CommandRegistry);
    attach(root: HTMLElement): void;
    detach(): void;
}
//# sourceMappingURL=Keymap.d.ts.map