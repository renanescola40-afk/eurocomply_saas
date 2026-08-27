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
  if (['active', 'published', 'completed', 'approved', 'ready'].includes(status)) return 'border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-100';
  if (['expired', 'rejected', 'at_risk', 'revoked'].includes(status)) return 'border-rose-300/20 bg-rose-300/[0.07] text-rose-100';
  return 'border-amber-300/20 bg-amber-300/[0.07] text-amber-100';
}

const inputClass = 'min-h-10 w-full rounded-lg border border-white/[0.085] bg-black/20 px-3 py-2.5 text-sm text-white/82 outline-none transition placeholder:text-white/25 focus:border-emerald-300/30 focus-visible:ring-2 focus-visible:ring-emerald-300/55';
const secondaryButton = 'inline-flex min-h-9 items-center justify-center rounded-lg border border-white/[0.085] bg-white/[0.025] px-3 text-xs font-semibold text-white/62 transition hover:bg-white/[0.055] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60 disabled:cursor-not-allowed disabled:opacity-50';
const primaryButton = 'inline-flex min-h-10 items-center justify-center rounded-lg bg-emerald-300 px-4 text-sm font-semibold text-[#06100d] transition hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60 disabled:cursor-not-allowed disabled:opacity-50';

function ProgressLine({ value, label }: { value: number; label: string }) {
  const normalized = Math.max(0, Math.min(100, value));
  return (
    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={normalized}>
      <div className="h-full rounded-full bg-emerald-300" style={{ width: `${normalized}%` }} />
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-b border-white/[0.055] px-5 py-4">
      <h2 className="text-sm font-semibold text-white/88">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-white/36">{description}</p>
    </div>
  );
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
    return <main className="min-h-0 bg-transparent text-white"><section className="rounded-xl border border-white/[0.075] bg-[#101715] px-5 py-8 text-sm text-white/42" role="status">{text.loading}</section></main>;
  }

  return (
    <main className="min-h-0 bg-transparent text-white">
      <div className="w-full space-y-5">
        <header className="flex flex-col gap-4 border-b border-white/[0.065] pb-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <Link href={`/${locale}/dashboard/organizations`} className="inline-flex items-center gap-2 text-xs font-medium text-white/42 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> {text.back}
            </Link>
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200/65">{text.badge}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white">{text.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/48">{text.subtitle}</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} className={secondaryButton}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> {text.refresh}
          </button>
        </header>

        <section className="flex gap-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.045] px-4 py-3 text-sm leading-6 text-amber-100/82" aria-label="Article 4 boundary">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" aria-hidden="true" />
          <p>{text.disclaimer}</p>
        </section>

        {notice ? <div className={`rounded-xl border px-4 py-3 text-sm ${notice.type === 'success' ? 'border-emerald-300/20 bg-emerald-300/[0.055] text-emerald-100' : 'border-rose-300/20 bg-rose-300/[0.055] text-rose-100'}`} role="status">{notice.message}</div> : null}

        <section className="grid overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715] sm:grid-cols-2 xl:grid-cols-5" aria-label="AI literacy summary">
          {[
            { label: text.coverage, value: coverage?.score === null || coverage?.score === undefined ? '—' : `${coverage.score}%`, icon: ShieldCheck },
            { label: text.programmes, value: snapshot?.programs.length ?? 0, icon: GraduationCap },
            { label: text.courses, value: snapshot?.courses.length ?? 0, icon: BookOpenCheck },
            { label: text.assignments, value: coverage?.totals.assignments ?? 0, icon: Users },
            { label: text.verified, value: coverage?.totals.ready ?? 0, icon: CheckCircle2 },
          ].map(({ label, value, icon: Icon }, index) => (
            <article key={label} className={`p-5 ${index > 0 ? 'border-t border-white/[0.055] sm:border-l sm:border-t-0' : ''}`}>
              <div className="flex items-center justify-between gap-3"><p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/35">{label}</p><Icon className="h-4 w-4 text-emerald-200/65" aria-hidden="true" /></div>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white">{value}</p>
              {label === text.coverage ? <ProgressLine value={coverage?.score ?? 0} label={text.coverage} /> : null}
            </article>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <article className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715]">
            <SectionHeader title={text.createProgramme} description="Create the accountable Article 4 programme before publishing courses." />
            <div className="space-y-3 p-5">
              <input aria-label="Programme title" value={programmeTitle} onChange={(event) => setProgrammeTitle(event.target.value)} className={inputClass} />
              <textarea aria-label="Programme description" value={programmeDescription} onChange={(event) => setProgrammeDescription(event.target.value)} rows={3} className={inputClass} />
              <input aria-label="Review due date" type="date" value={reviewDueAt} onChange={(event) => setReviewDueAt(event.target.value)} className={inputClass} />
              <button type="button" disabled={busy !== null} onClick={() => void runWorkflow('program_create', { title: programmeTitle, description: programmeDescription, reviewDueAt: toIsoDate(reviewDueAt) })} className={primaryButton}>{text.createProgramme}</button>
            </div>
            <div className="divide-y divide-white/[0.055] border-t border-white/[0.055]">
              {(snapshot?.programs ?? []).map((program) => (
                <div key={program.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0"><p className="truncate text-sm font-medium text-white/82">{program.title}</p><p className="mt-1 text-xs text-white/34">Review: {formatDate(program.review_due_at, locale)}</p></div>
                  {program.status === 'draft' ? <button type="button" className={secondaryButton} onClick={() => void runWorkflow('program_activate', { programId: program.id })}>{text.activate}</button> : <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusTone(program.status)}`}>{program.status}</span>}
                </div>
              ))}
              {snapshot?.programs.length === 0 ? <p className="px-5 py-4 text-sm text-white/35">{text.noRecords}</p> : null}
            </div>
          </article>

          <article className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715]">
            <SectionHeader title={text.createCourse} description="Versioned training content can only be published under an active programme." />
            <div className="space-y-3 p-5">
              <select aria-label="Programme" value={courseProgramId} onChange={(event) => setCourseProgramId(event.target.value)} className={inputClass}><option value="">Select active programme</option>{activeProgrammes.map((program) => <option key={program.id} value={program.id}>{program.title}</option>)}</select>
              <div className="grid gap-3 sm:grid-cols-[1fr_7rem]"><input aria-label="Course title" value={courseTitle} onChange={(event) => setCourseTitle(event.target.value)} className={inputClass} /><input aria-label="Course version" value={courseVersion} onChange={(event) => setCourseVersion(event.target.value)} className={inputClass} /></div>
              <textarea aria-label="Course modules" value={courseModules} onChange={(event) => setCourseModules(event.target.value)} rows={4} className={inputClass} />
              <div className="grid gap-3 sm:grid-cols-2"><input aria-label="Passing score" type="number" min="0" max="100" value={passingScore} onChange={(event) => setPassingScore(event.target.value)} className={inputClass} /><input aria-label="Validity days" type="number" min="1" max="3650" value={validityDays} onChange={(event) => setValidityDays(event.target.value)} className={inputClass} /></div>
              <button type="button" disabled={busy !== null || !courseProgramId} onClick={() => void runWorkflow('course_create', {
                programId: courseProgramId, title: courseTitle, version: courseVersion,
                audienceRoles: ['employee', 'contractor'], riskLevels: ['all'], departments: [],
                modules: courseModules.split('\n').map((line) => line.trim()).filter(Boolean).map((line, index) => ({ id: `module-${index + 1}`, title: line, content: line })),
                passingScore: passingScore ? Number(passingScore) : null, validityDays: validityDays ? Number(validityDays) : null,
              })} className={primaryButton}>{text.createCourse}</button>
            </div>
            <div className="divide-y divide-white/[0.055] border-t border-white/[0.055]">
              {(snapshot?.courses ?? []).map((course) => (
                <div key={course.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0"><p className="truncate text-sm font-medium text-white/82">{course.title} <span className="text-white/32">v{course.version}</span></p><p className="mt-1 text-xs text-white/34">{course.modules.length} modules · pass {course.passing_score ?? '—'}%</p></div>
                  {course.status === 'draft' ? <button type="button" className={secondaryButton} onClick={() => void runWorkflow('course_publish', { courseId: course.id })}>{text.publish}</button> : <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusTone(course.status)}`}>{course.status}</span>}
                </div>
              ))}
            </div>
          </article>

          <article className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715]">
            <SectionHeader title={text.assignTraining} description="Assignments are scoped to published course versions and named people." />
            <div className="space-y-3 p-5">
              <select aria-label="Published course" value={assignmentCourseId} onChange={(event) => setAssignmentCourseId(event.target.value)} className={inputClass}><option value="">Select published course</option>{publishedCourses.map((course) => <option key={course.id} value={course.id}>{course.title} · v{course.version}</option>)}</select>
              <input aria-label="Assignee email" type="email" value={assigneeEmail} onChange={(event) => setAssigneeEmail(event.target.value)} placeholder="person@company.com" className={inputClass} />
              <div className="grid gap-3 sm:grid-cols-2"><input aria-label="Role title" value={roleTitle} onChange={(event) => setRoleTitle(event.target.value)} placeholder="Role" className={inputClass} /><input aria-label="Department" value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="Department" className={inputClass} /></div>
              <input aria-label="Due date" type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className={inputClass} />
              <button type="button" disabled={busy !== null || !assignmentCourseId || !assigneeEmail} onClick={() => void runWorkflow('assignment_create', { courseId: assignmentCourseId, assigneeEmail, assigneeType: 'employee', roleTitle, department, dueAt: toIsoDate(dueAt) })} className={primaryButton}>{text.assignTraining}</button>
            </div>
            <div className="divide-y divide-white/[0.055] border-t border-white/[0.055]">
              {(snapshot?.assignments ?? []).slice(0, 8).map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0"><p className="truncate text-sm font-medium text-white/82">{assignment.assignee_email ?? assignment.role_title ?? 'Assigned person'}</p><p className="mt-1 text-xs text-white/34">Due {formatDate(assignment.due_at, locale)} · score {assignment.score ?? '—'}</p></div>
                  <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusTone(assignment.status)}`}>{assignment.status}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715]">
            <SectionHeader title={text.recordCompletion} description="Completion is not readiness until valid evidence is independently approved." />
            <div className="space-y-3 p-5">
              <select aria-label="Open assignment" value={completionAssignmentId} onChange={(event) => setCompletionAssignmentId(event.target.value)} className={inputClass}><option value="">Select assignment</option>{openAssignments.map((assignment) => <option key={assignment.id} value={assignment.id}>{assignment.assignee_email ?? assignment.id}</option>)}</select>
              <input aria-label="Completion score" type="number" min="0" max="100" value={completionScore} onChange={(event) => setCompletionScore(event.target.value)} placeholder="Assessment score" className={inputClass} />
              <button type="button" disabled={busy !== null || !completionAssignmentId} onClick={() => void runWorkflow('assignment_complete', { assignmentId: completionAssignmentId, score: completionScore ? Number(completionScore) : null })} className={primaryButton}><CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />{text.complete}</button>

              <div className="border-t border-white/[0.055] pt-4"><h3 className="text-sm font-semibold text-white/82">{text.submitEvidence}</h3></div>
              <select aria-label="Completed assignment" value={evidenceAssignmentId} onChange={(event) => setEvidenceAssignmentId(event.target.value)} className={inputClass}><option value="">Select completed assignment</option>{completedAssignments.map((assignment) => <option key={assignment.id} value={assignment.id}>{assignment.assignee_email ?? assignment.id}</option>)}</select>
              <select aria-label="Evidence type" value={evidenceType} onChange={(event) => setEvidenceType(event.target.value)} className={inputClass}><option value="completion_record">Completion record</option><option value="assessment_result">Assessment result</option><option value="attendance">Attendance</option><option value="acknowledgement">Acknowledgement</option><option value="certificate">Certificate</option><option value="other">Other</option></select>
              <input aria-label="Evidence title" value={evidenceTitle} onChange={(event) => setEvidenceTitle(event.target.value)} className={inputClass} />
              <input aria-label="HTTPS evidence URL" type="url" value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} placeholder="https://…" className={inputClass} />
              <button type="button" disabled={busy !== null || !evidenceAssignmentId || !evidenceUrl} onClick={() => void runWorkflow('evidence_submit', { assignmentId: evidenceAssignmentId, evidenceType, title: evidenceTitle, externalUrl: evidenceUrl })} className={primaryButton}><FileCheck2 className="mr-2 h-4 w-4" aria-hidden="true" />{text.submitEvidence}</button>
            </div>
          </article>
        </section>

        <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715]" aria-labelledby="literacy-evidence-title">
          <SectionHeader title={text.evidence} description="Submitted evidence requires a different reviewer before it contributes 100% coverage." />
          <div id="literacy-evidence-title" className="sr-only">{text.evidence}</div>
          {(snapshot?.evidence ?? []).length ? (
            <div className="divide-y divide-white/[0.055]">
              {(snapshot?.evidence ?? []).map((item) => (
                <article key={item.id} className="flex flex-col justify-between gap-4 px-5 py-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 items-start gap-3"><FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200/65" aria-hidden="true" /><div className="min-w-0"><p className="truncate text-sm font-medium text-white/84">{item.title}</p><p className="mt-1 text-xs text-white/34">{item.evidence_type} · assignment {item.assignment_id.slice(0, 8)}</p></div></div>
                  <div className="flex flex-wrap items-center gap-2"><span className={`rounded-lg border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusTone(item.status)}`}>{item.status}</span>{['submitted', 'under_review'].includes(item.status) ? <><button type="button" className={secondaryButton} onClick={() => void runWorkflow('evidence_review', { evidenceId: item.id, decision: 'approved' })}>{text.approve}</button><button type="button" className="inline-flex min-h-9 items-center justify-center rounded-lg border border-rose-300/20 bg-rose-300/[0.055] px-3 text-xs font-semibold text-rose-100 transition hover:bg-rose-300/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/50" onClick={() => void runWorkflow('evidence_review', { evidenceId: item.id, decision: 'rejected' })}>{text.reject}</button></> : null}</div>
                </article>
              ))}
            </div>
          ) : <div className="flex items-center gap-2 px-5 py-6 text-sm text-white/35"><Clock3 className="h-4 w-4" aria-hidden="true" />{text.noRecords}</div>}
        </section>
      </div>
    </main>
  );
}
