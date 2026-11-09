// G5-01: fail-closed build gate for any Vercel Preview deployment.
// Deliberately avoids printing environment variable values.
export function validateQaEnvironment(e) {
  const errors = [];
  const preview = e.VERCEL_ENV === 'preview';
  const qa = e.RISCK_QA_ENVIRONMENT === 'true';
  if (!preview && !qa) return { checked: false, errors };
  if (!preview) errors.push('QA must run only with VERCEL_ENV=preview');
  if (!qa) errors.push('RISCK_QA_ENVIRONMENT=true is mandatory in Preview');
  const expected = 'zrxrrfbllsxtleyxjpsz';
  const prod = 'tganhbbhfxcpblmgqprg';
  for (const name of ['SUPABASE_URL','NEXT_PUBLIC_SUPABASE_URL']) {
    const value = e[name];
    if (!value) { errors.push(name + ' missing'); continue; }
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.hostname !== expected + '.supabase.co')
        errors.push(name + ' must target the exact QA Supabase hostname');
    } catch { errors.push(name + ' invalid URL'); }
  }
  for (const [name,value] of Object.entries(e)) {
    if (!value) continue;
    if (/SUPABASE|DATABASE_URL|POSTGRES|DIRECT_URL|PGHOST|PGHOSTADDR|DB_URL/i.test(name) && String(value).includes(prod))
      errors.push(name + ' references production');
  }
  for (const name of ['DATABASE_URL','DIRECT_URL','POSTGRES_URL','POSTGRES_PRISMA_URL','POSTGRES_URL_NON_POOLING']) {
    if (e[name]) errors.push(name + ' not allowed without separate verified QA DB guard');
  }
  for (const name of ['STRIPE_SECRET_KEY','NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY']) {
    const val=e[name] || '';
    if (!val || !new RegExp('^(sk|pk)_test_').test(val)) errors.push(name+' must be Stripe TEST');
  }
  for (const name of ['STRIPE_WEBHOOK_SECRET']) {
    if (!e[name]) errors.push(name + ' missing dedicated QA secret');
  }
  for (const [name,value] of Object.entries(e)) {
    if (/^STRIPE_PRICE_/.test(name) && value && !String(value).startsWith('price_')) errors.push(name+' invalid price identifier');
  }
  // Supabase Auth is the sole identity provider. Historical Clerk credentials
  // must not be required for QA builds or carried into the runtime at all.
  for (const [name, value] of Object.entries(e)) {
    if (/^(?:CLERK_|NEXT_PUBLIC_CLERK_)/.test(name) && value)
      errors.push(name + ' is an unsupported legacy identity credential in QA');
  }
  // Until an independent credential-to-project attestation exists, do not allow any
  // inherited privileged Supabase credential into Preview, even if it is opaque.
  for (const name of ['SUPABASE_SERVICE_ROLE_KEY','SUPABASE_SERVICE_KEY','SUPABASE_ADMIN_KEY','SUPABASE_SECRET_KEY']) {
    if (e[name]) errors.push(name + ' must be absent from QA');
  }
  if (e.STRIPE_RESTRICTED_KEY) errors.push('STRIPE_RESTRICTED_KEY unsupported in QA');
  if (e.RESEND_API_KEY) errors.push('RESEND_API_KEY must be absent in QA');
  if (e.SMTP_PASSWORD || e.SMTP_HOST || e.SENDGRID_API_KEY || e.MAILGUN_API_KEY) errors.push('Real outbound email provider configured in QA');
  if (e.REQUIRE_TRANSACTIONAL_EMAIL_DELIVERY !== 'false') errors.push('QA transactional email must be disabled');
  if (e.QA_ALLOW_OUTBOUND_EMAIL !== 'false') errors.push('QA_ALLOW_OUTBOUND_EMAIL=false required');
  const app = e.NEXT_PUBLIC_APP_URL || '';
  if (!app) errors.push('QA app URL required');
  else {
    try {
      const u=new URL(app);
      if (u.protocol !== 'https:' || u.hostname === 'www.risckcomply.com' || u.hostname === 'risckcomply.com')
        errors.push('QA app URL cannot be production origin');
    } catch { errors.push('QA app URL invalid'); }
  }
  return {checked:true,errors};
}
