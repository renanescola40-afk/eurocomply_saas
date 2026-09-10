import { AnalyticsConsentControls } from '@/components/analytics/AnalyticsConsentControls';
import { PublicLegalReviewPage } from '@/components/legal/public-legal-review-page';
import { isSupportedLocale, type Locale } from '@/lib/i18n/locales';

export const revalidate = 300;

const LAST_UPDATED = '10 September 2026';

type PrivacyCopy = {
  eyebrow: string;
  title: string;
  summary: string;
  sections: Array<{ title: string; paragraphs?: string[]; items?: string[] }>;
};

const copy: Record<Locale, PrivacyCopy> = {
  en: {
    eyebrow: 'Privacy Policy — review draft',
    title: 'How RISCK COMPLY handles personal data',
    summary: 'This public review draft explains the current technical and factual privacy posture for website, account, billing, support, security, optional analytics and customer-workspace processing. Items that require final entity facts, provider evidence or qualified legal judgment remain explicitly open.',
    sections: [
      {
        title: 'Controller identity and privacy contact',
        paragraphs: [
          'The final RISCK COMPLY contracting/operator legal entity and its registered identifiers are still pending authoritative founder/entity confirmation. This review draft therefore does not represent a final Article 13/14 controller-identification statement.',
          'The current verified privacy intake channel is comercial@risckcomply.com. A Data Protection Officer is not represented as appointed or required while the Article 37 applicability facts remain unresolved.',
        ],
      },
      {
        title: 'Scope and role boundary',
        paragraphs: [
          'This notice covers provider-controlled website, account, commercial, billing, support, security and optional analytics processing. Where a customer places personal data in a workspace and determines the purposes of that processing, the customer will generally be the controller and RISCK COMPLY will generally act as processor under the applicable DPA, subject to the final role allocation for the concrete processing operation.',
        ],
      },
      {
        title: 'Personal-data categories',
        items: [
          'Account identifiers, email, authentication and session metadata.',
          'Organisation, workspace membership, role and permission records.',
          'Customer-entered AI systems, vendors, risks, documents, tasks, assessments and supporting evidence where those records contain personal data.',
          'Billing identifiers, subscription state and payment metadata received from configured payment services.',
          'Support communications, security events, authorisation-denial, diagnostic, rate-limit and abuse-prevention metadata.',
          'Optional product-analytics events and the stored analytics-consent preference where analytics is configured.',
        ],
      },
      {
        title: 'Purposes',
        items: [
          'Create and administer accounts, authenticate users and enforce workspace access.',
          'Provide the compliance workflow, documents, tasks, assessments, reminders and audit trail requested by customers.',
          'Protect the service, tenants and infrastructure; prevent abuse or fraud; investigate incidents and preserve security evidence.',
          'Administer subscriptions, billing and accounting records.',
          'Respond to support, procurement and other business enquiries and send essential service communications.',
          'Measure product use through optional analytics only where the configured consent/legal-basis conditions are satisfied.',
        ],
      },
      {
        title: 'Legal bases — review boundary',
        paragraphs: [
          'The current legal-basis matrix maps contract/steps requested before contract, specific legal obligations, legitimate interests and consent as candidate bases depending on the processing activity. Security/abuse prevention, incident-response evidence and narrow B2B relationship administration have documented pre-review legitimate-interest assessments.',
          'Those allocations are not represented as final qualified legal approval. Optional analytics and non-essential marketing do not receive automatic legitimate-interest approval from this draft. The final public notice must be reconciled to the qualified legal-basis decision before it is treated as effective legal text.',
        ],
      },
      {
        title: 'Recipients and service providers',
        paragraphs: [
          'Personal data may be disclosed to configured hosting, database/authentication, payment, observability, analytics, email/support and professional-service providers only as necessary for the relevant purpose, and to authorities or other recipients where disclosure is legally required.',
          'The active Production provider list, each provider role and the account-specific contractual position are still being reconciled. The public Subprocessors page is a review surface and must remain aligned with the actual Production configuration and signed DPA.',
        ],
      },
      {
        title: 'International transfers',
        paragraphs: [
          'The Production Supabase project is configured in eu-west-1 (Ireland). Other configured providers may process data in additional countries or use global infrastructure.',
          'This draft does not claim that every account-specific adequacy, SCC, supplementary-measure or transfer-impact decision has been finally accepted. The International Transfers review surface records the current transfer evidence boundary pending provider/account facts and qualified legal review.',
        ],
      },
      {
        title: 'Retention and deletion',
        paragraphs: [
          'RISCK COMPLY uses a category-specific retention model rather than one universal retention period. Retention depends on the processing purpose, customer relationship, statutory recordkeeping duties, security/claims needs, provider lifecycle and deletion capabilities.',
          'A protected exact-SHA Data Governance proof validates that the canonical retention-policy schema requires bounded category-specific retention values. That technical proof does not itself decide the legally appropriate period for every category or prove that every downstream provider deletion has completed.',
        ],
      },
      {
        title: 'Your rights and request routing',
        paragraphs: [
          'Subject to applicable law, individuals may have rights of access, rectification, erasure, restriction, objection, portability and withdrawal of consent. Requests concerning RISCK COMPLY provider-controlled processing can be submitted to comercial@risckcomply.com.',
          'Where the relevant personal data is controlled by a customer inside its workspace, RISCK COMPLY may need to route the request to that customer or assist it under the DPA. Identity, scope, legal exceptions and downstream completion must be assessed for the concrete request rather than decided automatically by software.',
        ],
      },
      {
        title: 'Consent and optional analytics',
        paragraphs: [
          'The application source is designed to require analytics consent by default unless the public build configuration explicitly disables that requirement, to block PostHog initialisation/capture without the required stored grant, and to provide later withdrawal controls.',
          'Declining optional analytics must not block the core service. The exact Production configuration and final GDPR/ePrivacy legal basis remain subject to runtime verification and qualified review.',
        ],
      },
      {
        title: 'Data you are required to provide',
        items: [
          'Account/authentication information required by the sign-in or onboarding flow is necessary to create or use the corresponding account functionality; without it, the account or authenticated service cannot be provided.',
          'Billing/checkout information requested for a paid purchase is necessary to complete that purchase; without the required billing step, the paid transaction cannot be completed.',
          'Optional analytics consent is not required to use the core service.',
          'A product-required field is not described as a statutory requirement unless a specific law actually requires it.',
        ],
      },
      {
        title: 'Sources of personal data',
        paragraphs: [
          'Data may be obtained directly from the individual or, depending on the enabled workflow, from an organisation administrator, authentication or payment provider, support/security reporter, authorised integration or customer upload. Indirect-collection notice timing and any Article 14 exception must be assessed per concrete flow; no blanket exception is assumed.',
        ],
      },
      {
        title: 'Automated decision-making',
        paragraphs: [
          'RISCK COMPLY is not intended to use website/account processing to make solely automated decisions about an individual that produce legal or similarly significant effects. Product outputs support human compliance operations. Customer use of those outputs may require a separate assessment.',
        ],
      },
      {
        title: 'Security',
        paragraphs: [
          'The service uses evidence-bound authentication, organisation scoping, role checks, Row Level Security posture, server-side authorization, audit controls and managed cloud providers. No security certification, penetration-test result, backup objective or recovery commitment is implied unless supported by current evidence.',
        ],
      },
      {
        title: 'Complaints, children and changes',
        items: [
          'Individuals may lodge a complaint with the competent data-protection supervisory authority. The final lead-authority/cross-border establishment position remains tied to the final operator/entity facts.',
          'The B2B service is not directed to children; prohibited-use and inadvertent-child-data handling remain subject to the applicable customer terms and legal review.',
          'Material privacy changes should be versioned, dated and communicated as appropriate. This page remains a review draft until the publication gate records the required founder facts and qualified legal decisions.',
        ],
      },
    ],
  },
  pt: {
    eyebrow: 'Política de Privacidade — rascunho para revisão',
    title: 'Como a RISCK COMPLY trata dados pessoais',
    summary: 'Este rascunho público descreve a postura técnica e factual atual de privacidade para website, conta, faturação, suporte, segurança, analytics opcionais e tratamento em workspaces de clientes. Factos de entidade, evidência de fornecedores e decisões jurídicas qualificadas ainda pendentes permanecem explicitamente abertos.',
    sections: [
      {
        title: 'Identidade do responsável e contacto de privacidade',
        paragraphs: [
          'A entidade jurídica final que contratará/operará a RISCK COMPLY e os respetivos identificadores registados ainda aguardam confirmação autoritativa dos factos da entidade. Por isso, este rascunho não representa ainda a identificação final do responsável para os artigos 13.º/14.º.',
          'O canal de privacidade atualmente verificado é comercial@risckcomply.com. Não é afirmada a nomeação nem a obrigatoriedade de um Encarregado de Proteção de Dados enquanto os factos de aplicabilidade do artigo 37.º permanecerem por resolver.',
        ],
      },
      {
        title: 'Âmbito e papéis',
        paragraphs: [
          'Este aviso cobre tratamentos sob controlo do fornecedor relativos ao website, conta, comercial, faturação, suporte, segurança e analytics opcionais. Quando um cliente coloca dados pessoais num workspace e determina as finalidades desse tratamento, o cliente será em regra o responsável e a RISCK COMPLY atuará em regra como subcontratante ao abrigo do DPA aplicável, sujeito à alocação final de papéis para o tratamento concreto.',
        ],
      },
      {
        title: 'Categorias de dados pessoais',
        items: [
          'Identificadores de conta, email, autenticação e metadados de sessão.',
          'Organização, membros do workspace, funções e permissões.',
          'Sistemas de IA, fornecedores, riscos, documentos, tarefas, avaliações e evidências introduzidos pelo cliente quando contenham dados pessoais.',
          'Identificadores de faturação, estado de subscrição e metadados de pagamento recebidos dos serviços de pagamento configurados.',
          'Comunicações de suporte, eventos de segurança, recusas de autorização, diagnóstico, rate-limit e prevenção de abuso.',
          'Eventos de analytics opcionais e a preferência de consentimento quando analytics está configurado.',
        ],
      },
      {
        title: 'Finalidades',
        items: [
          'Criar e administrar contas, autenticar utilizadores e controlar acesso ao workspace.',
          'Prestar os fluxos de compliance, documentos, tarefas, avaliações, lembretes e trilho de auditoria solicitados pelos clientes.',
          'Proteger o serviço, tenants e infraestrutura, prevenir abuso/fraude, investigar incidentes e preservar evidência de segurança.',
          'Administrar subscrições, faturação e registos contabilísticos.',
          'Responder a suporte, procurement e outros pedidos empresariais e enviar comunicações essenciais do serviço.',
          'Medir utilização do produto através de analytics opcionais apenas quando as condições configuradas de consentimento/fundamento jurídico sejam satisfeitas.',
        ],
      },
      {
        title: 'Fundamentos jurídicos — limite de revisão',
        paragraphs: [
          'A matriz atual mapeia contrato/medidas pré-contratuais pedidas, obrigações legais específicas, interesses legítimos e consentimento como fundamentos candidatos, consoante a atividade. Segurança/prevenção de abuso, evidência de resposta a incidentes e administração restrita de relações B2B possuem avaliações de interesse legítimo pré-revisão.',
          'Essas alocações não são apresentadas como aprovação jurídica qualificada final. Analytics opcionais e marketing não essencial não recebem aprovação automática por interesse legítimo. O aviso final deve ser reconciliado com a decisão jurídica qualificada antes de ser tratado como texto legal efetivo.',
        ],
      },
      {
        title: 'Destinatários e fornecedores',
        paragraphs: [
          'Os dados pessoais podem ser comunicados a fornecedores configurados de hosting, base de dados/autenticação, pagamentos, observabilidade, analytics, email/suporte e serviços profissionais apenas na medida necessária, e a autoridades/outros destinatários quando a divulgação for legalmente exigida.',
          'A lista exata de fornecedores ativos em Produção, os respetivos papéis e a posição contratual específica da conta ainda estão em reconciliação. A página pública de Subprocessadores é uma superfície de revisão e deve coincidir com a configuração real de Produção e o DPA assinado.',
        ],
      },
      {
        title: 'Transferências internacionais',
        paragraphs: [
          'O projeto Supabase de Produção está configurado em eu-west-1 (Irlanda). Outros fornecedores configurados podem tratar dados noutros países ou através de infraestrutura global.',
          'Este rascunho não afirma que todas as decisões específicas de adequação, SCC, medidas suplementares ou avaliação de transferências já foram aceites. A superfície de Transferências Internacionais mantém esses pontos abertos até existirem factos de conta/fornecedor e revisão jurídica qualificada.',
        ],
      },
      {
        title: 'Conservação e eliminação',
        paragraphs: [
          'A RISCK COMPLY utiliza um modelo de conservação por categoria, e não um único período universal. A conservação depende da finalidade, relação com o cliente, deveres legais de arquivo, necessidades de segurança/reclamações, ciclo de vida do fornecedor e capacidade de eliminação.',
          'Uma prova protegida exact-SHA de Data Governance valida que o esquema canónico exige períodos limitados por categoria. Essa prova técnica não determina o prazo juridicamente adequado para cada categoria nem prova que todos os fornecedores downstream concluíram uma eliminação.',
        ],
      },
      {
        title: 'Os seus direitos e encaminhamento de pedidos',
        paragraphs: [
          'Nos termos da lei aplicável, a pessoa pode ter direitos de acesso, retificação, apagamento, limitação, oposição, portabilidade e retirada de consentimento. Pedidos sobre tratamentos controlados pela RISCK COMPLY podem ser enviados para comercial@risckcomply.com.',
          'Quando os dados relevantes são controlados por um cliente dentro do workspace, a RISCK COMPLY pode ter de encaminhar o pedido para esse cliente ou assisti-lo ao abrigo do DPA. Identidade, âmbito, exceções legais e conclusão downstream são avaliados no pedido concreto e não decididos automaticamente pelo software.',
        ],
      },
      {
        title: 'Consentimento e analytics opcionais',
        paragraphs: [
          'O código da aplicação foi desenhado para exigir consentimento de analytics por defeito, salvo configuração pública explícita em contrário, bloquear inicialização/captura do PostHog sem o consentimento exigido e permitir posterior retirada.',
          'Recusar analytics opcionais não deve bloquear o serviço principal. A configuração exata de Produção e o fundamento final de RGPD/ePrivacy permanecem sujeitos a prova runtime e revisão qualificada.',
        ],
      },
      {
        title: 'Dados que é necessário fornecer',
        items: [
          'Dados de conta/autenticação pedidos pelo fluxo de login ou onboarding são necessários para criar ou usar a funcionalidade autenticada; sem eles, essa conta/funcionalidade não pode ser prestada.',
          'Informação de faturação/checkout pedida para uma compra paga é necessária para concluir essa compra; sem os passos obrigatórios, a transação paga não pode ser concluída.',
          'Consentimento para analytics opcionais não é necessário para utilizar o serviço principal.',
          'Um campo exigido pelo produto não é descrito como obrigação legal salvo quando uma lei específica realmente o exija.',
        ],
      },
      {
        title: 'Fontes dos dados pessoais',
        paragraphs: [
          'Os dados podem ser obtidos diretamente da pessoa ou, consoante o fluxo ativo, de um administrador da organização, fornecedor de autenticação/pagamentos, contacto de suporte/segurança, integração autorizada ou upload do cliente. O prazo de informação para recolha indireta e qualquer exceção do artigo 14.º devem ser avaliados por fluxo; nenhuma exceção geral é assumida.',
        ],
      },
      {
        title: 'Decisões automatizadas',
        paragraphs: [
          'A RISCK COMPLY não pretende usar tratamentos de website/conta para tomar decisões exclusivamente automatizadas sobre uma pessoa com efeitos jurídicos ou significativamente semelhantes. Os outputs do produto apoiam operações humanas de compliance. A utilização desses outputs pelo cliente pode exigir avaliação separada.',
        ],
      },
      {
        title: 'Segurança',
        paragraphs: [
          'O serviço utiliza controlos sustentados por evidência, incluindo autenticação, âmbito por organização, funções, Row Level Security, autorização server-side, auditoria e fornecedores cloud geridos. Nenhuma certificação, resultado de pentest, objetivo de backup ou compromisso de recuperação é implicitamente afirmado sem evidência atual.',
        ],
      },
      {
        title: 'Reclamações, menores e alterações',
        items: [
          'A pessoa pode apresentar reclamação à autoridade de proteção de dados competente. A autoridade principal/posição de estabelecimento transfronteiriço depende dos factos finais da entidade operadora.',
          'O serviço B2B não se destina a crianças; usos proibidos e tratamento de dados de menores enviados inadvertidamente dependem dos termos aplicáveis e revisão jurídica.',
          'Alterações materiais de privacidade devem ser versionadas, datadas e comunicadas quando adequado. Esta página permanece rascunho até o gate de publicação registar os factos de founder/entidade e as decisões jurídicas qualificadas necessárias.',
        ],
      },
    ],
  },
  es: {
    eyebrow: 'Política de Privacidad — borrador de revisión',
    title: 'Cómo RISCK COMPLY trata los datos personales',
    summary: 'Borrador público de la postura técnica y factual de privacidad. Los datos de entidad, proveedores y decisiones jurídicas todavía no aceptados permanecen abiertos.',
    sections: [
      { title: 'Identidad y contacto', paragraphs: ['La entidad jurídica final de RISCK COMPLY y sus identificadores registrales siguen pendientes de confirmación autoritativa. Este borrador no constituye todavía la identificación final del responsable.', 'Contacto de privacidad verificado: comercial@risckcomply.com. No se afirma que exista o sea obligatorio un DPO mientras siga abierta la evaluación de aplicabilidad.'] },
      { title: 'Ámbito y roles', paragraphs: ['El aviso cubre web, cuenta, comercial, facturación, soporte, seguridad y analítica opcional. Para datos personales controlados por el cliente dentro de su workspace, el cliente será normalmente responsable y RISCK COMPLY normalmente encargado, sujeto a la asignación final para el tratamiento concreto.'] },
      { title: 'Categorías y finalidades', items: ['Cuenta, autenticación, organización y permisos.', 'Contenido de compliance que contenga datos personales.', 'Facturación y suscripción.', 'Soporte, seguridad, diagnóstico y prevención de abuso.', 'Analítica opcional y preferencia de consentimiento cuando esté configurada.'] },
      { title: 'Bases jurídicas — revisión pendiente', paragraphs: ['Contrato/medidas precontractuales solicitadas, obligaciones legales específicas, interés legítimo y consentimiento están mapeados como bases candidatas según la actividad. La asignación final requiere revisión jurídica cualificada.'] },
      { title: 'Destinatarios, transferencias y conservación', paragraphs: ['Los proveedores activos y las condiciones contractuales de cuenta deben coincidir con Producción y el DPA. Supabase Producción está en eu-west-1 (Irlanda); otros proveedores pueden usar infraestructura global. No se afirma aceptación final de todos los mecanismos de transferencia.', 'La conservación es específica por categoría, no un plazo universal.'] },
      { title: 'Derechos y consentimiento', paragraphs: ['Pueden existir derechos de acceso, rectificación, supresión, limitación, oposición, portabilidad y retirada del consentimiento. Contacto: comercial@risckcomply.com. Solicitudes sobre datos controlados por un cliente pueden ser remitidas al cliente.', 'Rechazar analítica opcional no debe bloquear el servicio principal.'] },
      { title: 'Datos obligatorios, fuentes y decisiones automatizadas', paragraphs: ['Datos necesarios de cuenta/autenticación son necesarios para la funcionalidad correspondiente; datos de checkout son necesarios para una compra de pago; la analítica opcional no es necesaria para el servicio principal.', 'Las fuentes pueden incluir al interesado, administradores, proveedores de identidad/pago, soporte/seguridad, integraciones y cargas del cliente. No se pretende tomar decisiones exclusivamente automatizadas con efectos jurídicos o similares sobre individuos mediante el tratamiento de web/cuenta.'] },
      { title: 'Reclamaciones y cambios', paragraphs: ['Puede presentarse una reclamación ante la autoridad de protección de datos competente. Este documento sigue siendo REVIEW_DRAFT hasta la aprobación factual y jurídica requerida.'] },
    ],
  },
  fr: {
    eyebrow: 'Politique de confidentialité — projet de revue',
    title: 'Comment RISCK COMPLY traite les données personnelles',
    summary: 'Projet public décrivant l’état technique et factuel de la confidentialité. Les faits d’entité, de fournisseurs et les décisions juridiques non encore validés restent ouverts.',
    sections: [
      { title: 'Identité et contact', paragraphs: ["L’entité juridique finale RISCK COMPLY et ses identifiants enregistrés restent à confirmer de manière autoritative. Ce projet ne constitue donc pas encore l’identification finale du responsable du traitement.", 'Contact de confidentialité vérifié : comercial@risckcomply.com. Aucun DPO n’est présenté comme nommé ou requis tant que l’applicabilité reste ouverte.'] },
      { title: 'Portée et rôles', paragraphs: ['Le présent avis couvre le site, le compte, les activités commerciales, la facturation, le support, la sécurité et les analytics optionnels. Pour les données contrôlées par un client dans son workspace, le client est généralement responsable et RISCK COMPLY généralement sous-traitant, sous réserve de la qualification finale du traitement concret.'] },
      { title: 'Catégories et finalités', items: ['Compte, authentification, organisation et autorisations.', 'Contenu de conformité pouvant contenir des données personnelles.', 'Facturation et abonnement.', 'Support, sécurité, diagnostic et prévention des abus.', 'Analytics optionnels et préférence de consentement lorsqu’ils sont configurés.'] },
      { title: 'Bases juridiques — validation en attente', paragraphs: ['Contrat/mesures précontractuelles demandées, obligations légales spécifiques, intérêts légitimes et consentement sont cartographiés comme bases candidates selon le traitement. La décision finale exige une revue juridique qualifiée.'] },
      { title: 'Destinataires, transferts et conservation', paragraphs: ['Les fournisseurs actifs et leur situation contractuelle doivent correspondre à la Production et au DPA. Supabase Production est configuré en eu-west-1 (Irlande) ; d’autres fournisseurs peuvent utiliser une infrastructure mondiale. Aucun mécanisme de transfert n’est présenté comme entièrement approuvé sans preuve.', 'La conservation est définie par catégorie et non par une durée universelle.'] },
      { title: 'Droits et consentement', paragraphs: ['Les personnes peuvent disposer de droits d’accès, rectification, effacement, limitation, opposition, portabilité et retrait du consentement. Contact : comercial@risckcomply.com. Les demandes concernant des données contrôlées par un client peuvent être dirigées vers ce client.', 'Le refus des analytics optionnels ne doit pas bloquer le service principal.'] },
      { title: 'Données requises, sources et décisions automatisées', paragraphs: ["Les données nécessaires au compte/authentification sont requises pour la fonctionnalité correspondante ; les informations de checkout sont nécessaires à un achat payant ; les analytics optionnels ne sont pas nécessaires au service principal.", "Les sources peuvent inclure la personne, les administrateurs, les fournisseurs d’identité/paiement, le support/sécurité, les intégrations et les uploads client. Le traitement du site/compte n’est pas destiné à prendre des décisions exclusivement automatisées produisant des effets juridiques ou similaires sur une personne."] },
      { title: 'Réclamations et modifications', paragraphs: ["Une réclamation peut être introduite auprès de l’autorité de protection des données compétente. Ce document reste REVIEW_DRAFT jusqu’aux validations factuelles et juridiques requises."] },
    ],
  },
  it: {
    eyebrow: 'Informativa Privacy — bozza di revisione',
    title: 'Come RISCK COMPLY tratta i dati personali',
    summary: 'Bozza pubblica dello stato tecnico e fattuale della privacy. I fatti societari, dei provider e le decisioni legali non ancora approvati restano aperti.',
    sections: [
      { title: 'Identità e contatto', paragraphs: ["L’entità giuridica finale RISCK COMPLY e i relativi identificativi registrati sono ancora in attesa di conferma autoritativa. Questa bozza non costituisce quindi ancora l’identificazione finale del titolare.", 'Contatto privacy verificato: comercial@risckcomply.com. Non viene dichiarata la nomina o l’obbligatorietà di un DPO finché l’applicabilità resta aperta.'] },
      { title: 'Ambito e ruoli', paragraphs: ['L’informativa copre sito, account, attività commerciali, fatturazione, supporto, sicurezza e analytics opzionali. Per i dati controllati dal cliente nel workspace, il cliente sarà normalmente titolare e RISCK COMPLY normalmente responsabile del trattamento per conto del cliente, soggetto alla qualificazione finale del trattamento concreto.'] },
      { title: 'Categorie e finalità', items: ['Account, autenticazione, organizzazione e permessi.', 'Contenuti di compliance che possono includere dati personali.', 'Fatturazione e abbonamento.', 'Supporto, sicurezza, diagnostica e prevenzione degli abusi.', 'Analytics opzionali e preferenza di consenso quando configurati.'] },
      { title: 'Basi giuridiche — revisione pendente', paragraphs: ['Contratto/misure precontrattuali richieste, obblighi legali specifici, legittimo interesse e consenso sono mappati come basi candidate a seconda dell’attività. La decisione finale richiede revisione legale qualificata.'] },
      { title: 'Destinatari, trasferimenti e conservazione', paragraphs: ['I provider attivi e la loro posizione contrattuale devono corrispondere alla Produzione e al DPA. Supabase Production è configurato in eu-west-1 (Irlanda); altri provider possono usare infrastrutture globali. Non viene dichiarata l’approvazione finale di tutti i meccanismi di trasferimento.', 'La conservazione è specifica per categoria e non usa un unico periodo universale.'] },
      { title: 'Diritti e consenso', paragraphs: ['Possono applicarsi diritti di accesso, rettifica, cancellazione, limitazione, opposizione, portabilità e revoca del consenso. Contatto: comercial@risckcomply.com. Le richieste sui dati controllati da un cliente possono essere indirizzate al cliente.', 'Rifiutare analytics opzionali non deve bloccare il servizio principale.'] },
      { title: 'Dati richiesti, fonti e decisioni automatizzate', paragraphs: ['I dati necessari per account/autenticazione sono richiesti per la relativa funzionalità; i dati di checkout sono necessari per un acquisto a pagamento; gli analytics opzionali non sono necessari al servizio principale.', 'Le fonti possono includere interessato, amministratori, provider di identità/pagamento, supporto/sicurezza, integrazioni e upload del cliente. Il trattamento web/account non è destinato a prendere decisioni esclusivamente automatizzate con effetti giuridici o simili su individui.'] },
      { title: 'Reclami e modifiche', paragraphs: ['È possibile presentare reclamo all’autorità di protezione dati competente. Questo documento resta REVIEW_DRAFT fino alle necessarie approvazioni fattuali e legali.'] },
    ],
  },
  de: {
    eyebrow: 'Datenschutzerklärung — Prüfentwurf',
    title: 'Wie RISCK COMPLY personenbezogene Daten verarbeitet',
    summary: 'Öffentlicher Entwurf zum technischen und faktischen Datenschutzstatus. Noch nicht bestätigte Unternehmens-, Anbieter- und Rechtsentscheidungen bleiben ausdrücklich offen.',
    sections: [
      { title: 'Identität und Kontakt', paragraphs: ['Die endgültige RISCK-COMPLY-Rechtseinheit und ihre Registerangaben müssen noch autoritativ bestätigt werden. Dieser Entwurf stellt daher noch keine endgültige Identifizierung des Verantwortlichen dar.', 'Bestätigter Datenschutzkontakt: comercial@risckcomply.com. Ein DPO wird weder als bestellt noch als erforderlich dargestellt, solange die Anwendbarkeit offen ist.'] },
      { title: 'Umfang und Rollen', paragraphs: ['Der Hinweis umfasst Website, Konto, Vertrieb, Abrechnung, Support, Sicherheit und optionale Analytics. Für vom Kunden in seinem Workspace kontrollierte personenbezogene Daten ist der Kunde grundsätzlich Verantwortlicher und RISCK COMPLY grundsätzlich Auftragsverarbeiter, vorbehaltlich der endgültigen Einordnung des konkreten Verarbeitungsvorgangs.'] },
      { title: 'Datenkategorien und Zwecke', items: ['Konto, Authentifizierung, Organisation und Berechtigungen.', 'Compliance-Inhalte, soweit sie personenbezogene Daten enthalten.', 'Abrechnung und Abonnement.', 'Support, Sicherheit, Diagnose und Missbrauchsprävention.', 'Optionale Analytics und Einwilligungspräferenz, wenn konfiguriert.'] },
      { title: 'Rechtsgrundlagen — Prüfung offen', paragraphs: ['Vertrag/angeforderte vorvertragliche Maßnahmen, spezifische gesetzliche Pflichten, berechtigte Interessen und Einwilligung sind je nach Tätigkeit als mögliche Grundlagen kartiert. Die endgültige Zuordnung erfordert qualifizierte rechtliche Prüfung.'] },
      { title: 'Empfänger, Übermittlungen und Aufbewahrung', paragraphs: ['Aktive Anbieter und ihre kontospezifische Vertragslage müssen mit der Produktion und dem DPA übereinstimmen. Supabase Production ist in eu-west-1 (Irland) konfiguriert; andere Anbieter können globale Infrastruktur nutzen. Eine endgültige Freigabe sämtlicher Übermittlungsmechanismen wird nicht behauptet.', 'Aufbewahrung wird nach Datenkategorie bestimmt und nicht durch eine einzige universelle Frist.'] },
      { title: 'Rechte und Einwilligung', paragraphs: ['Je nach anwendbarem Recht können Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch, Portabilität und Widerruf der Einwilligung bestehen. Kontakt: comercial@risckcomply.com. Anfragen zu vom Kunden kontrollierten Daten können an den Kunden weitergeleitet werden.', 'Die Ablehnung optionaler Analytics darf den Kerndienst nicht blockieren.'] },
      { title: 'Erforderliche Daten, Quellen und automatisierte Entscheidungen', paragraphs: ['Erforderliche Konto-/Authentifizierungsdaten sind für die jeweilige Funktion notwendig; Checkout-Daten sind für einen kostenpflichtigen Kauf erforderlich; optionale Analytics sind für den Kerndienst nicht erforderlich.', 'Quellen können die betroffene Person, Administratoren, Identitäts-/Zahlungsanbieter, Support/Sicherheit, Integrationen und Kunden-Uploads sein. Website-/Kontoverarbeitung ist nicht für ausschließlich automatisierte Entscheidungen mit rechtlicher oder ähnlich erheblicher Wirkung über Personen vorgesehen.'] },
      { title: 'Beschwerden und Änderungen', paragraphs: ['Eine Beschwerde kann bei der zuständigen Datenschutzaufsichtsbehörde eingereicht werden. Dieses Dokument bleibt REVIEW_DRAFT bis die erforderlichen faktischen und rechtlichen Freigaben vorliegen.'] },
    ],
  },
};

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  const page = copy[locale];

  return (
    <PublicLegalReviewPage
      locale={locale}
      eyebrow={page.eyebrow}
      title={page.title}
      summary={page.summary}
      documentId="privacy-policy"
      version="0.2-review"
      lastUpdated={LAST_UPDATED}
      sections={page.sections}
      actions={<AnalyticsConsentControls locale={locale} />}
    />
  );
}
