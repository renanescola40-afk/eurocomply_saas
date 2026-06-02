'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft, Bot, RefreshCw, Save, CheckCircle2,
  AlertTriangle, FileText, ShieldCheck, Trash2, Edit3,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  type RiskLevel,
  getRiskLabel,
} from '@/lib/risk-classifier';

interface AITool {
  id: string;
  workspace_id: string;
  owner_user_id: string | null;
  name: string;
  vendor: string | null;
  department: string | null;
  purpose: string | null;
  risk_level: string | null;
  status: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string | null;
}

function riskBadgeClass(level: string | null) {
  switch (level) {
    case 'unacceptable': return 'bg-red-500/20 text-red-400 border-red-500/40';
    case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
    case 'limited': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
    case 'minimal': return 'bg-green-500/20 text-green-400 border-green-500/40';
    default: return 'bg-white/10 text-white/60 border-white/20';
  }
}

function riskEmoji(level: string | null) {
  switch (level) {
    case 'unacceptable': return '🚫';
    case 'high': return '🔴';
    case 'limited': return '🟡';
    case 'minimal': return '🟢';
    default: return '⚪';
  }
}

function statusBadgeClass(status: string | null) {
  switch (status) {
    case 'compliant': return 'bg-green-500/20 text-green-400 border-green-500/40';
    case 'non_compliant': return 'bg-red-500/20 text-red-400 border-red-500/40';
    case 'mitigated': return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
    default: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
  }
}

function statusLabel(status: string | null) {
  switch (status) {
    case 'compliant': return 'Conforme';
    case 'non_compliant': return 'Não conforme';
    case 'mitigated': return 'Mitigado';
    default: return 'Em revisão';
  }
}

export default function ToolDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) ?? 'en';
  const { user } = useAuth();
  const toolId = params.id as string;

  const [tool, setTool] = useState<AITool | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Mitigation state
  const [showMitigate, setShowMitigate] = useState(false);
  const [mitigationNotes, setMitigationNotes] = useState('');
  const [mitigationSaving, setMitigationSaving] = useState(false);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editVendor, setEditVendor] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editPurpose, setEditPurpose] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Related documents
  const [docs, setDocs] = useState<any[]>([]);

  useEffect(() => {
    if (!user || !toolId) return;
    loadTool();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, toolId]);

  const loadTool = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('ai_tools')
        .select('*')
        .eq('id', toolId)
        .maybeSingle();

      if (!data) {
        toast.error('Ferramenta não encontrada');
        router.push(`/${locale}/dashboard/inventario`);
        return;
      }

      setTool(data);
      setEditName(data.name);
      setEditVendor(data.vendor || '');
      setEditDepartment(data.department || '');
      setEditPurpose(data.purpose || '');

      // Load related documents
      const { data: docsData } = await supabase
        .from('compliance_documents')
        .select('*')
        .eq('workspace_id', data.workspace_id)
        .ilike('content', `%${data.name}%`)
        .limit(5);

      setDocs(docsData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReassess = async () => {
    if (!tool || !user) return;
    setSaving(true);
    try {
      toast.success('Use "Novo Caso de IA" para reavaliar com base em nova informação');
      router.push(`/${locale}/dashboard/inventario/novo`);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkMitigated = async () => {
    if (!tool || !user || !mitigationNotes.trim()) {
      toast.error('Indique as medidas adotadas');
      return;
    }
    setMitigationSaving(true);
    try {
      const { error } = await supabase
        .from('ai_tools')
        .update({
          status: 'mitigated',
          updated_at: new Date().toISOString(),
          metadata: {
            ...(tool.metadata || {}),
            mitigation_notes: mitigationNotes,
            mitigated_at: new Date().toISOString(),
            mitigated_by: user.id,
          },
        })
        .eq('id', tool.id);

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        workspace_id: tool.workspace_id,
        user_id: user.id,
        action: 'Marcou sistema como mitigado',
        entity_type: 'ai_tool',
        metadata: { name: tool.name, notes: mitigationNotes },
      });

      toast.success('Sistema marcado como mitigado');
      setShowMitigate(false);
      loadTool();
    } catch (err) {
      toast.error('Erro ao marcar como mitigado');
    } finally {
      setMitigationSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!tool || !editName.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    setEditSaving(true);
    try {
      const { error } = await supabase
        .from('ai_tools')
        .update({
          name: editName,
          vendor: editVendor || null,
          department: editDepartment || null,
          purpose: editPurpose || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tool.id);

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        workspace_id: tool.workspace_id,
        user_id: user?.id,
        action: 'Atualizou registo de IA',
        entity_type: 'ai_tool',
        metadata: { name: editName },
      });

      toast.success('Registo atualizado');
      setEditing(false);
      loadTool();
    } catch (err) {
      toast.error('Erro ao guardar');
    } finally {
      setEditSaving(false);
    }
  };

  const handleMarkCompliant = async () => {
    if (!tool || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('ai_tools')
        .update({ status: 'compliant', updated_at: new Date().toISOString() })
        .eq('id', tool.id);

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        workspace_id: tool.workspace_id,
        user_id: user.id,
        action: 'Marcou sistema como conforme',
        entity_type: 'ai_tool',
        metadata: { name: tool.name },
      });

      toast.success('Marcado como conforme');
      loadTool();
    } catch (err) {
      toast.error('Erro ao atualizar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-white/40">
        A carregar...
      </div>
    );
  }

  if (!tool) return null;

  const metadata = tool.metadata || {};
  const obligations = metadata.obligations || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push(`/${locale}/dashboard/inventario`)} className="text-white/60 hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-2" />Inventário
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReassess} disabled={saving}
            className="border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08] hover:text-white">
            <RefreshCw className="w-4 h-4 mr-2" />Reavaliar
          </Button>
          <Button variant="outline" onClick={() => setEditing(true)}
            className="border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08] hover:text-white">
            <Edit3 className="w-4 h-4 mr-2" />Editar
          </Button>
        </div>
      </div>

      {/* Main Info */}
      <div className={`premium-shell rounded-[1.75rem] p-8 border-2 ${
        tool.risk_level === 'unacceptable' ? 'border-red-500/30' :
        tool.risk_level === 'high' ? 'border-orange-500/30' :
        tool.risk_level === 'limited' ? 'border-yellow-500/30' : 'border-green-500/30'
      }`}>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#2563EB]/10 border border-white/10 flex items-center justify-center text-3xl shrink-0">
            {riskEmoji(tool.risk_level)}
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-3">
                <Input value={editName} onChange={e => setEditName(e.target.value)}
                  className="bg-[#050505] border-white/10 text-white text-lg font-semibold" />
                <Input value={editVendor} onChange={e => setEditVendor(e.target.value)}
                  placeholder="Fornecedor" className="bg-[#050505] border-white/10 text-white" />
                <div className="flex gap-2">
                  <select value={editDepartment} onChange={e => setEditDepartment(e.target.value)}
                    className="flex-1 h-10 rounded-md border border-white/10 bg-[#050505] px-3 text-sm text-white">
                    {['RH', 'Vendas', 'Operacoes', 'TI', 'Juridico', 'Marketing', 'Outro'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <Textarea value={editPurpose} onChange={e => setEditPurpose(e.target.value)}
                  placeholder="Finalidade" className="bg-[#050505] border-white/10 text-white min-h-[80px]" />
                <div className="flex gap-2">
                  <Button onClick={handleSaveEdit} disabled={editSaving}
                    className="bg-white text-black hover:bg-white/90">
                    {editSaving ? 'A guardar...' : <><Save className="w-4 h-4 mr-2" />Guardar</>}
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(false)}
                    className="border-white/10 text-white/60 hover:text-white">
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge className={`border ${riskBadgeClass(tool.risk_level)}`}>
                    {getRiskLabel(tool.risk_level as RiskLevel)}
                  </Badge>
                  <Badge className={`border ${statusBadgeClass(tool.status)}`}>
                    {statusLabel(tool.status)}
                  </Badge>
                </div>
                <h1 className="text-2xl font-semibold">{tool.name}</h1>
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-white/50">
                  {tool.vendor && <span>Fornecedor: <strong className="text-white/70">{tool.vendor}</strong></span>}
                  {tool.department && <span>Departamento: <strong className="text-white/70">{tool.department}</strong></span>}
                  <span>Avaliado: <strong className="text-white/70">{new Date(tool.created_at).toLocaleDateString('pt-BR')}</strong></span>
                </div>
                {tool.purpose && (
                  <p className="mt-3 text-sm text-white/60 leading-relaxed">{tool.purpose}</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Metadata Info */}
      {(metadata.risk_justification || metadata.eu_act_article) && (
        <Card className="premium-card border-white/10 bg-white/[0.035]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
              <CardTitle className="text-base">Fundamentação — EU AI Act</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {metadata.risk_justification && (
              <p className="text-sm leading-relaxed text-white/70">{metadata.risk_justification}</p>
            )}
            {metadata.eu_act_article && (
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2">
                <ShieldCheck className="w-4 h-4 text-white/40 shrink-0" />
                <p className="text-xs text-white/50">{metadata.eu_act_article}</p>
              </div>
            )}
            {metadata.assessed_at && (
              <p className="text-xs text-white/30">Avaliação realizada em {new Date(metadata.assessed_at).toLocaleString('pt-BR')}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Obligations Checklist */}
      {obligations.length > 0 && (
        <Card className="premium-card border-white/10 bg-white/[0.035]">
          <CardHeader>
            <CardTitle className="text-base">Checklist de Obrigações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {obligations.map((obligation: any) => (
                <div key={obligation.id} className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                    obligation.required
                      ? 'border-[#2563EB] bg-[#2563EB]/10'
                      : 'border-white/20'
                  }`}>
                    {obligation.required && <CheckCircle2 className="w-3 h-3 text-[#2563EB]" />}
                  </div>
                  <div>
                    <p className="text-sm">{obligation.text}</p>
                    {obligation.required && (
                      <p className="text-xs text-[#2563EB]/60 mt-0.5">Obrigatório · EU AI Act</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mitigation Section */}
      {tool.status !== 'mitigated' && tool.risk_level === 'high' && !showMitigate && (
        <div className="premium-shell rounded-2xl border border-orange-500/20 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-orange-400 mb-1">Sistema de Alto Risco</h3>
              <p className="text-sm text-white/60 mb-4">
                Este sistema é classificado como Alto Risco. Para marcar como mitigado, documente as medidas técnicas e organizacionais adotadas para reduzir o risco.
              </p>
              <Button variant="outline" onClick={() => setShowMitigate(true)}
                className="border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 hover:text-orange-300">
                <ShieldCheck className="w-4 h-4 mr-2" />Marcar como Mitigado
              </Button>
            </div>
          </div>
        </div>
      )}

      {showMitigate && (
        <Card className="premium-card border-white/10 bg-white/[0.035]">
          <CardHeader>
            <CardTitle className="text-base">Documentar Medidas de Mitigação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Medidas adotadas</label>
              <Textarea
                value={mitigationNotes}
                onChange={e => setMitigationNotes(e.target.value)}
                placeholder="Descreva as medidas técnicas e organizacionais adotadas para mitigar o risco (ex: supervisão humana implementada, testes de viés, revisão periódica, documentação de accountability...)"
                className="bg-[#050505] border-white/10 text-white min-h-[120px]"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleMarkMitigated} disabled={mitigationSaving}
                className="bg-[#2563EB] hover:bg-[#2563EB]/80">
                {mitigationSaving ? 'A guardar...' : <><ShieldCheck className="w-4 h-4 mr-2" />Confirmar Mitigação</>}
              </Button>
              <Button variant="outline" onClick={() => setShowMitigate(false)}
                className="border-white/10 text-white/60 hover:text-white">
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tool.status === 'mitigated' && (
        <div className="premium-shell rounded-2xl border border-blue-500/30 p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-400 mb-1">Sistema Mitigado</h3>
              {metadata.mitigation_notes && (
                <p className="text-sm text-white/60 mb-2">{metadata.mitigation_notes}</p>
              )}
              {metadata.mitigated_at && (
                <p className="text-xs text-white/30">
                  Mitigado em {new Date(metadata.mitigated_at).toLocaleString('pt-BR')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Related Documents */}
      {docs.length > 0 && (
        <Card className="premium-card border-white/10 bg-white/[0.035]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#2563EB]" />
              <CardTitle className="text-base">Documentos Relacionados</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {docs.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-white/5 hover:bg-white/[0.02] transition">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-white/40" />
                    <span className="text-sm">{doc.title}</span>
                  </div>
                  <Badge variant="outline" className="text-xs border-white/20 text-white/40">{doc.document_type}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {tool.status !== 'compliant' && tool.status !== 'mitigated' && (
        <div className="flex gap-3">
          <Button onClick={handleMarkCompliant} disabled={saving}
            className="bg-green-600 hover:bg-green-600/80">
            <CheckCircle2 className="w-4 h-4 mr-2" />Marcar como Conforme
          </Button>
        </div>
      )}
    </div>
  );
}
