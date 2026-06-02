'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Bot, ArrowLeft, Save, AlertTriangle, ShieldCheck,
  CheckCircle2, ArrowRight, ChevronDown,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  classifyRisk,
  type RiskFormData,
  type RiskResult,
  type Department,
  type ImpactLevel,
  getRiskColor,
  getRiskLabel,
} from '@/lib/risk-classifier';

const DEPARTMENTS: { value: Department; label: string }[] = [
  { value: 'RH', label: 'Recursos Humanos' },
  { value: 'Vendas', label: 'Vendas' },
  { value: 'Operacoes', label: 'Operações' },
  { value: 'TI', label: 'Tecnologia e Informação' },
  { value: 'Juridico', label: 'Jurídico' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Outro', label: 'Outro' },
];

export default function NovoCasoPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RiskResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  const [form, setForm] = useState<RiskFormData>({
    name: '',
    vendor: '',
    department: 'TI',
    purpose: '',
    processesPersonalData: false,
    impactOnThirdPartyRights: 'baixo',
    automatedDecisionMaking: false,
  });

  const [submitted, setSubmitted] = useState(false);

  const update = (field: keyof RiskFormData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Indique o nome da ferramenta');
      return;
    }
    if (!form.purpose.trim()) {
      toast.error('Descreva a finalidade da IA');
      return;
    }
    setSubmitted(true);
    const classification = classifyRisk(form);
    setResult(classification);
    setLoading(false);
  };

  const handleSaveToInventory = async () => {
    if (!result || !user) return;

    setLoading(true);
    try {
      // Get workspace
      const { data: memberData } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (!memberData?.workspace_id) {
        toast.error('Workspace não encontrado');
        return;
      }

      const { error } = await supabase.from('ai_tools').insert({
        workspace_id: memberData.workspace_id,
        owner_user_id: user.id,
        name: form.name,
        vendor: form.vendor,
        department: form.department,
        purpose: form.purpose,
        risk_level: result.level,
        status: result.level === 'unacceptable' ? 'non_compliant' : 'review',
        metadata: {
          processesPersonalData: form.processesPersonalData,
          impactOnThirdPartyRights: form.impactOnThirdPartyRights,
          automatedDecisionMaking: form.automatedDecisionMaking,
          risk_score: result.score,
          risk_justification: result.justification,
          eu_act_article: result.euActArticle,
          obligations: result.obligations,
          assessed_at: new Date().toISOString(),
        },
      });

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        workspace_id: memberData.workspace_id,
        user_id: user.id,
        action: 'Registou novo caso de IA',
        entity_type: 'ai_tool',
        metadata: { name: form.name, risk_level: result.level },
      });

      toast.success('Guardado no inventário com sucesso');
      setSaved(true);
      setTimeout(() => router.push('/dashboard?tab=inventory'), 1500);
    } catch (err) {
      toast.error('Erro ao guardar no inventário');
    } finally {
      setLoading(false);
    }
  };

  const isValid = form.name.trim() && form.purpose.trim();

  if (result) {
    return (
      <div className="min-h-screen bg-[#050505] text-white p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <Button variant="ghost" onClick={() => { setResult(null); setSubmitted(false); }} className="text-white/60 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />Voltar
          </Button>

          {/* Risk Level Header */}
          <div className={`premium-shell rounded-[1.75rem] p-8 border-2 ${result.level === 'unacceptable' ? 'border-red-500/40' : result.level === 'high' ? 'border-orange-500/40' : result.level === 'limited' ? 'border-yellow-500/40' : 'border-green-500/40'}`}>
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl ${result.level === 'unacceptable' ? 'bg-red-500/20' : result.level === 'high' ? 'bg-orange-500/20' : result.level === 'limited' ? 'bg-yellow-500/20' : 'bg-green-500/20'}`}>
                {result.level === 'unacceptable' ? '🚫' : result.level === 'high' ? '🔴' : result.level === 'limited' ? '🟡' : '🟢'}
              </div>
              <div className="flex-1">
                <Badge className={`mb-3 ${result.level === 'unacceptable' ? 'bg-red-500/20 text-red-400 border-red-500/40' : result.level === 'high' ? 'bg-orange-500/20 text-orange-400 border-orange-500/40' : result.level === 'limited' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' : 'bg-green-500/20 text-green-400 border-green-500/40'} border`}>
                  {getRiskLabel(result.level)} — Score: {result.score}/100
                </Badge>
                <h2 className="text-2xl font-semibold mb-2">{form.name}</h2>
                <p className="text-white/60 text-sm">{form.vendor || 'Fornecedor não indicado'} · {DEPARTMENTS.find(d => d.value === form.department)?.label}</p>
              </div>
            </div>
          </div>

          {/* Justification */}
          <Card className="premium-card border-white/10 bg-white/[0.035]">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#2563EB]" />
                <CardTitle className="text-base">Justificação — Classificação EU AI Act</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm leading-relaxed text-white/70">{result.justification}</p>
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2">
                <ShieldCheck className="w-4 h-4 text-white/40 shrink-0" />
                <p className="text-xs text-white/50">{result.euActArticle}</p>
              </div>
            </CardContent>
          </Card>

          {/* Obligations */}
          <Card className="premium-card border-white/10 bg-white/[0.035]">
            <CardHeader>
              <CardTitle className="text-base">Checklist de Obrigações para {getRiskLabel(result.level)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {result.obligations.map((obligation) => (
                  <div key={obligation.id} className="flex items-start gap-3">
                    {obligation.required ? (
                      <div className="w-5 h-5 rounded border-2 border-[#2563EB] bg-[#2563EB]/10 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-[#2563EB]">!</span>
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded border border-white/20 flex items-center justify-center shrink-0 mt-0.5">
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm">{obligation.text}</p>
                      {obligation.required && <p className="text-xs text-red-400/70 mt-0.5">Obrigatório</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action */}
          {result.level !== 'unacceptable' && !saved && (
            <div className="flex flex-col gap-3">
              <Button onClick={handleSaveToInventory} disabled={loading} className="w-full bg-white text-black hover:bg-white/90 h-12 text-base">
                {loading ? 'A guardar...' : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar no Inventário de IA
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => { setResult(null); setSubmitted(false); }} className="w-full border-white/10 text-white/60 hover:text-white">
                <ArrowRight className="w-4 h-4 mr-2 scale-x-[-1]" />
                Criar outro caso
              </Button>
            </div>
          )}

          {result.level === 'unacceptable' && !saved && (
            <div className="premium-shell rounded-2xl border border-red-500/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="font-semibold text-red-400">Utilização proibida</h3>
              </div>
              <p className="text-sm text-white/60 mb-4">
                Este caso de uso enquadra-se num uso proibido pelo EU AI Act. A utilização deve cessar imediatamente. Contacte o departamento jurídico.
              </p>
              <Button variant="outline" onClick={() => { setResult(null); setSubmitted(false); }} className="w-full border-white/10 text-white/60 hover:text-white">
                Criar outro caso
              </Button>
            </div>
          )}

          {saved && (
            <div className="flex items-center gap-3 justify-center py-4 text-green-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm">Guardado com sucesso! A redirecionar...</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => router.back()} className="text-white/60 hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-2" />Voltar
        </Button>

        <div className="premium-shell rounded-[1.75rem] p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 border border-white/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-[#2563EB]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Novo Caso de Uso de IA</h1>
              <p className="text-sm text-white/48">Avaliação automática de risco — EU AI Act</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
          <div className="premium-shell rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">Informação da Ferramenta</h3>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nome da ferramenta / IA *</label>
              <Input
                placeholder="Ex: ChatGPT para suporte ao cliente"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                className="bg-[#050505] border-white/10 text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Fornecedor</label>
              <Input
                placeholder="Ex: OpenAI, Google, interno, Microsoft..."
                value={form.vendor}
                onChange={(e) => update('vendor', e.target.value)}
                className="bg-[#050505] border-white/10 text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Departamento *</label>
              <div className="relative">
                <select
                  value={form.department}
                  onChange={(e) => update('department', e.target.value)}
                  className="w-full h-10 rounded-md border border-white/10 bg-[#050505] px-3 text-sm text-white appearance-none"
                >
                  {DEPARTMENTS.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Finalidade *</label>
              <textarea
                placeholder="Descreva para que serve esta IA. Quanto mais detalhes, melhor a classificação automática..."
                value={form.purpose}
                onChange={(e) => update('purpose', e.target.value)}
                className="w-full rounded-md border border-white/10 bg-[#050505] px-3 py-2 text-sm text-white min-h-[100px] resize-none"
              />
            </div>
          </div>

          {/* Risk Questions */}
          <div className="premium-shell rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">Perguntas de Risco</h3>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="processesPersonalData"
                  checked={form.processesPersonalData}
                  onCheckedChange={(v) => update('processesPersonalData', Boolean(v))}
                  className="mt-0.5"
                />
                <label htmlFor="processesPersonalData" className="text-sm cursor-pointer">
                  <span className="font-medium">Processa dados pessoais?</span>
                  <span className="text-white/48 block text-xs mt-0.5">Inclui nomes, emails, moradas, dados biométricos, comportamento online, perfis profissionais...</span>
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Impacto em direitos de terceiros</label>
                <div className="flex gap-2">
                  {(['baixo', 'medio', 'alto'] as ImpactLevel[]).map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => update('impactOnThirdPartyRights', level)}
                      className={`flex-1 py-2 px-3 rounded-lg border text-sm transition ${
                        form.impactOnThirdPartyRights === level
                          ? level === 'alto' ? 'border-red-500/50 bg-red-500/10 text-red-400'
                          : level === 'medio' ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400'
                          : 'border-green-500/50 bg-green-500/10 text-green-400'
                          : 'border-white/10 text-white/50 hover:border-white/20'
                      }`}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="automatedDecisionMaking"
                  checked={form.automatedDecisionMaking}
                  onCheckedChange={(v) => update('automatedDecisionMaking', Boolean(v))}
                  className="mt-0.5"
                />
                <label htmlFor="automatedDecisionMaking" className="text-sm cursor-pointer">
                  <span className="font-medium">Envolve tomada de decisão automatizada?</span>
                  <span className="text-white/48 block text-xs mt-0.5">A IA toma decisões que afetam pessoas sem revisão humana significativa? (ex: aprovação/recusa de candidatos, crédito, acesso a serviços...)</span>
                </label>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={!isValid}
            className="w-full h-12 bg-white text-black hover:bg-white/90 text-base"
          >
            Classificar Risco
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </form>
      </div>
    </div>
  );
}
