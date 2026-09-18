/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {t} from '@/shared/i18n/i18n';
import type {Node} from '@/domain/node/Node';
import {ApiError} from '@/api/codec/ApiError';
import type {CommandRegistry} from '@/commands/CommandRegistry';
import type {CommandContext} from '@/commands/CommandContext';
import type {Feature} from './Feature';

/** Свойства: для одного узла — точный `stat` (MIME, размеры изображения), для нескольких — сводка. */
export class PropertiesFeature implements Feature {
  init(_ctx: CommandContext, commands: CommandRegistry): void {
    commands.register({
      id: 'properties', group: 'file', order: 90, icon: 'info', shortcuts: ['Alt+Enter'],
      label: () => t('cmd.properties'),
      canExecute: (c) => c.selectedNodes().length > 0 || c.currentDir() !== null,
      execute: async (c) => {
        const nodes = c.selectedNodes().length > 0 ? [...c.selectedNodes()] : [c.currentDir() as Node];
        // Диалог открывается сразу (с индикацией загрузки), точные метаданные подставляются по готовности:
        // на медленной сети ожидание ответа stat не должно выглядеть как «ничего не произошло».
        const detailed: Promise<Node | null> = nodes.length === 1 && c.capabilities().can('stat', nodes[0] as Node)
          ? c.client.stat({path: (nodes[0] as Node).path}).then((node) => {
            if (node.kind === 'file') c.dirs.applyUpdated(node);
            return node;
          }).catch((error: unknown) => {
            if (!ApiError.wrap(error).isAborted) console.warn('[properties] stat не удался, показываем данные листинга', error);
            return null;
          })
          : Promise.resolve(null);
        await c.dialogs.properties(nodes, detailed);
      },
    });
  }

  dispose(): void {
    // подписок нет
  }
}
