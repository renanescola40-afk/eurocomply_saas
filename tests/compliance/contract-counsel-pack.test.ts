import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { validateContractCounselPack } from '../../scripts/compliance/validate-contract-counsel-pack.mjs';

function readJson(path: string) {
  return JSON.parse(readFileSync(join(process.cwd(), path), 'utf8'));
}

describe('contract and counsel handoff pack', () => {
  it('prepares the complete pack while preserving founder and counsel blockers', () => {
    const report = validateContractCounselPack({ root: process.cwd() });

    expect(report.failures).toEqual([]);
    expect(report.status).toBe('READY_FOR_FOUNDER_AND_COUNSEL_HANDOFF');
    expect(report.preparedDocumentCount).toBe(9);
    expect(report.expectedDocumentCount).toBe(9);
    expect(report.founderFactsUnresolvedCount).toBeGreaterThan(0);
    expect(report.founderFactsComplete).toBe(false);
    expect(report.counselAccepted).toBe(false);
    expect(report.legalAcceptanceStatus).toBe('HUMAN_REVIEW_REQUIRED');
  });

  it('keeps claims and final decisions non-crediting', () => {
    const claims = readJson('docs/legal-review-preparation/legal-pack/CLAIMS_REGISTER.json');
    const decision = readJson('docs/legal-review-preparation/legal-pack/FINAL_DECISION_SHEET_TEMPLATE.json');

    expect(claims.status).toBe('COUNSEL_REVIEW_REQUIRED');
    expect(claims.rules.some((rule: { classification: string }) => rule.classification === 'PROHIBITED')).toBe(true);
    expect(claims.rules.some((rule: { classification: string }) => rule.classification === 'CONDITIONALLY_PROHIBITED')).toBe(true);
    expect(decision.status).toBe('HUMAN_REVIEW_REQUIRED');
    expect(decision.workstreamDecisions).toHaveLength(8);
    expect(decision.workstreamDecisions.every((item: { decision: string }) => item.decision === 'HUMAN_REVIEW_REQUIRED')).toBe(true);
  });
});
