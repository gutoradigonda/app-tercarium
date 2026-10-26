import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  ExternalLink, 
  Trash2,
  Package,
  ShoppingBag,
  Sparkles,
  UserCheck,
  Calendar,
  CheckCircle2,
  Truck,
  MessageCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Check,
  TrendingUp,
  Edit3,
  Download,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  X,
  RotateCcw,
  Ban,
  AlertTriangle
} from 'lucide-react';
import { Order, OrderStatus, Client, Product, PAYMENT_LABELS, STATUS_CONFIG, UserRole } from '../types/erp';
import { 
  formatBRL, 
  formatDate, 
  extractMonthYear, 
  getCurrentMonthKey, 
  formatMonthYearLabel, 
  getAvailableMonthKeys, 
  getTodayDateFormatted 
} from '../utils/formatters';
import { exportToCSV } from '../utils/exportUtils';
import { NewOrderModal } from './NewOrderModal';
import { EditOrderModal } from './EditOrderModal';
import { NotifyCustomerModal } from './NotifyCustomerModal';

interface OrdersViewProps {
  orders: Order[];
  clients: Client[];
  products: Product[];
  onAddClient: (newClient: Client) => void;
  onAddProduct: (newProduct: Product) => void;
  onAddOrder: (newOrder: Order) => void;
  onUpdateOrder?: (order: Order) => void;
  onSelectOrder: (order: Order) => void;
  onDeleteOrder: (orderId: string) => void;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
  userRole?: UserRole;
}

const ITEMS_PER_PAGE = 12;

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  clients,
  products,
  onAddClient,
  onAddProduct,
  onAddOrder,
  onUpdateOrder,
  onSelectOrder,
  onDeleteOrder,
  onStatusChange,
  userRole,
}) => {
  const isViewer = userRole === 'leitura';
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [notifyingOrder, setNotifyingOrder] = useState<Order | null>(null);

  const handleCancelarPedido = (orderId: string) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    onStatusChange(orderId, 'cancelado');

    if (onUpdateOrder) {
      const now = new Date();
      const timestamp = `${getTodayDateFormatted()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const updatedOrder: Order = {
        ...targetOrder,
        status: 'cancelado',
        estornado: true,
        dataEstorno: timestamp,
        history: [
          ...(targetOrder.history || []),
          {
            status: 'cancelado',
            timestamp,
            note: 'Pedido cancelado e estornado pelo operador (registro mantido no banco)',
          },
        ],
      };
      onUpdateOrder(updatedOrder);
    }

    setToastMessage(`Pedido #${orderId} cancelado e estornado com sucesso.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleRefundOrder = (order: Order) => {
    const confirmMsg = `Confirmar a devolução (estorno) de ${formatBRL(order.saleValue)} para o cliente ${order.clientName} do pedido #${order.id}?\n\nO pedido será marcado como 'Cancelado e Estornado'.`;
    if (!window.confirm(confirmMsg)) return;

    onStatusChange(order.id, 'cancelado_estornado');

    if (onUpdateOrder) {
      const now = new Date();
      const timestamp = `${getTodayDateFormatted()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const updatedOrder: Order = {
        ...order,
        status: 'cancelado_estornado',
        estornado: true,
        dataEstorno: timestamp,
        history: [
          ...(order.history || []),
          {
            status: 'cancelado_estornado',
            timestamp,
            note: `Devolução/Estorno de ${formatBRL(order.saleValue)} confirmado`,
          },
        ],
      };
      onUpdateOrder(updatedOrder);
    }

    setToastMessage(`Devolução de ${formatBRL(order.saleValue)} registrada com sucesso para o pedido #${order.id}!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const [filterInternalId, setFilterInternalId] = useState<string>('');
  const [filterCodigoCliente, setFilterCodigoCliente] = useState<string>('');
  const [filterClientName, setFilterClientName] = useState<string>('');
  const [activeFilterPopover, setActiveFilterPopover] = useState<'internalId' | 'codigoCliente' | 'clientName' | null>(null);
  const filterPopoverRef = useRef<HTMLDivElement>(null);

  type SortField = 'date' | 'id' | 'codigoCliente' | 'clientName';
  type SortDirection = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleToggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'date' ? 'desc' : 'asc');
    }
  };

  useEffect(() => {
    function handleClickOutsidePopover(event: MouseEvent) {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(event.target as Node)) {
        setActiveFilterPopover(null);
      }
    }
    if (activeFilterPopover) {
      document.addEventListener('mousedown', handleClickOutsidePopover);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutsidePopover);
    }
  }, [activeFilterPopover]);

  // FUNÇÃO DE EXPORTAÇÃO COMPLETA PARA BANCO DE DADOS E BACKUP
  const handleExport = () => {
    setToastMessage('Download do relatório completo em CSV iniciado...');
    setTimeout(() => setToastMessage(null), 3500);

    const headers = [
      'Pedido Interno',
      'Pedido Cliente',
      'Data',
      'Cliente',
      'CPF',
      'Telefone',
      'E-mail',
      'Endereço',
      'Cidade',
      'UF',
      'Itens do Pedido',
      'Valor Venda (R$)',
      'Frete Cobrado (R$)',
      'Frete Cotado (R$)',
      'Forma de Pagto',
      'Status Operacional'
    ];

    const rows = filteredOrders.map((o) => {
      // Junta todos os itens do pedido com suas quantidades e observações em uma única string formatada
      const itensFormatados = o.items && o.items.length > 0
        ? o.items.map(i => `${i.quantity || 1}x ${i.model || ''} (Cód: ${i.code || ''})${i.observacao ? ` [Obs: ${i.observacao}]` : ''}`).join(' | ')
        : `${o.item || ''} - ${o.itemModel || ''}`;

      return [
        o.id || '',
        o.codigoCliente || '',
        o.createdAt || '',
        o.clientName || '',
        o.clientCpf || '',
        o.clientPhone || '',
        o.clientEmail || '',
        o.clientAddress || '',
        o.clientCity || '',
        o.clientState || '',
        itensFormatados,
        (o.saleValue || 0).toFixed(2),
        (o.shippingCharged || 0).toFixed(2),
        (o.shippingPaid || 0).toFixed(2),
        PAYMENT_LABELS[o.paymentMethod] || o.paymentMethod || '',
        STATUS_CONFIG[o.status]?.label || o.status || ''
      ];
    });

    exportToCSV('backup_pedidos_tercarium', headers, rows);
  };

  const [mesesSelecionados, setMesesSelecionados] = useState<string[]>(() => [getCurrentMonthKey()]);
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const monthDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(event.target as Node)) {
        setIsMonthDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentMonthKey = useMemo(() => getCurrentMonthKey(), []);
  const availableMonthKeys = useMemo(() => getAvailableMonthKeys(orders), [orders]);

  const handleSelectCurrentMonth = () => {
    setMesesSelecionados([currentMonthKey]);
  };

  const handleSelectLast3Months = () => {
    const [curYear, curMonth] = currentMonthKey.split('-').map(Number);
    const last3: string[] = [currentMonthKey];
    for (let i = 1; i <= 2; i++) {
      const d = new Date(curYear, curMonth - 1 - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      last3.push(`${y}-${m}`);
    }
    setMesesSelecionados(last3);
  };

  const handleSelectAllMonths = () => {
    setMesesSelecionados(availableMonthKeys);
  };

  const handleToggleMonth = (mKey: string) => {
    setMesesSelecionados((prev) => {
      if (prev.includes(mKey)) {
        return prev.filter((k) => k !== mKey);
      } else {
        return [...prev, mKey];
      }
    });
  };

  const isOnlyCurrentMonthSelected =
    mesesSelecionados.length === 1 && mesesSelecionados[0] === currentMonthKey;

  const isLast3MonthsSelected = useMemo(() => {
    if (mesesSelecionados.length !== 3) return false;
    const [curYear, curMonth] = currentMonthKey.split('-').map(Number);
    const expected = [currentMonthKey];
    for (let i = 1; i <= 2; i++) {
      const d = new Date(curYear, curMonth - 1 - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      expected.push(`${y}-${m}`);
    }
    return expected.every((k) => mesesSelecionados.includes(k));
  }, [mesesSelecionados, currentMonthKey]);

  const isAllMonthsSelected =
    availableMonthKeys.length > 0 &&
    availableMonthKeys.every((k) => mesesSelecionados.includes(k));

  const monthFilteredOrders = useMemo(() => {
    if (mesesSelecionados.length === 0) return [];
    return orders.filter((order) => {
      const mKey = extractMonthYear(order.createdAt);
      return mKey ? mesesSelecionados.includes(mKey) : false;
    });
  }, [orders, mesesSelecionados]);

  const activeMonthOrders = useMemo(() => {
    return monthFilteredOrders.filter((o) => {
      const isCancelled = o.status === 'cancelado' || o.status === 'cancelado_estornado';
      return !isCancelled;
    });
  }, [monthFilteredOrders]);

  const cancelledMonthOrders = useMemo(() => {
    return monthFilteredOrders.filter((o) => {
      const isCancelled = o.status === 'cancelado' || o.status === 'cancelado_estornado';
      return isCancelled;
    });
  }, [monthFilteredOrders]);

  const totalPedidos = monthFilteredOrders.length;
  const totalVendas = activeMonthOrders.reduce((acc, o) => acc + o.saleValue, 0);
  const pedidosCanceladosCount = cancelledMonthOrders.length;
  const valoresDevolvidosTotal = cancelledMonthOrders.reduce((acc, o) => acc + (o.saleValue || 0), 0);

  const totalFreteCobrado = activeMonthOrders.reduce((acc, o) => acc + (o.shippingCharged || 0), 0);
  const totalFreteReal = activeMonthOrders.reduce((acc, o) => acc + (o.shippingPaid || 0), 0);
  const sobraFrete = totalFreteCobrado - totalFreteReal;
  const ticketMedio = activeMonthOrders.length > 0 ? totalVendas / activeMonthOrders.length : 0;
  const qtdMesesAtivos = mesesSelecionados.length > 0 ? mesesSelecionados.length : 1;

  const totalItens = useMemo(() => {
    return activeMonthOrders.reduce((acc, o) => {
      if (o.items && o.items.length > 0) {
        return acc + o.items.reduce((sum, it) => sum + (it.quantity || 1), 0);
      }
      return acc + 1;
    }, 0);
  }, [activeMonthOrders]);

  const ticketMedioItens = totalItens > 0 ? totalVendas / totalItens : 0;

  const filteredOrders = useMemo(() => {
    const list = monthFilteredOrders.filter((order) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        !term ||
        (order.id || '').toLowerCase().includes(term) ||
        (order.codigoCliente || '').toLowerCase().includes(term) ||
        (order.clientName || '').toLowerCase().includes(term) ||
        (order.item || '').toLowerCase().includes(term) ||
        (order.clientCity || '').toLowerCase().includes(term) ||
        (order.items && order.items.some((it) => (it.model || '').toLowerCase().includes(term) || (it.code || '').toLowerCase().includes(term)));

      const matchesPayment = paymentFilter === 'all' || order.paymentMethod === paymentFilter;
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

      const matchesInternalId = !filterInternalId.trim() || 
        (order.id || '').toLowerCase().includes(filterInternalId.trim().toLowerCase());

      const matchesCodigoCliente = !filterCodigoCliente.trim() || 
        (order.codigoCliente || '').toLowerCase().includes(filterCodigoCliente.trim().toLowerCase());

      const matchesClientName = !filterClientName.trim() || 
        (order.clientName || '').toLowerCase().includes(filterClientName.trim().toLowerCase()) ||
        (order.clientCity || '').toLowerCase().includes(filterClientName.trim().toLowerCase());

      return matchesSearch && matchesPayment && matchesStatus && matchesInternalId && matchesCodigoCliente && matchesClientName;
    });

    return [...list].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        const parseDateToTime = (dStr: string) => {
          if (!dStr) return 0;
          const clean = dStr.trim();
          if (clean.includes('/')) {
            const parts = clean.split('/');
            if (parts.length >= 3) {
              const day = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10) - 1;
              let year = parseInt(parts[2], 10);
              if (year < 100) year += 2000;
              return new Date(year, month, day).getTime();
            }
          }
          if (clean.includes('-')) {
            const parts = clean.split('-');
            if (parts.length >= 3) {
              let year = parseInt(parts[0], 10);
              if (year < 100) year += 2000;
              const month = parseInt(parts[1], 10) - 1;
              const day = parseInt(parts[2], 10);
              return new Date(year, month, day).getTime();
            }
          }
          return 0;
        };
        comparison = parseDateToTime(a.createdAt) - parseDateToTime(b.createdAt);
      } else if (sortField === 'id') {
        comparison = (a.id || '').localeCompare((b.id || ''), undefined, { numeric: true });
      } else if (sortField === 'codigoCliente') {
        const codA = a.codigoCliente || '';
        const codB = b.codigoCliente || '';
        comparison = codA.localeCompare(codB);
      } else if (sortField === 'clientName') {
        const nameA = a.clientName || '';
        const nameB = b.clientName || '';
        comparison = nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [
    monthFilteredOrders, 
    searchTerm, 
    paymentFilter, 
    statusFilter, 
    filterInternalId, 
    filterCodigoCliente, 
    filterClientName, 
    sortField, 
    sortDirection
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    paymentFilter,
    statusFilter,
    mesesSelecionados,
    filterInternalId,
    filterCodigoCliente,
    filterClientName,
    sortField,
    sortDirection
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredOrders.length);
  const paginatedOrders = useMemo(() => {
    return filteredOrders.slice(startIndex, endIndex);
  }, [filteredOrders, startIndex, endIndex]);

  const paginationRange = useMemo(() => {
    const delta = 1;
    const range: (number | string)[] = [];

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        range.push(i);
      } else if (range[range.length - 1] !== '...') {
        range.push('...');
      }
    }

    return range;
  }, [currentPage, totalPages]);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 sm:p-6 rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Central de Vendas Terçarium
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {orders.length} pedidos registrados
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
            Gestão Comercial de Pedidos
          </h2>
          <p className="text-xs text-slate-400 max-w-xl">
            Cadastre novos pedidos para clientes existentes ou adicione novos clientes com integração instantânea à produção e ao DRE financeiro.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-xs sm:text-sm tracking-wide shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 whitespace-nowrap cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Novo Pedido</span>
        </button>
      </div>

      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                  Filtrar por Mês de Venda
                </h3>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                  {mesesSelecionados.length === 0
                    ? 'Nenhum mês ativo'
                    : mesesSelecionados.length === 1
                    ? formatMonthYearLabel(mesesSelecionados[0], 'full')
                    : `${mesesSelecionados.length} meses selecionados (Visão Acumulada)`}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Escolha o período rápido ou selecione múltiplos meses no dropdown para recalcular todos os cards e a tabela.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={handleSelectCurrentMonth}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isOnlyCurrentMonthSelected
                    ? 'bg-amber-500 text-slate-950 shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                Mês Atual
              </button>

              <button
                type="button"
                onClick={handleSelectLast3Months}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isLast3MonthsSelected
                    ? 'bg-amber-500 text-slate-950 shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                Últimos 3 Meses
              </button>

              <button
                type="button"
                onClick={handleSelectAllMonths}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isAllMonthsSelected
                    ? 'bg-amber-500 text-slate-950 shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                Todos os Meses
              </button>
            </div>

            <div className="relative" ref={monthDropdownRef}>
              <button
                type="button"
                onClick={() => setIsMonthDropdownOpen((prev) => !prev)}
                className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 shadow-2xs cursor-pointer min-w-[140px]"
              >
                <span className="truncate">
                  {mesesSelecionados.length === 0
                    ? 'Selecionar Meses'
                    : `${mesesSelecionados.length} ${mesesSelecionados.length === 1 ? 'mês' : 'meses'}`}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {isMonthDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-64 p-2 bg-white rounded-xl shadow-xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 max-h-72 overflow-y-auto">
                  <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-500 border-b border-slate-100 mb-1">
                    <span>SELECIONE OS MESES</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (mesesSelecionados.length === availableMonthKeys.length) {
                          setMesesSelecionados([currentMonthKey]);
                        } else {
                          setMesesSelecionados(availableMonthKeys);
                        }
                      }}
                      className="text-amber-600 hover:text-amber-700 font-medium cursor-pointer"
                    >
                      {mesesSelecionados.length === availableMonthKeys.length ? 'Limpar' : 'Marcar Todos'}
                    </button>
                  </div>

                  <div className="space-y-0.5 pt-1">
                    {availableMonthKeys.map((mKey) => {
                      const isSelected = mesesSelecionados.includes(mKey);
                      const isCurrent = mKey === currentMonthKey;
                      const count = orders.filter((o) => extractMonthYear(o.createdAt) === mKey).length;

                      return (
                        <label
                          key={mKey}
                          className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer select-none transition-colors ${
                            isSelected ? 'bg-amber-50/80 text-amber-950 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleMonth(mKey)}
                              className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span>{formatMonthYearLabel(mKey, 'full')}</span>
                            {isCurrent && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-200 text-amber-900">
                                Atual
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                            {count}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between min-h-[105px]">
          <div className="text-xs text-slate-500 font-medium leading-tight min-h-[30px] flex items-center whitespace-normal break-words">
            <span>Total de<br />Pedidos</span>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1 tabular-nums whitespace-normal break-words">
            {totalPedidos}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 whitespace-normal break-words">
            {activeMonthOrders.length} ativos · {pedidosCanceladosCount} cancelados
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between min-h-[105px]">
          <div className="text-xs text-slate-500 font-medium leading-tight min-h-[30px] flex items-center whitespace-normal break-words">
            <span>Volume de<br />Vendas</span>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-800 mt-1 tabular-nums whitespace-normal break-words" title={formatBRL(totalVendas)}>
            {formatBRL(totalVendas)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 whitespace-normal break-words">
            pedidos faturados ativos
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between min-h-[105px]">
          <div className="text-xs text-slate-500 font-medium leading-tight min-h-[30px] flex items-center whitespace-normal break-words">
            <span>Ticket Médio<br />Pedido</span>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1 tabular-nums whitespace-normal break-words" title={formatBRL(ticketMedio)}>
            {formatBRL(ticketMedio)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 whitespace-normal break-words">
            por pedido ativo
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between min-h-[105px]">
          <div className="text-xs text-slate-500 font-medium leading-tight min-h-[30px] flex items-center whitespace-normal break-words">
            <span>Total de<br />Itens</span>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1 tabular-nums whitespace-normal break-words">
            {totalItens}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 whitespace-normal break-words">
            {totalItens === 1 ? '1 item vendido' : `${totalItens} itens vendidos`}
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between min-h-[105px]">
          <div className="text-xs text-slate-500 font-medium leading-tight min-h-[30px] flex items-center whitespace-normal break-words">
            <span>Ticket médio<br />Itens</span>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-800 mt-1 tabular-nums whitespace-normal break-words" title={formatBRL(ticketMedioItens)}>
            {formatBRL(ticketMedioItens)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 whitespace-normal break-words">
            preço médio / item
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between min-h-[105px]">
          <div className="text-xs text-slate-500 font-medium leading-tight min-h-[30px] flex items-center whitespace-normal break-words">
            <span>Sobra Frete<br />Real</span>
          </div>
          <div className={`text-xl font-bold font-mono mt-1 tabular-nums whitespace-normal break-words ${sobraFrete >= 0 ? 'text-emerald-700' : 'text-rose-700'}`} title={sobraFrete >= 0 ? `+${formatBRL(sobraFrete)}` : `-${formatBRL(Math.abs(sobraFrete))}`}>
            {sobraFrete >= 0 ? `+${formatBRL(sobraFrete)}` : `-${formatBRL(Math.abs(sobraFrete))}`}
          </div>
          <div className={`text-[11px] font-medium mt-0.5 whitespace-normal break-words ${sobraFrete >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
            {sobraFrete >= 0 ? 'Superávit líquido' : 'Prejuízo absorvido'}
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between min-h-[105px]">
          <div className="text-xs text-slate-500 font-medium leading-tight min-h-[30px] flex items-center whitespace-normal break-words">
            <span>Pedidos<br />Cancelados</span>
          </div>
          <div className="text-xl font-bold font-mono text-rose-700 mt-1 tabular-nums whitespace-normal break-words">
            {pedidosCanceladosCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 whitespace-normal break-words">
            {pedidosCanceladosCount === 1 ? '1 cancelado' : `${pedidosCanceladosCount} cancelados`}
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between min-h-[105px]">
          <div className="text-xs text-slate-500 font-medium leading-tight min-h-[30px] flex items-center whitespace-normal break-words">
            <span>Valores<br />Devolvidos</span>
          </div>
          <div className="text-xl font-bold font-mono text-amber-900 mt-1 tabular-nums whitespace-normal break-words" title={formatBRL(valoresDevolvidosTotal)}>
            {formatBRL(valoresDevolvidosTotal)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 whitespace-normal break-words">
            total cancelado / estornado
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por ID, Código Cliente (ABC1234), nome do cliente, cidade ou modelo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="w-full sm:w-auto text-xs py-2 px-2.5 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium text-slate-700"
              >
                <option value="all">Forma Pagto (Todas)</option>
                <option value="pix">Pix (À vista)</option>
                <option value="boleto">Boleto Bancário</option>
                <option value="credito_1x">Crédito 1x</option>
                <option value="credito_2x">Crédito 2x</option>
                <option value="credito_3x">Crédito 3x</option>
              </select>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto text-xs py-2 px-2.5 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium text-slate-700"
            >
              <option value="all">Status Geral (Todos)</option>
              <option value="em_producao">Em Produção</option>
              <option value="pronto_expedicao">Pronto para Expedição</option>
              <option value="embalado">Embalado</option>
              <option value="despachado">Despachado</option>
              <option value="entregue">Entregue</option>
              <option value="cancelado">Cancelado</option>
              <option value="cancelado_estornado">Cancelado e Estornado</option>
            </select>

            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold shadow-2xs transition-colors cursor-pointer shrink-0"
              title="Exportar pedidos em CSV compatível com Excel"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Exportar</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span>
              Exibindo <span className="font-mono font-semibold text-slate-800">{filteredOrders.length === 0 ? 0 : startIndex + 1}-{endIndex}</span> de{' '}
              <span className="font-mono font-semibold text-slate-800">{filteredOrders.length}</span> pedidos no período ({orders.length} no total geral)
            </span>

            {filterInternalId && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-medium">
                Interno: <strong className="font-mono">{filterInternalId}</strong>
                <button
                  type="button"
                  onClick={() => setFilterInternalId('')}
                  className="hover:text-amber-950 cursor-pointer"
                  title="Remover filtro"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}

            {filterCodigoCliente && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 text-[10px] font-medium">
                Cliente: <strong className="font-mono">{filterCodigoCliente}</strong>
                <button
                  type="button"
                  onClick={() => setFilterCodigoCliente('')}
                  className="hover:text-indigo-950 cursor-pointer"
                  title="Remover filtro"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}

            {filterClientName && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200 text-[10px] font-medium">
                Cliente: <strong>{filterClientName}</strong>
                <button
                  type="button"
                  onClick={() => setFilterClientName('')}
                  className="hover:text-slate-950 cursor-pointer"
                  title="Remover filtro"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}
          </div>

          {(searchTerm || paymentFilter !== 'all' || statusFilter !== 'all' || filterInternalId || filterCodigoCliente || filterClientName) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setPaymentFilter('all');
                setStatusFilter('all');
                setFilterInternalId('');
                setFilterCodigoCliente('');
                setFilterClientName('');
              }}
              className="text-[11px] text-amber-700 hover:underline font-medium cursor-pointer"
            >
              Limpar todos os filtros
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="w-full max-w-[100vw] overflow-x-auto">
          <table className="w-full min-w-[980px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider select-none">
                <th className="py-2.5 px-2.5 sm:px-3 relative text-left">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold leading-tight">Pedido Interno</span>
                    <button
                      type="button"
                      onClick={() => handleToggleSort('id')}
                      className={`p-1 rounded hover:bg-slate-200/80 transition-colors cursor-pointer shrink-0 ${
                        sortField === 'id' ? 'text-amber-700 font-bold bg-amber-100/70' : 'text-slate-400'
                      }`}
                      title="Ordenar por Pedido Interno"
                    >
                      {sortField === 'id' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3" />
                      )}
                    </button>
                    <div className="relative inline-block shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveFilterPopover((prev) => (prev === 'internalId' ? null : 'internalId'));
                        }}
                        className={`p-1 rounded hover:bg-slate-200/80 transition-colors cursor-pointer relative ${
                          filterInternalId ? 'bg-amber-100 text-amber-800 font-bold' : activeFilterPopover === 'internalId' ? 'bg-slate-200 text-slate-800' : 'text-slate-400'
                        }`}
                        title="Filtrar por Pedido Interno"
                      >
                        <Search className="w-3 h-3" />
                        {filterInternalId && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 absolute top-0.5 right-0.5" />
                        )}
                      </button>

                      {activeFilterPopover === 'internalId' && (
                        <div
                          ref={filterPopoverRef}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute left-0 top-full mt-1.5 w-56 p-2.5 bg-white rounded-xl shadow-xl border border-slate-200 z-50 text-slate-800 normal-case font-normal animate-in fade-in zoom-in-95"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-bold text-slate-800">Filtrar Pedido Interno</span>
                            <button
                              type="button"
                              onClick={() => setActiveFilterPopover(null)}
                              className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              autoFocus
                              value={filterInternalId}
                              onChange={(e) => setFilterInternalId(e.target.value)}
                              placeholder="Ex: 0011026..."
                              className="w-full pl-7 pr-6 py-1.5 text-xs font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-slate-50 focus:bg-white"
                            />
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2 pointer-events-none" />
                            {filterInternalId && (
                              <button
                                type="button"
                                onClick={() => setFilterInternalId('')}
                                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </th>

                <th className="py-2.5 px-2.5 sm:px-3 relative text-left">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold leading-tight">Pedido Cliente</span>
                    <button
                      type="button"
                      onClick={() => handleToggleSort('codigoCliente')}
                      className={`p-1 rounded hover:bg-slate-200/80 transition-colors cursor-pointer shrink-0 ${
                        sortField === 'codigoCliente' ? 'text-indigo-700 font-bold bg-indigo-100/70' : 'text-slate-400'
                      }`}
                      title="Ordenar por Pedido Cliente"
                    >
                      {sortField === 'codigoCliente' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3" />
                      )}
                    </button>
                    <div className="relative inline-block shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveFilterPopover((prev) => (prev === 'codigoCliente' ? null : 'codigoCliente'));
                        }}
                        className={`p-1 rounded hover:bg-slate-200/80 transition-colors cursor-pointer relative ${
                          filterCodigoCliente ? 'bg-indigo-100 text-indigo-800 font-bold' : activeFilterPopover === 'codigoCliente' ? 'bg-slate-200 text-slate-800' : 'text-slate-400'
                        }`}
                        title="Filtrar por Código do Cliente"
                      >
                        <Search className="w-3 h-3" />
                        {filterCodigoCliente && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 absolute top-0.5 right-0.5" />
                        )}
                      </button>

                      {activeFilterPopover === 'codigoCliente' && (
                        <div
                          ref={filterPopoverRef}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute left-0 top-full mt-1.5 w-56 p-2.5 bg-white rounded-xl shadow-xl border border-slate-200 z-50 text-slate-800 normal-case font-normal animate-in fade-in zoom-in-95"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-bold text-slate-800">Filtrar Pedido Cliente</span>
                            <button
                              type="button"
                              onClick={() => setActiveFilterPopover(null)}
                              className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              autoFocus
                              value={filterCodigoCliente}
                              onChange={(e) => setFilterCodigoCliente(e.target.value)}
                              placeholder="Ex: ABC1234..."
                              className="w-full pl-7 pr-6 py-1.5 text-xs font-mono uppercase rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
                            />
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2 pointer-events-none" />
                            {filterCodigoCliente && (
                              <button
                                type="button"
                                onClick={() => setFilterCodigoCliente('')}
                                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </th>

                <th className="py-2.5 px-2.5 sm:px-3 text-left">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold leading-tight">Data</span>
                    <button
                      type="button"
                      onClick={() => handleToggleSort('date')}
                      className={`p-1 rounded hover:bg-slate-200/80 transition-colors cursor-pointer shrink-0 ${
                        sortField === 'date' ? 'text-amber-700 font-bold bg-amber-100/70' : 'text-slate-400'
                      }`}
                      title="Ordenar por Data"
                    >
                      {sortField === 'date' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </th>

                <th className="py-2.5 px-2.5 sm:px-3 relative text-left">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold leading-tight">Cliente</span>
                    <button
                      type="button"
                      onClick={() => handleToggleSort('clientName')}
                      className={`p-1 rounded hover:bg-slate-200/80 transition-colors cursor-pointer shrink-0 ${
                        sortField === 'clientName' ? 'text-amber-700 font-bold bg-amber-100/70' : 'text-slate-400'
                      }`}
                      title="Ordenar por Nome do Cliente"
                    >
                      {sortField === 'clientName' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3" />
                      )}
                    </button>
                    <div className="relative inline-block shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveFilterPopover((prev) => (prev === 'clientName' ? null : 'clientName'));
                        }}
                        className={`p-1 rounded hover:bg-slate-200/80 transition-colors cursor-pointer relative ${
                          filterClientName ? 'bg-amber-100 text-amber-800 font-bold' : activeFilterPopover === 'clientName' ? 'bg-slate-200 text-slate-800' : 'text-slate-400'
                        }`}
                        title="Filtrar por Nome do Cliente"
                      >
                        <Search className="w-3 h-3" />
                        {filterClientName && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 absolute top-0.5 right-0.5" />
                        )}
                      </button>

                      {activeFilterPopover === 'clientName' && (
                        <div
                          ref={filterPopoverRef}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute left-0 top-full mt-1.5 w-60 p-2.5 bg-white rounded-xl shadow-xl border border-slate-200 z-50 text-slate-800 normal-case font-normal animate-in fade-in zoom-in-95"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-bold text-slate-800">Filtrar por Nome do Cliente</span>
                            <button
                              type="button"
                              onClick={() => setActiveFilterPopover(null)}
                              className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              autoFocus
                              value={filterClientName}
                              onChange={(e) => setFilterClientName(e.target.value)}
                              placeholder="Digite o nome ou parte..."
                              className="w-full pl-7 pr-6 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-slate-50 focus:bg-white"
                            />
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2 pointer-events-none" />
                            {filterClientName && (
                              <button
                                type="button"
                                onClick={() => setFilterClientName('')}
                                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </th>

                <th className="py-2.5 px-2.5 sm:px-3 text-left leading-tight">Item Comprado</th>
                <th className="py-2.5 px-2.5 sm:px-3 text-right leading-tight">Valor Venda</th>
                <th className="py-2.5 px-2.5 sm:px-3 text-right leading-tight">Frete & Logística</th>
                <th className="py-2.5 px-2.5 sm:px-3 text-left leading-tight">Forma Pagto</th>
                <th className="py-2.5 px-2.5 sm:px-3 text-left leading-tight">Status Geral</th>
                <th className="py-2.5 px-2.5 sm:px-3 text-center leading-tight">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-500">
                    <Package className="w-8 h-8 text-gray-400 mx-auto mb-2 stroke-[1.5]" />
                    <p className="font-semibold text-gray-700">Nenhum pedido encontrado</p>
                    <p className="text-xs text-gray-400 mt-0.5 max-w-md mx-auto">
                      {orders.length === 0
                        ? 'O sistema está pronto para testes reais. Crie um novo pedido no botão "+ Novo Pedido".'
                        : mesesSelecionados.length === 0
                        ? 'Nenhum mês está selecionado no filtro de período. Clique em "Mês Atual" ou selecione um mês acima.'
                        : 'Nenhum pedido corresponde aos critérios nos meses selecionados.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => {
                  const status = STATUS_CONFIG[order.status];
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      <td className="py-2.5 px-2.5 sm:px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <button
                          onClick={() => onSelectOrder(order)}
                          className="hover:text-amber-700 hover:underline text-left inline-flex items-center gap-1 cursor-pointer"
                          title="Ver detalhes do pedido"
                        >
                          {order.id}
                        </button>
                      </td>

                      <td className="py-2.5 px-2.5 sm:px-3 whitespace-nowrap">
                        {order.codigoCliente ? (
                          <span
                            className="inline-flex items-center gap-1 font-mono font-bold text-xs px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/90 shadow-2xs group-hover:border-indigo-300 group-hover:bg-indigo-100/60 transition-colors"
                            title={`Código de rastreio para o cliente: ${order.codigoCliente}`}
                          >
                            <Sparkles className="w-3 h-3 text-indigo-500 shrink-0" />
                            <span>{order.codigoCliente}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-slate-400 italic">
                            -
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-2.5 sm:px-3 font-mono text-slate-600 whitespace-nowrap text-xs">
                        {formatDate(order.createdAt)}
                      </td>

                      <td className="py-2.5 px-2.5 sm:px-3 whitespace-nowrap">
                        <div className="font-medium text-slate-900 leading-tight">{order.clientName}</div>
                        <div className="text-[10px] text-slate-500">
                          {order.clientCity || ''}/{order.clientState || ''}
                        </div>
                      </td>

                      <td className="py-2.5 px-2.5 sm:px-3">
                        {order.items && order.items.length > 0 ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                {order.items.reduce((acc, it) => acc + (it.quantity || 1), 0)} {order.items.reduce((acc, it) => acc + (it.quantity || 1), 0) === 1 ? 'item' : 'itens'}
                              </span>
                              {order.items.length > 1 && (
                                <span className="text-[10px] text-slate-500 font-medium">
                                  ({order.items.length} mod.)
                                </span>
                              )}
                            </div>
                            <div 
                              className="font-medium text-slate-900 max-w-xs sm:max-w-sm truncate text-[11px]" 
                              title={order.items.map(i => `${i.quantity || 1}x ${i.model || ''} (${i.code || ''})`).join('\n')}
                            >
                              {order.items.map((i) => `${i.quantity || 1}x ${i.model || ''}`).join(' + ')}
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="font-medium text-slate-900 max-w-xs truncate text-[11px]">
                              {order.item}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate max-w-xs">
                              {order.itemModel}
                            </div>
                          </>
                        )}
                      </td>

                      <td className="py-2.5 px-2.5 sm:px-3 text-right whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900 tabular-nums">
                          {formatBRL(order.saleValue || 0)}
                        </div>
                        {order.subtotal && order.subtotal !== order.saleValue ? (
                          <div className="text-[10px] font-mono text-slate-400">
                            Subtotal: {formatBRL(order.subtotal)}
                          </div>
                        ) : null}
                      </td>

                      <td className="py-2.5 px-2.5 sm:px-3 text-right whitespace-nowrap">
                        <div className="font-mono tabular-nums">
                          {order.shippingCharged === 0 ? (
                            <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Frete Grátis
                            </span>
                          ) : (
                            <span className="font-bold text-slate-900 text-xs">
                              {formatBRL(order.shippingCharged || 0)}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-sans mt-0.5 flex items-center justify-end gap-1">
                          <Truck className="w-3 h-3 text-slate-400" />
                          <span className="font-medium text-slate-700">{order.carrier || 'Envio'}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-2.5 sm:px-3 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 text-slate-800 border border-slate-200">
                            {PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}
                          </span>
                          {order.paymentStatus === 'aguardando_diferenca' && (
                            <div className="flex items-center gap-1">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-50 text-amber-900 border border-amber-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                Aguard. Dif.
                              </span>
                            </div>
                          )}
                          {order.paymentStatus === 'diferenca_paga' && (
                            <div className="flex items-center gap-1">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-50 text-blue-900 border border-blue-200">
                                Dif. Paga
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-2.5 sm:px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${status?.bg || 'bg-slate-100'} ${status?.color || 'text-slate-800'} ${status?.border || 'border-slate-200'}`}
                        >
                          {status?.label || order.status}
                        </span>
                      </td>

                      <td className="py-2.5 px-2.5 sm:px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setNotifyingOrder(order);
                            }}
                            title="Avisar cliente"
                            aria-label="Avisar cliente"
                            className="p-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-200/90 shadow-2xs transition-colors cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>

                          {order.status === 'cancelado' ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRefundOrder(order);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
                              title="Registrar devolução (estorno)"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Devolver R$</span>
                            </button>
                          ) : order.status === 'cancelado_estornado' ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs whitespace-nowrap"
                              title="Estorno financeiro efetuado"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                              <span>Estornado</span>
                            </span>
                          ) : (
                            !isViewer && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelarPedido(order.id);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100/90 border border-rose-200/90 transition-colors cursor-pointer whitespace-nowrap"
                                title="Cancelar Pedido"
                              >
                                <Ban className="w-3.5 h-3.5 text-rose-600" />
                                <span>Cancelar</span>
                              </button>
                            )
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingOrder(order);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                            title="Editar Pedido"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onSelectOrder(order)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                            title="Ver detalhes do pedido"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>

                          {!isViewer && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Deseja remover definitivamente o registro do pedido #${order.id}?`)) {
                                  onDeleteOrder(order.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Excluir registro permanentemente"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredOrders.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-200/90 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-slate-600 text-center sm:text-left">
              Mostrando <span className="font-mono font-bold text-slate-900">{startIndex + 1}</span> a{' '}
              <span className="font-mono font-bold text-slate-900">{endIndex}</span> de{' '}
              <span className="font-mono font-bold text-slate-900">{filteredOrders.length}</span> pedidos
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                {totalPages > 4 && (
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                    title="Primeira página"
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed font-medium transition-colors cursor-pointer shadow-2xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Anterior</span>
                </button>

                <div className="flex items-center gap-1 mx-1">
                  {paginationRange.map((pageItem, idx) => {
                    if (pageItem === '...') {
                      return (
                        <span key={`dots-${idx}`} className="px-1.5 py-1 text-slate-400 select-none font-mono text-xs">
                          ...
                        </span>
                      );
                    }

                    const pageNumber = Number(pageItem);
                    const isActive = pageNumber === currentPage;

                    return (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`min-w-[30px] h-7 px-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-amber-500 text-slate-950 shadow-2xs ring-1 ring-amber-600/30'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed font-medium transition-colors cursor-pointer shadow-2xs"
                >
                  <span className="hidden sm:inline">Próximo</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {totalPages > 4 && (
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                    title="Última página"
                  >
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <NewOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddOrder={(newOrder) => {
          onAddOrder(newOrder);
          setIsModalOpen(false);
        }}
        clients={clients}
        onAddClient={onAddClient}
        products={products}
        onAddProduct={onAddProduct}
        orders={orders}
        userRole={userRole}
      />

      <EditOrderModal
        isOpen={!!editingOrder}
        order={editingOrder}
        onClose={() => setEditingOrder(null)}
        onSaveOrder={(updatedOrder) => {
          if (onUpdateOrder) {
            onUpdateOrder(updatedOrder);
          }
          setEditingOrder(null);
        }}
        products={products}
        userRole={userRole}
      />

      <NotifyCustomerModal
        isOpen={!!notifyingOrder}
        onClose={() => setNotifyingOrder(null)}
        order={notifyingOrder}
      />

      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-200">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <Download className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">{toastMessage}</p>
            <p className="text-[11px] text-slate-400">Sistema Terçarium atualizado com sucesso.</p>
          </div>
        </div>
      )}
    </div>
  );
};
