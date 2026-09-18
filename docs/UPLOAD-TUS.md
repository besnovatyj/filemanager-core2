# Докачиваемая загрузка (tus)

Как устроена загрузка больших файлов кусками с докачкой после обрыва, что для этого нужно на
сервере и как это встроено в архитектуру менеджера. Документ для того, кто впервые видит tus.

## 1. Зачем

Обычная загрузка (`upload`, один multipart-запрос) годится для файлов до нескольких мегабайт:
обрыв связи означает начать заново, а лимиты `post_max_size`/`client_max_body_size` ограничивают
размер сверху. Для больших файлов и мобильных сетей нужен протокол, который умеет:

- отправлять файл кусками фиксированного размера (куски меньше лимитов сервера);
- после обрыва спросить сервер «сколько уже получено» и продолжить с этого места;
- пережить перезагрузку вкладки (клиент помнит незавершённые загрузки в localStorage).

Это и есть **tus** — открытый протокол поверх HTTP (https://tus.io, спецификация MIT).

## 2. Как работает протокол (в терминах HTTP)

```
1. POST   /File/backend/tus/create            Upload-Length: 104857600
                                              Upload-Metadata: filename cGhvdG8uanBn,filetype aW1hZ2UvanBlZw==
   ← 201  Location: /File/backend/tus/upload?id=3f2a…   Upload-Expires: <дата>

2. PATCH  /File/backend/tus/upload?id=3f2a…   Upload-Offset: 0
                                              Content-Type: application/offset+octet-stream
                                              <5 МБ байт>
   ← 204  Upload-Offset: 5242880

   … PATCH с Upload-Offset: 5242880, 10485760, … пока offset ≠ длине

3. Обрыв. Клиент: HEAD /File/backend/tus/upload?id=3f2a…
   ← 200  Upload-Offset: 47185920      → продолжаем PATCH с этого смещения

4. Все байты на сервере. Клиент: POST /File/backend/api/upload-finalize
        { "uploadId": "3f2a…", "path": "/static/blog/12", "onConflict": "fail" }
   ← { ok: true, data: { node, renamed, requestedName } }   — как у обычного upload
```

Ключевое разделение: **tus доставляет байты во временный каталог, а файлом в хранилище они
становятся только через `upload-finalize`** — операцию нашего контракта, которая делает то же,
что `upload`: санитизирует имя, применяет политику (блок-лист расширений, размер, содержимое),
разрешает конфликт по `onConflict`, отдаёт `Node`. Поэтому:

- у tus-загрузок нет «второго» пути в хранилище в обход политики;
- при конфликте имён (`exists`) байты остаются на сервере, и клиент повторяет только финализацию
  с новой стратегией — без повторной передачи;
- заголовки хоста (CSRF, `X-Fs-Scope`) отправляются со всеми tus-запросами: те же права и та же
  область видимости, что у остального API.

## 3. Сервер (yii2-cms-file)

Реализация собственная, без внешних PHP-библиотек: протокол умещается в один класс, а нам важны
привязка загрузки к пользователю, лимиты из нашей политики и хранение вне `@static`.

| Часть | Где | Роль |
|---|---|---|
| `TusConfig` | `src/fs/tus/` | настройки из `params.fs.tus` (каталог, кусок, порог, TTL, endpoint) |
| `TusUpload` | `src/fs/tus/` | запись о загрузке: владелец, длина, смещение, метаданные, срок |
| `TusStoreInterface` / `FileTusStore` | `src/fs/tus/` | хранилище: `{dir}/{id}.json` + `{dir}/{id}.bin`, дописывание под `flock`, атомарная запись метаданных |
| `TusServer` | `src/fs/tus/` | протокол: create / head / patch / terminate / options, проверка владельца и срока, `purgeExpired()` |
| `TusController` | `src/controllers/backend/` | HTTP-адаптер: `tus/create` (POST) и `tus/upload?id=` (HEAD/PATCH/DELETE/OPTIONS); тело PATCH читается потоком из `php://input` |
| `UploadFinalizeOperation` | `src/api/operations/` | операция контракта `upload-finalize` |
| `commands/TusController::actionPurge` | `src/commands/` | `php yii File/tus/purge` — удаление просроченных загрузок |

Поведение сервера, важное для безопасности:

- загрузка принадлежит пользователю сессии; чужая — 404 (существование не раскрывается);
- `Upload-Length` не может превышать лимит `MaxFileSizeRule`; тело PATCH не может превышать
  `chunkSize`; данные сверх заявленной длины → 413;
- id загрузки — 32 hex-символа, любая другая строка отклоняется до обращения к диску;
- временный каталог (`@runtime/fs-tus` по умолчанию) недоступен веб-серверу и не входит ни в один mount;
- незавершённые загрузки живут `ttl` секунд, затем удаляются командой purge.

### Настройки (`modules.File.params.fs.tus`)

```php
'tus' => [
    'enabled'   => true,
    'dir'       => '@runtime/fs-tus',   // временные файлы кусков
    'chunkSize' => 5 * 1024 * 1024,     // байт; клиент шлёт куски такого размера
    'threshold' => 8 * 1024 * 1024,     // файлы меньше — обычным multipart
    'ttl'       => 86400,               // секунд жизни незавершённой загрузки
],
```

### Требования к окружению

| Что | Значение | Почему |
|---|---|---|
| nginx `client_max_body_size` | ≥ `chunkSize` (5 МБ по умолчанию) | иначе nginx отвергнет PATCH с 413 до PHP |
| PHP `post_max_size` | ≥ `chunkSize` | ограничивает тело запроса |
| PHP `max_execution_time` | штатный | один кусок обрабатывается за секунды |
| cron | `php yii File/tus/purge` раз в час | иначе брошенные загрузки копят место |
| RBAC | `/File/backend/tus/create`, `/File/backend/tus/upload`, `/File/backend/api/upload-finalize` | каждая точка — отдельный маршрут |

Отдельный сервис (например, `tusd`) **не нужен**: всё идёт через PHP-FPM, как остальное API.

## 4. Клиент (filemanager-core2)

- `api/upload/UploadStrategy.ts` — порт: `canHandle(file, describe)` и `upload(request, options)`.
- `api/upload/XhrUploadStrategy.ts` — один multipart-запрос через `FsClient.upload`.
- `api/upload/TusUploadStrategy.ts` — `tus-js-client` (MIT) + `FsClient.uploadFinalize`. Применяется,
  если `describe.upload.chunked === true` и файл не меньше `describe.upload.tus.threshold`.
  Завершённые загрузки запоминаются по объекту `File`, чтобы повтор после конфликта не гонял байты.
  Fingerprint в localStorage позволяет продолжить после перезагрузки страницы.
- `UploadFeature` выбирает первую подходящую стратегию из `ctx.uploadStrategies` (порядок = приоритет,
  tus раньше XHR). Прогресс, отмена (`abort(true)` = DELETE незавершённой загрузки) и диалог
  конфликтов — общие для обеих стратегий.

Свои стратегии подставляются через `ExplorerConfig.adapters.uploadStrategies(client)`.

## 5. Uppy: почему не используется

Uppy (тоже MIT, от Transloadit) — это ядро + готовый интерфейс загрузчика (Dashboard) + плагины
источников (камера, Google Drive и т. п.). Его плагин `@uppy/tus` внутри использует тот же
`tus-js-client`. У проводника собственный интерфейс загрузки (очередь операций, диалоги конфликтов),
поэтому Dashboard был бы вторым интерфейсом для той же задачи. Если однажды понадобятся
удалённые источники (Google Drive, Dropbox), это делается как ещё одна `UploadStrategy` поверх
Uppy Companion (self-hosted, MIT); лицензионных ограничений на распространение ни у одной из
частей нет.

## 6. Диагностика

| Симптом | Причина | Что проверить |
|---|---|---|
| 413 на PATCH, в логе PHP пусто | nginx отверг тело | `client_max_body_size` |
| 404 на всех tus-запросах | `params.fs.tus.enabled = false` или нет прав RBAC | describe: `upload.chunked` |
| 400 «Требуется Upload-Offset» | прокси срезал заголовки `Upload-*` | конфиг прокси |
| 409 на PATCH | клиент прислал смещение, не совпадающее с серверным | клиент сам делает HEAD и повторяет |
| файл загружен, но в папке не появился | ошибка `upload-finalize` (политика, конфликт) | панель операций: статус задачи |
| растёт `runtime/fs-tus` | не настроен purge | cron |
