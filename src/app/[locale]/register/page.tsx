'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/integrations/supabase/client'

const copy: Record<string, {
  title: string
  subtitle: string
  fullName: string
  email: string
  password: string
  passwordHint: string
  companyName: string
  companyPlaceholder: string
  employees: string
  sector: string
  select: string
  creating: string
  submit: string
  success: string
  hasAccount: string
  login: string
  employeeOptions: string[]
  sectorOptions: { value: string; label: string }[]
}> = {
  en: {
    title: 'Create account',
    subtitle: 'Fill in the details below',
    fullName: 'Full name',
    email: 'Email',
    password: 'Password',
    passwordHint: 'Minimum 6 characters',
    companyName: 'Company name',
    companyPlaceholder: 'Example: Acme AI',
    employees: 'Employees',
    sector: 'Industry',
    select: 'Select',
    creating: 'Creating account...',
    submit: 'Finish registration',
    success: 'Account created. Check your email to confirm your registration.',
    hasAccount: 'Already have an account?',
    login: 'Log in',
    employeeOptions: ['1-10 employees', '11-50 employees', '51-200 employees', '201+ employees'],
    sectorOptions: [
      { value: 'Technology', label: 'Technology' },
      { value: 'Finance', label: 'Finance' },
      { value: 'Healthcare', label: 'Healthcare' },
      { value: 'Education', label: 'Education' },
      { value: 'Retail', label: 'Retail' },
      { value: 'Other', label: 'Other' },
    ],
  },
  pt: {
    title: 'Criar conta',
    subtitle: 'Preencha os dados abaixo',
    fullName: 'Nome completo',
    email: 'Email',
    password: 'Senha',
    passwordHint: 'Mínimo de 6 caracteres',
    companyName: 'Nome da empresa',
    companyPlaceholder: 'Ex: Soltem Store',
    employees: 'Colaboradores',
    sector: 'Setor',
    select: 'Selecione',
    creating: 'Criando conta...',
    submit: 'Finalizar cadastro',
    success: 'Conta criada. Verifique seu email para confirmar o cadastro.',
    hasAccount: 'Já tem uma conta?',
    login: 'Entrar',
    employeeOptions: ['1-10 colaboradores', '11-50 colaboradores', '51-200 colaboradores', '201+ colaboradores'],
    sectorOptions: [
      { value: 'Tecnologia', label: 'Tecnologia' },
      { value: 'Financeiro', label: 'Financeiro' },
      { value: 'Saúde', label: 'Saúde' },
      { value: 'Educação', label: 'Educação' },
      { value: 'Varejo', label: 'Varejo' },
      { value: 'Outros', label: 'Outros' },
    ],
  },
  es: {
    title: 'Crear cuenta',
    subtitle: 'Completa los datos abajo',
    fullName: 'Nombre completo',
    email: 'Email',
    password: 'Contraseña',
    passwordHint: 'Mínimo 6 caracteres',
    companyName: 'Nombre de la empresa',
    companyPlaceholder: 'Ej: Acme AI',
    employees: 'Empleados',
    sector: 'Sector',
    select: 'Selecciona',
    creating: 'Creando cuenta...',
    submit: 'Finalizar registro',
    success: 'Cuenta creada. Revisa tu email para confirmar el registro.',
    hasAccount: '¿Ya tienes una cuenta?',
    login: 'Entrar',
    employeeOptions: ['1-10 empleados', '11-50 empleados', '51-200 empleados', '201+ empleados'],
    sectorOptions: [
      { value: 'Technology', label: 'Tecnología' },
      { value: 'Finance', label: 'Finanzas' },
      { value: 'Healthcare', label: 'Salud' },
      { value: 'Education', label: 'Educación' },
      { value: 'Retail', label: 'Retail' },
      { value: 'Other', label: 'Otros' },
    ],
  },
  fr: {
    title: 'Créer un compte',
    subtitle: 'Remplissez les informations ci-dessous',
    fullName: 'Nom complet',
    email: 'Email',
    password: 'Mot de passe',
    passwordHint: 'Minimum 6 caractères',
    companyName: 'Nom de l’entreprise',
    companyPlaceholder: 'Ex : Acme AI',
    employees: 'Employés',
    sector: 'Secteur',
    select: 'Sélectionner',
    creating: 'Création du compte...',
    submit: 'Terminer l’inscription',
    success: 'Compte créé. Vérifiez votre email pour confirmer l’inscription.',
    hasAccount: 'Vous avez déjà un compte ?',
    login: 'Connexion',
    employeeOptions: ['1-10 employés', '11-50 employés', '51-200 employés', '201+ employés'],
    sectorOptions: [
      { value: 'Technology', label: 'Technologie' },
      { value: 'Finance', label: 'Finance' },
      { value: 'Healthcare', label: 'Santé' },
      { value: 'Education', label: 'Éducation' },
      { value: 'Retail', label: 'Commerce' },
      { value: 'Other', label: 'Autre' },
    ],
  },
  it: {
    title: 'Crea account',
    subtitle: 'Compila i dati qui sotto',
    fullName: 'Nome completo',
    email: 'Email',
    password: 'Password',
    passwordHint: 'Minimo 6 caratteri',
    companyName: 'Nome azienda',
    companyPlaceholder: 'Es: Acme AI',
    employees: 'Dipendenti',
    sector: 'Settore',
    select: 'Seleziona',
    creating: 'Creazione account...',
    submit: 'Completa registrazione',
    success: 'Account creato. Controlla la tua email per confermare la registrazione.',
    hasAccount: 'Hai già un account?',
    login: 'Accedi',
    employeeOptions: ['1-10 dipendenti', '11-50 dipendenti', '51-200 dipendenti', '201+ dipendenti'],
    sectorOptions: [
      { value: 'Technology', label: 'Tecnologia' },
      { value: 'Finance', label: 'Finanza' },
      { value: 'Healthcare', label: 'Sanità' },
      { value: 'Education', label: 'Istruzione' },
      { value: 'Retail', label: 'Retail' },
      { value: 'Other', label: 'Altro' },
    ],
  },
  de: {
    title: 'Konto erstellen',
    subtitle: 'Fuellen Sie die Daten unten aus',
    fullName: 'Vollstaendiger Name',
    email: 'E-Mail',
    password: 'Passwort',
    passwordHint: 'Mindestens 6 Zeichen',
    companyName: 'Unternehmensname',
    companyPlaceholder: 'Beispiel: Acme AI',
    employees: 'Mitarbeitende',
    sector: 'Branche',
    select: 'Auswaehlen',
    creating: 'Konto wird erstellt...',
    submit: 'Registrierung abschliessen',
    success: 'Konto erstellt. Pruefen Sie Ihre E-Mail zur Bestaetigung.',
    hasAccount: 'Sie haben bereits ein Konto?',
    login: 'Einloggen',
    employeeOptions: ['1-10 Mitarbeitende', '11-50 Mitarbeitende', '51-200 Mitarbeitende', '201+ Mitarbeitende'],
    sectorOptions: [
      { value: 'Technology', label: 'Technologie' },
      { value: 'Finance', label: 'Finanzen' },
      { value: 'Healthcare', label: 'Gesundheit' },
      { value: 'Education', label: 'Bildung' },
      { value: 'Retail', label: 'Handel' },
      { value: 'Other', label: 'Andere' },
    ],
  },
}

const DEFAULT_APP_URL = 'https://eurocomply-saas.vercel.app'

function getAppOrigin() {
  if (typeof window === 'undefined') return DEFAULT_APP_URL

  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL
  if (configuredUrl) return configuredUrl.replace(/\/$/, '')

  if (window.location.hostname.endsWith('.vercel.app') && window.location.hostname !== 'eurocomply-saas.vercel.app') {
    return DEFAULT_APP_URL
  }

  return window.location.origin
}

export default function RegisterPage() {
  const params = useParams()
  const locale = (params.locale as string) || 'pt'
  const text = copy[locale] ?? copy.en
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nome, setNome] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [colaboradores, setColaboradores] = useState('')
  const [setor, setSetor] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const callbackUrl = new URL('/auth/callback', getAppOrigin())
    callbackUrl.searchParams.set('next', `/${locale}/dashboard`)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nome,
          empresa,
          colaboradores,
          setor,
        },
        emailRedirectTo: callbackUrl.toString(),
      }
    })

    if (error) {
      setError(error.message)
    } else {
      setSuccess(text.success)
      setTimeout(() => router.push(`/${locale}/login`), 3000)
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow">
        <h1 className="mb-2 text-center text-2xl font-bold">{text.title}</h1>
        <p className="mb-6 text-center text-gray-600">{text.subtitle}</p>

        {error && <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mb-4 rounded bg-green-100 p-3 text-sm text-green-700">{success}</div>}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">{text.fullName} *</label>
            <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{text.email} *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{text.password} *</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required minLength={6} />
            <p className="mt-1 text-xs text-gray-500">{text.passwordHint}</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{text.companyName}</label>
            <input type="text" value={empresa} onChange={(e) => setEmpresa(e.target.value)} className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={text.companyPlaceholder} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{text.employees}</label>
            <select value={colaboradores} onChange={(e) => setColaboradores(e.target.value)} className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">{text.select}</option>
              {['1-10', '11-50', '51-200', '201+'].map((value, index) => (
                <option key={value} value={value}>{text.employeeOptions[index]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{text.sector}</label>
            <select value={setor} onChange={(e) => setSetor(e.target.value)} className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">{text.select}</option>
              {text.sectorOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <button type="submit" disabled={loading} className="w-full rounded-md bg-blue-600 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50">
            {loading ? text.creating : text.submit}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          {text.hasAccount}{' '}
          <Link href={`/${locale}/login`} className="text-blue-600 hover:underline">
            {text.login}
          </Link>
        </p>
      </div>
    </div>
  )
}
