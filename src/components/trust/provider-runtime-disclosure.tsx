import Link from 'next/link';

import { type Locale } from '@/lib/i18n/routing';

const copy: Record<Locale, { eyebrow: string; title: string; body: string; evidence: string[]; open: string; transfers: string }> = {
  en: {
    eyebrow: 'Current runtime evidence',
    title: 'Provider activity and legal approval are tracked separately.',
    body: 'Attributable Production evidence currently confirms Upstash Redis in the distributed high-risk rate-limit path and a PostHog analytics binding. The PostHog project connected for assurance is not the Production project.',
    evidence: ['Upstash runtime binding: proven for the observed Production request.', 'PostHog Production binding: present; connected assurance project mismatch recorded.', 'Vercel, Supabase, Stripe and Sentry remain within the established Production provider boundary.'],
    open: 'Account plan/owner, region, retention, DPA applicability, transfer mechanism and final legal role remain provider-specific evidence or qualified-counsel questions where not already proven. Runtime presence alone does not establish those facts.',
    transfers: 'Review international-transfer boundary',
  },
  pt: {
    eyebrow: 'Evidência atual de runtime',
    title: 'Atividade técnica e aprovação jurídica dos fornecedores são tratadas separadamente.',
    body: 'Evidência atribuível de Production confirma atualmente a Upstash Redis no caminho distribuído de rate limiting de alto risco e uma integração PostHog. O projeto PostHog ligado para assurance não é o projeto de Production.',
    evidence: ['Binding Upstash em runtime: provado para o pedido de Production observado.', 'Binding PostHog em Production: presente; mismatch do projeto de assurance registado.', 'Vercel, Supabase, Stripe e Sentry permanecem no perímetro de fornecedores de Production já estabelecido.'],
    open: 'Plano/owner da conta, região, retenção, aplicabilidade do DPA, mecanismo de transferência e função jurídica final continuam dependentes de evidência específica do fornecedor ou de assessoria qualificada quando ainda não provados. A presença em runtime, por si só, não estabelece esses factos.',
    transfers: 'Rever o limite de transferências internacionais',
  },
  es: {
    eyebrow: 'Evidencia actual de runtime',
    title: 'La actividad técnica y la aprobación jurídica de proveedores se controlan por separado.',
    body: 'La evidencia atribuible de Production confirma actualmente Upstash Redis en el control distribuido de rate limiting de alto riesgo y una integración PostHog. El proyecto PostHog conectado para assurance no es el proyecto de Production.',
    evidence: ['Binding Upstash en runtime: probado para la solicitud de Production observada.', 'Binding PostHog en Production: presente; mismatch del proyecto de assurance registrado.', 'Vercel, Supabase, Stripe y Sentry permanecen dentro del perímetro de proveedores de Production establecido.'],
    open: 'Plan/propietario de cuenta, región, retención, aplicabilidad del DPA, mecanismo de transferencia y rol jurídico final siguen sujetos a evidencia específica o revisión jurídica cualificada cuando no estén ya probados. La presencia runtime por sí sola no establece esos hechos.',
    transfers: 'Revisar el límite de transferencias internacionales',
  },
  fr: {
    eyebrow: 'Preuves runtime actuelles',
    title: 'L’activité technique et l’approbation juridique des fournisseurs sont suivies séparément.',
    body: 'Les preuves Production attribuables confirment actuellement Upstash Redis dans le contrôle distribué de limitation à haut risque ainsi qu’une intégration PostHog. Le projet PostHog connecté pour l’assurance n’est pas le projet Production.',
    evidence: ['Binding Upstash en runtime : prouvé pour la requête Production observée.', 'Binding PostHog en Production : présent ; écart du projet d’assurance enregistré.', 'Vercel, Supabase, Stripe et Sentry restent dans le périmètre Production établi.'],
    open: 'Plan/propriétaire du compte, région, conservation, applicabilité du DPA, mécanisme de transfert et rôle juridique final restent soumis aux preuves propres au fournisseur ou à une revue juridique qualifiée lorsqu’ils ne sont pas déjà établis. La seule présence runtime ne prouve pas ces faits.',
    transfers: 'Examiner le périmètre des transferts internationaux',
  },
  it: {
    eyebrow: 'Evidenze runtime attuali',
    title: 'Attività tecnica e approvazione legale dei provider sono monitorate separatamente.',
    body: 'Le evidenze Production attribuibili confermano attualmente Upstash Redis nel controllo distribuito di rate limiting ad alto rischio e un’integrazione PostHog. Il progetto PostHog collegato per assurance non è il progetto Production.',
    evidence: ['Binding Upstash in runtime: provato per la richiesta Production osservata.', 'Binding PostHog in Production: presente; mismatch del progetto assurance registrato.', 'Vercel, Supabase, Stripe e Sentry restano nel perimetro Production già stabilito.'],
    open: 'Piano/proprietario dell’account, regione, retention, applicabilità del DPA, meccanismo di trasferimento e ruolo legale finale restano soggetti a evidenze specifiche del provider o a revisione legale qualificata quando non già provati. La sola presenza runtime non dimostra tali fatti.',
    transfers: 'Rivedere il perimetro dei trasferimenti internazionali',
  },
  de: {
    eyebrow: 'Aktuelle Runtime-Nachweise',
    title: 'Technische Anbieteraktivität und rechtliche Freigabe werden getrennt bewertet.',
    body: 'Zuordenbare Production-Nachweise bestätigen derzeit Upstash Redis im verteilten Hochrisiko-Rate-Limit-Pfad sowie eine PostHog-Integration. Das für Assurance verbundene PostHog-Projekt ist nicht das Production-Projekt.',
    evidence: ['Upstash-Runtime-Binding: für die beobachtete Production-Anfrage nachgewiesen.', 'PostHog-Binding in Production: vorhanden; Abweichung des Assurance-Projekts dokumentiert.', 'Vercel, Supabase, Stripe und Sentry bleiben innerhalb des bereits belegten Production-Anbieterumfangs.'],
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
