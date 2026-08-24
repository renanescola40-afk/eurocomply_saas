import Link from 'next/link';

import { type Locale } from '@/lib/i18n/routing';

const copy: Record<Locale, { eyebrow: string; title: string; body: string; evidence: string[]; open: string; transfers: string }> = {
  en: {
    eyebrow: 'Provider evidence boundary',
    title: 'Provider activity and legal approval are tracked separately.',
    body: 'Current reconciliation confirms PostHog EU endpoints in Production, fresh direct Upstash Redis-backed runtime revalidation, current Sentry public release binding, Google OAuth use in Production authentication, Google Workspace operational use for corporate communications, and GitHub Actions materiality for protected recovery/security workflows. The PostHog project connected for assurance is not the Production project.',
    evidence: ['Upstash: fresh current Production catalogue-path revalidation traverses the fail-closed distributed Redis limiter; protected provider acceptance and account plan/owner, region, retention, DPA and transfer facts remain open.', 'Google OAuth: Production use is proven; final legal role, applicable contract/DPA, region, retention and transfer treatment remain under review.', 'Google Workspace: Business Starter account use and Google Cloud EMEA Limited billing entity are proven; exact account CDPA incorporation, region, retention and transfer treatment remain under review.', 'GitHub Actions: protected recovery workflows can transiently process Production data; company-account DPA applicability and final legal role remain unproven.', 'Sentry: fresh current public Production metadata is bound to the current release; protected release/source-map producer acceptance plus organization region, retention and DPA facts remain open.'],
    open: 'Runtime binding, protected producer acceptance and account/legal approval are separate. Account plan/owner, region, retention, DPA applicability, transfer mechanism and final legal role remain provider-specific evidence or qualified-counsel questions where not already proven.',
    transfers: 'Review international-transfer boundary',
  },
  pt: {
    eyebrow: 'Limite de evidência dos fornecedores',
    title: 'Atividade técnica e aprovação jurídica dos fornecedores são tratadas separadamente.',
    body: 'A reconciliação atual confirma endpoints UE PostHog em Production, revalidação direta atual do caminho Redis da Upstash, binding público atual de release Sentry, uso de Google OAuth na autenticação Production, uso operacional do Google Workspace nas comunicações corporativas e materialidade do GitHub Actions nos workflows protegidos. O projeto PostHog ligado para assurance não é o projeto de Production.',
    evidence: ['Upstash: a revalidação atual do catálogo Production percorre o limiter Redis distribuído fail-closed; aceitação protegida do provider e plano/owner, região, retenção, DPA e transferências da conta permanecem abertas.', 'Google OAuth: uso em Production provado; função jurídica final, contrato/DPA aplicável, região, retenção e transferências permanecem em revisão.', 'Google Workspace: uso Business Starter e entidade de faturação Google Cloud EMEA Limited provados; incorporação do CDPA, região, retenção e transferências permanecem em revisão.', 'GitHub Actions: workflows protegidos de recovery podem tratar dados Production transitoriamente; aplicabilidade do DPA da conta empresarial e função jurídica final permanecem não provadas.', 'Sentry: metadata pública atual de Production está ligada ao release atual; aceitação protegida do producer de release/source maps, região, retenção e DPA da organização permanecem abertas.'],
    open: 'Binding de runtime, aceitação do producer protegido e aprovação jurídica/da conta são fronteiras separadas. Plano/owner, região, retenção, DPA, transferências e função jurídica final continuam dependentes de evidência específica ou assessoria qualificada quando ainda não provados.',
    transfers: 'Rever o limite de transferências internacionais',
  },
  es: {
    eyebrow: 'Límite de evidencia de proveedores',
    title: 'La actividad técnica y la aprobación jurídica de proveedores se controlan por separado.',
    body: 'La reconciliación confirma endpoints UE de PostHog, revalidación directa actual de la ruta Redis de Upstash, binding público actual de release Sentry, Google OAuth en autenticación Production, Google Workspace para comunicaciones corporativas y GitHub Actions en workflows protegidos. El proyecto PostHog conectado para assurance no es Production.',
    evidence: ['Upstash: la revalidación actual del catálogo Production atraviesa el limiter Redis fail-closed; la aceptación protegida y los datos contractuales de cuenta siguen abiertos.', 'Google OAuth: uso Production probado; rol jurídico, contrato/DPA, región, retención y transferencias siguen en revisión.', 'Google Workspace: cuenta Business Starter y entidad Google Cloud EMEA Limited probadas; CDPA, región, retención y transferencias específicas siguen en revisión.', 'GitHub Actions: workflows protegidos pueden procesar datos Production transitoriamente; DPA y rol jurídico de la cuenta siguen abiertos.', 'Sentry: metadata pública Production está ligada al release actual; producer protegido de release/source maps y hechos contractuales de cuenta siguen abiertos.'],
    open: 'Binding runtime, aceptación protegida y aprobación legal/de cuenta son fronteras separadas. Los hechos no probados requieren evidencia específica o revisión jurídica cualificada.',
    transfers: 'Revisar el límite de transferencias internacionales',
  },
  fr: {
    eyebrow: 'Limite des preuves fournisseurs',
    title: 'L’activité technique et l’approbation juridique des fournisseurs sont suivies séparément.',
    body: 'La réconciliation confirme les endpoints UE PostHog, la revalidation directe actuelle du chemin Redis Upstash, le binding public actuel de release Sentry, Google OAuth en Production, Google Workspace pour les communications d’entreprise et GitHub Actions pour les workflows protégés. Le projet PostHog connecté pour assurance n’est pas Production.',
    evidence: ['Upstash : la revalidation actuelle du catalogue Production traverse le limiteur Redis fail-closed ; acceptation protégée et faits contractuels du compte restent ouverts.', 'Google OAuth : usage Production prouvé ; rôle juridique, contrat/DPA, région, conservation et transferts restent à examiner.', 'Google Workspace : Business Starter et Google Cloud EMEA Limited prouvés ; CDPA, région, conservation et transferts du compte restent ouverts.', 'GitHub Actions : des workflows protégés peuvent traiter temporairement des données Production ; DPA et rôle juridique restent ouverts.', 'Sentry : les métadonnées publiques Production sont liées au release actuel ; producer protégé de release/source maps et faits du compte restent ouverts.'],
    open: 'Binding runtime, acceptation protégée et approbation juridique/du compte sont des frontières séparées. Les faits non prouvés exigent des preuves spécifiques ou une revue juridique qualifiée.',
    transfers: 'Examiner le périmètre des transferts internationaux',
  },
  it: {
    eyebrow: 'Limite delle evidenze dei provider',
    title: 'Attività tecnica e approvazione legale dei provider sono monitorate separatamente.',
    body: 'La riconciliazione conferma endpoint UE PostHog, revalidazione diretta attuale del percorso Redis Upstash, binding pubblico attuale del release Sentry, Google OAuth in Production, Google Workspace per comunicazioni aziendali e GitHub Actions nei workflow protetti. Il progetto PostHog collegato per assurance non è Production.',
    evidence: ['Upstash: la revalidazione attuale del catalogo Production attraversa il limiter Redis fail-closed; accettazione protetta e fatti contrattuali dell’account restano aperti.', 'Google OAuth: uso Production provato; ruolo legale, contratto/DPA, regione, retention e trasferimenti restano in revisione.', 'Google Workspace: Business Starter e Google Cloud EMEA Limited provati; CDPA, regione, retention e trasferimenti specifici restano aperti.', 'GitHub Actions: workflow protetti possono trattare dati Production transitoriamente; DPA e ruolo legale restano aperti.', 'Sentry: metadata pubblica Production è legata al release attuale; producer protetto di release/source maps e fatti dell’account restano aperti.'],
    open: 'Binding runtime, accettazione protetta e approvazione legale/account sono confini separati. I fatti non provati richiedono evidenze specifiche o revisione legale qualificata.',
    transfers: 'Rivedere il perimetro dei trasferimenti internazionali',
  },
  de: {
    eyebrow: 'Nachweisgrenze der Anbieter',
    title: 'Technische Anbieteraktivität und rechtliche Freigabe werden getrennt bewertet.',
    body: 'Die Abstimmung bestätigt PostHog-EU-Endpunkte, die aktuelle direkte Revalidierung des Upstash-Redis-Pfads, das aktuelle öffentliche Sentry-Release-Binding, Google OAuth in Production, Google Workspace für Geschäftskommunikation und GitHub Actions für geschützte Workflows. Das verbundene PostHog-Assurance-Projekt ist nicht Production.',
    evidence: ['Upstash: die aktuelle Production-Katalog-Revalidierung durchläuft den fail-closed Redis-Limiter; geschützte Akzeptanz und Kontovertragsfakten bleiben offen.', 'Google OAuth: Production-Nutzung nachgewiesen; Rechtsrolle, Vertrag/DPA, Region, Aufbewahrung und Transfers bleiben offen.', 'Google Workspace: Business Starter und Google Cloud EMEA Limited nachgewiesen; CDPA, Region, Aufbewahrung und Transfers bleiben offen.', 'GitHub Actions: geschützte Workflows können Production-Daten vorübergehend verarbeiten; DPA und Rechtsrolle bleiben offen.', 'Sentry: öffentliche Production-Metadaten sind an den aktuellen Release gebunden; geschützter Release/Source-Map-Producer und Kontofakten bleiben offen.'],
    open: 'Runtime-Binding, geschützte Akzeptanz und Konto-/Rechtsfreigabe sind getrennte Grenzen. Nicht belegte Fakten benötigen spezifische Nachweise oder qualifizierte Rechtsprüfung.',
    transfers: 'Grenzen internationaler Datentransfers prüfen',
  },
};

export function ProviderRuntimeDisclosure({ locale, slug }: { locale: Locale; slug: string }) {
  if (slug !== 'subprocessors') return null;
  const text = copy[locale] ?? copy.en;

  return (
    <section className="relative z-10 px-6 pb-16" aria-labelledby="provider-runtime-evidence-title">
      <div className="mx-auto max-w-7xl rounded-[1.75rem] border border-cyan-200/15 bg-cyan-300/[0.055] p-6 shadow-xl backdrop-blur md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/65">{text.eyebrow}</p>
        <h2 id="provider-runtime-evidence-title" className="mt-3 max-w-4xl text-2xl font-semibold tracking-[-0.03em] text-white">{text.title}</h2>
        <p className="mt-4 max-w-5xl leading-7 text-white/62">{text.body}</p>
        <ul className="mt-5 grid gap-3 text-sm text-white/62 md:grid-cols-2 xl:grid-cols-5">
          {text.evidence.map((item) => <li key={item} className="rounded-2xl border border-white/10 bg-black/25 p-4">{item}</li>)}
        </ul>
        <p className="mt-5 max-w-5xl text-sm leading-6 text-white/50">{text.open}</p>
        <Link href={`/${locale}/transfers`} className="mt-5 inline-flex rounded-md text-sm font-semibold text-cyan-100 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">{text.transfers}</Link>
      </div>
    </section>
  );
}
