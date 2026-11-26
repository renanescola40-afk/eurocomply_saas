import { describe, expect, it, vi } from 'vitest';
import { exactOwnBootstrapPolicies, probeSignedBootstrap, probeAnonymousBootstrapDenied,
  probeRevokedBootstrapDenied, probeInvalidBootstrapSignatureDenied } from '../../scripts/security/lib/qa-v2-bootstrap-rpc-proof.mjs';

vi.mock('../../scripts/security/lib/qa-signed-session-id-proof.mjs', () => ({
  verifyQaSignedSessionId: vi.fn(async (_auth, _token, _user, aal) => ['aal1','aal2'].includes(aal)),
}));

const own = '11111111-1111-4111-8111-111111111111';
const foreign = '22222222-2222-4222-8222-222222222222';
const row = (id: string, required = true) => ({ organization_id: id, require_mfa_for_all_users: required });
const response = (status: number, body: unknown) => vi.fn(async () => ({ status, json: async () => body }));
const base = { qaUrl: 'https://zrxrrfbllsxtleyxjpsz.supabase.co', publishableKey: 'sb_publishable_synthetic',
  token: 'header.payload.signature', auth: {}, expectedUserId: own, expectedAal: 'aal1', expectedPolicies: [row(own)] };

describe('V2 bootstrap probe contract — simulated HTTP and verification only', () => {
  it('validates complete own policy set, including empty membership', () => {
    expect(exactOwnBootstrapPolicies([row(own)], [row(own)])).toBe(true);
    expect(exactOwnBootstrapPolicies([], [])).toBe(true);
    expect(exactOwnBootstrapPolicies([row(foreign)], [row(own)])).toBe(false);
    expect(exactOwnBootstrapPolicies([row(own),row(own)], [row(own)])).toBe(false);
    expect(exactOwnBootstrapPolicies([row(own,false)], [row(own)])).toBe(false);
    expect(exactOwnBootstrapPolicies([{...row(own),role:'owner'}], [row(own)])).toBe(false);
    expect(exactOwnBootstrapPolicies(null, [])).toBe(false);
  });
  it('accepts only the exact signed own response and refuses foreign rows', async () => {
    expect(await probeSignedBootstrap({...base,fetchImpl:response(200,[row(own)])})).toBe(true);
    expect(await probeSignedBootstrap({...base,fetchImpl:response(200,[row(foreign)])})).toBe(false);
  });
  it('refuses non-QA target and secret credentials before HTTP', async () => {
    const fetchImpl = response(200,[row(own)]);
    expect(await probeSignedBootstrap({...base,qaUrl:'https://other.invalid',fetchImpl})).toBe(false);
    expect(await probeSignedBootstrap({...base,publishableKey:'sb_secret_synthetic',fetchImpl})).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it('does not confuse missing schema with anonymous permission denial', async () => {
    const fetchImpl = response(401,{code:'42501'});
    expect(await probeAnonymousBootstrapDenied({...base,fetchImpl})).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining('/rest/v1/rpc/get_my_mfa_bootstrap_context'),
      expect.objectContaining({headers:expect.not.objectContaining({authorization:expect.anything()})}));
    expect(await probeAnonymousBootstrapDenied({...base,fetchImpl:response(404,{code:'PGRST202'})})).toBe(false);
  });
  it('requires prior verified identity, successful revocation and unexpired JWT', async () => {
    const replay = {...base,priorSignedProof:true,signOutSucceeded:true,
      expiresAt:Math.floor(Date.now()/1000)+300,fetchImpl:response(403,{code:'42501'})};
    expect(await probeRevokedBootstrapDenied(replay)).toBe(true);
    expect(await probeRevokedBootstrapDenied({...replay,expiresAt:1})).toBe(false);
    expect(await probeRevokedBootstrapDenied({...replay,signOutSucceeded:false})).toBe(false);
  });
  it('distinguishes tampered signature rejection from unrelated server errors', async () => {
    expect(await probeInvalidBootstrapSignatureDenied({...base,fetchImpl:response(401,{code:'PGRST301'})})).toBe(true);
    expect(await probeInvalidBootstrapSignatureDenied({...base,fetchImpl:response(500,{code:'42501'})})).toBe(false);
  });
});
