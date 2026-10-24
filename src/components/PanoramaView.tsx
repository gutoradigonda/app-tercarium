import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Truck, 
  Package, 
  Trophy, 
  CreditCard, 
  MapPin, 
  BarChart3, 
  Sparkles, 
  Layers, 
  Award, 
  CheckCircle2, 
  ArrowUpRight, 
  Globe2, 
  ShoppingBag,
  Percent,
  Wallet,
  Send
} from 'lucide-react';
import { Order, Product, PAYMENT_LABELS, PAYMENT_FEE_RATES } from '../types/erp';
import { calculateFinancialMetrics, formatBRL, formatPercent } from '../utils/formatters';

interface PanoramaViewProps {
  orders: Order[];
  products: Product[];
  onSelectOrder?: (order: Order) => void;
  onNavigateTab?: (tab: string) => void;
}

// Dicionário amigável de nomes dos Estados do Brasil
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

export const PanoramaView: React.FC<PanoramaViewProps> = ({
  orders,
  products,
  onSelectOrder,
  onNavigateTab,
}) => {
  // 1. CARDS FINANCEIROS MASTER
  const masterFinancials = useMemo(() => {
    let faturamentoBruto = 0;
    let faturamentoLiquido = 0;
    let freteCobradoTotal = 0;
    let fretePagoTotal = 0;
    let totalTaxasGateway = 0;
    let totalCustoProducao = 0;

    orders.forEach((order) => {
      const metrics = calculateFinancialMetrics(order);
      faturamentoBruto += order.saleValue;
      faturamentoLiquido += metrics.netProfit;
      freteCobradoTotal += order.shippingCharged ?? 0;
      fretePagoTotal += order.shippingPaid ?? 0;
      totalTaxasGateway += metrics.gatewayFee ?? 0;
      totalCustoProducao += order.productionCost ?? 0;
    });

    const sobraFreteReal = freteCobradoTotal - fretePagoTotal;
    const margemLiquidaMedia = faturamentoBruto > 0 ? (faturamentoLiquido / faturamentoBruto) * 100 : 0;
    const ticketMedioGeral = orders.length > 0 ? faturamentoBruto / orders.length : 0;

    return {
      faturamentoBruto,
      faturamentoLiquido,
      freteCobradoTotal,
      fretePagoTotal,
      sobraFreteReal,
      totalTaxasGateway,
      totalCustoProducao,
      margemLiquidaMedia,
      ticketMedioGeral,
    };
  }, [orders]);

  // 2. MAPA GEOGRÁFICO (GRID DE ESTADOS)
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

    // Ordenar por volume de pedidos decrescente
    return list.sort((a, b) => b.count - a.count || b.totalVendas - a.totalVendas);
  }, [orders]);

  // 3. TOP 3 PRODUTOS HISTÓRICOS
  const top3Products = useMemo(() => {
    const productStats = new Map<string, {
      name: string;
      code: string;
      category?: string;
      subCategory?: string;
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
            category: it.category,
            subCategory: it.subCategory,
            unitsSold: 0,
            revenue: 0,
          };

          current.unitsSold += it.quantity;
          current.revenue += it.totalPrice || (it.unitPrice * it.quantity);
          productStats.set(key, current);
        });
      } else if (order.item) {
        // Fallback para pedidos antigos em linha única
        const key = order.item;
        const current = productStats.get(key) || {
          name: order.item,
          code: 'SNAP',
          category: 'Terços',
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

    return list.sort((a, b) => b.unitsSold - a.unitsSold || b.revenue - a.revenue).slice(0, 3);
  }, [orders]);

  // 4. RAIO-X DE FORMAS DE PAGAMENTO
  const paymentBreakdown = useMemo(() => {
    const totalOrdersCount = orders.length || 1;
    const totalRevenue = orders.reduce((acc, o) => acc + o.saleValue, 0) || 1;

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
  }, [orders]);

  // 5. RANKING LOGÍSTICO (TRANSPORTADORAS E PLATAFORMAS)
  const logisticsRankings = useMemo(() => {
    const carrierMap = new Map<string, { count: number; freightCharged: number; freightPaid: number }>();
    const platformMap = new Map<string, { count: number; freightCharged: number }>();

    orders.forEach((order) => {
      const carrier = (order.carrier || 'Correios PAC').trim();
      const platform = (order.shippingPlatform || 'Melhor Envio').trim();

      // Carriers
      const cCurrent = carrierMap.get(carrier) || { count: 0, freightCharged: 0, freightPaid: 0 };
      carrierMap.set(carrier, {
        count: cCurrent.count + 1,
        freightCharged: cCurrent.freightCharged + (order.shippingCharged || 0),
        freightPaid: cCurrent.freightPaid + (order.shippingPaid || 0),
      });

      // Platforms
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

  return (
    <div className="space-y-7 animate-in fade-in duration-200">
      {/* Header do Módulo Panorama Geral (BI) */}
      <div className="bg-gradient-to-r from-zinc-950 via-slate-900 to-zinc-900 text-white p-6 sm:p-7 rounded-3xl border border-zinc-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Módulo de Inteligência Comercial (BI)
              </span>
              <span className="text-[10px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/60">
                Base Consolidada · {orders.length} Pedidos
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>Panorama Geral Terçarium</span>
              <BarChart3 className="w-5 h-5 text-amber-400 inline" />
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl">
              Análise estratégica e consolidação executiva: faturamento, geografia de entregas pelo Brasil, ranking dos produtos mais vendidos, penetração de pagamentos e pódio logístico.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block bg-zinc-900/80 backdrop-blur-md p-3.5 rounded-2xl border border-zinc-800">
              <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">Margem Média da Empresa</div>
              <div className="text-lg font-bold font-mono text-emerald-400">
                {formatPercent(masterFinancials.margemLiquidaMedia)}
              </div>
              <div className="text-[10px] text-zinc-500 font-mono">
                Ticket Médio: {formatBRL(masterFinancials.ticketMedioGeral)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO 1: CARDS FINANCEIROS MASTER (4 BLOCOS PRINCIPAIS) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Cards Financeiros Master
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Indicadores Acumulados
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Faturamento Bruto */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs relative overflow-hidden group hover:border-amber-300 transition-colors">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Faturamento Bruto
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/80">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-950 tabular-nums">
              {formatBRL(masterFinancials.faturamentoBruto)}
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Total cobrado dos clientes</span>
              <span className="font-mono font-semibold text-slate-800">{orders.length} pedidos</span>
            </div>
          </div>

          {/* Card 2: Faturamento Líquido */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition-colors">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Faturamento Líquido
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/80">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-800 tabular-nums">
              {formatBRL(masterFinancials.faturamentoLiquido)}
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Lucro real limpo do ateliê</span>
              <span className="font-mono font-bold text-emerald-700">
                {formatPercent(masterFinancials.margemLiquidaMedia)}
              </span>
            </div>
          </div>

          {/* Card 3: Frete Total Movimentado */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs relative overflow-hidden group hover:border-indigo-300 transition-colors">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Frete Total Movimentado
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-200/80">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-indigo-800 tabular-nums">
              {formatBRL(masterFinancials.freteCobradoTotal)}
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Custo Real Cotado:</span>
              <span className="font-mono font-medium text-slate-700">
                {formatBRL(masterFinancials.fretePagoTotal)}
              </span>
            </div>
          </div>

          {/* Card 4: Sobra de Frete Real */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs relative overflow-hidden group hover:border-amber-300 transition-colors">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Sobra de Frete Real
              </span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                masterFinancials.sobraFreteReal >= 0 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className={`text-2xl font-bold font-mono tabular-nums ${
              masterFinancials.sobraFreteReal >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}>
              {masterFinancials.sobraFreteReal >= 0 
                ? `+ ${formatBRL(masterFinancials.sobraFreteReal)}` 
                : `- ${formatBRL(Math.abs(masterFinancials.sobraFreteReal))}`}
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Frete Cobrado - Pago</span>
              <span className={`font-semibold ${
                masterFinancials.sobraFreteReal >= 0 ? 'text-emerald-700' : 'text-rose-600'
              }`}>
                {masterFinancials.sobraFreteReal >= 0 ? 'Lucro de Envio' : 'Custo Absorvido'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO 2: MAPA GEOGRÁFICO & TOP 3 PRODUTOS (LAYOUT COMBO) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* MAPA GEOGRÁFICO (GRID DOS ESTADOS DO BRASIL) - 7 COLUNAS */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700">
                <Globe2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Distribuição Geográfica (Estados do Brasil)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Volume de pedidos e faturamento gerado por unidade federativa
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 self-start sm:self-auto">
              {geographicDistribution.length} estados atendidos
            </span>
          </div>

          {/* Grid Compacto de Estados */}
          <div className="space-y-2.5 pt-1">
            {geographicDistribution.map((state, idx) => (
              <div
                key={state.uf}
                className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:bg-white hover:border-amber-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Badge da UF */}
                  <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                    {state.uf}
                  </div>
                  <div className="truncate">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5 truncate">
                      <span>{state.name}</span>
                      <span className="text-[10px] text-slate-400 font-normal">({state.region})</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Faturamento: <strong className="text-slate-800">{formatBRL(state.totalVendas)}</strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 sm:w-48 justify-between sm:justify-end">
                  <div className="flex-1 sm:w-28 text-right">
                    <div className="flex items-center justify-between sm:justify-end gap-2 text-[11px]">
                      <span className="font-mono font-bold text-slate-900">
                        {state.count} {state.count === 1 ? 'pedido' : 'pedidos'}
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
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                    #{idx + 1}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TOP 3 PRODUTOS HISTÓRICOS - 5 COLUNAS */}
        <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700">
              <Trophy className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Top 3 Produtos Campeões
              </h3>
              <p className="text-[11px] text-slate-500">
                Itens mais vendidos e desejados na história do ateliê
              </p>
            </div>
          </div>

          <div className="space-y-3.5 pt-1">
            {top3Products.map((prod, idx) => {
              const medalStyles = [
                {
                  bg: 'bg-amber-500/10 border-amber-500/40 text-amber-900',
                  badge: 'bg-amber-500 text-slate-950 font-bold',
                  icon: '🥇',
                  title: '1º Lugar · Best Seller',
                },
                {
                  bg: 'bg-slate-100/90 border-slate-300 text-slate-800',
                  badge: 'bg-slate-300 text-slate-900 font-bold',
                  icon: '🥈',
                  title: '2º Lugar · Alta Procura',
                },
                {
                  bg: 'bg-amber-800/10 border-amber-800/30 text-amber-950',
                  badge: 'bg-amber-700 text-white font-bold',
                  icon: '🥉',
                  title: '3º Lugar · Destaque',
                },
              ][idx] || {
                bg: 'bg-slate-50 border-slate-200 text-slate-800',
                badge: 'bg-slate-200 text-slate-800 font-semibold',
                icon: '⭐',
                title: `${idx + 1}º Lugar`,
              };

              return (
                <div
                  key={prod.name}
                  className={`p-4 rounded-2xl border transition-all relative overflow-hidden ${medalStyles.bg}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl select-none">{medalStyles.icon}</span>
                      <div>
                        <span className={`inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${medalStyles.badge}`}>
                          {medalStyles.title}
                        </span>
                        <div className="font-mono text-[10px] text-slate-500 mt-0.5">
                          Cód: {prod.code}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-bold font-mono text-slate-950 block">
                        {prod.unitsSold} {prod.unitsSold === 1 ? 'unidade' : 'unidades'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {prod.sharePercent.toFixed(1)}% do total
                      </span>
                    </div>
                  </div>

                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-2" title={prod.name}>
                    {prod.name}
                  </h4>

                  <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-600 text-[11px]">Receita Gerada:</span>
                    <strong className="text-emerald-800 font-bold">{formatBRL(prod.revenue)}</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SEÇÃO 3 & 4: RAIO-X DE PAGAMENTOS E RANKING LOGÍSTICO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* RAIO-X DE FORMAS DE PAGAMENTO */}
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
                <p className="text-[11px] text-slate-500">
                  Distribuição de faturamento por modalidade e taxas aplicadas
                </p>
              </div>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              Taxas Deduzidas no DRE
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {paymentBreakdown.map((item) => (
              <div
                key={item.method}
                className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:bg-white hover:border-slate-300 transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{item.label}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                      item.rate === 0 
                        ? 'bg-emerald-100 text-emerald-800 font-bold' 
                        : 'bg-amber-100 text-amber-900 font-semibold'
                    }`}>
                      {item.rate === 0 ? '0% taxa' : `${(item.rate * 100).toFixed(2)}% taxa`}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-900">{formatBRL(item.revenue)}</span>
                    <span className="text-[10px] text-slate-500 font-mono ml-2">
                      ({item.revenueShare.toFixed(1)}%)
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-600 h-full rounded-full"
                    style={{ width: `${Math.max(4, item.revenueShare)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                  <span>{item.count} {item.count === 1 ? 'transação' : 'transações'}</span>
                  {item.gatewayFees > 0 && (
                    <span className="font-mono text-rose-600 text-[10px]">
                      Taxa gateway retida: -{formatBRL(item.gatewayFees)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RANKING LOGÍSTICO (PÓDIO TRANSPORTADORAS & PLATAFORMAS) */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Ranking Logístico das Operações
                </h3>
                <p className="text-[11px] text-slate-500">
                  Pódio de transportadoras parceiras e canais de emissão
                </p>
              </div>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
              Operações de Envio
            </span>
          </div>

          {/* Transportadoras */}
          <div className="space-y-3 pt-1">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              Transportadoras mais utilizadas (Pódio):
            </span>
            <div className="space-y-2">
              {logisticsRankings.carriers.map((c, idx) => (
                <div
                  key={c.name}
                  className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:bg-white hover:border-slate-300 transition-colors flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-slate-900 text-white font-mono font-bold text-[11px] flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="truncate">
                      <div className="font-bold text-slate-900 truncate">{c.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Frete Cobrado: {formatBRL(c.freightCharged)} · Cotado: {formatBRL(c.freightPaid)}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-slate-900">
                      {c.count} {c.count === 1 ? 'envio' : 'envios'}
                    </div>
                    <div className={`text-[10px] font-mono font-semibold ${
                      c.surplus >= 0 ? 'text-emerald-700' : 'text-rose-600'
                    }`}>
                      Sobra: {c.surplus >= 0 ? `+${formatBRL(c.surplus)}` : `-${formatBRL(Math.abs(c.surplus))}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Plataformas de Envio */}
            <div className="pt-3 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Canais e Plataformas de Emissão:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {logisticsRankings.platforms.map((p) => (
                  <div key={p.name} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="font-bold text-slate-900 truncate">{p.name}</div>
                    <div className="text-[11px] font-mono text-slate-600 mt-0.5">
                      {p.count} {p.count === 1 ? 'pedido' : 'pedidos'} ({p.percentage.toFixed(0)}%)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
