import React, { useState, useEffect, useMemo } from 'react';
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
  Store,
  X,
  AlertTriangle,
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

  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'BAIXO' | 'RUPTURA'>('TODOS');

  // Compute status counts
  const counts = useMemo(() => {
    let baixo = 0;
    let ruptura = 0;
    for (const p of produtos) {
      const stock = selectedLojaFilter === 'TODAS'
        ? (p.estoque_total ?? 0)
        : (p.estoque_por_loja?.[selectedLojaFilter] ?? 0);
      const minStock = p.estoque_minimo || 5;
      if (stock === 0) ruptura++;
      else if (stock <= minStock) baixo++;
    }
    return {
      todos: produtos.length,
      baixo,
      ruptura,
    };
  }, [produtos, selectedLojaFilter]);

  const filtered = produtos.filter((p) => {
    const matchSearch =
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());

    const stock = selectedLojaFilter === 'TODAS'
      ? (p.estoque_total ?? 0)
      : (p.estoque_por_loja?.[selectedLojaFilter] ?? 0);
    const minStock = p.estoque_minimo || 5;

    if (statusFilter === 'RUPTURA') return matchSearch && stock === 0;
    if (statusFilter === 'BAIXO') return matchSearch && stock > 0 && stock <= minStock;
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
          className="px-5 py-2.5 rounded-full bg-[#10B981] hover:bg-[#059669] text-[#070E0D] font-bold text-xs shadow-glow-emerald transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nova Movimentação</span>
        </button>
      </div>

      {/* High-Resolution Filter & Store Bar */}
      <div className="p-4 rounded-3xl bg-[#0D1917] border border-[rgba(142,182,155,0.18)] shadow-bento-dark space-y-3.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Search Input with Focus Ring & Clear Button */}
          <div className="relative flex-1 max-w-xl group">
            <Search className="w-5 h-5 text-[#8EB69B] group-focus-within:text-[#10B981] absolute left-4 top-3.5 transition-colors duration-200 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por descrição do item ou SKU..."
              className="w-full pl-12 pr-10 py-3 rounded-2xl bg-[#070E0D] border border-[rgba(142,182,155,0.2)] text-sm font-medium text-[#F3FBF6] placeholder-[#5E756B] focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/25 focus:outline-none transition-all duration-200 shadow-inner"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3.5 top-3.5 text-[#8EB69B] hover:text-[#F3FBF6] p-0.5 rounded-full hover:bg-[rgba(142,182,155,0.15)] transition-all active:scale-90"
                title="Limpar busca"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Status Filter Pills */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#070E0D] border border-[rgba(142,182,155,0.18)] overflow-x-auto table-scrollbar shadow-inner">
            {[
              { id: 'TODOS', label: 'Todos os Itens', count: counts.todos },
              { id: 'BAIXO', label: 'Estoque Baixo', count: counts.baixo },
              { id: 'RUPTURA', label: 'Rupturas', count: counts.ruptura },
            ].map((st) => {
              const isActive = statusFilter === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id as any)}
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 whitespace-nowrap active:scale-95 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#10B981] to-[#059669] text-[#070E0D] shadow-glow-emerald font-bold scale-[1.02]'
                      : 'text-[#94A89E] hover:text-[#F3FBF6] hover:bg-[#142522] border border-transparent hover:border-[rgba(142,182,155,0.18)]'
                  }`}
                >
                  <span>{st.label}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold transition-all ${
                      isActive
                        ? 'bg-[#070E0D]/30 text-[#070E0D]'
                        : 'bg-[#142522] text-[#8EB69B] border border-[rgba(142,182,155,0.12)]'
                    }`}
                  >
                    {st.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Store Selection Segmented Bar */}
        <div className="pt-2 border-t border-[rgba(142,182,155,0.1)] flex items-center gap-2 overflow-x-auto table-scrollbar">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#8EB69B] flex items-center gap-1.5 mr-1 flex-shrink-0">
            <Store className="w-3.5 h-3.5 text-[#10B981]" />
            Filial:
          </span>
          <button
            onClick={() => setSelectedLojaFilter('TODAS')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap active:scale-95 ${
              selectedLojaFilter === 'TODAS'
                ? 'bg-[#163832] text-[#10B981] border border-[#10B981]/50 font-bold shadow-glow-emerald'
                : 'bg-[#070E0D] text-[#94A89E] hover:text-[#F3FBF6] border border-[rgba(142,182,155,0.14)] hover:border-[rgba(142,182,155,0.3)]'
            }`}
          >
            <span>Todas as Lojas (Consolidado)</span>
          </button>
          {lojas.map((l) => {
            const isSelected = selectedLojaFilter === l.id;
            return (
              <button
                key={l.id}
                onClick={() => setSelectedLojaFilter(l.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap active:scale-95 ${
                  isSelected
                    ? 'bg-[#163832] text-[#10B981] border border-[#10B981]/50 font-bold shadow-glow-emerald'
                    : 'bg-[#070E0D] text-[#94A89E] hover:text-[#F3FBF6] border border-[rgba(142,182,155,0.14)] hover:border-[rgba(142,182,155,0.3)]'
                }`}
              >
                <span>{l.nome}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Multi-Store Balances Table */}
      <BentoCard>
        <div className="overflow-x-auto table-scrollbar pb-2">
          <table className="w-full text-left min-w-[960px]">
            <thead className="bg-[#0A1614] border-b border-[rgba(142,182,155,0.18)]">
              <tr className="text-xs font-bold uppercase tracking-wider text-[#A2B89B]">
                <th className="py-4 px-4">SKU & Item</th>
                {lojas.map((loja) => {
                  const isSelected = selectedLojaFilter === loja.id;
                  return (
                    <th
                      key={loja.id}
                      className={`py-4 px-4 transition-colors ${
                        isSelected ? 'text-[#10B981] bg-[#163832]/40' : ''
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{loja.nome}</span>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                        )}
                      </div>
                    </th>
                  );
                })}
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
                      const isSelected = selectedLojaFilter === loja.id;
                      return (
                        <td
                          key={loja.id}
                          className={`py-4 px-4 font-mono transition-colors ${
                            isSelected ? 'bg-[#163832]/20 font-bold' : ''
                          }`}
                        >
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
