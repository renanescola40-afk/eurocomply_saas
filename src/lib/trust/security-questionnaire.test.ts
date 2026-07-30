import { describe, expect, it } from 'vitest';

import { getSecurityQuestionnairePack, resolveEvidenceUrls } from './security-questionnaire';

describe('security questionnaire pack', () => {
  it('contains unique answer identifiers and conservative claims', () => {
    const pack = getSecurityQuestionnairePack(new Date('2026-07-30T00:00:00.000Z'));
    const ids = pack.answers.map((answer) => answer.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(pack.answers.length).toBeGreaterThanOrEqual(10);
    expect(pack.generatedAt).toBe('2026-07-30T00:00:00.000Z');
    expect(pack.answers.some((answer) => answer.answer.includes('No SOC 2 or ISO 27001 certification is claimed'))).toBe(true);
    expect(pack.answers.some((answer) => answer.answer.includes('does not replace legal counsel'))).toBe(true);
  });

  it('resolves evidence only against the supplied same origin', () => {
    const resolved = resolveEvidenceUrls('https://www.risckcomply.com/pt', getSecurityQuestionnairePack());

    for (const answer of resolved.answers) {
      for (const evidence of answer.evidence) {
        expect(new URL(evidence).origin).toBe('https://www.risckcomply.com');
      }
    }
  });

  it('does not include tenant data or secrets', () => {
    const serialized = JSON.stringify(getSecurityQuestionnairePack()).toLowerCase();
    expect(serialized).not.toContain('service_role');
    expect(serialized).not.toContain('supabase_db_password');
    expect(serialized).not.toContain('customer_email');
    expect(serialized).not.toContain('organization_id');
  });
});
