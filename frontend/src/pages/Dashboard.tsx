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
              className="relative group overflow-hidden px-4 py-2.5 rounded-full bg-[#10B981] hover:bg-[#059669] text-[#070E0D] font-extrabold text-xs shadow-glow-emerald hover:shadow-[0_0_24px_rgba(16,185,129,0.5)] transition-all duration-200 flex items-center gap-2 active:scale-95 cursor-pointer select-none"
            >
              <span className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
              <PlusCircle className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
              <span>Nova Venda (PDV)</span>
            </button>

            <button
              onClick={() => navigate('/nfe')}
              className="group px-4 py-2.5 rounded-full bg-[#142522] hover:bg-[#163832] border border-[rgba(142,182,155,0.25)] hover:border-[#10B981]/50 text-[#DAF1DE] hover:text-white font-semibold text-xs active:scale-95 cursor-pointer select-none transition-all duration-200 flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#10B981] group-hover:scale-110 transition-transform duration-200" />
              <span>Importar XML NF-e</span>
            </button>

            <button
              onClick={() => navigate('/transferencias')}
              className="group px-4 py-2.5 rounded-full bg-[#142522] hover:bg-[#163832] border border-[rgba(142,182,155,0.25)] hover:border-[#10B981]/50 text-[#DAF1DE] hover:text-white font-semibold text-xs active:scale-95 cursor-pointer select-none transition-all duration-200 flex items-center gap-2"
            >
              <ArrowLeftRight className="w-4 h-4 text-[#8EB69B] group-hover:text-[#10B981] group-hover:rotate-180 transition-transform duration-300" />
              <span>Transferir Estoque</span>
            </button>

            <button
              onClick={() => navigate('/ledger')}
              className="group px-4 py-2.5 rounded-full bg-[#142522] hover:bg-[#163832] border border-[rgba(142,182,155,0.25)] hover:border-[#10B981]/50 text-[#DAF1DE] hover:text-white font-semibold text-xs active:scale-95 cursor-pointer select-none transition-all duration-200 flex items-center gap-2"
            >
              <ClipboardCheck className="w-4 h-4 text-[#8EB69B] group-hover:text-[#10B981] group-hover:scale-110 transition-transform duration-200" />
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
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-xs font-bold text-[#10B981] font-mono">
                <span className="w-3 h-3 rounded-full bg-[#10B981]" /> Faturamento
              </span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-[#8EB69B] font-mono">
                <span className="w-3 h-3 rounded-full bg-[#8EB69B]" /> Despesas
              </span>
            </div>
          }
        >
          <div className="h-72 flex items-end justify-between gap-3 pt-6 px-2">
            {[
              { month: 'Jan', revenue: 65, expense: 42 },
              { month: 'Fev', revenue: 72, expense: 48 },
              { month: 'Mar', revenue: 68, expense: 40 },
              { month: 'Abr', revenue: 84, expense: 52 },
              { month: 'Mai', revenue: 78, expense: 49 },
              { month: 'Jun', revenue: 92, expense: 58 },
            ].map((bar, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2.5 h-full justify-end group">
                <div className="w-full max-w-[56px] flex items-end justify-center gap-1.5 h-full">
                  {/* Revenue Bar */}
                  <div
                    style={{ height: `${bar.revenue}%` }}
                    className="w-1/2 bg-gradient-to-t from-[#0B2B26] to-[#10B981] rounded-t-lg transition-all group-hover:brightness-125 relative shadow-sm"
                  >
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-[#1B332E] px-2 py-1 rounded-lg text-xs text-[#F3FBF6] whitespace-nowrap border border-[rgba(142,182,155,0.25)] font-mono font-bold z-10 shadow-lg pointer-events-none">
                      R$ {bar.revenue * 1000}
                    </div>
                  </div>
                  {/* Expense Bar */}
                  <div
                    style={{ height: `${bar.expense}%` }}
                    className="w-1/2 bg-[#8EB69B]/60 rounded-t-lg transition-all group-hover:bg-[#8EB69B]"
                  />
                </div>
                <span className="text-xs md:text-sm font-bold font-mono text-[#DAF1DE]">{bar.month}</span>
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
              className="text-xs text-[#10B981] hover:underline font-bold"
            >
              Ver Detalhes →
            </button>
          }
        >
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-2xl bg-[#070E0D] border border-[rgba(142,182,155,0.14)] space-y-3.5">
              <div>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="font-bold text-[#10B981]">Classe A</span>
                  <span className="font-mono font-extrabold text-[#F3FBF6]">80.1%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-[#142522] overflow-hidden p-0.5">
                  <div className="h-full bg-gradient-to-r from-[#059669] to-[#10B981] rounded-full" style={{ width: '80.1%' }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="font-bold text-[#8EB69B]">Classe B</span>
                  <span className="font-mono font-extrabold text-[#F3FBF6]">15.0%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-[#142522] overflow-hidden p-0.5">
                  <div className="h-full bg-gradient-to-r from-[#163832] to-[#8EB69B] rounded-full" style={{ width: '15.0%' }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="font-bold text-[#5E756B]">Classe C</span>
                  <span className="font-mono font-extrabold text-[#F3FBF6]">4.9%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-[#142522] overflow-hidden p-0.5">
                  <div className="h-full bg-[#5E756B] rounded-full" style={{ width: '4.9%' }} />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#142522]/50 border border-[rgba(142,182,155,0.16)] text-xs md:text-sm">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#10B981]" />
                <span className="text-[#DAF1DE] font-semibold">Diagnóstico Automatizado</span>
              </div>
              <span className="text-amber-400 font-bold font-mono">1 ruptura pendente</span>
            </div>
          </div>
        </BentoCard>
      </div>

      {/* 4. Live Ledger Feed Card */}
      <BentoCard
        title={
          <span className="flex items-center gap-2.5">
            <span>Histórico de Auditoria</span>
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 font-mono font-bold">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              Ao Vivo
            </span>
          </span>
        }
        action={
          <button
            onClick={() => navigate('/ledger')}
            className="text-xs text-[#10B981] hover:underline font-bold btn-press"
          >
            Acessar Completo →
          </button>
        }
      >
        <div className="overflow-x-auto table-scrollbar pb-2">
          <table className="w-full text-left min-w-[850px]">
            <thead className="bg-[#0A1614] border-b border-[rgba(142,182,155,0.18)]">
              <tr className="text-xs font-bold uppercase tracking-wider text-[#A2B89B]">
                <th className="py-3.5 px-4">Data & Hora</th>
                <th className="py-3.5 px-4 text-center">Tipo</th>
                <th className="py-3.5 px-4">Quantidade</th>
                <th className="py-3.5 px-4">Motivo / Operação</th>
                <th className="py-3.5 px-4">Responsável</th>
                <th className="py-3.5 px-4 text-right">Saldo Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(142,182,155,0.08)]">
              {recentMovements.map((mov) => (
                <tr key={mov.id} className="hover:bg-[#142522]/50 transition-colors group">
                  <td className="py-3.5 px-4 font-mono text-xs font-semibold text-[#A2B89B]">
                    {new Date(mov.data_movimentacao).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <Badge variant={mov.tipo === 'ENTRADA' ? 'mint' : 'danger'}>
                      {mov.tipo === 'ENTRADA' ? (
                        <span className="flex items-center gap-1.5 font-bold">
                          <ArrowDownRight className="w-4 h-4 text-[#10B981]" /> ENTRADA
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 font-bold">
                          <ArrowUpRight className="w-4 h-4 text-red-400" /> SAÍDA
                        </span>
                      )}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-base font-extrabold">
                    <span className={mov.tipo === 'ENTRADA' ? 'text-[#10B981]' : 'text-red-400'}>
                      {mov.tipo === 'ENTRADA' ? `+${mov.quantidade}` : `-${mov.quantidade}`}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-sm font-bold text-[#F3FBF6] group-hover:text-[#10B981] transition-colors">{mov.motivo}</td>
                  <td className="py-3.5 px-4 text-sm font-semibold text-[#DAF1DE]">{mov.responsavel || 'Operador'}</td>
                  <td className="py-3.5 px-4 font-mono text-base font-extrabold text-[#10B981] text-right">
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
