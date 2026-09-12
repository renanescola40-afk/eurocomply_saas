import { PublicLegalReviewPage } from '@/components/legal/public-legal-review-page';
import { isSupportedLocale, type Locale } from '@/lib/i18n/locales';

export const revalidate = 300;

const LAST_UPDATED = '12 September 2026';

type TermsCopy = {
  eyebrow: string;
  title: string;
  summary: string;
  sections: Array<{ title: string; paragraphs?: string[]; items?: string[] }>;
};

const en: TermsCopy = {
  eyebrow: 'Terms of Service — review draft',
  title: 'Business service terms for RISCK COMPLY',
  summary:
    'This public review draft records the current product and commercial contract structure for RISCK COMPLY business customers. Owner commercial-risk positions are now selected through Legal Package V1, but this is not yet an effective agreement: authoritative registered/tax facts, provider-dependent facts, qualified legal review and deliberate final publication remain explicit acceptance gates.',
  sections: [
    {
      title: 'Parties, status and business scope',
      paragraphs: [
        'Current attributable evidence records an owner-designated RISCK COMPLY operator, contracting entity and seller internally, but this public review draft does not publish a final customer-facing legal party identity until the authoritative registered office, registered identifiers and signatory facts are confirmed. Operator designation alone does not establish those customer-facing registry facts.',
        'The current commercial motion is business-to-business. The customer is intended to be the business or other professional organisation identified in the applicable order, checkout or account record. This draft does not attempt to waive mandatory rights that may apply by law.',
      ],
    },
    {
      title: 'Service and product boundary',
      paragraphs: [
        'RISCK COMPLY provides a multi-tenant SaaS workspace for AI inventory, governance workflows, risk and obligation support, documents, tasks, vendors, evidence, audit operations and plan-controlled features. Availability depends on the purchased plan, active add-ons and deployed configuration.',
        'The service supports compliance operations and evidence preparation. It is not legal, tax or regulatory advice and does not itself provide certification, conformity assessment, CE marking, regulator approval or a guarantee that a customer is compliant.',
      ],
    },
    {
      title: 'Accounts, organisations and authorised users',
      paragraphs: [
        'Customers are expected to provide accurate account information, protect credentials, maintain authorised users and remove access that is no longer required. Organisation administrators control membership and role assignments within the permissions exposed by the service.',
        'The customer remains responsible for its users, submitted information and business decisions, except to the extent responsibility must be allocated differently under the final agreement or applicable law.',
      ],
    },
    {
      title: 'Customer content and instructions',
      paragraphs: [
        'Customers retain ownership and control of Customer Content. The proposed service terms require only the rights reasonably needed to host, process, secure, support, export and otherwise operate the contracted service in accordance with the agreement, the DPA where applicable and lawful customer instructions.',
        'Customer Content is not authorised for training third-party or provider AI/ML models without separate specific lawful authority or authorisation and an implemented, disclosed processing arrangement.',
      ],
    },
    {
      title: 'AI and compliance outputs',
      paragraphs: [
        'Classifications, scores, generated documents, alerts, checklists and recommendations are operational aids based on supplied information, configured rules and product logic. They require customer review and human oversight before material legal, regulatory, employment, fundamental-rights or other high-impact reliance.',
        'Customers must not represent a RISCK COMPLY output as a regulator decision, certification, formal conformity assessment or qualified legal opinion unless a separate attributable authority has actually provided that status.',
      ],
    },
    {
      title: 'Acceptable use',
      items: [
        'Do not access another tenant or resource without authorisation or attempt to bypass authentication, authorisation, rate limits or other security controls.',
        'Do not introduce malware, intentionally impair availability, probe or test systems without permission, or use unlawfully obtained credentials.',
        'Do not use the service to carry out unlawful activity, prohibited AI practices, unlawful surveillance or discriminatory conduct.',
        'Do not upload payment-card secrets, credentials, special-category personal data, criminal-offence data or other highly sensitive records as an ordinary use case unless the relevant feature, contract and safeguards expressly support that processing.',
        'Do not present generated material as a substitute for professional or regulatory review where such review is required.',
      ],
    },
    {
      title: 'Orders, plans, subscriptions and add-ons',
      paragraphs: [
        'Plan and add-on availability is governed by the active billing catalogue and the customer order or provider-backed checkout. A public URL, browser state or documentation entry does not grant an entitlement by itself.',
        'For supported recurring subscriptions, the owner-selected drafting position is automatic renewal for the same billing period until cancelled, subject to the applicable order or checkout and mandatory law. Material price changes intended to affect a future renewal should be notified at least 30 days before the affected renewal, subject to final qualified drafting.',
        'For supported self-service subscriptions, cancellation is implemented for the end of the already-paid billing period and reactivation is supported before that period ends. Supported upgrades may use provider proration; supported downgrades may take effect in the next billing period. Contract-managed Enterprise terms may differ where expressly agreed in an order form.',
        'Exact prices, billing intervals, included capabilities and purchasable add-ons must match the current billing authority at purchase time. This Terms page does not freeze a marketing price or silently expand the purchased entitlement.',
      ],
    },
    {
      title: 'Taxes, refunds and payment failure — review boundary',
      paragraphs: [
        'Seller VAT/tax registrations and invoice treatment must match the owner-designated contracting/seller entity and authoritative tax facts. Current source implements billing-address collection, tax-ID collection and Stripe Checkout automatic tax, but that implementation does not establish the seller’s actual Portuguese VAT regime or registrations.',
        'The current attributable owner position is no default general refund, subject to mandatory law, provider/billing errors, duplicate charges, the applicable order form and any expressly negotiated credits or remedies. This is an owner-selected position for counsel review, not yet a binding customer clause.',
        'For ordinary failed or unpaid billing, the owner-selected drafting position provides a 7-day cure opportunity after notice before ordinary non-payment suspension. Faster suspension may apply where reasonably necessary for fraud, security abuse, unlawful activity or material service/tenant risk. Final enforceability remains subject to qualified review.',
      ],
    },
    {
      title: 'Confidentiality',
      paragraphs: [
        'The proposed contract structure requires each party to protect the other party’s confidential information with reasonable care and to use it only for the agreement. Standard exclusions for independently developed, lawfully received, already-public or legally compelled information remain subject to final drafting and qualified review.',
        'Compelled-disclosure, duration, remedies and residual-knowledge mechanics remain counsel-drafting items; no missing owner commercial preference is implied.',
      ],
    },
    {
      title: 'Data protection and security',
      paragraphs: [
        'Provider-controlled personal-data processing is addressed by the Privacy Policy review surface. Customer-controlled personal data processed on customer instructions is intended to be governed by the DPA where applicable. Final controller/processor allocation remains activity-specific and subject to the executed agreement.',
        'Security commitments are limited to implemented controls and attributable evidence. No certification, penetration-test result, fixed RPO/RTO, backup promise or encryption specification is incorporated into a customer contract merely because it appears in marketing, source code or an internal evidence pack.',
        'The owner position is no default uptime SLA or blanket service-credit commitment unless expressly contracted. Enterprise SLA commitments must remain technically supportable, evidence-bound and expressly accepted.',
      ],
    },
    {
      title: 'Service providers, subprocessors and international transfers',
      paragraphs: [
        'RISCK COMPLY depends on configured cloud, database, authentication, payment, observability, analytics, email and other providers. The public Subprocessors and International Transfers review surfaces disclose the current evidence boundary without treating a provider as contractually or legally approved solely because it is listed.',
        'The owner-selected DPA model uses general written subprocessor authorisation with a 30-day advance-notice target for a new material subprocessor where practicable and contractually applicable, plus reasonable data-protection objection mechanics. Provider/account facts, Chapter V mechanisms and final qualified drafting remain open.',
      ],
    },
    {
      title: 'Intellectual property and licence',
      paragraphs: [
        'Customers retain ownership and control of Customer Content and may use customer-facing documents and outputs generated for their business, subject to third-party rights, applicable law and the final agreement. RISCK COMPLY retains rights in the service, source/software, platform architecture, product design, reusable templates/frameworks, brand and know-how.',
        'Non-confidential feedback may be used to improve the product. Customer Content is not authorised for model training without separate specific authority. Third-party materials and Enterprise-specific IP commitments remain subject to final qualified drafting.',
      ],
    },
    {
      title: 'Suspension, termination and post-termination access',
      paragraphs: [
        'The owner-selected drafting position provides a 30-day cure period after notice for a curable material contractual breach. Immediate termination may be reserved for severe security abuse, unlawful activity, fraud, deliberate cross-tenant compromise, material non-curable misuse, or where continued service would violate law or binding provider/regulatory requirements. These positions remain subject to final qualified drafting.',
        'Self-service cancellation preserves paid access until the end of the active paid period. The owner has selected a 30-day post-termination customer export-window position, but product capability, privacy/retention duties, provider constraints and final counsel wording must still be reconciled before it becomes a binding promise.',
        'Deletion after termination remains subject to the DPA, category-specific retention, documented legal holds, billing/accounting records, immutable audit requirements and verified provider lifecycle constraints. This draft does not promise an unsupported deletion or backup timetable.',
      ],
    },
    {
      title: 'Warranties and compliance disclaimers',
      paragraphs: [
        'The owner position is no default uptime SLA or blanket service-credit commitment unless expressly contracted. Standard drafting may commit only to providing the service materially in accordance with applicable documentation and mandatory legal obligations, without guaranteeing uninterrupted/error-free operation or customer-specific compliance outcomes.',
        'No warranty is proposed that using RISCK COMPLY automatically makes a customer compliant, eliminates legal risk or satisfies every customer-specific regulatory requirement.',
      ],
    },
    {
      title: 'Indemnities and liability — counsel decision required',
      paragraphs: [
        'The owner-selected position is no broad open-ended indemnity in standard self-service Terms. Customers remain responsible for unlawful use and unlawful customer content/instructions; provider IP or other indemnity commitments may be negotiated for Enterprise agreements and remain subject to qualified drafting.',
        'The owner-proposed standard aggregate liability cap is fees paid or payable for the affected service during the 12 months preceding the event giving rise to liability. Indirect/consequential loss, lost profits and similar remote losses should be excluded to the lawful extent; fraud, wilful misconduct and legally non-limitable liability remain outside contractual limitation. Confidentiality, data-protection and IP carve-out treatment remains subject to qualified review. No liability cap or indemnity is represented as effective by this review draft.',
      ],
    },
    {
      title: 'Renewal, changes and order precedence',
      paragraphs: [
        'The owner-selected drafting position is automatic renewal for supported recurring subscriptions until cancelled and a 30-day notice target for material price changes affecting a future renewal, subject to the live checkout/order process, mandatory law and qualified review.',
        'The proposed precedence model is: signed order form, signed DPA for covered processing, negotiated service schedule, final Terms, then public documentation. The final enforceability and incorporation mechanics require qualified review; public pages do not expand signed commitments.',
      ],
    },
    {
      title: 'Governing law, disputes and legal notices — review boundary',
      paragraphs: [
        'The owner-selected position is Portuguese governing law, courts of Lisbon, Portugal as the proposed standard forum, and no default arbitration. Mandatory jurisdiction rules, enforceability and negotiated Enterprise exceptions remain subject to qualified review.',
        'The owner-selected electronic contractual notice intake is comercial@risckcomply.com where electronic notice is legally and contractually sufficient. Formal postal notice awaits authoritative registered-office evidence, and deemed-receipt mechanics remain subject to final qualified drafting.',
      ],
    },
    {
      title: 'Final acceptance boundary',
      paragraphs: [
        'This page remains REVIEW_DRAFT · HUMAN_REVIEW_REQUIRED. Owner Legal Package V1 closes the remaining owner-policy choices, but the page becomes effective Terms only after authoritative registered and tax facts are settled, billing/provider/privacy dependencies are reconciled, the owner-selected clauses receive the qualified review required for enforceability and mandatory-law treatment, and the final version is deliberately published or incorporated into a customer agreement.',
      ],
    },
  ],
};

const pt: TermsCopy = {
  eyebrow: 'Termos de Serviço — rascunho para revisão',
  title: 'Termos empresariais do serviço RISCK COMPLY',
  summary:
    'Este rascunho público regista a estrutura contratual atual para clientes empresariais. As posições comerciais do owner estão agora selecionadas através do Legal Package V1, mas este ainda não é um acordo em vigor: factos registais/fiscais autoritativos, factos dependentes de fornecedores, revisão jurídica qualificada e publicação final deliberada continuam como gates de aceitação.',
  sections: [
    {
      title: 'Partes, estado e âmbito empresarial',
      paragraphs: [
        'A evidência atribuível regista internamente um operador, entidade contratante e vendedor da RISCK COMPLY designados pelo owner, mas este rascunho público não publica uma identidade jurídica final perante clientes enquanto sede registada, identificadores registados e autoridade de assinatura não estiverem confirmados de forma autoritativa. A designação do owner não substitui esses factos registais.',
        'A operação comercial atual é business-to-business. O cliente destina-se a ser a empresa ou organização profissional identificada na encomenda, checkout ou registo de conta aplicável. Este rascunho não procura afastar direitos imperativos aplicáveis.',
      ],
    },
    {
      title: 'Serviço e limite do produto',
      paragraphs: [
        'A RISCK COMPLY fornece um workspace SaaS multi-tenant para inventário de IA, workflows de governance, suporte a riscos e obrigações, documentos, tarefas, fornecedores, evidências, auditoria e funcionalidades controladas pelo plano/add-ons.',
        'O serviço apoia operações de compliance e preparação de evidências. Não constitui aconselhamento jurídico, fiscal ou regulatório e não fornece, por si só, certificação, avaliação de conformidade, marcação CE, aprovação de regulador ou garantia de compliance do cliente.',
      ],
    },
    {
      title: 'Contas, organizações e utilizadores autorizados',
      paragraphs: [
        'Os clientes devem fornecer informação de conta correta, proteger credenciais, manter apenas utilizadores autorizados e remover acessos que deixem de ser necessários. Administradores da organização controlam membros e funções dentro das permissões disponibilizadas.',
        'O cliente continua responsável pelos seus utilizadores, informação submetida e decisões empresariais, salvo quando o acordo final ou a lei aplicável imponham outra alocação.',
      ],
    },
    {
      title: 'Conteúdo do cliente e instruções',
      paragraphs: [
        'O cliente mantém a titularidade e controlo do Customer Content. Os termos propostos concedem à RISCK COMPLY apenas os direitos razoavelmente necessários para alojar, tratar, proteger, suportar, exportar e operar o serviço contratado ao abrigo do acordo e DPA aplicável.',
        'Customer Content não fica autorizado para treino de modelos de IA/ML de terceiros ou do fornecedor sem base/autoridade específica separada e um tratamento implementado e divulgado.',
      ],
    },
    {
      title: 'Saídas de IA e compliance',
      paragraphs: [
        'Classificações, scores, documentos, alertas, checklists e recomendações são auxiliares operacionais baseados na informação fornecida, regras configuradas e lógica do produto. Exigem revisão do cliente e supervisão humana antes de utilização material jurídica, regulatória, laboral, de direitos fundamentais ou de outro impacto elevado.',
        'O cliente não deve apresentar uma saída da RISCK COMPLY como decisão de regulador, certificação, avaliação formal de conformidade ou opinião jurídica qualificada sem autoridade atribuível que tenha efetivamente concedido esse estatuto.',
      ],
    },
    {
      title: 'Utilização aceitável',
      items: [
        'Não aceder a outro tenant ou recurso sem autorização nem tentar contornar autenticação, autorização, rate limits ou outros controlos de segurança.',
        'Não introduzir malware, prejudicar deliberadamente disponibilidade, testar sistemas sem permissão ou usar credenciais obtidas ilicitamente.',
        'Não utilizar o serviço para atividade ilícita, práticas de IA proibidas, vigilância ilícita ou conduta discriminatória.',
        'Não carregar segredos de cartões, credenciais, categorias especiais, dados relativos a infrações ou outros registos altamente sensíveis como utilização normal sem suporte expresso.',
        'Não apresentar material gerado como substituto de revisão profissional ou regulatória quando essa revisão for exigida.',
      ],
    },
    {
      title: 'Encomendas, planos, subscrições e add-ons',
      paragraphs: [
        'A disponibilidade de planos e add-ons é governada pelo catálogo ativo de faturação e pela encomenda ou checkout confirmado pelo provider. URL, estado do browser ou documentação não concedem entitlement por si só.',
        'Nas subscrições recorrentes suportadas, a posição de drafting selecionada é renovação automática pelo mesmo período até cancelamento, sujeita à encomenda/checkout e lei imperativa. Alterações materiais de preço destinadas a afetar uma renovação futura devem ser avisadas pelo menos 30 dias antes da renovação afetada, sujeito a redação jurídica final.',
        'Nas subscrições self-service suportadas, o cancelamento ocorre no fim do período já pago. Upgrades podem usar proration e downgrades podem produzir efeito no período seguinte. Termos Enterprise podem diferir por order form.',
      ],
    },
    {
      title: 'Impostos, reembolsos e falha de pagamento — limite de revisão',
      paragraphs: [
        'Registos fiscais/VAT e tratamento da fatura devem corresponder à entidade contratante/vendedora designada e a factos fiscais autoritativos. O código de billing não prova o regime ou registos de IVA efetivamente aplicáveis.',
        'A posição atribuível do owner é não existir reembolso geral por defeito, sujeito a lei imperativa, erros de billing/provider, cobranças duplicadas, order form aplicável e remédios expressamente negociados.',
        'Para falha de pagamento ordinária, a posição selecionada prevê 7 dias de cura após aviso antes de suspensão por falta de pagamento. Suspensão mais rápida pode aplicar-se perante fraude, abuso de segurança, atividade ilícita ou risco material. A eficácia jurídica final continua sujeita a revisão qualificada.',
      ],
    },
    {
      title: 'Confidencialidade',
      paragraphs: [
        'A estrutura proposta exige que cada parte proteja a informação confidencial da outra com cuidado razoável e a utilize apenas para o acordo. Exclusões padrão continuam sujeitas à redação final qualificada.',
        'Divulgação compulsória, duração, remédios e conhecimento residual são matérias de drafting jurídico; não representam uma decisão comercial do owner ainda em falta.',
      ],
    },
    {
      title: 'Proteção de dados e segurança',
      paragraphs: [
        'O tratamento próprio do prestador é tratado pela Política de Privacidade de revisão. Dados controlados pelo cliente e tratados sob instruções destinam-se a ser regidos pelo DPA quando aplicável.',
        'Compromissos de segurança ficam limitados a controlos implementados e evidência atribuível. Nenhuma certificação, pentest, RPO/RTO ou promessa de backup é incorporada apenas por existir em marketing/código/evidência interna.',
        'A posição do owner é não existir SLA de uptime nem service credits gerais por defeito salvo contratação expressa. Compromissos Enterprise devem ser tecnicamente suportáveis e evidence-bound.',
      ],
    },
    {
      title: 'Prestadores, subprocessadores e transferências internacionais',
      paragraphs: [
        'A RISCK COMPLY depende de fornecedores configurados. As superfícies de Subprocessadores e Transferências divulgam o limite de evidência sem converter presença do provider em aprovação contratual/jurídica.',
        'O modelo selecionado usa autorização geral escrita de subprocessadores, com alvo de 30 dias de aviso prévio para novo subprocessor material quando praticável/aplicável e objeção razoável por proteção de dados. Factos de conta/provider, mecanismos do Capítulo V e redação final permanecem abertos.',
      ],
    },
    {
      title: 'Propriedade intelectual e licença',
      paragraphs: [
        'O cliente mantém Customer Content e pode usar documentos/outputs produzidos para o seu negócio, sujeito a direitos de terceiros, lei aplicável e acordo final. A RISCK COMPLY mantém direitos sobre serviço, software, arquitetura, design, templates/frameworks reutilizáveis, marca e know-how.',
        'Feedback não confidencial pode ser usado para melhorar o produto. Customer Content não fica autorizado para model training sem autoridade específica separada.',
      ],
    },
    {
      title: 'Suspensão, cessação e acesso pós-cessação',
      paragraphs: [
        'A posição selecionada prevê 30 dias de cura após aviso para incumprimento material sanável. Cessação imediata pode ser reservada para abuso grave de segurança, atividade ilícita, fraude, comprometimento deliberado cross-tenant, abuso material não sanável ou proibição legal/provider. A redação final permanece sujeita a revisão qualificada.',
        'O cancelamento self-service preserva o acesso pago até ao fim do período ativo. O owner selecionou uma janela de exportação de 30 dias após cessação, ainda dependente de capacidade do produto, conservação, provider lifecycle e redação final.',
        'A eliminação continua sujeita ao DPA, retenção por categoria, legal holds, registos contabilísticos/auditoria e limites verificados de providers.',
      ],
    },
    {
      title: 'Garantias e limites de compliance',
      paragraphs: [
        'A posição do owner é não existir SLA de uptime nem service credits gerais por defeito salvo contratação expressa. A redação padrão não garante operação ininterrupta/sem erros nem compliance específico do cliente.',
        'Não é proposta garantia de que usar RISCK COMPLY torne automaticamente o cliente compliant, elimine risco jurídico ou satisfaça todos os requisitos específicos.',
      ],
    },
    {
      title: 'Indemnizações e responsabilidade — decisão jurídica necessária',
      paragraphs: [
        'A posição selecionada é não existir indemnização ampla e aberta nos Termos self-service padrão. O cliente continua responsável por utilização/conteúdo ilícito; indemnizações Enterprise podem ser negociadas e ficam sujeitas a revisão qualificada.',
        'O cap agregado padrão proposto pelo owner corresponde aos fees pagos ou a pagar pelo serviço afetado nos 12 meses anteriores ao evento. Perdas indiretas/consequenciais e lucros cessantes devem ser excluídos na medida legal; fraude, dolo e responsabilidade legalmente não limitável ficam fora do cap. O tratamento de confidencialidade, dados e IP continua sujeito a counsel. Nenhum cap ou indemnização é apresentado como eficaz por este rascunho.',
      ],
    },
    {
      title: 'Renovação, alterações e precedência documental',
      paragraphs: [
        'A posição selecionada é renovação automática das subscrições recorrentes suportadas até cancelamento e alvo de 30 dias para aviso de alteração material de preço que afete futura renovação, sujeito ao checkout/order process, lei imperativa e revisão qualificada.',
        'O modelo de precedência proposto é order form assinada, DPA assinado, schedule negociado, Termos finais e documentação pública. A incorporação final exige revisão qualificada.',
      ],
    },
    {
      title: 'Lei aplicável, litígios e notificações legais — limite de revisão',
      paragraphs: [
        'A posição selecionada é lei portuguesa, tribunais de Lisboa como foro padrão proposto e ausência de arbitragem por defeito, sujeito a jurisdição imperativa, enforceability e exceções Enterprise negociadas.',
        'O canal eletrónico contratual selecionado é comercial@risckcomply.com quando aviso eletrónico for juridicamente/contratualmente suficiente. Aviso postal formal aguarda sede registada autoritativa e regras de receção presumida continuam em revisão.',
      ],
    },
    {
      title: 'Limite de aceitação final',
      paragraphs: [
        'Esta página permanece REVIEW_DRAFT · HUMAN_REVIEW_REQUIRED. O Legal Package V1 fecha as decisões de política do owner, mas os Termos só se tornam eficazes depois de factos registais/fiscais autoritativos, dependências de billing/provider/privacy, revisão qualificada das cláusulas selecionadas e publicação/incorporação final deliberada.',
      ],
    },
  ],
};

const copy: Partial<Record<Locale, TermsCopy>> = { en, pt };

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  const contentLocale: Locale = copy[locale] ? locale : 'en';
  const page = copy[contentLocale] ?? en;

  return (
    <PublicLegalReviewPage
      locale={locale}
      contentLanguage={contentLocale}
      eyebrow={page.eyebrow}
      title={page.title}
      summary={page.summary}
      documentId="terms-of-service"
      version="0.3-review"
      lastUpdated={LAST_UPDATED}
      sections={page.sections}
    />
  );
}
