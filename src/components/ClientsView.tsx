/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Client, Order, UserRole } from '../types/erp';
import { Search, Phone, FileText, Plus, Edit2, ShieldAlert, Users, TrendingUp, DollarSign, ArrowUpDown, Package, Trash2 } from 'lucide-react';

interface ClientsViewProps {
  clients: Client[];
  orders: Order[];
  onUpdateClient: (client: Client) => void;
  onAddClient: (client: Client) => void;
  onDeleteClient: (clientId: string) => void;
  onSelectOrder: (order: Order) => void;
  userRole?: UserRole;
}

export function ClientsView({
  clients,
  orders,
  onUpdateClient,
  onAddClient,
  onDeleteClient,
  onSelectOrder,
  userRole
}: ClientsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  const [formData, setFormData] = useState<Partial<Client>>({});

  // Filtragem segura
  const filteredClients = (clients || []).filter((client) => {
    if (!client) return false;
    const name = String(client.name || '').toLowerCase();
    const email = String(client.email || '').toLowerCase();
    const phone = String(client.phone || '').toLowerCase();
    const cpf = String(client.cpf || (client as any).document || '').toLowerCase();
    const city = String(client.city || '').toLowerCase();
    const term = searchTerm.toLowerCase();

    return name.includes(term) || email.includes(term) || phone.includes(term) || cpf.includes(term) || city.includes(term);
  });

  // Obter pedidos de um cliente de forma segura
  const getClientOrders = (client: Client) => {
    if (!client) return [];
    return (orders || []).filter((order) => {
      if (!order) return false;
      
      const orderClientId = String((order as any).clientId || (order as any).client_id || '').trim();
      const orderClientName = String(order.clientName || '').trim().toLowerCase();
      
      const clientId = String(client.id || '').trim();
      const clientName = String(client.name || '').trim().toLowerCase();

      if (clientId && orderClientId && clientId === orderClientId) return true;
      if (clientName && orderClientName && clientName === orderClientName) return true;

      return false;
    });
  };

  // Métricas do Topo
  const totalClientsCount = clients.length;
  const recurringClientsCount = clients.filter(c => getClientOrders(c).length >= 2).length;
  
  const totalRevenueAll = orders.reduce((acc, ord) => acc + (Number(ord.saleValue) || 0), 0);
  const avgLTV = totalClientsCount > 0 ? totalRevenueAll / totalClientsCount : 0;

  const handleOpenEdit = (client: Client) => {
    setSelectedClient(client);
    setFormData(client);
    setIsEditModalOpen(true);
  };

  const handleOpenNew = () => {
    setFormData({
      id: `client-${Date.now()}`,
      name: '',
      email: '',
      phone: '',
      cpf: '',
      address: '',
      city: 'Londrina',
      state: 'PR',
      cep: ''
    });
    setIsNewModalOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedClient && formData.name) {
      onUpdateClient({
        ...selectedClient,
        ...formData,
      } as Client);
      setIsEditModalOpen(false);
      setSelectedClient(null);
    }
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name) {
      onAddClient({
        id: formData.id || `client-${Date.now()}`,
        name: formData.name,
        email: formData.email || '',
        phone: formData.phone || '',
        cpf: formData.cpf || '',
        address: formData.address || '',
        city: formData.city || 'Londrina',
        state: formData.state || 'PR',
        cep: formData.cep || ''
      } as Client);
      setIsNewModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cards de Métricas no Topo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Total de Clientes</p>
            <h3 className="text-3xl font-bold text-slate-900">{totalClientsCount}</h3>
            <p className="text-xs text-slate-400 mt-1">cadastrados no sistema</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Clientes Recorrentes</p>
            <h3 className="text-3xl font-bold text-slate-900">{recurringClientsCount}</h3>
            <p className="text-xs text-amber-600 font-medium mt-1">com 2 ou mais compras</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Faturamento Médio por Cliente (LTV)</p>
            <h3 className="text-2xl font-bold text-slate-900">R$ {avgLTV.toFixed(2)}</h3>
            <p className="text-xs text-slate-400 mt-1">volume médio por carteira</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Cabeçalho da Seção e Botão Novo Cliente */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestão de Clientes</h1>
          <p className="text-sm text-slate-500">Consulte o histórico de compras e dados cadastrais dos clientes.</p>
        </div>
        <button
          onClick={handleOpenNew}
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </button>
      </div>

      {/* Barra de Pesquisa */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Buscar cliente por nome, CPF, e-mail, telefone ou cidade..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
        />
      </div>

      {/* Tabela de Clientes */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">
                  <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-800">
                    Cliente (Nome)
                    <ArrowUpDown className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                </th>
                <th className="py-3.5 px-4">CPF</th>
                <th className="py-3.5 px-4">Contato</th>
                <th className="py-3.5 px-4">Localização & Endereço</th>
                <th className="py-3.5 px-4 text-center">
                  <div className="inline-flex items-center gap-1.5 cursor-pointer hover:text-slate-800">
                    Pedidos
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredClients.map((client) => {
                const clientOrders = getClientOrders(client);
                const totalSpent = clientOrders.reduce((acc, ord) => acc + (Number(ord.saleValue) || 0), 0);
                const initials = client.name ? client.name.substring(0, 2).toUpperCase() : 'CL';

                return (
                  <tr key={client.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Nome e ID (2 linhas) */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0 text-xs">
                          {initials}
                        </div>
                        <div className="leading-tight">
                          <strong className="block text-slate-900 font-semibold mb-0.5">{client.name}</strong>
                          <span className="text-xs text-slate-400 font-mono">ID: {client.id}</span>
                        </div>
                      </div>
                    </td>

                    {/* CPF */}
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-xs">
                      {client.cpf || (client as any).document || 'Não informado'}
                    </td>

                    {/* Contato (Linha única compacta) */}
                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{client.phone || 'Não informado'}</span>
                      </div>
                    </td>

                    {/* Localização & Endereço (2 linhas perfeitamente alinhadas) */}
                    <td className="py-3.5 px-4 text-slate-600 leading-tight">
                      <div className="font-medium text-slate-900 mb-0.5">
                        {client.city || 'Londrina'}/{client.state || 'PR'} {client.cep ? `• CEP: ${client.cep}` : ''}
                      </div>
                      <div className="text-xs text-slate-400 truncate max-w-xs">
                        {client.address || 'Endereço não informado'}
                      </div>
                    </td>

                    {/* Pedidos & Valor Gasto (Com ícone idêntico à imagem 2) */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex flex-col items-center px-3 py-1 rounded-xl bg-slate-50 border border-slate-200/80 leading-tight">
                        <div className="flex items-center gap-1 text-xs font-bold text-slate-800">
                          <Package className="w-3 h-3 text-slate-400" />
                          <span>{clientOrders.length} {clientOrders.length === 1 ? 'pedido' : 'pedidos'}</span>
                        </div>
                        <span className="text-[11px] font-semibold text-emerald-600">
                          R$ {totalSpent.toFixed(2)}
                        </span>
                      </div>
                    </td>

                    {/* Ações */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedClient(client)}
                          className="inline-flex items-center px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-medium rounded-lg transition-colors border border-amber-200 shadow-2xs whitespace-nowrap"
                        >
                          <FileText className="w-3.5 h-3.5 mr-1 text-amber-600" />
                          Ver Pedidos
                        </button>
                        <button
                          onClick={() => handleOpenEdit(client)}
                          className="inline-flex items-center px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors border border-slate-200 shadow-2xs whitespace-nowrap"
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          Editar
                        </button>
                        <button
                          onClick={() => onDeleteClient(client.id)}
                          className="inline-flex items-center px-3 py-1.5 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 text-xs font-medium rounded-lg transition-colors border border-slate-200 hover:border-rose-200 shadow-2xs whitespace-nowrap"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredClients.length === 0 && (
          <div className="text-center py-12 bg-white">
            <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">Nenhum cliente encontrado.</p>
            <p className="text-sm text-slate-400">Tente pesquisar por outro termo ou faça uma nova importação.</p>
          </div>
        )}

        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
          Mostrando <strong>1</strong> a <strong>{filteredClients.length}</strong> de <strong>{clients.length}</strong> clientes
        </div>
      </div>

      {/* Modal de Histórico de Pedidos do Cliente */}
      {selectedClient && !isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{selectedClient.name}</h2>
                <p className="text-sm text-slate-500">{selectedClient.phone} {selectedClient.email || 'Sem e-mail'}</p>
              </div>
              <button
                onClick={() => setSelectedClient(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl"
              >
                ✕
              </button>
            </div>

            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">Pedidos Realizados</h3>
            <div className="space-y-3">
              {getClientOrders(selectedClient).map((order) => (
                <div key={order.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-amber-600">#{order.id}</span>
                    <p className="text-sm font-medium text-slate-800">Data: {order.createdAt}</p>
                    <p className="text-xs text-slate-500">Status: {order.status}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-900">R$ {Number(order.saleValue || 0).toFixed(2)}</span>
                    <button
                      onClick={() => {
                        setSelectedClient(null);
                        onSelectOrder(order);
                      }}
                      className="block mt-1 text-xs text-amber-600 hover:underline font-medium"
                    >
                      Ver Detalhes
                    </button>
                  </div>
                </div>
              ))}
              {getClientOrders(selectedClient).length === 0 && (
                <p className="text-sm text-slate-400 py-4 text-center">Nenhum pedido registado para este cliente.</p>
              )}
            </div>

            <div className="mt-6 text-right">
              <button
                onClick={() => setSelectedClient(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-sm font-medium rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Editar/Criar Cliente */}
      {(isEditModalOpen || isNewModalOpen) && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              {isEditModalOpen ? 'Editar Cliente' : 'Novo Cliente'}
            </h2>
            <form onSubmit={isEditModalOpen ? handleSaveEdit : handleSaveNew} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">CPF / CNPJ</label>
                  <input
                    type="text"
                    value={formData.cpf || ''}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">CEP</label>
                  <input
                    type="text"
                    value={formData.cep || ''}
                    onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Endereço</label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Estado (UF)</label>
                  <input
                    type="text"
                    value={formData.state || ''}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setIsNewModalOpen(false);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}