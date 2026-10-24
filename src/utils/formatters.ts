import { Order, Product, FinancialMetrics, PAYMENT_FACTORS, PAYMENT_FEE_RATES } from '../types/erp';

export function calculateFinancialMetrics(order: Order): FinancialMetrics {
  const feeRate = PAYMENT_FEE_RATES[order.paymentMethod] ?? 0.0;
  const discountFactor = PAYMENT_FACTORS[order.paymentMethod] ?? (1 - feeRate);

  // Subtotal dos itens (Soma dos preços de venda)
  const subtotal = order.subtotal ?? (order.items && order.items.length > 0
    ? order.items.reduce((acc, it) => acc + (it.totalPrice || it.unitPrice * it.quantity), 0)
    : order.saleValue);

  // Desconto aplicado em R$ (calculado via % se houver discountPercent, ou valor direto em R$)
  let discount = order.discount ?? 0;
  if (order.discountPercent !== undefined && order.discountPercent > 0) {
    discount = (subtotal * order.discountPercent) / 100;
  }

  // Custo Total dos Produtos
  const productionCost = order.productionCost ?? 0;

  // Frete Cobrado e Frete Cotado (Custo Real)
  const shippingCharged = order.shippingCharged ?? 0;
  const shippingPaid = order.shippingPaid ?? 0;

  // A SOBRA DO FRETE = (Frete Cobrado - Frete Cotado)
  // Se for frete grátis (shippingCharged = 0), a conta é (0 - Frete Cotado), abatendo o custo do frete do lucro
  const shippingSurplus = shippingCharged - shippingPaid;
  const shippingCost = shippingPaid - shippingCharged;

  // Venda líquida de produtos após desconto
  const netProductSale = Math.max(0, subtotal - discount);

  // Taxa do gateway financeiro de pagamento (Cartão 1x a 6x, PIX 0%, Boleto 0%)
  const gatewayFee = netProductSale * feeRate;

  // Preço líquido considerando fator financeiro de gateway (quando aplicável)
  const netPrice = netProductSale * discountFactor;

  // FÓRMULA EXATA DO LUCRO LÍQUIDO REAL COM TAXAS DE PARCELAMENTO NA MARGEM:
  // (Venda Líquida - Custo Produtos - Taxa Gateway) + (Frete Cobrado - Frete Cotado)
  const netProfit = (netProductSale - productionCost - gatewayFee) + shippingSurplus;

  // Lucro dos Produtos puro após taxa de gateway
  const productProfit = netPrice - productionCost;

  // Valor Total Pago pelo cliente: (Subtotal de Venda - Valor do Desconto em %) + Frete Cobrado
  const saleValue = order.saleValue ?? Math.max(0, (subtotal - discount) + shippingCharged);

  // Margem Líquida % = (Lucro Líquido Real / Valor Total Pago) * 100
  const marginPercent = saleValue > 0 ? (netProfit / saleValue) * 100 : 0;

  return {
    subtotal,
    discount,
    discountPercent: order.discountPercent,
    saleValue,
    discountFactor,
    feeRate,
    gatewayFee,
    netProductSale,
    netPrice,
    shippingCharged,
    shippingPaid,
    shippingSurplus,
    shippingCost,
    productionCost,
    productProfit,
    netProfit,
    marginPercent,
  };
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatFactor(factor: number): string {
  return Number(factor).toFixed(3);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function getTodayDateFormatted(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear());
  return `${day}/${month}/${year}`;
}

export function parseDateToYYZZ(dateStr: string): { yy: string; zz: string } | null {
  if (!dateStr) return null;
  const clean = dateStr.trim();
  
  // Format DD/MM/AAAA or DD/MM/AA
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length >= 3) {
      const month = parts[1].padStart(2, '0').slice(-2);
      const year = parts[2].slice(-2);
      return { yy: month, zz: year };
    }
  }

  // Format AAAA-MM-DD
  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length >= 3) {
      const month = parts[1].padStart(2, '0').slice(-2);
      const year = parts[0].slice(-2);
      return { yy: month, zz: year };
    }
  }

  return null;
}

export function calculateNextOrderId(dateStr: string, orders: Order[]): string {
  const parsed = parseDateToYYZZ(dateStr) || {
    yy: String(new Date().getMonth() + 1).padStart(2, '0'),
    zz: String(new Date().getFullYear()).slice(-2),
  };

  const { yy, zz } = parsed;
  const targetSuffix = `${yy}${zz}`;

  let maxSeq = 0;

  for (const order of orders) {
    const id = order.id.trim();
    // Check if ID matches format XXXYYZZ (length 7) or ends with YYZZ
    if (id.endsWith(targetSuffix) && id.length >= targetSuffix.length + 1) {
      const prefix = id.slice(0, id.length - targetSuffix.length);
      const num = parseInt(prefix, 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }

  const nextNum = maxSeq + 1;
  return `${String(nextNum).padStart(3, '0')}${yy}${zz}`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    if (dateStr.includes('/')) {
      return dateStr;
    }
    const [year, month, day] = dateStr.split('-');
    if (year && month && day) {
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

/**
 * Extrai a chave de mês/ano ("YYYY-MM") de strings como "15/10/2026" ou "2026-10-15".
 */
export function extractMonthYear(dateStr: string): string | null {
  if (!dateStr) return null;
  const clean = dateStr.trim();
  
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length >= 3) {
      const mm = parts[1].padStart(2, '0');
      let yyyy = parts[2];
      if (yyyy.length === 2) yyyy = `20${yyyy}`;
      return `${yyyy}-${mm}`;
    }
  }

  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length >= 2) {
      const yyyy = parts[0];
      const mm = parts[1].padStart(2, '0');
      return `${yyyy}-${mm}`;
    }
  }

  return null;
}

/**
 * Retorna o mês e ano atual no formato "YYYY-MM" (ex: "2026-10").
 */
export function getCurrentMonthKey(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

export const MONTH_NAMES_PT: Record<string, { short: string; full: string }> = {
  '01': { short: 'Jan', full: 'Janeiro' },
  '02': { short: 'Fev', full: 'Fevereiro' },
  '03': { short: 'Mar', full: 'Março' },
  '04': { short: 'Abr', full: 'Abril' },
  '05': { short: 'Mai', full: 'Maio' },
  '06': { short: 'Jun', full: 'Junho' },
  '07': { short: 'Jul', full: 'Julho' },
  '08': { short: 'Ago', full: 'Agosto' },
  '09': { short: 'Set', full: 'Setembro' },
  '10': { short: 'Out', full: 'Outubro' },
  '11': { short: 'Nov', full: 'Novembro' },
  '12': { short: 'Dez', full: 'Dezembro' },
};

/**
 * Formata chave "YYYY-MM" para rótulo legível em português ("Outubro/2026" ou "Out/26").
 */
export function formatMonthYearLabel(monthKey: string, format: 'short' | 'full' = 'full'): string {
  if (!monthKey || !monthKey.includes('-')) return monthKey;
  const [yyyy, mm] = monthKey.split('-');
  const monthInfo = MONTH_NAMES_PT[mm] || { short: mm, full: mm };
  if (format === 'short') {
    return `${monthInfo.short}/${yyyy.slice(-2)}`;
  }
  return `${monthInfo.full}/${yyyy}`;
}

/**
 * Gera lista de meses disponíveis ordenados decrescente (do mais recente ao mais antigo).
 */
export function getAvailableMonthKeys(orders: Order[]): string[] {
  const keysSet = new Set<string>();
  const current = getCurrentMonthKey();
  keysSet.add(current);

  for (const o of orders) {
    const key = extractMonthYear(o.createdAt);
    if (key) keysSet.add(key);
  }

  const [curYear, curMonth] = current.split('-').map(Number);
  for (let i = 1; i <= 5; i++) {
    const d = new Date(curYear, curMonth - 1 - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    keysSet.add(`${y}-${m}`);
  }

  return Array.from(keysSet).sort((a, b) => b.localeCompare(a));
}

/**
 * Dicionário oficial de links de rastreamento das transportadoras
 */
export const CARRIER_TRACKING_URLS: Record<string, string> = {
  'Correios': 'https://rastreamento.correios.com.br/app/index.php',
  'Correios PAC': 'https://rastreamento.correios.com.br/app/index.php',
  'Correios SEDEX': 'https://rastreamento.correios.com.br/app/index.php',
  'Loggi': 'https://www.loggi.com/',
  'Transportadora Loggi': 'https://www.loggi.com/',
  'J&T Express': 'https://www.jtexpress.com.br/',
  'Transportadora J&T Express': 'https://www.jtexpress.com.br/',
};

/**
 * Retorna o link de rastreamento da transportadora baseado no nome ou modalidade
 */
export function getCarrierTrackingUrl(carrierName?: string): string {
  if (!carrierName) return CARRIER_TRACKING_URLS['Correios'];
  
  if (CARRIER_TRACKING_URLS[carrierName]) {
    return CARRIER_TRACKING_URLS[carrierName];
  }
  
  const norm = carrierName.toLowerCase().trim();
  if (norm.includes('correios') || norm.includes('pac') || norm.includes('sedex')) {
    return CARRIER_TRACKING_URLS['Correios'];
  }
  if (norm.includes('loggi')) {
    return CARRIER_TRACKING_URLS['Loggi'];
  }
  if (norm.includes('j&t') || norm.includes('jt express') || norm.includes('jtexpress')) {
    return CARRIER_TRACKING_URLS['J&T Express'];
  }
  
  return CARRIER_TRACKING_URLS['Correios'];
}

/**
 * Monta a mensagem exata de aviso ao cliente e gera a URL de envio do WhatsApp
 */
export function buildWhatsAppCustomerNoticeUrl(order: Order): { message: string; url: string; cleanPhone: string } {
  const clientName = (order.clientName || 'Cliente').trim();
  const orderNumber = (order.codigoCliente || order.id || '').trim();
  const carrier = (order.carrier || 'Correios').trim();
  const trackingCode = (order.trackingCode || 'Aguardando código').trim();
  const trackingUrl = getCarrierTrackingUrl(carrier);

  // String EXATA solicitada pelo usuário (respeitando quebras de linha e pontuação):
  const message = `Olá ${clientName}, tudo bem?
Passando para avisar que o seu pedido ${orderNumber} já está confirmado aqui na Terçarium!
Sua peça será enviada pela ${carrier}.
O seu código de rastreio é o: ${trackingCode}
Você pode acompanhar a viagem do seu pedido até você por este link: ${trackingUrl}
Muito obrigado por valorizar o nosso trabalho.. Um abraço de toda a família Terçarium.`;

  let cleanPhone = (order.clientPhone || '').replace(/\D/g, '');
  if (cleanPhone.startsWith('55') && cleanPhone.length > 11) {
    cleanPhone = cleanPhone.slice(2);
  }

  const encodedText = encodeURIComponent(message);
  const url = `https://wa.me/55${cleanPhone}?text=${encodedText}`;

  return { message, url, cleanPhone };
}

/**
 * Máscaras para dados cadastrais dos clientes
 */

/**
 * Aplica máscara de CPF: XXX.XXX.XXX-XX
 */
export function maskCPF(value: string | undefined | null): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Aplica máscara de Telefone: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 */
export function maskPhone(value: string | undefined | null): string {
  if (!value) return '';
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length > 11) {
    digits = digits.slice(2);
  }
  digits = digits.slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Aplica máscara de CEP: XXXXX-XXX
 */
export function maskCEP(value: string | undefined | null): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
}

/**
 * Estrutura para Seletor de Produtos Agrupado:
 * Nível 1: Categoria (ex: Terços, Pulseiras) - Título principal
 * Nível 2: Linha (ex: Linha Raízes, Linha Fidelis, Personalizados) - Subtítulo
 * Nível 3: Produtos ordenados obrigatoriamente de A a Z pelo nome do Modelo
 */
export interface ProductLineGroup {
  lineName: string;
  products: Product[]; // Ordenados estritamente A-Z por model
}

export interface ProductCategoryGroup {
  category: string;
  lines: ProductLineGroup[];
}

export function groupProductsByCategoryAndLine(products: Product[]): ProductCategoryGroup[] {
  const canonicalCategories = ['Terços', 'Cordão', 'Extras', 'Dezenas', 'Terço de Carro', 'Pulseira', 'Chaveiro', 'Outro'];
  const canonicalLines = ['Linha Raízes', 'Linha Fidelis', 'Personalizados', 'Cordões', 'Medalhas', 'Crucifixos'];

  // Agrupar primeiro por Categoria
  const catMap = new Map<string, Map<string, Product[]>>();

  products.forEach((p) => {
    const cat = (p.category || 'Outro').trim();
    if (!catMap.has(cat)) {
      catMap.set(cat, new Map<string, Product[]>());
    }
    const lineMap = catMap.get(cat)!;
    
    // Identificar Linha (subCategory)
    const line = (p.subCategory || '').trim() || (cat === 'Terços' ? 'Outros Terços' : 'Modelos Gerais');
    if (!lineMap.has(line)) {
      lineMap.set(line, []);
    }
    lineMap.get(line)!.push(p);
  });

  // Ordenar Categorias (seguindo a ordem canônica do ERP)
  const sortedCategories = Array.from(catMap.keys()).sort((a, b) => {
    const idxA = canonicalCategories.indexOf(a);
    const idxB = canonicalCategories.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b, 'pt-BR');
  });

  return sortedCategories.map((cat) => {
    const lineMap = catMap.get(cat)!;

    // Ordenar Linhas da categoria
    const sortedLines = Array.from(lineMap.keys()).sort((a, b) => {
      const idxA = canonicalLines.indexOf(a);
      const idxB = canonicalLines.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b, 'pt-BR');
    });

    const lines: ProductLineGroup[] = sortedLines.map((lineName) => {
      const prodsInLine = [...lineMap.get(lineName)!];
      
      // REGRA OBRIGATÓRIA: Dentro de cada "Linha", os produtos devem ser renderizados
      // obrigatoriamente em ordem alfabética (A-Z) para facilitar a busca rápida
      prodsInLine.sort((a, b) =>
        (a.model || '').localeCompare(b.model || '', 'pt-BR', { sensitivity: 'base' })
      );

      return {
        lineName,
        products: prodsInLine,
      };
    });

    return {
      category: cat,
      lines,
    };
  });
}

/**
 * Gera um Código do Cliente exclusivo e amigável:
 * Exatamente 3 letras maiúsculas seguidas de 4 números (ex: ABC1234, KLT8492).
 * O cliente utiliza este código para rastreamento e atendimento, mantendo o ID interno sequencial privado.
 */
export function gerarCodigoCliente(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  
  let l = '';
  for (let i = 0; i < 3; i++) {
    l += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  
  let d = '';
  for (let i = 0; i < 4; i++) {
    d += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  
  return `${l}${d}`;
}

