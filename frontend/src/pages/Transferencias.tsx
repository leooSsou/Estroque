import React, { useState, useEffect, useMemo } from 'react';
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
  Search,
  X,
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

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'SOLICITADO' | 'DESPACHADO' | 'RECEBIDO' | 'DIVERGENTE'>('TODOS');

  // Compute status counts
  const counts = useMemo(() => {
    let solicitado = 0;
    let despachado = 0;
    let recebido = 0;
    let divergente = 0;
    for (const t of transferencias) {
      if (t.status === 'SOLICITADO') solicitado++;
      else if (t.status === 'DESPACHADO') despachado++;
      else if (t.status === 'RECEBIDO') recebido++;
      else if (t.status === 'DIVERGENTE') divergente++;
    }
    return {
      todos: transferencias.length,
      solicitado,
      despachado,
      recebido,
      divergente,
    };
  }, [transferencias]);

  const filteredTransferencias = useMemo(() => {
    return transferencias.filter((trf) => {
      const prod = produtos[trf.produto_id];
      const q = search.toLowerCase();
      const matchSearch =
        trf.id.toLowerCase().includes(q) ||
        (prod?.nome || '').toLowerCase().includes(q) ||
        (prod?.sku || '').toLowerCase().includes(q);

      if (statusFilter !== 'TODOS' && trf.status !== statusFilter) return false;
      return matchSearch;
    });
  }, [transferencias, produtos, search, statusFilter]);

  const getLojaNome = (id: string) => lojas.find((l) => l.id === id)?.nome || id.slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Transferências entre Lojas
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Logística interfilial, despacho de cargas e conferência cega de recebimento
          </p>
        </div>

        <button
          onClick={() => setNewModalOpen(true)}
          className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Solicitação</span>
        </button>
      </div>

      {/* High-Resolution Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-2xl bg-[#000000] border border-white/[0.16] shadow-lg">
        {/* Search */}
        <div className="relative flex-1 max-w-xl group">
          <Search className="w-5 h-5 text-slate-400 group-focus-within:text-emerald-400 absolute left-4 top-3.5 transition-colors duration-200 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por produto, SKU ou código de transferência..."
            className="w-full pl-12 pr-10 py-3 rounded-xl bg-[#000000] border border-white/[0.16] text-sm font-medium text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all duration-200"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white p-0.5 rounded-full hover:bg-white/[0.1] transition-all active:scale-90"
              title="Limpar busca"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Segmented Status Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-[#000000] border border-white/[0.16] overflow-x-auto table-scrollbar">
          {[
            { id: 'TODOS', label: 'Todas', count: counts.todos, color: 'emerald' },
            { id: 'SOLICITADO', label: 'Solicitadas', count: counts.solicitado, color: 'amber' },
            { id: 'DESPACHADO', label: 'Em Trânsito', count: counts.despachado, color: 'purple' },
            { id: 'RECEBIDO', label: 'Recebidas', count: counts.recebido, color: 'emerald' },
            { id: 'DIVERGENTE', label: 'Divergentes', count: counts.divergente, color: 'rose' },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            const activeClass =
              tab.color === 'emerald'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 font-bold'
                : tab.color === 'amber'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/25 font-bold'
                : tab.color === 'purple'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25 font-bold'
                : 'bg-rose-600 text-white shadow-md shadow-rose-600/25 font-bold';

            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 whitespace-nowrap active:scale-95 ${
                  isActive
                    ? `${activeClass} scale-[1.02]`
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-black/30 text-white'
                      : 'bg-[#000000] text-slate-300 border border-white/[0.16]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pipeline Stepper / Manifest List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTransferencias.map((trf) => {
          const prod = produtos[trf.produto_id];
          return (
            <div
              key={trf.id}
              className="bg-[#000000] border border-white/[0.16] rounded-2xl p-5 shadow-lg space-y-4 hover:border-white/[0.18] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs text-slate-400 font-semibold">
                    #{trf.id.slice(0, 8)}
                  </span>
                  {trf.status === 'SOLICITADO' && (
                    <Badge variant="amber">
                      <Clock className="w-3.5 h-3.5 mr-1 inline" /> Solicitado
                    </Badge>
                  )}
                  {trf.status === 'DESPACHADO' && (
                    <Badge variant="purple">
                      <Truck className="w-3.5 h-3.5 mr-1 inline" /> Em Trânsito
                    </Badge>
                  )}
                  {trf.status === 'RECEBIDO' && (
                    <Badge variant="emerald">
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
                    <Package className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span className="text-sm md:text-base font-bold text-white truncate">
                      {prod?.nome || 'Produto'}
                    </span>
                  </div>
                  <div className="text-sm text-slate-300">
                    Quantidade: <strong className="text-lg font-bold text-emerald-400">{trf.quantidade}</strong> un
                  </div>
                </div>

                {/* Origin -> Destination Route */}
                <div className="mt-4 p-3.5 rounded-xl bg-[#000000] border border-white/[0.16] space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-500 flex-shrink-0" />
                    <span className="truncate">Origem: <strong className="text-slate-200">{getLojaNome(trf.loja_origem_id)}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 flex-shrink-0" />
                    <span className="truncate">Destino: <strong className="text-white font-bold">{getLojaNome(trf.loja_destino_id)}</strong></span>
                  </div>
                </div>

                {trf.justificativa && (
                  <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                    <strong>Motivo de Divergência:</strong> {trf.justificativa}
                  </div>
                )}
              </div>

              {/* Action Buttons based on status */}
              <div className="pt-3 border-t border-white/[0.16]">
                {trf.status === 'SOLICITADO' && (
                  <button
                    onClick={() => handleDespachar(trf.id)}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#000000] hover:bg-white/[0.08] border border-purple-500/30 text-sm font-semibold text-purple-400 hover:text-purple-300 flex items-center justify-center gap-2 transition-all"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Despachar Carga</span>
                  </button>
                )}

                {trf.status === 'DESPACHADO' && (
                  <button
                    onClick={() => handleOpenReceiving(trf)}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Conferência Cega de Recebimento</span>
                  </button>
                )}

                {(trf.status === 'RECEBIDO' || trf.status === 'DIVERGENTE') && (
                  <div className="text-center text-xs text-slate-500 py-1">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Loja de Origem
              </label>
              <select
                value={origemId}
                onChange={(e) => setOrigemId(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-[#000000] border border-white/[0.16] text-sm text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
              >
                {lojas.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Loja de Destino
              </label>
              <select
                value={destinoId}
                onChange={(e) => setDestinoId(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-[#000000] border border-white/[0.16] text-sm text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
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
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Produto
            </label>
            <select
              value={produtoId}
              onChange={(e) => setProdutoId(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-[#000000] border border-white/[0.16] text-sm text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
            >
              {Object.values(produtos).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} - {p.nome} (Estoque: {p.estoque_total} un)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Quantidade a Transferir
            </label>
            <input
              type="number"
              min="1"
              required
              value={quantidade}
              onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)}
              className="w-full h-11 px-3.5 rounded-xl bg-[#000000] border border-white/[0.16] text-sm text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.16]">
            <button
              type="button"
              onClick={() => setNewModalOpen(false)}
              className="h-11 px-5 rounded-xl bg-[#000000] hover:bg-white/[0.08] text-sm font-semibold text-slate-300 hover:text-white border border-white/[0.16] active:scale-95 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-md shadow-emerald-600/25 active:scale-95 transition-all"
            >
              Emitir Solicitação
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
          <div className="p-4 rounded-xl bg-[#000000] border border-white/[0.16] space-y-2">
            <div className="text-xs text-slate-400">Manifesto de Envio:</div>
            <div className="text-sm font-semibold text-white">
              {produtos[activeTransfer?.produto_id || '']?.nome}
            </div>
            <div className="text-xs text-slate-300">
              Quantidade Despachada no Manifesto: <strong className="text-white">{activeTransfer?.quantidade}</strong> un
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Quantidade Física Contada no Recebimento
            </label>
            <input
              type="number"
              min="0"
              required
              value={scannedQty}
              onChange={(e) => setScannedQty(parseInt(e.target.value) || 0)}
              className="w-full h-11 px-3.5 rounded-xl bg-[#000000] border border-white/[0.16] text-base font-bold text-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
            />
          </div>

          {activeTransfer && scannedQty !== activeTransfer.quantidade && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-400">
                <AlertTriangle className="w-4 h-4" />
                <span>Divergência Detectada! (Diferença de {scannedQty - activeTransfer.quantidade} un)</span>
              </div>
              <label className="block text-[11px] text-rose-200">
                Justificativa Obrigatória para Auditoria:
              </label>
              <textarea
                required
                rows={2}
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Ex: Caixa violada durante o transporte, faltou 1 unidade..."
                className="w-full px-3 py-2 rounded-xl bg-[#000000] border border-rose-500/30 text-xs text-rose-100 placeholder-slate-500 focus:outline-none"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.16]">
            <button
              type="button"
              onClick={() => setReceivingModalOpen(false)}
              className="h-11 px-5 rounded-xl bg-[#000000] hover:bg-white/[0.08] text-sm font-semibold text-slate-300 hover:text-white border border-white/[0.16] active:scale-95 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-md shadow-emerald-600/25 active:scale-95 transition-all"
            >
              Confirmar Recebimento
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
