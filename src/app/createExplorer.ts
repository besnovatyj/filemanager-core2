/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {computed} from '@/shared/reactive/signal';
import {DisposableStore} from '@/shared/lib/Disposable';
import {setDictionary} from '@/shared/i18n/i18n';
import type {Node} from '@/domain/node/Node';
import type {Capabilities} from '@/domain/capabilities/Capabilities';
import {OperationQueue} from '@/domain/operations/OperationQueue';
import type {FsClient} from '@/api/client/FsClient';
import {HttpFsClient} from '@/api/client/HttpFsClient';
import {HttpTransport} from '@/api/transport/HttpTransport';
import {SessionStore, NavigationStore, DirectoryStore, SelectionStore, ClipboardStore, ViewStore, DialogStore, ViewportStore, ActivityStore, SearchStore} from '@/model';
import {TrackingFsClient} from '@/api/client/TrackingFsClient';
import {XhrUploadStrategy} from '@/api/upload/XhrUploadStrategy';
import {TusUploadStrategy} from '@/api/upload/TusUploadStrategy';
import type {UploadStrategy} from '@/api/upload/UploadStrategy';
import {Html5DndAdapter} from '@/ui/ports/DndAdapter';
import {UniformGridVirtualizer} from '@/ui/ports/Virtualizer';
import type {CommandContext} from '@/commands/CommandContext';
import {CommandRegistry} from '@/commands/CommandRegistry';
import {Keymap} from '@/commands/Keymap';
import {
  NavigationFeature, SelectionFeature, CreateFolderFeature, RenameFeature, DeleteFeature, TransferFeature,
  ClipboardFeature, UploadFeature, DownloadFeature, PropertiesFeature, ViewFeature, PickFeature, SearchFeature, ArchiveFeature, type Feature,
} from '@/features';
import {FmMenu, type MenuEntry} from '@/ui/primitives/FmMenu';
import {DialogHost} from '@/ui/explorer/dialogs/DialogHost';
import {entriesFromIds, type ExplorerDeps} from '@/ui/explorer/deps';
import {FmWindow} from '@/ui/explorer/FmWindow';
import {FmExplorer} from '@/widgets/FmExplorer';
import {resolveConfig, type ExplorerConfig} from './ExplorerConfig';
import {Explorer} from './Explorer';

/**
 * Composition root (ADR-13): единственное место, где создаются и связываются все части
 * приложения. Никакого контейнера с токенами — явная типизированная сборка читается как
 * оглавление архитектуры и проверяется компилятором.
 *
 * Порядок: клиент → сторы → контекст команд → реестр команд + фичи → UI-зависимости →
 * объект {@link Explorer}, которым управляет хост.
 */
export function createExplorer(config: ExplorerConfig): Explorer {
  if (config.dictionary) setDictionary(config.dictionary);
  const resolved = resolveConfig(config);

  // ---- клиент (обёрнут трекером: все запросы видны в строке состояния)
  const activity = new ActivityStore();
  const rawClient: FsClient = config.client ?? new HttpFsClient(new HttpTransport({
    baseUrl: requireConnector(config),
    ...(config.headers ? {headers: config.headers} : {}),
    ...(config.timeoutMs !== undefined ? {timeoutMs: config.timeoutMs} : {}),
    ...(config.scope?.token ? {scopeToken: config.scope.token} : {}),
  }));
  const client: FsClient = new TrackingFsClient(rawClient, activity);

  // ---- сторы
  const session = new SessionStore(client);
  const nav = new NavigationStore(resolved.startPath, resolved.rootPath);
  const dirs = new DirectoryStore(client);
  const selection = new SelectionStore();
  const clipboard = new ClipboardStore();
  const view = new ViewStore(resolved.storageKey);
  const queue = new OperationQueue({uploadConcurrency: resolved.uploadConcurrency});
  const dialogs = new DialogStore();
  const viewport = new ViewportStore();
  const search = new SearchStore();

  // ---- стратегии загрузки: tus (большие файлы, докачка) раньше multipart; порядок = приоритет.
  const scopeHeaders = (): Record<string, string> => ({
    'X-Requested-With': 'XMLHttpRequest',
    ...(config.headers ?? {}),
    ...(config.scope?.token ? {'X-Fs-Scope': config.scope.token} : {}),
  });
  const uploadStrategies: readonly UploadStrategy[] = config.adapters?.uploadStrategies?.(client)
    ?? [new TusUploadStrategy(client, scopeHeaders, () => session.describe.peek()), new XhrUploadStrategy(client)];

  // ---- контекст команд (реактивные аксессоры)
  const currentDir = computed<Node | null>(() => dirs.directory(nav.current.value).value.node);
  const capabilities = computed<Capabilities>(() => session.capabilities.value);
  const ctx: CommandContext = {
    config: resolved, client, session, nav, dirs, selection, clipboard, view, queue, dialogs, viewport, activity, search, uploadStrategies,
    currentPath: () => nav.current.value,
    currentDir: () => currentDir.value,
    selectedNodes: () => selection.selectedNodes.value,
    capabilities: () => capabilities.value,
  };

  // ---- команды и фичи
  const commands = new CommandRegistry(ctx);
  const disposables = new DisposableStore();
  let closeHandler: () => void = () => undefined;

  const navigation = new NavigationFeature();
  const rename = new RenameFeature();
  const transfer = new TransferFeature();
  const upload = new UploadFeature();
  const del = new DeleteFeature();
  const searchFeature = new SearchFeature();
  const archiveFeature = new ArchiveFeature();
  const features: Feature[] = [
    navigation, new SelectionFeature(), new CreateFolderFeature(), rename, del, transfer,
    new ClipboardFeature(transfer), upload, new DownloadFeature(), new PropertiesFeature(), new ViewFeature(),
    new PickFeature(() => closeHandler()), searchFeature, archiveFeature,
  ];
  disposables.add(() => features.forEach((f) => f.dispose()));

  // ---- UI-зависимости
  const menu = new FmMenu();
  menu.hidden = true;
  const themeOf = (): string | null => element.dataset.theme ?? null;
  const deps: ExplorerDeps = {
    ctx, commands, menu,
    dnd: config.adapters?.dnd ?? new Html5DndAdapter(),
    createVirtualizer: config.adapters?.virtualizer ?? (() => new UniformGridVirtualizer()),
    features: {navigation, rename, upload, transfer, delete: del, search: searchFeature, archive: archiveFeature},
    openMenu: (ids, at, extra: MenuEntry[] = []) => {
      const theme = themeOf();
      if (theme) menu.dataset.theme = theme;
      else delete menu.dataset.theme;
      if (!menu.isConnected) document.body.appendChild(menu);
      menu.open([...entriesFromIds(commands, ids), ...extra], at);
    },
  };
  const element = new FmExplorer();
  element.bind(deps);
  const keymap = new Keymap(commands);
  const dialogHost = new DialogHost(dialogs, themeOf);

  const explorer = new Explorer({
    element, ctx, commands, view, dialogs, queue, menu, dialogHost, keymap,
    start: async () => {
      // describe до инициализации фич: NavigationFeature сразу грузит стартовую папку.
      await session.load();
      for (const f of features) f.init(ctx, commands);
      keymap.attach(element);
      dialogHost.attach();
    },
    createWindow: () => {
      const win = new FmWindow();
      win.setAttribute('title', resolved.title);
      const theme = themeOf();
      if (theme) win.dataset.theme = theme;
      win.onResize = (size) => view.windowSize.set(size);
      return win;
    },
    onClose: () => resolved.onClose?.(),
    dispose: () => {
      disposables.dispose();
      viewport.dispose();
    },
  });
  closeHandler = () => explorer.close();
  return explorer;
}

function requireConnector(config: ExplorerConfig): string {
  if (!config.connector) {
    throw new Error('[filemanager] нужен либо connector (URL API), либо готовый client');
  }
  return config.connector;
}
