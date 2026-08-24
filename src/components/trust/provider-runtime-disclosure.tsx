import Link from 'next/link';

import { type Locale } from '@/lib/i18n/routing';

const copy: Record<Locale, { eyebrow: string; title: string; body: string; evidence: string[]; open: string; transfers: string }> = {
  en: {
    eyebrow: 'Provider evidence boundary',
    title: 'Provider activity and legal approval are tracked separately.',
    body: 'Current reconciliation confirms PostHog EU endpoints in Production, Upstash materiality with exact-current retained reproof still open, Google OAuth use in Production authentication, Google Workspace operational use for corporate communications, and GitHub Actions materiality for protected recovery/security workflows. The PostHog project connected for assurance is not the Production project.',
    evidence: ['Upstash: materially required by the fail-closed distributed rate-limit/security architecture; predecessor binding evidence exists, while retained exact-current runtime reproof remains open.', 'Google OAuth: Production use is proven; final legal role, applicable contract/DPA, region, retention and transfer treatment remain under review.', 'Google Workspace: Business Starter account use and Google Cloud EMEA Limited billing entity are proven; exact account CDPA incorporation, region, retention and transfer treatment remain under review.', 'GitHub Actions: protected recovery workflows can transiently process Production data; the current repository is a Personal User account and company-specific DPA applicability remains unproven.', 'Vercel Pro, Supabase Pro, Stripe LIVE account facts, retained Sentry Production binding and PostHog Production EU endpoint binding have attributable evidence, with provider-specific residuals tracked separately.'],
    open: 'Account plan/owner, region, retention, DPA applicability, transfer mechanism and final legal role remain provider-specific evidence or qualified-counsel questions where not already proven. Runtime, operational use, architecture or billing evidence alone does not establish unsupported legal or exact-release conclusions.',
    transfers: 'Review international-transfer boundary',
  },
  pt: {
    eyebrow: 'Limite de evidência dos fornecedores',
    title: 'Atividade técnica e aprovação jurídica dos fornecedores são tratadas separadamente.',
    body: 'A reconciliação atual confirma endpoints UE PostHog em Production, materialidade da Upstash com revalidação exact-current retida ainda aberta, uso de Google OAuth na autenticação Production, uso operacional do Google Workspace nas comunicações corporativas e materialidade do GitHub Actions nos workflows protegidos de recovery/segurança. O projeto PostHog ligado para assurance não é o projeto de Production.',
    evidence: ['Upstash: materialmente necessária à arquitetura fail-closed de rate limiting/controlos de segurança; existe evidência de binding anterior, enquanto a revalidação exact-current retida permanece aberta.', 'Google OAuth: uso em Production provado; função jurídica final, contrato/DPA aplicável, região, retenção e transferências permanecem em revisão.', 'Google Workspace: uso da conta Business Starter e entidade de faturação Google Cloud EMEA Limited provados; incorporação do CDPA da conta, região, retenção e transferências permanecem em revisão.', 'GitHub Actions: workflows protegidos de recovery podem tratar dados de Production transitoriamente; o repositório atual pertence a uma conta pessoal e a aplicabilidade de DPA empresarial permanece não provada.', 'Vercel Pro, Supabase Pro, factos da conta LIVE Stripe, binding Sentry de Production retido e endpoints UE PostHog de Production têm evidência atribuível, com resíduos específicos tratados separadamente.'],
    open: 'Plano/owner da conta, região, retenção, aplicabilidade do DPA, mecanismo de transferência e função jurídica final continuam dependentes de evidência específica do fornecedor ou de assessoria qualificada quando ainda não provados. Runtime, uso operacional, arquitetura ou faturação, por si sós, não estabelecem conclusões jurídicas ou exact-release sem suporte.',
    transfers: 'Rever o limite de transferências internacionais',
  },
  es: {
    eyebrow: 'Límite de evidencia de proveedores',
    title: 'La actividad técnica y la aprobación jurídica de proveedores se controlan por separado.',
    body: 'La reconciliación confirma endpoints UE de PostHog en Production, materialidad de Upstash con revalidación exact-current retenida todavía abierta, uso de Google OAuth en autenticación Production, uso operativo de Google Workspace para comunicaciones corporativas y GitHub Actions como proveedor material de workflows protegidos. El proyecto PostHog conectado para assurance no es Production.',
    evidence: ['Upstash: material para la arquitectura fail-closed; existe evidencia histórica, pero la revalidación exact-current retenida sigue abierta.', 'Google OAuth: uso Production probado; rol jurídico, contrato/DPA, región, retención y transferencias siguen en revisión.', 'Google Workspace: cuenta Business Starter y entidad de facturación Google Cloud EMEA Limited probadas; incorporación CDPA, región, retención y transferencias específicas siguen en revisión.', 'GitHub Actions: workflows protegidos pueden procesar datos Production transitoriamente; DPA empresarial de la cuenta personal no probado.', 'Vercel Pro, Supabase Pro, Stripe LIVE, binding Sentry Production retenido y PostHog UE Production tienen evidencia atribuible con residuos específicos abiertos.'],
    open: 'Plan/propietario, región, retención, DPA, transferencias y rol jurídico final requieren evidencia específica o revisión jurídica cualificada. Runtime, uso operativo, arquitectura o facturación por sí solos no establecen conclusiones no soportadas.',
    transfers: 'Revisar el límite de transferencias internacionales',
  },
  fr: {
    eyebrow: 'Limite des preuves fournisseurs',
    title: 'L’activité technique et l’approbation juridique des fournisseurs sont suivies séparément.',
    body: 'La réconciliation confirme les endpoints UE PostHog en Production, la matérialité d’Upstash avec une revalidation exacte actuelle conservée toujours ouverte, Google OAuth pour l’authentification Production, Google Workspace pour les communications d’entreprise et GitHub Actions pour les workflows protégés. Le projet PostHog connecté pour assurance n’est pas Production.',
    evidence: ['Upstash : matériel pour l’architecture fail-closed ; des preuves historiques existent mais la revalidation exacte actuelle conservée reste ouverte.', 'Google OAuth : usage Production prouvé ; rôle juridique, contrat/DPA, région, conservation et transferts restent à examiner.', 'Google Workspace : compte Business Starter et entité de facturation Google Cloud EMEA Limited prouvés ; incorporation CDPA, région, conservation et transferts propres au compte restent ouverts.', 'GitHub Actions : des workflows protégés peuvent traiter temporairement des données Production ; DPA entreprise du compte personnel non prouvé.', 'Vercel Pro, Supabase Pro, Stripe LIVE, binding Sentry Production conservé et PostHog UE Production disposent de preuves attribuables avec des résidus spécifiques ouverts.'],
    open: 'Plan/propriétaire, région, conservation, DPA, transferts et rôle juridique final exigent des preuves propres au fournisseur ou une revue juridique qualifiée. Runtime, usage opérationnel, architecture ou facturation seuls ne suffisent pas.',
    transfers: 'Examiner le périmètre des transferts internationaux',
  },
  it: {
    eyebrow: 'Limite delle evidenze dei provider',
    title: 'Attività tecnica e approvazione legale dei provider sono monitorate separatamente.',
    body: 'La riconciliazione conferma endpoint UE PostHog in Production, materialità Upstash con revalidazione exact-current conservata ancora aperta, Google OAuth per l’autenticazione Production, Google Workspace per comunicazioni aziendali e GitHub Actions nei workflow protetti. Il progetto PostHog collegato per assurance non è Production.',
    evidence: ['Upstash: materiale per l’architettura fail-closed; esistono evidenze storiche ma la revalidazione exact-current conservata resta aperta.', 'Google OAuth: uso Production provato; ruolo legale, contratto/DPA, regione, retention e trasferimenti restano in revisione.', 'Google Workspace: account Business Starter ed entità di fatturazione Google Cloud EMEA Limited provati; incorporazione CDPA, regione, retention e trasferimenti specifici restano aperti.', 'GitHub Actions: workflow protetti possono trattare transitoriamente dati Production; DPA aziendale dell’account personale non provato.', 'Vercel Pro, Supabase Pro, Stripe LIVE, binding Sentry Production conservato e PostHog UE Production hanno evidenze attribuibili con residui specifici aperti.'],
    open: 'Piano/proprietario, regione, retention, DPA, trasferimenti e ruolo legale finale richiedono evidenze specifiche o revisione legale qualificata. Runtime, uso operativo, architettura o fatturazione da soli non bastano.',
    transfers: 'Rivedere il perimetro dei trasferimenti internazionali',
  },
  de: {
    eyebrow: 'Nachweisgrenze der Anbieter',
    title: 'Technische Anbieteraktivität und rechtliche Freigabe werden getrennt bewertet.',
    body: 'Die Abstimmung bestätigt PostHog-EU-Endpunkte in Production, die Wesentlichkeit von Upstash bei weiterhin offener aufbewahrter exakt aktueller Revalidierung, Google OAuth für Production-Authentifizierung, Google Workspace für Geschäftskommunikation und GitHub Actions für geschützte Workflows. Das verbundene PostHog-Assurance-Projekt ist nicht Production.',
    evidence: ['Upstash: für die fail-closed Sicherheitsarchitektur wesentlich; historische Nachweise existieren, aber die aufbewahrte exakt aktuelle Revalidierung bleibt offen.', 'Google OAuth: Production-Nutzung nachgewiesen; Rechtsrolle, Vertrag/DPA, Region, Aufbewahrung und Transfers bleiben offen.', 'Google Workspace: Business-Starter-Konto und Abrechnung durch Google Cloud EMEA Limited nachgewiesen; CDPA-Einbeziehung, Region, Aufbewahrung und Transfers bleiben offen.', 'GitHub Actions: geschützte Workflows können Production-Daten vorübergehend verarbeiten; Unternehmens-DPA für das persönliche Konto nicht nachgewiesen.', 'Vercel Pro, Supabase Pro, Stripe LIVE, aufbewahrtes Sentry-Production-Binding und PostHog-EU-Production verfügen über zuordenbare Nachweise mit offenen Restpunkten.'],
    open: 'Plan/Inhaber, Region, Aufbewahrung, DPA, Transfers und endgültige Rechtsrolle benötigen anbieterspezifische Nachweise oder qualifizierte Rechtsprüfung. Runtime, operative Nutzung, Architektur oder Abrechnung allein belegen keine nicht gestützten Schlussfolgerungen.',
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
