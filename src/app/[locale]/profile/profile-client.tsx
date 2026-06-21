'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { ArrowRight, Building2, CheckCircle2, Crown, Diamond, Download, LockKeyhole, Mail, Plus, Save, ShieldCheck, Trash2, UploadCloud, UsersRound } from 'lucide-react';
import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const defaultCompany = {
  legalName: 'RISCK COMPLY Europe GmbH',
  tradeName: 'RISCK COMPLY',
  email: 'compliance@risckcomply.com',
  phone: '+351 910 000 000',
  street: 'Avenida da Liberdade',
  number: '110',
  postalCode: '1250-146',
  city: 'Lisboa',
  logoUrl: 'https://dummyimage.com/180x180/111827/ffffff&text=RC',
};

const fiscalCountries = {
  Portugal: { label: 'NIF', helper: '9 dígitos', placeholder: '509442013', pattern: /^\d{9}$/ },
  França: { label: 'SIRET ou SIREN', helper: '14 ou 9 dígitos', placeholder: '12345678900012', pattern: /^(\d{9}|\d{14})$/ },
  Espanha: { label: 'NIF', helper: '8 dígitos + letra', placeholder: '12345678Z', pattern: /^\d{8}[A-Za-z]$/ },
  Alemanha: { label: 'Steuernummer', helper: '10–11 dígitos', placeholder: '12345678901', pattern: /^\d{10,11}$/ },
  Itália: { label: 'Partita IVA', helper: '11 dígitos', placeholder: '12345678901', pattern: /^\d{11}$/ },
  Holanda: { label: 'BTW-nummer', helper: '14 caracteres', placeholder: 'NL123456789B01', pattern: /^.{14}$/ },
  Bélgica: { label: "Numéro d'entreprise", helper: '10 dígitos', placeholder: '0123456789', pattern: /^\d{10}$/ },
  Irlanda: { label: 'VAT Number', helper: '8 a 10 caracteres', placeholder: '1234567A', pattern: /^[A-Za-z0-9]{8,10}$/ },
  Outro: { label: 'Identificação fiscal', helper: 'Formato local', placeholder: 'ID fiscal europeu', pattern: /^.{3,}$/ },
};

type CountryKey = keyof typeof fiscalCountries;
type Plan = 'Essential' | 'Professional' | 'Business' | 'Enterprise';

type FiscalId = {
  id: string;
  country: CountryKey;
  value: string;
};

const initialFiscalIds: FiscalId[] = [
  { id: 'fiscal-fr', country: 'França', value: '12345678900012' },
  { id: 'fiscal-es', country: 'Espanha', value: '12345678Z' },
];

const initialEmployees = [
  { id: 'employee-ana', name: 'Ana Martins', email: 'ana@risckcomply.com', role: 'Admin', status: 'ativo' },
  { id: 'employee-miguel', name: 'Miguel Costa', email: 'miguel@risckcomply.com', role: 'Visualizador', status: 'pendente' },
];

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeFiscalValue(value: string) {
  return value.replace(/[\s.-]/g, '').trim();
}

function isFiscalIdValid(item: FiscalId) {
  if (!item.value.trim()) return true;
  return fiscalCountries[item.country].pattern.test(normalizeFiscalValue(item.value));
}

export function ProfileClient({ locale }: { locale: string }) {
  const [company, setCompany] = useState(defaultCompany);
  const [plan, setPlan] = useState<Plan>('Essential');
  const [fiscalIds, setFiscalIds] = useState<FiscalId[]>(initialFiscalIds);
  const [employees, setEmployees] = useState(initialEmployees);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Editor');
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState('');

  const isBusinessOrEnterprise = plan === 'Business' || plan === 'Enterprise';
  const isEnterprise = plan === 'Enterprise';
  const allFiscalIdsValid = useMemo(() => fiscalIds.every(isFiscalIdValid), [fiscalIds]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2800);
  }

  function updateCompany(field: keyof typeof company, value: string) {
    setCompany((current) => ({ ...current, [field]: value }));
    setSaved(false);
  }

  function addFiscalCountry() {
    if (!isBusinessOrEnterprise) {
      showToast('Gestão multi-país disponível nos planos Business e Enterprise.');
      return;
    }
    setFiscalIds((current) => [...current, { id: createId('fiscal'), country: 'Portugal', value: '' }]);
    setSaved(false);
    showToast('País fiscal adicionado.');
  }

  function updateFiscalId(id: string, field: 'country' | 'value', value: string) {
    setFiscalIds((current) => current.map((item) => (item.id === id ? ({ ...item, [field]: value } as FiscalId) : item)));
    setSaved(false);
  }

  function removeFiscalId(id: string) {
    if (!isBusinessOrEnterprise) {
      showToast('Faça upgrade para Business ou Enterprise para editar operações fiscais multi-país.');
      return;
    }
    setFiscalIds((current) => current.filter((item) => item.id !== id));
    setSaved(false);
    showToast('País fiscal removido.');
  }

  function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!allFiscalIdsValid) {
      showToast('Corrija os identificadores fiscais antes de guardar.');
      return;
    }
    localStorage.setItem('risck-comply-profile-demo', JSON.stringify({ company, fiscalIds, plan, employees }));
    setSaved(true);
    showToast('Perfil guardado localmente.');
  }

  async function inviteEmployee() {
    if (!isEnterprise) {
      showToast('Convites de equipa exigem plano Enterprise.');
      return;
    }
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      showToast('Informe um email válido.');
      return;
    }

    const response = await fetch('/api/team/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });

    if (!response.ok) {
      showToast(response.status === 403 ? 'Upgrade Enterprise necessário para convidar equipa.' : 'Não foi possível enviar o convite.');
      return;
    }

    setEmployees((current) => [...current, { id: createId('employee'), name: inviteEmail.split('@')[0], email: inviteEmail, role: inviteRole, status: 'pendente' }]);
    setInviteEmail('');
    showToast('Convite registado com validação server-side.');
  }

  async function openBillingPortal() {
    const response = await fetch('/api/billing/portal', { method: 'POST' });
    if (!response.ok) {
      showToast('Ainda não existe uma assinatura Stripe ativa para esta organização.');
      return;
    }
    const payload = (await response.json()) as { url?: string };
    if (payload.url) {
      window.location.href = payload.url;
      return;
    }
    showToast('Não foi possível abrir o portal de faturação.');
  }

  async function downloadGdprExport() {
    const response = await fetch('/api/gdpr/export');
    if (!response.ok) {
      showToast('Não foi possível preparar a exportação GDPR.');
      return;
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'risck-comply-gdpr-export.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    showToast('Exportação GDPR descarregada.');
  }

  async function requestGdprDelete() {
    const response = await fetch('/api/gdpr/delete-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Pedido iniciado pelo painel de perfil.' }),
    });
    showToast(response.ok ? 'Pedido GDPR enviado para revisão.' : 'Não foi possível criar o pedido GDPR.');
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_hsl(var(--primary)/0.13),_transparent_34%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.32))]">
      <DashboardCommandNavigation locale={locale} activePage="Perfil" />
      {toast ? <div className="fixed right-4 top-20 z-50 rounded-2xl border bg-background px-4 py-3 text-sm shadow-xl">{toast}</div> : null}

      <form id="company-data" onSubmit={saveProfile} className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-8 md:py-12">
        <section className="rounded-[2rem] border bg-background/88 p-6 shadow-xl shadow-primary/5 backdrop-blur md:p-9">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge className="rounded-full px-3 py-1 uppercase tracking-[0.18em]">Perfil europeu</Badge>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">Empresa, fiscalidade e equipa.</h1>
              <p className="mt-3 max-w-2xl text-muted-foreground">Gerencie dados comerciais, identificações fiscais por país, equipa e direitos GDPR.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['Essential', 'Professional', 'Business', 'Enterprise'] as const).map((item) => (
                <button key={item} type="button" onClick={() => { setPlan(item); showToast(`Plano simulado: ${item}`); }} className={`rounded-full border px-4 py-2 text-sm font-medium transition ${plan === item ? 'border-primary bg-primary text-primary-foreground shadow-lg' : 'bg-background hover:bg-muted'}`}>
                  Simular {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr]">
          <section className="rounded-[2rem] border bg-background/88 p-6 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary"><Building2 className="h-5 w-5" /></div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {[
                ['Razão Social', 'legalName'], ['Nome Comercial', 'tradeName'], ['Email da empresa', 'email'], ['Telefone com indicativo', 'phone'], ['Rua', 'street'], ['Número', 'number'], ['Código Postal', 'postalCode'], ['Cidade', 'city'], ['Logo da empresa URL', 'logoUrl'],
              ].map(([label, field]) => (
                <label key={field} className={field === 'logoUrl' ? 'md:col-span-2' : ''}><span className="text-sm font-medium">{label}</span><input value={company[field as keyof typeof company]} onChange={(event) => updateCompany(field as keyof typeof company, event.target.value)} className="mt-1 w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10" /></label>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3"><Button type="submit" disabled={!allFiscalIdsValid} className="rounded-full"><Save className="h-4 w-4" /> Guardar alterações</Button><Button type="button" variant="outline" className="rounded-full" onClick={() => { updateCompany('logoUrl', 'https://dummyimage.com/180x180/d4af37/111827&text=RC'); showToast('Upload de logo simulado.'); }}><UploadCloud className="h-4 w-4" /> Simular upload de logo</Button>{saved ? <span className="inline-flex items-center gap-2 text-sm text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Guardado no localStorage demo.</span> : null}</div>
          </section>

          <aside id="enterprise-status" className="space-y-6">
            <section className={`rounded-[2rem] border p-6 shadow-sm backdrop-blur ${isEnterprise ? 'border-foreground/30 bg-gradient-to-br from-muted to-background shadow-foreground/10' : 'bg-background/88'}`}>
              <div className="flex items-start justify-between gap-4"><div><p className="text-sm text-muted-foreground">Plano atual</p><h2 className="mt-1 text-3xl font-semibold">{plan}</h2></div><Badge className="rounded-full">{isEnterprise ? <Diamond className="mr-1 h-3.5 w-3.5" /> : <Crown className="mr-1 h-3.5 w-3.5" />}{isEnterprise ? 'Enterprise' : 'Upgrade disponível'}</Badge></div>
              <div className="mt-5 flex items-center gap-4"><div className={`relative h-20 w-20 overflow-hidden rounded-3xl border-4 bg-muted ${isEnterprise ? 'border-foreground shadow-lg shadow-foreground/10' : 'border-border'}`}><Image src={company.logoUrl} alt="Logo da empresa" fill className="object-cover" unoptimized /></div><div><p className="font-semibold">{company.tradeName}</p><p className="text-sm text-muted-foreground">{company.city}, Europa</p><Button type="button" variant="outline" size="sm" className="mt-3 rounded-full" onClick={openBillingPortal}>Gerir assinatura <ArrowRight className="h-4 w-4" /></Button></div></div>
            </section>
          </aside>
        </div>

        <section className="rounded-[2rem] border bg-background/88 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><h2 className="text-2xl font-semibold tracking-tight">Identificação fiscal por país</h2><p className="mt-1 text-sm text-muted-foreground">Portugal não é obrigatório. Cada país ajusta automaticamente o tipo de identificação, máscara e validação.</p></div><Button type="button" onClick={addFiscalCountry} variant="outline" className="rounded-full"><Plus className="h-4 w-4" /> Adicionar país</Button></div>
          {!isBusinessOrEnterprise ? <div className="mt-5 rounded-2xl border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground"><LockKeyhole className="mr-2 inline h-4 w-4" /> No plano {plan}, a gestão multi-país aparece como preview bloqueado. Faça upgrade para Business ou Enterprise.</div> : null}
          <div className="mt-5 grid gap-3 md:grid-cols-2">{fiscalIds.map((item) => { const meta = fiscalCountries[item.country]; const valid = isFiscalIdValid(item); return <div key={item.id} className={`relative rounded-2xl border p-4 transition ${!isBusinessOrEnterprise ? 'bg-muted/30 opacity-75' : 'bg-muted/15 hover:border-primary/40'}`}>{!isBusinessOrEnterprise ? <div className="absolute right-4 top-4 rounded-full bg-background/90 px-2 py-1 text-xs"><LockKeyhole className="mr-1 inline h-3 w-3" /> Bloqueado</div> : null}<div className="grid gap-3 md:grid-cols-[0.85fr_1.15fr]"><label><span className="text-sm font-medium">País</span><select disabled={!isBusinessOrEnterprise} value={item.country} onChange={(event) => updateFiscalId(item.id, 'country', event.target.value as CountryKey)} className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:cursor-not-allowed">{(Object.keys(fiscalCountries) as CountryKey[]).map((country) => <option key={country}>{country}</option>)}</select></label><label><span className="text-sm font-medium">{meta.label}</span><input disabled={!isBusinessOrEnterprise} value={item.value} onChange={(event) => updateFiscalId(item.id, 'value', event.target.value)} placeholder={meta.placeholder} className={`mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:cursor-not-allowed ${valid ? '' : 'border-red-500'}`} /><span className={`mt-1 block text-xs ${valid ? 'text-muted-foreground' : 'text-red-600'}`}>{valid ? meta.helper : `Formato esperado: ${meta.helper}`}</span></label></div><button disabled={!isBusinessOrEnterprise} type="button" onClick={() => removeFiscalId(item.id)} className="mt-3 rounded-xl border px-3 py-2 text-sm text-muted-foreground transition hover:bg-red-500/10 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"><Trash2 className="mr-1 inline h-4 w-4" /> Remover</button></div>; })}</div>
        </section>

        <section id="employees" className="rounded-[2rem] border bg-background/88 p-6 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3"><UsersRound className="h-5 w-5 text-primary" /><h2 className="text-2xl font-semibold">Gestão de funcionários</h2></div>
          {isEnterprise ? <div className="mt-5 space-y-5"><div className="grid gap-3 md:grid-cols-[1fr_220px_auto]"><input value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="email@empresa.com" className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary" /><select value={inviteRole} onChange={(event) => setInviteRole(event.target.value)} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary"><option>Admin</option><option>Editor</option><option>Visualizador</option></select><Button type="button" onClick={inviteEmployee} className="rounded-full"><Mail className="h-4 w-4" /> Convidar funcionário</Button></div><div className="grid gap-3 md:grid-cols-2">{employees.map((employee) => <div key={employee.id} className="rounded-2xl border bg-muted/20 p-4"><p className="font-semibold">{employee.name}</p><p className="text-sm text-muted-foreground">{employee.email}</p><div className="mt-3 flex gap-2"><Badge variant="outline">{employee.role}</Badge><Badge>{employee.status}</Badge></div></div>)}</div></div> : <div className="mt-5 rounded-2xl border bg-muted/30 p-5 text-sm leading-6 text-muted-foreground"><LockKeyhole className="mr-2 inline h-4 w-4" /> Upgrade para o plano Enterprise e convide funcionários para colaborar na implementação dos documentos.<div><Button asChild className="mt-4 rounded-full"><Link href={`/${locale}/pricing`}>Fazer upgrade</Link></Button></div></div>}
        </section>

        <section id="privacy" className="rounded-[2rem] border bg-background/88 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div className="flex items-start gap-3"><div className="rounded-2xl bg-primary/10 p-3 text-primary"><ShieldCheck className="h-5 w-5" /></div><div><h2 className="text-2xl font-semibold">Privacidade & GDPR</h2><p className="mt-1 text-sm text-muted-foreground">Ações protegidas por sessão. Exportação gera auditoria e notificação; apagamento fica pendente para revisão legal.</p></div></div><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" className="rounded-full" onClick={downloadGdprExport}><Download className="h-4 w-4" /> Exportar dados</Button><Button type="button" variant="destructive" className="rounded-full" onClick={requestGdprDelete}><Trash2 className="h-4 w-4" /> Solicitar apagamento</Button></div></div>
        </section>
      </form>
    </main>
  );
}
