import { PublicLegalReviewPage } from '@/components/legal/public-legal-review-page';
import { isSupportedLocale, type Locale } from '@/lib/i18n/locales';

export const revalidate = 300;

const LAST_UPDATED = '10 September 2026';

type TransferCopy = {
  eyebrow: string;
  title: string;
  summary: string;
  sections: Array<{ title: string; paragraphs?: string[]; items?: string[] }>;
};

const en: TransferCopy = {
  eyebrow: 'International Data Transfers — review draft',
  title: 'Provider locations, transfer mechanisms and evidence boundaries',
  summary: 'This public review draft separates current provider/location facts from GDPR Chapter V legal conclusions. It does not claim that an adequacy basis, SCC, DPA, supplementary measure or transfer assessment applies to an account unless attributable evidence and the required legal review support that conclusion.',
  sections: [
    {
      title: 'How this register works',
      paragraphs: [
        'A provider being incorporated outside the EEA does not by itself prove a particular international transfer, and an EU runtime region does not by itself prove that no third-country support access or onward transfer can occur. Each real data flow must be assessed using its actual provider account, processing/access locations, onward providers and applicable contract.',
        'Runtime presence, source configuration, plan level, billing entity and historical release evidence are useful factual signals but are not substitutes for an account-applicable transfer mechanism or qualified legal determination.',
      ],
    },
    {
      title: 'Supabase',
      paragraphs: [
        'The connected RISCK COMPLY Production project is currently ACTIVE_HEALTHY in eu-west-1 (Ireland), revalidated on 10 September 2026. This is a current technical project-region fact.',
        'The project region does not establish every support/access/onward-processing location or, by itself, prove an account-applicable DPA or Chapter V mechanism. Those items remain contract/provider evidence gates.',
      ],
    },
    {
      title: 'Vercel',
      paragraphs: [
        'The connected Vercel team is currently Pro. The eurocomply-saas project is linked to the correct GitHub repository and configured domains include www.risckcomply.com and risckcomply.com. These account/project/domain facts were revalidated on 10 September 2026.',
        'Project binding and plan level do not establish the complete processing/support location set, DPA applicability, retention configuration or Chapter V mechanism. No historical function-region observation is promoted into a permanent contractual location claim.',
      ],
    },
    {
      title: 'Stripe',
      paragraphs: [
        'The connected session currently exposes the LIVE RISCK COMPLY SAAS Stripe account. The account-detail revalidation attempted by this legal-assurance lane failed at connector execution, so this revision does not promote country, business type, contracting entity or transfer details as newly revalidated facts.',
        'Billing integration or LIVE account discovery does not by itself establish Stripe role allocation, account-applicable contractual terms, processing locations, retention or the Chapter V treatment of each billing data flow.',
      ],
    },
    {
      title: 'Other operational providers',
      items: [
        'Google OAuth / Google Identity: authentication integration exists through Supabase Auth; applicable terms, legal role, complete locations, retention and transfer treatment remain under review.',
        'Google Workspace: corporate mail is operational. Prior plan/EMEA billing evidence is not treated as a storage/processing-region conclusion; current account agreement/CDPA and onward-transfer facts remain evidence-required.',
        'GitHub / GitHub Actions: repository and protected CI/recovery workflows are operational, and authorised workflows can transiently process Production database data on GitHub-hosted runners. Applicable account DPA, runner processing/transfer treatment and final customer-facing legal role remain open.',
        'Sentry: integration remains present, while earlier exact-release runtime evidence is historical until refreshed current protected provider acceptance; organisation region, retention and account-applicable DPA/transfer facts remain open.',
        'PostHog: Production source/configuration has historically targeted EU endpoints, but the connected assurance project did not match the Production project; the actual Production account, retention and account-linked DPA/transfer facts remain unverified.',
        'Upstash: the distributed Redis-backed rate-limit/security integration remains implemented. Earlier direct Production proof is historical; current protected provider/runtime acceptance plus account plan/owner, region, retention, DPA and transfer facts remain open.',
        'Resend / transactional email: historical delivery evidence exists, but current exact-release provider/account binding and applicable region, retention, DPA and transfer facts remain open.',
        'Malware/content scanner: an external scanner is treated as conditional until an active provider/account is attributable; no transfer conclusion is made for an unverified provider.',
      ],
    },
    {
      title: 'Chapter V decision states',
      items: [
        'NO_THIRD_COUNTRY_TRANSFER_EVIDENCED is used only where the complete relevant processing/access chain supports that conclusion.',
        'ADEQUACY_DECISION requires the exact applicable adequacy basis and the data flow it covers.',
        'SCC_2021_914 requires the applicable module or modules, attributable execution/acceptance evidence and supplementary-measures or transfer-impact analysis where required.',
        'Another lawful Chapter V mechanism must be identified with attributable evidence before reliance.',
        'BLOCKED is the correct state where account facts, processing/access locations or legal analysis are insufficient.',
      ],
    },
    {
      title: 'Article 28 clauses are not transfer SCCs',
      paragraphs: [
        'Commission Implementing Decision (EU) 2021/915 provides standard contractual clauses for controller-processor Article 28 contracting. Those clauses do not by themselves ensure compliance with GDPR Chapter V for international transfers.',
        'Where SCCs are the relevant Chapter V mechanism, the applicable transfer clauses and modules must be assessed separately, including Decision (EU) 2021/914 where applicable. This review draft does not represent any SCC as executed unless account-specific evidence supports it.',
      ],
    },
    {
      title: 'Customer contracting and final acceptance',
      paragraphs: [
        'The final DPA, subprocessor register and transfer annex must describe the providers actually used for customer personal data, the applicable locations and roles, and the transfer mechanism for each relevant flow. A material provider change must follow the final customer notice/authorisation mechanics where required.',
        'This page remains REVIEW_DRAFT · HUMAN_REVIEW_REQUIRED. International transfer closure requires account-specific provider/contract evidence and qualified legal analysis where the decision is legal rather than purely factual.',
      ],
    },
  ],
};

const pt: TransferCopy = {
  eyebrow: 'Transferências Internacionais de Dados — rascunho para revisão',
  title: 'Localizações de fornecedores, mecanismos de transferência e limites de evidência',
  summary: 'Este rascunho público separa factos atuais de fornecedores/localização das conclusões jurídicas do Capítulo V do RGPD. Não afirma que adequação, SCC, DPA, medida suplementar ou avaliação de transferência se aplica a uma conta sem evidência atribuível e a revisão jurídica necessária.',
  sections: [
    { title: 'Como funciona este registo', paragraphs: ['Um fornecedor estar constituído fora do EEE não prova, por si só, uma transferência internacional específica, e uma região de runtime na UE não prova que nunca exista acesso de suporte ou transferência ulterior para país terceiro. Cada fluxo real deve ser avaliado através da conta efetiva, localizações de tratamento/acesso, fornecedores ulteriores e contrato aplicável.', 'Presença em runtime, configuração no source, nível do plano, entidade de faturação e evidência histórica de release são sinais factuais úteis, mas não substituem um mecanismo aplicável à conta nem uma decisão jurídica qualificada.'] },
    { title: 'Supabase', paragraphs: ['O projeto Production da RISCK COMPLY está atualmente ACTIVE_HEALTHY em eu-west-1 (Irlanda), revalidado em 10 de setembro de 2026. Este é um facto técnico atual da região do projeto.', 'A região do projeto não estabelece todas as localizações de suporte/acesso/tratamento ulterior nem prova, por si só, DPA ou mecanismo do Capítulo V aplicável à conta.'] },
    { title: 'Vercel', paragraphs: ['A equipa Vercel conectada está atualmente no plano Pro. O projeto eurocomply-saas está ligado ao repositório GitHub correto e os domínios configurados incluem www.risckcomply.com e risckcomply.com. Estes factos foram revalidados em 10 de setembro de 2026.', 'Binding do projeto e plano não estabelecem todas as localizações de tratamento/suporte, DPA aplicável, retenção ou mecanismo do Capítulo V. Nenhuma observação histórica de região de função é promovida a localização contratual permanente.'] },
    { title: 'Stripe', paragraphs: ['A sessão conectada expõe atualmente a conta LIVE RISCK COMPLY SAAS. A revalidação de detalhes da conta tentada por este lane falhou na execução do connector, pelo que country, business type, entidade contratante e dados de transferência não são promovidos como factos revalidados nesta revisão.', 'Integração de faturação ou descoberta da conta LIVE não estabelece, por si só, papéis, termos contratuais aplicáveis, localizações, conservação ou tratamento do Capítulo V.'] },
    { title: 'Outros fornecedores operacionais', items: ['Google OAuth / Google Identity: integração de autenticação existe através do Supabase Auth; termos aplicáveis, função jurídica, localizações completas, retenção e transferências continuam em revisão.', 'Google Workspace: o correio corporativo está operacional. Evidência anterior de plano/entidade EMEA não é tratada como conclusão de região de armazenamento/tratamento; acordo/CDPA e transferências ulteriores atuais ainda exigem evidência.', 'GitHub / GitHub Actions: repositório e workflows protegidos de CI/recovery estão ativos, e workflows autorizados podem tratar transitoriamente dados da base Production em GitHub-hosted runners. DPA da conta, tratamento/transferências nos runners e função jurídica final continuam abertos.', 'Sentry: a integração permanece presente; evidência exact-release anterior é histórica até nova aceitação protegida atual. Região, retenção, DPA e transferências da conta permanecem abertos.', 'PostHog: source/configuração Production historicamente apontou para endpoints UE, mas o projeto assurance conectado não correspondeu ao projeto Production; conta real, retenção, DPA e transferências ainda não estão verificados.', 'Upstash: a integração Redis de rate-limit/segurança permanece implementada. Prova direta anterior é histórica; aceitação protegida atual e plano/owner, região, retenção, DPA e transferências continuam abertos.', 'Resend / email transacional: existe evidência histórica de entrega, mas binding atual exact-release e factos de conta/região/retenção/DPA/transferências continuam abertos.', 'Malware/content scanner: fornecedor externo permanece condicional até existir atribuição de provider/conta; não é feita conclusão de transferência para fornecedor não verificado.'] },
    { title: 'Estados de decisão do Capítulo V', items: ['NO_THIRD_COUNTRY_TRANSFER_EVIDENCED apenas quando toda a cadeia relevante de tratamento/acesso sustenta a conclusão.', 'ADEQUACY_DECISION exige a base de adequação exata e o fluxo coberto.', 'SCC_2021_914 exige módulo(s) aplicável(eis), evidência atribuível de execução/aceitação e medidas suplementares/TIA quando exigidas.', 'Outro mecanismo legítimo do Capítulo V deve ser identificado com evidência antes de ser usado.', 'BLOCKED é o estado correto quando faltam factos da conta, localizações ou análise jurídica.'] },
    { title: 'Cláusulas do artigo 28.º não são SCC de transferência', paragraphs: ['A Decisão de Execução (UE) 2021/915 fornece cláusulas-tipo para contratação responsável-subcontratante do artigo 28.º. Essas cláusulas não garantem, por si só, conformidade com o Capítulo V para transferências internacionais.', 'Quando SCC são o mecanismo do Capítulo V, as cláusulas e módulos de transferência aplicáveis devem ser avaliados separadamente, incluindo a Decisão (UE) 2021/914 quando aplicável. Nenhuma SCC é apresentada como celebrada sem evidência específica da conta.'] },
    { title: 'Contratação com clientes e aceitação final', paragraphs: ['O DPA final, registo de subprocessadores e anexo de transferências devem refletir os fornecedores realmente utilizados para dados pessoais de clientes, localizações/papéis aplicáveis e o mecanismo de cada fluxo relevante. Alterações materiais devem seguir o mecanismo final de aviso/autorização quando exigido.', 'Esta página permanece REVIEW_DRAFT · HUMAN_REVIEW_REQUIRED. O fecho de transferências exige evidência específica de provider/conta/contrato e análise jurídica qualificada quando a decisão é jurídica e não apenas factual.'] },
  ],
};

const copy: Partial<Record<Locale, TransferCopy>> = { en, pt };

export default async function TransfersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  // Fail closed to the complete English review text until a clause-equivalent
  // reviewed translation exists for the requested locale.
  const page = copy[locale] ?? en;

  return (
    <PublicLegalReviewPage
      locale={locale}
      eyebrow={page.eyebrow}
      title={page.title}
      summary={page.summary}
      documentId="international-data-transfers"
      version="0.2-review"
      lastUpdated={LAST_UPDATED}
      sections={page.sections}
    />
  );
}
