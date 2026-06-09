'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { ArrowRight, Building2, CheckCircle2, Crown, Diamond, LockKeyhole, Mail, Plus, Save, Sparkles, Trash2, UploadCloud, UsersRound } from 'lucide-react';
import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const defaultCompany = {
  legalName: 'EuroComply Europe GmbH',
  tradeName: 'EuroComply',
  email: 'compliance@eurocomply.eu',
  phone: '+351 910 000 000',
  street: 'Avenida da Liberdade',
  number: '110',
  postalCode: '1250-146',
  city: 'Lisboa',
  logoUrl: 'https://dummyimage.com/180x180/111827/ffffff&text=EC',
};

const fiscalCountries = {
  Portugal: { label: 'NIF', helper: '9 dígitos', placeholder: '509442013', pattern: /^\d{9}$/ },
  França: { label: 'SIRET ou SIREN', helper: '14 ou 9 dígitos', placeholder: '12345678900012', pattern: /^(\d{9}|\d{14})$/ },
  Espanha: { label: 'NIF', helper: '8 dígitos + letra', placeholder: '12345678Z', pattern: /^\d{8}[A-Za-z]$/ },
  Alemanha: { label: 'Steuernummer', helper: '10–11 dígitos', placeholder: '12345678901', pattern: /^\d{10,11}$/ },
  Itália: { label: 'Partita IVA', helper: '11 dígitos', placeholder: '12345678901', pattern: /^\d{11}$/ },
  Holanda: { label: 'BTW-nummer', helper: '14 caracteres', placeholder: 'NL123456789B01', pattern: /^.{14}$/ },
  Bélgica: { label: "Numéro d'entreprise", helper: '10 dígitos', placeholder: '0123456789', pattern: /^\d{10}$/ },
  Irlanda: { label: 'VAT Number', helper: '8 caracteres + letras', placeholder: '1234567A', pattern: /^[A-Za-z0-9]{8,10}$/ },
  Outro: { label: 'Identificação fiscal', helper: 'Formato local', placeholder: 'ID fiscal europeu', pattern: /^.{3,}$/ },
};

type CountryKey = keyof typeof fiscalCountries;

type FiscalId = {
  id: string;
  country: CountryKey;
  value: string;
};

const initialFiscalIds: FiscalId[] = [
  { id: crypto.randomUUID(), country: 'França', value: '12345678900012' },
  { id: crypto.randomUUID(), country: 'Espanha', value: '12345678Z' },
];

const initialEmployees = [
  { id: crypto.randomUUID(), name: 'Ana Martins', email: 'ana@eurocomply.eu', role: 'Admin', status: 'ativo' },
  { id: crypto.randomUUID(), name: 'Miguel Costa', email: 'miguel@eurocomply.eu', role: 'Visualizador', status: 'pendente' },
];

function normalizeFiscalValue(value: string) {
  return value.replace(/[\s.-]/g, '').trim();
}

function isFiscalIdValid(item: FiscalId) {
  if (!item.value.trim()) return true;
  return fiscalCountries[item.country].pattern.test(normalizeFiscalValue(item.value));
}

export default function ProfilePage({ params }: { params: { locale: string } }) {
  const [company, setCompany] = useState(defaultCompany);
  const [plan, setPlan] = useState<'Básico' | 'Pro' | 'Enterprise'>('Básico');
  const [fiscalIds, setFiscalIds] = useState<FiscalId[]>(initialFiscalIds);
  const [employees, setEmployees] = useState(initialEmployees);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Editor');
  const [saved, setSaved] = useState(false);

  const isEnterprise = plan === 'Enterprise';
  const allFiscalIdsValid = useMemo(() => fiscalIds.every(isFiscalIdValid), [fiscalIds]);

  function updateCompany(field: keyof typeof company, value: string) {
    setCompany((current) => ({ ...current, [field]: value }));
    setSaved(false);
  }

  function addFiscalCountry() {
    setFiscalIds((current) => [...current, { id: crypto.randomUUID(), country: 'Portugal', value: '' }]);
    setSaved(false);
  }

  function updateFiscalId(id: string, field: 'country' | 'value', value: string) {
    setFiscalIds((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } as FiscalId : item)));
    setSaved(false);
  }

  function removeFiscalId(id: string) {
    setFiscalIds((current) => current.filter((item) => item.id !== id));
    setSaved(false);
  }

  function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!allFiscalIdsValid) return;
    localStorage.setItem('eurocomply-profile-demo', JSON.stringify({ company, fiscalIds, plan }));
    setSaved(true);
  }

  function inviteEmployee() {
    if (!isEnterprise || !inviteEmail.trim()) return;
    setEmployees((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: inviteEmail.split('@')[0],
        email: inviteEmail,
        role: inviteRole,
        status: 'pendente',
      },
    ]);
    setInviteEmail('');
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_hsl(var(--primary)/0.13),_transparent_34%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.32))]">
      <DashboardCommandNavigation locale={params.locale} activePage="Perfil" />

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-8 md:py-12">
        <section className="rounded-[2rem] border bg-background/88 p-6 shadow-xl shadow-primary/5 backdrop-blur md:p-9">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge className="rounded-full px-3 py-1 uppercase tracking-[0.18em]">Perfil europeu</Badge>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">Empresa, fiscalidade e equipa.</h1>
              <p className="mt-3 max-w-2xl text-muted-foreground">Gerencie dados comerciais, identificações fiscais por país e mimos visuais Enterprise sem transformar o perfil numa dashboard operacional.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['Básico', 'Pro', 'Enterprise'] as const).map((item) => (
                <button key={item} type="button" onClick={() => setPlan(item)} className={`rounded-full border px-4 py-2 text-sm font-medium transition ${plan === item ? 'border-primary bg-primary text-primary-foreground shadow-lg' : 'bg-background hover:bg-muted'}`}>
                  Simular {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        <form id="company-data" onSubmit={saveProfile} className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr]">
          <section className="rounded-[2rem] border bg-background/88 p-6 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary"><Building2 className="h-5 w-5" /></div>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Dados da empresa</h2>
                <p className="text-sm text-muted-foreground">Campos editáveis. O logo usa upload simulado ou URL.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {[
                ['Razão Social', 'legalName'],
                ['Nome Comercial', 'tradeName'],
                ['Email da empresa', 'email'],
                ['Telefone com indicativo', 'phone'],
                ['Rua', 'street'],
                ['Número', 'number'],
                ['Código Postal', 'postalCode'],
                ['Cidade', 'city'],
                ['Logo da empresa URL', 'logoUrl'],
              ].map(([label, field]) => (
                <label key={field} className={field === 'logoUrl' ? 'md:col-span-2' : ''}>
                  <span className="text-sm font-medium">{label}</span>
                  <input value={company[field as keyof typeof company]} onChange={(event) => updateCompany(field as keyof typeof company, event.target.value)} className="mt-1 w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10" />
                </label>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button type="submit" disabled={!allFiscalIdsValid} className="rounded-full"><Save className="h-4 w-4" /> Guardar alterações</Button>
              <Button type="button" variant="outline" className="rounded-full" onClick={() => updateCompany('logoUrl', 'https://dummyimage.com/180x180/d4af37/111827&text=EC')}><UploadCloud className="h-4 w-4" /> Simular upload de logo</Button>
              {saved ? <span className="inline-flex items-center gap-2 text-sm text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Guardado no localStorage demo.</span> : null}
            </div>
          </section>

          <aside id="enterprise-status" className="space-y-6">
            <section className={`rounded-[2rem] border p-6 shadow-sm backdrop-blur ${isEnterprise ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-background shadow-amber-500/10 dark:from-amber-950/30' : 'bg-background/88'}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Plano atual</p>
                  <h2 className="mt-1 text-3xl font-semibold">{plan}</h2>
                </div>
                <Badge className={`rounded-full ${isEnterprise ? 'bg-amber-500 text-black hover:bg-amber-500' : ''}`}>
                  {isEnterprise ? <Diamond className="mr-1 h-3.5 w-3.5" /> : <Crown className="mr-1 h-3.5 w-3.5" />}
                  {isEnterprise ? 'Enterprise Diamond' : 'Upgrade disponível'}
                </Badge>
              </div>

              <div className="mt-5 flex items-center gap-4">
                <div className={`relative h-20 w-20 overflow-hidden rounded-3xl border-4 bg-muted ${isEnterprise ? 'border-amber-400 shadow-lg shadow-amber-400/20' : 'border-border'}`}>
                  <img src={company.logoUrl} alt="Avatar da empresa" className="h-full w-full object-cover" />
                </div>
                <div>
                  <p className="font-semibold">Avatar da empresa</p>
                  <p className="text-sm text-muted-foreground">{isEnterprise ? 'Borda premium Enterprise ativa.' : 'Borda premium disponível no Enterprise.'}</p>
                </div>
              </div>

              {isEnterprise ? (
                <div className="mt-5 rounded-2xl border border-amber-300/70 bg-background/70 p-4 text-sm leading-6">
                  <p className="font-medium">🏷️ Você está no plano mais alto — acesso prioritário em breve.</p>
                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-amber-100">
                    <div className="h-full w-2/3 animate-pulse rounded-full bg-amber-400" />
                  </div>
                  <p className="mt-3 text-muted-foreground">Skeleton loader premium e status visual. Sem liberar funcionalidades grátis além do plano.</p>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl bg-primary/10 p-4 text-sm leading-6 text-primary">
                  🔒 Desbloqueie múltiplos países fiscais com Enterprise e ganhe status visual, colaboração e prioridade.
                </div>
              )}

              <Button asChild className="mt-5 w-full rounded-full transition hover:-translate-y-0.5 hover:shadow-lg">
                <Link href={`/${params.locale}/pricing`}>Comparar planos <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </section>
          </aside>
        </form>

        <section className="rounded-[2rem] border bg-background/88 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Identificação fiscal por país</h2>
              <p className="mt-1 text-sm text-muted-foreground">Portugal não é obrigatório. Cada país ajusta automaticamente o tipo de identificação, máscara e validação.</p>
            </div>
            <Button type="button" onClick={addFiscalCountry} variant="outline" className="rounded-full"><Plus className="h-4 w-4" /> Adicionar país</Button>
          </div>

          {!isEnterprise ? (
            <div className="mt-5 rounded-2xl border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
              🔒 No plano {plan}, a gestão multi-país aparece como preview bloqueado. Faça upgrade para Enterprise para usar múltiplas operações fiscais europeias.
            </div>
          ) : null}

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {fiscalIds.map((item) => {
              const meta = fiscalCountries[item.country];
              const valid = isFiscalIdValid(item);
              return (
                <div key={item.id} className={`relative rounded-2xl border p-4 transition ${!isEnterprise ? 'bg-muted/30 opacity-75' : 'bg-muted/15 hover:border-primary/40'}`}>
                  {!isEnterprise ? <div className="absolute right-4 top-4 rounded-full bg-background/90 px-2 py-1 text-xs"><LockKeyhole className="mr-1 inline h-3 w-3" /> Bloqueado</div> : null}
                  <div className="grid gap-3 md:grid-cols-[0.85fr_1.15fr]">
                    <label>
                      <span className="text-sm font-medium">País</span>
                      <select disabled={!isEnterprise} value={item.country} onChange={(event) => updateFiscalId(item.id, 'country', event.target.value)} className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:cursor-not-allowed">
                        {(Object.keys(fiscalCountries) as CountryKey[]).map((country) => <option key={country}>{country}</option>)}
                      </select>
                    </label>
                    <label>
                      <span className="text-sm font-medium">{meta.label}</span>
                      <input disabled={!isEnterprise} value={item.value} onChange={(event) => updateFiscalId(item.id, 'value', event.target.value)} placeholder={meta.placeholder} className={`mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:cursor-not-allowed ${valid ? '' : 'border-red-500'}`} />
                      <span className={`mt-1 block text-xs ${valid ? 'text-muted-foreground' : 'text-red-600'}`}>{valid ? meta.helper : `Formato esperado: ${meta.helper}`}</span>
                    </label>
                  </div>
                  <button disabled={!isEnterprise} type="button" onClick={() => removeFiscalId(item.id)} className="mt-3 rounded-xl border px-3 py-2 text-sm text-muted-foreground transition hover:bg-red-500/10 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"><Trash2 className="mr-1 inline h-4 w-4" /> Remover</button>
                </div>
              );
            })}
          </div>
        </section>

        <section id="employees" className="rounded-[2rem] border bg-background/88 p-6 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3"><UsersRound className="h-5 w-5 text-primary" /><h2 className="text-2xl font-semibold">Gestão de funcionários</h2></div>
          {isEnterprise ? (
            <div className="mt-5 space-y-5">
              <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
                <input value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="email@empresa.com" className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
                <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value)} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary">
                  <option>Admin</option><option>Editor</option><option>Visualizador</option>
                </select>
                <Button type="button" onClick={inviteEmployee} className="rounded-full"><Mail className="h-4 w-4" /> Convidar funcionário</Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {employees.map((employee) => (
                  <div key={employee.id} className="rounded-2xl border bg-muted/20 p-4">
                    <p className="font-semibold">{employee.name}</p>
                    <p className="text-sm text-muted-foreground">{employee.email}</p>
                    <div className="mt-3 flex gap-2"><Badge variant="outline">{employee.role}</Badge><Badge>{employee.status}</Badge></div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border bg-muted/30 p-5 text-sm leading-6 text-muted-foreground">
              🔒 Upgrade para o plano Enterprise e convide até 10 funcionários para colaborar na implementação dos documentos.
              <div><Button asChild className="mt-4 rounded-full"><Link href={`/${params.locale}/pricing`}>Fazer upgrade</Link></Button></div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
