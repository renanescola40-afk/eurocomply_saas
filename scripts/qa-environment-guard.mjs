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
  // Restricted mode for isolated QA app bootstrap only: billing is entirely
  // disabled, with no Stripe credentials. This cannot certify billing E2E.
  const noBillingBootstrap = e.RISCK_QA_BOOTSTRAP_NO_BILLING === 'true';
  if (noBillingBootstrap) {
    for (const name of ['STRIPE_SECRET_KEY','NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY']) {
      if (e[name]) errors.push(name + ' must be absent in no-billing QA bootstrap');
    }
    // A dedicated disabled TEST QA webhook may already have a signing secret.
    // Without a Stripe API key neither webhook handler can process an event.
    if (e.STRIPE_WEBHOOK_SECRET && !String(e.STRIPE_WEBHOOK_SECRET).startsWith('whsec_'))
      errors.push('STRIPE_WEBHOOK_SECRET must be a webhook signing secret');
  } else {
    if (!String(e.STRIPE_SECRET_KEY || '').startsWith('sk_test_')) errors.push('STRIPE_SECRET_KEY must be Stripe TEST');
    if (!String(e.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '').startsWith('pk_test_')) errors.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must be Stripe TEST');
    if (!String(e.STRIPE_WEBHOOK_SECRET || '').startsWith('whsec_')) errors.push('STRIPE_WEBHOOK_SECRET missing dedicated QA secret');
  }
  for (const [name,value] of Object.entries(e)) {
    if (/^STRIPE_PRICE_/.test(name) && value && !String(value).startsWith('price_')) errors.push(name+' invalid price identifier');
  }
  // Current application authentication uses Supabase. Legacy Clerk keys are
  // optional, but a partial pair or any LIVE credential is forbidden in QA.
  const clerkPublic = e.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
  const clerkSecret = e.CLERK_SECRET_KEY || '';
  if (clerkPublic && !String(clerkPublic).startsWith('pk_test_')) errors.push('Clerk publishable key must be test');
  if (clerkSecret && !String(clerkSecret).startsWith('sk_test_')) errors.push('Clerk secret key must be test');
  if (Boolean(clerkPublic) !== Boolean(clerkSecret)) errors.push('Clerk TEST keys must be paired');
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
