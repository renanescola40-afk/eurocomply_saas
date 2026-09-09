import Link from 'next/link';

import { type Locale } from '@/lib/i18n/routing';

const copy: Record<Locale, { eyebrow: string; title: string; body: string; evidence: string[]; open: string; transfers: string }> = {
  en: {
    eyebrow: 'Provider evidence boundary',
    title: 'Provider activity and legal approval are tracked separately.',
    body: 'Current reconciliation keeps release-specific provider claims evidence-bound: PostHog Production source/configuration has historically targeted EU endpoints, but the connected assurance project is not the Production project; earlier direct Upstash and Sentry release proofs are historical until current protected provider/runtime acceptance is completed. Google OAuth runtime integration, Google Workspace operational use and GitHub Actions materiality remain in scope.',
    evidence: ['Upstash: the distributed Redis-backed integration remains implemented. Earlier direct Production proof is historical; current protected provider/runtime acceptance and account plan/owner, region, retention, DPA and transfer facts remain open.', 'Google OAuth: runtime integration is implemented; final legal role, applicable contract/DPA, region, retention and transfer treatment remain under review.', 'Google Workspace: corporate mail is operational. Earlier account-specific plan/EMEA evidence is retained; current agreement/CDPA, region, retention and transfer facts remain evidence-required before contractual reliance.', 'GitHub Actions: protected release and recovery workflows can transiently process Production database data on GitHub-hosted runners; company-account DPA applicability, transfer treatment and final legal role remain open.', 'Sentry: earlier direct Production release-binding evidence is historical; current protected exact-release producer acceptance plus organization region, retention and DPA facts remain open.'],
    open: 'Runtime integration, release-specific binding, protected producer acceptance and account/legal approval are separate. Current account plan/owner, region, retention, DPA applicability, transfer mechanism and final legal role remain provider-specific evidence or qualified-counsel questions where not already proven.',
    transfers: 'Review international-transfer boundary',
  },
  pt: {
    eyebrow: 'Limite de evidência dos fornecedores',
    title: 'Atividade técnica e aprovação jurídica dos fornecedores são tratadas separadamente.',
    body: 'A reconciliação atual mantém claims específicos de release presos à evidência: source/configuration de Production da PostHog historicamente apontou para endpoints UE, mas o projeto ligado para assurance não é o projeto de Production; provas diretas anteriores de Upstash e Sentry são históricas até existir aceitação protegida atual do provider/runtime. A integração Google OAuth, o uso operacional do Google Workspace e a materialidade do GitHub Actions permanecem em escopo.',
    evidence: ['Upstash: a integração Redis distribuída permanece implementada. A prova direta anterior em Production é histórica; aceitação protegida atual e plano/owner, região, retenção, DPA e transferências da conta permanecem abertos.', 'Google OAuth: a integração de runtime está implementada; função jurídica final, contrato/DPA aplicável, região, retenção e transferências permanecem em revisão.', 'Google Workspace: o correio corporativo está operacional. Evidência anterior de plano/entidade EMEA é retida; acordo/CDPA, região, retenção e transferências atuais permanecem dependentes de evidência.', 'GitHub Actions: workflows protegidos de release e recovery podem tratar transitoriamente dados da base Production em runners hospedados pelo GitHub; DPA da conta, transferências e função jurídica final permanecem abertos.', 'Sentry: a evidência direta anterior de binding de release Production é histórica; aceitação atual do producer protegido do release e factos de região, retenção e DPA da organização permanecem abertos.'],
    open: 'Integração de runtime, binding específico de release, aceitação do producer protegido e aprovação jurídica/da conta são fronteiras separadas. Plano/owner, região, retenção, DPA, transferências e função jurídica final continuam dependentes de evidência específica ou assessoria qualificada quando ainda não provados.',
    transfers: 'Rever o limite de transferências internacionais',
  },
  es: {
    eyebrow: 'Límite de evidencia de proveedores',
    title: 'La actividad técnica y la aprobación jurídica de proveedores se controlan por separado.',
    body: 'La reconciliación actual mantiene las afirmaciones específicas de release ligadas a evidencia: la configuración Production de PostHog históricamente apuntó a endpoints UE, pero el proyecto assurance conectado no es Production; las pruebas directas anteriores de Upstash y Sentry son históricas hasta completar la aceptación protegida actual.',
    evidence: ['Upstash: la integración Redis distribuida sigue implementada; la prueba directa anterior en Production es histórica y la aceptación protegida actual y los hechos contractuales de cuenta siguen abiertos.', 'Google OAuth: la integración runtime está implementada; rol jurídico, contrato/DPA, región, retención y transferencias siguen en revisión.', 'Google Workspace: el correo corporativo está operativo; la evidencia anterior de plan/entidad EMEA se conserva y los hechos contractuales actuales siguen abiertos.', 'GitHub Actions: workflows protegidos pueden procesar transitoriamente datos de la base Production en runners alojados por GitHub; DPA, transferencias y rol jurídico siguen abiertos.', 'Sentry: la prueba directa anterior del binding de release Production es histórica; el producer protegido actual y los hechos contractuales de cuenta siguen abiertos.'],
    open: 'Integración runtime, binding específico de release, aceptación protegida y aprobación legal/de cuenta son fronteras separadas. Los hechos no probados requieren evidencia específica o revisión jurídica cualificada.',
    transfers: 'Revisar el límite de transferencias internacionales',
  },
  fr: {
    eyebrow: 'Limite des preuves fournisseurs',
    title: 'L’activité technique et l’approbation juridique des fournisseurs sont suivies séparément.',
    body: 'La réconciliation actuelle lie les affirmations propres au release aux preuves disponibles : la configuration Production de PostHog a historiquement ciblé des endpoints UE, mais le projet assurance connecté n’est pas Production ; les preuves directes antérieures Upstash et Sentry sont historiques jusqu’à une nouvelle acceptation protégée.',
    evidence: ['Upstash : l’intégration Redis distribuée reste implémentée ; la preuve Production directe antérieure est historique et l’acceptation protégée actuelle ainsi que les faits contractuels du compte restent ouverts.', 'Google OAuth : l’intégration runtime est implémentée ; rôle juridique, contrat/DPA, région, conservation et transferts restent à examiner.', 'Google Workspace : la messagerie d’entreprise est opérationnelle ; les preuves antérieures de plan/entité EMEA sont conservées et les faits contractuels actuels restent ouverts.', 'GitHub Actions : des workflows protégés peuvent traiter temporairement des données de la base Production sur des runners hébergés par GitHub ; DPA, transferts et rôle juridique restent ouverts.', 'Sentry : la preuve directe antérieure du binding Production est historique ; le producer protégé actuel et les faits du compte restent ouverts.'],
    open: 'Intégration runtime, binding propre au release, acceptation protégée et approbation juridique/du compte sont des frontières séparées. Les faits non prouvés exigent des preuves spécifiques ou une revue juridique qualifiée.',
    transfers: 'Examiner le périmètre des transferts internationaux',
  },
  it: {
    eyebrow: 'Limite delle evidenze dei provider',
    title: 'Attività tecnica e approvazione legale dei provider sono monitorate separatamente.',
    body: 'La riconciliazione attuale mantiene le dichiarazioni specifiche del release vincolate alle evidenze: la configurazione Production di PostHog ha storicamente usato endpoint UE, ma il progetto assurance collegato non è Production; le precedenti prove dirette di Upstash e Sentry sono storiche fino a nuova accettazione protetta.',
    evidence: ['Upstash: l’integrazione Redis distribuita resta implementata; la precedente prova diretta Production è storica e l’accettazione protetta attuale e i fatti contrattuali dell’account restano aperti.', 'Google OAuth: l’integrazione runtime è implementata; ruolo legale, contratto/DPA, regione, retention e trasferimenti restano in revisione.', 'Google Workspace: la posta aziendale è operativa; le precedenti prove di piano/entità EMEA sono conservate e i fatti contrattuali attuali restano aperti.', 'GitHub Actions: workflow protetti possono trattare temporaneamente dati del database Production su runner ospitati da GitHub; DPA, trasferimenti e ruolo legale restano aperti.', 'Sentry: la precedente prova diretta del binding Production è storica; producer protetto attuale e fatti dell’account restano aperti.'],
    open: 'Integrazione runtime, binding specifico del release, accettazione protetta e approvazione legale/account sono confini separati. I fatti non provati richiedono evidenze specifiche o revisione legale qualificata.',
    transfers: 'Rivedere il perimetro dei trasferimenti internazionali',
  },
  de: {
    eyebrow: 'Nachweisgrenze der Anbieter',
    title: 'Technische Anbieteraktivität und rechtliche Freigabe werden getrennt bewertet.',
    body: 'Die aktuelle Abstimmung bindet release-spezifische Aussagen an belastbare Nachweise: Die Production-Konfiguration von PostHog zielte historisch auf EU-Endpunkte, das verbundene Assurance-Projekt ist jedoch nicht Production; frühere direkte Upstash- und Sentry-Nachweise sind historisch, bis eine aktuelle geschützte Akzeptanz vorliegt.',
    evidence: ['Upstash: die verteilte Redis-Integration bleibt implementiert; der frühere direkte Production-Nachweis ist historisch und aktuelle geschützte Akzeptanz sowie Kontovertragsfakten bleiben offen.', 'Google OAuth: die Runtime-Integration ist implementiert; Rechtsrolle, Vertrag/DPA, Region, Aufbewahrung und Transfers bleiben offen.', 'Google Workspace: die Unternehmensmail ist operativ; frühere Plan-/EMEA-Nachweise bleiben erhalten und aktuelle Vertragsfakten bleiben offen.', 'GitHub Actions: geschützte Workflows können Production-Datenbankdaten vorübergehend auf von GitHub gehosteten Runnern verarbeiten; DPA, Transfers und Rechtsrolle bleiben offen.', 'Sentry: der frühere direkte Production-Release-Binding-Nachweis ist historisch; aktueller geschützter Producer und Kontofakten bleiben offen.'],
    open: 'Runtime-Integration, release-spezifisches Binding, geschützte Akzeptanz und Konto-/Rechtsfreigabe sind getrennte Grenzen. Nicht belegte Fakten benötigen spezifische Nachweise oder qualifizierte Rechtsprüfung.',
    transfers: 'Grenzen internationaler Datentransfers prüfen',
  },
};

export function ProviderRuntimeDisclosure({ locale, slug }: { locale: Locale; slug: string }) {
  if (slug !== 'subprocessors') return null;
  const text = copy[locale] ?? copy.en;

  return (
    <section className="relative z-10 px-6 pb-16" aria-labelledby="provider-runtime-evidence-title">
      <div className="mx-auto max-w-7xl rounded-xl border border-blue-400/15 bg-blue-500/[0.055] p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300/70">{text.eyebrow}</p>
        <h2 id="provider-runtime-evidence-title" className="mt-3 max-w-4xl text-2xl font-semibold tracking-[-0.03em] text-white">{text.title}</h2>
        <p className="mt-4 max-w-5xl leading-7 text-white/62">{text.body}</p>
        <ul className="mt-5 grid gap-3 text-sm text-white/62 md:grid-cols-2 xl:grid-cols-5">
          {text.evidence.map((item) => <li key={item} className="rounded-lg border border-slate-800 bg-slate-950/25 p-4">{item}</li>)}
        </ul>
        <p className="mt-5 max-w-5xl text-sm leading-6 text-white/50">{text.open}</p>
        <Link href={`/${locale}/transfers`} className="mt-5 inline-flex rounded-md text-sm font-semibold text-blue-300 underline-offset-4 hover:text-blue-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">{text.transfers}</Link>
      </div>
    </section>
  );
}
