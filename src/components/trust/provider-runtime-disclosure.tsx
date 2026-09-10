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
  eyebrow: 'Provider evidence boundary — 10 September 2026',
  title: 'Current provider facts and legal approval are tracked separately.',
  body: 'The current connected-account reconciliation proves selected account/project facts without turning them into DPA, transfer or role approval. Vercel team/project/domain binding and the Supabase Production project region were revalidated today. The connected Stripe session exposes the LIVE RISCK COMPLY SAAS account, but its detail call failed, so detail fields are not promoted as current. Other providers retain their specific current, historical or unverified evidence state.',
  evidence: [
    'Vercel: connected team is Pro; eurocomply-saas is linked to the correct GitHub repository and the risckcomply.com domains. Complete processing/support locations, account-applicable DPA, retention and transfer treatment remain open.',
    'Supabase: Production project tganhbbhfxcpblmgqprg is ACTIVE_HEALTHY in eu-west-1 (Ireland). Project region does not prove all support/onward-processing locations or Chapter V treatment.',
    'Stripe: the connected LIVE RISCK COMPLY SAAS account is discoverable. The current account-detail call failed, so country, business type, contracting entity and transfer facts are not represented as revalidated by this surface.',
    'GitHub Actions: protected release/recovery workflows can transiently process Production database data on GitHub-hosted runners; applicable account DPA, transfer treatment and final legal role remain open.',
    'Google OAuth / Identity: runtime authentication integration exists through Supabase Auth; applicable terms, role, locations, retention and transfer treatment remain under review.',
    'Google Workspace: corporate mail is operational; prior plan/EMEA billing evidence does not establish a processing region or current CDPA/transfer position.',
    'Sentry: integration remains present; earlier direct exact-release runtime proof is historical until current protected provider acceptance and account facts are refreshed.',
    'PostHog: Production source/configuration historically targeted EU endpoints, but the connected assurance project did not match the Production project; actual Production account/DPA facts remain open.',
    'Upstash: distributed Redis-backed rate limiting remains implemented. Earlier direct Production proof is historical; current protected provider acceptance plus account plan/region/retention/DPA/transfer facts remain open.',
    'Resend and external malware/content scanning: historical or conditional implementation evidence does not establish current exact-release account/provider acceptance; current binding and legal facts must be verified before customer reliance.',
  ],
  open: 'Runtime integration, connected-account facts, exact-release binding, protected producer acceptance, provider contract/DPA coverage and qualified legal role/transfer decisions are separate evidence gates. A technical PASS is never treated as contractual or legal acceptance by this surface.',
  transfers: 'Review international-transfer boundary',
};

const pt: ProviderDisclosureCopy = {
  eyebrow: 'Limite de evidência dos fornecedores — 10 de setembro de 2026',
  title: 'Factos atuais dos fornecedores e aprovação jurídica são acompanhados separadamente.',
  body: 'A reconciliação atual de contas conectadas prova factos selecionados de conta/projeto sem os transformar em aprovação de DPA, transferências ou função jurídica. O binding de equipa/projeto/domínios da Vercel e a região do projeto Supabase Production foram revalidados hoje. A sessão Stripe conectada expõe a conta LIVE RISCK COMPLY SAAS, mas a chamada de detalhes falhou, pelo que esses campos não são promovidos como atuais. Os restantes fornecedores mantêm o seu estado específico de evidência atual, histórica ou não verificada.',
  evidence: [
    'Vercel: a equipa conectada é Pro; eurocomply-saas está ligado ao repositório GitHub correto e aos domínios risckcomply.com. Localizações completas de tratamento/suporte, DPA aplicável à conta, retenção e transferências continuam abertos.',
    'Supabase: o projeto Production tganhbbhfxcpblmgqprg está ACTIVE_HEALTHY em eu-west-1 (Irlanda). A região do projeto não prova todas as localizações de suporte/tratamento ulterior nem o tratamento do Capítulo V.',
    'Stripe: a conta LIVE RISCK COMPLY SAAS é identificável na sessão conectada. A chamada atual de detalhes falhou, pelo que country, business type, entidade contratante e transferências não são apresentados como revalidados nesta superfície.',
    'GitHub Actions: workflows protegidos de release/recovery podem tratar transitoriamente dados da base Production em GitHub-hosted runners; DPA aplicável, transferências e função jurídica final continuam abertos.',
    'Google OAuth / Identity: integração de autenticação existe através do Supabase Auth; termos aplicáveis, função, localizações, retenção e transferências continuam em revisão.',
    'Google Workspace: correio corporativo está operacional; evidência anterior de plano/entidade EMEA não estabelece região de tratamento nem a posição atual de CDPA/transferências.',
    'Sentry: a integração permanece presente; prova direta exact-release anterior é histórica até nova aceitação protegida atual e revalidação dos factos da conta.',
    'PostHog: source/configuração Production historicamente apontou para endpoints UE, mas o projeto assurance conectado não correspondeu ao Production; factos da conta/DPA Production permanecem abertos.',
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
  const text = copy[locale] ?? en;

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
