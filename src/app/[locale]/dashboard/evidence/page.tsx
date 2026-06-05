'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Plus, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { createEvidenceItem, summarizeEvidence, tryListEvidenceItems, type EvidenceItem, type EvidenceType } from '@/lib/evidence/storage';

const copy = {
  en: {
    back: 'Back to dashboard',
    badge: 'Evidence Vault',
    title: 'Audit evidence center',
    subtitle: 'Register policies, procedures, risk assessments and proof linked to EU AI Act articles.',
    titleInput: 'Evidence title',
    ownerInput: 'Owner or team',
    articlesInput: 'Articles, e.g. Article 9, Article 14',
    add: 'Add evidence',
    coverage: 'Evidence Coverage',
    valid: 'Valid evidence',
    review: 'Needs review',
    expired: 'Expired',
    recent: 'Recent evidence',
    empty: 'No evidence yet. Add your first policy or procedure.',
  },
  pt: {
    back: 'Voltar ao dashboard',
    badge: 'Evidence Vault',
    title: 'Centro de evidências de auditoria',
    subtitle: 'Registre políticas, procedimentos, avaliações de risco e provas ligadas aos artigos do EU AI Act.',
    titleInput: 'Título da evidência',
    ownerInput: 'Responsável ou equipe',
    articlesInput: 'Artigos, ex: Article 9, Article 14',
    add: 'Adicionar evidência',
    coverage: 'Cobertura de evidências',
    valid: 'Evidências válidas',
    review: 'Precisam revisão',
    expired: 'Expiradas',
    recent: 'Evidências recentes',
    empty: 'Nenhuma evidência ainda. Adicione sua primeira política ou procedimento.',
  },
  es: {
    back: 'Volver al dashboard',
    badge: 'Evidence Vault',
    title: 'Centro de evidencias de auditoría',
    subtitle: 'Registra políticas, procedimientos, evaluaciones de riesgo y pruebas vinculadas al EU AI Act.',
    titleInput: 'Título de la evidencia',
    ownerInput: 'Responsable o equipo',
    articlesInput: 'Artículos, ej: Article 9, Article 14',
    add: 'Agregar evidencia',
    coverage: 'Cobertura de evidencias',
    valid: 'Evidencias válidas',
    review: 'Requieren revisión',
    expired: 'Expiradas',
    recent: 'Evidencias recientes',
    empty: 'Aún no hay evidencias. Agrega tu primera política o procedimiento.',
  },
  fr: {
    back: 'Retour au dashboard',
    badge: 'Evidence Vault',
    title: 'Centre de preuves audit',
    subtitle: 'Enregistrez politiques, procédures, évaluations de risque et preuves liées à l’EU AI Act.',
    titleInput: 'Titre de la preuve',
    ownerInput: 'Responsable ou équipe',
    articlesInput: 'Articles, ex : Article 9, Article 14',
    add: 'Ajouter une preuve',
    coverage: 'Couverture des preuves',
    valid: 'Preuves valides',
    review: 'À revoir',
    expired: 'Expirées',
    recent: 'Preuves récentes',
    empty: 'Aucune preuve pour le moment. Ajoutez votre première politique ou procédure.',
  },
  it: {
    back: 'Torna alla dashboard',
    badge: 'Evidence Vault',
    title: 'Centro evidenze audit',
    subtitle: 'Registra policy, procedure, risk assessment e prove collegate agli articoli EU AI Act.',
    titleInput: 'Titolo evidenza',
    ownerInput: 'Responsabile o team',
    articlesInput: 'Articoli, es: Article 9, Article 14',
    add: 'Aggiungi evidenza',
    coverage: 'Copertura evidenze',
    valid: 'Evidenze valide',
    review: 'Da revisionare',
    expired: 'Scadute',
    recent: 'Evidenze recenti',
    empty: 'Nessuna evidenza. Aggiungi la prima policy o procedura.',
  },
  de: {
    back: 'Zurück zum Dashboard',
    badge: 'Evidence Vault',
    title: 'Audit-Nachweiszentrum',
    subtitle: 'Erfassen Sie Richtlinien, Verfahren, Risikoanalysen und Nachweise zu EU-AI-Act-Artikeln.',
    titleInput: 'Nachweistitel',
    ownerInput: 'Owner oder Team',
    articlesInput: 'Artikel, z. B. Article 9, Article 14',
    add: 'Nachweis hinzufügen',
    coverage: 'Nachweisabdeckung',
    valid: 'Gültige Nachweise',
    review: 'Prüfung nötig',
    expired: 'Abgelaufen',
    recent: 'Aktuelle Nachweise',
    empty: 'Noch keine Nachweise. Fügen Sie die erste Richtlinie oder das erste Verfahren hinzu.',
  },
} as const;

type Locale = keyof typeof copy;

export default function EvidenceVaultPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const locale = ((params.locale as string) in copy ? params.locale : 'pt') as Locale;
  const t = copy[locale];

  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [title, setTitle] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [articleRefs, setArticleRefs] = useState('Article 9');
  const [evidenceType, setEvidenceType] = useState<EvidenceType>('policy');
  const [saving, setSaving] = useState(false);

  const summary = useMemo(() => summarizeEvidence(items), [items]);

  async function loadEvidence() {
    if (!user?.id) return;
    const evidence = await tryListEvidenceItems({ userId: user.id, limit: 50 });
    setItems(evidence);
  }

  useEffect(() => {
    loadEvidence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function handleCreateEvidence() {
    if (!user?.id || !title.trim()) return;
    setSaving(true);
    const refs = articleRefs.split(',').map((item) => item.trim()).filter(Boolean);
    await createEvidenceItem({
      userId: user.id,
      title: title.trim(),
      ownerName: ownerName.trim() || undefined,
      evidenceType,
      articleRefs: refs,
      status: 'draft',
    });
    setTitle('');
    setOwnerName('');
    setSaving(false);
    await loadEvidence();
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.24),transparent_34rem)]" />
      <div className="relative mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <Button variant="ghost" onClick={() => router.push(`/${locale}/dashboard`)} className="mb-6 text-white/70 hover:text-white">
          <ArrowLeft className="mr-2 h-4 w-4" /> {t.back}
        </Button>

        <section className="mb-8 rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-7 shadow-2xl shadow-blue-950/20">
          <Badge className="mb-4 border-white/10 bg-white/[0.06] text-white/70">{t.badge}</Badge>
          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">{t.title}</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-white/58">{t.subtitle}</p>
        </section>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-white/10 bg-white/[0.045] text-white">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-white/50">{t.coverage}</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{summary.coverage}%</div><Progress value={summary.coverage} className="mt-3 h-2" /></CardContent>
          </Card>
          <Card className="border-white/10 bg-white/[0.045] text-white">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-white/50">{t.valid}</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{summary.valid}</div></CardContent>
          </Card>
          <Card className="border-white/10 bg-white/[0.045] text-white">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-white/50">{t.review}</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{summary.needsReview}</div></CardContent>
          </Card>
          <Card className="border-white/10 bg-white/[0.045] text-white">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-white/50">{t.expired}</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{summary.expired}</div></CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[420px_1fr]">
          <Card className="border-white/10 bg-white/[0.045] text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" />{t.add}</CardTitle>
              <CardDescription className="text-white/48">Assessment → Finding → Evidence → Audit Pack</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.titleInput} className="border-white/10 bg-black/30 text-white" />
              <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder={t.ownerInput} className="border-white/10 bg-black/30 text-white" />
              <Input value={articleRefs} onChange={(e) => setArticleRefs(e.target.value)} placeholder={t.articlesInput} className="border-white/10 bg-black/30 text-white" />
              <select value={evidenceType} onChange={(e) => setEvidenceType(e.target.value as EvidenceType)} className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white">
                <option value="policy">Policy</option>
                <option value="procedure">Procedure</option>
                <option value="risk_assessment">Risk assessment</option>
                <option value="training">Training</option>
                <option value="vendor_review">Vendor review</option>
                <option value="technical_documentation">Technical documentation</option>
                <option value="document">Document</option>
              </select>
              <Button onClick={handleCreateEvidence} disabled={saving || !title.trim()} className="w-full bg-white text-black hover:bg-white/90 disabled:opacity-60">
                <ShieldCheck className="mr-2 h-4 w-4" /> {saving ? '...' : t.add}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.045] text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />{t.recent}</CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="py-8 text-center text-sm text-white/48">{t.empty}</p>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <p className="mt-1 text-xs text-white/45">{item.owner_name || '-'} • {item.evidence_type}</p>
                        </div>
                        <Badge className="border-blue-400/20 bg-blue-500/10 text-blue-200">{item.status}</Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(item.article_refs || []).map((article) => (
                          <Badge key={article} className="border-white/10 bg-white/[0.06] text-white/60">{article}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
