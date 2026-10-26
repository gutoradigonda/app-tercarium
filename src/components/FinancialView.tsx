import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Percent, 
  ArrowDownRight, 
  ArrowUpRight,
  ShieldCheck, 
  Scale, 
  Sparkles, 
  Calendar,
  Truck,
  Package,
  CheckCircle2,
  BarChart3,
  CreditCard,
  Filter,
  Layers,
  ChevronDown,
  Receipt,
  Download,
  Ban,
  RotateCcw,
  Info,
  X
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { Order, Expense, PAYMENT_FACTORS, PAYMENT_LABELS } from '../types/erp';
import { exportToCSV } from '../utils/exportUtils';
import { 
  calculateFinancialMetrics, 
  formatBRL, 
  formatFactor, 
  formatPercent,
  getCurrentMonthKey,
  getAvailableMonthKeys,
  extractMonthYear,
  formatMonthYearLabel,
  formatDate
} from '../utils/formatters';

interface FinancialViewProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
  expenses?: Expense[];
}

type DetailCardType = 'venda' | 'ticket' | 'custos' | 'descontos' | 'frete' | 'lucroBruto' | 'devolvidos' | null;

export const FinancialView: React.FC<FinancialViewProps> = ({ orders, onSelectOrder, expenses = [] }) => {
  const [mesesSelecionados, setMesesSelecionados] = useState<string[]>(() => [getCurrentMonthKey()]);
  const currentMonthKey = useMemo(() => getCurrentMonthKey(), []);
  const availableMonthKeys = useMemo(() => getAvailableMonthKeys(orders), [orders]);

  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'profit_desc' | 'profit_asc' | 'margin_desc' | 'value_desc'>('profit_desc');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeDetailCard, setActiveDetailCard] = useState<DetailCardType>(null);
  const [chartMode, setChartMode] = useState<'auto' | 'day' | 'month'>('auto');

  const handleExport = () => {
    setToastMessage('Download do relatório em CSV iniciado...');
    setTimeout(() => setToastMessage(null), 3500);

    const headers = [
      'Pedido', 'Data', 'Cliente', 'Cidade/UF', 'Forma Pagto', 'Subtotal Itens (R$)',
      'Desconto (R$)', 'Venda Bruta (R$)', 'Custo Produção (R$)', 'Taxa Gateway (R$)',
      'Frete Cobrado (R$)', 'Frete Pago (R$)', 'Sobra Frete (R$)', 'Lucro Bruto Margem (R$)', 'Margem (%)'
    ];
    const rows = tableFilteredOrders.map(({ order, metrics }) => [
      order.id, formatDate(order.createdAt), order.clientName, `${order.clientCity || ''}/${order.clientState || ''}`,
      PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod, metrics.subtotal.toFixed(2),
      metrics.discount.toFixed(2), metrics.saleValue.toFixed(2), metrics.productionCost.toFixed(2),
      metrics.gatewayFee.toFixed(2), metrics.shippingCharged.toFixed(2), metrics.shippingPaid.toFixed(2),
      metrics.shippingSurplus.toFixed(2), metrics.netProfit.toFixed(2), metrics.marginPercent.toFixed(1)
    ]);
    exportToCSV('demonstrativo_financeiro_tercarium', headers, rows);
  };

  const handleSelectCurrentMonth = () => setMesesSelecionados([currentMonthKey]);
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
  const handleSelectAllMonths = () => setMesesSelecionados(availableMonthKeys);
  const handleToggleMonth = (mKey: string) => {
    setMesesSelecionados((prev) => prev.includes(mKey) ? prev.filter((k) => k !== mKey) : [...prev, mKey]);
  };

  const isOnlyCurrentMonthSelected = mesesSelecionados.length === 1 && mesesSelecionados[0] === currentMonthKey;
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
  const isAllMonthsSelected = availableMonthKeys.length > 0 && availableMonthKeys.every((k) => mesesSelecionados.includes(k));

  const monthFilteredOrders = useMemo(() => {
    if (mesesSelecionados.length === 0) return [];
    return orders.filter((order) => {
      const mKey = extractMonthYear(order.createdAt);
      return mKey ? mesesSelecionados.includes(mKey) : false;
    });
  }, [orders, mesesSelecionados]);

  const monthOrdersWithMetrics = useMemo(() => monthFilteredOrders.map((order) => ({ order, metrics: calculateFinancialMetrics(order) })), [monthFilteredOrders]);

  const totalPedidos = monthFilteredOrders.length;
  const totalVendaBruta = useMemo(() => monthFilteredOrders.reduce((acc, o) => acc + o.saleValue, 0), [monthFilteredOrders]);
  const ticketMedio = totalPedidos > 0 ? totalVendaBruta / totalPedidos : 0;
  
  const totalCustoProducao = useMemo(() => monthFilteredOrders.reduce((acc, o) => acc + (o.productionCost || 0), 0), [monthFilteredOrders]);
  const totalFreteCotado = useMemo(() => monthFilteredOrders.reduce((acc, o) => acc + (o.shippingPaid || 0), 0), [monthFilteredOrders]);
  const totalFreteCobrado = useMemo(() => monthFilteredOrders.reduce((acc, o) => acc + (o.shippingCharged || 0), 0), [monthFilteredOrders]);
  
  const totalTaxasGateway = useMemo(() => {
    return monthOrdersWithMetrics.reduce((acc, { metrics }) => {
      const fee = metrics.netProductSale * (1 - metrics.discountFactor);
      return acc + Math.max(0, fee);
    }, 0);
  }, [monthOrdersWithMetrics]);

  const totalCustosOperacionais = totalCustoProducao + totalFreteCotado + totalTaxasGateway;
  const totalDescontos = useMemo(() => monthOrdersWithMetrics.reduce((acc, { metrics }) => acc + metrics.discount, 0), [monthOrdersWithMetrics]);
  const sobraFrete = totalFreteCobrado - totalFreteCotado;
  
  const lucroBrutoMargem = useMemo(() => monthOrdersWithMetrics.reduce((acc, { metrics }) => acc + metrics.netProfit, 0), [monthOrdersWithMetrics]);
  const margemLucroBruto = totalVendaBruta > 0 ? (lucroBrutoMargem / totalVendaBruta) * 100 : 0;

  const pedidosCancelados = useMemo(() => monthFilteredOrders.filter((o) => o.status === 'cancelado').length, [monthFilteredOrders]);
  const valoresDevolvidos = useMemo(() => monthFilteredOrders.filter((o) => o.estornado === true).reduce((acc, o) => acc + (o.saleValue || 0), 0), [monthFilteredOrders]);
  const pedidosEstornadosCount = useMemo(() => monthFilteredOrders.filter((o) => o.estornado === true || o.status === 'cancelado_estornado').length, [monthFilteredOrders]);

  const monthFilteredExpenses = useMemo(() => {
    if (!expenses || expenses.length === 0) return [];
    return expenses.filter((e) => {
      const mKey = extractMonthYear(e.date);
      return mKey ? mesesSelecionados.includes(mKey) : false;
    });
  }, [expenses, mesesSelecionados]);

  const totalDespesasFixas = useMemo(() => monthFilteredExpenses.filter((e) => e.categoryGroup === 'Custos Fixos').reduce((acc, e) => acc + e.amount, 0), [monthFilteredExpenses]);
  const totalDespesasVariaveis = useMemo(() => monthFilteredExpenses.filter((e) => e.categoryGroup === 'Custos Variáveis').reduce((acc, e) => acc + e.amount, 0), [monthFilteredExpenses]);
  const totalDespesasGerais = totalDespesasFixas + totalDespesasVariaveis;

  const lucroLiquidoReal = useMemo(() => lucroBrutoMargem - totalDespesasGerais, [lucroBrutoMargem, totalDespesasGerais]);
  const totalLucroReal = lucroBrutoMargem;

  const activeGranularity = useMemo(() => {
    if (chartMode === 'auto') return mesesSelecionados.length <= 1 ? 'day' : 'month';
    return chartMode;
  }, [chartMode, mesesSelecionados]);

  const chartData = useMemo(() => {
    if (monthFilteredOrders.length === 0) return [];

    if (activeGranularity === 'day') {
      const dayMap = new Map<string, any>();
      for (const item of monthOrdersWithMetrics) {
        const { order, metrics } = item;
        const formatted = formatDate(order.createdAt);
        const parts = formatted.split('/');
        const day = parts[0] ? parts[0].padStart(2, '0') : '01';
        const month = parts[1] ? parts[1].padStart(2, '0') : '01';
        const year = parts[2] ? (parts[2].length === 2 ? `20${parts[2]}` : parts[2]) : '2026';
        const dateKey = `${year}-${month}-${day}`;
        const label = `${day}/${month}`;
        const timestamp = new Date(Number(year), Number(month) - 1, Number(day)).getTime();

        const cur = dayMap.get(dateKey) || { dateKey, label, vendaBruta: 0, lucroLiquido: 0, pedidos: 0, timestamp: isNaN(timestamp) ? 0 : timestamp };
        cur.vendaBruta += metrics.saleValue;
        cur.lucroLiquido += metrics.netProfit;
        cur.pedidos += 1;
        dayMap.set(dateKey, cur);
      }
      return Array.from(dayMap.values()).sort((a, b) => a.timestamp - b.timestamp);
    } else {
      const monthMap = new Map<string, any>();
      const sortedMonths = [...mesesSelecionados].sort((a, b) => a.localeCompare(b));
      for (const mKey of sortedMonths) {
        monthMap.set(mKey, { dateKey: mKey, label: formatMonthYearLabel(mKey, 'short'), vendaBruta: 0, lucroLiquido: 0, pedidos: 0 });
      }

      for (const item of monthOrdersWithMetrics) {
        const { order, metrics } = item;
        const mKey = extractMonthYear(order.createdAt);
        if (!mKey) continue;
        const cur = monthMap.get(mKey) || { dateKey: mKey, label: formatMonthYearLabel(mKey, 'short'), vendaBruta: 0, lucroLiquido: 0, pedidos: 0 };
        cur.vendaBruta += metrics.saleValue;
        cur.lucroLiquido += metrics.netProfit;
        cur.pedidos += 1;
        monthMap.set(mKey, cur);
      }
      return Array.from(monthMap.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    }
  }, [monthOrdersWithMetrics, monthFilteredOrders, activeGranularity, mesesSelecionados]);

  const tableFilteredOrders = useMemo(() => {
    return monthOrdersWithMetrics
      .filter(({ order }) => paymentFilter === 'all' || order.paymentMethod === paymentFilter)
      .sort((a, b) => {
        if (sortBy === 'profit_desc') return b.metrics.netProfit - a.metrics.netProfit;
        if (sortBy === 'profit_asc') return a.metrics.netProfit - b.metrics.netProfit;
        if (sortBy === 'margin_desc') return b.metrics.marginPercent - a.metrics.marginPercent;
        if (sortBy === 'value_desc') return b.metrics.saleValue - a.metrics.saleValue;
        return 0;
      });
  }, [monthOrdersWithMetrics, paymentFilter, sortBy]);

  const tableTotalVenda = tableFilteredOrders.reduce((acc, item) => acc + item.metrics.saleValue, 0);
  const tableTotalCustoProd = tableFilteredOrders.reduce((acc, item) => acc + item.metrics.productionCost, 0);
  const tableTotalFreteSurplus = tableFilteredOrders.reduce((acc, item) => acc + item.metrics.shippingSurplus, 0);
  const tableTotalLucro = tableFilteredOrders.reduce((acc, item) => acc + item.metrics.netProfit, 0);
  const tableMargem = tableTotalVenda > 0 ? (tableTotalLucro / tableTotalVenda) * 100 : 0;

  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0]?.payload;
      const margemPonto = point.vendaBruta > 0 ? (point.lucroLiquido / point.vendaBruta) * 100 : 0;

      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-700 shadow-xl text-xs space-y-1.5 min-w-[190px]">
          <div className="font-bold text-amber-400 border-b border-slate-700 pb-1 flex items-center justify-between">
            <span>{label}</span>
            <span className="text-[10px] text-slate-400 font-mono">{point.pedidos} pedido(s)</span>
          </div>
          <div className="flex items-center justify-between gap-3 pt-0.5">
            <span className="text-slate-300 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block shrink-0" />
              Venda Bruta:
            </span>
            <span className="font-mono font-bold text-white">{formatBRL(point.vendaBruta)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-300 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block shrink-0" />
              Lucro Líquido:
            </span>
            <span className="font-mono font-bold text-emerald-400">{formatBRL(point.lucroLiquido)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800 text-[10px] text-slate-400">
            <span>Margem Real:</span>
            <span className="font-mono font-semibold text-emerald-300">{formatPercent(margemPonto)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderDetailModal = () => {
    if (!activeDetailCard) return null;

    let title = '';
    let icon = null;
    let content = null;
    let totalMain = '';
    let totalLabel = '';
    let colorClass = '';

    if (activeDetailCard === 'venda') {
      title = 'Resumo da Venda Bruta';
      icon = <DollarSign className="w-5 h-5" />;
      colorClass = 'text-amber-700 bg-amber-50 border-amber-200';
      totalMain = formatBRL(totalVendaBruta);
      totalLabel = `Receita bruta baseada em ${totalPedidos} pedidos`;
      
      const subtotalItens = monthFilteredOrders.reduce((acc, o) => acc + (o.subtotal || o.saleValue), 0);

      content = (
        <div className="space-y-3 font-mono text-xs">
          <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
            <span className="text-slate-500 font-sans">Subtotal Venda de Produtos</span>
            <span className="text-slate-700 font-medium">+{formatBRL(subtotalItens)}</span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
            <span className="text-slate-500 font-sans">Fretes Cobrados do Cliente</span>
            <span className="text-slate-700 font-medium">+{formatBRL(totalFreteCobrado)}</span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
            <span className="text-slate-500 font-sans">Descontos Concedidos</span>
            <span className="text-rose-600 font-medium">-{formatBRL(totalDescontos)}</span>
          </div>
        </div>
      );
    } else if (activeDetailCard === 'custos') {
      title = 'Memória de Custos Operacionais';
      icon = <Package className="w-5 h-5" />;
      colorClass = 'text-rose-700 bg-rose-50 border-rose-200';
      totalMain = formatBRL(totalCustosOperacionais);
      totalLabel = 'Gasto direto com a produção e despacho das vendas';

      content = (
        <div className="space-y-3 font-mono text-xs">
          <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
            <span className="text-slate-500 font-sans">Custo de Produção das Peças</span>
            <span className="text-rose-600 font-medium">{formatBRL(totalCustoProducao)}</span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
            <span className="text-slate-500 font-sans">Frete Pago à Transportadora</span>
            <span className="text-rose-600 font-medium">{formatBRL(totalFreteCotado)}</span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
            <span className="text-slate-500 font-sans flex items-center gap-1.5">
              Taxas de Gateway <CreditCard className="w-3.5 h-3.5" />
            </span>
            <span className="text-rose-600 font-medium">{formatBRL(totalTaxasGateway)}</span>
          </div>
        </div>
      );
    } else if (activeDetailCard === 'lucroBruto') {
      title = 'Resumo de Lucro Bruto e Margem';
      icon = <Sparkles className="w-5 h-5" />;
      colorClass = 'text-emerald-800 bg-emerald-50 border-emerald-200';
      totalMain = formatBRL(lucroBrutoMargem);
      totalLabel = 'Lucro retido antes de subtrair as despesas do ateliê';

      content = (
        <div className="space-y-3 font-mono text-xs">
          <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
            <span className="text-slate-500 font-sans">Venda Bruta (Total Pago pelo Cliente)</span>
            <span className="text-slate-700 font-medium">+{formatBRL(totalVendaBruta)}</span>
          </div>
          {totalDescontos > 0 && (
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-sans">Descontos Concedidos</span>
              <span className="text-rose-600 font-medium">-{formatBRL(totalDescontos)}</span>
            </div>
          )}
          <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
            <span className="text-slate-500 font-sans">Taxas de Gateway (Operadora)</span>
            <span className="text-rose-600 font-medium">-{formatBRL(totalTaxasGateway)}</span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
            <span className="text-slate-500 font-sans">Custo Total de Produção</span>
            <span className="text-rose-600 font-medium">-{formatBRL(totalCustoProducao)}</span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
            <span className="text-slate-500 font-sans">Custo do Frete Pago</span>
            <span className="text-rose-600 font-medium">-{formatBRL(totalFreteCotado)}</span>
          </div>
        </div>
      );
    } else if (activeDetailCard === 'frete') {
      title = 'Análise do Resultado de Frete';
      icon = <Truck className="w-5 h-5" />;
      colorClass = sobraFrete >= 0 ? 'text-emerald-800 bg-emerald-50 border-emerald-200' : 'text-rose-800 bg-rose-50 border-rose-200';
      totalMain = sobraFrete >= 0 ? `+${formatBRL(sobraFrete)}` : `-${formatBRL(Math.abs(sobraFrete))}`;
      totalLabel = sobraFrete >= 0 ? 'Superávit líquido (Recebido > Pago)' : 'Prejuízo absorvido (Pago > Recebido)';

      content = (
        <div className="space-y-3 font-mono text-xs">
          <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
            <span className="text-slate-500 font-sans flex items-center gap-1.5">
              <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />
              Fretes Cobrados do Cliente
            </span>
            <span className="text-slate-700 font-medium">{formatBRL(totalFreteCobrado)}</span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
            <span className="text-slate-500 font-sans flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
              Custo Efetivo na Transportadora
            </span>
            <span className="text-rose-600 font-medium">-{formatBRL(totalFreteCotado)}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg text-[11px] text-slate-500 font-sans leading-relaxed border border-slate-200 mt-2">
            A sobra de frete é injetada diretamente na composição da Margem de Contribuição e do Lucro Líquido Real.
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full animate-in fade-in duration-150">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${colorClass}`}>
                {icon}
              </div>
              <h3 className="font-bold text-sm text-slate-800">{title}</h3>
            </div>
            <button
              onClick={() => setActiveDetailCard(null)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-5">
            <div className="mb-5 pb-4 border-b border-slate-100">
              <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">{totalMain}</div>
              <p className="text-[11px] text-slate-500 mt-1">{totalLabel}</p>
            </div>
            
            {content}
          </div>
          
          <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => setActiveDetailCard(null)}
              className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 relative">
      {/* 1. SEÇÃO DE FILTRO DE MESES */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-700 shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Filtro de Período Financeiro
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 font-semibold">
                  {mesesSelecionados.length} {mesesSelecionados.length === 1 ? 'mês ativo' : 'meses ativos'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Selecione o mês desejado ou marque múltiplos meses. Todo o dashboard abaixo recalcula com base apenas no período selecionado.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={handleSelectCurrentMonth}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isOnlyCurrentMonthSelected ? 'bg-amber-500 text-slate-950 shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              Mês Atual ({formatMonthYearLabel(currentMonthKey, 'short')})
            </button>
            <button
              type="button"
              onClick={handleSelectLast3Months}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isLast3MonthsSelected ? 'bg-amber-500 text-slate-950 shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              Últimos 3 Meses
            </button>
            <button
              type="button"
              onClick={handleSelectAllMonths}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isAllMonthsSelected ? 'bg-amber-500 text-slate-950 shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              Todos os Meses
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {availableMonthKeys.map((mKey) => {
            const isSelected = mesesSelecionados.includes(mKey);
            const isCurrent = mKey === currentMonthKey;
            const ordersInMonth = orders.filter((o) => extractMonthYear(o.createdAt) === mKey).length;

            return (
              <button
                key={mKey}
                type="button"
                onClick={() => handleToggleMonth(mKey)}
                className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'bg-slate-900 border-slate-900 text-white shadow-xs ring-2 ring-amber-400/40'
                    : 'bg-slate-50 hover:bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
                title={`Clique para ${isSelected ? 'remover' : 'adicionar'} ${formatMonthYearLabel(mKey, 'full')}`}
              >
                {isSelected ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border border-slate-300 group-hover:border-slate-400 shrink-0" />
                )}
                <span>{formatMonthYearLabel(mKey, 'full')}</span>
                {isCurrent && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${isSelected ? 'bg-amber-400 text-slate-950' : 'bg-amber-100 text-amber-800'}`}>
                    Atual
                  </span>
                )}
                <span className={`text-[11px] font-mono px-1.5 py-0.2 rounded ${isSelected ? 'bg-slate-800 text-slate-300' : 'bg-slate-200/70 text-slate-600'}`}>
                  {ordersInMonth}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. CARDS DE RESUMO FINANCEIRO (CLICÁVEIS PARA DETALHAMENTO DE MEMÓRIA) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Card 1: Venda Bruta */}
        <div 
          onClick={() => setActiveDetailCard('venda')}
          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-2 cursor-pointer hover:border-amber-400 hover:shadow-md transition-all group min-w-0"
        >
          <div className="flex items-start justify-between text-xs text-slate-500 gap-1">
            <span className="font-semibold text-slate-700 whitespace-normal break-words" title="Venda Bruta">Venda Bruta</span>
            <div className="flex items-center gap-1.5">
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Resumo</span>
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0 group-hover:bg-amber-100 transition-colors">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="min-w-0">
            <div 
              className="text-lg sm:text-xl font-bold font-mono text-slate-900 tracking-tight tabular-nums whitespace-normal break-words"
              title={formatBRL(totalVendaBruta)}
            >
              {formatBRL(totalVendaBruta)}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 whitespace-normal break-words" title={`Total cobrado (${totalPedidos} pedidos)`}>
              Total cobrado ({totalPedidos} ped.)
            </p>
          </div>
        </div>

        {/* Card 2: Ticket Médio */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-2 min-w-0">
          <div className="flex items-start justify-between text-xs text-slate-500 gap-1">
            <span className="font-semibold text-slate-700 whitespace-normal break-words" title="Ticket Médio">Ticket Médio</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-700 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="min-w-0">
            <div 
              className="text-lg sm:text-xl font-bold font-mono text-slate-900 tracking-tight tabular-nums whitespace-normal break-words"
              title={formatBRL(ticketMedio)}
            >
              {formatBRL(ticketMedio)}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 whitespace-normal break-words">
              Média por pedido
            </p>
          </div>
        </div>

        {/* Card 3: Custos Operacionais */}
        <div 
          onClick={() => setActiveDetailCard('custos')}
          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-2 cursor-pointer hover:border-rose-300 hover:shadow-md transition-all group min-w-0"
        >
          <div className="flex items-start justify-between text-xs text-slate-500 gap-1">
            <span className="font-semibold text-slate-700 whitespace-normal break-words" title="Custos Operacionais">Custos Oper.</span>
            <div className="flex items-center gap-1.5">
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-medium text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">Ver Conta</span>
              <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-700 flex items-center justify-center shrink-0 group-hover:bg-rose-100 transition-colors">
                <Package className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="min-w-0">
            <div 
              className="text-lg sm:text-xl font-bold font-mono text-rose-700 tracking-tight tabular-nums whitespace-normal break-words"
              title={formatBRL(totalCustosOperacionais)}
            >
              {formatBRL(totalCustosOperacionais)}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed whitespace-normal break-words" title={`Prod: ${formatBRL(totalCustoProducao)} · Frete: ${formatBRL(totalFreteCotado)} · Taxas: ${formatBRL(totalTaxasGateway)}`}>
              Prod: <span className="font-mono text-slate-700">{formatBRL(totalCustoProducao)}</span>
            </p>
          </div>
        </div>

        {/* Card 4: Total de Despesas */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-2 min-w-0">
          <div className="flex items-start justify-between text-xs text-slate-500 gap-1">
            <span className="font-semibold text-slate-700 whitespace-normal break-words" title="Total de Despesas">Total Despesas</span>
            <div className="w-7 h-7 rounded-lg bg-orange-500/10 text-orange-700 flex items-center justify-center shrink-0">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="min-w-0">
            <div 
              className="text-lg sm:text-xl font-bold font-mono text-orange-700 tracking-tight tabular-nums whitespace-normal break-words"
              title={formatBRL(totalDespesasGerais)}
            >
              {formatBRL(totalDespesasGerais)}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 whitespace-normal break-words">
              Fixas e Variáveis
            </p>
          </div>
        </div>

        {/* Card 5: Descontos Concedidos */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-2 min-w-0">
          <div className="flex items-start justify-between text-xs text-slate-500 gap-1">
            <span className="font-semibold text-slate-700 whitespace-normal break-words" title="Descontos Concedidos">Descontos</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="min-w-0">
            <div 
              className="text-lg sm:text-xl font-bold font-mono text-amber-800 tracking-tight tabular-nums whitespace-normal break-words"
              title={formatBRL(totalDescontos)}
            >
              {formatBRL(totalDescontos)}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 whitespace-normal break-words">
              Cupons concedidos
            </p>
          </div>
        </div>

        {/* Card 6: Resultado do Frete (Sobra) */}
        <div 
          onClick={() => setActiveDetailCard('frete')}
          className={`p-3.5 sm:p-4 rounded-2xl border shadow-xs flex flex-col justify-between space-y-2 cursor-pointer transition-all group min-w-0 ${
            sobraFrete >= 0 
              ? 'bg-emerald-50/70 border-emerald-200 hover:border-emerald-400 hover:shadow-md' 
              : 'bg-rose-50/70 border-rose-200 hover:border-rose-400 hover:shadow-md'
          }`}
        >
          <div className="flex items-start justify-between text-xs gap-1">
            <span className={`font-semibold whitespace-normal break-words ${sobraFrete >= 0 ? 'text-emerald-900' : 'text-rose-900'}`} title="Resultado do Frete">
              Resultado Frete
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-medium px-1.5 py-0.5 rounded ${sobraFrete >= 0 ? 'text-emerald-700 bg-emerald-100' : 'text-rose-700 bg-rose-100'}`}>
                Análise
              </span>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                sobraFrete >= 0 ? 'bg-emerald-200/60 text-emerald-800 group-hover:bg-emerald-300/60' : 'bg-rose-200/60 text-rose-800 group-hover:bg-rose-300/60'
              }`}>
                <Truck className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="min-w-0">
            <div 
              className={`text-lg sm:text-xl font-bold font-mono tracking-tight tabular-nums whitespace-normal break-words ${
                sobraFrete >= 0 ? 'text-emerald-800' : 'text-rose-700'
              }`}
              title={sobraFrete >= 0 ? `+${formatBRL(sobraFrete)}` : `-${formatBRL(Math.abs(sobraFrete))}`}
            >
              {sobraFrete >= 0 ? `+${formatBRL(sobraFrete)}` : `-${formatBRL(Math.abs(sobraFrete))}`}
            </div>
            <p className={`text-[11px] mt-0.5 whitespace-normal break-words ${sobraFrete >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {sobraFrete >= 0 ? 'Superávit líquido' : 'Absorvido'}
            </p>
          </div>
        </div>

        {/* Card 7: Lucro Bruto (Margem) */}
        <div 
          onClick={() => setActiveDetailCard('lucroBruto')}
          className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white p-3.5 sm:p-4 rounded-2xl border border-emerald-700 shadow-sm flex flex-col justify-between space-y-2 cursor-pointer hover:border-emerald-400 hover:shadow-lg transition-all group min-w-0"
        >
          <div className="flex items-start justify-between text-xs gap-1">
            <span className="font-semibold text-emerald-300 flex items-center gap-1 whitespace-normal break-words" title="Lucro Bruto">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="whitespace-normal break-words">Lucro Bruto</span>
            </span>
            <div className="flex items-center gap-1.5">
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-medium text-emerald-100 bg-emerald-800 px-1.5 py-0.5 rounded">Resumo DRE</span>
              <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shrink-0 group-hover:bg-emerald-400/30 transition-colors">
                {formatPercent(margemLucroBruto)}
              </span>
            </div>
          </div>
          <div className="min-w-0">
            <div 
              className="text-lg sm:text-xl font-bold font-mono text-emerald-300 tracking-tight tabular-nums whitespace-normal break-words"
              title={formatBRL(lucroBrutoMargem)}
            >
              {formatBRL(lucroBrutoMargem)}
            </div>
            <p className="text-[11px] text-emerald-200/80 mt-0.5 whitespace-normal break-words">
              Margem contribuição
            </p>
          </div>
        </div>

        {/* Card 8: Valores Devolvidos (Estorno) */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-amber-200/90 shadow-xs flex flex-col justify-between space-y-2 hover:border-amber-400 transition-colors min-w-0">
          <div className="flex items-start justify-between text-xs text-amber-800 gap-1">
            <span className="font-semibold text-amber-900 whitespace-normal break-words" title="Valores Devolvidos">Devolvidos</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/80 shrink-0">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="min-w-0">
            <div 
              className="text-lg sm:text-xl font-bold font-mono text-amber-900 tracking-tight tabular-nums whitespace-normal break-words"
              title={formatBRL(valoresDevolvidos)}
            >
              {formatBRL(valoresDevolvidos)}
            </div>
            <p className="text-[11px] text-amber-700 mt-0.5 whitespace-normal break-words" title={`${pedidosEstornadosCount} estorno(s)`}>
              {pedidosEstornadosCount} {pedidosEstornadosCount === 1 ? 'estorno' : 'estornos'}
            </p>
          </div>
        </div>
      </div>

      {/* BANNER DRE: INTEGRAÇÃO COM MÓDULO DE DESPESAS */}
      <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs uppercase tracking-wider text-amber-400">
                DRE Consolidado com Despesas Operacionais
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {monthFilteredExpenses.length} saídas no período
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 whitespace-normal break-words">
              Lucro Líquido = Venda Bruta (-) Custos Operacionais (-) Descontos (-) Despesas Totais.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          <div className="bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] block font-sans">Custos Fixos:</span>
            <span className="font-bold text-indigo-400">{formatBRL(totalDespesasFixas)}</span>
          </div>

          <div className="bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] block font-sans">Custos Variáveis:</span>
            <span className="font-bold text-amber-400">{formatBRL(totalDespesasVariaveis)}</span>
          </div>

          <div className="bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] block font-sans">Total Despesas:</span>
            <span className="font-bold text-rose-400">-{formatBRL(totalDespesasGerais)}</span>
          </div>

          <div className={`px-3.5 py-1.5 rounded-xl border transition-colors ${
            lucroLiquidoReal >= 0 ? 'bg-emerald-950/70 border-emerald-700/80' : 'bg-rose-950/70 border-rose-700/80'
          }`}>
            <span className={`text-[10px] block font-sans font-semibold uppercase tracking-wider ${
              lucroLiquidoReal >= 0 ? 'text-emerald-300' : 'text-rose-300'
            }`}>
              LUCRO LÍQUIDO REAL:
            </span>
            <span className={`font-bold text-sm ${lucroLiquidoReal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatBRL(lucroLiquidoReal)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. GRÁFICO DE EVOLUÇÃO */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-600" />
              <h3 className="font-bold text-sm text-slate-900">
                Evolução Temporal: Venda Bruta vs. Lucro Líquido Real
              </h3>
            </div>
            <p className="text-xs text-slate-500 whitespace-normal break-words">
              Comparativo das vendas totais contra o lucro operacional líquido real no período filtrado.
            </p>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setChartMode('day')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeGranularity === 'day' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Visão Diária
            </button>
            <button
              type="button"
              onClick={() => setChartMode('month')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeGranularity === 'month' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Visão Mensal
            </button>
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <BarChart3 className="w-8 h-8 mb-2 text-slate-300" />
            <p className="text-xs font-semibold text-slate-700">Nenhum pedido no período selecionado</p>
            <p className="text-[11px] text-slate-400 mt-0.5 whitespace-normal break-words">
              Selecione outros meses nos filtros acima para visualizar o gráfico.
            </p>
          </div>
        ) : (
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tickLine={false} stroke="#94a3b8" fontSize={11} dy={6} />
                <YAxis tickLine={false} stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `R$ ${val}`} />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend verticalAlign="top" align="right" height={32} iconType="circle" formatter={(value) => <span className="text-xs text-slate-700 font-medium">{value}</span>} />
                <Bar dataKey="vendaBruta" name="Venda Bruta (Faturamento)" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={36} />
                <Line type="monotone" dataKey="lucroLiquido" name="Lucro Líquido Real" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }} activeDot={{ r: 6, fill: '#059669' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-amber-500 inline-block" />
              <span>Venda Total: <strong className="text-slate-900 font-mono">{formatBRL(totalVendaBruta)}</strong></span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
              <span>Lucro Total: <strong className="text-emerald-700 font-mono">{formatBRL(totalLucroReal)}</strong></span>
            </span>
          </div>
          <div className="text-[11px] text-slate-400 whitespace-normal break-words">
            Fórmula de Lucro: (Subtotal - Desconto - Custo Produção) + (Frete Cobrado - Frete Cotado)
          </div>
        </div>
      </div>

      {/* 4. LISTA DETALHADA DE PEDIDOS */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900">
              Demonstrativo Detalhado por Pedido
            </span>
            <span className="text-xs text-slate-500">
              ({tableFilteredOrders.length} {tableFilteredOrders.length === 1 ? 'pedido' : 'pedidos'} no período)
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-slate-50 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
            >
              <option value="all">Todas as Formas de Pagto</option>
              <option value="pix">Apenas Pix (Fator 1.0)</option>
              <option value="credito_1x">Crédito 1x</option>
              <option value="credito_2x">Crédito 2x</option>
              <option value="credito_3x">Crédito 3x</option>
              <option value="boleto">Boleto Bancário</option>
              <option value="transferencia">Transferência</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-slate-50 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
            >
              <option value="profit_desc">Maior Lucro Líquido</option>
              <option value="profit_asc">Menor Lucro Líquido</option>
              <option value="margin_desc">Maior Margem (%)</option>
              <option value="value_desc">Maior Valor de Venda</option>
            </select>

            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold shadow-2xs transition-colors cursor-pointer shrink-0"
              title="Exportar demonstrativo financeiro em CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Exportar</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Pedido / Data</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4 text-right">Subtotal Itens</th>
                <th className="py-3 px-4 text-right">Desconto</th>
                <th className="py-3 px-4 text-right">Total Pago</th>
                <th className="py-3 px-4 text-center">Pagamento</th>
                <th className="py-3 px-4 text-right">Custo Produção</th>
                <th className="py-3 px-4 text-right">Sobra do Frete</th>
                <th className="py-3 px-4 text-right">Lucro Líquido Real</th>
                <th className="py-3 px-4 text-center">Margem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {tableFilteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <BarChart3 className="w-8 h-8 text-slate-300 mx-auto mb-2 stroke-[1.5]" />
                    <p className="font-semibold text-slate-700">Nenhum pedido encontrado para o período</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      O DRE e a rentabilidade por pedido serão demonstrados automaticamente assim que houver pedidos registrados.
                    </p>
                  </td>
                </tr>
              ) : (
                tableFilteredOrders.map(({ order, metrics }) => {
                  const isPositiveProfit = metrics.netProfit > 0;
                  const isHighMargin = metrics.marginPercent >= 50;

                  return (
                    <tr
                      key={order.id}
                      onClick={() => onSelectOrder(order)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-mono whitespace-nowrap">
                        <div className="font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                          {order.id}
                        </div>
                        <div className="text-[10px] text-slate-400 font-sans">
                          {formatDate(order.createdAt)}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-900 truncate max-w-[140px]">
                          {order.clientName}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {order.clientCity}/{order.clientState}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                        {formatBRL(metrics.subtotal)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-amber-800 tabular-nums whitespace-nowrap">
                        {metrics.discount > 0 ? (
                          <span>-{formatBRL(metrics.discount)}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums whitespace-nowrap">
                        {formatBRL(metrics.saleValue)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                        {formatBRL(metrics.productionCost)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                        {metrics.shippingSurplus > 0 ? (
                          <div className="text-emerald-700">
                            <span className="font-semibold">+{formatBRL(metrics.shippingSurplus)}</span>
                            <span className="block text-[9px] text-emerald-600">
                              (Cob {formatBRL(metrics.shippingCharged)} / Cot {formatBRL(metrics.shippingPaid)})
                            </span>
                          </div>
                        ) : metrics.shippingSurplus < 0 ? (
                          <div className="text-rose-700">
                            <span className="font-semibold">{formatBRL(metrics.shippingSurplus)}</span>
                            <span className="block text-[9px] text-rose-600">
                              (Absorvido pelo ateliê)
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">R$ 0,00</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold tabular-nums whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded ${
                          isPositiveProfit ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}>
                          {formatBRL(metrics.netProfit)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold tabular-nums whitespace-nowrap">
                        <span className={`text-xs ${isHighMargin ? 'text-emerald-700 font-bold' : 'text-slate-700'}`}>
                          {formatPercent(metrics.marginPercent)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {tableFilteredOrders.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 font-bold border-t-2 border-slate-200 text-xs text-slate-900">
                  <td colSpan={4} className="py-3.5 px-4">
                    TOTAL DO PERÍODO FILTRADO ({tableFilteredOrders.length} pedidos)
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-900">
                    {formatBRL(tableTotalVenda)}
                  </td>
                  <td className="py-3.5 px-4 text-center text-slate-400 font-normal">
                    —
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-800">
                    {formatBRL(tableTotalCustoProd)}
                  </td>
                  <td className={`py-3.5 px-4 text-right font-mono tabular-nums ${tableTotalFreteSurplus >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {tableTotalFreteSurplus >= 0 ? `+${formatBRL(tableTotalFreteSurplus)}` : formatBRL(tableTotalFreteSurplus)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-emerald-800">
                    {formatBRL(tableTotalLucro)}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono tabular-nums text-emerald-800">
                    {formatPercent(tableMargem)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* RENDERIZAÇÃO DO MODAL EXCLUSIVO (Se Ativo) */}
      {renderDetailModal()}

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-xs font-medium text-slate-100">{toastMessage}</p>
        </div>
      )}
    </div>
  );
};
