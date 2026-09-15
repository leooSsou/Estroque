import React, { useState, useEffect } from 'react';
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

  const totalDivergenciaFinanceira = items.reduce((acc, it) => {
    const diff = it.contado - it.sistema;
    return acc + diff * it.produto.preco_custo;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F3FBF6] tracking-tight">
            Auditoria & Inventário Físico
          </h1>
        </div>

        <button
          onClick={handleApproveReconciliation}
          disabled={loading}
          className="px-6 py-2.5 rounded-full bg-[#10B981] hover:bg-[#059669] text-[#070E0D] font-bold text-xs shadow-glow-emerald transition-all flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Aprovar Ajuste de Estoque</span>
        </button>
      </div>

      {/* Barcode Scanner Bar */}
      <div className="p-4 rounded-3xl bg-[#0D1917] border border-[rgba(142,182,155,0.18)] shadow-bento-dark">
        <form onSubmit={handleBarcodeScan} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Barcode className="w-5 h-5 text-[#10B981] absolute left-3.5 top-3" />
            <input
              type="text"
              value={barcodeQuery}
              onChange={(e) => setBarcodeQuery(e.target.value)}
              placeholder="Bipar código de barras (EAN-13) ou digitar SKU e pressionar Enter..."
              className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-[#070E0D] border border-[rgba(142,182,155,0.18)] text-sm font-mono text-[#F3FBF6] placeholder-[#5E756B] focus:border-[#10B981] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#142522] hover:bg-[#163832] border border-[#10B981]/30 text-xs font-semibold text-[#10B981] transition-all flex items-center justify-center gap-2 flex-shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>Bipar Item (+1)</span>
          </button>
        </form>
      </div>

      {/* Discrepancy Reconciliation Bento Card */}
      <BentoCard
        title="Balanço & Comparativo de Inventário"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[rgba(142,182,155,0.14)] text-[#94A89E]">
                <th className="py-3 px-3 font-semibold">Produto / SKU</th>
                <th className="py-3 px-3 font-semibold">Estoque Sistema</th>
                <th className="py-3 px-3 font-semibold">Estoque Contado</th>
                <th className="py-3 px-3 font-semibold">Divergência</th>
                <th className="py-3 px-3 font-semibold">Impacto Financeiro</th>
                <th className="py-3 px-3 font-semibold text-right">Contador Rápido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(142,182,155,0.06)]">
              {items.map((item, idx) => {
                const diff = item.contado - item.sistema;
                const impact = diff * item.produto.preco_custo;

                return (
                  <tr key={item.produto.id} className="hover:bg-[#142522]/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-[#F3FBF6]">{item.produto.nome}</div>
                      <div className="text-[10px] text-[#94A89E] font-mono">
                        SKU: {item.produto.sku} • EAN: {item.produto.codigo_barras || 'N/A'}
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono text-[#94A89E]">
                      {item.sistema} un
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-[#F3FBF6]">
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
                        className="w-20 px-2 py-1 rounded-lg bg-[#070E0D] border border-[rgba(142,182,155,0.18)] font-mono text-center text-[#10B981] font-bold focus:outline-none"
                      />
                    </td>

                    <td className="py-3 px-3 font-mono font-bold">
                      {diff === 0 ? (
                        <span className="text-[#8EB69B]">0 (Exato)</span>
                      ) : diff > 0 ? (
                        <span className="text-[#10B981]">+{diff} un (Sobra)</span>
                      ) : (
                        <span className="text-red-400">{diff} un (Falta)</span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-mono font-bold">
                      <span className={impact < 0 ? 'text-red-400' : impact > 0 ? 'text-[#10B981]' : 'text-[#94A89E]'}>
                        R$ {impact.toFixed(2)}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleIncrement(idx, -1)}
                          className="w-7 h-7 rounded-lg bg-[#142522] hover:bg-[#163832] text-xs font-bold text-[#F3FBF6] transition-colors"
                        >
                          -1
                        </button>
                        <button
                          onClick={() => handleIncrement(idx, 1)}
                          className="w-7 h-7 rounded-lg bg-[#142522] hover:bg-[#163832] text-xs font-bold text-[#10B981] transition-colors"
                        >
                          +1
                        </button>
                        <button
                          onClick={() => handleIncrement(idx, 5)}
                          className="px-2 h-7 rounded-lg bg-[#142522] hover:bg-[#163832] text-xs font-semibold text-[#8EB69B] transition-colors"
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
