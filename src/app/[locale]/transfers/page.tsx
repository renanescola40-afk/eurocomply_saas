import { PublicLegalReviewPage } from '@/components/legal/public-legal-review-page';
import { isSupportedLocale, type Locale } from '@/lib/i18n/locales';

const LAST_UPDATED = '24 August 2026';

const copy: Record<Locale, { eyebrow: string; title: string; summary: string; sections: Array<{ title: string; paragraphs?: string[]; items?: string[] }> }> = {
  en: {
    eyebrow: 'International Data Transfers',
    title: 'Transfer mechanisms and provider verification',
    summary: 'This review draft records the technical transfer boundary without claiming that any SCC, DPA or other contractual mechanism has been executed unless independent evidence exists.',
    sections: [
      { title: 'Production providers in scope', items: ['Vercel may process application traffic, deployment metadata and operational logs depending on configuration.', 'Supabase provides database, authentication and storage services for the configured project.', 'Stripe processes billing identifiers and payment metadata when billing is enabled.', 'Sentry processes diagnostic/error-monitoring metadata when the integration is active.', 'PostHog is present in the Production analytics integration, but the currently connected assurance project does not match the Production project; account-specific facts remain under verification.', 'Upstash Redis has attributable current exact-release runtime evidence for distributed rate limiting and security-control state; account plan, region, retention and DPA/transfer treatment remain under verification.'] },
      { title: 'Known location evidence', paragraphs: ['The connected production Supabase project was most recently observed in eu-west-1. The Production PostHog client uses EU service endpoints, but the actual Production project/account still requires attribution. Upstash account region and the remaining provider processing locations/onward transfers must be verified from active provider accounts and contractual records.'] },
      { title: 'Transfer mechanism gate', items: ['Do not claim executed Standard Contractual Clauses without the applicable signed or provider-contract evidence.', 'Do not infer a provider DPA, transfer mechanism, retention period or processing country from source code or runtime presence alone.', 'Reconcile provider purpose, data categories, location/region, transfer, transfer mechanism, DPA status and evidence date before final approval.'] },
      { title: 'Customer contracting', paragraphs: ['The final DPA and transfer annex must match the actual production data flow and approved subprocessor register. Any required SCC module, UK addendum or other transfer safeguard remains a qualified legal and contracting decision.'] },
    ],
  },
  pt: {
    eyebrow: 'Transferências Internacionais de Dados',
    title: 'Mecanismos de transferência e verificação de fornecedores',
    summary: 'Este rascunho regista o limite técnico de transferências sem afirmar que SCC, DPA ou outro mecanismo contratual foi celebrado quando não existe evidência independente.',
    sections: [
      { title: 'Fornecedores de produção em escopo', items: ['A Vercel pode tratar tráfego da aplicação, metadados de deployment e logs operacionais conforme a configuração.', 'A Supabase fornece base de dados, autenticação e storage para o projeto configurado.', 'A Stripe trata identificadores de billing e metadados de pagamento quando billing está ativo.', 'A Sentry trata metadados de diagnóstico e error monitoring quando a integração está ativa.', 'A integração PostHog está presente em Production, mas o projeto atualmente ligado para assurance não corresponde ao projeto de Production; os factos da conta permanecem em verificação.', 'A Upstash Redis tem evidência atribuível de runtime no release exato atual para rate limiting distribuído e estado de controlos de segurança; plano, região, retenção e tratamento DPA/transferências da conta permanecem por verificar.'] },
      { title: 'Evidência conhecida de localização', paragraphs: ['O projeto Supabase de produção ligado foi observado mais recentemente em eu-west-1. O cliente PostHog de Production usa endpoints de serviço da UE, mas o projeto/conta real de Production ainda requer atribuição. A região da conta Upstash e as restantes localizações/transferências posteriores devem ser verificadas nas contas LIVE e nos registos contratuais.'] },
      { title: 'Gate do mecanismo de transferência', items: ['Não afirmar SCC celebradas sem evidência contratual aplicável.', 'Não inferir DPA, mecanismo de transferência, conservação ou país de tratamento apenas a partir do código ou da presença técnica em runtime.', 'Reconciliar finalidade, categorias de dados, localização/região, transferência, mecanismo, estado do DPA e data da evidência antes da aprovação final.'] },
      { title: 'Contratação com clientes', paragraphs: ['O DPA final e o anexo de transferências devem corresponder ao fluxo de dados de produção e ao registo aprovado de subcontratantes. Qualquer módulo SCC, adenda UK ou outra salvaguarda permanece decisão jurídica e contratual qualificada.'] },
    ],
  },
  es: {
    eyebrow: 'Transferencias Internacionales de Datos', title: 'Mecanismos de transferencia y verificación de proveedores', summary: 'Borrador técnico que no afirma SCC, DPA u otros mecanismos sin evidencia independiente.', sections: [
      { title: 'Proveedores', items: ['Vercel, Supabase, Stripe y Sentry están dentro del perímetro técnico según sus funciones activas. PostHog está presente en Production, pero el proyecto conectado para assurance no coincide con el proyecto de Production. Upstash Redis tiene evidencia atribuible de runtime en la versión exacta actual para rate limiting distribuido y controles de seguridad; sus datos contractuales, región y retención siguen pendientes.'] },
      { title: 'Verificación', paragraphs: ['Las regiones, transferencias ulteriores, DPA, SCC y retención deben verificarse en las cuentas y contratos activos antes de aprobación final.'] },
      { title: 'Límite de evidencia', items: ['No inferir un mecanismo contractual desde el código o la presencia runtime.', 'No afirmar SCC ejecutadas sin evidencia aplicable.'] },
    ],
  },
  fr: {
    eyebrow: 'Transferts Internationaux de Données', title: 'Mécanismes de transfert et vérification des fournisseurs', summary: 'Projet technique ne revendiquant aucune SCC, DPA ou autre garantie contractuelle sans preuve indépendante.', sections: [
      { title: 'Fournisseurs', items: ['Vercel, Supabase, Stripe et Sentry sont dans le périmètre technique selon les services actifs. PostHog est présent en Production, mais le projet connecté pour assurance ne correspond pas au projet Production. Upstash Redis dispose de preuves runtime attribuables sur la version exacte actuelle pour la limitation distribuée et les contrôles de sécurité ; ses données contractuelles, région et rétention restent à vérifier.'] },
      { title: 'Vérification', paragraphs: ['Les régions, transferts ultérieurs, DPA, SCC et durées de conservation doivent être vérifiés dans les comptes et contrats actifs avant validation finale.'] },
      { title: 'Limite de preuve', items: ['Ne pas déduire un mécanisme contractuel du code source ou de la seule présence runtime.', 'Ne pas déclarer de SCC conclues sans preuve applicable.'] },
    ],
  },
  it: {
    eyebrow: 'Trasferimenti Internazionali di Dati', title: 'Meccanismi di trasferimento e verifica dei fornitori', summary: 'Bozza tecnica che non dichiara SCC, DPA o altre garanzie contrattuali senza evidenza indipendente.', sections: [
      { title: 'Fornitori', items: ['Vercel, Supabase, Stripe e Sentry rientrano nel perimetro tecnico secondo i servizi attivi. PostHog è presente in Production, ma il progetto collegato per assurance non corrisponde al progetto Production. Upstash Redis dispone di evidenze runtime attribuibili sulla release esatta corrente per rate limiting distribuito e controlli di sicurezza; dati contrattuali, regione e retention restano da verificare.'] },
      { title: 'Verifica', paragraphs: ['Regioni, trasferimenti successivi, DPA, SCC e conservazione devono essere verificati negli account e contratti attivi prima dell’approvazione finale.'] },
      { title: 'Limite delle evidenze', items: ['Non dedurre un meccanismo contrattuale dal codice o dalla sola presenza runtime.', 'Non dichiarare SCC sottoscritte senza evidenza applicabile.'] },
    ],
  },
  de: {
    eyebrow: 'Internationale Datentransfers', title: 'Transfermechanismen und Anbieterprüfung', summary: 'Technischer Entwurf ohne Behauptung von SCC, DPA oder anderen Vertragsmechanismen ohne unabhängige Nachweise.', sections: [
      { title: 'Anbieter', items: ['Vercel, Supabase, Stripe und Sentry liegen entsprechend den aktiven Diensten im technischen Umfang. PostHog ist in Production vorhanden, aber das verbundene Assurance-Projekt entspricht nicht dem Production-Projekt. Für Upstash Redis liegen zuordenbare Runtime-Nachweise der exakt aktuellen Version für verteiltes Rate Limiting und Sicherheitskontrollen vor; Vertragsdaten, Region und Aufbewahrung bleiben zu prüfen.'] },
      { title: 'Prüfung', paragraphs: ['Regionen, Weiterübermittlungen, DPA, SCC und Aufbewahrung müssen vor der finalen Freigabe in den aktiven Anbieter-Konten und Verträgen geprüft werden.'] },
      { title: 'Nachweisgrenze', items: ['Vertragliche Mechanismen nicht aus Quellcode oder bloßer Runtime-Präsenz ableiten.', 'Keine abgeschlossenen SCC ohne anwendbaren Nachweis behaupten.'] },
    ],
  },
};

export default async function TransfersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  const page = copy[locale];

  return <PublicLegalReviewPage locale={locale} eyebrow={page.eyebrow} title={page.title} summary={page.summary} documentId="international-data-transfers" version="0.1-review" lastUpdated={LAST_UPDATED} sections={page.sections} />;
}
