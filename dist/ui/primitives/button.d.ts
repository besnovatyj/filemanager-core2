import type { DisposeFn } from '../../shared/lib/Disposable.d.ts';
import type { CommandRegistry } from '../../commands/CommandRegistry.d.ts';
export interface ButtonOptions {
    icon?: string;
    label?: string;
    title?: string;
    variant?: 'ghost' | 'primary' | 'danger' | 'outline';
    iconOnly?: boolean;
    onClick?: (event: MouseEvent) => void;
}
/** Кнопка в стиле проводника (классы из `base`-стилей темы). */
export declare function button(options: ButtonOptions): HTMLButtonElement;
/**
 * Кнопка, привязанная к команде: подпись/иконка из команды, `disabled` и `aria-pressed`
 * обновляются реактивно через `canExecute`/`isChecked`. Возвращает элемент и функцию отписки.
 */
export declare function commandButton(commands: CommandRegistry, commandId: string, options?: {
    iconOnly?: boolean;
    label?: string;
    icon?: string;
    variant?: ButtonOptions['variant'];
}): {
    el: HTMLButtonElement;
    dispose: DisposeFn;
};
//# sourceMappingURL=button.d.ts.map