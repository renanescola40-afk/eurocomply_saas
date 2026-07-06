import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { roleHasPermission } from '@/lib/security/permissions';
import { getAiSystem, listAiSystemHistory } from '@/server/queries/ai-systems';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser, listUserOrganizations } from '@/server/queries/organizations';
import { AiSystemEditForm } from './ai-system-edit-form';

type AiSystemDetailPageProps = {
  params: Promise<{ locale: string; id: string }>;
};

function riskTone(level: string) {
  if (level === 'prohibited_review') return 'border-red-500/30 bg-red-500/10 text-red-200';
  if (level === 'high_risk_review') return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
  if (level === 'limited_transparency') return 'border-blue-500/30 bg-blue-500/10 text-blue-100';
  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100';
}

export default async function AiSystemDetailPage({ params }: AiSystemDetailPageProps) {
  const { locale, id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const organization = await getCurrentOrganizationForUser(user.id);
  if (!organization) {
    redirect(`/${locale}/onboarding`);
  }

  const [system, history, memberships] = await Promise.all([
    getAiSystem(id, organization.id),
    listAiSystemHistory(id, organization.id),
    listUserOrganizations(user.id),
  ]);

  if (!system) {
    notFound();
  }

  const currentMembership = memberships.find((membership) => {
    const membershipOrganization = Array.isArray(membership.organizations) ? membership.organizations[0] : membership.organizations;
    return membershipOrganization?.id === organization.id;
  });
  const canManageAiGovernance = roleHasPermission(currentMembership?.role, 'manage_ai_governance');

  return (
    <main className="min-h-screen bg-[#050505] px-5 py-8 text-white lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Link href={`/${locale}/ai-systems`} className="text-sm text-white/55 hover:text-white">← AI inventory</Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">{system.name}</h1>
            <p className="mt-2 max-w-3xl text-white/55">{system.classification_summary}</p>
          </div>
          <Badge variant="outline" className={`w-fit rounded-full px-3 py-1 ${riskTone(system.risk_level)}`}>
            {system.risk_level}
          </Badge>
        </div>

        <section className="grid gap-4 md:grid-cols-4">
          {[
            ['Status', system.lifecycle_status],
            ['Owner', system.owner_team ?? 'Unassigned'],
            ['Category', system.category ?? system.risk_domain],
            ['Country / market', system.country_market ?? 'Not set'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/40">{label}</p>
              <p className="mt-2 font-medium">{value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_0.75fr]">
          <div className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <h2 className="text-xl font-semibold">System facts</h2>
              <dl className="mt-4 grid gap-3 md:grid-cols-2">
                {[
                  ['Vendor', system.vendor_name ?? 'Not set'],
                  ['Model', system.model_name ?? 'Not set'],
                  ['Role', system.role],
                  ['Risk domain', system.risk_domain],
                  ['Last reassessed', system.last_reassessed_at ?? 'Not reassessed yet'],
                  ['Created', system.created_at],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <dt className="text-xs uppercase tracking-[0.18em] text-white/35">{label}</dt>
                    <dd className="mt-1 text-sm text-white/75">{value}</dd>
                  </div>
                ))}
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3 md:col-span-2">
                  <dt className="text-xs uppercase tracking-[0.18em] text-white/35">Data processed</dt>
                  <dd className="mt-1 text-sm text-white/75">{system.processed_data ?? 'Not set'}</dd>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3 md:col-span-2">
                  <dt className="text-xs uppercase tracking-[0.18em] text-white/35">Use case</dt>
                  <dd className="mt-1 text-sm text-white/75">{system.use_case}</dd>
                </div>
              </dl>
            </div>

            {canManageAiGovernance ? (
              <AiSystemEditForm system={system} />
            ) : (
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <h2 className="text-xl font-semibold">Reassessment locked</h2>
                <p className="mt-2 text-sm text-white/60">
                  Your organization role can view this AI system, but reassessment changes require AI governance management permission.
                </p>
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <h2 className="font-semibold">Next actions</h2>
              <ul className="mt-3 space-y-2 text-sm text-white/60">
                {system.next_actions.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <h2 className="font-semibold">Required documents / obligations</h2>
              <ul className="mt-3 space-y-2 text-sm text-white/60">
                {system.obligations.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <h2 className="font-semibold">History</h2>
              <div className="mt-3 space-y-3">
                {history.length === 0 ? (
                  <p className="text-sm text-white/50">No history events yet.</p>
                ) : history.map((event) => (
                  <div key={event.id} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <p className="text-sm font-medium">{event.action}</p>
                    <p className="mt-1 text-xs text-white/45">{new Date(event.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
