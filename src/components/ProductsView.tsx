import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  DollarSign, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  X,
  Layers,
  TrendingUp,
  Tag,
  Eye,
  UploadCloud
} from 'lucide-react';
import { Product, ProductCategory, ProductSubCategory, UserRole } from '../types/erp';
import { formatBRL, formatPercent, groupProductsByCategoryAndLine } from '../utils/formatters';
import { ImportProductsModal } from './ImportProductsModal';

interface ProductsViewProps {
  products: Product[];
  onAddProduct: (product: Product) => void;
  onBatchAddProducts?: (products: Product[]) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  userRole?: UserRole;
}

const CATEGORIES: ProductCategory[] = [
  'Terços',
  'Cordão',
  'Extras',
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
  'Cordões',
  'Medalhas',
  'Crucifixos',
  'Outro',
];

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  onAddProduct,
  onBatchAddProducts,
  onUpdateProduct,
  onDeleteProduct,
  userRole,
}) => {
  const isViewer = userRole === 'leitura';
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [subCategoryFilter, setSubCategoryFilter] = useState<string>('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [toastNotice, setToastNotice] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Form states
  const [code, setCode] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Terços');
  const [selectedLineOption, setSelectedLineOption] = useState<string>('Linha Raízes');
  const [customLineName, setCustomLineName] = useState<string>('');
  const [model, setModel] = useState('');
  const [costPrice, setCostPrice] = useState<number | ''>(45);
  const [salePrice, setSalePrice] = useState<number | ''>(160);
  const [stock, setStock] = useState<number | ''>(0);
  const [formError, setFormError] = useState<string | null>(null);

  // Injeção de produtos importados via planilha
  const handleBatchImport = (importedProducts: Product[]) => {
    if (onBatchAddProducts) {
      onBatchAddProducts(importedProducts);
    } else {
      importedProducts.forEach((p) => onAddProduct(p));
    }
    setToastNotice(`Sucesso! ${importedProducts.length} produto(s) importado(s) e integrados ao catálogo.`);
    setTimeout(() => setToastNotice(null), 4000);
  };

  // Filter products by search term, category and subcategory
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        p.code.toLowerCase().includes(term) ||
        p.model.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        (p.subCategory && p.subCategory.toLowerCase().includes(term));

      const matchCategory = categoryFilter === 'all' || p.category === categoryFilter;
      const matchSubCategory = subCategoryFilter === 'all' || p.subCategory === subCategoryFilter;

      return matchSearch && matchCategory && matchSubCategory;
    });
  }, [products, searchTerm, categoryFilter, subCategoryFilter]);

  // Agrupamento Hierárquico Obrigatório: Categoria -> Linha -> Itens (A-Z)
  const groupedProducts = useMemo(() => {
    return groupProductsByCategoryAndLine(filteredProducts);
  }, [filteredProducts]);

  // Metrics
  const totalProducts = products.length;
  const tercosCount = products.filter((p) => p.category === 'Terços').length;
  const avgSalePrice = products.length > 0
    ? products.reduce((acc, p) => acc + p.salePrice, 0) / products.length
    : 0;
  const avgMargin = products.length > 0
    ? products.reduce((acc, p) => acc + (p.salePrice > 0 ? ((p.salePrice - p.costPrice) / p.salePrice) * 100 : 0), 0) / products.length
    : 0;

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setCode('');
    setCategory('Terços');
    setSelectedLineOption('Linha Raízes');
    setCustomLineName('');
    setModel('');
    setCostPrice(45);
    setSalePrice(160);
    setStock(0);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setCode(p.code);
    setCategory(p.category);
    if (p.category === 'Terços' && p.subCategory) {
      if (['Linha Raízes', 'Linha Fidelis', 'Personalizados'].includes(p.subCategory)) {
        setSelectedLineOption(p.subCategory);
        setCustomLineName('');
      } else {
        setSelectedLineOption('Nova Linha');
        setCustomLineName(p.subCategory);
      }
    } else {
      setSelectedLineOption('Linha Raízes');
      setCustomLineName('');
    }
    setModel(p.model);
    setCostPrice(p.costPrice);
    setSalePrice(p.salePrice);
    setStock(p.stock ?? (p as any).estoque ?? 0);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!code.trim()) {
      setFormError('Por favor, informe o Código do Item.');
      return;
    }
    if (!model.trim()) {
      setFormError('Por favor, informe o Modelo do produto.');
      return;
    }
    if (typeof costPrice !== 'number' || costPrice < 0) {
      setFormError('Informe um Preço de Custo válido.');
      return;
    }
    if (typeof salePrice !== 'number' || salePrice <= 0) {
      setFormError('O Preço de Venda deve ser maior que zero.');
      return;
    }

    let finalLine: string | undefined = undefined;
    if (category === 'Terços') {
      if (selectedLineOption === 'Nova Linha') {
        if (!customLineName.trim()) {
          setFormError('Por favor, digite o nome da Nova Linha.');
          return;
        }
        finalLine = customLineName.trim();
      } else {
        finalLine = selectedLineOption;
      }
    }

    // Check duplicate code (if adding new, or if editing and changed to existing)
    const duplicate = products.find(
      (p) => p.code.trim().toUpperCase() === code.trim().toUpperCase() && p.id !== editingProduct?.id
    );
    if (duplicate) {
      setFormError(`O código "${code.trim().toUpperCase()}" já está em uso pelo produto "${duplicate.model}".`);
      return;
    }

    if (editingProduct) {
      const updated: Product = {
        ...editingProduct,
        code: code.trim().toUpperCase(),
        category,
        subCategory: finalLine,
        model: model.trim(),
        costPrice: Number(costPrice),
        salePrice: Number(salePrice),
        stock: Number(stock) || 0,
        stockQuantity: Number(stock) || 0,
        estoque: Number(stock) || 0,
      } as any;
      onUpdateProduct(updated);
    } else {
      const newProd: Product = {
        id: `PRD-${Date.now().toString().slice(-4)}`,
        code: code.trim().toUpperCase(),
        category,
        subCategory: finalLine,
        model: model.trim(),
        costPrice: Number(costPrice),
        salePrice: Number(salePrice),
        stock: Number(stock) || 0,
        stockQuantity: Number(stock) || 0,
        estoque: Number(stock) || 0,
      } as any;
      onAddProduct(newProd);
    }

    setIsModalOpen(false);
  };

  const numCost = typeof costPrice === 'number' ? costPrice : 0;
  const numSale = typeof salePrice === 'number' ? salePrice : 0;
  const grossProfit = numSale - numCost;
  const grossMargin = numSale > 0 ? (grossProfit / numSale) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 sm:p-6 rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" />
              Gestão de Catálogo & Custos
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {products.length} itens cadastrados
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
            Produtos & Engenharia de Preços
          </h2>
          <p className="text-xs text-slate-400 max-w-xl">
            Cadastre os itens da linha Terçarium com preços de custo e venda padronizados para alimentar os pedidos com snapshot de valores.
          </p>
        </div>

        {/* Ações: Importar Planilha & Novo Produto */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 text-white font-semibold text-xs sm:text-sm tracking-wide shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 whitespace-nowrap cursor-pointer"
            title="Importar catálogo em lote via planilha CSV ou Excel"
          >
            <UploadCloud className="w-4 h-4 text-amber-400" />
            <span>Importar Planilha</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-xs sm:text-sm tracking-wide shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Novo Produto</span>
          </button>
        </div>
      </div>

      {/* Toast Feedback Notice */}
      {toastNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center justify-between gap-2 text-xs font-semibold shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastNotice(null)}
            className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-100 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Itens no Catálogo</span>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
            {totalProducts}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">produtos ativos</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Terços Artesanais</span>
          <div className="text-xl font-bold font-mono text-amber-700 mt-1 tabular-nums">
            {tercosCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">linha principal</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Ticket Médio de Venda</span>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
            {formatBRL(avgSalePrice)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">preço médio cadastrado</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Margem Média Catálogo</span>
          <div className="text-xl font-bold font-mono text-emerald-800 mt-1 tabular-nums">
            {formatPercent(avgMargin)}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-0.5">markup saudável</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por código (ex: TC-FIDEL), modelo ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtro por Categoria */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                if (e.target.value !== 'Terços') setSubCategoryFilter('all');
              }}
              className="text-xs py-2 px-3 rounded-lg border border-slate-200 bg-slate-50 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="all">Todas as Categorias</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Filtro por Subcategoria (quando aplicável) */}
            {categoryFilter === 'Terços' && (
              <select
                value={subCategoryFilter}
                onChange={(e) => setSubCategoryFilter(e.target.value)}
                className="text-xs py-2 px-3 rounded-lg border border-slate-200 bg-slate-50 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 animate-in fade-in duration-100"
              >
                <option value="all">Todas as Linhas de Terço</option>
                {SUBCATEGORIES.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            )}

            <div className="text-xs text-slate-500 whitespace-nowrap pl-2">
              <span className="font-mono font-bold text-slate-800">{filteredProducts.length}</span> de <span className="font-mono font-bold text-slate-800">{products.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Categoria / LINHA</th>
                <th className="py-3 px-4">Modelo do Produto</th>
                <th className="py-3 px-4 text-right">Preço Custo</th>
                <th className="py-3 px-4 text-right">Preço Venda</th>
                <th className="py-3 px-4 text-center">Lucro & Margem</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <Package className="w-8 h-8 text-gray-300 mx-auto mb-2 stroke-[1.5]" />
                    <p className="font-semibold text-gray-700">Nenhum produto cadastrado no momento</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {searchTerm || categoryFilter !== 'all' || subCategoryFilter !== 'all'
                        ? 'Nenhum produto corresponde aos filtros aplicados.'
                        : 'Cadastre os modelos do ateliê utilizando o botão "+ Novo Produto" acima ou importe via planilha.'}
                    </p>
                  </td>
                </tr>
              ) : (
                groupedProducts.map((catGroup) => {
                  const totalInCat = catGroup.lines.reduce((acc, l) => acc + l.products.length, 0);

                  return (
                    <React.Fragment key={`cat-${catGroup.category}`}>
                      {/* ---------------------------------------------------- */}
                      {/* CABEÇALHO DE CATEGORIA (Linha escura e de destaque) */}
                      {/* ---------------------------------------------------- */}
                      <tr className="bg-slate-900 text-white border-y border-slate-950 shadow-2xs">
                        <td colSpan={7} className="py-2.5 px-4 bg-slate-900">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-500/30" />
                              <span className="text-xs sm:text-sm font-black tracking-wider uppercase text-amber-300">
                                {catGroup.category}
                              </span>
                              <span className="text-[11px] font-mono font-medium text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                                {totalInCat} {totalInCat === 1 ? 'item' : 'itens'}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 uppercase tracking-widest hidden sm:inline font-mono">
                              Categoria do Catálogo
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* LINHAS DENTRO DA CATEGORIA */}
                      {catGroup.lines.map((line) => (
                        <React.Fragment key={`line-${catGroup.category}-${line.lineName}`}>
                          {/* -------------------------------------------------- */}
                          {/* CABEÇALHO DE LINHA (Sutil, tom dourado/âmbar claro)*/}
                          {/* -------------------------------------------------- */}
                          <tr className="bg-amber-50/70 border-b border-amber-200/80 text-slate-800">
                            <td colSpan={7} className="py-2 px-4 pl-6 sm:pl-8 bg-amber-50/70">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Layers className="w-3.5 h-3.5 text-amber-700" />
                                  <span className="text-xs font-bold text-amber-950 tracking-wide">
                                    {line.lineName}
                                  </span>
                                  <span className="text-[10px] font-mono font-semibold text-amber-900 bg-amber-100/90 px-1.5 py-0.2 rounded border border-amber-300">
                                    {line.products.length} {line.products.length === 1 ? 'modelo' : 'modelos'}
                                  </span>
                                </div>
                                <span className="text-[10px] text-amber-800/80 font-mono hidden sm:inline">
                                  Ordem Alfabética (A-Z)
                                </span>
                              </div>
                            </td>
                          </tr>

                          {/* ITENS PERTENCENTES À CATEGORIA E LINHA (A-Z) */}
                          {line.products.map((p) => {
                            const profit = p.salePrice - p.costPrice;
                            const margin = p.salePrice > 0 ? (profit / p.salePrice) * 100 : 0;

                            return (
                              <tr
                                key={p.id}
                                className="hover:bg-slate-50/80 transition-colors group"
                              >
                                {/* Código do Item */}
                                <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap pl-6 sm:pl-8">
                                  <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800">
                                    {p.code}
                                  </span>
                                </td>

                                {/* Categoria & Subcategoria */}
                                <td className="py-3 px-4 whitespace-nowrap">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-semibold text-slate-900">{p.category}</span>
                                    {p.subCategory ? (
                                      <span className="text-[10px] font-medium text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/80 w-fit">
                                        {p.subCategory}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400">—</span>
                                    )}
                                  </div>
                                </td>

                                {/* Modelo */}
                                <td className="py-3 px-4">
                                  <div className="font-bold text-slate-900 max-w-sm sm:max-w-md">
                                    {p.model}
                                  </div>
                                  {(p as any).description && (
                                    <div className="text-[11px] text-slate-500 truncate max-w-sm" title={(p as any).description}>
                                      {(p as any).description}
                                    </div>
                                  )}
                                </td>

                                {/* Preço de Custo */}
                                <td className="py-3 px-4 text-right font-mono text-rose-700 whitespace-nowrap">
                                  {formatBRL(p.costPrice)}
                                </td>

                                {/* Preço de Venda */}
                                <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                                  {formatBRL(p.salePrice)}
                                </td>

                                {/* Lucro & Margem */}
                                <td className="py-3 px-4 text-center whitespace-nowrap">
                                  <div className="inline-flex flex-col items-center">
                                    <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                                      +{formatBRL(profit)}
                                    </span>
                                    <span className="text-[10px] text-emerald-700 font-mono mt-0.5">
                                      {formatPercent(margin)} margem
                                    </span>
                                  </div>
                                </td>

                                {/* AÇÕES: 'Editar' e 'Apagar' */}
                                <td className="py-3 px-4 text-center whitespace-nowrap">
                                  <div className="inline-flex items-center gap-1.5">
                                    {/* Botão Editar */}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditModal(p)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                                      title="Editar produto"
                                    >
                                      <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                                      <span>Editar</span>
                                    </button>

                                    {/* Botão Apagar */}
                                    {!isViewer && (
                                      <button
                                        type="button"
                                        onClick={() => setProductToDelete(p)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                        title="Excluir produto do catálogo"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: NOVO PRODUTO / EDITAR PRODUTO */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 transition-all"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    {editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Preencha as informações do item para o catálogo do ateliê
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
              {isViewer && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-950 flex items-center gap-2.5 text-xs font-medium">
                  <Eye className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Modo Visualizador:</strong> Edição e cadastro bloqueados para o seu perfil. Você pode consultar as informações técnicas e precificação do produto.
                  </span>
                </div>
              )}

              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Código do Item (Input manual) */}
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Código do Item *
                </label>
                <input
                  type="text"
                  required
                  disabled={isViewer}
                  placeholder="Ex: TC-RAIZ-03 ou PLS-02"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 tracking-wider text-xs uppercase disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Identificador único (SKU) do produto no ateliê.
                </span>
              </div>

              {/* Categoria & Subcategoria */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Categoria */}
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Categoria *
                  </label>
                  <select
                    value={category}
                    disabled={isViewer}
                    onChange={(e) => setCategory(e.target.value as ProductCategory)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* LINHA (Exibir APENAS se Categoria for 'Terços') */}
                {category === 'Terços' ? (
                  <div className="space-y-2.5 animate-in fade-in duration-150">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        LINHA *
                      </label>
                      <select
                        value={selectedLineOption}
                        disabled={isViewer}
                        onChange={(e) => setSelectedLineOption(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs shadow-2xs disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                      >
                        <option value="Linha Raízes">Linha Raízes</option>
                        <option value="Linha Fidelis">Linha Fidelis</option>
                        <option value="Personalizados">Personalizados</option>
                        <option value="Nova Linha">+ Nova Linha</option>
                      </select>
                    </div>

                    {/* Campo condicional para digitar o nome da Nova Linha */}
                    {selectedLineOption === 'Nova Linha' && (
                      <div className="animate-in fade-in duration-150 pt-1">
                        <label className="block text-slate-700 font-medium mb-1">
                          Nome da Nova Linha *
                        </label>
                        <input
                          type="text"
                          required
                          disabled={isViewer}
                          placeholder="Digite o nome da nova linha (ex: Linha Querubins)"
                          value={customLineName}
                          onChange={(e) => setCustomLineName(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-amber-50/30 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs shadow-2xs placeholder:text-slate-400 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center text-[11px] text-slate-400 italic pt-6">
                    Linha aplicável apenas para Terços
                  </div>
                )}
              </div>

              {/* Modelo (Input de texto) */}
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Modelo do Produto *
                </label>
                <input
                  type="text"
                  required
                  disabled={isViewer}
                  placeholder="Ex: Terço Mariano Imbuia 8mm com Medalha São Bento"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs font-medium disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                />
              </div>

              {/* Preço de Custo e Preço de Venda */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Preço de Custo (R$) */}
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Preço de Custo (R$) *
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
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Insumos + confecção</span>
                </div>

                {/* Preço de Venda (R$) */}
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Preço de Venda (R$) *
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
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Preço tabela de catálogo</span>
                </div>
              </div>

              {/* Simulador de Rentabilidade Unitária */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                    Lucro Bruto Unitário Estimado
                  </span>
                  <span className="font-mono font-bold text-sm text-emerald-800">
                    {formatBRL(grossProfit)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                    Margem Bruta
                  </span>
                  <span className="font-mono font-bold text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {formatPercent(grossMargin)}
                  </span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isViewer}
                  title={isViewer ? 'Visualizadores não possuem permissão para salvar produtos' : 'Salvar Produto'}
                  className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-amber-500 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salvar Produto</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO DE EXCLUSÃO */}
      {productToDelete && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 transition-all"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-slate-900 text-sm">
                Excluir Produto do Catálogo?
              </h3>
              <p className="text-xs text-slate-500">
                Tem certeza que deseja apagar o produto <strong>{productToDelete.code} - {productToDelete.model}</strong>?
                Os pedidos já cadastrados manterão o histórico de valores intocado.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteProduct(productToDelete.id);
                  setProductToDelete(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE IMPORTAÇÃO DE PLANILHA (CSV / EXCEL) */}
      <ImportProductsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={handleBatchImport}
        existingProducts={products}
      />
    </div>
  );
};
