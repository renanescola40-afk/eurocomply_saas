import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { afterEach, describe, expect, it } from 'vitest';

const CHECKER = fileURLToPath(
  new URL('../../scripts/security/check-client-boundaries.mjs', import.meta.url),
);
const temporaryRoots: string[] = [];

function runChecker(source: string) {
  const root = mkdtempSync(join(tmpdir(), 'risck-client-boundary-'));
  temporaryRoots.push(root);
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(join(root, 'src', 'example-client.tsx'), source, 'utf8');

  return spawnSync(process.execPath, [CHECKER], {
    cwd: root,
    env: { ...process.env, STRICT_CLIENT_BOUNDARY_SCAN: '1' },
    encoding: 'utf8',
  });
}

afterEach(() => {
  while (temporaryRoots.length > 0) {
    rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
  }
});

describe('client runtime boundary import classification', () => {
  it('accepts erased type-only imports from server modules', () => {
    const result = runChecker(`
'use client';
import type { AiSystemRecord } from '@/server/queries/ai-systems';
export function Example({ system }: { system: AiSystemRecord }) {
  return <span>{system.id}</span>;
}
`);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Client boundary security: ok');
    expect(result.stderr).not.toContain('server-only module at runtime');
  });

  it('rejects runtime imports from server modules', () => {
    const result = runChecker(`
'use client';
import { listAiSystems } from '@/server/queries/ai-systems';
export const leaked = listAiSystems;
`);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('client boundary imports server-only module at runtime');
    expect(result.stderr).toContain('@/server/queries/ai-systems');
  });

  it('rejects dynamic server imports from client code', () => {
    const result = runChecker(`
'use client';
export async function loadServerCode() {
  return import('@/server/security/api-guards');
}
`);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('client boundary imports server-only module at runtime');
    expect(result.stderr).toContain('@/server/security/api-guards');
  });
});
