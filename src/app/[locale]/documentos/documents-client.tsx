'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, FileText, Plus, UploadCloud } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type ControlledDocument = {
  id: string;
  title: string;
  version: number;
  status: 'Pendente' | 'Aprovado' | 'Revisão';
  owner: string;
  checksum?: string;
};

type InitialDocument = {
  id: string;
  title: string | null;
  status: string | null;
  version: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type DocumentEntitlements = {
  plan: string;
  maxDocuments: number;
};

const storageKey = 'eurocomply-controlled-documents-demo';
const defaultDocuments: ControlledDocument[] = [
  { id: 'doc-1', title: 'Política de Privacidade', version: 2, status: 'Aprovado', owner: 'Compliance' },
  { id: 'doc-2', title: 'Matriz de Riscos', version: 1, status: 'Pendente', owner: 'Security' },
];

function normalizeStatus(status: string | null | undefined): ControlledDocument['status'] {
  const value = String(status ?? '').toLowerCase();
  if (value.includes('approved') || value.includes('aprov')) return 'Aprovado';
  if (value.includes('review') || value.includes('revis')) return 'Revisão';
  return 'Pendente';
}

function normalizeInitialDocuments(initialDocuments: InitialDocument[]): ControlledDocument[] {
  return initialDocuments.map((document) => ({
    id: document.id,
    title: document.title ?? 'Documento sem título',
    version: document.version ?? 1,
    status: normalizeStatus(document.status),
    owner: 'Compliance',
  }));
}

function formatPlan(plan: string) {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

function formatLimit(limit?: number) {
  if (typeof limit !== 'number' || !Number.isFinite(limit)) return 'ilimitado';
  return String(limit);
}

export function DocumentsClient({
  locale,
  initialDocuments = [],
  entitlements,
}: {
  locale: string;
  initialDocuments?: InitialDocument[];
  entitlements?: DocumentEntitlements | null;
}) {
  const serverDocuments = useMemo(() => normalizeInitialDocuments(initialDocuments), [initialDocuments]);
  const [documents, setDocuments] = useState<ControlledDocument[]>(serverDocuments.length > 0 ? serverDocuments : defaultDocuments);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [toast, setToast] = useState('');

  const maxDocuments = entitlements?.maxDocuments;
  const hasFiniteLimit = typeof maxDocuments === 'number' && Number.isFinite(maxDocuments);
  const quotaReached = hasFiniteLimit && documents.length >= maxDocuments;
  const usageLabel = `${documents.length}/${formatLimit(maxDocuments)}`;

  useEffect(() => {
    if (serverDocuments.length > 0) {
      setDocuments(serverDocuments);
      return;
    }

    const saved = window.localStorage.getItem(storageKey);
    if (saved) setDocuments(JSON.parse(saved));
  }, [serverDocuments]);

  useEffect(() => {
    if (serverDocuments.length === 0) {
      window.localStorage.setItem(storageKey, JSON.stringify(documents));
    }
  }, [documents, serverDocuments.length]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 3200);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
  }

  async function uploadDocument(event: FormEvent) {
    event.preventDefault();

    if (quotaReached) {
      showToast(`O plano ${formatPlan(entitlements?.plan ?? 'essential')} atingiu o limite de ${formatLimit(maxDocuments)} documentos.`);
      return;
    }

    if (!title.trim() && !file) {
      showToast('Informe o nome do documento ou selecione um arquivo.');
      return;
    }

    if (!file) {
      setDocuments((current) => [{ id: crypto.randomUUID(), title: title.trim(), version: 1, status: 'Pendente', owner: 'Compliance' }, ...current]);
      setTitle('');
      showToast('Documento demo criado com aprovação pendente.');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        showToast(payload.message ?? payload.error ?? 'Não foi possível carregar o documento com segurança.');
        return;
      }

      const uploadedTitle = payload.document?.title ?? title.trim() ?? file.name;

      setDocuments((current) => [
        {
          id: payload.document?.id ?? crypto.randomUUID(),
          title: uploadedTitle,
          version: payload.document?.version ?? 1,
          status: normalizeStatus(payload.document?.status),
          owner: 'Compliance',
          checksum: payload.checksum,
        },
        ...current,
      ]);
      setTitle('');
      setFile(null);
      showToast('Documento carregado com validação segura e enviado para revisão.');
    } catch {
      showToast('Falha de rede ao carregar documento.');
    } finally {
      setIsUploading(false);
    }
  }

  function bumpVersion(id: string) {
    setDocuments((current) => current.map((doc) => (doc.id === id ? { ...doc, version: doc.version + 1, status: 'Revisão' } : doc)));
    showToast('Nova versão criada e enviada para revisão.');
  }

  async function approveDocument(id: string) {
    try {
      const response = await fetch(`/api/documents/${id}/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', note: 'Approved from controlled documents page' }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        showToast(payload.error ?? 'Não foi possível aprovar o documento.');
        return;
      }
      setDocuments((current) => current.map((doc) => (doc.id === id ? { ...doc, status: 'Aprovado' } : doc)));
      showToast(payload.persisted ? 'Documento aprovado e registado.' : 'Aprovação registada como evento de auditoria.');
    } catch {
      showToast('Falha de rede ao aprovar documento.');
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-8 md:py-12">
      {toast ? <div className="fixed right-4 top-4 z-50 rounded-2xl border bg-background px-4 py-3 text-sm shadow-xl"><CheckCircle2 className="mr-2 inline h-4 w-4 text-emerald-600" />{toast}</div> : null}

      <section className="rounded-[2rem] border bg-background/90 p-6 shadow-xl shadow-primary/5 md:p-8">
        <Badge className="rounded-full uppercase tracking-[0.18em]">Evidence control</Badge>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em]">Central de Documentos Controlados</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Upload validado, versionamento e aprovação visual para políticas, atas, certificados e evidências.</p>
      </section>

      {entitlements ? (
        <Alert className="rounded-[1.5rem] border bg-background/90">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Plano {formatPlan(entitlements.plan)}: {usageLabel} documentos utilizados</AlertTitle>
          <AlertDescription>
            {quotaReached ? (
              <span>O limite deste plano foi atingido. Faça upgrade para continuar a carregar documentos controlados.</span>
            ) : (
              <span>Este limite também é validado no servidor antes de qualquer upload.</span>
            )}
            <Button asChild variant="link" className="ml-1 h-auto p-0"><Link href={`/${locale}/pricing`}>Ver upgrade</Link></Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <form onSubmit={uploadDocument} className="grid gap-3 rounded-[2rem] border bg-background/90 p-5 shadow-sm md:grid-cols-[1fr_1fr_auto]">
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Nome do documento" disabled={quotaReached} className="min-w-0 rounded-2xl border bg-background px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60" />
        <input onChange={onFileChange} type="file" disabled={quotaReached} accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/png,image/jpeg" className="min-w-0 rounded-2xl border bg-background px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60" />
        <Button type="submit" disabled={isUploading || quotaReached} className="rounded-full"><UploadCloud className="h-4 w-4" />{isUploading ? 'A carregar...' : quotaReached ? 'Limite atingido' : 'Upload seguro'}</Button>
      </form>

      <section className="grid gap-4 md:grid-cols-2">
        {documents.map((document) => (
          <article key={document.id} className="rounded-[1.5rem] border bg-background/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold"><FileText className="mr-2 inline h-5 w-5 text-primary" />{document.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">Owner: {document.owner} · versão v{document.version}</p>
                {document.checksum ? <p className="mt-1 break-all text-xs text-muted-foreground">SHA-256: {document.checksum.slice(0, 24)}...</p> : null}
              </div>
              <Badge variant={document.status === 'Aprovado' ? 'default' : 'outline'}>{document.status}</Badge>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="rounded-full" onClick={() => bumpVersion(document.id)}><Plus className="h-4 w-4" />Nova versão</Button>
              <Button type="button" className="rounded-full" onClick={() => approveDocument(document.id)}><CheckCircle2 className="h-4 w-4" />Aprovar</Button>
              <Button asChild variant="outline" className="rounded-full"><Link href={`/${locale}/aprovacoes`}>Ver workflow</Link></Button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
