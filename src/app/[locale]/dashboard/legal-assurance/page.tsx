'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BadgeCheck, BriefcaseBusiness, FileCheck2, Plus, RefreshCw, Scale, ShieldCheck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const copy = {
  en: { back: 'Back to dashboard', badge: 'Enterprise Legal Assurance', title: 'Independent legal review, inside your governance workflow', subtitle: 'Request a bounded external review without turning software output into a legal approval claim.', request: 'Request legal review', type: 'Review type', jurisdiction: 'Jurisdiction', priority: 'Priority', current: 'Legal review requests', empty: 'No legal review has been requested.', unavailable: 'Legal Assurance is not enabled for this environment.', pending: 'External legal validation remains pending.', refresh: 'Refresh', requested: 'Requested', counsel: 'Counsel', firm: 'Law firm', scope: 'Scope', status: 'Status', package: 'Package', decision: 'Decision', remediation: 'Remediation', expiry: 'Expiry' },
  pt: { back: 'Voltar ao dashboard', badge: 'Legal Assurance Enterprise', title: 'Revisao juridica independente dentro do seu fluxo de governance', subtitle: 'Solicite uma revisao externa delimitada sem transformar a saida do software em aprovacao juridica.', request: 'Solicitar revisao juridica', type: 'Tipo de revisao', jurisdiction: 'Jurisdicao', priority: 'Prioridade', current: 'Solicitacoes de revisao juridica', empty: 'Nenhuma revisao juridica foi solicitada.', unavailable: 'Legal Assurance nao esta habilitado neste ambiente.', pending: 'A validacao juridica externa continua pendente.', refresh: 'Atualizar', requested: 'Solicitada', counsel: 'Advogado', firm: 'Escritorio', scope: 'Escopo', status: 'Status', package: 'Pacote', decision: 'Decisao', remediation: 'Remediacao', expiry: 'Validade' },
  es: { back: 'Volver al dashboard', badge: 'Legal Assurance Enterprise', title: 'Revision juridica independiente dentro de tu flujo de gobernanza', subtitle: 'Solicita una revision externa delimitada sin convertir la salida del software en aprobacion juridica.', request: 'Solicitar revision juridica', type: 'Tipo de revision', jurisdiction: 'Jurisdiccion', priority: 'Prioridad', current: 'Solicitudes de revision juridica', empty: 'No hay revisiones juridicas solicitadas.', unavailable: 'Legal Assurance no esta habilitado en este entorno.', pending: 'La validacion juridica externa sigue pendiente.', refresh: 'Actualizar', requested: 'Solicitada', counsel: 'Abogado', firm: 'Despacho', scope: 'Alcance', status: 'Estado', package: 'Paquete', decision: 'Decision', remediation: 'Remediacion', expiry: 'Vencimiento' },
  fr: { back: 'Retour au dashboard', badge: 'Legal Assurance Enterprise', title: 'Revue juridique independante dans votre flux de gouvernance', subtitle: 'Demandez une revue externe delimitee sans transformer la sortie du logiciel en approbation juridique.', request: 'Demander une revue juridique', type: 'Type de revue', jurisdiction: 'Juridiction', priority: 'Priorite', current: 'Demandes de revue juridique', empty: 'Aucune revue juridique demandee.', unavailable: 'Legal Assurance nest pas active dans cet environnement.', pending: 'La validation juridique externe reste en attente.', refresh: 'Actualiser', requested: 'Demandee', counsel: 'Avocat', firm: 'Cabinet', scope: 'Perimetre', status: 'Statut', package: 'Dossier', decision: 'Decision', remediation: 'Remediation', expiry: 'Validite' },
  it: { back: 'Torna alla dashboard', badge: 'Legal Assurance Enterprise', title: 'Revisione legale indipendente nel flusso di governance', subtitle: 'Richiedi una revisione esterna delimitata senza trasformare loutput software in approvazione legale.', request: 'Richiedi revisione legale', type: 'Tipo di revisione', jurisdiction: 'Giurisdizione', priority: 'Priorita', current: 'Richieste di revisione legale', empty: 'Nessuna revisione legale richiesta.', unavailable: 'Legal Assurance non e abilitato in questo ambiente.', pending: 'La validazione legale esterna resta in sospeso.', refresh: 'Aggiorna', requested: 'Richiesta', counsel: 'Legale', firm: 'Studio', scope: 'Ambito', status: 'Stato', package: 'Pacchetto', decision: 'Decisione', remediation: 'Remediation', expiry: 'Scadenza' },
  de: { back: 'Zuruck zum Dashboard', badge: 'Legal Assurance Enterprise', title: 'Unabhangige rechtliche Prufung im Governance-Workflow', subtitle: 'Fordern Sie eine abgegrenzte externe Prufung an, ohne Softwareausgaben als Rechtsfreigabe darzustellen.', request: 'Rechtliche Prufung anfordern', type: 'Prufungstyp', jurisdiction: 'Jurisdiktion', priority: 'Prioritat', current: 'Anfragen fur rechtliche Prufungen', empty: 'Noch keine rechtliche Prufung angefordert.', unavailable: 'Legal Assurance ist in dieser Umgebung nicht aktiviert.', pending: 'Die externe rechtliche Validierung steht weiterhin aus.', refresh: 'Aktualisieren', requested: 'Angefordert', counsel: 'Rechtsbeistand', firm: 'Kanzlei', scope: 'Umfang', status: 'Status', package: 'Paket', decision: 'Entscheidung', remediation: 'Behebung', expiry: 'Gultigkeit' },
} as const;

type Locale = keyof typeof copy;
type Review = {
  id: string;
  review_type: string;
  jurisdiction: string;
  status: string;
  priority: string;
  requested_at: string;
  updated_at: string;
  law_firm_id: string | null;
  assigned_counsel_id: string | null;
  expires_at: string | null;
  scope: Record<string, unknown>;
};

type LoadState = 'loading' | 'ready' | 'unavailable' | 'error';

function statusTone(status: string) {
  if (status === 'COMPLETED') return 'border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-200';
  if (status === 'REMEDIATION_REQUIRED') return 'border-amber-300/20 bg-amber-300/[0.08] text-amber-200';
  if (['DECLINED', 'EXPIRED', 'CANCELLED'].includes(status)) return 'border-red-300/20 bg-red-300/[0.08] text-red-200';
  return 'border-blue-300/20 bg-blue-300/[0.08] text-blue-200';
}

export default function LegalAssurancePage() {
  const router = useRouter();
  const params = useParams();
  const locale = ((params.locale as string) in copy ? params.locale : 'pt') as Locale;
  const t = copy[locale];
  const [reviews, setReviews] = useState<Review[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [submitting, setSubmitting] = useState(false);
  const [reviewType, setReviewType] = useState('EU_AI_ACT');
  const [jurisdiction, setJurisdiction] = useState('EU');
  const [priority, setPriority] = useState('NORMAL');
  const [error, setError] = useState<string | null>(null);

  const activeCount = useMemo(() => reviews.filter((review) => !['COMPLETED', 'DECLINED', 'CANCELLED', 'EXPIRED', 'SUPERSEDED'].includes(review.status)).length, [reviews]);

  async function loadReviews() {
    setError(null);
    setState('loading');
    try {
      const response = await fetch('/api/legal-assurance', { cache: 'no-store', credentials: 'same-origin' });
      if (response.status === 404) {
        setReviews([]);
        setState('unavailable');
        return;
      }
      if (!response.ok) throw new Error('legal_assurance_load_failed');
      const payload = await response.json() as { reviews?: Review[] };
      setReviews(Array.isArray(payload.reviews) ? payload.reviews : []);
      setState('ready');
    } catch {
      setState('error');
      setError('legal_assurance_load_failed');
    }
  }

  useEffect(() => {
    void loadReviews();
  }, []);

  async function requestReview() {
    if (submitting || state !== 'ready') return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/legal-assurance', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reviewType, jurisdiction, priority, scope: { source: 'customer_legal_assurance_hub' } }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(payload.error ?? 'legal_assurance_request_failed');
      }
      await loadReviews();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'legal_assurance_request_failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="space-y-6 text-white">
      <Button variant="ghost" onClick={() => router.push(`/${locale}/dashboard`)} className="h-9 px-2 text-white/50 hover:bg-white/[0.05] hover:text-white">
        <ArrowLeft className="mr-2 h-4 w-4" /> {t.back}
      </Button>

      <header className="border-b border-white/[0.07] pb-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <Badge className="mb-3 rounded-lg border-violet-300/15 bg-violet-300/[0.08] text-violet-200"><Scale className="mr-1.5 h-3.5 w-3.5" />{t.badge}</Badge>
            <h1 className="max-w-4xl text-3xl font-semibold tracking-tight md:text-4xl">{t.title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/48 md:text-base">{t.subtitle}</p>
            <p className="mt-2 text-xs text-amber-200/70">{t.pending}</p>
          </div>
          <Button onClick={() => void loadReviews()} variant="outline" className="border-white/[0.09] bg-white/[0.025] text-white/70 hover:bg-white/[0.06] hover:text-white">
            <RefreshCw className="mr-2 h-4 w-4" /> {t.refresh}
          </Button>
        </div>
      </header>

      {state === 'unavailable' ? (
        <Card className="rounded-xl border-white/[0.075] bg-[#0d1522] text-white">
          <CardContent className="py-14 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-white/30" />
            <p className="mt-4 text-sm text-white/50">{t.unavailable}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="grid gap-3 md:grid-cols-3">
            <Signal label={t.current} value={state === 'loading' ? '--' : String(reviews.length)} icon={<BriefcaseBusiness className="h-4 w-4" />} />
            <Signal label="Active" value={state === 'loading' ? '--' : String(activeCount)} icon={<FileCheck2 className="h-4 w-4" />} />
            <Signal label="External Validation" value="PENDING" icon={<BadgeCheck className="h-4 w-4" />} />
          </section>

          <Card className="rounded-xl border-white/[0.075] bg-[#0d1522] text-white">
            <CardHeader>
              <CardTitle className="text-base">{t.request}</CardTitle>
              <CardDescription className="text-white/40">RISCK COMPLY prepares the operational record; independent Counsel retains professional judgment.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-[1fr_1fr_160px_auto]">
              <Input aria-label={t.type} value={reviewType} onChange={(event) => setReviewType(event.target.value)} placeholder={t.type} className="border-white/[0.09] bg-white/[0.03] text-white" />
              <Input aria-label={t.jurisdiction} value={jurisdiction} onChange={(event) => setJurisdiction(event.target.value)} placeholder={t.jurisdiction} className="border-white/[0.09] bg-white/[0.03] text-white" />
              <select aria-label={t.priority} value={priority} onChange={(event) => setPriority(event.target.value)} className="h-10 rounded-md border border-white/[0.09] bg-[#0a111c] px-3 text-sm text-white/80">
                <option value="LOW">LOW</option><option value="NORMAL">NORMAL</option><option value="HIGH">HIGH</option><option value="URGENT">URGENT</option>
              </select>
              <Button onClick={() => void requestReview()} disabled={submitting || state !== 'ready'} className="bg-violet-600 text-white hover:bg-violet-500">
                <Plus className="mr-2 h-4 w-4" /> {submitting ? '...' : t.request}
              </Button>
            </CardContent>
          </Card>

          {error ? <p role="alert" className="rounded-lg border border-red-300/15 bg-red-300/[0.06] px-4 py-3 text-sm text-red-200">{error}</p> : null}

          <Card className="overflow-hidden rounded-xl border-white/[0.075] bg-[#0d1522] text-white">
            <CardHeader className="border-b border-white/[0.07]">
              <CardTitle className="text-base">{t.current}</CardTitle>
              <CardDescription className="text-white/40">{reviews.length} total</CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-white/[0.06] p-0">
              {state === 'loading' ? <p className="py-12 text-center text-sm text-white/40">...</p> : reviews.length === 0 ? <p className="py-12 text-center text-sm text-white/40">{t.empty}</p> : reviews.map((review) => (
                <article key={review.id} className="grid gap-4 p-5 lg:grid-cols-[1.25fr_.8fr_.8fr_.8fr] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><h2 className="font-medium text-white/90">{review.review_type}</h2><Badge className={statusTone(review.status)}>{review.status}</Badge></div>
                    <p className="mt-2 text-xs text-white/38">{t.requested}: {new Date(review.requested_at).toLocaleString(locale)} · {review.jurisdiction} · {review.priority}</p>
                  </div>
                  <Meta label={t.counsel} value={review.assigned_counsel_id ?? '—'} />
                  <Meta label={t.firm} value={review.law_firm_id ?? '—'} />
                  <Meta label={t.expiry} value={review.expires_at ? new Date(review.expires_at).toLocaleDateString(locale) : '—'} />
                </article>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}

function Signal({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <Card className="rounded-xl border-white/[0.075] bg-[#0d1522] text-white"><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs uppercase tracking-[0.16em] text-white/35">{label}</p><p className="mt-2 text-xl font-semibold">{value}</p></div><div className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-2 text-violet-200/70">{icon}</div></CardContent></Card>;
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><p className="text-[11px] uppercase tracking-[0.14em] text-white/28">{label}</p><p className="mt-1 truncate text-sm text-white/60">{value}</p></div>;
}
