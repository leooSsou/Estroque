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
  Percent,
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
  { date: '23/09', label: '23 Set', value: 2450, vendasCount: 18 },
  { date: '24/09', label: '24 Set', value: 2890, vendasCount: 22 },
  { date: '25/09', label: '25 Set', value: 2710, vendasCount: 19 },
  { date: '26/09', label: '26 Set', value: 3620, vendasCount: 28 },
  { date: '27/09', label: '27 Set', value: 3100, vendasCount: 24 },
  { date: '28/09', label: '28 Set', value: 4890, vendasCount: 39 },
  { date: '29/09', label: '29 Set', value: 4350, vendasCount: 35 },
  { date: '30/09', label: '30 Set', value: 5200, vendasCount: 42 },
  { date: '01/10', label: '01 Out', value: 4950, vendasCount: 38 },
  { date: '02/10', label: '02 Out', value: 6100, vendasCount: 51 },
  { date: '03/10', label: '03 Out', value: 5800, vendasCount: 47 },
  { date: '04/10', label: '04 Out', value: 3928, vendasCount: 31 },
  { date: '05/10', label: '05 Out', value: 4400, vendasCount: 36 },
  { date: '06/10', label: 'Hoje', value: 5680, vendasCount: 48 },
];

const DAILY_TREND_7D: ChartDataPoint[] = [
  { date: '30/09', label: '30 Set', value: 5200, vendasCount: 42 },
  { date: '01/10', label: '01 Out', value: 4950, vendasCount: 38 },
  { date: '02/10', label: '02 Out', value: 6100, vendasCount: 51 },
  { date: '03/10', label: '03 Out', value: 5800, vendasCount: 47 },
  { date: '04/10', label: '04 Out', value: 3928, vendasCount: 31 },
  { date: '05/10', label: '05 Out', value: 4400, vendasCount: 36 },
  { date: '06/10', label: 'Hoje', value: 5680, vendasCount: 48 },
];

const DAILY_TREND_30D: ChartDataPoint[] = [
  { date: '07/09', label: '07 Set', value: 2100, vendasCount: 16 },
  { date: '10/09', label: '10 Set', value: 2800, vendasCount: 21 },
  { date: '13/09', label: '13 Set', value: 3400, vendasCount: 26 },
  { date: '16/09', label: '16 Set', value: 3100, vendasCount: 23 },
  { date: '19/09', label: '19 Set', value: 3900, vendasCount: 30 },
  { date: '22/09', label: '22 Set', value: 4200, vendasCount: 33 },
  { date: '25/09', label: '25 Set', value: 3800, vendasCount: 29 },
  { date: '28/09', label: '28 Set', value: 4890, vendasCount: 39 },
  { date: '01/10', label: '01 Out', value: 4950, vendasCount: 38 },
  { date: '04/10', label: '04 Out', value: 3928, vendasCount: 31 },
  { date: '06/10', label: 'Hoje', value: 5680, vendasCount: 48 },
];

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

  const currentChartData = useMemo(() => {
    if (activePeriod === 7) return DAILY_TREND_7D;
    if (activePeriod === 30) return DAILY_TREND_30D;
    return DAILY_TREND_14D;
  }, [activePeriod]);

  return (
    <div className="space-y-6">
      {/* 1. Header & Consolidado Card (Clean, Uncluttered, Pure Black / Graphite) */}
      <div className="bg-[#000000] border border-white/[0.16] rounded-3xl p-6 lg:p-7 shadow-bento-dark relative overflow-hidden group hover:border-white/[0.24] transition-all duration-300">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              <Store className="w-4 h-4 text-emerald-400" />
              <span>Visão Consolidada • {activeLoja?.nome || 'Rede Inteira'}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
            <div className="text-3xl lg:text-4xl font-bold text-white tracking-tight whitespace-nowrap">
              R$ {(metrics?.faturamento_liquido || 82300).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => navigate('/pdv')}
              className="px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-glow-emerald btn-press hover-lift flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Nova Venda (PDV)</span>
            </button>

            <button
              onClick={() => navigate('/nfe')}
              className="px-4 py-2.5 rounded-full bg-[#000000] hover:bg-white/[0.06] border border-white/[0.16] text-slate-200 font-semibold text-xs btn-press hover-lift flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Importar XML NF-e</span>
            </button>

            <button
              onClick={() => navigate('/transferencias')}
              className="px-4 py-2.5 rounded-full bg-[#000000] hover:bg-white/[0.06] border border-white/[0.16] text-slate-200 font-semibold text-xs btn-press hover-lift flex items-center gap-2"
            >
              <ArrowLeftRight className="w-4 h-4 text-slate-400" />
              <span>Transferir Estoque</span>
            </button>

            <button
              onClick={() => navigate('/ledger')}
              className="px-4 py-2.5 rounded-full bg-[#000000] hover:bg-white/[0.06] border border-white/[0.16] text-slate-200 font-semibold text-xs btn-press hover-lift flex items-center gap-2"
            >
              <ClipboardCheck className="w-4 h-4 text-slate-400" />
              <span>Auditoria Física</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. KPI Cards Row - Clean and direct without verbose text */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Faturamento Bruto"
          value={`R$ ${(metrics?.faturamento_liquido || 82300).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          iconColor="emerald"
          badge={{ text: '+12.4%', trend: 'up' }}
        />

        <StatCard
          title="Vendas Realizadas"
          value={3612}
          icon={Receipt}
          iconColor="emerald"
          badge={{ text: '+15.2%', trend: 'up' }}
        />

        <StatCard
          title="Ticket Médio"
          value={`R$ ${(metrics?.ticket_medio || 310.5).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={TrendingUp}
          iconColor="emerald"
          badge={{ text: '+5.2%', trend: 'up' }}
        />

        <StatCard
          title="Margem de Lucro"
          value={`${metrics?.margem_lucro ?? 43.8}%`}
          icon={Percent}
          iconColor="emerald"
          badge={{ text: 'Saudável', trend: 'up' }}
        />
      </div>

      {/* 3. Central Grid: ERP Sales Flow Chart + Curva ABC Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <NeonAreaChart
            title="Evolução de Vendas & Faturamento"
            subtitle="Faturamento diário consolidado das lojas"
            data={currentChartData}
            color="#00E599"
            activePeriod={activePeriod}
            onPeriodChange={(days) => setActivePeriod(days)}
          />
        </div>

        {/* Curva ABC / Categorias Breakdown */}
        <BentoCard
          title={
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Curva ABC de Vendas</span>
            </div>
          }
          subtitle="Giro e relevância do catálogo"
          action={
            <button
              onClick={() => navigate('/analytics')}
              className="text-xs text-emerald-400 hover:underline font-bold"
            >
              Ver Detalhes →
            </button>
          }
        >
          <div className="space-y-4 pt-1">
            <div className="space-y-2.5">
              {[
                {
                  id: 'A',
                  nome: 'Classe A',
                  sub: 'Alto Giro',
                  valor: 'R$ 65.922,00',
                  badge: '80.1%',
                  badgeColor: 'text-emerald-400',
                  pill: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
                },
                {
                  id: 'B',
                  nome: 'Classe B',
                  sub: 'Médio Giro',
                  valor: 'R$ 12.345,00',
                  badge: '15.0%',
                  badgeColor: 'text-purple-400',
                  pill: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
                },
                {
                  id: 'C',
                  nome: 'Classe C',
                  sub: 'Estoque Residual',
                  valor: 'R$ 4.033,00',
                  badge: '4.9%',
                  badgeColor: 'text-amber-400',
                  pill: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
                },
              ].map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl bg-[#000000] border border-white/[0.16] hover:border-white/[0.24] transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm border flex-shrink-0 ${item.pill}`}
                    >
                      {item.id}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                        {item.nome}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">{item.sub}</div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-bold text-white">
                      {item.valor}
                    </div>
                    <span className={`text-[10px] font-bold ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#000000] border border-white/[0.14] text-xs">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300 font-semibold">Saúde do Catálogo</span>
              </div>
              <span className="text-emerald-400 font-bold">98.4% Normal</span>
            </div>
          </div>
        </BentoCard>
      </div>

      {/* 4. Live Ledger Feed Card */}
      <BentoCard
        title={
          <span className="flex items-center gap-2.5">
            <span>Histórico de Auditoria</span>
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Ao Vivo
            </span>
          </span>
        }
        action={
          <button
            onClick={() => navigate('/ledger')}
            className="text-xs text-emerald-400 hover:underline font-bold btn-press"
          >
            Acessar Completo →
          </button>
        }
      >
        <div className="overflow-x-auto table-scrollbar pb-2">
          <table className="w-full text-left min-w-[850px]">
            <thead className="bg-[#000000] border-b border-white/[0.16]">
              <tr className="text-xs font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                <th className="py-3.5 px-4">Data & Hora</th>
                <th className="py-3.5 px-4 text-center">Tipo</th>
                <th className="py-3.5 px-4">Quantidade</th>
                <th className="py-3.5 px-4">Motivo / Operação</th>
                <th className="py-3.5 px-4">Responsável</th>
                <th className="py-3.5 px-4 text-right">Saldo Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.14]">
              {recentMovements.map((mov) => (
                <tr key={mov.id} className="hover:bg-white/[0.03] transition-colors group whitespace-nowrap">
                  <td className="py-3.5 px-4 text-xs font-semibold text-slate-400 whitespace-nowrap">
                    {new Date(mov.data_movimentacao).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <Badge variant={mov.tipo === 'ENTRADA' ? 'emerald' : 'danger'}>
                      {mov.tipo === 'ENTRADA' ? (
                        <span className="flex items-center gap-1.5 font-bold whitespace-nowrap">
                          <ArrowDownRight className="w-4 h-4 text-emerald-400" /> ENTRADA
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 font-bold whitespace-nowrap">
                          <ArrowUpRight className="w-4 h-4 text-rose-400" /> SAÍDA
                        </span>
                      )}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-sm font-bold whitespace-nowrap">
                    <span className={mov.tipo === 'ENTRADA' ? 'text-emerald-400' : 'text-rose-400'}>
                      {mov.tipo === 'ENTRADA' ? `+${mov.quantidade}` : `-${mov.quantidade}`} un
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-sm font-bold text-white group-hover:text-emerald-400 transition-colors whitespace-nowrap">
                    {mov.motivo}
                  </td>
                  <td className="py-3.5 px-4 text-sm font-semibold text-slate-300 whitespace-nowrap">
                    {mov.responsavel || 'Operador'}
                  </td>
                  <td className="py-3.5 px-4 text-sm font-bold text-white text-right whitespace-nowrap">
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
