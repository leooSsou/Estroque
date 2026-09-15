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
        {/* Central Chart: Dual-Tone Bar Visualization with Animated Stripes and Guide Tracks */}
        <BentoCard
          className="lg:col-span-2"
          title="Fluxo de Caixa"
          action={
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2 text-xs font-bold text-[#10B981] font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-[0_0_10px_#10B981]" /> Faturamento
              </span>
              <span className="flex items-center gap-2 text-xs font-bold text-[#8EB69B] font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-[#8EB69B]" /> Despesas
              </span>
            </div>
          }
        >
          {/* Main Chart Area with Animated Stripe Texture */}
          <div className="relative h-80 w-full chart-grid-stripes rounded-2xl border border-[rgba(142,182,155,0.12)] p-4 overflow-hidden mt-2 bg-[#070E0D]/60">
            {/* Horizontal Alternating Bands / Faixas de Nível */}
            <div className="absolute inset-x-0 top-4 bottom-10 flex flex-col justify-between pointer-events-none pl-3 pr-4">
              {[
                { label: 'R$ 100k', pct: 100 },
                { label: 'R$ 75k', pct: 75 },
                { label: 'R$ 50k', pct: 50 },
                { label: 'R$ 25k', pct: 25 },
                { label: 'R$ 0', pct: 0 },
              ].map((lvl, i) => (
                <div key={i} className="w-full flex items-center gap-3">
                  <span className="text-[10px] font-mono text-[#5E756B] w-12 text-right font-semibold">
                    {lvl.label}
                  </span>
                  <div className="flex-1 border-b border-dashed border-[rgba(142,182,155,0.15)] chart-grid-line" />
                </div>
              ))}
            </div>

            {/* Alternating Horizontal Gradient Faixas */}
            <div className="absolute inset-x-0 top-4 bottom-10 left-16 right-4 flex flex-col pointer-events-none">
              <div className="flex-1 bg-[#10B981]/[0.015] border-b border-[rgba(142,182,155,0.06)]" />
              <div className="flex-1 bg-transparent border-b border-[rgba(142,182,155,0.06)]" />
              <div className="flex-1 bg-[#10B981]/[0.015] border-b border-[rgba(142,182,155,0.06)]" />
              <div className="flex-1 bg-transparent" />
            </div>

            {/* Vertical Columns & Bars Container */}
            <div className="relative z-10 flex items-end justify-between gap-3 h-full pt-4 pb-2 pl-14 pr-4">
              {[
                { month: 'Jan', fullMonth: 'Janeiro', revenue: 65, expense: 42 },
                { month: 'Fev', fullMonth: 'Fevereiro', revenue: 72, expense: 48 },
                { month: 'Mar', fullMonth: 'Março', revenue: 68, expense: 40 },
                { month: 'Abr', fullMonth: 'Abril', revenue: 84, expense: 52 },
                { month: 'Mai', fullMonth: 'Maio', revenue: 78, expense: 49 },
                { month: 'Jun', fullMonth: 'Junho', revenue: 92, expense: 58 },
              ].map((bar, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2.5 h-full justify-end group relative cursor-pointer">
                  {/* Animated Column Track Beam (Faixa Vertical no Hover) */}
                  <div className="absolute inset-y-0 -inset-x-1 rounded-2xl bg-transparent group-hover:bg-[#10B981]/[0.06] group-hover:border-x group-hover:border-[#10B981]/25 group-hover:shadow-[inset_0_0_20px_rgba(16,185,129,0.08)] transition-all duration-300 pointer-events-none" />

                  {/* Floating Glassmorphism HUD Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-14 left-1/2 -translate-x-1/2 bg-[#0D1917]/95 backdrop-blur-xl px-3.5 py-2 rounded-xl text-xs text-[#F3FBF6] whitespace-nowrap border border-[#10B981]/40 font-mono shadow-[0_12px_30px_rgba(0,0,0,0.9),0_0_20px_rgba(16,185,129,0.25)] z-30 pointer-events-none transition-all duration-200 group-hover:-translate-y-1">
                    <div className="text-[11px] font-bold text-[#DAF1DE] pb-1 border-b border-[rgba(142,182,155,0.15)] mb-1 flex items-center justify-between gap-4">
                      <span>{bar.fullMonth}</span>
                      <span className="text-[#10B981] font-extrabold">Lucro: +R$ {(bar.revenue - bar.expense) * 1000}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px]">
                      <span className="text-[#10B981] font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" /> R$ {bar.revenue * 1000}
                      </span>
                      <span className="text-[#8EB69B] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8EB69B]" /> R$ {bar.expense * 1000}
                      </span>
                    </div>
                  </div>

                  {/* Dual Bars */}
                  <div className="w-full max-w-[56px] flex items-end justify-center gap-2 h-full pb-2">
                    {/* Revenue Bar with Striped Texture & Glowing Neon Cap */}
                    <div
                      style={{ height: `${bar.revenue}%` }}
                      className="w-1/2 bg-gradient-to-t from-[#061C18] via-[#0B382F] to-[#10B981] rounded-t-lg transition-all duration-300 group-hover:scale-y-[1.03] origin-bottom relative shadow-md shadow-[#10B981]/15 overflow-hidden"
                    >
                      {/* Glowing Top Cap */}
                      <div className="absolute top-0 inset-x-0 h-1.5 bg-[#34D399] rounded-t-lg shadow-[0_0_12px_#10B981]" />
                      {/* Diagonal Pinstripe Texture */}
                      <div className="absolute inset-0 bar-stripes-pattern opacity-50" />
                    </div>

                    {/* Expense Bar */}
                    <div
                      style={{ height: `${bar.expense}%` }}
                      className="w-1/2 bg-gradient-to-t from-[#091513] to-[#8EB69B]/70 rounded-t-lg transition-all duration-300 group-hover:scale-y-[1.03] group-hover:bg-[#8EB69B] origin-bottom relative overflow-hidden"
                    >
                      <div className="absolute top-0 inset-x-0 h-1 bg-[#DAF1DE]/40 rounded-t-lg" />
                    </div>
                  </div>

                  {/* Month Label */}
                  <span className="text-xs md:text-sm font-bold font-mono text-[#DAF1DE] group-hover:text-[#10B981] group-hover:scale-110 transition-all">
                    {bar.month}
                  </span>
                </div>
              ))}
            </div>
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
