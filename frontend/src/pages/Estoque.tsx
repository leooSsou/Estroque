import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { Produto, Loja } from '../types';
import { BentoCard } from '../components/common/BentoCard';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import {
  Boxes,
  ArrowDownRight,
  ArrowUpRight,
  Filter,
  Plus,
  Package,
  Layers,
  Search,
  X,
  Store,
} from 'lucide-react';

export const Estoque: React.FC = () => {
  const { lojas, activeLoja } = useAuth();
  const { toast } = useToast();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [search, setSearch] = useState('');
  const [selectedLojaFilter, setSelectedLojaFilter] = useState<string>('TODAS');
  const [movementModalOpen, setMovementModalOpen] = useState(false);

  // New Movement Form
  const [movProdutoId, setMovProdutoId] = useState('');
  const [movLojaId, setMovLojaId] = useState('');
  const [movTipo, setMovTipo] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [movQtd, setMovQtd] = useState(1);
  const [movMotivo, setMovMotivo] = useState('Ajuste operacional de rotina');

  const loadStock = async () => {
    const prods = await api.getProdutos();
    setProdutos(prods);
  };

  useEffect(() => {
    loadStock();
  }, [activeLoja]);

  const handleOpenMovement = (prod?: Produto) => {
    if (prod) {
      setMovProdutoId(prod.id);
    } else if (produtos.length > 0) {
      setMovProdutoId(produtos[0].id);
    }
    setMovLojaId(activeLoja?.id || lojas[0]?.id || '');
    setMovementModalOpen(true);
  };

  const handleSubmitMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.movimentarEstoque({
        loja_id: movLojaId,
        produto_id: movProdutoId,
        tipo: movTipo,
        quantidade: movQtd,
        motivo: movMotivo,
      });

      toast.success(
        `Movimentação de ${movTipo} (${movQtd} un) registrada no Ledger com sucesso!`
      );
      setMovementModalOpen(false);
      loadStock();
    } catch {
      toast.error('Erro ao registrar movimentação.');
    }
  };

  const filtered = produtos.filter((p) => {
    const matchSearch =
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F3FBF6] tracking-tight">
            Controle de Estoque
          </h1>
        </div>

        <button
          onClick={() => handleOpenMovement()}
          className="px-5 py-2.5 rounded-full bg-[#10B981] hover:bg-[#059669] text-[#070E0D] font-bold text-xs shadow-glow-emerald transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nova Movimentação</span>
        </button>
      </div>

      {/* Filter and Store Selector - High-Resolution Control */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-3.5 md:p-4 rounded-3xl bg-[#0D1917] border border-[rgba(142,182,155,0.18)] shadow-bento-dark">
        <div className="relative flex-1 max-w-full sm:max-w-md">
          <Search className="w-4 h-4 text-[#10B981] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por nome do produto ou SKU..."
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-[#070E0D] border border-[rgba(142,182,155,0.22)] text-sm font-medium text-[#F3FBF6] placeholder-[#7A9988] focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 focus:outline-none transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-[#7A9988] hover:text-[#F3FBF6] hover:bg-[#142522] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 p-1 rounded-2xl bg-[#070E0D] border border-[rgba(142,182,155,0.18)]">
          <Store className="w-4 h-4 text-[#10B981] ml-2" />
          <select
            value={selectedLojaFilter}
            onChange={(e) => setSelectedLojaFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#0D1917] border border-[rgba(142,182,155,0.22)] text-xs md:text-sm font-semibold text-[#F3FBF6] focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 focus:outline-none cursor-pointer transition-all"
          >
            <option value="TODAS">Todas as Filiais (Visão Consolidada)</option>
            {lojas.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </select>
          <span className="px-2.5 py-1 mr-1 rounded-lg bg-[#142522] text-[#8EB69B] font-mono text-xs font-bold border border-[rgba(142,182,155,0.15)]">
            {filtered.length} itens
          </span>
        </div>
      </div>

      {/* Multi-Store Balances Table */}
      <BentoCard>
        <div className="overflow-x-auto table-scrollbar pb-2">
          <table className="w-full text-left min-w-[960px]">
            <thead className="bg-[#0A1614] border-b border-[rgba(142,182,155,0.18)]">
              <tr className="text-xs font-bold uppercase tracking-wider text-[#A2B89B]">
                <th className="py-4 px-4">SKU & Item</th>
                {lojas.map((loja) => (
                  <th key={loja.id} className="py-4 px-4">
                    {loja.nome}
                  </th>
                ))}
                <th className="py-4 px-4">Saldo Total Rede</th>
                <th className="py-4 px-4">Valoração Total (Custo)</th>
                <th className="py-4 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(142,182,155,0.08)]">
              {filtered.map((prod) => {
                const totalStock = prod.estoque_total ?? 0;
                const totalCostVal = totalStock * prod.preco_custo;

                return (
                  <tr key={prod.id} className="hover:bg-[#142522]/50 transition-colors group">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#142522] border border-[rgba(142,182,155,0.2)] flex items-center justify-center text-[#10B981] flex-shrink-0">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-sm md:text-base text-[#F3FBF6] group-hover:text-[#10B981] transition-colors">
                            {prod.nome}
                          </div>
                          <div className="text-xs text-[#A2B89B] font-mono mt-0.5">
                            SKU: {prod.sku} • Mínimo: {prod.estoque_minimo || 5} un
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Stock by store columns */}
                    {lojas.map((loja) => {
                      const stockInLoja = prod.estoque_por_loja?.[loja.id] ?? 0;
                      return (
                        <td key={loja.id} className="py-4 px-4 font-mono">
                          <span
                            className={`font-bold text-sm md:text-base ${
                              stockInLoja === 0
                                ? 'text-red-400 font-extrabold'
                                : stockInLoja <= (prod.estoque_minimo || 5)
                                ? 'text-amber-400'
                                : 'text-[#DAF1DE]'
                            }`}
                          >
                            {stockInLoja} un
                          </span>
                        </td>
                      );
                    })}

                    <td className="py-4 px-4 font-mono text-base font-extrabold text-[#10B981]">
                      {totalStock} un
                    </td>

                    <td className="py-4 px-4 font-mono text-sm md:text-base font-semibold text-[#DAF1DE]">
                      R$ {totalCostVal.toFixed(2)}
                    </td>

                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => handleOpenMovement(prod)}
                        className="px-3.5 py-2 rounded-xl bg-[#142522] hover:bg-[#163832] text-[#DAF1DE] hover:text-white border border-[rgba(142,182,155,0.25)] text-xs font-bold transition-all inline-flex items-center gap-1.5 btn-press shadow-sm"
                      >
                        Ajustar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </BentoCard>

      {/* Movement Modal */}
      <Modal
        isOpen={movementModalOpen}
        onClose={() => setMovementModalOpen(false)}
        title="Registrar Movimentação de Estoque"
      >
        <form onSubmit={handleSubmitMovement} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#94A89E] mb-1">Produto</label>
            <select
              value={movProdutoId}
              onChange={(e) => setMovProdutoId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.18)] text-xs text-[#F3FBF6] focus:border-[#10B981] focus:outline-none"
            >
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} - {p.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#94A89E] mb-1">Loja / Depósito</label>
              <select
                value={movLojaId}
                onChange={(e) => setMovLojaId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.18)] text-xs text-[#F3FBF6] focus:border-[#10B981] focus:outline-none"
              >
                {lojas.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94A89E] mb-1">Tipo</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMovTipo('ENTRADA')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    movTipo === 'ENTRADA'
                      ? 'bg-[#10B981] text-[#070E0D]'
                      : 'bg-[#070E0D] text-[#94A89E] border border-[rgba(142,182,155,0.15)]'
                  }`}
                >
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  <span>ENTRADA</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMovTipo('SAIDA')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    movTipo === 'SAIDA'
                      ? 'bg-red-500 text-white'
                      : 'bg-[#070E0D] text-[#94A89E] border border-[rgba(142,182,155,0.15)]'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>SAÍDA</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#94A89E] mb-1">Quantidade</label>
              <input
                type="number"
                min="1"
                required
                value={movQtd}
                onChange={(e) => setMovQtd(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.18)] text-xs font-mono text-[#F3FBF6] focus:border-[#10B981] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94A89E] mb-1">Motivo / Razão</label>
              <select
                value={movMotivo}
                onChange={(e) => setMovMotivo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.18)] text-xs text-[#F3FBF6] focus:border-[#10B981] focus:outline-none"
              >
                <option value="Ajuste de inventário rotativo">Ajuste de inventário rotativo</option>
                <option value="Avaria ou dano em transporte">Avaria ou dano em transporte</option>
                <option value="Perda operacional">Perda operacional</option>
                <option value="Bonificação de fornecedor">Bonificação de fornecedor</option>
                <option value="Devolução de cliente">Devolução de cliente</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setMovementModalOpen(false)}
              className="px-4 py-2 rounded-full bg-[#142522] text-xs font-semibold text-[#94A89E]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-full bg-[#10B981] hover:bg-[#059669] text-[#070E0D] text-xs font-bold shadow-glow-emerald"
            >
              Confirmar Movimentação
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
