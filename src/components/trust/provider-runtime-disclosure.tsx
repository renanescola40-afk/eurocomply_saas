import Link from 'next/link';

import { type Locale } from '@/lib/i18n/routing';

type ProviderDisclosureCopy = {
  eyebrow: string;
  title: string;
  body: string;
  evidence: string[];
  open: string;
  transfers: string;
};

const en: ProviderDisclosureCopy = {
  eyebrow: 'Provider evidence boundary — 11 November 2026',
  title: 'Current provider facts and legal approval are tracked separately.',
  body: 'The current connected-account reconciliation proves selected account/project facts without turning them into DPA, transfer or role approval. Vercel team/project/domain binding and the Supabase Production project region were revalidated on 10 September 2026. The connected Stripe session exposes the LIVE RISCK COMPLY SAAS account, but its detail call failed, so detail fields are not promoted as current. A connected PostHog project was revalidated on 11 November 2026, but it has not been bound to the canonical Production project token.',
  evidence: [
    'Vercel: the connected team is Pro; the RISCK COMPLY Vercel project is linked to the correct GitHub repository and the risckcomply.com domains. Complete processing/support locations, account-applicable DPA, retention and transfer treatment remain open.',
    'Supabase: Production project tganhbbhfxcpblmgqprg is ACTIVE_HEALTHY in eu-west-1 (Ireland). Project region does not prove all support/onward-processing locations or Chapter V treatment.',
    'Stripe: the connected LIVE RISCK COMPLY SAAS account is discoverable. The current account-detail call failed, so country, business type, contracting entity and transfer facts are not represented as revalidated by this surface.',
    'GitHub: the canonical source and review system. GitHub Actions executed genuine workflows on 11 November 2026; earlier budget limits do not prove all present runner execution is blocked; historical GitHub-hosted runners could have handled protected Production data. Account DPA, transfer treatment and retention for those past workflows remain open.',
    'CircleCI: current external source-only CI publishes real exact-commit GitHub checks, not QA or Production runtime proof. Account DPA, locations of runners/support, artifact retention, transfer mechanism and any customer-data role remain open.',
    'Google OAuth / Identity: runtime authentication integration exists through Supabase Auth; applicable terms, role, locations, retention and transfer treatment remain under review.',
    'Google Workspace: corporate mail is operational; prior plan/EMEA billing evidence does not establish a processing region or current CDPA/transfer position.',
    'Sentry: integration remains present; earlier direct exact-release runtime proof is historical until current protected provider acceptance and account facts are refreshed.',
    'PostHog: connected Default project 209928 reports ingested_event=true and EU ingestion host in the 11 November 2026 provider readback. This does not prove that its token is used by canonical RISCK COMPLY Production; active data flows, account DPA, retention/deletion and Chapter V transfer analysis remain open.',
    'Upstash: distributed Redis-backed rate limiting remains implemented. Earlier direct Production proof is historical; current protected provider acceptance plus account plan/region/retention/DPA/transfer facts remain open.',
    'Resend and external malware/content scanning: historical or conditional implementation evidence does not establish current exact-release account/provider acceptance; current binding and legal facts must be verified before customer reliance.',
  ],
  open: 'Runtime integration, connected-account facts, exact-release binding, protected producer acceptance, provider contract/DPA coverage and qualified legal role/transfer decisions are separate evidence gates. A technical PASS is never treated as contractual or legal acceptance by this surface.',
  transfers: 'Review international-transfer boundary',
};

const pt: ProviderDisclosureCopy = {
  eyebrow: 'Limite de evidência dos fornecedores — 11 de novembro de 2026',
  title: 'Factos atuais dos fornecedores e aprovação jurídica são acompanhados separadamente.',
  body: 'A reconciliação atual de contas conectadas prova factos selecionados de conta/projeto sem os transformar em aprovação de DPA, transferências ou função jurídica. O binding de equipa/projeto/domínios da Vercel e a região do projeto Supabase Production foram revalidados em 10 de setembro de 2026. A sessão Stripe conectada expõe a conta LIVE RISCK COMPLY SAAS, mas a chamada de detalhes falhou. Um projeto PostHog conectado foi revalidado em 11 de novembro de 2026, mas ainda não foi associado ao token do projeto canónico de Production.',
  evidence: [
    'Vercel: a equipa conectada é Pro; o projeto Vercel da RISCK COMPLY está ligado ao repositório GitHub correto e aos domínios risckcomply.com. Localizações completas de tratamento/suporte, DPA aplicável à conta, retenção e transferências continuam abertos.',
    'Supabase: o projeto Production tganhbbhfxcpblmgqprg está ACTIVE_HEALTHY em eu-west-1 (Irlanda). A região do projeto não prova todas as localizações de suporte/tratamento ulterior nem o tratamento do Capítulo V.',
    'Stripe: a conta LIVE RISCK COMPLY SAAS é identificável na sessão conectada. A chamada atual de detalhes falhou, pelo que country, business type, entidade contratante e transferências não são apresentados como revalidados nesta superfície.',
    'GitHub: sistema canónico de código e revisão. Os GitHub Actions executaram workflows reais em 11 de novembro de 2026; bloqueios antigos de orçamento não provam indisponibilidade atual universal; GitHub-hosted runners anteriores podem ter tratado dados protegidos de Production. DPA, transferências e retenção desses fluxos históricos continuam em aberto.',
    'CircleCI: CI externo atual para testes source-only com checks reais associados ao commit GitHub, não prova de QA autenticado ou Production. DPA da conta, localizações de runners/suporte, retenção, transferências e eventual função relativa a dados de clientes continuam por confirmar.',
    'Google OAuth / Identity: integração de autenticação existe através do Supabase Auth; termos aplicáveis, função, localizações, retenção e transferências continuam em revisão.',
    'Google Workspace: correio corporativo está operacional; evidência anterior de plano/entidade EMEA não estabelece região de tratamento nem a posição atual de CDPA/transferências.',
    'Sentry: a integração permanece presente; prova direta exact-release anterior é histórica até nova aceitação protegida atual e revalidação dos factos da conta.',
    'PostHog: o projeto Default conectado 209928 indica ingested_event=true e endpoint de ingestão UE na revalidação de 11 de novembro de 2026. Isto não prova a utilização do token na Production canónica da RISCK COMPLY; fluxos de dados ativos, DPA da conta, retenção/eliminação e análise de transferências do Capítulo V permanecem em aberto.',
    'Upstash: o rate limiting distribuído Redis-backed permanece implementado. Prova direta anterior é histórica; aceitação protegida atual e plano/região/retenção/DPA/transferências da conta continuam abertos.',
    'Resend e scanning externo de malware/conteúdo: evidência histórica ou condicional não estabelece aceitação atual exact-release da conta/provider; binding e factos jurídicos devem ser verificados antes de reliance por clientes.',
  ],
  open: 'Integração runtime, factos de conta conectada, binding exact-release, aceitação protegida do producer, cobertura contratual/DPA e decisões jurídicas qualificadas de função/transferência são gates separados. Um PASS técnico nunca é tratado aqui como aceitação contratual ou jurídica.',
  transfers: 'Rever o limite de transferências internacionais',
};

const copy: Partial<Record<Locale, ProviderDisclosureCopy>> = { en, pt };

export function ProviderRuntimeDisclosure({ locale, slug }: { locale: Locale; slug: string }) {
  if (slug !== 'subprocessors') return null;
  // Current provider evidence is legally sensitive. Until a current, equivalent
  // translation exists, fail closed to the complete English evidence boundary.
  const contentLocale: Locale = copy[locale] ? locale : 'en';
  const text = copy[contentLocale] ?? en;

  return (
    <section className="relative z-10 px-6 pb-16" aria-labelledby="provider-runtime-evidence-title" lang={contentLocale}>
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
