/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import { 
  Order, 
  OrderStatus, 
  Client, 
  Product, 
  Expense, 
  UserRole,
  PrefilledFreightData,
  SavedBudget,
  OrderItem,
  ShippingCarrier,
  ShippingPlatform,
  PaymentMethod
} from './types/erp';
import { supabase } from './supabase';
import { Sidebar, TabType } from './components/Sidebar';
import { Header } from './components/Header';
import { OverviewView } from './components/OverviewView';
import { OrdersView } from './components/OrdersView';
import { ClientsView } from './components/ClientsView';
import { ProductsView } from './components/ProductsView';
import { FinancialView } from './components/FinancialView';
import { ExpensesView } from './components/ExpensesView';
import { LogisticsView } from './components/LogisticsView';
import { BudgetView } from './components/BudgetView';
import { ShippingQuoteView } from './components/ShippingQuoteView';
import { LoginView } from './components/LoginView';
import { NewOrderModal } from './components/NewOrderModal';
import { NewExpenseModal } from './components/NewExpenseModal';
import { OrderDetailModal } from './components/OrderDetailModal';
import { TrackingModal } from './components/TrackingModal';
import { ImportacaoHistorico } from './components/ImportacaoHistorico';
import { UsuariosView } from './components/UsuariosView';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  const [currentTab, setCurrentTab] = useState<TabType>('visao-geral');
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  const [prefilledFreight, setPrefilledFreight] = useState<PrefilledFreightData | null>(null);
  const [newOrderInitialData, setNewOrderInitialData] = useState<{
    clientId?: string;
    items?: OrderItem[];
    shippingCharged?: number;
    shippingPaid?: number;
    carrier?: ShippingCarrier;
    customCarrier?: string;
    shippingPlatform?: ShippingPlatform;
    customShippingPlatform?: string;
    plataformaSelecionada?: string;
    transportadoraSelecionada?: string;
    paymentMethod?: PaymentMethod;
    notes?: string;
  } | null>(null);

  const getClientOrderCode = (o: any) => {
    if (!o) return '';
    return o.codigoCliente || o.clientOrderId || o.client_order_id || o.orderNumber || o.code || o.pedidoCliente || '';
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchDataFromSupabase();
    }
  }, [isAuthenticated]);

  const fetchDataFromSupabase = async () => {
    try {
      const { data: clientsData, error: clientsError } = await supabase.from('clientes').select('*');
      if (!clientsError && clientsData) {
        const mappedClients: Client[] = clientsData
          .filter((c: any) => c && (c.name || c.id))
          .map((c: any) => ({
            id: String(c.id || ''),
            name: String(c.name || 'Cliente Sem Nome'),
            email: String(c.email || ''),
            phone: String(c.phone || ''),
            cpf: String(c.document || c.cpf || ''),
            address: String(c.address || ''),
            city: String(c.city || 'Londrina'),
            state: String(c.state || 'PR'),
            cep: String(c.cep || ''),
          }));
        setClients(mappedClients);
      }

      const { data: ordersData, error: ordersError } = await supabase.from('pedidos').select('*');
      if (!ordersError && ordersData) {
        const mappedOrders: Order[] = ordersData.map((o: any) => {
          let dateStr = o.created_at;
          if (!dateStr || typeof dateStr !== 'string') {
            dateStr = new Date().toLocaleDateString('pt-BR');
          } else if (dateStr.includes('-')) {
            const parts = dateStr.split('T')[0].split('-');
            if (parts.length === 3) {
              dateStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
          }

          const clientOrderIdVal = getClientOrderCode(o);

          return {
            ...o,
            id: String(o.id || ''),
            clientId: String(o.client_id || ''),
            clientName: String(o.client_name || 'Cliente'),
            codigoCliente: String(clientOrderIdVal),
            clientOrderId: String(clientOrderIdVal),
            items: Array.isArray(o.items) ? o.items : [],
            saleValue: Number(o.total_value) || 0,
            shippingCharged: Number(o.shipping_value) || 0,
            status: o.status || 'em_producao',
            carrier: String(o.shipping_option || 'Correios PAC'),
            trackingCode: String(o.tracking_code || ''),
            estornado: Boolean(o.estornado),
            history: Array.isArray(o.history) ? o.history : [],
            createdAt: dateStr,
            paymentMethod: o.payment_method || 'pix',
          };
        });
        setOrders(mappedOrders);
      }

      const { data: productsData, error: productsError } = await supabase.from('produtos').select('*');
      if (!productsError && productsData) {
        const mappedProducts: Product[] = productsData.map((p: any) => ({
          id: p.id,
          code: p.code || '',
          model: p.name || '',
          category: p.category || 'Terços',
          subCategory: p.subcategory || '',
          costPrice: Number(p.cost_price) || 0,
          salePrice: Number(p.sale_price) || 0,
          stock: Number(p.stock) || 0,
        }));
        setProducts(mappedProducts);
      }

      const { data: expensesData, error: expensesError } = await supabase.from('despesas').select('*');
      if (!expensesError && expensesData) {
        const mappedExpenses: Expense[] = expensesData.map((e: any) => ({
          id: e.id,
          description: e.description || '',
          categoryGroup: e.category_group || e.categoryGroup || 'variavel',
          category: e.category || 'Outros',
          amount: Number(e.amount) || 0,
          date: e.date || new Date().toISOString().split('T')[0],
          status: (e.status === 'pago' ? 'pago' : 'pendente') as any,
          paymentMethod: e.payment_method || e.paymentMethod || 'pix',
        }));
        setExpenses(mappedExpenses);
      }
    } catch (err) {
      console.error('Erro ao buscar dados do Supabase:', err);
    }
  };

  // --- CADEADO DE SEGURANÇA CENTRAL ---
  const checkPermission = (actionName: string) => {
    if (userRole === 'leitura') {
      alert(`Acesso Negado: O seu perfil (Leitura) não permite ${actionName}.`);
      return false;
    }
    return true;
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    if (!checkPermission('alterar o status dos pedidos')) return;

    const now = new Date();
    const timestamp = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const isCancelledOrRefunded = newStatus === 'cancelado' || newStatus === 'cancelado_estornado';

    let targetOrderToUpdate: Order | null = null;

    setOrders((prev) =>
      prev.map((order) => {
        if (order.id === orderId) {
          const updatedHistory = [
            ...(order.history || []),
            {
              status: newStatus,
              timestamp,
              note: isCancelledOrRefunded
                ? `Status alterado manualmente para ${newStatus.replace('_', ' ')}`
                : `Status reativado para ${newStatus.replace('_', ' ')} (cancelamento e estorno revertidos)`,
            },
          ];

          const updated: Order = {
            ...order,
            status: newStatus,
            estornado: isCancelledOrRefunded ? (order.estornado ?? (newStatus === 'cancelado_estornado')) : false,
            dataEstorno: isCancelledOrRefunded ? order.dataEstorno : undefined,
            history: updatedHistory,
          };

          targetOrderToUpdate = updated;
          if (selectedOrder && selectedOrder.id === orderId) setSelectedOrder(updated);
          if (trackingOrder && trackingOrder.id === orderId) setTrackingOrder(updated);

          return updated;
        }
        return order;
      })
    );

    if (targetOrderToUpdate) {
      try {
        await supabase.from('pedidos').update({
          status: newStatus,
          estornado: (targetOrderToUpdate as Order).estornado,
          history: (targetOrderToUpdate as Order).history,
        }).eq('id', orderId);
      } catch (err) {
        console.error('Erro ao atualizar status do pedido no Supabase:', err);
      }
    }
  };

  const handleAddOrder = async (newOrder: Order) => {
    if (!checkPermission('criar novos pedidos')) return;

    const clientOrderCode = getClientOrderCode(newOrder);
    const orderWithCode = { ...newOrder, codigoCliente: clientOrderCode, clientOrderId: clientOrderCode };

    setOrders((prev) => [orderWithCode, ...prev]);

    try {
      await supabase.from('pedidos').insert([
        {
          id: orderWithCode.id,
          client_id: (orderWithCode as any).client_id || (orderWithCode as any).clientId || null,
          client_name: orderWithCode.clientName,
          client_order_id: clientOrderCode, 
          items: orderWithCode.items,
          total_value: orderWithCode.saleValue,
          shipping_value: orderWithCode.shippingCharged,
          status: orderWithCode.status,
          shipping_option: orderWithCode.carrier,
          tracking_code: orderWithCode.trackingCode || '',
        }
      ]);
    } catch (err) {
      console.error('Erro ao salvar pedido no Supabase:', err);
    }
  };

  const handleBatchInject = async (newOrders: Order[], newClients: Client[]) => {
    if (!checkPermission('importar dados em lote')) return;

    setOrders((prev) => [...newOrders, ...prev]);
    setClients((prev) => {
      const existingNames = new Set(prev.map((c) => (c.name || '').toLowerCase().trim()));
      const filteredNew = newClients.filter((nc) => nc && nc.name && !existingNames.has(nc.name.toLowerCase().trim()));
      return [...filteredNew, ...prev];
    });

    try {
      if (newClients && newClients.length > 0) {
        const clientsPayload = newClients.map((c, i) => ({
          id: c.id && c.id.trim() !== '' ? c.id : `cli-${Date.now()}-${i}`,
          name: c.name || 'Cliente Sem Nome',
          email: c.email || '',
          phone: c.phone || '',
          document: c.cpf || (c as any).document || '',
          address: c.address || '',
          city: c.city || 'Londrina',
          state: c.state || 'PR',
          cep: c.cep || '',
        }));

        const { error: cliErr } = await supabase.from('clientes').insert(clientsPayload);
        if (cliErr) console.warn('Aviso na inserção em lote de clientes:', cliErr.message);
      }

      if (newOrders && newOrders.length > 0) {
        const ordersPayload = newOrders.map((o: any) => {
          const clientOrderCode = getClientOrderCode(o);

          return {
            id: o.id,
            client_id: o.clientId || o.client_id || null,
            client_name: o.clientName,
            client_order_id: clientOrderCode,
            items: o.items || [],
            total_value: o.saleValue || 0,
            shipping_value: o.shippingCharged || 0,
            status: o.status || 'em_producao',
            shipping_option: o.carrier || 'Correios PAC',
            tracking_code: o.trackingCode || '',
          };
        });

        const { error: ordErr } = await supabase.from('pedidos').insert(ordersPayload);
        if (ordErr) console.warn('Aviso na inserção em lote de pedidos:', ordErr.message);
      }
    } catch (err) {
      console.error('Erro crítico ao salvar lote importado no Supabase:', err);
    }
  };

  const handleUpdateOrder = async (updatedOrder: Order) => {
    if (!checkPermission('editar pedidos')) return;

    const clientOrderCode = getClientOrderCode(updatedOrder);
    const orderWithCode = { ...updatedOrder, codigoCliente: clientOrderCode, clientOrderId: clientOrderCode };

    setOrders((prev) => prev.map((order) => (order.id === orderWithCode.id ? orderWithCode : order)));
    if (selectedOrder && selectedOrder.id === orderWithCode.id) setSelectedOrder(orderWithCode);
    if (trackingOrder && trackingOrder.id === orderWithCode.id) setTrackingOrder(orderWithCode);

    try {
      await supabase.from('pedidos').update({
        client_name: orderWithCode.clientName,
        client_order_id: clientOrderCode,
        items: orderWithCode.items,
        total_value: orderWithCode.saleValue,
        shipping_value: orderWithCode.shippingCharged,
        status: orderWithCode.status,
        shipping_option: orderWithCode.carrier,
        tracking_code: orderWithCode.trackingCode || '',
      }).eq('id', orderWithCode.id);
    } catch (err) {
      console.error('Erro ao atualizar pedido no Supabase:', err);
    }
  };

  const handleAddClient = async (newClient: Client) => {
    if (!checkPermission('adicionar clientes')) return;

    setClients((prev) => {
      if (prev.some((c) => (c.name || '').toLowerCase() === (newClient.name || '').toLowerCase())) return prev;
      return [newClient, ...prev];
    });

    try {
      const clientId = newClient.id || `client-${Date.now()}`;
      await supabase.from('clientes').insert([
        {
          id: clientId,
          name: newClient.name,
          email: newClient.email,
          phone: newClient.phone,
          document: newClient.cpf || (newClient as any).document || '',
          address: newClient.address,
          city: newClient.city,
          state: newClient.state,
          cep: newClient.cep,
        }
      ]);
    } catch (err) {
      console.error('Erro ao salvar cliente no Supabase:', err);
    }
  };

  const handleUpdateClient = async (updatedClient: Client) => {
    if (!checkPermission('editar clientes')) return;

    setClients((prev) => prev.map((c) => (c.id === updatedClient.id ? updatedClient : c)));

    try {
      await supabase.from('clientes').update({
        name: updatedClient.name,
        email: updatedClient.email,
        phone: updatedClient.phone,
        document: updatedClient.cpf || (updatedClient as any).document || '',
        address: updatedClient.address,
        city: updatedClient.city,
        state: updatedClient.state,
        cep: updatedClient.cep,
      }).eq('id', updatedClient.id);
    } catch (err) {
      console.error('Erro ao atualizar cliente no Supabase:', err);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!checkPermission('apagar clientes')) return;

    if (window.confirm('Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.')) {
      setClients((prev) => prev.filter((c) => c.id !== clientId));

      try {
        await supabase.from('clientes').delete().eq('id', clientId);
      } catch (err) {
        console.error('Erro ao apagar cliente no Supabase:', err);
      }
    }
  };

  const handleAddProduct = async (newProduct: Product) => {
    if (!checkPermission('adicionar produtos')) return;

    setProducts((prev) => [newProduct, ...prev]);

    try {
      const payload: any = {
        id: newProduct.id,
        code: newProduct.code || '',
        name: newProduct.model,
        category: newProduct.category || 'Terços',
        subcategory: newProduct.subCategory || '',
        cost_price: Number(newProduct.costPrice) || 0,
        sale_price: Number(newProduct.salePrice) || 0,
        stock: Number(newProduct.stock ?? newProduct.stockQuantity ?? newProduct.estoque) || 0,
      };

      await supabase.from('produtos').insert([payload]);
    } catch (err) {
      console.error('Erro ao salvar produto no Supabase:', err);
    }
  };

  const handleBatchAddProducts = async (incomingProducts: Product[]) => {
    if (!checkPermission('importar produtos em lote')) return;

    setProducts((prev) => {
      const codeMap = new Map<string, Product>();
      incomingProducts.forEach((p) => codeMap.set(p.code.toUpperCase().trim(), p));
      const updatedPrev = prev.map((p) => {
        const replacement = codeMap.get(p.code.toUpperCase().trim());
        if (replacement) {
          codeMap.delete(p.code.toUpperCase().trim());
          return { ...p, ...replacement };
        }
        return p;
      });
      return [...Array.from(codeMap.values()), ...updatedPrev];
    });

    try {
      const productsPayload = incomingProducts.map((p) => ({
        id: p.id,
        code: p.code || '',
        name: p.model,
        category: p.category || 'Terços',
        subcategory: p.subCategory || '',
        cost_price: Number(p.costPrice) || 0,
        sale_price: Number(p.salePrice) || 0,
        stock: Number(p.stock ?? p.stockQuantity ?? p.estoque) || 0,
      }));

      await supabase.from('produtos').insert(productsPayload);
    } catch (err) {
      console.error('Erro no lote de produtos do Supabase:', err);
    }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    if (!checkPermission('editar produtos')) return;

    setProducts((prev) => prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)));

    try {
      await supabase.from('produtos').update({
        code: updatedProduct.code,
        name: updatedProduct.model,
        category: updatedProduct.category,
        subcategory: updatedProduct.subCategory,
        cost_price: updatedProduct.costPrice,
        sale_price: updatedProduct.salePrice,
        stock: Number(updatedProduct.stock ?? updatedProduct.stockQuantity ?? updatedProduct.estoque) || 0,
      }).eq('id', updatedProduct.id);
    } catch (err) {
      console.error('Erro ao atualizar produto no Supabase:', err);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!checkPermission('apagar produtos')) return;

    setProducts((prev) => prev.filter((p) => p.id !== productId));

    try {
      await supabase.from('produtos').delete().eq('id', productId);
    } catch (err) {
      console.error('Erro ao apagar produto no Supabase:', err);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!checkPermission('apagar pedidos')) return;

    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    if (selectedOrder?.id === orderId) setSelectedOrder(null);

    try {
      await supabase.from('pedidos').delete().eq('id', orderId);
    } catch (err) {
      console.error('Erro ao apagar pedido no Supabase:', err);
    }
  };

  const handleAddExpense = async (newExpense: Expense) => {
    if (!checkPermission('adicionar despesas')) return;

    setExpenses((prev) => [newExpense, ...prev]);

    try {
      await supabase.from('despesas').insert([
        {
          id: newExpense.id,
          description: newExpense.description,
          category_group: newExpense.categoryGroup,
          category: newExpense.category,
          amount: newExpense.amount,
          date: newExpense.date,
          status: newExpense.status,
          payment_method: newExpense.paymentMethod,
        }
      ]);
    } catch (err) {
      console.error('Erro ao salvar despesa no Supabase:', err);
    }
  };

  const handleUpdateExpense = async (updatedExpense: Expense) => {
    if (!checkPermission('editar despesas')) return;

    setExpenses((prev) => prev.map((e) => (e.id === updatedExpense.id ? updatedExpense : e)));

    try {
      await supabase.from('despesas').update({
        description: updatedExpense.description,
        category_group: updatedExpense.categoryGroup,
        category: updatedExpense.category,
        amount: updatedExpense.amount,
        date: updatedExpense.date,
        status: updatedExpense.status,
        payment_method: updatedExpense.paymentMethod,
      }).eq('id', updatedExpense.id);
    } catch (err) {
      console.error('Erro ao atualizar despesa no Supabase:', err);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!checkPermission('apagar despesas')) return;

    setExpenses((prev) => prev.filter((e) => e.id !== expenseId));

    try {
      await supabase.from('despesas').delete().eq('id', expenseId);
    } catch (err) {
      console.error('Erro ao apagar despesa no Supabase:', err);
    }
  };

  const handleToggleExpenseStatus = async (expenseId: string) => {
    if (!checkPermission('alterar status de despesas')) return;

    let targetStatus: any = 'pendente';
    setExpenses((prev) => prev.map((e) => {
      if (e.id === expenseId) {
        targetStatus = e.status === 'pago' ? 'pendente' : 'pago';
        return { ...e, status: targetStatus };
      }
      return e;
    }));

    try {
      await supabase.from('despesas').update({ status: targetStatus }).eq('id', expenseId);
    } catch (err) {
      console.error('Erro ao alternar status da despesa no Supabase:', err);
    }
  };

  const handleResetData = () => {
    if (!checkPermission('zerar dados do sistema')) return;

    if (window.confirm('Deseja zerar todos os dados locais?')) {
      setOrders([]);
      setClients([]);
      setProducts([]);
      setExpenses([]);
    }
  };

  if (!isAuthenticated) {
    return (
      <LoginView
        onLogin={(role) => {
          setIsAuthenticated(true);
          setUserRole(role);
        }}
      />
    );
  }

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
  };

  const handleUseFreightForBudget = (freightData: PrefilledFreightData) => {
    setPrefilledFreight(freightData);
    setCurrentTab('orcamento');
  };

  const handleUseFreightForOrder = (freightData: PrefilledFreightData) => {
    if (!checkPermission('criar novos pedidos')) return;

    let carrier: ShippingCarrier = 'Correios PAC';
    const transp = freightData.transportadoraSelecionada || freightData.transportadora || '';
    if (transp.toLowerCase().includes('sedex')) carrier = 'Correios SEDEX';
    else if (transp.toLowerCase().includes('jadlog')) carrier = 'Jadlog';
    else if (transp) carrier = transp as ShippingCarrier;

    let shippingPlatform: ShippingPlatform = 'Melhor Envio';
    const plat = freightData.plataformaSelecionada || freightData.plataforma || '';
    if (plat.toLowerCase().includes('frenet')) shippingPlatform = 'Frenet';

    const cobrado = typeof freightData.freteCobrado === 'number' ? freightData.freteCobrado : (freightData.precoFinalCliente ?? 28);
    const cotado = typeof freightData.freteCotado === 'number' ? freightData.freteCotado : cobrado;

    setNewOrderInitialData({
      shippingCharged: cobrado,
      shippingPaid: cotado,
      carrier,
      shippingPlatform,
      paymentMethod: 'pix',
      notes: `Frete importado da Cotação`,
    });
    setIsNewOrderOpen(true);
  };

  const handleConvertToOrder = (client: Client, budget: SavedBudget) => {
    if (!checkPermission('criar novos pedidos')) return;

    const orderItems: OrderItem[] = budget.items.map((it, idx) => ({
      id: `item-${Date.now()}-${idx}`,
      productId: it.productId,
      code: it.code || `SKU-${idx + 1}`,
      category: 'Terços',
      model: it.name,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      costPrice: Math.round(it.unitPrice * 0.35),
      totalPrice: it.totalPrice,
      totalCost: it.quantity * Math.round(it.unitPrice * 0.35),
    }));

    setNewOrderInitialData({
      clientId: client.id,
      items: orderItems,
      shippingCharged: budget.shippingValue,
      shippingPaid: budget.shippingValue,
      carrier: 'Correios PAC',
      shippingPlatform: 'Melhor Envio',
      paymentMethod: 'pix',
      notes: `Convertido do Orçamento ${budget.id}`,
    });

    setIsNewOrderOpen(true);
  };

  const canEdit = userRole === 'admin' || userRole === 'operacao';
  const isAdmin = userRole === 'admin';

  const handleOpenNewOrderWrapper = () => {
    if (canEdit) {
      setIsNewOrderOpen(true);
    } else {
      alert('O seu perfil de acesso (Leitura) não permite a criação de novos pedidos.');
    }
  };

  const RestrictedView = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
      <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-6">
        <ShieldAlert className="w-10 h-10 text-rose-500" />
      </div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Acesso Restrito</h2>
      <p className="text-slate-500 max-w-md">
        O seu perfil de acesso atual <strong>({userRole})</strong> não lhe concede permissões para visualizar ou alterar os dados deste módulo.
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        orders={orders}
        clients={clients}
        products={products}
        onOpenNewOrder={handleOpenNewOrderWrapper}
        isOpenMobile={isOpenMobile}
        onCloseMobile={() => setIsOpenMobile(false)}
        userRole={userRole || undefined}
        onLogout={handleLogout}
      />

      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        <Header
          currentTab={currentTab}
          onOpenMobileSidebar={() => setIsOpenMobile(true)}
          onResetData={handleResetData}
          userRole={userRole || undefined}
          onLogout={handleLogout}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'visao-geral' && (
            <OverviewView
              orders={orders}
              products={products}
              expenses={expenses}
              onNavigateTab={setCurrentTab}
              onSelectOrder={setSelectedOrder}
              onOpenNewOrder={handleOpenNewOrderWrapper}
            />
          )}

          {currentTab === 'pedidos' && (
            <OrdersView
              orders={orders}
              clients={clients}
              products={products}
              onAddClient={handleAddClient}
              onAddProduct={handleAddProduct}
              onAddOrder={handleAddOrder}
              onUpdateOrder={handleUpdateOrder}
              onSelectOrder={setSelectedOrder}
              onDeleteOrder={handleDeleteOrder}
              onStatusChange={handleStatusChange}
              userRole={userRole || undefined}
            />
          )}

          {currentTab === 'orcamento' && (
            <BudgetView
              products={products}
              clients={clients}
              onAddClient={handleAddClient}
              onConvertToOrder={handleConvertToOrder}
              prefilledFreight={prefilledFreight}
              onClearPrefilledFreight={() => setPrefilledFreight(null)}
            />
          )}

          {currentTab === 'cotacao-frete' && (
            <ShippingQuoteView 
              onUseFreightForBudget={handleUseFreightForBudget} 
              onUseFreightForOrder={handleUseFreightForOrder}
            />
          )}

          {currentTab === 'clientes' && (
            <ClientsView
              clients={clients}
              orders={orders}
              onUpdateClient={handleUpdateClient}
              onAddClient={handleAddClient}
              onDeleteClient={handleDeleteClient}
              onSelectOrder={setSelectedOrder}
              userRole={userRole || undefined}
            />
          )}

          {currentTab === 'produtos' && (
            <ProductsView
              products={products}
              onAddProduct={handleAddProduct}
              onBatchAddProducts={handleBatchAddProducts}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              userRole={userRole || undefined}
            />
          )}

          {currentTab === 'logistica' && (
            <LogisticsView
              orders={orders}
              onStatusChange={handleStatusChange}
              onOpenTracking={setTrackingOrder}
              onSelectOrder={setSelectedOrder}
            />
          )}

          {currentTab === 'financeiro' && (
            isAdmin ? (
              <FinancialView
                orders={orders}
                onSelectOrder={setSelectedOrder}
                expenses={expenses}
              />
            ) : <RestrictedView />
          )}

          {currentTab === 'despesas' && (
            isAdmin ? (
              <ExpensesView
                expenses={expenses}
                onAddExpense={handleAddExpense}
                onUpdateExpense={handleUpdateExpense}
                onDeleteExpense={handleDeleteExpense}
                onToggleStatus={handleToggleExpenseStatus}
                onOpenNewExpenseModal={() => {
                  setExpenseToEdit(null);
                  setIsNewExpenseOpen(true);
                }}
                onOpenEditExpenseModal={(exp) => {
                  setExpenseToEdit(exp);
                  setIsNewExpenseOpen(true);
                }}
                userRole={userRole || undefined}
              />
            ) : <RestrictedView />
          )}

          {currentTab === 'importacao-historico' && (
            isAdmin ? (
              <ImportacaoHistorico
                products={products}
                orders={orders}
                clients={clients}
                onBatchInject={handleBatchInject}
                onNavigateToOrders={() => setCurrentTab('pedidos')}
              />
            ) : <RestrictedView />
          )}

          {currentTab === 'usuarios' && (
            isAdmin ? (
              <UsuariosView userRole={userRole || undefined} />
            ) : <RestrictedView />
          )}
        </main>
      </div>

      <NewOrderModal
        isOpen={isNewOrderOpen}
        onClose={() => {
          setIsNewOrderOpen(false);
          setNewOrderInitialData(null);
        }}
        onAddOrder={handleAddOrder}
        clients={clients}
        onAddClient={handleAddClient}
        products={products}
        onAddProduct={handleAddProduct}
        orders={orders}
        userRole={userRole || undefined}
        initialData={newOrderInitialData}
      />

      <NewExpenseModal
        isOpen={isNewExpenseOpen}
        onClose={() => {
          setIsNewExpenseOpen(false);
          setExpenseToEdit(null);
        }}
        onSaveExpense={(exp) => {
          if (expenseToEdit) handleUpdateExpense(exp);
          else handleAddExpense(exp);
        }}
        expenseToEdit={expenseToEdit}
      />

      <OrderDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onStatusChange={handleStatusChange}
        onOpenTracking={(order) => {
          setSelectedOrder(null);
          setTrackingOrder(order);
        }}
      />

      <TrackingModal
        order={trackingOrder}
        onClose={() => setTrackingOrder(null)}
      />
    </div>
  );
}