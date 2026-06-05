import { describe, expect, it } from 'vitest';

import { normalizeOrganization, workspaceToDashboardOrganization } from './organization-adapter';

describe('organization dashboard adapter', () => {
  it('maps a legacy workspace into a dashboard organization', () => {
    expect(workspaceToDashboardOrganization({ id: 'workspace-1', name: 'Legacy Workspace' })).toEqual({
      id: 'workspace-1',
      name: 'Legacy Workspace',
      slug: 'workspace-1',
      source: 'workspace',
    });
  });

  it('normalizes a real organization', () => {
    expect(normalizeOrganization({ id: 'org-1', name: 'EuroComply', slug: 'eurocomply' })).toEqual({
      id: 'org-1',
      name: 'EuroComply',
      slug: 'eurocomply',
      source: 'organization',
    });
  });
});
