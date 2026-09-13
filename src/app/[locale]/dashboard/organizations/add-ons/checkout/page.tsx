import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, CreditCard, ReceiptText, ShieldCheck } from 'lucide-react';

import { AddOnPurchaseClient } from './add-on-purchase-client';
import { getBillingAddOn } from '@/lib/billing/add-ons';
import { getPlanDisplayName } from '@/lib/billing/addons';
import { roleHasPermission } from '@/lib/security/permissions';
import { getOrganizationRoleForUser } from '@/server/auth/permissions';
import { isAddOnCheckoutEnabled } from '@/server/billing/add-on-release';
import { getAddOnPurchasePreview, isAddOnPurchaseError } from '@/server/billing/add-on-purchase';
import { getOrganizationEntitlements } from '@/server/billing/entitlements';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { normalizePlan } from '@/server/queries/subscription';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ addon?: string; quantity?: string }>;
};

function copy(locale: string) {
  switch (locale) {
    case 'pt':
      return {
        eyebrow: 'Compra segura de add-on', title: 'Rever e confirmar',
        body: 'Confirme os detalhes antes de alterar a sua subscrição. O acesso só será ativado depois de o Stripe confirmar o pagamento e o webhook assinado reconciliar o add-on.',
        currentPlan: 'Plano atual', organization: 'Organização', monthly: 'Preço recorrente', annualReference: 'Referência anual',
        subtotal: 'Subtotal / proration', tax: 'Impostos calculados', dueNow: 'Total devido agora', recurring: 'Recorrente depois da compra',
        month: '/mês', year: '/ano', secure: 'Pagamento processado pelo Stripe. A RISCK COMPLY não recebe nem armazena os dados brutos do cartão.',
        providerTotal: 'O valor final é calculado pelo Stripe com base no momento da compra, proration e impostos aplicáveis.',
        back: 'Voltar para Integrações', unavailable: 'Este add-on não está disponível para compra self-service neste momento.',
        locked: 'A compra permanece bloqueada até os gates de billing base, exact-SHA de Produção e autorização final estarem aceitos.',
        admin: 'Apenas Owner ou Admin com permissão de faturação pode comprar add-ons.', quantity: 'Quantidade',
      };
    case 'es':
      return {
        eyebrow: 'Compra segura de add-on', title: 'Revisar y confirmar',
        body: 'Confirma los detalles antes de cambiar tu suscripción. El acceso solo se activa después de que Stripe confirme el pago y el webhook firmado reconcilie el add-on.',
        currentPlan: 'Plan actual', organization: 'Organización', monthly: 'Precio recurrente', annualReference: 'Referencia anual', subtotal: 'Subtotal / prorrateo', tax: 'Impuestos calculados', dueNow: 'Total a pagar ahora', recurring: 'Recurrente después de la compra', month: '/mes', year: '/año', secure: 'Pago procesado por Stripe. RISCK COMPLY no recibe ni almacena datos brutos de la tarjeta.', providerTotal: 'Stripe calcula el importe final según el momento de compra, el prorrateo y los impuestos aplicables.', back: 'Volver a Integraciones', unavailable: 'Este add-on no está disponible para compra de autoservicio en este momento.', locked: 'La compra permanece bloqueada hasta aceptar billing base, exact-SHA de Producción y autorización final.', admin: 'Solo un Owner o Admin con permiso de facturación puede comprar add-ons.', quantity: 'Cantidad',
      };
    case 'fr':
      return {
        eyebrow: 'Achat sécurisé d’add-on', title: 'Vérifier et confirmer',
        body: 'Vérifiez les détails avant de modifier votre abonnement. L’accès ne sera activé qu’après confirmation du paiement par Stripe et rapprochement du webhook signé.',
        currentPlan: 'Forfait actuel', organization: 'Organisation', monthly: 'Prix récurrent', annualReference: 'Référence annuelle', subtotal: 'Sous-total / prorata', tax: 'Taxes calculées', dueNow: 'Total dû maintenant', recurring: 'Récurrent après achat', month: '/mois', year: '/an', secure: 'Paiement traité par Stripe. RISCK COMPLY ne reçoit ni ne stocke les données brutes de carte.', providerTotal: 'Le montant final est calculé par Stripe selon le moment de l’achat, le prorata et les taxes applicables.', back: 'Retour aux Intégrations', unavailable: 'Cet add-on n’est pas disponible en achat libre-service pour le moment.', locked: 'L’achat reste bloqué jusqu’à validation du billing de base, du SHA exact de Production et de l’autorisation finale.', admin: 'Seul un Owner ou Admin autorisé à gérer la facturation peut acheter des add-ons.', quantity: 'Quantité',
      };
    case 'it':
      return {
        eyebrow: 'Acquisto sicuro add-on', title: 'Rivedi e conferma',
        body: 'Conferma i dettagli prima di modificare l’abbonamento. L’accesso sarà attivato solo dopo la conferma del pagamento Stripe e la riconciliazione del webhook firmato.',
        currentPlan: 'Piano attuale', organization: 'Organizzazione', monthly: 'Prezzo ricorrente', annualReference: 'Riferimento annuale', subtotal: 'Subtotale / prorata', tax: 'Imposte calcolate', dueNow: 'Totale dovuto ora', recurring: 'Ricorrente dopo l’acquisto', month: '/mese', year: '/anno', secure: 'Pagamento elaborato da Stripe. RISCK COMPLY non riceve né conserva i dati grezzi della carta.', providerTotal: 'Stripe calcola il totale finale in base al momento dell’acquisto, al prorata e alle imposte applicabili.', back: 'Torna a Integrazioni', unavailable: 'Questo add-on non è attualmente disponibile per l’acquisto self-service.', locked: 'L’acquisto resta bloccato finché billing base, exact-SHA di Produzione e autorizzazione finale non sono accettati.', admin: 'Solo Owner o Admin con permesso di fatturazione può acquistare add-on.', quantity: 'Quantità',
      };
    case 'de':
      return {
        eyebrow: 'Sicherer Add-on-Kauf', title: 'Prüfen und bestätigen',
        body: 'Prüfen Sie die Details vor der Änderung des Abonnements. Zugriff wird erst nach Stripe-Zahlungsbestätigung und Abgleich des signierten Webhooks aktiviert.',
        currentPlan: 'Aktueller Plan', organization: 'Organisation', monthly: 'Wiederkehrender Preis', annualReference: 'Jahresreferenz', subtotal: 'Zwischensumme / Proration', tax: 'Berechnete Steuern', dueNow: 'Jetzt fälliger Gesamtbetrag', recurring: 'Wiederkehrend nach Kauf', month: '/Monat', year: '/Jahr', secure: 'Zahlung wird von Stripe verarbeitet. RISCK COMPLY erhält oder speichert keine Rohkartendaten.', providerTotal: 'Stripe berechnet den endgültigen Betrag anhand Kaufzeitpunkt, Proration und anwendbarer Steuern.', back: 'Zurück zu Integrationen', unavailable: 'Dieses Add-on ist derzeit nicht im Self-Service kaufbar.', locked: 'Der Kauf bleibt gesperrt, bis Basis-Billing, exakter Produktions-SHA und endgültige Freigabe akzeptiert sind.', admin: 'Nur Owner oder Admins mit Billing-Berechtigung können Add-ons kaufen.', quantity: 'Menge',
      };
    default:
      return {
        eyebrow: 'Secure add-on purchase', title: 'Review and confirm',
        body: 'Confirm the details before changing your subscription. Access activates only after Stripe confirms payment and the signed webhook reconciles the add-on.',
        currentPlan: 'Current plan', organization: 'Organization', monthly: 'Recurring price', annualReference: 'Annual reference', subtotal: 'Subtotal / proration', tax: 'Calculated tax', dueNow: 'Total due now', recurring: 'Recurring after purchase', month: '/month', year: '/year', secure: 'Payment is processed by Stripe. RISCK COMPLY does not receive or store raw card details.', providerTotal: 'Stripe calculates the final amount from purchase timing, proration and applicable tax.', back: 'Back to Integrations', unavailable: 'This add-on is not available for self-service purchase right now.', locked: 'Purchase remains locked until base billing, the exact Production SHA and final authorization are accepted.', admin: 'Only an Owner or Admin with billing permission can buy add-ons.', quantity: 'Quantity',
      };
  }
}

function formatMoney(cents: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
}

export default async function AddOnCheckoutPage({ params, searchParams }: PageProps) {
  noStore();
  const { locale } = await params;
  const query = searchParams ? await searchParams : {};
  const text = copy(locale);
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const organization = await getCurrentOrganizationForUser(user.id);
  if (!organization?.id) redirect(`/${locale}/risck-comply-home`);

  const addOn = getBillingAddOn(query.addon);
  if (!addOn) redirect(`/${locale}/dashboard/organizations/add-ons`);

  const [role, entitlements] = await Promise.all([
    getOrganizationRoleForUser(organization.id, user.id),
    getOrganizationEntitlements(organization.id),
  ]);
  const canManageBilling = roleHasPermission(role, 'manage_billing');
  const checkoutEnabled = isAddOnCheckoutEnabled();
  const quantityValue = Number(query.quantity ?? '1');
  const quantity = Number.isInteger(quantityValue) && quantityValue > 0 && quantityValue <= 10_000 ? quantityValue : 1;

  let preview: Awaited<ReturnType<typeof getAddOnPurchasePreview>> | null = null;
  let previewError: string | null = null;
  if (checkoutEnabled && canManageBilling) {
    try {
      preview = await getAddOnPurchasePreview({
        organizationId: organization.id,
        addOnSlug: addOn.slug,
        quantity,
      });
    } catch (error) {
      previewError = isAddOnPurchaseError(error) ? error.code : 'add_on_purchase_preview_unavailable';
    }
  }

  const currentPlan = normalizePlan(entitlements.plan);
  const backHref = `/${locale}/dashboard/organizations/add-ons#addon-${addOn.slug}`;

  return (
    <main className="min-h-0 bg-transparent text-white">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <Link href={backHref} className="inline-flex items-center gap-2 text-sm font-semibold text-white/55 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />{text.back}
        </Link>

        <header className="border-b border-white/[0.07] pb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200/55">{text.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">{text.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/48">{text.body}</p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-2xl border border-white/[0.08] bg-[#101715] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">Add-on</p>
                <h2 className="mt-1.5 text-xl font-semibold text-white/90">{addOn.name}</h2>
                <p className="mt-2 text-sm leading-6 text-white/45">{addOn.description}</p>
              </div>
              <ReceiptText className="h-5 w-5 shrink-0 text-emerald-300" aria-hidden="true" />
            </div>

            <dl className="mt-6 divide-y divide-white/[0.06] border-y border-white/[0.06] text-sm">
              <div className="flex justify-between gap-4 py-3"><dt className="text-white/42">{text.organization}</dt><dd className="text-right font-medium text-white/78">{organization.name}</dd></div>
              <div className="flex justify-between gap-4 py-3"><dt className="text-white/42">{text.currentPlan}</dt><dd className="text-right font-medium text-white/78">{getPlanDisplayName(currentPlan)}</dd></div>
              <div className="flex justify-between gap-4 py-3"><dt className="text-white/42">{text.quantity}</dt><dd className="text-right font-medium text-white/78">{quantity}</dd></div>
              <div className="flex justify-between gap-4 py-3"><dt className="text-white/42">{text.monthly}</dt><dd className="text-right font-semibold text-white/88">€{addOn.priceMonthly * quantity}{text.month}</dd></div>
              <div className="flex justify-between gap-4 py-3"><dt className="text-white/42">{text.annualReference}</dt><dd className="text-right text-white/58">€{addOn.priceAnnual * quantity}{text.year}</dd></div>
            </dl>

            <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.045] p-4 text-sm leading-6 text-white/50">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
              <p>{text.secure}</p>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-white/[0.08] bg-[#101715] p-5">
              <div className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-emerald-300" aria-hidden="true" /><h2 className="text-sm font-semibold text-white/80">Stripe</h2></div>

              {preview ? (
                <dl className="mt-4 divide-y divide-white/[0.06] text-sm">
                  <div className="flex justify-between gap-4 py-3"><dt className="text-white/42">{text.subtotal}</dt><dd className="font-medium text-white/75">{formatMoney(preview.subtotalCents, preview.currency, locale)}</dd></div>
                  <div className="flex justify-between gap-4 py-3"><dt className="text-white/42">{text.tax}</dt><dd className="font-medium text-white/75">{formatMoney(preview.taxCents, preview.currency, locale)}</dd></div>
                  <div className="flex justify-between gap-4 py-3"><dt className="text-white/55">{text.dueNow}</dt><dd className="text-lg font-semibold text-white/92">{formatMoney(preview.amountDueNowCents, preview.currency, locale)}</dd></div>
                  <div className="flex justify-between gap-4 py-3"><dt className="text-white/42">{text.recurring}</dt><dd className="font-semibold text-white/82">{formatMoney(preview.recurringMonthlyCents, preview.currency, locale)}{text.month}</dd></div>
                </dl>
              ) : null}

              <p className="mt-4 text-xs leading-5 text-white/35">{text.providerTotal}</p>
            </section>

            {!checkoutEnabled ? (
              <section className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.055] p-4 text-sm leading-6 text-amber-100/80">{text.locked}</section>
            ) : !canManageBilling ? (
              <section className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.055] p-4 text-sm leading-6 text-amber-100/80">{text.admin}</section>
            ) : preview && !previewError ? (
              <AddOnPurchaseClient locale={locale} addOnSlug={addOn.slug} addOnName={addOn.name} quantity={quantity} />
            ) : (
              <section className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.055] p-4 text-sm leading-6 text-amber-100/80">
                {text.unavailable}{previewError ? ` (${previewError})` : ''}
              </section>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
