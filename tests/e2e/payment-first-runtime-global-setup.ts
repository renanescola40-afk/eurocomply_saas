import { chromium, type APIResponse, type FullConfig } from '@playwright/test';

const analyticsConsentStorageKey = 'risckcomply.analytics.consent';

type PasswordGrantResponse = {
  access_token?: string;
  user?: { id?: string };
};

type MembershipRow = {
  organization_id?: string | null;
};

type ApiErrorPayload = {
  error?: string;
};

function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`payment_first_runtime_missing_${name.toLowerCase()}`);
  return value;
}

function shouldRunPaymentFirstRuntimeProof() {
  return process.env.E2E_FRIA_UNLICENSED_AUTHORITY_VERIFIED === 'true'
    && Boolean(process.env.E2E_UNLICENSED_OWNER_EMAIL?.trim())
    && Boolean(process.env.E2E_UNLICENSED_OWNER_PASSWORD);
}

async function responseJson<T>(response: Response, label: string): Promise<T> {
  if (!response.ok) {
    throw new Error(`${label}_failed_status_${response.status}`);
  }
  return await response.json() as T;
}

async function assertCommercialApiDenied(response: APIResponse, label: string) {
  if (response.status() !== 403) {
    throw new Error(`${label}_unexpected_status_${response.status()}`);
  }

  let payload: ApiErrorPayload | null = null;
  try {
    payload = await response.json() as ApiErrorPayload;
  } catch {
    throw new Error(`${label}_invalid_json_denial`);
  }

  // A generic 403 is not sufficient evidence. The application must have found
  // the authenticated tenant/membership and denied specifically because durable
  // commercial authority is absent.
  if (payload?.error !== 'subscription_required') {
    throw new Error(`${label}_wrong_denial_${payload?.error ?? 'missing_error'}`);
  }
}

function assertDeniedWrite(response: Response, label: string) {
  if (response.ok) {
    throw new Error(`${label}_unexpectedly_allowed_${response.status}`);
  }
  if (![401, 403].includes(response.status)) {
    throw new Error(`${label}_unexpected_status_${response.status}`);
  }
}

async function proveSupabaseDataPlaneDenied(input: {
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  email: string;
  password: string;
}) {
  const grant = await fetch(`${input.supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: input.anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: input.email, password: input.password }),
  });
  const session = await responseJson<PasswordGrantResponse>(grant, 'payment_first_password_grant');
  const accessToken = session.access_token;
  const userId = session.user?.id;
  if (!accessToken || !userId) throw new Error('payment_first_password_grant_missing_identity');

  const authenticatedHeaders = {
    apikey: input.anonKey,
    Authorization: `Bearer ${accessToken}`,
  };
  const memberships = await fetch(
    `${input.supabaseUrl}/rest/v1/organization_members?select=organization_id&user_id=eq.${encodeURIComponent(userId)}&limit=10`,
    { headers: authenticatedHeaders },
  );
  const membershipRows = await responseJson<MembershipRow[]>(memberships, 'payment_first_membership_lookup');
  const organizationIds = [...new Set(
    membershipRows
      .map((row) => row.organization_id?.trim())
      .filter((value): value is string => Boolean(value)),
  )];
  if (organizationIds.length !== 1) {
    throw new Error(`payment_first_expected_single_unlicensed_organization_${organizationIds.length}`);
  }

  const organizationId = organizationIds[0];
  const serviceHeaders = {
    apikey: input.serviceRoleKey,
    Authorization: `Bearer ${input.serviceRoleKey}`,
  };

  const attemptedName = `PAYMENT_FIRST_DENIED_${Date.now()}`;
  const attemptedWrite = await fetch(`${input.supabaseUrl}/rest/v1/ai_systems`, {
    method: 'POST',
    headers: {
      ...authenticatedHeaders,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      organization_id: organizationId,
      name: attemptedName,
      owner_team: 'Security QA',
      use_case: 'Attempted unlicensed commercial write used only for the disposable payment-first runtime proof.',
      role: 'deployer',
      lifecycle_status: 'pilot',
      risk_domain: 'general_productivity',
      created_by: userId,
    }),
  });
  assertDeniedWrite(attemptedWrite, 'payment_first_supabase_ai_system_write');

  const verification = await fetch(
    `${input.supabaseUrl}/rest/v1/ai_systems?select=id&organization_id=eq.${encodeURIComponent(organizationId)}&name=eq.${encodeURIComponent(attemptedName)}`,
    { headers: serviceHeaders },
  );
  const survivingRows = await responseJson<Array<{ id?: string }>>(verification, 'payment_first_write_verification');
  if (survivingRows.length !== 0) {
    throw new Error('payment_first_supabase_write_survived_denial');
  }

  const attemptedGapTitle = `PAYMENT_FIRST_GAP_DENIED_${Date.now()}`;
  const gapWrite = await fetch(`${input.supabaseUrl}/rest/v1/gap_assessments`, {
    method: 'POST',
    headers: {
      ...authenticatedHeaders,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      organization_id: organizationId,
      user_id: userId,
      title: attemptedGapTitle,
      score: 0,
      status: 'completed',
      locale: 'en',
      summary: { proof: 'unlicensed_gap_write_must_fail' },
    }),
  });
  assertDeniedWrite(gapWrite, 'payment_first_supabase_gap_write');

  const gapVerification = await fetch(
    `${input.supabaseUrl}/rest/v1/gap_assessments?select=id&organization_id=eq.${encodeURIComponent(organizationId)}&title=eq.${encodeURIComponent(attemptedGapTitle)}`,
    { headers: serviceHeaders },
  );
  const survivingGapRows = await responseJson<Array<{ id?: string }>>(gapVerification, 'payment_first_gap_write_verification');
  if (survivingGapRows.length !== 0) {
    throw new Error('payment_first_supabase_gap_write_survived_denial');
  }
}

export default async function paymentFirstRuntimeGlobalSetup(config: FullConfig) {
  if (!shouldRunPaymentFirstRuntimeProof()) return;

  const baseURL = process.env.E2E_BASE_URL?.trim() || config.projects[0]?.use.baseURL?.toString();
  if (!baseURL) throw new Error('payment_first_runtime_missing_base_url');

  const email = requiredEnvironment('E2E_UNLICENSED_OWNER_EMAIL').toLowerCase();
  const password = requiredEnvironment('E2E_UNLICENSED_OWNER_PASSWORD');
  const supabaseUrl = requiredEnvironment('NEXT_PUBLIC_SUPABASE_URL').replace(/\/$/, '');
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim()
    || requiredEnvironment('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const serviceRoleKey = requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY');

  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  try {
    await page.addInitScript(
      (storageKey) => window.localStorage.setItem(storageKey, 'denied'),
      analyticsConsentStorageKey,
    );
    await page.goto('/en/login?next=/en/dashboard/organizations/billing', { waitUntil: 'domcontentloaded' });
    const credentialEmail = page.getByRole('textbox', { name: 'Work email', exact: true });
    const credentialForm = page.locator('form').filter({ has: credentialEmail });
    if (await credentialForm.count() !== 1) throw new Error('payment_first_login_form_not_unique');
    await credentialEmail.fill(email);
    await credentialForm.getByLabel('Password', { exact: true }).fill(password);
    await credentialForm.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 30_000,
      waitUntil: 'domcontentloaded',
    });

    const apiGet = await context.request.get('/api/ai-systems');
    await assertCommercialApiDenied(apiGet, 'payment_first_unlicensed_api_get');

    const apiPost = await context.request.post('/api/ai-systems', {
      headers: {
        Origin: new URL(baseURL).origin,
      },
      data: {
        name: 'Payment-first denied API write',
        useCase: 'This request must be rejected before any commercial write is attempted.',
        ownerTeam: 'Security QA',
        role: 'deployer',
        lifecycleStatus: 'pilot',
        riskDomain: 'general_productivity',
      },
    });
    await assertCommercialApiDenied(apiPost, 'payment_first_unlicensed_api_post');

    const gapApiPost = await context.request.post('/api/gap-analysis?operation=assessment', {
      headers: {
        Origin: new URL(baseURL).origin,
      },
      data: {
        locale: 'en',
        score: 0,
        summary: { proof: 'unlicensed_gap_api_write_must_fail' },
        answers: [],
      },
    });
    await assertCommercialApiDenied(gapApiPost, 'payment_first_unlicensed_gap_api_post');

    // Prove the real disposable identity has exactly one tenant and that direct
    // PostgREST product writes are denied before checking the page redirect.
    // This prevents a generic organization/session 403 from masquerading as a
    // successful payment-first commercial denial.
    await proveSupabaseDataPlaneDenied({
      supabaseUrl,
      anonKey,
      serviceRoleKey,
      email,
      password,
    });

    await page.goto('/en/onboarding', { waitUntil: 'domcontentloaded' });
    try {
      // App Router server redirects can finish as an RSC navigation after the
      // first document reaches DOMContentLoaded. Await the exact commercial
      // destination instead of sampling page.url() during that transition.
      await page.waitForURL((url) => url.pathname.endsWith('/dashboard/organizations/billing'), {
        timeout: 30_000,
        waitUntil: 'domcontentloaded',
      });
    } catch {
      const currentUrl = new URL(page.url());
      throw new Error(`payment_first_unlicensed_onboarding_redirect_timeout_${currentUrl.pathname}`);
    }

    const onboardingUrl = new URL(page.url());
    if (!onboardingUrl.pathname.endsWith('/dashboard/organizations/billing')) {
      throw new Error(`payment_first_unlicensed_onboarding_path_${onboardingUrl.pathname}`);
    }
    if (onboardingUrl.searchParams.get('onboarding') !== 'payment_required') {
      throw new Error('payment_first_unlicensed_onboarding_missing_payment_required');
    }
  } finally {
    await context.close();
    await browser.close();
  }
}
