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
    const packageLock = JSON.parse(readRepoFile('package-lock.json')) as {
      packages?: Record<string, { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }>;
    };
    const lockText = readRepoFile('package-lock.json');
    const envExample = readRepoFile('.env.example');
    const readme = readRepoFile('README.md');
    const productionWorkflow = readRepoFile('.github/workflows/vercel-production.yml');
    const ciPreflight = readRepoFile('scripts/preflight-ci.mjs');

    expect(packageJson.dependencies?.['@clerk/nextjs']).toBeUndefined();
    expect(packageJson.devDependencies?.['@clerk/nextjs']).toBeUndefined();
    expect(packageLock.packages?.['']?.dependencies?.['@clerk/nextjs']).toBeUndefined();
    expect(packageLock.packages?.['']?.devDependencies?.['@clerk/nextjs']).toBeUndefined();
    expect(lockText).not.toContain('node_modules/@clerk/');
    expect(lockText).not.toContain('@clerk/nextjs');
    expect(envExample).toContain('Supabase Auth is the single primary identity provider');
    expect(envExample).not.toMatch(/CLERK_/);
    expect(readme).toContain('Supabase Auth is the single primary authentication stack');
    expect(readme).not.toMatch(/active client authentication hook uses Clerk|Clerk production|Clerk authentication keys/);
    expect(productionWorkflow).not.toMatch(/CLERK_/);
    expect(ciPreflight).not.toMatch(/CLERK_/);
    expect(
      existsSync(join(process.cwd(), '.github/workflows/supabase-clerk-org-migration-validation.yml')),
    ).toBe(false);
  });
});
