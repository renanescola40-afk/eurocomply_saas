import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Port of the recovery intent in GitLab !2632, adapted to current Price authority.
// Source-only contracts: no Stripe writes, QA simulation or formal gate acceptance.
const source = readFileSync(new URL('../../src/app/api/billing/checkout/route.ts', import.meta.url), 'utf8');
const boundary = source.indexOf('export async function POST(');
const post = source.slice(boundary);
const helpers = source.slice(0, boundary);
function ordered(...tokens) {
  let last = -1;
  for (const token of tokens) {
    const found = post.indexOf(token);
    assert.ok(found >= 0, 'missing checkout contract: ' + token);
    assert.ok(found > last, 'checkout ordering regressed: ' + token);
    last = found;
  }
}
test('authentication, RBAC and trusted mutation precede Stripe', () => {
  ordered('const user = await requireApiUser()', 'await requirePermission({',
    'await requireTrustedMutation(request', 'const stripe = getStripeClient()');
});
test('sales-assisted plan is denied before Stripe', () => {
  ordered('!isSelfServePlan(normalizedPlan)',
    "return noStoreJson({ error: 'invalid_plan' }", 'const stripe = getStripeClient()');
});
test('mode guard precedes fetching Stripe Price', () => {
  ordered('checkoutStripeModeMatchesPurpose(expectedStripeMode, validationOnlyCheckout)',
    "await stripe.prices.retrieve(priceId, { expand: ['product'] })");
  assert.ok(post.includes('checkout_stripe_mode_not_authorized'));
});
test('canonical Price authority must pass before claiming checkout lease', () => {
  ordered("await stripe.prices.retrieve(priceId, { expand: ['product'] })",
    'const priceAuthority = validateCheckoutPriceAuthority', 'if (!priceAuthority.ok)',
    'await claimInitialCheckoutAttempt(organization.id, plan)');
  assert.ok(post.includes('checkout_price_authority_invalid'));
});
test('claimed lease precedes customer persistence and session creation', () => {
  ordered('await claimInitialCheckoutAttempt(organization.id, plan)',
    'const customer = await ensureOrganizationStripeCustomer({',
    'await persistPendingLiveCustomerBinding({', 'stripe.checkout.sessions.create(');
});
test('reused session needs canonical Stripe line items before returning URL', () => {
  ordered('stripe.checkout.sessions.listLineItems(existingSession.id, { limit: 2 })',
    'reusableCheckoutLineItemsMatch(lineItems, priceId)', 'if (!sessionPriceMatches)',
    "await expireReusedCheckoutSessionStrict(stripe, existingSession.id, 'checkout_stale_price_session_expire')",
    'checkout_session_requires_restart', 'url: existingSession.url');
});
test('strict expiry checks provider confirmation before releasing obsolete URL', () => {
  assert.ok(helpers.includes("expired.status !== 'expired'"));
  assert.ok(helpers.includes('checkout_session_expiry_unconfirmed'));
});
test('stale legal session is expired and released before returning URL', () => {
  ordered('if (!existingLegalMatches)',
    "await expireReusedCheckoutSessionStrict(stripe, existingSession.id, 'billing_checkout_stale_legal_session_expire')",
    "await releaseCheckoutAttemptSafely(organization.id, checkoutAttempt.attemptToken, 'billing_checkout_stale_legal_session_release')",
    'url: existingSession.url');
});
test('audit persistence failure expires hosted session and releases lease', () => {
  ordered('const auditResult = await writeAuditLog({', 'if (!auditResult.persisted)',
    "await expireCheckoutSessionSafely(stripe, session.id, organization.id, 'billing_checkout_audit_compensation')",
    "await releaseCheckoutAttemptSafely(organization.id, attemptToken, 'billing_checkout_audit_release')",
    'checkout_audit_unavailable');
});
test('checkout exception releases claimed lease and fails closed', () => {
  assert.ok(post.includes("await releaseCheckoutAttemptSafely(organization.id, attemptToken, 'billing_checkout_failed_attempt_release')"));
  assert.ok(post.includes('return secureApiError(error, request)'));
});
