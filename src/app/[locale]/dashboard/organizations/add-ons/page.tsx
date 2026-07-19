import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CheckCircle2, Coins, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { getOrganizationEntitlements } from '@/server/billing/entitlements';
import { listActiveOrganizationAddOns } from '@/server/billing/addons';
import { ADD_ON_CATALOG, CREDIT_PACKS, getAddOnStatus, getPlanDisplayName } from '@/lib/billing/addons';
import { getBillingPlan } from '@/lib/billing/plans';
import type { AddOnId } from '@/lib/billing/addons';

const enterpriseDemoModules = [
  ['Command Center', '/dashboard/organizations/command-center'],
  ['AI Governance', '/ai-systems'],
  ['AI Incidents', '/ai-incidents'],
  ['Evidence & Risk', '/dashboard/organizations/evidence-risk'],
  ['Reports & Governance', '/dashboard/organizations/reports-governance'],
  ['Jornal IA Premium', '/dashboard/organizations/reports-governance/news'],
  ['Enterprise Readiness', '/enterprise-readiness'],
  ['Audit Pack', '/audit-pack'],
  ['Vendor Assurance', '/vendor-assurance'],
  ['Compliance Calendar', '/calendario-compliance'],
  ['Security Questionnaire', '/security-questionnaire'],
  ['Documentos', '/dashboard/organizations/documents'],
] as const;

const enterpriseDemoEnabled = process.env.NEXT_PUBLIC_ENABLE_ENTERPRISE_DEMO === 'true';

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ demo?: string; plan?: string }>;
};

export default async function AddOnsAndCreditsPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const query = searchParams ? await searchParams : {};
  const requestedEnterpriseDemo = query.demo === 'enterprise' || query.demo === 'premium';
  const isEnterpriseDemo = enterpriseDemoEnabled && requestedEnterpriseDemo;
  const selectedPlan = query.plan ? getBillingPlan(query.plan) : undefined;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization?.id) {
    redirect(`/${locale}/risck-comply-home`);
  }

  const entitlements = await getOrganizationEntitlements(organization.id);
  const activeAddOnIds: AddOnId[] = isEnterpriseDemo ? [] : await listActiveOrganizationAddOns(organization.id);
  const currentPlan = isEnterpriseDemo ? ('enterprise' as const) : entitlements.plan;
  const isPremium = currentPlan === 'enterprise';
  const activeAddOnCount = activeAddOnIds.length;
  const selectedPlanDiffers = selectedPlan && selectedPlan.id !== currentPlan;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_hsl(var(--primary)/0.12),_transparent_32%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.35))]">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-8 md:py-12">
        {requestedEnterpriseDemo && !enterpriseDemoEnabled ? (
          <section className="rounded-[1.5rem] border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100">
            Enterprise demo is disabled in this environment. Set NEXT_PUBLIC_ENABLE_ENTERPRISE_DEMO=true only for controlled sales/demo deployments.
          </section>
        ) : null}

        {query.plan && !selectedPlan ? (
          <section className="rounded-[1.5rem] border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100">
            Plano solicitado inválido. A página está mostrando o estado real da organização.
          </section>
        ) : null}

        {selectedPlanDiffers ? (
          <section className="rounded-[1.75rem] border border-primary/25 bg-primary/10 p-5 shadow-sm md:p-6">
            <Badge variant="outline" className="rounded-full bg-background/80">Plano selecionado para revisão</Badge>
            <div className="mt-3 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">{selectedPlan.name} ainda não está ativo nesta organização.</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  Esta é uma intenção de compra/revisão enviada pelo pricing ou onboarding. Ela não desbloqueia permissões, add-ons ou demo. Para ativar, o checkout real e o webhook de cobrança precisam confirmar a assinatura.
                </p>
              </div>
              <div className="rounded-2xl border bg-background/80 p-4 text-right">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Preço do plano</p>
                <p className="mt-1 text-3xl font-semibold">€{selectedPlan.priceMonthly}<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href={`/${locale}/pricing`} className="inline-flex h-10 items-center justify-center rounded-full border bg-background px-4 text-sm font-semibold transition hover:bg-muted">
                Voltar ao pricing
              </Link>
              <Link href={`/${locale}/dashboard/organizations?plan=${selectedPlan.id}`} className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">
                Continuar revisão do plano
              </Link>
            </div>
          </section>
        ) : null}

        <section className="rounded-[2rem] border bg-background/90 p-6 shadow-xl shadow-primary/5 md:p-9">
          <Badge className="rounded-full px-3 py-1 uppercase tracking-[0.18em]">
            {isEnterpriseDemo ? 'Enterprise demo' : 'Add-ons & créditos'}
          </Badge>
          <div className="mt-5 grid gap-6 md:grid-cols-[1.4fr_0.6fr] md:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
                {isEnterpriseDemo ? 'Entrada Premium para visualizar todas as funcionalidades.' : 'Veja o que já está ativo antes de comprar adicionais.'}
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
                {isEnterpriseDemo
                  ? 'Simulação comercial do pacote Enterprise/Premium completo, sem alterar Stripe, assinatura real ou permissões de produção.'
                  : 'Recursos incluídos no Premium aparecem como incluídos, adicionais contratados aparecem como ativos e recursos disponíveis aparecem como não ativos.'}
              </p>
            </div>
            <div className="rounded-[1.5rem] border bg-muted/30 p-5">
              <p className="text-sm text-muted-foreground">Plano visualizado</p>
              <div className="mt-2 flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                <h2 className="text-3xl font-semibold">{isEnterpriseDemo ? 'Enterprise Demo' : getPlanDisplayName(currentPlan)}</h2>
              </div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                {isPremium ? 'Add-ons principais e franquia Premium incluídos.' : `${activeAddOnCount} add-on(s) ativo(s) nesta organização.`}
              </p>
            </div>
          </div>
        </section>

        {isEnterpriseDemo ? (
          <section className="rounded-[2rem] border bg-background/90 p-6 shadow-sm md:p-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <Badge variant="outline" className="rounded-full">Vitrine Enterprise</Badge>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight">Mapa rápido dos módulos Premium</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  Use estes atalhos para abrir cada módulo e verificar a experiência do plano mais caro.
                </p>
              </div>
              <Link href={`/${locale}/pricing`} className="inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-semibold transition hover:bg-muted">
                Ver pricing
              </Link>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {enterpriseDemoModules.map(([title, href]) => (
                <Link key={title} href={`/${locale}${href}`} className="rounded-2xl border bg-muted/20 p-4 text-sm font-semibold transition hover:border-primary/40 hover:bg-muted/40">
                  {title}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-[1.75rem] border bg-background/90 p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">Status Premium</p>
            <p className="mt-2 text-3xl font-semibold">{isPremium ? 'Ativo' : 'Não ativo'}</p>
            <p className="mt-2 text-sm text-muted-foreground">{isPremium ? 'Add-ons principais incluídos no plano.' : 'Premium desbloqueia todos os add-ons principais.'}</p>
          </article>
          <article className="rounded-[1.75rem] border bg-background/90 p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">Add-ons ativos</p>
            <p className="mt-2 text-3xl font-semibold">{isPremium ? 'Todos' : activeAddOnCount}</p>
            <p className="mt-2 text-sm text-muted-foreground">{isPremium ? 'Franquia Premium ativa.' : 'Lidos da tabela organization_add_ons quando disponível.'}</p>
          </article>
          <article className="rounded-[1.75rem] border bg-background/90 p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">Proteção contra duplicidade</p>
            <p className="mt-2 text-3xl font-semibold">Ativa</p>
            <p className="mt-2 text-sm text-muted-foreground">Itens incluídos ou já ativos aparecem bloqueados para nova compra.</p>
          </article>
        </section>

        <section className="rounded-[2rem] border bg-background/90 p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Add-ons mensais</h2>
              <p className="mt-1 text-sm text-muted-foreground">Premium inclui todos os add-ons principais.</p>
            </div>
            <Badge variant="outline" className="w-fit rounded-full">Premium inclui tudo</Badge>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {ADD_ON_CATALOG.map((addOn) => {
              const status = getAddOnStatus(currentPlan, addOn, activeAddOnIds);
              const statusLabel = status === 'included' ? 'Incluído no Premium' : status === 'active' ? 'Ativo' : status === 'blocked' ? 'Bloqueado neste plano' : 'Não ativo';
              return (
                <article key={addOn.id} className="flex min-h-[250px] flex-col rounded-[1.5rem] border bg-muted/20 p-5 transition hover:border-primary/35 hover:bg-muted/30">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{addOn.category}</p>
                      <h3 className="mt-2 text-xl font-semibold">{addOn.name}</h3>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold text-primary">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {statusLabel}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">{addOn.description}</p>
                  <div className="mt-auto pt-5">
                    <p className="text-2xl font-semibold">€{addOn.priceMonthly}<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
                    <p className="mt-1 text-xs text-muted-foreground">Premium: incluído.</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-[2rem] border bg-background/90 p-6 shadow-sm md:p-8">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary"><Coins className="h-5 w-5" /></div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Créditos avulsos</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">Créditos servem para consumo adicional, como relatórios, análises assistidas e exportações grandes.</p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {CREDIT_PACKS.map((pack) => (
              <article key={pack.id} className="rounded-[1.5rem] border bg-muted/20 p-5">
                <h3 className="font-semibold">{pack.name}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{pack.description}</p>
                <p className="mt-5 text-2xl font-semibold">€{pack.price}</p>
                <p className="mt-1 text-xs text-muted-foreground">{pack.credits.toLocaleString('pt-PT')} créditos</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
