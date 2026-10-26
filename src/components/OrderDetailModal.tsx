import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  DollarSign, 
  Truck, 
  User, 
  MapPin, 
  CheckCircle2, 
  Copy,
  Check,
  MessageCircle,
  Save
} from 'lucide-react';
import { Order, OrderStatus, PAYMENT_LABELS, STATUS_CONFIG, ShippingPlatform, ShippingCarrier, UserRole } from '../types/erp';
import { calculateFinancialMetrics, formatBRL, formatFactor, formatPercent, buildWhatsAppCustomerNoticeUrl } from '../utils/formatters';
import { NotifyCustomerModal } from './NotifyCustomerModal';

interface OrderDetailModalProps {
  order: Order | null;
  onClose: () => void;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
  onOpenTracking: (order: Order) => void;
  onUpdateOrder: (updatedOrder: Order) => void;
  userRole?: UserRole;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  onClose,
  onStatusChange,
  onOpenTracking,
  onUpdateOrder,
  userRole
}) => {
  const [copied, setCopied] = useState(false);
  const [isNotifyOpen, setIsNotifyOpen] = useState(false);
  const isViewer = userRole === 'leitura';

  // Estados locais para edição de logística
  const [shippingPlatform, setShippingPlatform] = useState<string>('');
  const [customShippingPlatform, setCustomShippingPlatform] = useState('');
  const [carrier, setCarrier] = useState<string>('');
  const [customCarrier, setCustomCarrier] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (order) {
      const plat = order.shippingPlatform || 'Melhor Envio';
      if (['Melhor Envio', 'Frenet', 'SuperFrete', 'Contrato Correios'].includes(plat)) {
        setShippingPlatform(plat);
        setCustomShippingPlatform('');
      } else {
        setShippingPlatform('Outra');
        setCustomShippingPlatform(plat);
      }

      const carr = order.carrier || 'Correios PAC';
      if (['Correios PAC', 'Correios SEDEX', 'Loggi', 'Transportadora Loggi', 'Jadlog', 'Transportadora J&T Express'].includes(carr)) {
        setCarrier(carr);
        setCustomCarrier('');
      } else {
        setCarrier('Outra');
        setCustomCarrier(carr);
      }

      setTrackingCode(order.trackingCode || '');
      setHasChanges(false);
    }
  }, [order]);

  if (!order) return null;

  const metrics = calculateFinancialMetrics(order);
  const statusConfig = STATUS_CONFIG[order.status];
  
  // A Sobra do Frete é a diferença entre o que o cliente pagou de frete e o custo real
  const shippingSurplus = (order.shippingCharged || 0) - (order.shippingPaid || 0);

  // O Lucro Real já considera a Sobra de Frete adicionada ou subtraída
  const trueNetProfit = metrics.netPrice - metrics.productionCost + shippingSurplus;
  
  // A margem real é o (lucro verdadeiro / preço pago pelo cliente que gerou caixa)
  const trueMarginPercent = order.saleValue > 0 ? (trueNetProfit / order.saleValue) * 100 : 0;

  const handleCopy = (text?: string) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveLogistics = () => {
    if (!order || isViewer) return;
    const finalPlatform = shippingPlatform === 'Outra' ? customShippingPlatform : shippingPlatform;
    const finalCarrier = carrier === 'Outra' ? customCarrier : carrier;

    const updated: Order = {
      ...order,
      shippingPlatform: finalPlatform as ShippingPlatform,
      carrier: finalCarrier as ShippingCarrier,
      trackingCode: trackingCode.trim()
    };
    
    onUpdateOrder(updated);
    setHasChanges(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono text-base font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs" title="Pedido Interno">
                #{order.id}
              </span>
              {order.codigoCliente && (
                <span className="inline-flex items-center gap-1 font-mono text-xs font-bold px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  {order.codigoCliente}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900">{order.clientName}</h3>
                <span className={`text-xs px-2 py-0.5 rounded font-medium border ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>
                  {statusConfig.label}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {order.clientCity}/{order.clientState}
                {order.clientCep ? ` · CEP ${order.clientCep}` : ''} · Cadastrado em {order.createdAt}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          
          {/* Status Changer Bar */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="font-semibold text-slate-800 block text-xs">Atualizar Etapa do Pedido</span>
              <span className="text-[11px] text-slate-500">Altera simultaneamente o status em Vendas, Finanças e Logística</span>
            </div>
            <select
              value={order.status}
              disabled={isViewer}
              onChange={(e) => onStatusChange(order.id, e.target.value as OrderStatus)}
              className="text-xs font-semibold py-1.5 px-3 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
            >
              <option value="em_producao">Em Produção (Bancada)</option>
              <option value="pronto_expedicao">Pronto para Expedição</option>
              <option value="embalado">Embalado (Estojo Terçarium)</option>
              <option value="despachado">Despachado</option>
              <option value="entregue">Entregue ao Cliente</option>
              <option value="cancelado">Cancelado</option>
              <option value="cancelado_estornado">Cancelado e Estornado</option>
            </select>
          </div>

          {/* Itens do Pedido */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                Itens do Pedido ({order.items?.reduce((acc, it) => acc + it.quantity, 0) || 1} peças)
              </span>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Snapshot de Preços Congelados
              </span>
            </div>
            
            {order.items && order.items.length > 0 ? (
              <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                {order.items.map((it, idx) => (
                  <div key={idx} className="p-3 bg-slate-50/50 flex items-center justify-between gap-3 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-800">{it.code}</span>
                        <span className="font-bold text-slate-900">{it.model}</span>
                        {it.subCategory && <span className="text-[10px] text-amber-800 bg-amber-100/70 px-1 rounded font-medium">{it.subCategory}</span>}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>Preço Unitário: <strong className="font-mono text-slate-800">{formatBRL(it.unitPrice)}</strong></span>
                        <span>·</span>
                        <span>Custo Unitário: <span className="font-mono text-rose-700">{formatBRL(it.costPrice)}</span></span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-xs text-slate-600">{it.quantity}x {formatBRL(it.unitPrice)}</div>
                      <div className="font-mono font-bold text-slate-900 text-xs mt-0.5">{formatBRL(it.totalPrice)}</div>
                    </div>
                  </div>
                ))}
                <div className="p-2.5 bg-white flex items-center justify-between text-xs font-medium text-slate-600">
                  <span>Subtotal dos Itens:</span>
                  <span className="font-mono font-bold text-slate-900">{formatBRL(order.subtotal || order.saleValue)}</span>
                </div>
                {order.discount ? (
                  <div className="p-2.5 bg-rose-50/50 flex items-center justify-between text-xs font-medium text-rose-700">
                    <span>Desconto Concedido:</span>
                    <span className="font-mono font-bold">-{formatBRL(order.discount)}</span>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="p-3 bg-amber-50/40 rounded-lg border border-amber-200/80">
                <div className="text-sm font-bold text-slate-900">{order.item}</div>
              </div>
            )}
          </div>

          {/* DRE Financeiro */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Demonstrativo de Resultado do Pedido (DRE)
              </span>
              <span className="font-mono text-[11px] text-slate-500">
                {PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div className="text-slate-600">Valor Total Pago pelo Cliente:</div>
              <div className="text-right font-mono font-bold text-slate-950">{formatBRL(metrics.saleValue)}</div>

              {order.discount ? (
                <>
                  <div className="text-slate-600">Desconto Concedido:</div>
                  <div className="text-right font-mono text-rose-600">-{formatBRL(order.discount)}</div>
                </>
              ) : null}

              <div className="text-slate-600">Fator de Gateway ({PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}):</div>
              <div className="text-right font-mono text-slate-700">{formatFactor(metrics.discountFactor)} ({((1 - metrics.discountFactor) * 100).toFixed(1)}% taxa)</div>

              <div className="text-slate-600 font-medium">Preço Líquido Recebido:</div>
              <div className="text-right font-mono font-semibold text-slate-800">{formatBRL(metrics.netPrice)}</div>

              <div className="text-slate-600">Custo Total dos Itens (Produção):</div>
              <div className="text-right font-mono text-rose-600">-{formatBRL(metrics.productionCost)}</div>

              <div className="text-slate-600 flex flex-col sm:flex-row sm:items-center sm:gap-1">
                <span>Frete (Cotado {formatBRL(order.shippingPaid || 0)}</span>
                <span>- Cobrado {formatBRL(order.shippingCharged || 0)}):</span>
              </div>
              <div className={`text-right font-mono ${shippingSurplus > 0 ? 'text-emerald-700' : shippingSurplus < 0 ? 'text-rose-600' : 'text-amber-700'}`}>
                {shippingSurplus > 0 ? `+${formatBRL(shippingSurplus)}` : shippingSurplus < 0 ? `-${formatBRL(Math.abs(shippingSurplus))}` : 'R$ 0,00'}
              </div>

              <div className="col-span-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">Lucro Líquido Real:</span>
                  <span className="text-[11px] text-emerald-700 font-medium font-mono">Margem líquida: {formatPercent(trueMarginPercent)}</span>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold font-mono text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                    {formatBRL(trueNetProfit)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Dados de Entrega */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-amber-600" />
                Destinatário & Endereço de Entrega
              </span>
              {order.useCustomDeliveryAddress ? (
                <span className="text-[10px] font-semibold bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                  Endereço Alternativo
                </span>
              ) : (
                <span className="text-[10px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  Mesmo endereço do cadastro
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-3 rounded-lg border border-slate-200/80">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Nome do Recebedor</span>
                <span className="font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  {order.recipientName || order.clientName}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Localidade & CEP</span>
                <span className="font-medium text-slate-800 mt-0.5 block">
                  {(order.deliveryCity || order.clientCity)}/{(order.deliveryState || order.clientState)}
                  {(order.deliveryCep || order.clientCep) && <span className="font-mono text-slate-500 text-[11px]"> · CEP {order.deliveryCep || order.clientCep}</span>}
                </span>
              </div>
              <div className="sm:col-span-2 pt-1 border-t border-slate-100">
                <span className="text-[11px] text-slate-400 block font-medium">Logradouro Completo</span>
                <span className="text-slate-900 font-semibold mt-0.5 block">
                  {order.deliveryAddress || order.clientAddress || 'Endereço não informado'}
                </span>
              </div>
            </div>
          </div>

          {/* Logística Editável */}
          <div className="bg-gradient-to-br from-indigo-50/50 via-slate-50 to-slate-50 p-4 rounded-xl border border-indigo-100 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-indigo-100/60 pb-2.5">
              <span className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-indigo-600" />
                Dados Operacionais de Logística & Envio
              </span>
              {order.trackingCode && (
                <button
                  onClick={() => onOpenTracking(order)}
                  className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:underline flex items-center gap-1"
                >
                  <span>Abrir Rastreio</span><span>→</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-3 rounded-lg border border-slate-200/90">
                <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider mb-1">Plataforma de Envio</span>
                <select 
                  value={shippingPlatform} 
                  disabled={isViewer} 
                  onChange={(e) => { setShippingPlatform(e.target.value); if(e.target.value !== 'Outra') setCustomShippingPlatform(''); setHasChanges(true); }} 
                  className="w-full px-2 py-1.5 rounded bg-slate-50 border border-slate-200 text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Melhor Envio">Melhor Envio</option>
                  <option value="Frenet">Frenet</option>
                  <option value="SuperFrete">SuperFrete</option>
                  <option value="Contrato Correios">Contrato Correios</option>
                  <option value="Outra">Outra</option>
                </select>
                {shippingPlatform === 'Outra' && (
                  <input type="text" value={customShippingPlatform} onChange={(e) => { setCustomShippingPlatform(e.target.value); setHasChanges(true); }} className="mt-1.5 w-full px-2 py-1.5 rounded border border-slate-300" placeholder="Qual?" />
                )}
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200/90">
                <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider mb-1">Transportadora</span>
                <select 
                  value={carrier} 
                  disabled={isViewer} 
                  onChange={(e) => { setCarrier(e.target.value); if(e.target.value !== 'Outra') setCustomCarrier(''); setHasChanges(true); }} 
                  className="w-full px-2 py-1.5 rounded bg-slate-50 border border-slate-200 text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Correios PAC">Correios PAC</option>
                  <option value="Correios SEDEX">Correios SEDEX</option>
                  <option value="Loggi">Loggi</option>
                  <option value="Jadlog">Jadlog</option>
                  <option value="Transportadora J&T Express">J&T Express</option>
                  <option value="Outra">Outra</option>
                </select>
                {carrier === 'Outra' && (
                  <input type="text" value={customCarrier} onChange={(e) => { setCustomCarrier(e.target.value); setHasChanges(true); }} className="mt-1.5 w-full px-2 py-1.5 rounded border border-slate-300" placeholder="Qual?" />
                )}
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200/90">
                <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider mb-1">Código de Rastreio</span>
                <div className="flex gap-1.5">
                  <input 
                    type="text" 
                    disabled={isViewer} 
                    value={trackingCode} 
                    onChange={(e) => { setTrackingCode(e.target.value.toUpperCase()); setHasChanges(true); }} 
                    placeholder="JD123456789BR" 
                    className="w-full px-2 py-1.5 rounded bg-slate-50 border border-slate-200 font-mono font-bold text-indigo-700 uppercase focus:outline-none focus:ring-1 focus:ring-indigo-500" 
                  />
                  {trackingCode && (
                    <button onClick={() => handleCopy(trackingCode)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded border border-transparent hover:border-slate-200 transition-colors" title="Copiar código">
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <button
            type="button"
            onClick={() => setIsNotifyOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5 fill-white/20" />
            <span className="hidden sm:inline">Avisar Cliente via WhatsApp</span>
            <span className="sm:hidden">WhatsApp</span>
          </button>

          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer">
              Fechar
            </button>
            {hasChanges && !isViewer && (
              <button 
                onClick={handleSaveLogistics} 
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5 animate-in slide-in-from-right-4 duration-300"
              >
                <Save className="w-3.5 h-3.5" />
                Salvar Logística
              </button>
            )}
          </div>
        </div>
      </div>

      <NotifyCustomerModal isOpen={isNotifyOpen} onClose={() => setIsNotifyOpen(false)} order={order} />
    </div>
  );
};
