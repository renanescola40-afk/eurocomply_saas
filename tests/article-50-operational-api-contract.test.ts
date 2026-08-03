import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const route = readFileSync(
  'src/app/api/ai-governance/article-50/route.ts',
  'utf8',
);
const queries = readFileSync(
  'src/server/queries/article-50-workspace.ts',
  'utf8',
);

describe('Article 50 operational API contract', () => {
  it('derives identity and tenant server-side', () => {
    expect(route).toContain('requireApiUser()');
    expect(route).toContain('getCurrentOrganizationForUser(user.id)');
    expect(route).toContain("permission: 'read_ai_governance'");
    expect(route).toContain("permission: 'manage_ai_governance'");
    expect(route).not.toContain('organizationId: body.');
  });

  it('applies mutation security controls', () => {
    expect(route).toContain('assertTrustedOrigin(request)');
    expect(route).toContain('checkDistributedRateLimit');
    expect(route).toContain('parseJsonBodyWithZod');
    expect(route).toContain('MAX_BYTES');
    expect(route).toContain('noStoreJson');
    expect(route).toContain('secureApiError');
  });

  it('does not accept a transition claim without retained Official Journal evidence', () => {
    expect(route).toContain('finalAmendingActVerifiedInOfficialJournal');
    expect(route).toContain('officialJournalEvidenceId');
    expect(route).toContain(
      'Official Journal evidence is required for a verified transition claim.',
    );
  });

  it('requires evidence for positive marking and disclosure claims', () => {
    expect(route).toContain('markingEvidenceReference');
    expect(route).toContain('displayEvidenceReference');
    expect(route).toContain('Disclosure copy is required.');
    expect(route).toContain('Proof of display is required.');
  });

  it('keeps all storage queries organization-scoped', () => {
    expect(queries).toContain(".eq('organization_id', organizationId)");
    expect(queries).toContain('create_article50_assessment_version');
    expect(queries).toContain('rollbackArticle50Assessment');
    expect(queries).toContain('rollbackArticle50Evidence');
  });

  it('compensates when the external audit trail cannot be persisted', () => {
    expect(route).toContain('if (!event.persisted)');
    expect(route).toContain('const rolledBack = await rollbackArticle50Assessment');
    expect(route).toContain('const rolledBack = await rollbackArticle50Evidence');
    expect(route).toContain("? 'article50_audit_unavailable'");
    expect(route).toContain(": 'article50_audit_compensation_failed'");
  });
});
