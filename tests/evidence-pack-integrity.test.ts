import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const route = readFileSync('src/app/api/ai-systems/route.ts', 'utf8');

describe('evidence pack creation integrity', () => {
  it('does not report a created evidence pack when required item persistence fails', () => {
    const itemFailureBlock = route.slice(
      route.indexOf('if (itemError)'),
      route.indexOf('return { pack, items: items ?? [] };'),
    );

    expect(itemFailureBlock).toContain(".from('enterprise_evidence_packs')");
    expect(itemFailureBlock).toContain('.delete()');
    expect(itemFailureBlock).toContain(".eq('id', pack.id)");
    expect(itemFailureBlock).toContain(".eq('organization_id', input.organizationId)");
    expect(itemFailureBlock).toContain('throw itemError');
    expect(itemFailureBlock).not.toContain('return { pack');
  });

  it('records the created audit event only after the workflow returns successfully', () => {
    const workflowCall = route.indexOf('const result = await createEvidencePackWorkflow');
    const auditEvent = route.indexOf("action: 'enterprise_evidence_pack_created'");
    const successResponse = route.indexOf('return noStoreJson(result, { status: 201 })');

    expect(workflowCall).toBeGreaterThan(-1);
    expect(auditEvent).toBeGreaterThan(workflowCall);
    expect(successResponse).toBeGreaterThan(auditEvent);
  });
});
