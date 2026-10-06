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
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Curva ABC & Pareto
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Classificação inteligente de produtos por impacto de faturamento e giro
          </p>
        </div>
      </div>

      {/* 1. ABC Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Class A Card */}
        <div className="bg-[#000000] border border-emerald-500/30 rounded-2xl p-5 shadow-lg space-y-3 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 to-emerald-400" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Classe A • Alta Relevância
            </span>
            <Badge variant="emerald">80.1% Receita</Badge>
          </div>
          <div className="text-3xl font-bold text-white">
            {classeA.length} Produtos
          </div>
          <div className="pt-2 border-t border-white/[0.16] text-[11px] text-slate-400">
            ✦ Ação: Manter estoque de segurança e recompra prioritária.
          </div>
        </div>

        {/* Class B Card */}
        <div className="bg-[#000000] border border-purple-500/25 rounded-2xl p-5 shadow-lg space-y-3 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 to-purple-400" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
              Classe B • Giro Médio
            </span>
            <Badge variant="purple">15.0% Receita</Badge>
          </div>
          <div className="text-3xl font-bold text-white">
            {classeB.length} Produtos
          </div>
          <div className="pt-2 border-t border-white/[0.16] text-[11px] text-slate-400">
            ✦ Ação: Acompanhamento quinzenal e reposição sob demanda.
          </div>
        </div>

        {/* Class C Card */}
        <div className="bg-[#000000] border border-amber-500/25 rounded-2xl p-5 shadow-lg space-y-3 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 to-amber-400" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Classe C • Baixo Giro
            </span>
            <Badge variant="amber">4.9% Receita</Badge>
          </div>
          <div className="text-3xl font-bold text-white">
            {classeC.length} Produtos
          </div>
          <div className="pt-2 border-t border-white/[0.16] text-[11px] text-amber-400">
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
                  <span className="w-6 h-6 rounded-full bg-[#000000] text-emerald-400 border border-white/[0.16] flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-sm md:text-base text-white truncate">{item.nome}</span>
                  <Badge variant={item.classe === 'A' ? 'emerald' : item.classe === 'B' ? 'purple' : 'amber'}>
                    Classe {item.classe}
                  </Badge>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-emerald-400 font-bold text-sm md:text-base">
                    R$ {item.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-slate-300 font-bold text-sm w-14 text-right">
                    {item.percentual_acumulado}%
                  </span>
                </div>
              </div>

              <div className="w-full h-3 rounded-full bg-[#000000] border border-white/[0.16] overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    item.classe === 'A'
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                      : item.classe === 'B'
                      ? 'bg-gradient-to-r from-purple-600 to-purple-400'
                      : 'bg-gradient-to-r from-amber-600 to-amber-400'
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
            <thead className="bg-[#000000] border-b border-white/[0.16]">
              <tr className="text-xs font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                <th className="py-3.5 px-4">Produto</th>
                <th className="py-3.5 px-4">SKU</th>
                <th className="py-3.5 px-4 text-center">Classe</th>
                <th className="py-3.5 px-4">Faturamento</th>
                <th className="py-3.5 px-4">Giro Médio</th>
                <th className="py-3.5 px-4">Estoque Atual</th>
                <th className="py-3.5 px-4 text-right">Ação Recomendada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.14]">
              {curvaItems.map((item) => (
                <tr key={item.produto_id} className="hover:bg-white/[0.04] transition-colors group whitespace-nowrap">
                  <td className="py-3.5 px-4 font-bold text-sm text-white group-hover:text-emerald-400 transition-colors whitespace-nowrap">
                    {item.nome}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap">
                    {item.sku}
                  </td>
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <Badge variant={item.classe === 'A' ? 'emerald' : item.classe === 'B' ? 'purple' : 'amber'}>
                      Classe {item.classe}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-sm font-bold text-emerald-400 whitespace-nowrap">
                    {item.faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-semibold text-slate-300 whitespace-nowrap">
                    {item.giro_dias || 25} dias
                  </td>
                  <td className="py-3.5 px-4 text-sm font-bold text-white whitespace-nowrap">
                    {item.estoque_atual ?? 12} un
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    {item.classe === 'A' ? (
                      <button
                        onClick={() => handleAction(item, 'Emitir Pedido de Compra')}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all btn-press whitespace-nowrap"
                      >
                        Comprar com Fornecedor
                      </button>
                    ) : item.classe === 'B' ? (
                      <button
                        onClick={() => handleAction(item, 'Acompanhar Giro')}
                        className="px-4 py-2 rounded-xl bg-[#000000] hover:bg-white/[0.08] text-slate-200 hover:text-white border border-white/[0.16] text-xs font-bold transition-all btn-press"
                      >
                        Monitorar Giro
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAction(item, 'Criar Promoção de Queima')}
                        className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all btn-press"
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
