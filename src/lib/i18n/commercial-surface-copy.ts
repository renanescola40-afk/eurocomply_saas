import type { Locale } from '@/lib/i18n/routing';

type QA = { question: string; answer: string };
type Proof = { title: string; body: string };
type PlanPresentationCopy = { eyebrow: string; description: string; cta: string };

type PricingCopy = {
  navLabel: string;
  enterprise: string;
  trust: string;
  signIn: string;
  startTrial: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  startProfessional: string;
  bookDemo: string;
  reviewTrust: string;
  guardrailEyebrow: string;
  guardrailTitle: string;
  guardrailBody: string;
  plansLabel: string;
  plan: Record<'starter' | 'professional' | 'business' | 'enterprise', PlanPresentationCopy>;
  from: string;
  month: string;
  contract: string;
  unlimited: string;
  includedUser: string;
  includedUsers: string;
  organization: string;
  organizations: string;
  aiSystem: string;
  aiSystems: string;
  usersByContract: string;
  organizationsByContract: string;
  unlimitedAuditHistory: string;
  enterpriseAuditHistory: string;
  dayAuditHistory: (days: string) => string;
  salesLedContract: string;
  demoAssisted: string;
  selfServeTrial: string;
  selfServe: string;
  limitsAria: (plan: string) => string;
  taxNote: string;
  valueProofLabel: string;
  valueProof: Proof[];
  comparisonEyebrow: string;
  comparisonTitle: string;
  capability: string;
  monthlyReference: string;
  organizationsLabel: string;
  aiSystemsLabel: string;
  auditHistory: string;
  commercialMotion: string;
  objectionsEyebrow: string;
  objectionsTitle: string;
  objections: QA[];
  faqEyebrow: string;
  faqs: QA[];
};

type CheckoutCopy = {
  navLabel: string;
  plans: string;
  billing: string;
  talkToSales: string;
  signIn: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  cancelledTitle: string;
  cancelledBody: string;
  errorTitle: string;
  errorBody: string;
  salesLedTitle: (plan: string) => string;
  salesLedBody: string;
  currentTitle: string;
  currentBody: string;
  proof: Proof[];
  orderSummary: string;
  salesLedSummary: string;
  monthlySummary: string;
  currentBadge: string;
  salesLedBadge: string;
  selectedBadge: string;
  month: string;
  contactSales: string;
  byContract: string;
  users: string;
  documents: string;
  vendors: string;
  risks: string;
  currentPlan: string;
  workspace: string;
  salesLedActivation: string;
  continueSecureCheckout: string;
  createWorkspace: string;
  createAccount: string;
  signInContinue: string;
  flowEyebrow: string;
  flowTitle: string;
  steps: string[];
  salesLed: string;
  perMonth: string;
};

type ConsentCopy = { title: string; body: string; decline: string; allow: string };

type LoginCopy = {
  badge: string;
  title: string;
  subtitle: string;
  google: string;
  divider: string;
  email: string;
  password: string;
  forgot: string;
  submit: string;
  loading: string;
  createPrompt: string;
  create: string;
  authLoading: string;
  failed: string;
  googleFailed: string;
  accessNote: string;
};

type SignupCopy = {
  eyebrow: string;
  sideEyebrow: string;
  sideTitle: string;
  sideBody: string;
  title: string;
  subtitle: string;
  choosePlanTitle: string;
  choosePlanSubtitle: string;
  selectPlan: string;
  selectedPlan: string;
  salesLed: string;
  salesLedTitle: string;
  salesLedSubtitle: string;
  google: string;
  divider: string;
  email: string;
  password: string;
  submit: string;
  loading: string;
  verifyTitle: string;
  verifySubtitle: string;
  haveAccount: string;
  signIn: string;
  authLoading: string;
  authExchangeFailed: string;
  fallbackError: string;
  from: string;
  month: string;
  contactSales: string;
};

export type CommercialSurfaceCopy = {
  pricing: PricingCopy;
  checkout: CheckoutCopy;
  consent: ConsentCopy;
  login: LoginCopy;
  signup: SignupCopy;
};

const en: CommercialSurfaceCopy = {
  pricing: {
    navLabel: 'Pricing navigation',
    enterprise: 'Enterprise',
    trust: 'Trust Center',
    signIn: 'Sign in',
    startTrial: 'Start trial',
    heroEyebrow: 'Transparent AI governance pricing',
    heroTitle: 'Start with AI readiness. Scale into enterprise governance.',
    heroSubtitle: 'Choose the plan that matches your AI footprint: from first inventory to multi-team governance workflows and enterprise controls.',
    startProfessional: 'Start Professional Trial',
    bookDemo: 'Book a Demo',
    reviewTrust: 'Review Trust Center',
    guardrailEyebrow: 'Commercial guardrail',
    guardrailTitle: 'Operational readiness, not legal guarantees.',
    guardrailBody: 'RISCK COMPLY supports AI governance readiness, evidence preparation and audit workflows. It is not legal advice, does not replace legal counsel and does not guarantee regulatory compliance.',
    plansLabel: 'Pricing plans',
    plan: {
      starter: { eyebrow: 'Starter workspace', description: 'For small teams replacing spreadsheets with a controlled AI governance workspace.', cta: 'Start Essential' },
      professional: { eyebrow: 'Best for readiness', description: 'For B2B teams preparing structured AI Act readiness evidence.', cta: 'Start Professional Trial' },
      business: { eyebrow: 'Multi-team rollout', description: 'For companies operating AI workflows across departments or business units.', cta: 'Book Business Demo' },
      enterprise: { eyebrow: 'Contract enterprise', description: 'For regulated teams needing advanced identity, RBAC, onboarding and agreed support terms.', cta: 'Talk to Sales' },
    },
    from: 'From',
    month: '/mo',
    contract: 'Contract',
    unlimited: 'Unlimited',
    includedUser: 'included user',
    includedUsers: 'included users',
    organization: 'organization',
    organizations: 'organizations',
    aiSystem: 'AI system',
    aiSystems: 'AI systems',
    usersByContract: 'Users by contract',
    organizationsByContract: 'Organizations by contract',
    unlimitedAuditHistory: 'Unlimited audit history',
    enterpriseAuditHistory: 'Audit retention by enterprise policy',
    dayAuditHistory: (days) => `${days}-day audit history`,
    salesLedContract: 'Sales-led / contract',
    demoAssisted: 'Demo / assisted sales',
    selfServeTrial: 'Self-serve trial',
    selfServe: 'Self-serve',
    limitsAria: (plan) => `${plan} included limits`,
    taxNote: 'Prices are shown in EUR. Taxes or VAT, where applicable, are confirmed during checkout or in the applicable order form. Business is assisted-sales; Enterprise uses negotiated contract pricing.',
    valueProofLabel: 'Pricing value proof',
    valueProof: [
      { title: 'Know your AI footprint', body: 'Create a clear record of AI systems, owners, use cases, departments, countries and vendors.' },
      { title: 'Classify risk without chaos', body: 'Turn vague AI concerns into structured risk signals, ownership and next actions.' },
      { title: 'Prepare evidence before pressure', body: 'Organize governance evidence and review activity without claiming legal guarantees.' },
    ],
    comparisonEyebrow: 'Plan comparison',
    comparisonTitle: 'Compare canonical capacity and commercial motion.',
    capability: 'Capability',
    monthlyReference: 'Monthly reference',
    organizationsLabel: 'Organizations',
    aiSystemsLabel: 'AI systems',
    auditHistory: 'Audit history',
    commercialMotion: 'Commercial motion',
    objectionsEyebrow: 'Objections',
    objectionsTitle: 'Strong answers without unsafe promises.',
    objections: [
      { question: 'Does this guarantee EU AI Act compliance?', answer: 'No. RISCK COMPLY supports operational readiness, evidence preparation and governance workflows. Final legal interpretation remains with your legal counsel and advisors.' },
      { question: 'We already have spreadsheets.', answer: 'RISCK COMPLY gives AI inventory, ownership, evidence status and review history a controlled system of record.' },
      { question: 'Do you replace lawyers or DPOs?', answer: 'No. The platform helps legal, compliance, DPO, security and product teams work from the same operating evidence.' },
    ],
    faqEyebrow: 'Commercial FAQ',
    faqs: [
      { question: 'Which plan should we start with?', answer: 'Essential is for a first controlled workspace. Professional is the default for structured readiness. Business is for multi-team rollout. Enterprise is procurement-led.' },
      { question: 'Do you offer a trial?', answer: 'Professional is the recommended trial motion. Business and Enterprise should start with a demo.' },
      { question: 'How is Enterprise priced?', answer: 'Enterprise uses negotiated contract pricing. The public starting reference is from €990/month; final pricing depends on scope, rollout, support and agreed commercial terms.' },
    ],
  },
  checkout: {
    navLabel: 'Checkout navigation',
    plans: 'Plans', billing: 'Billing', talkToSales: 'Talk to sales', signIn: 'Sign in',
    heroEyebrow: 'Secure SaaS checkout', heroTitle: 'Activate your RISCK COMPLY workspace.',
    heroSubtitle: 'Select a monthly self-serve plan, confirm billing data in Stripe, or route assisted and Enterprise procurement through a sales-led rollout.',
    cancelledTitle: 'Checkout cancelled', cancelledBody: 'No billing change was made. Review the plan and restart checkout when you are ready.',
    errorTitle: 'Checkout could not start', errorBody: 'Please confirm you are signed in, have a workspace and can manage billing for this organization.',
    salesLedTitle: (plan) => `${plan} is sales-led`, salesLedBody: 'This plan requires rollout scope and agreed commercial terms before subscription activation.',
    currentTitle: 'This is already your current plan', currentBody: 'Open the billing portal if you need to manage invoices, payment details or subscription changes.',
    proof: [
      { title: 'Stripe secure billing', body: 'Card, invoice details, tax IDs and billing addresses are handled by Stripe Checkout.' },
      { title: 'Workspace-linked subscription', body: 'The selected plan is connected to your organization after Stripe confirms the subscription.' },
      { title: 'Transparent monthly pricing', body: 'The plan price comes from the SaaS billing catalog, with no hidden setup fee.' },
    ],
    orderSummary: 'Order summary', salesLedSummary: 'Sales-led compliance rollout for procurement-driven teams.', monthlySummary: 'Monthly subscription for your compliance workspace.',
    currentBadge: 'Current', salesLedBadge: 'Sales-led', selectedBadge: 'Selected', month: '/mo', contactSales: 'Contact sales', byContract: 'By contract',
    users: 'Users', documents: 'Documents', vendors: 'Vendors', risks: 'Risks', currentPlan: 'Current plan', workspace: 'Workspace',
    salesLedActivation: 'Sales-led subscriptions are activated after commercial approval.', continueSecureCheckout: 'Continue to secure checkout', createWorkspace: 'Create workspace before checkout', createAccount: 'Create account and continue', signInContinue: 'Sign in to continue',
    flowEyebrow: 'Checkout flow', flowTitle: 'A polished handoff, not a generic payment link.',
    steps: ['Choose the plan that matches your current compliance workload.', 'Confirm billing details in Stripe Checkout for self-serve plans, or talk to sales for assisted and contract plans.', 'Return to the RISCK COMPLY dashboard with the plan connected to your workspace.'],
    salesLed: 'sales-led', perMonth: 'per month',
  },
  consent: {
    title: 'Privacy-first product analytics',
    body: 'Help us improve RISCK COMPLY by sharing privacy-safe usage analytics. We do not capture document contents, risk notes, vendor names, form inputs or compliance data.',
    decline: 'Decline', allow: 'Allow',
  },
  login: {
    badge: 'Secure workspace access', title: 'Sign in to RISCK COMPLY', subtitle: 'Continue with Google, work email or Enterprise SSO.',
    google: 'Continue with Google', divider: 'or sign in with email', email: 'Work email', password: 'Password', forgot: 'Forgot your password?', submit: 'Sign in securely', loading: 'Signing in...',
    createPrompt: 'No account yet?', create: 'Create account', authLoading: 'Authentication is still loading. Please try again in a moment.', failed: 'Could not sign in. Check your details and try again.', googleFailed: 'Could not start Google sign-in. Please try again.',
    accessNote: 'New accounts complete onboarding and secure Stripe payment before accessing the SaaS.',
  },
  signup: {
    eyebrow: 'Secure signup', sideEyebrow: 'AI Act onboarding', sideTitle: 'Start with plan, organization and onboarding in the right order.', sideBody: 'New accounts choose a plan first, create the account and enter onboarding to configure the company.',
    title: 'Create your RISCK COMPLY account', subtitle: 'Choose a plan before creating the account. Then we guide you through company onboarding.', choosePlanTitle: 'Choose the new account plan', choosePlanSubtitle: 'Every new account starts with a selected plan so billing and onboarding stay aligned.',
    selectPlan: 'Select plan', selectedPlan: 'Selected plan', salesLed: 'Talk to sales', salesLedTitle: 'This plan is sales-led', salesLedSubtitle: 'We agree rollout scope and commercial terms before subscription activation.',
    google: 'Create account with Google', divider: 'or create with email', email: 'Work email', password: 'Password', submit: 'Create account', loading: 'Creating...', verifyTitle: 'Verify your email', verifySubtitle: 'We sent a confirmation link. Then sign in to continue onboarding.',
    haveAccount: 'Already have an account?', signIn: 'Sign in', authLoading: 'Authentication is still loading. Please try again in a moment.', authExchangeFailed: 'Could not complete account creation. Please try again.', fallbackError: 'Could not create the account. Please try again.',
    from: 'From', month: '/mo', contactSales: 'Contact sales',
  },
};

function mergePricing(overrides: Partial<Omit<PricingCopy, 'plan'>> & { plan?: Partial<PricingCopy['plan']> }): PricingCopy {
  return { ...en.pricing, ...overrides, plan: { ...en.pricing.plan, ...overrides.plan } };
}

function makeLocale(input: {
  pricing: Partial<Omit<PricingCopy, 'plan'>> & { plan?: Partial<PricingCopy['plan']> };
  checkout: Partial<CheckoutCopy>;
  consent: ConsentCopy;
  login: LoginCopy;
  signup: SignupCopy;
}): CommercialSurfaceCopy {
  return {
    pricing: mergePricing(input.pricing),
    checkout: { ...en.checkout, ...input.checkout },
    consent: input.consent,
    login: input.login,
    signup: input.signup,
  };
}

const pt = makeLocale({
  pricing: {
    navLabel: 'Navegação de preços', trust: 'Centro de Confiança', signIn: 'Entrar', startTrial: 'Iniciar teste',
    heroEyebrow: 'Preços transparentes para governação de IA', heroTitle: 'Comece pela preparação de IA. Evolua para governação enterprise.', heroSubtitle: 'Escolha o plano adequado à sua utilização de IA: do primeiro inventário aos workflows multi-equipa e aos controlos enterprise.',
    startProfessional: 'Iniciar teste Professional', bookDemo: 'Pedir demonstração', reviewTrust: 'Rever Centro de Confiança',
    guardrailEyebrow: 'Limite comercial', guardrailTitle: 'Preparação operacional, não garantias jurídicas.', guardrailBody: 'A RISCK COMPLY apoia preparação de governação, evidências e auditoria. Não presta aconselhamento jurídico, não substitui assessoria legal e não garante conformidade regulatória.',
    plansLabel: 'Planos e preços', from: 'Desde', month: '/mês', contract: 'Por contrato', unlimited: 'Ilimitado', includedUser: 'utilizador incluído', includedUsers: 'utilizadores incluídos', organization: 'organização', organizations: 'organizações', aiSystem: 'sistema de IA', aiSystems: 'sistemas de IA', usersByContract: 'Utilizadores por contrato', organizationsByContract: 'Organizações por contrato', unlimitedAuditHistory: 'Histórico de auditoria ilimitado', enterpriseAuditHistory: 'Retenção conforme política enterprise', dayAuditHistory: (days) => `${days} dias de histórico de auditoria`, salesLedContract: 'Vendas assistidas / contrato', demoAssisted: 'Demo / vendas assistidas', selfServeTrial: 'Teste self-service', selfServe: 'Self-service', limitsAria: (plan) => `Limites incluídos no ${plan}`,
    taxNote: 'Os preços são apresentados em EUR. Impostos ou IVA, quando aplicáveis, são confirmados no checkout ou no documento contratual. Business é assistido por vendas; Enterprise usa preços negociados por contrato.',
    valueProofLabel: 'Valor dos planos', valueProof: [
      { title: 'Conheça a sua utilização de IA', body: 'Registe sistemas de IA, responsáveis, casos de uso, departamentos, países e fornecedores.' },
      { title: 'Classifique risco com estrutura', body: 'Transforme preocupações em sinais de risco, ownership e próximas ações.' },
      { title: 'Prepare evidências antes da pressão', body: 'Organize evidências e atividade de revisão sem alegar garantias jurídicas.' },
    ],
    comparisonEyebrow: 'Comparação de planos', comparisonTitle: 'Compare capacidade e modelo comercial.', capability: 'Capacidade', monthlyReference: 'Referência mensal', organizationsLabel: 'Organizações', aiSystemsLabel: 'Sistemas de IA', auditHistory: 'Histórico de auditoria', commercialMotion: 'Modelo comercial',
    objectionsEyebrow: 'Dúvidas frequentes', objectionsTitle: 'Respostas claras sem promessas inseguras.', objections: [
      { question: 'Isto garante conformidade com o EU AI Act?', answer: 'Não. A RISCK COMPLY apoia preparação operacional, evidências e workflows. A interpretação jurídica final permanece com assessoria qualificada.' },
      { question: 'Já usamos folhas de cálculo.', answer: 'A plataforma organiza inventário, ownership, evidências e histórico num sistema controlado.' },
      { question: 'Substituem advogados ou DPOs?', answer: 'Não. A plataforma ajuda equipas jurídicas, compliance, DPO, segurança e produto a trabalhar sobre as mesmas evidências.' },
    ],
    faqEyebrow: 'FAQ comercial', faqs: [
      { question: 'Com que plano devemos começar?', answer: 'Essential serve um primeiro workspace. Professional é recomendado para readiness estruturada. Business é multi-equipa. Enterprise é procurement-led.' },
      { question: 'Existe período de teste?', answer: 'Professional é o teste recomendado. Business e Enterprise devem começar por uma demo.' },
      { question: 'Como funciona o preço Enterprise?', answer: 'Enterprise usa preços negociados por contrato, com referência pública desde €990/mês.' },
    ],
    plan: {
      starter: { eyebrow: 'Workspace inicial', description: 'Para pequenas equipas que substituem folhas de cálculo por governação controlada.', cta: 'Começar com Essential' },
      professional: { eyebrow: 'Ideal para readiness', description: 'Para equipas B2B que preparam evidências estruturadas do AI Act.', cta: 'Iniciar teste Professional' },
      business: { eyebrow: 'Implementação multi-equipa', description: 'Para empresas com workflows de IA entre equipas e unidades.', cta: 'Pedir demo Business' },
      enterprise: { eyebrow: 'Enterprise por contrato', description: 'Para equipas reguladas com identidade, RBAC, onboarding e suporte acordado.', cta: 'Falar com vendas' },
    },
  },
  checkout: {
    navLabel: 'Navegação do checkout', plans: 'Planos', billing: 'Faturação', talkToSales: 'Falar com vendas', signIn: 'Entrar', heroEyebrow: 'Checkout seguro', heroTitle: 'Ative o seu workspace RISCK COMPLY.', heroSubtitle: 'Escolha um plano self-service, confirme faturação no Stripe ou use o fluxo comercial assistido.',
    cancelledTitle: 'Checkout cancelado', cancelledBody: 'Nenhuma alteração de faturação foi efetuada. Reveja o plano e tente novamente quando estiver pronto.', errorTitle: 'Não foi possível iniciar o checkout', errorBody: 'Confirme que iniciou sessão, tem um workspace e pode gerir a faturação.',
    salesLedTitle: (plan) => `${plan} é assistido por vendas`, salesLedBody: 'Este plano exige escopo, rollout e termos comerciais acordados antes da ativação.', currentTitle: 'Este já é o seu plano atual', currentBody: 'Abra o portal de faturação para gerir faturas, pagamento ou alterações à subscrição.',
    proof: [
      { title: 'Faturação segura com Stripe', body: 'Cartão, dados de fatura, identificadores fiscais e moradas são tratados pelo Stripe Checkout.' },
      { title: 'Subscrição ligada ao workspace', body: 'O plano é ligado à organização depois da confirmação do Stripe.' },
      { title: 'Preço mensal transparente', body: 'O preço vem do catálogo de billing, sem taxa de configuração escondida.' },
    ],
    orderSummary: 'Resumo do pedido', salesLedSummary: 'Implementação assistida para equipas com procurement.', monthlySummary: 'Subscrição mensal para o seu workspace.', currentBadge: 'Atual', salesLedBadge: 'Assistido', selectedBadge: 'Selecionado', month: '/mês', contactSales: 'Falar com vendas', byContract: 'Por contrato', users: 'Utilizadores', documents: 'Documentos', vendors: 'Fornecedores', risks: 'Riscos', currentPlan: 'Plano atual', salesLedActivation: 'Subscrições assistidas são ativadas após aprovação comercial.', continueSecureCheckout: 'Continuar para checkout seguro', createWorkspace: 'Criar workspace antes do checkout', createAccount: 'Criar conta e continuar', signInContinue: 'Entrar e continuar', flowEyebrow: 'Fluxo de checkout', flowTitle: 'Uma transição clara para pagamento.', steps: ['Escolha o plano adequado.', 'Confirme os dados no Stripe Checkout ou fale com vendas.', 'Regresse ao dashboard com o plano ligado ao workspace.'], salesLed: 'assistido por vendas', perMonth: 'por mês',
  },
  consent: { title: 'Analytics do produto com privacidade primeiro', body: 'Ajude-nos a melhorar a RISCK COMPLY com analytics seguros. Não captamos conteúdos de documentos, notas de risco, nomes de fornecedores, formulários ou dados de compliance.', decline: 'Recusar', allow: 'Permitir' },
  login: { badge: 'Acesso seguro ao workspace', title: 'Entrar na RISCK COMPLY', subtitle: 'Continue com Google, email profissional ou SSO Enterprise.', google: 'Continuar com Google', divider: 'ou entre com email', email: 'Email profissional', password: 'Palavra-passe', forgot: 'Esqueceu a senha?', submit: 'Entrar com segurança', loading: 'A entrar...', createPrompt: 'Ainda não tem conta?', create: 'Criar conta', authLoading: 'A autenticação ainda está a carregar. Tente novamente em alguns segundos.', failed: 'Não foi possível entrar. Verifique os dados e tente novamente.', googleFailed: 'Não foi possível iniciar o login com Google.', accessNote: 'Contas novas concluem onboarding e pagamento seguro no Stripe antes de aceder ao SaaS.' },
  signup: { eyebrow: 'Registo seguro', sideEyebrow: 'Onboarding do AI Act', sideTitle: 'Comece com plano, organização e onboarding na ordem certa.', sideBody: 'Contas novas escolhem o plano, criam a conta e configuram a empresa.', title: 'Criar conta RISCK COMPLY', subtitle: 'Escolha um plano antes de criar a conta. Depois guiamos a sua empresa pelo onboarding.', choosePlanTitle: 'Escolha o plano da nova conta', choosePlanSubtitle: 'Cada nova conta começa com um plano selecionado para manter billing e onboarding alinhados.', selectPlan: 'Selecionar plano', selectedPlan: 'Plano selecionado', salesLed: 'Falar com vendas', salesLedTitle: 'Este plano é assistido por vendas', salesLedSubtitle: 'Definimos escopo, rollout e termos comerciais antes de ativar a subscrição.', google: 'Criar conta com Google', divider: 'ou crie com email', email: 'Email profissional', password: 'Palavra-passe', submit: 'Criar conta', loading: 'A criar...', verifyTitle: 'Verifique o seu email', verifySubtitle: 'Enviámos um link de confirmação. Depois entre para continuar.', haveAccount: 'Já tem conta?', signIn: 'Entrar', authLoading: 'A autenticação ainda está a carregar.', authExchangeFailed: 'Não foi possível concluir a criação da conta.', fallbackError: 'Não foi possível criar a conta.', from: 'Desde', month: '/mês', contactSales: 'Falar com vendas' },
});

const es = makeLocale({
  pricing: {
    navLabel: 'Navegación de precios', trust: 'Centro de confianza', signIn: 'Iniciar sesión', startTrial: 'Iniciar prueba', heroEyebrow: 'Precios transparentes para gobernanza de IA', heroTitle: 'Empieza con preparación de IA. Escala hacia gobernanza enterprise.', heroSubtitle: 'Elige el plan que encaja con tu uso de IA: desde el primer inventario hasta workflows multi-equipo.', startProfessional: 'Iniciar prueba Professional', bookDemo: 'Solicitar demo', reviewTrust: 'Revisar Centro de confianza', guardrailEyebrow: 'Límite comercial', guardrailTitle: 'Preparación operativa, no garantías legales.', guardrailBody: 'RISCK COMPLY apoya readiness, evidencias y workflows. No ofrece asesoramiento jurídico ni garantiza cumplimiento normativo.', plansLabel: 'Planes y precios', from: 'Desde', month: '/mes', contract: 'Por contrato', unlimited: 'Ilimitado', includedUser: 'usuario incluido', includedUsers: 'usuarios incluidos', organization: 'organización', organizations: 'organizaciones', aiSystem: 'sistema de IA', aiSystems: 'sistemas de IA', usersByContract: 'Usuarios por contrato', organizationsByContract: 'Organizaciones por contrato', unlimitedAuditHistory: 'Historial de auditoría ilimitado', enterpriseAuditHistory: 'Retención según política enterprise', dayAuditHistory: (days) => `${days} días de historial`, salesLedContract: 'Ventas asistidas / contrato', demoAssisted: 'Demo / ventas asistidas', selfServeTrial: 'Prueba self-service', selfServe: 'Self-service', limitsAria: (plan) => `Límites incluidos en ${plan}`, taxNote: 'Precios en EUR. Los impuestos o IVA aplicables se confirman en checkout o contrato. Business es asistido; Enterprise usa precios negociados.', valueProofLabel: 'Valor de los planes', valueProof: [{ title: 'Conoce tu huella de IA', body: 'Registra sistemas, responsables, casos de uso y proveedores.' }, { title: 'Clasifica el riesgo con estructura', body: 'Convierte preocupaciones en señales, ownership y próximas acciones.' }, { title: 'Prepara evidencias', body: 'Organiza evidencias y revisiones sin prometer garantías legales.' }], comparisonEyebrow: 'Comparación de planes', comparisonTitle: 'Compara capacidad y modelo comercial.', capability: 'Capacidad', monthlyReference: 'Referencia mensual', organizationsLabel: 'Organizaciones', aiSystemsLabel: 'Sistemas de IA', auditHistory: 'Historial de auditoría', commercialMotion: 'Modelo comercial', objectionsEyebrow: 'Preguntas frecuentes', objectionsTitle: 'Respuestas claras sin promesas inseguras.', objections: [{ question: '¿Garantiza cumplimiento del EU AI Act?', answer: 'No. La plataforma apoya readiness y evidencias; la interpretación legal corresponde a asesores cualificados.' }, { question: 'Ya usamos hojas de cálculo.', answer: 'RISCK COMPLY organiza inventario, ownership y evidencias en un sistema controlado.' }, { question: '¿Sustituye abogados o DPO?', answer: 'No. Ayuda a esos equipos a trabajar con la misma evidencia.' }], faqEyebrow: 'FAQ comercial', faqs: [{ question: '¿Con qué plan empezamos?', answer: 'Essential es inicial, Professional para readiness estructurada, Business multi-equipo y Enterprise procurement-led.' }, { question: '¿Hay prueba?', answer: 'Professional es la prueba recomendada. Business y Enterprise empiezan con demo.' }, { question: '¿Cómo se calcula Enterprise?', answer: 'Usa precios negociados con referencia pública desde 990 €/mes.' }], plan: { starter: { eyebrow: 'Workspace inicial', description: 'Para equipos pequeños que pasan de hojas de cálculo a gobernanza controlada.', cta: 'Empezar con Essential' }, professional: { eyebrow: 'Ideal para readiness', description: 'Para equipos B2B que preparan evidencias estructuradas.', cta: 'Iniciar prueba Professional' }, business: { eyebrow: 'Despliegue multi-equipo', description: 'Para organizaciones con varios workflows de IA.', cta: 'Solicitar demo Business' }, enterprise: { eyebrow: 'Enterprise por contrato', description: 'Para equipos regulados con controles y soporte acordados.', cta: 'Hablar con ventas' } },
  },
  checkout: { navLabel: 'Navegación de checkout', plans: 'Planes', billing: 'Facturación', talkToSales: 'Hablar con ventas', signIn: 'Iniciar sesión', heroEyebrow: 'Checkout seguro', heroTitle: 'Activa tu workspace RISCK COMPLY.', heroSubtitle: 'Elige un plan, confirma facturación en Stripe o usa el flujo comercial asistido.', cancelledTitle: 'Checkout cancelado', cancelledBody: 'No se realizó ningún cambio. Revisa el plan y vuelve a intentarlo.', errorTitle: 'No se pudo iniciar el checkout', errorBody: 'Confirma sesión, workspace y permiso de facturación.', salesLedTitle: (plan) => `${plan} es asistido por ventas`, salesLedBody: 'Este plan requiere alcance y términos acordados.', currentTitle: 'Este ya es tu plan actual', currentBody: 'Abre el portal para gestionar facturas o pagos.', proof: [{ title: 'Facturación segura con Stripe', body: 'Stripe gestiona tarjeta, factura e identificadores fiscales.' }, { title: 'Suscripción vinculada', body: 'El plan se conecta tras la confirmación de Stripe.' }, { title: 'Precio transparente', body: 'El precio procede del catálogo de billing.' }], orderSummary: 'Resumen del pedido', salesLedSummary: 'Despliegue asistido para procurement.', monthlySummary: 'Suscripción mensual para tu workspace.', currentBadge: 'Actual', salesLedBadge: 'Asistido', selectedBadge: 'Seleccionado', month: '/mes', contactSales: 'Hablar con ventas', byContract: 'Por contrato', users: 'Usuarios', documents: 'Documentos', vendors: 'Proveedores', risks: 'Riesgos', currentPlan: 'Plan actual', salesLedActivation: 'Se activa tras aprobación comercial.', continueSecureCheckout: 'Continuar a checkout seguro', createWorkspace: 'Crear workspace antes del checkout', createAccount: 'Crear cuenta y continuar', signInContinue: 'Iniciar sesión y continuar', flowEyebrow: 'Flujo de checkout', flowTitle: 'Una transición clara al pago.', steps: ['Elige el plan adecuado.', 'Confirma datos en Stripe o habla con ventas.', 'Vuelve al dashboard con el plan asociado.'], salesLed: 'asistido', perMonth: 'por mes' },
  consent: { title: 'Analítica de producto con privacidad primero', body: 'Ayúdanos a mejorar RISCK COMPLY con analítica segura. No capturamos documentos, notas de riesgo, proveedores, formularios ni datos de compliance.', decline: 'Rechazar', allow: 'Permitir' },
  login: { badge: 'Acceso seguro al workspace', title: 'Inicia sesión en RISCK COMPLY', subtitle: 'Continúa con Google, email profesional o SSO Enterprise.', google: 'Continuar con Google', divider: 'o inicia sesión con email', email: 'Email profesional', password: 'Contraseña', forgot: '¿Olvidaste la contraseña?', submit: 'Iniciar sesión de forma segura', loading: 'Iniciando sesión...', createPrompt: '¿Aún no tienes cuenta?', create: 'Crear cuenta', authLoading: 'La autenticación todavía está cargando.', failed: 'No se pudo iniciar sesión. Revisa los datos.', googleFailed: 'No se pudo iniciar Google.', accessNote: 'Las cuentas nuevas completan onboarding y pago seguro con Stripe antes de acceder al SaaS.' },
  signup: { eyebrow: 'Registro seguro', sideEyebrow: 'Onboarding del AI Act', sideTitle: 'Empieza con plan, organización y onboarding en el orden correcto.', sideBody: 'Las cuentas nuevas eligen plan, crean la cuenta y configuran la empresa.', title: 'Crea tu cuenta RISCK COMPLY', subtitle: 'Elige un plan antes de crear la cuenta. Después te guiamos por onboarding.', choosePlanTitle: 'Elige el plan de la nueva cuenta', choosePlanSubtitle: 'Cada cuenta empieza con un plan seleccionado para alinear billing y onboarding.', selectPlan: 'Seleccionar plan', selectedPlan: 'Plan seleccionado', salesLed: 'Hablar con ventas', salesLedTitle: 'Este plan es asistido por ventas', salesLedSubtitle: 'Acordamos alcance y términos antes de activar.', google: 'Crear cuenta con Google', divider: 'o crea con email', email: 'Email profesional', password: 'Contraseña', submit: 'Crear cuenta', loading: 'Creando...', verifyTitle: 'Verifica tu email', verifySubtitle: 'Te enviamos un enlace. Después inicia sesión.', haveAccount: '¿Ya tienes cuenta?', signIn: 'Iniciar sesión', authLoading: 'La autenticación todavía está cargando.', authExchangeFailed: 'No se pudo completar la creación.', fallbackError: 'No se pudo crear la cuenta.', from: 'Desde', month: '/mes', contactSales: 'Hablar con ventas' },
});

const fr = makeLocale({
  pricing: {
    navLabel: 'Navigation des tarifs', trust: 'Centre de confiance', signIn: 'Se connecter', startTrial: 'Démarrer l’essai', heroEyebrow: 'Tarification transparente de la gouvernance IA', heroTitle: 'Commencez par la préparation IA. Évoluez vers une gouvernance enterprise.', heroSubtitle: 'Choisissez le plan adapté à votre empreinte IA, du premier inventaire aux workflows multi-équipes.', startProfessional: 'Démarrer l’essai Professional', bookDemo: 'Demander une démo', reviewTrust: 'Voir le Centre de confiance', guardrailEyebrow: 'Garde-fou commercial', guardrailTitle: 'Préparation opérationnelle, pas garanties juridiques.', guardrailBody: 'RISCK COMPLY soutient la readiness, les preuves et les workflows sans fournir de conseil juridique ni garantir la conformité.', plansLabel: 'Plans et tarifs', from: 'À partir de', month: '/mois', contract: 'Sur contrat', unlimited: 'Illimité', includedUser: 'utilisateur inclus', includedUsers: 'utilisateurs inclus', organization: 'organisation', organizations: 'organisations', aiSystem: 'système IA', aiSystems: 'systèmes IA', usersByContract: 'Utilisateurs selon contrat', organizationsByContract: 'Organisations selon contrat', unlimitedAuditHistory: 'Historique d’audit illimité', enterpriseAuditHistory: 'Rétention selon politique enterprise', dayAuditHistory: (days) => `${days} jours d’historique`, salesLedContract: 'Vente assistée / contrat', demoAssisted: 'Démo / vente assistée', selfServeTrial: 'Essai self-service', selfServe: 'Self-service', limitsAria: (plan) => `Limites incluses pour ${plan}`, taxNote: 'Prix en EUR. Taxes ou TVA applicables sont confirmées au checkout ou dans le contrat. Business est assisté ; Enterprise est négocié.', valueProofLabel: 'Valeur des plans', valueProof: [{ title: 'Connaissez votre empreinte IA', body: 'Regroupez systèmes, responsables, cas d’usage et fournisseurs.' }, { title: 'Structurez le risque', body: 'Transformez les préoccupations en signaux, ownership et actions.' }, { title: 'Préparez les preuves', body: 'Organisez preuves et revues sans garantie juridique.' }], comparisonEyebrow: 'Comparaison des plans', comparisonTitle: 'Comparez capacité et modèle commercial.', capability: 'Capacité', monthlyReference: 'Référence mensuelle', organizationsLabel: 'Organisations', aiSystemsLabel: 'Systèmes IA', auditHistory: 'Historique d’audit', commercialMotion: 'Modèle commercial', objectionsEyebrow: 'Questions fréquentes', objectionsTitle: 'Réponses claires sans promesse risquée.', objections: [{ question: 'Cela garantit-il la conformité EU AI Act ?', answer: 'Non. La plateforme soutient readiness et preuves ; l’interprétation juridique reste à vos conseils.' }, { question: 'Nous utilisons déjà des tableurs.', answer: 'RISCK COMPLY organise inventaire, ownership et preuves dans un système contrôlé.' }, { question: 'Remplacez-vous avocats ou DPO ?', answer: 'Non. La plateforme aide ces équipes à collaborer sur les mêmes preuves.' }], faqEyebrow: 'FAQ commerciale', faqs: [{ question: 'Avec quel plan commencer ?', answer: 'Essential démarre, Professional structure la readiness, Business couvre le multi-équipe et Enterprise le procurement.' }, { question: 'Proposez-vous un essai ?', answer: 'Professional est recommandé pour l’essai ; Business et Enterprise commencent par une démo.' }, { question: 'Comment Enterprise est-il tarifé ?', answer: 'Tarification négociée avec référence publique à partir de 990 €/mois.' }], plan: { starter: { eyebrow: 'Workspace de départ', description: 'Pour petites équipes quittant les tableurs.', cta: 'Commencer avec Essential' }, professional: { eyebrow: 'Idéal pour la readiness', description: 'Pour équipes B2B préparant des preuves structurées.', cta: 'Démarrer l’essai Professional' }, business: { eyebrow: 'Déploiement multi-équipes', description: 'Pour plusieurs workflows IA entre équipes.', cta: 'Demander une démo Business' }, enterprise: { eyebrow: 'Enterprise contractuel', description: 'Pour équipes réglementées avec contrôles et support convenus.', cta: 'Contacter les ventes' } },
  },
  checkout: { navLabel: 'Navigation du checkout', plans: 'Plans', billing: 'Facturation', talkToSales: 'Contacter les ventes', signIn: 'Se connecter', heroEyebrow: 'Checkout sécurisé', heroTitle: 'Activez votre workspace RISCK COMPLY.', heroSubtitle: 'Choisissez un plan, confirmez la facturation dans Stripe ou passez par le parcours commercial assisté.', cancelledTitle: 'Checkout annulé', cancelledBody: 'Aucun changement de facturation. Vérifiez le plan puis réessayez.', errorTitle: 'Impossible de démarrer le checkout', errorBody: 'Vérifiez connexion, workspace et permission de facturation.', salesLedTitle: (plan) => `${plan} est assisté par les ventes`, salesLedBody: 'Ce plan exige un périmètre et des conditions convenus.', currentTitle: 'C’est déjà votre plan actuel', currentBody: 'Ouvrez le portail pour gérer factures ou paiement.', proof: [{ title: 'Facturation Stripe sécurisée', body: 'Stripe traite carte, facture et identifiants fiscaux.' }, { title: 'Abonnement lié au workspace', body: 'Le plan est associé après confirmation Stripe.' }, { title: 'Prix transparent', body: 'Le prix vient du catalogue de billing.' }], orderSummary: 'Récapitulatif', salesLedSummary: 'Déploiement assisté pour procurement.', monthlySummary: 'Abonnement mensuel pour votre workspace.', currentBadge: 'Actuel', salesLedBadge: 'Assisté', selectedBadge: 'Sélectionné', month: '/mois', contactSales: 'Contacter les ventes', byContract: 'Selon contrat', users: 'Utilisateurs', documents: 'Documents', vendors: 'Fournisseurs', risks: 'Risques', currentPlan: 'Plan actuel', salesLedActivation: 'Activation après validation commerciale.', continueSecureCheckout: 'Continuer vers le checkout sécurisé', createWorkspace: 'Créer un workspace avant checkout', createAccount: 'Créer un compte et continuer', signInContinue: 'Se connecter et continuer', flowEyebrow: 'Parcours de checkout', flowTitle: 'Une transition claire vers le paiement.', steps: ['Choisissez le plan.', 'Confirmez les données dans Stripe ou contactez les ventes.', 'Revenez au dashboard avec le plan lié.'], salesLed: 'assisté', perMonth: 'par mois' },
  consent: { title: 'Analytique produit respectueuse de la vie privée', body: 'Aidez-nous à améliorer RISCK COMPLY avec des données d’usage sûres. Nous ne capturons pas documents, notes de risque, fournisseurs, formulaires ou données de compliance.', decline: 'Refuser', allow: 'Autoriser' },
  login: { badge: 'Accès sécurisé au workspace', title: 'Se connecter à RISCK COMPLY', subtitle: 'Continuez avec Google, email professionnel ou SSO Enterprise.', google: 'Continuer avec Google', divider: 'ou se connecter par email', email: 'Email professionnel', password: 'Mot de passe', forgot: 'Mot de passe oublié ?', submit: 'Se connecter en sécurité', loading: 'Connexion...', createPrompt: 'Pas encore de compte ?', create: 'Créer un compte', authLoading: 'L’authentification est encore en chargement.', failed: 'Connexion impossible. Vérifiez vos informations.', googleFailed: 'Impossible de démarrer Google.', accessNote: 'Les nouveaux comptes terminent onboarding et paiement Stripe avant accès au SaaS.' },
  signup: { eyebrow: 'Inscription sécurisée', sideEyebrow: 'Onboarding AI Act', sideTitle: 'Commencez avec le plan, l’organisation et l’onboarding dans le bon ordre.', sideBody: 'Les nouveaux comptes choisissent un plan, créent le compte et configurent l’entreprise.', title: 'Créez votre compte RISCK COMPLY', subtitle: 'Choisissez un plan puis suivez l’onboarding de l’entreprise.', choosePlanTitle: 'Choisissez le plan du nouveau compte', choosePlanSubtitle: 'Chaque compte commence avec un plan pour aligner billing et onboarding.', selectPlan: 'Sélectionner le plan', selectedPlan: 'Plan sélectionné', salesLed: 'Contacter les ventes', salesLedTitle: 'Ce plan est assisté par les ventes', salesLedSubtitle: 'Nous convenons du périmètre et des conditions avant activation.', google: 'Créer un compte avec Google', divider: 'ou créer avec email', email: 'Email professionnel', password: 'Mot de passe', submit: 'Créer le compte', loading: 'Création...', verifyTitle: 'Vérifiez votre email', verifySubtitle: 'Un lien a été envoyé. Connectez-vous ensuite.', haveAccount: 'Déjà un compte ?', signIn: 'Se connecter', authLoading: 'L’authentification est encore en chargement.', authExchangeFailed: 'Impossible de terminer la création.', fallbackError: 'Impossible de créer le compte.', from: 'À partir de', month: '/mois', contactSales: 'Contacter les ventes' },
});

const it = makeLocale({
  pricing: {
    navLabel: 'Navigazione prezzi', trust: 'Trust Center', signIn: 'Accedi', startTrial: 'Inizia prova', heroEyebrow: 'Prezzi trasparenti per la governance IA', heroTitle: 'Inizia dalla preparazione IA. Scala verso la governance enterprise.', heroSubtitle: 'Scegli il piano adatto al tuo utilizzo di IA, dal primo inventario ai workflow multi-team.', startProfessional: 'Inizia prova Professional', bookDemo: 'Richiedi demo', reviewTrust: 'Consulta Trust Center', guardrailEyebrow: 'Limite commerciale', guardrailTitle: 'Preparazione operativa, non garanzie legali.', guardrailBody: 'RISCK COMPLY supporta readiness, evidenze e workflow senza fornire consulenza legale o garantire conformità.', plansLabel: 'Piani e prezzi', from: 'Da', month: '/mese', contract: 'A contratto', unlimited: 'Illimitato', includedUser: 'utente incluso', includedUsers: 'utenti inclusi', organization: 'organizzazione', organizations: 'organizzazioni', aiSystem: 'sistema IA', aiSystems: 'sistemi IA', usersByContract: 'Utenti da contratto', organizationsByContract: 'Organizzazioni da contratto', unlimitedAuditHistory: 'Storico audit illimitato', enterpriseAuditHistory: 'Retention secondo policy enterprise', dayAuditHistory: (days) => `${days} giorni di storico`, salesLedContract: 'Vendita assistita / contratto', demoAssisted: 'Demo / vendita assistita', selfServeTrial: 'Prova self-service', selfServe: 'Self-service', limitsAria: (plan) => `Limiti inclusi in ${plan}`, taxNote: 'Prezzi in EUR. Imposte o IVA applicabili vengono confermate al checkout o nel contratto. Business è assistito; Enterprise usa prezzi negoziati.', valueProofLabel: 'Valore dei piani', valueProof: [{ title: 'Conosci il tuo footprint IA', body: 'Registra sistemi, owner, casi d’uso e fornitori.' }, { title: 'Classifica il rischio', body: 'Trasforma preoccupazioni in segnali, ownership e azioni.' }, { title: 'Prepara le evidenze', body: 'Organizza evidenze e review senza garanzie legali.' }], comparisonEyebrow: 'Confronto piani', comparisonTitle: 'Confronta capacità e modello commerciale.', capability: 'Capacità', monthlyReference: 'Riferimento mensile', organizationsLabel: 'Organizzazioni', aiSystemsLabel: 'Sistemi IA', auditHistory: 'Storico audit', commercialMotion: 'Modello commerciale', objectionsEyebrow: 'Domande frequenti', objectionsTitle: 'Risposte chiare senza promesse rischiose.', objections: [{ question: 'Garantisce conformità EU AI Act?', answer: 'No. Supporta readiness ed evidenze; l’interpretazione legale resta ai consulenti.' }, { question: 'Usiamo già fogli di calcolo.', answer: 'RISCK COMPLY organizza inventario, ownership ed evidenze in un sistema controllato.' }, { question: 'Sostituisce avvocati o DPO?', answer: 'No. Aiuta questi team a lavorare sulle stesse evidenze.' }], faqEyebrow: 'FAQ commerciale', faqs: [{ question: 'Con quale piano iniziare?', answer: 'Essential è iniziale, Professional per readiness, Business multi-team ed Enterprise procurement-led.' }, { question: 'Offrite una prova?', answer: 'Professional è il percorso di prova; Business ed Enterprise iniziano con demo.' }, { question: 'Come viene prezzato Enterprise?', answer: 'Prezzo negoziato con riferimento pubblico da 990 €/mese.' }], plan: { starter: { eyebrow: 'Workspace iniziale', description: 'Per piccoli team che passano dai fogli di calcolo a governance controllata.', cta: 'Inizia con Essential' }, professional: { eyebrow: 'Ideale per readiness', description: 'Per team B2B che preparano evidenze strutturate.', cta: 'Inizia prova Professional' }, business: { eyebrow: 'Rollout multi-team', description: 'Per più workflow IA tra team.', cta: 'Richiedi demo Business' }, enterprise: { eyebrow: 'Enterprise a contratto', description: 'Per team regolamentati con controlli e supporto concordati.', cta: 'Parla con vendite' } },
  },
  checkout: { navLabel: 'Navigazione checkout', plans: 'Piani', billing: 'Fatturazione', talkToSales: 'Parla con vendite', signIn: 'Accedi', heroEyebrow: 'Checkout sicuro', heroTitle: 'Attiva il tuo workspace RISCK COMPLY.', heroSubtitle: 'Scegli un piano, conferma la fatturazione in Stripe o usa il percorso assistito.', cancelledTitle: 'Checkout annullato', cancelledBody: 'Nessuna modifica effettuata. Rivedi il piano e riprova.', errorTitle: 'Impossibile avviare il checkout', errorBody: 'Verifica accesso, workspace e permessi di fatturazione.', salesLedTitle: (plan) => `${plan} è assistito dalle vendite`, salesLedBody: 'Richiede ambito e condizioni concordati.', currentTitle: 'Questo è già il tuo piano attuale', currentBody: 'Apri il portale per gestire fatture o pagamenti.', proof: [{ title: 'Fatturazione Stripe sicura', body: 'Stripe gestisce carta, fattura e identificativi fiscali.' }, { title: 'Abbonamento collegato', body: 'Il piano viene associato dopo la conferma Stripe.' }, { title: 'Prezzo trasparente', body: 'Il prezzo proviene dal catalogo di billing.' }], orderSummary: 'Riepilogo ordine', salesLedSummary: 'Rollout assistito per procurement.', monthlySummary: 'Abbonamento mensile per il workspace.', currentBadge: 'Attuale', salesLedBadge: 'Assistito', selectedBadge: 'Selezionato', month: '/mese', contactSales: 'Parla con vendite', byContract: 'Da contratto', users: 'Utenti', documents: 'Documenti', vendors: 'Fornitori', risks: 'Rischi', currentPlan: 'Piano attuale', salesLedActivation: 'Attivazione dopo approvazione commerciale.', continueSecureCheckout: 'Continua al checkout sicuro', createWorkspace: 'Crea workspace prima del checkout', createAccount: 'Crea account e continua', signInContinue: 'Accedi e continua', flowEyebrow: 'Flusso checkout', flowTitle: 'Un passaggio chiaro al pagamento.', steps: ['Scegli il piano.', 'Conferma i dati in Stripe o parla con vendite.', 'Torna alla dashboard con il piano collegato.'], salesLed: 'assistito', perMonth: 'al mese' },
  consent: { title: 'Analytics di prodotto con privacy al primo posto', body: 'Aiutaci a migliorare RISCK COMPLY con analytics sicuri. Non catturiamo documenti, note di rischio, fornitori, form o dati di compliance.', decline: 'Rifiuta', allow: 'Consenti' },
  login: { badge: 'Accesso sicuro al workspace', title: 'Accedi a RISCK COMPLY', subtitle: 'Continua con Google, email aziendale o SSO Enterprise.', google: 'Continua con Google', divider: 'oppure accedi con email', email: 'Email aziendale', password: 'Password', forgot: 'Password dimenticata?', submit: 'Accedi in sicurezza', loading: 'Accesso...', createPrompt: 'Non hai ancora un account?', create: 'Crea account', authLoading: 'L’autenticazione è ancora in caricamento.', failed: 'Impossibile accedere. Controlla i dati.', googleFailed: 'Impossibile avviare Google.', accessNote: 'I nuovi account completano onboarding e pagamento Stripe prima di accedere al SaaS.' },
  signup: { eyebrow: 'Registrazione sicura', sideEyebrow: 'Onboarding AI Act', sideTitle: 'Inizia con piano, organizzazione e onboarding nell’ordine corretto.', sideBody: 'I nuovi account scelgono il piano, creano l’account e configurano l’azienda.', title: 'Crea il tuo account RISCK COMPLY', subtitle: 'Scegli un piano prima di creare l’account, poi segui l’onboarding.', choosePlanTitle: 'Scegli il piano del nuovo account', choosePlanSubtitle: 'Ogni account parte da un piano selezionato per allineare billing e onboarding.', selectPlan: 'Seleziona piano', selectedPlan: 'Piano selezionato', salesLed: 'Parla con vendite', salesLedTitle: 'Questo piano è assistito dalle vendite', salesLedSubtitle: 'Concordiamo ambito e condizioni prima dell’attivazione.', google: 'Crea account con Google', divider: 'oppure crea con email', email: 'Email aziendale', password: 'Password', submit: 'Crea account', loading: 'Creazione...', verifyTitle: 'Verifica la tua email', verifySubtitle: 'Abbiamo inviato un link. Accedi poi per continuare.', haveAccount: 'Hai già un account?', signIn: 'Accedi', authLoading: 'L’autenticazione è ancora in caricamento.', authExchangeFailed: 'Impossibile completare la creazione.', fallbackError: 'Impossibile creare l’account.', from: 'Da', month: '/mese', contactSales: 'Parla con vendite' },
});

const de = makeLocale({
  pricing: {
    navLabel: 'Preisnavigation', trust: 'Trust Center', signIn: 'Anmelden', startTrial: 'Test starten', heroEyebrow: 'Transparente Preise für KI-Governance', heroTitle: 'Starten Sie mit KI-Readiness. Skalieren Sie zur Enterprise-Governance.', heroSubtitle: 'Wählen Sie den Plan für Ihren KI-Einsatz, vom ersten Inventar bis zu Multi-Team-Workflows.', startProfessional: 'Professional-Test starten', bookDemo: 'Demo anfragen', reviewTrust: 'Trust Center ansehen', guardrailEyebrow: 'Kommerzieller Rahmen', guardrailTitle: 'Operative Readiness, keine Rechtsgarantie.', guardrailBody: 'RISCK COMPLY unterstützt Readiness, Evidenz und Workflows, bietet aber keine Rechtsberatung und garantiert keine Compliance.', plansLabel: 'Pläne und Preise', from: 'Ab', month: '/Monat', contract: 'Vertraglich', unlimited: 'Unbegrenzt', includedUser: 'enthaltener Nutzer', includedUsers: 'enthaltene Nutzer', organization: 'Organisation', organizations: 'Organisationen', aiSystem: 'KI-System', aiSystems: 'KI-Systeme', usersByContract: 'Nutzer nach Vertrag', organizationsByContract: 'Organisationen nach Vertrag', unlimitedAuditHistory: 'Unbegrenzte Audit-Historie', enterpriseAuditHistory: 'Aufbewahrung nach Enterprise-Richtlinie', dayAuditHistory: (days) => `${days} Tage Audit-Historie`, salesLedContract: 'Vertriebsgeführt / Vertrag', demoAssisted: 'Demo / Vertriebsunterstützung', selfServeTrial: 'Self-Service-Test', selfServe: 'Self-Service', limitsAria: (plan) => `Enthaltene Limits für ${plan}`, taxNote: 'Preise in EUR. Steuern oder MwSt. werden im Checkout oder Vertrag bestätigt. Business ist vertriebsunterstützt; Enterprise wird verhandelt.', valueProofLabel: 'Planwert', valueProof: [{ title: 'Kennen Sie Ihren KI-Footprint', body: 'Erfassen Sie Systeme, Verantwortliche, Use Cases und Anbieter.' }, { title: 'Risiken strukturiert klassifizieren', body: 'Verwandeln Sie Bedenken in Signale, Ownership und Aktionen.' }, { title: 'Evidenz vorbereiten', body: 'Organisieren Sie Evidenz und Reviews ohne Rechtsgarantien.' }], comparisonEyebrow: 'Planvergleich', comparisonTitle: 'Vergleichen Sie Kapazität und kommerzielles Modell.', capability: 'Kapazität', monthlyReference: 'Monatliche Referenz', organizationsLabel: 'Organisationen', aiSystemsLabel: 'KI-Systeme', auditHistory: 'Audit-Historie', commercialMotion: 'Kommerzielles Modell', objectionsEyebrow: 'Häufige Fragen', objectionsTitle: 'Klare Antworten ohne riskante Versprechen.', objections: [{ question: 'Garantiert dies EU-AI-Act-Compliance?', answer: 'Nein. Die Plattform unterstützt Readiness und Evidenz; rechtliche Auslegung bleibt bei qualifizierten Beratern.' }, { question: 'Wir nutzen bereits Tabellen.', answer: 'RISCK COMPLY organisiert Inventar, Ownership und Evidenz kontrolliert.' }, { question: 'Ersetzen Sie Anwälte oder DPOs?', answer: 'Nein. Die Plattform hilft diesen Teams, mit derselben Evidenz zu arbeiten.' }], faqEyebrow: 'Kommerzielle FAQ', faqs: [{ question: 'Mit welchem Plan beginnen?', answer: 'Essential startet, Professional strukturiert Readiness, Business ist Multi-Team und Enterprise procurement-led.' }, { question: 'Gibt es einen Test?', answer: 'Professional ist der Testpfad; Business und Enterprise starten mit Demo.' }, { question: 'Wie wird Enterprise bepreist?', answer: 'Verhandelte Preise mit öffentlicher Referenz ab 990 €/Monat.' }], plan: { starter: { eyebrow: 'Start-Workspace', description: 'Für kleine Teams, die Tabellen durch kontrollierte Governance ersetzen.', cta: 'Mit Essential starten' }, professional: { eyebrow: 'Ideal für Readiness', description: 'Für B2B-Teams mit strukturierter Evidenz.', cta: 'Professional-Test starten' }, business: { eyebrow: 'Multi-Team-Rollout', description: 'Für mehrere KI-Workflows über Teams hinweg.', cta: 'Business-Demo anfragen' }, enterprise: { eyebrow: 'Enterprise per Vertrag', description: 'Für regulierte Teams mit vereinbarten Kontrollen und Support.', cta: 'Vertrieb kontaktieren' } },
  },
  checkout: { navLabel: 'Checkout-Navigation', plans: 'Pläne', billing: 'Abrechnung', talkToSales: 'Vertrieb kontaktieren', signIn: 'Anmelden', heroEyebrow: 'Sicherer Checkout', heroTitle: 'Aktivieren Sie Ihren RISCK COMPLY Workspace.', heroSubtitle: 'Wählen Sie einen Plan, bestätigen Sie die Abrechnung in Stripe oder nutzen Sie den vertriebsunterstützten Ablauf.', cancelledTitle: 'Checkout abgebrochen', cancelledBody: 'Keine Abrechnungsänderung. Prüfen Sie den Plan und versuchen Sie es erneut.', errorTitle: 'Checkout konnte nicht gestartet werden', errorBody: 'Prüfen Sie Anmeldung, Workspace und Abrechnungsberechtigung.', salesLedTitle: (plan) => `${plan} ist vertriebsunterstützt`, salesLedBody: 'Dieser Plan erfordert vereinbarten Umfang und Bedingungen.', currentTitle: 'Dies ist bereits Ihr aktueller Plan', currentBody: 'Öffnen Sie das Portal für Rechnungen oder Zahlungen.', proof: [{ title: 'Sichere Stripe-Abrechnung', body: 'Stripe verarbeitet Karte, Rechnung und Steuer-IDs.' }, { title: 'Workspace-verknüpftes Abonnement', body: 'Der Plan wird nach Stripe-Bestätigung verbunden.' }, { title: 'Transparenter Preis', body: 'Der Preis stammt aus dem Billing-Katalog.' }], orderSummary: 'Bestellübersicht', salesLedSummary: 'Vertriebsunterstützter Rollout für Procurement.', monthlySummary: 'Monatliches Abonnement für den Workspace.', currentBadge: 'Aktuell', salesLedBadge: 'Vertriebsgeführt', selectedBadge: 'Ausgewählt', month: '/Monat', contactSales: 'Vertrieb kontaktieren', byContract: 'Nach Vertrag', users: 'Nutzer', documents: 'Dokumente', vendors: 'Anbieter', risks: 'Risiken', currentPlan: 'Aktueller Plan', salesLedActivation: 'Aktivierung nach kommerzieller Freigabe.', continueSecureCheckout: 'Zum sicheren Checkout', createWorkspace: 'Workspace vor Checkout erstellen', createAccount: 'Konto erstellen und fortfahren', signInContinue: 'Anmelden und fortfahren', flowEyebrow: 'Checkout-Ablauf', flowTitle: 'Ein klarer Übergang zur Zahlung.', steps: ['Wählen Sie den Plan.', 'Bestätigen Sie Daten in Stripe oder sprechen Sie mit dem Vertrieb.', 'Kehren Sie mit verbundenem Plan zum Dashboard zurück.'], salesLed: 'vertriebsgeführt', perMonth: 'pro Monat' },
  consent: { title: 'Datenschutzorientierte Produktanalyse', body: 'Helfen Sie uns, RISCK COMPLY mit sicheren Nutzungsanalysen zu verbessern. Wir erfassen keine Dokumente, Risikonotizen, Anbieter, Formulare oder Compliance-Daten.', decline: 'Ablehnen', allow: 'Erlauben' },
  login: { badge: 'Sicherer Workspace-Zugang', title: 'Bei RISCK COMPLY anmelden', subtitle: 'Weiter mit Google, geschäftlicher E-Mail oder Enterprise SSO.', google: 'Mit Google fortfahren', divider: 'oder per E-Mail anmelden', email: 'Geschäftliche E-Mail', password: 'Passwort', forgot: 'Passwort vergessen?', submit: 'Sicher anmelden', loading: 'Anmeldung...', createPrompt: 'Noch kein Konto?', create: 'Konto erstellen', authLoading: 'Die Authentifizierung wird noch geladen.', failed: 'Anmeldung fehlgeschlagen. Prüfen Sie die Angaben.', googleFailed: 'Google-Anmeldung konnte nicht gestartet werden.', accessNote: 'Neue Konten schließen Onboarding und sichere Stripe-Zahlung vor SaaS-Zugriff ab.' },
  signup: { eyebrow: 'Sichere Registrierung', sideEyebrow: 'AI-Act-Onboarding', sideTitle: 'Beginnen Sie mit Plan, Organisation und Onboarding in der richtigen Reihenfolge.', sideBody: 'Neue Konten wählen einen Plan, erstellen das Konto und konfigurieren das Unternehmen.', title: 'RISCK COMPLY Konto erstellen', subtitle: 'Wählen Sie zuerst einen Plan und folgen Sie danach dem Onboarding.', choosePlanTitle: 'Plan für das neue Konto wählen', choosePlanSubtitle: 'Jedes Konto startet mit einem Plan, damit Billing und Onboarding ausgerichtet bleiben.', selectPlan: 'Plan auswählen', selectedPlan: 'Ausgewählter Plan', salesLed: 'Vertrieb kontaktieren', salesLedTitle: 'Dieser Plan ist vertriebsunterstützt', salesLedSubtitle: 'Wir vereinbaren Umfang und Bedingungen vor Aktivierung.', google: 'Konto mit Google erstellen', divider: 'oder mit E-Mail erstellen', email: 'Geschäftliche E-Mail', password: 'Passwort', submit: 'Konto erstellen', loading: 'Erstellung...', verifyTitle: 'E-Mail bestätigen', verifySubtitle: 'Wir haben einen Link gesendet. Melden Sie sich danach an.', haveAccount: 'Bereits ein Konto?', signIn: 'Anmelden', authLoading: 'Die Authentifizierung wird noch geladen.', authExchangeFailed: 'Kontoerstellung konnte nicht abgeschlossen werden.', fallbackError: 'Konto konnte nicht erstellt werden.', from: 'Ab', month: '/Monat', contactSales: 'Vertrieb kontaktieren' },
});

export const commercialSurfaceCopy: Record<Locale, CommercialSurfaceCopy> = { en, pt, es, fr, it, de };

export function getCommercialSurfaceCopy(locale: Locale) {
  return commercialSurfaceCopy[locale] ?? commercialSurfaceCopy.en;
}
