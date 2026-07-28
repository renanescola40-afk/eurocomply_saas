import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = fs.readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20260728190000_market_leadership_foundations.sql'),
  'utf8',
);

const tenantTables = [
  'ai_governance_entities',
  'ai_governance_entity_links',
  'normalized_ai_controls',
  'normalized_ai_control_mappings',
  'governance_evidence_objects',
  'regulatory_change_impacts',
  'governance_value_events',
] as const;

describe('market leadership foundations migration', () => {
  it('creates the digital twin, control, evidence, impact and value domains', () => {
    for (const table of tenantTables) {
      expect(sql).toContain(`create table if not exists public.${table}`);
      expect(sql).toContain(`alter table public.${table} enable row level security`);
      expect(sql).toContain(`alter table public.${table} force row level security`);
      expect(sql).toContain(`revoke all on public.${table} from anon`);
    }
  });

  it('keeps browser mutations fail closed and permits tenant-scoped reads only', () => {
    expect(sql).toContain('public.is_organization_member(organization_id)');
    expect(sql).not.toMatch(/grant\s+(insert|update|delete|all)\s+on\s+public\.(ai_governance_entities|normalized_ai_controls|governance_evidence_objects)\s+to\s+authenticated/i);
  });

  it('prevents synthetic records from being represented as production evidence', () => {
    expect(sql).toContain("check (evidence_class <> 'synthetic' or environment <> 'production')");
    expect(sql).toContain("integrity_digest ~ '^sha256:[a-f0-9]{64}$'");
    expect(sql).toContain("review_status in ('unreviewed','review_required','accepted','rejected','expired')");
  });

  it('preserves framework versioning and one first-value event per organization', () => {
    expect(sql).toContain('unique (organization_id, control_key, version)');
    expect(sql).toContain('unique (organization_id, control_id, framework_key, framework_version, requirement_key)');
    expect(sql).toContain('unique (organization_id, event_name)');
  });
});
