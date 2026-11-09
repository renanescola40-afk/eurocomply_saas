// Fail closed for QA Stripe TEST webhook deliveries until an authenticated,
// non-RLS-bypassing QA persistence writer is actually implemented and attested.
// Provider signature validation remains in the route, before this decision.
// This is not a credential check, an event writer or an acceptance proof.
const QA_SUPABASE_URL = 'https://zrxrrfbllsxtleyxjpsz.supabase.co';
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
  const qaDatabase = env.NEXT_PUBLIC_SUPABASE_URL === QA_SUPABASE_URL;
  if (!qaFlag && !qaDatabase) return { allowed: true, reason: 'not_qa' };

  if (!qaFlag || !qaDatabase || env.VERCEL_ENV !== 'preview') {
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
