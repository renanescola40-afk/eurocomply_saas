import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const approvalRecord = readFileSync(resolve(repoRoot, 'docs/RELEASE_APPROVAL_RECORD.md'), 'utf8');
const incidentPlan = readFileSync(resolve(repoRoot, 'docs/RELEASE_INCIDENT_RESPONSE_PLAN.md'), 'utf8');

function ownerValue(label: string) {
  const match = approvalRecord.match(new RegExp(`^- ${label}: (?<value>.+)$`, 'm'));
  return match?.groups?.value?.trim() ?? '';
}

describe('release operational owner readiness', () => {
  it.each([
    'Incident owner',
    'Rollback owner',
    'Customer communication owner',
    'Support owner',
  ])('keeps %s assigned to a named owner', (label) => {
    const value = ownerValue(label);

    expect(value).toContain('@renansilva2002 / renanescola40-afk');
    expect(value.toLowerCase()).not.toBe('tbd');
  });

  it('keeps release approval blocked while runtime evidence is missing', () => {
    expect(approvalRecord).toContain('- [x] **No-Go**');
    expect(approvalRecord).toContain('- Approver: **Not granted**; blocked by open P0 runtime evidence and missing final validation runner proof.');
    expect(approvalRecord).toContain('| Deployment URL functional verification | **Open** |');
    expect(approvalRecord).toContain('Approval is intentionally withheld while P0 blockers remain open');
    expect(approvalRecord).toContain('Supabase RLS live validation is Open/not_run');
    expect(approvalRecord).toContain('External review/pentest is Open/not_started');
    expect(approvalRecord).toContain('Rollback target is candidate-only');
  });

  it('documents that owner assignment does not satisfy runtime evidence', () => {
    expect(incidentPlan).toContain('This acknowledgement only closes the missing-owner gap.');
    expect(incidentPlan).toContain('It does not approve release promotion');
  });
});
