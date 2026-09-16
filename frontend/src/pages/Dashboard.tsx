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

const CASH_FLOW_DATA = [
  { month: 'Jan', fullMonth: 'Janeiro', revenue: 65000, expense: 42000, revPct: 65, expPct: 42 },
  { month: 'Fev', fullMonth: 'Fevereiro', revenue: 72000, expense: 48000, revPct: 72, expPct: 48 },
  { month: 'Mar', fullMonth: 'Março', revenue: 68000, expense: 40000, revPct: 68, expPct: 40 },
  { month: 'Abr', fullMonth: 'Abril', revenue: 84000, expense: 52000, revPct: 84, expPct: 52 },
  { month: 'Mai', fullMonth: 'Maio', revenue: 78000, expense: 49000, revPct: 78, expPct: 49 },
  { month: 'Jun', fullMonth: 'Junho', revenue: 92000, expense: 58000, revPct: 92, expPct: 58 },
];

export const Dashboard: React.FC = () => {
  const { activeLoja } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardAnalytics | null>(null);
  const [recentMovements, setRecentMovements] = useState<MovimentacaoEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredCashFlowIdx, setHoveredCashFlowIdx] = useState<number | null>(null);

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
            <div className="text-3xl lg:text-4xl font-extrabold text-[#F3FBF6] font-mono tracking-tight whitespace-nowrap">
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
          title={
            <div className="flex items-center gap-3">
              <span>Fluxo de Caixa</span>
              {hoveredCashFlowIdx !== null ? (
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 font-bold tracking-wide">
                  {CASH_FLOW_DATA[hoveredCashFlowIdx].fullMonth}
                </span>
              ) : (
                <span className="text-xs font-mono text-[#5E756B] hidden sm:inline">
                  Últimos 6 meses
                </span>
              )}
            </div>
          }
          action={
            <div className="flex items-center">
              {hoveredCashFlowIdx !== null ? (
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-[#070E0D] border border-[#10B981]/40 px-3.5 py-1.5 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.18)] transition-all">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#10B981] font-mono">
                    <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_8px_#10B981]" />
                    <span>Fat: R$ {CASH_FLOW_DATA[hoveredCashFlowIdx].revenue.toLocaleString('pt-BR')}</span>
                  </div>
                  <span className="text-[rgba(142,182,155,0.3)]">|</span>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#F59E0B] font-mono">
                    <span className="w-2 h-2 rounded-full bg-[#F59E0B] shadow-[0_0_8px_#F59E0B]" />
                    <span>Desp: R$ {CASH_FLOW_DATA[hoveredCashFlowIdx].expense.toLocaleString('pt-BR')}</span>
                  </div>
                  <span className="text-[rgba(142,182,155,0.3)] hidden md:inline">|</span>
                  <div className="hidden md:flex items-center gap-1.5 text-xs font-extrabold text-[#34D399] font-mono">
                    <span>Lucro: +R$ {(CASH_FLOW_DATA[hoveredCashFlowIdx].revenue - CASH_FLOW_DATA[hoveredCashFlowIdx].expense).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4 bg-[#070E0D]/60 px-3.5 py-1.5 rounded-xl border border-[rgba(142,182,155,0.1)]">
                  <span className="flex items-center gap-2 text-xs font-bold text-[#10B981] font-mono">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-[0_0_10px_#10B981]" /> Faturamento
                  </span>
                  <span className="flex items-center gap-2 text-xs font-bold text-[#F59E0B] font-mono">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] shadow-[0_0_8px_#F59E0B]" /> Despesas
                  </span>
                </div>
              )}
            </div>
          }
        >
          {/* Main Chart Area with Animated Stripe Texture */}
          <div className="relative w-full rounded-2xl border border-[rgba(142,182,155,0.12)] p-5 mt-2 bg-[#070E0D]/60 select-none overflow-hidden">
            {/* Background Animated Stripes (safely isolated and clipped) */}
            <div className="absolute inset-0 chart-grid-stripes rounded-2xl overflow-hidden pointer-events-none" />

            {/* 1. Main Plot Area: Y-Axis Labels + Grid/Bars Canvas */}
            <div className="relative z-10 flex h-60 w-full">
              {/* Y-Axis Currency Reference Labels */}
              <div className="w-14 flex flex-col justify-between text-right pr-3.5 py-0.5 font-mono text-[10px] text-[#5E756B] font-semibold select-none flex-shrink-0">
                <span>R$ 100k</span>
                <span>R$ 75k</span>
                <span>R$ 50k</span>
                <span>R$ 25k</span>
                <span>R$ 0</span>
              </div>

              {/* Grid & Bars Canvas Area */}
              <div className="flex-1 relative h-full">
                {/* Horizontal Dashed Reference Gridlines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none py-0.5">
                  {[100, 75, 50, 25, 0].map((val) => (
                    <div
                      key={val}
                      className="w-full border-b border-dashed border-[rgba(142,182,155,0.14)] chart-grid-line"
                    />
                  ))}
                </div>

                {/* Alternating Shaded Bands */}
                <div className="absolute inset-0 flex flex-col pointer-events-none py-0.5">
                  <div className="flex-1 bg-[#10B981]/[0.015]" />
                  <div className="flex-1 bg-transparent" />
                  <div className="flex-1 bg-[#10B981]/[0.015]" />
                  <div className="flex-1 bg-transparent" />
                </div>

                {/* The 6 Month Columns (Evenly Divided with grid-cols-6) */}
                <div className="relative z-10 grid grid-cols-6 h-full gap-2 px-1">
                  {CASH_FLOW_DATA.map((bar, idx) => {
                    const isHovered = hoveredCashFlowIdx === idx;
                    return (
                      <div
                        key={idx}
                        onMouseEnter={() => setHoveredCashFlowIdx(idx)}
                        onMouseLeave={() => setHoveredCashFlowIdx(null)}
                        className="relative flex items-end justify-center h-full cursor-pointer group py-0.5"
                      >
                        {/* Column Hover Beam Track */}
                        <div
                          className={`absolute inset-y-0 inset-x-0.5 rounded-xl transition-all duration-300 pointer-events-none ${
                            isHovered
                              ? 'bg-[#10B981]/[0.08] border border-[#10B981]/30 shadow-[inset_0_0_20px_rgba(16,185,129,0.12)]'
                              : 'bg-transparent'
                          }`}
                        />

                        {/* Dual Bars: Revenue (Green) & Expense (Amber) */}
                        <div className="relative z-10 w-full max-w-[48px] flex items-end justify-center gap-1.5 sm:gap-2 h-full">
                          {/* Revenue Bar */}
                          <div
                            style={{ height: `${bar.revPct}%` }}
                            className={`w-1/2 bg-gradient-to-t from-[#061C18] via-[#0B382F] to-[#10B981] rounded-t-md transition-all duration-300 origin-bottom relative shadow-md shadow-[#10B981]/15 overflow-hidden ${
                              isHovered ? 'scale-y-[1.02] shadow-[#10B981]/40' : ''
                            }`}
                          >
                            {/* Glowing Neon Cap */}
                            <div className="absolute top-0 inset-x-0 h-1 bg-[#34D399] rounded-t-md shadow-[0_0_10px_#10B981]" />
                            {/* Diagonal Pinstripe Texture */}
                            <div className="absolute inset-0 bar-stripes-pattern opacity-40" />
                          </div>

                          {/* Expense Bar with Amber Glow Cap */}
                          <div
                            style={{ height: `${bar.expPct}%` }}
                            className={`w-1/2 bg-gradient-to-t from-[#1F1608] via-[#3D280A] to-[#F59E0B] rounded-t-md transition-all duration-300 origin-bottom relative overflow-hidden ${
                              isHovered ? 'scale-y-[1.02] shadow-[0_0_10px_rgba(245,158,11,0.3)]' : ''
                            }`}
                          >
                            {/* Glowing Neon Cap */}
                            <div className="absolute top-0 inset-x-0 h-1 bg-[#FBBF24] rounded-t-md shadow-[0_0_8px_#F59E0B]" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 2. X-Axis Month Labels Row (Aligned perfectly under each column) */}
            <div className="relative z-10 flex w-full mt-3 pt-2.5 border-t border-[rgba(142,182,155,0.08)]">
              {/* Spacer matching the Y-Axis width */}
              <div className="w-14 flex-shrink-0" />

              {/* Month Labels in grid-cols-6 matching columns */}
              <div className="flex-1 grid grid-cols-6 gap-2 px-1">
                {CASH_FLOW_DATA.map((bar, idx) => {
                  const isHovered = hoveredCashFlowIdx === idx;
                  return (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoveredCashFlowIdx(idx)}
                      onMouseLeave={() => setHoveredCashFlowIdx(null)}
                      className="flex items-center justify-center cursor-pointer py-0.5"
                    >
                      {isHovered ? (
                        <span className="text-xs font-bold font-mono text-[#070E0D] bg-[#10B981] px-3 py-0.5 rounded-lg shadow-[0_0_14px_#10B981] scale-105 transition-all duration-200">
                          {bar.month}
                        </span>
                      ) : (
                        <span className="text-xs font-bold font-mono text-[#8EB69B] hover:text-[#DAF1DE] transition-all duration-200">
                          {bar.month}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
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
