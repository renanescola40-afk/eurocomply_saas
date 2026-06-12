import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CheckCircle2, CircleSlash2, Coins, Crown, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { getOrganizationEntitlements } from '@/server/billing/entitlements';
import { ADD_ON_CATALOG, CREDIT_PACKS, getAddOnStatus, getPlanDisplayName } from '@/lib/billing/addons';
import type { AddOnCatalogItem } from '@/lib/billing/addons';

const statusCopy = {
  included: {
    label: 'Incluído no Premium',
    tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
    icon: CheckCircle2,
    action: 'Já incluído',
  },
  active: {
    label: 'Ativo',
    tone: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-200',
    icon: ShieldCheck,
    action: 'Já ativo',
  },
  inactive: {
    label: 'Não ativo',
    tone: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200',
    icon: CircleSlash2,
    action: 'Comprar adicional',
  },
  blocked: {
    label: 'Bloqueado neste plano',
    tone: 'border-muted bg-muted/50 text-muted-foreground',
    icon: LockKeyhole,
    action: 'Fazer upgrade',
  },
};

function formatPlanRequirement(addOn: AddOnCatalogItem) {
  return getPlanDisplayName(addOn.availableFromPlan);
}

export default async function AddOnsAndCreditsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization?.id) {
    redirect(`/${locale}/eurocomply-home`);
  }

  const entitlements = await getOrganizationEntitlements(organization.id);
  const currentPlan = entitlements.plan;
  const isPremium = currentPlan === 'enterprise';

  // Future hook: when add-on subscription items are persisted, populate this list from Supabase/Stripe sync.
  const activeAddOnIds = [];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_hsl(var(--primary)/0.12),_transparent_32%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.35))]">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-8 md:py-12">
        <section className="overflow-hidden rounded-[2rem] border bg-background/90 shadow-xl shadow-primary/5 backdrop-blur">
          <div className="grid gap-6 p-6 md:grid-cols-[1.25fr_0.75fr] md:p-9">
            <div>
              <Badge className="rounded-full px-3 py-1 uppercase tracking-[0.18em]">
                Add-ons & créditos
              </Badge>
              <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
                Veja o que já está ativo antes de comprar adicionais.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
                Este painel evita compra duplicada: recursos incluídos no Premium aparecem como incluídos, adicionais contratados aparecem como ativos e recursos disponíveis aparecem como não ativos.
              </p>
            </div>
            <div className="rounded-[1.5rem] border bg-muted/30 p-5">
              <p className="text-sm text-muted-foreground">Plano atual</p>
              <div className="mt-2 flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                <h2 className="text-3xl font-semibold">{getPlanDisplayName(currentPlan)}</h2>
              </div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                {isPremium
                  ? 'Todos os add-ons principais estão incluídos no Premium. O cliente não deve comprar o mesmo recurso novamente.'
                  : 'Add-ons não ativos podem ser comprados separadamente sem mudar imediatamente de plano.'}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-[1.75rem] border bg-background/90 p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">Status Premium</p>
            <p className="mt-2 text-3xl font-semibold">{isPremium ? 'Ativo' : 'Não ativo'}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {isPremium ? 'Add-ons principais incluídos no plano.' : 'Premium desbloqueia todos os add-ons principais.'}
            </p>
          </article>
          <article className="rounded-[1.75rem] border bg-background/90 p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">Créditos mensais incluídos</p>
            <p className="mt-2 text-3xl font-semibold">{isPremium ? '5.000' : '0'}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {isPremium ? 'Franquia Premium ativa.' : 'Planos inferiores compram créditos avulsos.'}
            </p>
          </article>
          <article className="rounded-[1.75rem] border bg-background/90 p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">Proteção contra duplicidade</p>
            <p className="mt-2 text-3xl font-semibold">Ativa</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Itens incluídos ou já ativos aparecem bloqueados para nova compra.
            </p>
          </article>
        </section>

        <section className="rounded-[2rem] border bg-background/90 p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Add-ons mensais</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Preços atrativos para planos inferiores, sem tornar a soma dos add-ons mais vantajosa que o Premium.
              </p>
            </div>
            <Badge variant="outline" className="w-fit rounded-full">
              Premium inclui tudo
            </Badge>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {ADD_ON_CATALOG.map((addOn) => {
              const status = getAddOnStatus(currentPlan, addOn, activeAddOnIds);
              const copy = statusCopy[status];
              const Icon = copy.icon;
              const canBuy = status === 'inactive';
              const mustUpgrade = status === 'blocked';

              return (
                <article key={addOn.id} className="flex min-h-[270px] flex-col rounded-[1.5rem] border bg-muted/20 p-5 transition hover:border-primary/35 hover:bg-muted/30">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{addOn.category}</p>
                      <h3 className="mt-2 text-xl font-semibold">{addOn.name}</h3>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${copy.tone}`}>
                      <Icon className="h-3.5 w-3.5" />
                      {copy.label}
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-muted-foreground">{addOn.description}</p>

                  <div className="mt-auto pt-5">
                    <p className="text-2xl font-semibold">€{addOn.priceMonthly}<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Disponível a partir do plano {formatPlanRequirement(addOn)}. Premium: incluído.
                    </p>

                    {canBuy ? (
                      <Link href={`/${locale}/profile#plan`} className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">
                        {copy.action}
                      </Link>
                    ) : mustUpgrade ? (
                      <Link href={`/${locale}/pricing`} className="mt-4 inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-semibold transition hover:bg-muted">
                        {copy.action}
                      </Link>
                    ) : (
                      <button type="button" disabled className="mt-4 inline-flex h-10 cursor-not-allowed items-center justify-center rounded-full border bg-muted/40 px-4 text-sm font-semibold text-muted-foreground">
                        {copy.action}
                      </button>
                    )}
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
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                Créditos servem para consumo adicional, como relatórios, análises assistidas e exportações grandes. Premium já tem franquia mensal ativa; planos inferiores aparecem como sem créditos incluídos.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {CREDIT_PACKS.map((pack) => (
              <article key={pack.id} className="rounded-[1.5rem] border bg-muted/20 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{pack.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{pack.description}</p>
                  </div>
                  <Badge variant={isPremium ? 'default' : 'outline'} className="rounded-full">
                    {isPremium ? 'Extra opcional' : 'Não ativo'}
                  </Badge>
                </div>
                <p className="mt-5 text-3xl font-semibold">€{pack.price}</p>
                <p className="mt-1 text-xs text-muted-foreground">Compra avulsa · {pack.credits.toLocaleString('pt-PT')} créditos</p>
                <Link href={`/${locale}/profile#plan`} className="mt-4 inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-semibold transition hover:bg-muted">
                  {isPremium ? 'Comprar créditos extra' : 'Comprar pacote'}
                </Link>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
