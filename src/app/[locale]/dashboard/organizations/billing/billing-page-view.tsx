import Link from 'next/link';
import { CheckCircle2, LockKeyhole } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    eyebrow: 'Faturação e definições', manageTitle: 'Gerir o seu plano RISCK COMPLY', reviewTitle: 'Rever o seu plano RISCK COMPLY', subtitle: 'Reveja utilização, limites da subscrição e estado da faturação sem expor detalhes internos de pagamento na aplicação.', signals: ['histórico de faturação revisto', 'ações de faturação por função', 'portal de pagamento alojado'], readOnlyTitle: 'A faturação é apenas de leitura para a sua função', readOnlyBody: 'Apenas o owner do workspace pode abrir o portal de faturação ou alterar planos. Peça ao owner se for necessária uma alteração.', viewTeam: 'Ver equipa do workspace', actionFailed: 'Não foi possível concluir a ação de faturação', checkoutCompleted: 'Checkout concluído', checkoutCompletedBody: 'O plano será atualizado depois de terminar a sincronização da subscrição.', checkoutCancelled: 'Checkout cancelado', checkoutCancelledBody: 'Nenhuma alteração de faturação foi efetuada.', currentPlan: 'Plano atual', currentPlanDescription: 'Estado da subscrição e próxima ação de faturação.', usageGuidance: 'Reveja utilização e limites antes de alterar a subscrição.', openPortal: 'Abrir portal de faturação', continueToDashboard: 'Continuar para o dashboard', ownerAccessRequired: 'Acesso de owner necessário', availablePlans: 'Planos disponíveis', current: 'Atual', salesLed: 'Assistido por vendas', ownerActionRequired: 'Ação do owner necessária', talkToSales: 'Falar com vendas', upgradePlan: 'Alterar plano', unlimited: 'Ilimitado', contactSales: 'Falar com vendas', from: 'Desde', month: '/mês', users: 'utilizadores', documents: 'documentos', vendors: 'fornecedores', risks: 'riscos', included: 'incluídos', noActiveSubscription: 'Sem subscrição ativa', status: { active: 'Ativa', trialing: 'Em trial', past_due: 'Pagamento em atraso', unpaid: 'Não paga', canceled: 'Cancelada', incomplete: 'Incompleta' },
  },
  es: {
    eyebrow: 'Facturación y ajustes', manageTitle: 'Gestiona tu plan RISCK COMPLY', reviewTitle: 'Revisa tu plan RISCK COMPLY', subtitle: 'Revisa uso, límites de suscripción y estado de facturación sin exponer datos internos de pago.', signals: ['historial de facturación revisable', 'acciones según rol', 'portal de pago alojado'], readOnlyTitle: 'La facturación es de solo lectura para tu rol', readOnlyBody: 'Solo el owner del workspace puede abrir el portal o cambiar planes. Pide al owner cualquier cambio de facturación.', viewTeam: 'Ver equipo del workspace', actionFailed: 'No se pudo completar la acción de facturación', checkoutCompleted: 'Checkout completado', checkoutCompletedBody: 'El plan se actualizará cuando termine la sincronización de la suscripción.', checkoutCancelled: 'Checkout cancelado', checkoutCancelledBody: 'No se realizaron cambios de facturación.', currentPlan: 'Plan actual', currentPlanDescription: 'Estado de la suscripción y próxima acción de facturación.', usageGuidance: 'Revisa uso y límites antes de cambiar la suscripción.', openPortal: 'Abrir portal de facturación', continueToDashboard: 'Continuar al dashboard', ownerAccessRequired: 'Se requiere acceso de owner', availablePlans: 'Planes disponibles', current: 'Actual', salesLed: 'Asistido por ventas', ownerActionRequired: 'Se requiere acción del owner', talkToSales: 'Hablar con ventas', upgradePlan: 'Cambiar plan', unlimited: 'Ilimitado', contactSales: 'Hablar con ventas', from: 'Desde', month: '/mes', users: 'usuarios', documents: 'documentos', vendors: 'proveedores', risks: 'riesgos', included: 'incluidos', noActiveSubscription: 'Sin suscripción activa', status: { active: 'Activa', trialing: 'En prueba', past_due: 'Pago atrasado', unpaid: 'No pagada', canceled: 'Cancelada', incomplete: 'Incompleta' },
  },
  fr: {
    eyebrow: 'Facturation et paramètres', manageTitle: 'Gérez votre plan RISCK COMPLY', reviewTitle: 'Consultez votre plan RISCK COMPLY', subtitle: 'Consultez utilisation, limites d’abonnement et état de facturation sans exposer les détails internes de paiement.', signals: ['historique de facturation vérifiable', 'actions selon le rôle', 'portail de paiement hébergé'], readOnlyTitle: 'La facturation est en lecture seule pour votre rôle', readOnlyBody: 'Seul le owner du workspace peut ouvrir le portail ou changer de plan. Demandez au owner si une modification est nécessaire.', viewTeam: 'Voir l’équipe du workspace', actionFailed: 'Impossible de terminer l’action de facturation', checkoutCompleted: 'Checkout terminé', checkoutCompletedBody: 'Le plan sera mis à jour après la synchronisation de l’abonnement.', checkoutCancelled: 'Checkout annulé', checkoutCancelledBody: 'Aucune modification de facturation n’a été effectuée.', currentPlan: 'Plan actuel', currentPlanDescription: 'État de l’abonnement et prochaine action de facturation.', usageGuidance: 'Consultez utilisation et limites avant de modifier l’abonnement.', openPortal: 'Ouvrir le portail de facturation', continueToDashboard: 'Continuer vers le tableau de bord', ownerAccessRequired: 'Accès owner requis', availablePlans: 'Plans disponibles', current: 'Actuel', salesLed: 'Assisté par les ventes', ownerActionRequired: 'Action du owner requise', talkToSales: 'Contacter les ventes', upgradePlan: 'Changer de plan', unlimited: 'Illimité', contactSales: 'Contacter les ventes', from: 'À partir de', month: '/mois', users: 'utilisateurs', documents: 'documents', vendors: 'fournisseurs', risks: 'risques', included: 'inclus', noActiveSubscription: 'Aucun abonnement actif', status: { active: 'Actif', trialing: 'En essai', past_due: 'Paiement en retard', unpaid: 'Impayé', canceled: 'Annulé', incomplete: 'Incomplet' },
  },
  it: {
    eyebrow: 'Fatturazione e impostazioni', manageTitle: 'Gestisci il tuo piano RISCK COMPLY', reviewTitle: 'Consulta il tuo piano RISCK COMPLY', subtitle: 'Consulta utilizzo, limiti dell’abbonamento e stato di fatturazione senza esporre dettagli interni di pagamento.', signals: ['storico di fatturazione verificabile', 'azioni in base al ruolo', 'portale di pagamento ospitato'], readOnlyTitle: 'La fatturazione è in sola lettura per il tuo ruolo', readOnlyBody: 'Solo l’owner del workspace può aprire il portale o cambiare piano. Chiedi all’owner se serve una modifica.', viewTeam: 'Vedi team del workspace', actionFailed: 'Impossibile completare l’azione di fatturazione', checkoutCompleted: 'Checkout completato', checkoutCompletedBody: 'Il piano verrà aggiornato al termine della sincronizzazione.', checkoutCancelled: 'Checkout annullato', checkoutCancelledBody: 'Nessuna modifica di fatturazione effettuata.', currentPlan: 'Piano attuale', currentPlanDescription: 'Stato dell’abbonamento e prossima azione di fatturazione.', usageGuidance: 'Controlla utilizzo e limiti prima di modificare l’abbonamento.', openPortal: 'Apri portale di fatturazione', continueToDashboard: 'Continua alla dashboard', ownerAccessRequired: 'Accesso owner richiesto', availablePlans: 'Piani disponibili', current: 'Attuale', salesLed: 'Assistito dalle vendite', ownerActionRequired: 'Azione owner richiesta', talkToSales: 'Parla con vendite', upgradePlan: 'Cambia piano', unlimited: 'Illimitato', contactSales: 'Parla con vendite', from: 'Da', month: '/mese', users: 'utenti', documents: 'documenti', vendors: 'fornitori', risks: 'rischi', included: 'inclusi', noActiveSubscription: 'Nessun abbonamento attivo', status: { active: 'Attivo', trialing: 'In prova', past_due: 'Pagamento in ritardo', unpaid: 'Non pagato', canceled: 'Annullato', incomplete: 'Incompleto' },
  },
  de: {
    eyebrow: 'Abrechnung und Einstellungen', manageTitle: 'RISCK COMPLY Plan verwalten', reviewTitle: 'RISCK COMPLY Plan prüfen', subtitle: 'Prüfen Sie Nutzung, Abonnementlimits und Abrechnungsstatus, ohne interne Zahlungsdetails in der App offenzulegen.', signals: ['prüfbarer Abrechnungsverlauf', 'rollenbasierte Abrechnungsaktionen', 'gehostetes Zahlungsportal'], readOnlyTitle: 'Die Abrechnung ist für Ihre Rolle schreibgeschützt', readOnlyBody: 'Nur der Workspace-Owner kann das Abrechnungsportal öffnen oder Pläne ändern. Wenden Sie sich für Änderungen an den Owner.', viewTeam: 'Workspace-Team ansehen', actionFailed: 'Abrechnungsaktion konnte nicht abgeschlossen werden', checkoutCompleted: 'Checkout abgeschlossen', checkoutCompletedBody: 'Der Plan wird nach Abschluss der Abonnement-Synchronisierung aktualisiert.', checkoutCancelled: 'Checkout abgebrochen', checkoutCancelledBody: 'Es wurden keine Abrechnungsänderungen vorgenommen.', currentPlan: 'Aktueller Plan', currentPlanDescription: 'Abonnementstatus und nächste Abrechnungsaktion.', usageGuidance: 'Prüfen Sie Nutzung und Limits vor Änderungen am Abonnement.', openPortal: 'Abrechnungsportal öffnen', continueToDashboard: 'Zum Dashboard', ownerAccessRequired: 'Owner-Zugriff erforderlich', availablePlans: 'Verfügbare Pläne', current: 'Aktuell', salesLed: 'Vertriebsgeführt', ownerActionRequired: 'Owner-Aktion erforderlich', talkToSales: 'Vertrieb kontaktieren', upgradePlan: 'Plan ändern', unlimited: 'Unbegrenzt', contactSales: 'Vertrieb kontaktieren', from: 'Ab', month: '/Monat', users: 'Nutzer', documents: 'Dokumente', vendors: 'Anbieter', risks: 'Risiken', included: 'enthalten', noActiveSubscription: 'Kein aktives Abonnement', status: { active: 'Aktiv', trialing: 'Testphase', past_due: 'Überfällig', unpaid: 'Unbezahlt', canceled: 'Gekündigt', incomplete: 'Unvollständig' },
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
    <div className="rounded-2xl border border-amber-200/20 bg-amber-200/[0.06] p-4 text-sm text-amber-50/90" role="status">
      <div className="flex items-start gap-3">
        <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">{copy.readOnlyTitle}</p>
          <p className="mt-1 leading-6 text-amber-50/70">{copy.readOnlyBody}</p>
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
    <main className="relative min-h-screen space-y-8 overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.18),_transparent_34rem),linear-gradient(180deg,#050505_0%,#080b12_50%,#050505_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 tech-grid opacity-20" />
      <div className="relative mx-auto max-w-7xl space-y-8">
        <section className="premium-card rounded-[2rem] p-6 text-white md:p-8" aria-labelledby="billing-title">
          <div className="grid gap-6 lg:grid-cols-[1.45fr_0.9fr] lg:items-stretch">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/45">{copy.eyebrow}</p>
              <h1 id="billing-title" className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.055em] md:text-5xl">{canManageBilling ? copy.manageTitle : copy.reviewTitle}</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/58 md:text-base">{copy.subtitle}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {copy.signals.map((label) => (
                  <span key={label} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-xs font-medium text-white/55">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> {label}
                  </span>
                ))}
              </div>
              {!canManageBilling ? <div className="mt-6"><ReadOnlyBillingNotice locale={locale} copy={copy} /></div> : null}
              {billingError ? (
                <div className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-100" role="alert">
                  <p className="font-semibold">{copy.actionFailed}</p>
                  <p className="mt-1 text-sm opacity-85">{billingError}</p>
                </div>
              ) : null}
              {checkout === 'success' ? (
                <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-100" role="status">
                  <p className="font-semibold">{copy.checkoutCompleted}</p>
                  <p className="mt-1 text-sm opacity-85">{copy.checkoutCompletedBody}</p>
                </div>
              ) : null}
              {checkout === 'cancelled' ? (
                <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100" role="status">
                  <p className="font-semibold">{copy.checkoutCancelled}</p>
                  <p className="mt-1 text-sm opacity-85">{copy.checkoutCancelledBody}</p>
                </div>
              ) : null}
            </div>

            <Card className="border-white/10 bg-white/[0.055] text-white shadow-none backdrop-blur">
              <CardHeader>
                <CardTitle className="text-2xl tracking-tight">{copy.currentPlan}: {hasActivePlan ? currentPlan.name : copy.noActiveSubscription}</CardTitle>
                <CardDescription className="text-white/55">{copy.currentPlanDescription}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-sm font-semibold text-white/70">{formatStatus(billing.status, copy)}</span>
                <p className="text-sm leading-6 text-white/58">{copy.usageGuidance}</p>
                <div className="flex flex-wrap gap-3">
                  {canManageBilling && hasSubscriptionRecord ? (
                    <BillingActionButton action="portal" locale={locale} className="rounded-full bg-white text-black hover:bg-white/90">{copy.openPortal}</BillingActionButton>
                  ) : null}
                  {!canManageBilling ? (
                    <button type="button" disabled aria-disabled="true" className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white/35 disabled:cursor-not-allowed">{copy.ownerAccessRequired}</button>
                  ) : null}
                  {hasActivePlan ? (
                    <Link href={`/${locale}/dashboard`} className="inline-flex h-10 items-center justify-center rounded-full border border-white/15 px-4 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">{copy.continueToDashboard}</Link>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-3" aria-label={copy.availablePlans}>
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
              <Card key={plan.id} className={`flex flex-col rounded-[1.75rem] border-white/10 bg-white/[0.035] text-white shadow-none ${isCurrent ? 'ring-1 ring-white/40' : ''}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{plan.name}</CardTitle>
                      <CardDescription className="mt-2 text-white/52">{description}</CardDescription>
                    </div>
                    {isCurrent ? <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-black">{copy.current}</span> : null}
                    {isSalesLed && !isCurrent ? <span className="rounded-full border border-cyan-200/30 px-3 py-1 text-xs font-bold text-cyan-100">{copy.salesLed}</span> : null}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-5">
                  <p className="text-4xl font-semibold tracking-[-0.04em]">{formatPlanPrice(plan, copy)}</p>
                  <ul className="space-y-2 text-sm text-white/58">
                    {limitRows.map((highlight) => <li key={highlight} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-white" aria-hidden="true" /> {highlight}</li>)}
                  </ul>
                  {!canManageBilling ? (
                    <button type="button" disabled aria-disabled="true" className="mt-auto h-10 w-full rounded-full border border-white/10 px-4 text-sm font-semibold text-white/35 disabled:cursor-not-allowed">{copy.ownerActionRequired}</button>
                  ) : isSalesLed && !isCurrent ? (
                    <Link href={`/${locale}/contact?intent=sales&plan=${plan.id}`} className="inline-flex h-10 w-full items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-black hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">{copy.talkToSales}</Link>
                  ) : (
                    <BillingActionButton action="checkout" locale={locale} planId={plan.id} className="w-full rounded-full" variant={isCurrent ? 'outline' : 'default'} disabled={isCurrent}>{isCurrent ? copy.currentPlan : copy.upgradePlan}</BillingActionButton>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </section>
      </div>
    </main>
  );
}
