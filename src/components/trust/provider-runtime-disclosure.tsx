import Link from 'next/link';

import { type Locale } from '@/lib/i18n/routing';

const copy: Record<Locale, { eyebrow: string; title: string; body: string; evidence: string[]; open: string; transfers: string }> = {
  en: {
    eyebrow: 'Provider evidence boundary',
    title: 'Provider activity and legal approval are tracked separately.',
    body: 'Current reconciliation confirms that the PostHog Production client uses EU endpoints. Upstash has attributable historical predecessor-release runtime evidence, but current exact-serving-release runtime reproof remains open. The PostHog project connected for assurance is not the Production project.',
    evidence: ['Upstash runtime binding: proven historically for a predecessor release; current exact-serving-release reproof is open.', 'PostHog Production EU endpoint binding: proven; connected assurance project mismatch recorded.', 'Vercel Pro, Supabase Pro and Stripe LIVE account facts have attributable evidence. Sentry binding is proven for the last attributable serving evidence baseline; fresh serving-release reproof is blocked while the current Vercel Production deployment is disabled.'],
    open: 'Account plan/owner, region, retention, DPA applicability, transfer mechanism and final legal role remain provider-specific evidence or qualified-counsel questions where not already proven. Runtime presence alone does not establish those facts.',
    transfers: 'Review international-transfer boundary',
  },
  pt: {
    eyebrow: 'Limite de evidência dos fornecedores',
    title: 'Atividade técnica e aprovação jurídica dos fornecedores são tratadas separadamente.',
    body: 'A reconciliação atual confirma que o cliente PostHog de Production usa endpoints da UE. A Upstash tem evidência atribuível de runtime num release predecessor, mas a revalidação no release exato atualmente servido continua aberta. O projeto PostHog ligado para assurance não é o projeto de Production.',
    evidence: ['Binding Upstash em runtime: provado historicamente num release predecessor; a revalidação do release exato servido está aberta.', 'Binding PostHog em endpoints UE de Production: provado; mismatch do projeto de assurance registado.', 'Vercel Pro, Supabase Pro e factos da conta LIVE Stripe têm evidência atribuível. O binding Sentry está provado para o último baseline atribuível que servia tráfego; uma nova prova no release servido está bloqueada enquanto o deployment Production atual da Vercel estiver desativado.'],
    open: 'Plano/owner da conta, região, retenção, aplicabilidade do DPA, mecanismo de transferência e função jurídica final continuam dependentes de evidência específica do fornecedor ou de assessoria qualificada quando ainda não provados. A presença em runtime, por si só, não estabelece esses factos.',
    transfers: 'Rever o limite de transferências internacionais',
  },
  es: {
    eyebrow: 'Límite de evidencia de proveedores',
    title: 'La actividad técnica y la aprobación jurídica de proveedores se controlan por separado.',
    body: 'La reconciliación actual confirma que el cliente PostHog de Production usa endpoints de la UE. Upstash tiene evidencia atribuible de runtime en una versión predecesora, pero la nueva prueba de la versión exacta actualmente servida sigue abierta. El proyecto PostHog conectado para assurance no es el proyecto de Production.',
    evidence: ['Binding Upstash en runtime: probado históricamente en una versión predecesora; la nueva prueba de la versión exacta servida sigue abierta.', 'Binding PostHog a endpoints UE de Production: probado; mismatch del proyecto de assurance registrado.', 'Vercel Pro, Supabase Pro y los hechos de la cuenta LIVE Stripe tienen evidencia atribuible. El binding de Sentry está probado para el último baseline atribuible que servía tráfico; la nueva prueba de la versión servida está bloqueada mientras el deployment Production actual de Vercel esté deshabilitado.'],
    open: 'Plan/propietario de cuenta, región, retención, aplicabilidad del DPA, mecanismo de transferencia y rol jurídico final siguen sujetos a evidencia específica o revisión jurídica cualificada cuando no estén ya probados. La presencia runtime por sí sola no establece esos hechos.',
    transfers: 'Revisar el límite de transferencias internacionales',
  },
  fr: {
    eyebrow: 'Limite des preuves fournisseurs',
    title: 'L’activité technique et l’approbation juridique des fournisseurs sont suivies séparément.',
    body: 'La réconciliation actuelle confirme que le client PostHog Production utilise des endpoints UE. Upstash dispose de preuves runtime attribuables sur une version antérieure, mais la nouvelle preuve de la version exacte actuellement servie reste ouverte. Le projet PostHog connecté pour l’assurance n’est pas le projet Production.',
    evidence: ['Binding Upstash en runtime : prouvé historiquement sur une version antérieure ; la nouvelle preuve de la version exacte servie reste ouverte.', 'Binding PostHog aux endpoints UE de Production : prouvé ; écart du projet d’assurance enregistré.', 'Vercel Pro, Supabase Pro et les faits du compte LIVE Stripe disposent de preuves attribuables. Le binding Sentry est prouvé pour le dernier baseline attribuable qui servait du trafic ; une nouvelle preuve sur la version servie est bloquée tant que le deployment Production Vercel actuel est désactivé.'],
    open: 'Plan/propriétaire du compte, région, conservation, applicabilité du DPA, mécanisme de transfert et rôle juridique final restent soumis aux preuves propres au fournisseur ou à une revue juridique qualifiée lorsqu’ils ne sont pas déjà établis. La seule présence runtime ne prouve pas ces faits.',
    transfers: 'Examiner le périmètre des transferts internationaux',
  },
  it: {
    eyebrow: 'Limite delle evidenze dei provider',
    title: 'Attività tecnica e approvazione legale dei provider sono monitorate separatamente.',
    body: 'La riconciliazione attuale conferma che il client PostHog Production usa endpoint UE. Upstash dispone di evidenze runtime attribuibili su una release precedente, ma la nuova prova della release esatta attualmente servita resta aperta. Il progetto PostHog collegato per assurance non è il progetto Production.',
    evidence: ['Binding Upstash in runtime: provato storicamente su una release precedente; la nuova prova della release esatta servita resta aperta.', 'Binding PostHog agli endpoint UE di Production: provato; mismatch del progetto assurance registrato.', 'Vercel Pro, Supabase Pro e i fatti dell’account LIVE Stripe hanno evidenze attribuibili. Il binding Sentry è provato per l’ultimo baseline attribuibile che serviva traffico; la nuova prova sulla release servita è bloccata mentre il deployment Production Vercel corrente è disabilitato.'],
    open: 'Piano/proprietario dell’account, regione, retention, applicabilità del DPA, meccanismo di trasferimento e ruolo legale finale restano soggetti a evidenze specifiche del provider o a revisione legale qualificata quando non già provati. La sola presenza runtime non dimostra tali fatti.',
    transfers: 'Rivedere il perimetro dei trasferimenti internazionali',
  },
  de: {
    eyebrow: 'Nachweisgrenze der Anbieter',
    title: 'Technische Anbieteraktivität und rechtliche Freigabe werden getrennt bewertet.',
    body: 'Die aktuelle Abstimmung bestätigt, dass der PostHog-Production-Client EU-Endpunkte verwendet. Für Upstash liegen zuordenbare Runtime-Nachweise einer Vorgängerversion vor; der erneute Nachweis für die exakt aktuell ausgelieferte Version ist jedoch noch offen. Das für Assurance verbundene PostHog-Projekt ist nicht das Production-Projekt.',
    evidence: ['Upstash-Runtime-Binding: historisch für eine Vorgängerversion nachgewiesen; erneuter Nachweis für die exakt ausgelieferte Version ist offen.', 'PostHog-Binding an Production-EU-Endpunkte: nachgewiesen; Abweichung des Assurance-Projekts dokumentiert.', 'Für Vercel Pro, Supabase Pro und Fakten zum Stripe-LIVE-Konto liegen zuordenbare Nachweise vor. Das Sentry-Binding ist für die letzte zuordenbare, tatsächlich ausgelieferte Evidence-Baseline belegt; ein neuer Nachweis für die ausgelieferte Version ist blockiert, solange das aktuelle Vercel-Production-Deployment deaktiviert ist.'],
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
