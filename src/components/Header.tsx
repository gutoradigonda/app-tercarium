import React from 'react';
import { Menu, Plus, Shield, Eye, LogOut } from 'lucide-react';
import { TabType } from './Sidebar';
import { UserRole } from '../types/erp';

interface HeaderProps {
  currentTab: TabType;
  onOpenMobileSidebar: () => void;
  onOpenNewOrder?: () => void;
  onResetData?: () => void;
  userRole?: UserRole;
  onLogout?: () => void;
}

const TAB_TITLES: Record<TabType, { title: string; subtitle: string }> = {
  'visao-geral': {
    title: 'Visão Geral Executiva',
    subtitle: 'Faturamento, rentabilidade real, produção, finanças e Business Intelligence consolidados.',
  },
  'pedidos': {
    title: 'Gestão de Pedidos',
    subtitle: 'Listagem completa, canais de pagamento e status operacional das vendas.',
  },
  'orcamento': {
    title: '💬 Orçamento de Vendas',
    subtitle: 'Monte cotações rápidas com catálogo e copie a mensagem formatada para WhatsApp.',
  },
  'cotacao-frete': {
    title: '🚚 Cotação de Frete Multicanal',
    subtitle: 'Simulador integrado Melhor Envio & Frenet com cálculo de margem e envio via WhatsApp.',
  },
  'clientes': {
    title: 'Carteira de Clientes',
    subtitle: 'Base cadastral, histórico completo de compras e gestão de relacionamentos.',
  },
  'produtos': {
    title: 'Catálogo de Produtos',
    subtitle: 'Gestão de modelos, categorias, preços de custo e venda para os pedidos.',
  },
  'financeiro': {
    title: 'DRE & Rentabilidade Financeira',
    subtitle: 'Demonstrativo por pedido com fatores de cartão, custo de frete e margem líquida.',
  },
  'despesas': {
    title: 'Gestão de Despesas & Saídas',
    subtitle: 'Registro de custos fixos, variáveis, matéria-prima e insumos para composição do DRE.',
  },
  'logistica': {
    title: 'Logística & Linha de Produção',
    subtitle: 'Rastreamento por transportadora e controle de etapas artesanais do ateliê.',
  },
  'importacao-historico': {
    title: 'Importação de Histórico de Vendas',
    subtitle: 'Upload e parse ETL de planilhas Excel (.xlsx/.csv) com agrupamento inteligente por CPF + DATA.',
  },
  'usuarios': {
    title: 'Gestão de Acessos & Utilizadores',
    subtitle: 'Controle de utilizadores, perfis de privilégio, políticas de segurança e permissões.',
  },
};

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onOpenMobileSidebar,
  onOpenNewOrder,
  onResetData,
  userRole,
  onLogout,
}) => {
  const current = TAB_TITLES[currentTab];

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3.5 transition-colors">
      <div className="flex items-center justify-between gap-4">
        {/* Left zone: Mobile toggle & Breadcrumb / Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenMobileSidebar}
            className="p-2 -ml-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden focus:outline-none"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>Terçarium ERP</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-800 font-semibold">{current.title.split(' ')[0]}</span>
            </div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 truncate">
              {current.title}
            </h1>
          </div>
        </div>

        {/* Right zone: Actions & RBAC Badge */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Badge de Perfil RBAC */}
          {userRole && (
            <div
              className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${
                userRole === 'admin'
                  ? 'bg-amber-50 text-amber-900 border-amber-200'
                  : 'bg-sky-50 text-sky-900 border-sky-200'
              }`}
              title={userRole === 'admin' ? 'Acesso Total de Administrador' : 'Acesso de Leitura (Visualizador)'}
            >
              {userRole === 'admin' ? (
                <>
                  <Shield className="w-3.5 h-3.5 text-amber-600" />
                  <span>Admin</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-sky-600" />
                  <span>Visualizador</span>
                </>
              )}
            </div>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              title="Sair do sistema (Logout)"
              className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
