import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { roleHasPermission } from '@/lib/security/permissions';
import { getOrganizationEntitlements } from '@/server/billing/entitlements';
import { getAiSystem, listAiSystemHistory } from '@/server/queries/ai-systems';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser, listUserOrganizations } from '@/server/queries/organizations';
import { isPlanAtLeast } from '@/server/queries/subscription';
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

function getEnterpriseReadinessCopy(locale: string) {
  const copy = {
    en: {
      title: 'Enterprise governance view',
      subtitle: 'Operational view for procurement review, risk assessment, vendor diligence and evidence preparation.',
      evidence: 'Evidence pack coverage',
      vendor: 'Vendor due diligence',
      risk: 'Risk review workflow',
      audit: 'System audit timeline',
      emptyEvidence: 'No evidence pack item is linked to this AI system yet. Create an evidence pack from the governance command center.',
      emptyVendor: 'No vendor due diligence checklist is linked yet.',
      emptyRisk: 'No risk review workflow is linked yet.',
      emptyAudit: 'System history appears here after create or reassessment events.',
      openReadiness: 'Open governance center',
      realData: 'Real organization data only',
      ownerLocked: 'Your role can view this governance context, but changes require AI governance management permission.',
    },
    pt: {
      title: 'Visão de governação enterprise',
      subtitle: 'Visão operacional para revisão de procurement, avaliação de risco, due diligence de fornecedores e preparação de evidências.',
      evidence: 'Cobertura do pacote de evidências',
      vendor: 'Due diligence de fornecedor',
      risk: 'Workflow de revisão de risco',
      audit: 'Timeline de auditoria do sistema',
      emptyEvidence: 'Ainda não existe um item de evidência ligado a este sistema de IA. Crie um pacote no centro de governação.',
      emptyVendor: 'Ainda não existe um checklist de fornecedor associado.',
      emptyRisk: 'Ainda não existe um workflow de revisão de risco associado.',
      emptyAudit: 'O histórico aparece aqui após a criação ou reavaliação do sistema.',
      openReadiness: 'Abrir centro de governação',
      realData: 'Apenas dados reais da organização',
      ownerLocked: 'O seu perfil pode consultar este contexto de governação, mas as alterações exigem permissão de gestão de IA.',
    },
  } as const;

  return locale === 'pt' ? copy.pt : copy.en;
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

  const [system, history, memberships, entitlements] = await Promise.all([
    getAiSystem(id, organization.id),
    listAiSystemHistory(id, organization.id),
    listUserOrganizations(user.id),
    getOrganizationEntitlements(organization.id),
  ]);

  if (!system) {
    notFound();
  }

  const currentMembership = memberships.find((membership) => {
    const membershipOrganization = Array.isArray(membership.organizations) ? membership.organizations[0] : membership.organizations;
    return membershipOrganization?.id === organization.id;
  });
  const canManageAiGovernance = roleHasPermission(currentMembership?.role, 'manage_ai_governance');
  const businessWorkflowsEnabled = entitlements.licensed && isPlanAtLeast(entitlements.plan, 'business');
  const enterpriseEvidenceEnabled = entitlements.licensed && isPlanAtLeast(entitlements.plan, 'enterprise');
  const t = getEnterpriseReadinessCopy(locale);
  const hasVendor = Boolean(system.vendor_name);
  const requiresRiskWorkflow = system.risk_level === 'high_risk_review' || system.risk_level === 'prohibited_review';

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

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5" aria-labelledby="ai-system-enterprise-view-title">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-emerald-200/60">{t.realData}</p>
              <h2 id="ai-system-enterprise-view-title" className="mt-2 text-2xl font-semibold">{t.title}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/58">{t.subtitle}</p>
            </div>
            <Link href={`/${locale}/dashboard/organizations#enterprise-command-center`} className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">
              {t.openReadiness}
            </Link>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <h3 className="font-semibold">{t.evidence}</h3>
              <p className="mt-2 text-sm leading-6 text-white/55">{system.obligations.length > 0 ? `${system.obligations.length} obligation signals ready for evidence packaging.` : t.emptyEvidence}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <h3 className="font-semibold">{t.vendor}</h3>
              <p className="mt-2 text-sm leading-6 text-white/55">{hasVendor ? `${system.vendor_name} requires vendor diligence before a procurement-review export is prepared.` : t.emptyVendor}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <h3 className="font-semibold">{t.risk}</h3>
              <p className="mt-2 text-sm leading-6 text-white/55">{requiresRiskWorkflow ? 'High-risk workflow required before approval.' : t.emptyRisk}</p>
            </div>
          </div>
          {!canManageAiGovernance ? <p className="mt-4 rounded-2xl border border-amber-300/15 bg-amber-400/10 p-3 text-sm text-amber-50/80">{t.ownerLocked}</p> : null}
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
              <AiSystemEditForm
                system={system}
                locale={locale}
                businessWorkflowsEnabled={businessWorkflowsEnabled}
                enterpriseEvidenceEnabled={enterpriseEvidenceEnabled}
              />
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
              <h2 className="font-semibold">{t.audit}</h2>
              <div className="mt-3 space-y-3">
                {history.length === 0 ? (
                  <p className="text-sm text-white/50">{t.emptyAudit}</p>
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
