// Exact Netlify project identity is mandatory for CLI remote QA drafts.
export const QA_NETLIFY_SITE_ID = 'e953293d-348c-41e8-b798-fcd1ece9c427';
export const QA_NETLIFY_SITE_NAME = 'risck-qa-isolated';

export function resolveNetlifyQaRemoteDraftUrl(e) {
  if (e.NETLIFY !== 'true' || e.CONTEXT !== 'deploy-preview' ||
      e.RISCK_QA_NETLIFY_MANUAL_DRAFT !== 'true' ||
      e.RISCK_QA_BOOTSTRAP_NO_BILLING !== 'true' ||
      e.SITE_ID !== QA_NETLIFY_SITE_ID || e.SITE_NAME !== QA_NETLIFY_SITE_NAME ||
      !/^[a-f0-9]{24,40}$/.test(e.DEPLOY_ID || '')) return null;

  const expected = 'https://' + e.DEPLOY_ID + '--' + QA_NETLIFY_SITE_NAME + '.netlify.app';
  // DEPLOY_URL is the immutable per-deployment HTTPS URL assigned by Netlify.
  if (e.DEPLOY_URL !== expected) return null;
  // The primary URL for a manual draft may resolve to the deploy URL or the
  // canonical QA site URL. No unrelated hostname is accepted.
  if (e.DEPLOY_PRIME_URL && e.DEPLOY_PRIME_URL !== expected &&
      e.DEPLOY_PRIME_URL !== 'https://' + QA_NETLIFY_SITE_NAME + '.netlify.app') return null;
  return expected;
}

// G5-01: fail-closed build gate for Vercel and Netlify QA previews.
// Deliberately avoids printing environment variable values.
export function validateQaEnvironment(e) {
  const errors = [];
  const vercelPreview = e.VERCEL_ENV === 'preview';
  const netlifyPreview = e.NETLIFY === 'true' && e.CONTEXT === 'deploy-preview';
  const preview = vercelPreview || netlifyPreview;
  const qa = e.RISCK_QA_ENVIRONMENT === 'true';
  if (!preview && !qa) return { checked: false, errors };
  if (!preview) errors.push('QA must run only in a supported isolated preview');
  if (e.NETLIFY === 'true' && e.VERCEL_ENV) errors.push('Mixed hosting provider markers forbidden');
  // Manual Netlify CLI draft aliases are not Git PR Deploy Previews.
  // Require an explicitly named QA-only site. All existing credential and
  // Production-denial rules below remain in force.
  const netlifyManualDraft = e.RISCK_QA_NETLIFY_MANUAL_DRAFT === 'true';
  if (netlifyManualDraft && !netlifyPreview)
    errors.push('Manual QA drafts require the Netlify deploy-preview context');
  if (netlifyManualDraft && e.RISCK_QA_BOOTSTRAP_NO_BILLING !== 'true')
    errors.push('Manual QA drafts must disable billing');
  if (netlifyPreview) {
    try {
      const deploy = e.DEPLOY_PRIME_URL ? new URL(e.DEPLOY_PRIME_URL) : null;
      const app = new URL(e.NEXT_PUBLIC_APP_URL || '');
      const safeOrigin = (url) => url &&
        url.protocol === 'https:' && !url.username && !url.password &&
        url.pathname === '/' && !url.search && !url.hash;
      const gitPreview = !netlifyManualDraft && deploy &&
        /^deploy-preview-[0-9]+--[a-z0-9][a-z0-9-]*\.netlify\.app$/.test(deploy.hostname) &&
        deploy.href === app.href;
      // Preserve manual CLI aliases; additionally allow authenticated remote
      // drafts only when Netlify's exact site ID, deploy ID and URL agree.
      const manualDraft = netlifyManualDraft &&
        /^qa-manual-[a-f0-9]{8}--risck-qa-[a-z0-9][a-z0-9-]*\.netlify\.app$/.test(app.hostname) &&
        (!deploy || deploy.href === app.href);
      const remoteDraftUrl = resolveNetlifyQaRemoteDraftUrl(e);
      const remoteDraft = netlifyManualDraft && remoteDraftUrl &&
        app.origin === remoteDraftUrl;
      if (!safeOrigin(app) || (deploy && !safeOrigin(deploy)) ||
          !(gitPreview || manualDraft || remoteDraft))
        errors.push('Netlify QA origin must match an HTTPS Git preview or authorized QA-only draft');
    } catch { errors.push('Netlify QA origin missing or invalid'); }
  }
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
