import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, ShieldCheck } from 'lucide-react'

export const Route = createFileRoute('/admin/login')({
  component: AdminLogin,
})

function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isBootstrapAvailable, setIsBootstrapAvailable] = useState<boolean | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const checkBootstrap = async () => {
      try {
        const res = await fetch('/api/admin/auth/bootstrap-status');
        const data = await res.json();
        setIsBootstrapAvailable(data.available === true);
      } catch {
        setIsBootstrapAvailable(false);
      }
    };
    checkBootstrap();
  }, []);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      console.log('[AV-ADMIN-LOGIN] Requesting login for:', email);
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()
      console.log('[AV-ADMIN-LOGIN] Response status:', response.status);

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao entrar no painel.')
      }

      toast.success(`Bem-vindo, ${data.user.display_name}!`)
      
      // Pequeno atraso para garantir que os cookies sejam processados pelo browser
      // antes da navegação que aciona o guard SSR
      setTimeout(() => {
        navigate({ to: '/admin' })
      }, 500);

    } catch (err: any) {
      console.error('[AV-ADMIN-LOGIN] Error:', err)
      toast.error(err.message === 'INVALID_CREDENTIALS' ? 'E-mail ou senha inválidos.' : 'Erro de conexão com o servidor.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 bg-grid-tech">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(3,50,173,0.1),transparent_70%)] pointer-events-none" />
      
      <div className="w-full max-w-md space-y-8 relative">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gold/10 border border-gold/20 mb-4">
            <ShieldCheck className="w-8 h-8 text-gold" />
          </div>
          <h1 className="text-3xl font-heading font-black uppercase tracking-tight text-white">
            Painel Administrativo
          </h1>
          <p className="text-slate-400 text-sm font-medium tracking-wide">
            9º Torneio Amigos do Vôlei
          </p>
        </div>

        <div className="p-8 bg-white/[0.02] backdrop-blur-2xl border border-white/5 rounded-[32px] shadow-2xl space-y-6">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-[0.2em] text-gold ml-1">E-mail</Label>
              <Input 
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@torneioav.com.br"
                className="h-14 bg-slate-900/50 border-white/5 rounded-2xl focus:border-gold/50 focus:ring-gold/20 transition-all text-white placeholder:text-slate-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-[0.2em] text-gold ml-1">Senha</Label>
              <Input 
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-14 bg-slate-900/50 border-white/5 rounded-2xl focus:border-gold/50 focus:ring-gold/20 transition-all text-white placeholder:text-slate-700"
              />
            </div>

            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full h-14 glow-gold font-black uppercase tracking-widest rounded-2xl group transition-all duration-500"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Entrar no Painel
                </>
              )}
            </Button>
          </form>
        </div>

        <div className="text-center space-y-4">
          <button 
            onClick={async () => {
              if (!email) {
                toast.error('Digite seu e-mail para recuperar a senha.');
                return;
              }
              try {
                const res = await fetch('/api/admin/auth/recovery', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email })
                });
                const data = await res.json();
                if (res.ok) toast.success(data.message);
                else toast.error(data.error);
              } catch {
                toast.error('Erro ao solicitar recuperação.');
              }
            }}
            className="block w-full text-[10px] text-slate-500 hover:text-gold transition-colors font-black uppercase tracking-widest"
          >
            Esqueci minha senha (E-mail)
          </button>

          {isBootstrapAvailable === true && (
            <button 
              onClick={async () => {
                if (!confirm('Deseja ativar a senha inicial configurada no servidor? (Um captcha será solicitado)')) return;
                
                setIsLoading(true);
                try {
                  const turnstileToken = 'BOOTSTRAP_TRIGGER_TOKEN'; 

                  const res = await fetch('/api/admin/auth/bootstrap-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ turnstileToken })
                  });
                  const data = await res.json();
                  if (res.ok) {
                    toast.success('Senha definida com sucesso via Server Secret! Agora você pode logar.');
                    setIsBootstrapAvailable(false);
                  } else {
                    const errorMsg = data.error === 'GONE' ? 'O bootstrap já foi realizado anteriormente.' : 
                                   data.error === 'INVALID_CAPTCHA' ? 'Erro de validação (Captcha required).' : 
                                   data.error;
                    toast.error(`Erro: ${errorMsg}`);
                  }
                } catch {
                  toast.error('Erro ao processar bootstrap.');
                } finally {
                  setIsLoading(false);
                }
              }}
              className="block w-full text-[10px] text-gold/60 hover:text-gold transition-colors font-black uppercase tracking-widest border border-gold/10 p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] animate-pulse"
            >
              Ativar Senha via Server Bootstrap Secret
            </button>
          )}

          {isBootstrapAvailable === false && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-[10px] text-red-400 font-black uppercase tracking-widest text-left space-y-2">
              <p className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                Segurança Nível 5 Ativada
              </p>
              <p className="leading-relaxed opacity-80">
                O botão de ativação via Server Secret está oculto porque o SUPERADMIN_BOOTSTRAP_PASSWORD ainda não foi configurado ou o bootstrap já foi concluído.
              </p>
            </div>
          )}

          <Link to="/" className="inline-block text-[10px] text-slate-500 hover:text-gold transition-colors font-black uppercase tracking-widest">
            Voltar para a Landing Page
          </Link>
        </div>

      </div>
    </div>
  )
}
