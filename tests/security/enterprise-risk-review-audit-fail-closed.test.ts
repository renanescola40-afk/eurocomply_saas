import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routePath = 'src/app/api/ai-systems/route.ts';

describe('enterprise risk review audit persistence', () => {
  it('requires durable audit persistence before returning a created risk review', () => {
    const source = readFileSync(routePath, 'utf8');
    const workflowStart = source.indexOf("if (workflow === 'risk_review')");
    const workflowEnd = source.indexOf("const body = await parseJsonBodyWithZod(request, {\n      schema: aiSystemBodySchema", workflowStart);
    const workflow = source.slice(workflowStart, workflowEnd);

    expect(workflow).toContain('const audit = await createAuditEvent({');
    expect(workflow).toContain('if (!audit.persisted)');
    expect(workflow.indexOf('if (!audit.persisted)')).toBeLessThan(
      workflow.indexOf('return noStoreJson({ riskReview }, { status: 201 });'),
    );
  });

  it('attempts an exact tenant- and actor-scoped compensation delete', () => {
    const source = readFileSync(routePath, 'utf8');
    const guardStart = source.indexOf('if (!audit.persisted)', source.indexOf("if (workflow === 'risk_review')"));
    const successReturn = source.indexOf('return noStoreJson({ riskReview }, { status: 201 });', guardStart);
    const compensation = source.slice(guardStart, successReturn);

    expect(compensation).toContain(".from('enterprise_risk_reviews')");
    expect(compensation).toContain('.delete()');
    expect(compensation).toContain(".eq('id', riskReview.id)");
    expect(compensation).toContain(".eq('organization_id', organization.id)");
    expect(compensation).toContain(".eq('requested_by', user.id)");
    expect(compensation).toContain(".eq('created_at', riskReview.created_at)");
    expect(compensation).toContain('risk_review_audit_compensation_failed');
    expect(compensation).toContain("return noStoreJson({ error: 'risk_review_audit_unavailable' }, { status: 503 });");
  });

  it('preserves origin, authentication, authorization, validation, tenant scoping, and rate limiting', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain('const originDenied = assertTrustedOrigin(request);');
    expect(source).toContain('const user = await requireApiUser();');
    expect(source).toContain("if (workflow === 'risk_review') return 'manage_risks';");
    expect(source).toContain('schema: riskReviewBodySchema');
    expect(source).toContain('const aiSystemId = await resolveOrganizationAiSystemId(organization.id, body.aiSystemId);');
    expect(source).toContain('key: `ai-systems:${workflow}:${organization.id}:${user.id}`');
  });
});
