// QA Auth harness only. Never return or persist a token, subject or session ID.
const QA_ISSUER = 'https://zrxrrfbllsxtleyxjpsz.supabase.co/auth/v1';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function verifyQaSignedSessionId(auth, accessToken, expectedUserId, expectedAal) {
  if (typeof accessToken !== 'string' || !accessToken
    || typeof expectedUserId !== 'string' || !UUID.test(expectedUserId)
    || !['aal1', 'aal2'].includes(expectedAal)
    || typeof auth?.getClaims !== 'function' || typeof auth?.getUser !== 'function') return false;
  try {
    // The SDK verifies signature/expiry using QA JWKS or its Auth server.
    // getUser verifies this same token against the provider; local decoded
    // claims or getSession's embedded user alone are never sufficient.
    const verified = await auth.getClaims(accessToken);
    const claims = verified.data?.claims;
    if (verified.error || !claims || claims.iss !== QA_ISSUER
      || claims.sub !== expectedUserId || claims.role !== 'authenticated'
      || claims.aal !== expectedAal || claims.is_anonymous !== false
      || !(claims.aud === 'authenticated' || (Array.isArray(claims.aud) && claims.aud.includes('authenticated')))
      || !Number.isFinite(claims.exp) || claims.exp <= Math.floor(Date.now() / 1000)
      || typeof claims.session_id !== 'string' || !UUID.test(claims.session_id)) return false;
    const user = await auth.getUser(accessToken);
    return !user.error && user.data?.user?.id === expectedUserId && user.data?.user?.is_anonymous === false;
  } catch {
    return false;
  }
}
