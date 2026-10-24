import React, { useState, useMemo, useEffect } from 'react';
import { 
  MessageSquare, 
  Copy, 
  Check, 
  ShoppingBag, 
  Plus, 
  Minus, 
  Trash2, 
  Truck, 
  Calendar, 
  DollarSign, 
  Sparkles, 
  Send, 
  CheckCheck, 
  Package, 
  RefreshCw, 
  ExternalLink,
  ShieldCheck,
  CreditCard,
  QrCode,
  CheckCircle2,
  User,
  Bookmark,
  FileText,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { Product, sortProductsHierarchically, Client, SavedBudget, PrefilledFreightData } from '../types/erp';
import { formatBRL } from '../utils/formatters';
import { GroupedProductSelect } from './GroupedProductSelect';
import { ConvertBudgetModal } from './ConvertBudgetModal';
import { supabase } from '../supabase';

export interface BudgetItem {
  id: string;
  productId?: string;
  extraProductId?: string;
  name: string;
  code: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  observacao?: string;
}

export type ShippingOption = 
  | 'Correios PAC'
  | 'Correios SEDEX'
  | 'Transportadora Loggi'
  | 'Loggi'
  | 'Transportadora J&T Express'
  | 'Jadlog'
  | 'Outra';

const SHIPPING_OPTIONS: ShippingOption[] = [
  'Correios PAC',
  'Correios SEDEX',
  'Loggi',
  'Transportadora Loggi',
  'Jadlog',
  'Transportadora J&T Express',
  'Outra',
];

export const SHIPPING_PLATFORMS = [
  'Melhor Envio',
  'Frenet',
  'SuperFrete',
  'Contrato Correios',
  'Outra',
] as const;

interface BudgetViewProps {
  products: Product[];
  clients?: Client[];
  onAddClient?: (newClient: Client) => void;
  onConvertToOrder?: (client: Client, budget: SavedBudget) => void;
  prefilledFreight?: PrefilledFreightData | null;
  onClearPrefilledFreight?: () => void;
}

export const BudgetView: React.FC<BudgetViewProps> = ({ 
  products,
  clients = [],
  onAddClient = () => {},
  onConvertToOrder = () => {},
  prefilledFreight = null,
  onClearPrefilledFreight,
}) => {
  const sortedProducts = useMemo(() => {
    return [...products].sort(sortProductsHierarchically);
  }, [products]);

  const mainCatalogProducts = useMemo(() => {
    return sortedProducts.filter((p) => p.category !== 'Extras');
  }, [sortedProducts]);

  const extraProducts = useMemo(() => {
    return sortedProducts.filter((p) => p.category === 'Extras');
  }, [sortedProducts]);

  const [leadName, setLeadName] = useState<string>('');
  const [savedBudgets, setSavedBudgets] = useState<SavedBudget[]>([]);

  useEffect(() => {
    fetchBudgetsFromSupabase();
  }, []);

  const fetchBudgetsFromSupabase = async () => {
    try {
      const { data, error } = await supabase.from('orcamentos').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        const mapped: SavedBudget[] = data.map((b: any) => ({
          id: b.id,
          leadName: b.client_name || 'Interessado',
          createdAt: new Date(b.created_at).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          items: b.items || [],
          shippingOption: b.shipping_option || 'Correios PAC',
          estimatedDeliveryTime: b.estimated_delivery_time || '7 dias úteis',
          freteCobrado: Number(b.shipping_value) || 0,
          freteCotado: Number(b.frete_cotado) || 0,
          sobraFrete: Number(b.sobra_frete) || 0,
          shippingValue: Number(b.shipping_value) || 0,
          subtotalProducts: Number(b.subtotal_products) || 0,
          totalNormal: Number(b.total_value) || 0,
          totalPix: Number(b.total_pix) || (Number(b.subtotal_products) * 0.95 + Number(b.shipping_value)),
          text: b.text || '',
          shippingPlatform: b.shipping_platform || 'Melhor Envio',
        }));
        setSavedBudgets(mapped);
      }
    } catch (err) {
      console.error('Erro ao buscar orçamentos do Supabase:', err);
    }
  };

  const [budgetToConvert, setBudgetToConvert] = useState<SavedBudget | null>(null);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState<boolean>(false);
  const [toastNotice, setToastNotice] = useState<string | null>(null);
  const [prefilledNotice, setPrefilledNotice] = useState<string | null>(null);

  const [items, setItems] = useState<BudgetItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>(
    mainCatalogProducts[0]?.id || sortedProducts[0]?.id || ''
  );
  const [selectedExtraProductId, setSelectedExtraProductId] = useState<string>('');
  const [itemObservacao, setItemObservacao] = useState<string>('');
  const [addQuantity, setAddQuantity] = useState<number>(1);
  const [showItemPicker, setShowItemPicker] = useState<boolean>(false);

  const resolvePlatform = (data?: PrefilledFreightData | null) => {
    const plat = data?.plataformaSelecionada || data?.plataforma || '';
    if (plat) {
      const pLower = plat.toLowerCase();
      if (pLower.includes('melhor envio')) return { platform: 'Melhor Envio', custom: '' };
      if (pLower.includes('frenet')) return { platform: 'Frenet', custom: '' };
      if (pLower.includes('superfrete')) return { platform: 'SuperFrete', custom: '' };
      if (pLower.includes('correios')) return { platform: 'Contrato Correios', custom: '' };
      return { platform: 'Outra', custom: plat };
    }
    return { platform: 'Melhor Envio', custom: '' };
  };

  const resolveCarrier = (data?: PrefilledFreightData | null) => {
    const carrierName = data?.transportadoraSelecionada || data?.transportadora || '';
    if (carrierName) {
      const lower = carrierName.toLowerCase();
      if (lower.includes('sedex')) return { option: 'Correios SEDEX', custom: '' };
      if (lower.includes('pac')) return { option: 'Correios PAC', custom: '' };
      if (lower.includes('jadlog')) return { option: 'Jadlog', custom: '' };
      if (lower.includes('loggi')) return { option: 'Loggi', custom: '' };
      if (lower.includes('j&t') || lower.includes('jt')) return { option: 'Transportadora J&T Express', custom: '' };
      return { option: 'Outra', custom: carrierName };
    }
    return { option: 'Correios PAC', custom: '' };
  };

  const [selectedPlatform, setSelectedPlatform] = useState<string>(() => resolvePlatform(prefilledFreight).platform);
  const [customPlatform, setCustomPlatform] = useState<string>(() => resolvePlatform(prefilledFreight).custom);
  const [selectedShippingOption, setSelectedShippingOption] = useState<ShippingOption>(() => resolveCarrier(prefilledFreight).option as ShippingOption);
  const [customShippingOption, setCustomShippingOption] = useState<string>(() => resolveCarrier(prefilledFreight).custom);
  const [estimatedDeliveryTime, setEstimatedDeliveryTime] = useState<string>(() => prefilledFreight?.prazoTexto || '7 dias úteis');

  const [isFreteGratis, setIsFreteGratis] = useState<boolean>(() => {
    if (prefilledFreight) {
      const val = typeof prefilledFreight.freteCobrado === 'number' ? prefilledFreight.freteCobrado : (prefilledFreight.precoFinalCliente ?? 28);
      return val === 0;
    }
    return false;
  });

  const [savedFreteCobrado, setSavedFreteCobrado] = useState<string>('28.00');

  const [freteCobrado, setFreteCobrado] = useState<string>(() => {
    if (prefilledFreight) {
      const val = typeof prefilledFreight.freteCobrado === 'number' ? prefilledFreight.freteCobrado : (prefilledFreight.precoFinalCliente ?? 28);
      return Math.round(Number(val || 0) * 100 / 100).toFixed(2);
    }
    return '28.00';
  });

  const [freteCotado, setFreteCotado] = useState<string>(() => {
    if (prefilledFreight) {
      const val = typeof prefilledFreight.freteCotado === 'number' ? prefilledFreight.freteCotado : (prefilledFreight.freteCobrado ?? 22);
      return Math.round(Number(val || 0) * 100 / 100).toFixed(2);
    }
    return '22.00';
  });

  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  useEffect(() => {
    if (prefilledFreight) {
      const cobrado = typeof prefilledFreight.freteCobrado === 'number' ? prefilledFreight.freteCobrado : (prefilledFreight.precoFinalCliente ?? 28);
      const cotado = typeof prefilledFreight.freteCotado === 'number' ? prefilledFreight.freteCotado : cobrado;

      const cobradoNum = Math.round(Number(cobrado || 0) * 100) / 100;
      const cotadoNum = Math.round(Number(cotado || 0) * 100) / 100;

      if (cobradoNum === 0) {
        setIsFreteGratis(true);
        setFreteCobrado('0.00');
      } else {
        setIsFreteGratis(false);
        setFreteCobrado(cobradoNum.toFixed(2));
        setSavedFreteCobrado(cobradoNum.toFixed(2));
      }
      setFreteCotado(cotadoNum.toFixed(2));

      if (prefilledFreight.prazoTexto) setEstimatedDeliveryTime(prefilledFreight.prazoTexto);

      const platResolved = resolvePlatform(prefilledFreight);
      setSelectedPlatform(platResolved.platform);
      setCustomPlatform(platResolved.custom);

      const carrierResolved = resolveCarrier(prefilledFreight);
      setSelectedShippingOption(carrierResolved.option as ShippingOption);
      setCustomShippingOption(carrierResolved.custom);

      setPrefilledNotice(`Frete importado da Cotação`);
    }
  }, [prefilledFreight]);

  const formatCurrencyValue = (val: number): string => {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const subtotalProducts = useMemo(() => {
    return items.reduce((acc, it) => acc + it.totalPrice, 0);
  }, [items]);

  const numShipping = isFreteGratis ? 0 : Math.max(0, parseFloat(freteCobrado) || 0);
  const numCotado = Math.max(0, parseFloat(freteCotado) || 0);
  const sobraFrete = Math.round((numShipping - numCotado) * 100) / 100;

  const valorTotalNormal = subtotalProducts + numShipping;
  const subtotalPix = subtotalProducts * 0.95;
  const valorTotalPix = subtotalPix + numShipping;

  const budgetText = useMemo(() => {
    const greeting = leadName.trim() ? `Olá, ${leadName.trim()}, segue o resumo do seu orçamento:` : `Olá, segue o resumo do seu orçamento:`;
    const itemsLines = items.map((it) => {
      const prefix = it.quantity > 1 ? `${it.quantity}x ` : '';
      const obsText = it.observacao ? ` (${it.observacao})` : '';
      return `${prefix}${it.name}${obsText} - R$ ${formatCurrencyValue(it.totalPrice)}`;
    });

    const effectiveCarrier = selectedShippingOption === 'Outra' ? (customShippingOption.trim() || 'Outra') : selectedShippingOption;
    const shippingPriceText = isFreteGratis ? 'Frete GRÁTIS' : `R$ ${formatCurrencyValue(numShipping)}`;
    const shippingLine = `Frete (${effectiveCarrier} - ${estimatedDeliveryTime || 'A combinar'}) - ${shippingPriceText}`;
    const totalLine = `Valor total: R$ ${formatCurrencyValue(valorTotalNormal)}`;

    const paymentLine1 = `R$ ${formatCurrencyValue(valorTotalNormal)} - Cartão de crédito em até 3x sem juros via link.`;
    const paymentLine2 = `R$ ${formatCurrencyValue(valorTotalPix)} - Pix, desconto de 5% nos produtos.`;
    const productionNote = `PS: Nosso prazo de produção é de até 2 dias úteis. Os envios são realizados às terças e sextas-feiras.`;

    const summarySection = [greeting, '', 'Resumo do Pedido', ...itemsLines, shippingLine, totalLine].join('\n');
    const paymentSection = ['Formas de Pagamento', paymentLine1, paymentLine2].join('\n');

    return `${summarySection}\n\n${paymentSection}\n\n${productionNote}`;
  }, [leadName, items, selectedShippingOption, customShippingOption, estimatedDeliveryTime, isFreteGratis, numShipping, valorTotalNormal, valorTotalPix]);

  const handleAddItem = (prod: Product, qty: number, extraId?: string, observacao?: string) => {
    const validQty = Math.max(1, qty);
    const extra = extraProducts.find((p) => p.id === extraId);
    const extraPrice = extra ? extra.salePrice : 0;
    const unitPrice = prod.salePrice + extraPrice;
    const itemName = extra ? `${prod.model} + ${extra.model}` : prod.model;
    const cleanObs = (observacao || '').trim() || undefined;

    setItems((prev) => {
      const existingIdx = prev.findIndex(
        (i) => i.productId === prod.id && i.extraProductId === (extra ? extra.id : undefined) && i.observacao === cleanObs
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        const newQty = updated[existingIdx].quantity + validQty;
        updated[existingIdx] = { ...updated[existingIdx], quantity: newQty, totalPrice: newQty * updated[existingIdx].unitPrice };
        return updated;
      }
      return [
        ...prev,
        {
          id: `BGT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          productId: prod.id,
          extraProductId: extra ? extra.id : undefined,
          name: itemName,
          code: prod.code,
          quantity: validQty,
          unitPrice,
          totalPrice: validQty * unitPrice,
          observacao: cleanObs,
        },
      ];
    });
  };

  const handleUpdateQuantity = (index: number, newQty: number) => {
    if (newQty < 1) return;
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantity: newQty, totalPrice: newQty * updated[index].unitPrice };
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCopyBudget = async () => {
    if (items.length === 0) return;
    try {
      await navigator.clipboard.writeText(budgetText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  const handleSaveBudget = async () => {
    if (items.length === 0) return;
    
    const newBudget: SavedBudget = {
      id: `ORC-${Date.now()}`,
      leadName: leadName.trim() || 'Interessado',
      createdAt: new Date().toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      items: items.map((it) => ({ ...it })),
      shippingOption: selectedShippingOption === 'Outra' ? (customShippingOption || 'Outra') : selectedShippingOption,
      estimatedDeliveryTime,
      freteCobrado: numShipping,
      freteCotado: numCotado,
      sobraFrete: sobraFrete,
      shippingValue: numShipping,
      subtotalProducts,
      totalNormal: valorTotalNormal,
      totalPix: valorTotalPix,
      text: budgetText,
      shippingPlatform: selectedPlatform === 'Outra' ? (customPlatform || 'Outra') : selectedPlatform,
    };

    try {
      await supabase.from('orcamentos').insert([
        {
          id: newBudget.id,
          client_name: newBudget.leadName,
          items: newBudget.items,
          shipping_option: newBudget.shippingOption,
          estimated_delivery_time: newBudget.estimatedDeliveryTime,
          shipping_value: newBudget.shippingValue,
          frete_cotado: newBudget.freteCotado,
          sobra_frete: newBudget.sobraFrete,
          subtotal_products: newBudget.subtotalProducts,
          total_value: newBudget.totalNormal,
          total_pix: newBudget.totalPix,
          text: newBudget.text,
          shipping_platform: newBudget.shippingPlatform,
        }
      ]);

      setSavedBudgets((prev) => [newBudget, ...prev]);
      setIsSaved(true);
      setToastNotice(`Orçamento salvo na nuvem com sucesso!`);
      setTimeout(() => {
        setIsSaved(false);
        setToastNotice(null);
      }, 2500);
    } catch (err) {
      console.error('Erro ao salvar orçamento no Supabase:', err);
    }
  };

  const handleDeleteSavedBudget = async (id: string) => {
    setSavedBudgets((prev) => prev.filter((b) => b.id !== id));
    try {
      await supabase.from('orcamentos').delete().eq('id', id);
    } catch (err) {
      console.error('Erro ao apagar orçamento do Supabase:', err);
    }
  };

  const handleStartConversion = (budget: SavedBudget) => {
    setBudgetToConvert(budget);
    setIsConvertModalOpen(true);
  };

  const handleCopySavedBudget = async (budget: SavedBudget) => {
    try {
      await navigator.clipboard.writeText(budget.text);
      setToastNotice(`Texto do orçamento copiado!`);
      setTimeout(() => setToastNotice(null), 2000);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  const handleReset = () => {
    setItems([]);
    setSelectedPlatform('Melhor Envio');
    setCustomPlatform('');
    setSelectedShippingOption('Correios PAC');
    setCustomShippingOption('');
    setEstimatedDeliveryTime('7 dias úteis');
    setIsFreteGratis(false);
    setFreteCobrado('28.00');
    setSavedFreteCobrado('28.00');
    setFreteCotado('22.00');
    setIsSaved(false);
    setPrefilledNotice(null);
    if (onClearPrefilledFreight) onClearPrefilledFreight();
  };

  const whatsappTime = useMemo(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner de Destaque */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 sm:p-6 rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Central de Atendimento & Conversão
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              WhatsApp Instantâneo
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            Gerador de Orçamento
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Monte orçamentos em segundos com produtos do catálogo, selecione a transportadora e copie a mensagem formatada para enviar direto ao cliente pelo WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Limpar / Novo</span>
          </button>
          <button
            type="button"
            onClick={handleCopyBudget}
            disabled={items.length === 0}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer ${
              items.length === 0 ? 'bg-slate-800 text-slate-500 border border-slate-700 opacity-50 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
            }`}
          >
            <Copy className="w-4 h-4" />
            <span>📋 Copiar Orçamento</span>
          </button>
        </div>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUNA ESQUERDA: ÁREA DE PREENCHIMENTO */}
        <div className="lg:col-span-7 space-y-6">
          {toastNotice && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center gap-2 text-xs font-semibold shadow-2xs">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{toastNotice}</span>
            </div>
          )}

          {/* Nome do Lead */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <User className="w-4 h-4 text-amber-600" />
                <span>Nome do Interessado/Lead</span>
              </label>
              <span className="text-[10px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Lead temporário (sem consulta ao banco)
              </span>
            </div>
            <input
              type="text"
              value={leadName}
              onChange={(e) => setLeadName(e.target.value)}
              placeholder="Ex: Mariana Rios"
              className="w-full text-xs sm:text-sm py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
            />
          </div>

          {/* Produtos do Orçamento */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-700">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">Produtos do Orçamento</h3>
                  <p className="text-[11px] text-slate-500">{items.length} produto(s) · {items.reduce((acc, it) => acc + it.quantity, 0)} unidade(s)</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowItemPicker((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{showItemPicker ? 'Fechar Seleção' : '+ Adicionar Produto'}</span>
              </button>
            </div>

            {showItemPicker && (
              <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 space-y-3">
                <div className="flex flex-col sm:flex-row items-end gap-2.5 flex-wrap">
                  <div className="flex-1 min-w-[220px] w-full sm:w-auto">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Produto Principal *</label>
                    <GroupedProductSelect
                      products={mainCatalogProducts}
                      value={selectedProductId}
                      onChange={setSelectedProductId}
                      formatOptionLabel={(p) => `[${p.code}] ${p.model} — R$ ${formatCurrencyValue(p.salePrice)}`}
                      className="w-full text-xs h-[38px] py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs cursor-pointer"
                    />
                  </div>

                  <div className="w-full sm:w-56 shrink-0">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Adicional / Extra</label>
                    <select
                      value={selectedExtraProductId}
                      onChange={(e) => setSelectedExtraProductId(e.target.value)}
                      className="w-full text-xs h-[38px] py-2 px-2.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs cursor-pointer"
                    >
                      <option value="">Nenhum (+ R$ 0,00)</option>
                      {extraProducts.map((extra) => (
                        <option key={extra.id} value={extra.id}>
                          + {extra.model} (+R$ {formatCurrencyValue(extra.salePrice)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 h-[38px]">
                    <button
                      type="button"
                      onClick={() => {
                        const prod = mainCatalogProducts.find((p) => p.id === selectedProductId) || mainCatalogProducts[0] || sortedProducts[0];
                        if (prod) {
                          handleAddItem(prod, addQuantity, selectedExtraProductId, itemObservacao);
                          setAddQuantity(1);
                          setSelectedExtraProductId('');
                          setItemObservacao('');
                        }
                      }}
                      className="flex-1 sm:flex-initial h-[38px] px-3.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center whitespace-nowrap shadow-2xs"
                    >
                      + Incluir
                    </button>
                  </div>
                </div>
              </div>
            )}

            {items.length === 0 ? (
              <div className="py-8 px-4 text-center text-slate-500 bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
                <ShoppingBag className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-medium text-slate-600">Nenhum item adicionado. Clique no botão acima para incluir produtos.</p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <div key={item.id} className="p-3.5 bg-white flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-semibold text-slate-900">{item.name}</span>
                      <span className="text-slate-500 ml-2">R$ {formatCurrencyValue(item.totalPrice)}</span>
                    </div>
                    <button type="button" onClick={() => handleRemoveItem(idx)} className="text-rose-600 hover:bg-rose-50 p-1 rounded cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Frete e Prazo de Entrega */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-700">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Frete e Prazo de Entrega</h3>
                <p className="text-[11px] text-slate-500">Configure a transportadora, prazo estimado e valor do envio</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-slate-700 font-medium text-xs mb-1.5">Plataforma</label>
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs cursor-pointer"
                >
                  {SHIPPING_PLATFORMS.map((plat) => (
                    <option key={plat} value={plat}>{plat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium text-xs mb-1.5">Transportadora *</label>
                <select
                  value={selectedShippingOption}
                  onChange={(e) => setSelectedShippingOption(e.target.value as ShippingOption)}
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs cursor-pointer"
                >
                  {SHIPPING_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium text-xs mb-1.5">Prazo Estimado *</label>
                <input
                  type="text"
                  value={estimatedDeliveryTime}
                  onChange={(e) => setEstimatedDeliveryTime(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium text-xs mb-1.5">Frete Cobrado (R$) *</label>
                <input
                  type="text"
                  value={freteCobrado}
                  onChange={(e) => setFreteCobrado(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono font-bold text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium text-xs mb-1.5">Frete Cotado (R$) *</label>
                <input
                  type="text"
                  value={freteCotado}
                  onChange={(e) => setFreteCotado(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono font-bold text-xs"
                />
              </div>
            </div>

            {/* Sobra do Frete */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800">Sobra do Frete (Cobrado - Cotado)</span>
              <span className="font-mono font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
                + R$ {formatCurrencyValue(sobraFrete)}
              </span>
            </div>
          </div>

          {/* Cards Financeiros (Crédito e Pix) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="flex items-center gap-1 font-semibold text-slate-800 text-xs">
                <CreditCard className="w-3.5 h-3.5 text-indigo-600" /> Cartão de Crédito
              </span>
              <div className="text-xl font-mono font-bold text-slate-900">R$ {formatCurrencyValue(valorTotalNormal)}</div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1.5">
              <span className="flex items-center gap-1 font-semibold text-emerald-900 text-xs">
                <QrCode className="w-3.5 h-3.5 text-emerald-600" /> Pagamento via Pix (5% OFF)
              </span>
              <div className="text-xl font-mono font-bold text-emerald-900">R$ {formatCurrencyValue(valorTotalPix)}</div>
            </div>
          </div>

          {/* Botão Salvar Orçamento */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 flex justify-end">
            <button
              type="button"
              onClick={handleSaveBudget}
              disabled={items.length === 0}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer ${
                items.length === 0 ? 'opacity-40 cursor-not-allowed bg-amber-500' : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Salvar Orçamento na Nuvem</span>
            </button>
          </div>
        </div>

        {/* COLUNA DIREITA: WHATSAPP E ORÇAMENTOS SALVOS */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-[#075e54] text-white p-3.5 flex items-center justify-between">
              <span className="font-semibold text-xs">Simulação WhatsApp</span>
              <span className="text-[11px] font-mono">{whatsappTime}</span>
            </div>
            <div className="bg-[#e5ddd5] p-3.5 sm:p-4 min-h-[350px]">
              <div className="bg-[#dcf8c6] text-slate-800 p-3.5 rounded-2xl text-xs space-y-2 border border-emerald-200">
                <pre className="font-sans whitespace-pre-wrap leading-relaxed text-[12px] text-slate-900">{budgetText}</pre>
              </div>
            </div>
          </div>

          {/* ORÇAMENTOS SALVOS NA NUVEM (DESIGN ORIGINAL DETALHADO) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-700">
                  <Bookmark className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                    Orçamentos Salvos na Nuvem
                  </h3>
                  <p className="text-xs text-slate-500">
                    {savedBudgets.length} proposta(s) aguardando conversão
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                Funil de Vendas
              </span>
            </div>

            {savedBudgets.length === 0 ? (
              <div className="p-5 rounded-xl border border-dashed border-slate-200 text-center space-y-1.5 bg-slate-50/50">
                <FileText className="w-7 h-7 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-600">
                  Nenhum orçamento salvo no momento
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
                {savedBudgets.map((b) => (
                  <div
                    key={b.id}
                    className="p-2.5 sm:p-3 rounded-xl border border-slate-200 hover:border-amber-300 bg-slate-50/70 hover:bg-white transition-all space-y-2 shadow-2xs group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                        <span className="font-bold text-xs text-slate-900 truncate max-w-[140px] sm:max-w-[200px]">
                          {b.leadName || 'Interessado'}
                        </span>
                        <span className="text-xs font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-200 shrink-0">
                          {b.id}
                        </span>
                        <span className="text-xs text-slate-400 shrink-0">
                          · {b.createdAt}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteSavedBudget(b.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                        title="Excluir orçamento salvo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="bg-slate-100/90 rounded-lg p-2 text-xs border border-slate-200/80 space-y-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-slate-600">
                          Itens ({b.items.reduce((acc, it) => acc + it.quantity, 0)} un): <strong className="font-mono text-slate-900">{formatBRL(b.subtotalProducts)}</strong>
                        </span>
                        <span className="text-slate-600 flex items-center gap-1 flex-wrap">
                          <span>Frete ({b.shippingOption}):</span>
                          <strong className="text-emerald-700 font-mono">
                            {formatBRL(b.freteCobrado ?? b.shippingValue)}
                          </strong>
                          {typeof b.freteCotado === 'number' && (
                            <span className="text-xs text-slate-400 font-mono">
                              (cot: {formatBRL(b.freteCotado)})
                            </span>
                          )}
                          {typeof b.sobraFrete === 'number' && (
                            <span className={`text-xs font-mono font-semibold ${
                              b.sobraFrete > 0 ? 'text-emerald-700' : b.sobraFrete < 0 ? 'text-rose-600' : 'text-slate-500'
                            }`}>
                              ({b.sobraFrete > 0 ? `+${formatBRL(b.sobraFrete)}` : formatBRL(b.sobraFrete)})
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/70 gap-2 flex-wrap">
                        <span className="text-slate-600">
                          Total: <strong className="text-slate-900 font-mono">{formatBRL(b.totalNormal)}</strong>
                        </span>
                        <span className="text-emerald-800 font-semibold">
                          Pix: <strong className="font-mono">{formatBRL(b.totalPix)}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 line-clamp-2 leading-tight">
                      {b.items.map((it, idx) => (
                        <span key={idx} className="inline">
                          {idx > 0 && <span className="text-slate-300 mx-1">·</span>}
                          <span className="font-medium text-slate-800">
                            {it.quantity > 1 ? `${it.quantity}x ` : ''}{it.name}
                          </span>
                          {it.observacao && (
                            <span className="text-slate-400 italic text-xs ml-0.5">
                              ({it.observacao})
                            </span>
                          )}
                        </span>
                      ))}
                    </div>

                    <div className="pt-1.5 border-t border-slate-100 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleStartConversion(b)}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-xs sm:text-sm shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Criar pedido a partir deste orçamento"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                        <span className="truncate">Criar pedido a partir deste orçamento</span>
                        <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopySavedBudget(b)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                        title="Copiar texto do orçamento"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConvertBudgetModal
        isOpen={isConvertModalOpen}
        onClose={() => {
          setIsConvertModalOpen(false);
          setBudgetToConvert(null);
        }}
        budget={budgetToConvert}
        clients={clients}
        onAddClient={onAddClient}
        onConfirmConversion={(client, budget) => {
          setIsConvertModalOpen(false);
          setBudgetToConvert(null);
          onConvertToOrder(client, budget);
        }}
      />
    </div>
  );
};