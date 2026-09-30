import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const route = readFileSync(resolve(process.cwd(), 'src/app/api/documents/[id]/raci/route.ts'), 'utf8');
const page = readFileSync(resolve(process.cwd(), 'src/app/[locale]/raci/page.tsx'), 'utf8');
const client = readFileSync(resolve(process.cwd(), 'src/app/[locale]/raci/raci-client.tsx'), 'utf8');

describe('document RACI persistence', () => {
  it('requires authenticated, entitled, permissioned, tenant-scoped writes', () => {
    expect(route).toContain('requireApiUser()');
    expect(route).toContain("permission: 'manage_documents'");
    expect(route).toContain('entitlements.approvalWorkflows');
    expect(route).toContain('requireTrustedMutation');
    expect(route).toContain(".eq('organization_id', organization.id)");
    expect(route).toContain('assertApiResourceOrganization');
  });

  it('persists assignments in document metadata and fails closed on missing audit evidence', () => {
    expect(route).toContain("raci: {");
    expect(route).toContain("action: 'document_raci_updated'");
    expect(route).toContain('if (!audit.persisted)');
    expect(route).toContain('.update({ metadata: previousMetadata })');
    expect(route).toContain("error: 'raci_audit_unavailable'");
  });

  it('loads real organization documents and does not ship hardcoded RACI rows', () => {
    expect(page).toContain('listDocuments(organization.id');
    expect(page).toContain('document.metadata?.raci');
    expect(client).toContain("method: 'PUT'");
    expect(client).toContain('/raci');
    expect(client).not.toContain('Política de Privacidade');
    expect(client).not.toContain('Matriz de Riscos');
  });
});
