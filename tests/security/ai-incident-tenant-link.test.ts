import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const INCIDENT_ROUTE = new URL('../../src/app/api/ai-incidents/route.ts', import.meta.url);

describe('AI incident tenant linkage', () => {
  it('requires a canonical UUID when an AI system is supplied', async () => {
    const source = await readFile(INCIDENT_ROUTE, 'utf8');

    expect(source).toContain("z.string().uuid().nullable().optional()");
  });

  it('rejects missing or foreign AI systems instead of silently unlinking the incident', async () => {
    const source = await readFile(INCIDENT_ROUTE, 'utf8');
    const tenantSystems = source.indexOf('const systems = await listAiSystems(organization.id);');
    const tenantLookup = source.indexOf('systems.find((system) => system.id === requestedSystemId)');
    const rejection = source.indexOf("return noStoreJson({ error: 'ai_system_not_found' }, { status: 404 });");
    const persistence = source.indexOf('const incident = await createAiIncident({');

    expect(tenantSystems).toBeGreaterThan(-1);
    expect(tenantLookup).toBeGreaterThan(tenantSystems);
    expect(rejection).toBeGreaterThan(tenantLookup);
    expect(persistence).toBeGreaterThan(rejection);
    expect(source).not.toContain('systems.some((system) => system.id === requestedSystemId) ? requestedSystemId : null');
  });

  it('keeps organization scope server-derived', async () => {
    const source = await readFile(INCIDENT_ROUTE, 'utf8');

    expect(source).toContain('getCurrentOrganizationForUser(user.id)');
    expect(source).toContain('organizationId: organization.id');
    expect(source).not.toContain('body.organizationId');
    expect(source).not.toContain('body.organization_id');
  });
});
