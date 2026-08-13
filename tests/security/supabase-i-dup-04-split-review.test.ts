import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const dossier = fs.readFileSync(
  'docs/security/evidence/human-review/split-reviews/i-dup-04-live-object-evidence.md',
  'utf8',
);
const legacyAudit = fs.readFileSync('supabase/migrations/20260613_audit_event_chained_rpc.sql', 'utf8');
const hardenedAudit = fs.readFileSync(
  'supabase/migrations/20260621120000_audit_chain_enterprise_hardening.sql',
  'utf8',
);
const legacyAddOns = fs.readFileSync('supabase/migrations/20260613_organization_add_ons.sql', 'utf8');
const canonicalAddOns = fs.readFileSync(
  'supabase/migrations/20260813124224_reconcile_organization_add_ons.sql',
  'utf8',
);

describe('Supabase I-DUP-04 technical split review', () => {
  it('binds the audit RPC recommendation to the later id/timestamp-aware contract', () => {
    expect(legacyAudit).not.toContain('p_id uuid');
    expect(legacyAudit).not.toContain('p_created_at timestamptz');
    expect(hardenedAudit).toContain('p_id uuid');
    expect(hardenedAudit).toContain('p_created_at timestamptz');
    expect(hardenedAudit).toContain('drop function if exists public.append_audit_event_chained');
    expect(dossier).toContain('Technical disposition candidate: `SUPERSEDED`');
    expect(dossier).toContain('20260621120000_audit_chain_enterprise_hardening.sql');
  });

  it('binds the add-ons recommendation to the canonical production reconciliation', () => {
    expect(legacyAddOns).toContain('alter table public.organization_add_ons enable row level security');
    expect(legacyAddOns).not.toContain('alter table public.organization_add_ons force row level security');
    expect(canonicalAddOns).toContain('alter table public.organization_add_ons force row level security');
    expect(canonicalAddOns).toContain('create or replace function public.touch_organization_add_on_updated_at()');
    expect(canonicalAddOns).toContain('grant select on table public.organization_add_ons to authenticated');
    expect(dossier).toContain('20260813124224_reconcile_organization_add_ons.sql');
  });

  it('preserves the non-authorizing evidence boundary', () => {
    expect(dossier).toContain('productionWriteAuthorized = false');
    expect(dossier).toContain('migrationExecutionAuthorized = false');
    expect(dossier).toContain('independentApprovalPresent = false');
    expect(dossier).toContain('canonicalDecisionAccepted = false');
  });
});
