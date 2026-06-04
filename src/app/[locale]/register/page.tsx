'use client'

import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
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

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nome: nome,
          empresa: empresa,
          colaboradores: colaboradores,
          setor: setor,
        },
        emailRedirectTo: `${window.location.origin}/pt/login`,
      }
    })

    if (error) {
      setError(error.message)
    } else {
      setSuccess('Conta criada! Verifique seu email para confirmar o cadastro.')
      setTimeout(() => router.push('/pt/login'), 3000)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold text-center mb-2">Criar Conta</h1>
        <p className="text-center text-gray-600 mb-6">Preencha os dados abaixo</p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded text-sm">
            {success}
          </div>
        )}
        
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome completo *</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Senha *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={6}
            />
            <p className="text-xs text-gray-500 mt-1">Mínimo de 6 caracteres</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Nome da empresa</label>
            <input
              type="text"
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Soltem Store"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Colaboradores</label>
            <select
              value={colaboradores}
              onChange={(e) => setColaboradores(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione</option>
              <option value="1-10">1-10 colaboradores</option>
              <option value="11-50">11-50 colaboradores</option>
              <option value="51-200">51-200 colaboradores</option>
              <option value="201+">201+ colaboradores</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Setor</label>
            <select
              value={setor}
              onChange={(e) => setSetor(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione</option>
              <option value="Tecnologia">Tecnologia</option>
              <option value="Financeiro">Financeiro</option>
              <option value="Saúde">Saúde</option>
              <option value="Educação">Educação</option>
              <option value="Varejo">Varejo</option>
              <option value="Outros">Outros</option>
            </select>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Criando conta...' : 'Finalizar cadastro'}
          </button>
        </form>
        
        <p className="text-center mt-4 text-sm text-gray-600">
          Já tem uma conta?{' '}
          <a href="/pt/login" className="text-blue-600 hover:underline">
            Entrar
          </a>
        </p>
      </div>
    </div>
  )
}
