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
  Tag, 
  Eye, 
  Layers,
  ArrowRight,
  TrendingUp,
  Receipt
} from 'lucide-react';
import { 
  Order, 
  OrderItem, 
  Product, 
  ProductCategory, 
  PaymentMethod, 
  PAYMENT_LABELS, 
  PAYMENT_STATUS_CONFIG, 
  UserRole,
  sortProductsHierarchically
} from '../types/erp';
import { formatBRL } from '../utils/formatters';
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
  const [selectedExtraProductId, setSelectedExtraProductId] = useState<string>(''); // "" significa "Nenhum"
  const [itemObservacao, setItemObservacao] = useState<string>('');
  const [addQuantity, setAddQuantity] = useState<number>(1);
  const [customPriceOverride, setCustomPriceOverride] = useState<number | ''>('');

  // Modo para adicionar produto personalizado (fora do catálogo)
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [customModel, setCustomModel] = useState<string>('');
  const [customCode, setCustomCode] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<ProductCategory>('Terços');
  const [customSalePrice, setCustomSalePrice] = useState<number | ''>('');
  const [customCostPrice, setCustomCostPrice] = useState<number | ''>('');

  // Status de Pagamento e Detalhe da Diferença
  const [paymentStatus, setPaymentStatus] = useState<string>('pago');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [paymentNote, setPaymentNote] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Produtos ordenados conforme a hierarquia do Ateliê
  const sortedProducts = useMemo(() => {
    return [...products].sort(sortProductsHierarchically);
  }, [products]);

  // Produtos principais (excluindo categoria Extras para o select de produto principal)
  const mainCatalogProducts = useMemo(() => {
    return sortedProducts.filter((p) => p.category !== 'Extras');
  }, [sortedProducts]);

  // Lista exclusiva de Adicionais / Extras (onde categoria === "Extras")
  const extraProducts = useMemo(() => {
    return sortedProducts.filter((p) => p.category === 'Extras');
  }, [sortedProducts]);

  // Carregar dados do pedido ao abrir o modal
  useEffect(() => {
    if (order && isOpen) {
      if (order.items && order.items.length > 0) {
        setItems(JSON.parse(JSON.stringify(order.items)));
      } else {
        // Fallback para pedidos antigos salvos sem array estruturado de itens
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

      setPaymentStatus(order.paymentStatus || 'pago');
      setPaymentMethod(order.paymentMethod || 'pix');
      setPaymentNote(order.paymentNote || '');
      setErrorMessage(null);
      setSelectedExtraProductId('');
      setItemObservacao('');

      // Default product selection
      if (mainCatalogProducts.length > 0) {
        setSelectedProductId(mainCatalogProducts[0].id);
        setCustomPriceOverride(mainCatalogProducts[0].salePrice);
      }
    }
  }, [order, isOpen, mainCatalogProducts]);

  if (!isOpen || !order) return null;

  // Valor original pago pelo cliente (mantido como referência de ancoragem)
  const originalSaleValue = order.originalSaleValue ?? order.saleValue;

  // Cálculos matemáticos em tempo real
  const newSubtotal = items.reduce((acc, it) => acc + it.totalPrice, 0);
  const newProductionCost = items.reduce((acc, it) => acc + it.totalCost, 0);
  const discountPercent = order.discountPercent || 0;
  const discountValue = (newSubtotal * discountPercent) / 100;
  const shippingCharged = order.shippingCharged || 0;
  const newSaleValue = Math.max(0, (newSubtotal - discountValue) + shippingCharged);

  // Valor adicional ou crédito gerado pela alteração
  const additionalValue = newSaleValue - originalSaleValue;

  // Manipulação de Itens
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

  // Adicionar item do catálogo com suporte a Item Extra / Upsell
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

    // Se houver adição de valor e o status era 'pago', sugerir automaticamente 'aguardando_diferenca'
    if (unitPrice * addQuantity > 0 && paymentStatus === 'pago') {
      setPaymentStatus('aguardando_diferenca');
      if (!paymentNote) {
        setPaymentNote(`Item ${modelName} adicionado ao pedido.`);
      }
    }
  };

  // Adicionar item avulso/customizado
  const handleAddCustomPiece = () => {
    if (isViewer) return;
    if (!customModel.trim()) {
      setErrorMessage('Informe o nome ou modelo da peça avulsa.');
      return;
    }

    const price = typeof customSalePrice === 'number' ? Math.max(0, customSalePrice) : 0;
    const cost = typeof customCostPrice === 'number' ? Math.max(0, customCostPrice) : 0;

    const newItem: OrderItem = {
      id: `custom-${Date.now()}`,
      code: customCode.trim().toUpperCase() || 'AVULSO',
      category: customCategory,
      model: customModel.trim(),
      quantity: addQuantity,
      unitPrice: price,
      costPrice: cost,
      totalPrice: price * addQuantity,
      totalCost: cost * addQuantity,
      observacao: itemObservacao.trim() || undefined,
    };

    setItems((prev) => [...prev, newItem]);
    setCustomModel('');
    setCustomCode('');
    setCustomSalePrice('');
    setCustomCostPrice('');
    setAddQuantity(1);
    setItemObservacao('');
    setIsCustomMode(false);
    setErrorMessage(null);

    if (price * addQuantity > 0 && paymentStatus === 'pago') {
      setPaymentStatus('aguardando_diferenca');
    }
  };

  // Salvar alterações e persistir no pedido
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

    const historyNote = additionalValue > 0
      ? `Itens adicionados ao pedido. Valor ajustado de ${formatBRL(originalSaleValue)} para ${formatBRL(newSaleValue)} (+${formatBRL(additionalValue)}). Status: ${paymentStatus}.`
      : additionalValue < 0
      ? `Itens removidos do pedido. Valor ajustado de ${formatBRL(originalSaleValue)} para ${formatBRL(newSaleValue)} (${formatBRL(additionalValue)}). Status: ${paymentStatus}.`
      : `Itens do pedido atualizados sem variação no total.`;

    const updatedOrder: Order = {
      ...order,
      items,
      item: summaryItems,
      itemModel: firstModel,
      subtotal: newSubtotal,
      discount: discountValue,
      saleValue: newSaleValue,
      productionCost: newProductionCost,
      originalSaleValue,
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
        {/* ======================================================== */}
        {/* CABEÇALHO DO MODAL: Número do Pedido & Nome do Cliente   */}
        {/* ======================================================== */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 font-mono font-bold text-xs shrink-0">
              <ShoppingBag className="w-5 h-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                  Pedido #{order.id}
                </span>
                {order.codigoCliente && (
                  <span className="inline-flex items-center gap-1 font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs" title="Código de Rastreio do Cliente">
                    <Sparkles className="w-3 h-3 text-indigo-500" />
                    {order.codigoCliente}
                  </span>
                )}
                <span className="text-xs font-semibold text-slate-800 truncate">
                  {order.clientName}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                {order.clientCity}/{order.clientState} · Cadastrado em {order.createdAt} · Envio via {order.carrier || 'Correios'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ======================================================== */}
        {/* CORPO DO FORMULÁRIO SCROLLÁVEL                           */}
        {/* ======================================================== */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs">
          {/* Alerta de Modo Visualizador */}
          {isViewer && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-950 flex items-center gap-2.5 text-xs font-medium">
              <Eye className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Modo Visualizador:</strong> Edição bloqueada para o seu perfil. Você pode consultar os itens e a composição financeira deste pedido.
              </span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/* SEÇÃO 1: LISTA ATUAL DE PRODUTOS DO PEDIDO               */}
          {/* -------------------------------------------------------- */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                  Produtos no Pedido ({items.length})
                </h3>
              </div>
              <span className="text-[11px] text-slate-500">
                Altere quantidades ou remova itens
              </span>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 shadow-2xs">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3.5 bg-white hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {item.code && (
                        <span className="font-mono font-bold text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-900 border border-amber-200">
                          {item.code}
                        </span>
                      )}
                      <span className="font-semibold text-slate-900">
                        {item.model}
                      </span>
                      {item.subCategory && (
                        <span className="text-[10px] text-slate-500">
                          ({item.subCategory})
                        </span>
                      )}
                    </div>
                    {item.observacao && (
                      <p className="text-xs text-gray-500 italic mt-0.5">
                        Obs: {item.observacao}
                      </p>
                    )}
                    <div className="text-[11px] text-slate-500">
                      Preço Unitário: <span className="font-mono font-medium text-slate-800">{formatBRL(item.unitPrice)}</span>
                      {item.costPrice > 0 && (
                        <span className="text-slate-400 ml-2">· Custo: {formatBRL(item.costPrice)}</span>
                      )}
                    </div>
                  </div>

                  {/* Controles de Quantidade & Subtotal */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <div className="flex items-center border border-slate-200 bg-slate-50 rounded-lg overflow-hidden shadow-2xs">
                      <button
                        type="button"
                        disabled={isViewer || item.quantity <= 1}
                        onClick={() => handleDecreaseQty(item.id)}
                        className="p-1.5 text-slate-500 hover:bg-slate-200/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title="Diminuir quantidade"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 font-mono font-bold text-xs text-slate-900">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        disabled={isViewer}
                        onClick={() => handleIncreaseQty(item.id)}
                        className="p-1.5 text-slate-500 hover:bg-slate-200/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title="Aumentar quantidade"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-right w-24">
                      <div className="font-mono font-bold text-slate-900 text-xs sm:text-sm tabular-nums">
                        {formatBRL(item.totalPrice)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {item.quantity}x {formatBRL(item.unitPrice)}
                      </div>
                    </div>

                    {!isViewer && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Remover este item do pedido"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* -------------------------------------------------------- */}
          {/* SEÇÃO 2: ADICIONAR NOVO PRODUTO AO PEDIDO                */}
          {/* -------------------------------------------------------- */}
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                  Adicionar Novo Produto ao Pedido
                </h4>
              </div>
              <button
                type="button"
                disabled={isViewer}
                onClick={() => setIsCustomMode((prev) => !prev)}
                className="text-xs font-semibold text-amber-800 hover:text-amber-900 underline cursor-pointer"
              >
                {isCustomMode ? '← Selecionar do Catálogo' : '+ Peça Avulsa / Customizada'}
              </button>
            </div>

            {!isCustomMode ? (
              /* Seleção por Catálogo com Adicional / Extra */
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                <div className="sm:col-span-5">
                  <label className="block text-slate-700 font-semibold mb-1">
                    Produto Principal
                  </label>
                  <GroupedProductSelect
                    products={mainCatalogProducts}
                    value={selectedProductId}
                    disabled={isViewer}
                    onChange={(newId) => {
                      setSelectedProductId(newId);
                      const p = mainCatalogProducts.find((x) => x.id === newId);
                      if (p) setCustomPriceOverride(p.salePrice);
                    }}
                    className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs cursor-pointer"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-slate-700 font-semibold mb-1 flex items-center justify-between">
                    <span>Adicional / Extra</span>
                    {selectedExtraProductId && (
                      <span className="text-[10px] text-amber-700 font-mono font-bold">
                        +{formatBRL(extraProducts.find((x) => x.id === selectedExtraProductId)?.salePrice || 0)}
                      </span>
                    )}
                  </label>
                  <select
                    value={selectedExtraProductId}
                    disabled={isViewer}
                    onChange={(e) => setSelectedExtraProductId(e.target.value)}
                    className="w-full text-xs py-2 px-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs cursor-pointer"
                  >
                    <option value="">Nenhum (+ R$ 0,00)</option>
                    {extraProducts.map((extra) => (
                      <option key={extra.id} value={extra.id}>
                        + {extra.model} (+{formatBRL(extra.salePrice)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-slate-700 font-semibold mb-1 text-center">
                    Qtd
                  </label>
                  <input
                    type="number"
                    min="1"
                    disabled={isViewer}
                    value={addQuantity}
                    onChange={(e) => setAddQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full text-xs py-2 px-1 rounded-xl border border-slate-300 bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs text-center"
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="button"
                    disabled={isViewer}
                    onClick={handleAddCatalogProduct}
                    className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-40 text-slate-950 font-bold text-xs transition-colors shadow-2xs flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Incluir</span>
                  </button>
                </div>

                {/* Campo de Observação / Personalização (Opcional) */}
                <div className="sm:col-span-12 pt-1">
                  <label className="block text-slate-700 font-semibold mb-1 flex items-center justify-between">
                    <span>Observação / Personalização (Opcional)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Instruções para o ateliê artesanal</span>
                  </label>
                  <input
                    type="text"
                    disabled={isViewer}
                    value={itemObservacao}
                    onChange={(e) => setItemObservacao(e.target.value)}
                    placeholder="Ex: Trocar corda preta por azul..."
                    className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            ) : (
              /* Adicionar Peça Avulsa / Customizada */
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 font-semibold mb-1">
                      Modelo / Descrição da Peça *
                    </label>
                    <input
                      type="text"
                      disabled={isViewer}
                      placeholder="Ex: Dezena Personalizada São Bento em Dourado"
                      value={customModel}
                      onChange={(e) => setCustomModel(e.target.value)}
                      className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Código
                    </label>
                    <input
                      type="text"
                      disabled={isViewer}
                      placeholder="Ex: TC-AVULSO"
                      value={customCode}
                      onChange={(e) => setCustomCode(e.target.value)}
                      className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 bg-white font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Preço de Venda (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      disabled={isViewer}
                      placeholder="0.00"
                      value={customSalePrice}
                      onChange={(e) => setCustomSalePrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 bg-white font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Preço de Custo (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      disabled={isViewer}
                      placeholder="0.00"
                      value={customCostPrice}
                      onChange={(e) => setCustomCostPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 bg-white font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      disabled={isViewer}
                      onClick={handleAddCustomPiece}
                      className="w-full py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-40 text-slate-950 font-bold text-xs transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>Inserir Peça Avulsa</span>
                    </button>
                  </div>
                </div>

                {/* Campo de Observação na Peça Customizada */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-1 flex items-center justify-between">
                    <span>Observação / Personalização (Opcional)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Instruções para o ateliê artesanal</span>
                  </label>
                  <input
                    type="text"
                    disabled={isViewer}
                    value={itemObservacao}
                    onChange={(e) => setItemObservacao(e.target.value)}
                    placeholder="Ex: Trocar corda preta por azul..."
                    className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            )}
          </div>

          {/* -------------------------------------------------------- */}
          {/* SEÇÃO 3: RESUMO FINANCEIRO ATUALIZADO EM TEMPO REAL      */}
          {/* -------------------------------------------------------- */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200/70 pb-2">
              <Receipt className="w-4 h-4 text-emerald-700" />
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                Resumo Financeiro da Alteração (Tempo Real)
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Card 1: Valor Original */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-500 block">
                  Valor Original Pago
                </span>
                <span className="text-lg font-bold font-mono text-slate-800 block mt-1">
                  {formatBRL(originalSaleValue)}
                </span>
                <span className="text-[10px] text-slate-400">
                  Referência inicial do pedido
                </span>
              </div>

              {/* Card 2: Valor Adicional (Diferença) */}
              <div className={`p-3.5 rounded-xl border shadow-2xs ${
                additionalValue > 0
                  ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                  : additionalValue < 0
                  ? 'bg-rose-50/80 border-rose-300 text-rose-950'
                  : 'bg-white border-slate-200 text-slate-800'
              }`}>
                <span className="text-[11px] font-semibold block">
                  Valor Adicional (Diferença)
                </span>
                <span className={`text-lg font-bold font-mono block mt-1 ${
                  additionalValue > 0
                    ? 'text-amber-800'
                    : additionalValue < 0
                    ? 'text-rose-700'
                    : 'text-slate-800'
                }`}>
                  {additionalValue > 0
                    ? `+ ${formatBRL(additionalValue)}`
                    : additionalValue < 0
                    ? `- ${formatBRL(Math.abs(additionalValue))}`
                    : 'R$ 0,00'}
                </span>
                <span className="text-[10px] font-medium">
                  {additionalValue > 0
                    ? 'Cobrar diferença do cliente'
                    : additionalValue < 0
                    ? 'Crédito ou estorno gerado'
                    : 'Sem acréscimo de valor'}
                </span>
              </div>

              {/* Card 3: Novo Valor Total */}
              <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-300 shadow-2xs">
                <span className="text-[11px] font-semibold text-emerald-950 block">
                  Novo Valor Total
                </span>
                <span className="text-lg font-bold font-mono text-emerald-800 block mt-1">
                  {formatBRL(newSaleValue)}
                </span>
                <span className="text-[10px] text-emerald-700 font-mono">
                  Subtotal: {formatBRL(newSubtotal)} + Frete: {formatBRL(shippingCharged)}
                </span>
              </div>
            </div>
          </div>

          {/* -------------------------------------------------------- */}
          {/* SEÇÃO 4: STATUS DO PAGAMENTO & PENDÊNCIA DE DIFERENÇA    */}
          {/* -------------------------------------------------------- */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-600" />
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                  Status do Pagamento & Pendências
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">
                Acompanhe a quitação dos novos itens
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Select do Status do Pagamento */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Status do Pagamento *
                </label>
                <select
                  disabled={isViewer}
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                >
                  <option value="pago">Pago Integralmente (Sem pendências)</option>
                  <option value="aguardando_diferenca">Aguardando Pagamento da Diferença (Ex: Pix)</option>
                  <option value="diferenca_paga">Diferença Paga (Itens adicionais quitados)</option>
                  <option value="pendente">Pagamento Pendente</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Altera a situação financeira operacional
                </span>
              </div>

              {/* Forma de Pagamento da Diferença / Principal */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Forma de Pagamento
                </label>
                <select
                  disabled={isViewer}
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                >
                  {Object.entries(PAYMENT_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Meio utilizado para liquidação
                </span>
              </div>

              {/* Detalhe / Observação Financeira */}
              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">
                  Observações Financeiras / Cobrança da Diferença
                </label>
                <input
                  type="text"
                  disabled={isViewer}
                  placeholder="Ex: Cliente solicitou inclusão de 1 Dezena. Enviada chave Pix no WhatsApp para quitação de R$ 85,00."
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RODAPÉ DE AÇÕES                                          */}
        {/* ======================================================== */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-200 bg-slate-50/90 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500">
            {additionalValue !== 0 && (
              <span>
                Variação: <strong className={additionalValue > 0 ? 'text-amber-800' : 'text-rose-700'}>
                  {additionalValue > 0 ? `+${formatBRL(additionalValue)}` : formatBRL(additionalValue)}
                </strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isViewer || items.length === 0}
              onClick={handleSave}
              className="px-5 py-2.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>Salvar Alterações no Pedido</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
