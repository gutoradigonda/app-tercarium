/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'operacao' | 'leitura';
export type UserStatus = 'ativo' | 'bloqueado';

export interface UserProfile {
  id: string;
  nomeCompleto: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  ultimoAcesso?: string;
}

export type PaymentMethod = 
  | 'pix' 
  | 'transferencia' 
  | 'boleto' 
  | 'credito_1x' 
  | 'credito_2x' 
  | 'credito_3x'
  | 'credito_4x'
  | 'credito_5x'
  | 'credito_6x';

export type OrderStatus = 
  | 'em_producao'
  | 'pronto_expedicao'
  | 'embalado'
  | 'despachado'
  | 'entregue'
  | 'cancelado'
  | 'cancelado_estornado';

export type ShippingPlatform = 
  | 'Melhor Envio' 
  | 'Frenet' 
  | 'SuperFrete'
  | 'Contrato Correios'
  | 'Outra'
  | string;

export type ShippingCarrier = 
  | 'Correios PAC'
  | 'Correios SEDEX'
  | 'Transportadora Loggi'
  | 'Loggi'
  | 'Transportadora J&T Express'
  | 'Jadlog'
  | 'Outra'
  | string;

export type ProductCategory = 
  | 'Terços' 
  | 'Cordão'
  | 'Extras'
  | 'Dezenas' 
  | 'Terço de Carro' 
  | 'Pulseira' 
  | 'Chaveiro' 
  | 'Outro'
  | string;

export type ProductSubCategory = 
  | 'Linha Raízes' 
  | 'Linha Fidelis' 
  | 'Personalizados' 
  | 'Cordões'
  | 'Medalhas'
  | 'Crucifixos'
  | 'Outro'
  | string;

export interface Product {
  id: string;
  code: string; // Código do Item / SKU
  sku?: string;
  category: ProductCategory;
  categoria?: string;
  subCategory?: ProductSubCategory; // Linha
  linha?: string;
  model: string; // Modelo / Nome
  nome?: string;
  costPrice: number; // Preço de Custo (R$)
  custo?: number;
  salePrice: number; // Preço de Venda (R$)
  preco?: number;
  stock?: number; // Quantidade em Estoque
  stockQuantity?: number; // Sinônimo de estoque
  estoque?: number; // Quantidade em Estoque
  createdAt?: string;
  description?: string;
}

/**
 * Ordenação hierárquica e rigorosa para Produtos/Itens:
 * 1. Categoria (A-Z)
 * 2. Em caso de empate, LINHA (itens com linha vêm antes em A-Z; sem linha vão pro final)
 * 3. Em caso de empate, Modelo (A-Z)
 */
export const sortProductsHierarchically = (a: Product, b: Product): number => {
  // 1. Categoria (A-Z)
  const catCompare = (a.category || '').localeCompare(b.category || '', 'pt-BR', { sensitivity: 'base' });
  if (catCompare !== 0) return catCompare;

  // 2. LINHA (subCategory)
  const aLine = (a.subCategory || '').trim();
  const bLine = (b.subCategory || '').trim();

  if (aLine && !bLine) return -1;
  if (!aLine && bLine) return 1;
  if (aLine && bLine) {
    const lineCompare = aLine.localeCompare(bLine, 'pt-BR', { sensitivity: 'base' });
    if (lineCompare !== 0) return lineCompare;
  }

  // 3. Modelo (A-Z)
  return (a.model || '').localeCompare(b.model || '', 'pt-BR', { sensitivity: 'base' });
};

export interface OrderItem {
  id: string; // ID da linha de item no pedido
  productId?: string; // ID do produto de catálogo
  code: string; // Snapshot do Código do item
  category: ProductCategory;
  subCategory?: ProductSubCategory;
  model: string; // Snapshot do Modelo do item (com adicional/extra se houver, ex: "All Black + Medalha São Bento Extra")
  quantity: number; // Quantidade comprada
  costPrice: number; // Snapshot do Preço de Custo unitário (com extra se houver)
  unitPrice: number; // Snapshot do Preço de Venda unitário (com extra se houver)
  totalPrice: number; // quantity * unitPrice
  totalCost: number; // quantity * costPrice
  extraProductId?: string;
  extraName?: string;
  extraPrice?: number;
  extraCost?: number;
  observacao?: string; // Observação / Personalização artesanal do item
}

export interface OrderHistoryItem {
  status: OrderStatus;
  timestamp: string;
  note?: string;
}

export interface Client {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  cep?: string;
}

export interface Order {
  id: string; // formato XXXYYZZ, ex: '0011026' (ID interno do sistema)
  codigoCliente?: string; // Código de Rastreio do Cliente (formato: 3 letras maiúsculas + 4 números, ex: ABC1234)
  clientName: string;
  clientCpf?: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress?: string;
  clientCity: string;
  clientState: string;
  clientCep?: string;

  // Endereço de Entrega e Recebedor
  useCustomDeliveryAddress?: boolean;
  recipientName?: string;
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryState?: string;
  deliveryCep?: string;

  // Múltiplos Itens (Carrinho de Compras)
  items: OrderItem[];

  // Fallbacks para compatibilidade e resumos rápidos
  item: string;
  itemModel: string;

  // Fechamento Financeiro
  subtotal: number; // Soma dos preços de venda dos itens
  discountPercent?: number; // Desconto em Porcentagem (%)
  discount: number; // Valor calculado do Desconto em R$
  isFreeShipping?: boolean; // Indicador de Frete Grátis
  saleValue: number; // Valor Total Pago = (Subtotal - Valor do Desconto em %) + Frete Cobrado
  shippingCharged: number; // Frete Cobrado do cliente (0 se frete grátis)
  shippingPaid: number; // Frete Cotado (custo real com a transportadora)
  productionCost: number; // Custo Total dos Produtos
  paymentMethod: PaymentMethod;
  paymentStatus?: string; // ex: 'pago', 'aguardando_diferenca', 'diferenca_paga', 'pendente'
  paymentNote?: string; // Anotações sobre pagamentos adicionais ou Pix de diferença
  originalSaleValue?: number; // Snapshot do valor original antes de adições de itens
  estornado?: boolean; // Flag indicando que o dinheiro foi devolvido ao cliente
  dataEstorno?: string; // Data e hora em que a devolução/estorno foi confirmada
  status: OrderStatus;
  shippingPlatform: ShippingPlatform;
  carrier: ShippingCarrier;
  trackingCode?: string;
  createdAt: string;
  estimatedDelivery?: string;
  notes?: string;
  history?: OrderHistoryItem[];
}

export type PaymentStatus = 
  | 'pago' 
  | 'aguardando_diferenca' 
  | 'diferenca_paga' 
  | 'pendente';

export const PAYMENT_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pago: {
    label: 'Pago Integralmente',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  aguardando_diferenca: {
    label: 'Aguardando Diferença',
    color: 'text-amber-800',
    bg: 'bg-amber-50',
    border: 'border-amber-300',
  },
  diferenca_paga: {
    label: 'Diferença Paga',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  pendente: {
    label: 'Pagamento Pendente',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
  },
};

/**
 * Taxas oficiais de gateway por forma de pagamento (margem de lucro):
 * Cartão de Crédito: 1x (4,20%), 2x (6,09%), 3x (7,01%), 4x (7,91%), 5x (8,80%) e 6x (9,67%).
 * Boleto e PIX: 0%
 */
export const PAYMENT_FEE_RATES: Record<PaymentMethod, number> = {
  pix: 0.0,
  transferencia: 0.0,
  boleto: 0.0,
  credito_1x: 0.042, // 4,20%
  credito_2x: 0.0609, // 6,09%
  credito_3x: 0.0701, // 7,01%
  credito_4x: 0.0791, // 7,91%
  credito_5x: 0.0880, // 8,80%
  credito_6x: 0.0967, // 9,67%
};

export const PAYMENT_FACTORS: Record<PaymentMethod, number> = {
  pix: 1.0,
  transferencia: 1.0,
  boleto: 1.0,
  credito_1x: 1 - 0.042, // 0.9580 (Fator líquido)
  credito_2x: 1 - 0.0609, // 0.9391
  credito_3x: 1 - 0.0701, // 0.9299
  credito_4x: 1 - 0.0791, // 0.9209
  credito_5x: 1 - 0.0880, // 0.9120
  credito_6x: 1 - 0.0967, // 0.9033
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  pix: 'PIX (À vista - 0%)',
  transferencia: 'Transferência Bancária (0%)',
  boleto: 'Boleto Bancário (0%)',
  credito_1x: 'Cartão de Crédito 1x (4,20%)',
  credito_2x: 'Cartão de Crédito 2x (6,09%)',
  credito_3x: 'Cartão de Crédito 3x (7,01%)',
  credito_4x: 'Cartão de Crédito 4x (7,91%)',
  credito_5x: 'Cartão de Crédito 5x (8,80%)',
  credito_6x: 'Cartão de Crédito 6x (9,67%)',
};

export const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; border: string }> = {
  em_producao: {
    label: 'Em Produção',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  pronto_expedicao: {
    label: 'Pronto para Expedição',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  embalado: {
    label: 'Embalado',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
  despachado: {
    label: 'Despachado',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
  },
  entregue: {
    label: 'Entregue',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  cancelado: {
    label: 'Cancelado',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
  },
  cancelado_estornado: {
    label: 'Cancelado e Estornado',
    color: 'text-amber-800',
    bg: 'bg-amber-50',
    border: 'border-amber-300',
  },
};

export interface FinancialMetrics {
  subtotal: number;
  discount: number;
  discountPercent?: number;
  saleValue: number; // Valor Total Pago
  discountFactor: number;
  feeRate: number; // Taxa percentual da operadora (ex: 0.042)
  gatewayFee: number; // Valor em R$ da taxa do gateway de pagamento
  netProductSale: number; // (subtotal - discount)
  netPrice: number; // netProductSale * discountFactor
  shippingCharged: number; // Frete Cobrado
  shippingPaid: number; // Frete Cotado
  shippingSurplus: number; // Sobra do Frete = Frete Cobrado - Frete Cotado
  shippingCost: number; // Frete Cotado - Frete Cobrado (custo absorvido pelo ateliê)
  productionCost: number; // Custo Total dos Produtos
  productProfit: number; // (netPrice - productionCost)
  netProfit: number; // Lucro Líquido Real = (Subtotal - Desconto - Custo Produtos - Taxas Gateway) + (Frete Cobrado - Frete Cotado)
  marginPercent: number; // (netProfit / saleValue) * 100
}

export type ExpenseType = 'Custos Variáveis' | 'Custos Fixos';

export type ExpenseCategory = 
  | 'Insumos/Matéria-prima'
  | 'Embalagens'
  | 'Fretes Extras'
  | 'Mensalidades/Software'
  | 'Pró-labore/Salários'
  | 'Marketing';

export type ExpenseStatus = 'pago' | 'pendente';

export interface Expense {
  id: string;
  date: string; // Formato DD/MM/AAAA ou YYYY-MM-DD
  description: string;
  categoryGroup: ExpenseType;
  category: ExpenseCategory;
  amount: number;
  status: ExpenseStatus;
  paymentMethod?: string;
  notes?: string;
  createdAt?: string;
}

export const EXPENSE_CATEGORIES: {
  group: ExpenseType;
  options: { label: string; value: ExpenseCategory }[];
}[] = [
  {
    group: 'Custos Variáveis',
    options: [
      { label: 'Insumos/Matéria-prima', value: 'Insumos/Matéria-prima' },
      { label: 'Embalagens', value: 'Embalagens' },
      { label: 'Fretes Extras', value: 'Fretes Extras' },
    ],
  },
  {
    group: 'Custos Fixos',
    options: [
      { label: 'Mensalidades/Software', value: 'Mensalidades/Software' },
      { label: 'Pró-labore/Salários', value: 'Pró-labore/Salários' },
      { label: 'Marketing', value: 'Marketing' },
    ],
  },
];

export const EXPENSE_STATUS_CONFIG: Record<ExpenseStatus, { label: string; color: string; bg: string; border: string }> = {
  pago: {
    label: 'Pago',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  pendente: {
    label: 'Pendente',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
};

export interface PrefilledFreightData {
  transportadora: string;
  plataforma: string;
  plataformaSelecionada?: string; // Nome explícito da plataforma (ex: "Melhor Envio", "Frenet", "SuperFrete")
  transportadoraSelecionada?: string; // Nome explícito da transportadora (ex: "Correios PAC", "Jadlog", "Loggi")
  freteCobrado: number; // O valor calculado para a Visão do Cliente (com acréscimo de margem de segurança)
  freteCotado: number;  // O custo original/oficial cobrado pela transportadora (valor bruto)
  precoFinalCliente?: number; // Retrocompatibilidade
  prazoTexto: string;
  cidadeEstado?: string;
  cepDestino?: string;
}

export interface SavedBudgetItem {
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

export interface SavedBudget {
  id: string;
  leadName: string;
  createdAt: string;
  items: SavedBudgetItem[];
  shippingOption: string;
  customShippingOption?: string;
  estimatedDeliveryTime: string;
  freteCobrado: number; // Valor cobrado do cliente
  freteCotado: number;  // Custo cotado oficial cobrado pela transportadora
  sobraFrete: number;   // freteCobrado - freteCotado
  shippingValue: number; // Mantido para compatibilidade (igual a freteCobrado)
  subtotalProducts: number;
  totalNormal: number;
  totalPix: number;
  text: string;
  shippingPlatform?: string;
  plataformaSelecionada?: string; // Nome explícito da plataforma
  transportadoraSelecionada?: string; // Nome explícito da transportadora
  cepDestino?: string;
}