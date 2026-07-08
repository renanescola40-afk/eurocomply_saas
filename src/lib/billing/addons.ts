import type { SubscriptionPlan } from '@/server/queries/subscription';

export type AddOnId =
  | 'premium_news'
  | 'ai_governance_pro'
  | 'executive_pdf_reports'
  | 'advanced_excel_exports'
  | 'evidence_audit_pack'
  | 'white_label_reports'
  | 'extra_fiscal_countries'
  | 'vendor_risk_pack'
  | 'priority_support';

export type AddOnCatalogItem = {
  id: AddOnId;
  name: string;
  priceMonthly: number;
  description: string;
  includedFromPlan?: SubscriptionPlan;
  availableFromPlan: SubscriptionPlan;
  category: 'reports' | 'ai' | 'risk' | 'operations' | 'support';
};

const PLAN_RANK: Record<SubscriptionPlan, number> = {
  essential: 1,
  starter: 1,
  professional: 2,
  growth: 2,
  business: 2,
  enterprise: 3,
};

export const ADD_ON_CATALOG: AddOnCatalogItem[] = [
  {
    id: 'premium_news',
    name: 'Notícias Premium',
    priceMonthly: 29,
    description: 'Feed regulatório premium com impacto prático para GDPR, AI Act, DORA, NIS2 e fiscalidade europeia.',
    includedFromPlan: 'enterprise',
    availableFromPlan: 'starter',
    category: 'reports',
  },
  {
    id: 'ai_governance_pro',
    name: 'AI Governance Pro',
    priceMonthly: 69,
    description: 'Inventário de sistemas de IA, classificação AI Act, incidentes, responsáveis e obrigações iniciais.',
    includedFromPlan: 'enterprise',
    availableFromPlan: 'growth',
    category: 'ai',
  },
  {
    id: 'executive_pdf_reports',
    name: 'Relatórios PDF Executivos',
    priceMonthly: 49,
    description: 'Relatórios para direção em PDF com dados da empresa, responsável, score, lacunas e plano de ação.',
    includedFromPlan: 'enterprise',
    availableFromPlan: 'growth',
    category: 'reports',
  },
  {
    id: 'advanced_excel_exports',
    name: 'Exportação Excel Avançada',
    priceMonthly: 39,
    description: 'Exportações tabulares para vendors, riscos, evidências, obrigações e planos de remediação.',
    includedFromPlan: 'enterprise',
    availableFromPlan: 'growth',
    category: 'reports',
  },
  {
    id: 'evidence_audit_pack',
    name: 'Evidence Pack / Review Pack',
    priceMonthly: 79,
    description: 'Pacotes de revisão com evidências, trilha de revisão, responsáveis e readiness operacional.',
    includedFromPlan: 'enterprise',
    availableFromPlan: 'growth',
    category: 'risk',
  },
  {
    id: 'white_label_reports',
    name: 'White-label nos Relatórios',
    priceMonthly: 99,
    description: 'Relatórios com marca da empresa ou consultoria para clientes, direção e revisões.',
    includedFromPlan: 'enterprise',
    availableFromPlan: 'growth',
    category: 'reports',
  },
  {
    id: 'extra_fiscal_countries',
    name: 'Pacote de Países Fiscais',
    priceMonthly: 49,
    description: 'Inclui até 3 países fiscais adicionais para obrigações e calendário legal multi-país.',
    includedFromPlan: 'enterprise',
    availableFromPlan: 'starter',
    category: 'operations',
  },
  {
    id: 'vendor_risk_pack',
    name: 'Vendors Extras',
    priceMonthly: 39,
    description: 'Pacote de +100 fornecedores/subprocessadores para gestão de third-party risk.',
    includedFromPlan: 'enterprise',
    availableFromPlan: 'growth',
    category: 'risk',
  },
  {
    id: 'priority_support',
    name: 'Priority Support',
    priceMonthly: 149,
    description: 'Prioridade em suporte por ticket dentro do SaaS, sem depender de atendimento manual.',
    includedFromPlan: 'enterprise',
    availableFromPlan: 'growth',
    category: 'support',
  },
];

export const CREDIT_PACKS = [
  { id: 'credits_100', name: '100 créditos', price: 9, credits: 100, description: 'Para testar relatórios, resumos e pequenas análises.' },
  { id: 'credits_500', name: '500 créditos', price: 39, credits: 500, description: 'Para equipas pequenas que usam relatórios e análises com frequência.' },
  { id: 'credits_1500', name: '1.500 créditos', price: 99, credits: 1500, description: 'Melhor custo-benefício para períodos de revisão regulatória.' },
  { id: 'credits_5000', name: '5.000 créditos', price: 249, credits: 5000, description: 'Volume alto para consultorias e times multi-país.' },
];

export function billingPlanAtLeast(plan: SubscriptionPlan, minimumPlan: SubscriptionPlan) {
  return PLAN_RANK[plan] >= PLAN_RANK[minimumPlan];
}

export function getPlanDisplayName(plan: SubscriptionPlan) {
  if (plan === 'enterprise') return 'Enterprise';
  if (plan === 'growth' || plan === 'professional' || plan === 'business') return 'Growth';
  return 'Starter';
}

export function getAddOnStatus(plan: SubscriptionPlan, addOn: AddOnCatalogItem, activeAddOnIds: AddOnId[] = []) {
  if (addOn.includedFromPlan && billingPlanAtLeast(plan, addOn.includedFromPlan)) {
    return 'included' as const;
  }

  if (activeAddOnIds.includes(addOn.id)) {
    return 'active' as const;
  }

  if (!billingPlanAtLeast(plan, addOn.availableFromPlan)) {
    return 'blocked' as const;
  }

  return 'inactive' as const;
}
