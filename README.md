# @besnovatyj/filemanager-core2

Файловый менеджер «как проводник Windows» для браузера: framework-agnostic ядро на TypeScript
(strict), Web Components в Shadow DOM, самоописываемый API к бэкенду (`bescms-fs` v1).

Это **вторая линия** разработки, заменяющая `@besnovatyj/filemanager-core` (v1). Пока обе живут
рядом; после завершения Фазы 9 (см. `docs/PLAN.md`) v2 публикуется как `filemanager-core@2`.

## Документация

| Файл | О чём |
|---|---|
| [docs/PLAN.md](docs/PLAN.md) | план работ по фазам, решения (ADR), открытые вопросы, журнал |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | слои фронтенда и бэкенда, правила зависимостей, поток одного действия |
| [docs/API-CONTRACT.md](docs/API-CONTRACT.md) | **канон** протокола между фронтендом и любым бэкендом |
| [docs/SECURITY.md](docs/SECURITY.md) | модель угроз и где стоит каждая защита |
| [docs/INTERACTION.md](docs/INTERACTION.md) | мышь, клавиатура, touch: жесты, сочетания, поведение панелей |
| [docs/UPLOAD-TUS.md](docs/UPLOAD-TUS.md) | докачиваемая загрузка: протокол, сервер, клиент, требования к окружению |
| [docs/EXTENDING.md](docs/EXTENDING.md) | порты и замена на сторонние библиотеки; как добавить команду, фичу, операцию |

Бэкенд-реализация контракта для Yii2: `besnovatyj/yii2-cms-file`, каталоги `src/fs` и `src/api`
(в каждом — README).

## Быстрый старт (хост-страница)

```ts
import {createExplorer} from '@besnovatyj/filemanager-core2';

const explorer = createExplorer({
  connector: '/File/backend/api',          // базовый URL API (см. контракт)
  headers: {'X-CSRF-Token': token},        // заголовки хоста
  startPath: '/static/blog/12',            // виртуальный путь при открытии
  scope: {root: '/static/blog/12', token}, // запереть в поддереве (токен выпускает сервер)
  mode: 'picker',                          // 'manager' | 'picker'
  pickMultiple: true,
  pickFilter: (node) => node.mime?.startsWith('image/') ?? false,
  onPick: (nodes) => { /* picker: выбранные файлы */ },
  onClose: () => { /* окно закрыто */ },
  // adapters: {dnd, virtualizer, uploadStrategies} — замена портов, см. docs/EXTENDING.md
});

await explorer.open();       // плавающее окно
// или explorer.mount(el)    // встроить в контейнер
explorer.element.dataset.theme = 'dark';   // тема; по умолчанию — системная
```

Все поля `ExplorerConfig` описаны в `src/app/ExplorerConfig.ts`. Готовые обёртки для Yii2 —
`besnovatyj/yii2-cms-file-manager` (`ExplorerWidget`) и `besnovatyj/yii2-cms-jodit` (кнопка `explorer`).

## Сборка

Node/npm доступны только в Docker-контейнере `node`:

```bash
docker compose exec node sh -c 'cd /home/node/app/packages/npm/filemanager-core2 && npm install'
docker compose exec node sh -c 'cd /home/node/app/packages/npm/filemanager-core2 && npm run build'
docker compose exec node sh -c 'cd /home/node/app/packages/npm/filemanager-core2 && npm test'
docker compose exec node sh -c 'cd /home/node/app/packages/npm/filemanager-core2 && npm run type-check'
```

- `npm run build` → `dist/index.js` (ESM, CSS вшит) + `dist/demo.js` (демо на `MemoryFsClient`) + `dist/*.d.ts`
  (декларации нужны потребителям для `type-check`; `npm run build:js` — только JS).
- `docs/demo.html` — страница для ручной проверки без бэкенда.

## Структура

```
src/
  index.ts         публичный API
  shared/          сигналы, утилиты, DOM-хелперы, i18n
  domain/          чистые модели предметной области (без DOM)
  api/             контракт + кодек + транспорт + клиент + стратегии загрузки (xhr, tus)
  model/           сторы приложения (навигация, кэш, выделение, буфер, вид, viewport, диалоги)
  commands/        реестр команд и горячие клавиши
  features/        сценарии
  ui/              порты (Virtualizer, DndAdapter), примитивы, панели проводника, тема
  widgets/         композиция проводника (<fm-explorer>)
  app/             конфиг, composition root createExplorer, объект Explorer
```

Зависимости рантайма: `tus-js-client` (MIT). Всё остальное — собственный код.

Лицензия — MIT.
