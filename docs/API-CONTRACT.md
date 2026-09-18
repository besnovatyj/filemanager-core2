# Контракт API файлового менеджера — `bescms-fs` v1.0

> Канонический документ протокола между фронтендом файлового менеджера и любым бэкендом.
> Не зависит от языка: сегодня бэкенд — PHP/Yii2 (`besnovatyj/yii2-cms-file`), завтра может быть
> Go/Node. Изменение контракта = изменение этого файла + версии + типов в `src/api/contract`.
>
> Термины: **connector** — базовый URL API (например `/File/backend/api`); **operation** — именованная
> команда; **mount** — точка монтирования (корень хранилища); **virtual path** — адрес узла.

## 1. Транспорт

- Каждая операция — `POST {connector}/{operation}` с телом `application/json` (кроме `upload` —
  `multipart/form-data`, и потоковых операций `download`/`thumbnail` — `GET` с query-параметрами).
- Ответ — всегда `application/json` в **конверте** (§2), кроме потоковых операций, которые отдают
  байты файла либо конверт ошибки с соответствующим HTTP-статусом.
- Заголовки, которые фронтенд отправляет всегда: `X-Requested-With: XMLHttpRequest`, а также
  CSRF-заголовок, если интеграция его задала (для Yii — `X-CSRF-Token`).
- Аутентификация — забота хоста (cookie-сессия админки). Протокол её не описывает.
- **Область видимости** (опционально): заголовок `X-Fs-Scope: <token>` (для `GET`-операций —
  query `scope=<token>`). Токен выпускает сервер (подписан, привязан к пользователю, со сроком);
  при его наличии любой путь запроса вне области → `forbidden` (`details.reason: out_of_scope`),
  невалидный токен → `forbidden`. Отсутствие токена = без ограничений (только RBAC хоста).
  `describe.scope` сообщает корень области.
- Кодировка путей и имён — UTF-8. Пути в JSON передаются как есть, в query — `encodeURIComponent`.

## 2. Конверт ответа

```jsonc
// успех
{ "ok": true, "data": { /* зависит от операции */ }, "meta": { "contract": "1.0", "elapsedMs": 12 } }

// ошибка
{ "ok": false, "error": { "code": "not_found", "message": "Объект не найден", "path": "/static/a.txt", "details": { } } }
```

- `meta` — необязательный; `meta.contract` — версия контракта бэкенда (фронтенд предупреждает при
  несовпадении major).
- `error.code` — машинный код (§3), **первичен** для клиента; HTTP-статус — вторичен (для прокси и
  логов). `message` — безопасный текст для пользователя (никаких реальных путей/стеков).
  `details` — структурированные подробности (например, для `name_invalid` — какое правило нарушено).

## 3. Коды ошибок

| code | HTTP | Смысл |
|---|---|---|
| `bad_request` | 400 | тело не JSON / отсутствует обязательное поле / неверный тип |
| `path_invalid` | 400 | путь не прошёл валидацию (traversal, NUL, недопустимые символы, длина) |
| `name_invalid` | 422 | имя не прошло правила `describe.naming`; `details.rule` — имя правила |
| `mount_unknown` | 404 | mount из пути не зарегистрирован |
| `not_found` | 404 | узел не существует |
| `exists` | 409 | целевой узел уже существует (при `onConflict: fail`) |
| `forbidden` | 403 | операция запрещена правами/политикой mount (readOnly) |
| `policy_rejected` | 422 | отклонено политикой (расширение, размер, содержимое); `details.rule` |
| `unsupported` | 501 | операция не поддерживается этим mount/бэкендом (см. capabilities) |
| `too_large` | 413 | превышен лимит размера |
| `invalid_operation` | 400 | логически недопустимо: перенос папки в саму себя, удаление корня mount |
| `conflict` | 409 | состояние изменилось (например, при optimistic-concurrency в будущих версиях) |
| `internal` | 500 | внутренняя ошибка; подробности только в логах сервера |

Те же коды используются в per-item ошибках отчётов (§7).

## 4. Адресация: виртуальные пути

- `/` — виртуальный корень: список mount'ов (узлы `kind: "mount"`).
- `/{mountId}` — корень mount'а. `/{mountId}/a/b.txt` — узел внутри.
- Канонический вид: начинается с `/`, без завершающего `/`, без пустых сегментов, сегменты `.`/`..`
  запрещены, `\` и управляющие символы запрещены. Бэкенд **отклоняет** неканонические пути
  (`path_invalid`), а не нормализует их — нормализация делается на клиенте (`VirtualPath`).
- `mountId` — `[a-z0-9][a-z0-9_-]{0,31}` (lowercase).
- Реальные пути хранилищ **никогда** не появляются ни в путях, ни в сообщениях.

## 5. Модель узла `Node`

```ts
interface Node {
  path: string;                 // канонический виртуальный путь — идентификатор узла
  name: string;                 // последний сегмент; для mount — id mount'а; для '/' — ''
  kind: 'file' | 'dir' | 'mount';
  mount: string | null;         // id mount'а; null только у виртуального корня
  size: number | null;          // байты; null — неизвестно/неприменимо (папки)
  mtime: number | null;         // unix-время (секунды); null — неизвестно
  mime: string | null;          // MIME; в листинге — «дешёвый» (по расширению), точный — в stat
  ext: string | null;           // расширение без точки, lowercase; null — нет
  url: string | null;           // публичный URL файла; null — нет публичной отдачи (см. download)
  visibility: 'public' | 'private' | null;
  perms?: NodePermissions;      // переопределение возможностей для узла (опционально)
  meta?: Record<string, unknown>; // расширение: { image: {width,height}, label, icon, hasChildren, ... }
}

interface NodePermissions {     // отсутствие поля = как у mount
  read?: boolean; write?: boolean; delete?: boolean; rename?: boolean;
}
```

Правило эволюции: новые поля добавляются **опциональными**; удаление/переименование — только с
повышением major версии контракта. Клиент обязан игнорировать неизвестные поля.

## 6. `describe` — самоописание бэкенда

`POST {connector}/describe`, тело `{}`.

```ts
interface DescribeResponse {
  contract: { name: 'bescms-fs'; version: string };       // '1.0'
  server: { name: string; version: string };               // 'yii2-cms-file', '2.0.0'
  operations: Record<string, OperationInfo>;               // только доступные ТЕКУЩЕМУ пользователю
  mounts: MountInfo[];
  defaultMount: string | null;
  naming: NamingRules;
  upload: UploadRules;
  features: FeatureFlags;
  limits: { listPageSize: number; maxBatchItems: number; contentMaxBytes: number; previewMaxBytes?: number };
  scope?: { root: string } | null;                         // область текущего запроса (токен X-Fs-Scope)
}

interface OperationInfo {
  method: 'POST' | 'GET';
  batch?: boolean;   // принимает массив путей
  async?: boolean;   // может вернуть job вместо результата (зарезервировано)
}

interface MountInfo {
  id: string;
  label: string;
  icon?: string;                  // подсказка UI: 'drive' | 'archive' | 'cloud' | произвольно
  root: string;                   // '/{id}'
  readOnly: boolean;
  capabilities: MountCapabilities;
}

interface MountCapabilities {     // что хранилище умеет физически; права пользователя — отдельно
  list: boolean; stat: boolean; content: boolean; download: boolean;
  mkdir: boolean; rename: boolean; move: boolean; copy: boolean; delete: boolean; upload: boolean;
  publicUrl: boolean;             // у файлов есть url
  visibility: boolean;            // поддерживает public/private
  thumbnail: boolean;             // серверные миниатюры (§9.14); true только вместе с download
  search: boolean;                // поиск по именам обходом (§9.15); true только вместе с list
  directories: 'native' | 'emulated'; // S3 эмулирует папки (пустая папка может «исчезнуть»)
}

interface NamingRules {
  maxLength: number;              // байт UTF-8, обычно 255
  forbiddenChars: string[];       // например ["/", "\\", ":", "*", "?", "\"", "<", ">", "|"]
  forbiddenNames: string[];       // ["CON", "PRN", ...] — регистронезависимо, с расширением и без
  allowLeadingDot: boolean;       // скрытые файлы
  allowTrailingDotOrSpace: boolean;
  blockedExtensions: string[];    // проверяются ВСЕ dot-сегменты имени
  unicodeNormalization: 'NFC' | null;
  transliterate?: boolean;        // сервер транслитерирует кириллицу при upload (информационно)
}

interface UploadRules {
  maxFileSize: number | null;     // байт; null — без лимита (кроме серверных ini)
  maxFilesPerRequest: number;     // сегодня 1
  allowedExtensions: string[] | null;
  allowedMime: string[] | null;
  chunked: boolean;               // поддерживается tus (см. §13)
  tus?: { endpoint: string; chunkSize: number; threshold: number } | null;
}

interface FeatureFlags {
  jobs: boolean; thumbnails: boolean; search: boolean; write: boolean; archive: boolean;
}

interface DescribeResponse {       // фрагмент, см. пример в §12
  …
  thumbnails?: { sizes: number[] } | null;   // §9.14; null — операции thumbnail нет
}
```

Права: `operations` содержит только операции, которые текущий пользователь вправе вызвать
(бэкенд проверяет их так же, как при реальном вызове). UI не показывает недоступное.

## 7. Отчёт пакетной операции `OperationReport`

```ts
interface OperationReport {
  operation: 'move' | 'copy' | 'delete' | string;
  total: number; succeeded: number; failed: number; skipped: number;
  items: ItemResult[];
}
interface ItemResult {
  source: string;                 // исходный путь
  target?: string;                // фактический целевой путь (после rename-стратегии)
  status: 'ok' | 'skipped' | 'failed';
  node?: Node;                    // фактическое состояние (для ok)
  error?: { code: string; message: string; details?: Record<string, unknown> };
}
```

## 8. Политика конфликтов

Параметр `onConflict` у `move`, `copy`, `upload`:

| значение | поведение |
|---|---|
| `fail` (по умолчанию) | элемент с существующей целью → `status: failed`, `error.code: exists` |
| `overwrite` | заменить (файл → файл). Папка на месте файла и наоборот → `failed/invalid_operation` |
| `rename` | подобрать уникальное имя `name (2).ext` |
| `skip` | пропустить, `status: skipped` |

Стратегия применяется ко всем элементам запроса; интерактивный «спросить для каждого» реализуется
клиентом (повторный запрос по оставшимся элементам с новой стратегией).

## 9. Операции v1

### 9.1 `list` — содержимое папки

```ts
Request:  { path: string; cursor?: string | null; limit?: number;
            sort?: { by: 'name' | 'size' | 'mtime' | 'ext' | 'kind'; dir: 'asc' | 'desc' };
            filter?: { kinds?: ('file' | 'dir')[]; nameContains?: string; exts?: string[] } }
Response: { node: Node; items: Node[]; nextCursor: string | null; total: number | null }
```

- `path: '/'` → узлы `kind: 'mount'`.
- Пагинация курсорная: бэкенд вправе отдать всё (`nextCursor: null`). Клиент обязан уметь докачивать.
- Сортировка на сервере — опциональна; клиент сортирует сам, если сервер вернул `meta.sorted !== true`.

### 9.2 `tree` — дочерние папки (для дерева навигации)

```ts
Request:  { path: string }
Response: { node: Node; items: Node[] }      // только dir/mount; meta.hasChildren?: boolean|null
```

### 9.3 `stat` — точные метаданные одного узла

```ts
Request:  { path: string }
Response: { node: Node }                      // mime по содержимому, meta.image при изображениях
```

### 9.4 `content` — текстовое содержимое (превью)

```ts
Request:  { path: string; maxBytes?: number }
Response: { node: Node; content: string; encoding: 'utf-8'; truncated: boolean; binary: boolean }
```
Если файл бинарный — `binary: true`, `content: ''`.

### 9.5 `mkdir`

```ts
Request:  { parent: string; name: string }
Response: { node: Node }
```

### 9.6 `rename`

```ts
Request:  { path: string; name: string }
Response: { node: Node }
```
Ошибки: `name_invalid`, `exists`, `not_found`, `policy_rejected` (заблокированное расширение).

### 9.7 `move` / `copy`

```ts
Request:  { sources: string[]; target: string; onConflict?: ConflictStrategy }
Response: { report: OperationReport }
```
- `target` — папка назначения (может быть в другом mount).
- Перенос узла в собственного потомка → `failed/invalid_operation`.
- Перенос в ту же папку без изменения имени → `skipped`.

### 9.8 `delete`

```ts
Request:  { paths: string[] }
Response: { report: OperationReport }
```
Корень mount и `/` удалить нельзя (`invalid_operation`).

### 9.9 `upload` — `multipart/form-data`

Поля: `path` (папка назначения), `file` (один файл), `name?` (желаемое имя; по умолчанию — имя файла),
`onConflict?`.

```ts
Response: { node: Node; renamed: boolean; requestedName: string }
```
Имя санитизируется (ADR-5); при заблокированном расширении — `policy_rejected`, не переименование.
`onConflict: skip` для загрузки эквивалентен `fail` (пропуск — решение клиента: он просто не отправляет файл).

### 9.10 `download` — `GET {connector}/download?path=…`

Отдаёт файл как `Content-Disposition: attachment` + `X-Content-Type-Options: nosniff`.
Ошибки — конверт JSON с HTTP-статусом. Используется для узлов с `url: null` и как безопасное
скачивание вообще.

### 9.11 `describe` — см. §6.

### 9.13 `preview` — `GET {connector}/preview?path=…`

Inline-отдача изображения для панели предпросмотра там, где у файла нет публичного `url`.
Сервер определяет тип по содержимому и отдаёт ТОЛЬКО растровые форматы (jpeg, png, gif, webp,
avif, bmp) с `Content-Disposition: inline`, `X-Content-Type-Options: nosniff` и
`Content-Security-Policy: default-src 'none'; sandbox`; иначе `unsupported`. Размер ограничен
`limits.previewMaxBytes`. Требует capability `download` у хранилища.

### 9.14 `thumbnail` — `GET {connector}/thumbnail?path=…&size=128[&v=…]`

Миниатюра изображения для режимов «плитка»/«крупные значки»: изображение вписано в квадрат
`size`×`size` с сохранением пропорций, EXIF применён (ориентация) и удалён, результат всегда
перекодирован (JPEG, либо PNG для форматов с прозрачностью). Допустимые `size` перечислены в
`describe.thumbnails.sizes` (по возрастанию); иное значение округляется вверх до ближайшего
допустимого (больше максимального — до максимального). Клиент выбирает размер под физический
пиксель ячейки (`css × devicePixelRatio`).

`v` — произвольная версия файла (клиент шлёт `mtime`), сервером игнорируется: она делает URL
уникальным для содержимого, поэтому ответ можно кэшировать долго (`Cache-Control: private,
max-age=86400`). Заголовки безопасности те же, что у `preview` (§9.13): `inline`, `nosniff`, CSP
`sandbox`. Ограничения: `limits.previewMaxBytes` по размеру файла и лимит пикселей исходника на
сервере (`too_large`); не-растровое содержимое — `unsupported`. Требует capability `thumbnail`
у хранилища; операция объявляется в `describe.operations` только если у сервера есть генератор
(Imagick/GD) и функция включена — тогда же `features.thumbnails === true`.

### 9.15 `search` — поиск по именам в поддереве

```ts
Request:  { path: string; query: string; recursive?: boolean; kinds?: ('file'|'dir')[]; limit?: number }
Response: { node: Node; items: Node[]; truncated: boolean; scanned: number }
```
`query` — подстрока имени без учёта регистра либо маска, если содержит `*`/`?` (`*.jpg`,
`img-202?-*`); максимум 200 символов, пустая — `invalid_operation`. `recursive` по умолчанию
`true`. `path: '/'` — поиск по всем хранилищам с capability `search`.

Поиск — честный обход `listContents(deep)` без индекса, поэтому у сервера два бюджета:
`limits.searchMaxResults` (в ответе не больше; `limit` клиента может только уменьшить) и
внутренний максимум просмотренных записей. При исчерпании любого — обход прекращается и
`truncated === true`: клиент обязан показать «показаны первые N», а не выдавать список за
полный. `items` отсортированы: папки выше файлов, затем по полному пути. Поиск по содержимому
файлов контрактом не предусмотрен. Требует capability `search` у хранилища; `features.search`
отражает наличие операции.

### 9.12 `upload-finalize` — завершение tus-загрузки (только при `upload.chunked === true`)

```ts
Request:  { uploadId: string; path: string; name?: string; onConflict?: ConflictStrategy }
Response: { node: Node; renamed: boolean; requestedName: string }   // как у upload
```
Байты уже на сервере (см. §13); операция переносит их в папку с той же семантикой, что `upload`.
При `exists` загрузка сохраняется — клиент повторяет финализацию с другой стратегией без повторной
передачи. Ошибки: `not_found` (нет/чужая/истекшая загрузка), `invalid_operation` (не завершена).

## 10. Зарезервированные операции (имена закреплены, семантика — в будущих версиях)

`write` (`{path, content}`),
(`upload-finalize`, `preview`, `thumbnail` и `search` реализованы — §9.12–§9.15),
`archive` (`{paths, target, format}`), `extract` (`{path, target}`), `visibility` (`{path, visibility}`),
`jobs/status`, `jobs/cancel`, `jobs/list`.

Асинхронный режим: операция с `OperationInfo.async === true` может вернуть вместо результата
`{ job: { id: string; status: 'queued'|'running'; progress?: number } }`. Клиент опрашивает
`jobs/status`. До реализации `features.jobs === false`, и таких ответов не бывает.

## 13. Докачиваемая загрузка (tus)

Если `describe.upload.chunked === true`, `describe.upload.tus` содержит `{ endpoint, chunkSize, threshold }`.
Байты передаются по протоколу **tus 1.0.0** (расширения `creation`, `expiration`, `termination`;
https://tus.io/protocols/resumable-upload) на `endpoint` (POST → `Location`), затем PATCH-кусками
на полученный URL. Все запросы несут заголовки хоста (CSRF, `X-Fs-Scope`). Загрузка принадлежит
пользователю сессии и живёт ограниченное время. Завершённая загрузка становится файлом только
через `upload-finalize` (§9.12). Файлы меньше `threshold` клиент отправляет обычным `upload`.

## 11. Версионирование

- `contract.version` — `major.minor`. Minor — только аддитивные изменения (новые опциональные поля,
  новые операции). Major — несовместимые.
- Фронтенд сверяет major и отказывается работать при несовпадении; при отличии minor — работает,
  игнорируя неизвестное.

## 12. Пример полной сессии

```http
POST /File/backend/api/describe   {}                          → mounts: [static, zip]
POST /File/backend/api/list       {"path":"/"}                → items: [{kind:"mount",path:"/static"},…]
POST /File/backend/api/list       {"path":"/static"}          → items…
POST /File/backend/api/mkdir      {"parent":"/static","name":"docs"}
POST /File/backend/api/upload     multipart(path=/static/docs, file=report.pdf)
POST /File/backend/api/move       {"sources":["/static/docs/report.pdf"],"target":"/zip","onConflict":"rename"}
POST /File/backend/api/delete     {"paths":["/static/docs"]}
GET  /File/backend/api/download?path=%2Fzip%2Freport.pdf
```
