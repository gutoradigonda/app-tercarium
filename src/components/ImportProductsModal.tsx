import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Package, 
  DollarSign, 
  Sparkles, 
  Layers,
  ArrowRight,
  RefreshCw,
  Info,
  Check,
  Search
} from 'lucide-react';
import { Product, ProductCategory } from '../types/erp';
import { formatBRL, formatPercent } from '../utils/formatters';

interface ImportProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (importedProducts: Product[]) => void;
  existingProducts?: Product[];
}

export interface ParsedImportedProduct {
  id: string;
  code: string;
  model: string;
  category: ProductCategory;
  subCategory?: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  isExisting: boolean;
  status: 'valid' | 'warning';
  warningMessage?: string;
}

export const ImportProductsModal: React.FC<ImportProductsModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  existingProducts = [],
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [previewProducts, setPreviewProducts] = useState<ParsedImportedProduct[]>([]);
  const [searchPreview, setSearchPreview] = useState<string>('');
  const [updateExisting, setUpdateExisting] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset modal when opened/closed
  const handleReset = () => {
    setFile(null);
    setFileName('');
    setIsDragging(false);
    setIsLoading(false);
    setParseError(null);
    setPreviewProducts([]);
    setSearchPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Helper para normalizar cabeçalhos de coluna
  const normalizeKey = (key: string): string => {
    return key
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  };

  // Parser numérico robusto para formatos monetários brasileiros (ex: R$ 109,90 ou 109.90 ou 1.250,00)
  const parseFinancial = (val: any): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const str = String(val).trim().replace('R$', '').replace(/\s/g, '');
    if (str.includes(',') && str.includes('.')) {
      return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
    }
    if (str.includes(',')) {
      return parseFloat(str.replace(',', '.')) || 0;
    }
    return parseFloat(str) || 0;
  };

  const parseStock = (val: any): number => {
    if (typeof val === 'number') return Math.max(0, Math.round(val));
    if (!val) return 0;
    const num = parseFinancial(val);
    return Math.max(0, Math.round(num));
  };

  // Identificação de categoria e linha padrão a partir do SKU ou nome
  const inferCategoryAndLine = (code: string, name: string): { category: ProductCategory; subCategory?: string } => {
    const upperCode = code.toUpperCase();
    const upperName = name.toUpperCase();

    if (upperCode.startsWith('TE-RA') || upperCode.includes('RAIZ')) {
      return { category: 'Terços', subCategory: 'Linha Raízes' };
    }
    if (upperCode.startsWith('TE-FI') || upperCode.includes('FIDEL')) {
      return { category: 'Terços', subCategory: 'Linha Fidelis' };
    }
    if (upperCode.startsWith('TE-') || upperName.includes('TERÇO') || upperName.includes('TERCO')) {
      return { category: 'Terços', subCategory: 'Personalizados' };
    }
    if (upperCode.startsWith('CO-') || upperName.includes('CORDÃO') || upperName.includes('CORDAO')) {
      return { category: 'Cordão', subCategory: 'Cordões' };
    }
    if (upperCode.startsWith('EX-') || upperName.includes('EXTRA') || upperName.includes('MEDALHA') || upperName.includes('CRUCIFIXO')) {
      return { category: 'Extras', subCategory: 'Medalhas' };
    }
    if (upperName.includes('DEZENA') || upperCode.startsWith('DEZ')) {
      return { category: 'Dezenas' };
    }
    if (upperName.includes('PULSEIRA')) {
      return { category: 'Pulseira' };
    }
    if (upperName.includes('CARRO')) {
      return { category: 'Terço de Carro' };
    }
    if (upperName.includes('CHAVEIRO')) {
      return { category: 'Chaveiro' };
    }

    return { category: 'Terços', subCategory: 'Linha Raízes' };
  };

  // Processa o arquivo selecionado
  const processFile = async (selectedFile: File) => {
    setIsLoading(true);
    setParseError(null);
    setFileName(selectedFile.name);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        throw new Error('A planilha está vazia ou não possui abas válidas.');
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (rawRows.length === 0) {
        throw new Error('Nenhuma linha de produto foi encontrada na planilha.');
      }

      // Descobre mapeamento de colunas inspecionando a primeira linha com dados
      const firstRow = rawRows[0];
      const columnKeys = Object.keys(firstRow);

      let keyNome = '';
      let keyCodigo = '';
      let keyCusto = '';
      let keyVenda = '';
      let keyEstoque = '';
      let keyCategoria = '';
      let keyLinha = '';

      columnKeys.forEach((col) => {
        const norm = normalizeKey(col);
        // Código / SKU
        if (!keyCodigo && (norm.includes('sku') || norm.includes('codigo') || norm.includes('cod') || norm === 'ref' || norm.includes('referencia'))) {
          keyCodigo = col;
        }
        // Nome / Modelo
        else if (!keyNome && (norm.includes('nome') || norm.includes('produto') || norm.includes('modelo') || norm.includes('descricao') || norm === 'item')) {
          keyNome = col;
        }
        // Preço de Custo
        else if (!keyCusto && (norm.includes('custo') || norm.includes('cost') || norm.includes('precocusto'))) {
          keyCusto = col;
        }
        // Preço de Venda
        else if (!keyVenda && (norm.includes('venda') || norm.includes('preco') || norm.includes('valor') || norm.includes('price') || norm.includes('sale'))) {
          keyVenda = col;
        }
        // Quantidade em Estoque
        else if (!keyEstoque && (norm.includes('estoque') || norm.includes('qtd') || norm.includes('quant') || norm.includes('stock') || norm.includes('saldo'))) {
          keyEstoque = col;
        }
        // Categoria
        else if (!keyCategoria && (norm.includes('categoria') || norm.includes('category') || norm === 'tipo')) {
          keyCategoria = col;
        }
        // Linha
        else if (!keyLinha && (norm.includes('linha') || norm.includes('subcategoria') || norm.includes('colecao') || norm === 'line')) {
          keyLinha = col;
        }
      });

      // Se não encontrou nome nem código, tenta fallback por posição
      if (!keyNome && columnKeys.length > 0) keyNome = columnKeys[0];
      if (!keyCodigo && columnKeys.length > 1) keyCodigo = columnKeys[1];
      if (!keyCusto && columnKeys.length > 2) keyCusto = columnKeys[2];
      if (!keyVenda && columnKeys.length > 3) keyVenda = columnKeys[3];
      if (!keyEstoque && columnKeys.length > 4) keyEstoque = columnKeys[4];

      // Mapeia os produtos existentes por código normalizado
      const existingSkuSet = new Set(existingProducts.map((p) => p.code.toUpperCase().trim()));

      const parsed: ParsedImportedProduct[] = [];

      rawRows.forEach((row, idx) => {
        const rawName = keyNome ? String(row[keyNome] || '').trim() : '';
        const rawCode = keyCodigo ? String(row[keyCodigo] || '').trim() : '';

        // Ignora linhas totalmente vazias
        if (!rawName && !rawCode) return;

        const modelName = rawName || rawCode || `Produto Importado ${idx + 1}`;
        let skuCode = rawCode || `SKU-${idx + 1}`;
        skuCode = skuCode.toUpperCase().replace(/\s+/g, '-');

        const costVal = keyCusto ? parseFinancial(row[keyCusto]) : 0;
        const saleVal = keyVenda ? parseFinancial(row[keyVenda]) : 0;
        const stockVal = keyEstoque ? parseStock(row[keyEstoque]) : 0;

        const explicitCategory = keyCategoria ? String(row[keyCategoria] || '').trim() : '';
        const explicitLinha = keyLinha ? String(row[keyLinha] || '').trim() : '';

        const inferred = inferCategoryAndLine(skuCode, modelName);
        const finalCategory: ProductCategory = (explicitCategory as ProductCategory) || inferred.category;
        const finalSubCategory = explicitLinha || inferred.subCategory;

        const isExisting = existingSkuSet.has(skuCode);

        let status: 'valid' | 'warning' = 'valid';
        let warningMessage = '';

        if (saleVal <= 0) {
          status = 'warning';
          warningMessage = 'Preço de venda zerado';
        } else if (costVal >= saleVal) {
          status = 'warning';
          warningMessage = 'Custo maior ou igual à venda';
        }

        parsed.push({
          id: skuCode,
          code: skuCode,
          model: modelName,
          category: finalCategory,
          subCategory: finalSubCategory,
          costPrice: costVal,
          salePrice: saleVal,
          stock: stockVal,
          isExisting,
          status,
          warningMessage: warningMessage || undefined,
        });
      });

      if (parsed.length === 0) {
        throw new Error('Não foi possível reconhecer nenhum produto válido na planilha. Verifique as colunas do arquivo.');
      }

      setPreviewProducts(parsed);
      setFile(selectedFile);
    } catch (err: any) {
      console.error('Erro ao ler planilha:', err);
      setParseError(err.message || 'Erro ao processar arquivo. Verifique o formato do arquivo.');
      setFile(null);
      setPreviewProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  // Gerador de planilha modelo CSV
  const handleDownloadSample = () => {
    const csvContent = 
`Nome do Produto,Código/SKU,Preço de Custo,Preço de Venda,Quantidade em Estoque,Categoria,Linha
All Black,TE-RA-AB,28.03,109.90,15,Terços,Linha Raízes
All Blue,TE-RA-ABL,20.63,109.90,20,Terços,Linha Raízes
São Bento Grafite,TE-FI-SB,20.94,79.90,12,Terços,Linha Fidelis
Cordão São Bento,CO-SB,12.20,47.90,30,Cordão,Cordões
Medalha São Bento Extra,EX-MSB,3.50,10.00,50,Extras,Medalhas
Crucifixo Rústico Extra,EX-CRX,5.00,15.00,40,Extras,Crucifixos`;

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_importacao_produtos_tercarium.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Confirmação e injeção dos produtos no estado global
  const handleConfirmImport = () => {
    if (previewProducts.length === 0) return;

    const itemsToProcess = updateExisting 
      ? previewProducts 
      : previewProducts.filter((item) => !item.isExisting);

    if (itemsToProcess.length === 0) {
      alert('Nenhum produto novo para importar com a opção de atualizar desmarcada.');
      return;
    }

    const productsToSave: Product[] = itemsToProcess.map((item) => ({
      id: item.code,
      code: item.code,
      sku: item.code,
      model: item.model,
      nome: item.model,
      category: item.category,
      categoria: item.category,
      subCategory: item.subCategory,
      linha: item.subCategory,
      costPrice: item.costPrice,
      custo: item.costPrice,
      salePrice: item.salePrice,
      preco: item.salePrice,
      stock: item.stock,
      stockQuantity: item.stock,
      estoque: item.stock,
      description: item.subCategory ? `${item.model} (${item.subCategory})` : item.model,
      createdAt: new Date().toLocaleDateString('pt-BR'),
    }));

    onImportSuccess(productsToSave);
    handleClose();
  };

  // Filtro de busca na pré-visualização
  const filteredPreview = useMemo(() => {
    if (!searchPreview) return previewProducts;
    const term = searchPreview.toLowerCase();
    return previewProducts.filter(
      (p) =>
        p.code.toLowerCase().includes(term) ||
        p.model.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        (p.subCategory && p.subCategory.toLowerCase().includes(term))
    );
  }, [previewProducts, searchPreview]);

  // Métricas do resumo da planilha
  const summaryMetrics = useMemo(() => {
    if (previewProducts.length === 0) return { total: 0, newCount: 0, existingCount: 0, totalStock: 0, totalValue: 0, avgSale: 0 };
    const total = previewProducts.length;
    const existingCount = previewProducts.filter((p) => p.isExisting).length;
    const newCount = total - existingCount;
    const totalStock = previewProducts.reduce((acc, p) => acc + (p.stock || 0), 0);
    const totalValue = previewProducts.reduce((acc, p) => acc + (p.stock || 0) * p.salePrice, 0);
    const avgSale = previewProducts.reduce((acc, p) => acc + p.salePrice, 0) / total;

    return { total, newCount, existingCount, totalStock, totalValue, avgSale };
  }, [previewProducts]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 transition-all"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header do Modal */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <UploadCloud className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Importar Planilha de Produtos
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                  CSV / Excel
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Carga em massa do catálogo inicial com Código/SKU, Preço de Custo, Preço de Venda e Estoque
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal com Scroll */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
          {/* ETAPA 1: SELETOR DE ARQUIVO & DRAG AND DROP (quando ainda não processou arquivo) */}
          {previewProducts.length === 0 ? (
            <div className="space-y-4">
              {/* Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 sm:p-12 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-3 ${
                  isDragging
                    ? 'border-amber-500 bg-amber-50/80 scale-[0.99]'
                    : 'border-slate-300 hover:border-amber-500 bg-slate-50/70 hover:bg-amber-50/20'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-xs">
                  {isLoading ? (
                    <RefreshCw className="w-7 h-7 text-amber-600 animate-spin" />
                  ) : (
                    <UploadCloud className="w-7 h-7 text-amber-600" />
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {isLoading ? 'Lendo e processando planilha...' : 'Arraste e solte o arquivo da planilha aqui'}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-md">
                    Ou clique para selecionar um arquivo do seu computador nos formatos <strong className="text-slate-800 font-semibold">.CSV, .XLSX ou .XLS</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-mono text-slate-600 font-semibold shadow-2xs">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    CSV / Excel
                  </span>
                  <span className="text-[11px] text-slate-400">Até 10MB</span>
                </div>
              </div>

              {/* Mensagem de Erro na leitura */}
              {parseError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5 animate-in fade-in duration-100">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">Erro ao processar o arquivo:</strong>
                    <span>{parseError}</span>
                  </div>
                </div>
              )}

              {/* Guia de Colunas Reconhecidas & Download do Modelo */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                    <Info className="w-4 h-4 text-amber-600" />
                    <span>Colunas Reconhecidas Automaticamente</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadSample}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs shadow-2xs transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Baixar Planilha Modelo (.CSV)</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  O sistema reconhece sinônimos comuns nas colunas (maiúsculas, minúsculas e sem acento). Certifique-se de que sua planilha contenha os dados vitais:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                    <span className="font-bold text-slate-900 block text-[11px]">1. Nome do Produto *</span>
                    <span className="text-[10px] text-slate-500 block">Ex: "All Black", "São Bento Grafite"</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                    <span className="font-bold text-slate-900 block text-[11px]">2. Código / SKU *</span>
                    <span className="text-[10px] text-slate-500 block">Ex: "TE-RA-AB", "TE-FI-SB"</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                    <span className="font-bold text-slate-900 block text-[11px]">3. Preço de Custo (R$) *</span>
                    <span className="text-[10px] text-slate-500 block">Ex: 28.03 ou "R$ 28,03"</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                    <span className="font-bold text-slate-900 block text-[11px]">4. Preço de Venda (R$) *</span>
                    <span className="text-[10px] text-slate-500 block">Ex: 109.90 ou "R$ 109,90"</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                    <span className="font-bold text-slate-900 block text-[11px]">5. Quantidade em Estoque</span>
                    <span className="text-[10px] text-slate-500 block">Ex: 15, 20 (opcional, padrão: 0)</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                    <span className="font-bold text-slate-900 block text-[11px]">6. Categoria / Linha</span>
                    <span className="text-[10px] text-slate-500 block">Ex: "Terços", "Linha Raízes" (opcional)</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ETAPA 2: RESUMO RÁPIDO & PRÉ-VISUALIZAÇÃO ANTES DE CONFIRMAR */
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Banner de Validação & Resumo Rápido Solicitado */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-emerald-500/15 border border-amber-300 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 font-bold shadow-xs">
                    <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Encontrámos {summaryMetrics.total} produto(s) na planilha. Tudo pronto para importar?
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Arquivo processado: <strong className="font-mono text-slate-900">{fileName}</strong> · Revise os dados abaixo e clique em confirmar.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors cursor-pointer shrink-0"
                >
                  Trocar Arquivo
                </button>
              </div>

              {/* Cards Rápidos de Indicadores da Importação */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
                  <span className="text-[11px] text-slate-500 block">Total a Importar</span>
                  <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                    {summaryMetrics.total} itens
                  </div>
                  <span className="text-[10px] text-emerald-700 font-medium">
                    {summaryMetrics.newCount} novos · {summaryMetrics.existingCount} atualizações
                  </span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
                  <span className="text-[11px] text-slate-500 block">Saldo Total em Estoque</span>
                  <div className="text-lg font-bold font-mono text-amber-700 mt-0.5">
                    {summaryMetrics.totalStock} un.
                  </div>
                  <span className="text-[10px] text-slate-400">peças somadas</span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
                  <span className="text-[11px] text-slate-500 block">Preço Médio de Venda</span>
                  <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                    {formatBRL(summaryMetrics.avgSale)}
                  </div>
                  <span className="text-[10px] text-slate-400">ticket do catálogo</span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
                  <span className="text-[11px] text-slate-500 block">Patrimônio em Estoque</span>
                  <div className="text-lg font-bold font-mono text-emerald-800 mt-0.5">
                    {formatBRL(summaryMetrics.totalValue)}
                  </div>
                  <span className="text-[10px] text-emerald-700 font-medium">valor de venda estimado</span>
                </div>
              </div>

              {/* Barra de Filtro e Opções da Tabela */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchPreview}
                    onChange={(e) => setSearchPreview(e.target.value)}
                    placeholder="Filtrar produtos lidos por SKU, modelo ou categoria..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={updateExisting}
                    onChange={(e) => setUpdateExisting(e.target.checked)}
                    className="w-4 h-4 text-amber-600 focus:ring-amber-500 rounded accent-amber-500 cursor-pointer"
                  />
                  <span>Atualizar dados caso o Código/SKU já exista no catálogo</span>
                </label>
              </div>

              {/* Tabela de Pré-visualização com Scroll */}
              <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="max-h-72 overflow-y-auto overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-900 text-white text-[11px] font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Código/SKU</th>
                        <th className="py-2.5 px-3">Nome do Produto</th>
                        <th className="py-2.5 px-3">Categoria / Linha</th>
                        <th className="py-2.5 px-3 text-right">Preço Custo</th>
                        <th className="py-2.5 px-3 text-right">Preço Venda</th>
                        <th className="py-2.5 px-3 text-center">Estoque</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredPreview.map((item, idx) => {
                        return (
                          <tr key={`${item.code}-${idx}`} className="hover:bg-slate-50 transition-colors">
                            {/* SKU */}
                            <td className="py-2 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                                {item.code}
                              </span>
                            </td>

                            {/* Nome */}
                            <td className="py-2 px-3 font-semibold text-slate-900">
                              {item.model}
                            </td>

                            {/* Categoria / Linha */}
                            <td className="py-2 px-3 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-medium text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                  {item.category}
                                </span>
                                {item.subCategory && (
                                  <span className="text-[10px] font-medium text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                    {item.subCategory}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Custo */}
                            <td className="py-2 px-3 text-right font-mono text-rose-700 whitespace-nowrap">
                              {formatBRL(item.costPrice)}
                            </td>

                            {/* Venda */}
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                              {formatBRL(item.salePrice)}
                            </td>

                            {/* Estoque */}
                            <td className="py-2 px-3 text-center whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-mono font-bold text-[11px] ${
                                item.stock > 0
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-slate-100 text-slate-500 border border-slate-200'
                              }`}>
                                {item.stock} un.
                              </span>
                            </td>

                            {/* Status */}
                            <td className="py-2 px-3 text-center whitespace-nowrap">
                              {item.isExisting ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  Atualização
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                                  Novo
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer com Botões de Ação */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {previewProducts.length > 0 ? (
              <span className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                Planilha validada: {previewProducts.length} itens prontos para serem salvos.
              </span>
            ) : (
              <span>Formatos aceitos: Planilhas Excel (.xlsx, .xls) ou Valores separados por vírgula (.csv)</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            {previewProducts.length > 0 && (
              <button
                type="button"
                onClick={handleConfirmImport}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shadow-amber-500/20"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Salvar Produtos no Sistema</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
