import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DashboardAnalytics, MovimentacaoEstoque } from '../types';
import { BentoCard } from '../components/common/BentoCard';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import {
  DollarSign,
  Receipt,
  AlertTriangle,
  TrendingUp,
  PlusCircle,
  FileSpreadsheet,
  ArrowLeftRight,
  ClipboardCheck,
  ArrowDownRight,
  ArrowUpRight,
  Store,
  Layers,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { activeLoja } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardAnalytics | null>(null);
  const [recentMovements, setRecentMovements] = useState<MovimentacaoEstoque[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [dashData, ledgerData] = await Promise.all([
          api.getDashboardAnalytics(activeLoja?.id),
          api.getLedger(),
        ]);
        setMetrics(dashData);
        setRecentMovements(ledgerData.slice(0, 5));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeLoja]);

  return (
    <div className="space-y-6">
      {/* 1. Top-Left Featured Action Card (Deep Emerald #0B2B26) */}
      <div className="bg-gradient-to-r from-[#0B2B26] via-[#163832] to-[#0D1917] border border-[rgba(142,182,155,0.22)] rounded-3xl p-6 lg:p-8 shadow-bento-dark relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.15),transparent_70%)] pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#8EB69B] uppercase tracking-wider mb-2">
              <Store className="w-4 h-4 text-[#10B981]" />
              <span>Visão Consolidada • {activeLoja?.nome || 'Rede Inteira'}</span>
            </div>
            <div className="text-3xl lg:text-4xl font-extrabold text-[#F3FBF6] font-mono tracking-tight">
              R$ {(metrics?.faturamento_liquido || 82300).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* 4 Quick Action Pill Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => navigate('/pdv')}
              className="px-4 py-2.5 rounded-full bg-[#10B981] hover:bg-[#059669] text-[#070E0D] font-bold text-xs shadow-glow-emerald btn-press hover-lift flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Nova Venda (PDV)</span>
            </button>

            <button
              onClick={() => navigate('/nfe')}
              className="px-4 py-2.5 rounded-full bg-[#142522] hover:bg-[#163832] border border-[rgba(142,182,155,0.25)] hover:border-[#10B981]/40 text-[#DAF1DE] font-semibold text-xs btn-press hover-lift flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#10B981]" />
              <span>Importar XML NF-e</span>
            </button>

            <button
              onClick={() => navigate('/transferencias')}
              className="px-4 py-2.5 rounded-full bg-[#142522] hover:bg-[#163832] border border-[rgba(142,182,155,0.25)] hover:border-[#10B981]/40 text-[#DAF1DE] font-semibold text-xs btn-press hover-lift flex items-center gap-2"
            >
              <ArrowLeftRight className="w-4 h-4 text-[#8EB69B]" />
              <span>Transferir Estoque</span>
            </button>

            <button
              onClick={() => navigate('/ledger')}
              className="px-4 py-2.5 rounded-full bg-[#142522] hover:bg-[#163832] border border-[rgba(142,182,155,0.25)] hover:border-[#10B981]/40 text-[#DAF1DE] font-semibold text-xs btn-press hover-lift flex items-center gap-2"
            >
              <ClipboardCheck className="w-4 h-4 text-[#8EB69B]" />
              <span>Auditoria Física</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Faturamento Mensal"
          value={`R$ ${(metrics?.faturamento_liquido || 82300).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          badge={{ text: '+12.4%', trend: 'up' }}
          subtitle="vs. mês anterior"
        />
        <StatCard
          title="Ticket Médio"
          value={`R$ ${(metrics?.ticket_medio || 310.5).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={Receipt}
          badge={{ text: '+5.2%', trend: 'up' }}
          subtitle="265 transações"
        />
        <StatCard
          title="Rupturas de Estoque"
          value={`${metrics?.ruptura_count ?? 1} itens`}
          icon={AlertTriangle}
          badge={{ text: 'Atenção Crítica', trend: 'warning' }}
        />
        <StatCard
          title="Margem de Lucro"
          value={`${metrics?.margem_lucro ?? 43.8}%`}
          icon={TrendingUp}
          badge={{ text: 'Saudável', trend: 'up' }}
        />
      </div>

      {/* 3. Central Grid: Cash Flow Dual-Tone Chart & ABC Curve Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Central Chart: Dual-Tone Bar Visualization */}
        <BentoCard
          className="lg:col-span-2"
          title="Fluxo de Caixa"
          action={
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[11px] text-[#10B981] font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" /> Faturamento
              </span>
              <span className="flex items-center gap-1 text-[11px] text-[#8EB69B] font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-[#8EB69B]" /> Despesas
              </span>
            </div>
          }
        >
          <div className="h-64 flex items-end justify-between gap-3 pt-6 px-2">
            {[
              { month: 'Jan', revenue: 65, expense: 42 },
              { month: 'Fev', revenue: 72, expense: 48 },
              { month: 'Mar', revenue: 68, expense: 40 },
              { month: 'Abr', revenue: 84, expense: 52 },
              { month: 'Mai', revenue: 78, expense: 49 },
              { month: 'Jun', revenue: 92, expense: 58 },
            ].map((bar, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <div className="w-full max-w-[48px] flex items-end justify-center gap-1 h-full">
                  {/* Revenue Bar */}
                  <div
                    style={{ height: `${bar.revenue}%` }}
                    className="w-1/2 bg-gradient-to-t from-[#0B2B26] to-[#10B981] rounded-t-md transition-all group-hover:brightness-125 relative"
                  >
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-[#1B332E] px-1.5 py-0.5 rounded text-[10px] text-[#F3FBF6] whitespace-nowrap border border-[rgba(142,182,155,0.2)] font-mono">
                      R$ {bar.revenue * 1000}
                    </div>
                  </div>
                  {/* Expense Bar */}
                  <div
                    style={{ height: `${bar.expense}%` }}
                    className="w-1/2 bg-[#8EB69B]/60 rounded-t-md transition-all group-hover:bg-[#8EB69B]"
                  />
                </div>
                <span className="text-xs font-mono text-[#94A89E]">{bar.month}</span>
              </div>
            ))}
          </div>
        </BentoCard>

        {/* ABC Curve Donut / Distribution */}
        <BentoCard
          title="Curva ABC"
          action={
            <button
              onClick={() => navigate('/analytics')}
              className="text-xs text-[#10B981] hover:underline font-semibold"
            >
              Ver Detalhes →
            </button>
          }
        >
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-2xl bg-[#070E0D] border border-[rgba(142,182,155,0.12)] space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-[#10B981]">Classe A</span>
                  <span className="font-mono text-[#F3FBF6]">80.1%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#142522] overflow-hidden">
                  <div className="h-full bg-[#10B981] rounded-full" style={{ width: '80.1%' }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-[#8EB69B]">Classe B</span>
                  <span className="font-mono text-[#F3FBF6]">15.0%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#142522] overflow-hidden">
                  <div className="h-full bg-[#8EB69B]" style={{ width: '15.0%' }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-[#5E756B]">Classe C</span>
                  <span className="font-mono text-[#F3FBF6]">4.9%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#142522] overflow-hidden">
                  <div className="h-full bg-[#5E756B]" style={{ width: '4.9%' }} />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#142522]/50 border border-[rgba(142,182,155,0.14)] text-xs">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#10B981]" />
                <span className="text-[#DAF1DE]">Diagnóstico Automatizado</span>
              </div>
              <span className="text-[#94A89E]">1 ruptura pendente</span>
            </div>
          </div>
        </BentoCard>
      </div>

      {/* 4. Live Ledger Feed Card */}
      <BentoCard
        title={
          <span className="flex items-center gap-2.5">
            <span>Histórico de Auditoria</span>
            <span className="flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              Ao Vivo
            </span>
          </span>
        }
        action={
          <button
            onClick={() => navigate('/ledger')}
            className="text-xs text-[#10B981] hover:underline font-semibold btn-press"
          >
            Acessar Completo →
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[rgba(142,182,155,0.12)] text-[#94A89E]">
                <th className="py-2.5 px-3 font-semibold">Data & Hora</th>
                <th className="py-2.5 px-3 font-semibold">Tipo</th>
                <th className="py-2.5 px-3 font-semibold">Quantidade</th>
                <th className="py-2.5 px-3 font-semibold">Motivo / Operação</th>
                <th className="py-2.5 px-3 font-semibold">Responsável</th>
                <th className="py-2.5 px-3 font-semibold">Saldo Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(142,182,155,0.06)]">
              {recentMovements.map((mov) => (
                <tr key={mov.id} className="table-row-hover">
                  <td className="py-3 px-3 font-mono text-[#94A89E]">
                    {new Date(mov.data_movimentacao).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-3 px-3">
                    <Badge variant={mov.tipo === 'ENTRADA' ? 'mint' : 'danger'}>
                      {mov.tipo === 'ENTRADA' ? (
                        <span className="flex items-center gap-1">
                          <ArrowDownRight className="w-3 h-3 text-[#10B981]" /> ENTRADA
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <ArrowUpRight className="w-3 h-3 text-red-400" /> SAÍDA
                        </span>
                      )}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-[#F3FBF6]">
                    {mov.tipo === 'ENTRADA' ? `+${mov.quantidade}` : `-${mov.quantidade}`}
                  </td>
                  <td className="py-3 px-3 text-[#F3FBF6]">{mov.motivo}</td>
                  <td className="py-3 px-3 text-[#94A89E]">{mov.responsavel || 'Operador'}</td>
                  <td className="py-3 px-3 font-mono font-semibold text-[#10B981]">
                    {mov.saldo_resultante ?? '—'} un
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
