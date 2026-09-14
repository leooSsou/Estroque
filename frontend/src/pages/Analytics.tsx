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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#F3FBF6] tracking-tight">
              Curva ABC (Pareto 80/15/5) & Diagnóstico
            </h1>
            <Badge variant="mint">Inteligência de Varejo</Badge>
          </div>
          <p className="text-xs text-[#94A89E] mt-1">
            Classificação matemática de produtos por contribuição de receita e velocidade de giro de estoque.
          </p>
        </div>
      </div>

      {/* 1. ABC Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Class A Card */}
        <div className="bg-gradient-to-br from-[#0B2B26] to-[#0D1917] border border-[#10B981]/30 rounded-3xl p-5 shadow-bento-dark space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#10B981] uppercase tracking-wider font-mono">
              Classe A • Vital
            </span>
            <Badge variant="emerald">80.1% Receita</Badge>
          </div>
          <div className="text-3xl font-extrabold text-[#F3FBF6] font-mono">
            {classeA.length} Produtos
          </div>
          <p className="text-xs text-[#94A89E]">
            Gera mais de 80% do faturamento da rede. Ruptura de estoque nestes itens acarreta perda grave de receita.
          </p>
          <div className="pt-2 border-t border-[rgba(142,182,155,0.1)] text-[11px] text-[#DAF1DE]">
            ✦ Ação: Manter estoque de segurança e recompra automática semanal.
          </div>
        </div>

        {/* Class B Card */}
        <div className="bg-gradient-to-br from-[#163832] to-[#0D1917] border border-[rgba(142,182,155,0.2)] rounded-3xl p-5 shadow-bento-dark space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8EB69B] uppercase tracking-wider font-mono">
              Classe B • Moderado
            </span>
            <Badge variant="sage">15.0% Receita</Badge>
          </div>
          <div className="text-3xl font-extrabold text-[#F3FBF6] font-mono">
            {classeB.length} Produtos
          </div>
          <p className="text-xs text-[#94A89E]">
            Giro moderado e fluxo equilibrado. Representa itens de conveniência ou margem média.
          </p>
          <div className="pt-2 border-t border-[rgba(142,182,155,0.1)] text-[11px] text-[#8EB69B]">
            ✦ Ação: Acompanhar giro quinzenal e evitar compras excedentes.
          </div>
        </div>

        {/* Class C Card */}
        <div className="bg-gradient-to-br from-[#142522] to-[#070E0D] border border-[rgba(142,182,155,0.12)] rounded-3xl p-5 shadow-bento-dark space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#5E756B] uppercase tracking-wider font-mono">
              Classe C • Cauda Longa
            </span>
            <Badge variant="neutral">4.9% Receita</Badge>
          </div>
          <div className="text-3xl font-extrabold text-[#F3FBF6] font-mono">
            {classeC.length} Produtos
          </div>
          <p className="text-xs text-[#94A89E]">
            Mais de 50% do catálogo gerando menos de 5% da receita líquida. Capital imobilizado.
          </p>
          <div className="pt-2 border-t border-[rgba(142,182,155,0.1)] text-[11px] text-amber-300">
            ✦ Ação: Criar promoções para desovar estoque parado e liberar caixa.
          </div>
        </div>
      </div>

      {/* 2. Cumulative Pareto Curve Visualization */}
      <BentoCard
        title="Curva Acumulada de Pareto"
        subtitle="Progressão do faturamento acumulado por ordem decrescente de receita"
      >
        <div className="space-y-3 pt-2">
          {curvaItems.map((item, idx) => (
            <div key={item.produto_id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate max-w-md">
                  <span className="w-5 h-5 rounded-full bg-[#142522] text-[#10B981] flex items-center justify-center font-mono font-bold text-[10px]">
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-[#F3FBF6] truncate">{item.nome}</span>
                  <Badge variant={item.classe === 'A' ? 'emerald' : item.classe === 'B' ? 'sage' : 'neutral'}>
                    Classe {item.classe}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 font-mono">
                  <span className="text-[#DAF1DE]">
                    R$ {item.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[#8EB69B] w-12 text-right">
                    {item.percentual_acumulado}%
                  </span>
                </div>
              </div>

              <div className="w-full h-2 rounded-full bg-[#070E0D] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    item.classe === 'A'
                      ? 'bg-[#10B981]'
                      : item.classe === 'B'
                      ? 'bg-[#8EB69B]'
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
        title="Gatilhos de Decisão & Recomendações Automáticas"
        subtitle="Ações sugeridas com base no giro de estoque e classe Pareto"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[rgba(142,182,155,0.14)] text-[#94A89E]">
                <th className="py-3 px-3 font-semibold">Produto</th>
                <th className="py-3 px-3 font-semibold">Classe</th>
                <th className="py-3 px-3 font-semibold">Faturamento</th>
                <th className="py-3 px-3 font-semibold">Giro Médio</th>
                <th className="py-3 px-3 font-semibold">Estoque Atual</th>
                <th className="py-3 px-3 font-semibold text-right">Ação Recomendada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(142,182,155,0.06)]">
              {curvaItems.map((item) => (
                <tr key={item.produto_id} className="hover:bg-[#142522]/40 transition-colors">
                  <td className="py-3.5 px-3">
                    <div className="font-semibold text-[#F3FBF6]">{item.nome}</div>
                    <div className="text-[10px] text-[#94A89E] font-mono">SKU: {item.sku}</div>
                  </td>
                  <td className="py-3.5 px-3">
                    <Badge variant={item.classe === 'A' ? 'emerald' : item.classe === 'B' ? 'sage' : 'neutral'}>
                      Classe {item.classe}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-3 font-mono font-bold text-[#10B981]">
                    R$ {item.faturamento.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-[#DAF1DE]">
                    {item.giro_dias || 25} dias
                  </td>
                  <td className="py-3.5 px-3 font-mono font-bold text-[#F3FBF6]">
                    {item.estoque_atual ?? 12} un
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    {item.classe === 'A' ? (
                      <button
                        onClick={() => handleAction(item, 'Emitir Pedido de Compra')}
                        className="px-3 py-1 rounded-full bg-[#10B981] hover:bg-[#059669] text-[#070E0D] font-bold text-[11px] shadow-glow-emerald transition-all"
                      >
                        Comprar com Fornecedor
                      </button>
                    ) : item.classe === 'B' ? (
                      <button
                        onClick={() => handleAction(item, 'Acompanhar Giro')}
                        className="px-3 py-1 rounded-full bg-[#142522] hover:bg-[#163832] text-[#DAF1DE] border border-[rgba(142,182,155,0.2)] text-[11px] font-semibold transition-all"
                      >
                        Monitorar Giro
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAction(item, 'Criar Promoção de Queima')}
                        className="px-3 py-1 rounded-full bg-[#2B2312] hover:bg-amber-900/60 text-amber-300 border border-amber-500/30 text-[11px] font-semibold transition-all"
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
