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
    eyebrow: 'Facturación y ajustes', manageTitle: 'Gestiona tu plan RISCK COMPLY', reviewTitle: 'Revisa tu plan RISCK COMPLY', subtitle: 'Revisa uso, límites de suscripción y estado de facturación sin exponer datos internos de pago.', signals: ['historial de facturación revisable', 'acciones según rol', 'portal de pago alojado'], readOnlyTitle: 'La facturación es de solo lectura para tu rol', readOnlyBody: 'Solo el propietario del espacio de trabajo puede abrir el portal o cambiar planes. Pide al propietario cualquier cambio de facturación.', viewTeam: 'Ver equipo del espacio de trabajo', actionFailed: 'No se pudo completar la acción de facturación', checkoutCompleted: 'Pago completado', checkoutCompletedBody: 'El plan se actualizará cuando termine la sincronización de la suscripción.', checkoutCancelled: 'Pago cancelado', checkoutCancelledBody: 'No se realizaron cambios de facturación.', currentPlan: 'Plan actual', currentPlanDescription: 'Estado de la suscripción y próxima acción de facturación.', usageGuidance: 'Revisa uso y límites antes de cambiar la suscripción.', openPortal: 'Abrir portal de facturación', continueToDashboard: 'Continuar al panel', ownerAccessRequired: 'Se requiere acceso del propietario', availablePlans: 'Planes disponibles', current: 'Actual', salesLed: 'Asistido por ventas', ownerActionRequired: 'Se requiere acción del propietario', talkToSales: 'Hablar con ventas', upgradePlan: 'Cambiar plan', unlimited: 'Ilimitado', contactSales: 'Hablar con ventas', from: 'Desde', month: '/mes', users: 'usuarios', documents: 'documentos', vendors: 'proveedores', risks: 'riesgos', included: 'incluidos', noActiveSubscription: 'Sin suscripción activa', status: { active: 'Activa', trialing: 'En prueba', past_due: 'Pago atrasado', unpaid: 'No pagada', canceled: 'Cancelada', incomplete: 'Incompleta' },
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
    <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm text-amber-50/88" role="status">
      <div className="flex items-start gap-3">
        <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">{copy.readOnlyTitle}</p>
          <p className="mt-1 leading-6 text-amber-50/68">{copy.readOnlyBody}</p>
          <Link href={`/${locale}/dashboard/organizations/team`} className="mt-3 inline-flex rounded-md font-semibold text-amber-50 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-100">{copy.viewTeam}</Link>
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
  const hasSubscriptionRecord = billing.status !== null;

  return (
    <main className="min-h-0 bg-transparent text-white">
      <div className="w-full space-y-6">
        <header className="grid gap-5 border-b border-white/[0.065] pb-5 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-end">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">{copy.eyebrow}</p>
            <h1 id="billing-title" className="mt-2 max-w-3xl text-3xl font-semibold tracking-[-0.035em]">{canManageBilling ? copy.manageTitle : copy.reviewTitle}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">{copy.subtitle}</p>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-white/40">
              {copy.signals.map((label) => (
                <span key={label} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300/70" aria-hidden="true" /> {label}
                </span>
              ))}
            </div>
          </div>

          <section className="rounded-xl border border-white/[0.075] bg-[#101715] p-4" aria-label={copy.currentPlan}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/34">{copy.currentPlan}</p>
                <h2 className="mt-1.5 truncate text-lg font-semibold text-white/88">{hasActivePlan ? currentPlan.name : copy.noActiveSubscription}</h2>
              </div>
              <span className="shrink-0 rounded-lg border border-emerald-300/15 bg-emerald-300/[0.055] px-2.5 py-1 text-xs font-semibold text-emerald-100/80">{formatStatus(billing.status, copy)}</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-white/43">{copy.currentPlanDescription}</p>
            <p className="mt-2 text-xs leading-5 text-white/34">{copy.usageGuidance}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {canManageBilling && hasSubscriptionRecord ? (
                <BillingActionButton action="portal" locale={locale} className="rounded-xl bg-emerald-300 text-[#06100d] hover:bg-emerald-200">{copy.openPortal}</BillingActionButton>
              ) : null}
              {!canManageBilling ? (
                <button type="button" disabled aria-disabled="true" className="rounded-xl border border-white/[0.08] px-4 py-2 text-sm font-semibold text-white/35 disabled:cursor-not-allowed">{copy.ownerAccessRequired}</button>
              ) : null}
              {hasActivePlan ? (
                <Link href={`/${locale}/dashboard`} className="inline-flex h-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 text-sm font-semibold text-white/65 transition hover:bg-white/[0.055] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60">{copy.continueToDashboard}</Link>
              ) : null}
            </div>
          </section>
        </header>

        {!canManageBilling ? <ReadOnlyBillingNotice locale={locale} copy={copy} /> : null}

        {billingError ? (
          <div className="rounded-xl border border-rose-400/25 bg-rose-400/[0.08] p-4 text-rose-100" role="alert">
            <p className="font-semibold">{copy.actionFailed}</p>
            <p className="mt-1 text-sm opacity-80">{billingError}</p>
          </div>
        ) : null}
        {checkout === 'success' ? (
          <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.06] p-4 text-emerald-100" role="status">
            <p className="font-semibold">{copy.checkoutCompleted}</p>
            <p className="mt-1 text-sm opacity-80">{copy.checkoutCompletedBody}</p>
          </div>
        ) : null}
        {checkout === 'cancelled' ? (
          <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-amber-100" role="status">
            <p className="font-semibold">{copy.checkoutCancelled}</p>
            <p className="mt-1 text-sm opacity-80">{copy.checkoutCancelledBody}</p>
          </div>
        ) : null}

        <section className="space-y-3" aria-labelledby="available-plans-title">
          <div className="flex items-center justify-between gap-4">
            <h2 id="available-plans-title" className="text-sm font-semibold text-white/84">{copy.availablePlans}</h2>
            <span className="text-xs text-white/30">{BILLING_PLANS.length}</span>
          </div>

          <div className="grid gap-3 xl:grid-cols-3">
            {BILLING_PLANS.map((plan) => {
              const isCurrent = hasActivePlan && plan.id === currentPlan.id;
              const isSalesLed = plan.salesLed;
              const description = `${pricingCopy.plan[plan.id].description} ${formatLimitValue(plan.limits.users, copy)} ${copy.users}, ${formatLimitValue(plan.limits.documents, copy)} ${copy.documents}, ${formatLimitValue(plan.limits.vendors, copy)} ${copy.vendors} ${copy.included}.`;
              const limitRows = [
                `${formatLimitValue(plan.limits.users, copy)} ${copy.users}`,
                `${formatLimitValue(plan.limits.documents, copy)} ${copy.documents}`,
                `${formatLimitValue(plan.limits.vendors, copy)} ${copy.vendors}`,
                `${formatLimitValue(plan.limits.risks, copy)} ${copy.risks}`,
              ];

              return (
                <article key={plan.id} className={`flex flex-col rounded-xl border bg-[#101715] p-5 ${isCurrent ? 'border-emerald-300/25' : 'border-white/[0.075]'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-white/88">{plan.name}</h3>
                      <p className="mt-1.5 text-sm leading-6 text-white/42">{description}</p>
                    </div>
                    {isCurrent ? <span className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.08] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-100">{copy.current}</span> : null}
                    {isSalesLed && !isCurrent ? <span className="rounded-lg border border-white/[0.08] bg-white/[0.025] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white/48">{copy.salesLed}</span> : null}
                  </div>

                  <p className="mt-5 text-3xl font-semibold tracking-[-0.035em] text-white">{formatPlanPrice(plan, copy)}</p>
                  <ul className="mt-5 divide-y divide-white/[0.05] border-y border-white/[0.05] text-sm text-white/50">
                    {limitRows.map((highlight) => (
                      <li key={highlight} className="flex gap-2 py-2.5">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300/75" aria-hidden="true" />
                        {highlight}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto pt-5">
                    {!canManageBilling ? (
                      <button type="button" disabled aria-disabled="true" className="h-10 w-full rounded-xl border border-white/[0.08] px-4 text-sm font-semibold text-white/35 disabled:cursor-not-allowed">{copy.ownerActionRequired}</button>
                    ) : isSalesLed && !isCurrent ? (
                      <Link href={`/${locale}/contact?intent=sales&plan=${plan.id}`} className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-emerald-300 px-4 text-sm font-semibold text-[#06100d] transition hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60">{copy.talkToSales}</Link>
                    ) : (
                      <BillingActionButton action="checkout" locale={locale} planId={plan.id} className={`w-full rounded-xl ${isCurrent ? '' : 'bg-emerald-300 text-[#06100d] hover:bg-emerald-200'}`} variant={isCurrent ? 'outline' : 'default'} disabled={isCurrent}>{isCurrent ? copy.currentPlan : copy.upgradePlan}</BillingActionButton>
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
