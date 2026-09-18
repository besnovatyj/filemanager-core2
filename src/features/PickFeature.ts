/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {t} from '@/shared/i18n/i18n';
import type {Node} from '@/domain/node/Node';
import type {CommandRegistry} from '@/commands/CommandRegistry';
import type {CommandContext} from '@/commands/CommandContext';
import type {Feature} from './Feature';

/**
 * Режим picker: команда «Выбрать» отдаёт хосту выделенные файлы (с учётом фильтра и
 * множественности) и закрывает окно через переданный колбэк.
 */
export class PickFeature implements Feature {
  constructor(private readonly close: () => void) {}

  init(_ctx: CommandContext, commands: CommandRegistry): void {
    commands.register({
      id: 'pick', group: 'file', order: 5, icon: 'check',
      label: () => t('cmd.pick'),
      isHidden: (c) => c.config.mode !== 'picker',
      canExecute: (c) => c.config.mode === 'picker' && this.pickable(c).length > 0,
      execute: (c) => {
        const nodes = this.pickable(c);
        c.config.onPick?.(nodes);
        this.close();
      },
    });
  }

  private pickable(c: CommandContext): Node[] {
    const filter = c.config.pickFilter;
    const files = c.selectedNodes().filter((n) => n.kind === 'file' && (filter === null || filter(n)));
    if (!c.config.pickMultiple && files.length > 1) return [];
    return files;
  }

  dispose(): void {
    // подписок нет
  }
}
