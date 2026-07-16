import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('open proxy / SSRF gate parsing', () => {
  it('strips comments before evaluating security controls', () => {
    const source = read('scripts/security/check-no-open-proxy.mjs');

    expect(source).toContain('function stripComments(source)');
    expect(source).toContain("state === 'line-comment'");
    expect(source).toContain("state === 'block-comment'");
    expect(source).toContain("const source = stripComments(readFileSync(file.absolute, 'utf8'))");
    expect(source).not.toContain("const source = readFileSync(file.absolute, 'utf8');");
  });

  it('recognizes common direct fetch spellings instead of only the exact fetch( token', () => {
    const source = read('scripts/security/check-no-open-proxy.mjs');

    expect(source).toContain('const SERVER_FETCH_PATTERN =');
    expect(source).toContain('globalThis');
    expect(source).toContain('\\s*\\(');
    expect(source).toContain('SERVER_FETCH_PATTERN.test(source)');
    expect(source).not.toContain("const doesServerFetch = source.includes('fetch(')");
  });

  it('preserves quoted and template-literal content while stripping comments', () => {
    const source = read('scripts/security/check-no-open-proxy.mjs');

    expect(source).toContain("state === 'single-quote'");
    expect(source).toContain("state === 'double-quote'");
    expect(source).toContain("state === 'template'");
    expect(source).toContain("if (char === '\\\\')");
  });
});
