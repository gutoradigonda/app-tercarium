import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  ShoppingBag, 
  Plus, 
  Minus, 
  Trash2, 
  DollarSign, 
  CreditCard, 
  AlertCircle, 
  CheckCircle2, 
  Package, 
  Sparkles, 
  Truck, 
  Eye, 
  Receipt,
  Percent
} from 'lucide-react';
import { 
  Order, 
  OrderItem, 
  Product, 
  ProductCategory, 
  PaymentMethod, 
  PAYMENT_LABELS, 
  PAYMENT_FACTORS, 
  ShippingCarrier,
  ShippingPlatform,
  UserRole,
  sortProductsHierarchically
} from '../types/erp';
import { formatBRL, formatPercent } from '../utils/formatters';
import { GroupedProductSelect } from './GroupedProductSelect';

interface EditOrderModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveOrder: (updatedOrder: Order) => void;
  products: Product[];
  userRole?: UserRole;
}

export const EditOrderModal: React.FC<EditOrderModalProps> = ({
  order,
  isOpen,
  onClose,
  onSaveOrder,
  products,
  userRole,
}) => {
  const isViewer = userRole === 'leitura';

  // Lista local de itens em edição
  const [items, setItems] = useState<OrderItem[]>([]);

  // Seleção para inclusão de novos produtos do catálogo
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedExtraProductId, setSelectedExtraProductId] = useState<string>('');
  const [itemObservacao, setItemObservacao] = useState<string>('');
  const [addQuantity, setAddQuantity] = useState<number>(1);
  const [customPriceOverride, setCustomPriceOverride] = useState<number | ''>('');

  // Fechamento Financeiro, Desconto e Frete Completo
  const [discountPercent, setDiscountPercent] = useState<number | ''>(0);
  const [isFreeShipping, setIsFreeShipping] = useState<boolean>(false);
  const [shippingCharged, setShippingCharged] = useState<number | ''>(0);
  const [shippingPaid, setShippingPaid] = useState<number | ''>(0);

  // Logística e Envio na Edição
  const [shippingPlatform, setShippingPlatform] = useState<ShippingPlatform>('Melhor Envio');
  const [customShippingPlatform, setCustomShippingPlatform] = useState<string>('');
  const [carrier, setCarrier] = useState<ShippingCarrier>('Correios PAC');
  const [customCarrier, setCustomCarrier] = useState<string>('');
  const [trackingCode, setTrackingCode] = useState<string>('');

  // Status de Pagamento e Forma de Pagamento
  const [paymentStatus, setPaymentStatus] = useState<string>('pago');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [paymentNote, setPaymentNote] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Produtos ordenados conforme a hierarquia do Ateliê
  const sortedProducts = useMemo(() => {
    return [...products].sort(sortProductsHierarchically);
  }, [products]);

  const mainCatalogProducts = useMemo(() => {
    return sortedProducts.filter((p) => p.category !== 'Extras');
  }, [sortedProducts]);

  const extraProducts = useMemo(() => {
    return sortedProducts.filter((p) => p.category === 'Extras');
  }, [sortedProducts]);

  // Carregar dados do pedido ao abrir o modal
  useEffect(() => {
    if (order && isOpen) {
      if (order.items && order.items.length > 0) {
        setItems(JSON.parse(JSON.stringify(order.items)));
      } else {
        const fallbackUnit = order.subtotal || order.saleValue;
        setItems([
          {
            id: `item-${Date.now()}`,
            code: 'TERCO',
            category: 'Terços',
            model: order.item || 'Terço Tradicional',
            quantity: 1,
            unitPrice: fallbackUnit,
            costPrice: order.productionCost || 30,
            totalPrice: fallbackUnit,
            totalCost: order.productionCost || 30,
          },
        ]);
      }

      setDiscountPercent(order.discountPercent || 0);
      setIsFreeShipping(Boolean(order.isFreeShipping));
      setShippingCharged(order.shippingCharged || 0);
      setShippingPaid(order.shippingPaid || order.shippingCharged || 0);

      // Plataforma
      const plat = order.shippingPlatform || 'Melhor Envio';
      if (['Melhor Envio', 'Frenet', 'SuperFrete', 'Contrato Correios'].includes(plat)) {
        setShippingPlatform(plat as ShippingPlatform);
        setCustomShippingPlatform('');
      } else {
        setShippingPlatform('Outra');
        setCustomShippingPlatform(plat);
      }

      // Transportadora
      const transp = order.carrier || 'Correios PAC';
      if (['Correios PAC', 'Correios SEDEX', 'Loggi', 'Transportadora Loggi', 'Jadlog', 'Transportadora J&T Express'].includes(transp)) {
        setCarrier(transp as ShippingCarrier);
        setCustomCarrier('');
      } else {
        setCarrier('Outra');
        setCustomCarrier(transp);
      }

      setTrackingCode(order.trackingCode || '');
      setPaymentStatus(order.paymentStatus || 'pago');
      setPaymentMethod(order.paymentMethod || 'pix');
      setPaymentNote(order.paymentNote || '');
      setErrorMessage(null);
      setSelectedExtraProductId('');
      setItemObservacao('');

      if (mainCatalogProducts.length > 0) {
        setSelectedProductId(mainCatalogProducts[0].id);
        setCustomPriceOverride(mainCatalogProducts[0].salePrice);
      }
    }
  }, [order, isOpen, mainCatalogProducts]);

  if (!isOpen || !order) return null;

  // Cálculos financeiros e de frete em tempo real
  const originalSaleValue = order.originalSaleValue ?? order.saleValue;
  const subtotal = items.reduce((acc, it) => acc + it.totalPrice, 0);
  const totalProductionCost = items.reduce((acc, it) => acc + it.totalCost, 0);

  const numDiscountPercent = typeof discountPercent === 'number' ? Math.max(0, Math.min(100, discountPercent)) : 0;
  const calculatedDiscount = (subtotal * numDiscountPercent) / 100;

  const numShippingCharged = isFreeShipping ? 0 : (typeof shippingCharged === 'number' ? Math.max(0, shippingCharged) : 0);
  const numShippingPaid = typeof shippingPaid === 'number' ? Math.max(0, shippingPaid) : 0;

  // Valor Total Pago atualizado
  const newSaleValue = Math.max(0, (subtotal - calculatedDiscount) + numShippingCharged);
  const shippingSurplus = numShippingCharged - numShippingPaid;

  const productProfit = (subtotal - calculatedDiscount) - totalProductionCost;
  const estimatedProfit = productProfit + shippingSurplus;
  const estimatedMargin = newSaleValue > 0 ? (estimatedProfit / newSaleValue) * 100 : 0;
  const additionalValue = newSaleValue - originalSaleValue;

  // Manipulação de itens do carrinho no modal de edição
  const handleIncreaseQty = (id: string) => {
    if (isViewer) return;
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          const newQty = it.quantity + 1;
          return {
            ...it,
            quantity: newQty,
            totalPrice: newQty * it.unitPrice,
            totalCost: newQty * it.costPrice,
          };
        }
        return it;
      })
    );
  };

  const handleDecreaseQty = (id: string) => {
    if (isViewer) return;
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === id && it.quantity > 1) {
          const newQty = it.quantity - 1;
          return {
            ...it,
            quantity: newQty,
            totalPrice: newQty * it.unitPrice,
            totalCost: newQty * it.costPrice,
          };
        }
        return it;
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    if (isViewer) return;
    if (items.length <= 1) {
      setErrorMessage('O pedido deve conter pelo menos 1 item.');
      return;
    }
    setErrorMessage(null);
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleAddCatalogProduct = () => {
    if (isViewer) return;
    const prod = mainCatalogProducts.find((p) => p.id === selectedProductId) || sortedProducts.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const extra = extraProducts.find((p) => p.id === selectedExtraProductId);
    const extraPrice = extra ? extra.salePrice : 0;
    const extraCost = extra ? extra.costPrice : 0;

    const baseUnitPrice = typeof customPriceOverride === 'number' && customPriceOverride >= 0 
      ? customPriceOverride 
      : prod.salePrice;

    const unitPrice = baseUnitPrice + extraPrice;
    const costPrice = prod.costPrice + extraCost;
    const modelName = extra ? `${prod.model} + ${extra.model}` : prod.model;

    const newItem: OrderItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      productId: prod.id,
      code: prod.code,
      category: prod.category,
      subCategory: prod.subCategory,
      model: modelName,
      quantity: addQuantity,
      unitPrice,
      costPrice,
      totalPrice: unitPrice * addQuantity,
      totalCost: costPrice * addQuantity,
      extraProductId: extra ? extra.id : undefined,
      extraName: extra ? extra.model : undefined,
      extraPrice,
      extraCost,
      observacao: itemObservacao.trim() || undefined,
    };

    setItems((prev) => [...prev, newItem]);
    setAddQuantity(1);
    setSelectedExtraProductId('');
    setItemObservacao('');
    setErrorMessage(null);
  };

  const handleSave = () => {
    if (isViewer) return;
    if (items.length === 0) {
      setErrorMessage('O pedido não pode ficar sem itens.');
      return;
    }

    const now = new Date();
    const timestamp = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const summaryItems = items.map((it) => `${it.quantity}x ${it.model}`).join(' + ');
    const firstModel = items[0]?.model || order.itemModel || 'Peça Personalizada';

    const finalPlatform = shippingPlatform === 'Outra' ? (customShippingPlatform.trim() || 'Outra') : shippingPlatform;
    const finalCarrier = carrier === 'Outra' ? (customCarrier.trim() || 'Outra') : carrier;

    const historyNote = `Pedido atualizado: Valor alterado para ${formatBRL(newSaleValue)}. Forma de Pagto: ${PAYMENT_LABELS[paymentMethod] || paymentMethod}.`;

    const updatedOrder: Order = {
      ...order,
      items,
      item: summaryItems,
      itemModel: firstModel,
      subtotal,
      discountPercent: numDiscountPercent,
      discount: calculatedDiscount,
      isFreeShipping,
      saleValue: newSaleValue,
      shippingCharged: numShippingCharged,
      shippingPaid: numShippingPaid,
      productionCost: totalProductionCost,
      originalSaleValue,
      shippingPlatform: finalPlatform as ShippingPlatform,
      carrier: finalCarrier as ShippingCarrier,
      trackingCode: trackingCode.trim() || undefined,
      paymentStatus,
      paymentMethod,
      paymentNote: paymentNote.trim() || undefined,
      history: [
        ...(order.history || []),
        {
          status: order.status,
          timestamp,
          note: historyNote,
        },
      ],
    };

    onSaveOrder(updatedOrder);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 transition-all"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* CABEÇALHO */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 font-mono font-bold text-xs shrink-0">
              <ShoppingBag className="w-5 h-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                  Editar Pedido #{order.id}
                </span>
                <span className="text-xs font-semibold text-slate-800 truncate">
                  {order.clientName}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                {order.clientCity}/{order.clientState} · Cadastrado em {order.createdAt}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CORPO SCROLLÁVEL */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs">
          {isViewer && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-950 flex items-center gap-2.5 text-xs font-medium">
              <Eye className="w-4 h-4 text-amber-600 shrink-0" />
              <span><strong>Modo Visualizador:</strong> Edição bloqueada.</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ITENS DO PEDIDO */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm">Produtos no Pedido ({items.length})</h3>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 shadow-2xs">
              {items.map((item) => (
                <div key={item.id} className="p-3.5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                      {item.code && <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-900 border">{item.code}</span>}
                      <span>{item.model}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Preço Unitário: <span className="font-mono font-medium text-slate-800">{formatBRL(item.unitPrice)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="flex items-center border border-slate-200 bg-slate-50 rounded-lg overflow-hidden">
                      <button type="button" disabled={isViewer || item.quantity <= 1} onClick={() => handleDecreaseQty(item.id)} className="p-1.5 hover:bg-slate-200"><Minus className="w-3.5 h-3.5" /></button>
                      <span className="px-3 font-mono font-bold text-xs">{item.quantity}</span>
                      <button type="button" disabled={isViewer} onClick={() => handleIncreaseQty(item.id)} className="p-1.5 hover:bg-slate-200"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="font-mono font-bold text-slate-900 text-right w-24">{formatBRL(item.totalPrice)}</div>
                    {!isViewer && (
                      <button type="button" onClick={() => handleRemoveItem(item.id)} className="p-1.5 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ADICIONAR NOVO PRODUTO */}
          {!isViewer && (
            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-3">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-amber-600" /> Adicionar Produto ao Pedido</h4>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                <div className="sm:col-span-6">
                  <label className="block text-slate-700 font-semibold mb-1">Produto Principal</label>
                  <GroupedProductSelect
                    products={mainCatalogProducts}
                    value={selectedProductId}
                    disabled={isViewer}
                    onChange={setSelectedProductId}
                    className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 bg-white font-medium text-slate-900"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-slate-700 font-semibold mb-1">Qtd</label>
                  <input type="number" min="1" value={addQuantity} onChange={(e) => setAddQuantity(Math.max(1, parseInt(e.target.value) || 1))} className="w-full text-xs py-2 px-2 rounded-xl border border-slate-300 bg-white font-mono font-bold text-center" />
                </div>
                <div className="sm:col-span-3">
                  <button type="button" onClick={handleAddCatalogProduct} className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-2xs flex items-center justify-center gap-1">
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Incluir
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SEÇÃO DE FRETE COMPLETO NA EDIÇÃO */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/90 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-200/70 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700">
                  <Truck className="w-3.5 h-3.5" />
                </div>
                <span className="font-semibold text-slate-800 uppercase tracking-wider text-[11px]">Frete, Valor Cobrado & Transportadora</span>
              </div>
              <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-white border-slate-200 cursor-pointer select-none">
                <input type="checkbox" disabled={isViewer} checked={isFreeShipping} onChange={(e) => { setIsFreeShipping(e.target.checked); if(e.target.checked) setShippingCharged(0); }} className="w-4 h-4 rounded text-amber-600" />
                <span className="text-xs font-bold text-slate-900">Frete Grátis</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 font-medium text-xs mb-1">Frete Cobrado (R$) *</label>
                <input type="number" step="0.01" min="0" disabled={isFreeShipping || isViewer} value={isFreeShipping ? 0 : shippingCharged} onChange={(e) => setShippingCharged(e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono font-bold text-xs" />
              </div>
              <div>
                <label className="block text-slate-700 font-medium text-xs mb-1">Frete Cotado (R$) *</label>
                <input type="number" step="0.01" min="0" disabled={isViewer} value={shippingPaid} onChange={(e) => setShippingPaid(e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono font-bold text-xs" />
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Sobra do Frete</span>
                <span className={`font-mono text-base font-bold ${shippingSurplus >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {shippingSurplus >= 0 ? `+${formatBRL(shippingSurplus)}` : formatBRL(shippingSurplus)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-slate-700 font-medium text-xs mb-1">Plataforma de Envio *</label>
                <select value={shippingPlatform} disabled={isViewer} onChange={(e) => setShippingPlatform(e.target.value as ShippingPlatform)} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs">
                  <option value="Melhor Envio">Melhor Envio</option>
                  <option value="Frenet">Frenet</option>
                  <option value="SuperFrete">SuperFrete</option>
                  <option value="Contrato Correios">Contrato Correios</option>
                  <option value="Outra">Outra</option>
                </select>
                {shippingPlatform === 'Outra' && (
                  <input type="text" placeholder="Nome da plataforma..." value={customShippingPlatform} onChange={(e) => setCustomShippingPlatform(e.target.value)} className="mt-1.5 w-full px-2 py-1 rounded border border-amber-300 text-xs" />
                )}
              </div>
              <div>
                <label className="block text-slate-700 font-medium text-xs mb-1">Transportadora *</label>
                <select value={carrier} disabled={isViewer} onChange={(e) => setCarrier(e.target.value as ShippingCarrier)} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs">
                  <option value="Correios PAC">Correios PAC</option>
                  <option value="Correios SEDEX">Correios SEDEX</option>
                  <option value="Loggi">Loggi</option>
                  <option value="Jadlog">Jadlog</option>
                  <option value="Transportadora J&T Express">Transportadora J&T Express</option>
                  <option value="Outra">Outra</option>
                </select>
                {carrier === 'Outra' && (
                  <input type="text" placeholder="Nome da transportadora..." value={customCarrier} onChange={(e) => setCustomCarrier(e.target.value)} className="mt-1.5 w-full px-2 py-1 rounded border border-amber-300 text-xs" />
                )}
              </div>
              <div>
                <label className="block text-slate-700 font-medium text-xs mb-1">Código de Rastreio</label>
                <input type="text" disabled={isViewer} placeholder="Ex: JD123456789BR" value={trackingCode} onChange={(e) => setTrackingCode(e.target.value.toUpperCase())} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-xs uppercase" />
              </div>
            </div>
          </div>

          {/* RESUMO FINANCEIRO & FORMA DE PAGAMENTO */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3.5">
            <span className="font-semibold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Fechamento & Pagamento
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-amber-100/70 p-3.5 rounded-xl border border-amber-300 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-950 block">Novo Valor Total Pago</span>
                  <span className="text-[11px] text-amber-900">Subtotal + Frete</span>
                </div>
                <span className="font-mono text-xl font-bold text-slate-950">{formatBRL(newSaleValue)}</span>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1 text-xs">Forma de Pagamento *</label>
                <select value={paymentMethod} disabled={isViewer} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white font-semibold text-xs">
                  <option value="pix">PIX (À vista - 0% taxa)</option>
                  <option value="transferencia">Transferência Bancária (0% taxa)</option>
                  <option value="boleto">Boleto Bancário (0% taxa)</option>
                  <option value="credito_1x">Cartão de Crédito 1x</option>
                  <option value="credito_2x">Cartão de Crédito 2x</option>
                  <option value="credito_3x">Cartão de Crédito 3x</option>
                </select>
              </div>
            </div>

            {/* Painel de Lucro Real */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex justify-between items-center">
              <span>Lucro Líquido Real Estimado:</span>
              <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                {formatBRL(estimatedProfit)} ({formatPercent(estimatedMargin)})
              </span>
            </div>
          </div>

        </div>

        {/* RODAPÉ */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-200 bg-slate-50/90 flex items-center justify-end gap-2.5">
          <button type="button" onClick={onClose} className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">Cancelar</button>
          <button type="button" disabled={isViewer || items.length === 0} onClick={handleSave} className="px-5 py-2.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Salvar Alterações no Pedido
          </button>
        </div>
      </div>
    </div>
  );
};
