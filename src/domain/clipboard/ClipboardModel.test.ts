/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {describe, expect, it} from 'vitest';
import {afterPaste, canPasteInto, copy, cut, EMPTY_CLIPBOARD, isCut, withoutPaths} from './ClipboardModel';

describe('ClipboardModel', () => {
  it('copy/cut и пометка вырезанных', () => {
    const c = cut(['/s/a', '/s/b']);
    expect(isCut(c, '/s/a')).toBe(true);
    expect(isCut(copy(['/s/a']), '/s/a')).toBe(false);
    expect(cut([])).toBe(EMPTY_CLIPBOARD);
  });

  it('afterPaste очищает только вырезанное', () => {
    expect(afterPaste(cut(['/s/a']))).toBe(EMPTY_CLIPBOARD);
    expect(afterPaste(copy(['/s/a'])).mode).toBe('copy');
  });

  it('canPasteInto запрещает вставку в себя, в потомка и вырезанное в ту же папку', () => {
    const c = cut(['/s/dir']);
    expect(canPasteInto(c, '/s/dir')).toBe(false);
    expect(canPasteInto(c, '/s/dir/sub')).toBe(false);
    expect(canPasteInto(c, '/s')).toBe(false);
    expect(canPasteInto(c, '/zip')).toBe(true);
    expect(canPasteInto(copy(['/s/dir']), '/s')).toBe(true);
    expect(canPasteInto(EMPTY_CLIPBOARD, '/s')).toBe(false);
  });

  it('withoutPaths убирает удалённые и их потомков', () => {
    const c = copy(['/s/a', '/s/dir', '/s/dir/x']);
    expect(withoutPaths(c, ['/s/dir']).paths).toEqual(['/s/a']);
  });
});
