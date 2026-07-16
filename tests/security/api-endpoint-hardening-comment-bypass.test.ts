import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('API endpoint hardening comment handling', () => {
  it('removes line and block comments before evaluating security-control tokens', () => {
    const source = read('scripts/security/check-api-endpoint-hardening.mjs');

    expect(source).toContain('function stripComments(source)');
    expect(source).toContain("state === 'line-comment'");
    expect(source).toContain("state === 'block-comment'");
    expect(source).toContain("const source = stripComments(readFileSync(route, 'utf8'))");
    expect(source).not.toContain("const source = readFileSync(route, 'utf8');\n  const methods");
  });

  it('preserves quoted and template-literal content while stripping comments', () => {
    const source = read('scripts/security/check-api-endpoint-hardening.mjs');

    expect(source).toContain("state === 'single-quote'");
    expect(source).toContain("state === 'double-quote'");
    expect(source).toContain("state === 'template'");
    expect(source).toContain("if (char === '\\\\')");
  });
});
