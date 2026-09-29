import Link from 'next/link';
import { CheckCircle2, LockKeyhole } from 'lucide-react';

import { BILLING_PLANS, getBillingPlan } from '@/lib/billing/plans';
import { getCommercialSurfaceCopy } from '@/lib/i18n/commercial-surface-copy';
import { locales, type Locale } from '@/lib/i18n/routing';
import type { OrganizationBillingContext } from '@/server/queries/billing';
import { BillingActionButton } from './billing-action-button';

type BillingPageViewProps = {
  locale: string;
  billing: OrganizationBillingContext;
  canManageBilling: boolean;
  checkout?: string;
  billingError?: string;
};

type BillingCopy = {
  eyebrow: string;
  manageTitle: string;
  reviewTitle: string;
  subtitle: string;
  signals: string[];
  readOnlyTitle: string;
  readOnlyBody: string;
  viewTeam: string;
  actionFailed: string;
  checkoutCompleted: string;
  checkoutCompletedBody: string;
  checkoutCancelled: string;
  checkoutCancelledBody: string;
  currentPlan: string;
  currentPlanDescription: string;
  usageGuidance: string;
  openPortal: string;
  continueToDashboard: string;
  ownerAccessRequired: string;
  availablePlans: string;
  current: string;
  salesLed: string;
  ownerActionRequired: string;
  talkToSales: string;
  upgradePlan: string;
  unlimited: string;
  contactSales: string;
  from: string;
  month: string;
  users: string;
  documents: string;
  vendors: string;
  risks: string;
  included: string;
  noActiveSubscription: string;
  status: Record<string, string>;
};

const billingCopy: Record<Locale, BillingCopy> = {
  en: {
    eyebrow: 'Billing & settings', manageTitle: 'Manage your RISCK COMPLY plan', reviewTitle: 'Review your RISCK COMPLY plan', subtitle: 'Review usage, subscription limits and billing status without exposing internal payment details inside the app.', signals: ['reviewable billing trail', 'role-based billing actions', 'hosted payment portal'], readOnlyTitle: 'Billing is read-only for your role', readOnlyBody: 'Only the workspace owner can open the billing portal or change subscription plans. Ask the owner if a billing change is required.', viewTeam: 'View workspace team', actionFailed: 'Billing action could not be completed', checkoutCompleted: 'Checkout completed', checkoutCompletedBody: 'Your plan will update after the subscription sync finishes.', checkoutCancelled: 'Checkout cancelled', checkoutCancelledBody: 'No billing changes were made.', currentPlan: 'Current plan', currentPlanDescription: 'Subscription status and next billing action.', usageGuidance: 'Review usage and plan limits before making subscription changes.', openPortal: 'Open billing portal', continueToDashboard: 'Continue to dashboard', ownerAccessRequired: 'Owner access required', availablePlans: 'Available plans', current: 'Current', salesLed: 'Sales-led', ownerActionRequired: 'Owner action required', talkToSales: 'Talk to sales', upgradePlan: 'Upgrade plan', unlimited: 'Unlimited', contactSales: 'Contact sales', from: 'From', month: '/month', users: 'users', documents: 'documents', vendors: 'vendors', risks: 'risks', included: 'included', noActiveSubscription: 'No active subscription', status: { active: 'Active', trialing: 'Trialing', past_due: 'Past due', unpaid: 'Unpaid', canceled: 'Canceled', incomplete: 'Incomplete' },
  },
  pt: {
    eyebrow: 'Faturação e definições', manageTitle: 'Gerir o seu plano RISCK COMPLY', reviewTitle: 'Rever o seu plano RISCK COMPLY', subtitle: 'Reveja utilização, limites da subscrição e estado da faturação sem expor detalhes internos de pagamento na aplicação.', signals: ['histórico de faturação revisto', 'ações de faturação por função', 'portal de pagamento alojado'], readOnlyTitle: 'A faturação é apenas de leitura para a sua função', readOnlyBody: 'Apenas o proprietário do espaço de trabalho pode abrir o portal de faturação ou alterar planos. Peça ao proprietário se for necessária uma alteração.', viewTeam: 'Ver equipa do espaço de trabalho', actionFailed: 'Não foi possível concluir a ação de faturação', checkoutCompleted: 'Pagamento concluído', checkoutCompletedBody: 'O plano será atualizado depois de terminar a sincronização da subscrição.', checkoutCancelled: 'Pagamento cancelado', checkoutCancelledBody: 'Nenhuma alteração de faturação foi efetuada.', currentPlan: 'Plano atual', currentPlanDescription: 'Estado da subscrição e próxima ação de faturação.', usageGuidance: 'Reveja utilização e limites antes de alterar a subscrição.', openPortal: 'Abrir portal de faturação', continueToDashboard: 'Continuar para o painel', ownerAccessRequired: 'Acesso do proprietário necessário', availablePlans: 'Planos disponíveis', current: 'Atual', salesLed: 'Assistido por vendas', ownerActionRequired: 'É necessária ação do proprietário', talkToSales: 'Falar com vendas', upgradePlan: 'Alterar plano', unlimited: 'Ilimitado', contactSales: 'Falar com vendas', from: 'Desde', month: '/mês', users: 'utilizadores', documents: 'documentos', vendors: 'fornecedores', risks: 'riscos', included: 'incluídos', noActiveSubscription: 'Sem subscrição ativa', status: { active: 'Ativa', trialing: 'Em período de avaliação', past_due: 'Pagamento em atraso', unpaid: 'Não paga', canceled: 'Cancelada', incomplete: 'Incompleta' },
  },
  es: {
    eyebrow: 'Facturación y ajustes', manageTitle: 'Gestiona tu plan RISCK COMPLY', reviewTitle: 'Revisa tu plan RISCK COMPLY', subtitle: 'Revisa uso, límites de suscripción y estado de facturación sin exponer datos internos de pago.', signals: ['historial de facturación revisable', 'acciones según rol', 'portal de pago alojado'], readOnlyTitle: 'La facturación es de solo lectura para tu rol', readOnlyBody: 'Solo el propietario del espacio de trabajo puede abrir el portal o cambiar planes. Pide al propietario cualquier cambio de facturación.', viewTeam: 'Ver equipo del espacio de trabajo', actionFailed: 'No se pudo completar la acción de facturación', checkoutCompleted: 'Pago completado', checkoutCompletedBody: 'El plan se actualizará cuando termine la sincronización de la suscripción.', checkoutCancelled: 'Pago cancelado', checkoutCancelledBody: 'No se realizaron cambios de facturación.', currentPlan: 'Plan actual', currentPlanDescription: 'Estado de la suscripción y próxima acción de facturación.', usageGuidance: 'Revisa uso y límites antes de cambiar la suscripción.', openPortal: 'Abrir portal de facturación', continueToDashboard: 'Continuar al panel', ownerAccessRequired: 'Se requiere acceso del propietario', availablePlans: 'Planes disponibles', current: 'Actual', salesLed: 'Asistido por ventas', ownerActionRequired: 'Se requiere acción del propietario', talkToSales: 'Hablar con ventas', upgradePlan: 'Cambiar plan', unlimited: 'Ilimitado', contactSales: 'Contactar ventas', from: 'Desde', month: '/mes', users: 'usuarios', documents: 'documentos', vendors: 'proveedores', risks: 'riesgos', included: 'incluidos', noActiveSubscription: 'Sin suscripción activa', status: { active: 'Activa', trialing: 'En prueba', past_due: 'Pago atrasado', unpaid: 'No pagada', canceled: 'Cancelada', incomplete: 'Incompleta' },
  },
  fr: {
    eyebrow: 'Facturation et paramètres', manageTitle: 'Gérez votre plan RISCK COMPLY', reviewTitle: 'Consultez votre plan RISCK COMPLY', subtitle: 'Consultez utilisation, limites d’abonnement et état de facturation sans exposer les détails internes de paiement.', signals: ['historique de facturation vérifiable', 'actions selon le rôle', 'portail de paiement hébergé'], readOnlyTitle: 'La facturation est en lecture seule pour votre rôle', readOnlyBody: 'Seul le propriétaire de l’espace de travail peut ouvrir le portail ou changer de plan. Demandez au propriétaire si une modification est nécessaire.', viewTeam: 'Voir l’équipe de l’espace de travail', actionFailed: 'Impossible de terminer l’action de facturation', checkoutCompleted: 'Paiement terminé', checkoutCompletedBody: 'Le plan sera mis à jour après la synchronisation de l’abonnement.', checkoutCancelled: 'Paiement annulé', checkoutCancelledBody: 'Aucune modification de facturation n’a été effectuée.', currentPlan: 'Plan actuel', currentPlanDescription: 'État de l’abonnement et prochaine action de facturation.', usageGuidance: 'Consultez utilisation et limites avant de modifier l’abonnement.', openPortal: 'Ouvrir le portail de facturation', continueToDashboard: 'Continuer vers le tableau de bord', ownerAccessRequired: 'Accès du propriétaire requis', availablePlans: 'Plans disponibles', current: 'Actuel', salesLed: 'Assisté par les ventes', ownerActionRequired: 'Action du propriétaire requise', talkToSales: 'Contacter les ventes', upgradePlan: 'Changer de plan', unlimited: 'Illimité', contactSales: 'Contacter les ventes', from: 'À partir de', month: '/mois', users: 'utilisateurs', documents: 'documents', vendors: 'fournisseurs', risks: 'risques', included: 'inclus', noActiveSubscription: 'Aucun abonnement actif', status: { active: 'Actif', trialing: 'En essai', past_due: 'Paiement en retard', unpaid: 'Impayé', canceled: 'Annulé', incomplete: 'Incomplet' },
  },
  it: {
    eyebrow: 'Fatturazione e impostazioni', manageTitle: 'Gestisci il tuo piano RISCK COMPLY', reviewTitle: 'Consulta il tuo piano RISCK COMPLY', subtitle: 'Consulta utilizzo, limiti dell’abbonamento e stato di fatturazione senza esporre dettagli interni di pagamento.', signals: ['storico di fatturazione verificabile', 'azioni in base al ruolo', 'portale di pagamento ospitato'], readOnlyTitle: 'La fatturazione è in sola lettura per il tuo ruolo', readOnlyBody: 'Solo il proprietario dello spazio di lavoro può aprire il portale o cambiare piano. Chiedi al proprietario se serve una modifica.', viewTeam: 'Vedi il team dello spazio di lavoro', actionFailed: 'Impossibile completare l’azione di fatturazione', checkoutCompleted: 'Pagamento completato', checkoutCompletedBody: 'Il piano verrà aggiornato al termine della sincronizzazione.', checkoutCancelled: 'Pagamento annullato', checkoutCancelledBody: 'Nessuna modifica di fatturazione effettuata.', currentPlan: 'Piano attuale', currentPlanDescription: 'Stato dell’abbonamento e prossima azione di fatturazione.', usageGuidance: 'Controlla utilizzo e limiti prima di modificare l’abbonamento.', openPortal: 'Apri portale di fatturazione', continueToDashboard: 'Continua al pannello', ownerAccessRequired: 'Accesso del proprietario richiesto', availablePlans: 'Piani disponibili', current: 'Attuale', salesLed: 'Assistito dalle vendite', ownerActionRequired: 'Azione del proprietario richiesta', talkToSales: 'Parla con vendite', upgradePlan: 'Cambia piano', unlimited: 'Illimitato', contactSales: 'Parla con vendite', from: 'Da', month: '/mese', users: 'utenti', documents: 'documenti', vendors: 'fornitori', risks: 'rischi', included: 'inclusi', noActiveSubscription: 'Nessun abbonamento attivo', status: { active: 'Attivo', trialing: 'In prova', past_due: 'Pagamento in ritardo', unpaid: 'Non pagato', canceled: 'Annullato', incomplete: 'Incompleto' },
  },
  de: {
    eyebrow: 'Abrechnung und Einstellungen', manageTitle: 'RISCK COMPLY Plan verwalten', reviewTitle: 'RISCK COMPLY Plan prüfen', subtitle: 'Prüfen Sie Nutzung, Abonnementlimits und Abrechnungsstatus, ohne interne Zahlungsdetails in der App offenzulegen.', signals: ['prüfbarer Abrechnungsverlauf', 'rollenbasierte Abrechnungsaktionen', 'gehostetes Zahlungsportal'], readOnlyTitle: 'Die Abrechnung ist für Ihre Rolle schreibgeschützt', readOnlyBody: 'Nur der Inhaber des Arbeitsbereichs kann das Abrechnungsportal öffnen oder Pläne ändern. Wenden Sie sich für Änderungen an den Inhaber.', viewTeam: 'Team des Arbeitsbereichs ansehen', actionFailed: 'Abrechnungsaktion konnte nicht abgeschlossen werden', checkoutCompleted: 'Zahlung abgeschlossen', checkoutCompletedBody: 'Der Plan wird nach Abschluss der Abonnement-Synchronisierung aktualisiert.', checkoutCancelled: 'Zahlung abgebrochen', checkoutCancelledBody: 'Es wurden keine Abrechnungsänderungen vorgenommen.', currentPlan: 'Aktueller Plan', currentPlanDescription: 'Abonnementstatus und nächste Abrechnungsaktion.', usageGuidance: 'Prüfen Sie Nutzung und Limits vor Änderungen am Abonnement.', openPortal: 'Abrechnungsportal öffnen', continueToDashboard: 'Zum Dashboard', ownerAccessRequired: 'Zugriff des Inhabers erforderlich', availablePlans: 'Verfügbare Pläne', current: 'Aktuell', salesLed: 'Vertriebsgeführt', ownerActionRequired: 'Aktion des Inhabers erforderlich', talkToSales: 'Vertrieb kontaktieren', upgradePlan: 'Plan ändern', unlimited: 'Unbegrenzt', contactSales: 'Vertrieb kontaktieren', from: 'Ab', month: '/Monat', users: 'Nutzer', documents: 'Dokumente', vendors: 'Anbieter', risks: 'Risiken', included: 'enthalten', noActiveSubscription: 'Kein aktives Abonnement', status: { active: 'Aktiv', trialing: 'Testphase', past_due: 'Überfällig', unpaid: 'Unbezahlt', canceled: 'Gekündigt', incomplete: 'Unvollständig' },
  },
};

function safeLocale(locale: string): Locale {
  return (locales.includes(locale as Locale) ? locale : 'en') as Locale;
}

function formatLimitValue(value: number, copy: BillingCopy) {
  if (!Number.isFinite(value) || value <= 0 || value === Number.MAX_SAFE_INTEGER) return copy.unlimited;
  return new Intl.NumberFormat().format(value);
}

function formatStatus(status: string | null, copy: BillingCopy) {
  if (!status) return copy.noActiveSubscription;
  return copy.status[status] ?? status.replaceAll('_', ' ');
}

function formatPlanPrice(plan: (typeof BILLING_PLANS)[number], copy: BillingCopy) {
  if (plan.priceMonthly != null) return `€${plan.priceMonthly}${copy.month}`;
  if (plan.startingPriceMonthly != null) return `${copy.from} €${plan.startingPriceMonthly}${copy.month}`;
  return copy.contactSales;
}

function ReadOnlyBillingNotice({ locale, copy }: { locale: string; copy: BillingCopy }) {
  return (
    <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-sm text-amber-100" role="status">
      <div className="flex items-start gap-3">
        <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">{copy.readOnlyTitle}</p>
          <p className="mt-1 leading-6 text-amber-100/70">{copy.readOnlyBody}</p>
          <Link href={`/${locale}/dashboard/organizations/team`} className="mt-3 inline-flex rounded-md font-semibold text-amber-100 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-100">{copy.viewTeam}</Link>
        </div>
      </div>
    </div>
  );
}

export function BillingPageView({ locale, billing, canManageBilling, checkout, billingError }: BillingPageViewProps) {
  const activeLocale = safeLocale(locale);
  const copy = billingCopy[activeLocale];
  const pricingCopy = getCommercialSurfaceCopy(activeLocale).pricing;
  const currentPlan = getBillingPlan(billing.plan) ?? BILLING_PLANS[0];
  const hasActivePlan = billing.status === 'active' || billing.status === 'trialing';
  const stripeManaged = billing.authority === 'stripe_live';
  const contractManaged = billing.authority === 'signed_contract';

  return (
    <main className="min-h-0 bg-transparent text-white">
      <div className="w-full space-y-6">
        <header className="border-b border-slate-800 pb-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-400">{copy.eyebrow}</p>
          <h1 id="billing-title" className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white">{canManageBilling ? copy.manageTitle : copy.reviewTitle}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{copy.subtitle}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-500">
            {copy.signals.map((label) => (
              <span key={label} className="rounded-md border border-slate-800 bg-[#0d1624] px-2.5 py-1">{label}</span>
            ))}
          </div>
        </header>

        <section className="grid gap-px overflow-hidden rounded-xl border border-slate-800 bg-slate-800 lg:grid-cols-[1fr_auto]" aria-label={copy.currentPlan}>
          <div className="bg-[#0d1624] px-5 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-slate-600">{copy.currentPlan}</p>
              {contractManaged ? <span className="rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-blue-300">{copy.salesLed}</span> : null}
            </div>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-xl font-semibold text-slate-100">{hasActivePlan ? currentPlan.name : copy.noActiveSubscription}</h2>
              <span className="text-xs font-medium text-slate-500">{formatStatus(billing.status, copy)}</span>
            </div>
            <p className="mt-1 text-sm text-slate-400">{copy.currentPlanDescription}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 bg-[#0d1624] px-5 py-4 lg:justify-end">
            {canManageBilling && stripeManaged ? (
              <BillingActionButton action="portal" locale={locale} className="rounded-lg bg-blue-600 text-white hover:bg-blue-500">{copy.openPortal}</BillingActionButton>
            ) : null}
            {canManageBilling && contractManaged ? (
              <Link href={`/${locale}/contact?intent=sales&plan=${currentPlan.id}`} className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">{copy.talkToSales}</Link>
            ) : null}
            {!canManageBilling ? (
              <button type="button" disabled aria-disabled="true" className="h-10 rounded-lg border border-slate-700 px-4 text-sm font-semibold text-slate-500 disabled:cursor-not-allowed">{copy.ownerAccessRequired}</button>
            ) : null}
            {hasActivePlan ? (
              <Link href={`/${locale}/dashboard`} className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/40 px-4 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">{copy.continueToDashboard}</Link>
            ) : null}
          </div>
        </section>

        {!canManageBilling ? <ReadOnlyBillingNotice locale={locale} copy={copy} /> : null}

        {billingError && !contractManaged ? (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.06] p-4 text-rose-100" role="alert">
            <p className="font-semibold">{copy.actionFailed}</p>
            <p className="mt-1 text-sm text-rose-100/70">{billingError}</p>
          </div>
        ) : null}
        {checkout === 'success' ? (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4 text-emerald-100" role="status">
            <p className="font-semibold">{copy.checkoutCompleted}</p>
            <p className="mt-1 text-sm text-emerald-100/70">{copy.checkoutCompletedBody}</p>
          </div>
        ) : null}
        {checkout === 'cancelled' ? (
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-amber-100" role="status">
            <p className="font-semibold">{copy.checkoutCancelled}</p>
            <p className="mt-1 text-sm text-amber-100/70">{copy.checkoutCancelledBody}</p>
          </div>
        ) : null}

        <section className="space-y-3" aria-labelledby="available-plans-title">
          <div className="flex items-center justify-between gap-4">
            <h2 id="available-plans-title" className="text-sm font-semibold text-slate-200">{copy.availablePlans}</h2>
            <span className="text-xs text-slate-600">{BILLING_PLANS.length}</span>
          </div>

          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-4">
            {BILLING_PLANS.map((plan) => {
              const isCurrent = hasActivePlan && plan.id === currentPlan.id;
              const isSalesLed = plan.salesLed;
              const requiresSales = isSalesLed || contractManaged;
              const description = `${pricingCopy.plan[plan.id].description} ${formatLimitValue(plan.limits.users, copy)} ${copy.users}, ${formatLimitValue(plan.limits.documents, copy)} ${copy.documents}, ${formatLimitValue(plan.limits.vendors, copy)} ${copy.vendors} ${copy.included}.`;
              const limitRows = [
                `${formatLimitValue(plan.limits.users, copy)} ${copy.users}`,
                `${formatLimitValue(plan.limits.documents, copy)} ${copy.documents}`,
                `${formatLimitValue(plan.limits.vendors, copy)} ${copy.vendors}`,
                `${formatLimitValue(plan.limits.risks, copy)} ${copy.risks}`,
              ];

              return (
                <article key={plan.id} className={`flex min-h-[360px] flex-col rounded-xl border bg-[#0d1624] p-5 ${isCurrent ? 'border-blue-500/40' : 'border-slate-800'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-slate-100">{plan.name}</h3>
                      <p className="mt-1.5 text-sm leading-6 text-slate-500">{description}</p>
                    </div>
                    {isCurrent ? <span className="rounded-md border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-blue-300">{copy.current}</span> : null}
                    {isSalesLed && !isCurrent ? <span className="rounded-md border border-slate-700 bg-slate-900/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">{copy.salesLed}</span> : null}
                  </div>

                  <p className="mt-5 text-3xl font-semibold tracking-[-0.035em] text-white">{formatPlanPrice(plan, copy)}</p>
                  <ul className="mt-5 divide-y divide-slate-800 border-y border-slate-800 text-sm text-slate-400">
                    {limitRows.map((highlight) => (
                      <li key={highlight} className="flex gap-2 py-2.5">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-500/80" aria-hidden="true" />
                        {highlight}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto pt-5">
                    {!canManageBilling ? (
                      <button type="button" disabled aria-disabled="true" className="h-10 w-full rounded-lg border border-slate-700 px-4 text-sm font-semibold text-slate-500 disabled:cursor-not-allowed">{copy.ownerActionRequired}</button>
                    ) : isCurrent ? (
                      <button type="button" disabled aria-disabled="true" className="h-10 w-full rounded-lg border border-blue-500/20 bg-blue-500/[0.06] px-4 text-sm font-semibold text-blue-300 disabled:cursor-default">{copy.currentPlan}</button>
                    ) : requiresSales ? (
                      <Link href={`/${locale}/contact?intent=sales&plan=${plan.id}`} className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">{copy.talkToSales}</Link>
                    ) : (
                      <BillingActionButton action="checkout" locale={locale} planId={plan.id} requireLegalAcceptance={billing.authority === 'none'} className="w-full rounded-lg bg-blue-600 text-white hover:bg-blue-500">{copy.upgradePlan}</BillingActionButton>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
