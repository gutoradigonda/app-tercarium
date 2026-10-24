import React from 'react';
import { X, Truck, CheckCircle2, Clock, Copy, Check, MapPin, Package, ArrowRight } from 'lucide-react';
import { Order, STATUS_CONFIG } from '../types/erp';

interface TrackingModalProps {
  order: Order | null;
  onClose: () => void;
}

export const TrackingModal: React.FC<TrackingModalProps> = ({ order, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!order) return null;

  const handleCopy = () => {
    if (order.trackingCode) {
      navigator.clipboard?.writeText(order.trackingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Determine which tracking step is active based on order.status
  const stages = [
    { key: 'em_producao', title: 'Em Confecção no Ateliê', desc: 'Produção artesanal das contas e acabamentos' },
    { key: 'pronto_expedicao', title: 'Pronto para Expedição', desc: 'Controle de qualidade e polimento aprovados' },
    { key: 'embalado', title: 'Embalado e Etiquetado', desc: `Acondicionado no estojo oficial via ${order.shippingPlatform}` },
    { key: 'despachado', title: `Coletado por ${order.carrier}`, desc: 'Objeto em transferência entre os centros de distribuição' },
    { key: 'entregue', title: 'Entregue ao Destinatário', desc: `Recebido com sucesso em ${order.clientCity}/${order.clientState}` },
  ];

  const statusHierarchy = ['em_producao', 'pronto_expedicao', 'embalado', 'despachado', 'entregue'];
  const currentIndex = statusHierarchy.indexOf(order.status);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Rastreamento de Encomenda</h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                  {order.id}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {order.carrier} · Via {order.shippingPlatform}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tracking Code Banner */}
        <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500 block text-[11px]">Código de Rastreio Oficial</span>
            {order.trackingCode ? (
              <span className="font-mono text-sm font-bold text-slate-900">{order.trackingCode}</span>
            ) : (
              <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-medium">
                Pendente de emissão pela transportadora
              </span>
            )}
          </div>
          {order.trackingCode && (
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copiar</span>
              </>
            )}
            </button>
          )}
        </div>

        {/* Destination Info */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Destino: <strong>{order.clientCity}/{order.clientState}</strong> ({order.clientName})
            </span>
          </div>
          {order.estimatedDelivery && (
            <span className="text-[11px] text-slate-500 font-mono">
              Previsão: {order.estimatedDelivery}
            </span>
          )}
        </div>

        {/* Timeline */}
        <div className="p-6 space-y-5 text-xs">
          <div className="relative border-l-2 border-slate-200 ml-3 space-y-6">
            {stages.map((stage, idx) => {
              const isCompleted = idx < currentIndex;
              const isCurrent = idx === currentIndex;
              const isPending = idx > currentIndex;

              return (
                <div key={stage.key} className="relative pl-6">
                  {/* Dot */}
                  <div
                    className={`absolute -left-[9px] top-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isCompleted
                        ? 'bg-emerald-600 border-white text-white'
                        : isCurrent
                        ? 'bg-amber-500 border-white text-slate-950 ring-2 ring-amber-400'
                        : 'bg-white border-slate-300'
                    }`}
                  >
                    {isCompleted && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                  </div>

                  {/* Text */}
                  <div>
                    <div
                      className={`font-semibold text-xs ${
                        isCurrent
                          ? 'text-amber-800 font-bold'
                          : isCompleted
                          ? 'text-slate-900'
                          : 'text-slate-400'
                      }`}
                    >
                      {stage.title}
                      {isCurrent && (
                        <span className="ml-2 text-[10px] font-mono font-medium px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded">
                          Etapa Atual
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {stage.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
          >
            Fechar Janela
          </button>
        </div>
      </div>
    </div>
  );
};
