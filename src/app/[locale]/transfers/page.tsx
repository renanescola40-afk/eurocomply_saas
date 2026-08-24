import { PublicLegalReviewPage } from '@/components/legal/public-legal-review-page';
import { isSupportedLocale, type Locale } from '@/lib/i18n/locales';

const LAST_UPDATED = '24 August 2026';

const copy: Record<Locale, { eyebrow: string; title: string; summary: string; sections: Array<{ title: string; paragraphs?: string[]; items?: string[] }> }> = {
  en: {
    eyebrow: 'International Data Transfers',
    title: 'Transfer mechanisms and provider verification',
    summary: 'This review draft records the technical transfer boundary without claiming that any SCC, DPA or other contractual mechanism has been executed unless independent evidence exists.',
    sections: [
      { title: 'Production and operational providers in scope', items: ['Vercel may process application traffic, deployment metadata and operational logs depending on configuration.', 'Supabase provides database, authentication and storage services for the configured project.', 'Stripe processes billing identifiers and payment metadata when billing is enabled.', 'Google OAuth / Google Identity is used for optional Production authentication; final legal role, applicable contract/DPA, region, retention and transfer treatment remain under review.', 'Google Workspace is used for RISCK COMPLY corporate communications; account-specific Business Starter and EMEA billing-entity facts are proven while exact account CDPA, region, retention and onward-transfer treatment remain under review.', 'GitHub Actions supports CI/CD and protected recovery/security workflows and can transiently process Production data; applicable account DPA/transfer treatment remains under review.', 'Sentry has fresh current public Production release binding; protected release/source-map producer acceptance and account-specific contractual/location facts remain open.', 'PostHog is present in Production, but the connected assurance project does not match the Production project; account-specific facts remain under verification.', 'Upstash Redis has fresh current direct Production runtime revalidation through the fail-closed catalogue limiter path; protected provider acceptance and account plan, region, retention and DPA/transfer treatment remain open.'] },
      { title: 'Known location evidence', paragraphs: ['The Production Supabase project is evidenced in eu-west-1. The Production PostHog client uses EU service endpoints, but the actual Production account still requires attribution. Google Workspace billing identifies Google Cloud EMEA Limited as billing entity, not a processing/storage region. Remaining account-specific locations and onward transfers require applicable evidence before final approval.'] },
      { title: 'Transfer mechanism gate', items: ['Do not claim executed Standard Contractual Clauses without applicable contract evidence.', 'Do not infer a provider DPA, transfer mechanism, retention period or processing country from source code, runtime presence or billing entity alone.', 'Do not convert direct runtime binding or protected producer evidence into contractual acceptance.', 'Reconcile provider purpose, data categories, location/region, transfer mechanism, DPA status and evidence date before final approval.'] },
      { title: 'Customer contracting', paragraphs: ['The final DPA and transfer annex must match the actual Production and operational data flow and counsel-approved provider/subprocessor register. Any required SCC module, UK addendum or other transfer safeguard remains a qualified legal and contracting decision.'] },
    ],
  },
  pt: {
    eyebrow: 'Transferências Internacionais de Dados',
    title: 'Mecanismos de transferência e verificação de fornecedores',
    summary: 'Este rascunho regista o limite técnico de transferências sem afirmar que SCC, DPA ou outro mecanismo contratual foi celebrado quando não existe evidência independente.',
    sections: [
      { title: 'Fornecedores de Production e operacionais em escopo', items: ['A Vercel pode tratar tráfego da aplicação, metadados de deployment e logs operacionais conforme a configuração.', 'A Supabase fornece base de dados, autenticação e storage para o projeto configurado.', 'A Stripe trata identificadores de billing e metadados de pagamento quando billing está ativo.', 'Google OAuth / Google Identity é usado para autenticação opcional em Production; função jurídica final, contrato/DPA aplicável, região, retenção e transferências permanecem em revisão.', 'Google Workspace é usado nas comunicações corporativas da RISCK COMPLY; Business Starter e entidade EMEA de faturação estão provados, enquanto CDPA, região, retenção e transferências da conta permanecem em revisão.', 'GitHub Actions suporta CI/CD e workflows protegidos e pode tratar transitoriamente dados Production; DPA/transferências aplicáveis à conta permanecem em revisão.', 'Sentry tem binding público atual de release Production; aceitação protegida do producer de release/source maps e factos contratuais/de localização da conta permanecem abertos.', 'A integração PostHog está presente em Production, mas o projeto ligado para assurance não corresponde ao projeto de Production; os factos da conta permanecem em verificação.', 'A Upstash Redis tem revalidação direta atual em Production pelo caminho fail-closed do limiter do catálogo; aceitação protegida do provider e plano, região, retenção e DPA/transferências da conta permanecem abertos.'] },
      { title: 'Evidência conhecida de localização', paragraphs: ['O projeto Supabase de Production está evidenciado em eu-west-1. O cliente PostHog usa endpoints UE, mas a conta real de Production ainda requer atribuição. A faturação Google Workspace identifica Google Cloud EMEA Limited como entidade de faturação, não como região de armazenamento/tratamento. As restantes localizações e transferências específicas da conta exigem evidência aplicável antes da aprovação final.'] },
      { title: 'Gate do mecanismo de transferência', items: ['Não afirmar SCC celebradas sem evidência contratual aplicável.', 'Não inferir DPA, mecanismo de transferência, conservação ou país de tratamento apenas a partir do código, runtime ou entidade de faturação.', 'Não converter binding direto de runtime ou evidência de producer protegido em aceitação contratual.', 'Reconciliar finalidade, categorias de dados, localização/região, mecanismo de transferência, estado do DPA e data da evidência antes da aprovação final.'] },
      { title: 'Contratação com clientes', paragraphs: ['O DPA final e o anexo de transferências devem corresponder aos fluxos de dados de Production e ao registo de providers/subprocessadores aprovado por counsel. Qualquer módulo SCC, adenda UK ou outra salvaguarda permanece decisão jurídica e contratual qualificada.'] },
    ],
  },
  es: {
    eyebrow: 'Transferencias Internacionales de Datos', title: 'Mecanismos de transferencia y verificación de proveedores', summary: 'Borrador técnico que no afirma SCC, DPA u otros mecanismos sin evidencia independiente.', sections: [
      { title: 'Proveedores', items: ['Vercel, Supabase, Stripe y Sentry están dentro del perímetro técnico. Google OAuth y Google Workspace tienen uso Production/operativo probado con hechos contractuales residuales abiertos. GitHub Actions puede procesar datos Production transitoriamente. PostHog está presente, pero el proyecto assurance no es Production. Upstash Redis tiene revalidación directa actual por la ruta fail-closed; aceptación protegida y hechos de cuenta siguen abiertos.'] },
      { title: 'Verificación', paragraphs: ['Regiones, transferencias ulteriores, DPA, SCC y retención deben verificarse en las cuentas y contratos aplicables antes de aprobación final.'] },
      { title: 'Límite de evidencia', items: ['No inferir mecanismos contractuales desde código, runtime o facturación.', 'No convertir binding runtime en aceptación contractual.', 'No afirmar SCC ejecutadas sin evidencia aplicable.'] },
    ],
  },
  fr: {
    eyebrow: 'Transferts Internationaux de Données', title: 'Mécanismes de transfert et vérification des fournisseurs', summary: 'Projet technique ne revendiquant aucune SCC, DPA ou garantie contractuelle sans preuve indépendante.', sections: [
      { title: 'Fournisseurs', items: ['Vercel, Supabase, Stripe et Sentry sont dans le périmètre technique. Google OAuth et Google Workspace ont un usage prouvé avec des faits contractuels résiduels ouverts. GitHub Actions peut traiter temporairement des données Production. PostHog est présent mais le projet assurance n’est pas Production. Upstash Redis a une revalidation directe actuelle via le chemin fail-closed ; acceptation protégée et faits du compte restent ouverts.'] },
      { title: 'Vérification', paragraphs: ['Régions, transferts, DPA, SCC et conservation doivent être vérifiés dans les comptes et contrats applicables avant validation finale.'] },
      { title: 'Limite de preuve', items: ['Ne pas déduire de mécanisme contractuel du code, runtime ou facturation.', 'Ne pas convertir le binding runtime en acceptation contractuelle.', 'Ne pas déclarer de SCC conclues sans preuve applicable.'] },
    ],
  },
  it: {
    eyebrow: 'Trasferimenti Internazionali di Dati', title: 'Meccanismi di trasferimento e verifica dei fornitori', summary: 'Bozza tecnica che non dichiara SCC, DPA o altre garanzie contrattuali senza evidenza indipendente.', sections: [
      { title: 'Fornitori', items: ['Vercel, Supabase, Stripe e Sentry rientrano nel perimetro tecnico. Google OAuth e Google Workspace hanno uso provato con fatti contrattuali residui aperti. GitHub Actions può trattare dati Production transitoriamente. PostHog è presente ma il progetto assurance non è Production. Upstash Redis ha revalidazione diretta attuale tramite il percorso fail-closed; accettazione protetta e fatti dell’account restano aperti.'] },
      { title: 'Verifica', paragraphs: ['Regioni, trasferimenti, DPA, SCC e conservazione devono essere verificati negli account e contratti applicabili prima dell’approvazione finale.'] },
      { title: 'Limite delle evidenze', items: ['Non dedurre meccanismi contrattuali dal codice, runtime o fatturazione.', 'Non convertire binding runtime in accettazione contrattuale.', 'Non dichiarare SCC sottoscritte senza evidenza applicabile.'] },
    ],
  },
  de: {
    eyebrow: 'Internationale Datentransfers', title: 'Transfermechanismen und Anbieterprüfung', summary: 'Technischer Entwurf ohne Behauptung von SCC, DPA oder Vertragsmechanismen ohne unabhängige Nachweise.', sections: [
      { title: 'Anbieter', items: ['Vercel, Supabase, Stripe und Sentry liegen im technischen Umfang. Google OAuth und Google Workspace haben nachgewiesene Nutzung mit offenen Vertragsfakten. GitHub Actions kann Production-Daten vorübergehend verarbeiten. PostHog ist vorhanden, aber das Assurance-Projekt ist nicht Production. Upstash Redis hat eine aktuelle direkte Revalidierung über den fail-closed Pfad; geschützte Akzeptanz und Kontofakten bleiben offen.'] },
      { title: 'Prüfung', paragraphs: ['Regionen, Transfers, DPA, SCC und Aufbewahrung müssen vor finaler Freigabe in den anwendbaren Konten und Verträgen geprüft werden.'] },
      { title: 'Nachweisgrenze', items: ['Keine Vertragsmechanismen aus Code, Runtime oder Abrechnung ableiten.', 'Runtime-Binding nicht in Vertragsakzeptanz umdeuten.', 'Keine abgeschlossenen SCC ohne anwendbaren Nachweis behaupten.'] },
    ],
  },
};

export default async function TransfersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  const page = copy[locale];

  return <PublicLegalReviewPage locale={locale} eyebrow={page.eyebrow} title={page.title} summary={page.summary} documentId="international-data-transfers" version="0.1-review" lastUpdated={LAST_UPDATED} sections={page.sections} />;
}
