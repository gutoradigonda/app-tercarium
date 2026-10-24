import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Hammer, 
  Truck, 
  ArrowUpRight, 
  PackageCheck,
  ChevronRight,
  ExternalLink,
  Wallet,
  CheckCircle2,
  CreditCard,
  Trophy,
  Globe2,
  Sparkles,
  BarChart3,
  Download,
  Package,
  Ban,
  RotateCcw
} from 'lucide-react';
import { 
  Order, 
  Product, 
  Expense,
  STATUS_CONFIG, 
  PAYMENT_LABELS, 
  PAYMENT_FEE_RATES 
} from '../types/erp';
import { calculateFinancialMetrics, formatBRL, formatPercent } from '../utils/formatters';
import { exportToCSV } from '../utils/exportUtils';
import { TabType } from './Sidebar';

interface OverviewViewProps {
  orders: Order[];
  products?: Product[];
  expenses?: Expense[];
  onNavigateTab: (tab: TabType) => void;
  onSelectOrder: (order: Order) => void;
  onOpenNewOrder: () => void;
}

// Dicionário de identificação e região dos Estados Brasileiros
const BRAZIL_STATES: Record<string, { name: string; region: string }> = {
  SP: { name: 'São Paulo', region: 'Sudeste' },
  RJ: { name: 'Rio de Janeiro', region: 'Sudeste' },
  MG: { name: 'Minas Gerais', region: 'Sudeste' },
  ES: { name: 'Espírito Santo', region: 'Sudeste' },
  PR: { name: 'Paraná', region: 'Sul' },
  SC: { name: 'Santa Catarina', region: 'Sul' },
  RS: { name: 'Rio Grande do Sul', region: 'Sul' },
  BA: { name: 'Bahia', region: 'Nordeste' },
  PE: { name: 'Pernambuco', region: 'Nordeste' },
  CE: { name: 'Ceará', region: 'Nordeste' },
  DF: { name: 'Distrito Federal', region: 'Centro-Oeste' },
  GO: { name: 'Goiás', region: 'Centro-Oeste' },
  MT: { name: 'Mato Grosso', region: 'Centro-Oeste' },
  MS: { name: 'Mato Grosso do Sul', region: 'Centro-Oeste' },
  PA: { name: 'Pará', region: 'Norte' },
  AM: { name: 'Amazonas', region: 'Norte' },
  RN: { name: 'Rio Grande do Norte', region: 'Nordeste' },
  PB: { name: 'Paraíba', region: 'Nordeste' },
  AL: { name: 'Alagoas', region: 'Nordeste' },
  SE: { name: 'Sergipe', region: 'Nordeste' },
  PI: { name: 'Piauí', region: 'Nordeste' },
  MA: { name: 'Maranhão', region: 'Nordeste' },
  TO: { name: 'Tocantins', region: 'Norte' },
  RO: { name: 'Rondônia', region: 'Norte' },
  AC: { name: 'Acre', region: 'Norte' },
  AP: { name: 'Amapá', region: 'Norte' },
  RR: { name: 'Roraima', region: 'Norte' },
};

export const OverviewView: React.FC<OverviewViewProps> = ({
  orders,
  products = [],
  expenses = [],
  onNavigateTab,
  onSelectOrder,
  onOpenNewOrder,
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ==========================================
  // 1. CÁLCULOS FINANCEIROS E OPERACIONAIS (NOVO DRE EM CASCATA)
  // ==========================================
  const activeOrders = useMemo(() => {
    return orders.filter((o) => o.status !== 'cancelado' && o.status !== 'cancelado_estornado');
  }, [orders]);

  const metricsList = useMemo(() => activeOrders.map(calculateFinancialMetrics), [activeOrders]);
  
  // 1. Receita Bruta Total (Soma de todas as vendas brutas faturadas de pedidos ativos)
  const faturamentoBruto = useMemo(() => activeOrders.reduce((acc, o) => acc + o.saleValue, 0), [activeOrders]);

  // 2. (-) Taxas de Pagamento / Descontos
  const totalTaxasGateway = useMemo(() => metricsList.reduce((acc, m) => acc + (m.gatewayFee || 0), 0), [metricsList]);
  const totalDescontos = useMemo(() => metricsList.reduce((acc, m) => acc + (m.discount || 0), 0), [metricsList]);
  const totalTaxasEDescontos = totalTaxasGateway + totalDescontos;

  // 3. (-) Saldo de Fretes (Frete Pago - Frete Cobrado)
  const freteCobradoTotal = useMemo(() => activeOrders.reduce((acc, o) => acc + (o.shippingCharged || 0), 0), [activeOrders]);
  const fretePagoTotal = useMemo(() => activeOrders.reduce((acc, o) => acc + (o.shippingPaid || 0), 0), [activeOrders]);
  // Saldo de fretes: se positivo é custo adicional; se negativo é superávit para o ateliê
  const saldoFrete = fretePagoTotal - freteCobradoTotal;
  const sobraFreteReal = freteCobradoTotal - fretePagoTotal;

  // 4. (-) Custo de Insumos & Produção (CPV)
  const totalCustoProducao = useMemo(() => metricsList.reduce((acc, m) => acc + m.productionCost, 0), [metricsList]);
  const totalCustoFrete = useMemo(() => metricsList.reduce((acc, m) => acc + m.shippingCost, 0), [metricsList]);
  const precoLiquidoRecebido = useMemo(() => metricsList.reduce((acc, m) => acc + m.netPrice, 0), [metricsList]);

  // 5. (-) Despesas Operacionais (Soma de todas as despesas lançadas no módulo de Despesas: fixas e variáveis)
  const totalDespesasFixas = useMemo(() => {
    return expenses
      .filter((e) => e.categoryGroup === 'Custos Fixos')
      .reduce((acc, e) => acc + e.amount, 0);
  }, [expenses]);

  const totalDespesasVariaveis = useMemo(() => {
    return expenses
      .filter((e) => e.categoryGroup === 'Custos Variáveis')
      .reduce((acc, e) => acc + e.amount, 0);
  }, [expenses]);

  const totalDespesasOperacionais = totalDespesasFixas + totalDespesasVariaveis;

  // 6. = Lucro Líquido Real (Resultado final da subtração em cascata)
  // Receita Bruta Total - Taxas/Descontos - Saldo Fretes - CPV - Despesas Operacionais
  const lucroLiquidoReal = useMemo(() => {
    return faturamentoBruto - totalTaxasEDescontos - saldoFrete - totalCustoProducao - totalDespesasOperacionais;
  }, [faturamentoBruto, totalTaxasEDescontos, saldoFrete, totalCustoProducao, totalDespesasOperacionais]);

  // Garantia de que o KPI no topo puxe exatamente a nova matemática do DRE
  const lucroLiquidoMensal = lucroLiquidoReal;
  const margemGeral = faturamentoBruto > 0 ? (lucroLiquidoReal / faturamentoBruto) * 100 : 0;
  
  const pedidosEmProducao = useMemo(() => orders.filter((o) => o.status === 'em_producao').length, [orders]);
  const encomendasEmTransito = useMemo(() => orders.filter(
    (o) => o.status === 'despachado' || o.status === 'embalado' || o.status === 'pronto_expedicao'
  ).length, [orders]);
  const pedidosEmAndamento = pedidosEmProducao + encomendasEmTransito;
  const pedidosEntregues = useMemo(() => orders.filter((o) => o.status === 'entregue').length, [orders]);

  // Indicadores de Cancelamento e Estorno
  const pedidosCancelados = useMemo(() => orders.filter((o) => o.status === 'cancelado' || o.status === 'cancelado_estornado').length, [orders]);
  const valoresDevolvidos = useMemo(() => {
    return orders
      .filter((o) => o.status === 'cancelado' || o.status === 'cancelado_estornado')
      .reduce((acc, o) => acc + (o.saleValue || 0), 0);
  }, [orders]);
  const pedidosEstornadosCount = useMemo(() => orders.filter((o) => o.status === 'cancelado_estornado' || (o.status === 'cancelado' && o.estornado === true)).length, [orders]);

  // Total de itens físicos nos pedidos ativos
  const totalItens = useMemo(() => {
    return activeOrders.reduce((acc, o) => {
      if (o.items && o.items.length > 0) {
        return acc + o.items.reduce((sum, it) => sum + (it.quantity || 1), 0);
      }
      return acc + 1;
    }, 0);
  }, [activeOrders]);

  // Ticket médio por item (Faturamento Bruto / Total de Itens)
  const ticketMedioItens = useMemo(() => {
    return totalItens > 0 ? faturamentoBruto / totalItens : 0;
  }, [totalItens, faturamentoBruto]);

  // ==========================================
  // 2. ANDAR 3: RAIO-X DE FORMAS DE PAGAMENTO
  // ==========================================
  const paymentBreakdown = useMemo(() => {
    const totalOrdersCount = orders.length || 1;
    const totalRevenue = faturamentoBruto || 1;

    const methodMap = new Map<string, {
      count: number;
      revenue: number;
      gatewayFees: number;
    }>();

    orders.forEach((order) => {
      const method = order.paymentMethod || 'pix';
      const metrics = calculateFinancialMetrics(order);
      const current = methodMap.get(method) || { count: 0, revenue: 0, gatewayFees: 0 };
      methodMap.set(method, {
        count: current.count + 1,
        revenue: current.revenue + order.saleValue,
        gatewayFees: current.gatewayFees + (metrics.gatewayFee || 0),
      });
    });

    const list = Array.from(methodMap.entries()).map(([method, data]) => {
      const label = PAYMENT_LABELS[method as keyof typeof PAYMENT_LABELS] || method;
      const rate = PAYMENT_FEE_RATES[method as keyof typeof PAYMENT_FEE_RATES] ?? 0;
      const orderShare = (data.count / totalOrdersCount) * 100;
      const revenueShare = (data.revenue / totalRevenue) * 100;

      return {
        method,
        label,
        rate,
        count: data.count,
        revenue: data.revenue,
        gatewayFees: data.gatewayFees,
        orderShare,
        revenueShare,
      };
    });

    return list.sort((a, b) => b.revenue - a.revenue);
  }, [orders, faturamentoBruto]);

  // ==========================================
  // 3. ANDAR 4: RANKING DE VENDAS DE PRODUTOS (COMPLETO)
  // ==========================================
  const productRanking = useMemo(() => {
    const productStats = new Map<string, {
      name: string;
      code: string;
      unitsSold: number;
      revenue: number;
    }>();

    orders.forEach((order) => {
      if (order.items && order.items.length > 0) {
        order.items.forEach((it) => {
          const key = it.code || it.model;
          const current = productStats.get(key) || {
            name: it.model,
            code: it.code || 'ITEM',
            unitsSold: 0,
            revenue: 0,
          };
          current.unitsSold += it.quantity;
          current.revenue += it.totalPrice || (it.unitPrice * it.quantity);
          productStats.set(key, current);
        });
      } else if (order.item) {
        const key = order.item;
        const current = productStats.get(key) || {
          name: order.item,
          code: 'TERCO',
          unitsSold: 0,
          revenue: 0,
        };
        current.unitsSold += 1;
        current.revenue += order.saleValue;
        productStats.set(key, current);
      }
    });

    const totalUnits = Array.from(productStats.values()).reduce((acc, p) => acc + p.unitsSold, 0) || 1;

    const list = Array.from(productStats.values()).map((p) => ({
      ...p,
      sharePercent: (p.unitsSold / totalUnits) * 100,
    }));

    // Retorna todos os produtos vendidos ordenados por volume (peças) e receita gerada
    return list.sort((a, b) => b.unitsSold - a.unitsSold || b.revenue - a.revenue);
  }, [orders]);

  // ==========================================
  // 4. ANDAR 4: DISTRIBUIÇÃO GEOGRÁFICA (ESTADOS)
  // ==========================================
  const geographicDistribution = useMemo(() => {
    const stateMap = new Map<string, { count: number; totalVendas: number }>();

    orders.forEach((order) => {
      const uf = (order.clientState || order.deliveryState || 'SP').trim().toUpperCase();
      const current = stateMap.get(uf) || { count: 0, totalVendas: 0 };
      stateMap.set(uf, {
        count: current.count + 1,
        totalVendas: current.totalVendas + order.saleValue,
      });
    });

    const totalOrdersCount = orders.length || 1;

    const list = Array.from(stateMap.entries()).map(([uf, data]) => {
      const stateInfo = BRAZIL_STATES[uf] || { name: uf, region: 'Brasil' };
      const percentage = (data.count / totalOrdersCount) * 100;
      return {
        uf,
        name: stateInfo.name,
        region: stateInfo.region,
        count: data.count,
        totalVendas: data.totalVendas,
        percentage,
      };
    });

    return list.sort((a, b) => b.count - a.count || b.totalVendas - a.totalVendas);
  }, [orders]);

  // ==========================================
  // 5. ANDAR 4: RANKING LOGÍSTICO DAS OPERAÇÕES
  // ==========================================
  const logisticsRankings = useMemo(() => {
    const carrierMap = new Map<string, { count: number; freightCharged: number; freightPaid: number }>();
    const platformMap = new Map<string, { count: number; freightCharged: number }>();

    orders.forEach((order) => {
      const carrier = (order.carrier || 'Correios PAC').trim();
      const platform = (order.shippingPlatform || 'Melhor Envio').trim();

      const cCurrent = carrierMap.get(carrier) || { count: 0, freightCharged: 0, freightPaid: 0 };
      carrierMap.set(carrier, {
        count: cCurrent.count + 1,
        freightCharged: cCurrent.freightCharged + (order.shippingCharged || 0),
        freightPaid: cCurrent.freightPaid + (order.shippingPaid || 0),
      });

      const pCurrent = platformMap.get(platform) || { count: 0, freightCharged: 0 };
      platformMap.set(platform, {
        count: pCurrent.count + 1,
        freightCharged: pCurrent.freightCharged + (order.shippingCharged || 0),
      });
    });

    const totalOrdersCount = orders.length || 1;

    const carriers = Array.from(carrierMap.entries()).map(([name, data]) => ({
      name,
      count: data.count,
      freightCharged: data.freightCharged,
      freightPaid: data.freightPaid,
      surplus: data.freightCharged - data.freightPaid,
      percentage: (data.count / totalOrdersCount) * 100,
    })).sort((a, b) => b.count - a.count);

    const platforms = Array.from(platformMap.entries()).map(([name, data]) => ({
      name,
      count: data.count,
      freightCharged: data.freightCharged,
      percentage: (data.count / totalOrdersCount) * 100,
    })).sort((a, b) => b.count - a.count);

    return { carriers, platforms };
  }, [orders]);

  const handleExport = (type: 'kpi' | 'dre' = 'kpi') => {
    setToastMessage('Download do relatório em CSV iniciado...');
    setTimeout(() => setToastMessage(null), 3500);

    if (type === 'dre') {
      const headers = ['Linha do DRE (Cascata)', 'Valor (R$)', 'Detalhamento'];
      const rows = [
        ['1. Receita Bruta Total', faturamentoBruto.toFixed(2), `${orders.length} pedidos registrados`],
        ['2. (-) Taxas de Pagamento / Descontos', (-totalTaxasEDescontos).toFixed(2), `Taxas: R$ ${totalTaxasGateway.toFixed(2)} | Descontos: R$ ${totalDescontos.toFixed(2)}`],
        ['3. (-) Saldo de Fretes (Frete Pago - Frete Cobrado)', (-saldoFrete).toFixed(2), saldoFrete <= 0 ? `Superávit (+ R$ ${Math.abs(saldoFrete).toFixed(2)})` : `Absorvido (- R$ ${saldoFrete.toFixed(2)})`],
        ['4. (-) Custo de Insumos & Produção (CPV)', (-totalCustoProducao).toFixed(2), 'Custos diretos de bancada e insumos'],
        ['5. (-) Despesas Operacionais', (-totalDespesasOperacionais).toFixed(2), `Fixas: R$ ${totalDespesasFixas.toFixed(2)} | Variáveis: R$ ${totalDespesasVariaveis.toFixed(2)}`],
        ['6. = Lucro Líquido Real', lucroLiquidoReal.toFixed(2), `Margem Real: ${margemGeral.toFixed(1)}%`]
      ];
      exportToCSV('dre_tercarium_cascata', headers, rows);
    } else {
      const headers = ['Indicador KPI Master', 'Valor', 'Detalhes'];
      const rows = [
        ['Faturamento Bruto (R$)', faturamentoBruto.toFixed(2), `${orders.length} pedidos registrados`],
        ['Lucro Líquido Mensal (R$)', lucroLiquidoReal.toFixed(2), `${margemGeral.toFixed(1)}% de margem real após DRE`],
        ['Pedidos em Andamento', pedidosEmAndamento, `${pedidosEmProducao} produção, ${encomendasEmTransito} trânsito`],
        ['Sobra de Frete Real (R$)', sobraFreteReal.toFixed(2), `Cobrado: ${freteCobradoTotal.toFixed(2)}`]
      ];
      exportToCSV('kpis_master_tercarium', headers, rows);
    }
  };

  return (
    <div className="space-y-7 animate-in fade-in duration-150">
      {/* ======================================================== */}
      {/* ANDAR 1: GRID SUPERIOR - KPIS MASTER (4 CARTÕES)         */}
      {/* ======================================================== */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Indicadores Principais (KPIs Master)
            </h2>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
              Base Consolidada do Ateliê
            </span>
            {/* Botão de Exportação Discreto */}
            <button
              type="button"
              onClick={() => handleExport('kpi')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold shadow-2xs transition-colors cursor-pointer shrink-0"
              title="Exportar indicadores financeiros em CSV compatível com Excel"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Exportar</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* 1. Faturamento Bruto */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between min-h-[105px]">
            <div className="text-xs text-slate-500 font-medium leading-tight min-h-[30px] flex items-center whitespace-normal break-words">
              <span>Faturamento<br />Bruto</span>
            </div>
            <div className="text-xl font-bold font-mono text-slate-950 mt-1 tabular-nums whitespace-normal break-words" title={formatBRL(faturamentoBruto)}>
              {formatBRL(faturamentoBruto)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 whitespace-normal break-words">
              {orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'}
            </div>
          </div>

          {/* 2. Lucro Líquido Mensal */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between min-h-[105px]">
            <div className="text-xs text-slate-500 font-medium leading-tight min-h-[30px] flex items-center whitespace-normal break-words">
              <span>Lucro Líquido<br />Mensal</span>
            </div>
            <div className="text-xl font-bold font-mono text-emerald-800 mt-1 tabular-nums whitespace-normal break-words" title={formatBRL(lucroLiquidoMensal)}>
              {formatBRL(lucroLiquidoMensal)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 whitespace-normal break-words">
              {formatPercent(margemGeral)} margem real
            </div>
          </div>

          {/* 3. Total de Itens (NOVO) */}
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

          {/* 4. Ticket médio Itens (NOVO) */}
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

          {/* 5. Pedidos em Andamento */}
          <div 
            onClick={() => onNavigateTab('logistica')}
            className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between min-h-[105px] cursor-pointer hover:border-amber-400 transition-colors"
            title="Clique para abrir a Logística e Linha de Produção"
          >
            <div className="text-xs text-slate-500 font-medium leading-tight min-h-[30px] flex items-center whitespace-normal break-words">
              <span>Pedidos em<br />Andamento</span>
            </div>
            <div className="text-xl font-bold font-mono text-amber-800 mt-1 tabular-nums whitespace-normal break-words">
              {pedidosEmAndamento}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 whitespace-normal break-words">
              {pedidosEmProducao} prod · {encomendasEmTransito} trâns
            </div>
          </div>

          {/* 6. Sobra Frete Real */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between min-h-[105px]">
            <div className="text-xs text-slate-500 font-medium leading-tight min-h-[30px] flex items-center whitespace-normal break-words">
              <span>Sobra Frete<br />Real</span>
            </div>
            <div className={`text-xl font-bold font-mono mt-1 tabular-nums whitespace-normal break-words ${sobraFreteReal >= 0 ? 'text-emerald-700' : 'text-rose-700'}`} title={sobraFreteReal >= 0 ? `+${formatBRL(sobraFreteReal)}` : `-${formatBRL(Math.abs(sobraFreteReal))}`}>
              {sobraFreteReal >= 0 ? `+${formatBRL(sobraFreteReal)}` : `-${formatBRL(Math.abs(sobraFreteReal))}`}
            </div>
            <div className={`text-[11px] font-medium mt-0.5 whitespace-normal break-words ${sobraFreteReal >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {sobraFreteReal >= 0 ? 'Superávit líquido' : 'Prejuízo absorvido'}
            </div>
          </div>

          {/* 7. Pedidos Cancelados */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between min-h-[105px]">
            <div className="text-xs text-slate-500 font-medium leading-tight min-h-[30px] flex items-center whitespace-normal break-words">
              <span>Pedidos<br />Cancelados</span>
            </div>
            <div className="text-xl font-bold font-mono text-rose-700 mt-1 tabular-nums whitespace-normal break-words">
              {pedidosCancelados}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 whitespace-normal break-words">
              {pedidosCancelados === 1 ? '1 cancelado' : `${pedidosCancelados} cancelados`}
            </div>
          </div>

          {/* 8. Valores Devolvidos */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between min-h-[105px]">
            <div className="text-xs text-slate-500 font-medium leading-tight min-h-[30px] flex items-center whitespace-normal break-words">
              <span>Valores<br />Devolvidos</span>
            </div>
            <div className="text-xl font-bold font-mono text-amber-900 mt-1 tabular-nums whitespace-normal break-words" title={formatBRL(valoresDevolvidos)}>
              {formatBRL(valoresDevolvidos)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 whitespace-normal break-words">
              {pedidosEstornadosCount} {pedidosEstornadosCount === 1 ? 'estorno' : 'estornos'}
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* ANDAR 2: FOCO OPERACIONAL                                 */}
      {/* Fluxo de Produção & Entregas + Tabela de Últimos Pedidos  */}
      {/* ======================================================== */}
      <section className="space-y-4">
        {/* Fluxo Operacional de Produção & Entregas (Funil Colorido) */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Fluxo Operacional de Produção & Entregas
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Progresso dos {orders.length} pedidos registrados em cada etapa do ateliê Terçarium
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('logistica')}
              className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              Gerenciar Logística <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Funil com as 5 Etapas Operacionais */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
            {[
              { 
                key: 'em_producao', 
                label: 'Em Produção', 
                icon: Hammer, 
                color: 'text-amber-700', 
                badgeBg: 'bg-amber-100 text-amber-900',
                bg: 'bg-amber-50/70 hover:bg-amber-100/50 border-amber-200/70', 
                count: pedidosEmProducao 
              },
              { 
                key: 'pronto_expedicao', 
                label: 'Pronto Expedição', 
                icon: PackageCheck, 
                color: 'text-blue-700', 
                badgeBg: 'bg-blue-100 text-blue-900',
                bg: 'bg-blue-50/70 hover:bg-blue-100/50 border-blue-200/70', 
                count: orders.filter(o => o.status === 'pronto_expedicao').length 
              },
              { 
                key: 'embalado', 
                label: 'Embalado', 
                icon: PackageCheck, 
                color: 'text-purple-700', 
                badgeBg: 'bg-purple-100 text-purple-900',
                bg: 'bg-purple-50/70 hover:bg-purple-100/50 border-purple-200/70', 
                count: orders.filter(o => o.status === 'embalado').length 
              },
              { 
                key: 'despachado', 
                label: 'Despachado', 
                icon: Truck, 
                color: 'text-indigo-700', 
                badgeBg: 'bg-indigo-100 text-indigo-900',
                bg: 'bg-indigo-50/70 hover:bg-indigo-100/50 border-indigo-200/70', 
                count: orders.filter(o => o.status === 'despachado').length 
              },
              { 
                key: 'entregue', 
                label: 'Entregue ao Cliente', 
                icon: CheckCircle2, 
                color: 'text-emerald-700', 
                badgeBg: 'bg-emerald-100 text-emerald-900',
                bg: 'bg-emerald-50/70 hover:bg-emerald-100/50 border-emerald-200/70', 
                count: pedidosEntregues 
              },
            ].map((stage) => {
              const Icon = stage.icon;
              return (
                <div
                  key={stage.key}
                  onClick={() => onNavigateTab('logistica')}
                  className={`p-3.5 rounded-xl border ${stage.bg} flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.01]`}
                  title={`Ver pedidos com status ${stage.label}`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className={`w-4 h-4 ${stage.color}`} />
                    <span className={`text-base font-bold font-mono px-2 py-0.5 rounded-lg ${stage.badgeBg}`}>
                      {stage.count}
                    </span>
                  </div>
                  <div className="mt-3 text-xs font-semibold text-slate-800 leading-tight">
                    {stage.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tabela de Últimos Pedidos Movimentados */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Últimos Pedidos Movimentados
              </h3>
              <p className="text-xs text-slate-500">
                Acompanhamento em tempo real das movimentações comerciais
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('pedidos')}
              className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
            >
              Ver todos os pedidos <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Pedido</th>
                  <th className="py-2.5 px-4">Cliente & Item</th>
                  <th className="py-2.5 px-4 text-right">Valor Venda</th>
                  <th className="py-2.5 px-4">Pagamento</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-center">Ficha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <Package className="w-8 h-8 text-slate-300 mx-auto mb-2 stroke-[1.5]" />
                      <p className="font-semibold text-slate-700">Nenhum pedido encontrado</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        O sistema está pronto para testes reais. Registre novos pedidos ou importe via planilha.
                      </p>
                    </td>
                  </tr>
                ) : (
                  orders.slice(0, 5).map((order) => {
                    const status = STATUS_CONFIG[order.status];
                    return (
                      <tr 
                        key={order.id} 
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-semibold text-slate-900 whitespace-nowrap">
                          {order.id}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{order.clientName}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">{order.item}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-medium text-slate-900 tabular-nums whitespace-nowrap">
                          {formatBRL(order.saleValue)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-mono text-[11px] text-slate-700 font-medium">
                            {PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${status.bg} ${status.color} ${status.border}`}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => onSelectOrder(order)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Abrir detalhes completos do pedido"
                          >
                            <ExternalLink className="w-3.5 h-3.5 inline" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* ANDAR 3: FOCO FINANCEIRO - GRID 2 COLUNAS                 */}
      {/* Lado Esquerdo: DRE Detalhado | Lado Direito: Raio-X Pgto */}
      {/* ======================================================== */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Painel Financeiro & Meios de Pagamento
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* LADO ESQUERDO: DRE DETALHADO (COMPOSIÇÃO DO LUCRO REAL) */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 flex-wrap">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  DRE Detalhado (Composição do Lucro Real)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Demonstrativo deduzindo taxas de cartão, custos diretos de fabricação e fretes
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap shrink-0">
                <button
                  type="button"
                  onClick={() => handleExport('dre')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold shadow-2xs transition-colors cursor-pointer shrink-0"
                  title="Exportar demonstrativo DRE em CSV"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Exportar</span>
                </button>
                <button
                  onClick={() => onNavigateTab('financeiro')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-800 transition-colors cursor-pointer py-1.5 shrink-0"
                >
                  <span>Ver DRE Completo</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-2.5 text-xs pt-1">
              {/* 1. Receita Bruta Total */}
              <div className="flex items-center justify-between py-2 border-b border-slate-100 bg-slate-50/80 px-3 rounded-xl">
                <div>
                  <span className="text-slate-800 font-bold block">1. Receita Bruta Total</span>
                  <span className="text-[10px] text-slate-500">Soma de todas as vendas brutas do ateliê ({orders.length} pedidos)</span>
                </div>
                <span className="font-mono font-bold text-slate-950 tabular-nums text-sm">
                  {formatBRL(faturamentoBruto)}
                </span>
              </div>

              {/* 2. (-) Taxas de Pagamento / Descontos */}
              <div className="flex items-center justify-between py-2 border-b border-slate-100 px-3">
                <div>
                  <span className="text-slate-600 block">2. (-) Taxas de Pagamento / Descontos</span>
                  <span className="text-[10px] text-slate-400">
                    Operadoras de gateway ({formatBRL(totalTaxasGateway)}) e cupons concedidos ({formatBRL(totalDescontos)})
                  </span>
                </div>
                <span className="font-mono font-medium text-rose-600 tabular-nums">
                  - {formatBRL(totalTaxasEDescontos)}
                </span>
              </div>

              {/* 3. (-) Saldo de Fretes (Frete Pago - Frete Cobrado) */}
              <div className="flex items-center justify-between py-2 border-b border-slate-100 px-3">
                <div>
                  <span className="text-slate-600 block">3. (-) Saldo de Fretes (Frete Pago - Frete Cobrado)</span>
                  <span className="text-[10px] text-slate-400">
                    Frete Pago às transportadoras: {formatBRL(fretePagoTotal)} · Frete Cobrado: {formatBRL(freteCobradoTotal)}
                  </span>
                </div>
                <span className={`font-mono font-medium tabular-nums ${saldoFrete <= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {saldoFrete <= 0 
                    ? `+ ${formatBRL(Math.abs(saldoFrete))} (Superávit)` 
                    : `- ${formatBRL(saldoFrete)} (Absorvido)`}
                </span>
              </div>

              {/* 4. (-) Custo de Insumos & Produção (CPV) */}
              <div className="flex items-center justify-between py-2 border-b border-slate-100 px-3">
                <div>
                  <span className="text-slate-600 block">4. (-) Custo de Insumos & Produção (CPV)</span>
                  <span className="text-[10px] text-slate-400">
                    Matéria-prima, metais nobres, contas e custo de fabricação artesanal
                  </span>
                </div>
                <span className="font-mono font-medium text-rose-600 tabular-nums">
                  - {formatBRL(totalCustoProducao)}
                </span>
              </div>

              {/* 5. (-) Despesas Operacionais (Fixas e Variáveis do módulo Despesas) */}
              <div className="flex items-center justify-between py-2 border-b border-slate-100 px-3 bg-amber-50/40 rounded-xl border border-amber-200/60">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-800 font-semibold block">5. (-) Despesas Operacionais</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-200 font-semibold">
                      {expenses.length} lançamentos
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Fixas: {formatBRL(totalDespesasFixas)} · Variáveis extras: {formatBRL(totalDespesasVariaveis)}
                  </span>
                </div>
                <span className="font-mono font-bold text-rose-700 tabular-nums">
                  - {formatBRL(totalDespesasOperacionais)}
                </span>
              </div>

              {/* 6. = Lucro Líquido Real (Resultado final da subtração em cascata) */}
              <div className="pt-2 flex items-center justify-between bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 text-white p-3.5 rounded-xl border border-emerald-600/70 shadow-sm">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-emerald-300 block uppercase tracking-wide">
                      = Lucro Líquido Real
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-200/90 font-mono">
                    Margem final: {formatPercent(margemGeral)} sobre o faturamento
                  </span>
                </div>
                <span className="text-xl font-bold font-mono text-emerald-300 tabular-nums">
                  {formatBRL(lucroLiquidoReal)}
                </span>
              </div>
            </div>
          </div>

          {/* LADO DIREITO: RAIO-X DE FORMAS DE PAGAMENTO */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    Raio-X de Pagamentos
                  </h3>
                  <p className="text-xs text-slate-500">
                    Distribuição de vendas por modalidade (Pix, Cartões 1x a 6x) e taxas
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                DRE Atualizado
              </span>
            </div>

            <div className="space-y-2.5 pt-1">
              {paymentBreakdown.length === 0 ? (
                <div className="py-10 flex flex-col items-center justify-center text-center p-4 text-slate-400">
                  <CreditCard className="w-8 h-8 mb-2 text-slate-300 stroke-[1.5]" />
                  <p className="text-xs font-semibold text-slate-700">Nenhum pagamento registrado no momento</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    As formas de pagamento e taxas aparecerão conforme os pedidos forem faturados.
                  </p>
                </div>
              ) : (
                paymentBreakdown.map((item) => (
                  <div
                    key={item.method}
                    className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:bg-white hover:border-slate-300 transition-colors space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{item.label}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                          item.rate === 0 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-amber-100 text-amber-900'
                        }`}>
                          {item.rate === 0 ? '0% taxa' : `${(item.rate * 100).toFixed(2)}%`}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-900">{formatBRL(item.revenue)}</span>
                        <span className="text-[10px] text-slate-500 font-mono ml-1.5">
                          ({item.revenueShare.toFixed(1)}%)
                        </span>
                      </div>
                    </div>

                    {/* Barra de Progresso Dourada/Âmbar */}
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(4, item.revenueShare)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                      <span>{item.count} {item.count === 1 ? 'transação' : 'transações'} ({item.orderShare.toFixed(0)}% dos pedidos)</span>
                      {item.gatewayFees > 0 ? (
                        <span className="font-mono text-rose-600 text-[10px] font-medium">
                          Retenção gateway: -{formatBRL(item.gatewayFees)}
                        </span>
                      ) : (
                        <span className="font-mono text-emerald-700 text-[10px] font-medium">
                          Sem taxa descontada
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* ANDAR 4: FOCO BI/ESTRATÉGICO - GRID 3 COLUNAS             */}
      {/* Top 3 Produtos | Distribuição Geográfica | Ranking Log.  */}
      {/* ======================================================== */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Inteligência Estratégica & Business Intelligence (BI)
            </h2>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Histórico Consolidado
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* BLOCO 1: RANKING DE VENDAS DE PRODUTOS */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs h-[460px] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700">
                  <Trophy className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    Ranking de Vendas de Produtos
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Volume e faturamento ordenados por vendas
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                {productRanking.length} {productRanking.length === 1 ? 'produto' : 'produtos'}
              </span>
            </div>

            {/* Contêiner com rolagem interna para acomodar todos os itens */}
            <div className="flex-1 overflow-y-auto pr-1.5 space-y-2 pt-2">
              {productRanking.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <Package className="w-8 h-8 mb-2 text-slate-300 stroke-[1.5]" />
                  <p className="text-xs font-medium text-slate-500">Nenhum produto vendido registrado</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Os produtos aparecerão aqui conforme os pedidos forem realizados</p>
                </div>
              ) : (
                productRanking.map((prod, idx) => {
                  const isFirst = idx === 0;
                  const isSecond = idx === 1;
                  const isThird = idx === 2;

                  return (
                    <div
                      key={prod.name}
                      className={`p-2.5 rounded-xl border transition-all text-xs ${
                        isFirst
                          ? 'bg-amber-50/70 border-amber-300/80 hover:bg-amber-50'
                          : isSecond
                          ? 'bg-slate-50/90 border-slate-300/80 hover:bg-slate-50'
                          : isThird
                          ? 'bg-amber-50/40 border-amber-200/70 hover:bg-amber-50/60'
                          : 'bg-white border-slate-200/80 hover:bg-slate-50/70 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-6 h-6 rounded-lg font-mono font-bold text-[11px] flex items-center justify-center shrink-0 shadow-2xs ${
                              isFirst
                                ? 'bg-amber-500 text-slate-950 font-black'
                                : isSecond
                                ? 'bg-slate-400 text-white'
                                : isThird
                                ? 'bg-amber-700 text-white'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            #{idx + 1}
                          </span>
                          <div className="min-w-0">
                            <h4
                              className="font-bold text-slate-900 text-xs truncate"
                              title={prod.name}
                            >
                              {prod.name}
                            </h4>
                            <div className="font-mono text-[10px] text-slate-400">
                              Cód: {prod.code}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold font-mono text-slate-950 block">
                            {prod.unitsSold} {prod.unitsSold === 1 ? 'peça' : 'peças'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {prod.sharePercent.toFixed(1)}% do vol.
                          </span>
                        </div>
                      </div>

                      {/* Barra de volume proporcional */}
                      <div className="w-full bg-slate-200/70 h-1 rounded-full overflow-hidden mt-1.5">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isFirst
                              ? 'bg-amber-500'
                              : isSecond
                              ? 'bg-slate-500'
                              : isThird
                              ? 'bg-amber-700'
                              : 'bg-slate-400'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(6, prod.sharePercent))}%` }}
                        />
                      </div>

                      <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-500 text-[11px]">Receita Gerada:</span>
                        <strong className="text-emerald-700 font-bold">{formatBRL(prod.revenue)}</strong>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* BLOCO 2: DISTRIBUIÇÃO GEOGRÁFICA (ESTADOS) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs h-[460px] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700">
                  <Globe2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    Distribuição Geográfica (Estados)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Volume de pedidos por Unidade Federativa
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                {geographicDistribution.length} UFs
              </span>
            </div>

            {/* Contêiner com rolagem interna simétrica */}
            <div className="flex-1 overflow-y-auto pr-1.5 space-y-2 pt-2">
              {geographicDistribution.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <Globe2 className="w-8 h-8 mb-2 text-slate-300 stroke-[1.5]" />
                  <p className="text-xs font-medium text-slate-500">Nenhum estado registrado ainda</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">As UFs aparecerão conforme os pedidos forem realizados</p>
                </div>
              ) : (
                geographicDistribution.map((state) => (
                  <div
                    key={state.uf}
                    className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:bg-white hover:border-amber-300 transition-all flex items-center justify-between gap-2.5 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                        {state.uf}
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-slate-900 truncate flex items-center gap-1">
                          <span>{state.name}</span>
                          <span className="text-[10px] text-slate-400 font-normal">({state.region})</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {formatBRL(state.totalVendas)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 w-24">
                      <div className="flex items-center justify-end gap-1.5 text-[11px]">
                        <span className="font-mono font-bold text-slate-900">
                          {state.count} {state.count === 1 ? 'ped' : 'peds'}
                        </span>
                        <span className="font-mono text-amber-700 font-semibold text-[10px]">
                          {state.percentage.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                        <div
                          className="bg-amber-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(8, state.percentage))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* BLOCO 3: RANKING LOGÍSTICO DAS OPERAÇÕES */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs h-[460px] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    Ranking Logístico das Operações
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Pódio de transportadoras parceiras e canais
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 shrink-0">
                Logística
              </span>
            </div>

            <div className="flex-1 overflow-y-auto pr-1.5 space-y-3 pt-2">
              {logisticsRankings.carriers.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <Truck className="w-8 h-8 mb-2 text-slate-300 stroke-[1.5]" />
                  <p className="text-xs font-semibold text-slate-700">Nenhum envio registrado</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    As transportadoras parceiras e canais aparecerão conforme as encomendas forem criadas.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                      Transportadoras Parceiras (Pódio):
                    </span>
                    <div className="space-y-2">
                      {logisticsRankings.carriers.map((c, idx) => (
                        <div
                          key={c.name}
                          className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:bg-white hover:border-slate-300 transition-colors flex items-center justify-between gap-2.5 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-md bg-slate-900 text-white font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                              #{idx + 1}
                            </span>
                            <div className="truncate">
                              <div className="font-bold text-slate-900 truncate text-xs">{c.name}</div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                {c.count} {c.count === 1 ? 'envio' : 'envios'} ({c.percentage.toFixed(0)}%)
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md ${
                              c.surplus >= 0 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                            }`}>
                              {c.surplus >= 0 ? `+${formatBRL(c.surplus)}` : `-${formatBRL(Math.abs(c.surplus))}`}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Plataformas de Envio */}
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                      Canais de Emissão:
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {logisticsRankings.platforms.map((p) => (
                        <div key={p.name} className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                          <div className="font-bold text-slate-900 text-xs truncate">{p.name}</div>
                          <div className="text-[10px] font-mono text-slate-600 mt-0.5">
                            {p.count} {p.count === 1 ? 'pedido' : 'pedidos'} ({p.percentage.toFixed(0)}%)
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Toast Notification de Exportação */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-200">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <Download className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">{toastMessage}</p>
            <p className="text-[11px] text-slate-400">Exportação do relatório processada com sucesso.</p>
          </div>
        </div>
      )}
    </div>
  );
};
