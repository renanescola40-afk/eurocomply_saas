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
    'This public review draft records the current product and commercial contract structure for RISCK COMPLY business customers. It is not yet an effective agreement: the customer contracting/seller entity, authoritative registered/tax facts, remaining commercial-risk decisions and qualified legal review remain explicit acceptance gates.',
  sections: [
    {
      title: 'Parties, status and business scope',
      paragraphs: [
        'Current attributable evidence records an owner-designated RISCK COMPLY operator internally, but this public review draft does not publish a final customer-facing legal party identity until the contracting/seller counterparty, authoritative registered office, registered identifiers and signatory facts are confirmed. Operator designation alone does not establish those customer-facing legal roles.',
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
        'Customers retain their rights in customer content. The proposed service terms require only the rights reasonably needed to host, process, secure, support, export and otherwise operate the contracted service in accordance with the agreement, the DPA where applicable and lawful customer instructions.',
        'The customer is responsible for having a lawful basis or other authority for the information and instructions it provides, for keeping that information sufficiently accurate for its intended use, and for avoiding unsupported or unnecessary sensitive data.',
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
        'For supported self-service subscriptions, cancellation is implemented for the end of the already-paid billing period and reactivation is supported before that period ends. Supported upgrades may use provider proration; supported downgrades may take effect in the next billing period. Contract-managed Enterprise terms may differ where expressly agreed in an order form.',
        'Exact prices, billing intervals, included capabilities and purchasable add-ons must match the current billing authority at purchase time. This Terms page does not freeze a marketing price or silently expand the purchased entitlement.',
      ],
    },
    {
      title: 'Taxes, refunds and payment failure — review boundary',
      paragraphs: [
        'Seller VAT/tax registrations and invoice treatment must match the final contracting/seller entity and authoritative tax facts. Current source implements billing-address collection, tax-ID collection and Stripe Checkout automatic tax, but that implementation does not establish the seller’s actual Portuguese VAT regime or registrations.',
        'The current attributable owner position is no default general refund, subject to mandatory law, provider/billing errors, duplicate charges, the applicable order form and any expressly negotiated credits or remedies. This is an owner-selected position for counsel review, not yet a binding customer clause.',
        'The service can respond to failed or unpaid billing states, but final notice, cure, suspension, emergency-exception and restoration rules remain subject to owner decision and qualified legal review before they become binding contractual terms.',
      ],
    },
    {
      title: 'Confidentiality',
      paragraphs: [
        'The proposed contract structure requires each party to protect the other party’s confidential information with reasonable care and to use it only for the agreement. Standard exclusions for independently developed, lawfully received, already-public or legally compelled information remain subject to final drafting and qualified review.',
        'Any compelled-disclosure, duration, remedies and residual-knowledge rules remain contractual decisions and are not made final by this review page.',
      ],
    },
    {
      title: 'Data protection and security',
      paragraphs: [
        'Provider-controlled personal-data processing is addressed by the Privacy Policy review surface. Customer-controlled personal data processed on customer instructions is intended to be governed by the DPA where applicable. Final controller/processor allocation remains activity-specific and subject to the executed agreement.',
        'Security commitments are limited to implemented controls and attributable evidence. No certification, penetration-test result, fixed RPO/RTO, backup promise or encryption specification is incorporated into a customer contract merely because it appears in marketing, source code or an internal evidence pack.',
        'The current owner position is that there is no default uptime SLA unless one is expressly contracted. Any positive uptime, service-credit or performance warranty/remedy remains subject to final product facts, commercial approval and qualified review.',
      ],
    },
    {
      title: 'Service providers, subprocessors and international transfers',
      paragraphs: [
        'RISCK COMPLY depends on configured cloud, database, authentication, payment, observability, analytics, email and other providers. The public Subprocessors and International Transfers review surfaces disclose the current evidence boundary without treating a provider as contractually or legally approved solely because it is listed.',
        'Final subprocessor authorisation/notice/objection mechanics, account-specific DPA or SCC applicability, processing locations, transfer mechanisms, transfer-impact conclusions and supplementary measures remain subject to the DPA, provider evidence and qualified legal review where required.',
      ],
    },
    {
      title: 'Intellectual property and licence',
      paragraphs: [
        'The proposed structure preserves provider and licensor rights in the service, software, product design, templates and documentation, while granting the customer a limited right to use the contracted service during its subscription. Customer-content ownership and the exact licence needed to operate the service must remain consistent with the DPA, confidentiality terms and third-party rights.',
        'Feedback-use language, template/output ownership, third-party materials and any enterprise-specific IP commitments remain subject to final commercial and legal review.',
      ],
    },
    {
      title: 'Suspension, termination and post-termination access',
      paragraphs: [
        'The proposed contract may permit proportionate suspension for material security risk, unlawful use, material breach or qualifying non-payment. Final notice, cure periods, emergency exceptions and restoration obligations have not yet been legally approved and are not made binding by this draft.',
        'Self-service cancellation currently preserves paid access until the end of the active paid period. Contract-managed subscriptions remain subject to their order form. The owner has selected a 30-day post-termination customer export-window position, but product capability, privacy/retention duties, provider constraints and final counsel wording must still be reconciled before it becomes a binding promise.',
        'Deletion after termination remains subject to the DPA, category-specific retention, documented legal holds, billing/accounting records, immutable audit requirements and verified provider lifecycle constraints. This draft does not promise an unsupported deletion or backup timetable.',
      ],
    },
    {
      title: 'Warranties and compliance disclaimers',
      paragraphs: [
        'The owner position is no default uptime SLA unless expressly contracted. Any other positive service-performance warranty and remedies remain subject to product facts, commercial approval and qualified legal review. Until approved, this review page does not create an additional warranty beyond mandatory law or a separately signed commitment.',
        'No warranty is proposed that using RISCK COMPLY automatically makes a customer compliant, eliminates legal risk or satisfies every customer-specific regulatory requirement.',
      ],
    },
    {
      title: 'Indemnities and liability — counsel decision required',
      paragraphs: [
        'Customer unlawful-use/content indemnity, provider IP indemnity, defence-control mechanics, liability caps, excluded loss categories and carve-outs for matters such as fraud, wilful misconduct, confidentiality, data protection and intellectual property are not yet final.',
        'Those provisions materially allocate commercial risk and must be approved against the final contracting entity, insurance position, product risk and Portuguese/EU mandatory-law constraints. No liability cap or indemnity is represented as effective by this review draft.',
      ],
    },
    {
      title: 'Renewal, changes and order precedence',
      paragraphs: [
        'The final contract-formation and renewal wording must match the live checkout/order process and any negotiated Enterprise order. Material-change notice and renewal mechanics remain subject to owner and counsel approval.',
        'The proposed precedence model is: signed order form, signed DPA for covered processing, negotiated service schedule, final Terms, then public documentation. The final enforceability and incorporation mechanics require qualified review; public pages do not expand signed commitments.',
      ],
    },
    {
      title: 'Governing law, disputes and legal notices — review boundary',
      paragraphs: [
        'The current attributable owner preference is Portuguese governing law. That preference is not represented as a final binding choice until the contracting entity, mandatory-law analysis and qualified legal review are complete. Court/forum versus arbitration, venue, escalation mechanics and remedies remain unresolved.',
        'General corporate communications may be sent to comercial@risckcomply.com. Which notices have contractual legal effect, permitted delivery methods, deemed-receipt rules and any required postal or dedicated legal-notice channel remain subject to final contract drafting and qualified review.',
      ],
    },
    {
      title: 'Final acceptance boundary',
      paragraphs: [
        'This page remains REVIEW_DRAFT · HUMAN_REVIEW_REQUIRED. It becomes effective Terms only after the contracting/seller entity and authoritative registered facts are settled, remaining owner/counsel commercial decisions are completed, billing/tax facts are aligned, privacy/DPA/provider dependencies are reconciled, liability/indemnity/forum/notices and termination mechanics are approved, qualified legal review is attributable, and the final version is deliberately published or incorporated into a customer agreement.',
      ],
    },
  ],
};

const pt: TermsCopy = {
  eyebrow: 'Termos de Serviço — rascunho para revisão',
  title: 'Termos empresariais do serviço RISCK COMPLY',
  summary:
    'Este rascunho público regista a estrutura contratual atual do produto e da operação comercial da RISCK COMPLY para clientes empresariais. Ainda não é um acordo em vigor: entidade contratante/vendedora, factos registais/fiscais autoritativos, decisões de risco comercial ainda abertas e revisão jurídica qualificada continuam como gates explícitos de aceitação.',
  sections: [
    {
      title: 'Partes, estado e âmbito empresarial',
      paragraphs: [
        'A evidência atribuível atual regista internamente um operador da RISCK COMPLY designado pelo owner, mas este rascunho público não publica uma identidade jurídica final perante clientes enquanto a contraparte contratante/vendedora, sede registada, identificadores registados e autoridade de assinatura não estiverem confirmados. A designação de operador, por si só, não estabelece esses papéis jurídicos perante clientes.',
        'A operação comercial atual é business-to-business. O cliente destina-se a ser a empresa ou outra organização profissional identificada na encomenda, checkout ou registo de conta aplicável. Este rascunho não procura afastar direitos imperativos que possam aplicar-se por lei.',
      ],
    },
    {
      title: 'Serviço e limite do produto',
      paragraphs: [
        'A RISCK COMPLY fornece um workspace SaaS multi-tenant para inventário de IA, workflows de governance, suporte a riscos e obrigações, documentos, tarefas, fornecedores, evidências, operações de auditoria e funcionalidades controladas pelo plano. A disponibilidade depende do plano adquirido, add-ons ativos e configuração implementada.',
        'O serviço apoia operações de compliance e preparação de evidências. Não constitui aconselhamento jurídico, fiscal ou regulatório e não fornece, por si só, certificação, avaliação de conformidade, marcação CE, aprovação de regulador ou garantia de compliance do cliente.',
      ],
    },
    {
      title: 'Contas, organizações e utilizadores autorizados',
      paragraphs: [
        'Espera-se que os clientes forneçam informação de conta correta, protejam credenciais, mantenham apenas utilizadores autorizados e removam acessos que deixem de ser necessários. Administradores da organização controlam membros e funções dentro das permissões disponibilizadas pelo serviço.',
        'O cliente continua responsável pelos seus utilizadores, informação submetida e decisões empresariais, salvo quando a responsabilidade deva ser atribuída de outra forma pelo acordo final ou pela lei aplicável.',
      ],
    },
    {
      title: 'Conteúdo do cliente e instruções',
      paragraphs: [
        'O cliente mantém os seus direitos sobre o conteúdo do cliente. Os termos propostos exigem apenas os direitos razoavelmente necessários para alojar, tratar, proteger, suportar, exportar e operar o serviço contratado em conformidade com o acordo, o DPA quando aplicável e instruções lícitas do cliente.',
        'O cliente é responsável por possuir base jurídica ou outra autoridade para a informação e instruções fornecidas, manter essa informação suficientemente correta para o uso pretendido e evitar dados sensíveis desnecessários ou não suportados.',
      ],
    },
    {
      title: 'Saídas de IA e compliance',
      paragraphs: [
        'Classificações, scores, documentos gerados, alertas, checklists e recomendações são auxiliares operacionais baseados na informação fornecida, regras configuradas e lógica do produto. Exigem revisão do cliente e supervisão humana antes de utilização material jurídica, regulatória, laboral, de direitos fundamentais ou outra utilização de impacto elevado.',
        'O cliente não deve apresentar uma saída da RISCK COMPLY como decisão de regulador, certificação, avaliação formal de conformidade ou opinião jurídica qualificada sem que uma autoridade separada e atribuível tenha efetivamente concedido esse estatuto.',
      ],
    },
    {
      title: 'Utilização aceitável',
      items: [
        'Não aceder a outro tenant ou recurso sem autorização nem tentar contornar autenticação, autorização, rate limits ou outros controlos de segurança.',
        'Não introduzir malware, prejudicar deliberadamente a disponibilidade, testar sistemas sem permissão ou usar credenciais obtidas ilicitamente.',
        'Não utilizar o serviço para atividade ilícita, práticas de IA proibidas, vigilância ilícita ou conduta discriminatória.',
        'Não carregar segredos de cartões de pagamento, credenciais, categorias especiais de dados pessoais, dados relativos a infrações ou outros registos altamente sensíveis como utilização normal, salvo se a funcionalidade, contrato e salvaguardas suportarem expressamente esse tratamento.',
        'Não apresentar material gerado como substituto de revisão profissional ou regulatória quando essa revisão for exigida.',
      ],
    },
    {
      title: 'Encomendas, planos, subscrições e add-ons',
      paragraphs: [
        'A disponibilidade de planos e add-ons é governada pelo catálogo ativo de faturação e pela encomenda do cliente ou checkout confirmado pelo provider. Um URL público, estado do browser ou entrada de documentação não concede entitlement por si só.',
        'Nas subscrições self-service suportadas, o cancelamento é implementado para o fim do período de faturação já pago e a reativação é suportada antes desse período terminar. Upgrades suportados podem usar proration do provider; downgrades suportados podem produzir efeito no período seguinte. Termos Enterprise geridos por contrato podem ser diferentes quando expressamente acordados numa order form.',
        'Preços exatos, intervalos de faturação, capacidades incluídas e add-ons adquiríveis devem corresponder à autoridade de billing no momento da compra. Esta página não congela um preço de marketing nem expande silenciosamente o entitlement adquirido.',
      ],
    },
    {
      title: 'Impostos, reembolsos e falha de pagamento — limite de revisão',
      paragraphs: [
        'Registos fiscais/VAT do vendedor e tratamento da fatura devem corresponder à entidade contratante/vendedora final e a factos fiscais autoritativos. O código atual implementa recolha de morada de faturação, recolha de tax ID e Stripe Checkout automatic tax, mas essa implementação não prova o regime ou os registos de IVA portugueses efetivamente aplicáveis ao vendedor.',
        'A posição atribuível atual do owner é não existir reembolso geral por defeito, sujeito a lei imperativa, erros de billing/provider, cobranças duplicadas, order form aplicável e créditos ou remédios expressamente negociados. É uma posição selecionada para revisão jurídica, não uma cláusula vinculativa já aprovada.',
        'O serviço pode reagir a estados de faturação falhada ou em dívida, mas regras finais de aviso, cura, suspensão, exceções de emergência e restabelecimento permanecem sujeitas a decisão do owner e revisão jurídica qualificada antes de se tornarem cláusulas vinculativas.',
      ],
    },
    {
      title: 'Confidencialidade',
      paragraphs: [
        'A estrutura contratual proposta exige que cada parte proteja a informação confidencial da outra com cuidado razoável e a utilize apenas para o acordo. Exclusões padrão para informação desenvolvida independentemente, recebida licitamente, já pública ou cuja divulgação seja legalmente exigida continuam sujeitas à redação final e revisão qualificada.',
        'Regras de divulgação compulsória, duração, remédios e conhecimento residual continuam decisões contratuais e não se tornam finais através desta página de revisão.',
      ],
    },
    {
      title: 'Proteção de dados e segurança',
      paragraphs: [
        'O tratamento de dados pessoais sob controlo próprio do prestador é tratado pela superfície de revisão da Política de Privacidade. Dados pessoais controlados pelo cliente e tratados sob as suas instruções destinam-se a ser regidos pelo DPA quando aplicável. A alocação final responsável/subcontratante continua específica de cada atividade e sujeita ao acordo executado.',
        'Compromissos de segurança limitam-se a controlos implementados e evidência atribuível. Nenhuma certificação, resultado de pentest, RPO/RTO fixo, promessa de backup ou especificação de cifragem é incorporada num contrato apenas por aparecer em marketing, código-fonte ou pack interno de evidências.',
        'A posição atual do owner é não existir SLA de uptime por defeito salvo contratação expressa. Qualquer garantia positiva de uptime, service credits ou outro remédio de desempenho continua sujeita a factos finais do produto, decisão comercial e revisão qualificada.',
      ],
    },
    {
      title: 'Prestadores, subprocessadores e transferências internacionais',
      paragraphs: [
        'A RISCK COMPLY depende de fornecedores configurados de cloud, base de dados, autenticação, pagamentos, observabilidade, analytics, email e outros serviços. As superfícies públicas de Subprocessadores e Transferências Internacionais divulgam o limite atual de evidência sem tratar um fornecedor como contratual ou juridicamente aprovado apenas por estar listado.',
        'Mecânicas finais de autorização/aviso/objeção a subprocessadores, aplicabilidade de DPA ou SCC por conta, localizações de tratamento, mecanismos de transferência, conclusões de avaliação de impacto e medidas suplementares continuam sujeitas ao DPA, evidência do provider e revisão jurídica qualificada quando necessária.',
      ],
    },
    {
      title: 'Propriedade intelectual e licença',
      paragraphs: [
        'A estrutura proposta preserva os direitos do prestador e licenciadores sobre o serviço, software, design do produto, templates e documentação, concedendo ao cliente um direito limitado de utilizar o serviço contratado durante a subscrição. A titularidade do conteúdo do cliente e a licença estritamente necessária para operar o serviço devem permanecer coerentes com o DPA, confidencialidade e direitos de terceiros.',
        'Linguagem sobre utilização de feedback, titularidade de templates/outputs, materiais de terceiros e compromissos de IP específicos de Enterprise continuam sujeitos a revisão comercial e jurídica final.',
      ],
    },
    {
      title: 'Suspensão, cessação e acesso pós-cessação',
      paragraphs: [
        'O contrato proposto pode permitir suspensão proporcional perante risco material de segurança, utilização ilícita, incumprimento material ou falta de pagamento qualificável. Avisos finais, períodos de cura, exceções de emergência e obrigações de restabelecimento ainda não foram juridicamente aprovados e não se tornam vinculativos através deste rascunho.',
        'O cancelamento self-service preserva atualmente o acesso pago até ao fim do período pago ativo. Subscrições geridas por contrato continuam sujeitas à respetiva order form. O owner selecionou uma posição de janela de exportação do cliente de 30 dias após cessação, mas capacidade do produto, deveres de privacidade/conservação, limitações dos providers e redação jurídica final ainda devem ser reconciliados antes de se tornar promessa vinculativa.',
        'A eliminação pós-cessação continua sujeita ao DPA, conservação por categoria, legal holds documentados, registos contabilísticos/faturação, requisitos de auditoria imutável e limites verificados do lifecycle dos providers. Este rascunho não promete um prazo de eliminação ou backup que não esteja suportado.',
      ],
    },
    {
      title: 'Garantias e limites de compliance',
      paragraphs: [
        'A posição do owner é não existir SLA de uptime por defeito salvo contratação expressa. Qualquer outra garantia positiva de desempenho e respetivos remédios permanecem sujeitos aos factos do produto, aprovação comercial e revisão jurídica qualificada. Até essa aprovação, esta página não cria garantia adicional para além de lei imperativa ou compromisso assinado em separado.',
        'Não é proposta qualquer garantia de que a utilização da RISCK COMPLY torne automaticamente o cliente compliant, elimine risco jurídico ou satisfaça todos os requisitos regulatórios específicos do cliente.',
      ],
    },
    {
      title: 'Indemnizações e responsabilidade — decisão jurídica necessária',
      paragraphs: [
        'Indemnização do cliente por conteúdo/utilização ilícita, indemnização do prestador por IP, controlo da defesa, limites de responsabilidade, categorias de perdas excluídas e carve-outs para matérias como fraude, dolo, confidencialidade, proteção de dados e propriedade intelectual ainda não são finais.',
        'Essas disposições distribuem risco comercial material e devem ser aprovadas face à entidade contratante final, seguros, risco do produto e limites imperativos portugueses/europeus. Nenhum limite de responsabilidade ou indemnização é apresentado como eficaz por este rascunho.',
      ],
    },
    {
      title: 'Renovação, alterações e precedência documental',
      paragraphs: [
        'A redação final de formação do contrato e renovação deve corresponder ao checkout/order process live e a qualquer encomenda Enterprise negociada. Avisos de alteração material e mecânicas de renovação continuam sujeitos a aprovação do owner e counsel.',
        'O modelo de precedência proposto é: order form assinada, DPA assinado para o tratamento abrangido, schedule de serviço negociado, Termos finais e, por último, documentação pública. A aplicabilidade e incorporação finais requerem revisão qualificada; páginas públicas não ampliam compromissos assinados.',
      ],
    },
    {
      title: 'Lei aplicável, litígios e notificações legais — limite de revisão',
      paragraphs: [
        'A preferência atribuível atual do owner é lei portuguesa. Essa preferência não é apresentada como escolha vinculativa final enquanto a entidade contratante, a análise de lei imperativa e a revisão jurídica qualificada não estiverem concluídas. Tribunal/foro versus arbitragem, local, escalonamento e remédios continuam por resolver.',
        'Comunicações empresariais gerais podem ser enviadas para comercial@risckcomply.com. Quais notificações produzem efeito contratual, métodos de entrega permitidos, regras de receção presumida e eventual canal postal ou jurídico dedicado continuam sujeitos à redação contratual final e revisão qualificada.',
      ],
    },
    {
      title: 'Limite de aceitação final',
      paragraphs: [
        'Esta página permanece REVIEW_DRAFT · HUMAN_REVIEW_REQUIRED. Torna-se Termos eficazes apenas depois de a entidade contratante/vendedora e os factos registais autoritativos estarem fechados, decisões comerciais ainda abertas serem concluídas, factos de billing/fiscalidade estarem alinhados, dependências de Privacy/DPA/providers estarem reconciliadas, responsabilidade/indemnização/foro/notificações e mecânicas de cessação serem aprovadas, a revisão jurídica qualificada ser atribuível e a versão final ser deliberadamente publicada ou incorporada num acordo com o cliente.',
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
      version="0.2-review"
      lastUpdated={LAST_UPDATED}
      sections={page.sections}
    />
  );
}
