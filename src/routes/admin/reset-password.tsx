import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, KeyRound, ShieldCheck } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

export const Route = createFileRoute('/admin/reset-password')({
  component: AdminResetPassword,
})

function AdminResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasToken, setHasToken] = useState<boolean | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    // Capturar token do Supabase da URL hash (#access_token=...)
    const hash = window.location.hash
    const params = new URLSearchParams(hash.replace('#', '?'))
    const token = params.get('access_token')
    
    if (token) {
      setAccessToken(token)
      setHasToken(true)
    } else {
      setHasToken(false)
      toast.error('Link de recuperação inválido ou expirado.')
    }
  }, [])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem.')
      return
    }

    if (password.length < 8) {
      toast.error('A senha deve ter pelo menos 8 caracteres.')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/admin/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          password, 
          access_token: accessToken 
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao redefinir senha.')
      }

      toast.success('Senha atualizada! Agora você pode entrar.')
      
      // Limpar a sessão local do Supabase se o navegador a tiver capturado automaticamente
      await supabase.auth.signOut()
      
      navigate({ to: '/admin/login' })
    } catch (err: any) {
      console.error('[AV-ADMIN-RESET]', err)
      toast.error(err.message === 'INVALID_TOKEN' ? 'Sessão de recuperação expirada.' : 'Erro ao atualizar senha.')
    } finally {
      setIsLoading(false)
    }
  }

  if (hasToken === false) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 bg-grid-tech">
        <div className="p-8 bg-white/[0.02] backdrop-blur-2xl border border-white/5 rounded-[32px] max-w-md w-full text-center space-y-6">
          <ShieldCheck className="w-12 h-12 text-gold mx-auto opacity-50" />
          <h1 className="text-2xl font-heading font-black uppercase">Link Inválido</h1>
          <p className="text-slate-400">Este link de recuperação expirou ou é inválido. Solicite um novo acesso ao suporte.</p>
          <Button onClick={() => navigate({ to: '/admin/login' })} className="w-full h-14 bg-white/5 hover:bg-white/10 text-white rounded-2xl">
            Voltar ao Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 bg-grid-tech">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(3,50,173,0.1),transparent_70%)] pointer-events-none" />
      
      <div className="w-full max-w-md space-y-8 relative">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gold/10 border border-gold/20 mb-4">
            <KeyRound className="w-8 h-8 text-gold" />
          </div>
          <h1 className="text-3xl font-heading font-black uppercase tracking-tight text-white">
            Nova Senha
          </h1>
          <p className="text-slate-400 text-sm font-medium tracking-wide">
            Defina sua credencial de acesso SUPERADMIN
          </p>
        </div>

        <div className="p-8 bg-white/[0.02] backdrop-blur-2xl border border-white/5 rounded-[32px] shadow-2xl space-y-6">
          <form onSubmit={handleReset} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-[0.2em] text-gold ml-1">Nova Senha</Label>
              <Input 
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-14 bg-slate-900/50 border-white/5 rounded-2xl focus:border-gold/50 focus:ring-gold/20 transition-all"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-[10px] font-black uppercase tracking-[0.2em] text-gold ml-1">Confirmar Senha</Label>
              <Input 
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="h-14 bg-slate-900/50 border-white/5 rounded-2xl focus:border-gold/50 focus:ring-gold/20 transition-all"
              />
            </div>

            <Button 
              type="submit" 
              disabled={isLoading || !hasToken}
              className="w-full h-14 glow-gold font-black uppercase tracking-widest rounded-2xl group transition-all duration-500"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>Definir Senha</>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
