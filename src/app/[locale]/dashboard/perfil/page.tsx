'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function PerfilPage() {
  const [user, setUser] = useState<any>(null)
  const [nome, setNome] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const router = useRouter()

  // Carregar dados do usuário
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/pt/login')
        return
      }
      setUser(user)
      setNome(user.user_metadata?.nome || '')
      setLoading(false)
    }
    getUser()
  }, [router])

  // Atualizar nome
  const updateNome = async () => {
    setLoading(true)
    const { error } = await supabase.auth.updateUser({
      data: { nome }
    })
    if (error) {
      setMessage('❌ Erro: ' + error.message)
    } else {
      setMessage('✅ Nome atualizado com sucesso!')
    }
    setLoading(false)
    setTimeout(() => setMessage(''), 3000)
  }

  // Alterar senha
  const updatePassword = async () => {
    const novaSenha = prompt('Digite sua nova senha (mínimo 6 caracteres):')
    if (!novaSenha || novaSenha.length < 6) {
      setMessage('❌ Senha deve ter pelo menos 6 caracteres')
      return
    }
    
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    if (error) {
      setMessage('❌ Erro: ' + error.message)
    } else {
      setMessage('✅ Senha alterada com sucesso!')
    }
    setLoading(false)
    setTimeout(() => setMessage(''), 3000)
  }

  // Excluir conta (GDPR)
  const deleteAccount = async () => {
    const confirmar = confirm('⚠️ ATENÇÃO: Esta ação é IRREVERSÍVEL. Todos os seus dados serão permanentemente excluídos. Tem certeza que deseja excluir sua conta?')
    if (!confirmar) return
    
    const confirmarEmail = prompt('Digite seu email para confirmar exclusão:')
    if (confirmarEmail !== user?.email) {
      setMessage('❌ Email incorreto. Exclusão cancelada.')
      return
    }
    
    setLoading(true)
    
    // Primeiro: excluir dados do usuário na tabela profiles (se existir)
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user?.id)
    
    // Segundo: excluir a conta do Supabase Auth
    const { error } = await supabase.rpc('delete_user_account', { user_id: user?.id })
    
    // Se o RPC não existir, redirecionar para suporte
    if (error) {
      setMessage('❌ Entre em contato com o suporte para excluir sua conta: suporte@eurocomply.com')
    } else {
      await supabase.auth.signOut()
      router.push('/')
    }
    setLoading(false)
  }

  // Exportar dados (GDPR)
  const exportData = async () => {
    setLoading(true)
    setMessage('📥 Coletando seus dados...')
    
    // Coletar dados do usuário
    const userData = {
      email: user?.email,
      nome: user?.user_metadata?.nome,
      criado_em: user?.created_at,
      ultimo_login: user?.last_sign_in_at,
      // Adicionar mais dados conforme necessário
    }
    
    // Converter para JSON
    const dataStr = JSON.stringify(userData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    
    // Download do arquivo
    const link = document.createElement('a')
    link.href = url
    link.download = `dados_usuario_${user?.email}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    setMessage('✅ Dados exportados com sucesso!')
    setLoading(false)
    setTimeout(() => setMessage(''), 3000)
  }

  if (loading && !user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-500">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6 py-12">
      <h1 className="text-2xl font-bold mb-8">Meu Perfil</h1>
      
      {message && (
        <div className={`mb-4 p-3 rounded ${message.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message}
        </div>
      )}
      
      <div className="space-y-6">
        {/* Email (não editável) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="w-full px-3 py-2 border rounded-md bg-gray-100"
          />
        </div>
        
        {/* Nome (editável) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-md"
              placeholder="Seu nome"
            />
            <button
              onClick={updateNome}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Salvar
            </button>
          </div>
        </div>
        
        {/* Senha */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
          <button
            onClick={updatePassword}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Alterar senha
          </button>
        </div>
        
        <hr className="my-8" />
        
        {/* GDPR - Exportar dados */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h2 className="font-semibold text-blue-800 mb-2">Exportar meus dados</h2>
          <p className="text-sm text-blue-600 mb-3">Receba uma cópia de todos os seus dados em formato JSON (GDPR)</p>
          <button
            onClick={exportData}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            📥 Exportar dados
          </button>
        </div>
        
        {/* GDPR - Excluir conta */}
        <div className="bg-red-50 p-4 rounded-lg">
          <h2 className="font-semibold text-red-800 mb-2">Zona de perigo</h2>
          <p className="text-sm text-red-600 mb-3">Excluir sua conta remove permanentemente todos os seus dados. Esta ação é irreversível.</p>
          <button
            onClick={deleteAccount}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            🗑️ Excluir minha conta
          </button>
        </div>
      </div>
    </div>
  )
}
