import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DashboardAnalytics, MovimentacaoEstoque } from '../types';
import { BentoCard } from '../components/common/BentoCard';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { NeonAreaChart, ChartDataPoint } from '../components/charts/NeonAreaChart';
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
  Sparkles,
} from 'lucide-react';

const DAILY_TREND_14D: ChartDataPoint[] = [
  { date: '23/09', label: '23 Set', value: 2450 },
  { date: '24/09', label: '24 Set', value: 2890 },
  { date: '25/09', label: '25 Set', value: 2710 },
  { date: '26/09', label: '26 Set', value: 3620 },
  { date: '27/09', label: '27 Set', value: 3100 },
  { date: '28/09', label: '28 Set', value: 4890 },
  { date: '29/09', label: '29 Set', value: 4350 },
  { date: '30/09', label: '30 Set', value: 5200 },
  { date: '01/10', label: '01 Out', value: 4950 },
  { date: '02/10', label: '02 Out', value: 6100 },
  { date: '03/10', label: '03 Out', value: 5800 },
  { date: '04/10', label: '04 Out', value: 3928 },
  { date: '05/10', label: '05 Out', value: 4400 },
  { date: '06/10', label: 'Hoje', value: 5680 },
];

const DAILY_TREND_7D: ChartDataPoint[] = [
  { date: '30/09', label: '30 Set', value: 5200 },
  { date: '01/10', label: '01 Out', value: 4950 },
  { date: '02/10', label: '02 Out', value: 6100 },
  { date: '03/10', label: '03 Out', value: 5800 },
  { date: '04/10', label: '04 Out', value: 3928 },
  { date: '05/10', label: '05 Out', value: 4400 },
  { date: '06/10', label: 'Hoje', value: 5680 },
];

const DAILY_TREND_30D: ChartDataPoint[] = [
  { date: '07/09', label: '07 Set', value: 2100 },
  { date: '10/09', label: '10 Set', value: 2800 },
  { date: '13/09', label: '13 Set', value: 3400 },
  { date: '16/09', label: '16 Set', value: 3100 },
  { date: '19/09', label: '19 Set', value: 3900 },
  { date: '22/09', label: '22 Set', value: 4200 },
  { date: '25/09', label: '25 Set', value: 3800 },
  { date: '28/09', label: '28 Set', value: 4890 },
  { date: '01/10', label: '01 Out', value: 4950 },
  { date: '04/10', label: '04 Out', value: 3928 },
  { date: '06/10', label: 'Hoje', value: 5680 },
];

const REVENUE_SPARKLINE = [42, 45, 48, 52, 49, 58, 64, 61, 75, 82];
const TRADES_SPARKLINE = [18, 22, 20, 26, 31, 28, 35, 42, 48, 55];
const TICKET_SPARKLINE = [280, 295, 310, 305, 315, 320, 312, 335];
const MARGIN_SPARKLINE = [40, 41, 43, 42, 44, 43, 45, 44, 46];

export const Dashboard: React.FC = () => {
  const { activeLoja } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardAnalytics | null>(null);
  const [recentMovements, setRecentMovements] = useState<MovimentacaoEstoque[]>([]);
  const [, setLoading] = useState(true);
  const [activePeriod, setActivePeriod] = useState<number>(14);

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

  // Current chart data based on selected period
  const currentChartData = useMemo(() => {
    if (activePeriod === 7) return DAILY_TREND_7D;
    if (activePeriod === 30) return DAILY_TREND_30D;
    return DAILY_TREND_14D;
  }, [activePeriod]);

  return (
    <div className="space-y-6">
      {/* 1. Header & Consolidado Card (Matte Dark Graphite with Subtle Glow) */}
      <div className="bg-[#141518] border border-white/[0.08] rounded-3xl p-6 lg:p-8 shadow-bento-dark relative overflow-hidden group hover:border-white/[0.15] transition-all duration-300">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(0,229,153,0.12),transparent_70%)] pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#8A8F98] uppercase tracking-wider mb-2 font-mono">
              <Store className="w-4 h-4 text-[#00E599]" />
              <span>Visão Consolidada • {activeLoja?.nome || 'Rede Inteira'}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E599] shadow-[0_0_8px_#00E599]" />
            </div>
            <div className="text-3xl lg:text-4xl font-extrabold text-[#FFFFFF] font-mono tracking-tight whitespace-nowrap">
              R$ {(metrics?.faturamento_liquido || 82300).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-[#8A8F98] mt-1">
              Desempenho operacional e financeiro consolidado em tempo real
            </p>
          </div>

          {/* Quick Action Pill Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => navigate('/pdv')}
              className="px-4 py-2.5 rounded-full bg-[#00E599] hover:bg-[#00CC88] text-[#000000] font-bold text-xs shadow-glow-emerald btn-press hover-lift flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Nova Venda (PDV)</span>
            </button>

            <button
              onClick={() => navigate('/nfe')}
              className="px-4 py-2.5 rounded-full bg-[#1D1E22] hover:bg-[#25272D] border border-white/[0.08] text-[#E5E7EB] font-semibold text-xs btn-press hover-lift flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#00E599]" />
              <span>Importar XML NF-e</span>
            </button>

            <button
              onClick={() => navigate('/transferencias')}
              className="px-4 py-2.5 rounded-full bg-[#1D1E22] hover:bg-[#25272D] border border-white/[0.08] text-[#E5E7EB] font-semibold text-xs btn-press hover-lift flex items-center gap-2"
            >
              <ArrowLeftRight className="w-4 h-4 text-[#8A8F98]" />
              <span>Transferir Estoque</span>
            </button>

            <button
              onClick={() => navigate('/ledger')}
              className="px-4 py-2.5 rounded-full bg-[#1D1E22] hover:bg-[#25272D] border border-white/[0.08] text-[#E5E7EB] font-semibold text-xs btn-press hover-lift flex items-center gap-2"
            >
              <ClipboardCheck className="w-4 h-4 text-[#8A8F98]" />
              <span>Auditoria Física</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. KPI Cards Row with Sparklines (matching reference image) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Faturamento Bruto"
          subtitle="Receita consolidada do mês"
          value={`R$ ${(metrics?.faturamento_liquido || 82300).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          badge={{ text: '+12.4%', trend: 'up' }}
          sparklineData={REVENUE_SPARKLINE}
          sparklineColor="#00E599"
        />

        <StatCard
          title="Vendas & Pedidos"
          subtitle="Volume de operações no PDV"
          value={3612}
          icon={Receipt}
          badge={{ text: '+1259', trend: 'warning' }}
          sparklineData={TRADES_SPARKLINE}
          sparklineColor="#FF9F43"
        />

        <StatCard
          title="Ticket Médio"
          subtitle="Gasto médio por cliente"
          value={`R$ ${(metrics?.ticket_medio || 310.5).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={TrendingUp}
          badge={{ text: '+5.2%', trend: 'up' }}
          sparklineData={TICKET_SPARKLINE}
          sparklineColor="#00E599"
        />

        <StatCard
          title="Margem de Lucro"
          subtitle="Rentabilidade apurada"
          value={`${metrics?.margem_lucro ?? 43.8}%`}
          icon={AlertTriangle}
          badge={{ text: '+4.8%', trend: 'up' }}
          sparklineData={MARGIN_SPARKLINE}
          sparklineColor="#00E599"
        />
      </div>

      {/* 3. Central Grid: Main Spline Neon Area Chart + Assets / Curva ABC Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Column (2/3 width) */}
        <div className="lg:col-span-2">
          <NeonAreaChart
            title="Fluxo de Vendas & Entradas"
            subtitle="Desempenho diário de faturamento e fluxo de caixa"
            data={currentChartData}
            color="#00E599"
            avgGrowth="+14.2%"
            activePeriod={activePeriod}
            onPeriodChange={(days) => setActivePeriod(days)}
          />
        </div>

        {/* Right Column: Assets / Curva ABC Breakdown (1/3 width, matching reference) */}
        <BentoCard
          title={
            <div className="flex items-center justify-between w-full">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#00E599]" />
                <span>Ativos & Curva ABC</span>
              </span>
            </div>
          }
          subtitle="Principais classes e giro do estoque"
          action={
            <button
              onClick={() => navigate('/analytics')}
              className="text-xs text-[#00E599] hover:underline font-bold"
            >
              Ver Detalhes →
            </button>
          }
        >
          <div className="space-y-4 pt-1">
            {/* Asset Items List (like the right column in the reference image) */}
            <div className="space-y-2.5">
              {[
                {
                  id: 'A',
                  nome: 'Classe A • Alto Giro',
                  sub: '80% da receita líquida',
                  valor: 'R$ 65.922,00',
                  badge: '+80.1%',
                  badgeColor: '#00E599',
                  bg: 'bg-[#00E599]/15 text-[#00E599] border-[#00E599]/30',
                },
                {
                  id: 'B',
                  nome: 'Classe B • Médio Giro',
                  sub: '15% da receita líquida',
                  valor: 'R$ 12.345,00',
                  badge: '+15.0%',
                  badgeColor: '#FF9F43',
                  bg: 'bg-[#FF9F43]/15 text-[#FF9F43] border-[#FF9F43]/30',
                },
                {
                  id: 'C',
                  nome: 'Classe C • Estoque Residual',
                  sub: '5% da receita líquida',
                  valor: 'R$ 4.033,00',
                  badge: '+4.9%',
                  badgeColor: '#8A8F98',
                  bg: 'bg-[#8A8F98]/15 text-[#8A8F98] border-[#8A8F98]/30',
                },
              ].map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl bg-[#1A1B1F] border border-white/[0.06] hover:border-white/[0.14] transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-extrabold text-sm border flex-shrink-0 ${item.bg}`}
                    >
                      {item.id}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-white truncate group-hover:text-[#00E599] transition-colors">
                        {item.nome}
                      </div>
                      <div className="text-[11px] text-[#8A8F98] truncate">{item.sub}</div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="font-mono text-xs font-extrabold text-white">
                      {item.valor}
                    </div>
                    <span
                      className="text-[10px] font-mono font-bold"
                      style={{ color: item.badgeColor }}
                    >
                      {item.badge}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Diagnostic Pill */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#1A1B1F] border border-white/[0.06] text-xs">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#00E599]" />
                <span className="text-[#E5E7EB] font-semibold">Saúde do Catálogo</span>
              </div>
              <span className="text-[#00E599] font-bold font-mono">98.4% Normal</span>
            </div>
          </div>
        </BentoCard>
      </div>

      {/* 4. Live Ledger Feed Card in Matte Graphite Style */}
      <BentoCard
        title={
          <span className="flex items-center gap-2.5">
            <span>Histórico de Auditoria</span>
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full bg-[#00E599]/15 text-[#00E599] border border-[#00E599]/30 font-mono font-bold">
              <span className="w-2 h-2 rounded-full bg-[#00E599] animate-pulse" />
              Ao Vivo
            </span>
          </span>
        }
        action={
          <button
            onClick={() => navigate('/ledger')}
            className="text-xs text-[#00E599] hover:underline font-bold btn-press"
          >
            Acessar Completo →
          </button>
        }
      >
        <div className="overflow-x-auto table-scrollbar pb-2">
          <table className="w-full text-left min-w-[850px]">
            <thead className="bg-[#1A1B1F] border-b border-white/[0.08]">
              <tr className="text-xs font-bold uppercase tracking-wider text-[#8A8F98] whitespace-nowrap">
                <th className="py-3.5 px-4">Data & Hora</th>
                <th className="py-3.5 px-4 text-center">Tipo</th>
                <th className="py-3.5 px-4">Quantidade</th>
                <th className="py-3.5 px-4">Motivo / Operação</th>
                <th className="py-3.5 px-4">Responsável</th>
                <th className="py-3.5 px-4 text-right">Saldo Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {recentMovements.map((mov) => (
                <tr key={mov.id} className="hover:bg-white/[0.03] transition-colors group whitespace-nowrap">
                  <td className="py-3.5 px-4 font-mono text-xs font-semibold text-[#8A8F98] whitespace-nowrap">
                    {new Date(mov.data_movimentacao).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <Badge variant={mov.tipo === 'ENTRADA' ? 'mint' : 'danger'}>
                      {mov.tipo === 'ENTRADA' ? (
                        <span className="flex items-center gap-1.5 font-bold whitespace-nowrap">
                          <ArrowDownRight className="w-4 h-4 text-[#00E599]" /> ENTRADA
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 font-bold whitespace-nowrap">
                          <ArrowUpRight className="w-4 h-4 text-red-400" /> SAÍDA
                        </span>
                      )}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-sm font-extrabold whitespace-nowrap">
                    <span className={mov.tipo === 'ENTRADA' ? 'text-[#00E599]' : 'text-red-400'}>
                      {mov.tipo === 'ENTRADA' ? `+${mov.quantidade}` : `-${mov.quantidade}`} un
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-sm font-bold text-white group-hover:text-[#00E599] transition-colors whitespace-nowrap">
                    {mov.motivo}
                  </td>
                  <td className="py-3.5 px-4 text-sm font-semibold text-[#E5E7EB] whitespace-nowrap">
                    {mov.responsavel || 'Operador'}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-sm font-extrabold text-[#00E599] text-right whitespace-nowrap">
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
