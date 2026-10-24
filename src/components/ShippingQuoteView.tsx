import React, { useState, useMemo } from 'react';
import { 
  Truck, 
  Search, 
  Clock, 
  DollarSign, 
  Copy, 
  Check, 
  MessageSquare, 
  RefreshCw, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle, 
  ExternalLink, 
  UserCheck, 
  Package, 
  ChevronRight, 
  ArrowLeft,
  SlidersHorizontal,
  Send,
  Building2,
  Info
} from 'lucide-react';
import { maskCEP, formatBRL } from '../utils/formatters';
import { PrefilledFreightData } from '../types/erp';

export interface ShippingOption {
  transportadora: string;
  plataforma: 'MELHOR ENVIO' | 'FRENET' | string;
  preco: number;
  prazo: number;
  error?: string;
  [key: string]: any;
}

const CEP_ORIGEM = "86050464"; // Londrina - PR (Ateliê Terçarium)
const URL_DO_SERVIDOR_GOOGLE = "https://script.google.com/macros/s/AKfycbyobO3yCc4MaOwab8EXF1tclVRXXxV5xoXZz8ktUVz_kfNCTjQvAKhI6tow6YPF7I962Q/exec";

// Pacotes pré-configurados do Ateliê Terçarium
const PACKAGE_PRESETS = [
  { name: 'Caixa Padrão Ateliê', peso: 200, altura: 6, largura: 17, comprimento: 17, desc: '1 a 2 Terços / Dezenas' },
  { name: 'Envelope Acolchoado', peso: 100, altura: 3, largura: 15, comprimento: 20, desc: '1 Terço ou Pulseiras' },
  { name: 'Caixa Média / Kit', peso: 450, altura: 10, largura: 20, comprimento: 22, desc: '3+ Terços ou Encomenda Especial' },
];

export interface ShippingQuoteViewProps {
  onUseFreightForBudget?: (data: PrefilledFreightData) => void;
  onUseFreightForOrder?: (data: PrefilledFreightData) => void;
}

export const ShippingQuoteView: React.FC<ShippingQuoteViewProps> = ({ 
  onUseFreightForBudget,
  onUseFreightForOrder 
}) => {
  // Aba ativa: 'formulario' | 'interno' | 'cliente'
  const [activeView, setActiveView] = useState<'formulario' | 'interno' | 'cliente'>('formulario');

  // Dados do formulário
  const [cepDestino, setCepDestino] = useState('');
  const [valorDeclarado, setValorDeclarado] = useState<number | ''>(85.00);
  const [peso, setPeso] = useState<number | ''>(200);
  const [altura, setAltura] = useState<number | ''>(6);
  const [largura, setLargura] = useState<number | ''>(17);
  const [comprimento, setComprimento] = useState<number | ''>(17);

  // Estados de consulta e resposta
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Identificando cidade...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [nomeCidadeEstado, setNomeCidadeEstado] = useState('');
  const [dadosCotacoes, setDadosCotacoes] = useState<ShippingOption[]>([]);
  const [ordenacao, setOrdenacao] = useState<'barato' | 'rapido'>('barato');

  // WhatsApp e Mensagem formatada
  const [isCopied, setIsCopied] = useState(false);
  const [showWhatsAppBox, setShowWhatsAppBox] = useState(false);
  const [customWhatsAppMsg, setCustomWhatsAppMsg] = useState('');
  const [selectedOptionKey, setSelectedOptionKey] = useState<string | null>(null);
  const [singleCopiedKey, setSingleCopiedKey] = useState<string | null>(null);

  // Identificação do CEP via ViaCEP ao digitar
  const handleCepChange = async (val: string) => {
    const masked = maskCEP(val);
    setCepDestino(masked);

    const clean = masked.replace(/\D/g, '');
    if (clean.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setNomeCidadeEstado(`${data.localidade}-${data.uf}`);
        } else {
          setNomeCidadeEstado(`CEP ${clean}`);
        }
      } catch {
        setNomeCidadeEstado(`CEP ${clean}`);
      }
    } else {
      setNomeCidadeEstado('');
    }
  };

  // Executa o cálculo e consulta multicanal
  const handleCalcularFrete = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanCep = cepDestino.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      setErrorMessage('Digite um CEP válido com 8 dígitos numéricos.');
      return;
    }

    const numValorDeclarado = typeof valorDeclarado === 'number' ? valorDeclarado : parseFloat(String(valorDeclarado)) || 0;
    if (numValorDeclarado <= 0) {
      setErrorMessage('Por favor, informe o Valor dos Itens para ativar a assistência e seguro das transportadoras.');
      return;
    }

    const numPeso = typeof peso === 'number' ? peso : parseFloat(String(peso)) || 200;
    const numAltura = typeof altura === 'number' ? altura : parseFloat(String(altura)) || 6;
    const numLargura = typeof largura === 'number' ? largura : parseFloat(String(largura)) || 17;
    const numComprimento = typeof comprimento === 'number' ? comprimento : parseFloat(String(comprimento)) || 17;

    setErrorMessage(null);
    setIsLoading(true);
    setLoadingText('Identificando localidade de destino...');
    setShowWhatsAppBox(false);

    // 1. Garantir Cidade/UF via ViaCEP
    let cidadeAtual = nomeCidadeEstado;
    if (!cidadeAtual) {
      try {
        const viaCepRes = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const viaCepData = await viaCepRes.json();
        if (!viaCepData.erro) {
          cidadeAtual = `${viaCepData.localidade}-${viaCepData.uf}`;
          setNomeCidadeEstado(cidadeAtual);
        } else {
          cidadeAtual = `CEP ${cleanCep}`;
          setNomeCidadeEstado(cidadeAtual);
        }
      } catch {
        cidadeAtual = `CEP ${cleanCep}`;
        setNomeCidadeEstado(cidadeAtual);
      }
    }

    setLoadingText('Consultando Melhor Envio e Frenet simultaneamente...');

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
        setErrorMessage(`Falha no cálculo: ${data.error}`);
        setIsLoading(false);
        return;
      }

      if (!Array.isArray(data)) {
        setErrorMessage('Resposta inesperada da central de fretes. Tente novamente.');
        setIsLoading(false);
        return;
      }

      const cotacoesProcessadas: ShippingOption[] = [];

      // Regras de negócio originais do script Terçarium:
      data.forEach((opcao: any) => {
        const transportadora = String(opcao.transportadora || '').toUpperCase();
        const plataforma = String(opcao.plataforma || '');

        const isCorreiosPAC = transportadora.includes("CORREIOS") && transportadora.includes("PAC");
        const isCorreiosSedex = transportadora.includes("CORREIOS") && transportadora.includes("SEDEX");
        const isLoggi = transportadora.includes("LOGGI");

        let preco = parseFloat(opcao.preco) || 0;
        const prazo = parseInt(opcao.prazo, 10) || 0;

        if (plataforma === "FRENET") {
          // Na Frenet, se for Correios (PAC ou Sedex), soma taxa de manuseio de R$ 1,10
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
          // Melhor Envio / Outros canais
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
      setIsLoading(false);
      setActiveView('interno');
    } catch (err: any) {
      console.error('Erro na cotação:', err);
      setErrorMessage('Erro ao conectar com o servidor de cotação. Verifique a conexão e tente novamente.');
      setIsLoading(false);
    }
  };

  // Cálculo da Margem / Preço para o Cliente
  const getCustomerPrice = (costPrice: number) => {
    let acrescimo = 1.00;
    if (costPrice <= 20.00) {
      acrescimo = 1.80;
    } else if (costPrice <= 30.00) {
      acrescimo = 1.50;
    }
    return costPrice + acrescimo;
  };

  // Janela de entrega estimada para o cliente (+- 1 dia)
  const getCustomerWindow = (prazo: number) => {
    let min = prazo - 1;
    let max = prazo + 1;
    if (min < 1) {
      min = 1;
      max = 2;
    }
    return { min, max };
  };

  // Ordenação das cotações
  const sortedCotacoes = useMemo(() => {
    const list = [...dadosCotacoes];
    if (ordenacao === 'barato') {
      list.sort((a, b) => a.preco - b.preco);
    } else {
      list.sort((a, b) => a.prazo - b.prazo);
    }
    return list;
  }, [dadosCotacoes, ordenacao]);

  // Melhor preço e entrega mais rápida para tags visuais
  const minPrice = useMemo(() => {
    if (dadosCotacoes.length === 0) return 0;
    return Math.min(...dadosCotacoes.map((c) => c.preco));
  }, [dadosCotacoes]);

  const minPrazo = useMemo(() => {
    if (dadosCotacoes.length === 0) return 0;
    return Math.min(...dadosCotacoes.map((c) => c.prazo));
  }, [dadosCotacoes]);

  // Helper para normalizar dados do frete selecionado
  const buildFreightPayload = (specificItem?: ShippingOption): PrefilledFreightData | null => {
    let itemToUse: ShippingOption | undefined = specificItem;

    if (!itemToUse && selectedOptionKey) {
      itemToUse = sortedCotacoes.find(
        (item, idx) => `cliente-${item.plataforma}-${item.transportadora}-${idx}` === selectedOptionKey
      );
    }

    if (!itemToUse && sortedCotacoes.length > 0) {
      itemToUse = sortedCotacoes[0];
    }

    if (!itemToUse) {
      return null;
    }

    const precoFinalCliente = getCustomerPrice(itemToUse.preco);
    const { min, max } = getCustomerWindow(itemToUse.prazo);

    // 1. Normalização padronizada da plataformaSelecionada (ex: "Melhor Envio", "Frenet", "SuperFrete")
    let plataformaSelecionada = 'Melhor Envio';
    const platLow = (itemToUse.plataforma || '').toLowerCase();
    if (platLow.includes('frenet')) {
      plataformaSelecionada = 'Frenet';
    } else if (platLow.includes('superfrete') || platLow.includes('super frete')) {
      plataformaSelecionada = 'SuperFrete';
    } else if (platLow.includes('correios')) {
      plataformaSelecionada = 'Contrato Correios';
    } else if (platLow.includes('melhor envio') || platLow.includes('melhor')) {
      plataformaSelecionada = 'Melhor Envio';
    } else if (itemToUse.plataforma) {
      plataformaSelecionada = itemToUse.plataforma;
    }

    // 2. Normalização padronizada da transportadoraSelecionada (ex: "Correios PAC", "Jadlog", "Loggi")
    let transportadoraSelecionada = 'Correios PAC';
    const transpUp = (itemToUse.transportadora || '').toUpperCase();
    if (transpUp.includes('SEDEX')) {
      transportadoraSelecionada = 'Correios SEDEX';
    } else if (transpUp.includes('PAC')) {
      transportadoraSelecionada = 'Correios PAC';
    } else if (transpUp.includes('JADLOG')) {
      transportadoraSelecionada = 'Jadlog';
    } else if (transpUp.includes('LOGGI')) {
      transportadoraSelecionada = 'Loggi';
    } else if (transpUp.includes('J&T') || transpUp.includes('JET')) {
      transportadoraSelecionada = 'Transportadora J&T Express';
    } else if (itemToUse.transportadora) {
      transportadoraSelecionada = itemToUse.transportadora;
    }

    return {
      transportadora: transportadoraSelecionada,
      plataforma: plataformaSelecionada,
      plataformaSelecionada,
      transportadoraSelecionada,
      freteCobrado: precoFinalCliente,
      freteCotado: itemToUse.preco,
      precoFinalCliente,
      prazoTexto: `${min} a ${max} dias úteis`,
      cidadeEstado: nomeCidadeEstado,
      cepDestino,
    };
  };

  // Transfere o frete escolhido para o módulo de Orçamentos
  const handleUseFreightForBudget = (specificItem?: ShippingOption) => {
    const payload = buildFreightPayload(specificItem);
    if (!payload) {
      setErrorMessage('Nenhuma cotação disponível para transferir.');
      return;
    }

    if (onUseFreightForBudget) {
      onUseFreightForBudget(payload);
    }
  };

  // Transfere o frete escolhido diretamente para Novo Pedido
  const handleUseFreightForOrder = (specificItem?: ShippingOption) => {
    const payload = buildFreightPayload(specificItem);
    if (!payload) {
      setErrorMessage('Nenhuma cotação disponível para transferir.');
      return;
    }

    if (onUseFreightForOrder) {
      onUseFreightForOrder(payload);
    }
  };

  // Gerador de Mensagem para o WhatsApp
  const gerarMensagemWhatsApp = () => {
    const selecionados: Record<string, ShippingOption> = {};

    dadosCotacoes.forEach((opcao) => {
      const tUpper = opcao.transportadora.toUpperCase();
      let categoria = '';

      if (tUpper.includes('PAC')) categoria = 'PAC';
      else if (tUpper.includes('SEDEX')) categoria = 'SEDEX';
      else if (tUpper.includes('J&T') || tUpper.includes('JET')) categoria = 'JET';
      else if (tUpper.includes('LOGGI')) categoria = 'LOGGI';

      if (categoria !== '') {
        if (!selecionados[categoria] || opcao.preco < selecionados[categoria].preco) {
          selecionados[categoria] = opcao;
        }
      }
    });

    const opcoesFiltradas = Object.values(selecionados).sort((a, b) => a.preco - b.preco);

    let mensagem = `As opções de frete para ${nomeCidadeEstado || `CEP ${cepDestino}`} são:\n\n`;

    opcoesFiltradas.forEach((opcao) => {
      const precoFinalCliente = getCustomerPrice(opcao.preco);
      const { min, max } = getCustomerWindow(opcao.prazo);

      mensagem += `Transportadora: ${opcao.transportadora} (${opcao.plataforma})\n`;
      mensagem += `Prazo estimado: ${min} a ${max} dias úteis\n`;
      mensagem += `Valor: R$ ${precoFinalCliente.toFixed(2).replace('.', ',')}\n\n`;
    });

    mensagem += `Qual opção fica melhor pra você?`;

    setCustomWhatsAppMsg(mensagem.trim());
    setShowWhatsAppBox(true);
  };

  const handleCopiarMensagem = async () => {
    if (!customWhatsAppMsg) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(customWhatsAppMsg);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = customWhatsAppMsg;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2200);
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  const handleAbrirWhatsAppWeb = () => {
    if (!customWhatsAppMsg) return;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(customWhatsAppMsg)}`;
    window.open(url, '_blank');
  };

  const handleCopySingleOption = async (item: ShippingOption, key: string) => {
    const precoCliente = getCustomerPrice(item.preco);
    const { min, max } = getCustomerWindow(item.prazo);
    const text = `🚚 *Cotação de Frete Terçarium*\nDestino: ${nomeCidadeEstado || `CEP ${cepDestino}`}\n\n• *${item.transportadora}* (${item.plataforma})\n• Prazo estimado: ${min} a ${max} dias úteis\n• Valor: R$ ${precoCliente.toFixed(2).replace('.', ',')}\n\nPodemos fechar o envio por esta opção?`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      }
      setSingleCopiedKey(key);
      setTimeout(() => setSingleCopiedKey(null), 2000);
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  const handleApplyPreset = (p: typeof PACKAGE_PRESETS[0]) => {
    setPeso(p.peso);
    setAltura(p.altura);
    setLargura(p.largura);
    setComprimento(p.comprimento);
  };

  const handleNovoCalculo = () => {
    setActiveView('formulario');
    setDadosCotacoes([]);
    setErrorMessage(null);
    setShowWhatsAppBox(false);
  };

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* BANNER SUPERIOR INSTITUCIONAL (PRETO, DOURADO & BRANCO)   */}
      {/* ======================================================== */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 sm:p-6 rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Logística Inteligente do Ateliê
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              Melhor Envio + Frenet API
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-400" />
            Cotação de Frete Multicanal
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Simulador oficial conectado às contas do Ateliê Terçarium. Calcule tarifas reais com seguro embutido, compare transportadoras e gere propostas prontas para o WhatsApp.
          </p>
        </div>

        {/* Status de Origem Fixa */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 text-xs shrink-0 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
              Origem dos Envios
            </span>
            <span className="font-mono text-slate-200 font-bold">
              CEP 86050-464 (Londrina - PR)
            </span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SUB-NAVEGAÇÃO: ETAPAS / VISÕES (QUANDO JÁ HÁ RESULTADOS)  */}
      {/* ======================================================== */}
      {dadosCotacoes.length > 0 && !isLoading && (
        <div className="bg-white p-2 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView('interno')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeView === 'interno'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
              <span>Custos Oficiais (Interno)</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400">
                {dadosCotacoes.length}
              </span>
            </button>

            <button
              onClick={() => setActiveView('cliente')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeView === 'cliente'
                  ? 'bg-amber-500 text-slate-950 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Visão do Cliente (Com Acréscimo)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleNovoCalculo}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Recalcular Novo CEP</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ÁREA DE CONTEÚDO PRINCIPAL                                */}
      {/* ======================================================== */}

      {/* TELA 1: FORMULÁRIO DE COTAÇÃO */}
      {activeView === 'formulario' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Card Principal do Formulário (8 cols) */}
          <div className="lg:col-span-8 bg-white p-5 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Parâmetros de Envio e Destino
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Ateliê Terçarium
              </span>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2.5 text-xs font-medium">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCalcularFrete} className="space-y-5 text-xs">
              {/* CEP de Destino & Identificação Automática ViaCEP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    CEP de Destino *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Ex: 86.050-464"
                      value={cepDestino}
                      onChange={(e) => handleCepChange(e.target.value)}
                      maxLength={10}
                      className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-slate-300 bg-white font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {nomeCidadeEstado ? (
                    <span className="text-[11px] text-emerald-700 font-bold mt-1.5 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      Destino: {nomeCidadeEstado}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Localidade preenchida automaticamente via ViaCEP
                    </span>
                  )}
                </div>

                {/* Valor dos Itens para Seguro / Assistência */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Valor dos Itens (R$) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-medium">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      placeholder="85.00"
                      value={valorDeclarado}
                      onChange={(e) => setValorDeclarado(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                    />
                  </div>
                  <span className="text-[10px] text-amber-700 font-medium mt-1 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    Obrigatório para ativar a Assistência e Seguro contra extravio
                  </span>
                </div>
              </div>

              {/* Dimensões e Peso do Pacote */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-amber-600" />
                    Dimensões e Peso do Pacote
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Limites das transportadoras
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1 text-[11px]">
                      Peso (gramas)
                    </label>
                    <input
                      type="number"
                      min="10"
                      required
                      value={peso}
                      onChange={(e) => setPeso(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1 text-[11px]">
                      Altura (cm)
                    </label>
                    <input
                      type="number"
                      min="2"
                      required
                      value={altura}
                      onChange={(e) => setAltura(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1 text-[11px]">
                      Largura (cm)
                    </label>
                    <input
                      type="number"
                      min="11"
                      required
                      value={largura}
                      onChange={(e) => setLargura(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1 text-[11px]">
                      Comprimento (cm)
                    </label>
                    <input
                      type="number"
                      min="16"
                      required
                      value={comprimento}
                      onChange={(e) => setComprimento(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Botão de Ação Principal */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-sm tracking-wide shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                      <span>{loadingText}</span>
                    </>
                  ) : (
                    <>
                      <Truck className="w-4 h-4 stroke-[2.5]" />
                      <span>Comparar Fretes em Tempo Real</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Coluna Direita: Atalhos de Embalagem & Dicas Operacionais (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                📦 Embalagens Padrão Terçarium
              </span>
              <p className="text-[11px] text-slate-500">
                Selecione uma embalagem usual para preencher as medidas e pesos instantaneamente:
              </p>

              <div className="space-y-2 pt-1">
                {PACKAGE_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 group-hover:text-amber-900">
                      <span>{preset.name}</span>
                      <span className="text-[10px] font-mono font-semibold bg-slate-100 px-1.5 py-0.2 rounded text-slate-700">
                        {preset.peso}g
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {preset.comprimento}x{preset.largura}x{preset.altura} cm · {preset.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-amber-900 font-bold">
                <Info className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Regras de Negócio Integradas</span>
              </div>
              <ul className="text-[11px] text-amber-950 space-y-1 pl-4 list-disc">
                <li>Adicional de manuseio Frenet (+ R$ 1,10 nos Correios) aplicado automaticamente.</li>
                <li>Filtros refinados para exibir apenas opções viáveis (PAC, Sedex, Loggi e J&T).</li>
                <li>Na tela do cliente, aplica a margem variável (+ R$ 1,80, R$ 1,50 ou R$ 1,00) e janela de entrega segura.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TELA DE CARREGAMENTO ANIMADA */}
      {isLoading && (
        <div className="bg-white p-12 rounded-2xl border border-slate-200/90 shadow-sm text-center space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 flex items-center justify-center mx-auto animate-pulse">
            <Truck className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-900">
              Consultando Transportadoras
            </h4>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              {loadingText}
            </p>
          </div>
          <div className="w-48 bg-slate-100 h-1.5 rounded-full mx-auto overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full animate-indeterminate" />
          </div>
        </div>
      )}

      {/* TELA 2: RESULTADOS OFICIAIS (USO INTERNO) */}
      {activeView === 'interno' && !isLoading && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Barra de Destino & Filtros de Ordenação */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h3 className="text-sm font-bold text-slate-900">
                  Custos Oficiais das Transportadoras
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Destino: <strong className="text-amber-800">{nomeCidadeEstado || `CEP ${cepDestino}`}</strong> · Valor com seguro ativado
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                <span>Ordenar:</span>
                <select
                  value={ordenacao}
                  onChange={(e) => setOrdenacao(e.target.value as 'barato' | 'rapido')}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-medium text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                >
                  <option value="barato">Mais Barato Primeiro</option>
                  <option value="rapido">Mais Rápido Primeiro</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setActiveView('cliente')}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer ml-auto sm:ml-0"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Gerar Tela p/ Cliente</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Tabela de Lista Linear/Horizontal Compacta (Custos Oficiais) */}
          {sortedCotacoes.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="font-bold text-slate-800 text-sm">Nenhuma transportadora atendeu aos critérios</p>
              <p className="text-xs text-slate-400 mt-1">Verifique o CEP informado ou altere o peso/dimensões do pacote.</p>
              <button
                onClick={handleNovoCalculo}
                className="mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors"
              >
                Voltar e Ajustar
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white border-b border-slate-950 text-[11px] font-semibold uppercase tracking-wider">
                      <th className="py-2.5 px-4 w-32 text-amber-400">Parceiro</th>
                      <th className="py-2.5 px-4 text-slate-200">Transportadora & Serviço</th>
                      <th className="py-2.5 px-4 w-36 text-slate-200">Prazo</th>
                      <th className="py-2.5 px-4 w-44 text-slate-400">Informações Extra</th>
                      <th className="py-2.5 px-4 text-right w-40 text-emerald-400">Custo Real</th>
                      <th className="py-2.5 px-4 text-center w-32 text-slate-300">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {sortedCotacoes.map((item, idx) => {
                      const isBestPrice = item.preco === minPrice;
                      const isFastest = item.prazo === minPrazo;
                      const isFrenet = item.plataforma.toUpperCase() === 'FRENET';
                      const rowKey = `interno-${item.plataforma}-${item.transportadora}-${idx}`;
                      const isSelected = selectedOptionKey === rowKey;
                      const isRowCopied = singleCopiedKey === rowKey;

                      return (
                        <tr
                          key={rowKey}
                          onClick={() => setSelectedOptionKey(isSelected ? null : rowKey)}
                          className={`transition-colors cursor-pointer group hover:bg-slate-50/80 ${
                            isSelected 
                              ? 'bg-amber-50/60 border-l-4 border-l-amber-500' 
                              : isBestPrice 
                              ? 'bg-emerald-50/25' 
                              : ''
                          }`}
                        >
                          {/* Coluna 1: Parceiro */}
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                              isFrenet
                                ? 'bg-sky-50 text-sky-800 border-sky-200'
                                : 'bg-amber-50 text-amber-900 border-amber-300'
                            }`}>
                              {item.plataforma}
                            </span>
                          </td>

                          {/* Coluna 2: Transportadora & Serviço + Tags Mais Barato/Mais Rápido */}
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Truck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span className="font-semibold text-slate-900 text-xs sm:text-sm">
                                {item.transportadora}
                              </span>

                              {isBestPrice && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  Mais Barato
                                </span>
                              )}
                              {isFastest && !isBestPrice && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                                  Mais Rápido
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Coluna 3: Prazo */}
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1 text-slate-700 font-medium">
                              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{item.prazo} dias úteis</span>
                            </div>
                          </td>

                          {/* Coluna 4: Informações Extra (sutil e cinza apagado) */}
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            {isFrenet && (item.transportadora.toUpperCase().includes('PAC') || item.transportadora.toUpperCase().includes('SEDEX')) ? (
                              <span className="text-[11px] font-mono text-slate-400">
                                inclui +R$ 1,10 manuseio
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-300">—</span>
                            )}
                          </td>

                          {/* Coluna 5: Valor do Custo Real (destaque em verde, à direita) */}
                          <td className="py-2.5 px-4 text-right whitespace-nowrap">
                            <span className="text-sm sm:text-base font-bold font-mono text-emerald-700 tabular-nums">
                              {formatBRL(item.preco)}
                            </span>
                          </td>

                          {/* Coluna 6: Ação */}
                          <td className="py-2.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedOptionKey(isSelected ? null : rowKey)}
                                className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${
                                  isSelected
                                    ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-2xs'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                                title="Destacar esta opção"
                              >
                                {isSelected ? 'Selecionado' : 'Selecionar'}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCopySingleOption(item, rowKey)}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer border ${
                                  isRowCopied
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : 'bg-white text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 border-slate-200'
                                }`}
                                title="Copiar cotação individual para WhatsApp"
                              >
                                {isRowCopied ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <MessageSquare className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TELA 3: VISÃO DO CLIENTE & GERADOR WHATSAPP */}
      {activeView === 'cliente' && !isLoading && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Top Bar da Visão do Cliente */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">
                  Opções de Envio para Apresentar ao Cliente
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Para: <strong className="text-amber-800">{nomeCidadeEstado || `CEP ${cepDestino}`}</strong> · Margem de segurança e janela de entrega inclusas
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
              <button
                type="button"
                onClick={() => setActiveView('interno')}
                className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar aos Custos Oficiais</span>
              </button>

              <button
                type="button"
                onClick={gerarMensagemWhatsApp}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Mensagem WhatsApp</span>
              </button>

              {/* Botão 1: Utilizar este frete para orçamento */}
              <button
                type="button"
                onClick={() => handleUseFreightForBudget()}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-xs shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Transferir dados deste frete e abrir a tela de Orçamentos"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                <span>Utilizar este frete para orçamento</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* Botão 2: Utilizar este frete para Novo Pedido */}
              {onUseFreightForOrder && (
                <button
                  type="button"
                  onClick={() => handleUseFreightForOrder()}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                  title="Abrir Novo Pedido com esta transportadora e valores pré-preenchidos"
                >
                  <Package className="w-3.5 h-3.5 text-amber-400" />
                  <span>Novo Pedido com este frete</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Tabela de Lista Linear/Horizontal Compacta (Visão do Cliente) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white border-b border-slate-950 text-[11px] font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-12 text-center text-amber-400">Sel.</th>
                    <th className="py-2.5 px-4 w-32 text-amber-400">Parceiro</th>
                    <th className="py-2.5 px-4 text-slate-200">Transportadora & Serviço</th>
                    <th className="py-2.5 px-4 w-44 text-slate-200">Prazo Estimado</th>
                    <th className="py-2.5 px-4 w-44 text-slate-400">Informações Extra</th>
                    <th className="py-2.5 px-4 text-right w-40 text-emerald-400">Valor p/ Cliente</th>
                    <th className="py-2.5 px-4 text-center w-48 text-slate-300">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {sortedCotacoes.map((item, idx) => {
                    const precoFinalCliente = getCustomerPrice(item.preco);
                    const { min, max } = getCustomerWindow(item.prazo);
                    const acrescimo = precoFinalCliente - item.preco;
                    const isBestPrice = item.preco === minPrice;
                    const isFastest = item.prazo === minPrazo;
                    const isFrenet = item.plataforma.toUpperCase() === 'FRENET';
                    const rowKey = `cliente-${item.plataforma}-${item.transportadora}-${idx}`;
                    const isSelected = selectedOptionKey === rowKey;
                    const isRowCopied = singleCopiedKey === rowKey;

                    return (
                      <tr
                        key={rowKey}
                        onClick={() => setSelectedOptionKey(rowKey)}
                        className={`transition-colors cursor-pointer group hover:bg-slate-50/80 ${
                          isSelected 
                            ? 'bg-amber-50/70 border-l-4 border-l-amber-500' 
                            : isBestPrice 
                            ? 'bg-emerald-50/25' 
                            : ''
                        }`}
                      >
                        {/* Seleção do Frete */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="radio"
                            name="selected_freight_option"
                            checked={isSelected}
                            onChange={() => setSelectedOptionKey(rowKey)}
                            className="w-4 h-4 text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-500"
                            title="Selecionar esta opção de frete"
                          />
                        </td>

                        {/* Coluna 1: Parceiro */}
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                            isFrenet
                              ? 'bg-sky-50 text-sky-800 border-sky-200'
                              : 'bg-amber-50 text-amber-900 border-amber-300'
                          }`}>
                            {item.plataforma}
                          </span>
                        </td>

                        {/* Coluna 2: Transportadora & Serviço + Tags Mais Barato/Mais Rápido */}
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Truck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="font-semibold text-slate-900 text-xs sm:text-sm">
                              {item.transportadora}
                            </span>

                            {isBestPrice && (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Mais Barato
                              </span>
                            )}
                            {isFastest && !isBestPrice && (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                                Mais Rápido
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Coluna 3: Prazo Estimado */}
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-slate-700 font-medium">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{min} a {max} dias úteis</span>
                          </div>
                        </td>

                        {/* Coluna 4: Informações Extra (sutil e cinza apagado) */}
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className="text-[11px] font-mono text-slate-400">
                            Margem: +{formatBRL(acrescimo)}
                          </span>
                        </td>

                        {/* Coluna 5: Valor a Cobrar do Cliente (destaque em verde, à direita) */}
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <span className="text-sm sm:text-base font-bold font-mono text-emerald-700 tabular-nums">
                            {formatBRL(precoFinalCliente)}
                          </span>
                        </td>

                        {/* Coluna 6: Ação */}
                        <td className="py-2.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-1.5">
                            {/* Botão de Usar no Orçamento */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedOptionKey(rowKey);
                                handleUseFreightForBudget(item);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors cursor-pointer shadow-2xs whitespace-nowrap"
                              title="Utilizar esta transportadora e valor no Orçamento"
                            >
                              <Sparkles className="w-3 h-3 text-slate-950" />
                              <span>Usar no Orçamento</span>
                            </button>

                            {/* Botão de Usar no Pedido */}
                            {onUseFreightForOrder && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedOptionKey(rowKey);
                                  handleUseFreightForOrder(item);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-900 hover:bg-slate-800 text-amber-400 transition-colors cursor-pointer shadow-2xs whitespace-nowrap"
                                title="Abrir Novo Pedido com esta transportadora e valor"
                              >
                                <Package className="w-3 h-3 text-amber-400" />
                                <span>Usar no Pedido</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleCopySingleOption(item, rowKey)}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${
                                isRowCopied
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                              }`}
                              title="Copiar cotação individual para WhatsApp"
                            >
                              {isRowCopied ? (
                                <>
                                  <Check className="w-3 h-3 stroke-[2.5]" />
                                  <span>Copiado!</span>
                                </>
                              ) : (
                                <>
                                  <MessageSquare className="w-3 h-3 text-emerald-600" />
                                  <span>WhatsApp</span>
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Caixa de Texto do WhatsApp com Botão de Copiar */}
          {showWhatsAppBox && (
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-emerald-300 shadow-sm space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Mensagem Pronta para Envio no WhatsApp
                    </h4>
                    <p className="text-xs text-slate-500">
                      Agrupada automaticamente selecionando a melhor opção de cada categoria (PAC, Sedex, Loggi, J&T)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopiarMensagem}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                      isCopied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Mensagem</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleAbrirWhatsAppWeb}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Abrir WhatsApp</span>
                  </button>
                </div>
              </div>

              <textarea
                rows={9}
                value={customWhatsAppMsg}
                onChange={(e) => setCustomWhatsAppMsg(e.target.value)}
                className="w-full p-4 rounded-xl border border-slate-300 font-mono text-xs text-slate-900 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed shadow-inner"
              />

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Dica: você pode editar o texto acima antes de copiar ou despachar.</span>
                <span className="font-mono text-[11px] text-emerald-700 font-semibold">
                  Pronto para colar na conversa
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
