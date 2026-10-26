import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Download, 
  Database, 
  Sparkles, 
  Calendar, 
  Users, 
  ShoppingBag, 
  CreditCard,
  QrCode,
  Archive,
  ChevronDown, 
  ChevronUp, 
  Check,
  Truck
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
  ShippingPlatform,
  ShippingCarrier,
  PAYMENT_FEE_RATES
} from '../types/erp';
import { formatBRL, calculateNextOrderId, gerarCodigoCliente } from '../utils/formatters';

interface ImportacaoHistoricoProps {
  products: Product[];
  orders: Order[];
  clients: Client[];
  onBatchInject: (newOrders: Order[], newClients: Client[]) => void;
  onNavigateToOrders: () => void;
}

interface ParsedRow {
  rowIndex: number;
  rawCpf: string;
  normalizedCpf: string;
  rawDate: string;
  normalizedDate: string;
  clientName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  cep: string;
  rawModel: string;
  price: number;
  quantity: number;
  cost: number;
  paymentMethodRaw: string;
  paymentMethod: PaymentMethod;
  shippingCharged: number;
  shippingPaid: number;
  shippingPlatform: string;
  carrier: string;
  trackingCode: string;
  oldOrderId?: string;
  translatedModel: string;
  category: ProductCategory;
  subCategory?: ProductSubCategory;
  isAncient: boolean;
  sku?: string;
}

interface GroupedOrderPreview {
  groupKey: string;
  orderId: string;
  clientCpf: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  clientCity: string;
  clientState: string;
  clientAddress: string;
  clientCep: string;
  orderDate: string;
  paymentMethod: PaymentMethod;
  paymentMethodRaw: string;
  isCreditCard: boolean;
  isPix: boolean;
  feeRate: number;
  subtotal: number;
  shippingCharged: number;
  shippingPaid: number;
  shippingPlatform: string;
  carrier: string;
  trackingCode: string;
  totalSale: number;
  totalCost: number;
  estimatedNetProfit: number;
  items: OrderItem[];
  hasAncientItems: boolean;
  ancientItemsCount: number;
  matchedItemsCount: number;
}

export const ImportacaoHistorico: React.FC<ImportacaoHistoricoProps> = ({
  products,
  orders,
  clients,
  onBatchInject,
  onNavigateToOrders,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [rawRowsCount, setRawRowsCount] = useState<number>(0);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isSuccessInjected, setIsSuccessInjected] = useState<boolean>(false);
  const [injectedStats, setInjectedStats] = useState<{ orders: number; clients: number } | null>(null);

  const [groupedOrders, setGroupedOrders] = useState<GroupedOrderPreview[]>([]);
  const [extractedClients, setExtractedClients] = useState<Client[]>([]);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  const processModelString = (rawModel: string, rawPrice: number, rawCost?: number) => {
    let clean = (rawModel || '').trim();
    if (!clean) clean = 'Produto Histórico Sem Descrição';

    let category: ProductCategory = 'Terços';
    let subCategory: ProductSubCategory | undefined = undefined;

    let translated = clean.replace(/\bSM\b/gi, 'São Miguel')
      .replace(/\bSM\./gi, 'São Miguel ')
      .replace(/\bSM-/gi, 'São Miguel -');

    const upper = translated.toUpperCase();

    if (upper.includes('8MM')) {
      category = 'Terços';
      subCategory = 'Linha Fidelis';
    }

    if (upper.includes('DEZENA') || upper.includes('DEZ')) {
      category = 'Dezenas';
      subCategory = undefined;
    }

    if (upper.includes('SÃO MIGUEL') || upper.includes('SAO MIGUEL')) {
      category = 'Terços';
      if (upper.includes('DEFENSOR') || upper.includes('PRINCEPS') || upper.includes('DUX') || upper.includes('TRIUMPHUS')) {
        subCategory = 'Linha Raízes';
      } else if (upper.includes('SERENITAS') || upper.includes('PAX') || upper.includes('LUX') || upper.includes('GRATIA') || upper.includes('CARITAS')) {
        subCategory = 'Linha Fidelis';
      }
    }

    const normalizedModel = translated.toLowerCase();
    const matchedProduct = products.find((p) => {
      const pModel = (p.model || '').toLowerCase();
      const pSku = (p.code || p.sku || '').toLowerCase();
      return (
        pModel === normalizedModel ||
        normalizedModel.includes(pModel) ||
        pSku === normalizedModel
      );
    });

    if (matchedProduct) {
      return {
        translatedModel: matchedProduct.model,
        category: matchedProduct.category,
        subCategory: matchedProduct.subCategory,
        sku: matchedProduct.code || matchedProduct.sku,
        costPrice: rawCost && rawCost > 0 ? rawCost : matchedProduct.costPrice,
        salePrice: rawPrice > 0 ? rawPrice : matchedProduct.salePrice,
        isAncient: false,
      };
    }

    if (subCategory) {
      const fallbackCost = rawCost && rawCost > 0 ? rawCost : Number((rawPrice * 0.28).toFixed(2));
      return {
        translatedModel: translated,
        category: category,
        subCategory: subCategory,
        sku: undefined,
        costPrice: fallbackCost,
        salePrice: rawPrice,
        isAncient: false,
      };
    }

    const ancientCost = rawCost && rawCost > 0 ? rawCost : Number((rawPrice * 0.25).toFixed(2));
    return {
      translatedModel: translated,
      category: 'Compras Antigas' as ProductCategory,
      subCategory: 'Histórico Antigo',
      sku: 'ANTIGO',
      costPrice: ancientCost,
      salePrice: rawPrice,
      isAncient: true,
    };
  };

  const detectPaymentMethod = (rawPayment: string): { method: PaymentMethod; isPix: boolean; isCredit: boolean } => {
    const p = (rawPayment || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    
    if (p.includes('PIX') || p.includes('DINHEIRO') || p.includes('DEP')) {
      return { method: 'pix', isPix: true, isCredit: false };
    }
    
    if (p.includes('CART') || p.includes('CREDIT') || p.includes('CARD') || p.includes('CRED')) {
      if (p.includes('2X') || p.includes('X2') || p.includes('2 X') || p.includes('X 2')) return { method: 'credito_2x', isPix: false, isCredit: true };
      if (p.includes('3X') || p.includes('X3') || p.includes('3 X') || p.includes('X 3')) return { method: 'credito_3x', isPix: false, isCredit: true };
      if (p.includes('4X') || p.includes('X4') || p.includes('4 X') || p.includes('X 4')) return { method: 'credito_4x', isPix: false, isCredit: true };
      if (p.includes('5X') || p.includes('X5') || p.includes('5 X') || p.includes('X 5')) return { method: 'credito_5x', isPix: false, isCredit: true };
      if (p.includes('6X') || p.includes('X6') || p.includes('6 X') || p.includes('X 6')) return { method: 'credito_6x', isPix: false, isCredit: true };
      
      return { method: 'credito_1x', isPix: false, isCredit: true };
    }
    
    if (p.includes('BOLETO')) {
      return { method: 'boleto', isPix: false, isCredit: false };
    }
    if (p.includes('TRANSF') || p.includes('TED') || p.includes('DOC')) {
      return { method: 'transferencia', isPix: false, isCredit: false };
    }
    
    return { method: 'pix', isPix: true, isCredit: false };
  };

  const normalizeDate = (val: any): string => {
    if (!val) {
      const now = new Date();
      return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    }

    if (typeof val === 'number') {
      try {
        const dateObj = XLSX.SSF.parse_date_code(val);
        if (dateObj) {
          const d = String(dateObj.d).padStart(2, '0');
          const m = String(dateObj.m).padStart(2, '0');
          const y = String(dateObj.y);
          return `${d}/${m}/${y}`;
        }
      } catch (e) {
        const d = new Date(Math.round((val - 25569) * 86400 * 1000));
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      }
    }

    const str = String(val).trim();
    if (str.includes('/')) {
      const parts = str.split('/');
      if (parts.length >= 3) {
        const d = parts[0].padStart(2, '0');
        const m = parts[1].padStart(2, '0');
        let y = parts[2];
        if (y.length === 2) y = `20${y}`;
        return `${d}/${m}/${y}`;
      }
    }

    if (str.includes('-')) {
      const parts = str.split('-');
      if (parts.length >= 3) {
        if (parts[0].length === 4) {
          return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
        }
        return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
      }
    }
    return str;
  };

  const normalizeCpf = (val: any): string => {
    if (!val) return '';
    const digits = String(val).replace(/\D/g, '');
    if (digits.length === 11) {
      return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return String(val).trim();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    setIsProcessing(true);
    setParseErrors([]);
    setFileName(file.name);
    setFileSize(`${(file.size / 1024).toFixed(1)} KB`);
    setIsSuccessInjected(false);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: false });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, { raw: true, defval: '' });

        if (jsonRows.length === 0) {
          setParseErrors(['A planilha selecionada está vazia ou não contém linhas de dados.']);
          setIsProcessing(false);
          return;
        }

        setRawRowsCount(jsonRows.length);
        executeETL(jsonRows);
      } catch (err: any) {
        setParseErrors([`Falha ao processar o arquivo Excel: ${err?.message || 'Arquivo corrompido ou formato inválido.'}`]);
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      setParseErrors(['Erro de leitura do arquivo no navegador.']);
      setIsProcessing(false);
    };
    reader.readAsBinaryString(file);
  };

  const executeETL = (rows: any[]) => {
    const parsedRows: ParsedRow[] = [];
    const clientMap = new Map<string, Client>();

    const getField = (row: any, ...keys: string[]): any => {
      const rowKeys = Object.keys(row);
      for (const k of keys) {
        const cleanK = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        const matched = rowKeys.find((rk) => {
          const cleanRK = rk.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
          return cleanRK === cleanK || cleanRK.includes(cleanK);
        });
        if (matched && row[matched] !== undefined && row[matched] !== null && row[matched] !== '') {
          return row[matched];
        }
      }
      return '';
    };

    rows.forEach((row, idx) => {
      const rawCpf = String(getField(row, 'cpf', 'documento', 'doc') || '').trim();
      const clientName = String(getField(row, 'cliente', 'nome', 'comprador', 'destinatario') || 'Cliente Histórico').trim();
      const rawDate = getField(row, 'data', 'data venda', 'data pedido', 'data do pedido', 'date');
      const normalizedDate = normalizeDate(rawDate);
      const normalizedCpf = normalizeCpf(rawCpf);

      const phone = String(getField(row, 'telefone', 'celular', 'fone', 'whatsapp', 'tel') || '(11) 99999-9999').trim();
      const email = String(getField(row, 'email', 'e-mail') || '').trim();
      const address = String(getField(row, 'endereco', 'endereço', 'rua', 'logradouro') || 'Endereço não informado').trim();
      const city = String(getField(row, 'cidade', 'municipio') || 'São Paulo').trim();
      const state = String(getField(row, 'estado', 'uf') || 'SP').trim().toUpperCase().slice(0, 2);
      const cep = String(getField(row, 'cep') || '01001-000').trim();

      const rawModel = String(getField(row, 'modelo', 'produto', 'item', 'descricao', 'nome produto') || 'Terço Tradicional').trim();
      
      let rawPriceNum = 0;
      const rawPriceVal = getField(row, 'preco', 'preço', 'valor', 'valor venda', 'total item');
      if (typeof rawPriceVal === 'number') rawPriceNum = rawPriceVal;
      else if (typeof rawPriceVal === 'string') {
        const cleanPrice = rawPriceVal.replace('R$', '').replace(/\s/g, '').replace('.', '').replace(',', '.');
        rawPriceNum = parseFloat(cleanPrice) || 0;
      }

      let qty = 1;
      const rawQty = getField(row, 'qtd', 'quantidade', 'qtde');
      if (typeof rawQty === 'number' && rawQty > 0) qty = rawQty;
      else if (typeof rawQty === 'string') {
        const parsedQ = parseInt(rawQty, 10);
        if (!isNaN(parsedQ) && parsedQ > 0) qty = parsedQ;
      }

      let rawCostNum = 0;
      const rawCostVal = getField(row, 'custo', 'custo producao', 'custo produto');
      if (typeof rawCostVal === 'number') rawCostNum = rawCostVal;
      else if (typeof rawCostVal === 'string') {
        const cleanCost = rawCostVal.replace('R$', '').replace(/\s/g, '').replace('.', '').replace(',', '.');
        rawCostNum = parseFloat(cleanCost) || 0;
      }

      const paymentRaw = String(getField(row, 'pagto', 'pagamento', 'forma de pagto', 'forma de pagamento', 'forma pgto') || 'PIX');
      const detectedPayment = detectPaymentMethod(paymentRaw);

      let shippingChargedVal = 0;
      const rawShippingCharged = getField(row, 'frete cobrado', 'frete', 'envio');
      if (typeof rawShippingCharged === 'number') shippingChargedVal = rawShippingCharged;
      else if (typeof rawShippingCharged === 'string') {
        const cleanS = rawShippingCharged.replace('R$', '').replace(/\s/g, '').replace('.', '').replace(',', '.');
        shippingChargedVal = parseFloat(cleanS) || 0;
      }

      let shippingPaidVal = 0;
      const rawShippingPaid = getField(row, 'frete pago', 'custo frete', 'frete cotado');
      if (typeof rawShippingPaid === 'number') shippingPaidVal = rawShippingPaid;
      else if (typeof rawShippingPaid === 'string') {
        const cleanS = rawShippingPaid.replace('R$', '').replace(/\s/g, '').replace('.', '').replace(',', '.');
        shippingPaidVal = parseFloat(cleanS) || 0;
      }

      const hasShippingPaidCol = Object.keys(row).some(k => {
        const cl = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        return cl.includes('frete pago') || cl.includes('frete cotado') || cl.includes('custo frete');
      });
      if (!hasShippingPaidCol && shippingPaidVal === 0 && shippingChargedVal > 0) {
        shippingPaidVal = shippingChargedVal;
      }

      // Novos campos de logística com regra para Mão Própria
      let rawPlatform = String(getField(row, 'plataforma', 'plataforma de envio', 'plataforma envio') || '').trim();
      let rawCarrier = String(getField(row, 'transportadora', 'forma de envio', 'envio via') || '').trim();
      const rawTracking = String(getField(row, 'rastreio', 'codigo de rastreio', 'rastreamento', 'tracking') || '').trim();

      const combinedShippingText = `${rawPlatform} ${rawCarrier}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (combinedShippingText.includes('mao propria')) {
        rawPlatform = 'Mão Própria';
        rawCarrier = 'Mão Própria';
      } else {
        rawPlatform = rawPlatform || 'Melhor Envio';
        rawCarrier = rawCarrier || 'Correios PAC';
      }

      const oldOrderId = String(getField(row, 'pedido', 'num pedido', 'id pedido') || '');
      const productResolution = processModelString(rawModel, rawPriceNum, rawCostNum);

      parsedRows.push({
        rowIndex: idx + 1,
        rawCpf,
        normalizedCpf,
        rawDate: String(rawDate),
        normalizedDate,
        clientName,
        phone,
        email,
        address,
        city,
        state,
        cep,
        rawModel,
        price: productResolution.salePrice,
        quantity: qty,
        cost: productResolution.costPrice,
        paymentMethodRaw: paymentRaw,
        paymentMethod: detectedPayment.method,
        shippingCharged: shippingChargedVal,
        shippingPaid: shippingPaidVal,
        shippingPlatform: rawPlatform,
        carrier: rawCarrier,
        trackingCode: rawTracking,
        oldOrderId,
        translatedModel: productResolution.translatedModel,
        category: productResolution.category,
        subCategory: productResolution.subCategory,
        isAncient: productResolution.isAncient,
        sku: productResolution.sku,
      });

      const clientKey = normalizedCpf || clientName.toLowerCase();
      if (!clientMap.has(clientKey)) {
        clientMap.set(clientKey, {
          id: `CLI-${Date.now()}-${idx}`,
          name: clientName,
          cpf: normalizedCpf,
          phone,
          email,
          address,
          city,
          state,
          cep,
        });
      }
    });

    const groups = new Map<string, ParsedRow[]>();

    parsedRows.forEach((row) => {
      const cpfPart = row.normalizedCpf ? row.normalizedCpf.replace(/\D/g, '') : `NOCPF_${row.clientName.toLowerCase().replace(/\s+/g, '_')}`;
      const groupKey = `${cpfPart}__${row.normalizedDate}`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(row);
    });

    const assembledOrders: GroupedOrderPreview[] = [];
    let orderSeq = 1;

    groups.forEach((groupRows, key) => {
      const firstRow = groupRows[0];
      const items: OrderItem[] = [];
      let totalShippingCharged = 0;
      let totalShippingPaid = 0;
      let ancientCount = 0;
      let matchedCount = 0;

      groupRows.forEach((r, itemIdx) => {
        const itemTotal = r.price * r.quantity;
        const itemCostTotal = r.cost * r.quantity;

        if (r.isAncient) ancientCount++;
        else matchedCount++;

        items.push({
          id: `ITM-IMP-${orderSeq}-${itemIdx + 1}`,
          productId: r.sku,
          code: r.sku || (r.isAncient ? 'ANTIGO' : 'TERCO'),
          category: r.category,
          subCategory: r.subCategory,
          model: r.translatedModel,
          quantity: r.quantity,
          unitPrice: r.price,
          costPrice: r.cost,
          totalPrice: itemTotal,
          totalCost: itemCostTotal,
        });

        if (r.shippingCharged > 0 && totalShippingCharged === 0) {
          totalShippingCharged = r.shippingCharged;
          totalShippingPaid = r.shippingPaid;
        }
      });

      const subtotal = items.reduce((acc, it) => acc + it.totalPrice, 0);
      const totalCost = items.reduce((acc, it) => acc + it.totalCost, 0);
      const totalSale = subtotal + totalShippingCharged;

      const feeRate = PAYMENT_FEE_RATES[firstRow.paymentMethod] || 0.0;
      const gatewayFee = subtotal * feeRate;
      
      const shippingSurplus = totalShippingCharged - totalShippingPaid;
      const estimatedNetProfit = (subtotal - totalCost - gatewayFee) + shippingSurplus;

      const targetDate = firstRow.normalizedDate;
      const generatedId = calculateNextOrderId(targetDate, [
        ...orders,
        ...assembledOrders.map(o => ({ id: o.orderId } as Order))
      ]);

      assembledOrders.push({
        groupKey: key,
        orderId: generatedId || `IMP${String(orderSeq).padStart(3, '0')}`,
        clientCpf: firstRow.normalizedCpf,
        clientName: firstRow.clientName,
        clientPhone: firstRow.phone,
        clientEmail: firstRow.email,
        clientCity: firstRow.city,
        clientState: firstRow.state,
        clientAddress: firstRow.address,
        clientCep: firstRow.cep,
        orderDate: firstRow.normalizedDate,
        paymentMethod: firstRow.paymentMethod,
        paymentMethodRaw: firstRow.paymentMethodRaw,
        isCreditCard: firstRow.paymentMethod.startsWith('credito'),
        isPix: firstRow.paymentMethod === 'pix',
        feeRate,
        subtotal,
        shippingCharged: totalShippingCharged,
        shippingPaid: totalShippingPaid,
        shippingPlatform: firstRow.shippingPlatform,
        carrier: firstRow.carrier,
        trackingCode: firstRow.trackingCode,
        totalSale,
        totalCost,
        estimatedNetProfit,
        items,
        hasAncientItems: ancientCount > 0,
        ancientItemsCount: ancientCount,
        matchedItemsCount: matchedCount,
      });

      orderSeq++;
    });

    setGroupedOrders(assembledOrders);
    setExtractedClients(Array.from(clientMap.values()));
    setIsProcessing(false);
  };

  const handleConfirmAndInject = () => {
    if (groupedOrders.length === 0) return;

    const finalOrders: Order[] = groupedOrders.map((grp) => {
      const summaryText = grp.items.length === 1 
        ? grp.items[0].model 
        : `${grp.items[0].model} (+${grp.items.length - 1} ${grp.items.length - 1 === 1 ? 'item' : 'itens'})`;

      return {
        id: grp.orderId,
        codigoCliente: gerarCodigoCliente(),
        clientName: grp.clientName,
        clientCpf: grp.clientCpf,
        clientEmail: grp.clientEmail,
        clientPhone: grp.clientPhone,
        clientAddress: grp.clientAddress,
        clientCity: grp.clientCity,
        clientState: grp.clientState,
        clientCep: grp.clientCep,
        items: grp.items,
        item: summaryText,
        itemModel: grp.items[0]?.model || 'Terço Tradicional',
        subtotal: grp.subtotal,
        discountPercent: 0,
        discount: 0,
        saleValue: grp.totalSale,
        shippingCharged: grp.shippingCharged,
        shippingPaid: grp.shippingPaid,
        productionCost: grp.totalCost,
        paymentMethod: grp.paymentMethod,
        paymentStatus: 'pago',
        paymentNote: `Importado de planilha (${grp.paymentMethodRaw})`,
        originalSaleValue: grp.totalSale,
        status: (grp.trackingCode ? 'despachado' : 'entregue') as OrderStatus,
        shippingPlatform: (grp.shippingPlatform || 'Melhor Envio') as ShippingPlatform,
        carrier: (grp.carrier || 'Correios PAC') as ShippingCarrier,
        trackingCode: grp.trackingCode,
        createdAt: grp.orderDate,
        notes: `Histórico importado via ETL. ${grp.items.length} ${grp.items.length === 1 ? 'item agrupado' : 'itens agrupados'}. Agrupamento inteligente por CPF + DATA.`,
        history: [
          {
            status: 'entregue' as OrderStatus,
            timestamp: `${grp.orderDate} 12:00`,
            note: 'Venda histórica importada e registrada com sucesso.',
          },
        ],
      };
    });

    onBatchInject(finalOrders, extractedClients);
    setIsSuccessInjected(true);
    setInjectedStats({
      orders: finalOrders.length,
      clients: extractedClients.length,
    });
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        CPF: '123.456.789-00',
        DATA: '15/10/2026',
        CLIENTE: 'Maria Aparecida Santos',
        TELEFONE: '(11) 98765-4321',
        EMAIL: 'maria.santos@email.com',
        ENDERECO: 'Rua das Flores, 120, Apto 42',
        CIDADE: 'Campinas',
        ESTADO: 'SP',
        CEP: '13010-000',
        MODELO: 'All Black',
        PRECO: 109.90,
        QTD: 1,
        PAGTO: 'PIX',
        'FRETE COBRADO': 22.00,
        'FRETE PAGO': 20.00,
        PLATAFORMA: 'Melhor Envio',
        TRANSPORTADORA: 'Correios PAC',
        RASTREIO: 'JD123456789BR'
      },
      {
        CPF: '123.456.789-00',
        DATA: '15/10/2026',
        CLIENTE: 'Maria Aparecida Santos',
        TELEFONE: '(11) 98765-4321',
        EMAIL: 'maria.santos@email.com',
        ENDERECO: 'Rua das Flores, 120, Apto 42',
        CIDADE: 'Campinas',
        ESTADO: 'SP',
        CEP: '13010-000',
        MODELO: 'Medalha São Bento Extra',
        PRECO: 10.00,
        QTD: 2,
        PAGTO: 'PIX',
        'FRETE COBRADO': 0,
        'FRETE PAGO': 0,
        PLATAFORMA: '',
        TRANSPORTADORA: '',
        RASTREIO: ''
      },
      {
        CPF: '987.654.321-11',
        DATA: '16/10/2026',
        CLIENTE: 'João Paulo Silva',
        TELEFONE: '(21) 99887-6655',
        EMAIL: '',
        ENDERECO: 'Av. Copacabana, 500',
        CIDADE: 'Rio de Janeiro',
        ESTADO: 'RJ',
        CEP: '22020-001',
        MODELO: 'SM Defensor',
        PRECO: 134.90,
        QTD: 1,
        PAGTO: 'CARTÃO',
        'FRETE COBRADO': 28.00,
        'FRETE PAGO': 25.50,
        PLATAFORMA: 'SuperFrete',
        TRANSPORTADORA: 'Correios SEDEX',
        RASTREIO: ''
      },
      {
        CPF: '555.444.333-22',
        DATA: '17/10/2026',
        CLIENTE: 'Clara Silveira',
        TELEFONE: '(31) 98877-1122',
        EMAIL: 'clara@silveira.com',
        ENDERECO: 'Rua da Bahia, 1000',
        CIDADE: 'Belo Horizonte',
        ESTADO: 'MG',
        CEP: '30160-011',
        MODELO: 'Graças Vinho 8mm',
        PRECO: 74.90,
        QTD: 1,
        PAGTO: 'PIX',
        'FRETE COBRADO': 20.00,
        'FRETE PAGO': 20.00,
        PLATAFORMA: 'Mão Própria',
        TRANSPORTADORA: 'Mão Própria',
        RASTREIO: ''
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo_Vendas');
    XLSX.writeFile(wb, 'modelo_importacao_vendas_tercarium.xlsx');
  };

  const handleLoadDemoData = () => {
    const demoData = [
      {
        cpf: '123.456.789-00',
        data: '15/10/2026',
        cliente: 'Maria Aparecida Santos',
        telefone: '(11) 98765-4321',
        email: 'maria.santos@email.com',
        endereco: 'Rua das Flores, 120, Apto 42',
        cidade: 'Campinas',
        estado: 'SP',
        cep: '13010-000',
        modelo: 'All Black',
        preco: 109.90,
        qtd: 1,
        pagto: 'PIX',
        'frete cobrado': 22.00,
        'frete pago': 20.00,
        plataforma: 'Melhor Envio',
        transportadora: 'Correios PAC',
        rastreio: 'BR123456789BR'
      },
      {
        cpf: '123.456.789-00',
        data: '15/10/2026',
        cliente: 'Maria Aparecida Santos',
        telefone: '(11) 98765-4321',
        email: 'maria.santos@email.com',
        endereco: 'Rua das Flores, 120, Apto 42',
        cidade: 'Campinas',
        estado: 'SP',
        cep: '13010-000',
        modelo: 'Medalha São Bento Extra',
        preco: 10.00,
        qtd: 2,
        pagto: 'PIX',
        'frete cobrado': 0,
        'frete pago': 0,
      },
      {
        cpf: '987.654.321-11',
        data: '16/10/2026',
        cliente: 'João Paulo Silva',
        telefone: '(21) 99887-6655',
        email: '',
        endereco: 'Av. Copacabana, 500',
        cidade: 'Rio de Janeiro',
        estado: 'RJ',
        cep: '22020-001',
        modelo: 'SM Defensor',
        preco: 134.90,
        qtd: 1,
        pagto: 'CARTÃO 2X',
        'frete cobrado': 28.00,
        'frete pago': 25.50,
        plataforma: 'SuperFrete',
        transportadora: 'Correios SEDEX'
      },
      {
        cpf: '555.444.333-22',
        data: '17/10/2026',
        cliente: 'Clara Silveira',
        telefone: '(31) 98877-1122',
        email: 'clara@silveira.com',
        endereco: 'Rua da Bahia, 1000',
        cidade: 'Belo Horizonte',
        estado: 'MG',
        cep: '30160-011',
        modelo: 'Graças Vinho 8mm',
        preco: 74.90,
        qtd: 1,
        pagto: 'PIX',
        'frete cobrado': 0.00,
        'frete pago': 0.00,
        transportadora: 'Mão Propria'
      },
      {
        cpf: '777.888.999-00',
        data: '18/10/2026',
        cliente: 'Renato Antunes',
        telefone: '(41) 97766-5544',
        email: '',
        endereco: 'Rua XV de Novembro, 250',
        cidade: 'Curitiba',
        estado: 'PR',
        cep: '80020-310',
        modelo: 'Rosário Rústico Madeira Especial Edição 2023',
        preco: 89.00,
        qtd: 1,
        pagto: 'CARTÃO x1',
        'frete cobrado': 25.00,
        'frete pago': 22.00,
      },
    ];

    setFileName('dados_demonstracao_historico.xlsx');
    setFileSize('14.2 KB');
    setRawRowsCount(demoData.length);
    executeETL(demoData);
  };

  const toggleExpand = (groupKey: string) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const summaryTotals = useMemo(() => {
    const totalVenda = groupedOrders.reduce((acc, o) => acc + o.totalSale, 0);
    const totalLucroEstimado = groupedOrders.reduce((acc, o) => acc + o.estimatedNetProfit, 0);
    const totalItens = groupedOrders.reduce((acc, o) => acc + o.items.reduce((sum, it) => sum + it.quantity, 0), 0);
    const totalAncient = groupedOrders.reduce((acc, o) => acc + o.ancientItemsCount, 0);
    const totalMatched = groupedOrders.reduce((acc, o) => acc + o.matchedItemsCount, 0);

    return { totalVenda, totalLucroEstimado, totalItens, totalAncient, totalMatched };
  }, [groupedOrders]);

  return (
    <div className="space-y-6">
      {/* Banner de Cabeçalho do Módulo */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 sm:p-6 rounded-2xl border border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              Ferramenta Interna de ETL & Migração
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Excel (.xlsx / .csv)
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-400 shrink-0" />
            Importação de Histórico de Vendas
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed">
            Faça upload da planilha histórica do ateliê. O motor de ETL agrupa linhas com o mesmo <strong>CPF + DATA</strong> num único carrinho, normaliza as regras contábeis de <strong>PIX vs Cartão</strong>, traduz a nomenclatura do catálogo e aplica o fallback de <strong>Compras Antigas</strong> sem corromper o financeiro.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 shadow-2xs transition-colors cursor-pointer"
            title="Baixar planilha de exemplo com as colunas corretas"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Planilha Modelo (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={handleLoadDemoData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-2xs transition-all cursor-pointer"
            title="Carregar lote simulado para conferência instantânea"
          >
            <Sparkles className="w-4 h-4" />
            <span>Testar com Dados Exemplo</span>
          </button>
        </div>
      </div>

      {/* ÁREA DE UPLOAD E DRAG & DROP */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx, .xls, .csv"
          onChange={handleFileUpload}
          className="hidden"
        />

        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) processFile(file);
          }}
          className="border-2 border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/40 hover:bg-amber-50/70 p-8 rounded-2xl text-center cursor-pointer transition-all group"
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-100 group-hover:bg-amber-200 text-amber-700 flex items-center justify-center mx-auto mb-3 transition-colors shadow-2xs">
            <UploadCloud className="w-7 h-7" />
          </div>

          <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-900 mb-1">
            {fileName ? `Arquivo: ${fileName} (${fileSize})` : 'Clique ou arraste a planilha histórica (.xlsx ou .csv)'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {fileName 
              ? 'Arquivo pronto para análise e injeção. Clique para escolher outro arquivo.' 
              : 'Compatível com relatórios do Excel, Google Sheets, Bling, Tiny, Nuvemshop ou planilhas internas.'}
          </p>

          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs group-hover:border-amber-400">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Selecionar Ficheiro do Computador</span>
          </div>
        </div>

        {/* Resumo das Regras Ativas de Negócio (ETL) */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-slate-100 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
              Agrupamento CPF + DATA
            </span>
            <p className="text-[11px] text-slate-500">
              Linhas com o mesmo CPF na mesma DATA viram itens de um só carrinho. A antiga coluna PEDIDO é desconsiderada.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
              Regra Financeira (PIX vs Cartão)
            </span>
            <p className="text-[11px] text-slate-500">
              PIX tem taxa zero (valor líquido). Cartão deduz a taxa de plataforma para compor o DRE real de forma conservadora.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <Archive className="w-3.5 h-3.5 text-purple-600" />
              Dicionário e Compras Antigas
            </span>
            <p className="text-[11px] text-slate-500">
              Traduz SM para São Miguel (Raízes/Fidelis) e 8mm. Modelos não reconhecidos são marcados como "Compras Antigas".
            </p>
          </div>
        </div>
      </div>

      {/* FEEDBACK DE ERRO SE HOUVER */}
      {parseErrors.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1 text-xs">
          <div className="font-bold flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            Problemas encontrados no processamento:
          </div>
          {parseErrors.map((err, i) => (
            <p key={i} className="text-[11px] text-rose-700">{err}</p>
          ))}
        </div>
      )}

      {/* FEEDBACK DE SUCESSO APÓS INJEÇÃO */}
      {isSuccessInjected && injectedStats && (
        <div className="p-5 rounded-2xl bg-emerald-950 text-white border border-emerald-700 shadow-sm space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-emerald-200">
                  Dados Injetados com Sucesso no ERP!
                </h3>
                <p className="text-xs text-emerald-300/80">
                  {injectedStats.orders} pedidos históricos agrupados e {injectedStats.clients} clientes foram integrados ao banco de dados ativo.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onNavigateToOrders}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <span>Ver Pedidos no Módulo Comercial</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* RESULTADOS DA LEITURA E INTERFACE DE CONFIRMAÇÃO */}
      {groupedOrders.length > 0 && (
        <div className="space-y-4">
          {/* PAINEL DE KPIS DO LOTE */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Linhas Lidas vs Pedidos
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900">
                  {groupedOrders.length}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  (de {rawRowsCount} linhas)
                </span>
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold block">
                Agrupados por CPF + DATA
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Clientes Mapeados
              </span>
              <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900">
                {extractedClients.length}
              </div>
              <span className="text-[11px] text-slate-500 block">
                Prontos para cadastro na base
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Valor Total do Lote
              </span>
              <div className="text-xl sm:text-2xl font-bold font-mono text-amber-700">
                {formatBRL(summaryTotals.totalVenda)}
              </div>
              <span className="text-[11px] text-slate-500 block">
                {summaryTotals.totalItens} produtos no total
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Lucro Líquido Estimado
              </span>
              <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-700">
                {formatBRL(summaryTotals.totalLucroEstimado)}
              </div>
              <span className="text-[11px] text-emerald-600 block">
                Taxas PIX e Cartão deduzidas
              </span>
            </div>
          </div>

          {/* BARRA DE AÇÃO PRINCIPAL: CONFIRMAR E INJETAR */}
          <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  Validação Concluída
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {groupedOrders.length} pedidos · {extractedClients.length} clientes
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Confira a listagem abaixo. Ao confirmar, os registros serão adicionados ao histórico operacional e refletirão imediatamente no DRE, pedidos e clientes.
              </p>
            </div>

            <button
              type="button"
              disabled={isSuccessInjected}
              onClick={handleConfirmAndInject}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all cursor-pointer shrink-0"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isSuccessInjected ? 'Dados Já Injetados' : 'Confirmar e Injetar Dados'}</span>
            </button>
          </div>

          {/* TABELA DE PRÉ-VISUALIZAÇÃO DOS PEDIDOS AGRUPADOS */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-amber-600" />
                  Demonstrativo dos Pedidos Prontos para Injeção ({groupedOrders.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Clique na linha para expandir e verificar os itens individuais agrupados no carrinho.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-medium">
                  {summaryTotals.totalMatched} SKUs Reconhecidos
                </span>
                {summaryTotals.totalAncient > 0 && (
                  <span className="px-2 py-1 rounded-md bg-purple-50 text-purple-800 border border-purple-200 text-[10px] font-medium">
                    {summaryTotals.totalAncient} Compras Antigas (Fallback)
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Pedido / Data</th>
                    <th className="py-3 px-4">Cliente / CPF</th>
                    <th className="py-3 px-4">Itens Agrupados</th>
                    <th className="py-3 px-4">Pagamento / Taxa</th>
                    <th className="py-3 px-4 text-right">Subtotal</th>
                    <th className="py-3 px-4 text-right">Frete / Logística</th>
                    <th className="py-3 px-4 text-right">Total Pedido</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {groupedOrders.map((order) => {
                    const isExpanded = !!expandedOrders[order.groupKey];

                    return (
                      <React.Fragment key={order.groupKey}>
                        <tr 
                          onClick={() => toggleExpand(order.groupKey)}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                        >
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-slate-900 block">
                              #{order.orderId}
                            </span>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {order.orderDate}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 block">
                              {order.clientName}
                            </span>
                            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                              <span>{order.clientCpf || 'Sem CPF'}</span>
                              <span className="text-slate-300">·</span>
                              <span>{order.clientCity}/{order.clientState}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-bold font-mono text-[10px] border border-slate-200">
                                {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
                              </span>
                              {order.hasAncientItems && (
                                <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium text-[10px] border border-purple-200">
                                  Compras Antigas
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 truncate max-w-xs block mt-1">
                              {order.items.map((it) => `${it.quantity}x ${it.model}`).join(', ')}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              {order.isPix ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[10px] flex items-center gap-1">
                                  <QrCode className="w-3 h-3 text-emerald-600" />
                                  PIX (0% taxa)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold text-[10px] flex items-center gap-1">
                                  <CreditCard className="w-3 h-3 text-indigo-600" />
                                  Cartão ({(order.feeRate * 100).toFixed(1)}% taxa)
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                              {order.paymentMethodRaw}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right font-mono font-medium text-slate-700">
                            {formatBRL(order.subtotal)}
                          </td>

                          <td className="py-3 px-4 text-right font-mono text-slate-500">
                            <div className="text-slate-800 font-bold">
                              {order.shippingCharged > 0 ? formatBRL(order.shippingCharged) : 'Grátis'}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center justify-end gap-1 mt-0.5">
                              <Truck className="w-3 h-3" />
                              {order.carrier}
                            </div>
                            {order.shippingPaid > 0 && order.shippingPaid !== order.shippingCharged && (
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Custo Pago: {formatBRL(order.shippingPaid)}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            {formatBRL(order.totalSale)}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(order.groupKey);
                              }}
                              className="p-1 rounded-md hover:bg-slate-200 text-slate-500 cursor-pointer"
                              title="Expandir detalhes dos itens"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-amber-50/40 border-b border-amber-100">
                            <td colSpan={8} className="py-3 px-6">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-[11px] text-amber-900 font-semibold border-b border-amber-200/60 pb-1">
                                  <span>Composição do Carrinho de Compras (#{order.orderId}):</span>
                                  <div className="flex gap-4">
                                    {order.trackingCode && <span>Rastreio: {order.trackingCode}</span>}
                                    <span>Total de Peças: {order.items.reduce((s, i) => s + i.quantity, 0)}</span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 divide-y divide-amber-100 text-[11px]">
                                  {order.items.map((it, itIdx) => (
                                    <div key={itIdx} className="py-1.5 flex items-center justify-between gap-4">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-slate-700">
                                          {it.quantity}x
                                        </span>
                                        <span className="font-semibold text-slate-900">
                                          {it.model}
                                        </span>
                                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-medium border ${
                                          it.category === 'Compras Antigas'
                                            ? 'bg-purple-100 text-purple-900 border-purple-200'
                                            : 'bg-emerald-100 text-emerald-900 border-emerald-200'
                                        }`}>
                                          {it.category} {it.subCategory ? `(${it.subCategory})` : ''}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-4 font-mono text-slate-700">
                                        <span>Unit: {formatBRL(it.unitPrice)}</span>
                                        <span className="text-slate-400">· Custo: {formatBRL(it.costPrice)}</span>
                                        <span className="font-bold text-slate-900">Total: {formatBRL(it.totalPrice)}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
