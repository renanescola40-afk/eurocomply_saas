import { PublicLegalReviewPage } from '@/components/legal/public-legal-review-page';
import { isSupportedLocale, type Locale } from '@/lib/i18n/locales';

export const revalidate = 300;

const LAST_UPDATED = '10 September 2026';

type DpaCopy = {
  eyebrow: string;
  title: string;
  summary: string;
  sections: Array<{ title: string; paragraphs?: string[]; items?: string[] }>;
};

const en: DpaCopy = {
  eyebrow: 'Data Processing Addendum — review draft',
  title: 'GDPR Article 28 processing terms for customer data',
  summary: 'This public review draft presents the current Article 28 structure for customer-controlled personal data processed through RISCK COMPLY. It is not yet a signed DPA: final party identity, provider/transfer facts and qualified legal decisions remain explicit acceptance gates.',
  sections: [
    {
      title: 'Parties, status and scope',
      paragraphs: [
        'The final RISCK COMPLY contracting/operator legal entity and its registered identifiers are still pending authoritative founder/entity confirmation. This review draft therefore does not identify a final processor party and cannot be treated as an executed agreement.',
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
        'Duration: the subscription and the applicable return/deletion lifecycle; the final post-termination export/deletion window remains subject to the signed agreement and verified provider capabilities.',
        'Nature: collection, storage, organisation, retrieval, use, authorised disclosure to service providers, export and deletion-support operations required to deliver the service.',
        'Purpose: provide, secure, support and maintain customer compliance workflows and customer-requested service functionality.',
        'Baseline personal-data categories: account/workspace identifiers, organisation and membership records, customer-entered AI-system/vendor/risk/document/task/assessment/evidence records where they contain personal data, support material, and operational metadata necessary to deliver the customer-directed service.',
        'Baseline data-subject categories: authorised users, customer employees and contractors, vendor or business contacts, and other individuals represented in customer-provided records. The order form or customer instructions may narrow or extend those categories within the permitted service scope.',
        'Special-category or criminal-offence data is not accepted as an ordinary default use case and requires an expressly approved scope and additional safeguards before intentional processing.',
      ],
    },
    {
      title: 'Documented instructions',
      paragraphs: [
        'The proposed processor obligation is to process customer personal data only on documented instructions, including for transfers, unless Union or Member-State law requires otherwise. Where legally permitted, the customer should be informed of that legal requirement before processing.',
        'If an instruction appears to infringe applicable data-protection law, the processor-side workflow must allow the concern to be raised rather than silently converting product output into a legal conclusion for the customer.',
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
        'The DPA requires a prior written subprocessor-authorisation model, an up-to-date provider register, flow-down of applicable data-protection obligations and processor responsibility as required by law. The final choice between general and specific authorisation, advance-notice period, objection mechanics and customer remedies remains a contractual/legal decision.',
        'The public Subprocessors page is a review surface only. A provider is not treated as contractually approved merely because it appears in source code or public documentation.',
      ],
    },
    {
      title: 'International transfers',
      paragraphs: [
        'The Production Supabase project is currently configured in eu-west-1 (Ireland), but other configured providers may use additional locations or global infrastructure. Account-specific processing locations and transfer mechanisms remain provider-by-provider evidence items.',
        'Commission controller-processor clauses under Decision (EU) 2021/915 address Article 28 contracting and do not by themselves satisfy GDPR Chapter V transfer requirements. This draft therefore does not claim that every SCC, adequacy, supplementary-measure or transfer-impact decision is already closed.',
      ],
    },
    {
      title: 'Data-subject request assistance',
      paragraphs: [
        'Taking into account the nature of processing, the processor-side model is intended to assist customers with appropriate technical and organisational measures for data-subject requests. RISCK COMPLY now has a canonical tenant-scoped rights-request lifecycle with deadline, routing, decision and evidence fields validated by protected exact-SHA runtime evidence.',
        'That technical workflow does not decide whether a restriction, objection, erasure exception or other legal limitation applies. Customer-controller routing and case-specific legal judgment remain attributable decisions.',
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
        'The proposed DPA requires customer notification without undue delay after the processor becomes aware of a personal-data breach affecting customer personal data, together with reasonably available information needed for the customer’s response. Any stricter contractual notification target, channel or update cadence must match demonstrated operational capability before it becomes binding.',
      ],
    },
    {
      title: 'Return, deletion and retention',
      paragraphs: [
        'At the end of services or on valid customer instruction, customer personal data is intended to be returned or deleted as applicable, subject to documented legal-retention requirements and verified provider backup/lifecycle constraints. Retained records must remain purpose-limited, access-restricted and removed when the relevant basis expires.',
        'The product uses category-specific retention rather than a universal retention period. The technical retention-policy schema is exact-SHA validated, but the final period for every category and complete downstream provider deletion remain separate factual/legal gates.',
      ],
    },
    {
      title: 'Information and audit rights',
      paragraphs: [
        'The proposed DPA makes reasonably necessary compliance information available through evidence packs, security material, questionnaires and other attributable records, and preserves the controller’s audit/inspection rights required by applicable law. Practical rules for frequency, notice, confidentiality, cost, on-site access and protection of other customers or privileged/security-sensitive information remain subject to the final agreement and qualified review.',
      ],
    },
    {
      title: 'Precedence, liability and final acceptance',
      paragraphs: [
        'The proposed DPA is intended to prevail over inconsistent general terms for the covered processing while customer/order-form details may refine scope without weakening mandatory protections. Liability caps, mandatory-law carve-outs and allocation between controller and processor remain a final contractual/legal decision.',
        'This public page remains REVIEW_DRAFT · HUMAN_REVIEW_REQUIRED. It becomes a final contractual DPA only after party identity, processing annexes, active-provider/subprocessor facts, transfer position, TOM commitments, deletion/retention terms and qualified legal acceptance are completed and the DPA is incorporated into a binding customer agreement.',
      ],
    },
  ],
};

const pt: DpaCopy = {
  eyebrow: 'Adenda de Tratamento de Dados — rascunho para revisão',
  title: 'Termos de tratamento do artigo 28.º do RGPD para dados de clientes',
  summary: 'Este rascunho público apresenta a estrutura atual do artigo 28.º para dados pessoais controlados pelo cliente e tratados através da RISCK COMPLY. Ainda não é um DPA assinado: identidade das partes, factos de fornecedores/transferências e decisões jurídicas qualificadas continuam como gates de aceitação.',
  sections: [
    { title: 'Partes, estado e âmbito', paragraphs: ['A entidade jurídica final que contratará/operará a RISCK COMPLY e os seus identificadores registados ainda aguardam confirmação autoritativa. Por isso, este rascunho não identifica ainda a parte subcontratante final e não pode ser tratado como acordo executado.', 'O DPA proposto aplica-se a dados pessoais do cliente tratados no serviço contratado sob instruções documentadas do cliente. Tratamentos próprios do fornecedor relativos a website, conta, faturação, segurança e atividades semelhantes permanecem sujeitos ao aviso de Privacidade e à alocação de papéis aplicável.'] },
    { title: 'Papéis de responsável e subcontratante', paragraphs: ['Para dados pessoais do workspace, o cliente pode ser responsável ou subcontratante conforme o seu próprio papel. A RISCK COMPLY destina-se a atuar como subcontratante ou sub-subcontratante quando trata esses dados sob instruções documentadas. Atividades mistas ou com finalidades próprias devem ser avaliadas separadamente.'] },
    { title: 'Detalhes do tratamento', items: ['Objeto: operação, segurança, suporte e manutenção do serviço contratado RISCK COMPLY.', 'Duração: subscrição e ciclo aplicável de devolução/eliminação; a janela pós-cessação continua dependente do acordo assinado e das capacidades verificadas dos fornecedores.', 'Natureza: recolha, armazenamento, organização, consulta, utilização, comunicação autorizada a prestadores, exportação e suporte à eliminação necessários ao serviço.', 'Finalidade: prestar, proteger, suportar e manter os workflows de compliance solicitados pelo cliente.', 'Categorias-base de dados: identificadores de conta/workspace, organização e membros, registos de sistemas de IA/fornecedores/riscos/documentos/tarefas/avaliações/evidências quando contenham dados pessoais, material de suporte e metadados operacionais necessários.', 'Titulares-base: utilizadores autorizados, trabalhadores e contratados do cliente, contactos de fornecedores/empresas e outras pessoas representadas nos registos fornecidos pelo cliente.', 'Dados de categorias especiais ou relativos a condenações/infrações não são um caso de uso normal por defeito e exigem âmbito expressamente aprovado e salvaguardas adicionais antes de tratamento intencional.'] },
    { title: 'Instruções documentadas', paragraphs: ['A obrigação proposta é tratar dados pessoais apenas segundo instruções documentadas, incluindo transferências, salvo exigência do direito da União ou de Estado-Membro. Quando permitido, o cliente deve ser informado previamente dessa exigência legal.', 'Se uma instrução aparentar violar a legislação de proteção de dados, o fluxo deve permitir sinalizar a questão em vez de transformar silenciosamente uma saída do produto numa conclusão jurídica.'] },
    { title: 'Confidencialidade e controlo de acesso', paragraphs: ['Pessoas autorizadas a tratar dados do cliente devem estar sujeitas a deveres de confidencialidade e acesso limitado às suas funções. Os controlos do produto incluem autenticação, âmbito por organização/workspace, permissões por função e autorização server-side onde implementada.'] },
    { title: 'Segurança e medidas técnicas', items: ['Autenticação e validação server-side através da infraestrutura de identidade configurada.', 'Âmbito por organização/workspace, RBAC e postura de Row Level Security para isolamento entre tenants.', 'Step-up para operações de privacidade sensíveis, respostas no-store e exportação protegida.', 'Eventos de auditoria, logging minimizado, scanning de segredos/dependências/segurança e gates protegidos de release.', 'Proteções de transporte/armazenamento de fornecedores geridos apenas na medida suportada por evidência atual.', 'Nenhuma certificação, resultado de pentest, RPO/RTO fixo ou especificação de cifragem é incorporado sem evidência e aceitação contratual.'] },
    { title: 'Subcontratantes ulteriores', paragraphs: ['O DPA exige modelo de autorização escrita prévia, registo atualizado de fornecedores, transmissão das obrigações aplicáveis e responsabilidade do subcontratante nos termos da lei. A escolha final entre autorização geral/específica, prazo de aviso, objeção e remédios continua uma decisão contratual/jurídica.', 'A página pública de Subprocessadores é apenas uma superfície de revisão; um fornecedor não é considerado contratualmente aprovado apenas por aparecer no código ou documentação pública.'] },
    { title: 'Transferências internacionais', paragraphs: ['O projeto Supabase de Produção está atualmente configurado em eu-west-1 (Irlanda), mas outros fornecedores podem usar localizações adicionais ou infraestrutura global. Localizações e mecanismos aplicáveis continuam a exigir evidência por fornecedor/conta.', 'As cláusulas controlador-subcontratante da Decisão (UE) 2021/915 tratam a contratação do artigo 28.º e não satisfazem, por si só, as exigências do Capítulo V. Este rascunho não afirma que todas as SCC, adequação, medidas suplementares ou avaliações de transferência estejam fechadas.'] },
    { title: 'Assistência a pedidos de titulares', paragraphs: ['Considerando a natureza do tratamento, o modelo destina-se a assistir o cliente com medidas técnicas e organizativas adequadas. A RISCK COMPLY possui agora um ciclo canónico de pedidos por tenant com prazo, encaminhamento, decisão e evidência, validado por prova runtime protegida exact-SHA.', 'O workflow técnico não decide exceções ou limitações jurídicas de oposição, limitação, apagamento ou outros direitos. Encaminhamento ao cliente-responsável e decisão jurídica concreta continuam atribuíveis.'] },
    { title: 'Assistência de segurança, AIPD e consulta prévia', paragraphs: ['O DPA proposto exige assistência razoavelmente disponível para os artigos 32.º–36.º, tendo em conta a natureza do tratamento e a informação disponível ao subcontratante, incluindo evidência de segurança, incidentes e informação necessária para AIPD/consulta do cliente sem transformar a RISCK COMPLY em consultor jurídico do cliente.'] },
    { title: 'Violações de dados pessoais', paragraphs: ['O DPA proposto exige notificação ao cliente sem demora injustificada após conhecimento de uma violação de dados que afete dados pessoais do cliente, com a informação razoavelmente disponível para a resposta. Qualquer prazo contratual mais estrito deve corresponder à capacidade operacional demonstrada antes de se tornar vinculativo.'] },
    { title: 'Devolução, eliminação e conservação', paragraphs: ['No fim dos serviços ou perante instrução válida, os dados do cliente destinam-se a ser devolvidos ou eliminados conforme aplicável, sujeitos a retenções legais documentadas e ciclos de backup/lifecycle comprovados. Registos conservados devem permanecer limitados à finalidade e com acesso restrito.', 'O produto usa conservação por categoria. O esquema técnico de retenção está validado por exact-SHA, mas o prazo final de cada categoria e a eliminação completa em fornecedores downstream continuam gates separados.'] },
    { title: 'Informação e auditoria', paragraphs: ['O DPA proposto disponibiliza informação razoavelmente necessária através de evidence packs, materiais de segurança, questionários e registos atribuíveis e preserva os direitos de auditoria/inspeção exigidos pela lei. Frequência, aviso, confidencialidade, custo, acesso on-site e proteção de outros clientes/informação sensível continuam sujeitos ao acordo final e revisão qualificada.'] },
    { title: 'Prevalência, responsabilidade e aceitação final', paragraphs: ['O DPA proposto destina-se a prevalecer sobre termos gerais incompatíveis no tratamento abrangido. Limites de responsabilidade, exceções impostas por lei e alocação entre responsável/subcontratante continuam uma decisão contratual/jurídica final.', 'Esta página permanece REVIEW_DRAFT · HUMAN_REVIEW_REQUIRED. Só se torna DPA contratual final após fechar identidade das partes, anexos de tratamento, factos de subprocessadores/fornecedores, transferências, TOMs, eliminação/conservação e aceitação jurídica qualificada, e após incorporação num acordo vinculativo.'] },
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
      version="0.2-review"
      lastUpdated={LAST_UPDATED}
      sections={page.sections}
    />
  );
}
