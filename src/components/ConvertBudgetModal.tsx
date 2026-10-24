import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  UserCheck, 
  UserPlus, 
  Search, 
  Check, 
  MapPin, 
  Phone, 
  Mail, 
  FileText, 
  ShoppingBag, 
  Truck, 
  Sparkles, 
  ArrowRight,
  AlertCircle,
  Building2,
  Calendar
} from 'lucide-react';
import { Client, SavedBudget } from '../types/erp';
import { maskCPF, maskPhone, maskCEP, formatBRL } from '../utils/formatters';

interface ConvertBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  budget: SavedBudget | null;
  clients: Client[];
  onAddClient: (newClient: Client) => void;
  onConfirmConversion: (client: Client, budget: SavedBudget) => void;
}

export const ConvertBudgetModal: React.FC<ConvertBudgetModalProps> = ({
  isOpen,
  onClose,
  budget,
  clients,
  onAddClient,
  onConfirmConversion,
}) => {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientSearch, setClientSearch] = useState<string>('');
  const [isCreatingNewClient, setIsCreatingNewClient] = useState<boolean>(false);

  // Formulário de Cadastro Completo de Novo Cliente
  const [newName, setNewName] = useState<string>('');
  const [newCpf, setNewCpf] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newCep, setNewCep] = useState<string>('');
  const [newAddress, setNewAddress] = useState<string>('');
  const [newCity, setNewCity] = useState<string>('');
  const [newState, setNewState] = useState<string>('SP');
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoadingCep, setIsLoadingCep] = useState<boolean>(false);

  // Inicializa quando o modal abre
  useEffect(() => {
    if (isOpen && budget) {
      // Pré-preenche o nome caso o usuário decida cadastrar um novo cliente
      setNewName(budget.leadName || '');
      setNewCpf('');
      setNewPhone('');
      setNewEmail('');
      setNewCep(budget.cepDestino || '');
      setNewAddress('');
      setNewCity('');
      setNewState('SP');
      setFormError(null);
      setIsCreatingNewClient(false);
      setClientSearch(budget.leadName || '');

      // Tenta achar automaticamente um cliente existente pelo nome
      if (budget.leadName) {
        const found = clients.find(
          (c) => c.name.toLowerCase() === budget.leadName.toLowerCase().trim()
        );
        if (found) {
          setSelectedClientId(found.id);
        } else {
          setSelectedClientId('');
        }
      } else {
        setSelectedClientId('');
      }
    }
  }, [isOpen, budget, clients]);

  // Busca automática do CEP via ViaCEP ao digitar
  const handleCepChange = async (val: string) => {
    const masked = maskCEP(val);
    setNewCep(masked);
    const clean = masked.replace(/\D/g, '');
    if (clean.length === 8) {
      setIsLoadingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        const data = await res.json();
        if (!data.erro) {
          if (data.logradouro) setNewAddress(data.logradouro);
          if (data.localidade) setNewCity(data.localidade);
          if (data.uf) setNewState(data.uf);
        }
      } catch {
        // Ignora silenciosamente fallback
      } finally {
        setIsLoadingCep(false);
      }
    }
  };

  // Salvar novo cliente completo e selecioná-lo automaticamente
  const handleSaveNewClient = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newName.trim()) {
      setFormError('Por favor, informe o Nome Completo do cliente.');
      return;
    }

    if (!newPhone.trim()) {
      setFormError('Por favor, informe o Telefone/WhatsApp de contato.');
      return;
    }

    const createdClient: Client = {
      id: `CLI-${Date.now()}`,
      name: newName.trim(),
      cpf: newCpf.trim() || 'Não informado',
      phone: newPhone.trim(),
      email: newEmail.trim() || 'cliente@tercarium.com.br',
      address: newAddress.trim() || 'Endereço a confirmar',
      city: newCity.trim() || 'São Paulo',
      state: newState.trim().toUpperCase() || 'SP',
      cep: newCep.trim() || undefined,
    };

    onAddClient(createdClient);
    setSelectedClientId(createdClient.id);
    setIsCreatingNewClient(false);
  };

  // Filtro de clientes existentes com busca rápida
  const filteredClients = useMemo(() => {
    const term = clientSearch.toLowerCase().trim();
    if (!term) return clients.slice(0, 8);
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.cpf && c.cpf.includes(term)) ||
        (c.phone && c.phone.includes(term)) ||
        c.city.toLowerCase().includes(term)
    ).slice(0, 15);
  }, [clients, clientSearch]);

  const selectedClient = useMemo(() => {
    return clients.find((c) => c.id === selectedClientId) || null;
  }, [clients, selectedClientId]);

  if (!isOpen || !budget) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 transition-all"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 shrink-0">
              <UserCheck className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900">
                  Vincular a qual cliente?
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                  Funil: Lead → Pedido
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                O orçamento pertencia ao lead <strong className="text-slate-800 font-semibold">{budget.leadName || 'Sem nome informado'}</strong>. Vincule a um cliente cadastrado ou crie o cadastro agora.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal com Scroll */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
          {/* Card Resumo do Orçamento a ser Convertido */}
          <div className="bg-amber-50/60 rounded-2xl border border-amber-200/80 p-3.5 sm:p-4 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-semibold text-amber-900 text-xs flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-amber-700" />
                Resumo dos Dados do Orçamento ({budget.id})
              </span>
              <span className="font-mono text-[10px] text-amber-800">
                Criado em {budget.createdAt}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-slate-700">
              <div className="bg-white/80 p-2 rounded-xl border border-amber-200/60">
                <span className="text-[10px] text-slate-500 block">Itens</span>
                <strong className="text-xs font-bold text-slate-900">
                  {budget.items.reduce((acc, it) => acc + it.quantity, 0)} peça(s)
                </strong>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-amber-200/60">
                <span className="text-[10px] text-slate-500 block">Subtotal Itens</span>
                <strong className="text-xs font-bold text-slate-900 font-mono">
                  {formatBRL(budget.subtotalProducts)}
                </strong>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-amber-200/60">
                <span className="text-[10px] text-slate-500 block">Frete Cobrado</span>
                <strong className="text-xs font-bold text-emerald-700 font-mono">
                  {formatBRL(budget.freteCobrado ?? budget.shippingValue)}
                </strong>
                <span className="text-[9px] text-slate-500 block truncate">
                  {budget.shippingOption} {typeof budget.freteCotado === 'number' ? `(Cot: ${formatBRL(budget.freteCotado)})` : ''}
                </span>
                {typeof budget.sobraFrete === 'number' && (
                  <span className={`text-[9px] font-mono font-semibold block ${
                    budget.sobraFrete > 0 ? 'text-emerald-700' : budget.sobraFrete < 0 ? 'text-rose-600' : 'text-slate-500'
                  }`}>
                    Sobra: {budget.sobraFrete > 0 ? `+${formatBRL(budget.sobraFrete)}` : formatBRL(budget.sobraFrete)}
                  </span>
                )}
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-amber-200/60">
                <span className="text-[10px] text-slate-500 block">Total Normal</span>
                <strong className="text-xs font-bold text-slate-900 font-mono">
                  {formatBRL(budget.totalNormal)}
                </strong>
              </div>
            </div>
          </div>

          {/* Abas / Escolha: Selecionar Existente vs Cadastrar Novo */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-amber-600" />
              1. Localizar Cliente no Sistema
            </span>

            <button
              type="button"
              onClick={() => setIsCreatingNewClient(!isCreatingNewClient)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                isCreatingNewClient 
                  ? 'bg-slate-200 text-slate-800'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-2xs'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isCreatingNewClient ? 'Voltar para Busca' : '+ Cadastrar Novo Cliente'}</span>
            </button>
          </div>

          {/* MODO 1: CADASTRO COMPLETO DE NOVO CLIENTE */}
          {isCreatingNewClient ? (
            <form onSubmit={handleSaveNewClient} className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-amber-600" />
                  Formulário Completo de Cadastro de Cliente
                </h4>
                <span className="text-[10px] text-slate-500">
                  Preencha os dados e clique em Salvar
                </span>
              </div>

              {formError && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-1.5 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Nome Completo */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nome do cliente..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* CPF */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    CPF (Opcional / Recomendado)
                  </label>
                  <input
                    type="text"
                    value={newCpf}
                    onChange={(e) => setNewCpf(maskCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Telefone / WhatsApp */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Telefone / WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(maskPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="cliente@email.com"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* CEP com Busca Automática */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>CEP</span>
                    {isLoadingCep && <span className="text-amber-600 font-normal">Buscando...</span>}
                  </label>
                  <input
                    type="text"
                    value={newCep}
                    onChange={(e) => handleCepChange(e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Endereço */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Endereço Completo (Rua, Número, Bairro)
                  </label>
                  <input
                    type="text"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="Rua das Flores, 123 - Apto 4..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Cidade */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    placeholder="Cidade..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* UF */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Estado (UF)
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    value={newState}
                    onChange={(e) => setNewState(e.target.value.toUpperCase())}
                    placeholder="SP"
                    className="w-full px-3 py-2 text-xs uppercase font-mono rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingNewClient(false)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Salvar e Selecionar Cliente</span>
                </button>
              </div>
            </form>
          ) : (
            /* MODO 2: BUSCA E SELEÇÃO DE CLIENTE EXISTENTE */
            <div className="space-y-3">
              {/* Input de Busca */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Buscar cliente por nome, CPF, telefone ou cidade..."
                  className="w-full pl-9 pr-8 py-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                {clientSearch && (
                  <button
                    type="button"
                    onClick={() => setClientSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Lista Scrollável de Clientes Disponíveis */}
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {filteredClients.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-dashed border-slate-200 text-center text-slate-500 space-y-2">
                    <p className="font-medium text-slate-700">Nenhum cliente encontrado com este termo</p>
                    <p className="text-[11px] text-slate-400">
                      Você pode cadastrar este cliente agora mesmo clicando no botão abaixo:
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setNewName(clientSearch || budget.leadName || '');
                        setIsCreatingNewClient(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Cadastrar "{clientSearch || budget.leadName}"</span>
                    </button>
                  </div>
                ) : (
                  filteredClients.map((c) => {
                    const isSelected = c.id === selectedClientId;
                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedClientId(c.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-amber-50/80 border-amber-500 shadow-2xs ring-1 ring-amber-500/30'
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate flex items-center gap-2">
                              <span>{c.name}</span>
                              {c.cpf && c.cpf !== 'Não informado' && (
                                <span className="text-[10px] font-mono text-slate-500 font-normal">
                                  {c.cpf}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                              <span>{c.city}/{c.state}</span>
                              {c.phone && <span>· {c.phone}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                            isSelected 
                              ? 'bg-amber-500 border-amber-600 text-slate-950' 
                              : 'border-slate-300 bg-white'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer do Modal */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs">
            {selectedClient ? (
              <div className="flex items-center gap-1.5 text-emerald-800">
                <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                <span>
                  Cliente Selecionado: <strong className="font-semibold text-slate-900">{selectedClient.name}</strong>
                  {selectedClient.city ? ` (${selectedClient.city}/${selectedClient.state})` : ''}
                </span>
              </div>
            ) : (
              <span className="text-slate-500 italic">
                Selecione ou cadastre um cliente acima para habilitar o pedido
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={!selectedClient}
              onClick={() => {
                if (selectedClient && budget) {
                  onConfirmConversion(selectedClient, budget);
                  onClose();
                }
              }}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                selectedClient
                  ? 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 shadow-amber-500/20'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              <span>Confirmar e Ir para Novo Pedido</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
