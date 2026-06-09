'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, FileText, Plus, UploadCloud } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type ControlledDocument = {
  id: string;
  title: string;
  version: number;
  status: 'Pendente' | 'Aprovado' | 'Revisão';
  owner: string;
};

const storageKey = 'eurocomply-controlled-documents-demo';
const defaultDocuments: ControlledDocument[] = [
  { id: 'doc-1', title: 'Política de Privacidade', version: 2, status: 'Aprovado', owner: 'Compliance' },
  { id: 'doc-2', title: 'Matriz de Riscos', version: 1, status: 'Pendente', owner: 'Security' },
];

export function DocumentsClient({ locale }: { locale: string }) {
  const [documents, setDocuments] = useState<ControlledDocument[]>(defaultDocuments);
  const [title, setTitle] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) setDocuments(JSON.parse(saved));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(documents));
  }, [documents]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  }

  function uploadDocument(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      showToast('Informe o nome do documento.');
      return;
    }
    setDocuments((current) => [{ id: crypto.randomUUID(), title, version: 1, status: 'Pendente', owner: 'Compliance' }, ...current]);
    setTitle('');
    showToast('Upload simulado criado com aprovação pendente.');
  }

  function bumpVersion(id: string) {
    setDocuments((current) => current.map((doc) => (doc.id === id ? { ...doc, version: doc.version + 1, status: 'Revisão' } : doc)));
    showToast('Nova versão criada e enviada para revisão.');
  }

  function approveDocument(id: string) {
    setDocuments((current) => current.map((doc) => (doc.id === id ? { ...doc, status: 'Aprovado' } : doc)));
    showToast('Documento aprovado na demo.');
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-8 md:py-12">
      {toast ? <div className="fixed right-4 top-4 z-50 rounded-2xl border bg-background px-4 py-3 text-sm shadow-xl"><CheckCircle2 className="mr-2 inline h-4 w-4 text-emerald-600" />{toast}</div> : null}

      <section className="rounded-[2rem] border bg-background/90 p-6 shadow-xl shadow-primary/5 md:p-8">
        <Badge className="rounded-full uppercase tracking-[0.18em]">Evidence control</Badge>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em]">Central de Documentos Controlados</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Upload simulado, versionamento e aprovação visual para políticas, atas, certificados e evidências.</p>
      </section>

      <form onSubmit={uploadDocument} className="flex flex-col gap-3 rounded-[2rem] border bg-background/90 p-5 shadow-sm md:flex-row">
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Nome do documento" className="min-w-0 flex-1 rounded-2xl border bg-background px-4 py-3 text-sm" />
        <Button type="submit" className="rounded-full"><UploadCloud className="h-4 w-4" />Upload simulado</Button>
      </form>

      <section className="grid gap-4 md:grid-cols-2">
        {documents.map((document) => (
          <article key={document.id} className="rounded-[1.5rem] border bg-background/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold"><FileText className="mr-2 inline h-5 w-5 text-primary" />{document.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">Owner: {document.owner} · versão v{document.version}</p>
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
