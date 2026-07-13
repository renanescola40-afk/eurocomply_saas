'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Bot, Plus, Search, Download, ChevronDown, X,
  ArrowUpDown, ExternalLink,
} from 'lucide-react';
import {
  type RiskLevel,
  getRiskLabel,
} from '@/lib/risk-classifier';

interface AITool {
  id: string;
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

const RISK_OPTIONS = ['todos', 'unacceptable', 'high', 'limited', 'minimal'] as const;
const DEPT_OPTIONS = ['todos', 'RH', 'Vendas', 'Operacoes', 'TI', 'Juridico', 'Marketing', 'Outro'] as const;
const STATUS_OPTIONS = ['todos', 'review', 'compliant', 'non_compliant', 'mitigated'] as const;

function riskBadgeVariant(level: string | null) {
  switch (level) {
    case 'unacceptable': return 'bg-red-500/20 text-red-400 border-red-500/40';
    case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
    case 'limited': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
    case 'minimal': return 'bg-green-500/20 text-green-400 border-green-500/40';
    default: return 'bg-white/10 text-white/60 border-white/20';
  }
}

function statusBadgeVariant(status: string | null) {
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

function riskIcon(level: string | null) {
  switch (level) {
    case 'unacceptable': return '🚫';
    case 'high': return '🔴';
    case 'limited': return '🟡';
    case 'minimal': return '🟢';
    default: return '⚪';
  }
}

export default function InventarioPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-white/40">A carregar...</div>}>
      <InventarioContent />
    </Suspense>
  );
}

function InventarioContent() {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) ?? 'en';
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tools, setTools] = useState<AITool[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('todos');
  const [deptFilter, setDeptFilter] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [sortField, setSortField] = useState<'name' | 'risk_level' | 'created_at'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (!user) return;
    loadTools();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadTools = async () => {
    setLoading(true);
    try {
      const { data: memberData } = await (await import('@/integrations/supabase/client')).supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .maybeSingle();

      if (!memberData?.workspace_id) {
        setTools([]);
        return;
      }

      setWorkspaceId(memberData.workspace_id);

      const { data } = await (await import('@/integrations/supabase/client')).supabase
        .from('ai_tools')
        .select('*')
        .eq('workspace_id', memberData.workspace_id)
        .order('created_at', { ascending: false });

      setTools(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const filtered = tools
    .filter(t => {
      if (search && !t.name.toLowerCase().includes(search.toLowerCase()) &&
          !(t.vendor || '').toLowerCase().includes(search.toLowerCase())) return false;
      if (riskFilter !== 'todos' && t.risk_level !== riskFilter) return false;
      if (deptFilter !== 'todos' && t.department !== deptFilter) return false;
      if (statusFilter !== 'todos' && t.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      let va: any = a[sortField] ?? '';
      let vb: any = b[sortField] ?? '';
      if (sortField === 'created_at') {
        va = new Date(va).getTime();
        vb = new Date(vb).getTime();
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const riskCounts = {
    unacceptable: tools.filter(t => t.risk_level === 'unacceptable').length,
    high: tools.filter(t => t.risk_level === 'high').length,
    limited: tools.filter(t => t.risk_level === 'limited').length,
    minimal: tools.filter(t => t.risk_level === 'minimal').length,
  };

  const handleExportCsv = () => {
    const headers = ['Nome', 'Fornecedor', 'Departamento', 'Nível de Risco', 'Status', 'Data da Avaliação'];
    const rows = filtered.map(t => [
      t.name,
      t.vendor || '',
      t.department || '',
      getRiskLabel(t.risk_level as RiskLevel),
      statusLabel(t.status),
      new Date(t.created_at).toLocaleDateString('pt-BR'),
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventario-ia-risck-comply.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasFilters = riskFilter !== 'todos' || deptFilter !== 'todos' || statusFilter !== 'todos' || search;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Inventário de IA</h2>
          <p className="text-sm text-white/48">{tools.length} sistemas de IA registados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={filtered.length === 0}
            className="border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08] hover:text-white">
            <Download className="w-4 h-4 mr-2" />Exportar CSV
          </Button>
          <Button size="sm" onClick={() => router.push(`/${locale}/dashboard/inventario/novo`)} className="bg-white text-black hover:bg-white/90">
            <Plus className="w-4 h-4 mr-2" />Novo Caso
          </Button>
        </div>
      </div>

      {/* Risk Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Inaceitável', count: riskCounts.unacceptable, color: 'bg-red-500/10 border-red-500/30 text-red-400' },
          { label: 'Alto Risco', count: riskCounts.high, color: 'bg-orange-500/10 border-orange-500/30 text-orange-400' },
          { label: 'Risco Limitado', count: riskCounts.limited, color: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' },
          { label: 'Risco Mínimo', count: riskCounts.minimal, color: 'bg-green-500/10 border-green-500/30 text-green-400' },
        ].map(item => (
          <div key={item.label} className={`rounded-xl border px-4 py-3 ${item.color}`}>
            <p className="text-2xl font-bold">{item.count}</p>
            <p className="text-xs mt-1 opacity-70">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="premium-shell rounded-2xl p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              placeholder="Pesquisar por nome ou fornecedor..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-[#050505] border-white/10 text-white"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <select
                value={riskFilter}
                onChange={e => setRiskFilter(e.target.value)}
                className="h-10 rounded-md border border-white/10 bg-[#050505] px-3 pr-8 text-sm text-white appearance-none cursor-pointer"
              >
                <option value="todos">Risco: Todos</option>
                <option value="unacceptable">Inaceitável</option>
                <option value="high">Alto Risco</option>
                <option value="limited">Risco Limitado</option>
                <option value="minimal">Risco Mínimo</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={deptFilter}
                onChange={e => setDeptFilter(e.target.value)}
                className="h-10 rounded-md border border-white/10 bg-[#050505] px-3 pr-8 text-sm text-white appearance-none cursor-pointer"
              >
                <option value="todos">Dept: Todos</option>
                {DEPT_OPTIONS.filter(d => d !== 'todos').map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="h-10 rounded-md border border-white/10 bg-[#050505] px-3 pr-8 text-sm text-white appearance-none cursor-pointer"
              >
                <option value="todos">Status: Todos</option>
                <option value="review">Em revisão</option>
                <option value="compliant">Conforme</option>
                <option value="non_compliant">Não conforme</option>
                <option value="mitigated">Mitigado</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setRiskFilter('todos'); setDeptFilter('todos'); setStatusFilter('todos'); }}
                className="h-10 text-white/50 hover:text-white px-2">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <Card className="premium-card border-white/10 bg-white/[0.035]">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-white/40">A carregar...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Bot className="w-10 h-10 mx-auto text-white/20 mb-4" />
              <p className="text-white/48 mb-4">
                {hasFilters ? 'Nenhum sistema corresponde aos filtros.' : 'Nenhum sistema de IA registado.'}
              </p>
              {!hasFilters && (
                <Button variant="outline" onClick={() => router.push(`/${locale}/dashboard/inventario/novo`)} className="border-white/10 text-white/60 hover:text-white">
                  <Plus className="w-4 h-4 mr-2" />Criar primeiro caso
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-3 text-left">
                      <button onClick={() => handleSort('name')} className="flex items-center gap-1 text-xs font-medium text-white/40 uppercase tracking-wider hover:text-white">
                        Nome <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <span className="text-xs font-medium text-white/40 uppercase tracking-wider">Risco</span>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <span className="text-xs font-medium text-white/40 uppercase tracking-wider">Status</span>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <span className="text-xs font-medium text-white/40 uppercase tracking-wider">Departamento</span>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button onClick={() => handleSort('created_at')} className="flex items-center gap-1 text-xs font-medium text-white/40 uppercase tracking-wider hover:text-white">
                        Avaliado em <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <span className="text-xs font-medium text-white/40 uppercase tracking-wider"></span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(tool => (
                    <tr key={tool.id} className="border-b border-white/5 hover:bg-white/[0.02] transition cursor-pointer"
                      onClick={() => router.push(`/${locale}/dashboard/inventario/${tool.id}`)}>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 border border-white/10 flex items-center justify-center shrink-0">
                            <Bot className="w-4 h-4 text-[#2563EB]" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{tool.name}</p>
                            {tool.vendor && <p className="text-xs text-white/40">{tool.vendor}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{riskIcon(tool.risk_level)}</span>
                          <Badge className={`text-xs border ${riskBadgeVariant(tool.risk_level)}`}>
                            {getRiskLabel(tool.risk_level as RiskLevel)}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge className={`text-xs border ${statusBadgeVariant(tool.status)}`}>
                          {statusLabel(tool.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-white/60">
                        {tool.department || '—'}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-white/40">
                        {new Date(tool.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3.5">
                        <Button variant="ghost" size="sm" className="text-white/40 hover:text-white">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
