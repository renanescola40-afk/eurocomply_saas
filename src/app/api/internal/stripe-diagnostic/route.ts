import Stripe from 'stripe';
import billingCommercialCatalog from '../../../../../config/billing-commercial-catalog.json';
import { requireEnterpriseRateLimit } from '@/server/security/api-guards';
import { validateBearerToken } from '@/server/security/bearer-token';
import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SafeStripeError = {
  type: string | null;
  code: string | null;
  statusCode: number | null;
};

function safeStripeError(error: unknown): SafeStripeError {
  if (!error || typeof error !== 'object') {
    return { type: null, code: null, statusCode: null };
  }

  const value = error as { type?: unknown; code?: unknown; statusCode?: unknown };
  return {
    type: typeof value.type === 'string' ? value.type : null,
    code: typeof value.code === 'string' ? value.code : null,
    statusCode: typeof value.statusCode === 'number' ? value.statusCode : null,
  };
}

function envValue(name: string) {
  return process.env[name]?.trim() ?? '';
}

export async function GET(request: Request) {
  const rateLimitDenied = await requireEnterpriseRateLimit(request, {
    policy: 'health-internal',
    action: 'stripe_diagnostic_auth',
    route: '/api/internal/stripe-diagnostic',
    failureMode: 'fail-closed',
  });
  if (rateLimitDenied) return rateLimitDenied;

  if (!validateBearerToken(request, process.env.HEALTHCHECK_TOKEN, {
    allowMissingTokenOutsideProduction: false,
  })) {
    return noStoreJson({ status: 'unauthorized' }, { status: 401 });
  }

  const secretKey = envValue('STRIPE_SECRET_KEY');
  const bindings = [
    { label: 'ESSENTIAL_MONTHLY', envKey: billingCommercialCatalog.plans.essential.monthlyPriceEnvKey },
    { label: 'ESSENTIAL_ANNUAL', envKey: billingCommercialCatalog.plans.essential.annualPriceEnvKey },
    { label: 'PROFESSIONAL_MONTHLY', envKey: billingCommercialCatalog.plans.professional.monthlyPriceEnvKey },
    { label: 'PROFESSIONAL_ANNUAL', envKey: billingCommercialCatalog.plans.professional.annualPriceEnvKey },
  ];

  if (!secretKey) {
    return noStoreJson({
      status: 'not_configured',
      secretKeyConfigured: false,
      bindings: bindings.map(({ label, envKey }) => ({
        label,
        configured: Boolean(envValue(envKey)),
        ok: false,
        error: null,
      })),
    }, { status: 503 });
  }

  const stripe = new Stripe(secretKey, {
    maxNetworkRetries: 0,
    timeout: 5_000,
  });

  const results = [];
  for (const binding of bindings) {
    const priceId = envValue(binding.envKey);
    if (!priceId) {
      results.push({
        label: binding.label,
        configured: false,
        ok: false,
        error: null,
      });
      continue;
    }

    try {
      await stripe.prices.retrieve(priceId, {}, { timeout: 5_000 });
      results.push({
        label: binding.label,
        configured: true,
        ok: true,
        error: null,
      });
    } catch (error) {
      results.push({
        label: binding.label,
        configured: true,
        ok: false,
        error: safeStripeError(error),
      });
    }
  }

  const ok = results.every((result) => result.configured && result.ok);

  return noStoreJson({
    status: ok ? 'ok' : 'not_ready',
    secretKeyConfigured: true,
    bindings: results,
  }, { status: ok ? 200 : 503 });
}
