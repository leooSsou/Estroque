import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { CurvaABCItem } from '../types';
import { BentoCard } from '../components/common/BentoCard';
import { Badge } from '../components/common/Badge';
import {
  BarChart3,
  TrendingUp,
  Sparkles,
  ShoppingBag,
  Percent,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

export const Analytics: React.FC = () => {
  const { activeLoja } = useAuth();
  const { toast } = useToast();
  const [curvaItems, setCurvaItems] = useState<CurvaABCItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await api.getCurvaABC(activeLoja?.id);
        setCurvaItems(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeLoja]);

  const classeA = curvaItems.filter((i) => i.classe === 'A');
  const classeB = curvaItems.filter((i) => i.classe === 'B');
  const classeC = curvaItems.filter((i) => i.classe === 'C');

  const handleAction = (item: CurvaABCItem, action: string) => {
    toast.info(`Ação disparada para ${item.nome}: "${action}"`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F3FBF6] tracking-tight">
            Curva ABC & Pareto
          </h1>
        </div>
      </div>

      {/* 1. ABC Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Class A Card */}
        <div className="bg-gradient-to-br from-[#0B2B26] to-[#0D1917] border border-[#10B981]/30 rounded-3xl p-5 shadow-bento-dark space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#10B981] uppercase tracking-wider font-mono">
              Classe A • Alta Relevância
            </span>
            <Badge variant="emerald">80.1% Receita</Badge>
          </div>
          <div className="text-3xl font-extrabold text-[#F3FBF6] font-mono">
            {classeA.length} Produtos
          </div>
          <div className="pt-2 border-t border-[rgba(142,182,155,0.1)] text-[11px] text-[#DAF1DE]">
            ✦ Ação: Manter estoque de segurança e recompra prioritária.
          </div>
        </div>

        {/* Class B Card */}
        <div className="bg-gradient-to-br from-[#163832] to-[#0D1917] border border-[rgba(142,182,155,0.2)] rounded-3xl p-5 shadow-bento-dark space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8EB69B] uppercase tracking-wider font-mono">
              Classe B • Giro Médio
            </span>
            <Badge variant="sage">15.0% Receita</Badge>
          </div>
          <div className="text-3xl font-extrabold text-[#F3FBF6] font-mono">
            {classeB.length} Produtos
          </div>
          <div className="pt-2 border-t border-[rgba(142,182,155,0.1)] text-[11px] text-[#8EB69B]">
            ✦ Ação: Acompanhamento quinzenal e reposição sob demanda.
          </div>
        </div>

        {/* Class C Card */}
        <div className="bg-gradient-to-br from-[#142522] to-[#070E0D] border border-[rgba(142,182,155,0.12)] rounded-3xl p-5 shadow-bento-dark space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#5E756B] uppercase tracking-wider font-mono">
              Classe C • Baixo Giro
            </span>
            <Badge variant="neutral">4.9% Receita</Badge>
          </div>
          <div className="text-3xl font-extrabold text-[#F3FBF6] font-mono">
            {classeC.length} Produtos
          </div>
          <div className="pt-2 border-t border-[rgba(142,182,155,0.1)] text-[11px] text-amber-300">
            ✦ Ação: Avaliar liquidação ou redução de lote para liberar capital.
          </div>
        </div>
      </div>

      {/* 2. Cumulative Pareto Curve Visualization */}
      <BentoCard
        title="Curva Acumulada de Pareto"
      >
        <div className="space-y-4 pt-2">
          {curvaItems.map((item, idx) => (
            <div key={item.produto_id} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2.5 truncate max-w-lg">
                  <span className="w-6 h-6 rounded-full bg-[#142522] text-[#10B981] border border-[rgba(142,182,155,0.25)] flex items-center justify-center font-mono font-extrabold text-xs flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-sm md:text-base text-[#F3FBF6] truncate">{item.nome}</span>
                  <Badge variant={item.classe === 'A' ? 'emerald' : item.classe === 'B' ? 'sage' : 'neutral'}>
                    Classe {item.classe}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 font-mono">
                  <span className="text-[#10B981] font-bold text-sm md:text-base">
                    R$ {item.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[#DAF1DE] font-extrabold text-sm w-14 text-right">
                    {item.percentual_acumulado}%
                  </span>
                </div>
              </div>

              <div className="w-full h-3.5 rounded-full bg-[#070E0D] border border-[rgba(142,182,155,0.1)] overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    item.classe === 'A'
                      ? 'bg-gradient-to-r from-[#059669] to-[#10B981]'
                      : item.classe === 'B'
                      ? 'bg-gradient-to-r from-[#163832] to-[#8EB69B]'
                      : 'bg-[#5E756B]'
                  }`}
                  style={{ width: `${item.percentual_acumulado}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </BentoCard>

      {/* 3. Action Triggers Table */}
      <BentoCard
        title="Recomendações de Giro & Estoque"
      >
        <div className="overflow-x-auto table-scrollbar pb-2">
          <table className="w-full text-left min-w-[960px]">
            <thead className="bg-[#0A1614] border-b border-[rgba(142,182,155,0.18)]">
              <tr className="text-xs font-bold uppercase tracking-wider text-[#A2B89B]">
                <th className="py-4 px-4">Produto</th>
                <th className="py-4 px-4 text-center">Classe</th>
                <th className="py-4 px-4">Faturamento</th>
                <th className="py-4 px-4">Giro Médio</th>
                <th className="py-4 px-4">Estoque Atual</th>
                <th className="py-4 px-4 text-right">Ação Recomendada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(142,182,155,0.08)]">
              {curvaItems.map((item) => (
                <tr key={item.produto_id} className="hover:bg-[#142522]/50 transition-colors group">
                  <td className="py-4 px-4">
                    <div className="font-bold text-sm md:text-base text-[#F3FBF6] group-hover:text-[#10B981] transition-colors">
                      {item.nome}
                    </div>
                    <div className="text-xs text-[#A2B89B] font-mono mt-0.5">SKU: {item.sku}</div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <Badge variant={item.classe === 'A' ? 'emerald' : item.classe === 'B' ? 'sage' : 'neutral'}>
                      Classe {item.classe}
                    </Badge>
                  </td>
                  <td className="py-4 px-4 font-mono text-base font-extrabold text-[#10B981]">
                    R$ {item.faturamento.toFixed(2)}
                  </td>
                  <td className="py-4 px-4 font-mono text-sm font-semibold text-[#DAF1DE]">
                    {item.giro_dias || 25} dias
                  </td>
                  <td className="py-4 px-4 font-mono text-base font-bold text-[#F3FBF6]">
                    {item.estoque_atual ?? 12} un
                  </td>
                  <td className="py-4 px-4 text-right">
                    {item.classe === 'A' ? (
                      <button
                        onClick={() => handleAction(item, 'Emitir Pedido de Compra')}
                        className="px-4 py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-[#070E0D] font-bold text-xs shadow-glow-emerald transition-all btn-press"
                      >
                        Comprar com Fornecedor
                      </button>
                    ) : item.classe === 'B' ? (
                      <button
                        onClick={() => handleAction(item, 'Acompanhar Giro')}
                        className="px-4 py-2 rounded-xl bg-[#142522] hover:bg-[#163832] text-[#DAF1DE] hover:text-white border border-[rgba(142,182,155,0.25)] text-xs font-bold transition-all btn-press"
                      >
                        Monitorar Giro
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAction(item, 'Criar Promoção de Queima')}
                        className="px-4 py-2 rounded-xl bg-[#2B2312] hover:bg-amber-900/60 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all btn-press"
                      >
                        Criar Desconto / Promoção
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </BentoCard>
    </div>
  );
};
