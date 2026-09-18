/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

// Единственное место, где описан wire-формат bescms-fs v1 на стороне клиента.
// Канон — docs/API-CONTRACT.md; при изменении контракта меняются эти файлы и CONTRACT_VERSION.

export * from './errors';
export * from './envelope';
export * from './describe';
export * from './report';
export * from './operations';
