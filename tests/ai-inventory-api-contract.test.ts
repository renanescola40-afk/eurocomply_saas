import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('AI inventory API contracts', () => {
  const collection = 'src/app/api/ai-systems/route.ts';
  const detail = 'src/app/api/ai-systems/[id]/route.ts';

  it('covers create and list contracts', () => {
    const source = readRepoFile(collection);

    expect(source).toContain('export async function GET()');
    expect(source).toContain('export async function POST(request: Request)');
    expect(source).toContain('requireApiUser()');
    expect(source).toContain('getCurrentOrganizationForUser(user.id)');
    expect(source).toContain("permission: 'read_ai_governance'");
    expect(source).toContain("permission: 'manage_ai_governance'");
    expect(source).toContain('permissionDeniedResponse(permission)');
    expect(source).toContain('assertTrustedOrigin(request)');
    expect(source).toContain('checkDistributedRateLimit({');
    expect(source).toContain('parseJsonBodyWithZod(request, {');
    expect(source).toContain('classifyParsedAiSystemBody(body)');
    expect(source).toContain('createAiSystem({');
    expect(source).toContain('organizationId: organization.id');
    expect(source).toContain('createdBy: user.id');
    expect(source).toContain('riskLevel: result.classification.riskLevel');
    expect(source).toContain('obligations: result.classification.obligations');
    expect(source).toContain('nextActions: result.classification.nextActions');
    expect(source).toContain("action: 'ai_system_created'");
    expect(source).toContain('return noStoreJson({ system, roleAssessment: result.roleAssessment })');
  });

  it('covers detail and reassessment contracts', () => {
    const source = readRepoFile(detail);

    expect(source).toContain('export async function GET(_request: Request, { params }: AiSystemRouteParams)');
    expect(source).toContain('export async function PATCH(request: Request, { params }: AiSystemRouteParams)');
    expect(source).toContain('requireApiUser()');
    expect(source).toContain('getCurrentOrganizationForUser(user.id)');
    expect(source).toContain("permission: 'read_ai_governance'");
    expect(source).toContain("permission: 'manage_ai_governance'");
    expect(source).toContain('getAiSystem(id, organization.id)');
    expect(source).toContain('listAiSystemHistory(id, organization.id)');
    expect(source).toContain('assertTrustedOrigin(request)');
    expect(source).toContain('checkDistributedRateLimit({');
    expect(source).toContain('parseJsonBodyWithZod(request, {');
    expect(source).toContain('classifyParsedAiSystemBody(body)');
    expect(source).toContain('updateAiSystem(id, organization.id, {');
    expect(source).toContain('reassessedBy: user.id');
    expect(source).toContain('riskLevel: result.classification.riskLevel');
    expect(source).toContain('obligations: result.classification.obligations');
    expect(source).toContain('nextActions: result.classification.nextActions');
    expect(source).toContain("action: 'ai_system_reassessed'");
    expect(source).toContain('previousRiskLevel: existing.risk_level');
    expect(source).toContain('return noStoreJson({ system, history, roleAssessment: result.roleAssessment })');
  });

  it('keeps denial and no-store paths explicit', () => {
    for (const path of [collection, detail]) {
      const source = readRepoFile(path);

      expect(source).toContain("noStoreJson({ error: 'organization_required' }, { status: 403 })");
      expect(source).toContain('permissionDeniedResponse(permission)');
      expect(source).toContain('secureApiError(error)');
      expect(source).toContain('noStoreJson');
    }
  });
});
