# План работ: файловый менеджер v2 (`@besnovatyj/filemanager-core2`)

> Рабочий документ. Ведётся по мере работы: задачи отмечаются `[x]`, решения фиксируются в разделе
> «Решения» (ADR), спорные места — в «Открытых вопросах». Даты — абсолютные.
>
> Легенда: `[ ]` не начато · `[~]` в работе · `[x]` сделано · `[-]` снято/отложено осознанно.

Создан: 2026-09-18.

---

## 0. Зачем переписываем

Старый `filemanager-core` (v1) вырос из плагина CKEditor 5 и несёт наследие:

- контракт API «TS-first, но по факту как получилось»: разные формы DTO для папки и файла (`DirDto` /
  `FileDto`), эхо-ответы, `null` в обязательных полях, часть операций без отчёта;
- фичи связаны через одну глобальную шину строковых событий (`fm-events.ts`), из-за чего логика
  «когда пункт меню активен» размазана по фичам, меню и веб-компонентам;
- нет доменного слоя: выделение, буфер обмена, конфликты имён живут внутри веб-компонентов;
- нет очереди операций: каждое действие — «отправил запрос, жду», больших пакетов нет;
- один корень де-факто (несколько точек монтирования есть, но перемещение между ними запрещено);
- бэкенд: молчаливая санитизация имён (пользователь просит `a:b`, получает `a_b` без объяснения),
  per-операционные контроллёрные методы без единого протокола ошибок.

Цель v2 — «проводник Windows в браузере» поверх **универсального, самоописываемого API**, где бэкенд
и фронтенд развиваются независимо: бэкенд сообщает, что умеет (`describe`), фронтенд адаптирует UI.

## 1. Границы и артефакты

| Артефакт | Где | Назначение |
|---|---|---|
| npm-пакет `@besnovatyj/filemanager-core2` | `app/packages/npm/filemanager-core2` | фронтенд-ядро (домен + API-клиент + UI), без привязки к Yii/Jodit |
| Контракт API (канон) | `filemanager-core2/docs/API-CONTRACT.md` | language-neutral спецификация протокола; ей следуют ЛЮБОЙ бэкенд и ЛЮБОЙ фронтенд |
| PHP-бэкенд v2 | `app/vendor/besnovatyj/yii2-cms-file/src/{fs,api}` + `controllers/backend/ApiController.php` | параллельная линия в том же пакете; старый `FileManagerController` не трогаем |
| Интеграции | Jodit-плагин (`yii2-cms-jodit/assets/plugins/`), standalone-виджет | тонкие адаптеры поверх публичного API ядра |

Старый `filemanager-core` живёт до момента, когда v2 покроет его функциональность; затем
`filemanager-core2` публикуется как `@besnovatyj/filemanager-core@2.0.0` (см. ADR-9) и старые
пакеты (`ckeditor5-filemanager`, CKEditor-адаптеры) удаляются пользователем.

## 2. Принципы (не обсуждаются при реализации)

1. **Безопасность прежде удобства.** Любой ввод клиента — недоверенный. Реальные пути ФС наружу не
   уходят никогда. Имена проверяются, а не «чинятся» молча (кроме загрузки — см. ADR-5).
2. **Самоописываемый API.** Фронтенд не знает заранее, какие операции/точки монтирования есть;
   он спрашивает `describe`. Новая операция на бэкенде = новый класс + запись в реестре, фронтенд
   узнаёт о ней автоматически (и умеет её игнорировать).
3. **Единая модель узла.** Файл, папка, точка монтирования — один тип `Node` c полем `kind`.
4. **Факты, а не эхо.** Ответ мутирующей операции — фактическое состояние после неё (узел/отчёт).
5. **Отчёты вместо флагов.** Пакетные операции возвращают per-item отчёт; частичный успех — норма.
6. **Домен без DOM.** `src/domain` фронтенда — чистый TypeScript, тестируется без браузера.
7. **Команды — единый источник действий.** Меню, тулбар, горячие клавиши, контекстное меню питаются
   одним реестром команд (`canExecute` один на всех).
8. **Очередь операций заложена в архитектуру** с первого дня, даже пока бэкенд синхронный.
9. **Возможности (capabilities) вместо `if (mount === 's3')`.** UI гасит действие, если хранилище его
   не поддерживает.
10. Документация — для человека, который недавно начал разбираться: каждый слой имеет README,
    каждый класс — PHPDoc/TSDoc с «зачем», а не только «что».

## 3. Фазы

### Фаза 0 — Каркас и документация `[x]`

- [x] Структура npm-пакета: `package.json`, `tsconfig.json`, `esbuild.js`, `eslint.config.js`, `vitest`.
- [x] `docs/PLAN.md` (этот файл), `docs/ARCHITECTURE.md`, `docs/API-CONTRACT.md`, `docs/SECURITY.md`,
      `README.md`; позже добавлены `docs/INTERACTION.md`, `docs/UPLOAD-TUS.md`, `docs/EXTENDING.md`,
      `yii2-cms-file/README.md`.
- [x] Соглашения об именовании слоёв (см. ARCHITECTURE.md §2).

### Фаза 1 — Контракт API v1 `[x]`

- [x] Спецификация протокола: конверт ответа, коды ошибок и их HTTP-маппинг, модель `Node`,
      `describe`, операции чтения (`list`, `tree`, `stat`, `content`), мутации (`mkdir`, `rename`,
      `move`, `copy`, `delete`, `upload`), потоковые (`download`), политика конфликтов, отчёты.
- [x] Зарезервированные операции будущих фаз (`thumbnail`, `write`, `search`, `archive`, `extract`,
      `jobs/*`) описаны как «reserved», чтобы имена не разошлись.
- [x] TS-типы контракта (`src/api/contract/*`) — зеркало спецификации, с runtime-guards.
- [x] PHP-слой контракта (`src/api/*`): `Contract`, `ErrorCode`, `ApiException`, `Envelope`,
      `NodeSerializer`, `OperationInterface`/`OperationRegistry`/`OperationDescriptor`.

### Фаза 2 — Бэкенд: домен виртуальной ФС (`src/fs`) `[x]`

- [x] `path/VirtualPath` — value object: разбор, нормализация, `mount`, `relative`, `parent()`,
      `child()`, `name()`, `isAncestorOf()`, `isRoot()`, `isMountRoot()`; жёсткая валидация сегментов.
- [x] `naming/NameRules` + `naming/NameValidator` + `naming/NameSanitizer` + `naming/UniqueNameGenerator`
      (`file (2).txt`), правила отдаются фронтенду в `describe.naming`.
- [x] `node/Node`, `node/NodeKind`, `node/NodeFactory` (из Flysystem-атрибутов).
- [x] `mount/Mount`, `mount/MountCapabilities`, `mount/MountDefinition`, `mount/MountRegistry`,
      `mount/adapter/AdapterFactoryInterface` + `LocalAdapterFactory`/`ZipAdapterFactory`/`S3AdapterFactory`,
      `mount/MountFactory`, `mount/url/PublicUrlResolverInterface` (+ `BaseUrlResolver`, `NoPublicUrlResolver`).
- [x] `policy/*` — конвейер правил операций: `OperationPolicy`, `PolicyRuleInterface`,
      `PolicyContext` (операция + mount + целевое имя + файл), правила: `NameRule`,
      `ExtensionBlocklistRule`, `MaxFileSizeRule`, `ContentSniffRule` (выключено по умолчанию, см. память
      о ложных срабатываниях), `MountWritableRule`.
- [x] `exception/*` — иерархия `FsException` с кодом контракта.
- [x] `operation/*` — сервисы: `Lister`, `Inspector` (stat/content), `DirectoryCreator`, `Renamer`,
      `Transfer` (move/copy, same-mount и cross-mount, рекурсивно для папок), `Deleter`, `Uploader`,
      `Downloader`; `conflict/ConflictPolicy`, `report/OperationReport`/`ItemResult`.
- [x] `VirtualFileSystem` — фасад домена для ДРУГИХ модулей CMS; API-операции зависят от сервисов
      напрямую (`ListOperation ← Lister`), фасад им не нужен.

### Фаза 3 — Бэкенд: API-слой и контроллёр `[x]`

- [x] `api/operations/*Operation` — по одному классу на операцию контракта: разбор входа
      (`Payload`), вызов домена, сериализация ответа.
- [x] `api/OperationRegistry` — реестр; `DescribeOperation` строит `describe` из реестра, реестра
      mount'ов и правил, с учётом прав текущего пользователя (route-based RBAC ядра).
- [x] `controllers/backend/ApiController` — Yii-адаптер: `actions()` из реестра (каждая операция —
      отдельный action ⇒ отдельный маршрут ⇒ RBAC по маршрутам), JSON-парсер, единый маппинг
      исключений в конверт ошибки, `download` — потоковый GET (attachment + nosniff).
- [x] DI (`config/container.php`, секция v2) — реестр mount'ов v2, политика, реестр операций.
- [x] Обратная совместимость: старый `FileManagerController` и его сервисы не тронуты.
- [ ] Smoke-тест в Docker: `describe`, `list /`, `list /static`, `mkdir`, `rename`, `upload`,
      `move` cross-mount (static → zip), `delete`, `download`. (Запускает пользователь.)

### Фаза 4 — Фронтенд: домен (`src/domain`) `[x]`

- [x] `path/VirtualPath` (зеркало PHP-класса), `naming/*` (валидатор по правилам из `describe`,
      генератор уникального имени для оптимистичных вставок).
- [x] `node/*` — типы узлов, guards, `NodeIndex` (плоский индекс по пути; пока не задействован —
      DirectoryStore хранит листинги per-папка, индекс пригодится поиску/DnD-проверкам).
- [x] `selection/SelectionModel` — якорь, Shift-диапазон, Ctrl-инверсия, «выделить всё», навигация
      клавиатурой (фокусный элемент ≠ выделение).
- [x] `clipboard/ClipboardModel` — машина состояний `empty → copied|cut → pasted`.
- [x] `operations/OperationQueue` — задачи с состояниями, прогрессом, отменой; источник для панели
      операций; независим от транспорта (sync/async бэкенд).
- [x] `sorting/*` — natural-сортировка, компараторы по колонкам, «папки сверху».
- [x] `capabilities/*` — слияние global → mount → node, запросы вида `can(node, 'rename')`.
- [x] `conflict/*` — модель разрешения конфликтов для диалога («перезаписать/пропустить/переименовать
      ± применить ко всем»).
- [x] Юнит-тесты (vitest) для path/naming/selection/clipboard/sorting/queue.

### Фаза 5 — Фронтенд: API-клиент (`src/api`) `[x]`

- [x] `contract/*` — типы протокола (единственное место, где описан wire-формат).
- [x] `codec/*` — runtime-проверка ответов (без внешних зависимостей): `ApiError` из конверта,
      guards для `Node`, `Report`, `Describe`.
- [x] `transport/*` — `HttpTransport` (fetch для JSON, XHR для загрузки с прогрессом, `AbortSignal`),
      заголовки (CSRF), таймауты.
- [x] `client/FsClient` (порт) + `HttpFsClient` + `MemoryFsClient` (in-memory реализация для тестов и
      демо-страницы).

### Фаза 6 — Фронтенд: приложение (`src/app`, `src/model`, `src/commands`) `[x]`

- [x] `shared/reactive` — минимальные сигналы (`signal`/`computed`/`effect`, батчинг, dispose).
- [x] `app/createExplorer` — composition root (ADR-13, вместо DI-контейнера); `app/Explorer` — объект для хоста.
- [x] `model/*` — `SessionStore` (describe, capabilities), `NavigationStore` (текущий путь, история
      назад/вперёд/вверх), `DirectoryStore` (кэш листингов + инвалидация + оптимистичные апдейты),
      `SelectionStore`, `ClipboardStore`, `ViewStore` (режим, сортировка, колонки, ширина панелей —
      персистентно), `QueueStore`, `DialogStore`.
- [x] `commands/*` — реестр команд + встроенные команды (navigate, refresh, up, back, forward,
      new-folder, rename, delete, copy, cut, paste, select-all, invert, upload, download, properties,
      view-mode, sort); `shortcuts/KeymapService` (контекстно-зависимо: в поле ввода Del — символ).
- [x] `features/*` — сценарии, связывающие команды со сторами и клиентом.

### Фаза 7 — Фронтенд: UI (`src/ui`, `src/widgets`) `[~]`

- [x] `ui/theme` — CSS-токены (цвета/размеры/шрифты), светлая/тёмная схема, без переопределения
      Bootstrap (виджет живёт в Shadow DOM).
- [x] `ui/primitives` — `fm-button`, `fm-icon`, `fm-menu` (контекстное/выпадающее, клавиатура),
      `fm-dialog` (модальный, фокус-ловушка), `fm-split` (разделитель панелей), `fm-toolbar`.
- [x] `ui/explorer` — `fm-window` (окно: плавающее/встроенное, ресайз), `fm-address-bar` (крошки ⇄
      редактируемый путь), `fm-nav-pane` (дерево с ленивой подгрузкой, mount'ы как «диски»),
      `fm-content-pane` (details/list/tiles/icons, виртуализация, рамка выделения, inline-rename),
      `fm-status-bar`, `fm-queue-panel`, диалоги: confirm/prompt/conflict/properties/error.
- [x] `widgets/FmExplorer` — композиция всего в одно приложение; режимы `manager` и `picker`;
      `FmWindow` — плавающее окно (drag/resize, размер сохраняется), либо встраивание `mount(el)`.
- [~] Адаптив: на узких экранах панель навигации скрыта, окно во весь экран (CSS); переключатель
      «дерево ⇄ содержимое» и long-press-контекст на touch — есть, но не проверены на устройстве.
- [ ] ПРОВЕРКА В БРАУЗЕРЕ: код написан без возможности запуска (в контейнере нет Node); первый
      `npm run type-check` + `npm test` + `docs/demo.html` — обязательный следующий шаг.

### Фаза 8 — Фичи проводника `[~]`

- [x] Навигация: двойной клик, Enter, Backspace, Alt+←/→, адресная строка, крошки, дерево ⇄ список.
- [x] Выделение: клик/Ctrl/Shift, рамка, Ctrl+A, инверсия, клавиатура (стрелки/Home/End/PageUp/Down), type-ahead.
- [x] Создание папки, переименование (F2, inline, валидация «на лету» по правилам сервера).
- [x] Удаление с подтверждением и отчётом.
- [x] Буфер обмена: копировать/вырезать/вставить (в т.ч. между mount'ами), «вырезанные» приглушены.
- [x] Загрузка: кнопка, drop из ОС (файлы и папки через `webkitGetAsEntry`), прогресс, отмена, конфликт.
- [x] Скачивание (через `download`-эндпоинт, fallback — публичный URL).
- [x] Свойства (одиночные/сводные по выделению; для одиночных — точный `stat`).
- [x] Drag-and-drop внутри (список → папка списка, список → дерево), Ctrl = копировать; drop файлов ОС в дерево.
- [x] Фильтр по имени в текущей папке, сортировка по колонкам/меню, 4 режима вида.
- [x] Предпросмотр в правой панели (`fm-preview-pane`): изображения (публичный URL или операция `preview`
      с проверкой содержимого), начало текстовых файлов (`content`, 64 КБ), метаданные, скачивание;
      debounce 200 мс и отмена запросов; на узком экране — панель поверх содержимого.
- [ ] Undo (Ctrl+Z) для rename/move/mkdir — команды поддерживают `undo?`, реализация отложена.

### Фаза 9 — Интеграции `[ ]`

- [x] Standalone-виджет для Yii2: `yii2-cms-file-manager` — `assets/explorer.ts` → `dist/explorer.js`,
      `ExplorerWidget` (picker / browser / embedded, тема, pickFilter, clientConfig) + `ExplorerAsset`.
      v1-вход и `FileManagerWidget` остаются рядом до замены.
- [x] Транслитерация кириллицы при загрузке — на бэкенде (`params.fs.naming.transliterate`,
      `TransliteratorInterface` + `CyrillicTransliterator`); у виджета опции нет (имя формирует сервер).
- [x] Jodit-плагин `assets/plugins/explorer.ts` (кнопка `explorer` со своей иконкой, рядом с v1-кнопкой
      `fileManager`): picker с множественным выбором → `<img>`/`<a>`; свойства `enableExplorer`,
      `explorerStartPath`, `explorerConnector`, `explorerTheme` у `JoditWidget`.
- [x] Страница «Файлы» в админке на v2 (embedded).
- [x] Область видимости (scope): `PathScope` + `ScopeToken` (HMAC, пользователь, срок) на сервере,
      `ExplorerConfig.scope` на клиенте; `JoditWidget::$explorerScoped` (по умолчанию папка сущности),
      `ExplorerWidget::$scope`.
- [ ] Удаление интеграции с CKEditor 5 (после подтверждения пользователем).

### Фаза 9a — Мобильные устройства и порты `[x]`

- [x] Порты `Virtualizer` (UniformGridVirtualizer), `DndAdapter` (Html5DndAdapter), `UploadStrategy`
      (Xhr, Tus); замена через `ExplorerConfig.adapters`.
- [x] `ViewportStore` (narrow по ширине проводника, coarse по указателю); touch-модель тапов
      (папка — открыть, файл — выбрать, при выделении — переключать), чекбоксы в режиме выделения,
      крупные цели (`pointer: coarse`), дерево-«шторка» с гамбургером, меню «ещё» в тулбаре,
      усечённые крошки, узкая таблица (имя + размер), `100dvh` окно.
- [ ] Проверка на реальных устройствах (iOS Safari, Android Chrome).

### Фаза 10 — Расширения (после стабилизации ядра) `[ ]`

- [x] `thumbnail` (миниатюры с серверным перекодированием — без inline SVG/HTML): `fs/thumbnail/*`, файловый кэш, `describe.thumbnails.sizes`, `FmContentPane` в режимах плитка/значки.
- [ ] `write` (сохранение текстовых файлов) + редактор.
- [x] `search` (рекурсивный поиск по имени, серверная реализация): `Searcher` с бюджетами обхода, `SearchStore`/`SearchFeature`, результаты в панели содержимого с расположением.
- [ ] `archive`/`extract` (zip) с защитой от zip-bomb (лимиты entries/размера).
- [ ] Асинхронные задания (`jobs/*`, SSE-прогресс) для больших пакетов.
- [x] Chunked/resumable upload (tus): собственный сервер протокола в `yii2-cms-file/src/fs/tus` +
      `TusController` + `upload-finalize` + `File/tus/purge`; клиент — `TusUploadStrategy` (tus-js-client, MIT).
- [ ] i18n (словарь + `Intl` для дат/чисел), a11y-аудит, Playwright-сценарии.
- [ ] Права на уровне узлов (`perms`) из RBAC/ACL.

## 4. Решения (ADR)

- **ADR-1. Без UI-фреймворка (Vue/React) в v2-ядре.** Админка — Bootstrap 5 + esbuild + TS-виджеты;
  второй фреймворк ради одного виджета раскалывает тулчейн. Домен и модель написаны без DOM, UI — Web
  Components на минимальных сигналах. Если однажды потребуется Vue-представление, оно пишется поверх
  `domain`+`model`+`commands` без их переписывания. (Рекомендацию из `FILE_MANAGER_GLOBAL_TODO.MD`
  про Vue + TanStack + Reka учли: архитектурные требования взяты полностью, стек — нет.)
- **ADR-2. API — именованные операции, а не REST-ресурсы.** `POST {connector}/{operation}` c JSON
  и единым конвертом. Причины: операции ФС по природе командные (move, copy — не CRUD), пакетность,
  единый механизм описания (`describe`), 1 операция = 1 маршрут = 1 RBAC-разрешение.
- **ADR-3. Один тип `Node` для файлов, папок и mount'ов.** Поле `kind`. Упрощает индексы, выделение,
  DnD и отчёты.
- **ADR-4. Виртуальные пути `/{mountId}/rel/path` остаются адресацией.** Проверены практикой v1,
  скрывают реальные корни, нативно ложатся на Flysystem.
- **ADR-5. Имена: строгая проверка, а не молчаливая санитизация.** `mkdir`/`rename` с недопустимым
  именем → ошибка `name_invalid` с деталями (фронтенд валидирует по тем же правилам заранее).
  Исключение — `upload`: имя из ОС пользователя санитизируется (иначе половина загрузок падала бы),
  ответ содержит фактическое имя и флаг `renamed`.
- **ADR-6. Конфликты — параметр `onConflict` (`fail|overwrite|rename|skip`).** По умолчанию `fail`:
  фронтенд показывает диалог и повторяет с выбранной стратегией. Никаких скрытых перезаписей.
- **ADR-7. Пакетные мутации всегда возвращают `OperationReport`.** Частичный успех — HTTP 200 c
  per-item ошибками. Ошибка всей операции (невалидный вход, нет mount) — HTTP-ошибка с конвертом.
- **ADR-8. Кросс-mount перенос поддерживается ядром** (stream-копирование + удаление источника).
  Ограничения конкретного хранилища выражаются через capabilities, а не через запреты в контроллёре.
- **ADR-9. Имя пакета.** Разработка идёт в `filemanager-core2` (`@besnovatyj/filemanager-core2`).
  При замене v1 публикуется как `@besnovatyj/filemanager-core@2.x`; путь `filemanager-core2` временный.
- **ADR-10. Контентная (MIME по magic-bytes) валидация загрузок выключена по умолчанию**, правило
  реализовано и включается конфигом (в v1 давало ложные отказы легитимных изображений).
- **ADR-11. Виртуализация списка — собственная, для ячеек одинакового размера.** У проводника
  все элементы одного вида одинаковы, поэтому задача тривиальна; за интерфейсом `Virtualizer`
  можно подставить `@tanstack/virtual-core`, когда понадобится переменная высота.
- **ADR-12. Символические ссылки в локальном хранилище пропускаются (`SKIP_LINKS`)**, а не
  разыменовываются: ссылка наружу корня — классический вектор обхода.
- **ADR-13. Composition root вместо DI-контейнера на фронтенде.** Явная типизированная сборка в
  `app/createExplorer.ts`; проводка проверяется компилятором, а не в рантайме (см. ARCHITECTURE §2.0).
- **ADR-15. Вкладки не реализуются, но не исключаются.** Состояние «одной вкладки» — это тройка
  `NavigationStore` + `SelectionStore` + `ViewStore.filter`; `SessionStore`, `DirectoryStore`
  (кэш), `ClipboardStore`, `OperationQueue`, `DialogStore` — общие на окно. `CommandContext` отдаёт
  состояние через функции-аксессоры (`currentPath()`, `selectedNodes()`), поэтому для вкладок
  достаточно ввести `TabStore` с активной тройкой и делегировать аксессоры в неё — команды,
  фичи и UI-панели не меняются. Запрещено: ссылаться на `ctx.nav`/`ctx.selection` из новых
  компонентов напрямую там, где можно через аксессоры контекста.
- **ADR-14. Состояние — в сигналах, события — только там, где они события.** Отказ от глобальной
  строковой шины v1 (`fm-events.ts`); межслойная связь идёт через сторы и реестр команд.

## 5. Открытые вопросы

1. ~~Где живёт PHP-виджет v2~~ — решено 2026-09-19: вариант A, `yii2-cms-file-manager` (второй entry рядом с v1).
2. ~~Вкладки~~ — сейчас не нужны, архитектурно оставлены возможными (ADR-15).
3. ~~Транслитерация~~ — решено: опционально, на бэкенде (`params.fs.naming.transliterate`).

## 6. Ближайшие шаги (в порядке выполнения)

1. Фронтенд, в контейнере `node`: `npm install` → `npm run type-check` → `npm test` → `npm run build`;
   открыть `docs/demo.html` (MemoryFsClient) и пройти сценарии Фазы 8 руками. Исправить, что найдётся.
2. Бэкенд: `composer dump-autoload` (новые namespace'ы `Besnovatyj\File\fs`, `Besnovatyj\File\api`),
   `modman recompile`; дать RBAC-права на `/File/backend/api/*`; smoke-тест из Фазы 3 (curl/консоль браузера).
3. Собрать обёртку: `yii2-cms-file-manager` → `npm install && npm run build:local`; проверить страницу «Файлы» и picker в форме.
   Затем собрать `yii2-cms-jodit` (`npm install && npm run build`) и проверить кнопку «Проводник».
4. Предпросмотр, undo, тесты UI (vitest + jsdom), Playwright — Фаза 10.

## 7. Журнал

- 2026-09-19 (7) — Поиск: операция `search` (§9.15) — `fs/operation/{SearchOptions, NameMatcher,
  SearchBudget, Searcher, SearchResult}` (обход `listContents(deep)`, бюджеты `searchMaxResults`/
  `searchMaxEntries`, `truncated`), capability `search` у local/zip/s3; клиент — `SearchStore`,
  `SearchFeature` (Ctrl+F, из корня параллельно по хранилищам, правка результатов по фактам через
  `DirectoryStore.changes`), `domain/search/nameMatcher` (зеркало серверного), поле поиска в
  адресной строке (фильтр + Enter), режим результатов в `FmContentPane`/`FmStatusBar`.

- 2026-09-19 (6) — Миниатюры: операция `thumbnail` (§9.14) — `fs/thumbnail/{ThumbnailConfig,
  ThumbnailGeneratorInterface, ImagineGenerator (Imagick→GD), ThumbnailCache, Thumbnailer}`,
  `ThumbnailOperation` (GET, объявляется только при наличии Imagick/GD), capability `thumbnail`
  у mount'ов через `MountFactory`, `php yii File/thumbnail/purge`; клиент — `FsClient.thumbnailUrl`,
  `SessionStore.thumbnailSizes`, `FmContentPane.thumbnailSrc` (размер под DPR, `v=mtime`, fallback
  на публичный URL и иконку по `error`).

- 2026-09-19 (5) — Предпросмотр: `preview`-операция (inline только растровые, sniff + CSP sandbox),
  `FmPreviewPane`, команда `toggle-preview`, второй разделитель.

- 2026-09-19 (4) — Индикация: плейсхолдер до describe, индикатор запросов в футере (ActivityStore +
  TrackingFsClient, задержка 250 мс), свойства открываются сразу; фикс dblclick (строки обновляются
  на месте, а не пересоздаются при смене выделения).

- 2026-09-19 (3) — Порты Virtualizer/DndAdapter/UploadStrategy, мобильный проход, tus (сервер + клиент),
  фикс порядка запуска (тулбар без кнопок).

- 2026-09-19 (2) — Jodit-плагин `explorer`; область видимости (scope): серверный `PathScope`/`ScopeToken`
  + клиентское ограничение навигации; `JoditWidget::$explorerScoped=true` по умолчанию запирает
  проводник в папке сущности (`fmDefaultPath`).

- 2026-09-19 — Первый запуск: type-check/tests/build прошли после 8 правок типов и 1 теста; в демо
  найдена и исправлена ретаргетизация `e.target` в Shadow DOM (окно/диалог). Транслитерация на бэкенде,
  `ExplorerWidget`/`ExplorerAsset`/`explorer.ts` в `yii2-cms-file-manager`, страница «Файлы» на v2.

- 2026-09-18 — Анализ v1 (frontend/backend/Jodit), план, контракт API v1 (`docs/API-CONTRACT.md`),
  бэкенд `src/fs` (69 файлов) + `src/api` (25 файлов) + `ApiController`/`OperationAction` +
  `config/container.fs.php`, фронтенд (100 файлов TS: shared/domain/api/model/commands/features/ui/
  widgets/app + тесты домена и MemoryFsClient). Не запускалось: в контейнере разработки нет Node и
  PHP-расширений; синтаксис всех PHP-файлов проверен `php -l`, TS — вычиткой. Старый v1 не тронут.
