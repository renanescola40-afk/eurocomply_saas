import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const roots = ['src/app', 'src/components', 'src/lib', 'src/server'];
const allowedLegacyFiles = new Set([
  join('src', 'components', 'auth', 'ClerkFloatingControls.tsx'),
  join('src', 'components', 'auth', 'ClerkOrganizationPanel.tsx'),
]);

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const absolutePath = join(directory, entry);
    const relativePath = absolutePath.replace(`${process.cwd()}/`, '');
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) return listSourceFiles(absolutePath);
    if (!/\.(ts|tsx)$/.test(entry)) return [];
    return [relativePath];
  });
}

describe('Supabase auth runtime boundary', () => {
  it('does not import Clerk runtime packages from application code', () => {
    const offenders = roots
      .flatMap((root) => listSourceFiles(join(process.cwd(), root)))
      .filter((relativePath) => !allowedLegacyFiles.has(relativePath))
      .filter((relativePath) => readFileSync(join(process.cwd(), relativePath), 'utf8').includes('@clerk/nextjs'));

    expect(offenders).toEqual([]);
  });
});
