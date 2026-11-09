// Fail closed for QA Stripe TEST webhook deliveries until an authenticated,
// non-RLS-bypassing QA persistence writer is actually implemented and attested.
// Provider signature validation remains in the route, before this decision.
// This is not a credential check, an event writer or an acceptance proof.
const QA_SUPABASE_HOST = 'zrxrrfbllsxtleyxjpsz.supabase.co';

function getQaSupabaseEndpoint(input) {
  try {
    const url = new URL(String(input || ''));
    const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
    return {
      matchesQaHost: hostname === QA_SUPABASE_HOST,
      validBaseUrl: url.protocol === 'https:' && !url.username && !url.password &&
        !url.port && (url.pathname === '/' || url.pathname === '') && !url.search && !url.hash,
    };
  } catch {
    return { matchesQaHost: false, validBaseUrl: false };
  }
}
const PRIVILEGED_KEYS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SERVICE_KEY',
  'SUPABASE_ADMIN_KEY',
  'SUPABASE_SECRET_KEY',
];

/**
 * @param {Record<string, string | undefined>} env
 * @returns {{allowed: true, reason: 'not_qa'} | {allowed: false, reason: 'qa_environment_mismatch' | 'qa_privileged_credential_forbidden' | 'qa_webhook_writer_not_ready'}}
 */
export function evaluateQaWebhookAdmission(env) {
  const qaFlag = env.RISCK_QA_ENVIRONMENT === 'true';
  const qaTarget = env.VERCEL_TARGET_ENV === 'qa' || env.VERCEL_ENV === 'qa';
  const qaDatabase = getQaSupabaseEndpoint(env.NEXT_PUBLIC_SUPABASE_URL);
  if (!qaFlag && !qaTarget && !qaDatabase.matchesQaHost) return { allowed: true, reason: 'not_qa' };

  if (!qaFlag || !qaDatabase.matchesQaHost || !qaDatabase.validBaseUrl || env.VERCEL_ENV !== 'preview') {
    return { allowed: false, reason: 'qa_environment_mismatch' };
  }
  if (PRIVILEGED_KEYS.some((name) => Boolean(env[name]))) {
    return { allowed: false, reason: 'qa_privileged_credential_forbidden' };
  }

  // No variable or unverified external claim may turn this into a success.
  // Replace this result only after the actual least-privilege QA writer exists,
  // and authenticated runtime DB persistence/replay has been independently proven.
  return { allowed: false, reason: 'qa_webhook_writer_not_ready' };
}
