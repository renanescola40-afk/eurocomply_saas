'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertTriangle, CheckCircle2, Clock, Shield, FileText,
  Download, ChevronRight, Bot, Eye, Video, MessageSquare,
  Zap, Calendar, ExternalLink, Info, BookOpen, ClipboardCheck,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ARTICLE_50_CHECKLIST,
  DEADLINES,
  daysUntilDeadline,
  deadlineStatus,
  INTERACTION_TEMPLATES,
  DEEPFAKE_DISCLOSURE,
  PUBLIC_INTEREST_DISCLOSURE,
  SYNTHETIC_LABELS,
  WATERMARK_OPTIONS,
  checkEmotionRecognition,
  checkDeepfakeOrPublicInterest,
  type TransparencyCategory,
  type DisclosureChannel,
  type ComplianceStatus,
  getStatusLabel,
  getStatusColor,
} from '@/lib/transparency-rules';

interface AITool {
  id: string;
  name: string;
  purpose: string | null;
  department: string | null;
  risk_level: string | null;
}

interface ChecklistItem {
  id: string;
  article: string;
  category: TransparencyCategory;
  text: string;
  required: boolean;
  checked: boolean;
  notes: string;
  tips: string[];
}

export default function TransparenciaPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-white/40">A carregar...</div>}>
      <TransparenciaContent />
    </Suspense>
  );
}

function TransparenciaContent() {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) ?? 'en';
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tools, setTools] = useState<AITool[]>([]);
  const [activeSection, setActiveSection] = useState<'overview' | 'checklist' | 'policies' | 'timeline'>('overview');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);

  // Disclosure editor state
  const [selectedTool, setSelectedTool] = useState<AITool | null>(null);
  const [disclosureText, setDisclosureText] = useState('');
  const [disclosureChannel, setDisclosureChannel] = useState<DisclosureChannel>('chat');
  const [disclosureLocation, setDisclosureLocation] = useState('');
  const [isDistinguishable, setIsDistinguishable] = useState(false);
  const [hasWatermark, setHasWatermark] = useState(false);
  const [hasMachineReadable, setHasMachineReadable] = useState(false);
  const [hasHumanReview, setHasHumanReview] = useState(false);
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatus>('not_started');
  const [notes, setNotes] = useState('');
  const [savingDisclosure, setSavingDisclosure] = useState(false);

  // Policy generation
  const [policyLang, setPolicyLang] = useState<'PT' | 'EN'>('PT');
  const [policyType, setPolicyType] = useState<'employee' | 'customer'>('customer');
  const [generatedPolicy, setGeneratedPolicy] = useState('');
  const [copyingPolicy, setCopyingPolicy] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: memberData } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .maybeSingle();

      if (memberData?.workspace_id) {
        const { data } = await supabase
          .from('ai_tools')
          .select('id, name, purpose, department, risk_level')
          .eq('workspace_id', memberData.workspace_id)
          .order('created_at', { ascending: false });

        setTools(data || []);
      }

      // Init checklist from ARTICLE_50_CHECKLIST
      const saved = localStorage.getItem('article50_checklist');
      if (saved) {
        try {
          const parsed: ChecklistItem[] = JSON.parse(saved);
          setChecklist(parsed);
        } catch {
          initChecklist();
        }
      } else {
        initChecklist();
      }
    } finally {
      setLoading(false);
    }
  };

  const initChecklist = () => {
    setChecklist(
      ARTICLE_50_CHECKLIST.map(item => ({
        ...item,
        checked: false,
        notes: '',
      }))
    );
  };

  const saveChecklist = (updated: ChecklistItem[]) => {
    setChecklist(updated);
    localStorage.setItem('article50_checklist', JSON.stringify(updated));
  };

  const toggleCheckItem = (id: string) => {
    saveChecklist(
      checklist.map(item =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const updateItemNotes = (id: string, notes: string) => {
    saveChecklist(
      checklist.map(item =>
        item.id === id ? { ...item, notes } : item
      )
    );
  };

  // ─── Deadline display ───────────────────────────────────────────────────────

  const generalDays = daysUntilDeadline(DEADLINES.general);
  const syntheticDays = daysUntilDeadline(DEADLINES.synthetic);

  const overviewProgress = checklist.length > 0
    ? Math.round((checklist.filter(i => i.checked).length / checklist.filter(i => i.required).length) * 100)
    : 0;

  const sectionProgress = (category: TransparencyCategory) => {
    const items = checklist.filter(i => i.category === category && i.required);
    if (!items.length) return 0;
    return Math.round((items.filter(i => i.checked).length / items.length) * 100);
  };

  // ─── Disclosure management ────────────────────────────────────────────────

  const handleSaveDisclosure = async () => {
    if (!selectedTool || !disclosureText.trim()) {
      toast.error('Indique o texto de disclosure');
      return;
    }
    setSavingDisclosure(true);
    try {
      const { data: memberData } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .maybeSingle();

      if (!memberData?.workspace_id) return;

      // Store disclosure as a compliance document
      const { error } = await supabase
        .from('compliance_documents')
        .insert({
          workspace_id: memberData.workspace_id,
          user_id: user?.id,
          title: `Disclosure IA — ${selectedTool.name}`,
          document_type: 'transparency_disclosure',
          status: complianceStatus === 'compliant' ? 'published' : 'draft',
          language: 'pt',
          content: {
            tool_id: selectedTool.id,
            tool_name: selectedTool.name,
            disclosure_text: disclosureText,
            channel: disclosureChannel,
            location: disclosureLocation,
            is_distinguishable: isDistinguishable,
            has_watermark: hasWatermark,
            has_machine_readable: hasMachineReadable,
            has_human_review: hasHumanReview,
            compliance_status: complianceStatus,
            notes,
          },
        });

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        workspace_id: memberData.workspace_id,
        user_id: user?.id,
        action: 'Configurou disclosure de transparência',
        entity_type: 'compliance_document',
        metadata: { tool: selectedTool.name, channel: disclosureChannel },
      });

      toast.success('Disclosure guardado com sucesso');
      setSelectedTool(null);
      setDisclosureText('');
      setDisclosureLocation('');
      setIsDistinguishable(false);
      setHasWatermark(false);
      setHasMachineReadable(false);
      setHasHumanReview(false);
      setComplianceStatus('not_started');
      setNotes('');
    } catch (err) {
      toast.error('Erro ao guardar disclosure');
    } finally {
      setSavingDisclosure(false);
    }
  };

  // ─── Policy generation ─────────────────────────────────────────────────────

  const generatePolicy = () => {
    const lang = policyLang;
    const isEmployee = policyType === 'employee';

    const disclosures = checklist
      .filter(i => i.category === 'interaction' && i.checked)
      .map(i => `- ${i.text}`)
      .join('\n');

    const syntheticDisclosures = checklist
      .filter(i => i.category === 'synthetic_content' && i.checked)
      .map(i => `- ${i.text}`)
      .join('\n');

    const employeePolicy = `# Política de IA para Funcionários — ${new Date().toLocaleDateString('pt-BR')}

## Introdução

Esta política estabelece as regras de transparência aplicáveis ao uso de sistemas de inteligência artificial na nossa organização, em conformidade com o Artigo 50.º do Regulamento (UE) 2024/1689 (EU AI Act).

## Âmbito

Esta política aplica-se a todos os colaboradores que utilizam, desenvolvem ou implementam sistemas de IA.

## Obrigações de Transparência

### Interação direta com pessoas (Art. 50.1)
Quando um sistema de IA interage diretamente com pessoas (clientes, cidadãos, parceiros), deve serProvided um disclosure claro antes de qualquer interação.

**Disclosures implementados:**
${disclosures || 'A rever e implementar.'}

### Como fazer disclosure corretamente:
- O disclosure deve ser **visível e distinguível** — não escondido em rodapés.
- Incluir sempre possibilidade de falar com humano.
- Documentar o canal e a localização do disclosure.

### Conteúdo sintético (Art. 50.2)
Todo o conteúdo (imagem, vídeo, texto) gerado por IA deve ser identificado:
- Rótulo visível: **IA** (em todos os idiomas relevantes).
- Metadados C2PA ou equivalente, quando possível.
- Registo interno de conteúdo gerado por IA.

**Disclosures implementados:**
${syntheticDisclosures || 'A rever e implementar.'}

### Emoções e reconhecimento facial (Art. 50.3)
O uso de reconhecimento de emoções é **proibido** em locais de trabalho e instituições de ensino (Art. 5.º).
Para outros usos, é obrigatório informar as pessoas antes da análise.

### Deepfakes e texto de interesse público (Art. 50.4)
- Todo deepfake deve ter disclosure claro.
- Exceções artísticas/satíricas: devem ter contexto claramente humorístico.
- Textos de interesse público gerados por IA devem indicar ausência de revisão editorial.

## O que fazer se um auditor perguntar:
- "Onde está o disclosure do chatbot?" → Apresentar screenshot do chatbot com disclosure visível.
- "Como garante que o disclosure não está escondido?" → Documentar teste de usabilidade.
- "Tem registo dos conteúdos gerados por IA?" → Apresentar log de geração.

## Data de entrada em vigor: ${DEADLINES.general}
Prazo para marcação de conteúdo sintético: ${DEADLINES.synthetic}

---
Gerado por RISCK COMPLY · Euro AI Act Art. 50 Compliance`;

    const customerPolicy = `# Política de Transparência de IA para Clientes

## Quem somos
A nossa organização está comprometida com a transparência no uso de inteligência artificial.

## Os seus direitos
De acordo com o Artigo 50.º do EU AI Act, tem o direito a ser informado quando interage com sistemas de IA.

## QuandoUtilizamos IA

${disclosures ? `Os nossos sistemas de IA utilizam disclosure claro em todas as interações diretas.` : `Estamos a implementar disclosures de IA em todos os nossos canais.`}

### Canais afetados:
${checklist.filter(i => i.category === 'interaction').map(i => `- ${i.text.replace('Identificar', '').replace('Implementar', '')}`).join('\n') || 'A configurar.'}

## Inteligência Artificial Generativa
Quando geramos imagens, vídeos ou texto com IA, estes são identificados com o rótulo **IA**.

## Deepfakes
Não utilizamos deepfakes para representação de pessoas reais sem consentimento explícito. Qualquer conteúdo sintético é identificado.

## Contacto
Para questões sobre o nosso uso de IA: [dpo@empresa.pt]

## Atualizações
Esta política é revista anualmente ou quando necessário.

---
Gerado por RISCK COMPLY · Euro AI Act Art. 50 Compliance`;

    setGeneratedPolicy(isEmployee ? employeePolicy : customerPolicy);
  };

  const handleCopyPolicy = async () => {
    if (!generatedPolicy) return;
    setCopyingPolicy(true);
    try {
      await navigator.clipboard.writeText(generatedPolicy);
      toast.success('Política copiada para a área de transferência');
    } catch {
      toast.error('Erro ao copiar');
    } finally {
      setCopyingPolicy(false);
    }
  };

  const handleExportChecklist = () => {
    const header = ['Art.', 'Categoria', 'Obrigação', 'Obrigatório', 'Estado', 'Notas'];
    const rows = checklist.map(item => [
      item.article,
      item.category,
      item.text,
      item.required ? 'Sim' : 'Não',
      item.checked ? 'Concluído' : 'Pendente',
      item.notes,
    ]);
    const csv = [header, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'art50-checklist-risck-comply.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const sections = [
    { id: 'overview' as const, label: 'Visão Geral', icon: Shield },
    { id: 'checklist' as const, label: 'Checklist', icon: ClipboardCheck },
    { id: 'policies' as const, label: 'Gerar Política', icon: FileText },
    { id: 'timeline' as const, label: 'Calendário', icon: Calendar },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Gestão de Transparência — Artigo 50</h2>
          <p className="text-sm text-white/48">
            Obrigações EU AI Act ·{' '}
            <span className={generalDays < 0 ? 'text-red-400' : generalDays < 60 ? 'text-yellow-400' : 'text-white/50'}>
              Prazo geral: {DEADLINES.general} ({generalDays < 0 ? `${Math.abs(generalDays)} dias atrasado` : `${generalDays} dias`})
            </span>
          </p>
        </div>
        <Badge className={generalDays < 60 ? 'bg-red-500/20 text-red-400 border-red-500/40' : 'bg-green-500/20 text-green-400 border-green-500/40'}>
          {generalDays < 0 ? 'PRAZO PASSADO' : generalDays < 60 ? `${generalDays}d restantes` : 'No prazo'}
        </Badge>
      </div>

      {/* Section Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {sections.map(s => (
          <Button
            key={s.id}
            variant={activeSection === s.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveSection(s.id)}
            className={activeSection === s.id ? 'bg-white text-black hover:bg-white/90' : 'border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white whitespace-nowrap'}
          >
            <s.icon className="w-4 h-4 mr-2" />
            {s.label}
          </Button>
        ))}
      </div>

      {/* ─── Overview ─────────────────────────────────────────────────────── */}
      {activeSection === 'overview' && (
        <div className="space-y-6">
          {/* Critical Notice */}
          <div className="premium-shell rounded-2xl border border-[#2563EB]/30 p-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-[#2563EB] shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-[#2563EB] mb-1">Artigo 50 — Afeta ~33% de todas as empresas</h3>
                <p className="text-sm text-white/60 leading-relaxed">
                  O Artigo 50.º do EU AI Act é a obrigação de transparência mais ampla do regulamento. Afeta qualquer empresa com chatbots, assistentes virtuais, geração de conteúdo por IA ou reconhecimento de emoções. O prazo geral é <strong className="text-white/80">2 de agosto de 2026</strong>. O prazo para marcação de conteúdo sintético é <strong className="text-white/80">2 de dezembro de 2026</strong>.
                </p>
                <p className="text-xs text-white/40 mt-2">
                  O Código de Prática Voluntário está a ser finalizado em junho de 2026. A plataforma será atualizada automaticamente após a versão final.
                </p>
              </div>
            </div>
          </div>

          {/* Progress Overview */}
          <div className="grid gap-4 md:grid-cols-2">
            {([
              { label: 'Progresso Geral', value: overviewProgress, icon: Shield, color: '#2563EB' },
              { label: 'Dias até prazo', value: Math.max(0, generalDays), icon: Clock, color: generalDays < 60 ? '#EF4444' : '#10B981' },
            ] as const).map(item => (
              <Card key={item.label} className="premium-card border-white/10 bg-white/[0.035]">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-white/48">{item.label}</CardTitle>
                  <item.icon className="w-4 h-4" style={{ color: item.color }} />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{item.value}{typeof item.value === 'number' && item.label !== 'Dias até prazo' ? '%' : ''}</p>
                  {item.label === 'Progresso Geral' && (
                    <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-[#2563EB] transition-all" style={{ width: `${overviewProgress}%` }} />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Section breakdown */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {([
              { cat: 'interaction' as TransparencyCategory, label: 'Interação Direta', art: 'Art. 50.1', icon: MessageSquare, tip: 'Chatbots, IVR, website' },
              { cat: 'synthetic_content' as TransparencyCategory, label: 'Conteúdo Sintético', art: 'Art. 50.2', icon: Eye, tip: 'Imagens, vídeo, texto gerado por IA' },
              { cat: 'emotion_recognition' as TransparencyCategory, label: 'Reconhecimento Emoções', art: 'Art. 50.3', icon: Bot, tip: 'Verificar uso proibido (Art. 5)' },
              { cat: 'deepfake' as TransparencyCategory, label: 'Deepfakes', art: 'Art. 50.4', icon: Video, tip: 'Disclosures + revisão humana' },
            ] as const).map(item => {
              const progress = sectionProgress(item.cat);
              const total = checklist.filter(i => i.category === item.cat && i.required).length;
              const done = checklist.filter(i => i.category === item.cat && i.checked && i.required).length;
              return (
                <Card key={item.cat} className="premium-card border-white/10 bg-white/[0.035] cursor-pointer hover:border-white/20 transition"
                  onClick={() => setActiveSection('checklist')}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <item.icon className="w-4 h-4 text-[#2563EB]" />
                      <span className="text-xs text-white/40">{item.art}</span>
                    </div>
                    <CardTitle className="text-sm">{item.label}</CardTitle>
                    <p className="text-xs text-white/30 mt-0.5">{item.tip}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-lg font-bold">{done}/{total}</span>
                      <span className="text-xs text-white/40">{progress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-[#2563EB] transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Tools linked */}
          {tools.length > 0 && (
            <Card className="premium-card border-white/10 bg-white/[0.035]">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="w-4 h-4 text-[#2563EB]" />
                  Sistemas de IA no inventário
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tools.slice(0, 5).map(tool => (
                    <div key={tool.id} className="flex items-center justify-between p-2 rounded-lg border border-white/5">
                      <span className="text-sm">{tool.name}</span>
                      <Badge variant="outline" className="text-xs border-white/20 text-white/40">
                        {tool.department || '—'}
                      </Badge>
                    </div>
                  ))}
                  {tools.length > 5 && (
                    <p className="text-xs text-white/30">+{tools.length - 5} mais sistemas no inventário</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Disclosure Setup */}
          <Card className="premium-card border-white/10 bg-white/[0.035]">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#2563EB]" />
                Configurar Disclosure
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedTool ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{selectedTool.name}</p>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedTool(null)} className="text-white/40 hover:text-white">Alterar</Button>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-white/60 mb-1 block">Canal</label>
                    <select
                      value={disclosureChannel}
                      onChange={e => setDisclosureChannel(e.target.value as DisclosureChannel)}
                      className="w-full h-10 rounded-md border border-white/10 bg-[#050505] px-3 text-sm text-white"
                    >
                      <option value="chat">Chat / Chatbot</option>
                      <option value="phone">Telefone / IVR</option>
                      <option value="website">Website</option>
                      <option value="email">Email</option>
                      <option value="video">Vídeo</option>
                      <option value="social">Redes Sociais</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-white/60 mb-1 block">Texto de Disclosure</label>
                    <Textarea
                      value={disclosureText}
                      onChange={e => setDisclosureText(e.target.value)}
                      placeholder="Cole ou edite o disclosure..."
                      className="bg-[#050505] border-white/10 text-white text-sm min-h-[80px]"
                    />
                    <p className="text-xs text-white/30 mt-1">
                      Sugestão: {INTERACTION_TEMPLATES.find(t => t.channel === disclosureChannel)?.example || 'Ver templates no checklist.'}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-white/60 mb-1 block">Onde está localizado?</label>
                    <Input
                      value={disclosureLocation}
                      onChange={e => setDisclosureLocation(e.target.value)}
                      placeholder="Ex: Primeira mensagem do chatbot, rodapé do website..."
                      className="bg-[#050505] border-white/10 text-white text-sm"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={isDistinguishable} onCheckedChange={v => setIsDistinguishable(Boolean(v))} />
                      O disclosure é visível e distinguível? (não escondido)
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={hasWatermark} onCheckedChange={v => setHasWatermark(Boolean(v))} />
                      Tem marcação visual/watermark?
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={hasMachineReadable} onCheckedChange={v => setHasMachineReadable(Boolean(v))} />
                      Tem marcação legível por máquina (metadados)?
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={hasHumanReview} onCheckedChange={v => setHasHumanReview(Boolean(v))} />
                      Tem processo de revisão humana?
                    </label>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-white/60 mb-1 block">Notas</label>
                    <Input
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Notas internas..."
                      className="bg-[#050505] border-white/10 text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-white/60 mb-1 block">Estado</label>
                    <div className="flex gap-2">
                      {(['not_started', 'in_progress', 'compliant'] as ComplianceStatus[]).map(s => (
                        <Button key={s} variant={complianceStatus === s ? 'default' : 'outline'} size="sm"
                          onClick={() => setComplianceStatus(s)}
                          className={complianceStatus === s ? 'bg-white text-black hover:bg-white/90' : 'border-white/10 bg-white/[0.04] text-white/60'}>
                          {getStatusLabel(s)}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Button onClick={handleSaveDisclosure} disabled={savingDisclosure}
                    className="w-full bg-white text-black hover:bg-white/90">
                    {savingDisclosure ? 'A guardar...' : <><CheckCircle2 className="w-4 h-4 mr-2" />Guardar Disclosure</>}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-white/60">Selecione um sistema para configurar o disclosure:</p>
                  {tools.length === 0 ? (
                    <p className="text-sm text-white/40">Nenhum sistema no inventário. <button className="text-[#2563EB] underline" onClick={() => router.push(`/${locale}/dashboard/inventario/novo`)}>Criar primeiro caso.</button></p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {tools.map(tool => (
                        <button key={tool.id} onClick={() => {
                          setSelectedTool(tool);
                          // Pre-fill with template
                          const template = INTERACTION_TEMPLATES.find(t =>
                            t.channel === 'chat' && isDirectInteraction(tool.purpose || '')
                          );
                          if (template) setDisclosureText(template.example.replace('CompanyX', 'Empresa'));
                        }}
                          className="w-full flex items-center justify-between p-3 rounded-lg border border-white/10 hover:border-white/20 transition text-left">
                          <span className="text-sm">{tool.name}</span>
                          <ChevronRight className="w-4 h-4 text-white/40" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Checklist ─────────────────────────────────────────────────────── */}
      {activeSection === 'checklist' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60">{checklist.filter(i => i.required && i.checked).length}/{checklist.filter(i => i.required).length} obrigações obrigatórias concluídas</p>
              <div className="mt-1 h-2 w-48 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-[#10B981] transition-all" style={{ width: `${overviewProgress}%` }} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportChecklist}
                className="border-white/10 bg-white/[0.04] text-white/60 hover:text-white">
                <Download className="w-4 h-4 mr-2" />Exportar CSV
              </Button>
              <Button variant="outline" size="sm" onClick={initChecklist}
                className="border-white/10 bg-white/[0.04] text-white/60 hover:text-white">
                <Zap className="w-4 h-4 mr-2" />Resetar
              </Button>
            </div>
          </div>

          {/* Group by article */}
          {(['50.1', '50.2', '50.3', '50.4'] as const).map(article => {
            const articleItems = checklist.filter(i => i.article.includes(article));
            if (!articleItems.length) return null;

            const articleLabels: Record<string, { title: string; icon: React.ElementType; desc: string }> = {
              '50.1': { title: 'Art. 50.1 — Interação Direta', icon: MessageSquare, desc: 'Chatbots, assistentes virtuais, atendimento automático' },
              '50.2': { title: 'Art. 50.2 — Conteúdo Sintético', icon: Eye, desc: 'Marcação em imagens, vídeos, texto gerado por IA. Prazo: ' + DEADLINES.synthetic },
              '50.3': { title: 'Art. 50.3 — Reconhecimento de Emoções', icon: Bot, desc: 'Verificar uso proibido (Art. 5) e obrigações de transparência' },
              '50.4': { title: 'Art. 50.4 — Deepfakes e Texto Público', icon: Video, desc: 'Disclosures obrigatórios e revisão humana' },
            };

            const info = articleLabels[article];
            const artProgress = articleItems.filter(i => i.required && i.checked).length;
            const artTotal = articleItems.filter(i => i.required).length;

            return (
              <Card key={article} className="premium-card border-white/10 bg-white/[0.035]">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <info.icon className="w-5 h-5 text-[#2563EB]" />
                      <div>
                        <CardTitle className="text-base">{info.title}</CardTitle>
                        <p className="text-xs text-white/40 mt-0.5">{info.desc}</p>
                      </div>
                    </div>
                    <Badge className="bg-white/10 text-white/60 border-white/20">
                      {artProgress}/{artTotal}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {articleItems.map(item => (
                    <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border border-white/5 hover:bg-white/[0.02] transition">
                      <Checkbox
                        checked={item.checked}
                        onCheckedChange={() => toggleCheckItem(item.id)}
                        className="mt-0.5 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm ${item.checked ? 'text-white/40 line-through' : 'text-white/80'}`}>
                            {item.text}
                          </p>
                          {item.required && (
                            <Badge variant="outline" className="text-xs border-[#2563EB]/40 text-[#2563EB] shrink-0">Req.</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.tips.map((tip, i) => (
                            <span key={i} className="text-xs text-white/30 bg-white/[0.03] px-2 py-0.5 rounded-full">💡 {tip}</span>
                          ))}
                        </div>
                        <div className="mt-2">
                          <Input
                            value={item.notes}
                            onChange={e => updateItemNotes(item.id, e.target.value)}
                            placeholder="Notas de implementação..."
                            className="bg-[#050505] border-white/10 text-white text-xs h-8"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── Policy Generator ──────────────────────────────────────────────── */}
      {activeSection === 'policies' && (
        <div className="space-y-6">
          <Card className="premium-card border-white/10 bg-white/[0.035]">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#2563EB]" />
                Gerador de Política de Transparência
              </CardTitle>
              <p className="text-sm text-white/50">
                Gere automaticamente uma política de IA para {policyType === 'employee' ? 'funcionários' : 'clientes'}, com base no checklist preenchido.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-medium text-white/60 mb-2 block">Público-alvo</label>
                  <div className="flex gap-2">
                    <Button variant={policyType === 'customer' ? 'default' : 'outline'} size="sm"
                      onClick={() => setPolicyType('customer')}
                      className={policyType === 'customer' ? 'bg-white text-black hover:bg-white/90' : 'border-white/10 bg-white/[0.04] text-white/60'}>
                      Clientes / Utilizadores
                    </Button>
                    <Button variant={policyType === 'employee' ? 'default' : 'outline'} size="sm"
                      onClick={() => setPolicyType('employee')}
                      className={policyType === 'employee' ? 'bg-white text-black hover:bg-white/90' : 'border-white/10 bg-white/[0.04] text-white/60'}>
                      Funcionários
                    </Button>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-white/60 mb-2 block">Idioma</label>
                  <div className="flex gap-2">
                    <Button variant={policyLang === 'PT' ? 'default' : 'outline'} size="sm"
                      onClick={() => setPolicyLang('PT')}
                      className={policyLang === 'PT' ? 'bg-white text-black hover:bg-white/90' : 'border-white/10 bg-white/[0.04] text-white/60'}>
                      PT
                    </Button>
                    <Button variant={policyLang === 'EN' ? 'default' : 'outline'} size="sm"
                      onClick={() => setPolicyLang('EN')}
                      className={policyLang === 'EN' ? 'bg-white text-black hover:bg-white/90' : 'border-white/10 bg-white/[0.04] text-white/60'}>
                      EN
                    </Button>
                  </div>
                </div>
              </div>

              <Button onClick={generatePolicy} className="w-full bg-white text-black hover:bg-white/90">
                <FileText className="w-4 h-4 mr-2" />Gerar Política
              </Button>

              {generatedPolicy && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/40">Política gerada</Badge>
                    <Button variant="outline" size="sm" onClick={handleCopyPolicy} disabled={copyingPolicy}
                      className="border-white/10 bg-white/[0.04] text-white/60 hover:text-white">
                      {copyingPolicy ? 'A copiar...' : <><Download className="w-4 h-4 mr-2" />Copiar</>}
                    </Button>
                  </div>
                  <Textarea
                    value={generatedPolicy}
                    readOnly
                    className="bg-[#050505] border-white/10 text-white/80 text-xs min-h-[400px] font-mono leading-relaxed"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Timeline ─────────────────────────────────────────────────────── */}
      {activeSection === 'timeline' && (
        <div className="space-y-6">
          {/* Deadline cards */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className={`premium-card border ${generalDays < 0 ? 'border-red-500/40 bg-red-500/5' : generalDays < 60 ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-green-500/30'}`}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${generalDays < 0 ? 'bg-red-500/20' : generalDays < 60 ? 'bg-yellow-500/20' : 'bg-green-500/20'}`}>
                    <Clock className={`w-5 h-5 ${generalDays < 0 ? 'text-red-400' : generalDays < 60 ? 'text-yellow-400' : 'text-green-400'}`} />
                  </div>
                  <div>
                    <CardTitle className="text-base">2 de agosto de 2026</CardTitle>
                    <p className="text-xs text-white/50">Art. 50.1, 50.3, 50.4</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-white/60 mb-3">
                  Maioria das obrigações de transparência entra em vigor. Interação direta, reconhecimento de emoções e deepfakes.
                </p>
                <Badge className={generalDays < 0 ? 'bg-red-500/20 text-red-400 border-red-500/40' : generalDays < 60 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' : 'bg-green-500/20 text-green-400 border-green-500/40'}>
                  {generalDays < 0 ? `${Math.abs(generalDays)} dias atrasado` : `${generalDays} dias restantes`}
                </Badge>
              </CardContent>
            </Card>

            <Card className="premium-card border-white/10 bg-white/[0.035]">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#2563EB]/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-[#2563EB]" />
                  </div>
                  <div>
                    <CardTitle className="text-base">2 de dezembro de 2026</CardTitle>
                    <p className="text-xs text-white/50">Art. 50.2 (Omnibus)</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-white/60 mb-3">
                  Prazo para implementação de marcação de conteúdo sintético (imagens, vídeos, texto gerado por IA). Postposto pelo AI Omnibus.
                </p>
                <Badge className="bg-[#2563EB]/20 text-[#2563EB] border-[#2563EB]/40">
                  {syntheticDays < 0 ? `${Math.abs(syntheticDays)} dias atrasado` : `${syntheticDays} dias restantes`}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Timeline events */}
          <Card className="premium-card border-white/10 bg-white/[0.035]">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#2563EB]" />
                Cronograma de Implementação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {[
                  { date: 'Agora', action: 'Identificar todos os pontos de interação com IA', done: checklist.filter(i => i.id === '50-1-a').some(i => i.checked) },
                  { date: 'Agora', action: 'Criar política de transparência interna', done: checklist.filter(i => i.id === '50-1-b').some(i => i.checked) },
                  { date: 'Jul 2026', action: 'Implementar disclosures em todos os chatbots', done: checklist.filter(i => i.id === '50-1-b').some(i => i.checked) },
                  { date: 'Jul 2026', action: 'Treinar equipa de suporte sobre disclosures', done: false },
                  { date: 'Ago 2026', action: 'Deploy final e testes de usabilidade', done: false },
                  { date: 'Nov 2026', action: 'Implementar marcação C2PA em conteúdo gerado', done: checklist.filter(i => i.id === '50-2-a').some(i => i.checked) },
                  { date: 'Dez 2026', action: 'Verificação final de compliance Art. 50', done: false },
                ].map((event, i) => (
                  <div key={i} className="flex items-start gap-4 py-3 border-b border-white/5 last:border-0">
                    <div className="w-16 shrink-0 text-xs text-white/40 pt-0.5">{event.date}</div>
                    <div className="flex items-center gap-2 flex-1">
                      {event.done ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-white/20 shrink-0" />
                      )}
                      <p className={`text-sm ${event.done ? 'text-white/40 line-through' : 'text-white/70'}`}>{event.action}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Auditor Questions */}
          <Card className="premium-card border-white/10 bg-white/[0.035]">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#2563EB]" />
                Perguntas que o Auditor vai fazer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { q: '"Onde está o disclosure do chatbot?"', a: 'Screenshot do chatbot com disclosure na primeira mensagem. Documentar que é "visível e não escondido em rodapé".' },
                  { q: '"Como garante que o utilizador não é enganado?"', a: 'Demonstrar que existe sempre opção de falar com humano. Documentar tempo médio de resposta humana.' },
                  { q: '"Tem registo dos deepfakes gerados?"', a: 'Log com timestamp, utilizador que gerou e contexto. Checklist item 50-4-a.' },
                  { q: '"O que fez à análise de emoções no RH?"', a: 'Se utilizava: mostrar que cessou (Art. 5 proibido). Se não utilizava: declaração de ausência.' },
                  { q: '"O rótulo IA está em todos os conteúdos?"', a: 'Demonstrar processo de watermarking ou verificação de metadados C2PA.' },
                ].map((item, i) => (
                  <div key={i} className="p-3 rounded-lg border border-white/5 bg-white/[0.02]">
                    <p className="text-sm font-medium text-white/70 mb-1">{item.q}</p>
                    <p className="text-xs text-white/40">{item.a}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Helper
function isDirectInteraction(purpose: string): boolean {
  const keywords = ['chat', 'atendimento', 'suporte', 'assistente', 'bot', 'contacto', 'cliente', 'vendas', 'help', 'support']
  const lower = purpose.toLowerCase()
  return keywords.some(k => lower.includes(k))
}
