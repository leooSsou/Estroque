import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { Produto } from '../types';
import { BentoCard } from '../components/common/BentoCard';
import { Badge } from '../components/common/Badge';
import {
  ClipboardCheck,
  Barcode,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';

interface AuditItemState {
  produto: Produto;
  sistema: number;
  contado: number;
}

export const Auditoria: React.FC = () => {
  const { activeLoja } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<AuditItemState[]>([]);
  const [barcodeQuery, setBarcodeQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      const prods = await api.getProdutos(activeLoja?.id);
      const auditList: AuditItemState[] = prods.map((p) => {
        const stock = activeLoja?.id ? p.estoque_por_loja?.[activeLoja.id] ?? 0 : p.estoque_total ?? 0;
        return {
          produto: p,
          sistema: stock,
          contado: stock, // Pre-populated for review or blind testing
        };
      });
      setItems(auditList);
    };
    init();
  }, [activeLoja]);

  const handleIncrement = (index: number, delta: number) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index].contado = Math.max(0, copy[index].contado + delta);
      return copy;
    });
  };

  const handleBarcodeScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeQuery.trim()) return;

    const idx = items.findIndex(
      (it) =>
        it.produto.codigo_barras === barcodeQuery ||
        it.produto.sku.toLowerCase() === barcodeQuery.toLowerCase()
    );

    if (idx !== -1) {
      handleIncrement(idx, 1);
      toast.success(`Item BIPADO: +1 un para ${items[idx].produto.nome}`);
      setBarcodeQuery('');
    } else {
      toast.error(`Nenhum item com código "${barcodeQuery}" encontrado nesta loja.`);
    }
  };

  const handleApproveReconciliation = async () => {
    setLoading(true);
    try {
      let adjustmentsCount = 0;
      for (const item of items) {
        const diff = item.contado - item.sistema;
        if (diff !== 0) {
          adjustmentsCount++;
          await api.movimentarEstoque({
            loja_id: activeLoja?.id || '11111111-1111-1111-1111-111111111111',
            produto_id: item.produto.id,
            tipo: diff > 0 ? 'ENTRADA' : 'SAIDA',
            quantidade: Math.abs(diff),
            motivo: `Ajuste de Auditoria Física Cega (#AUD-${Date.now().toString().slice(-4)})`,
          });
        }
      }

      toast.success(
        `Auditoria concluída! ${adjustmentsCount} ajustes conciliados com sucesso no Ledger.`
      );
    } catch {
      toast.error('Erro ao aprovar conciliação.');
    } finally {
      setLoading(false);
    }
  };

  const [filterMode, setFilterMode] = useState<'TODOS' | 'DIVERGENTE' | 'CORRETO'>('TODOS');

  // Compute counts
  const counts = useMemo(() => {
    let divergente = 0;
    let correto = 0;
    for (const it of items) {
      if (it.contado !== it.sistema) divergente++;
      else correto++;
    }
    return {
      todos: items.length,
      divergente,
      correto,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      const diff = it.contado - it.sistema;
      if (filterMode === 'DIVERGENTE') return diff !== 0;
      if (filterMode === 'CORRETO') return diff === 0;
      return true;
    });
  }, [items, filterMode]);

  const totalDivergenciaFinanceira = items.reduce((acc, it) => {
    const diff = it.contado - it.sistema;
    return acc + diff * it.produto.preco_custo;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Auditoria & Inventário Físico
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Conferência cega por bipagem de código de barras e conciliação de saldos divergentes
          </p>
        </div>

        <button
          onClick={handleApproveReconciliation}
          disabled={loading}
          className="px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Aprovar Ajuste de Estoque</span>
        </button>
      </div>

      {/* Barcode Scanner Bar in High Definition */}
      <div className="p-4 rounded-2xl bg-[#000000] border border-white/[0.16] shadow-lg">
        <form onSubmit={handleBarcodeScan} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full group">
            <Barcode className="w-5 h-5 text-slate-400 group-focus-within:text-emerald-400 absolute left-4 top-3.5 transition-colors duration-200 pointer-events-none" />
            <input
              type="text"
              value={barcodeQuery}
              onChange={(e) => setBarcodeQuery(e.target.value)}
              placeholder="Bipar código de barras (EAN-13) ou digitar SKU e pressionar Enter..."
              className="w-full pl-12 pr-10 py-3 rounded-xl bg-[#000000] border border-white/[0.16] text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all duration-200"
            />
            {barcodeQuery && (
              <button
                type="button"
                onClick={() => setBarcodeQuery('')}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white p-0.5 rounded-full hover:bg-white/[0.1] transition-all active:scale-90"
                title="Limpar busca"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#000000] hover:bg-white/[0.08] border border-white/[0.16] text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-all flex items-center justify-center gap-2 flex-shrink-0 active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>Bipar Item (+1)</span>
          </button>
        </form>
      </div>

      {/* Discrepancy Reconciliation Bento Card */}
      <BentoCard
        title="Balanço & Comparativo de Inventário"
        action={
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#000000] border border-white/[0.16]">
            <button
              onClick={() => setFilterMode('TODOS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 active:scale-95 ${
                filterMode === 'TODOS'
                  ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/25 scale-[1.02]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <span>Todos</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${filterMode === 'TODOS' ? 'bg-black/30 text-white' : 'bg-[#000000] text-slate-300 border border-white/[0.16]'}`}>
                {counts.todos}
              </span>
            </button>

            <button
              onClick={() => setFilterMode('DIVERGENTE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 active:scale-95 ${
                filterMode === 'DIVERGENTE'
                  ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/25 scale-[1.02]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <span>Divergentes</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${filterMode === 'DIVERGENTE' ? 'bg-black/30 text-white' : 'bg-[#000000] text-slate-300 border border-white/[0.16]'}`}>
                {counts.divergente}
              </span>
            </button>

            <button
              onClick={() => setFilterMode('CORRETO')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 active:scale-95 ${
                filterMode === 'CORRETO'
                  ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/25 scale-[1.02]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <span>Bateu 100%</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${filterMode === 'CORRETO' ? 'bg-black/30 text-white' : 'bg-[#000000] text-slate-300 border border-white/[0.16]'}`}>
                {counts.correto}
              </span>
            </button>
          </div>
        }
      >
        <div className="overflow-x-auto table-scrollbar pb-2">
          <table className="w-full text-left min-w-[1050px]">
            <thead className="bg-[#000000] border-b border-white/[0.16]">
              <tr className="text-xs font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                <th className="py-3.5 px-4">Produto</th>
                <th className="py-3.5 px-4">SKU</th>
                <th className="py-3.5 px-4">EAN</th>
                <th className="py-3.5 px-4 text-center">Estoque Sistema</th>
                <th className="py-3.5 px-4 text-center">Contagem Física</th>
                <th className="py-3.5 px-4 text-center">Divergência</th>
                <th className="py-3.5 px-4 text-right">Impacto Financeiro</th>
                <th className="py-3.5 px-4 text-right">Contador Rápido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.14]">
              {filteredItems.map((item, idx) => {
                const diff = item.contado - item.sistema;
                const impact = diff * item.produto.preco_custo;

                return (
                  <tr key={item.produto.id} className="hover:bg-white/[0.04] transition-colors group whitespace-nowrap">
                    <td className="py-3.5 px-4 font-bold text-sm text-white group-hover:text-emerald-400 transition-colors whitespace-nowrap">
                      {item.produto.nome}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap">
                      {item.produto.sku}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-300 whitespace-nowrap">
                      {item.produto.codigo_barras || '—'}
                    </td>

                    <td className="py-3.5 px-4 text-sm font-bold text-slate-200 text-center whitespace-nowrap">
                      {item.sistema} un
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <input
                        type="number"
                        min="0"
                        value={item.contado}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setItems((prev) => {
                            const copy = [...prev];
                            copy[idx].contado = val;
                            return copy;
                          });
                        }}
                        className="w-24 px-3 py-1.5 rounded-xl bg-[#000000] border border-white/[0.16] text-center text-sm text-emerald-400 font-bold focus:border-emerald-500 focus:outline-none"
                      />
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {diff === 0 ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#000000] text-slate-300 border border-white/[0.14] text-xs font-bold whitespace-nowrap">
                          0 (Conforme)
                        </span>
                      ) : diff > 0 ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold whitespace-nowrap">
                          +{diff} un (Sobra)
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 text-xs font-bold whitespace-nowrap">
                          {diff} un (Falta)
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-sm font-bold text-right whitespace-nowrap">
                      <span className={impact < 0 ? 'text-rose-400' : impact > 0 ? 'text-emerald-400' : 'text-slate-400'}>
                        {impact.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleIncrement(idx, -1)}
                          className="w-9 h-9 rounded-xl bg-[#000000] hover:bg-white/[0.08] text-sm font-bold text-white border border-white/[0.16] transition-colors btn-press flex items-center justify-center"
                          title="Subtrair 1"
                        >
                          -1
                        </button>
                        <button
                          onClick={() => handleIncrement(idx, 1)}
                          className="w-9 h-9 rounded-xl bg-[#000000] hover:bg-white/[0.08] text-sm font-bold text-emerald-400 border border-white/[0.16] transition-colors btn-press flex items-center justify-center"
                          title="Somar 1"
                        >
                          +1
                        </button>
                        <button
                          onClick={() => handleIncrement(idx, 5)}
                          className="px-3 h-9 rounded-xl bg-[#000000] hover:bg-white/[0.08] text-xs font-bold text-emerald-400 border border-white/[0.16] transition-colors btn-press flex items-center justify-center"
                          title="Somar 5"
                        >
                          +5
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </BentoCard>
    </div>
  );
};
