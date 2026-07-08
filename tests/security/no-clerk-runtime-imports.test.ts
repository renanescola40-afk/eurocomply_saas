import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const roots = ['src/app', 'src/components', 'src/lib', 'src/server'];

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

function listSourceFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];

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
  it('does not import a competing identity runtime from application code', () => {
    const offenders = roots
      .flatMap((root) => listSourceFiles(join(process.cwd(), root)))
      .filter((relativePath) => {
        const source = readFileSync(join(process.cwd(), relativePath), 'utf8');
        return source.includes('@clerk/nextjs') || source.includes('@/server/clerk') || source.includes('server/clerk');
      });

    expect(offenders).toEqual([]);
  });

  it('keeps runtime manifests and operator docs aligned to Supabase Auth', () => {
    const packageJson = JSON.parse(readRepoFile('package.json')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const envExample = readRepoFile('.env.example');
    const readme = readRepoFile('README.md');

    expect(packageJson.dependencies?.['@clerk/nextjs']).toBeUndefined();
    expect(packageJson.devDependencies?.['@clerk/nextjs']).toBeUndefined();
    expect(envExample).toContain('Supabase Auth is the single primary identity provider');
    expect(envExample).not.toMatch(/CLERK_/);
    expect(readme).toContain('Supabase Auth is the single primary authentication stack');
    expect(readme).not.toMatch(/active client authentication hook uses Clerk|Clerk production|Clerk authentication keys/);
  });
});
