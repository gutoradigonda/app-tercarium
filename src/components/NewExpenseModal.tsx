import React, { useState, useEffect } from 'react';
import { 
  X, 
  Receipt, 
  Calendar, 
  DollarSign, 
  Tag, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { 
  Expense, 
  ExpenseCategory, 
  ExpenseType, 
  ExpenseStatus,
  EXPENSE_CATEGORIES 
} from '../types/erp';
import { formatDate } from '../utils/formatters';

interface NewExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveExpense: (expense: Expense) => void;
  expenseToEdit?: Expense | null;
}

export const NewExpenseModal: React.FC<NewExpenseModalProps> = ({
  isOpen,
  onClose,
  onSaveExpense,
  expenseToEdit,
}) => {
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | ''>('');
  const [status, setStatus] = useState<ExpenseStatus>('pago');
  const [paymentMethod, setPaymentMethod] = useState('Pix');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Sync state when opening or when expenseToEdit changes
  useEffect(() => {
    if (expenseToEdit) {
      setDescription(expenseToEdit.description);
      setAmountStr(expenseToEdit.amount.toString());
      setSelectedCategory(expenseToEdit.category);
      setStatus(expenseToEdit.status);
      setPaymentMethod(expenseToEdit.paymentMethod || 'Pix');
      setNotes(expenseToEdit.notes || '');

      // Convert date string if DD/MM/AAAA to YYYY-MM-DD for native input
      if (expenseToEdit.date.includes('/')) {
        const parts = expenseToEdit.date.split('/');
        if (parts.length === 3) {
          const dd = parts[0].padStart(2, '0');
          const mm = parts[1].padStart(2, '0');
          const yyyy = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
          setDate(`${yyyy}-${mm}-${dd}`);
        }
      } else {
        setDate(expenseToEdit.date);
      }
    } else {
      setDescription('');
      setAmountStr('');
      setSelectedCategory('');
      setStatus('pago');
      setPaymentMethod('Pix');
      setNotes('');
      const today = new Date();
      setDate(today.toISOString().split('T')[0]);
    }
    setError(null);
  }, [expenseToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanDesc = description.trim();
    if (!cleanDesc) {
      setError('Por favor, informe uma descrição detalhada para a despesa.');
      return;
    }

    const parsedAmount = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Por favor, insira um valor válido maior que zero (R$).');
      return;
    }

    if (!selectedCategory) {
      setError('Por favor, selecione a categoria de custo (Fixa ou Variável).');
      return;
    }

    if (!date) {
      setError('Por favor, selecione a data de vencimento / pagamento.');
      return;
    }

    // Determine category group automatically based on selected category
    let group: ExpenseType = 'Custos Variáveis';
    for (const catGroup of EXPENSE_CATEGORIES) {
      if (catGroup.options.some((opt) => opt.value === selectedCategory)) {
        group = catGroup.group;
        break;
      }
    }

    // Format date as DD/MM/AAAA for standard storage and display
    let formattedDate = date;
    if (date.includes('-')) {
      const [y, m, d] = date.split('-');
      formattedDate = `${d}/${m}/${y}`;
    }

    const expenseData: Expense = {
      id: expenseToEdit?.id || `EXP-${Date.now().toString().slice(-6)}`,
      date: formattedDate,
      description: cleanDesc,
      categoryGroup: group,
      category: selectedCategory as ExpenseCategory,
      amount: parsedAmount,
      status,
      paymentMethod,
      notes: notes.trim() || undefined,
      createdAt: expenseToEdit?.createdAt || new Date().toISOString(),
    };

    onSaveExpense(expenseData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Elegante Dourado & Dark */}
        <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white tracking-tight">
                  {expenseToEdit ? 'Editar Despesa' : 'Registrar Nova Despesa'}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                  Saída DRE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Alimente o fluxo financeiro de custos e matéria-prima
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário com Scroll Suave */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Descrição */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">
              Descrição da Despesa <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <FileText className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                autoFocus
                placeholder="Ex: Compra de Paracord Preto 550"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all text-xs"
              />
            </div>
          </div>

          {/* 2. Grid de Data e Valor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Data */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">
                Data de Vencimento / Pagto <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all text-xs"
                />
              </div>
            </div>

            {/* Valor em R$ */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">
                Valor da Saída (R$) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-amber-600 font-bold font-mono">
                  R$
                </div>
                <input
                  type="text"
                  required
                  placeholder="0,00"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 font-bold font-mono text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* 3. Categoria Agrupada com OptGroup */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px] flex items-center justify-between">
              <span>Categoria de Custo (DRE) <span className="text-rose-500">*</span></span>
              <span className="text-[10px] text-slate-400 lowercase font-normal">agrupado por tipo</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Tag className="w-4 h-4" />
              </div>
              <select
                required
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as ExpenseCategory)}
                className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all text-xs cursor-pointer"
              >
                <option value="" disabled>Selecione a categoria correspondente...</option>
                {EXPENSE_CATEGORIES.map((catGroup) => (
                  <optgroup 
                    key={catGroup.group} 
                    label={`--- ${catGroup.group.toUpperCase()} ---`}
                    className="font-bold text-slate-900 bg-slate-100"
                  >
                    {catGroup.options.map((opt) => (
                      <option 
                        key={opt.value} 
                        value={opt.value}
                        className="font-normal text-slate-800 bg-white py-1"
                      >
                        {opt.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Custos Variáveis variam com a produção (matéria-prima, embalagem). Custos Fixos são recorrentes (software, salários).
            </p>
          </div>

          {/* 4. Status de Pagamento (Toggle Buttons) */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">
              Status do Pagamento
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus('pago')}
                className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 font-semibold transition-all cursor-pointer ${
                  status === 'pago'
                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Pago</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('pendente')}
                className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 font-semibold transition-all cursor-pointer ${
                  status === 'pendente'
                    ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Pendente</span>
              </button>
            </div>
          </div>

          {/* 5. Forma de Pagamento e Observações (Opcionais) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">
                Forma de Pagamento
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="Pix">PIX (Instantâneo)</option>
                <option value="Boleto">Boleto Bancário</option>
                <option value="Cartão de Crédito">Cartão de Crédito Corporativo</option>
                <option value="Transferência Bancária">Transferência Bancária / TED</option>
                <option value="Dinheiro">Dinheiro Espécie</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">
                Observações / Fornecedor
              </label>
              <input
                type="text"
                placeholder="Ex: Fornecedor Cordas Brasil"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Rodapé com Ações */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold tracking-wide shadow-md shadow-amber-950/20 hover:shadow-amber-900/30 transition-all cursor-pointer flex items-center gap-2"
            >
              <Receipt className="w-4 h-4" />
              <span>{expenseToEdit ? 'Salvar Alterações' : 'Confirmar e Lançar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
