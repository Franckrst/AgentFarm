import { describe, it, expect } from 'vitest';
import { slugify } from '../../utils/git.js';

describe('git utilities', () => {
  describe('slugify', () => {
    it('converts to lowercase', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('replaces spaces with hyphens', () => {
      expect(slugify('foo bar baz')).toBe('foo-bar-baz');
    });

    it('removes special characters', () => {
      expect(slugify('foo@bar#baz!')).toBe('foobarbaz');
    });

    it('truncates to max length', () => {
      const long = 'a'.repeat(50);
      expect(slugify(long, 40)).toBe('a'.repeat(40));
    });
  });
});
