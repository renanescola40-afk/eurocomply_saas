import Link from 'next/link';

import { type Locale } from '@/lib/i18n/routing';

const copy: Record<Locale, { eyebrow: string; title: string; body: string; evidence: string[]; open: string; transfers: string }> = {
  en: {
    eyebrow: 'Provider evidence boundary',
    title: 'Provider activity and legal approval are tracked separately.',
    body: 'Current reconciliation confirms that the PostHog Production client uses EU endpoints. Upstash has attributable historical predecessor-release runtime evidence, but current exact-release runtime reproof remains open. The PostHog project connected for assurance is not the Production project.',
    evidence: ['Upstash runtime binding: proven historically for a predecessor release; current exact-release reproof is open.', 'PostHog Production EU endpoint binding: proven; connected assurance project mismatch recorded.', 'Vercel Pro, Supabase Pro, Stripe LIVE account facts and Sentry current-release binding have attributable evidence, with provider-specific legal/account residuals still tracked separately.'],
    open: 'Account plan/owner, region, retention, DPA applicability, transfer mechanism and final legal role remain provider-specific evidence or qualified-counsel questions where not already proven. Runtime presence alone does not establish those facts.',
    transfers: 'Review international-transfer boundary',
  },
  pt: {
    eyebrow: 'Limite de evidência dos fornecedores',
    title: 'Atividade técnica e aprovação jurídica dos fornecedores são tratadas separadamente.',
    body: 'A reconciliação atual confirma que o cliente PostHog de Production usa endpoints da UE. A Upstash tem evidência atribuível de runtime num release predecessor, mas a revalidação no release exato atual continua aberta. O projeto PostHog ligado para assurance não é o projeto de Production.',
    evidence: ['Binding Upstash em runtime: provado historicamente num release predecessor; a revalidação do release exato atual está aberta.', 'Binding PostHog em endpoints UE de Production: provado; mismatch do projeto de assurance registado.', 'Vercel Pro, Supabase Pro, factos da conta LIVE Stripe e binding Sentry do release atual têm evidência atribuível, mantendo-se resíduos jurídicos/de conta específicos por fornecedor.'],
    open: 'Plano/owner da conta, região, retenção, aplicabilidade do DPA, mecanismo de transferência e função jurídica final continuam dependentes de evidência específica do fornecedor ou de assessoria qualificada quando ainda não provados. A presença em runtime, por si só, não estabelece esses factos.',
    transfers: 'Rever o limite de transferências internacionais',
  },
  es: {
    eyebrow: 'Límite de evidencia de proveedores',
    title: 'La actividad técnica y la aprobación jurídica de proveedores se controlan por separado.',
    body: 'La reconciliación actual confirma que el cliente PostHog de Production usa endpoints de la UE. Upstash tiene evidencia atribuible de runtime en una versión predecesora, pero la nueva prueba de la versión exacta actual sigue abierta. El proyecto PostHog conectado para assurance no es el proyecto de Production.',
    evidence: ['Binding Upstash en runtime: probado históricamente en una versión predecesora; la nueva prueba de la versión exacta actual sigue abierta.', 'Binding PostHog a endpoints UE de Production: probado; mismatch del proyecto de assurance registrado.', 'Vercel Pro, Supabase Pro, hechos de la cuenta LIVE Stripe y binding Sentry de la versión actual tienen evidencia atribuible, con pendientes jurídicos/de cuenta específicos por proveedor.'],
    open: 'Plan/propietario de cuenta, región, retención, aplicabilidad del DPA, mecanismo de transferencia y rol jurídico final siguen sujetos a evidencia específica o revisión jurídica cualificada cuando no estén ya probados. La presencia runtime por sí sola no establece esos hechos.',
    transfers: 'Revisar el límite de transferencias internacionales',
  },
  fr: {
    eyebrow: 'Limite des preuves fournisseurs',
    title: 'L’activité technique et l’approbation juridique des fournisseurs sont suivies séparément.',
    body: 'La réconciliation actuelle confirme que le client PostHog Production utilise des endpoints UE. Upstash dispose de preuves runtime attribuables sur une version antérieure, mais la nouvelle preuve de la version exacte actuelle reste ouverte. Le projet PostHog connecté pour l’assurance n’est pas le projet Production.',
    evidence: ['Binding Upstash en runtime : prouvé historiquement sur une version antérieure ; la nouvelle preuve de la version exacte actuelle reste ouverte.', 'Binding PostHog aux endpoints UE de Production : prouvé ; écart du projet d’assurance enregistré.', 'Vercel Pro, Supabase Pro, les faits du compte LIVE Stripe et le binding Sentry de la version actuelle disposent de preuves attribuables, avec des points juridiques/de compte propres à chaque fournisseur encore ouverts.'],
    open: 'Plan/propriétaire du compte, région, conservation, applicabilité du DPA, mécanisme de transfert et rôle juridique final restent soumis aux preuves propres au fournisseur ou à une revue juridique qualifiée lorsqu’ils ne sont pas déjà établis. La seule présence runtime ne prouve pas ces faits.',
    transfers: 'Examiner le périmètre des transferts internationaux',
  },
  it: {
    eyebrow: 'Limite delle evidenze dei provider',
    title: 'Attività tecnica e approvazione legale dei provider sono monitorate separatamente.',
    body: 'La riconciliazione attuale conferma che il client PostHog Production usa endpoint UE. Upstash dispone di evidenze runtime attribuibili su una release precedente, ma la nuova prova della release esatta corrente resta aperta. Il progetto PostHog collegato per assurance non è il progetto Production.',
    evidence: ['Binding Upstash in runtime: provato storicamente su una release precedente; la nuova prova della release esatta corrente resta aperta.', 'Binding PostHog agli endpoint UE di Production: provato; mismatch del progetto assurance registrato.', 'Vercel Pro, Supabase Pro, fatti dell’account LIVE Stripe e binding Sentry della release corrente hanno evidenze attribuibili, con residui legali/account specifici per provider ancora aperti.'],
    open: 'Piano/proprietario dell’account, regione, retention, applicabilità del DPA, meccanismo di trasferimento e ruolo legale finale restano soggetti a evidenze specifiche del provider o a revisione legale qualificata quando non già provati. La sola presenza runtime non dimostra tali fatti.',
    transfers: 'Rivedere il perimetro dei trasferimenti internazionali',
  },
  de: {
    eyebrow: 'Nachweisgrenze der Anbieter',
    title: 'Technische Anbieteraktivität und rechtliche Freigabe werden getrennt bewertet.',
    body: 'Die aktuelle Abstimmung bestätigt, dass der PostHog-Production-Client EU-Endpunkte verwendet. Für Upstash liegen zuordenbare Runtime-Nachweise einer Vorgängerversion vor; der erneute Nachweis für die exakt aktuelle Version ist jedoch noch offen. Das für Assurance verbundene PostHog-Projekt ist nicht das Production-Projekt.',
    evidence: ['Upstash-Runtime-Binding: historisch für eine Vorgängerversion nachgewiesen; erneuter Nachweis für die exakt aktuelle Version ist offen.', 'PostHog-Binding an Production-EU-Endpunkte: nachgewiesen; Abweichung des Assurance-Projekts dokumentiert.', 'Für Vercel Pro, Supabase Pro, Fakten zum Stripe-LIVE-Konto und das Sentry-Binding der aktuellen Version liegen zuordenbare Nachweise vor; anbieterspezifische Rechts-/Kontofragen bleiben getrennt offen.'],
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
        <ul className="mt-5 grid gap-3 text-sm text-white/62 md:grid-cols-3">
          {text.evidence.map((item) => <li key={item} className="rounded-2xl border border-white/10 bg-black/25 p-4">{item}</li>)}
        </ul>
        <p className="mt-5 max-w-5xl text-sm leading-6 text-white/50">{text.open}</p>
        <Link href={`/${locale}/transfers`} className="mt-5 inline-flex rounded-md text-sm font-semibold text-cyan-100 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">{text.transfers}</Link>
      </div>
    </section>
  );
}
