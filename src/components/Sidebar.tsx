import React from 'react';
import { 
  LayoutDashboard, 
  BarChart3,
  ShoppingBag, 
  Users,
  Package,
  DollarSign, 
  Truck, 
  Sparkles,
  ChevronRight,
  Plus,
  MessageSquare,
  LogOut,
  Shield,
  Eye,
  Receipt,
  FileSpreadsheet,
  UserCheck
} from 'lucide-react';
import { Order, Client, Product, UserRole } from '../types/erp';

export type TabType = 
  | 'visao-geral' 
  | 'pedidos' 
  | 'orcamento' 
  | 'cotacao-frete' 
  | 'clientes' 
  | 'produtos' 
  | 'financeiro' 
  | 'despesas' 
  | 'logistica'
  | 'importacao-historico'
  | 'usuarios';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  orders: Order[];
  clients: Client[];
  products: Product[];
  onOpenNewOrder: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  userRole?: UserRole;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  orders,
  clients,
  products,
  onOpenNewOrder,
  isOpenMobile,
  onCloseMobile,
  userRole,
  onLogout,
}) => {
  const inProductionCount = orders.filter((o) => o.status === 'em_producao').length;

  const navItems = [
    {
      id: 'visao-geral' as TabType,
      label: 'Visão Geral',
      icon: LayoutDashboard,
      badge: null,
      description: 'Painel executivo, DRE & BI',
    },
    {
      id: 'pedidos' as TabType,
      label: 'Pedidos',
      icon: ShoppingBag,
      badge: orders.length.toString(),
      description: 'Fluxo comercial de vendas',
    },
    {
      id: 'orcamento' as TabType,
      label: '💬 Orçamento',
      icon: MessageSquare,
      badge: 'Whats',
      description: 'Gerador para WhatsApp e conversão',
    },
    {
      id: 'cotacao-frete' as TabType,
      label: 'Cotação de Frete',
      icon: Truck,
      badge: 'Frete',
      description: 'Simulador multicanal Melhor Envio & Frenet',
    },
    {
      id: 'clientes' as TabType,
      label: 'Clientes',
      icon: Users,
      badge: clients.length.toString(),
      description: 'Carteira e histórico de compras',
    },
    {
      id: 'produtos' as TabType,
      label: 'Produtos',
      icon: Package,
      badge: products.length.toString(),
      description: 'Catálogo de itens e custos',
    },
    {
      id: 'financeiro' as TabType,
      label: 'Financeiro',
      icon: DollarSign,
      badge: 'Margem',
      description: 'Rentabilidade e custos reais',
    },
    {
      id: 'despesas' as TabType,
      label: 'Despesas',
      icon: Receipt,
      badge: 'Saídas',
      description: 'Custos fixos, variáveis e saídas',
    },
    {
      id: 'logistica' as TabType,
      label: 'Logística & Produção',
      icon: Truck,
      badge: inProductionCount > 0 ? `${inProductionCount} prod` : null,
      description: 'Rastreio e etapas do ateliê',
    },
    {
      id: 'importacao-historico' as TabType,
      label: 'Importar Excel',
      icon: FileSpreadsheet,
      badge: 'ETL',
      description: 'Upload e parse de histórico .xlsx',
    },
    {
      id: 'usuarios' as TabType,
      label: 'Gestão de Acessos',
      icon: UserCheck,
      badge: 'RBAC',
      description: 'Utilizadores, perfis e permissões',
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-base tracking-tight text-white">
                  Terçarium
                </span>
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                  ERP
                </span>
              </div>
              <p className="text-xs text-slate-400">Ateliê & E-commerce</p>
            </div>
          </div>
        </div>

        {/* Quick action button */}
        <div className="p-4 border-b border-slate-800/80">
          <button
            onClick={() => {
              onOpenNewOrder();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-semibold text-xs tracking-wide transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Novo Pedido</span>
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Módulos do Sistema
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-lg text-xs font-medium transition-all group text-left ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <div>
                    <span className="block">{item.label}</span>
                    <span className="text-[10px] text-slate-400 font-normal hidden sm:block">
                      {item.description}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.badge && (
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                        isActive
                          ? 'bg-amber-400 text-slate-950 font-semibold'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight
                    className={`w-3.5 h-3.5 transition-transform ${
                      isActive ? 'text-amber-400 translate-x-0.5' : 'text-slate-600 opacity-0 group-hover:opacity-100'
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* User footer / RBAC Profile */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 ${
              userRole === 'admin' 
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-400' 
                : 'bg-sky-500/15 border-sky-500/40 text-sky-400'
            }`}>
              {userRole === 'admin' ? <Shield className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </div>
            <div className="text-left truncate">
              <p className="text-xs font-semibold text-slate-200 truncate">
                {userRole === 'admin' ? 'Terçarium (Admin)' : 'Visualizador (Viewer)'}
              </p>
              <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.2 rounded ${
                userRole === 'admin'
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-sky-500/20 text-sky-300'
              }`}>
                {userRole === 'admin' ? 'Acesso Total' : 'Modo Leitura'}
              </span>
            </div>
          </div>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              title="Sair do sistema (Logout)"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
