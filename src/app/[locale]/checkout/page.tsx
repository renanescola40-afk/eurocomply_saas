import Link from 'next/link';
import { PublicFooter } from '@/components/marketing/public-footer';
import { BILLING_PLANS, getBillingPlan } from '@/lib/billing/plans';
import { BillingActionButton } from '@/app/[locale]/dashboard/organizations/billing/billing-action-button';
import { getCurrentUser } from '@/server/queries/auth';
import { getOrganizationBillingContext } from '@/server/queries/billing';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';

const DEFAULT_PLAN_ID = 'growth';
const CURRENT_PLAN_BLOCKING_STATUSES = new Set([
  'active',
  'trialing',
  'past_due',
  'unpaid',
  'incomplete',
]);

const checkoutProof = [
  ['Stripe secure billing', 'Card, invoice details, tax IDs and billing addresses are handled by Stripe Checkout.'],
  ['Workspace-linked subscription', 'The selected plan is connected to your organization after Stripe confirms the subscription.'],
  ['Transparent monthly pricing', 'The plan price comes from the SaaS billing catalog, with no hidden setup fee.'],
];

const implementationSteps = [
  'Choose the plan that matches your current compliance workload.',
  'Confirm billing details in Stripe Checkout.',
  'Return to the Risck Comply dashboard with the plan connected to your workspace.',
];

type CheckoutSearchParams = {
  plan?: string | string[];
  checkout?: string | string[];
};

type CheckoutPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<CheckoutSearchParams>;
};

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function isCurrentPlanSubscription(status: string | null | undefined) {
  return Boolean(status && CURRENT_PLAN_BLOCKING_STATUSES.has(status));
}

function checkoutMessage(status?: string) {
  if (status === 'cancelled') {
    return {
      title: 'Checkout cancelled',
      description: 'No billing change was made. Review the plan and restart checkout when you are ready.',
      className: 'border-amber-300/30 bg-amber-300/10 text-amber-100',
    };
  }

  if (status === 'error') {
    return {
      title: 'Checkout could not start',
      description: 'Please confirm you are signed in, have a workspace and can manage billing for this organization.',
      className: 'border-rose-300/30 bg-rose-300/10 text-rose-100',
    };
  }

  return null;
}

export default async function CheckoutPage({ params, searchParams }: CheckoutPageProps) {
  const [{ locale }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({} as CheckoutSearchParams),
  ]);
  const selectedPlanId = firstSearchParam(resolvedSearchParams.plan);
  const checkoutStatus = firstSearchParam(resolvedSearchParams.checkout);
  const selectedPlan = getBillingPlan(selectedPlanId) ?? getBillingPlan(DEFAULT_PLAN_ID) ?? BILLING_PLANS[1];
  const user = await getCurrentUser();
  const organization = user ? await getCurrentOrganizationForUser(user.id).catch(() => null) : null;
  const billing = organization ? await getOrganizationBillingContext(organization.id).catch(() => null) : null;
  const selectedPlanIsCurrent = billing?.plan === selectedPlan.id && isCurrentPlanSubscription(billing.status);
  const message = checkoutMessage(checkoutStatus);
  const checkoutContinuationPath = `/${locale}/checkout?plan=${selectedPlan.id}`;
  const billingDashboardPath = `/${locale}/dashboard/organizations/billing`;

  return (
    <main className="min-h-screen bg-[#05060a] text-white">
      <header className="border-b border-white/10 bg-[#05060a]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href={`/${locale}`} className="text-lg font-bold tracking-tight">Risck Comply</Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link href={`/${locale}/pricing`} className="rounded-full border border-white/15 px-4 py-2 font-medium text-slate-200 hover:bg-white/10">Plans</Link>
            {user ? (
              <Link href={billingDashboardPath} className="rounded-full bg-white px-4 py-2 font-semibold text-black hover:bg-white/90">Billing</Link>
            ) : (
              <Link href={`/${locale}/login?next=${encodeURIComponent(checkoutContinuationPath)}`} className="rounded-full bg-white px-4 py-2 font-semibold text-black hover:bg-white/90">Sign in</Link>
            )}
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute left-1/2 top-0 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute right-0 top-20 h-[24rem] w-[24rem] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div>
            <p className="inline-flex rounded-full border border-blue-300/30 bg-blue-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">Secure SaaS checkout</p>
            <h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-[-0.05em] md:text-7xl">
              Activate your Risck Comply workspace.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
              Select a monthly plan, confirm the billing data in Stripe and return to the dashboard with the subscription attached to your organization.
            </p>

            {message && (
              <div className={`mt-6 rounded-2xl border p-4 ${message.className}`}>
                <p className="font-semibold">{message.title}</p>
                <p className="mt-1 text-sm opacity-85">{message.description}</p>
              </div>
            )}

            {selectedPlanIsCurrent && (
              <div className="mt-6 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-4 text-emerald-100">
                <p className="font-semibold">This is already your current plan</p>
                <p className="mt-1 text-sm opacity-85">Open the billing portal if you need to manage invoices, payment details or subscription changes.</p>
              </div>
            )}

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {checkoutProof.map(([title, description]) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="font-semibold">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-[2rem] border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Order summary</p>
            <div className="mt-5 rounded-[1.5rem] border border-blue-300/30 bg-blue-400/10 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-semibold">{selectedPlan.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-blue-100/80">Monthly subscription for your compliance workspace.</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-950">{selectedPlanIsCurrent ? 'Current' : 'Selected'}</span>
              </div>
              <p className="mt-6 text-5xl font-bold">€{selectedPlan.priceMonthly}<span className="text-base font-normal text-blue-100/70">/mo</span></p>
            </div>

            <div className="mt-5 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-slate-500">Users</p>
                <p className="mt-1 text-xl font-semibold text-white">{formatNumber(selectedPlan.limits.users)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-slate-500">Documents</p>
                <p className="mt-1 text-xl font-semibold text-white">{formatNumber(selectedPlan.limits.documents)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-slate-500">Vendors</p>
                <p className="mt-1 text-xl font-semibold text-white">{formatNumber(selectedPlan.limits.vendors)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-slate-500">Risks</p>
                <p className="mt-1 text-xl font-semibold text-white">{formatNumber(selectedPlan.limits.risks)}</p>
              </div>
            </div>

            <ul className="mt-5 space-y-3 text-sm text-slate-300">
              {selectedPlan.features.slice(0, 6).map((feature) => (
                <li key={feature} className="flex gap-3"><span className="text-emerald-300">✓</span><span>{feature}</span></li>
              ))}
            </ul>

            {organization ? (
              <div className="mt-6">
                <BillingActionButton
                  action="checkout"
                  locale={locale}
                  planId={selectedPlan.id}
                  disabled={selectedPlanIsCurrent}
                  className="flex h-12 w-full items-center justify-center rounded-full bg-white px-6 text-sm font-bold text-black hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/40"
                >
                  {selectedPlanIsCurrent ? 'Current plan' : 'Continue to secure checkout'}
                </BillingActionButton>
                <p className="mt-3 text-center text-xs text-slate-500">Workspace: {organization.name}</p>
              </div>
            ) : user ? (
              <Link href={`/${locale}/onboarding?next=${encodeURIComponent(checkoutContinuationPath)}`} className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-white px-6 text-sm font-bold text-black hover:bg-white/90">
                Create workspace before checkout
              </Link>
            ) : (
              <div className="mt-6 grid gap-3">
                <Link href={`/${locale}/signup?plan=${selectedPlan.id}&next=${encodeURIComponent(checkoutContinuationPath)}`} className="flex h-12 w-full items-center justify-center rounded-full bg-white px-6 text-sm font-bold text-black hover:bg-white/90">
                  Create account and continue
                </Link>
                <Link href={`/${locale}/login?next=${encodeURIComponent(checkoutContinuationPath)}`} className="flex h-12 w-full items-center justify-center rounded-full border border-white/15 px-6 text-sm font-bold hover:bg-white/10">
                  Sign in to continue
                </Link>
              </div>
            )}
          </aside>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-14 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-white/10 bg-slate-950 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Checkout flow</p>
          <h2 className="mt-4 text-3xl font-semibold">A polished handoff, not a generic payment link.</h2>
          <div className="mt-6 grid gap-3">
            {implementationSteps.map((step, index) => (
              <div key={step} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-950">{index + 1}</span>
                <p className="text-sm leading-6 text-slate-300">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {BILLING_PLANS.map((plan) => {
            const isSelected = plan.id === selectedPlan.id;

            return (
              <Link
                key={plan.id}
                href={`/${locale}/checkout?plan=${plan.id}`}
                className={`rounded-[1.5rem] border p-5 transition hover:-translate-y-1 ${isSelected ? 'border-blue-300 bg-white text-slate-950' : 'border-white/10 bg-slate-950 text-white hover:bg-white/[0.04]'}`}
              >
                <p className="text-lg font-semibold">{plan.name}</p>
                <p className={`mt-2 text-3xl font-bold ${isSelected ? 'text-slate-950' : 'text-white'}`}>€{plan.priceMonthly}</p>
                <p className={`mt-2 text-xs ${isSelected ? 'text-slate-600' : 'text-slate-500'}`}>per month</p>
              </Link>
            );
          })}
        </div>
      </section>

      <PublicFooter locale={locale} />
    </main>
  );
}
