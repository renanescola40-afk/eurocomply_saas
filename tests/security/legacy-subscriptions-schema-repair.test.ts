import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const migrationPath =
  'supabase/migrations/20260806103000_repair_legacy_subscriptions_schema.sql';
const migration = readFileSync(migrationPath, 'utf8');
const normalized = migration.toLowerCase();

const requiredColumns = [
  'stripe_customer_id text',
  'stripe_subscription_id text',
  'plan text',
  'tier text',
  'status text',
  'current_period_end timestamptz',
  'entitlements jsonb',
  'created_at timestamptz',
  'updated_at timestamptz',
] as const;

const canonicalPlans = ['starter', 'professional', 'business', 'enterprise'] as const;

describe('legacy subscriptions schema repair migration', () => {
  it('is transactional and fails closed when the expected table is absent', () => {
    expect(normalized).toMatch(/\nbegin;\n/);
    expect(normalized).toContain("to_regclass('public.subscriptions') is null");
    expect(normalized).toContain(
      "raise exception 'public.subscriptions must exist before the legacy billing repair'",
    );
    expect(normalized.trimEnd()).toMatch(/commit;$/);
  });

  it('adds every canonical billing column before the first data reference', () => {
    const additiveAlter = normalized.indexOf('alter table public.subscriptions\n  add column');
    const firstBackfill = normalized.indexOf('with normalized as (');

    expect(additiveAlter).toBeGreaterThan(-1);
    expect(firstBackfill).toBeGreaterThan(additiveAlter);

    for (const column of requiredColumns) {
      const token = `add column if not exists ${column}`;
      expect(normalized).toContain(token);
      expect(normalized.indexOf(token)).toBeLessThan(firstBackfill);
    }
  });

  it('preserves the highest recognized legacy tier instead of letting free hide professional', () => {
    const enterprise = normalized.indexOf("= 'enterprise'");
    const business = normalized.indexOf("= 'business'");
    const professional = normalized.indexOf("in ('growth', 'professional', 'pro')");

    expect(enterprise).toBeGreaterThan(-1);
    expect(business).toBeGreaterThan(enterprise);
    expect(professional).toBeGreaterThan(business);
    expect(normalized).toContain("or lower(coalesce(nullif(tier, ''), '')) = 'enterprise'");
    expect(normalized).toContain("or lower(coalesce(nullif(tier, ''), '')) = 'business'");
    expect(normalized).toContain(
      "or lower(coalesce(nullif(tier, ''), '')) in ('growth', 'professional', 'pro')",
    );
    expect(normalized).toContain('set plan = normalized.canonical_plan');
    expect(normalized).toContain('tier = normalized.canonical_plan');
  });

  it('backfills only missing entitlements and preserves custom contract payloads', () => {
    expect(normalized).toContain('where entitlements is null');
    expect(normalized).toContain("or entitlements = '{}'::jsonb");
    expect(normalized).not.toMatch(/update public\.subscriptions[\s\S]*set entitlements[\s\S]*where true/i);

    for (const plan of canonicalPlans) {
      if (plan !== 'starter') {
        expect(normalized).toContain(`when '${plan}' then`);
      }
    }
    expect(normalized).toContain('"auditlogsdays": 3650');
    expect(normalized).toContain('"apirequestsmonthly": 100000');
    expect(normalized).toContain('"aisystems": 250');
  });

  it('enforces canonical defaults, nullability, validated checks and uniqueness', () => {
    for (const column of ['plan', 'tier', 'status', 'entitlements', 'created_at', 'updated_at']) {
      expect(normalized).toContain(`alter column ${column} set not null`);
    }

    expect(normalized).toContain("alter column plan set default 'starter'");
    expect(normalized).toContain("alter column tier set default 'starter'");
    expect(normalized).toContain("alter column status set default 'inactive'");

    expect(normalized).toContain('add constraint subscriptions_plan_check');
    expect(normalized).toContain('add constraint subscriptions_tier_check');
    expect(normalized).toContain('validate constraint subscriptions_plan_check');
    expect(normalized).toContain('validate constraint subscriptions_tier_check');

    for (const plan of canonicalPlans) {
      expect(normalized).toContain(`'${plan}'`);
    }

    expect(normalized).toContain(
      'create unique index if not exists subscriptions_organization_id_uidx',
    );
    expect(normalized).toContain(
      'create unique index if not exists subscriptions_stripe_customer_id_uidx',
    );
    expect(normalized).toContain(
      'create unique index if not exists subscriptions_stripe_subscription_id_uidx',
    );
  });

  it('does not delete billing rows or weaken the table security boundary', () => {
    expect(normalized).not.toMatch(/\bdelete\s+from\b/);
    expect(normalized).not.toMatch(/\btruncate\b/);
    expect(normalized).not.toMatch(/\bdrop\s+table\b/);
    expect(normalized).not.toMatch(/\bdrop\s+column\b/);
    expect(normalized).not.toContain('disable row level security');
    expect(normalized).not.toContain('using (true)');
    expect(normalized).not.toContain('with check (true)');
  });
});
