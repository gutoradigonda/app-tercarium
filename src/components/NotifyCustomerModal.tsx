import React, { useState } from 'react';
import { 
  X, 
  MessageCircle, 
  Copy, 
  Check, 
  Truck, 
  Sparkles, 
  Phone, 
  User, 
  ExternalLink 
} from 'lucide-react';
import { Order } from '../types/erp';
import { buildWhatsAppCustomerNoticeUrl, maskPhone } from '../utils/formatters';

interface NotifyCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
}

export const NotifyCustomerModal: React.FC<NotifyCustomerModalProps> = ({
  isOpen,
  onClose,
  order,
}) => {
  const [isCopied, setIsCopied] = useState<boolean>(false);

  if (!isOpen || !order) return null;

  const { message, url, cleanPhone } = buildWhatsAppCustomerNoticeUrl(order);

  const handleCopyMessage = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(message);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = message;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (err) {
      console.error('Falha ao copiar mensagem:', err);
    }
  };

  const handleOpenWhatsApp = () => {
    // Redireciona para a API do WhatsApp Web
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-700 shrink-0">
              <MessageCircle className="w-5 h-5 fill-emerald-600/20" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900">
                  Avisar Cliente via WhatsApp
                </h3>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                  #{order.id}
                </span>
                {order.codigoCliente && (
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <Sparkles className="w-3 h-3 text-indigo-500" />
                    {order.codigoCliente}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                Revise o texto pré-formatado antes de enviar ao cliente
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com Informações e Mensagem */}
        <div className="p-5 sm:p-6 space-y-4 text-xs">
          {/* Dados do Destinatário */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
            <div className="flex items-center gap-2 truncate">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-900 truncate">{order.clientName}</span>
            </div>
            <div className="flex items-center gap-2 truncate font-mono">
              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{order.clientPhone ? maskPhone(order.clientPhone) : 'Telefone não informado'}</span>
            </div>
            <div className="flex items-center gap-2 truncate col-span-1 sm:col-span-2 text-slate-500">
              <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                {order.carrier || 'Correios'} · Rastreio: <strong className="text-slate-800 font-mono">{order.trackingCode || 'Aguardando postagem'}</strong>
              </span>
            </div>
          </div>

          {/* Visualização da Mensagem Pré-formatada */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-slate-700 text-xs">
                Mensagem Pré-formatada Oficial:
              </label>
              <span className="text-[10px] text-slate-400">
                Padrão ateliê Terçarium
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 border border-slate-800 font-mono text-[11px] leading-relaxed whitespace-pre-wrap select-all max-h-64 overflow-y-auto shadow-inner">
              {message}
            </div>
          </div>
        </div>

        {/* Rodapé com os dois botões de ação OBRIGATÓRIOS */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer order-last sm:order-first"
          >
            Fechar
          </button>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* BOTÃO 1 OBRIGATÓRIO: Copiar Mensagem */}
            <button
              type="button"
              onClick={handleCopyMessage}
              className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer ${
                isCopied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-300'
              }`}
              title="Copiar texto para a área de transferência"
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span>Copiar Mensagem</span>
                </>
              )}
            </button>

            {/* BOTÃO 2 OBRIGATÓRIO: Abrir WhatsApp */}
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              title="Abrir WhatsApp Web com o texto pré-carregado"
            >
              <MessageCircle className="w-4 h-4 fill-white/20" />
              <span>Abrir WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
