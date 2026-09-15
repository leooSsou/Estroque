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

      {/* Filter and Store Selector */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#0D1917] border border-[rgba(142,182,155,0.12)]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#8EB69B] absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar produtos ou SKU..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.18)] text-xs text-[#F3FBF6] placeholder-[#5E756B] focus:border-[#10B981] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-[#8EB69B]" />
          <select
            value={selectedLojaFilter}
            onChange={(e) => setSelectedLojaFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.18)] text-xs text-[#F3FBF6] focus:border-[#10B981] focus:outline-none"
          >
            <option value="TODAS">Todas as Lojas (Consolidado)</option>
            {lojas.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Multi-Store Balances Table */}
      <BentoCard>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[rgba(142,182,155,0.14)] text-[#94A89E]">
                <th className="py-3 px-3 font-semibold">SKU & Item</th>
                {lojas.map((loja) => (
                  <th key={loja.id} className="py-3 px-3 font-semibold">
                    {loja.nome}
                  </th>
                ))}
                <th className="py-3 px-3 font-semibold">Saldo Total Rede</th>
                <th className="py-3 px-3 font-semibold">Valoração Total (Custo)</th>
                <th className="py-3 px-3 font-semibold text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(142,182,155,0.06)]">
              {filtered.map((prod) => {
                const totalStock = prod.estoque_total ?? 0;
                const totalCostVal = totalStock * prod.preco_custo;

                return (
                  <tr key={prod.id} className="hover:bg-[#142522]/40 transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#142522] flex items-center justify-center text-[#10B981] flex-shrink-0">
                          <Package className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-[#F3FBF6]">{prod.nome}</div>
                          <div className="text-[11px] text-[#94A89E] font-mono">
                            {prod.sku} • Mínimo: {prod.estoque_minimo || 5} un
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Stock by store columns */}
                    {lojas.map((loja) => {
                      const stockInLoja = prod.estoque_por_loja?.[loja.id] ?? 0;
                      return (
                        <td key={loja.id} className="py-3.5 px-3 font-mono">
                          <span
                            className={`font-bold ${
                              stockInLoja === 0
                                ? 'text-red-400'
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

                    <td className="py-3.5 px-3 font-mono font-bold text-[#10B981]">
                      {totalStock} un
                    </td>

                    <td className="py-3.5 px-3 font-mono text-[#8EB69B]">
                      R$ {totalCostVal.toFixed(2)}
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      <button
                        onClick={() => handleOpenMovement(prod)}
                        className="px-2.5 py-1 rounded-lg bg-[#142522] hover:bg-[#163832] text-[#DAF1DE] border border-[rgba(142,182,155,0.2)] text-[11px] transition-all"
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
