import { PublicLegalReviewPage } from '@/components/legal/public-legal-review-page';
import { isSupportedLocale, type Locale } from '@/lib/i18n/locales';

const LAST_UPDATED = '21 August 2026';

const copy: Record<Locale, { eyebrow: string; title: string; summary: string; sections: Array<{ title: string; paragraphs?: string[]; items?: string[] }> }> = {
  en: {
    eyebrow: 'International Data Transfers',
    title: 'Transfer mechanisms and provider verification',
    summary: 'This review draft records the technical transfer boundary without claiming that any SCC, DPA or other contractual mechanism has been executed unless independent evidence exists.',
    sections: [
      { title: 'Production providers in scope', items: ['Vercel may process application traffic, deployment metadata and operational logs depending on configuration.', 'Supabase provides database, authentication and storage services for the configured project.', 'Stripe processes billing identifiers and payment metadata when billing is enabled.', 'Sentry and PostHog may process diagnostic or analytics events when the corresponding integrations are enabled.'] },
      { title: 'Known location evidence', paragraphs: ['The connected production Supabase project was most recently observed in eu-west-1. Other provider processing locations, account regions and onward transfers must be verified from the active provider accounts and contractual records.'] },
      { title: 'Transfer mechanism gate', items: ['Do not claim executed Standard Contractual Clauses without the applicable signed or provider-contract evidence.', 'Do not infer a provider DPA, transfer mechanism, retention period or processing country from source code alone.', 'Reconcile provider purpose, data categories, location/region, transfer, transfer mechanism, DPA status and evidence date before final approval.'] },
      { title: 'Customer contracting', paragraphs: ['The final DPA and transfer annex must match the actual production data flow and approved subprocessor register. Any required SCC module, UK addendum or other transfer safeguard remains a qualified legal and contracting decision.'] },
    ],
  },
  pt: {
    eyebrow: 'Transferências Internacionais de Dados',
    title: 'Mecanismos de transferência e verificação de fornecedores',
    summary: 'Este rascunho regista o limite técnico de transferências sem afirmar que SCC, DPA ou outro mecanismo contratual foi celebrado quando não existe evidência independente.',
    sections: [
      { title: 'Fornecedores de produção em escopo', items: ['A Vercel pode tratar tráfego da aplicação, metadados de deployment e logs operacionais conforme a configuração.', 'A Supabase fornece base de dados, autenticação e storage para o projeto configurado.', 'A Stripe trata identificadores de billing e metadados de pagamento quando billing está ativo.', 'Sentry e PostHog podem tratar eventos de diagnóstico ou analytics quando as integrações correspondentes estão ativas.'] },
      { title: 'Evidência conhecida de localização', paragraphs: ['O projeto Supabase de produção ligado foi observado mais recentemente em eu-west-1. As localizações dos restantes fornecedores, regiões das contas e transferências posteriores devem ser verificadas nas contas LIVE e nos registos contratuais.'] },
      { title: 'Gate do mecanismo de transferência', items: ['Não afirmar SCC celebradas sem evidência contratual aplicável.', 'Não inferir DPA, mecanismo de transferência, conservação ou país de tratamento apenas a partir do código.', 'Reconciliar finalidade, categorias de dados, localização/região, transferência, mecanismo, estado do DPA e data da evidência antes da aprovação final.'] },
      { title: 'Contratação com clientes', paragraphs: ['O DPA final e o anexo de transferências devem corresponder ao fluxo de dados de produção e ao registo aprovado de subcontratantes. Qualquer módulo SCC, adenda UK ou outra salvaguarda permanece decisão jurídica e contratual qualificada.'] },
    ],
  },
  es: {
    eyebrow: 'Transferencias Internacionales de Datos', title: 'Mecanismos de transferencia y verificación de proveedores', summary: 'Borrador técnico que no afirma SCC, DPA u otros mecanismos sin evidencia independiente.', sections: [
      { title: 'Proveedores', items: ['Vercel, Supabase, Stripe, Sentry y PostHog pueden estar en alcance según la configuración activa.'] },
      { title: 'Verificación', paragraphs: ['La región, transferencias ulteriores, DPA, SCC y retención deben verificarse en las cuentas y contratos activos antes de aprobación final.'] },
      { title: 'Límite de evidencia', items: ['No inferir un mecanismo contractual desde el código.', 'No afirmar SCC ejecutadas sin evidencia aplicable.'] },
    ],
  },
  fr: {
    eyebrow: 'Transferts Internationaux de Données', title: 'Mécanismes de transfert et vérification des fournisseurs', summary: 'Projet technique ne revendiquant aucune SCC, DPA ou autre garantie contractuelle sans preuve indépendante.', sections: [
      { title: 'Fournisseurs', items: ['Vercel, Supabase, Stripe, Sentry et PostHog peuvent être concernés selon la configuration active.'] },
      { title: 'Vérification', paragraphs: ['Les régions, transferts ultérieurs, DPA, SCC et durées de conservation doivent être vérifiés dans les comptes et contrats actifs avant validation finale.'] },
      { title: 'Limite de preuve', items: ['Ne pas déduire un mécanisme contractuel du code source.', 'Ne pas déclarer de SCC conclues sans preuve applicable.'] },
    ],
  },
  it: {
    eyebrow: 'Trasferimenti Internazionali di Dati', title: 'Meccanismi di trasferimento e verifica dei fornitori', summary: 'Bozza tecnica che non dichiara SCC, DPA o altre garanzie contrattuali senza evidenza indipendente.', sections: [
      { title: 'Fornitori', items: ['Vercel, Supabase, Stripe, Sentry e PostHog possono rientrare nell’ambito in base alla configurazione attiva.'] },
      { title: 'Verifica', paragraphs: ['Regioni, trasferimenti successivi, DPA, SCC e conservazione devono essere verificati negli account e contratti attivi prima dell’approvazione finale.'] },
      { title: 'Limite delle evidenze', items: ['Non dedurre un meccanismo contrattuale dal codice.', 'Non dichiarare SCC sottoscritte senza evidenza applicabile.'] },
    ],
  },
  de: {
    eyebrow: 'Internationale Datentransfers', title: 'Transfermechanismen und Anbieterprüfung', summary: 'Technischer Entwurf ohne Behauptung von SCC, DPA oder anderen Vertragsmechanismen ohne unabhängige Nachweise.', sections: [
      { title: 'Anbieter', items: ['Vercel, Supabase, Stripe, Sentry und PostHog können je nach aktiver Konfiguration betroffen sein.'] },
      { title: 'Prüfung', paragraphs: ['Regionen, Weiterübermittlungen, DPA, SCC und Aufbewahrung müssen vor der finalen Freigabe in den aktiven Anbieter-Konten und Verträgen geprüft werden.'] },
      { title: 'Nachweisgrenze', items: ['Vertragliche Mechanismen nicht aus Quellcode ableiten.', 'Keine abgeschlossenen SCC ohne anwendbaren Nachweis behaupten.'] },
    ],
  },
};

export default async function TransfersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  const page = copy[locale];

  return <PublicLegalReviewPage locale={locale} eyebrow={page.eyebrow} title={page.title} summary={page.summary} documentId="international-data-transfers" version="0.1-review" lastUpdated={LAST_UPDATED} sections={page.sections} />;
}
