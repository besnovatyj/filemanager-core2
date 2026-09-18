/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {describe, expect, it} from 'vitest';
import {NameValidator} from './NameValidator';
import {allExtensions, splitName} from './nameParts';
import {uniqueName} from './uniqueName';

describe('NameValidator', () => {
  const v = new NameValidator();

  it('принимает обычные имена', () => {
    expect(v.validate('report.pdf')).toBeNull();
    expect(v.validate('Отчёт 2026 (финал).docx')).toBeNull();
  });

  it('находит нарушения с правильным rule', () => {
    expect(v.validate('')?.rule).toBe('empty');
    expect(v.validate('..')?.rule).toBe('dot_name');
    expect(v.validate('a/b')?.rule).toBe('separator');
    expect(v.validate('a:b')?.rule).toBe('forbidden_char');
    expect(v.validate('name.')?.rule).toBe('trailing_dot_or_space');
    expect(v.validate(' name')?.rule).toBe('leading_space');
    expect(v.validate('.env')?.rule).toBe('leading_dot');
    expect(v.validate('con.txt')?.rule).toBe('reserved_name');
    expect(v.validate('shell.php.jpg')?.rule).toBe('blocked_extension');
    expect(v.validate('a‮b')?.rule).toBe('control_chars');
    expect(v.validate('x'.repeat(256))?.rule).toBe('max_length');
  });
});

describe('nameParts', () => {
  it('splitName', () => {
    expect(splitName('a.tar.gz')).toEqual({stem: 'a.tar', ext: 'gz'});
    expect(splitName('.env')).toEqual({stem: '.env', ext: null});
    expect(splitName('README')).toEqual({stem: 'README', ext: null});
    expect(splitName('x.')).toEqual({stem: 'x.', ext: null});
  });
  it('allExtensions', () => {
    expect(allExtensions('shell.PHP.jpg')).toEqual(['php', 'jpg']);
    expect(allExtensions('.htaccess')).toEqual([]);
  });
});

describe('uniqueName', () => {
  it('добавляет и увеличивает счётчик', () => {
    const taken = new Set(['a.txt', 'a (2).txt']);
    expect(uniqueName('a.txt', (n) => taken.has(n))).toBe('a (3).txt');
    expect(uniqueName('a (2).txt', (n) => taken.has(n))).toBe('a (3).txt');
    expect(uniqueName('b.txt', (n) => taken.has(n))).toBe('b.txt');
  });
});
