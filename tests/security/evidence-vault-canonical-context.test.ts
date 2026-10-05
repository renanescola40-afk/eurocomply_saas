import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ context: null as null | { organization: { id: string } }, error: false }));
vi.mock('@/server/queries/auth', () => ({ requireCurrentUser: async () => ({ id: 'qa-user' }) }));
vi.mock('@/server/queries/current-organization', () => ({
  getCurrentOrganizationForUser: async (userId: string) => {
    expect(userId).toBe('qa-user');
    if (state.error) throw new Error('organization_memberships_unavailable');
    return state.context;
  },
}));
vi.mock('@/app/[locale]/dashboard/evidence/evidence-vault-client', () => ({ default: () => null }));
import EvidenceVaultPage from '@/app/[locale]/dashboard/evidence/page';

describe('Evidence Vault canonical tenant handoff', () => {
  beforeEach(() => { state.context = null; state.error = false; });
  it('hands the authenticated canonical organization to the client', async () => {
    state.context = { organization: { id: 'canonical-qa-org' } };
    const result = await EvidenceVaultPage();
    expect(result.props).toEqual({ canonicalOrganizationId: 'canonical-qa-org' });
  });
  it('renders an explicit unavailable state instead of querying another tenant when membership is absent', async () => {
    const result = await EvidenceVaultPage();
    expect(result.type).toBe('p');
    expect(result.props).toMatchObject({ role: 'alert' });
    expect(result.props).not.toHaveProperty('canonicalOrganizationId');
  });
  it('propagates canonical membership or SSO failures instead of selecting a fallback tenant', async () => {
    state.error = true;
    await expect(EvidenceVaultPage()).rejects.toThrow('organization_memberships_unavailable');
  });
});
