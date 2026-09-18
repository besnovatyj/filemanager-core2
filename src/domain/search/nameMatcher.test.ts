import {describe, expect, it} from 'vitest';
import {createNameMatcher} from './nameMatcher';

describe('createNameMatcher', () => {
  it('подстрока без учёта регистра и с Unicode', () => {
    const m = createNameMatcher('Отчёт');
    expect(m.isGlob).toBe(false);
    expect(m.matches('годовой отчёт.docx')).toBe(true);
    expect(m.matches('ОТЧЁТ')).toBe(true);
    expect(m.matches('report')).toBe(false);
  });

  it('маска * и ? как в проводнике', () => {
    const m = createNameMatcher('*.JPG');
    expect(m.isGlob).toBe(true);
    expect(m.matches('photo.jpg')).toBe(true);
    expect(m.matches('photo.jpg.bak')).toBe(false);
    expect(createNameMatcher('img-202?-*').matches('img-2026-01.png')).toBe(true);
  });

  it('метасимволы регулярных выражений в запросе экранируются', () => {
    expect(createNameMatcher('a.b').matches('axb')).toBe(false);
    expect(createNameMatcher('(1)*').matches('(1)copy.txt')).toBe(true);
    expect(createNameMatcher('[x]').matches('[x]')).toBe(true);
  });
});
