import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
const foundationName = '20260707110000_enterprise_readiness_evidence_platform.sql';
const foundation = fs.readFileSync(path.join(migrationsDir, foundationName), 'utf8');

function versionOf(name: string): number {
  return Number(name.split('_', 1)[0]);
}

describe('enterprise organization membership migration prerequisite', () => {
  it('defines the missing compatibility contract in the pending M9 foundation', () => {
    expect(foundation).toContain('create or replace function public.enterprise_member_can_read');
    expect(foundation).toContain(
      'create or replace function public.is_organization_member(p_organization_id uuid)',
    );
    const compatibilityStart = foundation.indexOf(
      'create or replace function public.is_organization_member(p_organization_id uuid)',
    );
    const compatibilityEnd = foundation.indexOf('-- Evidence packs', compatibilityStart);
    const compatibilityBlock = foundation.slice(compatibilityStart, compatibilityEnd);

    expect(compatibilityBlock).toContain('security invoker');
    expect(compatibilityBlock).not.toContain('security definer');
    expect(compatibilityBlock).toContain(
      'select public.enterprise_member_can_read(p_organization_id);',
    );
    expect(foundation).toContain(
      'revoke all on function public.is_organization_member(uuid) from public;',
    );
    expect(foundation).toContain(
      'grant execute on function public.is_organization_member(uuid) to authenticated, service_role;',
    );
  });

  it('orders M9 before every later canonical migration that consumes the compatibility helper', () => {
    const foundationVersion = versionOf(foundationName);
    const consumers = fs
      .readdirSync(migrationsDir)
      .filter((name) => name.endsWith('.sql') && name !== foundationName)
      .filter((name) => fs.readFileSync(path.join(migrationsDir, name), 'utf8').includes(
        'public.is_organization_member(',
      ));

    expect(consumers.length).toBeGreaterThanOrEqual(13);
    for (const consumer of consumers) {
      expect(versionOf(consumer), consumer).toBeGreaterThan(foundationVersion);
    }
  });
});
