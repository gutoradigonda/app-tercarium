import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  MapPin, 
  Phone, 
  Mail, 
  FileText,
  ChevronLeft,
  ChevronRight,
  ArrowDown,
  ArrowUp,
  X,
  Save
} from 'lucide-react';
import { Client, Order, UserRole } from '../types/erp';

// --- MODAL INTERNO DE EDIÇÃO E CRIAÇÃO DE CLIENTES ---
const ClientFormModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  clientToEdit: Client | null;
  onSave: (client: Client) => void;
}> = ({ isOpen, onClose, clientToEdit, onSave }) => {
  const [formData, setFormData] = useState<Partial<Client>>({});

  useEffect(() => {
    if (isOpen) {
      setFormData(clientToEdit || { 
        id: `cli-${Date.now()}`,
        name: '',
        email: '',
        phone: '',
        cpf: '',
        address: '',
        city: '',
        state: 'PR',
        cep: ''
      });
    }
  }, [isOpen, clientToEdit]);

  if (!isOpen) return null;

  const handleChange = (field: keyof Client, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-200">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">
            {clientToEdit ? 'Editar Cliente' : 'Novo Cliente'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Nome Completo *</label>
            <input 
              type="text" 
              value={formData.name || ''} 
              onChange={e => handleChange('name', e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              placeholder="Ex: João da Silva"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Telefone / WhatsApp</label>
              <input 
                type="text" 
                value={formData.phone || ''} 
                onChange={e => handleChange('phone', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">E-mail</label>
              <input 
                type="email" 
                value={formData.email || ''} 
                onChange={e => handleChange('email', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                placeholder="email@exemplo.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">CPF / CNPJ</label>
              <input 
                type="text" 
                value={formData.cpf || (formData as any).document || ''} 
                onChange={e => handleChange('cpf', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                placeholder="000.000.000-00"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">CEP</label>
              <input 
                type="text" 
                value={formData.cep || ''} 
                onChange={e => handleChange('cep', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                placeholder="00000-000"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Endereço</label>
            <input 
              type="text" 
              value={formData.address || ''} 
              onChange={e => handleChange('address', e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              placeholder="Rua, Número, Bairro"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Cidade</label>
              <input 
                type="text" 
                value={formData.city || ''} 
                onChange={e => handleChange('city', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                placeholder="Ex: Londrina"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Estado (UF)</label>
              <input 
                type="text" 
                value={formData.state || ''} 
                onChange={e => handleChange('state', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                placeholder="PR"
              />
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">
            Cancelar
          </button>
          <button 
            onClick={() => onSave(formData as Client)}
            disabled={!formData.name}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 rounded-xl transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" />
            Salvar Cliente
          </button>
        </div>
      </div>
    </div>
  );
};


// --- ECRÃ PRINCIPAL DE CLIENTES ---
interface ClientsViewProps {
  clients: Client[];
  orders: Order[];
  onUpdateClient: (client: Client) => void;
  onAddClient: (client: Client) => void;
  onDeleteClient: (clientId: string) => void;
  onSelectOrder: (order: Order) => void;
  userRole?: UserRole;
}

const ITEMS_PER_PAGE = 10;

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  orders,
  onUpdateClient,
  onAddClient,
  onDeleteClient,
  onSelectOrder,
  userRole,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);

  // Estados de Ordenação
  const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'orders'; direction: 'asc' | 'desc' }>({
    key: 'name',
    direction: 'asc'
  });

  // Estado da Paginação
  const [currentPage, setCurrentPage] = useState(1);

  const canEdit = userRole === 'admin' || userRole === 'operacao';

  const getClientInitials = (name: string) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // 1. Filtragem
  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        (client.name || '').toLowerCase().includes(searchLower) ||
        (client.email || '').toLowerCase().includes(searchLower) ||
        (client.phone || '').toLowerCase().includes(searchLower) ||
        (client.cpf || (client as any).document || '').toLowerCase().includes(searchLower) ||
        (client.city || '').toLowerCase().includes(searchLower) ||
        (client.state || '').toLowerCase().includes(searchLower) ||
        (client.id || '').toLowerCase().includes(searchLower)
      );
    });
  }, [clients, searchTerm]);

  // 2. Ordenação
  const sortedClients = useMemo(() => {
    let sortableClients = [...filteredClients];
    sortableClients.sort((a, b) => {
      if (sortConfig.key === 'name') {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        if (nameA < nameB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (nameA > nameB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      } else if (sortConfig.key === 'orders') {
        const ordersA = orders.filter((o: any) => o.clientId === a.id || o.client_id === a.id || o.clientName === a.name).length;
        const ordersB = orders.filter((o: any) => o.clientId === b.id || o.client_id === b.id || o.clientName === b.name).length;
        return sortConfig.direction === 'asc' ? ordersA - ordersB : ordersB - ordersA;
      }
      return 0;
    });
    return sortableClients;
  }, [filteredClients, sortConfig, orders]);

  // 3. Paginação
  const totalPages = Math.max(1, Math.ceil(sortedClients.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, sortedClients.length);
  const paginatedClients = sortedClients.slice(startIndex, endIndex);

  // Recalcula a página se a busca mudar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortConfig]);

  const handleSort = (key: 'name' | 'orders') => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleEdit = (client: Client) => {
    if (!canEdit) {
      alert('Seu perfil não tem permissão para editar clientes.');
      return;
    }
    setEditingClient(client);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Carteira de Clientes</h2>
          <p className="text-sm text-slate-500 mt-1">Gestão de contatos e histórico de compras</p>
        </div>
        {canEdit && (
          <button
            onClick={() => {
              setEditingClient(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-xl hover:bg-amber-600 transition-all font-medium shadow-sm hover:shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Novo Cliente
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome, CPF, e-mail, telefone ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th 
                  className="py-4 px-5 cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                  onClick={() => handleSort('name')}
                  title="Clique para ordenar por Nome"
                >
                  <div className="flex items-center gap-1">
                    CLIENTE (NOME)
                    {sortConfig.key === 'name' ? (
                      sortConfig.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-600" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-600" />
                    ) : (
                      <ArrowUp className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </th>
                <th className="py-4 px-5">CPF / CNPJ</th>
                <th className="py-4 px-5">Contato</th>
                <th className="py-4 px-5">Localização & Endereço</th>
                <th 
                  className="py-4 px-5 cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                  onClick={() => handleSort('orders')}
                  title="Clique para ordenar por quantidade de Pedidos"
                >
                  <div className="flex items-center gap-1">
                    Pedidos
                    {sortConfig.key === 'orders' ? (
                      sortConfig.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-600" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-600" />
                    ) : (
                      <ArrowUp className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </th>
                <th className="py-4 px-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center p-6">
                      <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                        <Users className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="font-semibold text-slate-700 text-lg">Nenhum cliente encontrado</p>
                      <p className="text-sm text-slate-500 mt-1 max-w-md">
                        Não encontramos resultados para a sua busca ou a base está vazia.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedClients.map((client) => {
                  const clientOrders = orders.filter(
                    (o: any) => o.clientId === client.id || o.client_id === client.id || o.clientName === client.name
                  );
                  const totalSpent = clientOrders.reduce((sum, o) => sum + (o.saleValue || 0), 0);

                  return (
                    <tr key={client.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs shrink-0 ring-2 ring-white">
                            {getClientInitials(client.name)}
                          </div>
                          <div>
                            <button
                              onClick={() => setViewingClient(client)}
                              className="font-semibold text-slate-800 hover:text-amber-600 transition-colors text-sm text-left truncate max-w-[200px] cursor-pointer block"
                            >
                              {client.name || 'Cliente sem nome'}
                            </button>
                            <span className="text-[10px] font-mono text-slate-400 block mt-0.5" title="ID do Cliente">
                              ID: {client.id}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <span className="text-sm text-slate-600 font-medium">
                          {client.cpf || (client as any).document || '-'}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex flex-col gap-1 text-sm text-slate-600">
                          {client.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[150px]">{client.phone}</span>
                            </div>
                          )}
                          {client.email && (
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[150px]" title={client.email}>{client.email}</span>
                            </div>
                          )}
                          {!client.phone && !client.email && (
                            <span className="text-slate-400 italic">Sem contato</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex flex-col text-sm text-slate-600">
                          <div className="font-medium text-slate-700 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[200px]">
                              {client.city ? `${client.city}/${client.state || 'PR'}` : '-'}
                              {client.cep && <span className="text-slate-400 font-normal"> • CEP: {client.cep}</span>}
                            </span>
                          </div>
                          {client.address && (
                            <div className="text-xs text-slate-500 mt-1 truncate max-w-[250px] ml-5" title={client.address}>
                              {client.address}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex flex-col">
                          <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-semibold w-fit">
                            <FileText className="w-3 h-3 text-slate-500" />
                            {clientOrders.length} {clientOrders.length === 1 ? 'pedido' : 'pedidos'}
                          </span>
                          {clientOrders.length > 0 && (
                            <span className="text-xs font-bold text-emerald-600 mt-1 ml-1">
                              {formatCurrency(totalSpent)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(client)}
                            className="p-2 rounded-lg text-amber-600 bg-amber-50 hover:bg-amber-100 hover:text-amber-700 transition-colors border border-amber-200/50 cursor-pointer"
                            title="Editar Cliente"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {sortedClients.length > 0 && (
          <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500">
              Mostrando <span className="font-semibold text-slate-700">{startIndex + 1}</span> a{' '}
              <span className="font-semibold text-slate-700">{endIndex}</span> de{' '}
              <span className="font-semibold text-slate-700">{sortedClients.length}</span> clientes
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
                title="Página Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium text-slate-700 mx-2">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
                title="Próxima Página"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <ClientFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        clientToEdit={editingClient}
        onSave={(client: Client) => {
          if (editingClient) {
            onUpdateClient(client);
          } else {
            onAddClient(client);
          }
          setIsModalOpen(false);
        }}
      />

      {/* Modal Simples de Visualização (Somente Leitura) */}
      {viewingClient && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setViewingClient(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Informações do Cliente</h2>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Nome Completo</label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 select-all">
                  {viewingClient.name || '-'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Telefone / WhatsApp</label>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 select-all">
                    {viewingClient.phone || '-'}
                  </div>
                </div>
                <div className="overflow-hidden">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">E-mail</label>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 truncate select-all" title={viewingClient.email}>
                    {viewingClient.email || '-'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">CPF / CNPJ</label>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 select-all">
                    {viewingClient.cpf || (viewingClient as any).document || '-'}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">CEP</label>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 select-all">
                    {viewingClient.cep || '-'}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Endereço Completo</label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 select-all">
                  {viewingClient.address || '-'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Cidade</label>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 select-all">
                    {viewingClient.city || '-'}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Estado (UF)</label>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 select-all">
                    {viewingClient.state || '-'}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setViewingClient(null)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
