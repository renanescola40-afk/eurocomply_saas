import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  MAX_RECOVERY_WINDOW_MS,
  PROTECTED_ORGANIZATION_IDS,
  SYNTHETIC_AUDIT_ACTION,
  SYNTHETIC_PURPOSE,
  isSyntheticAuthUser,
  isSyntheticOrganizationRow,
  validateRecoveryWindow,
} from '../../scripts/security/recover-audit-chain-synthetic-residue.mjs';

const producer = readFileSync('scripts/security/recover-audit-chain-synthetic-residue.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/audit-chain-synthetic-recovery.yml', 'utf8');

describe('audit-chain synthetic recovery', () => {
  it('accepts only a bounded explicit recovery window', () => {
    const window = validateRecoveryWindow('2026-09-05T22:34:00Z', '2026-09-05T22:55:00Z');
    expect(window.from).toBe('2026-09-05T22:34:00.000Z');
    expect(window.to).toBe('2026-09-05T22:55:00.000Z');
    expect(MAX_RECOVERY_WINDOW_MS).toBe(7_200_000);
    expect(() => validateRecoveryWindow('2026-09-05T22:00:00Z', '2026-09-06T01:00:01Z')).toThrow('recovery_window_too_wide');
    expect(() => validateRecoveryWindow('invalid', '2026-09-05T22:55:00Z')).toThrow('recovery_window_invalid');
  });

  it('requires the proof-only organization marker and denies historical protected fixtures', () => {
    expect(SYNTHETIC_PURPOSE).toBe('audit-chain-live-proof');
    expect(isSyntheticOrganizationRow({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', slug: 'audit-chain-live-proof-a-123' })).toBe(true);
    expect(isSyntheticOrganizationRow({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', slug: 'customer-production' })).toBe(false);
    for (const id of PROTECTED_ORGANIZATION_IDS) {
      expect(isSyntheticOrganizationRow({ id, slug: 'audit-chain-live-proof-a-123' })).toBe(false);
    }
  });

  it('requires the proof-only auth email marker inside the recovery window', () => {
    const from = '2026-09-05T22:34:00.000Z';
    const to = '2026-09-05T22:55:00.000Z';
    expect(isSyntheticAuthUser({
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      email: 'audit-chain-live-proof-owner-123@example.com',
      created_at: '2026-09-05T22:40:00Z',
    }, from, to)).toBe(true);
    expect(isSyntheticAuthUser({
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      email: 'real-customer@example.com',
      created_at: '2026-09-05T22:40:00Z',
    }, from, to)).toBe(false);
  });

  it('locks the destructive scope to synthetic markers, caps and explicit confirmation', () => {
    expect(SYNTHETIC_AUDIT_ACTION).toBe('security.audit_chain_live_validation');
    expect(producer).toContain("confirmation !== 'CLEANUP_AUDIT_CHAIN_SYNTHETIC'");
    expect(producer).toContain('MAX_SYNTHETIC_ORGANIZATIONS = 20');
    expect(producer).toContain('MAX_SYNTHETIC_USERS = 30');
    expect(producer).toContain('MAX_SYNTHETIC_AUDIT_EVENTS = 1_000');
    expect(producer).toContain('historicalFixtureCleanupAttempted: false');
    expect(producer).not.toContain('Promise.all([');
    expect(workflow).toContain('environment: Production');
    expect(workflow).toContain("test \"$RECOVERY_CONFIRMATION\" = 'CLEANUP_AUDIT_CHAIN_SYNTHETIC'");
    expect(workflow).toContain('test "$main_sha" = "${TARGET_SHA,,}"');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).not.toContain('push:');
  });
});
