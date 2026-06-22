import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(resolve(repoRoot, 'src/server/queries/current-organization.ts'), 'utf8');

describe('organization source integrity', () => {
  it('keeps one memberships query export', () => {
    const exports = source.match(/export async function getUserOrganizationMemberships/g) ?? [];

    expect(exports).toHaveLength(1);
  });
});
