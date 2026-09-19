/**
 * Публичный API пакета @besnovatyj/filemanager-core2.
 *
 * Хостам (Jodit-плагин, standalone-виджет) нужна фабрика {@link createExplorer} и типы конфига;
 * тестам и демо — {@link MemoryFsClient}; расширениям — контракт и модель узла.
 */
export { createExplorer } from './app/createExplorer.d.ts';
export { Explorer } from './app/Explorer.d.ts';
export type { ExplorerConfig, ExplorerMode } from './app/ExplorerConfig.d.ts';
export type { Node, NodeKind, NodeMeta, NodePermissions } from './domain/node/Node.d.ts';
export { isImage, isFile, isContainer, displayName } from './domain/node/Node.d.ts';
export { VirtualPath, PathError } from './domain/path/VirtualPath.d.ts';
export type { FsClient } from './api/client/FsClient.d.ts';
export { HttpFsClient } from './api/client/HttpFsClient.d.ts';
export { MemoryFsClient, type MemoryFsClientOptions, type MemoryMountSpec } from './api/client/MemoryFsClient.d.ts';
export { HttpTransport, type HttpTransportConfig } from './api/transport/HttpTransport.d.ts';
export { ApiError } from './api/codec/ApiError.d.ts';
export type * from './api/contract/index.d.ts';
export { setDictionary, t, type Dictionary } from './shared/i18n/i18n.d.ts';
export type { DndAdapter, DragPayload, DropContext, DropTargetSpec, DragSourceSpec } from './ui/ports/DndAdapter.d.ts';
export { Html5DndAdapter } from './ui/ports/DndAdapter.d.ts';
export type { Virtualizer, LayoutMode, CellRect, VisibleRange } from './ui/ports/Virtualizer.d.ts';
export { UniformGridVirtualizer } from './ui/ports/Virtualizer.d.ts';
export type { UploadStrategy } from './api/upload/UploadStrategy.d.ts';
export { XhrUploadStrategy } from './api/upload/XhrUploadStrategy.d.ts';
export { TusUploadStrategy } from './api/upload/TusUploadStrategy.d.ts';
//# sourceMappingURL=index.d.ts.map