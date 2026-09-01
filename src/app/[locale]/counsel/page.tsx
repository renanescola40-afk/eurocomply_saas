'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { BadgeCheck, BriefcaseBusiness, RefreshCw, Scale, ShieldAlert } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const copy = {
  en: { badge: 'External Counsel', title: 'Assigned legal reviews', subtitle: 'Matter-scoped access only. Customer administration, billing and unrelated matters are outside this portal.', unavailable: 'Counsel Portal is not enabled for this environment.', denied: 'A verified Counsel profile and an explicit matter assignment are required.', pending: 'External legal validation remains pending.', refresh: 'Refresh', empty: 'No legal reviews are assigned.', conflict: 'Conflict check', acceptConflict: 'Conflict clear', decline: 'Decline matter', engagement: 'Engagement', reference: 'Engagement reference', acceptEngagement: 'Accept engagement', inReview: 'Review workflow', open: 'Open review', firm: 'Law firm', jurisdiction: 'Jurisdiction', customer: 'Customer', updated: 'Updated' },
  pt: { badge: 'External Counsel', title: 'Revisoes juridicas atribuidas', subtitle: 'Acesso apenas ao matter atribuido. Administracao do cliente, billing e matters nao relacionados ficam fora deste portal.', unavailable: 'O Counsel Portal nao esta habilitado neste ambiente.', denied: 'E necessario um perfil de Counsel verificado e uma atribuicao explicita ao matter.', pending: 'A validacao juridica externa continua pendente.', refresh: 'Atualizar', empty: 'Nenhuma revisao juridica atribuida.', conflict: 'Conflict check', acceptConflict: 'Sem conflito', decline: 'Recusar matter', engagement: 'Engagement', reference: 'Referencia do engagement', acceptEngagement: 'Aceitar engagement', inReview: 'Fluxo de revisao', open: 'Abrir revisao', firm: 'Escritorio', jurisdiction: 'Jurisdicao', customer: 'Cliente', updated: 'Atualizado' },
  es: { badge: 'External Counsel', title: 'Revisiones juridicas asignadas', subtitle: 'Acceso solo al matter asignado. Administracion, billing y asuntos no relacionados quedan fuera del portal.', unavailable: 'Counsel Portal no esta habilitado en este entorno.', denied: 'Se requiere un perfil Counsel verificado y una asignacion explicita.', pending: 'La validacion juridica externa sigue pendiente.', refresh: 'Actualizar', empty: 'No hay revisiones juridicas asignadas.', conflict: 'Conflict check', acceptConflict: 'Sin conflicto', decline: 'Rechazar asunto', engagement: 'Engagement', reference: 'Referencia del engagement', acceptEngagement: 'Aceptar engagement', inReview: 'Flujo de revision', open: 'Abrir revision', firm: 'Despacho', jurisdiction: 'Jurisdiccion', customer: 'Cliente', updated: 'Actualizado' },
  fr: { badge: 'External Counsel', title: 'Revues juridiques attribuees', subtitle: 'Acces limite au dossier attribue. Administration client, facturation et dossiers non lies restent hors portail.', unavailable: 'Counsel Portal nest pas active dans cet environnement.', denied: 'Un profil Counsel verifie et une attribution explicite sont requis.', pending: 'La validation juridique externe reste en attente.', refresh: 'Actualiser', empty: 'Aucune revue juridique attribuee.', conflict: 'Conflict check', acceptConflict: 'Aucun conflit', decline: 'Refuser le dossier', engagement: 'Engagement', reference: 'Reference engagement', acceptEngagement: 'Accepter engagement', inReview: 'Flux de revue', open: 'Ouvrir la revue', firm: 'Cabinet', jurisdiction: 'Juridiction', customer: 'Client', updated: 'Mis a jour' },
  it: { badge: 'External Counsel', title: 'Revisioni legali assegnate', subtitle: 'Accesso solo al matter assegnato. Amministrazione cliente, billing e matter non correlati restano fuori dal portale.', unavailable: 'Counsel Portal non e abilitato in questo ambiente.', denied: 'Sono richiesti un profilo Counsel verificato e unassegnazione esplicita.', pending: 'La validazione legale esterna resta in sospeso.', refresh: 'Aggiorna', empty: 'Nessuna revisione legale assegnata.', conflict: 'Conflict check', acceptConflict: 'Nessun conflitto', decline: 'Rifiuta matter', engagement: 'Engagement', reference: 'Riferimento engagement', acceptEngagement: 'Accetta engagement', inReview: 'Flusso revisione', open: 'Apri revisione', firm: 'Studio', jurisdiction: 'Giurisdizione', customer: 'Cliente', updated: 'Aggiornato' },
  de: { badge: 'External Counsel', title: 'Zugewiesene rechtliche Prufungen', subtitle: 'Nur fallbezogener Zugriff. Kundenadministration, Billing und fremde Matters bleiben ausserhalb dieses Portals.', unavailable: 'Counsel Portal ist in dieser Umgebung nicht aktiviert.', denied: 'Ein verifiziertes Counsel-Profil und eine explizite Fallzuweisung sind erforderlich.', pending: 'Die externe rechtliche Validierung steht weiterhin aus.', refresh: 'Aktualisieren', empty: 'Keine rechtlichen Prufungen zugewiesen.', conflict: 'Conflict check', acceptConflict: 'Kein Konflikt', decline: 'Matter ablehnen', engagement: 'Engagement', reference: 'Engagement-Referenz', acceptEngagement: 'Engagement annehmen', inReview: 'Review-Workflow', open: 'Prufung offnen', firm: 'Kanzlei', jurisdiction: 'Jurisdiktion', customer: 'Kunde', updated: 'Aktualisiert' },
} as const;

type Locale = keyof typeof copy;
type Review = {
  id: string;
  organization_id: string;
  law_firm_id: string | null;
  review_type: string;
  jurisdiction: string;
  status: string;
  priority: string;
  updated_at: string;
};
type Counsel = { id: string; lawFirmId: string; professionalName: string; jurisdictions: string[]; specialties: string[] };
type LoadState = 'loading' | 'ready' | 'unavailable' | 'denied' | 'error';

function statusTone(status: string) {
  if (status === 'COMPLETED') return 'border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-200';
  if (['REMEDIATION_REQUIRED', 'INFORMATION_REQUESTED'].includes(status)) return 'border-amber-300/20 bg-amber-300/[0.08] text-amber-200';
  if (['DECLINED', 'CANCELLED', 'EXPIRED'].includes(status)) return 'border-red-300/20 bg-red-300/[0.08] text-red-200';
  return 'border-violet-300/20 bg-violet-300/[0.08] text-violet-200';
}

export default function CounselPortalPage() {
  const params = useParams();
  const locale = ((params.locale as string) in copy ? params.locale : 'pt') as Locale;
  const t = copy[locale];
  const [state, setState] = useState<LoadState>('loading');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [counsel, setCounsel] = useState<Counsel | null>(null);
  const [references, setReferences] = useState<Record<string, string>>({});
  const [busyReviewId, setBusyReviewId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState('loading');
    setError(null);
    try {
      const response = await fetch('/api/counsel/legal-reviews', { cache: 'no-store', credentials: 'same-origin' });
      if (response.status === 404) { setState('unavailable'); return; }
      if (response.status === 403) { setState('denied'); return; }
      if (!response.ok) throw new Error('counsel_reviews_load_failed');
      const payload = await response.json() as { reviews?: Review[]; counsel?: Counsel };
      setReviews(Array.isArray(payload.reviews) ? payload.reviews : []);
      setCounsel(payload.counsel ?? null);
      setState('ready');
    } catch {
      setState('error');
      setError('counsel_reviews_load_failed');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const active = useMemo(() => reviews.filter((review) => !['COMPLETED', 'DECLINED', 'CANCELLED', 'EXPIRED', 'SUPERSEDED'].includes(review.status)).length, [reviews]);

  async function gate(review: Review, action: 'CONFLICT_ACCEPT' | 'CONFLICT_DECLINE' | 'ENGAGEMENT_ACCEPT' | 'ENGAGEMENT_DECLINE') {
    if (busyReviewId) return;
    setBusyReviewId(review.id);
    setError(null);
    try {
      const response = await fetch('/api/counsel/legal-reviews', {
        method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reviewId: review.id, expectedUpdatedAt: review.updated_at, action, engagementReference: references[review.id] || null }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(payload.error ?? 'counsel_gate_failed');
      }
      await load();
    } catch (gateError) {
      setError(gateError instanceof Error ? gateError.message : 'counsel_gate_failed');
    } finally {
      setBusyReviewId(null);
    }
  }

  if (state === 'unavailable' || state === 'denied') {
    return <main className="space-y-6 text-white"><PortalHeader t={t} onRefresh={() => void load()} /><Card className="rounded-xl border-white/[0.075] bg-[#0d1522] text-white"><CardContent className="py-14 text-center"><ShieldAlert className="mx-auto h-8 w-8 text-white/30" /><p className="mt-4 text-sm text-white/50">{state === 'unavailable' ? t.unavailable : t.denied}</p></CardContent></Card></main>;
  }

  return (
    <main className="space-y-6 text-white">
      <PortalHeader t={t} onRefresh={() => void load()} />
      <section className="grid gap-3 md:grid-cols-3">
        <Signal label="Assigned" value={state === 'loading' ? '--' : String(reviews.length)} icon={<BriefcaseBusiness className="h-4 w-4" />} />
        <Signal label="Active" value={state === 'loading' ? '--' : String(active)} icon={<Scale className="h-4 w-4" />} />
        <Signal label="Counsel" value={counsel?.professionalName ?? '--'} icon={<BadgeCheck className="h-4 w-4" />} />
      </section>
      {error ? <p role="alert" className="rounded-lg border border-red-300/15 bg-red-300/[0.06] px-4 py-3 text-sm text-red-200">{error}</p> : null}
      <Card className="overflow-hidden rounded-xl border-white/[0.075] bg-[#0d1522] text-white">
        <CardHeader className="border-b border-white/[0.07]"><CardTitle className="text-base">{t.title}</CardTitle><CardDescription className="text-white/40">{t.pending}</CardDescription></CardHeader>
        <CardContent className="divide-y divide-white/[0.06] p-0">
          {state === 'loading' ? <p className="py-12 text-center text-sm text-white/40">...</p> : reviews.length === 0 ? <p className="py-12 text-center text-sm text-white/40">{t.empty}</p> : reviews.map((review) => (
            <article key={review.id} className="space-y-4 p-5">
              <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr_.8fr_.8fr] lg:items-center">
                <div><div className="flex flex-wrap items-center gap-2"><h2 className="font-medium text-white/90">{review.review_type}</h2><Badge className={statusTone(review.status)}>{review.status}</Badge></div><p className="mt-2 text-xs text-white/38">{review.priority}</p></div>
                <Meta label={t.customer} value={review.organization_id} /><Meta label={t.jurisdiction} value={review.jurisdiction} /><Meta label={t.updated} value={new Date(review.updated_at).toLocaleString(locale)} />
              </div>
              {review.status === 'CONFLICT_CHECK_PENDING' ? <div className="flex flex-wrap gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"><span className="mr-auto text-sm text-white/55">{t.conflict}</span><Button size="sm" onClick={() => void gate(review, 'CONFLICT_ACCEPT')} disabled={busyReviewId === review.id} className="bg-emerald-600 hover:bg-emerald-500">{t.acceptConflict}</Button><Button size="sm" variant="outline" onClick={() => void gate(review, 'CONFLICT_DECLINE')} disabled={busyReviewId === review.id} className="border-red-300/20 bg-red-300/[0.04] text-red-200 hover:bg-red-300/[0.08]">{t.decline}</Button></div> : null}
              {review.status === 'ENGAGEMENT_PENDING' ? <div className="grid gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 md:grid-cols-[1fr_auto_auto]"><Input aria-label={t.reference} placeholder={t.reference} value={references[review.id] ?? ''} onChange={(event) => setReferences((current) => ({ ...current, [review.id]: event.target.value }))} className="border-white/[0.09] bg-[#0a111c] text-white" /><Button size="sm" onClick={() => void gate(review, 'ENGAGEMENT_ACCEPT')} disabled={busyReviewId === review.id || !(references[review.id]?.trim())} className="bg-violet-600 hover:bg-violet-500">{t.acceptEngagement}</Button><Button size="sm" variant="outline" onClick={() => void gate(review, 'ENGAGEMENT_DECLINE')} disabled={busyReviewId === review.id} className="border-red-300/20 bg-red-300/[0.04] text-red-200 hover:bg-red-300/[0.08]">{t.decline}</Button></div> : null}
              {!['CONFLICT_CHECK_PENDING', 'ENGAGEMENT_PENDING', 'DECLINED', 'CANCELLED', 'EXPIRED', 'SUPERSEDED'].includes(review.status) ? <div className="flex justify-end"><Button asChild size="sm" variant="outline" className="border-violet-300/20 bg-violet-300/[0.04] text-violet-100 hover:bg-violet-300/[0.08]"><a href={`/${locale}/counsel/${review.id}`}>{t.open}</a></Button></div> : null}
            </article>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}

function PortalHeader({ t, onRefresh }: { t: (typeof copy)[Locale]; onRefresh: () => void }) {
  return <header className="border-b border-white/[0.07] pb-6"><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><Badge className="mb-3 rounded-lg border-violet-300/15 bg-violet-300/[0.08] text-violet-200"><Scale className="mr-1.5 h-3.5 w-3.5" />{t.badge}</Badge><h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{t.title}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-white/48 md:text-base">{t.subtitle}</p><p className="mt-2 text-xs text-amber-200/70">{t.pending}</p></div><Button onClick={onRefresh} variant="outline" className="border-white/[0.09] bg-white/[0.025] text-white/70 hover:bg-white/[0.06] hover:text-white"><RefreshCw className="mr-2 h-4 w-4" />{t.refresh}</Button></div></header>;
}
function Signal({ label, value, icon }: { label: string; value: string; icon: ReactNode }) { return <Card className="rounded-xl border-white/[0.075] bg-[#0d1522] text-white"><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs uppercase tracking-[0.16em] text-white/35">{label}</p><p className="mt-2 max-w-[220px] truncate text-lg font-semibold">{value}</p></div><div className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-2 text-violet-200/70">{icon}</div></CardContent></Card>; }
function Meta({ label, value }: { label: string; value: string }) { return <div className="min-w-0"><p className="text-[11px] uppercase tracking-[0.14em] text-white/28">{label}</p><p className="mt-1 truncate text-sm text-white/60">{value}</p></div>; }
