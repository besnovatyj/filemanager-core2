/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {svg} from '@/shared/dom/html';

/**
 * Набор иконок интерфейса — простые контурные SVG 24×24 (стиль Fluent/Lucide), рисуются
 * `currentColor`, поэтому наследуют цвет текста и работают в обеих темах. Иконки типов файлов
 * рисует отдельный компонент {@link fileIcon} (форма документа + расширение).
 *
 * Строки — доверенный код, не данные; в DOM попадают через {@link svg}.
 */
const ICONS: Record<string, string> = {
  'arrow-left': '<path d="M15 6l-6 6 6 6"/>',
  'arrow-right': '<path d="M9 6l6 6-6 6"/>',
  'arrow-up': '<path d="M12 19V5M5 12l7-7 7 7"/>',
  'refresh': '<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/>',
  'folder': '<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  'folder-open': '<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v2H6l-3 8z"/><path d="M3 18l3-8h16l-3 8z"/>',
  'folder-plus': '<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 10v6M9 13h6"/>',
  'file': '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
  'drive': '<rect x="3" y="8" width="18" height="10" rx="2"/><path d="M7 13h.01M11 13h6"/>',
  'archive': '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M10 12h4"/>',
  'extract': '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8"/><path d="M12 11v6M9 14l3 3 3-3"/>',
  'cloud': '<path d="M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z"/>',
  'computer': '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  'upload': '<path d="M12 16V4M6 10l6-6 6 6"/><path d="M4 20h16"/>',
  'download': '<path d="M12 4v12M6 10l6 6 6-6"/><path d="M4 20h16"/>',
  'rename': '<path d="M4 20h4l10-10-4-4L4 16z"/><path d="M12 8l4 4"/>',
  'trash': '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  'copy': '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  'cut': '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.5 7.5L20 19M8.5 16.5L20 5"/>',
  'paste': '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 11h6M9 15h6"/>',
  'check': '<path d="M5 12l5 5L20 7"/>',
  'close': '<path d="M6 6l12 12M18 6L6 18"/>',
  'info': '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  'open': '<path d="M14 4h6v6M20 4l-9 9"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
  'view-details': '<path d="M4 6h16M4 12h16M4 18h16"/>',
  'view-list': '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  'view-tiles': '<rect x="3" y="4" width="8" height="7" rx="1"/><rect x="13" y="4" width="8" height="7" rx="1"/><rect x="3" y="13" width="8" height="7" rx="1"/><rect x="13" y="13" width="8" height="7" rx="1"/>',
  'view-icons': '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  'sidebar': '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
  'panel-right': '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>',
  'file-text': '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  'tasks': '<path d="M4 6h10M4 12h16M4 18h7"/><path d="M17 5l2 2 3-3"/>',
  'chevron-right': '<path d="M9 6l6 6-6 6"/>',
  'chevron-down': '<path d="M6 9l6 6 6-6"/>',
  'search': '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  'sort-asc': '<path d="M12 6v12M8 10l4-4 4 4"/>',
  'sort-desc': '<path d="M12 6v12M8 14l4 4 4-4"/>',
  'more': '<circle cx="6" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/>',
  'error': '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>',
  'warning': '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
  'image': '<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M20 16l-5-5-7 8"/>',
  'cancel': '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
  'lock': '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
};

/** SVG-элемент иконки по имени; неизвестное имя → пустой квадрат (видно при разработке). */
export function icon(name: string, className = 'fm-icon'): SVGElement {
  const body = ICONS[name] ?? '<rect x="4" y="4" width="16" height="16" rx="2" stroke-dasharray="2 2"/>';
  return svg(`<svg viewBox="0 0 24 24">${body}</svg>`, className);
}

export function hasIcon(name: string): boolean {
  return name in ICONS;
}

/**
 * Иконка типа файла: документ с «загнутым уголком» и подписью расширения (как у проводника для
 * неизвестных типов). Один универсальный рисунок вместо десятков картинок: масштабируется, тем
 * не мешает. Изображения панель содержимого при желании заменит превью.
 */
export function fileIcon(ext: string | null, size = 16): SVGElement {
  const label = (ext ?? '').slice(0, 4).toUpperCase();
  const fontSize = label.length > 3 ? 5.5 : 7;
  const el = svg(
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}">
      <path d="M6 2h8l5 5v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" fill="var(--fm-file)"/>
      <path d="M14 2v5h5" fill="rgba(255,255,255,0.45)"/>
      ${label ? `<text x="12" y="17.5" text-anchor="middle" font-family="var(--fm-font)" font-weight="700" font-size="${fontSize}" fill="var(--fm-file-fg)">${escapeText(label)}</text>` : ''}
    </svg>`,
    'fm-file-icon',
  );
  return el;
}

/** Иконка папки (закрашенная) — заметнее контурной в списке. */
export function folderIcon(size = 16, open = false): SVGElement {
  return svg(
    open
      ? `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v2H5z" fill="var(--fm-folder-dark)"/><path d="M2.5 10h19l-2 9a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1z" fill="var(--fm-folder)"/></svg>`
      : `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H3z" fill="var(--fm-folder-dark)"/><path d="M3 9h18v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="var(--fm-folder)"/></svg>`,
    'fm-file-icon',
  );
}

function escapeText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
