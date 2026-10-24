import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, AlertCircle, KeyRound, Sparkles, Loader2 } from 'lucide-react';
import { UserRole } from '../types/erp';
import { supabase } from '../supabase';

interface LoginViewProps {
  onLogin: (role: UserRole) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    const emailClean = email.trim();
    const passClean = password.trim();

    try {
      // 1. Tenta fazer login na Autenticação nativa do Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailClean,
        password: passClean,
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setErrorMessage('Email ou senha incorretos.');
        } else {
          setErrorMessage(`Erro no login: ${authError.message}`);
        }
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        setErrorMessage('Nenhum utilizador encontrado com estes dados no banco.');
        setIsLoading(false);
        return;
      }

      // 2. Busca o perfil e verifica o status e a role na nova tabela de perfis
      const { data: profileData, error: profileError } = await supabase
        .from('usuarios_perfil')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        // Se der erro ao ler o perfil, faz log out por segurança
        await supabase.auth.signOut();
        setErrorMessage('Não foi possível carregar o seu perfil de acesso. Contacte um administrador.');
        setIsLoading(false);
        return;
      }

      if (!profileData) {
        await supabase.auth.signOut();
        setErrorMessage('Perfil de utilizador não encontrado no sistema.');
        setIsLoading(false);
        return;
      }

      // Verifica se o usuário está bloqueado pelo admin
      if (profileData.status === 'bloqueado') {
        await supabase.auth.signOut();
        setErrorMessage('Este acesso encontra-se temporariamente bloqueado. Fale com um Administrador.');
        setIsLoading(false);
        return;
      }

      // 3. Atualiza a data do último acesso na tabela de perfis
      await supabase
        .from('usuarios_perfil')
        .update({ ultimo_acesso: new Date().toISOString() })
        .eq('id', authData.user.id);

      // 4. Tudo OK! Entra no sistema enviando a role correta
      onLogin(profileData.role as UserRole);

    } catch (err: any) {
      setErrorMessage(`Erro de Ligação: ${err.message}`);
      await supabase.auth.signOut();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setErrorMessage('Por favor, introduza o seu e-mail acima antes de pedir a recuperação.');
      return;
    }
    
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        // Redireciona de volta para o sistema após o clique no email
        redirectTo: window.location.origin, 
      });
      
      if (error) throw error;
      
      setErrorMessage('Link de recuperação enviado! Verifique a sua caixa de entrada.');
    } catch (err: any) {
      setErrorMessage(`Erro ao enviar email: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <img
          src="https://i.imgur.com/pNrDV9W.png"
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover object-center opacity-15 filter brightness-75 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/85 to-zinc-950/95" />
      </div>

      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-amber-600/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-amber-500/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800/90 rounded-3xl p-7 sm:p-9 shadow-2xl shadow-black/80">
          <div className="w-full max-w-[280px] mx-auto mb-8 overflow-hidden rounded-2xl shadow-xl ring-1 ring-zinc-800/80 bg-zinc-950/40">
            <img
              src="https://i.imgur.com/pNrDV9W.png"
              alt="Terçarium"
              className="w-full h-auto object-cover object-center transition-transform hover:scale-[1.02] duration-300"
            />
          </div>

          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center justify-center gap-2">
              <span>Acesso Seguro</span>
              <Sparkles className="w-4 h-4 text-amber-500 inline" />
            </h1>
          </div>

          {errorMessage && (
            <div className={`mb-5 p-3.5 rounded-xl border text-xs flex items-center gap-2.5 animate-in shake duration-150 ${
              errorMessage.includes('enviado') 
                ? 'bg-emerald-950/60 border-emerald-800/70 text-emerald-200' 
                : 'bg-rose-950/60 border-rose-800/70 text-rose-200'
            }`}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                E-mail de Acesso
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="guto@tercarium.com.br"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-950/90 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-xs font-medium focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-[10px] text-zinc-500 hover:text-amber-500 transition-colors cursor-pointer"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="w-full pl-10 pr-11 py-3 rounded-xl bg-zinc-950/90 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-xs font-medium focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs tracking-wide shadow-lg cursor-pointer flex items-center justify-center gap-2 transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>A Processar...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Entrar no Sistema</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};