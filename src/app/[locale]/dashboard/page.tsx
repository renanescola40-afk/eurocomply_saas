'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  Bot, FileCheck, Database, Package, LogOut,
  Bell, Plus, AlertTriangle, CheckCircle, Clock,
  Shield, CreditCard, BarChart3, FileText, ClipboardList,
  Download as DownloadIcon, RefreshCw, X, ArrowRight, Activity, Mail, Scale, CalendarClock
} from 'lucide-react';
import { DEADLINES } from '@/lib/transparency-rules';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Workspace {
  id: string;
  name: string;
  plan?: string;
}

interface AITool {
  id: string;
  name: string;
  vendor?: string;
  department?: string;
  purpose?: string;
  risk_level: string;
  status: string;
  created_at: string;
}

interface Assessment {
  id: string;
  risk_score: number;
  risk_level: string;
  created_at: string;
}

interface ComplianceDocument {
  id: string;
  title: string;
  document_type: string;
  status: string;
  created_at: string;
}

interface MonitoringPreference {
  id?: string;
  email: string;
  regulatory_change_alerts: boolean;
  monthly_review_reminders: boolean;
  low_score_alerts: boolean;
}

interface RegulatoryUpdate {
  id: string;
  title: string;
  summary: string;
  severity: string;
  published_at: string;
}

interface AuditLog {
  id: string;
  action: string;
  user_id: string | null;
  created_at: string;
}

const dashboardNav = [
  { title: 'Overview', icon: BarChart3, id: 'overview' },
  { title: 'Inventário de IA', icon: Database, id: 'ai-inventory' },
  { title: 'Transparência', icon: Shield, id: 'transparency' },
  { title: 'Assessments', icon: ClipboardList, id: 'assessments' },
  { title: 'Documents', icon: FileText, id: 'documents' },
  { title: 'Procurement', icon: Package, id: 'procurement' },
  { title: 'Monitoramento', icon: Activity, id: 'monitoring' },
  { title: 'Billing', icon: CreditCard, id: 'billing' },
];

export default function DashboardPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) ?? 'en';
  const { user, session, loading: authLoading, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaceRole, setWorkspaceRole] = useState<string | null>(null);
  const [aiTools, setAITools] = useState<AITool[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [documents, setDocuments] = useState<ComplianceDocument[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [showNewToolModal, setShowNewToolModal] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [newToolData, setNewToolData] = useState({ name: '', risk_level: 'minimal', purpose: '' });
  const [monitoringPrefs, setMonitoringPrefs] = useState<MonitoringPreference>({
    email: '',
    regulatory_change_alerts: true,
    monthly_review_reminders: true,
    low_score_alerts: true,
  });
  const [regulatoryUpdates, setRegulatoryUpdates] = useState<RegulatoryUpdate[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/';
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const { data: memberData, error: memberError } = await supabase
        .from('workspace_members')
        .select('workspace_id, role, status')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .maybeSingle();

      if (memberError) throw memberError;

      if (!memberData?.workspace_id) {
        setWorkspace(null);
        setWorkspaceRole(null);
        setAITools([]);
        setAssessments([]);
        setDocuments([]);
        setAuditLogs([]);
      } else {
        const { data: workspaceData, error: workspaceError } = await supabase
          .from('workspaces')
          .select('*')
          .eq('id', memberData.workspace_id)
          .maybeSingle();

        if (workspaceError) throw workspaceError;

        if (!workspaceData) {
          setWorkspace(null);
          setWorkspaceRole(null);
          return;
        }

        setWorkspace(workspaceData);
        setWorkspaceRole(memberData.role || 'member');

        const { data: toolsData } = await supabase
          .from('ai_tools')
          .select('*')
          .eq('workspace_id', workspaceData.id)
          .order('created_at', { ascending: false });

        setAITools(toolsData || []);

        // Load assessments
        const { data: assessmentsData } = await supabase
          .from('ai_assessments')
          .select('*')
          .eq('workspace_id', workspaceData.id)
          .order('created_at', { ascending: false })
          .limit(10);

        setAssessments(assessmentsData || []);

        // Load documents
        const { data: documentsData } = await supabase
          .from('compliance_documents')
          .select('*')
          .eq('workspace_id', workspaceData.id)
          .order('created_at', { ascending: false });

        setDocuments(documentsData || []);

        const { data: prefsData } = await supabase
          .from('monitoring_preferences')
          .select('*')
          .eq('workspace_id', workspaceData.id)
          .eq('user_id', user?.id)
          .maybeSingle();

        setMonitoringPrefs({
          id: prefsData?.id,
          email: prefsData?.email || user?.email || '',
          regulatory_change_alerts: prefsData?.regulatory_change_alerts ?? true,
          monthly_review_reminders: prefsData?.monthly_review_reminders ?? true,
          low_score_alerts: prefsData?.low_score_alerts ?? true,
        });

        const { data: logsData } = await supabase
          .from('audit_logs')
          .select('*')
          .eq('workspace_id', workspaceData.id)
          .order('created_at', { ascending: false })
          .limit(20);

        setAuditLogs(logsData || []);
      }

      const { data: updatesData } = await supabase
        .from('regulatory_updates')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(5);

      setRegulatoryUpdates(updatesData || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  const handleCreateTool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace || !user) return;
    if (!canEditContent) {
      toast.error('Sem permissão para alterar este workspace');
      return;
    }

    try {
      const { error } = await supabase
        .from('ai_tools')
        .insert({
          workspace_id: workspace.id,
          owner_user_id: user.id,
          name: newToolData.name,
          purpose: newToolData.purpose,
          risk_level: newToolData.risk_level,
          status: 'review',
        });

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        workspace_id: workspace.id,
        user_id: user.id,
        action: 'Registrou sistema de IA',
        entity_type: 'ai_tool',
        metadata: { name: newToolData.name },
      });

      toast.success('Sistema de IA adicionado com sucesso');
      setShowNewToolModal(false);
      setNewToolData({ name: '', risk_level: 'minimal', purpose: '' });
      loadDashboardData();
    } catch (error) {
      toast.error('Erro ao criar sistema de IA');
      console.error(error);
    }
  };

  const handleCreateAssessment = async () => {
    if (!workspace) return;
    if (!canEditContent) {
      toast.error('Sem permissão para alterar este workspace');
      return;
    }

    try {
      const { error } = await supabase
        .from('ai_assessments')
        .insert({
          workspace_id: workspace.id,
          user_id: user?.id,
          title: 'AI Usage Assessment',
          status: 'completed',
          risk_score: Math.floor(Math.random() * 30) + 70,
          risk_level: ['minimal', 'limited', 'high'][Math.floor(Math.random() * 3)],
          recommendations: [],
          completed_at: new Date().toISOString(),
        });

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        workspace_id: workspace.id,
        user_id: user?.id,
        action: 'Reavaliou compliance de IA',
        entity_type: 'ai_assessment',
        metadata: { source: 'monitoring' },
      });

      toast.success('Assessment criado com sucesso');
      loadDashboardData();
    } catch (error) {
      toast.error('Erro ao criar assessment');
    }
  };

  const handleCreateDocument = async (type: string) => {
    if (!workspace) return;
    if (!canEditContent) {
      toast.error('Sem permissão para alterar este workspace');
      return;
    }

    try {
      const { error } = await supabase
        .from('compliance_documents')
        .insert({
          workspace_id: workspace.id,
          user_id: user?.id,
          title: `Documento ${type}`,
          document_type: type,
          status: 'draft',
          language: 'pt',
          content: {},
        });

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        workspace_id: workspace.id,
        user_id: user?.id,
        action: 'Gerou documento de compliance',
        entity_type: 'compliance_document',
        metadata: { document_type: type },
      });

      toast.success('Documento criado com sucesso');
      loadDashboardData();
    } catch (error) {
      toast.error('Erro ao criar documento');
    }
  };

  const recentRegulatoryUpdates = regulatoryUpdates.filter((update) => {
    const publishedAt = new Date(update.published_at).getTime();
    return Date.now() - publishedAt <= 30 * 24 * 60 * 60 * 1000;
  });
  const latestAssessment = assessments[0];
  const monthsSinceLastAssessment = latestAssessment
    ? Math.max(0, Math.floor((Date.now() - new Date(latestAssessment.created_at).getTime()) / (30 * 24 * 60 * 60 * 1000)))
    : 6;
  const lastAssessmentScore = latestAssessment?.risk_score ?? 65;
  const lawChangeScore = recentRegulatoryUpdates.length > 0 ? 55 : 100;
  const recencyScore = Math.max(0, 100 - monthsSinceLastAssessment * 5);
  const complianceScore = Math.max(0, Math.min(100, Math.round(
    lastAssessmentScore * 0.4 + lawChangeScore * 0.3 + recencyScore * 0.3
  )));
  const canManageWorkspace = workspaceRole === 'owner' || workspaceRole === 'admin';
  const canEditContent = workspaceRole === 'owner' || workspaceRole === 'admin' || workspaceRole === 'member';
  const canUseMonitoring = canEditContent && (workspace?.plan === 'growth' || workspace?.plan === 'enterprise');

  const riskCounts = {
    high: aiTools.filter(t => t.risk_level === 'high' || t.risk_level === 'unacceptable').length,
    medium: aiTools.filter(t => t.risk_level === 'limited').length,
    low: aiTools.filter(t => t.risk_level === 'minimal').length,
  };

  const handleSaveMonitoringPrefs = async () => {
    if (!workspace || !user) return;
    if (!canUseMonitoring) {
      toast.error('Monitoramento disponível apenas no plano Growth ou Enterprise');
      return;
    }

    try {
      const { error } = await supabase
        .from('monitoring_preferences')
        .upsert({
          workspace_id: workspace.id,
          user_id: user.id,
          email: monitoringPrefs.email || user.email || '',
          regulatory_change_alerts: monitoringPrefs.regulatory_change_alerts,
          monthly_review_reminders: monitoringPrefs.monthly_review_reminders,
          low_score_alerts: monitoringPrefs.low_score_alerts,
        });

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        workspace_id: workspace.id,
        user_id: user.id,
        action: 'Atualizou alertas de monitoramento',
        entity_type: 'monitoring_preferences',
        metadata: { email: monitoringPrefs.email },
      });

      toast.success('Preferências de monitoramento salvas');
      loadDashboardData();
    } catch (error) {
      toast.error('Erro ao salvar preferências');
    }
  };

  const handleReassessNow = async () => {
    if (!canUseMonitoring) {
      toast.error('Monitoramento disponível apenas no plano Growth ou Enterprise');
      return;
    }
    setActiveTab('assessments');
    await handleCreateAssessment();
  };

  const handleCheckout = async (plan: 'starter' | 'growth' | 'enterprise') => {
    if (!workspace || !session?.access_token) {
      toast.error('Sessão inválida para iniciar checkout');
      return;
    }

    setCheckoutLoading(plan);
    try {
      const response = await fetch('/next_api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan, workspaceId: workspace.id }),
      });

      const data = await response.json();
      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Falha ao iniciar checkout');
      }

      window.location.href = data.url;
    } catch (error) {
      toast.error('Não foi possível iniciar o checkout');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleExportAuditCsv = () => {
    const header = ['Data', 'Ação', 'Usuário'];
    const rows = auditLogs.map((log) => [
      new Date(log.created_at).toLocaleString('pt-BR'),
      log.action,
      log.user_id || 'Sistema',
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'audit-logs-eurocomply.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const ProBadge = () => (
    <Badge variant="outline" className="border-[#2563EB]/30 bg-[#2563EB]/5 text-[#2563EB]">
      Plano Profissional ou superior necessário
    </Badge>
  );

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
        <div className="premium-shell flex flex-col items-center gap-4 rounded-3xl px-10 py-8">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#2563EB] border-t-transparent" />
          <p className="text-sm text-white/50">Inicializando console enterprise...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider defaultOpen>
      <div className="pointer-events-none fixed inset-0 z-0 tech-grid opacity-40" />
      <div className="pointer-events-none fixed right-0 top-0 z-0 h-96 w-96 rounded-full bg-[#2563EB]/10 blur-[110px]" />
      <Sidebar className="border-r border-white/10 bg-[#050505]/92 text-white backdrop-blur-2xl">
        <SidebarHeader className="border-b border-white/10">
          <div className="flex items-center gap-3 px-4 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] shadow-2xl shadow-blue-500/10">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="font-semibold tracking-tight text-white">EuroComply AI</span>
              {workspace && <p className="max-w-[140px] truncate text-xs text-white/42">{workspace.name}</p>}
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {dashboardNav.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={activeTab === item.id}
                      onClick={() => setActiveTab(item.id)}
                      className="cursor-pointer rounded-xl text-white/58 transition hover:bg-white/[0.06] hover:text-white data-[active=true]:bg-white/[0.08] data-[active=true]:text-white"
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-white/10">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleSignOut} className="cursor-pointer text-red-500">
                <LogOut className="w-4 h-4" />
                <span>Sair</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="relative z-10 bg-transparent text-white">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-white/10 bg-[#050505]/76 px-6 backdrop-blur-2xl">
          <SidebarTrigger className="text-white/70" />
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/34">Enterprise console</p>
            <h1 className="text-lg font-semibold tracking-tight text-white">
              {dashboardNav.find(n => n.id === activeTab)?.title || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08] hover:text-white" onClick={() => window.location.href = '/'}>
              <ArrowRight className="mr-2 h-4 w-4" />
              Site
            </Button>
            <Button size="sm" className="bg-white text-black hover:bg-white/90">
              <Bell className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <div className="space-y-6 p-6">
          {activeTab === 'overview' && (
            <>
              <div className="premium-shell overflow-hidden rounded-[1.75rem] p-7">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-white/36">AI governance operating layer</p>
                    <h2 className="mt-3 text-4xl font-semibold tracking-[-0.055em] text-white">Compliance readiness em tempo real.</h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-white/52">Inventário, avaliações, documentação e monitoramento contínuo em uma interface construída para decisões executivas.</p>
                  </div>
                  <Badge className="w-fit rounded-full bg-[#2563EB]/18 text-blue-100">Live console</Badge>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="premium-card premium-card-hover border-white/10 bg-white/[0.035] text-white">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-white/48">Compliance Score</CardTitle>
                    <Shield className="w-4 h-4 text-[#2563EB]" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{complianceScore}%</div>
                    <Progress value={complianceScore} className="mt-2 h-2" />
                    <p className="text-xs text-white/48 mt-1">+5% este mês</p>
                  </CardContent>
                </Card>
                <Card className="premium-card premium-card-hover border-white/10 bg-white/[0.035] text-white">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-white/48">AI Risk Score</CardTitle>
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{riskCounts.high > 0 ? 'Medium' : 'Low'}</div>
                    <div className="flex gap-2 mt-2">
                      {riskCounts.high > 0 && <Badge variant="destructive">{riskCounts.high} High</Badge>}
                      {riskCounts.medium > 0 && <Badge variant="outline">{riskCounts.medium} Med</Badge>}
                      <Badge variant="secondary">{riskCounts.low} Low</Badge>
                    </div>
                  </CardContent>
                </Card>
                <Card className="premium-card premium-card-hover border-white/10 bg-white/[0.035] text-white">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-white/48">AI Systems</CardTitle>
                    <Bot className="w-4 h-4 text-[#2563EB]" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{aiTools.length}</div>
                    <p className="text-xs text-white/48">Sistemas registrados</p>
                  </CardContent>
                </Card>
                <Card className="premium-card premium-card-hover border-white/10 bg-white/[0.035] text-white">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-white/48">Documentos</CardTitle>
                    <FileText className="w-4 h-4 text-[#2563EB]" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{documents.length}</div>
                    <p className="text-xs text-white/48">{documents.filter(d => d.status === 'draft').length} rascunhos</p>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" onClick={() => setShowNewToolModal(true)}>
                  <Plus className="w-5 h-5" />
                  <span>Adicionar Sistema AI</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" onClick={handleCreateAssessment}>
                  <ClipboardList className="w-5 h-5" />
                  <span>Novo Assessment</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" onClick={() => handleCreateDocument('policy')}>
                  <FileCheck className="w-5 h-5" />
                  <span>Gerar Política</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" onClick={() => setActiveTab('billing')}>
                  <CreditCard className="w-5 h-5" />
                  <span>Verificar Plano</span>
                </Button>
              </div>

              {/* Recent Activity */}
              <Card className="premium-card premium-card-hover border-white/10 bg-white/[0.035] text-white">
                <CardHeader>
                  <CardTitle>Atividade Recente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {assessments.slice(0, 5).map((assessment) => (
                      <div key={assessment.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${assessment.risk_level === 'minimal' ? 'bg-green-100' : assessment.risk_level === 'limited' ? 'bg-yellow-100' : 'bg-red-100'}`}>
                            <CheckCircle className={`w-4 h-4 ${assessment.risk_level === 'minimal' ? 'text-green-600' : assessment.risk_level === 'limited' ? 'text-yellow-600' : 'text-red-600'}`} />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Assessment #{assessment.id.slice(0, 8)}</p>
                            <p className="text-xs text-white/48">
                              Score: {assessment.risk_score}% • {assessment.risk_level}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-white/48">
                          {new Date(assessment.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    ))}
                    {assessments.length === 0 && (
                      <p className="text-sm text-white/48 text-center py-4">
                        Nenhuma atividade ainda. Comece adicionando um sistema de IA.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Readiness Checklist */}
              <Card className="premium-card premium-card-hover border-white/10 bg-white/[0.035] text-white">
                <CardHeader>
                  <CardTitle>Checklist de Preparação EU AI Act</CardTitle>
                  <CardDescription>Passos essenciais para conformidade</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { task: 'Registrar todos os sistemas de IA', done: aiTools.length > 0 },
                      { task: 'Realizar assessments de risco', done: assessments.length > 0 },
                      { task: 'Gerar políticas de IA', done: documents.some(d => d.document_type === 'policy') },
                      { task: 'Criar procurement passports', done: documents.some(d => d.document_type === 'procurement_passport') },
                      { task: 'Revisar documentos com stakeholders', done: documents.some(d => d.status === 'review') },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        {item.done ? (
                          <CheckCircle className="w-5 h-5 text-[#10B981]" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />
                        )}
                        <span className={item.done ? 'text-white/48 line-through' : 'text-white'}>
                          {item.task}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === 'ai-inventory' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Inventário de IA</h2>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/${locale}/dashboard/inventario`)}
                    className="border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08] hover:text-white"
                  >
                    <Database className="w-4 h-4 mr-2" />
                    Ver Inventário Completo
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => router.push(`/${locale}/dashboard/inventario/novo`)}
                    className="bg-white text-black hover:bg-white/90"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Caso
                  </Button>
                </div>
              </div>

              {/* Risk Summary */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Inaceitável', count: aiTools.filter(t => t.risk_level === 'unacceptable').length, color: 'border-red-500/30 text-red-400 bg-red-500/10' },
                  { label: 'Alto Risco', count: aiTools.filter(t => t.risk_level === 'high').length, color: 'border-orange-500/30 text-orange-400 bg-orange-500/10' },
                  { label: 'Risco Limitado', count: aiTools.filter(t => t.risk_level === 'limited').length, color: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10' },
                  { label: 'Risco Mínimo', count: aiTools.filter(t => t.risk_level === 'minimal').length, color: 'border-green-500/30 text-green-400 bg-green-500/10' },
                ].map(item => (
                  <div key={item.label} className={`rounded-xl border px-4 py-3 ${item.color}`}>
                    <p className="text-2xl font-bold">{item.count}</p>
                    <p className="text-xs mt-1 opacity-70">{item.label}</p>
                  </div>
                ))}
              </div>

              {/* Recent Tools */}
              <Card className="premium-card premium-card-hover border-white/10 bg-white/[0.035] text-white">
                <CardContent className="p-0">
                  <div className="divide-y divide-white/10">
                    {aiTools.slice(0, 10).map((tool) => (
                      <div key={tool.id} className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.02] transition"
                        onClick={() => router.push(`/${locale}/dashboard/inventario/${tool.id}`)}>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-[#2563EB]/10 rounded-lg flex items-center justify-center">
                            <Bot className="w-5 h-5 text-[#2563EB]" />
                          </div>
                          <div>
                            <p className="font-medium">{tool.name}</p>
                            <p className="text-sm text-white/48">
                              {tool.department || '—'} · {new Date(tool.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={tool.risk_level === 'unacceptable' ? 'destructive' : tool.risk_level === 'high' ? 'destructive' : tool.risk_level === 'limited' ? 'outline' : 'secondary'}>
                            {tool.risk_level === 'unacceptable' ? '🚫 Inaceitável' :
                             tool.risk_level === 'high' ? '🔴 Alto' :
                             tool.risk_level === 'limited' ? '🟡 Limitado' : '🟢 Mínimo'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {aiTools.length === 0 && (
                      <div className="p-8 text-center">
                        <Bot className="w-12 h-12 mx-auto text-white/20 mb-4" />
                        <p className="text-white/48 mb-4">Nenhum sistema de IA registado.</p>
                        <Button variant="outline" onClick={() => router.push(`/${locale}/dashboard/inventario/novo`)}
                          className="border-white/10 text-white/60 hover:text-white">
                          Criar primeiro caso
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'transparency' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Gestão de Transparência</h2>
                  <p className="text-sm text-white/48">Artigo 50.º — Obrigações de transparência EU AI Act</p>
                </div>
                <Button onClick={() => router.push(`/${locale}/dashboard/transparencia`)} className="bg-white text-black hover:bg-white/90">
                  <Shield className="w-4 h-4 mr-2" />
                  Abrir Módulo Completo
                </Button>
              </div>
              <div className="premium-shell rounded-2xl border border-[#2563EB]/30 p-6">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-[#2563EB] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-[#2563EB] mb-1">Artigo 50 — Afeta ~33% de todas as empresas</h3>
                    <p className="text-sm text-white/60 leading-relaxed">
                      O Artigo 50.º do EU AI Act é a obrigação de transparência mais ampla do regulamento. Afeta qualquer empresa com chatbots, assistentes virtuais, geração de conteúdo por IA ou reconhecimento de emoções.
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {([
                  { art: 'Art. 50.1', title: 'Interação Direta', desc: 'Chatbots, IVR, website', deadline: '2 ago 2026', urgent: true },
                  { art: 'Art. 50.2', title: 'Conteúdo Sintético', desc: 'Imagens, vídeo, texto gerado', deadline: '2 dez 2026', urgent: false },
                  { art: 'Art. 50.3', title: 'Reconhecimento Emoções', desc: 'Verificar uso proibido (Art. 5)', deadline: '2 ago 2026', urgent: true },
                  { art: 'Art. 50.4', title: 'Deepfakes e Texto Público', desc: 'Disclosures + revisão humana', deadline: '2 ago 2026', urgent: true },
                ] as const).map(item => (
                  <Card key={item.art} className="premium-card border-white/10 bg-white/[0.035]">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs border-[#2563EB]/40 text-[#2563EB]">{item.art}</Badge>
                        {item.urgent && <Badge className="text-xs bg-red-500/20 text-red-400 border-red-500/40">Urgente</Badge>}
                      </div>
                      <CardTitle className="text-base mt-1">{item.title}</CardTitle>
                      <p className="text-xs text-white/40">{item.desc}</p>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-white/30">Prazo: <span className="text-white/60">{item.deadline}</span></p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'assessments' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Assessments de Risco</h2>
                <Button onClick={handleCreateAssessment} className="bg-white text-black hover:bg-white/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Assessment
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {assessments.map((assessment) => (
                  <Card key={assessment.id} className="premium-card premium-card-hover border-white/10 bg-white/[0.035] text-white">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <Badge variant={assessment.risk_level === 'high' ? 'destructive' : assessment.risk_level === 'limited' ? 'outline' : 'secondary'}>
                          {assessment.risk_level}
                        </Badge>
                        <span className="text-xs text-white/48">
                          {new Date(assessment.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold mb-2">{assessment.risk_score}%</div>
                      <Progress value={assessment.risk_score} className="h-2" />
                      <p className="text-sm text-white/48 mt-2">Score de conformidade</p>
                    </CardContent>
                  </Card>
                ))}
                {assessments.length === 0 && (
                  <div className="col-span-full p-8 text-center">
                    <ClipboardList className="w-12 h-12 mx-auto text-white/48/30 mb-4" />
                    <p className="text-white/48">Nenhum assessment realizado ainda.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Documentos de Compliance</h2>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleCreateDocument('policy')}>
                    <FileCheck className="w-4 h-4 mr-2" />
                    Nova Política
                  </Button>
                  <Button onClick={() => handleCreateDocument('assessment_report')} className="bg-white text-black hover:bg-white/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Relatório
                  </Button>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {documents.map((doc) => (
                  <Card key={doc.id} className="premium-card premium-card-hover border-white/10 bg-white/[0.035] text-white">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <Badge variant={doc.status === 'published' ? 'default' : 'outline'}>
                          {doc.status}
                        </Badge>
                        <FileText className="w-5 h-5 text-white/48" />
                      </div>
                      <CardTitle className="text-base">{doc.title}</CardTitle>
                      <CardDescription>{doc.document_type}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-white/48">
                        {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </CardContent>
                  </Card>
                ))}
                {documents.length === 0 && (
                  <div className="col-span-full p-8 text-center">
                    <FileText className="w-12 h-12 mx-auto text-white/48/30 mb-4" />
                    <p className="text-white/48">Nenhum documento criado ainda.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'procurement' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Procurement Passports</h2>
                <Button onClick={() => handleCreateDocument('procurement_passport')} className="bg-white text-black hover:bg-white/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Passport
                </Button>
              </div>
              <Card className="premium-card premium-card-hover border-white/10 bg-white/[0.035] text-white">
                <CardContent className="p-6">
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 mx-auto text-white/48/30 mb-4" />
                    <p className="text-white/48 mb-4">
                      Procurement Passports documentam a conformidade de fornecedores e sistemas adquiridos.
                    </p>
                    <Button variant="outline" onClick={() => handleCreateDocument('procurement_passport')}>
                      Criar primeiro passport
                    </Button>
                  </div>
                </CardContent>
              </Card>
              {documents.filter(d => d.document_type === 'procurement_passport').length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  {documents.filter(d => d.document_type === 'procurement_passport').map((doc) => (
                    <Card key={doc.id} className="premium-card premium-card-hover border-white/10 bg-white/[0.035] text-white">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base">{doc.title}</CardTitle>
                        <Badge variant={doc.status === 'published' ? 'default' : 'outline'}>{doc.status}</Badge>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-white/48">
                          Criado em {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'monitoring' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Monitoramento Contínuo</h2>
                  <p className="text-sm text-white/48">Acompanhe mudanças regulatórias, queda de score e trilha de auditoria.</p>
                </div>
                {!canUseMonitoring && <ProBadge />}
              </div>

              <Card className="overflow-hidden border-[#2563EB]/20">
                <CardHeader className="bg-[#0F172A] text-white">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Scale className="h-5 w-5 text-[#10B981]" />
                        <CardTitle>EU AI Act Tracker</CardTitle>
                      </div>
                      <CardDescription className="text-slate-300">
                        {recentRegulatoryUpdates.length > 0
                          ? 'Nova diretriz publicada. Sua empresa precisa reavaliar?'
                          : 'Nenhuma atualização regulatória relevante nos últimos 30 dias.'}
                      </CardDescription>
                    </div>
                    <Button onClick={handleReassessNow} disabled={!canUseMonitoring} className="bg-white text-[#0F172A] hover:bg-slate-100">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reavaliar agora
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg border border-white/10 p-4">
                      <p className="text-sm text-white/48">Atualizações em 30 dias</p>
                      <p className="mt-2 text-3xl font-semibold">{recentRegulatoryUpdates.length}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 p-4 md:col-span-2">
                      <p className="text-sm font-medium">{regulatoryUpdates[0]?.title || 'Tracker regulatório ativo'}</p>
                      <p className="mt-2 text-sm text-white/48">{regulatoryUpdates[0]?.summary || 'O sistema monitora mudanças relevantes para readiness e documentação.'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="premium-card premium-card-hover border-white/10 bg-white/[0.035] text-white">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <CardTitle>Score de Compliance Dinâmico</CardTitle>
                        <CardDescription>Calculado com avaliação, mudanças legais e tempo desde a reavaliação.</CardDescription>
                      </div>
                      {!canUseMonitoring && <ProBadge />}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-5xl font-semibold tracking-tight">{complianceScore}%</p>
                        <p className="text-sm text-white/48">Score atual</p>
                      </div>
                      <Badge variant={complianceScore < 70 ? 'destructive' : 'default'} className={complianceScore >= 70 ? 'bg-[#10B981]' : ''}>
                        {complianceScore < 70 ? 'Atenção necessária' : 'Dentro do esperado'}
                      </Badge>
                    </div>
                    <Progress value={complianceScore} className="h-2" />
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-white/48">Última avaliação · peso 40%</span>
                        <span className="font-medium">{lastAssessmentScore}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white/48">Mudança regulatória · peso 30%</span>
                        <span className="font-medium">{lawChangeScore}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white/48">Recência · peso 30%</span>
                        <span className="font-medium">{recencyScore}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="premium-card premium-card-hover border-white/10 bg-white/[0.035] text-white">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <CardTitle>Alertas por Email</CardTitle>
                        <CardDescription>Configure sinais que mantêm a equipa em revisão contínua.</CardDescription>
                      </div>
                      {!canUseMonitoring && <ProBadge />}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Email para alertas</label>
                      <Input
                        className="mt-1"
                        value={monitoringPrefs.email}
                        disabled={!canUseMonitoring}
                        onChange={(e) => setMonitoringPrefs({ ...monitoringPrefs, email: e.target.value })}
                      />
                    </div>
                    {[
                      ['regulatory_change_alerts', 'Alertas de mudanças no EU AI Act'],
                      ['monthly_review_reminders', 'Lembrete mensal para revisar IAs'],
                      ['low_score_alerts', 'Aviso quando score cair abaixo de 70%'],
                    ].map(([key, label]) => (
                      <label key={key} className="flex items-center gap-3 rounded-lg border border-white/10 p-3 text-sm">
                        <input
                          type="checkbox"
                          disabled={!canUseMonitoring}
                          checked={Boolean(monitoringPrefs[key as keyof MonitoringPreference])}
                          onChange={(e) => setMonitoringPrefs({ ...monitoringPrefs, [key]: e.target.checked })}
                          className="h-4 w-4 accent-[#2563EB]"
                        />
                        {label}
                      </label>
                    ))}
                    <Button onClick={handleSaveMonitoringPrefs} disabled={!canUseMonitoring} className="w-full bg-white text-black hover:bg-white/90">
                      <Mail className="mr-2 h-4 w-4" />
                      Salvar alertas
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Card className="premium-card premium-card-hover border-white/10 bg-white/[0.035] text-white">
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle>Logs de Auditoria</CardTitle>
                      <CardDescription>Histórico operacional para auditorias, procurement e governance.</CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {!canUseMonitoring && <ProBadge />}
                      <Button variant="outline" onClick={handleExportAuditCsv} disabled={!canUseMonitoring || auditLogs.length === 0}>
                        <DownloadIcon className="mr-2 h-4 w-4" />
                        Exportar CSV
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-hidden rounded-lg border border-white/10">
                    <div className="grid grid-cols-3 bg-white/[0.05] px-4 py-3 text-xs font-medium uppercase tracking-wide text-white/48">
                      <span>Data</span>
                      <span>Ação</span>
                      <span>Usuário</span>
                    </div>
                    <div className="divide-y divide-white/10">
                      {auditLogs.map((log) => (
                        <div key={log.id} className="grid grid-cols-3 px-4 py-3 text-sm">
                          <span className="text-white/48">{new Date(log.created_at).toLocaleDateString('pt-BR')}</span>
                          <span>{log.action}</span>
                          <span className="truncate text-white/48">{log.user_id || 'Sistema'}</span>
                        </div>
                      ))}
                      {auditLogs.length === 0 && (
                        <div className="px-4 py-8 text-center text-sm text-white/48">
                          Nenhum log registrado ainda.
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Plano e Billing</h2>
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="premium-card premium-card-hover border-white/10 bg-white/[0.035] text-white">
                  <CardHeader>
                    <CardTitle>Plano Atual</CardTitle>
                    <CardDescription>Seu plano de assinatura</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-white/48">Plano</span>
                      <Badge className="bg-[#2563EB]">{workspace?.plan === 'enterprise' ? 'Enterprise' : workspace?.plan === 'growth' ? 'Growth' : 'Starter'}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/48">Preço</span>
                      <span className="font-semibold">{workspace?.plan === 'enterprise' ? '€799/mês' : workspace?.plan === 'growth' ? '€199/mês' : '€49/mês'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/48">Próximo billing</span>
                      <span>{new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled={checkoutLoading !== null || !canManageWorkspace}
                        onClick={() => handleCheckout('growth')}
                      >
                        {checkoutLoading === 'growth' ? 'A iniciar...' : 'Upgrade Growth'}
                      </Button>
                      <Button
                        className="w-full bg-white text-black hover:bg-white/90"
                        disabled={checkoutLoading !== null || !canManageWorkspace}
                        onClick={() => handleCheckout('enterprise')}
                      >
                        {checkoutLoading === 'enterprise' ? 'A iniciar...' : 'Upgrade Enterprise'}
                      </Button>
                    </div>
                    {!canManageWorkspace && (
                      <p className="text-xs text-white/48">Apenas owners e admins podem alterar billing.</p>
                    )}
                  </CardContent>
                </Card>
                <Card className="premium-card premium-card-hover border-white/10 bg-white/[0.035] text-white">
                  <CardHeader>
                    <CardTitle>Uso</CardTitle>
                    <CardDescription>Recursos utilizados</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/48">Sistemas de IA</span>
                        <span>{aiTools.length} / 25</span>
                      </div>
                      <Progress value={(aiTools.length / 25) * 100} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/48">Workspaces</span>
                        <span>1 / 5</span>
                      </div>
                      <Progress value={20} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/48">Documentos</span>
                        <span>{documents.length} / ∞</span>
                      </div>
                      <Progress value={100} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </SidebarInset>

      {/* New Tool Modal */}
      {showNewToolModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xl">
          <div className="premium-shell w-full max-w-md rounded-[1.75rem]">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-lg font-semibold">Adicionar Sistema de IA</h2>
              <button onClick={() => setShowNewToolModal(false)} className="text-white/48 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTool} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium">Nome do Sistema</label>
                <Input
                  placeholder="Ex: Customer Chatbot v2"
                  value={newToolData.name}
                  onChange={(e) => setNewToolData({ ...newToolData, name: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Nível de Risco</label>
                <select
                  className="mt-1 w-full h-10 rounded-md border border-input bg-[#050505] px-3 text-sm"
                  value={newToolData.risk_level}
                  onChange={(e) => setNewToolData({ ...newToolData, risk_level: e.target.value })}
                >
                  <option value="minimal">Minimal</option>
                  <option value="limited">Limited</option>
                  <option value="high">High</option>
                  <option value="unacceptable">Unacceptable</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Descrição</label>
                <textarea
                  className="mt-1 w-full rounded-md border border-input bg-[#050505] px-3 py-2 text-sm min-h-[80px]"
                  placeholder="Descreva brevemente o sistema..."
                  value={newToolData.purpose}
                  onChange={(e) => setNewToolData({ ...newToolData, purpose: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full bg-white text-black hover:bg-white/90">
                Adicionar Sistema
              </Button>
            </form>
          </div>
        </div>
      )}
    </SidebarProvider>
  );
}
