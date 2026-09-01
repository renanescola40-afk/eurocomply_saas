'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, FileCheck2, RefreshCw, Scale, Send, ShieldAlert, Upload } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const copy = {
  en: { back: 'Back to Counsel inbox', badge: 'Matter-scoped Counsel review', title: 'Legal review cockpit', subtitle: 'Review only the assigned matter. Professional judgment remains with verified Counsel.', unavailable: 'Counsel review is unavailable or not assigned to this profile.', pending: 'External legal validation remains pending.', refresh: 'Refresh', start: 'Start review', information: 'Request information', prompt: 'Information request', send: 'Send request', decision: 'Professional decision', rationale: 'Rationale', jurisdiction: 'Jurisdiction', conditions: 'Conditions (one per line)', exclusions: 'Exclusions (one per line)', validUntil: 'Valid until', issue: 'Issue decision', remediation: 'Remediation finding', findingId: 'Stable finding ID', findingTitle: 'Finding title', requiredAction: 'Required action', severity: 'Severity', packages: 'Frozen packages', decisions: 'Decisions', requests: 'Information requests', findings: 'Remediation items', artifacts: 'Signed artifacts', uploadArtifact: 'Upload signed PDF', selectedArtifact: 'Artifact linked to decision', download: 'Secure download', manifest: 'Manifest digest', release: 'Release SHA', packageVersion: 'Package version', empty: 'None yet', status: 'Status', updated: 'Updated' },
  pt: { back: 'Voltar ao inbox Counsel', badge: 'Revisao Counsel por matter', title: 'Cockpit de revisao juridica', subtitle: 'Revise apenas o matter atribuido. O julgamento profissional permanece com o Counsel verificado.', unavailable: 'A revisao Counsel nao esta disponivel ou nao foi atribuida a este perfil.', pending: 'A validacao juridica externa continua pendente.', refresh: 'Atualizar', start: 'Iniciar revisao', information: 'Solicitar informacao', prompt: 'Pedido de informacao', send: 'Enviar pedido', decision: 'Decisao profissional', rationale: 'Fundamentacao', jurisdiction: 'Jurisdicao', conditions: 'Condicoes (uma por linha)', exclusions: 'Exclusoes (uma por linha)', validUntil: 'Valido ate', issue: 'Emitir decisao', remediation: 'Finding de remediacao', findingId: 'ID estavel do finding', findingTitle: 'Titulo do finding', requiredAction: 'Acao requerida', severity: 'Severidade', packages: 'Pacotes congelados', decisions: 'Decisoes', requests: 'Pedidos de informacao', findings: 'Itens de remediacao', artifacts: 'Artefactos assinados', uploadArtifact: 'Enviar PDF assinado', selectedArtifact: 'Artefacto ligado a decisao', download: 'Download seguro', manifest: 'Digest do manifest', release: 'SHA da release', packageVersion: 'Versao do pacote', empty: 'Nenhum ainda', status: 'Estado', updated: 'Atualizado' },
  es: { back: 'Volver al inbox Counsel', badge: 'Revision Counsel por asunto', title: 'Cockpit de revision juridica', subtitle: 'Revise solo el asunto asignado. El juicio profesional permanece con Counsel verificado.', unavailable: 'La revision Counsel no esta disponible o no esta asignada a este perfil.', pending: 'La validacion juridica externa sigue pendiente.', refresh: 'Actualizar', start: 'Iniciar revision', information: 'Solicitar informacion', prompt: 'Solicitud de informacion', send: 'Enviar solicitud', decision: 'Decision profesional', rationale: 'Fundamentacion', jurisdiction: 'Jurisdiccion', conditions: 'Condiciones (una por linea)', exclusions: 'Exclusiones (una por linea)', validUntil: 'Valida hasta', issue: 'Emitir decision', remediation: 'Hallazgo de remediacion', findingId: 'ID estable del hallazgo', findingTitle: 'Titulo del hallazgo', requiredAction: 'Accion requerida', severity: 'Severidad', packages: 'Paquetes congelados', decisions: 'Decisiones', requests: 'Solicitudes de informacion', findings: 'Elementos de remediacion', artifacts: 'Artefactos firmados', uploadArtifact: 'Subir PDF firmado', selectedArtifact: 'Artefacto ligado a la decision', download: 'Descarga segura', manifest: 'Digest del manifest', release: 'SHA de release', packageVersion: 'Version del paquete', empty: 'Ninguno todavia', status: 'Estado', updated: 'Actualizado' },
  fr: { back: 'Retour a la boite Counsel', badge: 'Revue Counsel limitee au dossier', title: 'Cockpit de revue juridique', subtitle: 'Revisez uniquement le dossier attribue. Le jugement professionnel reste celui du Counsel verifie.', unavailable: 'La revue Counsel est indisponible ou non attribuee a ce profil.', pending: 'La validation juridique externe reste en attente.', refresh: 'Actualiser', start: 'Demarrer la revue', information: 'Demander des informations', prompt: 'Demande dinformation', send: 'Envoyer la demande', decision: 'Decision professionnelle', rationale: 'Motivation', jurisdiction: 'Juridiction', conditions: 'Conditions (une par ligne)', exclusions: 'Exclusions (une par ligne)', validUntil: 'Valable jusquau', issue: 'Emettre la decision', remediation: 'Constat de remediation', findingId: 'ID stable du constat', findingTitle: 'Titre du constat', requiredAction: 'Action requise', severity: 'Severite', packages: 'Dossiers figes', decisions: 'Decisions', requests: 'Demandes dinformation', findings: 'Elements de remediation', artifacts: 'Artefacts signes', uploadArtifact: 'Televerser le PDF signe', selectedArtifact: 'Artefact lie a la decision', download: 'Telechargement securise', manifest: 'Digest du manifest', release: 'SHA release', packageVersion: 'Version du dossier', empty: 'Aucun pour le moment', status: 'Statut', updated: 'Mis a jour' },
  it: { back: 'Torna alla inbox Counsel', badge: 'Revisione Counsel per matter', title: 'Cockpit di revisione legale', subtitle: 'Esamina solo il matter assegnato. Il giudizio professionale resta al Counsel verificato.', unavailable: 'La revisione Counsel non e disponibile o non e assegnata a questo profilo.', pending: 'La validazione legale esterna resta in sospeso.', refresh: 'Aggiorna', start: 'Avvia revisione', information: 'Richiedi informazioni', prompt: 'Richiesta di informazioni', send: 'Invia richiesta', decision: 'Decisione professionale', rationale: 'Motivazione', jurisdiction: 'Giurisdizione', conditions: 'Condizioni (una per riga)', exclusions: 'Esclusioni (una per riga)', validUntil: 'Valida fino a', issue: 'Emetti decisione', remediation: 'Finding di remediation', findingId: 'ID stabile del finding', findingTitle: 'Titolo del finding', requiredAction: 'Azione richiesta', severity: 'Severita', packages: 'Pacchetti congelati', decisions: 'Decisioni', requests: 'Richieste di informazioni', findings: 'Elementi di remediation', artifacts: 'Artefatti firmati', uploadArtifact: 'Carica PDF firmato', selectedArtifact: 'Artefatto collegato alla decisione', download: 'Download sicuro', manifest: 'Digest del manifest', release: 'SHA release', packageVersion: 'Versione pacchetto', empty: 'Nessuno ancora', status: 'Stato', updated: 'Aggiornato' },
  de: { back: 'Zuruck zum Counsel-Postfach', badge: 'Fallbezogene Counsel-Prufung', title: 'Cockpit fur rechtliche Prufung', subtitle: 'Prufen Sie nur den zugewiesenen Fall. Die professionelle Beurteilung bleibt beim verifizierten Counsel.', unavailable: 'Die Counsel-Prufung ist nicht verfugbar oder diesem Profil nicht zugewiesen.', pending: 'Die externe rechtliche Validierung steht weiterhin aus.', refresh: 'Aktualisieren', start: 'Prufung starten', information: 'Information anfordern', prompt: 'Informationsanfrage', send: 'Anfrage senden', decision: 'Professionelle Entscheidung', rationale: 'Begrundung', jurisdiction: 'Jurisdiktion', conditions: 'Bedingungen (eine pro Zeile)', exclusions: 'Ausschlusse (eine pro Zeile)', validUntil: 'Gultig bis', issue: 'Entscheidung ausstellen', remediation: 'Remediation-Finding', findingId: 'Stabile Finding-ID', findingTitle: 'Finding-Titel', requiredAction: 'Erforderliche Massnahme', severity: 'Schweregrad', packages: 'Eingefrorene Pakete', decisions: 'Entscheidungen', requests: 'Informationsanfragen', findings: 'Remediation-Elemente', artifacts: 'Signierte Artefakte', uploadArtifact: 'Signiertes PDF hochladen', selectedArtifact: 'Artefakt mit Entscheidung verknupft', download: 'Sicherer Download', manifest: 'Manifest-Digest', release: 'Release-SHA', packageVersion: 'Paketversion', empty: 'Noch keine', status: 'Status', updated: 'Aktualisiert' },
} as const;

type Locale = keyof typeof copy;
type Review = { id: string; review_type: string; jurisdiction: string; status: string; updated_at: string; organization_id: string };
type Matter = { packages: Array<Record<string, unknown>>; decisions: Array<Record<string, unknown>>; remediation: Array<Record<string, unknown>>; informationRequests: Array<Record<string, unknown>>; artifacts: Array<Record<string, unknown>> };
type Payload = { review: Review; matter: Matter; externalValidation: 'PENDING' };
type Decision = 'ACCEPTED' | 'ACCEPTED_WITH_CONDITIONS' | 'REMEDIATION_REQUIRED' | 'REJECTED' | 'OUTSIDE_SCOPE';

function lines(value: string) { return value.split('\n').map((item) => item.trim()).filter(Boolean); }
function text(value: unknown, fallback = '—') { return typeof value === 'string' && value.length > 0 ? value : fallback; }

export default function CounselReviewCockpitPage() {
  const params = useParams();
  const router = useRouter();
  const locale = ((params.locale as string) in copy ? params.locale : 'pt') as Locale;
  const reviewId = String(params.reviewId ?? '');
  const t = copy[locale];
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [informationPrompt, setInformationPrompt] = useState('');
  const [decision, setDecision] = useState<Decision>('ACCEPTED');
  const [jurisdiction, setJurisdiction] = useState('EU');
  const [rationale, setRationale] = useState('');
  const [conditions, setConditions] = useState('');
  const [exclusions, setExclusions] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [findingId, setFindingId] = useState('');
  const [findingTitle, setFindingTitle] = useState('');
  const [requiredAction, setRequiredAction] = useState('');
  const [severity, setSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [artifactFile, setArtifactFile] = useState<File | null>(null);
  const [selectedArtifactReference, setSelectedArtifactReference] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/counsel/legal-reviews/${encodeURIComponent(reviewId)}`, { cache: 'no-store', credentials: 'same-origin' });
      if (response.status === 403 || response.status === 404) { setPayload(null); setError('counsel_review_unavailable'); return; }
      if (!response.ok) throw new Error('counsel_review_load_failed');
      const body = await response.json() as Payload;
      setPayload(body);
      setJurisdiction(body.review.jurisdiction || 'EU');
      const latestArtifact = body.matter.artifacts.at(-1);
      if (latestArtifact) setSelectedArtifactReference((current) => current || text(latestArtifact.artifact_reference, ''));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'counsel_review_load_failed');
    } finally { setLoading(false); }
  }, [reviewId]);

  useEffect(() => { void load(); }, [load]);

  const review = payload?.review ?? null;
  const matter = payload?.matter ?? null;
  const canStart = review?.status === 'READY_FOR_REVIEW';
  const canReview = review?.status === 'IN_REVIEW';
  const latestPackage = useMemo(() => matter?.packages.at(-1) ?? null, [matter?.packages]);

  async function action(body: Record<string, unknown>) {
    if (!review || busy) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/counsel/legal-reviews/${encodeURIComponent(review.id)}`, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...body, expectedUpdatedAt: review.updated_at }) });
      if (!response.ok) { const failure = await response.json().catch(() => ({})) as { error?: string }; throw new Error(failure.error ?? 'counsel_review_operation_failed'); }
      await load();
    } catch (actionError) { setError(actionError instanceof Error ? actionError.message : 'counsel_review_operation_failed'); }
    finally { setBusy(false); }
  }

  async function requestInformation() {
    const prompt = informationPrompt.trim();
    if (prompt.length < 2) return;
    await action({ action: 'REQUEST_INFORMATION', prompt });
    setInformationPrompt('');
  }

  async function uploadArtifact() {
    if (!review || !artifactFile || busy) return;
    setBusy(true); setError(null);
    try {
      const formData = new FormData();
      formData.set('file', artifactFile);
      const response = await fetch(`/api/counsel/legal-reviews/${encodeURIComponent(review.id)}/artifacts`, { method: 'POST', credentials: 'same-origin', body: formData });
      const body = await response.json().catch(() => ({})) as { error?: string; artifact?: { artifactReference?: string } };
      if (!response.ok || !body.artifact?.artifactReference) throw new Error(body.error ?? 'signed_artifact_upload_failed');
      setSelectedArtifactReference(body.artifact.artifactReference);
      setArtifactFile(null);
      await load();
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : 'signed_artifact_upload_failed'); }
    finally { setBusy(false); }
  }

  async function downloadArtifact(artifactId: string) {
    setError(null);
    try {
      const response = await fetch(`/api/legal-assurance/artifacts/${encodeURIComponent(artifactId)}/download`, { cache: 'no-store', credentials: 'same-origin' });
      const body = await response.json().catch(() => ({})) as { error?: string; signedUrl?: string };
      if (!response.ok || !body.signedUrl) throw new Error(body.error ?? 'signed_artifact_download_failed');
      window.open(body.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (downloadError) { setError(downloadError instanceof Error ? downloadError.message : 'signed_artifact_download_failed'); }
  }

  async function issueDecision() {
    if (!review || rationale.trim().length < 10) return;
    const remediationItems = decision === 'REMEDIATION_REQUIRED' ? [{ stableFindingId: findingId.trim(), title: findingTitle.trim(), requiredAction: requiredAction.trim(), severity }] : [];
    if (decision === 'REMEDIATION_REQUIRED' && (!findingId.trim() || findingTitle.trim().length < 2 || requiredAction.trim().length < 2)) return;
    await action({ action: 'ISSUE_DECISION', decision, scope: { source: 'counsel_review_cockpit', reviewType: review.review_type }, jurisdiction: jurisdiction.trim(), rationale: rationale.trim(), conditions: lines(conditions), exclusions: lines(exclusions), validUntil: validUntil ? new Date(validUntil).toISOString() : null, signedArtifactReference: selectedArtifactReference || null, remediationItems });
  }

  if (!loading && !payload) return <main className="space-y-6 text-white"><Button variant="ghost" onClick={() => router.push(`/${locale}/counsel`)} className="px-2 text-white/55"><ArrowLeft className="mr-2 h-4 w-4" />{t.back}</Button><Card className="rounded-xl border-white/[0.075] bg-[#0d1522] text-white"><CardContent className="py-14 text-center"><ShieldAlert className="mx-auto h-8 w-8 text-white/30" /><p className="mt-4 text-sm text-white/50">{t.unavailable}</p></CardContent></Card></main>;

  return <main className="space-y-6 text-white">
    <Button variant="ghost" onClick={() => router.push(`/${locale}/counsel`)} className="px-2 text-white/55 hover:bg-white/[0.05] hover:text-white"><ArrowLeft className="mr-2 h-4 w-4" />{t.back}</Button>
    <header className="border-b border-white/[0.07] pb-6"><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><Badge className="mb-3 border-violet-300/15 bg-violet-300/[0.08] text-violet-200"><Scale className="mr-1.5 h-3.5 w-3.5" />{t.badge}</Badge><h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{t.title}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-white/48">{t.subtitle}</p><p className="mt-2 text-xs text-amber-200/70">{t.pending}</p></div><Button onClick={() => void load()} variant="outline" disabled={loading || busy} className="border-white/[0.09] bg-white/[0.025] text-white/70"><RefreshCw className="mr-2 h-4 w-4" />{t.refresh}</Button></div></header>
    {error ? <p role="alert" className="rounded-lg border border-red-300/15 bg-red-300/[0.06] px-4 py-3 text-sm text-red-200">{error}</p> : null}
    <section className="grid gap-3 md:grid-cols-3"><Signal label={t.status} value={review?.status ?? (loading ? '...' : '—')} /><Signal label={t.packageVersion} value={latestPackage ? String(latestPackage.package_version ?? '—') : '—'} /><Signal label={t.updated} value={review ? new Date(review.updated_at).toLocaleString(locale) : '—'} /></section>

    {canStart ? <Card className="rounded-xl border-violet-300/15 bg-violet-300/[0.04] text-white"><CardHeader><CardTitle className="text-base">{t.start}</CardTitle><CardDescription className="text-white/45">The frozen evidence package is ready for professional review.</CardDescription></CardHeader><CardContent><Button onClick={() => void action({ action: 'START_REVIEW' })} disabled={busy} className="bg-violet-600 hover:bg-violet-500"><FileCheck2 className="mr-2 h-4 w-4" />{t.start}</Button></CardContent></Card> : null}

    {canReview ? <section className="grid gap-4 xl:grid-cols-2">
      <Card className="rounded-xl border-white/[0.075] bg-[#0d1522] text-white"><CardHeader><CardTitle className="text-base">{t.information}</CardTitle><CardDescription className="text-white/40">Request only information required for this assigned matter.</CardDescription></CardHeader><CardContent className="space-y-3"><textarea aria-label={t.prompt} value={informationPrompt} onChange={(event) => setInformationPrompt(event.target.value)} rows={6} className="w-full rounded-md border border-white/[0.09] bg-[#0a111c] p-3 text-sm text-white outline-none" /><Button onClick={() => void requestInformation()} disabled={busy || informationPrompt.trim().length < 2} className="bg-violet-600 hover:bg-violet-500"><Send className="mr-2 h-4 w-4" />{t.send}</Button></CardContent></Card>
      <Card className="rounded-xl border-white/[0.075] bg-[#0d1522] text-white"><CardHeader><CardTitle className="text-base">{t.artifacts}</CardTitle><CardDescription className="text-white/40">PDF only. The backend validates the signature, applies malware-scan policy and stores it in a private bucket.</CardDescription></CardHeader><CardContent className="space-y-3"><Input type="file" accept="application/pdf,.pdf" aria-label={t.uploadArtifact} onChange={(event) => setArtifactFile(event.target.files?.[0] ?? null)} className="border-white/[0.09] bg-[#0a111c] text-white" /><Button onClick={() => void uploadArtifact()} disabled={busy || !artifactFile} className="bg-violet-600 hover:bg-violet-500"><Upload className="mr-2 h-4 w-4" />{t.uploadArtifact}</Button>{selectedArtifactReference ? <p className="break-all rounded-md border border-emerald-300/15 bg-emerald-300/[0.04] p-2 text-xs text-emerald-200">{t.selectedArtifact}: {selectedArtifactReference}</p> : null}</CardContent></Card>
      <Card className="rounded-xl border-white/[0.075] bg-[#0d1522] text-white xl:col-span-2"><CardHeader><CardTitle className="text-base">{t.decision}</CardTitle><CardDescription className="text-white/40">The decision is bound server-side to the latest frozen package; a selected signed artifact must belong to this matter and this Counsel.</CardDescription></CardHeader><CardContent className="grid gap-3 lg:grid-cols-2"><select aria-label={t.decision} value={decision} onChange={(event) => setDecision(event.target.value as Decision)} className="h-10 w-full rounded-md border border-white/[0.09] bg-[#0a111c] px-3 text-sm text-white"><option value="ACCEPTED">ACCEPTED</option><option value="ACCEPTED_WITH_CONDITIONS">ACCEPTED_WITH_CONDITIONS</option><option value="REMEDIATION_REQUIRED">REMEDIATION_REQUIRED</option><option value="REJECTED">REJECTED</option><option value="OUTSIDE_SCOPE">OUTSIDE_SCOPE</option></select><Input aria-label={t.jurisdiction} value={jurisdiction} onChange={(event) => setJurisdiction(event.target.value)} className="border-white/[0.09] bg-[#0a111c] text-white" /><textarea aria-label={t.rationale} value={rationale} onChange={(event) => setRationale(event.target.value)} rows={7} className="w-full rounded-md border border-white/[0.09] bg-[#0a111c] p-3 text-sm text-white outline-none lg:col-span-2" /><textarea aria-label={t.conditions} value={conditions} onChange={(event) => setConditions(event.target.value)} rows={3} className="w-full rounded-md border border-white/[0.09] bg-[#0a111c] p-3 text-sm text-white outline-none" /><textarea aria-label={t.exclusions} value={exclusions} onChange={(event) => setExclusions(event.target.value)} rows={3} className="w-full rounded-md border border-white/[0.09] bg-[#0a111c] p-3 text-sm text-white outline-none" /><Input aria-label={t.validUntil} type="datetime-local" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} className="border-white/[0.09] bg-[#0a111c] text-white" />
      {decision === 'REMEDIATION_REQUIRED' ? <div className="space-y-2 rounded-lg border border-amber-300/15 bg-amber-300/[0.04] p-3 lg:col-span-2"><p className="text-xs font-medium uppercase tracking-[0.14em] text-amber-200/70">{t.remediation}</p><Input aria-label={t.findingId} placeholder={t.findingId} value={findingId} onChange={(event) => setFindingId(event.target.value)} className="border-white/[0.09] bg-[#0a111c] text-white" /><Input aria-label={t.findingTitle} placeholder={t.findingTitle} value={findingTitle} onChange={(event) => setFindingTitle(event.target.value)} className="border-white/[0.09] bg-[#0a111c] text-white" /><textarea aria-label={t.requiredAction} placeholder={t.requiredAction} value={requiredAction} onChange={(event) => setRequiredAction(event.target.value)} rows={4} className="w-full rounded-md border border-white/[0.09] bg-[#0a111c] p-3 text-sm text-white outline-none" /><select aria-label={t.severity} value={severity} onChange={(event) => setSeverity(event.target.value as typeof severity)} className="h-10 w-full rounded-md border border-white/[0.09] bg-[#0a111c] px-3 text-sm text-white"><option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option><option value="CRITICAL">CRITICAL</option></select></div> : null}
      <Button onClick={() => void issueDecision()} disabled={busy || rationale.trim().length < 10 || jurisdiction.trim().length < 2 || (decision === 'REMEDIATION_REQUIRED' && (!findingId.trim() || findingTitle.trim().length < 2 || requiredAction.trim().length < 2))} className="bg-violet-600 hover:bg-violet-500 lg:col-span-2"><Scale className="mr-2 h-4 w-4" />{t.issue}</Button></CardContent></Card>
    </section> : null}

    <section className="grid gap-4 xl:grid-cols-2">
      <MatterCard title={t.packages} empty={t.empty} rows={matter?.packages ?? []} render={(row) => <><Meta label={t.packageVersion} value={String(row.package_version ?? '—')} /><Meta label={t.release} value={text(row.product_release_sha)} mono /><Meta label={t.manifest} value={text(row.package_manifest_digest)} mono /></>} />
      <MatterCard title={t.decisions} empty={t.empty} rows={matter?.decisions ?? []} render={(row) => <><Meta label={t.decision} value={text(row.decision)} /><Meta label={t.jurisdiction} value={text(row.jurisdiction)} /><Meta label="Digest" value={text(row.decision_digest)} mono /></>} />
      <MatterCard title={t.artifacts} empty={t.empty} rows={matter?.artifacts ?? []} render={(row) => <><Meta label="Issuer" value={text(row.issuer)} /><Meta label="Digest" value={text(row.artifact_digest)} mono /><Button size="sm" variant="outline" onClick={() => void downloadArtifact(String(row.id))} className="mt-1 w-fit border-white/[0.09] bg-white/[0.025] text-white/70"><Download className="mr-2 h-4 w-4" />{t.download}</Button></>} />
      <MatterCard title={t.requests} empty={t.empty} rows={matter?.informationRequests ?? []} render={(row) => <><Meta label={t.status} value={text(row.status)} /><Meta label={t.prompt} value={text(row.prompt)} /></>} />
      <MatterCard title={t.findings} empty={t.empty} rows={matter?.remediation ?? []} render={(row) => <><Meta label={t.status} value={text(row.status)} /><Meta label={t.findingId} value={text(row.stable_finding_id)} /><Meta label={t.findingTitle} value={text(row.title)} /></>} />
    </section>
  </main>;
}

function Signal({ label, value }: { label: string; value: string }) { return <Card className="rounded-xl border-white/[0.075] bg-[#0d1522] text-white"><CardContent className="p-4"><p className="text-xs uppercase tracking-[0.16em] text-white/35">{label}</p><p className="mt-2 truncate text-lg font-semibold">{value}</p></CardContent></Card>; }
function Meta({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) { return <div><p className="text-[11px] uppercase tracking-[0.14em] text-white/28">{label}</p><p className={`mt-1 break-all text-sm text-white/62 ${mono ? 'font-mono text-xs' : ''}`}>{value}</p></div>; }
function MatterCard({ title, empty, rows, render }: { title: string; empty: string; rows: Array<Record<string, unknown>>; render: (row: Record<string, unknown>) => ReactNode }) { return <Card className="rounded-xl border-white/[0.075] bg-[#0d1522] text-white"><CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader><CardContent className="space-y-3">{rows.length === 0 ? <p className="text-sm text-white/40">{empty}</p> : rows.map((row, index) => <div key={String(row.id ?? index)} className="grid gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">{render(row)}</div>)}</CardContent></Card>; }
