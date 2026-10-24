import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  UserCheck, 
  Sparkles, 
  DollarSign, 
  Truck, 
  CreditCard,
  Building,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Hash,
  MapPin,
  User,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Tag,
  Package,
  Eye
} from 'lucide-react';
import { 
  Order, 
  Client, 
  Product, 
  OrderItem, 
  PaymentMethod, 
  OrderStatus, 
  ProductCategory, 
  ProductSubCategory,
  sortProductsHierarchically,
  ShippingPlatform,
  ShippingCarrier,
  PAYMENT_FACTORS, 
  PAYMENT_LABELS,
  UserRole
} from '../types/erp';
import { 
  formatBRL, 
  formatFactor, 
  formatPercent,
  calculateNextOrderId, 
  getTodayDateFormatted,
  maskCEP,
  gerarCodigoCliente
} from '../utils/formatters';
import { GroupedProductSelect } from './GroupedProductSelect';

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddOrder: (newOrder: Order) => void;
  clients: Client[];
  onAddClient?: (newClient: Client) => void;
  products: Product[];
  onAddProduct: (newProduct: Product) => void;
  orders: Order[];
  userRole?: UserRole;
  initialData?: {
    clientId?: string;
    items?: OrderItem[];
    shippingCharged?: number;
    shippingPaid?: number;
    carrier?: ShippingCarrier;
    customCarrier?: string;
    shippingPlatform?: ShippingPlatform;
    customShippingPlatform?: string;
    plataformaSelecionada?: string;
    transportadoraSelecionada?: string;
    paymentMethod?: PaymentMethod;
    notes?: string;
  } | null;
}

const CATEGORIES: ProductCategory[] = [
  'Terços',
  'Dezenas',
  'Terço de Carro',
  'Pulseira',
  'Chaveiro',
  'Outro',
];

const SUBCATEGORIES: ProductSubCategory[] = [
  'Linha Raízes',
  'Linha Fidelis',
  'Personalizados',
  'Outro',
];

export const NewOrderModal: React.FC<NewOrderModalProps> = ({
  isOpen,
  onClose,
  onAddOrder,
  clients,
  onAddClient,
  products,
  onAddProduct,
  orders,
  userRole,
  initialData,
}) => {
  const isViewer = userRole === 'viewer';

  // Cabeçalho inteligente: Data do Pedido e Número do Pedido (formato XXXYYZZ)
  const [orderDate, setOrderDate] = useState<string>(getTodayDateFormatted());
  const [orderId, setOrderId] = useState<string>('');
  const [isManualOrderId, setIsManualOrderId] = useState<boolean>(false);

  // Seleção de cliente cadastrado
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  // Endereço para Entrega
  const [deliveryAddressType, setDeliveryAddressType] = useState<'same' | 'custom'>('same');
  const [customRecipientName, setCustomRecipientName] = useState('');
  const [customDeliveryAddress, setCustomDeliveryAddress] = useState('');
  const [customDeliveryCity, setCustomDeliveryCity] = useState('');
  const [customDeliveryState, setCustomDeliveryState] = useState('SP');
  const [customDeliveryCep, setCustomDeliveryCep] = useState('');

  // Carrinho de Compras / Múltiplos Itens (com Snapshot de Preços)
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [selectedCatalogProductId, setSelectedCatalogProductId] = useState<string>('');
  const [selectedExtraProductId, setSelectedExtraProductId] = useState<string>(''); // "" significa "Nenhum"
  const [addItemObservacao, setAddItemObservacao] = useState<string>('');
  const [addItemQty, setAddItemQty] = useState<number>(1);
  const [showItemPicker, setShowItemPicker] = useState<boolean>(false);

  // Modal / formulário rápido para cadastrar novo produto na hora
  const [isQuickProductModalOpen, setIsQuickProductModalOpen] = useState(false);
  const [quickCode, setQuickCode] = useState('');
  const [quickCategory, setQuickCategory] = useState<ProductCategory>('Terços');
  const [quickSubCategory, setQuickSubCategory] = useState<string>('Linha Raízes');
  const [quickCustomLine, setQuickCustomLine] = useState<string>('');
  const [quickModel, setQuickModel] = useState('');
  const [quickCostPrice, setQuickCostPrice] = useState<number | ''>(45);
  const [quickSalePrice, setQuickSalePrice] = useState<number | ''>(160);
  const [quickProductError, setQuickProductError] = useState<string | null>(null);

  // Fechamento Financeiro e Frete
  const [discountPercent, setDiscountPercent] = useState<number | ''>(0);
  const [isFreeShipping, setIsFreeShipping] = useState<boolean>(false);
  const [shippingCharged, setShippingCharged] = useState<number | ''>(22);
  const [shippingPaid, setShippingPaid] = useState<number | ''>(22);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');

  // Dados operacionais de logística e envio
  const [shippingPlatform, setShippingPlatform] = useState<ShippingPlatform>('Melhor Envio');
  const [customShippingPlatform, setCustomShippingPlatform] = useState<string>('');
  const [carrier, setCarrier] = useState<ShippingCarrier>('Correios PAC');
  const [customCarrier, setCustomCarrier] = useState<string>('');
  const [trackingCode, setTrackingCode] = useState<string>('');

  // Error validation message
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Lista de clientes ordenada sempre em ordem alfabética (A-Z)
  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
  }, [clients]);

  // Produtos ordenados e agrupados rigorosamente (Categoria A-Z -> LINHA A-Z -> Modelo A-Z)
  const sortedProducts = useMemo(() => {
    return [...products].sort(sortProductsHierarchically);
  }, [products]);

  // Produtos principais para o select de produto (exclui categoria "Extras")
  const mainCatalogProducts = useMemo(() => {
    return sortedProducts.filter((p) => p.category !== 'Extras');
  }, [sortedProducts]);

  // Lista exclusiva de Itens Extras / Upsell (onde categoria === "Extras")
  const extraProducts = useMemo(() => {
    return sortedProducts.filter((p) => p.category === 'Extras');
  }, [sortedProducts]);

  // Lista de categorias distintas de produtos (preservando ordenação alfabética da hierarquia)
  const productCategories = useMemo(() => {
    return Array.from(new Set(sortedProducts.map((p) => p.category)));
  }, [sortedProducts]);

  const currentSelectedClient = clients.find((c) => c.id === selectedClientId);

  // Inicialização inteligente do modal
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        if (initialData.clientId) {
          setSelectedClientId(initialData.clientId);
        }
        if (initialData.items && initialData.items.length > 0) {
          setCartItems(initialData.items);
        }
        if (typeof initialData.shippingCharged === 'number') {
          setShippingCharged(initialData.shippingCharged);
        }
        if (typeof initialData.shippingPaid === 'number') {
          setShippingPaid(initialData.shippingPaid);
        } else if (typeof initialData.shippingCharged === 'number') {
          setShippingPaid(initialData.shippingCharged);
        }
        // Binding da Plataforma de Envio (plataformaSelecionada ou shippingPlatform)
        const plat = initialData.plataformaSelecionada || initialData.shippingPlatform || '';
        if (plat) {
          const pLower = plat.toLowerCase();
          if (pLower.includes('melhor envio')) {
            setShippingPlatform('Melhor Envio');
            setCustomShippingPlatform('');
          } else if (pLower.includes('frenet')) {
            setShippingPlatform('Frenet');
            setCustomShippingPlatform('');
          } else if (pLower.includes('superfrete') || pLower.includes('super frete')) {
            setShippingPlatform('SuperFrete');
            setCustomShippingPlatform('');
          } else if (pLower.includes('correios')) {
            setShippingPlatform('Contrato Correios');
            setCustomShippingPlatform('');
          } else if (plat === 'Outra') {
            setShippingPlatform('Outra');
            if (initialData.customShippingPlatform) {
              setCustomShippingPlatform(initialData.customShippingPlatform);
            }
          } else {
            setShippingPlatform('Outra');
            setCustomShippingPlatform(plat);
          }
        }

        // Binding da Transportadora (transportadoraSelecionada ou carrier)
        const transp = initialData.transportadoraSelecionada || initialData.carrier || '';
        if (transp) {
          const tLower = transp.toLowerCase();
          if (tLower.includes('sedex')) {
            setCarrier('Correios SEDEX');
            setCustomCarrier('');
          } else if (tLower.includes('pac')) {
            setCarrier('Correios PAC');
            setCustomCarrier('');
          } else if (tLower.includes('jadlog')) {
            setCarrier('Jadlog');
            setCustomCarrier('');
          } else if (tLower === 'loggi' || tLower.includes('loggi')) {
            setCarrier('Loggi');
            setCustomCarrier('');
          } else if (tLower.includes('j&t') || tLower.includes('jt')) {
            setCarrier('Transportadora J&T Express');
            setCustomCarrier('');
          } else if (transp === 'Outra') {
            setCarrier('Outra');
            if (initialData.customCarrier) {
              setCustomCarrier(initialData.customCarrier);
            }
          } else {
            setCarrier('Outra');
            setCustomCarrier(transp);
          }
        }

        if (initialData.paymentMethod) {
          setPaymentMethod(initialData.paymentMethod);
        }
      } else {
        if (sortedClients.length > 0 && !selectedClientId) {
          setSelectedClientId(sortedClients[0].id);
        }
      }

      if (!orderDate) {
        const today = getTodayDateFormatted();
        setOrderDate(today);
        setOrderId(calculateNextOrderId(today, orders));
      } else if (!isManualOrderId) {
        setOrderId(calculateNextOrderId(orderDate, orders));
      }

      if (mainCatalogProducts.length > 0 && !selectedCatalogProductId) {
        setSelectedCatalogProductId(mainCatalogProducts[0].id);
      }
    }
  }, [isOpen, initialData, orderDate, orders, isManualOrderId, clients, selectedClientId, mainCatalogProducts, selectedCatalogProductId]);

  // Sincroniza o nome do recebedor padrão no modo endereço customizado
  useEffect(() => {
    if (deliveryAddressType === 'custom' && !customRecipientName) {
      const defaultName = currentSelectedClient?.name || '';
      if (defaultName) {
        setCustomRecipientName(defaultName);
      }
    }
  }, [deliveryAddressType, currentSelectedClient, customRecipientName]);

  // Alteração de data recalcula sequencial do pedido
  const handleDateChange = (val: string) => {
    setOrderDate(val);
    const nextSeq = calculateNextOrderId(val, orders);
    setOrderId(nextSeq);
    setIsManualOrderId(false);
  };

  // Funções de manipulação do carrinho de múltiplos itens (com suporte dinâmico a Extras e Observação)
  const handleAddProductToCart = (product: Product, quantityToAdd: number, extraId?: string, observacao?: string) => {
    const qty = Math.max(1, quantityToAdd);
    const extra = extraProducts.find((p) => p.id === extraId);
    const extraPrice = extra ? extra.salePrice : 0;
    const extraCost = extra ? extra.costPrice : 0;

    const unitPrice = product.salePrice + extraPrice;
    const costPrice = product.costPrice + extraCost;
    const modelName = extra ? `${product.model} + ${extra.model}` : product.model;
    const cleanObs = (observacao || '').trim() || undefined;

    // Distingue itens com ou sem o mesmo extra e mesma observação no carrinho
    const existingIndex = cartItems.findIndex(
      (it) => it.productId === product.id && 
              it.extraProductId === (extra ? extra.id : undefined) &&
              it.observacao === cleanObs
    );

    if (existingIndex >= 0) {
      // Incrementa quantidade mantendo o snapshot já existente
      setCartItems((prev) =>
        prev.map((it, idx) => {
          if (idx === existingIndex) {
            const updatedQty = it.quantity + qty;
            return {
              ...it,
              quantity: updatedQty,
              totalPrice: updatedQty * it.unitPrice,
              totalCost: updatedQty * it.costPrice,
            };
          }
          return it;
        })
      );
    } else {
      // REGRA DE OURO: Salva snapshot de Preço de Custo e de Venda somando o Extra e Observação dinamicamente
      const newItem: OrderItem = {
        id: `ITM-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: product.id,
        code: product.code,
        category: product.category,
        subCategory: product.subCategory,
        model: modelName,
        quantity: qty,
        costPrice,
        unitPrice,
        totalPrice: qty * unitPrice,
        totalCost: qty * costPrice,
        extraProductId: extra ? extra.id : undefined,
        extraName: extra ? extra.model : undefined,
        extraPrice,
        extraCost,
        observacao: cleanObs,
      };
      setCartItems((prev) => [...prev, newItem]);
    }
    setSelectedExtraProductId('');
    setAddItemObservacao('');
    setShowItemPicker(false);
  };

  const handleUpdateItemQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    setCartItems((prev) =>
      prev.map((it, idx) => {
        if (idx === index) {
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

  const handleRemoveItem = (index: number) => {
    setCartItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Cadastro rápido de novo produto pelo modal de pedido
  const handleSaveQuickProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setQuickProductError(null);

    if (!quickCode.trim()) {
      setQuickProductError('Informe o Código do produto.');
      return;
    }
    if (!quickModel.trim()) {
      setQuickProductError('Informe o Modelo do produto.');
      return;
    }
    const cost = typeof quickCostPrice === 'number' ? quickCostPrice : 0;
    const sale = typeof quickSalePrice === 'number' ? quickSalePrice : 0;
    if (sale <= 0) {
      setQuickProductError('O Preço de Venda deve ser maior que zero.');
      return;
    }

    let finalLine: string | undefined = undefined;
    if (quickCategory === 'Terços') {
      if (quickSubCategory === 'Nova Linha') {
        if (!quickCustomLine.trim()) {
          setQuickProductError('Informe o nome da Nova Linha.');
          return;
        }
        finalLine = quickCustomLine.trim();
      } else {
        finalLine = quickSubCategory;
      }
    }

    const newProd: Product = {
      id: `PRD-${Date.now().toString().slice(-4)}`,
      code: quickCode.trim().toUpperCase(),
      category: quickCategory,
      subCategory: finalLine,
      model: quickModel.trim(),
      costPrice: cost,
      salePrice: sale,
    };

    onAddProduct(newProd);
    // Adiciona direto ao pedido atual com snapshot
    handleAddProductToCart(newProd, 1);

    // Reset campos rápidos
    setIsQuickProductModalOpen(false);
    setQuickCode('');
    setQuickModel('');
    setQuickSubCategory('Linha Raízes');
    setQuickCustomLine('');
    setQuickCostPrice(45);
    setQuickSalePrice(160);
    setQuickProductError(null);
  };

  // Cálculos Financeiros Dinâmicos
  const subtotal = cartItems.reduce((acc, it) => acc + it.totalPrice, 0);
  const totalProductionCost = cartItems.reduce((acc, it) => acc + it.totalCost, 0);

  // Desconto em porcentagem (%) e valor calculado sobre o Subtotal
  const numDiscountPercent = typeof discountPercent === 'number' ? Math.max(0, Math.min(100, discountPercent)) : 0;
  const calculatedDiscount = (subtotal * numDiscountPercent) / 100;

  // Frete Cobrado (zerado automaticamente se Frete Grátis) e Frete Cotado
  const numShippingCharged = isFreeShipping ? 0 : (typeof shippingCharged === 'number' ? Math.max(0, shippingCharged) : 0);
  const numShippingPaid = typeof shippingPaid === 'number' ? Math.max(0, shippingPaid) : 0;

  // Valor Total Pago (o que o cliente paga) = (Subtotal de Venda - Valor do Desconto em %) + Frete Cobrado
  const saleValue = Math.max(0, (subtotal - calculatedDiscount) + numShippingCharged);

  const factor = PAYMENT_FACTORS[paymentMethod] ?? 1.0;
  const netProductSale = Math.max(0, subtotal - calculatedDiscount);
  const netPrice = netProductSale * factor;

  // A SOBRA DO FRETE = (Frete Cobrado - Frete Cotado)
  const shippingSurplus = numShippingCharged - numShippingPaid;

  // FÓRMULA EXATA DO LUCRO:
  // (Subtotal de Venda - Desconto Aplicado - Custo Total dos Produtos) + (Frete Cobrado - Frete Cotado)
  const productProfit = (subtotal - calculatedDiscount) - totalProductionCost;
  const estimatedProfit = productProfit + shippingSurplus;
  const estimatedMargin = saleValue > 0 ? (estimatedProfit / saleValue) * 100 : 0;

  const handleClose = () => {
    setErrorMessage(null);
    setShowItemPicker(false);
    setIsQuickProductModalOpen(false);
    setCartItems([]);
    onClose();
  };

  if (!isOpen) return null;

  const handleSaveOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validação da Data e Número do Pedido
    if (!orderDate.trim()) {
      setErrorMessage('Por favor, informe a Data do Pedido.');
      return;
    }

    if (!orderId.trim()) {
      setErrorMessage('Por favor, informe o Número do Pedido.');
      return;
    }

    // Validação de Itens no Carrinho
    if (cartItems.length === 0) {
      setErrorMessage('Nenhum item adicionado. Clique no botão acima para incluir produtos.');
      return;
    }

    if (!currentSelectedClient) {
      setErrorMessage('Por favor, selecione um cliente cadastrado.');
      return;
    }

    const clientName = currentSelectedClient.name;
    const clientCpf = currentSelectedClient.cpf;
    const clientEmail = currentSelectedClient.email;
    const clientPhone = currentSelectedClient.phone;
    const clientAddress = currentSelectedClient.address;
    const clientCity = currentSelectedClient.city;
    const clientState = currentSelectedClient.state;
    const clientCep = currentSelectedClient.cep || '';

    // Validação de Endereço de Entrega
    if (deliveryAddressType === 'custom') {
      if (!customRecipientName.trim()) {
        setErrorMessage('Por favor, informe o Nome do Recebedor na entrega.');
        return;
      }
      if (!customDeliveryAddress.trim()) {
        setErrorMessage('Por favor, informe o Endereço Completo de Entrega.');
        return;
      }
      if (!customDeliveryCity.trim()) {
        setErrorMessage('Por favor, informe a Cidade de Entrega.');
        return;
      }
    }

    const now = new Date();
    const timestamp = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const finalRecipient = deliveryAddressType === 'custom' ? customRecipientName.trim() : clientName;
    const finalDeliveryAddress = deliveryAddressType === 'custom' ? customDeliveryAddress.trim() : (clientAddress || '');
    const finalDeliveryCity = deliveryAddressType === 'custom' ? customDeliveryCity.trim() : clientCity;
    const finalDeliveryState = deliveryAddressType === 'custom' ? customDeliveryState.trim() : clientState;
    const finalDeliveryCep = deliveryAddressType === 'custom' ? customDeliveryCep.trim() : clientCep;

    // Resumo descritivo dos itens
    const totalItemsCount = cartItems.reduce((acc, it) => acc + it.quantity, 0);
    const summaryItem = cartItems.length === 1 
      ? cartItems[0].model 
      : `${totalItemsCount} Itens: ${cartItems.map((i) => `${i.quantity}x ${i.model}`).join(', ')}`;
    const summaryModel = cartItems.length === 1
      ? `${cartItems[0].category}${cartItems[0].subCategory ? ` · ${cartItems[0].subCategory}` : ''}`
      : `Múltiplos Itens (${cartItems.length} modelos, ${totalItemsCount} peças)`;

    const newOrder: Order = {
      id: orderId.trim(),
      codigoCliente: gerarCodigoCliente(),
      clientName,
      clientCpf,
      clientEmail,
      clientPhone,
      clientAddress,
      clientCity,
      clientState,
      clientCep,
      useCustomDeliveryAddress: deliveryAddressType === 'custom',
      recipientName: finalRecipient,
      deliveryAddress: finalDeliveryAddress,
      deliveryCity: finalDeliveryCity,
      deliveryState: finalDeliveryState,
      deliveryCep: finalDeliveryCep,
      items: cartItems, // Snapshot de todos os itens com preços congelados
      item: summaryItem,
      itemModel: summaryModel,
      subtotal,
      discountPercent: numDiscountPercent,
      discount: calculatedDiscount,
      isFreeShipping,
      saleValue, // Valor Total Pago: (Subtotal - Valor do Desconto em %) + Frete Cobrado
      shippingCharged: numShippingCharged,
      shippingPaid: numShippingPaid,
      productionCost: totalProductionCost,
      paymentMethod,
      status: 'em_producao',
      shippingPlatform: (shippingPlatform === 'Outra' ? (customShippingPlatform.trim() || 'Outra') : shippingPlatform) as ShippingPlatform,
      carrier: (carrier === 'Outra' ? (customCarrier.trim() || 'Outra') : carrier) as ShippingCarrier,
      trackingCode: trackingCode.trim() || undefined,
      createdAt: orderDate.trim(),
      notes: deliveryAddressType === 'custom' 
        ? `Entrega para ${finalRecipient} em ${finalDeliveryAddress}, ${finalDeliveryCity}/${finalDeliveryState}${finalDeliveryCep ? ` - CEP: ${finalDeliveryCep}` : ''}`
        : undefined,
      history: [
        {
          status: 'em_producao',
          timestamp,
          note: `Pedido registrado com ${cartItems.length} modelo(s) e ${totalItemsCount} item(ns) no Terçarium ERP (${carrier === 'Outra' ? customCarrier.trim() || 'Outra' : carrier} via ${shippingPlatform === 'Outra' ? customShippingPlatform.trim() || 'Outra' : shippingPlatform})`,
        },
      ],
    };

    onAddOrder(newOrder);

    // Reset formulário
    setCartItems([]);
    setDiscountPercent(0);
    setIsFreeShipping(false);
    setShippingCharged(22);
    setShippingPaid(22);
    setShippingPlatform('Melhor Envio');
    setCustomShippingPlatform('');
    setCarrier('Correios PAC');
    setCustomCarrier('');
    setTrackingCode('');
    setPaymentMethod('pix');
    setDeliveryAddressType('same');
    setCustomRecipientName('');
    setCustomDeliveryAddress('');
    setCustomDeliveryCity('');
    setCustomDeliveryState('SP');
    setCustomDeliveryCep('');
    setIsManualOrderId(false);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 transition-all"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header Bar */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Novo Pedido Terçarium
              </h3>
              <p className="text-xs text-slate-500">
                Múltiplos itens com snapshot de custos e numeração automática XXXYYZZ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSaveOrder} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
          {isViewer && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-950 flex items-center gap-2.5 text-xs font-medium">
              <Eye className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Modo Visualizador (Acesso de Leitura):</strong> Todos os campos, opções de inclusão e o salvamento estão bloqueados para o seu perfil. Você pode inspecionar toda a estrutura do pedido.
              </span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* CABEÇALHO DO MODAL: DATA DO PEDIDO E NÚMERO INTELIGENTE (LADO A LADO) */}
          <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                Data & Identificador Inteligente
              </span>
              <span className="text-[10px] font-mono text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded font-semibold border border-amber-200">
                Formato XXXYYZZ
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Data do Pedido */}
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Data do Pedido *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    disabled={isViewer}
                    placeholder="DD/MM/AAAA"
                    value={orderDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Hoje: {getTodayDateFormatted()} (editável)
                </span>
              </div>

              {/* Número do Pedido */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 font-medium">
                    Número do Pedido *
                  </label>
                  <button
                    type="button"
                    disabled={isViewer}
                    onClick={() => {
                      const next = calculateNextOrderId(orderDate, orders);
                      setOrderId(next);
                      setIsManualOrderId(false);
                    }}
                    className="text-[10px] text-amber-700 hover:underline font-mono cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Recalcular sequencial automaticamente"
                  >
                    Recalcular
                  </button>
                </div>
                <div className="relative">
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    disabled={isViewer}
                    placeholder="0011026"
                    value={orderId}
                    onChange={(e) => {
                      setOrderId(e.target.value.toUpperCase());
                      setIsManualOrderId(true);
                    }}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 tracking-wider text-sm disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  XXX (Seq) + YY (Mês) + ZZ (Ano)
                </span>
              </div>
            </div>
          </div>

          {/* SEÇÃO 1: LÓGICA DE CLIENTE */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                Dados do Cliente
              </span>
              <span className="text-[11px] text-slate-500">
                Cadastro feito pela aba Clientes
              </span>
            </div>

            {/* SELEÇÃO DE CLIENTE EXISTENTE (DROPDOWN ÚNICO) */}
              <div className="space-y-2">
                <label className="block text-slate-600 font-medium text-xs">
                  Selecionar Cliente Existente *
                </label>
                <div className="relative">
                  <select
                    value={selectedClientId}
                    disabled={isViewer || clients.length === 0}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full text-xs py-2.5 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 shadow-2xs disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  >
                    {clients.length === 0 ? (
                      <option value="" disabled>Nenhum cliente cadastrado no momento</option>
                    ) : (
                      [...clients]
                        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }))
                        .map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name} — {client.city}/{client.state} (CPF: {client.cpf})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {clients.length === 0 && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5 mt-2 flex items-center gap-1.5">
                    <span>Nenhum cliente cadastrado. Cadastre o primeiro cliente na aba <strong>Clientes</strong> antes de concluir o pedido.</span>
                  </p>
                )}

                {currentSelectedClient && (
                  <div className="mt-2 p-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{currentSelectedClient.name}</span>
                      <span>·</span>
                      <span>{currentSelectedClient.phone}</span>
                      <span>·</span>
                      <span className="text-slate-500">{currentSelectedClient.email}</span>
                    </div>
                    <div className="font-mono text-slate-500">
                      {currentSelectedClient.city}/{currentSelectedClient.state}
                      {currentSelectedClient.cep ? ` · CEP ${currentSelectedClient.cep}` : ''}
                    </div>
                  </div>
                )}
              </div>
          </div>

          {/* SEÇÃO 2: ENDEREÇO PARA ENTREGA */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-amber-600" />
                Endereço para Entrega
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                {deliveryAddressType === 'same' ? 'Destino padrão do cliente' : 'Destinatário/Endereço exclusivo'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label 
                className={`flex items-start gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                  deliveryAddressType === 'same'
                    ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-400/40 shadow-2xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="deliveryAddressType"
                  value="same"
                  checked={deliveryAddressType === 'same'}
                  onChange={() => setDeliveryAddressType('same')}
                  className="mt-0.5 w-4 h-4 text-amber-600 border-slate-300 focus:ring-amber-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold block text-slate-900">Mesmo endereço do cadastro</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Utiliza o endereço já registrado no cadastro do cliente
                  </span>
                </div>
              </label>

              <label 
                className={`flex items-start gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                  deliveryAddressType === 'custom'
                    ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-400/40 shadow-2xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="deliveryAddressType"
                  value="custom"
                  checked={deliveryAddressType === 'custom'}
                  onChange={() => {
                    setDeliveryAddressType('custom');
                    if (!customRecipientName) {
                      const currentName = currentSelectedClient?.name || '';
                      if (currentName) setCustomRecipientName(currentName);
                    }
                  }}
                  className="mt-0.5 w-4 h-4 text-amber-600 border-slate-300 focus:ring-amber-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold block text-slate-900">Cadastrar Novo Endereço para entrega</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Para envio de presentes ou entrega em outro local
                  </span>
                </div>
              </label>
            </div>

            {deliveryAddressType === 'same' && (
              <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Resumo da Entrega (Leitura)
                    </span>
                    <span className="text-[10px] font-mono font-medium text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      Endereço Principal
                    </span>
                  </div>
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <span>Recebedor:</span>
                    <span className="text-amber-900">
                      {currentSelectedClient?.name || 'Cliente selecionado'}
                    </span>
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    {currentSelectedClient ? (
                      `${currentSelectedClient.address || 'Endereço não informado'} · ${currentSelectedClient.city}/${currentSelectedClient.state}${currentSelectedClient.cep ? ` · CEP ${currentSelectedClient.cep}` : ''}`
                    ) : (
                      <span className="italic text-slate-400">Selecione um cliente acima</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {deliveryAddressType === 'custom' && (
              <div className="space-y-3 pt-2 border-t border-slate-200/80 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-700 font-medium">
                        Nome do Recebedor *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const clientName = currentSelectedClient?.name || '';
                          if (clientName) setCustomRecipientName(clientName);
                        }}
                        className="text-[10px] text-amber-700 hover:underline cursor-pointer"
                      >
                        Copiar nome do cliente
                      </button>
                    </div>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required={deliveryAddressType === 'custom'}
                        placeholder="Nome completo de quem vai receber a encomenda"
                        value={customRecipientName}
                        onChange={(e) => setCustomRecipientName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 font-medium mb-1">
                      Endereço Completo de Entrega *
                    </label>
                    <input
                      type="text"
                      required={deliveryAddressType === 'custom'}
                      placeholder="Rua, número, complemento, bairro"
                      value={customDeliveryAddress}
                      onChange={(e) => setCustomDeliveryAddress(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-5">
                      <label className="block text-slate-700 font-medium mb-1">
                        Cidade *
                      </label>
                      <input
                        type="text"
                        required={deliveryAddressType === 'custom'}
                        placeholder="Ex: Rio de Janeiro"
                        value={customDeliveryCity}
                        onChange={(e) => setCustomDeliveryCity(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-slate-700 font-medium mb-1">
                        Estado (UF) *
                      </label>
                      <select
                        value={customDeliveryState}
                        onChange={(e) => setCustomDeliveryState(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        {['SP', 'RJ', 'MG', 'RS', 'PR', 'SC', 'BA', 'PE', 'CE', 'DF', 'GO', 'ES', 'MT', 'MS', 'PA'].map((uf) => (
                          <option key={uf} value={uf}>{uf}</option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-4">
                      <label className="block text-slate-700 font-medium mb-1">
                        CEP
                      </label>
                      <input
                        type="text"
                        placeholder="00000-000"
                        value={customDeliveryCep}
                        onChange={(e) => setCustomDeliveryCep(maskCEP(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SEÇÃO 3: CARRINHO DE COMPRAS / MÚLTIPLOS ITENS POR PEDIDO */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="font-semibold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
                  Carrinho de Compras do Pedido
                </span>
                <span className="text-[11px] text-slate-500">
                  {cartItems.length} modelo(s) · {cartItems.reduce((acc, it) => acc + it.quantity, 0)} peça(s) no total
                </span>
              </div>

              {/* Botão + Adicionar Item ao Pedido */}
              <button
                type="button"
                disabled={isViewer}
                onClick={() => setShowItemPicker(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-amber-500 text-slate-950 font-bold text-xs transition-colors cursor-pointer self-start sm:self-auto shadow-2xs"
                title={isViewer ? 'Bloqueado no modo visualizador' : '+ Adicionar Item ao Pedido'}
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>+ Adicionar Item ao Pedido</span>
              </button>
            </div>

            {/* BARRA OU ÁREA DE SELEÇÃO DE ITEM (QUANDO ATIVA OU AO CLICAR EM ADICIONAR) */}
            {showItemPicker && (
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-amber-900 flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-amber-700" />
                    Selecionar do Catálogo ou Criar Novo
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowItemPicker(false)}
                    className="text-[10px] text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                  {/* Select Principal: Produto (OptGroup) */}
                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Produto Principal *
                    </label>
                    <GroupedProductSelect
                      products={mainCatalogProducts}
                      value={selectedCatalogProductId}
                      disabled={isViewer}
                      onChange={setSelectedCatalogProductId}
                      showCostPrice={true}
                      className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer"
                    />
                  </div>

                  {/* Select Adicional / Extra */}
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
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
                      className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <option value="">Nenhum (+ R$ 0,00)</option>
                      {extraProducts.map((extra) => (
                        <option key={extra.id} value={extra.id}>
                          + {extra.model} (+{formatBRL(extra.salePrice)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantidade e Botão Incluir (Alinhamento vertical perfeito com selects e labels) */}
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Quantidade & Ação
                    </label>
                    <div className="flex items-center gap-1.5 h-[38px]">
                      <div className="flex items-center border border-slate-300 bg-white rounded-lg overflow-hidden shrink-0 h-[38px] shadow-2xs">
                        <button
                          type="button"
                          disabled={isViewer}
                          onClick={() => setAddItemQty((q) => Math.max(1, q - 1))}
                          className="px-2 h-full flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-1.5 font-mono font-bold text-xs text-slate-800">
                          {addItemQty}
                        </span>
                        <button
                          type="button"
                          disabled={isViewer}
                          onClick={() => setAddItemQty((q) => q + 1)}
                          className="px-2 h-full flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={isViewer}
                        onClick={() => {
                          const prod = mainCatalogProducts.find((p) => p.id === selectedCatalogProductId) || mainCatalogProducts[0];
                          if (prod) {
                            handleAddProductToCart(prod, addItemQty, selectedExtraProductId, addItemObservacao);
                            setAddItemQty(1);
                          }
                        }}
                        className="flex-1 h-[38px] px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-amber-500 text-slate-950 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center whitespace-nowrap shadow-2xs text-center"
                      >
                        + Incluir
                      </button>

                      {/* Botão Cadastrar Novo na hora */}
                      <button
                        type="button"
                        disabled={isViewer}
                        onClick={() => setIsQuickProductModalOpen(true)}
                        className="h-[38px] px-2 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-amber-800 font-semibold border border-amber-300 text-xs transition-colors cursor-pointer flex items-center justify-center whitespace-nowrap"
                        title="Cadastrar Novo Produto"
                      >
                        + Novo
                      </button>
                    </div>
                  </div>
                </div>

                {/* Campo de Observação / Personalização (Opcional) */}
                <div className="pt-0.5">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Observação / Personalização (Opcional)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Instruções para o ateliê artesanal</span>
                  </label>
                  <input
                    type="text"
                    disabled={isViewer}
                    value={addItemObservacao}
                    onChange={(e) => setAddItemObservacao(e.target.value)}
                    placeholder="Ex: Trocar corda preta por azul..."
                    className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            )}

            {/* TABELA / LISTA DOS ITENS ADICIONADOS AO PEDIDO */}
            {cartItems.length === 0 ? (
              <div className="py-8 px-4 text-center text-slate-500 bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
                <ShoppingBag className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-medium text-slate-600">
                  Nenhum item adicionado. Clique no botão acima para incluir produtos.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {cartItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 bg-white hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                  >
                    {/* Item info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {item.code}
                        </span>
                        <span className="font-bold text-slate-900 truncate">
                          {item.model}
                        </span>
                        {item.subCategory && (
                          <span className="text-[10px] text-amber-800 bg-amber-50 px-1 rounded font-medium">
                            {item.subCategory}
                          </span>
                        )}
                      </div>
                      {item.observacao && (
                        <p className="text-xs text-slate-500 italic mt-0.5">
                          Obs: {item.observacao}
                        </p>
                      )}
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>Preço Unitário (Venda): <strong className="font-mono text-slate-800">{formatBRL(item.unitPrice)}</strong></span>
                        <span>·</span>
                        <span>Custo Unitário: <span className="font-mono text-rose-700">{formatBRL(item.costPrice)}</span></span>
                        <span className="text-[10px] text-slate-400">(Preços congelados no pedido)</span>
                      </div>
                    </div>

                    {/* Qty & Total & Remove */}
                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <div className="flex items-center border border-slate-200 bg-slate-50 rounded-lg overflow-hidden">
                        <button
                          type="button"
                          disabled={isViewer}
                          onClick={() => handleUpdateItemQuantity(idx, item.quantity - 1)}
                          className="px-1.5 py-1 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          title="Diminuir quantidade"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 font-mono font-bold text-xs text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          disabled={isViewer}
                          onClick={() => handleUpdateItemQuantity(idx, item.quantity + 1)}
                          className="px-1.5 py-1 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          title="Aumentar quantidade"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-right min-w-[70px]">
                        <span className="text-[10px] text-slate-400 block">Subtotal</span>
                        <span className="font-mono font-bold text-slate-900">
                          {formatBRL(item.totalPrice)}
                        </span>
                      </div>

                      {!isViewer && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Remover este item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SEÇÃO 4: 🚚 FRETE (POSICIONADA EXATAMENTE ENTRE O CARRINHO E O RESUMO FINANCEIRO) */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/90 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700">
                  <Truck className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-semibold text-slate-800 uppercase tracking-wider text-[11px] block">
                    Frete & Envio
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Defina o frete cobrado do cliente e o frete cotado com a transportadora
                  </span>
                </div>
              </div>

              {/* Checkbox / Toggle Frete Grátis */}
              <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer select-none bg-white border-slate-200 hover:border-amber-400 shadow-2xs">
                <input
                  type="checkbox"
                  disabled={isViewer}
                  checked={isFreeShipping}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsFreeShipping(checked);
                    if (checked) {
                      setShippingCharged(0);
                    } else {
                      setShippingCharged(shippingPaid || 22);
                    }
                  }}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer accent-amber-500 disabled:opacity-40 disabled:cursor-not-allowed"
                />
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900">Frete Grátis</span>
                  {isFreeShipping && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Ativo (R$ 0,00)
                    </span>
                  )}
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
              {/* Frete Cobrado (R$) - O que o cliente paga */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-medium text-xs">
                    Frete Cobrado (R$) *
                  </label>
                  {isFreeShipping && (
                    <span className="text-[10px] font-bold text-emerald-700">
                      Bloqueado (Grátis)
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-slate-400 text-xs">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    disabled={isFreeShipping || isViewer}
                    readOnly={isFreeShipping || isViewer}
                    placeholder="0.00"
                    value={isFreeShipping ? 0 : shippingCharged}
                    onChange={(e) => setShippingCharged(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className={`w-full pl-9 pr-3 py-2 rounded-lg border text-xs font-mono font-bold transition-colors ${
                      isFreeShipping || isViewer
                        ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500'
                    }`}
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {isFreeShipping ? 'Cliente não paga frete (empresa assume)' : 'Valor pago pelo cliente na compra'}
                </span>
              </div>

              {/* Frete Cotado (R$) - O custo real da transportadora */}
              <div>
                <label className="block text-slate-700 font-medium text-xs mb-1">
                  Frete Cotado (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-slate-400 text-xs">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    disabled={isViewer}
                    placeholder="0.00"
                    value={shippingPaid}
                    onChange={(e) => setShippingPaid(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs shadow-2xs disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Custo real de envio com a transportadora
                </span>
              </div>

              {/* Sobra do Frete (Resultado do Envio) */}
              <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">
                  Sobra do Frete (Cobrado - Cotado)
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`font-mono text-base font-bold ${
                    shippingSurplus > 0
                      ? 'text-emerald-700'
                      : shippingSurplus === 0
                      ? 'text-slate-700'
                      : 'text-amber-700'
                  }`}>
                    {shippingSurplus > 0 ? `+${formatBRL(shippingSurplus)}` : formatBRL(shippingSurplus)}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  {isFreeShipping 
                    ? `Frete grátis: -${formatBRL(numShippingPaid)} deduzido do lucro`
                    : shippingSurplus > 0 
                    ? 'Superávit que soma ao lucro real'
                    : shippingSurplus < 0 
                    ? 'Diferença absorvida que deduz do lucro'
                    : 'Frete neutro (custo 100% coberto)'}
                </span>
              </div>
            </div>

            {/* DADOS OPERACIONAIS DE LOGÍSTICA & ENVIO */}
            <div className="pt-3 border-t border-slate-200/80">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Truck className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-[11px] font-semibold text-slate-800">
                  Dados Operacionais de Logística & Envio
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                {/* Plataforma de Envio */}
                <div>
                  <label className="block text-slate-700 font-medium text-xs mb-1">
                    Plataforma de Envio *
                  </label>
                  <select
                    value={shippingPlatform}
                    disabled={isViewer}
                    onChange={(e) => {
                      setShippingPlatform(e.target.value as ShippingPlatform);
                      if (e.target.value !== 'Outra') setCustomShippingPlatform('');
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs shadow-2xs cursor-pointer disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  >
                    <option value="Melhor Envio">Melhor Envio</option>
                    <option value="Frenet">Frenet</option>
                    <option value="SuperFrete">SuperFrete</option>
                    <option value="Contrato Correios">Contrato Correios</option>
                    <option value="Outra">Outra</option>
                  </select>
                  {shippingPlatform === 'Outra' && (
                    <input
                      type="text"
                      disabled={isViewer}
                      placeholder="Digite o nome da plataforma..."
                      value={customShippingPlatform}
                      onChange={(e) => setCustomShippingPlatform(e.target.value)}
                      className="mt-1.5 w-full px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs shadow-2xs placeholder:text-slate-400 font-medium animate-in fade-in duration-100"
                    />
                  )}
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Gateway ou canal de emissão
                  </span>
                </div>

                {/* Transportadora */}
                <div>
                  <label className="block text-slate-700 font-medium text-xs mb-1">
                    Transportadora *
                  </label>
                  <select
                    value={carrier}
                    disabled={isViewer}
                    onChange={(e) => {
                      setCarrier(e.target.value as ShippingCarrier);
                      if (e.target.value !== 'Outra') setCustomCarrier('');
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs shadow-2xs cursor-pointer disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  >
                    <option value="Correios PAC">Correios PAC</option>
                    <option value="Correios SEDEX">Correios SEDEX</option>
                    <option value="Loggi">Loggi</option>
                    <option value="Transportadora Loggi">Transportadora Loggi</option>
                    <option value="Jadlog">Jadlog</option>
                    <option value="Transportadora J&T Express">Transportadora J&T Express</option>
                    <option value="Outra">Outra</option>
                  </select>
                  {carrier === 'Outra' && (
                    <input
                      type="text"
                      disabled={isViewer}
                      placeholder="Digite o nome da transportadora..."
                      value={customCarrier}
                      onChange={(e) => setCustomCarrier(e.target.value)}
                      className="mt-1.5 w-full px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs shadow-2xs placeholder:text-slate-400 font-medium animate-in fade-in duration-100"
                    />
                  )}
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Empresa e modalidade de entrega
                  </span>
                </div>

                {/* Código de Rastreio (Opcional) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-medium text-xs">
                      Código de Rastreio
                    </label>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Opcional
                    </span>
                  </div>
                  <input
                    type="text"
                    disabled={isViewer}
                    placeholder="ex: JD123456789BR"
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs shadow-2xs uppercase placeholder:normal-case disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Pode ser preenchido agora ou depois
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 5: RESUMO FINANCEIRO DO PEDIDO */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3.5">
            <span className="font-semibold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              Resumo Financeiro & Fechamento
            </span>

            {/* Grid dos campos financeiros */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Subtotal (Calculado automaticamente: Soma dos preços de venda) */}
              <div>
                <label className="block text-slate-700 font-medium mb-1 text-xs">
                  Subtotal (Itens)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-slate-400 text-xs">
                    R$
                  </span>
                  <input
                    type="text"
                    disabled
                    readOnly
                    value={subtotal.toFixed(2)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-100 font-mono font-bold text-slate-800 cursor-not-allowed text-xs"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Soma de todos os produtos</span>
              </div>

              {/* Desconto (%) - Porcentagem calculada sobre o Subtotal */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-medium text-xs">
                    Desconto (%)
                  </label>
                  {numDiscountPercent > 0 && (
                    <span className="text-[10px] font-bold font-mono text-rose-600">
                      -{formatBRL(calculatedDiscount)}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-slate-400 text-xs">
                    %
                  </span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    disabled={isViewer}
                    placeholder="0"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  {numDiscountPercent > 0 
                    ? `${numDiscountPercent}% = -${formatBRL(calculatedDiscount)} sobre ${formatBRL(subtotal)}`
                    : 'Aplicado sobre o Subtotal dos itens'}
                </span>
              </div>

              {/* Frete Cobrado Resumo */}
              <div>
                <label className="block text-slate-700 font-medium mb-1 text-xs">
                  Frete Cobrado do Cliente
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-slate-400 text-xs">
                    R$
                  </span>
                  <input
                    type="text"
                    disabled
                    readOnly
                    value={numShippingCharged.toFixed(2)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-100 font-mono font-bold text-slate-800 cursor-not-allowed text-xs"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  {isFreeShipping ? 'Frete Grátis (R$ 0,00)' : 'Definido na seção de Frete acima'}
                </span>
              </div>
            </div>

            {/* Linha do Valor Total Pago & Forma de Pagamento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Valor Total Pago: (Subtotal de Venda - Valor do Desconto em %) + Frete Cobrado */}
              <div className="bg-amber-100/70 p-3.5 rounded-xl border border-amber-300/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-950 block tracking-wide">
                    Valor Total Pago pelo Cliente
                  </span>
                  <span className="text-[11px] text-amber-900">
                    Subtotal ({formatBRL(subtotal)}) - Desconto {numDiscountPercent}% ({formatBRL(calculatedDiscount)}) + Frete ({formatBRL(numShippingCharged)})
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xl font-bold text-slate-950">
                    {formatBRL(saleValue)}
                  </span>
                </div>
              </div>

              {/* Forma de Pagamento */}
              <div>
                <label className="block text-slate-700 font-medium mb-1 text-xs">
                  Forma de Pagamento *
                </label>
                <select
                  value={paymentMethod}
                  disabled={isViewer}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs shadow-2xs disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer"
                >
                  <option value="pix">PIX (À vista - 0% taxa)</option>
                  <option value="transferencia">Transferência Bancária (0% taxa)</option>
                  <option value="boleto">Boleto Bancário (0% taxa)</option>
                  <option value="credito_1x">Cartão de Crédito 1x (4,20% taxa)</option>
                  <option value="credito_2x">Cartão de Crédito 2x (6,09% taxa)</option>
                  <option value="credito_3x">Cartão de Crédito 3x (7,01% taxa)</option>
                  <option value="credito_4x">Cartão de Crédito 4x (7,91% taxa)</option>
                  <option value="credito_5x">Cartão de Crédito 5x (8,80% taxa)</option>
                  <option value="credito_6x">Cartão de Crédito 6x (9,67% taxa)</option>
                </select>
              </div>
            </div>

            {/* Painel de Rentabilidade ao Vivo */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span>Venda Líq Prod: <strong className="font-mono text-slate-900">{formatBRL(netProductSale)}</strong></span>
                <span>·</span>
                <span>Custo Prod: <strong className="font-mono text-rose-700">-{formatBRL(totalProductionCost)}</strong></span>
                <span>·</span>
                <span>Sobra Frete ({formatBRL(numShippingCharged)} - {formatBRL(numShippingPaid)}): <strong className={`font-mono ${shippingSurplus >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>{shippingSurplus >= 0 ? `+${formatBRL(shippingSurplus)}` : formatBRL(shippingSurplus)}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>Lucro Líquido Real Estimado:</span>
                <span className={`font-mono font-bold px-2 py-0.5 rounded border ${
                  estimatedProfit >= 0
                    ? 'text-emerald-800 bg-emerald-100/70 border-emerald-200'
                    : 'text-rose-800 bg-rose-100/70 border-rose-200'
                }`}>
                  {formatBRL(estimatedProfit)} ({formatPercent(estimatedMargin)})
                </span>
              </div>
            </div>
          </div>

          {/* Rodapé / Ações */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isViewer || cartItems.length === 0}
              title={
                isViewer
                  ? 'Modo Apenas Leitura: visualizadores não possuem permissão para salvar pedidos'
                  : cartItems.length === 0
                  ? 'Adicione produtos ao carrinho para salvar o pedido'
                  : 'Salvar Pedido'
              }
              className="px-5 py-2.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-amber-500 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Salvar Pedido</span>
            </button>
          </div>
        </form>
      </div>

      {/* MODAL SECUNDÁRIO: CADASTRAR NOVO PRODUTO NA HORA */}
      {isQuickProductModalOpen && (
        <div
          className="fixed inset-0 z-60 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 transition-all"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-700 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">
                  Cadastrar Novo Produto no Catálogo
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickProductModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickProduct} className="space-y-3 text-xs">
              {quickProductError && (
                <div className="p-2.5 rounded bg-rose-50 text-rose-800 text-[11px] border border-rose-200">
                  {quickProductError}
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Código do Item (SKU) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: TC-FIDEL-02"
                  value={quickCode}
                  onChange={(e) => setQuickCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Categoria *</label>
                  <select
                    value={quickCategory}
                    onChange={(e) => setQuickCategory(e.target.value as ProductCategory)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {quickCategory === 'Terços' ? (
                  <div className="space-y-1.5">
                    <label className="block text-slate-700 font-medium mb-1">LINHA *</label>
                    <select
                      value={quickSubCategory}
                      onChange={(e) => setQuickSubCategory(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                    >
                      <option value="Linha Raízes">Linha Raízes</option>
                      <option value="Linha Fidelis">Linha Fidelis</option>
                      <option value="Personalizados">Personalizados</option>
                      <option value="Nova Linha">+ Nova Linha</option>
                    </select>

                    {quickSubCategory === 'Nova Linha' && (
                      <input
                        type="text"
                        required
                        placeholder="Nome da nova linha"
                        value={quickCustomLine}
                        onChange={(e) => setQuickCustomLine(e.target.value)}
                        className="w-full px-2 py-1 rounded border border-amber-300 bg-amber-50/40 text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 mt-1"
                      />
                    )}
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 italic pt-5">
                    Apenas para Terços
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Modelo do Produto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Terço Linha Fidelis Cristais Champagne"
                  value={quickModel}
                  onChange={(e) => setQuickModel(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Preço Custo (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={quickCostPrice}
                    onChange={(e) => setQuickCostPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono text-slate-900 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Preço Venda (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={quickSalePrice}
                    onChange={(e) => setQuickSalePrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickProductModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg shadow-2xs cursor-pointer"
                >
                  Salvar e Incluir no Pedido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
