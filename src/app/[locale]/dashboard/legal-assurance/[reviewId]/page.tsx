'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileCheck2, RefreshCw, Send, ShieldAlert } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const copy = {
  en: { back: 'Back to Legal Assurance', badge: 'Enterprise Legal Assurance', title: 'Legal review matter', subtitle: 'Prepare evidence, answer bounded Counsel requests and remediate findings without treating software output as legal approval.', pending: 'External legal validation remains pending.', unavailable: 'This legal review is unavailable for the current organization.', refresh: 'Refresh', prepare: 'Prepare frozen package', information: 'Information requests', answer: 'Response', send: 'Provide information', remediation: 'Remediation', response: 'Customer response', save: 'Save response', ready: 'Mark ready', resubmit: 'Resubmit for Counsel review', packages: 'Frozen packages', decisions: 'Counsel decisions', status: 'Status', version: 'Package version', release: 'Release SHA', manifest: 'Manifest digest', decision: 'Decision', jurisdiction: 'Jurisdiction', digest: 'Decision digest', empty: 'None yet' },
  pt: { back: 'Voltar ao Legal Assurance', badge: 'Legal Assurance Enterprise', title: 'Matter de revisao juridica', subtitle: 'Prepare evidencias, responda pedidos delimitados do Counsel e remedie findings sem tratar a saida do software como aprovacao juridica.', pending: 'A validacao juridica externa continua pendente.', unavailable: 'Esta revisao juridica nao esta disponivel para a organizacao atual.', refresh: 'Atualizar', prepare: 'Preparar pacote congelado', information: 'Pedidos de informacao', answer: 'Resposta', send: 'Enviar informacao', remediation: 'Remediacao', response: 'Resposta do cliente', save: 'Guardar resposta', ready: 'Marcar pronta', resubmit: 'Resubmeter para Counsel', packages: 'Pacotes congelados', decisions: 'Decisoes Counsel', status: 'Estado', version: 'Versao do pacote', release: 'SHA da release', manifest: 'Digest do manifest', decision: 'Decisao', jurisdiction: 'Jurisdicao', digest: 'Digest da decisao', empty: 'Nenhum ainda' },
  es: { back: 'Volver a Legal Assurance', badge: 'Legal Assurance Enterprise', title: 'Asunto de revision juridica', subtitle: 'Prepara evidencia, responde solicitudes delimitadas de Counsel y remedia hallazgos sin tratar la salida del software como aprobacion juridica.', pending: 'La validacion juridica externa sigue pendiente.', unavailable: 'Esta revision no esta disponible para la organizacion actual.', refresh: 'Actualizar', prepare: 'Preparar paquete congelado', information: 'Solicitudes de informacion', answer: 'Respuesta', send: 'Enviar informacion', remediation: 'Remediacion', response: 'Respuesta del cliente', save: 'Guardar respuesta', ready: 'Marcar lista', resubmit: 'Reenviar a Counsel', packages: 'Paquetes congelados', decisions: 'Decisiones Counsel', status: 'Estado', version: 'Version del paquete', release: 'SHA de release', manifest: 'Digest del manifest', decision: 'Decision', jurisdiction: 'Jurisdiccion', digest: 'Digest de decision', empty: 'Ninguno todavia' },
  fr: { back: 'Retour a Legal Assurance', badge: 'Legal Assurance Enterprise', title: 'Dossier de revue juridique', subtitle: 'Preparez les preuves, repondez aux demandes limitees du Counsel et remediez aux constats sans traiter la sortie logicielle comme une approbation juridique.', pending: 'La validation juridique externe reste en attente.', unavailable: 'Cette revue nest pas disponible pour lorganisation actuelle.', refresh: 'Actualiser', prepare: 'Preparer le dossier fige', information: 'Demandes dinformation', answer: 'Reponse', send: 'Fournir linformation', remediation: 'Remediation', response: 'Reponse client', save: 'Enregistrer', ready: 'Marquer pret', resubmit: 'Resoumettre au Counsel', packages: 'Dossiers figes', decisions: 'Decisions Counsel', status: 'Statut', version: 'Version du dossier', release: 'SHA release', manifest: 'Digest du manifest', decision: 'Decision', jurisdiction: 'Juridiction', digest: 'Digest de decision', empty: 'Aucun pour le moment' },
  it: { back: 'Torna a Legal Assurance', badge: 'Legal Assurance Enterprise', title: 'Matter di revisione legale', subtitle: 'Prepara evidenze, rispondi alle richieste delimitate del Counsel e correggi i finding senza trattare loutput software come approvazione legale.', pending: 'La validazione legale esterna resta in sospeso.', unavailable: 'Questa revisione non e disponibile per lorganizzazione corrente.', refresh: 'Aggiorna', prepare: 'Prepara pacchetto congelato', information: 'Richieste di informazioni', answer: 'Risposta', send: 'Invia informazione', remediation: 'Remediation', response: 'Risposta cliente', save: 'Salva risposta', ready: 'Segna pronta', resubmit: 'Reinvia al Counsel', packages: 'Pacchetti congelati', decisions: 'Decisioni Counsel', status: 'Stato', version: 'Versione pacchetto', release: 'SHA release', manifest: 'Digest del manifest', decision: 'Decisione', jurisdiction: 'Giurisdizione', digest: 'Digest decisione', empty: 'Nessuno ancora' },
  de: { back: 'Zuruck zu Legal Assurance', badge: 'Legal Assurance Enterprise', title: 'Fall der rechtlichen Prufung', subtitle: 'Bereiten Sie Nachweise vor, beantworten Sie begrenzte Counsel-Anfragen und beheben Sie Findings, ohne Softwareausgaben als Rechtsfreigabe zu behandeln.', pending: 'Die externe rechtliche Validierung steht weiterhin aus.', unavailable: 'Diese Prufung ist fur die aktuelle Organisation nicht verfugbar.', refresh: 'Aktualisieren', prepare: 'Eingefrorenes Paket vorbereiten', information: 'Informationsanfragen', answer: 'Antwort', send: 'Information senden', remediation: 'Remediation', response: 'Kundenantwort', save: 'Antwort speichern', ready: 'Als bereit markieren', resubmit: 'An Counsel zuruckgeben', packages: 'Eingefrorene Pakete', decisions: 'Counsel-Entscheidungen', status: 'Status', version: 'Paketversion', release: 'Release-SHA', manifest: 'Manifest-Digest', decision: 'Entscheidung', jurisdiction: 'Jurisdiktion', digest: 'Entscheidungs-Digest', empty: 'Noch keine' },
} as const;

type Locale = keyof typeof copy;
type Review = { id: string; review_type: string; jurisdiction: string; status: string; updated_at: string };
type Matter = { packages: Array<Record<string, unknown>>; decisions: Array<Record<string, unknown>>; remediation: Array<Record<string, unknown>>; informationRequests: Array<Record<string, unknown>>; informationResponses: Array<Record<string, unknown>> };
type Payload = { review: Review; matter: Matter; externalValidation: 'PENDING' };

function text(value: unknown, fallback = '—') { return typeof value === 'string' && value.length > 0 ? value : fallback; }

export default function LegalAssuranceMatterPage() {
  const params = useParams();
  const router = useRouter();
  const locale = ((params.locale as string) in copy ? params.locale : 'pt') as Locale;
  const reviewId = String(params.reviewId ?? '');
  const t = copy[locale];
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [informationAnswers, setInformationAnswers] = useState<Record<string, string>>({});
  const [remediationAnswers, setRemediationAnswers] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/legal-assurance/${encodeURIComponent(reviewId)}`, { cache: 'no-store', credentials: 'same-origin' });
      if (response.status === 403 || response.status === 404) { setPayload(null); setError('legal_review_unavailable'); return; }
      if (!response.ok) throw new Error('legal_review_load_failed');
      setPayload(await response.json() as Payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'legal_review_load_failed');
    } finally {
      setLoading(false);
    }
  }, [reviewId]);

  useEffect(() => { void load(); }, [load]);

  const review = payload?.review ?? null;
  const matter = payload?.matter ?? null;
  const canPrepare = review?.status === 'ACCEPTED_FOR_REVIEW' || review?.status === 'RESUBMITTED';
  const canResubmit = review?.status === 'REMEDIATION_REQUIRED';
  const openInformation = useMemo(() => (matter?.informationRequests ?? []).filter((row) => String(row.status ?? '').toUpperCase() === 'OPEN'), [matter?.informationRequests]);

  async function action(body: Record<string, unknown>) {
    if (!review || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/legal-assurance/${encodeURIComponent(review.id)}`, {
        method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...body, expectedUpdatedAt: review.updated_at }),
      });
      if (!response.ok) {
        const failure = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(failure.error ?? 'legal_review_operation_failed');
      }
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'legal_review_operation_failed');
    } finally {
      setBusy(false);
    }
  }

  if (!loading && !payload) {
    return <main className="space-y-6 text-white"><Button variant="ghost" onClick={() => router.push(`/${locale}/dashboard/legal-assurance`)} className="px-2 text-white/55"><ArrowLeft className="mr-2 h-4 w-4" />{t.back}</Button><Card className="rounded-xl border-white/[0.075] bg-[#0d1522] text-white"><CardContent className="py-14 text-center"><ShieldAlert className="mx-auto h-8 w-8 text-white/30" /><p className="mt-4 text-sm text-white/50">{t.unavailable}</p></CardContent></Card></main>;
  }

  return <main className="space-y-6 text-white">
    <Button variant="ghost" onClick={() => router.push(`/${locale}/dashboard/legal-assurance`)} className="px-2 text-white/55 hover:bg-white/[0.05] hover:text-white"><ArrowLeft className="mr-2 h-4 w-4" />{t.back}</Button>
    <header className="border-b border-white/[0.07] pb-6"><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><Badge className="mb-3 border-violet-300/15 bg-violet-300/[0.08] text-violet-200"><FileCheck2 className="mr-1.5 h-3.5 w-3.5" />{t.badge}</Badge><h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{t.title}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-white/48">{t.subtitle}</p><p className="mt-2 text-xs text-amber-200/70">{t.pending}</p></div><Button onClick={() => void load()} variant="outline" disabled={loading || busy} className="border-white/[0.09] bg-white/[0.025] text-white/70"><RefreshCw className="mr-2 h-4 w-4" />{t.refresh}</Button></div></header>

    {error ? <p role="alert" className="rounded-lg border border-red-300/15 bg-red-300/[0.06] px-4 py-3 text-sm text-red-200">{error}</p> : null}

    <section className="grid gap-3 md:grid-cols-3"><Signal label={t.status} value={review?.status ?? (loading ? '...' : '—')} /><Signal label={t.packages} value={String(matter?.packages.length ?? 0)} /><Signal label={t.decisions} value={String(matter?.decisions.length ?? 0)} /></section>

    {canPrepare ? <Card className="rounded-xl border-violet-300/15 bg-violet-300/[0.04] text-white"><CardHeader><CardTitle className="text-base">{t.prepare}</CardTitle><CardDescription className="text-white/40">The server snapshots the current review, AI system, FRIA and release-bound metadata, then freezes the package digest.</CardDescription></CardHeader><CardContent><Button onClick={() => void action({ action: 'PREPARE_PACKAGE' })} disabled={busy} className="bg-violet-600 hover:bg-violet-500"><FileCheck2 className="mr-2 h-4 w-4" />{t.prepare}</Button></CardContent></Card> : null}

    {openInformation.length > 0 ? <Card className="rounded-xl border-white/[0.075] bg-[#0d1522] text-white"><CardHeader><CardTitle className="text-base">{t.information}</CardTitle></CardHeader><CardContent className="space-y-4">{openInformation.map((row) => { const id = String(row.id ?? ''); return <div key={id} className="space-y-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4"><p className="text-sm text-white/70">{text(row.prompt)}</p><textarea aria-label={`${t.answer}-${id}`} value={informationAnswers[id] ?? ''} onChange={(event) => setInformationAnswers((current) => ({ ...current, [id]: event.target.value }))} rows={5} className="w-full rounded-md border border-white/[0.09] bg-[#0a111c] p-3 text-sm text-white outline-none" /><Button size="sm" onClick={() => void action({ action: 'PROVIDE_INFORMATION', informationRequestId: id, response: { answer: (informationAnswers[id] ?? '').trim() } })} disabled={busy || !(informationAnswers[id]?.trim())} className="bg-violet-600 hover:bg-violet-500"><Send className="mr-2 h-4 w-4" />{t.send}</Button></div>; })}</CardContent></Card> : null}

    {(matter?.remediation.length ?? 0) > 0 ? <Card className="rounded-xl border-white/[0.075] bg-[#0d1522] text-white"><CardHeader><CardTitle className="text-base">{t.remediation}</CardTitle><CardDescription className="text-white/40">Counsel findings are addressed individually. The server remains authoritative for editability and readiness.</CardDescription></CardHeader><CardContent className="space-y-4">{matter?.remediation.map((row) => { const id = String(row.id ?? ''); const status = text(row.status); return <div key={id} className="space-y-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4"><div className="grid gap-2 md:grid-cols-3"><Meta label="Finding" value={text(row.stable_finding_id)} /><Meta label={t.status} value={status} /><Meta label="Severity" value={text(row.severity)} /></div><p className="text-sm font-medium text-white/80">{text(row.title)}</p><p className="text-sm text-white/52">{text(row.required_action)}</p><textarea aria-label={`${t.response}-${id}`} value={remediationAnswers[id] ?? ''} onChange={(event) => setRemediationAnswers((current) => ({ ...current, [id]: event.target.value }))} rows={4} className="w-full rounded-md border border-white/[0.09] bg-[#0a111c] p-3 text-sm text-white outline-none" /><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => void action({ action: 'UPDATE_REMEDIATION', remediationId: id, customerResponse: { response: (remediationAnswers[id] ?? '').trim() }, markReady: false })} disabled={busy || !(remediationAnswers[id]?.trim())} className="border-white/[0.09] bg-white/[0.025] text-white/70">{t.save}</Button><Button size="sm" onClick={() => void action({ action: 'UPDATE_REMEDIATION', remediationId: id, customerResponse: { response: (remediationAnswers[id] ?? '').trim() }, markReady: true })} disabled={busy || !(remediationAnswers[id]?.trim())} className="bg-emerald-600 hover:bg-emerald-500">{t.ready}</Button></div></div>; })}</CardContent></Card> : null}

    {canResubmit ? <Card className="rounded-xl border-amber-300/15 bg-amber-300/[0.04] text-white"><CardHeader><CardTitle className="text-base">{t.resubmit}</CardTitle><CardDescription className="text-white/40">Resubmission is accepted only when the backend verifies that required remediation is complete.</CardDescription></CardHeader><CardContent><Button onClick={() => void action({ action: 'RESUBMIT' })} disabled={busy} className="bg-amber-600 hover:bg-amber-500">{t.resubmit}</Button></CardContent></Card> : null}

    <section className="grid gap-4 xl:grid-cols-2"><MatterCard title={t.packages} empty={t.empty} rows={matter?.packages ?? []} render={(row) => <><Meta label={t.version} value={String(row.package_version ?? '—')} /><Meta label={t.release} value={text(row.product_release_sha)} mono /><Meta label={t.manifest} value={text(row.package_manifest_digest)} mono /></>} /><MatterCard title={t.decisions} empty={t.empty} rows={matter?.decisions ?? []} render={(row) => <><Meta label={t.decision} value={text(row.decision)} /><Meta label={t.jurisdiction} value={text(row.jurisdiction)} /><Meta label={t.digest} value={text(row.decision_digest)} mono /></>} /></section>
  </main>;
}

function Signal({ label, value }: { label: string; value: string }) { return <Card className="rounded-xl border-white/[0.075] bg-[#0d1522] text-white"><CardContent className="p-4"><p className="text-xs uppercase tracking-[0.16em] text-white/35">{label}</p><p className="mt-2 truncate text-lg font-semibold">{value}</p></CardContent></Card>; }
function Meta({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) { return <div><p className="text-[11px] uppercase tracking-[0.14em] text-white/28">{label}</p><p className={`mt-1 break-all text-sm text-white/62 ${mono ? 'font-mono text-xs' : ''}`}>{value}</p></div>; }
function MatterCard({ title, empty, rows, render }: { title: string; empty: string; rows: Array<Record<string, unknown>>; render: (row: Record<string, unknown>) => React.ReactNode }) { return <Card className="rounded-xl border-white/[0.075] bg-[#0d1522] text-white"><CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader><CardContent className="space-y-3">{rows.length === 0 ? <p className="text-sm text-white/40">{empty}</p> : rows.map((row, index) => <div key={String(row.id ?? index)} className="grid gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">{render(row)}</div>)}</CardContent></Card>; }
