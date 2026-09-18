/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import type {CommandContext} from './CommandContext';

/**
 * Команда — единица действия пользователя (ARCHITECTURE.md §2.2).
 *
 * Один объект питает меню, тулбар, контекстное меню, горячие клавиши и палитру: у всех них
 * общий `canExecute`, поэтому условия «когда пункт активен» не дублируются. `label()` — функция,
 * чтобы подпись могла зависеть от состояния (например, «Показать/Скрыть панель»).
 */
export interface Command {
  /** Стабильный идентификатор ('rename', 'view.details'). */
  readonly id: string;
  /** Подпись (локализованная). */
  label(ctx: CommandContext): string;
  /** Имя иконки из набора UI (строка — команды не зависят от слоя ui). */
  readonly icon?: string;
  /** Сочетания клавиш в форме 'Ctrl+C', 'F2', 'Delete'. Первое показывается в меню. */
  readonly shortcuts?: readonly string[];
  /** Группа для меню/тулбара ('navigation' | 'clipboard' | 'edit' | 'view' | 'file'). */
  readonly group?: string;
  /** Порядок внутри группы. */
  readonly order?: number;

  canExecute(ctx: CommandContext): boolean;
  execute(ctx: CommandContext, arg?: unknown): void | Promise<void>;
  /** Для переключателей (режим вида): текущее состояние. */
  isChecked?(ctx: CommandContext): boolean;
  /** Спрятать из меню (а не только задизейблить): например, «Выбрать» вне picker-режима. */
  isHidden?(ctx: CommandContext): boolean;
}
