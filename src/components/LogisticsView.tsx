import React, { useState, useMemo, useEffect } from 'react';
import { 
  Truck, 
  ExternalLink, 
  Copy, 
  Check, 
  Search, 
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Order, OrderStatus, STATUS_CONFIG } from '../types/erp';
import { 
  extractMonthYear, 
  getAvailableMonthKeys, 
  formatMonthYearLabel 
} from '../utils/formatters';

interface LogisticsViewProps {
  orders: Order[];
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
  onOpenTracking: (order: Order) => void;
  onSelectOrder: (order: Order) => void;
}

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'em_producao', label: 'Em Produção' },
  { value: 'pronto_expedicao', label: 'Pronto para Expedição' },
  { value: 'embalado', label: 'Embalado' },
  { value: 'despachado', label: 'Despachado' },
  { value: 'entregue', label: 'Entregue' },
];

const ITEMS_PER_PAGE = 10;

export const LogisticsView: React.FC<LogisticsViewProps> = ({
  orders,
  onStatusChange,
  onOpenTracking,
  onSelectOrder,
}) => {
  // Filtros de busca e categorização
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [carrierFilter, setCarrierFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Paginação client-side (máximo 10 linhas por página)
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Lista dinâmica de meses disponíveis a partir dos pedidos
  const availableMonthKeys = useMemo(() => getAvailableMonthKeys(orders), [orders]);

  const handleCopyTracking = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Helper seguro para extrair o texto descritivo dos itens do pedido (com tipagem flexível)
  const getOrderItemsSummary = (order: Order) => {
    if (Array.isArray(order.items) && order.items.length > 0) {
      const firstItem = order.items[0] as any;
      const modelName = firstItem.model || firstItem.name || firstItem.descricao || 'Terço Personalizado';
      const codeOrSku = firstItem.code || firstItem.productId || '';
      return { modelName, codeOrSku };
    }
    return {
      modelName: order.item || order.itemModel || 'Terço em Paracord',
      codeOrSku: order.codigoCliente || ''
    };
  };

  // Filtragem dos pedidos com base em busca textual, mês, transportadora, plataforma e status
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const itemSummary = getOrderItemsSummary(order);
      const matchesSearch =
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.trackingCode ? order.trackingCode.toLowerCase().includes(searchTerm.toLowerCase()) : false) ||
        itemSummary.modelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        itemSummary.codeOrSku.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesMonth =
        monthFilter === 'all' || extractMonthYear(order.createdAt) === monthFilter;

      const matchesCarrier = carrierFilter === 'all' || order.carrier === carrierFilter;
      const matchesPlatform = platformFilter === 'all' || order.shippingPlatform === platformFilter;
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

      return matchesSearch && matchesMonth && matchesCarrier && matchesPlatform && matchesStatus;
    });
  }, [orders, searchTerm, monthFilter, carrierFilter, platformFilter, statusFilter]);

  // Recalcula e reseta a paginação para a página 1 automaticamente ao aplicar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, monthFilter, carrierFilter, platformFilter, statusFilter]);

  // Total de páginas calculado dinamicamente com base nos itens filtrados
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE));

  // Trava de segurança para evitar que a página atual seja maior que o total de páginas disponíveis
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Fatiamento dos registros para paginação client-side (máximo de 10 por página)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredOrders.length);
  const paginatedOrders = useMemo(() => {
    return filteredOrders.slice(startIndex, endIndex);
  }, [filteredOrders, startIndex, endIndex]);

  // Régua de navegação com páginas numéricas (exibe até 5 páginas consecutivas)
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, start + maxVisiblePages - 1);
      if (end - start < maxVisiblePages - 1) {
        start = Math.max(1, end - maxVisiblePages + 1);
      }
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    return pages;
  }, [currentPage, totalPages]);

  // Contagem para o pipeline visual (se mês estiver selecionado, reflete o mês de referência)
  const baseOrdersForPipeline = useMemo(() => {
    if (monthFilter === 'all') return orders;
    return orders.filter((o) => extractMonthYear(o.createdAt) === monthFilter);
  }, [orders, monthFilter]);

  return (
    <div className="space-y-6">
      {/* Production & Logistics Pipeline Stage Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Controle Operacional do Ateliê & Logística
            </h3>
            <p className="text-xs text-slate-500">
              Acompanhamento de ponta a ponta desde a bancada até a entrega ao cliente
            </p>
          </div>
          <div className="text-xs text-slate-500 font-mono">
            {baseOrdersForPipeline.length} pedidos no fluxo {monthFilter !== 'all' && `(${formatMonthYearLabel(monthFilter, 'short')})`}
          </div>
        </div>

        {/* 5-Step Visual Flow Indicator */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {STATUS_OPTIONS.map((step, idx) => {
            const count = baseOrdersForPipeline.filter((o) => o.status === step.value).length;
            const config = STATUS_CONFIG[step.value];
            const isFilterActive = statusFilter === step.value;

            return (
              <button
                key={step.value}
                type="button"
                onClick={() => setStatusFilter(isFilterActive ? 'all' : step.value)}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  isFilterActive
                    ? 'ring-2 ring-amber-500 border-amber-500 bg-white shadow-xs'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono font-semibold text-slate-400">
                    Etapa 0{idx + 1}
                  </span>
                  <span
                    className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${config.bg} ${config.color}`}
                  >
                    {count}
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-900 leading-tight">
                  {step.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar com Filtro por Meses */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Campo de Busca Textual */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por código de pedido, rastreio, modelo ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            {/* Filtro por Mês de Referência (Select) */}
            <div className="w-full sm:w-auto relative">
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                aria-label="Filtrar por Mês de Referência"
                className="w-full sm:w-auto text-xs py-2 px-2.5 rounded-lg border border-slate-200 bg-slate-50/50 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                <option value="all">Mês (Todos)</option>
                {availableMonthKeys.map((mKey) => (
                  <option key={mKey} value={mKey}>
                    {formatMonthYearLabel(mKey, 'full')}
                  </option>
                ))}
              </select>
            </div>

            {/* Plataforma */}
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              aria-label="Filtrar por Plataforma de Frete"
              className="w-full sm:w-auto text-xs py-2 px-2.5 rounded-lg border border-slate-200 bg-slate-50/50 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              <option value="all">Plataforma (Todas)</option>
              <option value="Melhor Envio">Melhor Envio</option>
              <option value="Frenet">Frenet</option>
              <option value="SuperFrete">SuperFrete</option>
              <option value="Outra">Outra</option>
            </select>

            {/* Transportadora */}
            <select
              value={carrierFilter}
              onChange={(e) => setCarrierFilter(e.target.value)}
              aria-label="Filtrar por Transportadora"
              className="w-full sm:w-auto text-xs py-2 px-2.5 rounded-lg border border-slate-200 bg-slate-50/50 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              <option value="all">Transportadora (Todas)</option>
              <option value="Correios PAC">Correios PAC</option>
              <option value="Correios SEDEX">Correios SEDEX</option>
              <option value="Transportadora Loggi">Transportadora Loggi</option>
              <option value="Transportadora J&T Express">Transportadora J&T Express</option>
              <option value="Outra">Outra</option>
            </select>

            {/* Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filtrar por Status Operacional"
              className="w-full sm:w-auto text-xs py-2 px-2.5 rounded-lg border border-slate-200 bg-slate-50/50 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              <option value="all">Status (Todos)</option>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Barra de resumo de filtros ativos */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span>
              Listando <span className="font-mono font-semibold text-slate-800">{filteredOrders.length}</span> remessas
            </span>
            {monthFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-900 border border-amber-200">
                <Calendar className="w-3 h-3 text-amber-700" />
                {formatMonthYearLabel(monthFilter, 'full')}
              </span>
            )}
          </div>
          {(searchTerm || carrierFilter !== 'all' || platformFilter !== 'all' || statusFilter !== 'all' || monthFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setCarrierFilter('all');
                setPlatformFilter('all');
                setStatusFilter('all');
                setMonthFilter('all');
                setCurrentPage(1);
              }}
              className="text-[11px] text-amber-700 hover:text-amber-800 hover:underline font-medium cursor-pointer"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Tracking & Production Table com Paginação Client-side (Max 10 linhas) */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Pedido</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Modelo do Terço</th>
                <th className="py-3 px-4">Plataforma Frete</th>
                <th className="py-3 px-4">Transportadora</th>
                <th className="py-3 px-4">Rastreio</th>
                <th className="py-3 px-4">Seletor Visual de Status</th>
                <th className="py-3 px-4 text-center">Ficha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center p-6">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-2.5 text-slate-400">
                        <Truck className="w-6 h-6 stroke-[1.5]" />
                      </div>
                      <p className="font-semibold text-gray-700 text-sm">Nenhuma encomenda encontrada</p>
                      <p className="text-xs text-gray-500 mt-0.5 max-w-md">
                        {searchTerm || carrierFilter !== 'all' || platformFilter !== 'all' || statusFilter !== 'all' || monthFilter !== 'all'
                          ? 'Nenhuma encomenda corresponde aos filtros selecionados para o período.'
                          : 'As encomendas e etapas da linha de produção aparecerão automaticamente conforme os pedidos forem gerados.'}
                      </p>
                      {(searchTerm || carrierFilter !== 'all' || platformFilter !== 'all' || statusFilter !== 'all' || monthFilter !== 'all') && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchTerm('');
                            setCarrierFilter('all');
                            setPlatformFilter('all');
                            setStatusFilter('all');
                            setMonthFilter('all');
                            setCurrentPage(1);
                          }}
                          className="mt-3 text-xs text-amber-700 hover:text-amber-800 font-semibold underline cursor-pointer"
                        >
                          Limpar todos os filtros
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => {
                  const statusInfo = STATUS_CONFIG[order.status];
                  const itemSummary = getOrderItemsSummary(order);

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Pedido */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => onSelectOrder(order)}
                            className="font-mono font-bold text-slate-900 hover:text-amber-700 hover:underline cursor-pointer"
                            title="Ver detalhes do pedido"
                          >
                            {order.id}
                          </button>
                          {order.codigoCliente && (
                            <span 
                              className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/90 shadow-2xs" 
                              title="Código do Cliente"
                            >
                              {order.codigoCliente}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-sans font-normal mt-0.5">
                          {order.clientCity || 'Londrina'}/{order.clientState || 'PR'}
                        </div>
                      </td>

                      {/* Cliente */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-900 max-w-[150px] truncate" title={order.clientName}>
                          {order.clientName || 'Cliente não informado'}
                        </div>
                      </td>

                      {/* Modelo */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900 max-w-xs sm:max-w-sm">
                          {itemSummary.modelName}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">
                          {itemSummary.codeOrSku}
                        </div>
                      </td>

                      {/* Plataforma de Frete */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                          {order.shippingPlatform || 'Melhor Envio'}
                        </span>
                      </td>

                      {/* Transportadora */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-800">
                            {order.carrier || 'Correios PAC'}
                          </span>
                        </div>
                      </td>

                      {/* Rastreio */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {order.trackingCode ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onOpenTracking(order)}
                              className="font-mono text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:underline bg-indigo-50/80 px-2 py-0.5 rounded border border-indigo-200 cursor-pointer"
                              title="Abrir linha do tempo de rastreio"
                            >
                              {order.trackingCode}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCopyTracking(order.trackingCode!)}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Copiar código"
                            >
                              {copiedCode === order.trackingCode ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic font-medium">
                            Pendente
                          </span>
                        )}
                      </td>

                      {/* Seletor Visual de Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="relative inline-block w-48">
                          <select
                            value={order.status}
                            onChange={(e) =>
                              onStatusChange(order.id, e.target.value as OrderStatus)
                            }
                            aria-label={`Alterar status do pedido ${order.id}`}
                            className={`w-full text-xs font-medium py-1.5 px-2.5 rounded-lg border cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors ${statusInfo ? `${statusInfo.bg} ${statusInfo.color} ${statusInfo.border}` : 'bg-slate-100 text-slate-800 border-slate-200'}`}
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option
                                key={opt.value}
                                value={opt.value}
                                className="bg-white text-slate-800 font-sans"
                              >
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* Ficha / Detalhe */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onSelectOrder(order)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Ver ficha completa"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé da Tabela com Paginação Client-Side (Máximo 10 linhas) */}
        {filteredOrders.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            {/* Contadores e Indicadores de Página */}
            <div className="flex items-center gap-2 flex-wrap text-center sm:text-left">
              <span>
                Exibindo <span className="font-mono font-semibold text-slate-800">{startIndex + 1}</span> a{' '}
                <span className="font-mono font-semibold text-slate-800">{endIndex}</span> de{' '}
                <span className="font-mono font-semibold text-slate-800">{filteredOrders.length}</span> remessas
              </span>
              <span className="text-slate-300 hidden sm:inline">|</span>
              <span className="text-slate-500">
                Página <span className="font-mono font-semibold text-slate-800">{currentPage}</span> de{' '}
                <span className="font-mono font-semibold text-slate-800">{totalPages}</span>
              </span>
            </div>

            {/* Controles de Navegação: Anterior, Páginas e Próxima */}
            <div className="flex items-center gap-1.5">
              {/* Botão Anterior */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed font-medium transition-colors shadow-2xs cursor-pointer"
                title="Página anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>

              {/* Régua de botões numéricos */}
              <div className="flex items-center gap-1">
                {pageNumbers.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      pageNumber === currentPage
                        ? 'bg-amber-500 text-slate-950 shadow-2xs ring-1 ring-amber-600/30'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                    title={`Ir para página ${pageNumber}`}
                  >
                    {pageNumber}
                  </button>
                ))}
              </div>

              {/* Botão Próxima */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed font-medium transition-colors shadow-2xs cursor-pointer"
                title="Próxima página"
              >
                <span>Próxima</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
