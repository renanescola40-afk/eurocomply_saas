// Candidate for the existing protected QA harness; not a standalone credential
// consumer. No raw tokens, identifiers, payloads or provider errors returned.
import { verifyQaSignedSessionId } from './qa-signed-session-id-proof.mjs';

const QA_URL = 'https://zrxrrfbllsxtleyxjpsz.supabase.co';
const RPC = QA_URL + '/rest/v1/rpc/get_my_mfa_bootstrap_context';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function exactPolicyMap(rows) {
  if (!Array.isArray(rows) || rows.length > 20) return null;
  const result = new Map();
  for (const row of rows) {
    if (!row || typeof row !== 'object' || Array.isArray(row)
      || Object.keys(row).length !== 2 || typeof row.organization_id !== 'string'
      || !UUID.test(row.organization_id) || typeof row.require_mfa_for_all_users !== 'boolean') return null;
    const key = row.organization_id.toLowerCase();
    if (result.has(key)) return null;
    result.set(key, row.require_mfa_for_all_users);
  }
  return result;
}

export function exactOwnBootstrapPolicies(actual, expected) {
  const a = exactPolicyMap(actual);
  const b = exactPolicyMap(expected);
  return a !== null && b !== null && a.size === b.size
    && [...b].every(([id, required]) => a.has(id) && a.get(id) === required);
}

async function request({ qaUrl, publishableKey, token, fetchImpl = fetch }) {
  if (qaUrl !== QA_URL || typeof publishableKey !== 'string' || !publishableKey.trim()
    || publishableKey.startsWith('sb_secret_')) return { status: 0, body: null };
  // Legacy service-role JWTs are also forbidden in this caller boundary.
  const parts = publishableKey.split('.');
  if (parts.length === 3) {
    try {
      if (JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')).role !== 'anon') return { status: 0, body: null };
    } catch { return { status: 0, body: null }; }
  } else if (!publishableKey.startsWith('sb_publishable_')) return { status: 0, body: null };
  if (token !== undefined && (typeof token !== 'string' || !token)) return { status: 0, body: null };
  try {
    const response = await fetchImpl(RPC, {
      method: 'POST', redirect: 'error',
      headers: { apikey: publishableKey, 'content-type': 'application/json',
        ...(token === undefined ? {} : { authorization: 'Bearer ' + token }) },
      body: '{}', signal: AbortSignal.timeout(12000),
    });
    // Never log response bodies, error messages or headers.
    const body = await response.json();
    return { status: response.status, body };
  } catch { return { status: 0, body: null }; }
}

/** expectedPolicies must originate from independently read-back QA fixture
 * membership/settings, NOT a browser request or the RPC response itself. */
export async function probeSignedBootstrap({ qaUrl, publishableKey, auth, token, expectedUserId, expectedAal, expectedPolicies, fetchImpl }) {
  if (qaUrl !== QA_URL || !exactPolicyMap(expectedPolicies)
    || !await verifyQaSignedSessionId(auth, token, expectedUserId, expectedAal)) return false;
  const result = await request({ qaUrl, publishableKey, token, fetchImpl });
  return result.status === 200 && exactOwnBootstrapPolicies(result.body, expectedPolicies);
}

/** Only permission denied counts; schema-cache miss, timeout or absent function
 * is not evidence of access control. No token is sent for this case. */
export async function probeAnonymousBootstrapDenied({ qaUrl, publishableKey, fetchImpl }) {
  const r = await request({ qaUrl, publishableKey, fetchImpl });
  return [401, 403].includes(r.status) && r.body?.code === '42501';
}

/** The caller must retain the exact previously verified genuine token in
 * memory, successfully revoke its session, and prove the token has not expired.
 * This checks the live-session predicate rather than generic malformed JWT denial. */
export async function probeRevokedBootstrapDenied({ qaUrl, publishableKey, token, priorSignedProof, signOutSucceeded, expiresAt, fetchImpl }) {
  if (priorSignedProof !== true || signOutSucceeded !== true
    || typeof token !== 'string' || !token
    || !Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now()/1000)) return false;
  const r = await request({ qaUrl, publishableKey, token, fetchImpl });
  return [401, 403].includes(r.status) && r.body?.code === '42501';
}

/** Deliberately invalid signature on a disposable QA token. This is a
 * separate API signature-rejection test, not a signed identity claim. */
export async function probeInvalidBootstrapSignatureDenied({ qaUrl, publishableKey, token, fetchImpl }) {
  if (typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3 || !parts[2]) return false;
  // Change the first signature character (not unused final padding bits).
  parts[2] = (parts[2][0] === 'A' ? 'B' : 'A') + parts[2].slice(1);
  const r = await request({ qaUrl, publishableKey, token: parts.join('.'), fetchImpl });
  return r.status === 401 && ['PGRST301','PGRST303'].includes(r.body?.code);
}
