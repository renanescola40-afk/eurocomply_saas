import { PublicLegalReviewPage } from '@/components/legal/public-legal-review-page';
import { isSupportedLocale, type Locale } from '@/lib/i18n/locales';

export const revalidate = 300;

const LAST_UPDATED = '12 September 2026';

type DpaCopy = {
  eyebrow: string;
  title: string;
  summary: string;
  sections: Array<{ title: string; paragraphs?: string[]; items?: string[] }>;
};

const en: DpaCopy = {
  eyebrow: 'Data Processing Addendum — review draft',
  title: 'GDPR Article 28 processing terms for customer data',
  summary:
    'This public review draft presents the current Article 28 structure for customer-controlled personal data processed through RISCK COMPLY. Owner DPA-policy choices are now selected through Legal Package V1, but this is not yet a signed DPA: authoritative party facts, provider/transfer facts, qualified legal review and binding incorporation remain acceptance gates.',
  sections: [
    {
      title: 'Parties, status and scope',
      paragraphs: [
        'The owner has designated a RISCK COMPLY contracting/operator entity internally, but this public review draft does not publish final processor-party registry details until authoritative registered office, registered identifiers and signatory facts are confirmed. This page cannot be treated as an executed agreement.',
        'The proposed DPA applies to customer personal data processed through the contracted RISCK COMPLY service on documented customer instructions. Provider-controlled website, account, billing, security and similar processing remains governed by the applicable Privacy notice and role allocation.',
      ],
    },
    {
      title: 'Controller and processor roles',
      paragraphs: [
        'For customer-workspace personal data, the customer may be controller or processor depending on its own processing role. RISCK COMPLY is intended to act as processor or subprocessor where it processes that data on documented customer instructions. Mixed or independently determined processing activities must be assessed separately rather than forcing one role across the entire service.',
      ],
    },
    {
      title: 'Processing details',
      items: [
        'Subject matter: operation, security, support and maintenance of the contracted RISCK COMPLY compliance service.',
        'Duration: subscription and the applicable return/deletion lifecycle; the owner-selected 30-day post-termination export position remains subject to verified product/provider capabilities and the signed agreement.',
        'Nature: collection, storage, organisation, retrieval, use, authorised disclosure to service providers, export and deletion-support operations required to deliver the service.',
        'Purpose: provide, secure, support and maintain customer compliance workflows and customer-requested functionality.',
        'Baseline personal-data categories: account/workspace identifiers, organisation and membership records, customer-entered AI-system/vendor/risk/document/task/assessment/evidence records where they contain personal data, support material and operational metadata necessary to deliver the service.',
        'Baseline data-subject categories: authorised users, customer employees and contractors, vendor/business contacts and other individuals represented in customer-provided records.',
        'Special-category or criminal-offence data is not accepted as an ordinary default use case and requires an expressly approved scope and additional safeguards before intentional processing.',
      ],
    },
    {
      title: 'Documented instructions',
      paragraphs: [
        'The proposed processor obligation is to process customer personal data only on documented instructions, including for transfers, unless Union or Member-State law requires otherwise. Where legally permitted, the customer should be informed of that legal requirement before processing.',
        'Customer Content is not authorised for training third-party or provider AI/ML models without a separate specific lawful basis or authorisation and an implemented, disclosed processing arrangement.',
      ],
    },
    {
      title: 'Confidentiality and access control',
      paragraphs: [
        'Persons authorised to handle customer personal data are expected to be subject to confidentiality obligations and access limited to their duties. Product controls include authenticated access, organisation/workspace scoping, role-aware permissions and server-side authorization boundaries where implemented.',
      ],
    },
    {
      title: 'Security and technical measures',
      items: [
        'Authentication and server-side user validation through configured identity infrastructure.',
        'Organisation/workspace scoping, RBAC and Row Level Security posture for tenant isolation.',
        'Step-up controls for sensitive privacy operations, no-store privacy responses and protected export behavior.',
        'Audit events, sanitised logging practices, secret/dependency/security scanning and protected release gates.',
        'Managed-provider transport/storage protections only to the extent supported by current provider and account evidence.',
        'No certification, penetration-test result, fixed RPO/RTO or encryption specification is incorporated into this draft unless separately evidenced and contractually accepted.',
      ],
    },
    {
      title: 'Subprocessors',
      paragraphs: [
        'The DPA requires prior written subprocessor authorisation, an up-to-date provider register, flow-down of applicable data-protection obligations and processor responsibility as required by law.',
        'The owner-selected model uses general written authorisation with a 30-day advance-notice target for a new material subprocessor where practicable and contractually applicable. A customer may object on reasonable data-protection grounds; RISCK COMPLY should seek a commercially reasonable solution and, if none is available, the final DPA/order should provide an affected-scope termination route. Provider/account facts and final qualified drafting remain open.',
      ],
    },
    {
      title: 'International transfers',
      paragraphs: [
        'The Production Supabase project is currently configured in eu-west-1 (Ireland), but other configured providers may use additional locations or global infrastructure. Account-specific processing locations and transfer mechanisms remain provider-by-provider evidence items.',
        'Commission controller-processor clauses under Decision (EU) 2021/915 address Article 28 contracting and do not by themselves satisfy GDPR Chapter V transfer requirements. This draft therefore does not claim that every SCC, adequacy, supplementary-measure or transfer-impact decision is closed.',
      ],
    },
    {
      title: 'Data-subject request assistance',
      paragraphs: [
        'Taking into account the nature of processing, the processor-side model is intended to assist customers with appropriate technical and organisational measures for data-subject requests. RISCK COMPLY has a tenant-scoped rights-request lifecycle with deadline, routing, decision and evidence fields validated by protected runtime evidence.',
        'The technical workflow does not decide whether a restriction, objection, erasure exception or other legal limitation applies. Customer-controller routing and case-specific legal judgment remain attributable decisions.',
      ],
    },
    {
      title: 'Security, DPIA and prior-consultation assistance',
      paragraphs: [
        'The proposed DPA requires reasonably available assistance for GDPR Articles 32–36, taking account of the nature of processing and information available to the processor. This includes security evidence, incident information and information reasonably needed for customer DPIA or prior-consultation work without turning RISCK COMPLY into the customer’s legal adviser.',
      ],
    },
    {
      title: 'Personal-data breaches',
      paragraphs: [
        'The owner-selected standard DPA commitment is customer notification without undue delay after the processor becomes aware of a personal-data breach affecting customer personal data, together with reasonably available information needed for the customer’s response.',
        'No default 24-hour or 48-hour contractual promise is selected. Any stricter Enterprise target must be evidence-backed and expressly contracted.',
      ],
    },
    {
      title: 'Return, deletion and retention',
      paragraphs: [
        'At the end of services or on valid customer instruction, customer personal data is intended to be returned or deleted as applicable, subject to documented legal-retention requirements and verified provider backup/lifecycle constraints. The owner-selected post-termination customer export position is 30 days, subject to product/provider capability and final qualified wording.',
        'The product uses category-specific retention rather than a universal retention period. The technical retention-policy schema is runtime validated, but the final legally appropriate period for every category and complete downstream provider deletion remain separate factual/legal gates.',
      ],
    },
    {
      title: 'Information and audit rights',
      paragraphs: [
        'The proposed DPA makes reasonably necessary compliance information available through evidence packs, security material, questionnaires and other attributable records, and preserves the controller’s audit/inspection rights required by applicable law.',
        'The owner-selected model uses remote evidence, security materials and questionnaires as the normal first-line audit mechanism. Routine audits should normally be limited to once per 12 months, with reasonable notice and confidentiality/security safeguards, unless a breach, regulator instruction, material control failure or other justified cause requires additional access. Mandatory Article 28 rights remain preserved; final procedural/cost/on-site mechanics require qualified drafting.',
      ],
    },
    {
      title: 'Precedence, liability and final acceptance',
      paragraphs: [
        'The proposed DPA is intended to prevail over inconsistent general terms for covered processing while customer/order-form details may refine scope without weakening mandatory protections. The owner-proposed liability position remains subject to mandatory-law carve-outs and qualified drafting.',
        'This public page remains REVIEW_DRAFT · HUMAN_REVIEW_REQUIRED. Owner Legal Package V1 closes the owner-policy choices for subprocessor, audit and breach-notice mechanics, but this page becomes a final contractual DPA only after authoritative party facts, processing annexes, active-provider/subprocessor facts, Chapter V transfer position, TOM commitments, deletion/retention facts, qualified legal acceptance where required and binding incorporation are complete.',
      ],
    },
  ],
};

const pt: DpaCopy = {
  eyebrow: 'Adenda de Tratamento de Dados — rascunho para revisão',
  title: 'Termos de tratamento do artigo 28.º do RGPD para dados de clientes',
  summary:
    'Este rascunho público apresenta a estrutura atual do artigo 28.º para dados pessoais controlados pelo cliente. As decisões de política DPA do owner estão selecionadas através do Legal Package V1, mas ainda não é um DPA assinado: factos autoritativos das partes, factos de providers/transferências, revisão qualificada e incorporação vinculativa continuam como gates.',
  sections: [
    {
      title: 'Partes, estado e âmbito',
      paragraphs: [
        'O owner designou internamente a entidade contratante/operadora da RISCK COMPLY, mas este rascunho público não publica os dados registais finais da parte subcontratante enquanto sede, identificadores e autoridade de assinatura não forem confirmados de forma autoritativa. Esta página não pode ser tratada como acordo executado.',
        'O DPA proposto aplica-se a dados pessoais do cliente tratados no serviço contratado sob instruções documentadas. Tratamentos próprios do fornecedor relativos a website, conta, faturação, segurança e atividades semelhantes permanecem sujeitos ao aviso de Privacidade e à alocação de papéis aplicável.',
      ],
    },
    {
      title: 'Papéis de responsável e subcontratante',
      paragraphs: [
        'Para dados pessoais do workspace, o cliente pode ser responsável ou subcontratante conforme o seu próprio papel. A RISCK COMPLY destina-se a atuar como subcontratante ou sub-subcontratante quando trata esses dados sob instruções documentadas. Atividades mistas ou com finalidades próprias devem ser avaliadas separadamente.',
      ],
    },
    {
      title: 'Detalhes do tratamento',
      items: [
        'Objeto: operação, segurança, suporte e manutenção do serviço contratado RISCK COMPLY.',
        'Duração: subscrição e ciclo aplicável de devolução/eliminação; a posição de exportação pós-cessação de 30 dias continua sujeita a capacidades verificadas de produto/provider e acordo assinado.',
        'Natureza: recolha, armazenamento, organização, consulta, utilização, comunicação autorizada a prestadores, exportação e suporte à eliminação necessários ao serviço.',
        'Finalidade: prestar, proteger, suportar e manter os workflows de compliance solicitados pelo cliente.',
        'Categorias-base: identificadores de conta/workspace, organização/membros, registos de sistemas de IA/fornecedores/riscos/documentos/tarefas/avaliações/evidências quando contenham dados pessoais, suporte e metadados operacionais necessários.',
        'Titulares-base: utilizadores autorizados, trabalhadores/contratados do cliente, contactos de fornecedores/empresas e outras pessoas representadas nos registos do cliente.',
        'Categorias especiais ou dados de infrações não são um caso de uso normal por defeito e exigem âmbito expressamente aprovado e salvaguardas adicionais antes de tratamento intencional.',
      ],
    },
    {
      title: 'Instruções documentadas',
      paragraphs: [
        'A obrigação proposta é tratar dados pessoais apenas segundo instruções documentadas, incluindo transferências, salvo exigência do direito da União ou de Estado-Membro. Quando permitido, o cliente deve ser informado dessa exigência legal.',
        'Customer Content não fica autorizado para treino de modelos de IA/ML de terceiros ou do fornecedor sem base/autoridade específica separada e tratamento implementado e divulgado.',
      ],
    },
    {
      title: 'Confidencialidade e controlo de acesso',
      paragraphs: [
        'Pessoas autorizadas a tratar dados do cliente devem estar sujeitas a deveres de confidencialidade e acesso limitado às suas funções. Os controlos incluem autenticação, âmbito por organização/workspace, permissões por função e autorização server-side onde implementada.',
      ],
    },
    {
      title: 'Segurança e medidas técnicas',
      items: [
        'Autenticação e validação server-side através da infraestrutura de identidade configurada.',
        'Âmbito por organização/workspace, RBAC e postura de Row Level Security para isolamento entre tenants.',
        'Step-up para operações de privacidade sensíveis, respostas no-store e exportação protegida.',
        'Eventos de auditoria, logging minimizado, scanning de segredos/dependências/segurança e gates protegidos de release.',
        'Proteções de transporte/armazenamento de fornecedores geridos apenas na medida suportada por evidência atual.',
        'Nenhuma certificação, resultado de pentest, RPO/RTO fixo ou especificação de cifragem é incorporado sem evidência e aceitação contratual.',
      ],
    },
    {
      title: 'Subcontratantes ulteriores',
      paragraphs: [
        'O DPA exige autorização escrita prévia, registo atualizado de providers, transmissão das obrigações aplicáveis e responsabilidade do subcontratante nos termos da lei.',
        'O modelo selecionado usa autorização geral escrita, com alvo de 30 dias de aviso prévio para novo subprocessor material quando praticável/aplicável. O cliente pode objetar por motivos razoáveis de proteção de dados; deve procurar-se solução comercial razoável e, se não existir, o DPA/order final deve permitir terminar o âmbito afetado. Factos de provider/conta e redação final permanecem abertos.',
      ],
    },
    {
      title: 'Transferências internacionais',
      paragraphs: [
        'O projeto Supabase de Produção está configurado em eu-west-1 (Irlanda), mas outros fornecedores podem usar localizações adicionais ou infraestrutura global. Localizações e mecanismos continuam a exigir evidência por fornecedor/conta.',
        'As cláusulas controlador-subcontratante da Decisão (UE) 2021/915 tratam o artigo 28.º e não satisfazem por si só o Capítulo V. Este rascunho não afirma que todas as SCC, adequação, medidas suplementares ou avaliações estejam fechadas.',
      ],
    },
    {
      title: 'Assistência a pedidos de titulares',
      paragraphs: [
        'O modelo destina-se a assistir o cliente com medidas técnicas/organizativas adequadas. A RISCK COMPLY possui ciclo tenant-scoped de pedidos com prazo, encaminhamento, decisão e evidência validado por runtime protegido.',
        'O workflow técnico não decide exceções ou limitações jurídicas. Encaminhamento ao cliente-responsável e decisão concreta continuam atribuíveis.',
      ],
    },
    {
      title: 'Assistência de segurança, AIPD e consulta prévia',
      paragraphs: [
        'O DPA proposto exige assistência razoavelmente disponível para os artigos 32.º–36.º, incluindo evidência de segurança, incidentes e informação necessária para AIPD/consulta do cliente, sem transformar a RISCK COMPLY em consultor jurídico do cliente.',
      ],
    },
    {
      title: 'Violações de dados pessoais',
      paragraphs: [
        'O compromisso padrão selecionado é notificar o cliente sem demora injustificada após conhecimento de uma violação que afete dados pessoais do cliente, com a informação razoavelmente disponível para resposta.',
        'Não é selecionada promessa geral de 24h/48h. Qualquer alvo Enterprise mais estrito deve ser sustentado por evidência e expressamente contratado.',
      ],
    },
    {
      title: 'Devolução, eliminação e conservação',
      paragraphs: [
        'No fim dos serviços ou perante instrução válida, os dados destinam-se a ser devolvidos/eliminados conforme aplicável, sujeitos a retenções legais e ciclos de backup/lifecycle comprovados. A posição de exportação pós-cessação selecionada é 30 dias, dependente de capacidade de produto/provider e redação final.',
        'O produto usa conservação por categoria. O esquema técnico está validado, mas o prazo juridicamente adequado por categoria e a eliminação completa em providers downstream continuam gates separados.',
      ],
    },
    {
      title: 'Informação e auditoria',
      paragraphs: [
        'O DPA disponibiliza informação razoavelmente necessária através de evidence packs, materiais de segurança, questionários e registos atribuíveis e preserva os direitos de auditoria/inspeção exigidos por lei.',
        'O modelo selecionado usa evidência remota/questionário como primeira linha; auditorias rotineiras normalmente uma vez por 12 meses, salvo breach, instrução de regulador, falha material de controlo ou outra causa justificada. Direitos obrigatórios do artigo 28.º permanecem preservados e mecânicas finais de custo/on-site exigem redação qualificada.',
      ],
    },
    {
      title: 'Prevalência, responsabilidade e aceitação final',
      paragraphs: [
        'O DPA proposto destina-se a prevalecer sobre termos gerais incompatíveis no tratamento abrangido. A posição de responsabilidade proposta pelo owner continua sujeita a carve-outs imperativos e drafting qualificado.',
        'Esta página permanece REVIEW_DRAFT · HUMAN_REVIEW_REQUIRED. O Legal Package V1 fecha as decisões do owner para subprocessadores, auditoria e breach notice, mas o DPA só se torna final após factos autoritativos das partes, anexos, providers/subprocessadores ativos, transferências do Capítulo V, TOMs, retenção/eliminação, aceitação jurídica qualificada quando necessária e incorporação vinculativa.',
      ],
    },
  ],
};

const copy: Partial<Record<Locale, DpaCopy>> = { en, pt };

export default async function DpaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  // Fail closed: until a locale has a clause-equivalent reviewed translation,
  // it receives the complete English review draft rather than a shortened legal variant.
  const page = copy[locale] ?? en;

  return (
    <PublicLegalReviewPage
      locale={locale}
      eyebrow={page.eyebrow}
      title={page.title}
      summary={page.summary}
      documentId="data-processing-addendum"
      version="0.3-review"
      lastUpdated={LAST_UPDATED}
      sections={page.sections}
    />
  );
}
