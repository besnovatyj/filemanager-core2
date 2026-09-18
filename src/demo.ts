/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

/**
 * Демо без бэкенда: проводник поверх {@link MemoryFsClient}. Открывается из docs/demo.html.
 * Полезно для ручной проверки UI и как пример интеграции (manager и picker).
 */

import {createExplorer} from '@/app/createExplorer';
import {MemoryFsClient} from '@/api/client/MemoryFsClient';

function demoClient(): MemoryFsClient {
  const lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n'.repeat(40);
  const files: Record<string, string> = {
    'readme.md': '# Демо\n\nЭто файловая система в памяти.',
    'docs/report.pdf': '%PDF-1.4 demo',
    'docs/notes.txt': lorem,
    'docs/archive/old.txt': 'old',
    'images/': '',
    'shell.php.jpg': 'not really',
  };
  for (let i = 1; i <= 120; i++) files[`many/file-${i}.txt`] = `file ${i}`;
  for (let i = 1; i <= 12; i++) files[`images/photo-${i}.jpg`] = `jpg ${i}`;
  return new MemoryFsClient({
    latencyMs: 250,
    mounts: [
      {id: 'static', label: 'Файлы сайта', icon: 'drive', baseUrl: 'https://picsum.photos/seed', files},
      {id: 'zip', label: 'Архив (только чтение)', icon: 'archive', readOnly: true, files: {'inside.txt': 'zip', 'dir/x.txt': 'x'}},
      {id: 'cloud', label: 'S3-бакет', icon: 'cloud', files: {'uploads/': '', 'backup.tar.gz': 'tgz'}},
    ],
  });
}

declare global {
  interface Window {
    fmDemo: {open(mode: 'manager' | 'picker'): void; mount(): void};
  }
}

window.fmDemo = {
  open(mode) {
    const explorer = createExplorer({
      client: demoClient(),
      mode,
      pickMultiple: true,
      startPath: '/static',
      title: mode === 'picker' ? 'Выбор файла' : 'Файловый менеджер (демо)',
      storageKey: 'fm2-demo:view',
      onPick: (nodes) => {
        const out = document.getElementById('picked');
        if (out) out.textContent = nodes.map((n) => `${n.path} → ${n.url ?? '(нет url)'}`).join('\n');
      },
      onClose: () => console.info('[demo] closed'),
    });
    void explorer.open();
  },
  mount() {
    const host = document.getElementById('embedded');
    if (!host) return;
    host.replaceChildren();
    const explorer = createExplorer({client: demoClient(), startPath: '/', storageKey: 'fm2-demo:embedded'});
    void explorer.mount(host);
  },
};
