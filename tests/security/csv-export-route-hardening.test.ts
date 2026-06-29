import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function walk(dir: string, acc: string[] = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      walk(path, acc);
    } else if (path.endsWith('.csv/route.ts')) {
      acc.push(path);
    }
  }

  return acc;
}

const csvRoutes = walk(join(process.cwd(), 'src/app/api/reports'));

describe('CSV report route hardening invariants', () => {
  it('keeps every CSV route on the hardened CSV download helper', () => {
    expect(csvRoutes.length).toBeGreaterThan(0);

    for (const route of csvRoutes) {
      const source = readFileSync(route, 'utf8');
      expect(source).toContain('csvDownloadResponse');
      expect(source).not.toContain('text/csv');
    }
  });

  it('does not expose provider errors or cache JSON failure responses', () => {
    for (const route of csvRoutes) {
      const source = readFileSync(route, 'utf8');
      expect(source).not.toContain('NextResponse.json');
      expect(source).not.toContain('error.message');

      if (source.includes('return noStoreJson')) {
        expect(source).toContain('@/server/security/no-store');
      }
    }
  });

  it('scopes Supabase CSV exports to the active organization and export rate-limit policy', () => {
    for (const route of csvRoutes) {
      const source = readFileSync(route, 'utf8');
      expect(source).toContain("policy: 'export'");

      if (source.includes('.from(')) {
        expect(source).toContain(".eq('organization_id', organization.id)");
      }
    }
  });
});
