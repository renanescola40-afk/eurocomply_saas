export type RiskLevel = 'unacceptable' | 'high' | 'limited' | 'minimal'

export type Department =
  | 'RH'
  | 'Vendas'
  | 'Operacoes'
  | 'TI'
  | 'Juridico'
  | 'Marketing'
  | 'Outro'

export type ImpactLevel = 'baixo' | 'medio' | 'alto'

export interface RiskFormData {
  name: string
  vendor: string
  department: Department
  purpose: string
  processesPersonalData: boolean
  impactOnThirdPartyRights: ImpactLevel
  automatedDecisionMaking: boolean
}

export interface RiskResult {
  level: RiskLevel
  justification: string
  euActArticle: string
  obligations: Obligation[]
  score: number
}

export interface Obligation {
  id: string
  text: string
  required: boolean
}

const DEPARTMENTS_HIGH_RISK = ['RH', 'Juridico'] as const
const DEPARTMENTS_LIMITED_RISK = ['Vendas', 'Marketing', 'Operacoes'] as const
const DEPARTMENTS_MINIMAL_RISK = ['TI', 'Outro'] as const

const AUTOMATED_DECISION_TRIGGERS = [
  'seleção', 'contratação', 'recrutamento', 'candidato', 'currículo',
  'nota', 'notas', 'escola', 'universidade', 'ensino',
  'crédito', 'empréstimo', 'risco', 'score', 'b Scoring',
  'candidato', 'admissão', 'ensino', 'educação', 'visto', 'asylum',
  'seguro', 'saúde', 'tratamento', 'médico',
]

export function classifyRisk(data: RiskFormData): RiskResult {
  const { department, processesPersonalData, impactOnThirdPartyRights, automatedDecisionMaking, purpose } = data
  const purposeLower = purpose.toLowerCase()

  // Rule 1: Unacceptable risk - explicit prohibited uses
  const unacceptableTriggers = [
    'scoring social', 'social scoring', 'manipulação subliminar',
    'subliminal', 'manipulação', 'deception', 'vulnerability',
    'criminal', 'proibido', 'discriminação', 'biométrico', 'biometrics',
    'real-time', 'remote', 'crowd', 'surveillance',
  ]
  if (unacceptableTriggers.some(t => purposeLower.includes(t))) {
    return {
      level: 'unacceptable',
      justification:
        'Este caso de uso enquadra-se num dos usos proibidos pelo EU AI Act (Artigo 5). Sistemas que recorram a subliminar, manipulação, scoring social ou exploitem vulnerabilidades são proibidos na UE.',
      euActArticle: 'Artigo 5.º – Práticas de IA proibidas',
      obligations: OBLIGATIONS_UNACCEPTABLE,
      score: 0,
    }
  }

  // Rule 2: High risk triggers
  const highRiskTriggers = [
    ...DEPARTMENTS_HIGH_RISK,
    'automated-decision-making:yes',
    'impact:alto',
    'personal-data:yes',
  ]
  const isHighRiskDepartment = DEPARTMENTS_HIGH_RISK.includes(department as any)
  const isAutomatedDecision = automatedDecisionMaking
  const isHighImpact = impactOnThirdPartyRights === 'alto'
  const hasPersonalData = processesPersonalData

  const highRiskScore = [
    isHighRiskDepartment,
    isAutomatedDecision,
    isHighImpact,
    hasPersonalData,
  ].filter(Boolean).length

  if (
    highRiskScore >= 2 ||
    (isHighRiskDepartment && hasPersonalData) ||
    (isAutomatedDecision && (isHighImpact || hasPersonalData))
  ) {
    return {
      level: 'high',
      justification:
        `Com base nos critérios do Anexo III do EU AI Act, este sistema é classificado como Alto Risco. ${isHighRiskDepartment ? `Departamentos de ${DEPARTMENTS_HIGH_RISK.join(' e ')} com dados pessoais e impacto significativo requerem conformidade elevada.` : ''} ${isAutomatedDecision ? 'A tomada de decisão automatizada com impacto em terceiros é um fator agravante.' : ''}`,
      euActArticle: 'Artigo 6.º + Anexo III – Sistemas de IA de alto risco',
      obligations: OBLIGATIONS_HIGH,
      score: 25,
    }
  }

  // Rule 3: Limited risk triggers
  const isLimitedDepartment = DEPARTMENTS_LIMITED_RISK.includes(department as any)
  const isLimitedImpact = impactOnThirdPartyRights === 'medio'
  const hasChatbotSignals = [
    'chat', 'bot', 'chatbot', 'assistente', 'cliente', 'suporte',
    'conversa', 'atendimento', 'interação',
  ].some(t => purposeLower.includes(t))

  if (
    (isLimitedDepartment && hasPersonalData) ||
    isLimitedImpact ||
    hasChatbotSignals ||
    (isLimitedDepartment && hasPersonalData)
  ) {
    return {
      level: 'limited',
      justification:
        'Este sistema é classificado como Risco Limitado.chatbots, assistentes virtuais e sistemas com interação direta com pessoas estão sujeitos a obrigações de transparência (Artigo 50.º do EU AI Act), mas não exigem registo no sistema da UE.',
      euActArticle: 'Artigo 50.º – Regras de transparência para determinados sistemas de IA',
      obligations: OBLIGATIONS_LIMITED,
      score: 60,
    }
  }

  // Rule 4: Minimal risk
  return {
    level: 'minimal',
    justification:
      'Este sistema é classificado como Risco Mínimo. Ferramentas de produtividade geral, filtros de spam, recomendações de produto e sistemas internos com baixo impacto em direitos de terceiros estão fora do âmbito de requisitos pesados do EU AI Act.',
    euActArticle: 'Fora do âmbito de requisitos específicos (considerando geral)',
    obligations: OBLIGATIONS_MINIMAL,
    score: 90,
  }
}

const OBLIGATIONS_UNACCEPTABLE: Obligation[] = [
  { id: 'u1', text: 'Parar imediatamente a utilização deste sistema de IA', required: true },
  { id: 'u2', text: 'Remover ou anonimizar todos os dados processados', required: true },
  { id: 'u3', text: 'Documentar o incidente e a decisão de remoção', required: true },
  { id: 'u4', text: 'Notificar a autoridade nacional competente (ex: CNPD em Portugal)', required: true },
  { id: 'u5', text: 'Consultar departamento jurídico sobre medidas corretivas', required: true },
]

const OBLIGATIONS_HIGH: Obligation[] = [
  { id: 'h1', text: 'Registar o sistema na base de dados da UE (Artigo 51.º)', required: true },
  { id: 'h2', text: 'Implementar sistema de gestão de risco (Artigo 9.º)', required: true },
  { id: 'h3', text: 'Garantir qualidade e governança dos dados de treino (Artigo 10.º)', required: true },
  { id: 'h4', text: 'Manter registos automáticos (Artigo 12.º)', required: true },
  { id: 'h5', text: 'Garantir supervisão humana adequada (Artigo 14.º)', required: true },
  { id: 'h6', text: 'Definir nível de precisão e robustez adequado (Artigo 15.º)', required: true },
  { id: 'h7', text: 'Elaborar declaração de conformidade UE (Artigo 47.º)', required: true },
  { id: 'h8', text: 'Realizar avaliação de conformidade antes de entrada em serviço', required: true },
  { id: 'h9', text: 'Documentar política de uso aceitável internamente', required: false },
  { id: 'h10', text: 'Revisão anual por auditor independente', required: false },
]

const OBLIGATIONS_LIMITED: Obligation[] = [
  { id: 'l1', text: 'Informar os utilizadores que estão a interagir com IA (Artigo 50.º)', required: true },
  { id: 'l2', text: 'Identificar claramente o sistema de IA na interface', required: true },
  { id: 'l3', text: 'Documentar instruções de uso e limitações', required: true },
  { id: 'l4', text: 'Publicar política de uso de IA no website (se público)', required: false },
  { id: 'l5', text: 'Registar logs de interação para auditoria', required: false },
]

const OBLIGATIONS_MINIMAL: Obligation[] = [
  { id: 'm1', text: 'Manter inventário interno atualizado deste sistema', required: true },
  { id: 'm2', text: 'Documentar a finalidade e uso interno', required: false },
  { id: 'm3', text: 'Revisar periodicamente (anualmente) se o nível de risco se mantém', required: false },
]

export function getRiskColor(level: RiskLevel): string {
  switch (level) {
    case 'unacceptable': return 'bg-red-500'
    case 'high': return 'bg-orange-500'
    case 'limited': return 'bg-yellow-500'
    case 'minimal': return 'bg-green-500'
  }
}

export function getRiskLabel(level: RiskLevel): string {
  switch (level) {
    case 'unacceptable': return 'Risco Inaceitável'
    case 'high': return 'Alto Risco'
    case 'limited': return 'Risco Limitado'
    case 'minimal': return 'Risco Mínimo'
  }
}

export function getRiskIcon(level: RiskLevel) {
  switch (level) {
    case 'unacceptable': return '🚫'
    case 'high': return '🔴'
    case 'limited': return '🟡'
    case 'minimal': return '🟢'
  }
}
