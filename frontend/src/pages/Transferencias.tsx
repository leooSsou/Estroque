import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { TransferenciaEstoque, Produto } from '../types';
import { BentoCard } from '../components/common/BentoCard';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import {
  ArrowLeftRight,
  Plus,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building2,
  Package,
} from 'lucide-react';

export const Transferencias: React.FC = () => {
  const { lojas } = useAuth();
  const { toast } = useToast();
  const [transferencias, setTransferencias] = useState<TransferenciaEstoque[]>([]);
  const [produtos, setProdutos] = useState<Record<string, Produto>>({});
  const [loading, setLoading] = useState(true);

  // New transfer modal
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [origemId, setOrigemId] = useState('');
  const [destinoId, setDestinoId] = useState('');
  const [produtoId, setProdutoId] = useState('');
  const [quantidade, setQuantidade] = useState(5);

  // Blind receiving audit modal
  const [receivingModalOpen, setReceivingModalOpen] = useState(false);
  const [activeTransfer, setActiveTransfer] = useState<TransferenciaEstoque | null>(null);
  const [scannedQty, setScannedQty] = useState(0);
  const [justificativa, setJustificativa] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [trfList, prodsList] = await Promise.all([
        api.getTransferencias(),
        api.getProdutos(),
      ]);
      setTransferencias(trfList);
      const map: Record<string, Produto> = {};
      for (const p of prodsList) map[p.id] = p;
      setProdutos(map);

      if (lojas.length >= 2) {
        setOrigemId(lojas[0].id);
        setDestinoId(lojas[1].id);
      }
      if (prodsList.length > 0) {
        setProdutoId(prodsList[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [lojas]);

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (origemId === destinoId) {
      toast.error('A loja de origem e destino não podem ser a mesma.');
      return;
    }

    try {
      await api.solicitarTransferencia({
        loja_origem_id: origemId,
        loja_destino_id: destinoId,
        produto_id: produtoId,
        quantidade,
      });
      toast.success('Solicitação de transferência gerada com sucesso!');
      setNewModalOpen(false);
      loadData();
    } catch {
      toast.error('Erro ao solicitar transferência.');
    }
  };

  const handleDespachar = async (id: string) => {
    try {
      await api.despacharTransferencia(id);
      toast.success('Transferência despachada! Itens saíram do depósito de origem.');
      loadData();
    } catch {
      toast.error('Erro ao despachar.');
    }
  };

  const handleOpenReceiving = (trf: TransferenciaEstoque) => {
    setActiveTransfer(trf);
    setScannedQty(trf.quantidade);
    setJustificativa('');
    setReceivingModalOpen(true);
  };

  const handleConfirmReceiving = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTransfer) return;

    try {
      await api.receberTransferencia(activeTransfer.id, scannedQty, justificativa);
      if (scannedQty !== activeTransfer.quantidade) {
        toast.warning('Recebimento concluído com registro de DIVERGÊNCIA.');
      } else {
        toast.success('Recebimento 100% conferido! Estoque de destino abastecido.');
      }
      setReceivingModalOpen(false);
      loadData();
    } catch {
      toast.error('Erro ao processar recebimento.');
    }
  };

  const getLojaNome = (id: string) => lojas.find((l) => l.id === id)?.nome || id.slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F3FBF6] tracking-tight">
            Transferências entre Lojas
          </h1>
        </div>

        <button
          onClick={() => setNewModalOpen(true)}
          className="relative group overflow-hidden px-5 py-2.5 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-[#070E0D] font-extrabold text-sm shadow-glow-emerald hover:shadow-[0_0_28px_rgba(16,185,129,0.5)] transition-all duration-200 flex items-center justify-center gap-2.5 active:scale-95 cursor-pointer select-none"
        >
          <span className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300 flex-shrink-0" />
          <span>Nova Solicitação</span>
        </button>
      </div>

      {/* Pipeline Stepper / Manifest List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {transferencias.map((trf) => {
          const prod = produtos[trf.produto_id];
          return (
            <div
              key={trf.id}
              className="bg-[#0D1917] border border-[rgba(142,182,155,0.14)] rounded-3xl p-5 shadow-bento-dark space-y-4 hover:border-[rgba(142,182,155,0.25)] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs text-[#8EB69B] font-mono font-semibold">
                    #{trf.id.slice(0, 8)}
                  </span>
                  {trf.status === 'SOLICITADO' && (
                    <Badge variant="warning">
                      <Clock className="w-3.5 h-3.5 mr-1 inline" /> Solicitado
                    </Badge>
                  )}
                  {trf.status === 'DESPACHADO' && (
                    <Badge variant="blue">
                      <Truck className="w-3.5 h-3.5 mr-1 inline" /> Em Trânsito
                    </Badge>
                  )}
                  {trf.status === 'RECEBIDO' && (
                    <Badge variant="mint">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1 inline" /> Recebido
                    </Badge>
                  )}
                  {trf.status === 'DIVERGENTE' && (
                    <Badge variant="danger">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1 inline" /> Divergente
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-[#10B981] flex-shrink-0" />
                    <span className="text-sm md:text-base font-bold text-[#F3FBF6] truncate">
                      {prod?.nome || 'Produto'}
                    </span>
                  </div>
                  <div className="text-sm font-mono text-[#DAF1DE]">
                    Quantidade: <strong className="text-lg font-bold text-[#10B981]">{trf.quantidade}</strong> un
                  </div>
                </div>

                {/* Origin -> Destination Route */}
                <div className="mt-4 p-3.5 rounded-2xl bg-[#070E0D] border border-[rgba(142,182,155,0.1)] space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-[#94A89E]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#8EB69B] flex-shrink-0" />
                    <span className="truncate">Origem: <strong className="text-[#F3FBF6]">{getLojaNome(trf.loja_origem_id)}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-[#DAF1DE]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] flex-shrink-0" />
                    <span className="truncate">Destino: <strong className="text-[#10B981]">{getLojaNome(trf.loja_destino_id)}</strong></span>
                  </div>
                </div>

                {trf.justificativa && (
                  <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                    <strong>Motivo de Divergência:</strong> {trf.justificativa}
                  </div>
                )}
              </div>

              {/* Action Buttons based on status */}
              <div className="pt-3 border-t border-[rgba(142,182,155,0.1)]">
                {trf.status === 'SOLICITADO' && (
                  <button
                    onClick={() => handleDespachar(trf.id)}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#142522] hover:bg-[#163832] border border-[#10B981]/30 text-sm font-semibold text-[#10B981] flex items-center justify-center gap-2 transition-all"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Despachar Carga</span>
                  </button>
                )}

                {trf.status === 'DESPACHADO' && (
                  <button
                    onClick={() => handleOpenReceiving(trf)}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#10B981] hover:bg-[#059669] text-[#070E0D] text-sm font-bold shadow-glow-emerald flex items-center justify-center gap-2 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Conferência Cega de Recebimento</span>
                  </button>
                )}

                {(trf.status === 'RECEBIDO' || trf.status === 'DIVERGENTE') && (
                  <div className="text-center text-xs text-[#5E756B] py-1">
                    Transferência concluída
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Transfer Modal */}
      <Modal
        isOpen={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        title="Solicitar Transferência Entre Lojas"
      >
        <form onSubmit={handleCreateTransfer} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#A2B89B] uppercase tracking-wider mb-1.5">
                Loja de Origem
              </label>
              <select
                value={origemId}
                onChange={(e) => setOrigemId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.22)] text-sm text-[#F3FBF6] focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 focus:outline-none transition-all cursor-pointer"
              >
                {lojas.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#A2B89B] uppercase tracking-wider mb-1.5">
                Loja de Destino
              </label>
              <select
                value={destinoId}
                onChange={(e) => setDestinoId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.22)] text-sm text-[#F3FBF6] focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 focus:outline-none transition-all cursor-pointer"
              >
                {lojas.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#A2B89B] uppercase tracking-wider mb-1.5">
              Produto
            </label>
            <select
              value={produtoId}
              onChange={(e) => setProdutoId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.22)] text-sm text-[#F3FBF6] focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 focus:outline-none transition-all cursor-pointer"
            >
              {Object.values(produtos).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} - {p.nome} (Estoque: {p.estoque_total} un)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#A2B89B] uppercase tracking-wider mb-1.5">
              Quantidade a Transferir
            </label>
            <input
              type="number"
              min="1"
              required
              value={quantidade}
              onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.22)] text-sm font-mono text-[#F3FBF6] placeholder-[#7A9988] focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 focus:outline-none transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setNewModalOpen(false)}
              className="px-5 py-2.5 rounded-xl bg-[#142522] hover:bg-[#163832] border border-[rgba(142,182,155,0.2)] text-sm font-semibold text-[#94A89E] hover:text-[#F3FBF6] transition-all btn-press cursor-pointer active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-[#070E0D] text-sm font-extrabold shadow-glow-emerald transition-all btn-press cursor-pointer active:scale-95 flex items-center gap-2"
            >
              <span>Emitir Solicitação</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Blind Receiving Audit Modal */}
      <Modal
        isOpen={receivingModalOpen}
        onClose={() => setReceivingModalOpen(false)}
        title="Conferência de Recebimento"
      >
        <form onSubmit={handleConfirmReceiving} className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#070E0D] border border-[rgba(142,182,155,0.14)] space-y-2">
            <div className="text-xs font-bold text-[#A2B89B] uppercase tracking-wider">Manifesto de Envio:</div>
            <div className="text-base font-bold text-[#F3FBF6]">
              {produtos[activeTransfer?.produto_id || '']?.nome}
            </div>
            <div className="text-sm font-mono text-[#8EB69B]">
              Quantidade Despachada no Manifesto: <strong className="text-base text-[#10B981]">{activeTransfer?.quantidade}</strong> un
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#A2B89B] uppercase tracking-wider mb-1.5">
              Quantidade Física Contada no Recebimento
            </label>
            <input
              type="number"
              min="0"
              required
              value={scannedQty}
              onChange={(e) => setScannedQty(parseInt(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.22)] text-base font-mono font-bold text-[#10B981] focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 focus:outline-none transition-all"
            />
          </div>

          {activeTransfer && scannedQty !== activeTransfer.quantidade && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-red-400">
                <AlertTriangle className="w-4 h-4" />
                <span>Divergência Detectada! (Diferença de {scannedQty - activeTransfer.quantidade} un)</span>
              </div>
              <label className="block text-xs font-bold text-red-200">
                Justificativa Obrigatória para Auditoria:
              </label>
              <textarea
                required
                rows={2}
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Ex: Caixa violada durante o transporte, faltou 1 unidade..."
                className="w-full px-3.5 py-2 rounded-xl bg-[#070E0D] border border-red-500/30 text-xs text-red-100 placeholder-red-300/40 focus:outline-none focus:border-red-500 transition-all"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setReceivingModalOpen(false)}
              className="px-5 py-2.5 rounded-xl bg-[#142522] hover:bg-[#163832] border border-[rgba(142,182,155,0.2)] text-sm font-semibold text-[#94A89E] hover:text-[#F3FBF6] transition-all btn-press cursor-pointer active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-[#070E0D] text-sm font-extrabold shadow-glow-emerald transition-all btn-press cursor-pointer active:scale-95 flex items-center gap-2"
            >
              <span>Confirmar Recebimento</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
