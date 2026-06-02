// EU AI Act – Article 50 Transparency Rules
// Deadlines:
//   • 2 Aug 2026 — general Article 50 obligations apply
//   • 2 Dec 2026 — synthetic content marking (postponed by Omnibus)

export type TransparencyCategory =
  | 'interaction'
  | 'synthetic_content'
  | 'emotion_recognition'
  | 'deepfake'

export type DisclosureChannel = 'chat' | 'phone' | 'website' | 'email' | 'video' | 'social'

export type ComplianceStatus = 'compliant' | 'in_progress' | 'not_started' | 'not_applicable'

export type AiToolId = string

export interface TransparencyRecord {
  id: string
  workspace_id: string
  tool_id: AiToolId
  tool_name: string
  category: TransparencyCategory
  channel: DisclosureChannel[]
  has_disclosure: boolean
  disclosure_text?: string
  disclosure_location?: string
  is_clear_distinguishable?: boolean
  has_watermark?: boolean
  has_machine_readable?: boolean
  has_human_review?: boolean
  compliance_status: ComplianceStatus
  deadline: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface PolicyVersion {
  type: 'employee' | 'customer'
  language: string
  content: string
  generated_at: string
}

// ─── Deadline constants ────────────────────────────────────────────────────────

export const DEADLINES = {
  general: '2026-08-02',    // Article 50.1, 50.3, 50.4 — most obligations
  synthetic: '2026-12-02',  // Article 50.2 — synthetic content marking (postponed)
} as const

export function daysUntilDeadline(deadline: string): number {
  const target = new Date(deadline).getTime()
  const now = Date.now()
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24))
}

export function deadlineStatus(deadline: string): 'passed' | 'urgent' | 'upcoming' {
  const days = daysUntilDeadline(deadline)
  if (days < 0) return 'passed'
  if (days <= 60) return 'urgent'
  return 'upcoming'
}

// ─── Article 50.1 — Direct interaction ────────────────────────────────────

export interface InteractionDisclosure {
  channel: DisclosureChannel
  lang: string
  severity: 'required' | 'recommended'
  template: string
  example: string
  placement_tip: string
}

export const INTERACTION_TEMPLATES: InteractionDisclosure[] = [
  {
    channel: 'chat',
    lang: 'PT',
    severity: 'required',
    template: 'Está a comunicar com um assistente virtual de inteligência artificial. Para apoio humano, escreva "operador" ou "humano".',
    example: '"Olá! Sou a EVA, assistente virtual da EmpresaX. Pode solicitar apoio humano a qualquer momento escrevendo "operador". 👋"',
    placement_tip: 'Primeira mensagem da conversa, em destaque — não em rodapé nem link "ler mais".',
  },
  {
    channel: 'chat',
    lang: 'EN',
    severity: 'required',
    template: 'You are interacting with an AI assistant. Type "human" or "agent" to reach a person.',
    example: '"Hi! I\'m AI assistant of CompanyX. Write "human" anytime to connect with a team member."',
    placement_tip: 'First message of the conversation, prominent — not in footer or "read more" link.',
  },
  {
    channel: 'phone',
    lang: 'PT',
    severity: 'required',
    template: 'Está a ser atendido por um sistema automático de IA. Para falar com um humano, diga "operador" ou "atendente".',
    example: '"Bem-vindo à EmpresaX. Este atendimento está a ser assistido por um assistente virtual de IA. Diga "operador" para falar com a nossa equipa."',
    placement_tip: 'Anúncio inicial da chamada, antes de qualquer interação.',
  },
  {
    channel: 'phone',
    lang: 'EN',
    severity: 'required',
    template: 'This call is assisted by an AI system. Say "agent" or "representative" to reach a person.',
    example: '"Welcome to CompanyX. This call may be assisted by AI. Say "agent" to connect with a human."',
    placement_tip: 'Opening announcement, before any interaction.',
  },
  {
    channel: 'website',
    lang: 'PT',
    severity: 'required',
    template: 'Este website utiliza inteligência artificial para [finalidade].',
    example: '"Este website utiliza IA para recomendação de produtos e suporte ao cliente."',
    placement_tip: 'Secção dedicada em "Política de IA" ou banner no primeiro uso.',
  },
  {
    channel: 'website',
    lang: 'EN',
    severity: 'required',
    template: 'This website uses artificial intelligence for [purpose].',
    example: '"This website uses AI for product recommendations and customer support."',
    placement_tip: 'Dedicated section in "AI Policy" or banner on first use.',
  },
  {
    channel: 'email',
    lang: 'PT',
    severity: 'required',
    template: 'Esta mensagem foi enviada com assistência de IA. Para responder, contacte [email].',
    example: '"Mensagem enviada com apoio de IA. Para assuntos urgentes, reply para humanos@empresax.pt."',
    placement_tip: 'Rodapé do email, visível sem scroll horizontal.',
  },
  {
    channel: 'video',
    lang: 'PT',
    severity: 'required',
    template: 'Este vídeo foi gerado ou editado com inteligência artificial.',
    example: '"Contenido gerado por IA" — legenda ou badge no início do vídeo.',
    placement_tip: 'Legenda visível nos primeiros 5 segundos.',
  },
  {
    channel: 'social',
    lang: 'PT',
    severity: 'recommended',
    template: 'Publicação assistida por IA.',
    example: '#IAGerado no caption ou nota de rodapé.',
    placement_tip: 'No caption da publicação ou como hashtag.',
  },
]

export function getInteractionTemplate(channel: DisclosureChannel, lang: 'PT' | 'EN' = 'PT') {
  return INTERACTION_TEMPLATES.find(t => t.channel === channel && t.lang === lang)
}

export function isDirectInteraction(toolPurpose: string): boolean {
  const keywords = [
    'chat', 'atendimento', 'suporte', 'assistente', 'bot', 'contacto',
    'cliente', 'cliente', 'vendas', 'help', 'support', 'assistant',
    'televendas', 'sac', 'recepção', 'reception',
  ]
  const lower = toolPurpose.toLowerCase()
  return keywords.some(k => lower.includes(k))
}

// ─── Article 50.2 — Synthetic content ─────────────────────────────────────

export interface SyntheticContentLabel {
  code: string
  label: Record<string, string>
  description: Record<string, string>
}

export const SYNTHETIC_LABELS: SyntheticContentLabel[] = [
  {
    code: 'AI',
    label: {
      PT: 'IA',
      EN: 'AI',
      DE: 'KI',
      ES: 'IA',
      FR: 'IA',
    },
    description: {
      PT: 'Conteúdo gerado ou modificado por inteligência artificial',
      EN: 'Content generated or modified by artificial intelligence',
      DE: 'Durch künstliche Intelligenz generierte oder veränderte Inhalte',
      ES: 'Contenido generado o modificado por inteligencia artificial',
      FR: 'Contenu généré ou modifié par intelligence artificielle',
    },
  },
  {
    code: 'SYNTH',
    label: {
      PT: 'Síntese',
      EN: 'Synthetic',
      DE: 'Syn.',
      ES: 'Síntesis',
      FR: 'Synth.',
    },
    description: {
      PT: 'Conteúdo sintético — verificação recomendada',
      EN: 'Synthetic content — verification recommended',
      DE: 'Synthetischer Inhalt — Überprüfung empfohlen',
      ES: 'Contenido sintético — se recomienda verificación',
      FR: 'Contenu synthétique — vérification recommandée',
    },
  },
]

export interface WatermarkSpec {
  type: 'visual' | 'metadata' | 'both'
  description: string
}

export const WATERMARK_OPTIONS: WatermarkSpec[] = [
  { type: 'visual', description: 'Marca visual visível (badge "AI Generated" sobreposto no canto)' },
  { type: 'metadata', description: 'Metadados C2PA ou similar embedded no ficheiro' },
  { type: 'both', description: 'Marca visual + metadados criptográficos' },
]

// ─── Article 50.3 — Emotion recognition ─────────────────────────────────────

export interface EmotionCheckResult {
  isProhibited: boolean
  prohibitionBasis?: string
  transparencyRequired: boolean
  disclosureTemplate?: string
  recommendations: string[]
}

export function checkEmotionRecognition(toolPurpose: string, department: string): EmotionCheckResult {
  const lower = toolPurpose.toLowerCase()
  const deptUpper = department.toUpperCase()

  // Article 5 prohibition — workplace and education
  const prohibitedContexts = ['trabalho', 'workplace', 'escola', 'education', 'ensino', 'universidade', 'recrutamento', 'hiring', 'candidatos']
  const isProhibited = prohibitedContexts.some(ctx => lower.includes(ctx))

  if (isProhibited) {
    return {
      isProhibited: true,
      prohibitionBasis: 'Artigo 5.º do EU AI Act — Uso proibido: sistemas de reconhecimento de emoções no local de trabalho e instituições de ensino.',
      transparencyRequired: false,
      recommendations: [
        'Cessar imediatamente o uso deste sistema.',
        'Consultar departamento jurídico.',
        'Contactar a autoridade competente (CNPD/DPC em Portugal).',
        'Documentar a decisão de remoção.',
      ],
    }
  }

  // Article 50.3 transparency obligation
  const emotionKeywords = ['emoção', 'emotion', 'sentimento', 'affect', 'humor', 'expressão facial', 'facial expression', 'afeto']
  const isEmotionRecognition = emotionKeywords.some(k => lower.includes(k))

  if (isEmotionRecognition) {
    return {
      isProhibited: false,
      transparencyRequired: true,
      disclosureTemplate: 'Este sistema analisa expressões ou estados emocionais. Os resultados são utilizados exclusivamente para [finalidade específica].',
      recommendations: [
        'Implementar disclosure claro antes da análise.',
        'Documentar a base legal (consentimento ou interesse legítimo).',
        'Garantir que a pessoa afetada é informada.',
        'Implementar possibilidade de opt-out.',
        'Registar logs de acesso à emoção.',
      ],
    }
  }

  return {
    isProhibited: false,
    transparencyRequired: false,
    recommendations: [
      'Confirmar que o sistema não analisa emoções.',
      'Documentar a ausência de análise emocional.',
    ],
  }
}

// ─── Article 50.4 — Deepfakes and public interest text ─────────────────────

export interface DeepfakeCheck {
  isDeepfake: boolean
  isArtisticSatire: boolean
  disclosureRequired: boolean
  hasHumanReview: boolean
  disclosureText: string
  placement_tip: string
  deadline: string
}

export const DEEPFAKE_DISCLOSURE = {
  PT: 'Este conteúdo foi gerado ou alterado por inteligência artificial. Pode não representar pessoas ou eventos reais.',
  EN: 'This content was generated or altered by artificial intelligence. It may not represent real persons or events.',
  DE: 'Dieser Inhalt wurde von KI generiert oder verändert. Er stellt möglicherweise keine realen Personen oder Ereignisse dar.',
}

export const PUBLIC_INTEREST_DISCLOSURE = {
  PT: 'Este texto foi gerado por IA sobre matéria de interesse público e não substitui verificação editorial. Última revisão humana: [data].',
  EN: 'This AI-generated text covers a matter of public interest. It does not replace editorial review. Last human review: [date].',
}

export function checkDeepfakeOrPublicInterest(
  isDeepfake: boolean,
  isArtisticSatire: boolean,
  isPublicInterest: boolean,
  hasHumanReview: boolean,
  lang: 'PT' | 'EN' = 'PT'
): DeepfakeCheck {
  const disclosureText = isPublicInterest
    ? PUBLIC_INTEREST_DISCLOSURE[lang]
    : DEEPFAKE_DISCLOSURE[lang]

  return {
    isDeepfake,
    isArtisticSatire,
    disclosureRequired: isDeepfake && !isArtisticSatire,
    hasHumanReview,
    disclosureText,
    placement_tip: isPublicInterest
      ? 'Publicar junto do artigo ou no cabeçalho.'
      : 'Primeiros 5 segundos de vídeo, ou imediatamente abaixo de imagem. Em caso de satírico, incluir nota "Satírico/Parsódi" com humor visível.',
    deadline: DEADLINES.general,
  }
}

// ─── Article 50 full compliance checklist ───────────────────────────────────

export interface ComplianceCheckItem {
  id: string
  article: string
  category: TransparencyCategory
  text: string
  required: boolean
  deadline: string
  tips: string[]
}

export const ARTICLE_50_CHECKLIST: ComplianceCheckItem[] = [
  // 50.1
  {
    id: '50-1-a',
    article: 'Art. 50.1',
    category: 'interaction',
    text: 'Identificar todos os chatbots e assistentes virtuais da empresa',
    required: true,
    deadline: DEADLINES.general,
    tips: ['Rever todos os pontos de contacto com clientes', 'Incluir chatbots de terceiros integrados'],
  },
  {
    id: '50-1-b',
    article: 'Art. 50.1',
    category: 'interaction',
    text: 'Implementar disclosure de IA na primeira interação',
    required: true,
    deadline: DEADLINES.general,
    tips: ['Texto visível sem necessidade de clique', 'Em múltiplos idiomas se aplicável', 'Funcionar mesmo que JS esteja desativado'],
  },
  {
    id: '50-1-c',
    article: 'Art. 50.1',
    category: 'interaction',
    text: 'Disponibilizar opção de contacto humano',
    required: true,
    deadline: DEADLINES.general,
    tips: ['Botão ou comando claro', 'Tempo de resposta aceitável', 'Documentar no chat history'],
  },
  {
    id: '50-1-d',
    article: 'Art. 50.1',
    category: 'interaction',
    text: 'Disclosures em canais de telefone/IVR',
    required: true,
    deadline: DEADLINES.general,
    tips: ['No início de cada chamada', 'Repetir se a llamada for transferida para IA'],
  },
  // 50.2
  {
    id: '50-2-a',
    article: 'Art. 50.2',
    category: 'synthetic_content',
    text: 'Implementar marcação C2PA/metadata em conteúdo gerado por IA',
    required: true,
    deadline: DEADLINES.synthetic,
    tips: ['Usar standard C2PA quando disponível', 'Guardar metadados mesmo se removida marca visual'],
  },
  {
    id: '50-2-b',
    article: 'Art. 50.2',
    category: 'synthetic_content',
    text: 'Adicionar rótulo "IA" visível em imagens/vídeos sintéticos',
    required: true,
    deadline: DEADLINES.synthetic,
    tips: ['Badge no canto superior ou inferior', 'Contraste suficiente', 'Legível em ecrã pequeno'],
  },
  {
    id: '50-2-c',
    article: 'Art. 50.2',
    category: 'synthetic_content',
    text: 'Criar registo de todas as imagens/vídeos gerados por IA',
    required: false,
    deadline: DEADLINES.synthetic,
    tips: ['Manter logs de criação', 'Incluir timestamp e utilizador que gerou'],
  },
  // 50.3
  {
    id: '50-3-a',
    article: 'Art. 50.3',
    category: 'emotion_recognition',
    text: 'Verificar se existe uso de reconhecimento de emoções',
    required: true,
    deadline: DEADLINES.general,
    tips: ['Auditar todos os sistemas de visão computacional', 'Incluir fornecedores third-party'],
  },
  {
    id: '50-3-b',
    article: 'Art. 50.3',
    category: 'emotion_recognition',
    text: 'Se uso permitido: implementar disclosure pré-análise',
    required: true,
    deadline: DEADLINES.general,
    tips: ['Avisar antes de capturar dados biométricos', 'Documentar base legal (GDPR + EU AI Act)'],
  },
  {
    id: '50-3-c',
    article: 'Art. 50.3',
    category: 'emotion_recognition',
    text: 'Se uso proibido (escola/trabalho): cessar imediatamente',
    required: true,
    deadline: DEADLINES.general,
    tips: ['Documentar e notificar autoridades', 'Consultar jurídico'],
  },
  // 50.4
  {
    id: '50-4-a',
    article: 'Art. 50.4',
    category: 'deepfake',
    text: 'Implementar disclosure obrigatório em deepfakes',
    required: true,
    deadline: DEADLINES.general,
    tips: ['Primeiros 5s de vídeo', 'Legenda ou watermark', 'Não esconder em términos'],
  },
  {
    id: '50-4-b',
    article: 'Art. 50.4',
    category: 'deepfake',
    text: 'Criar política interna de exceções artísticas/satíricas',
    required: false,
    deadline: DEADLINES.general,
    tips: ['Documentar critérios de exceção', 'Garantir contexto humorístico visível', 'Manter registo de intenções'],
  },
  {
    id: '50-4-c',
    article: 'Art. 50.4',
    category: 'deepfake',
    text: 'Texto de interesse público gerado por IA: disclosure + revisão humana',
    required: true,
    deadline: DEADLINES.general,
    tips: ['Registar quem fez a revisão humana', 'Documentar data da revisão', 'Tornar visível no artigo'],
  },
]

// ─── Helper: classify tool category ─────────────────────────────────────────

export function classifyTransparencyCategory(
  toolPurpose: string,
  department: string
): TransparencyCategory | null {
  const purpose = toolPurpose.toLowerCase()
  const dept = department.toLowerCase()

  // Direct interaction
  if (isDirectInteraction(toolPurpose)) return 'interaction'

  // Emotion recognition
  const emotionKws = ['emoção', 'emotion', 'sentimento', 'affect', 'expressão facial', 'facial']
  if (emotionKws.some(k => purpose.includes(k))) return 'emotion_recognition'

  // Deepfakes
  const deepfakeKws = ['video', 'vídeo', 'deepfake', 'manipulação', 'manipulation', 'avatar', 'síntese facial']
  if (deepfakeKws.some(k => purpose.includes(k))) return 'deepfake'

  // Synthetic content (image/text generation)
  const syntheticKws = ['imagem', 'image', 'video', 'vídeo', 'texto', 'texto', 'conteúdo', 'content', 'generat', 'criar']
  if (syntheticKws.some(k => purpose.includes(k))) return 'synthetic_content'

  return null
}

// ─── Status helpers ─────────────────────────────────────────────────────────

export function getStatusLabel(status: ComplianceStatus): string {
  switch (status) {
    case 'compliant': return 'Conforme'
    case 'in_progress': return 'Em progresso'
    case 'not_started': return 'Não iniciado'
    case 'not_applicable': return 'N/A'
  }
}

export function getStatusColor(status: ComplianceStatus): string {
  switch (status) {
    case 'compliant': return 'bg-green-500/20 text-green-400 border-green-500/40'
    case 'in_progress': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
    case 'not_started': return 'bg-red-500/20 text-red-400 border-red-500/40'
    case 'not_applicable': return 'bg-white/10 text-white/40 border-white/20'
  }
}
