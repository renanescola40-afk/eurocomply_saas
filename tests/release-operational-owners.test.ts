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
    expect(approvalRecord).toContain('- Approver: Not granted; blocked by current PR Vercel deployment failure, open P0 evidence and non-passing final validation bundle');
    expect(approvalRecord).toContain('- Deployment URL: **Missing for current PR #346; Vercel failed with `api-deployments-free-per-day`**');
    expect(approvalRecord).toContain('Approval is intentionally withheld while P0 blockers remain open');
  });

  it('documents that owner assignment does not satisfy runtime evidence', () => {
    expect(incidentPlan).toContain('This acknowledgement only closes the missing-owner gap.');
    expect(incidentPlan).toContain('It does not approve release promotion');
  });
});
