export type LegacyWorkspace = {
  id: string;
  name: string;
  slug?: string | null;
};

export type DashboardOrganization = {
  id: string;
  name: string;
  slug: string;
  source: 'organization' | 'workspace';
};

export function workspaceToDashboardOrganization(workspace: LegacyWorkspace): DashboardOrganization {
  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug ?? workspace.id,
    source: 'workspace',
  };
}

export function normalizeOrganization(input: {
  id: string;
  name: string;
  slug?: string | null;
}): DashboardOrganization {
  return {
    id: input.id,
    name: input.name,
    slug: input.slug ?? input.id,
    source: 'organization',
  };
}
