import React, { useState, useEffect } from 'react';
import { X, UserCheck, CheckCircle2, AlertCircle, Eye } from 'lucide-react';
import { Client, UserRole } from '../types/erp';
import { maskCPF, maskPhone, maskCEP } from '../utils/formatters';

interface EditClientModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveClient: (updatedClient: Client) => void;
  userRole?: UserRole;
}

export const EditClientModal: React.FC<EditClientModalProps> = ({
  client,
  isOpen,
  onClose,
  onSaveClient,
  userRole,
}) => {
  const isViewer = userRole === 'viewer';
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('SP');
  const [cep, setCep] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pre-fill when client changes
  useEffect(() => {
    if (client) {
      setName(client.name || '');
      setCpf(client.cpf || '');
      setPhone(client.phone || '');
      setEmail(client.email || '');
      setAddress(client.address || '');
      setCity(client.city || '');
      setState(client.state || 'SP');
      setCep(client.cep || '');
      setErrorMessage(null);
    }
  }, [client, isOpen]);

  if (!isOpen || !client) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('O Nome do cliente é obrigatório.');
      return;
    }
    if (!city.trim()) {
      setErrorMessage('A Cidade é obrigatória.');
      return;
    }

    const updated: Client = {
      ...client,
      name: name.trim(),
      cpf: cpf.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim().toUpperCase(),
      cep: cep.trim() || undefined,
    };

    onSaveClient(updated);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 transition-all"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Editar Dados do Cliente
              </h3>
              <p className="text-xs text-slate-500">
                Atualize o cadastro e as informações de contato
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
          {isViewer && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-950 flex items-center gap-2.5 text-xs font-medium">
              <Eye className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Modo Visualizador:</strong> Edição bloqueada para o seu perfil. Você pode consultar os dados do cliente.
              </span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Nome */}
            <div className="sm:col-span-2">
              <label className="block text-slate-700 font-medium mb-1">
                Nome Completo *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* CPF */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">
                CPF
              </label>
              <input
                type="text"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(maskCPF(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Telefone */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Telefone / Celular
              </label>
              <input
                type="text"
                placeholder="(00) 00000-0000"
                value={phone}
                onChange={(e) => setPhone(maskPhone(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* E-mail */}
            <div className="sm:col-span-2">
              <label className="block text-slate-700 font-medium mb-1">
                E-mail
              </label>
              <input
                type="email"
                placeholder="cliente@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Endereço Completo */}
            <div className="sm:col-span-2">
              <label className="block text-slate-700 font-medium mb-1">
                Endereço Completo
              </label>
              <input
                type="text"
                placeholder="Rua, número, complemento, bairro"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Linha Cidade, Estado e CEP (CEP posicionado exatamente após o Estado) */}
            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Cidade */}
              <div className="sm:col-span-5">
                <label className="block text-slate-700 font-medium mb-1">
                  Cidade *
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Estado */}
              <div className="sm:col-span-3">
                <label className="block text-slate-700 font-medium mb-1">
                  Estado (UF) *
                </label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {['SP', 'RJ', 'MG', 'RS', 'PR', 'SC', 'BA', 'PE', 'CE', 'DF', 'GO', 'ES', 'MT', 'MS', 'PA'].map((uf) => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>

              {/* CEP */}
              <div className="sm:col-span-4">
                <label className="block text-slate-700 font-medium mb-1">
                  CEP
                </label>
                <input
                  type="text"
                  placeholder="00000-000"
                  value={cep}
                  onChange={(e) => setCep(maskCEP(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isViewer}
              title={isViewer ? 'Visualizadores não possuem permissão para salvar' : 'Salvar Alterações'}
              className="px-5 py-2.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-amber-500 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
