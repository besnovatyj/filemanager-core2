/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {t} from '@/shared/i18n/i18n';
import type {CommandRegistry} from '@/commands/CommandRegistry';
import type {CommandContext} from '@/commands/CommandContext';
import type {TransferFeature} from './TransferFeature';
import type {Feature} from './Feature';

/** Копировать / вырезать / вставить поверх ClipboardStore и TransferFeature. */
export class ClipboardFeature implements Feature {
  constructor(private readonly transfer: TransferFeature) {}

  init(_ctx: CommandContext, commands: CommandRegistry): void {
    commands.registerAll([
      {
        id: 'copy', group: 'clipboard', order: 10, icon: 'copy', shortcuts: ['Ctrl+C', 'Ctrl+Insert'],
        label: () => t('cmd.copy'),
        canExecute: (c) => c.capabilities().canAll('copy', c.selectedNodes()),
        execute: (c) => c.clipboard.copy(c.selectedNodes().map((n) => n.path)),
      },
      {
        id: 'cut', group: 'clipboard', order: 20, icon: 'cut', shortcuts: ['Ctrl+X', 'Shift+Delete'],
        label: () => t('cmd.cut'),
        canExecute: (c) => c.capabilities().canAll('move', c.selectedNodes()),
        execute: (c) => c.clipboard.cut(c.selectedNodes().map((n) => n.path)),
      },
      {
        id: 'paste', group: 'clipboard', order: 30, icon: 'paste', shortcuts: ['Ctrl+V', 'Shift+Insert'],
        label: () => t('cmd.paste'),
        canExecute: (c) => {
          const dir = c.currentDir();
          const state = c.clipboard.state.value;
          if (!dir || state.mode === null) return false;
          const via = state.mode === 'cut' ? 'move' : 'copy';
          return c.capabilities().canWriteInto(dir, via) && c.clipboard.canPasteInto(dir.path);
        },
        execute: async (c) => {
          const state = c.clipboard.state.peek();
          if (state.mode === null) return;
          const report = await this.transfer.transfer(state.mode === 'cut' ? 'move' : 'copy', state.paths, c.currentPath());
          c.clipboard.afterPaste();
          if (report) {
            const targets = report.items.filter((i) => i.status === 'ok' && i.target).map((i) => i.target as string);
            if (targets.length > 0) c.selection.setSelected(targets);
          }
        },
      },
    ]);
  }

  dispose(): void {
    // подписок нет
  }
}
