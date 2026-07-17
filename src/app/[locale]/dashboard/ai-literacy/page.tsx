'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  FileCheck2,
  GraduationCap,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

const locales = ['en', 'pt', 'es', 'fr', 'it', 'de'] as const;
type Locale = (typeof locales)[number];

type Program = {
  id: string;
  title: string;
  description: string | null;
  status: 'draft' | 'active' | 'archived';
  review_due_at: string | null;
};

type Course = {
  id: string;
  program_id: string;
  title: string;
  version: string;
  status: 'draft' | 'published' | 'retired';
  passing_score: number | null;
  validity_days: number | null;
  modules: Array<{ id?: string; title?: string }>;
};

type Assignment = {
  id: string;
  course_id: string;
  assignee_email: string | null;
  assignee_type: string;
  role_title: string | null;
  department: string | null;
  status: 'assigned' | 'in_progress' | 'completed' | 'expired' | 'waived' | 'revoked';
  due_at: string | null;
  completed_at: string | null;
  valid_until: string | null;
  score: number | null;
};

type Evidence = {
  id: string;
  assignment_id: string;
  evidence_type: string;
  title: string;
  external_url: string | null;
  storage_path: string | null;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'expired' | 'superseded';
  submitted_by: string | null;
  reviewed_at: string | null;
};

type Coverage = {
  score: number | null;
  status: 'not_started' | 'in_progress' | 'at_risk' | 'ready';
  totals: {
    assignments: number;
    ready: number;
    partial: number;
    missing: number;
    expired: number;
    overdue: number;
    waived: number;
    revoked: number;
  };
};

type Snapshot = {
  programs: Program[];
  courses: Course[];
  assignments: Assignment[];
  evidence: Evidence[];
  coverage: Coverage;
};

type Copy = {
  back: string;
  badge: string;
  title: string;
  subtitle: string;
  disclaimer: string;
  coverage: string;
  verified: string;
  attention: string;
  programmes: string;
  courses: string;
  assignments: string;
  evidence: string;
  createProgramme: string;
  createCourse: string;
  assignTraining: string;
  recordCompletion: string;
  submitEvidence: string;
  activate: string;
  publish: string;
  complete: string;
  approve: string;
  reject: string;
  refresh: string;
  loading: string;
  noRecords: string;
  saved: string;
  error: string;
};

const english: Copy = {
  back: 'Back to dashboard',
  badge: 'EU AI Act · Article 4',
  title: 'AI Literacy Center',
  subtitle: 'Assign role-based AI training, verify completion and maintain reviewable evidence.',
  disclaimer: 'This workspace supports Article 4 readiness. It is not a certificate or legal-compliance guarantee.',
  coverage: 'Evidence coverage',
  verified: 'Verified',
  attention: 'Needs attention',
  programmes: 'Programmes',
  courses: 'Courses',
  assignments: 'Assignments',
  evidence: 'Evidence',
  createProgramme: 'Create programme',
  createCourse: 'Create course',
  assignTraining: 'Assign training',
  recordCompletion: 'Record completion',
  submitEvidence: 'Submit evidence',
  activate: 'Activate',
  publish: 'Publish',
  complete: 'Complete',
  approve: 'Approve',
  reject: 'Reject',
  refresh: 'Refresh',
  loading: 'Loading AI literacy records…',
  noRecords: 'No records yet.',
  saved: 'Workflow completed and audit evidence persisted.',
  error: 'The workflow could not be completed.',
};

const localizedCopy: Record<Locale, Partial<Copy>> = {
  en: {},
  pt: {
    back: 'Voltar ao dashboard', badge: 'EU AI Act · Artigo 4', title: 'Centro de Literacia em IA',
    subtitle: 'Atribua formação de IA por função, verifique conclusões e mantenha evidências auditáveis.',
    disclaimer: 'Este workspace apoia a prontidão do Artigo 4. Não é certificado nem garantia de conformidade jurídica.',
    coverage: 'Cobertura de evidências', verified: 'Verificado', attention: 'Precisa de atenção', programmes: 'Programas',
    courses: 'Cursos', assignments: 'Atribuições', evidence: 'Evidências', createProgramme: 'Criar programa',
    createCourse: 'Criar curso', assignTraining: 'Atribuir formação', recordCompletion: 'Registar conclusão',
    submitEvidence: 'Submeter evidência', activate: 'Ativar', publish: 'Publicar', complete: 'Concluir',
    approve: 'Aprovar', reject: 'Rejeitar', refresh: 'Atualizar', loading: 'A carregar registos de literacia em IA…',
    noRecords: 'Ainda não existem registos.', saved: 'Workflow concluído e evidência de auditoria persistida.',
    error: 'Não foi possível concluir o workflow.',
  },
  es: {
    back: 'Volver al panel', title: 'Centro de alfabetización en IA', subtitle: 'Asigna formación por función y conserva evidencias revisables.',
    programmes: 'Programas', courses: 'Cursos', assignments: 'Asignaciones', evidence: 'Evidencias', createProgramme: 'Crear programa',
    createCourse: 'Crear curso', assignTraining: 'Asignar formación', recordCompletion: 'Registrar finalización', submitEvidence: 'Enviar evidencia',
    activate: 'Activar', publish: 'Publicar', complete: 'Completar', approve: 'Aprobar', reject: 'Rechazar', refresh: 'Actualizar',
  },
  fr: {
    back: 'Retour au tableau de bord', title: 'Centre de maîtrise de l’IA', subtitle: 'Attribuez les formations par rôle et conservez des preuves vérifiables.',
    programmes: 'Programmes', courses: 'Cours', assignments: 'Affectations', evidence: 'Preuves', createProgramme: 'Créer un programme',
    createCourse: 'Créer un cours', assignTraining: 'Attribuer la formation', recordCompletion: 'Enregistrer la fin', submitEvidence: 'Soumettre une preuve',
    activate: 'Activer', publish: 'Publier', complete: 'Terminer', approve: 'Approuver', reject: 'Rejeter', refresh: 'Actualiser',
  },
  it: {
    back: 'Torna alla dashboard', title: 'Centro di alfabetizzazione IA', subtitle: 'Assegna formazione per ruolo e conserva evidenze verificabili.',
    programmes: 'Programmi', courses: 'Corsi', assignments: 'Assegnazioni', evidence: 'Evidenze', createProgramme: 'Crea programma',
    createCourse: 'Crea corso', assignTraining: 'Assegna formazione', recordCompletion: 'Registra completamento', submitEvidence: 'Invia evidenza',
    activate: 'Attiva', publish: 'Pubblica', complete: 'Completa', approve: 'Approva', reject: 'Rifiuta', refresh: 'Aggiorna',
  },
  de: {
    back: 'Zurück zum Dashboard', title: 'KI-Kompetenzzentrum', subtitle: 'Weisen Sie rollenbasierte Schulungen zu und führen Sie prüfbare Nachweise.',
    programmes: 'Programme', courses: 'Kurse', assignments: 'Zuweisungen', evidence: 'Nachweise', createProgramme: 'Programm erstellen',
    createCourse: 'Kurs erstellen', assignTraining: 'Schulung zuweisen', recordCompletion: 'Abschluss erfassen', submitEvidence: 'Nachweis einreichen',
    activate: 'Aktivieren', publish: 'Veröffentlichen', complete: 'Abschließen', approve: 'Genehmigen', reject: 'Ablehnen', refresh: 'Aktualisieren',
  },
};

function toIsoDate(value: string) {
  if (!value) return null;
  return new Date(`${value}T12:00:00.000Z`).toISOString();
}

function formatDate(value: string | null, locale: Locale) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}

function statusTone(status: string) {
  if (['active', 'published', 'completed', 'approved', 'ready'].includes(status)) return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200';
  if (['expired', 'rejected', 'at_risk', 'revoked'].includes(status)) return 'border-rose-400/30 bg-rose-400/10 text-rose-200';
  return 'border-amber-400/30 bg-amber-400/10 text-amber-200';
}

export default function AiLiteracyPage() {
  const params = useParams<{ locale?: string }>();
  const locale = locales.includes(params.locale as Locale) ? (params.locale as Locale) : 'en';
  const text = useMemo(() => ({ ...english, ...localizedCopy[locale] }), [locale]);

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [programmeTitle, setProgrammeTitle] = useState('AI Literacy Programme');
  const [programmeDescription, setProgrammeDescription] = useState('Role-based AI literacy programme aligned with Article 4.');
  const [reviewDueAt, setReviewDueAt] = useState('');

  const [courseProgramId, setCourseProgramId] = useState('');
  const [courseTitle, setCourseTitle] = useState('Responsible AI Essentials');
  const [courseVersion, setCourseVersion] = useState('1.0');
  const [courseModules, setCourseModules] = useState('EU AI Act responsibilities\nApproved AI use and data handling\nHuman oversight and escalation');
  const [passingScore, setPassingScore] = useState('80');
  const [validityDays, setValidityDays] = useState('365');

  const [assignmentCourseId, setAssignmentCourseId] = useState('');
  const [assigneeEmail, setAssigneeEmail] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [dueAt, setDueAt] = useState('');

  const [completionAssignmentId, setCompletionAssignmentId] = useState('');
  const [completionScore, setCompletionScore] = useState('');

  const [evidenceAssignmentId, setEvidenceAssignmentId] = useState('');
  const [evidenceTitle, setEvidenceTitle] = useState('Training completion record');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceType, setEvidenceType] = useState('completion_record');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai-literacy', { cache: 'no-store', credentials: 'same-origin' });
      const payload = await response.json() as Snapshot & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'load_failed');
      setSnapshot(payload);
    } catch {
      setNotice({ type: 'error', message: text.error });
    } finally {
      setLoading(false);
    }
  }, [text.error]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const activeProgram = snapshot?.programs.find((program) => program.status === 'active');
    const publishedCourse = snapshot?.courses.find((course) => course.status === 'published');
    const openAssignment = snapshot?.assignments.find((assignment) => ['assigned', 'in_progress'].includes(assignment.status));
    const completedAssignment = snapshot?.assignments.find((assignment) => assignment.status === 'completed');
    if (!courseProgramId && activeProgram) setCourseProgramId(activeProgram.id);
    if (!assignmentCourseId && publishedCourse) setAssignmentCourseId(publishedCourse.id);
    if (!completionAssignmentId && openAssignment) setCompletionAssignmentId(openAssignment.id);
    if (!evidenceAssignmentId && completedAssignment) setEvidenceAssignmentId(completedAssignment.id);
  }, [assignmentCourseId, completionAssignmentId, courseProgramId, evidenceAssignmentId, snapshot]);

  const runWorkflow = useCallback(async (workflow: string, body: Record<string, unknown>) => {
    setBusy(workflow);
    setNotice(null);
    try {
      const response = await fetch(`/api/ai-literacy?workflow=${encodeURIComponent(workflow)}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'workflow_failed');
      setNotice({ type: 'success', message: text.saved });
      await load();
      return true;
    } catch (error) {
      const code = error instanceof Error ? error.message : 'workflow_failed';
      setNotice({ type: 'error', message: `${text.error} (${code})` });
      return false;
    } finally {
      setBusy(null);
    }
  }, [load, text.error, text.saved]);

  const coverage = snapshot?.coverage;
  const publishedCourses = snapshot?.courses.filter((course) => course.status === 'published') ?? [];
  const activeProgrammes = snapshot?.programs.filter((program) => program.status === 'active') ?? [];
  const openAssignments = snapshot?.assignments.filter((assignment) => ['assigned', 'in_progress'].includes(assignment.status)) ?? [];
  const completedAssignments = snapshot?.assignments.filter((assignment) => assignment.status === 'completed') ?? [];

  if (loading && !snapshot) {
    return <main className="min-h-screen bg-[#05070b] px-6 py-12 text-slate-100"><p className="mx-auto max-w-7xl">{text.loading}</p></main>;
  }

  return (
    <main className="min-h-screen bg-[#05070b] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="ghost" className="text-slate-300 hover:text-white">
            <Link href={`/${locale}/dashboard`}><ArrowLeft className="mr-2 h-4 w-4" />{text.back}</Link>
          </Button>
          <Button variant="outline" onClick={() => void load()} disabled={loading} className="border-white/15 bg-white/5">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />{text.refresh}
          </Button>
        </div>

        <section className="overflow-hidden rounded-[2rem] border border-violet-400/20 bg-gradient-to-br from-violet-500/15 via-slate-950 to-emerald-500/10 p-7 shadow-2xl">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <Badge className="border-violet-400/30 bg-violet-400/10 text-violet-100">{text.badge}</Badge>
              <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">{text.title}</h1>
              <p className="mt-3 max-w-2xl text-base text-slate-300">{text.subtitle}</p>
              <p className="mt-4 text-xs text-slate-500">{text.disclaimer}</p>
            </div>
            <div className="min-w-72 rounded-3xl border border-white/10 bg-black/30 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{text.coverage}</span>
                <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusTone(coverage?.status ?? 'not_started')}`}>{coverage?.status ?? 'not_started'}</span>
              </div>
              <div className="mt-4 flex items-end justify-between"><span className="text-5xl font-black">{coverage?.score ?? '—'}{coverage?.score !== null && coverage?.score !== undefined ? '%' : ''}</span><ShieldCheck className="h-10 w-10 text-violet-300" /></div>
              <Progress value={coverage?.score ?? 0} className="mt-4 h-2" />
            </div>
          </div>
        </section>

        {notice && (
          <div className={`rounded-2xl border px-4 py-3 text-sm ${notice.type === 'success' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100' : 'border-rose-400/30 bg-rose-400/10 text-rose-100'}`}>{notice.message}</div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: text.programmes, value: snapshot?.programs.length ?? 0, icon: GraduationCap },
            { label: text.courses, value: snapshot?.courses.length ?? 0, icon: BookOpenCheck },
            { label: text.assignments, value: coverage?.totals.assignments ?? 0, icon: Users },
            { label: text.verified, value: coverage?.totals.ready ?? 0, icon: CheckCircle2 },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="border-white/10 bg-white/[0.035] text-white">
              <CardContent className="flex items-center justify-between p-5"><div><p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div><Icon className="h-7 w-7 text-violet-300" /></CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Card className="border-white/10 bg-white/[0.035] text-white">
            <CardHeader><CardTitle>{text.createProgramme}</CardTitle><CardDescription>Create the accountable Article 4 programme before publishing courses.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <input aria-label="Programme title" value={programmeTitle} onChange={(event) => setProgrammeTitle(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3" />
              <textarea aria-label="Programme description" value={programmeDescription} onChange={(event) => setProgrammeDescription(event.target.value)} rows={3} className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3" />
              <input aria-label="Review due date" type="date" value={reviewDueAt} onChange={(event) => setReviewDueAt(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3" />
              <Button disabled={busy !== null} onClick={() => void runWorkflow('program_create', { title: programmeTitle, description: programmeDescription, reviewDueAt: toIsoDate(reviewDueAt) })}>{text.createProgramme}</Button>
              <div className="space-y-2 pt-2">
                {(snapshot?.programs ?? []).map((program) => (
                  <div key={program.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
                    <div><p className="font-semibold">{program.title}</p><p className="text-xs text-slate-500">Review: {formatDate(program.review_due_at, locale)}</p></div>
                    {program.status === 'draft' ? <Button size="sm" variant="outline" onClick={() => void runWorkflow('program_activate', { programId: program.id })}>{text.activate}</Button> : <Badge className={statusTone(program.status)}>{program.status}</Badge>}
                  </div>
                ))}
                {snapshot?.programs.length === 0 && <p className="text-sm text-slate-500">{text.noRecords}</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.035] text-white">
            <CardHeader><CardTitle>{text.createCourse}</CardTitle><CardDescription>Versioned training content can only be published under an active programme.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <select aria-label="Programme" value={courseProgramId} onChange={(event) => setCourseProgramId(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/80 px-4 py-3"><option value="">Select active programme</option>{activeProgrammes.map((program) => <option key={program.id} value={program.id}>{program.title}</option>)}</select>
              <div className="grid gap-3 sm:grid-cols-[1fr_7rem]"><input aria-label="Course title" value={courseTitle} onChange={(event) => setCourseTitle(event.target.value)} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3" /><input aria-label="Course version" value={courseVersion} onChange={(event) => setCourseVersion(event.target.value)} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3" /></div>
              <textarea aria-label="Course modules" value={courseModules} onChange={(event) => setCourseModules(event.target.value)} rows={4} className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3" />
              <div className="grid gap-3 sm:grid-cols-2"><input aria-label="Passing score" type="number" min="0" max="100" value={passingScore} onChange={(event) => setPassingScore(event.target.value)} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3" /><input aria-label="Validity days" type="number" min="1" max="3650" value={validityDays} onChange={(event) => setValidityDays(event.target.value)} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3" /></div>
              <Button disabled={busy !== null || !courseProgramId} onClick={() => void runWorkflow('course_create', {
                programId: courseProgramId, title: courseTitle, version: courseVersion,
                audienceRoles: ['employee', 'contractor'], riskLevels: ['all'], departments: [],
                modules: courseModules.split('\n').map((line) => line.trim()).filter(Boolean).map((line, index) => ({ id: `module-${index + 1}`, title: line, content: line })),
                passingScore: passingScore ? Number(passingScore) : null, validityDays: validityDays ? Number(validityDays) : null,
              })}>{text.createCourse}</Button>
              <div className="space-y-2 pt-2">
                {(snapshot?.courses ?? []).map((course) => (
                  <div key={course.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
                    <div><p className="font-semibold">{course.title} <span className="text-xs text-slate-500">v{course.version}</span></p><p className="text-xs text-slate-500">{course.modules.length} modules · pass {course.passing_score ?? '—'}%</p></div>
                    {course.status === 'draft' ? <Button size="sm" variant="outline" onClick={() => void runWorkflow('course_publish', { courseId: course.id })}>{text.publish}</Button> : <Badge className={statusTone(course.status)}>{course.status}</Badge>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.035] text-white">
            <CardHeader><CardTitle>{text.assignTraining}</CardTitle><CardDescription>Assignments are scoped to published course versions and named people.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <select aria-label="Published course" value={assignmentCourseId} onChange={(event) => setAssignmentCourseId(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/80 px-4 py-3"><option value="">Select published course</option>{publishedCourses.map((course) => <option key={course.id} value={course.id}>{course.title} · v{course.version}</option>)}</select>
              <input aria-label="Assignee email" type="email" value={assigneeEmail} onChange={(event) => setAssigneeEmail(event.target.value)} placeholder="person@company.com" className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3" />
              <div className="grid gap-3 sm:grid-cols-2"><input aria-label="Role title" value={roleTitle} onChange={(event) => setRoleTitle(event.target.value)} placeholder="Role" className="rounded-xl border border-white/10 bg-black/30 px-4 py-3" /><input aria-label="Department" value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="Department" className="rounded-xl border border-white/10 bg-black/30 px-4 py-3" /></div>
              <input aria-label="Due date" type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3" />
              <Button disabled={busy !== null || !assignmentCourseId || !assigneeEmail} onClick={() => void runWorkflow('assignment_create', { courseId: assignmentCourseId, assigneeEmail, assigneeType: 'employee', roleTitle, department, dueAt: toIsoDate(dueAt) })}>{text.assignTraining}</Button>
              <div className="space-y-2 pt-2">
                {(snapshot?.assignments ?? []).slice(0, 8).map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-3"><div><p className="font-semibold">{assignment.assignee_email ?? assignment.role_title ?? 'Assigned person'}</p><p className="text-xs text-slate-500">Due {formatDate(assignment.due_at, locale)} · score {assignment.score ?? '—'}</p></div><Badge className={statusTone(assignment.status)}>{assignment.status}</Badge></div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.035] text-white">
            <CardHeader><CardTitle>{text.recordCompletion}</CardTitle><CardDescription>Completion is not readiness until valid evidence is independently approved.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <select aria-label="Open assignment" value={completionAssignmentId} onChange={(event) => setCompletionAssignmentId(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/80 px-4 py-3"><option value="">Select assignment</option>{openAssignments.map((assignment) => <option key={assignment.id} value={assignment.id}>{assignment.assignee_email ?? assignment.id}</option>)}</select>
              <input aria-label="Completion score" type="number" min="0" max="100" value={completionScore} onChange={(event) => setCompletionScore(event.target.value)} placeholder="Assessment score" className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3" />
              <Button disabled={busy !== null || !completionAssignmentId} onClick={() => void runWorkflow('assignment_complete', { assignmentId: completionAssignmentId, score: completionScore ? Number(completionScore) : null })}><CheckCircle2 className="mr-2 h-4 w-4" />{text.complete}</Button>

              <div className="mt-6 border-t border-white/10 pt-5"><h3 className="font-bold">{text.submitEvidence}</h3></div>
              <select aria-label="Completed assignment" value={evidenceAssignmentId} onChange={(event) => setEvidenceAssignmentId(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/80 px-4 py-3"><option value="">Select completed assignment</option>{completedAssignments.map((assignment) => <option key={assignment.id} value={assignment.id}>{assignment.assignee_email ?? assignment.id}</option>)}</select>
              <select aria-label="Evidence type" value={evidenceType} onChange={(event) => setEvidenceType(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/80 px-4 py-3"><option value="completion_record">Completion record</option><option value="assessment_result">Assessment result</option><option value="attendance">Attendance</option><option value="acknowledgement">Acknowledgement</option><option value="certificate">Certificate</option><option value="other">Other</option></select>
              <input aria-label="Evidence title" value={evidenceTitle} onChange={(event) => setEvidenceTitle(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3" />
              <input aria-label="HTTPS evidence URL" type="url" value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} placeholder="https://…" className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3" />
              <Button disabled={busy !== null || !evidenceAssignmentId || !evidenceUrl} onClick={() => void runWorkflow('evidence_submit', { assignmentId: evidenceAssignmentId, evidenceType, title: evidenceTitle, externalUrl: evidenceUrl })}><FileCheck2 className="mr-2 h-4 w-4" />{text.submitEvidence}</Button>
            </CardContent>
          </Card>
        </section>

        <Card className="border-white/10 bg-white/[0.035] text-white">
          <CardHeader><CardTitle>{text.evidence}</CardTitle><CardDescription>Submitted evidence requires a different reviewer before it contributes 100% coverage.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {(snapshot?.evidence ?? []).map((item) => (
              <div key={item.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center">
                <div className="flex items-start gap-3"><FileCheck2 className="mt-1 h-5 w-5 text-violet-300" /><div><p className="font-semibold">{item.title}</p><p className="text-xs text-slate-500">{item.evidence_type} · assignment {item.assignment_id.slice(0, 8)}</p></div></div>
                <div className="flex items-center gap-2"><Badge className={statusTone(item.status)}>{item.status}</Badge>{['submitted', 'under_review'].includes(item.status) && <><Button size="sm" variant="outline" onClick={() => void runWorkflow('evidence_review', { evidenceId: item.id, decision: 'approved' })}>{text.approve}</Button><Button size="sm" variant="destructive" onClick={() => void runWorkflow('evidence_review', { evidenceId: item.id, decision: 'rejected' })}>{text.reject}</Button></>}</div>
              </div>
            ))}
            {snapshot?.evidence.length === 0 && <div className="flex items-center gap-2 text-sm text-slate-500"><Clock3 className="h-4 w-4" />{text.noRecords}</div>}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
