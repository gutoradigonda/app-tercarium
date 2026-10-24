import React from 'react';
import { X, ShoppingBag, Calendar, Hash, DollarSign, PackageCheck, User, MapPin, Phone, Mail } from 'lucide-react';
import { Client, Order, STATUS_CONFIG } from '../types/erp';
import { formatBRL, formatDate } from '../utils/formatters';

interface ClientHistoryModalProps {
  client: Client | null;
  orders: Order[];
  isOpen: boolean;
  onClose: () => void;
  onSelectOrder?: (order: Order) => void;
}

export const ClientHistoryModal: React.FC<ClientHistoryModalProps> = ({
  client,
  orders,
  isOpen,
  onClose,
  onSelectOrder,
}) => {
  if (!isOpen || !client) return null;

  // Filter orders for this client (by matching name or email or CPF)
  const clientOrders = orders.filter((o) => {
    const matchName = o.clientName.trim().toLowerCase() === client.name.trim().toLowerCase();
    const matchEmail = client.email && o.clientEmail.trim().toLowerCase() === client.email.trim().toLowerCase();
    const matchCpf = client.cpf && o.clientCpf && o.clientCpf.trim() === client.cpf.trim();
    return matchName || matchEmail || matchCpf;
  });

  // Sort orders chronologically (from latest date to oldest, or order id)
  const sortedOrders = [...clientOrders].sort((a, b) => {
    // try comparing DD/MM/AAAA or ID
    const parseD = (dStr: string) => {
      if (dStr.includes('/')) {
        const [d, m, y] = dStr.split('/');
        return new Date(Number(y), Number(m) - 1, Number(d)).getTime();
      }
      return new Date(dStr).getTime();
    };
    return parseD(b.createdAt) - parseD(a.createdAt);
  });

  const totalGasto = clientOrders.reduce((acc, o) => acc + o.saleValue, 0);
  const ticketMedio = clientOrders.length > 0 ? totalGasto / clientOrders.length : 0;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 transition-all"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 font-bold text-sm font-mono">
              {client.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  {client.name}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                  {clientOrders.length} {clientOrders.length === 1 ? 'pedido' : 'pedidos'}
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span>{client.city}/{client.state}</span>
                {client.cpf && (
                  <>
                    <span>·</span>
                    <span className="font-mono">CPF: {client.cpf}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Client KPI Summary Strip */}
        <div className="p-4 bg-slate-50/60 border-b border-slate-100 grid grid-cols-3 gap-3 text-center">
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
              Total de Pedidos
            </span>
            <span className="text-lg font-bold font-mono text-slate-900 tabular-nums">
              {clientOrders.length}
            </span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
              Total Faturado (LTV)
            </span>
            <span className="text-lg font-bold font-mono text-emerald-800 tabular-nums">
              {formatBRL(totalGasto)}
            </span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
              Ticket Médio
            </span>
            <span className="text-lg font-bold font-mono text-slate-800 tabular-nums">
              {formatBRL(ticketMedio)}
            </span>
          </div>
        </div>

        {/* Orders List / Table */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
              Histórico Cronológico de Compras
            </span>
            <span className="text-[11px] text-slate-500">
              Ordenado por data mais recente
            </span>
          </div>

          {sortedOrders.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
              <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-700">Nenhum pedido registrado para este cliente</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Os novos pedidos associados ao nome ou CPF aparecerão automaticamente aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedOrders.map((order, idx) => {
                const statusConfig = STATUS_CONFIG[order.status];
                return (
                  <div
                    key={order.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-amber-400 hover:shadow-xs transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5 mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                          {order.id}
                        </span>
                        <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {formatDate(order.createdAt)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>
                          {statusConfig.label}
                        </span>
                        <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                          {formatBRL(order.saleValue)}
                        </span>
                      </div>
                    </div>

                    {/* Detalhamento dos Itens do Pedido */}
                    <div className="space-y-2 text-xs">
                      {order.items && order.items.length > 0 ? (
                        <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          {order.items.map((it, iIdx) => (
                            <div key={iIdx} className="flex items-center justify-between text-xs py-0.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded border border-amber-200">
                                  {it.quantity}x
                                </span>
                                <span className="font-semibold text-slate-800 truncate">
                                  {it.model}
                                </span>
                                <span className="font-mono text-[10px] text-slate-400">({it.code})</span>
                              </div>
                              <span className="font-mono text-slate-800 text-xs shrink-0 font-medium ml-2">
                                {formatBRL(it.totalPrice)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div>
                          <div className="font-semibold text-slate-800">{order.item}</div>
                          <div className="text-[11px] text-slate-500">{order.itemModel}</div>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1 font-mono">
                        <div>
                          {order.subtotal && order.subtotal !== order.saleValue ? (
                            <span>Subtotal: {formatBRL(order.subtotal)} · </span>
                          ) : null}
                          {order.discount ? (
                            <span className="text-rose-600 font-semibold">Desconto: -{formatBRL(order.discount)} · </span>
                          ) : null}
                          <span>Frete: {order.shippingCharged === 0 ? 'Grátis' : formatBRL(order.shippingCharged)}</span>
                        </div>
                        <div className="text-slate-700 font-sans font-medium">
                          Pagto: {order.paymentMethod.replace('_', ' ').toUpperCase()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            {client.address && `Endereço: ${client.address} - ${client.city}/${client.state}`}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
