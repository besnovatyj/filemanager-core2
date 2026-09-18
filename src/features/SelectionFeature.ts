/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {t} from '@/shared/i18n/i18n';
import type {CommandRegistry} from '@/commands/CommandRegistry';
import type {CommandContext} from '@/commands/CommandContext';
import type {Feature} from './Feature';

/** Команды выделения: всё / обратить / снять. Клавиатурная навигация живёт в панели содержимого. */
export class SelectionFeature implements Feature {
  init(_ctx: CommandContext, commands: CommandRegistry): void {
    commands.registerAll([
      {
        id: 'select-all', group: 'edit', order: 100, shortcuts: ['Ctrl+A'],
        label: () => t('cmd.selectAll'),
        canExecute: (c) => c.selection.order.value.length > 0,
        execute: (c) => c.selection.selectAll(),
      },
      {
        id: 'invert-selection', group: 'edit', order: 110,
        label: () => t('cmd.invertSelection'),
        canExecute: (c) => c.selection.order.value.length > 0,
        execute: (c) => c.selection.invert(),
      },
      {
        id: 'clear-selection', group: 'hidden', shortcuts: ['Escape'],
        label: () => '',
        canExecute: (c) => c.selection.count.value > 0,
        execute: (c) => c.selection.clear(),
      },
    ]);
  }

  dispose(): void {
    // подписок нет
  }
}
