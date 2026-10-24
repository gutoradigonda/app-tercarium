import React, { useState, useMemo } from 'react';
import { 
  Receipt, 
  Plus, 
  Search, 
  Calendar, 
  DollarSign, 
  TrendingDown, 
  Tag, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  Edit3, 
  Filter, 
  Layers, 
  AlertCircle,
  FileSpreadsheet,
  ArrowUpDown,
  Download
} from 'lucide-react';
import { 
  Expense, 
  ExpenseStatus, 
  ExpenseType, 
  EXPENSE_STATUS_CONFIG, 
  UserRole 
} from '../types/erp';
import { exportToCSV } from '../utils/exportUtils';
import { 
  formatBRL, 
  formatDate, 
  extractMonthYear, 
  formatMonthYearLabel,
  getCurrentMonthKey 
} from '../utils/formatters';

interface ExpensesViewProps {
  expenses: Expense[];
  onAddExpense: (expense: Expense) => void;
  onUpdateExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
  onToggleStatus: (expenseId: string) => void;
  onOpenNewExpenseModal: () => void;
  onOpenEditExpenseModal: (expense: Expense) => void;
  userRole?: UserRole;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onToggleStatus,
  onOpenNewExpenseModal,
  onOpenEditExpenseModal,
  userRole = 'admin',
}) => {
  const isReadOnly = userRole === 'viewer';

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleExport = () => {
    setToastMessage('Download do relatório em CSV iniciado...');
    setTimeout(() => setToastMessage(null), 3500);

    const headers = [
      'ID',
      'Data',
      'Descrição',
      'Tipo de Custo',
      'Categoria',
      'Forma Pagto',
      'Valor (R$)',
      'Status',
      'Observações'
    ];
    const rows = filteredExpenses.map((exp) => [
      exp.id,
      exp.date,
      exp.description,
      exp.categoryGroup,
      exp.category,
      exp.paymentMethod || 'Pix',
      exp.amount.toFixed(2),
      exp.status === 'pago' ? 'Pago' : 'Pendente',
      exp.notes || ''
    ]);
    exportToCSV('despesas_tercarium', headers, rows);
  };

  // Modal de confirmação de exclusão
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  // Lista de meses disponíveis nos dados
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((exp) => {
      const mKey = extractMonthYear(exp.date);
      if (mKey) set.add(mKey);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [expenses]);

  // Filtragem dos itens
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      // Busca textual
      const term = searchTerm.toLowerCase();
      const matchSearch =
        exp.description.toLowerCase().includes(term) ||
        exp.category.toLowerCase().includes(term) ||
        (exp.notes && exp.notes.toLowerCase().includes(term)) ||
        (exp.paymentMethod && exp.paymentMethod.toLowerCase().includes(term));

      if (!matchSearch) return false;

      // Filtro de Grupo de Custo
      if (selectedGroup !== 'all' && exp.categoryGroup !== selectedGroup) {
        return false;
      }

      // Filtro de Status
      if (selectedStatus !== 'all' && exp.status !== selectedStatus) {
        return false;
      }

      // Filtro de Mês
      if (selectedMonth !== 'all') {
        const mKey = extractMonthYear(exp.date);
        if (mKey !== selectedMonth) return false;
      }

      return true;
    });
  }, [expenses, searchTerm, selectedGroup, selectedStatus, selectedMonth]);

  // Agrupamento por mês para os Row Headers da Tabela
  const groupedExpensesByMonth = useMemo(() => {
    const map = new Map<string, Expense[]>();

    filteredExpenses.forEach((exp) => {
      const mKey = extractMonthYear(exp.date) || 'outros';
      const current = map.get(mKey) || [];
      current.push(exp);
      map.set(mKey, current);
    });

    // Ordenação dos meses do mais recente para o mais antigo
    const sortedKeys = Array.from(map.keys()).sort((a, b) => {
      if (a === 'outros') return 1;
      if (b === 'outros') return -1;
      return b.localeCompare(a);
    });

    return sortedKeys.map((mKey) => {
      const items = map.get(mKey) || [];
      // Ordenação das despesas dentro do mês por data decrescente
      const sortedItems = [...items].sort((a, b) => {
        const dateA = a.date.includes('/') ? a.date.split('/').reverse().join('') : a.date;
        const dateB = b.date.includes('/') ? b.date.split('/').reverse().join('') : b.date;
        return dateB.localeCompare(dateA);
      });

      const totalAmount = items.reduce((acc, it) => acc + it.amount, 0);
      const totalPaid = items.filter((it) => it.status === 'pago').reduce((acc, it) => acc + it.amount, 0);
      const totalPending = items.filter((it) => it.status === 'pendente').reduce((acc, it) => acc + it.amount, 0);

      return {
        monthKey: mKey,
        monthLabel: mKey === 'outros' ? 'Outras Datas' : formatMonthYearLabel(mKey, 'full'),
        items: sortedItems,
        totalAmount,
        totalPaid,
        totalPending,
      };
    });
  }, [filteredExpenses]);

  // Cálculos consolidados para os Cards do Topo
  const metrics = useMemo(() => {
    const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
    const variableCosts = filteredExpenses
      .filter((e) => e.categoryGroup === 'Custos Variáveis')
      .reduce((acc, e) => acc + e.amount, 0);
    const fixedCosts = filteredExpenses
      .filter((e) => e.categoryGroup === 'Custos Fixos')
      .reduce((acc, e) => acc + e.amount, 0);
    const paidAmount = filteredExpenses
      .filter((e) => e.status === 'pago')
      .reduce((acc, e) => acc + e.amount, 0);
    const pendingAmount = filteredExpenses
      .filter((e) => e.status === 'pendente')
      .reduce((acc, e) => acc + e.amount, 0);

    return {
      count: filteredExpenses.length,
      totalExpenses,
      variableCosts,
      fixedCosts,
      paidAmount,
      pendingAmount,
    };
  }, [filteredExpenses]);

  const confirmDelete = () => {
    if (expenseToDelete) {
      onDeleteExpense(expenseToDelete.id);
      setExpenseToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOPO: Título, Descrição e Botão de Destaque 'Nova Despesa' */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-700 shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Controle de Despesas & Saídas
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                  {expenses.length} lançamentos
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Registro detalhado de saídas financeiras (matéria-prima, ferramentas, folha e mensalidades) para o DRE.
              </p>
            </div>
          </div>
        </div>

        {/* Botão de Destaque Oficial Nova Despesa */}
        {!isReadOnly && (
          <button
            type="button"
            onClick={onOpenNewExpenseModal}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs tracking-wide shadow-md shadow-amber-950/20 hover:shadow-amber-900/30 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Despesa</span>
          </button>
        )}
      </div>

      {/* 2. CARDS DE RESUMO FINANCEIRO (DRE DAS DESPESAS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Total Saídas */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Total de Despesas</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-700 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-slate-900 tracking-tight">
              {formatBRL(metrics.totalExpenses)}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {metrics.count} saída(s) no período
            </p>
          </div>
        </div>

        {/* Card 2: Custos Variáveis */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Custos Variáveis</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-amber-800 tracking-tight">
              {formatBRL(metrics.variableCosts)}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Insumos, matéria-prima e embalagens
            </p>
          </div>
        </div>

        {/* Card 3: Custos Fixos */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Custos Fixos</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-700 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-indigo-900 tracking-tight">
              {formatBRL(metrics.fixedCosts)}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Pró-labore, softwares e marketing
            </p>
          </div>
        </div>

        {/* Card 4: Total Pago */}
        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-emerald-900">Total Liquidado (Pago)</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-200/70 text-emerald-800 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-emerald-800 tracking-tight">
              {formatBRL(metrics.paidAmount)}
            </div>
            <p className="text-[11px] text-emerald-700 mt-0.5">
              Quitadas e conciliadas
            </p>
          </div>
        </div>

        {/* Card 5: Total Pendente */}
        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-300 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-amber-900">A Pagar (Pendente)</span>
            <div className="w-7 h-7 rounded-lg bg-amber-200/70 text-amber-800 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-amber-900 tracking-tight">
              {formatBRL(metrics.pendingAmount)}
            </div>
            <p className="text-[11px] text-amber-800 mt-0.5">
              Vencimentos a liquidar
            </p>
          </div>
        </div>
      </div>

      {/* 3. BARRA DE FILTROS & BUSCA */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Campo de Busca */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Buscar por descrição, insumo, fornecedor ou forma de pagto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-slate-50/70 focus:bg-white transition-colors"
          />
        </div>

        {/* Filtros em Linha */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mês */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
          >
            <option value="all">Todos os Meses</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {formatMonthYearLabel(m, 'full')}
              </option>
            ))}
          </select>

          {/* Grupo */}
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
          >
            <option value="all">Todos os Tipos de Custo</option>
            <option value="Custos Variáveis">Custos Variáveis</option>
            <option value="Custos Fixos">Custos Fixos</option>
          </select>

          {/* Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
          >
            <option value="all">Todos os Status</option>
            <option value="pago">Apenas Pagos</option>
            <option value="pendente">Apenas Pendentes</option>
          </select>

          {/* Botão de Exportação Discreto */}
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold shadow-2xs transition-colors cursor-pointer shrink-0"
            title="Exportar despesas em CSV compatível com Excel"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* 4. TABELA LINEAR E LIMPA COM ROW HEADERS POR MÊS */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            {/* Cabeçalho das Colunas Principais */}
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4 w-32">Data</th>
                <th className="py-3 px-4">Descrição da Despesa</th>
                <th className="py-3 px-4">Categoria / Tipo</th>
                <th className="py-3 px-4">Forma Pagto</th>
                <th className="py-3 px-4 text-right">Valor</th>
                <th className="py-3 px-4 text-center w-28">Status</th>
                <th className="py-3 px-4 text-center w-28">Ações</th>
              </tr>
            </thead>

            {/* Corpo da Tabela com Row Headers por Mês */}
            <tbody className="divide-y divide-slate-100 text-xs">
              {groupedExpensesByMonth.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <Receipt className="w-8 h-8 mx-auto mb-2 text-gray-300 stroke-[1.5]" />
                    <p className="font-semibold text-gray-700">Nenhuma despesa cadastrada no momento</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {searchTerm || selectedGroup !== 'all' || selectedStatus !== 'all' || selectedMonth !== 'all'
                        ? 'Nenhuma despesa corresponde aos filtros aplicados.'
                        : 'Utilize o botão "+ Nova Despesa" acima para lançar custos fixos ou insumos operacionais.'}
                    </p>
                  </td>
                </tr>
              ) : (
                groupedExpensesByMonth.map((group) => (
                  <React.Fragment key={group.monthKey}>
                    {/* ROW HEADER INSTITUCIONAL DO MÊS (Design System Terçarium) */}
                    <tr className="bg-slate-900 text-white border-y border-slate-800">
                      <td colSpan={7} className="py-2.5 px-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
                              <Calendar className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-black uppercase tracking-wider text-xs text-white">
                              {group.monthLabel}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
                              {group.items.length} {group.items.length === 1 ? 'item' : 'itens'}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-slate-400 text-[11px]">
                              Pago: <strong className="font-mono text-emerald-400">{formatBRL(group.totalPaid)}</strong>
                            </span>
                            {group.totalPending > 0 && (
                              <span className="text-slate-400 text-[11px]">
                                Pendente: <strong className="font-mono text-amber-400">{formatBRL(group.totalPending)}</strong>
                              </span>
                            )}
                            <div className="pl-3 border-l border-slate-700 flex items-center gap-1.5">
                              <span className="text-slate-400 text-[11px]">Subtotal do Mês:</span>
                              <span className="font-mono font-bold text-amber-300 text-sm">
                                {formatBRL(group.totalAmount)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* ITENS DO MÊS */}
                    {group.items.map((expense) => {
                      const isPaid = expense.status === 'pago';
                      const statusConf = EXPENSE_STATUS_CONFIG[expense.status];

                      return (
                        <tr 
                          key={expense.id}
                          className="hover:bg-amber-50/20 transition-colors group"
                        >
                          {/* Coluna 1: Data */}
                          <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{formatDate(expense.date)}</span>
                            </div>
                          </td>

                          {/* Coluna 2: Descrição */}
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900 group-hover:text-amber-950 transition-colors">
                              {expense.description}
                            </div>
                            {expense.notes && (
                              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                                {expense.notes}
                              </p>
                            )}
                          </td>

                          {/* Coluna 3: Categoria / Tipo */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium text-slate-800">
                                {expense.category}
                              </span>
                              <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                                expense.categoryGroup === 'Custos Variáveis' 
                                  ? 'text-amber-700' 
                                  : 'text-indigo-600'
                              }`}>
                                {expense.categoryGroup}
                              </span>
                            </div>
                          </td>

                          {/* Coluna 4: Forma de Pagto */}
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-700">
                              {expense.paymentMethod || 'Pix'}
                            </span>
                          </td>

                          {/* Coluna 5: Valor */}
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            {formatBRL(expense.amount)}
                          </td>

                          {/* Coluna 6: Status */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <button
                              type="button"
                              disabled={isReadOnly}
                              onClick={() => onToggleStatus(expense.id)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                                statusConf.bg
                              } ${statusConf.color} ${statusConf.border} ${
                                !isReadOnly ? 'hover:brightness-95 cursor-pointer' : 'cursor-default'
                              }`}
                              title={!isReadOnly ? `Clique para alternar para ${isPaid ? 'Pendente' : 'Pago'}` : undefined}
                            >
                              {isPaid ? (
                                <CheckCircle2 className="w-3 h-3 shrink-0" />
                              ) : (
                                <Clock className="w-3 h-3 shrink-0" />
                              )}
                              <span>{statusConf.label}</span>
                            </button>
                          </td>

                          {/* Coluna 7: Ações */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {!isReadOnly && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => onOpenEditExpenseModal(expense)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-700 hover:bg-amber-100/60 transition-colors cursor-pointer"
                                    title="Editar Despesa"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setExpenseToDelete(expense)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                    title="Excluir Despesa"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}

                              {isReadOnly && (
                                <span className="text-[10px] text-slate-400 font-medium">
                                  Somente leitura
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200 p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">Excluir Despesa?</h4>
                <p className="text-xs text-slate-500">Esta ação não poderá ser desfeita.</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <p className="font-semibold text-slate-800">{expenseToDelete.description}</p>
              <p className="text-slate-500 font-mono">
                {formatBRL(expenseToDelete.amount)} · {formatDate(expenseToDelete.date)}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setExpenseToDelete(null)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition-colors cursor-pointer shadow-sm"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification de Exportação */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-200">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <Download className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">{toastMessage}</p>
            <p className="text-[11px] text-slate-400">Exportação de despesas processada com sucesso.</p>
          </div>
        </div>
      )}
    </div>
  );
};
