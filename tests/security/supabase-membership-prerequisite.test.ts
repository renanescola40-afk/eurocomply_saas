import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
const foundationName = '20260707110000_enterprise_readiness_evidence_platform.sql';
const compatibilityName = '20260707110500_organization_membership_compatibility.sql';
const foundation = fs.readFileSync(path.join(migrationsDir, foundationName), 'utf8');
const compatibility = fs.readFileSync(path.join(migrationsDir, compatibilityName), 'utf8');

function versionOf(name: string): number {
  return Number(name.split('_', 1)[0]);
}

describe('enterprise organization membership migration prerequisite', () => {
  it('defines the missing compatibility contract immediately after its foundation', () => {
    expect(foundation).toContain('create or replace function public.enterprise_member_can_read');
    expect(versionOf(foundationName)).toBeLessThan(versionOf(compatibilityName));
    expect(compatibility).toContain(
      'create or replace function public.is_organization_member(p_organization_id uuid)',
    );
    expect(compatibility).toContain('security invoker');
    expect(compatibility).not.toContain('security definer');
    expect(compatibility).toContain('select public.enterprise_member_can_read(p_organization_id);');
    expect(compatibility).toContain(
      'revoke all on function public.is_organization_member(uuid) from public;',
    );
    expect(compatibility).toContain(
      'grant execute on function public.is_organization_member(uuid) to authenticated, service_role;',
    );
  });

  it('orders the compatibility helper before every canonical migration that consumes it', () => {
    const compatibilityVersion = versionOf(compatibilityName);
    const consumers = fs
      .readdirSync(migrationsDir)
      .filter((name) => name.endsWith('.sql') && name !== compatibilityName)
      .filter((name) => fs.readFileSync(path.join(migrationsDir, name), 'utf8').includes(
        'public.is_organization_member(',
      ));

    expect(consumers.length).toBeGreaterThanOrEqual(13);
    for (const consumer of consumers) {
      expect(versionOf(consumer), consumer).toBeGreaterThan(compatibilityVersion);
    }
  });
});
