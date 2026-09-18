# Архитектура файлового менеджера v2

Документ для того, кто открывает проект впервые. Сначала — общая картина, затем слои фронтенда,
затем бэкенда, затем «как течёт одно действие пользователя» сквозь все слои.

## 1. Общая картина

```
┌───────────────────────────── браузер ─────────────────────────────┐
│  Хост (Jodit-плагин / standalone-виджет / демо-страница)          │
│      │ createExplorer(config) → Explorer (публичный API)          │
│  ┌───▼───────────────────────────────────────────────────────┐    │
│  │  ui/ + widgets/   Web Components (Shadow DOM), сигналы     │    │
│  ├────────────────────────────────────────────────────────────┤    │
│  │  commands/        реестр команд (меню, тулбар, хоткеи)     │    │
│  │  features/        сценарии: навигация, буфер, загрузка…    │    │
│  │  model/           сторы (сигналы): навигация, кэш, выбор…  │    │
│  ├────────────────────────────────────────────────────────────┤    │
│  │  domain/          чистый TS: пути, имена, выделение,       │    │
│  │                   буфер, очередь, сортировка, capabilities │    │
│  ├────────────────────────────────────────────────────────────┤    │
│  │  api/             контракт (типы) + кодек + транспорт +    │    │
│  │                   клиент (порт FsClient → Http / Memory)   │    │
│  └────────────────────────────────────────────────────────────┘    │
└───────────────────────────────┬────────────────────────────────────┘
                                │  bescms-fs v1 (docs/API-CONTRACT.md)
┌───────────────────────────────▼────────────────────────────────────┐
│  yii2-cms-file (PHP)                                               │
│  controllers/backend/ApiController  ← Yii-адаптер (маршруты, RBAC) │
│  api/        конверт, коды ошибок, операции, реестр, describe      │
│  fs/         домен VFS: пути, имена, узлы, mount'ы, политики,      │
│              операции (Lister, Transfer, …) поверх League\Flysystem │
│  Flysystem адаптеры: Local / ZipArchive / AWS S3 (+ любой другой)  │
└────────────────────────────────────────────────────────────────────┘
```

Ключевое свойство: **фронтенд и бэкенд связаны только контрактом.** Ни один класс фронтенда не знает
про Yii, ни один класс бэкенда — про Web Components. Обе стороны можно заменять целиком.

## 2. Фронтенд: слои и правила зависимостей

Направление импортов — строго сверху вниз (проверяется линтером в Фазе 10, до этого — дисциплиной):

```
widgets → ui → features → commands → model → api → domain → shared
                            ↘ (features могут использовать api и domain напрямую)
```

| Слой | Что здесь | Чего здесь НЕТ |
|---|---|---|
| `shared/` | сигналы (`reactive`), типизированный `EventEmitter`, `Disposable`, форматирование, DOM-хелперы, i18n | бизнес-логики |
| `domain/` | чистые модели предметной области: `VirtualPath`, правила имён, `SelectionModel`, `ClipboardModel`, `OperationQueue`, сортировка, capabilities, конфликты | импортов из `api`, DOM, `window` |
| `api/` | типы контракта (`contract/`), проверка ответов (`codec/`), транспорт (`transport/`), клиент (`client/`: порт `FsClient`, `HttpFsClient`, `MemoryFsClient`), стратегии загрузки (`upload/`: порт `UploadStrategy`, `Xhr`, `Tus`) | состояния приложения |
| `model/` | сторы на сигналах: `SessionStore`, `NavigationStore` (с корнем области), `DirectoryStore`, `SelectionStore`, `ClipboardStore`, `ViewStore`, `ViewportStore` (узко/палец), `DialogStore`; `ExplorerSettings` | DOM |
| `commands/` | `Command` (id, label, icon, shortcut, `canExecute`, `execute`), `CommandRegistry`, `Keymap` | DOM (кроме `KeyboardEvent` как входа) |
| `features/` | сценарии use-case, соединяющие сторы, клиент и диалоги: `Navigation`, `Selection`, `CreateFolder`, `Rename`, `Delete`, `Transfer` (move/copy + конфликты), `Clipboard`, `Upload` (кнопка, drop папок из ОС), `Download`, `Properties`, `View`, `Pick`. Регистрируют свои команды | разметки |
| `ui/` | порты `ports/` (`Virtualizer`, `DndAdapter`), примитивы (`button`, `fm-menu`, `fm-dialog`, `splitter`), части проводника (`fm-toolbar`, `fm-address-bar`, `fm-nav-pane`, `fm-content-pane`, `fm-preview-pane`, `fm-status-bar`, `fm-queue-panel`, `fm-window`, `dialogs/DialogHost`), тема (`theme/tokens`), иконки | прямых вызовов API |
| `widgets/` | `<fm-explorer>` — композиция панелей в одно приложение, режимы `manager`/`picker` | |
| `app/` | `ExplorerConfig`, composition root `createExplorer()` (единственная публичная фабрика), объект `Explorer` для хоста | |

### 2.0 Composition root вместо DI-контейнера

В v1 зависимости раздавал строковый контейнер (`DI_TOKENS.BUS`…): связи не проверялись
компилятором, а «кто от кого зависит» было видно только в рантайме. В v2 всё собирается явно в
`app/createExplorer.ts`: клиент → сторы → контекст команд → фичи → UI. Файл читается как
оглавление архитектуры, ошибка проводки — ошибка компиляции. Web Components получают
зависимости методом `bind(deps)` (у custom elements нет параметров конструктора).

### 2.1 Почему сигналы, а не шина событий

В v1 фичи общались строковыми событиями (`'nav:openDir'`), и «кто на что реагирует» было не
проследить. В v2 состояние — в сторах-сигналах; UI подписывается на производные (`computed`) и
перерисовывает ровно то, что изменилось. События остались только там, где они по природе события:
DOM (клик), транспорт (прогресс), очередь (задача завершена).

Реализация сигналов — своя, ~150 строк (`shared/reactive/signal.ts`): `signal`, `computed`,
`effect`, `batch`, авто-отслеживание зависимостей, dispose. Без внешних зависимостей, легко заменить
на `@preact/signals-core`, интерфейс совместим по духу.

### 2.2 Команды

Единственный способ «сделать что-то» из UI — выполнить команду по id: `commands.execute('rename')`.
Команда сама знает, доступна ли она (`canExecute(ctx)`), где `ctx` — снимок сторов (текущая папка,
выделение, capabilities, буфер). Поэтому меню, тулбар, контекстное меню и горячие клавиши
**не содержат условий** — они спрашивают реестр.

### 2.3 Очередь операций

Каждая мутация — `Task` в `OperationQueue`: `queued → running → done|failed|cancelled`, с прогрессом
и per-item отчётом. Панель операций показывает очередь; навигация в другую папку задачу не убивает.
Пока бэкенд синхронный, задача «running» живёт ровно один HTTP-запрос; при появлении `jobs` (Фаза 10)
меняется только исполнитель задачи, не UI.

### 2.4 Порты для сторонних библиотек

Всё, что можно захотеть заменить готовой библиотекой, спрятано за интерфейсом-портом с встроенной
реализацией по умолчанию: `FsClient`/`Transport` (бэкенд), `UploadStrategy` (доставка байтов: multipart
или tus), `Virtualizer` (геометрия списка), `DndAdapter` (перетаскивание), `DialogHost`/`openMenu`
(диалоги и меню). Панели описывают только намерение («что тащим», «куда можно», «какой диапазон
рендерить»), реализация подставляется в `createExplorer` через `ExplorerConfig.adapters`.
Подробно и с примерами — `docs/EXTENDING.md`.

### 2.5 Область видимости (scope)

Хост может запереть проводник в поддереве (папка сущности при редактировании поста). На клиенте
это `NavigationStore.root`: навигация, дерево и крошки не поднимаются выше. На сервере — подписанный
токен `X-Fs-Scope` (см. `API-CONTRACT.md` §1, `SECURITY.md`): любой путь запроса вне области
отклоняется. Клиентская часть — удобство, серверная — защита.

### 2.6 Мобильные устройства

`ViewportStore` даёт два независимых сигнала: `narrow` (ширина самого проводника < 640px) и `coarse`
(указатель-палец). Первый меняет раскладку (дерево-шторка, меню «ещё», усечённые крошки, узкая
таблица, окно во весь экран), второй — размеры целей и модель тапов (тап по папке открывает, по
файлу выделяет, режим выделения с чекбоксами, долгое нажатие — меню). Полная таблица жестов и
клавиш — `docs/INTERACTION.md`.

### 2.7 Кэш каталогов и оптимистичные обновления

`DirectoryStore` хранит листинги по пути. После успешной операции стор получает **факты** из ответа
(узлы из `report.items[].node`) и правит кэш точечно; полный `list` делается только там, где факты
неполны (например, копирование папки). Инвалидация — по путям-предкам.

Те же факты стор транслирует наружу (`DirectoryStore.changes`: `removed`/`added`/`updated`) для
сторов со своими списками узлов — `SearchStore` правит результаты поиска на месте (удалили
найденный файл — он исчез из результатов; загрузили подходящий под запрос — появился) без
повторного обхода на сервере. Правило: списки узлов вне `DirectoryStore` подписываются на
`changes`, а не дублируют логику применения отчётов.

## 3. Бэкенд: слои

```
controllers/backend/ApiController   Yii-адаптер: actions() из реестра операций; JSON-парсер;
                                    маппинг исключений → конверт; потоковый download; scope-токен
controllers/backend/TusController   HTTP-адаптер tus (create / head / patch / delete)
api/scope/ScopeToken                выпуск и проверка подписанного токена области (Yii-зависимый)
api/                                Протокол: Contract, ErrorCode, ApiException, Envelope,
                                    Payload (типизированное чтение входа), NodeSerializer,
                                    OperationInterface + OperationRegistry + operations/*
fs/                                 Домен VFS (не знает про HTTP и Yii):
  path/VirtualPath, PathScope       адрес узла, валидация; область видимости запроса
  naming/*                          правила имён, валидатор, санитайзер, уникальные имена
  node/*                            Node, NodeKind, NodeFactory (из Flysystem-атрибутов)
  mount/*                           Mount, MountCapabilities, MountRegistry, фабрики адаптеров,
                                    резолверы публичных URL
  policy/*                          конвейер правил операций (имя, расширение, размер, содержимое…)
  operation/*                       Lister, Inspector, DirectoryCreator, Renamer, Transfer,
                                    Deleter, Uploader, Downloader, ConflictPolicy, отчёты
  tus/*                             докачиваемая загрузка: TusServer (протокол), FileTusStore, TusConfig
  naming/Transliterator*            опциональная транслитерация имён при загрузке
  exception/*                       FsException и наследники с кодом контракта
  VirtualFileSystem                 фасад домена
```

Каждая операция контракта — класс в `api/operations` (`ListOperation`, `MoveOperation`…), который:
1) читает вход через `Payload` (типы, обязательность → `bad_request`),
2) зовёт домен (`VirtualFileSystem`),
3) сериализует результат (`NodeSerializer`, отчёт).

`ApiController::actions()` строит Yii-actions из реестра: `list` → `/File/backend/api/list` и т. д.
Так каждая операция — отдельный маршрут, и RBAC ядра (route-based, fail-closed) работает без
дополнительного кода. `describe` спрашивает тот же авторизатор и отдаёт только разрешённое.

## 4. Как течёт одно действие: «переименовать файл»

1. Пользователь нажимает F2. `Keymap` находит команду `rename` для контекста «список файлов»
   (в поле ввода F2 не перехватывается).
2. `CommandRegistry.execute('rename')` → `RenameCommand.canExecute(ctx)`: ровно один выделенный
   узел, `capabilities.can(node, 'rename')`, mount не readOnly.
3. `RenameFeature` включает inline-редактор в `fm-content-pane`; при вводе `NameValidator`
   (правила из `describe.naming`) подсвечивает ошибку до отправки.
4. Enter → `OperationQueue.enqueue(RenameTask)`; задача вызывает `FsClient.rename({path, name})`.
5. `HttpFsClient` → `HttpTransport.postJson('/rename')` → бэкенд `RenameOperation`:
   `Payload` → `VirtualFileSystem::rename()` → `NameValidator` + `OperationPolicy` (блок-лист
   расширений) → Flysystem `move` → `Node` результата → конверт `{ok:true,data:{node}}`.
6. `codec` проверяет конверт, `DirectoryStore.applyRenamed(oldPath, node)` правит кэш точечно,
   `SelectionStore` переносит выделение на новый путь, `fm-content-pane` перерисовывает одну строку.
7. При `name_invalid`/`exists` — `ApiError` с кодом → `DialogStore.error(...)` показывает
   человеческое сообщение; inline-редактор остаётся открытым для исправления.

## 5. Соглашения по коду

- TypeScript strict, ESM, без default-экспортов (кроме entry), пути через алиас `@/`.
- Web Components: имя тега с префиксом `fm-`; стили — `adoptedStyleSheets`; никаких глобальных
  стилей; токены темы — CSS custom properties на хосте.
- Файлы: `PascalCase.ts` для классов, `camelCase.ts` для функций/утилит, `*.test.ts` рядом с кодом.
- PHP: PSR-12, `declare(strict_types=1)`, `final` по умолчанию, readonly value objects,
  исключения с кодами контракта.
- Комментарии объясняют **зачем**; «что» видно из кода.
