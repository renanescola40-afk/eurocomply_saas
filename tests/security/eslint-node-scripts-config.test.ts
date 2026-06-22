import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const configSource = readFileSync(resolve(repoRoot, 'eslint.config.mjs'), 'utf8');

describe('ESLint Node script configuration', () => {
  it('scopes Node environment support to repository scripts and config files', () => {
    expect(configSource).toContain('files: ["scripts/**/*.{js,mjs,cjs}", "*.config.{js,mjs,cjs}", "eslint.config.mjs"]');
    expect(configSource).toContain('...compat.env({ node: true })[0]');
  });
});
