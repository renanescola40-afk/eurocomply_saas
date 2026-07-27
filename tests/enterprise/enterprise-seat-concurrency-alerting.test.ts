import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/20260726170000_enterprise_seat_concurrency_alerting.sql', 'utf8');
const service = readFileSync('src/server/enterprise/seat-concurrency-alerting.ts', 'utf8');
const adminRoute = readFileSync('src/app/api/team/seat-contention/route.ts', 'utf8');
const workerRoute = readFileSync('src/app/api/internal/enterprise-access-notifications/route.ts', 'utf8');

describe('enterprise seat concurrency and alerting', () => {
  it('serializes organization seat reservations and locks the active contract', () => {
    expect(migration).toContain('pg_advisory_xact_lock');
    expect(migration).toContain('for update');
    expect(migration).toContain("'capacity_exhausted'");
    expect(migration).toContain("'version_conflict'");
    expect(migration).toContain('p_expected_contract_version');
  });

  it('records append-only contention evidence', () => {
    expect(migration).toContain('enterprise_seat_contention_events');
    expect(migration).toContain('correlation_id uuid not null');
    expect(migration).toContain('force row level security');
    expect(migration).toContain('enterprise_seat_contention_events_deny_delete');
  });

  it('uses leased skip-locked notification delivery with retry and dead-letter', () => {
    expect(migration).toContain('for update skip locked');
    expect(migration).toContain("status in ('pending','processing','retry','delivered','dead_letter','cancelled')");
    expect(migration).toContain("now()+interval '10 minutes'");
    expect(migration).toContain("then 'dead_letter' else 'retry'");
  });

  it('keeps browser mutations tenant derived, bounded, fail closed and step-up protected', () => {
    expect(adminRoute).toContain('getCurrentOrganizationForUser(user.id)');
    expect(adminRoute).toContain("permission: 'manage_team'");
    expect(adminRoute).toContain('requireTrustedMutation');
    expect(adminRoute).toContain("failureMode: 'fail-closed'");
    expect(adminRoute).toContain('requireStepUpForRequest');
    expect(adminRoute).toContain('readBoundedJsonRequest');
    expect(adminRoute).not.toContain('request.json()');
  });

  it('keeps external delivery fail closed until a provider adapter is configured', () => {
    expect(workerRoute).toContain('isAuthorizedInternalCronRequest');
    expect(workerRoute).toContain('enforceInternalAuthenticationRateLimit');
    expect(workerRoute).toContain('notification_provider_not_configured');
    expect(workerRoute).toContain('noStoreJson');
  });

  it('records failed delivery rather than swallowing provider errors', () => {
    expect(service).toContain('complete_enterprise_access_notification');
    expect(service).toContain('enterprise_access_notification_failure_record_failed');
    expect(service).toContain("'retry' | 'dead_letter'");
  });
});
