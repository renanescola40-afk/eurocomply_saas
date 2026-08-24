import Link from 'next/link';

import { type Locale } from '@/lib/i18n/routing';

const copy: Record<Locale, { eyebrow: string; title: string; body: string; evidence: string[]; open: string; transfers: string }> = {
  en: {
    eyebrow: 'Provider evidence boundary',
    title: 'Provider activity and legal approval are tracked separately.',
    body: 'Current reconciliation confirms that the PostHog Production client uses EU endpoints, Upstash has attributable current exact-release runtime evidence, Google OAuth is used in Production authentication, and GitHub Actions is a material operational provider for protected recovery/security workflows. The PostHog project connected for assurance is not the Production project.',
    evidence: ['Upstash runtime binding: proven on the current exact Production release; account plan, region, retention and contractual facts remain tracked separately.', 'Google OAuth: Production use is proven; final legal role, applicable contract/DPA, region, retention and transfer treatment remain under review.', 'GitHub Actions: protected recovery workflows can transiently process Production data; the current repository is a Personal User account and company-specific DPA applicability remains unproven.', 'Vercel Pro, Supabase Pro, Stripe LIVE account facts, Sentry current-release binding and PostHog Production EU endpoint binding have attributable evidence, with provider-specific residuals tracked separately.'],
    open: 'Account plan/owner, region, retention, DPA applicability, transfer mechanism and final legal role remain provider-specific evidence or qualified-counsel questions where not already proven. Runtime presence alone does not establish those facts.',
    transfers: 'Review international-transfer boundary',
  },
  pt: {
    eyebrow: 'Limite de evidência dos fornecedores',
    title: 'Atividade técnica e aprovação jurídica dos fornecedores são tratadas separadamente.',
    body: 'A reconciliação atual confirma que o cliente PostHog de Production usa endpoints da UE, a Upstash tem evidência atribuível de runtime no release exato atual, o Google OAuth é usado na autenticação de Production e o GitHub Actions é um fornecedor operacional material nos workflows protegidos de recovery/segurança. O projeto PostHog ligado para assurance não é o projeto de Production.',
    evidence: ['Binding Upstash em runtime: provado no release exato atual de Production; plano, região, retenção e factos contratuais da conta continuam tratados separadamente.', 'Google OAuth: uso em Production provado; função jurídica final, contrato/DPA aplicável, região, retenção e transferências permanecem em revisão.', 'GitHub Actions: workflows protegidos de recovery podem tratar dados de Production transitoriamente; o repositório atual pertence a uma conta pessoal e a aplicabilidade de DPA empresarial permanece não provada.', 'Vercel Pro, Supabase Pro, factos da conta LIVE Stripe, binding Sentry do release atual e endpoints UE PostHog de Production têm evidência atribuível, com resíduos específicos tratados separadamente.'],
    open: 'Plano/owner da conta, região, retenção, aplicabilidade do DPA, mecanismo de transferência e função jurídica final continuam dependentes de evidência específica do fornecedor ou de assessoria qualificada quando ainda não provados. A presença em runtime, por si só, não estabelece esses factos.',
    transfers: 'Rever o limite de transferências internacionais',
  },
  es: {
    eyebrow: 'Límite de evidencia de proveedores',
    title: 'La actividad técnica y la aprobación jurídica de proveedores se controlan por separado.',
    body: 'La reconciliación actual confirma endpoints UE de PostHog en Production, evidencia exacta actual de Upstash, uso de Google OAuth en la autenticación de Production y GitHub Actions como proveedor operativo material para workflows protegidos de recuperación/seguridad. El proyecto PostHog conectado para assurance no es el proyecto de Production.',
    evidence: ['Binding Upstash: probado en la versión exacta actual de Production; plan, región, retención y hechos contractuales siguen controlándose por separado.', 'Google OAuth: uso en Production probado; rol jurídico final, contrato/DPA aplicable, región, retención y transferencias siguen en revisión.', 'GitHub Actions: workflows protegidos de recuperación pueden procesar datos de Production transitoriamente; el repositorio actual pertenece a una cuenta personal y la aplicabilidad de un DPA empresarial no está probada.', 'Vercel Pro, Supabase Pro, cuenta LIVE Stripe, binding Sentry actual y endpoints UE PostHog de Production tienen evidencia atribuible, con pendientes específicos controlados por separado.'],
    open: 'Plan/propietario de cuenta, región, retención, aplicabilidad del DPA, mecanismo de transferencia y rol jurídico final siguen sujetos a evidencia específica o revisión jurídica cualificada cuando no estén ya probados. La presencia runtime por sí sola no establece esos hechos.',
    transfers: 'Revisar el límite de transferencias internacionales',
  },
  fr: {
    eyebrow: 'Limite des preuves fournisseurs',
    title: 'L’activité technique et l’approbation juridique des fournisseurs sont suivies séparément.',
    body: 'La réconciliation actuelle confirme les endpoints UE de PostHog en Production, les preuves exactes actuelles d’Upstash, l’usage de Google OAuth pour l’authentification Production et GitHub Actions comme fournisseur opérationnel matériel pour les workflows protégés de reprise/sécurité. Le projet PostHog connecté pour l’assurance n’est pas le projet Production.',
    evidence: ['Binding Upstash : prouvé sur la version exacte actuelle de Production ; plan, région, conservation et faits contractuels restent suivis séparément.', 'Google OAuth : usage Production prouvé ; rôle juridique final, contrat/DPA applicable, région, conservation et transferts restent à examiner.', 'GitHub Actions : les workflows protégés de reprise peuvent traiter temporairement des données Production ; le dépôt actuel appartient à un compte personnel et l’applicabilité d’un DPA entreprise n’est pas prouvée.', 'Vercel Pro, Supabase Pro, le compte LIVE Stripe, le binding Sentry actuel et les endpoints UE PostHog de Production disposent de preuves attribuables, avec des points spécifiques encore ouverts.'],
    open: 'Plan/propriétaire du compte, région, conservation, applicabilité du DPA, mécanisme de transfert et rôle juridique final restent soumis aux preuves propres au fournisseur ou à une revue juridique qualifiée lorsqu’ils ne sont pas déjà établis. La seule présence runtime ne prouve pas ces faits.',
    transfers: 'Examiner le périmètre des transferts internationaux',
  },
  it: {
    eyebrow: 'Limite delle evidenze dei provider',
    title: 'Attività tecnica e approvazione legale dei provider sono monitorate separatamente.',
    body: 'La riconciliazione attuale conferma endpoint UE PostHog in Production, evidenze esatte correnti Upstash, uso di Google OAuth per l’autenticazione Production e GitHub Actions come provider operativo materiale nei workflow protetti di recovery/sicurezza. Il progetto PostHog collegato per assurance non è il progetto Production.',
    evidence: ['Binding Upstash: provato sulla release esatta corrente di Production; piano, regione, retention e fatti contrattuali restano monitorati separatamente.', 'Google OAuth: uso Production provato; ruolo legale finale, contratto/DPA applicabile, regione, retention e trasferimenti restano in revisione.', 'GitHub Actions: i workflow protetti di recovery possono trattare transitoriamente dati Production; il repository attuale appartiene a un account personale e l’applicabilità di un DPA aziendale non è provata.', 'Vercel Pro, Supabase Pro, account LIVE Stripe, binding Sentry corrente ed endpoint UE PostHog Production dispongono di evidenze attribuibili, con residui specifici ancora aperti.'],
    open: 'Piano/proprietario dell’account, regione, retention, applicabilità del DPA, meccanismo di trasferimento e ruolo legale finale restano soggetti a evidenze specifiche del provider o a revisione legale qualificata quando non già provati. La sola presenza runtime non dimostra tali fatti.',
    transfers: 'Rivedere il perimetro dei trasferimenti internazionali',
  },
  de: {
    eyebrow: 'Nachweisgrenze der Anbieter',
    title: 'Technische Anbieteraktivität und rechtliche Freigabe werden getrennt bewertet.',
    body: 'Die aktuelle Abstimmung bestätigt PostHog-EU-Endpunkte in Production, exakte aktuelle Upstash-Runtime-Nachweise, Google OAuth für die Production-Authentifizierung und GitHub Actions als wesentlichen operativen Anbieter für geschützte Recovery-/Security-Workflows. Das verbundene PostHog-Assurance-Projekt ist nicht das Production-Projekt.',
    evidence: ['Upstash-Runtime-Binding: für die exakt aktuelle Production-Version nachgewiesen; Kontoplan, Region, Aufbewahrung und Vertragsfakten bleiben getrennt offen.', 'Google OAuth: Production-Nutzung nachgewiesen; endgültige Rechtsrolle, anwendbarer Vertrag/DPA, Region, Aufbewahrung und Transfers bleiben in Prüfung.', 'GitHub Actions: geschützte Recovery-Workflows können Production-Daten vorübergehend verarbeiten; das aktuelle Repository gehört zu einem persönlichen Konto und die Anwendbarkeit eines Unternehmens-DPA ist nicht nachgewiesen.', 'Vercel Pro, Supabase Pro, Stripe-LIVE-Konto, aktuelles Sentry-Binding und PostHog-Production-EU-Endpunkte verfügen über zuordenbare Nachweise; anbieterspezifische Restpunkte bleiben getrennt offen.'],
    open: 'Kontoplan/-inhaber, Region, Aufbewahrung, DPA-Anwendbarkeit, Transfermechanismus und endgültige rechtliche Rolle benötigen weiterhin anbieterspezifische Nachweise oder qualifizierte Rechtsprüfung, sofern sie nicht bereits belegt sind. Runtime-Präsenz allein belegt diese Tatsachen nicht.',
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
        <ul className="mt-5 grid gap-3 text-sm text-white/62 md:grid-cols-2 xl:grid-cols-4">
          {text.evidence.map((item) => <li key={item} className="rounded-2xl border border-white/10 bg-black/25 p-4">{item}</li>)}
        </ul>
        <p className="mt-5 max-w-5xl text-sm leading-6 text-white/50">{text.open}</p>
        <Link href={`/${locale}/transfers`} className="mt-5 inline-flex rounded-md text-sm font-semibold text-cyan-100 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">{text.transfers}</Link>
      </div>
    </section>
  );
}
