# Расширение и замена частей

Где в ядре точки расширения, что и как подменяется на сторонние библиотеки, как добавить команду,
фичу, панель или операцию.

## 1. Порты (интерфейсы, за которыми можно спрятать библиотеку)

| Порт | Файл | Встроенная реализация | Кандидат на замену |
|---|---|---|---|
| `FsClient` | `api/client/FsClient.ts` | `HttpFsClient` (bescms-fs по HTTP), `MemoryFsClient` (в памяти) | любой другой бэкенд/протокол |
| `Transport` | `api/transport/Transport.ts` | `HttpTransport` (fetch + XHR) | ретраи, очередь запросов, mock |
| `UploadStrategy` | `api/upload/UploadStrategy.ts` | `XhrUploadStrategy`, `TusUploadStrategy` | Uppy (`@uppy/core` + источники), S3 multipart напрямую |
| `Virtualizer` | `ui/ports/Virtualizer.ts` | `UniformGridVirtualizer` | адаптер над `@tanstack/virtual-core` (переменная высота) |
| `DndAdapter` | `ui/ports/DndAdapter.ts` | `Html5DndAdapter` | адаптер над `@atlaskit/pragmatic-drag-and-drop` (клавиатура, автопрокрутка) |
| Диалоги | `model/DialogStore.ts` + `ui/explorer/dialogs/DialogHost.ts` | `fm-dialog` | Reka UI / любой UI-кит: заменяется только `DialogHost` |
| Меню | `ExplorerDeps.openMenu` | `fm-menu` | любое popover-меню |
| Словарь | `shared/i18n` | русский | `ExplorerConfig.dictionary` |

Замена портов — через `ExplorerConfig.adapters`:

```ts
createExplorer({
  connector: '/File/backend/api',
  adapters: {
    dnd: new PragmaticDndAdapter(),               // implements DndAdapter
    virtualizer: () => new TanstackVirtualizer(), // implements Virtualizer
    uploadStrategies: (client) => [new TusUploadStrategy(client, headers, describe), new XhrUploadStrategy(client)],
  },
});
```

### 1.1 Пример: `DndAdapter` на Pragmatic drag-and-drop (набросок)

```ts
import {draggable, dropTargetForElements, monitorForElements} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import {dropTargetForExternal} from '@atlaskit/pragmatic-drag-and-drop/external/adapter';
import type {DndAdapter, DragSourceSpec, DropTargetSpec} from '@besnovatyj/filemanager-core2';

export class PragmaticDndAdapter implements DndAdapter {
  source(container: HTMLElement, spec: DragSourceSpec) {
    // Pragmatic вешается на элементы, а не на контейнер: подписываемся на появление .item
    // (MutationObserver) и для каждого вызываем draggable({element, getInitialData: () => spec.payload(element)}).
    …
  }
  target(container: HTMLElement, spec: DropTargetSpec) {
    // dropTargetForElements + dropTargetForExternal на контейнере; в canDrop/onDrop переводим
    // данные Pragmatic в DropContext контракта порта.
    …
  }
}
```

Панели (`fm-content-pane`, `fm-nav-pane`) при этом не меняются: они описывают только «что
тащим» (`payload`) и «куда можно» (`resolve`/`canDrop`/`onDrop`).

### 1.2 Пример: `Virtualizer` на TanStack

`Virtualizer` требует: `layout()`, `rect(index)`, `indexAt(x, y)`, `range(scrollTop, height, count)`,
`intersecting(area, count, width)`, `totalHeight(count)`. Для `@tanstack/virtual-core` это обёртка
над `Virtualizer` с `getVirtualItems()` и `measureElement`; панель по-прежнему рендерит только
диапазон `range()` и позиционирует ячейки по `rect()`.

## 2. Добавить команду

Команда — объект `Command` (`commands/Command.ts`): `id`, `label()`, `icon`, `shortcuts`, `group`,
`canExecute(ctx)`, `execute(ctx)`, опционально `isChecked`/`isHidden`. Регистрируется фичей:

```ts
commands.register({
  id: 'zip', group: 'file', order: 60, icon: 'archive', shortcuts: ['Ctrl+Shift+Z'],
  label: () => t('cmd.zip'),
  canExecute: (c) => c.selectedNodes().length > 0 && c.capabilities().allows('archive'),
  execute: async (c) => { /* очередь → клиент → применить факты к DirectoryStore */ },
});
```

После регистрации команда доступна в меню (`entriesFromIds`), тулбаре (`commandButton`), по
горячим клавишам и в контекстных меню — без правок этих компонентов, только добавьте её id в
нужный список (`ITEM_MENU`, `FOLDER_MENU`, `VIEW_MENU` в `ui/explorer/deps.ts`).

## 3. Добавить фичу

Класс с `init(ctx, commands)` и `dispose()` (`features/Feature.ts`). Внутри — команды, подписки на
сигналы (через `DisposableStore`), вызовы клиента через очередь (`ctx.queue.run({...})`), диалоги
через `ctx.dialogs`. Добавьте экземпляр в список `features` в `app/createExplorer.ts`. Если фиче
нужен доступ из UI (как `RenameFeature.commit()`), добавьте её в `ExplorerDeps.features`.

Правила:

- изменения хранилища идут только через очередь — панель операций и отмена работают автоматически;
- после успешной операции кэш правится фактами из ответа (`dirs.applyAdded/Removed/Replaced/Report`),
  полный `refresh` — только когда фактов нет;
- ошибки не глотать: `ApiError` пробрасывается, `CommandRegistry.execute` покажет диалог (кроме отмены).

## 4. Добавить панель или диалог

Панель — custom element с префиксом `fm-`, стили через `adoptStyles(root, base, styles)` (без
`tokens` — они на корне), зависимости через `bind(deps)`, всё подписанное — в `DisposableStore`,
освобождение в `disconnectedCallback`. Пользовательские строки в DOM — только через `textContent`
(`h()` из `shared/dom/html.ts`). Реактивность — `effect()` на сигналах сторов.

Ловушка custom elements: приватные поля класса не должны совпадать с именами свойств и методов
`HTMLElement` (`title`, `dir`, `lang`, `hidden`, `id`, `slot`, `style`, `prefix`, `scrollTo`,
`focus`, `click`, `remove`…) — TypeScript сообщит об этом как об ошибке `override`/несовместимости
с `CustomElementConstructor`. Называйте поля предметно: `heading`, `viewport`, `layer`.

Диалог нового вида: добавить вариант в `DialogRequest` (`model/DialogStore.ts`), метод-обёртку,
возвращающий промис, и ветку рендера в `DialogHost`.

## 5. Добавить операцию контракта (сквозь оба слоя)

1. `docs/API-CONTRACT.md` — вход/выход/ошибки, minor версии.
2. Бэкенд: класс в `yii2-cms-file/src/api/operations`, регистрация в `config/container.fs.php`
   (см. `src/api/README.md`); маршрут и RBAC появляются автоматически.
3. Клиент: типы в `api/contract/*`, guard в `api/codec/guards.ts`, метод в `FsClient` и
   `HttpFsClient` (+ заглушка в `MemoryFsClient`), команда/фича по §2–3.
4. Если операция зависит от хранилища — флаг в `MountCapabilities` (сервер) и `Capabilities.can()`
   (клиент), чтобы UI гасил действие там, где оно не поддерживается.

## 6. Вкладки (задел, ADR-15)

Состояние одной вкладки — `NavigationStore` + `SelectionStore` + `ViewStore.filter`; остальное общее.
Команды и панели читают состояние только через аксессоры `CommandContext` (`currentPath()`,
`selectedNodes()`), поэтому для вкладок достаточно `TabStore` с активной тройкой и делегированием
аксессоров. Новый код не должен обращаться к `ctx.nav`/`ctx.selection` там, где есть аксессор.
