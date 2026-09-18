/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {t} from '@/shared/i18n/i18n';
import {sleep} from '@/shared/lib/timing';
import type {Node} from '@/domain/node/Node';
import type {CommandRegistry} from '@/commands/CommandRegistry';
import type {CommandContext} from '@/commands/CommandContext';
import type {Feature} from './Feature';

/**
 * Скачивание выделенных файлов. Через `download`-URL бэкенда (attachment) — даже если есть
 * публичный URL: публичный может открыться inline (картинка/PDF), а пользователь просил скачать.
 * Несколько файлов — по одному с паузой (браузеры блокируют пачку одновременных загрузок).
 */
export class DownloadFeature implements Feature {
  init(_ctx: CommandContext, commands: CommandRegistry): void {
    commands.register({
      id: 'download', group: 'file', order: 35, icon: 'download',
      label: () => t('cmd.download'),
      canExecute: (c) => {
        const nodes = c.selectedNodes();
        return nodes.length > 0 && nodes.every((n) => n.kind === 'file') && c.capabilities().canAll('download', nodes);
      },
      execute: async (c) => {
        const files = c.selectedNodes().filter((n) => n.kind === 'file');
        for (let i = 0; i < files.length; i++) {
          const node = files[i] as Node;
          const url = c.client.downloadUrl(node.path) ?? node.url;
          if (!url) continue;
          triggerDownload(url, node.name);
          if (i < files.length - 1) await sleep(300);
        }
      },
    });
  }

  dispose(): void {
    // подписок нет
  }
}

function triggerDownload(url: string, name: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
