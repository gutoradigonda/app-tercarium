import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Shield, 
  UserPlus, 
  Search, 
  Key, 
  Edit2, 
  Lock, 
  Unlock, 
  X,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '../supabase';
import { UserRole, UserProfile } from '../types/erp';

export const UsuariosView: React.FC<{ userRole?: UserRole }> = ({ userRole }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  
  // Estados de Criação
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({
    nomeCompleto: '', username: '', email: '', role: 'operacao' as UserRole, senha: ''
  });

  // Estados de Edição
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Feedback Global
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const showFeedback = (message: string, type: 'success' | 'error') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('usuarios_perfil')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        const mappedUsers: UserProfile[] = data.map(u => ({
          id: u.id,
          nomeCompleto: u.nome_completo,
          username: u.username,
          email: u.email,
          role: u.role as UserRole,
          status: u.status,
          ultimoAcesso: u.ultimo_acesso ? new Date(u.ultimo_acesso).toLocaleString('pt-BR') : 'Nunca acessou'
        }));
        setUsers(mappedUsers);
      }
    } catch (error) {
      console.error('Erro ao buscar utilizadores:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ativo' ? 'bloqueado' : 'ativo';
    setUsers(users.map(u => u.id === id ? { ...u, status: newStatus as any } : u));
    try {
      const { error } = await supabase.from('usuarios_perfil').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      showFeedback(`Utilizador ${newStatus === 'ativo' ? 'desbloqueado' : 'bloqueado'} com sucesso.`, 'success');
    } catch (error) {
      setUsers(users.map(u => u.id === id ? { ...u, status: currentStatus as any } : u));
      showFeedback('Erro ao alterar status do utilizador.', 'error');
    }
  };

  const handleSendResetPassword = async (email: string) => {
    if (!window.confirm(`Enviar link de redefinição de senha para ${email}?`)) return;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      showFeedback(`E-mail de recuperação enviado para ${email}`, 'success');
    } catch (error: any) {
      showFeedback(`Erro ao enviar e-mail: ${error.message}`, 'error');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsCreating(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.senha,
        options: {
          data: {
            nomeCompleto: newUser.nomeCompleto,
            username: newUser.username,
            role: newUser.role
          }
        }
      });
      if (error) throw error;
      setIsNewUserModalOpen(false);
      setNewUser({ nomeCompleto: '', username: '', email: '', role: 'operacao', senha: '' });
      showFeedback('Utilizador criado com sucesso!', 'success');
      setTimeout(() => fetchUsers(), 1000); 
    } catch (error: any) {
      setModalError(error.message || 'Ocorreu um erro ao criar o utilizador.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setModalError(null);
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('usuarios_perfil')
        .update({
          nome_completo: editingUser.nomeCompleto,
          username: editingUser.username,
          role: editingUser.role
        })
        .eq('id', editingUser.id);
        
      if (error) throw error;
      
      setUsers(users.map(u => u.id === editingUser.id ? editingUser : u));
      setEditingUser(null);
      showFeedback('Perfil atualizado com sucesso!', 'success');
    } catch (error: any) {
      setModalError(error.message || 'Erro ao atualizar utilizador.');
    } finally {
      setIsUpdating(false);
    }
  };

  const totalUsers = users.length;
  const admins = users.filter(u => u.role === 'admin').length;
  const operacao = users.filter(u => u.role === 'operacao').length;
  const ativos = users.filter(u => u.status === 'ativo').length;

  const filteredUsers = users.filter(user => {
    const matchSearch = user.nomeCompleto.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = roleFilter === 'todos' || user.role === roleFilter;
    const matchStatus = statusFilter === 'todos' || user.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <span className="flex items-center gap-1.5 text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg text-xs font-semibold"><ShieldAlert className="w-3.5 h-3.5" /> Administrador</span>;
      case 'operacao':
        return <span className="flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg text-xs font-semibold"><ShieldCheck className="w-3.5 h-3.5" /> Operação</span>;
      default:
        return <span className="flex items-center gap-1.5 text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-semibold"><Shield className="w-3.5 h-3.5" /> Leitura</span>;
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Toast de Feedback */}
      {feedback && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-bold flex items-center gap-2 animate-in slide-in-from-top-2 fade-in ${
          feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <X className="w-5 h-5 text-rose-500" />}
          {feedback.message}
        </div>
      )}

      {/* Header e KPIs */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              Gestão de Acessos & Utilizadores
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Controle de utilizadores autorizados, perfis de privilégio (RBAC) e políticas de segurança do ERP
            </p>
          </div>
          <button 
            onClick={() => setIsNewUserModalOpen(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-lg shadow-sm flex items-center gap-2 text-sm transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            + Novo Utilizador
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Total de Utilizadores</span>
            <div className="text-3xl font-bold text-slate-800">{totalUsers}</div>
          </div>
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Administradores</span>
            <div className="text-3xl font-bold text-indigo-600">{admins}</div>
          </div>
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Operação</span>
            <div className="text-3xl font-bold text-amber-600">{operacao}</div>
          </div>
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Acessos Ativos</span>
            <div className="text-3xl font-bold text-emerald-600">{ativos}</div>
          </div>
        </div>
      </div>

      {/* Filtros e Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Buscar por login, nome ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white font-medium cursor-pointer"
          >
            <option value="todos">Perfil (Todos)</option>
            <option value="admin">Administrador</option>
            <option value="operacao">Operação</option>
            <option value="leitura">Leitura</option>
          </select>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white font-medium cursor-pointer"
          >
            <option value="todos">Status (Todos)</option>
            <option value="ativo">Ativos</option>
            <option value="bloqueado">Bloqueados</option>
          </select>
        </div>

        <div className="overflow-x-auto min-h-[200px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-2 text-amber-500" />
              <p className="text-sm">A carregar utilizadores...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <p className="text-sm font-medium">Nenhum utilizador encontrado.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                <tr>
                  <th className="px-5 py-3">Utilizador</th>
                  <th className="px-5 py-3">E-mail</th>
                  <th className="px-5 py-3 text-center">Perfil de Acesso</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold uppercase text-xs">
                        {user.nomeCompleto.substring(0, 2)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          @{user.username}
                          {user.role === 'admin' && <span className="text-[9px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Principal</span>}
                        </div>
                        <div className="text-xs text-slate-500">{user.nomeCompleto}</div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-800">{user.email}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">⏱ Último acesso: {user.ultimoAcesso}</div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex justify-center">{getRoleBadge(user.role)}</div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        user.status === 'ativo' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${user.status === 'ativo' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                        {user.status === 'ativo' ? 'Ativo' : 'Bloqueado'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleSendResetPassword(user.email)}
                          className="w-8 h-8 rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50 flex items-center justify-center transition-colors cursor-pointer" 
                          title="Enviar E-mail para Redefinir Senha"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setEditingUser(user)}
                          className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer" 
                          title="Editar Perfil"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleToggleStatus(user.id, user.status)}
                          className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                            user.status === 'ativo' 
                              ? 'border-rose-200 text-rose-500 hover:bg-rose-50' 
                              : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={user.status === 'ativo' ? 'Bloquear Acesso' : 'Desbloquear Acesso'}
                        >
                          {user.status === 'ativo' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal de Criação de Utilizador (Mantido Original) */}
      {isNewUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-600" /> Novo Utilizador
              </h3>
              <button onClick={() => setIsNewUserModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-6 space-y-4 text-sm">
              {modalError && (
                <div className="p-3 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-xs font-medium">{modalError}</div>
              )}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Nome Completo *</label>
                <input type="text" required value={newUser.nomeCompleto} onChange={e => setNewUser({...newUser, nomeCompleto: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium" />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Nome de Utilizador (Login) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">@</span>
                  <input type="text" required value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value.toLowerCase().replace(/\s/g, '')})} className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono font-medium text-slate-700" />
                </div>
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">E-mail de Acesso *</label>
                <input type="email" required value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium" />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Perfil de Acesso (Permissões) *</label>
                <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})} className="w-full px-3 py-2.5 rounded-lg border-2 border-amber-400 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold text-slate-800 cursor-pointer">
                  <option value="admin">Administrador (Controle Total)</option>
                  <option value="operacao">Operação (Pedidos e Produção)</option>
                  <option value="leitura">Leitura (Apenas Visualização)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Senha Provisória *</label>
                <input type="password" required minLength={6} value={newUser.senha} onChange={e => setNewUser({...newUser, senha: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono" />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsNewUserModalOpen(false)} className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">Cancelar</button>
                <button type="submit" disabled={isCreating} className="px-5 py-2 font-bold text-slate-900 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 rounded-lg cursor-pointer flex items-center gap-2">
                  {isCreating && <Loader2 className="w-4 h-4 animate-spin" />} Cadastrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição de Utilizador */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-slate-600" /> Editar Perfil
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateUser} className="p-6 space-y-4 text-sm">
              {modalError && (
                <div className="p-3 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-xs font-medium">{modalError}</div>
              )}
              
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Nome Completo</label>
                <input type="text" required value={editingUser.nomeCompleto} onChange={e => setEditingUser({...editingUser, nomeCompleto: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium" />
              </div>
              
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Nome de Utilizador</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">@</span>
                  <input type="text" required value={editingUser.username} onChange={e => setEditingUser({...editingUser, username: e.target.value.toLowerCase().replace(/\s/g, '')})} className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono font-medium text-slate-700" />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">E-mail (Apenas Leitura)</label>
                <input type="email" disabled value={editingUser.email} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 font-medium cursor-not-allowed" />
                <span className="text-[10px] text-slate-400 mt-1 block">Alterações de e-mail requerem confirmação de segurança.</span>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Perfil de Acesso</label>
                <select value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})} className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold text-slate-800 cursor-pointer">
                  <option value="admin">Administrador (Controle Total)</option>
                  <option value="operacao">Operação (Pedidos e Produção)</option>
                  <option value="leitura">Leitura (Apenas Visualização)</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors">Cancelar</button>
                <button type="submit" disabled={isUpdating} className="px-5 py-2 font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg cursor-pointer flex items-center gap-2 transition-colors">
                  {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};