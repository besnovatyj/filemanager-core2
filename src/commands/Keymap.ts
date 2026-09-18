/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {listen, type DisposeFn} from '@/shared/lib/Disposable';
import {isEditableTarget, shortcutFromEvent} from '@/shared/dom/keys';
import type {CommandRegistry} from './CommandRegistry';

/**
 * Горячие клавиши: слушает `keydown` на корне приложения, находит команду по сочетанию и
 * выполняет её. Контекстно-зависим: в полях ввода (адресная строка, inline-переименование)
 * сочетания списка не действуют — там Delete удаляет символ, а не файл.
 *
 * Открытый модальный диалог перехватывает клавиатуру сам (фокус-ловушка), сюда события не доходят.
 */
export class Keymap {
  private dispose: DisposeFn | null = null;

  constructor(private readonly commands: CommandRegistry) {}

  attach(root: HTMLElement): void {
    this.detach();
    this.dispose = listen(root, 'keydown', (event) => {
      if (event.defaultPrevented || event.isComposing) return;
      if (isEditableTarget(event)) return;
      const combo = shortcutFromEvent(event);
      const command = this.commands.forShortcut(combo);
      if (!command || !command.canExecute(this.commands.context)) return;
      event.preventDefault();
      event.stopPropagation();
      void this.commands.execute(command.id);
    });
  }

  detach(): void {
    this.dispose?.();
    this.dispose = null;
  }
}
