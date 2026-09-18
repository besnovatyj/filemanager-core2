/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

/**
 * Публичный API пакета @besnovatyj/filemanager-core2.
 *
 * Хостам (Jodit-плагин, standalone-виджет) нужна фабрика {@link createExplorer} и типы конфига;
 * тестам и демо — {@link MemoryFsClient}; расширениям — контракт и модель узла.
 */

export {createExplorer} from '@/app/createExplorer';
export {Explorer} from '@/app/Explorer';
export type {ExplorerConfig, ExplorerMode} from '@/app/ExplorerConfig';

export type {Node, NodeKind, NodeMeta, NodePermissions} from '@/domain/node/Node';
export {isImage, isFile, isContainer, displayName} from '@/domain/node/Node';
export {VirtualPath, PathError} from '@/domain/path/VirtualPath';

export type {FsClient} from '@/api/client/FsClient';
export {HttpFsClient} from '@/api/client/HttpFsClient';
export {MemoryFsClient, type MemoryFsClientOptions, type MemoryMountSpec} from '@/api/client/MemoryFsClient';
export {HttpTransport, type HttpTransportConfig} from '@/api/transport/HttpTransport';
export {ApiError} from '@/api/codec/ApiError';
export type * from '@/api/contract';

export {setDictionary, t, type Dictionary} from '@/shared/i18n/i18n';

// Порты для замены встроенных реализаций (см. ExplorerConfig.adapters).
export type {DndAdapter, DragPayload, DropContext, DropTargetSpec, DragSourceSpec} from '@/ui/ports/DndAdapter';
export {Html5DndAdapter} from '@/ui/ports/DndAdapter';
export type {Virtualizer, LayoutMode, CellRect, VisibleRange} from '@/ui/ports/Virtualizer';
export {UniformGridVirtualizer} from '@/ui/ports/Virtualizer';
export type {UploadStrategy} from '@/api/upload/UploadStrategy';
export {XhrUploadStrategy} from '@/api/upload/XhrUploadStrategy';
export {TusUploadStrategy} from '@/api/upload/TusUploadStrategy';
