import React, { useState, useMemo, useEffect } from 'react';
import { 
  MessageSquare, 
  Copy, 
  Check, 
  Clock,
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
  AlertCircle,
  MapPin,
  Search,
  SlidersHorizontal,
  UserCheck,
  ArrowLeft
} from 'lucide-react';
import { Product, sortProductsHierarchically, Client, SavedBudget, PrefilledFreightData } from '../types/erp';
import { formatBRL, maskCEP } from '../utils/formatters';
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

// Interfaces e Constantes da Cotação de Frete
export interface CarrierOption {
  transportadora: string;
  plataforma: 'MELHOR ENVIO' | 'FRENET' | string;
  preco: number;
  prazo: number;
  error?: string;
  [key: string]: any;
}

const CEP_ORIGEM = "86050464"; // Londrina - PR (Ateliê Terçarium)
const URL_DO_SERVIDOR_GOOGLE = "https://script.google.com/macros/s/AKfycbyobO3yCc4MaOwab8EXF1tclVRXXxV5xoXZz8ktUVz_kfNCTjQvAKhI6tow6YPF7I962Q/exec";

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

  // CARRINHO DE COMPRAS
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>(
    mainCatalogProducts[0]?.id || sortedProducts[0]?.id || ''
  );
  const [selectedExtraProductId, setSelectedExtraProductId] = useState<string>('');
  const [itemObservacao, setItemObservacao] = useState<string>('');
  const [addQuantity, setAddQuantity] = useState<number>(1);
  const [showItemPicker, setShowItemPicker] = useState<boolean>(false);

  // --- LÓGICA DE FRETE INTEGRADA ---
  const [activeFreightView, setActiveFreightView] = useState<'formulario' | 'interno' | 'cliente'>('formulario');
  const [cepDestino, setCepDestino] = useState('');
  const [cidadeEstado, setCidadeEstado] = useState('');
  const [peso, setPeso] = useState<number | ''>(200);
  const [altura, setAltura] = useState<number | ''>(6);
  const [largura, setLargura] = useState<number | ''>(17);
  const [comprimento, setComprimento] = useState<number | ''>(17);
  
  const [isSearchingFreight, setIsSearchingFreight] = useState(false);
  const [freightError, setFreightError] = useState<string | null>(null);
  const [dadosCotacoes, setDadosCotacoes] = useState<CarrierOption[]>([]);
  const [ordenacao, setOrdenacao] = useState<'barato' | 'rapido'>('barato');
  const [selectedFreightKey, setSelectedFreightKey] = useState<string | null>(null);

  // Helper: Cálculo da Margem / Preço para o Cliente
  const getCustomerPrice = (costPrice: number) => {
    let acrescimo = 1.00;
    if (costPrice <= 20.00) {
      acrescimo = 1.80;
    } else if (costPrice <= 30.00) {
      acrescimo = 1.50;
    }
    return costPrice + acrescimo;
  };

  // Helper: Janela de entrega estimada para o cliente (+- 1 dia)
  const getCustomerWindow = (prazo: number) => {
    let min = prazo - 1;
    let max = prazo + 1;
    if (min < 1) {
      min = 1;
      max = 2;
    }
    return { min, max };
  };

  const sortedCotacoes = useMemo(() => {
    const list = [...dadosCotacoes];
    if (ordenacao === 'barato') {
      list.sort((a, b) => a.preco - b.preco);
    } else {
      list.sort((a, b) => a.prazo - b.prazo);
    }
    return list;
  }, [dadosCotacoes, ordenacao]);

  const minPrice = useMemo(() => {
    if (dadosCotacoes.length === 0) return 0;
    return Math.min(...dadosCotacoes.map((c) => c.preco));
  }, [dadosCotacoes]);

  const minPrazo = useMemo(() => {
    if (dadosCotacoes.length === 0) return 0;
    return Math.min(...dadosCotacoes.map((c) => c.prazo));
  }, [dadosCotacoes]);

  const handleCepSearch = async (val: string) => {
    const masked = maskCEP(val);
    setCepDestino(masked);

    const clean = masked.replace(/\D/g, '');
    if (clean.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setCidadeEstado(`${data.localidade}-${data.uf}`);
        } else {
          setCidadeEstado(`CEP ${clean}`);
        }
      } catch {
        setCidadeEstado(`CEP ${clean}`);
      }
    } else {
      setCidadeEstado('');
    }
  };

  const handleCalcularFrete = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanCep = cepDestino.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      setFreightError('Digite um CEP válido com 8 dígitos numéricos.');
      return;
    }

    const numValorDeclarado = subtotalProducts;
    if (numValorDeclarado <= 0) {
      setFreightError('Adicione itens ao carrinho para obter o Valor dos Itens obrigatório.');
      return;
    }

    const numPeso = typeof peso === 'number' ? peso : parseFloat(String(peso)) || 200;
    const numAltura = typeof altura === 'number' ? altura : parseFloat(String(altura)) || 6;
    const numLargura = typeof largura === 'number' ? largura : parseFloat(String(largura)) || 17;
    const numComprimento = typeof comprimento === 'number' ? comprimento : parseFloat(String(comprimento)) || 17;

    setFreightError(null);
    setIsSearchingFreight(true);

    let cidadeAtual = cidadeEstado;
    if (!cidadeAtual) {
      try {
        const viaCepRes = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const viaCepData = await viaCepRes.json();
        if (!viaCepData.erro) {
          cidadeAtual = `${viaCepData.localidade}-${viaCepData.uf}`;
          setCidadeEstado(cidadeAtual);
        } else {
          cidadeAtual = `CEP ${cleanCep}`;
          setCidadeEstado(cidadeAtual);
        }
      } catch {
        cidadeAtual = `CEP ${cleanCep}`;
        setCidadeEstado(cidadeAtual);
      }
    }

    const payload = {
      from: { postal_code: CEP_ORIGEM },
      to: { postal_code: cleanCep },
      package: {
        weight: numPeso / 1000,
        width: numLargura,
        height: numAltura,
        length: numComprimento,
      },
      options: {
        insurance_value: numValorDeclarado,
        receipt: false,
        own_hand: false,
      },
    };

    try {
      const response = await fetch(URL_DO_SERVIDOR_GOOGLE, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.error) {
        setFreightError(`Falha no cálculo: ${data.error}`);
        setIsSearchingFreight(false);
        return;
      }

      if (!Array.isArray(data)) {
        setFreightError('Resposta inesperada da central de fretes. Tente novamente.');
        setIsSearchingFreight(false);
        return;
      }

      const cotacoesProcessadas: CarrierOption[] = [];

      data.forEach((opcao: any) => {
        const transportadora = String(opcao.transportadora || '').toUpperCase();
        const plataforma = String(opcao.plataforma || '');

        const isCorreiosPAC = transportadora.includes("CORREIOS") && transportadora.includes("PAC");
        const isCorreiosSedex = transportadora.includes("CORREIOS") && transportadora.includes("SEDEX");
        const isLoggi = transportadora.includes("LOGGI");

        let preco = parseFloat(opcao.preco) || 0;
        const prazo = parseInt(opcao.prazo, 10) || 0;

        if (plataforma === "FRENET") {
          if (isCorreiosPAC || isCorreiosSedex) {
            preco += 1.10;
          }
          if (isCorreiosPAC || isCorreiosSedex || isLoggi) {
            cotacoesProcessadas.push({
              ...opcao,
              preco,
              prazo,
              transportadora: opcao.transportadora,
              plataforma,
            });
          }
        } else {
          const isLoggiExpress = isLoggi && transportadora.includes("EXPRESS");
          const isLoggiPonto = isLoggi && transportadora.includes("PONTO");
          const isJTStandard = (transportadora.includes("J&T") || transportadora.includes("JET")) && transportadora.includes("STANDARD");

          if (isCorreiosPAC || isCorreiosSedex || isLoggiExpress || isLoggiPonto || isJTStandard) {
            cotacoesProcessadas.push({
              ...opcao,
              preco,
              prazo,
              transportadora: opcao.transportadora,
              plataforma,
            });
          }
        }
      });

      setDadosCotacoes(cotacoesProcessadas);
      setIsSearchingFreight(false);
      setActiveFreightView('cliente'); 
    } catch (err: any) {
      console.error('Erro na cotação:', err);
      setFreightError('Erro ao conectar com o servidor de cotação. Verifique a conexão e tente novamente.');
      setIsSearchingFreight(false);
    }
  };

  const selectCarrierResult = (carrier: CarrierOption) => {
    // 1. Normaliza Plataforma
    let plataformaSelecionada = 'Melhor Envio';
    const platLow = (carrier.plataforma || '').toLowerCase();
    if (platLow.includes('frenet')) plataformaSelecionada = 'Frenet';
    else if (platLow.includes('superfrete') || platLow.includes('super frete')) plataformaSelecionada = 'SuperFrete';
    else if (platLow.includes('correios')) plataformaSelecionada = 'Contrato Correios';
    else if (platLow.includes('melhor envio') || platLow.includes('melhor')) plataformaSelecionada = 'Melhor Envio';
    else if (carrier.plataforma) plataformaSelecionada = carrier.plataforma;

    setSelectedPlatform(plataformaSelecionada);
    if(plataformaSelecionada !== 'Melhor Envio' && plataformaSelecionada !== 'Frenet' && plataformaSelecionada !== 'SuperFrete' && plataformaSelecionada !== 'Contrato Correios') {
       setSelectedPlatform('Outra');
       setCustomPlatform(plataformaSelecionada);
    }
    
    // 2. Normaliza Transportadora
    let transportadoraSelecionada = 'Correios PAC';
    const transpUp = (carrier.transportadora || '').toUpperCase();
    if (transpUp.includes('SEDEX')) transportadoraSelecionada = 'Correios SEDEX';
    else if (transpUp.includes('PAC')) transportadoraSelecionada = 'Correios PAC';
    else if (transpUp.includes('JADLOG')) transportadoraSelecionada = 'Jadlog';
    else if (transpUp.includes('LOGGI')) transportadoraSelecionada = 'Loggi';
    else if (transpUp.includes('J&T') || transpUp.includes('JET')) transportadoraSelecionada = 'Transportadora J&T Express';
    else if (carrier.transportadora) transportadoraSelecionada = carrier.transportadora;

    setSelectedShippingOption(transportadoraSelecionada as ShippingOption);
    if(SHIPPING_OPTIONS.indexOf(transportadoraSelecionada as ShippingOption) === -1) {
       setSelectedShippingOption('Outra');
       setCustomShippingOption(transportadoraSelecionada);
    }
    
    const { min, max } = getCustomerWindow(carrier.prazo);
    setEstimatedDeliveryTime(`${min} a ${max} dias úteis`);
    
    // Preenche Valores
    const precoFinalCliente = getCustomerPrice(carrier.preco);
    setFreteCotado(carrier.preco.toFixed(2));
    setFreteCobrado(precoFinalCliente.toFixed(2));
    setIsFreteGratis(false);
    
    setToastNotice(`Transportadora ${carrier.transportadora} aplicada ao orçamento!`);
    setTimeout(() => setToastNotice(null), 3000);
  };

  const resolvePlatformOrig = (data?: PrefilledFreightData | null) => {
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

  const resolveCarrierOrig = (data?: PrefilledFreightData | null) => {
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
  
  // Variáveis Finais do Frete
  const [selectedPlatform, setSelectedPlatform] = useState<string>(() => resolvePlatformOrig(prefilledFreight).platform);
  const [customPlatform, setCustomPlatform] = useState<string>(() => resolvePlatformOrig(prefilledFreight).custom);
  const [selectedShippingOption, setSelectedShippingOption] = useState<ShippingOption>(() => resolveCarrierOrig(prefilledFreight).option as ShippingOption);
  const [customShippingOption, setCustomShippingOption] = useState<string>(() => resolveCarrierOrig(prefilledFreight).custom);
  const [estimatedDeliveryTime, setEstimatedDeliveryTime] = useState<string>(() => prefilledFreight?.prazoTexto || '7 dias úteis');

  const [isFreteGratis, setIsFreteGratis] = useState<boolean>(() => {
    if (prefilledFreight) {
      const val = typeof prefilledFreight.freteCobrado === 'number' ? prefilledFreight.freteCobrado : (prefilledFreight.precoFinalCliente ?? 28);
      return val === 0;
    }
    return false;
  });

  const [freteCobrado, setFreteCobrado] = useState<string>(() => {
    if (prefilledFreight) {
      const val = typeof prefilledFreight.freteCobrado === 'number' ? prefilledFreight.freteCobrado : (prefilledFreight.precoFinalCliente ?? 28);
      return Math.round(Number(val || 0) * 100 / 100).toFixed(2);
    }
    return '0.00';
  });

  const [freteCotado, setFreteCotado] = useState<string>(() => {
    if (prefilledFreight) {
      const val = typeof prefilledFreight.freteCotado === 'number' ? prefilledFreight.freteCotado : (prefilledFreight.freteCobrado ?? 22);
      return Math.round(Number(val || 0) * 100 / 100).toFixed(2);
    }
    return '0.00';
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
      }
      setFreteCotado(cotadoNum.toFixed(2));

      if (prefilledFreight.prazoTexto) setEstimatedDeliveryTime(prefilledFreight.prazoTexto);

      const platResolved = resolvePlatformOrig(prefilledFreight);
      setSelectedPlatform(platResolved.platform);
      setCustomPlatform(platResolved.custom);

      const carrierResolved = resolveCarrierOrig(prefilledFreight);
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
      const prefix = `${it.quantity}x `;
      const obsText = it.observacao ? ` (${it.observacao})` : '';
      
      if (it.quantity > 1) {
        return `${prefix}${it.name}${obsText} (R$ ${formatCurrencyValue(it.unitPrice)}/un) = R$ ${formatCurrencyValue(it.totalPrice)}`;
      }
      return `${prefix}${it.name}${obsText} = R$ ${formatCurrencyValue(it.totalPrice)}`;
    });

    const effectiveCarrier = selectedShippingOption === 'Outra' ? (customShippingOption.trim() || 'Outra') : selectedShippingOption;
    const shippingPriceText = isFreteGratis ? 'Frete GRÁTIS' : `R$ ${formatCurrencyValue(numShipping)}`;
    const shippingLine = `Frete (${effectiveCarrier} ${estimatedDeliveryTime || 'A combinar'}) - ${shippingPriceText}`;
    const totalLine = `Valor total: R$ ${formatCurrencyValue(valorTotalNormal)}`;

    const paymentLine1 = `R$ ${formatCurrencyValue(valorTotalNormal)} Cartão de crédito em até 3x sem juros via link.`;
    const paymentLine2 = `R$ ${formatCurrencyValue(valorTotalPix)} Pix, desconto de 5% nos produtos.`;
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
    setFreteCobrado('0.00');
    setFreteCotado('0.00');
    setIsSaved(false);
    setPrefilledNotice(null);
    setCepDestino('');
    setCidadeEstado('');
    setDadosCotacoes([]);
    setActiveFreightView('formulario');
    if (onClearPrefilledFreight) onClearPrefilledFreight();
  };

  const handleNovoCalculo = () => {
    setActiveFreightView('formulario');
    setDadosCotacoes([]);
    setFreightError(null);
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
            Monte orçamentos em segundos com produtos do catálogo, cote e selecione a transportadora e copie a mensagem formatada para enviar direto ao cliente pelo WhatsApp.
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

          {/* Produtos do Orçamento - NOVO CARRINHO UNIFICADO */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-700">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm uppercase tracking-wider text-[11px]">Carrinho de Compras do Pedido</h3>
                  <p className="text-[11px] text-slate-500">{items.length} modelo(s) · {items.reduce((acc, it) => acc + it.quantity, 0)} peça(s) no total</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowItemPicker((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{showItemPicker ? 'Fechar Seleção' : '+ Adicionar Item ao Pedido'}</span>
              </button>
            </div>

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
                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Produto Principal *
                    </label>
                    <GroupedProductSelect
                      products={mainCatalogProducts}
                      value={selectedProductId}
                      onChange={setSelectedProductId}
                      showCostPrice={false}
                      className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs cursor-pointer"
                    />
                  </div>

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
                      onChange={(e) => setSelectedExtraProductId(e.target.value)}
                      className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs cursor-pointer"
                    >
                      <option value="">Nenhum (+ R$ 0,00)</option>
                      {extraProducts.map((extra) => (
                        <option key={extra.id} value={extra.id}>
                          + {extra.model} (+{formatBRL(extra.salePrice)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Quantidade & Ação
                    </label>
                    <div className="flex items-center gap-1.5 h-[38px]">
                      <div className="flex items-center border border-slate-300 bg-white rounded-lg overflow-hidden shrink-0 h-[38px] shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setAddQuantity((q) => Math.max(1, q - 1))}
                          className="px-2 h-full flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-1.5 font-mono font-bold text-xs text-slate-800">
                          {addQuantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setAddQuantity((q) => q + 1)}
                          className="px-2 h-full flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const prod = mainCatalogProducts.find((p) => p.id === selectedProductId) || mainCatalogProducts[0];
                          if (prod) {
                            handleAddItem(prod, addQuantity, selectedExtraProductId, itemObservacao);
                            setAddQuantity(1);
                          }
                        }}
                        className="flex-1 h-[38px] px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center whitespace-nowrap shadow-2xs text-center"
                      >
                        + Incluir
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-0.5">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Observação / Personalização (Opcional)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Instruções para o ateliê artesanal</span>
                  </label>
                  <input
                    type="text"
                    value={itemObservacao}
                    onChange={(e) => setItemObservacao(e.target.value)}
                    placeholder="Ex: Trocar corda preta por azul..."
                    className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                  />
                </div>
              </div>
            )}

            {items.length === 0 ? (
              <div className="py-8 px-4 text-center text-slate-500 bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
                <ShoppingBag className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-medium text-slate-600">Nenhum item adicionado ao orçamento.</p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <div key={item.id} className="p-3 bg-white hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {item.code}
                        </span>
                        <span className="font-bold text-slate-900 truncate">
                          {item.name}
                        </span>
                      </div>
                      {item.observacao && (
                        <p className="text-xs text-slate-500 italic mt-0.5">
                          Obs: {item.observacao}
                        </p>
                      )}
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>Preço Unitário (Venda): <strong className="font-mono text-slate-800">{formatBRL(item.unitPrice)}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <div className="flex items-center border border-slate-200 bg-slate-50 rounded-lg overflow-hidden">
                        <button type="button" onClick={() => handleUpdateQuantity(idx, item.quantity - 1)} className="px-1.5 py-1 text-slate-600 hover:bg-slate-200 cursor-pointer">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 font-mono font-bold text-xs text-slate-900">
                          {item.quantity}
                        </span>
                        <button type="button" onClick={() => handleUpdateQuantity(idx, item.quantity + 1)} className="px-1.5 py-1 text-slate-600 hover:bg-slate-200 cursor-pointer">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-right min-w-[70px]">
                        <span className="text-[10px] text-slate-400 block">Subtotal</span>
                        <span className="font-mono font-bold text-slate-900">
                          {formatBRL(item.totalPrice)}
                        </span>
                      </div>

                      <button type="button" onClick={() => handleRemoveItem(idx)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PAINEL DE FRETE INTEGRADO (SIMULADOR DA TELA DE COTAÇÃO) */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-700">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">Cotação de Frete & Logística</h3>
                  <p className="text-[11px] text-slate-500">Consulte valores reais via API Melhor Envio/Frenet</p>
                </div>
              </div>
              
              {/* Abas Internas da Cotação (se já buscou) */}
              {dadosCotacoes.length > 0 && (
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setActiveFreightView('interno')}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                      activeFreightView === 'interno'
                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Custos (Interno)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFreightView('cliente')}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                      activeFreightView === 'cliente'
                        ? 'bg-amber-500 text-slate-950 shadow-sm border border-amber-600'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Visão Cliente
                  </button>
                </div>
              )}
            </div>

            {freightError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2.5 text-xs font-medium">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{freightError}</span>
              </div>
            )}

            {/* FORMULÁRIO DE PESQUISA DE FRETE */}
            {activeFreightView === 'formulario' && (
              <form onSubmit={handleCalcularFrete} className="bg-slate-50/80 rounded-xl p-4 border border-slate-200 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">CEP de Destino *</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Ex: 86.050-464"
                        value={cepDestino}
                        onChange={(e) => handleCepSearch(e.target.value)}
                        className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-300 font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs text-sm"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>
                    {cidadeEstado && <span className="text-[11px] text-emerald-600 font-medium mt-1.5 block flex items-center gap-1"><MapPin className="w-3 h-3" /> {cidadeEstado}</span>}
                  </div>
                  
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Valor dos Itens (Seguro) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-slate-400 text-sm">R$</span>
                      <input
                        type="text"
                        disabled
                        readOnly
                        value={subtotalProducts.toFixed(2)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-slate-100 font-mono font-bold text-slate-800 text-sm"
                      />
                    </div>
                    <span className="text-[10px] text-amber-700 flex items-center gap-1 mt-1.5 font-medium"><ShieldCheck className="w-3 h-3" /> Valor lido do carrinho automaticamente</span>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
                    <Package className="w-3.5 h-3.5 text-slate-500" /> Dimensões e Peso do Pacote
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Peso (g)</label>
                      <input type="number" min="10" required value={peso} onChange={(e) => setPeso(e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full py-1.5 px-2 rounded-lg border border-slate-300 font-mono text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Altura (cm)</label>
                      <input type="number" min="2" required value={altura} onChange={(e) => setAltura(e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full py-1.5 px-2 rounded-lg border border-slate-300 font-mono text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Larg. (cm)</label>
                      <input type="number" min="11" required value={largura} onChange={(e) => setLargura(e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full py-1.5 px-2 rounded-lg border border-slate-300 font-mono text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Comp. (cm)</label>
                      <input type="number" min="16" required value={comprimento} onChange={(e) => setComprimento(e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full py-1.5 px-2 rounded-lg border border-slate-300 font-mono text-xs" />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSearchingFreight}
                  className="w-full mt-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSearchingFreight ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4 stroke-[2.5]" />}
                  {isSearchingFreight ? 'Consultando Transportadoras...' : 'Comparar Fretes na API'}
                </button>
              </form>
            )}

            {/* TABELA DE COTAÇÃO - VISÃO INTERNA */}
            {activeFreightView === 'interno' && !isSearchingFreight && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-800" />
                    <span className="font-semibold text-slate-800">Custo Base (Sem margem)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <select
                      value={ordenacao}
                      onChange={(e) => setOrdenacao(e.target.value as 'barato' | 'rapido')}
                      className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="barato">Mais Barato Primeiro</option>
                      <option value="rapido">Mais Rápido Primeiro</option>
                    </select>
                  </div>
                </div>
                
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-white border-b border-slate-950 text-[10px] font-semibold uppercase tracking-wider">
                          <th className="py-2.5 px-3 w-28 text-amber-400">Parceiro</th>
                          <th className="py-2.5 px-3 text-slate-200">Transportadora</th>
                          <th className="py-2.5 px-3 w-28 text-slate-200">Prazo</th>
                          <th className="py-2.5 px-3 text-right w-32 text-emerald-400">Custo Real</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {sortedCotacoes.map((item, idx) => {
                          const isBestPrice = item.preco === minPrice;
                          const isFrenet = item.plataforma.toUpperCase() === 'FRENET';
                          
                          return (
                            <tr key={`int-${idx}`} className={`hover:bg-slate-50 ${isBestPrice ? 'bg-emerald-50/20' : ''}`}>
                              <td className="py-2 px-3 whitespace-nowrap">
                                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${
                                  isFrenet ? 'bg-sky-50 text-sky-800 border-sky-200' : 'bg-amber-50 text-amber-900 border-amber-300'
                                }`}>
                                  {item.plataforma}
                                </span>
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap font-semibold text-slate-800">
                                {item.transportadora} {isBestPrice && <span className="ml-1 text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded">Mais Barato</span>}
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap text-slate-600">
                                {item.prazo} dias
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                                {formatBRL(item.preco)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleNovoCalculo}
                  className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg"
                >
                  Fazer nova consulta
                </button>
              </div>
            )}

            {/* TABELA DE COTAÇÃO - VISÃO DO CLIENTE */}
            {activeFreightView === 'cliente' && !isSearchingFreight && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs bg-amber-50 p-2 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-600" />
                    <span className="font-semibold text-amber-900">Valores para Apresentar ao Cliente (Com Margem)</span>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#1e293b] text-white border-b border-[#0f172a] text-[10px] font-semibold uppercase tracking-wider">
                          <th className="py-2.5 px-3 w-10 text-center text-amber-400">Sel.</th>
                          <th className="py-2.5 px-3 w-28 text-amber-400">Parceiro</th>
                          <th className="py-2.5 px-3 text-slate-200">Transportadora & Serviço</th>
                          <th className="py-2.5 px-3 w-32 text-slate-200">Prazo Estimado</th>
                          <th className="py-2.5 px-3 text-right w-36 text-emerald-400">Valor p/ Cliente</th>
                          <th className="py-2.5 px-3 text-center w-36 text-slate-300">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs bg-white">
                        {sortedCotacoes.map((item, idx) => {
                          const precoFinalCliente = getCustomerPrice(item.preco);
                          const { min, max } = getCustomerWindow(item.prazo);
                          const isBestPrice = item.preco === minPrice;
                          const isFastest = item.prazo === minPrazo;
                          const isFrenet = item.plataforma.toUpperCase() === 'FRENET';
                          const rowKey = `cot-${idx}`;
                          const isSelected = selectedFreightKey === rowKey;

                          return (
                            <tr
                              key={rowKey}
                              onClick={() => setSelectedFreightKey(rowKey)}
                              className={`transition-colors cursor-pointer group hover:bg-slate-50/80 ${
                                isSelected ? 'bg-amber-50/70 border-l-4 border-l-amber-500' : isBestPrice ? 'bg-emerald-50/25' : ''
                              }`}
                            >
                              <td className="py-3 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="radio"
                                  name="selected_freight"
                                  checked={isSelected}
                                  onChange={() => setSelectedFreightKey(rowKey)}
                                  className="w-4 h-4 text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-500"
                                />
                              </td>
                              
                              <td className="py-3 px-3 whitespace-nowrap">
                                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                                  isFrenet ? 'bg-sky-50 text-sky-800 border-sky-200' : 'bg-amber-50 text-amber-900 border-amber-300'
                                }`}>
                                  {item.plataforma}
                                </span>
                              </td>

                              <td className="py-3 px-3 whitespace-nowrap">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <Truck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                  <span className="font-semibold text-slate-900">{item.transportadora}</span>
                                  {isBestPrice && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">Mais Barato</span>}
                                  {isFastest && !isBestPrice && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800 border border-blue-300">Mais Rápido</span>}
                                </div>
                              </td>

                              <td className="py-3 px-3 whitespace-nowrap">
                                <div className="flex items-center gap-1 text-slate-700 font-medium text-[11px]">
                                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>{min} a {max} dias úteis</span>
                                </div>
                              </td>

                              <td className="py-3 px-3 text-right whitespace-nowrap">
                                <span className="text-sm font-bold font-mono text-emerald-700 tabular-nums">
                                  {formatBRL(precoFinalCliente)}
                                </span>
                              </td>

                              <td className="py-3 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedFreightKey(rowKey);
                                    selectCarrierResult(item);
                                  }}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors cursor-pointer shadow-2xs whitespace-nowrap"
                                >
                                  <Sparkles className="w-3 h-3" />
                                  <span>Usar no Orçamento</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={handleNovoCalculo}
                  className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg"
                >
                  Refazer Cotação
                </button>
              </div>
            )}

            {/* CAMPOS DE FECHAMENTO DO FRETE (Os que preenchem e mostram no Zap) */}
            <div className="pt-4 border-t border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
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
                  <label className="block text-slate-700 font-medium text-xs mb-1.5">
                    Frete Custo (R$) 
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={freteCotado}
                    onChange={(e) => setFreteCotado(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium text-xs mb-1.5">
                    Frete Cliente (R$) 
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    disabled={isFreteGratis}
                    value={isFreteGratis ? '0.00' : freteCobrado}
                    onChange={(e) => setFreteCobrado(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
                <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-white border-slate-200 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={isFreteGratis} 
                    onChange={(e) => { 
                      setIsFreteGratis(e.target.checked); 
                      if(e.target.checked) {
                        setFreteCobrado('0.00');
                      }
                    }} 
                    className="w-4 h-4 rounded text-amber-600 border-slate-300" 
                  />
                  <span className="text-xs font-bold text-slate-900">Frete Grátis para o Cliente</span>
                </label>

                {/* Sobra do Frete */}
                <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-2 text-xs">
                  <span className="font-semibold text-slate-800">Sobra do Frete</span>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded ${sobraFrete >= 0 ? 'text-emerald-800 bg-emerald-100' : 'text-rose-800 bg-rose-100'}`}>
                    {sobraFrete >= 0 ? '+' : ''}R$ {formatCurrencyValue(sobraFrete)}
                  </span>
                </div>
              </div>
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

          {/* ORÇAMENTOS SALVOS NA NUVEM */}
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
