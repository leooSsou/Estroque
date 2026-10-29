import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DashboardAnalytics, MovimentacaoEstoque, CurvaABCItem } from '../types';
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
  Inbox,
} from 'lucide-react';

function generateDaysArray(days: number): ChartDataPoint[] {
  const points: ChartDataPoint[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const dayStr = String(d.getDate()).padStart(2, '0');
    const monthStr = String(d.getMonth() + 1).padStart(2, '0');
    points.push({
      date: `${dayStr}/${monthStr}`,
      label: i === 0 ? 'Hoje' : `${dayStr}/${monthStr}`,
      value: 0,
      vendasCount: 0,
    });
  }
  return points;
}

export const Dashboard: React.FC = () => {
  const { activeLoja } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardAnalytics | null>(null);
  const [recentMovements, setRecentMovements] = useState<MovimentacaoEstoque[]>([]);
  const [curvaItems, setCurvaItems] = useState<CurvaABCItem[]>([]);
  const [, setLoading] = useState(true);
  const [activePeriod, setActivePeriod] = useState<number>(14);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [dashData, ledgerData, abcData] = await Promise.all([
          api.getDashboardAnalytics(activeLoja?.id),
          api.getLedger(),
          api.getCurvaABC(activeLoja?.id),
        ]);
        setMetrics(dashData);
        setRecentMovements(ledgerData.slice(0, 5));
        setCurvaItems(abcData);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeLoja]);

  const currentChartData = useMemo(() => {
    return generateDaysArray(activePeriod);
  }, [activePeriod]);

  const classeA = useMemo(() => curvaItems.filter((i) => i.classe === 'A'), [curvaItems]);
  const classeB = useMemo(() => curvaItems.filter((i) => i.classe === 'B'), [curvaItems]);
  const classeC = useMemo(() => curvaItems.filter((i) => i.classe === 'C'), [curvaItems]);

  const totalABC = useMemo(() => {
    return curvaItems.reduce((acc, i) => acc + i.faturamento, 0);
  }, [curvaItems]);

  const faturamentoLiquido = metrics?.faturamento_liquido ?? 0;
  const ticketMedio = metrics?.ticket_medio ?? 0;
  const margemLucro = metrics?.margem_lucro ?? 0;
  const vendasCount = faturamentoLiquido > 0 && ticketMedio > 0 ? Math.round(faturamentoLiquido / ticketMedio) : 0;

  return (
    <div className="space-y-6">
      {/* 1. Header & Consolidado Card */}
      <div className="bg-[#000000] border border-white/[0.16] rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 shadow-bento-dark relative overflow-hidden group hover:border-white/[0.24] transition-all duration-300">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-5 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              <Store className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="truncate">Visão Consolidada • {activeLoja?.nome || 'Rede Inteira'}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
            </div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">
              R$ {faturamentoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5 w-full lg:w-auto">
            <button
              onClick={() => navigate('/pdv')}
              className="w-full sm:w-auto px-3.5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-glow-emerald btn-press hover-lift flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">Nova Venda</span>
            </button>

            <button
              onClick={() => navigate('/nfe')}
              className="w-full sm:w-auto px-3.5 py-2.5 rounded-full bg-[#000000] hover:bg-white/[0.06] border border-white/[0.16] text-slate-200 font-semibold text-xs btn-press hover-lift flex items-center justify-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="truncate">Importar XML</span>
            </button>

            <button
              onClick={() => navigate('/transferencias')}
              className="w-full sm:w-auto px-3.5 py-2.5 rounded-full bg-[#000000] hover:bg-white/[0.06] border border-white/[0.16] text-slate-200 font-semibold text-xs btn-press hover-lift flex items-center justify-center gap-2"
            >
              <ArrowLeftRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="truncate">Transferir</span>
            </button>

            <button
              onClick={() => navigate('/ledger')}
              className="w-full sm:w-auto px-3.5 py-2.5 rounded-full bg-[#000000] hover:bg-white/[0.06] border border-white/[0.16] text-slate-200 font-semibold text-xs btn-press hover-lift flex items-center justify-center gap-2"
            >
              <ClipboardCheck className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="truncate">Auditoria</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. KPI Cards Row - 2 cols on mobile, 4 cols on tablet and desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Faturamento Bruto"
          value={`R$ ${faturamentoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          iconColor="emerald"
          badge={{ text: faturamentoLiquido > 0 ? 'Ativo' : 'Sem vendas', trend: 'up' }}
        />

        <StatCard
          title="Vendas Realizadas"
          value={vendasCount}
          icon={Receipt}
          iconColor="emerald"
          badge={{ text: 'Acumulado', trend: 'up' }}
        />

        <StatCard
          title="Ticket Médio"
          value={`R$ ${ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={TrendingUp}
          iconColor="emerald"
          badge={{ text: 'Média', trend: 'up' }}
        />

        <StatCard
          title="Margem de Lucro"
          value={`${margemLucro}%`}
          icon={Percent}
          iconColor="emerald"
          badge={{ text: 'Margem', trend: 'up' }}
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
                  valor: `R$ ${classeA.reduce((acc, i) => acc + i.faturamento, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                  badge: totalABC > 0 ? `${((classeA.reduce((acc, i) => acc + i.faturamento, 0) / totalABC) * 100).toFixed(1)}%` : '0%',
                  badgeColor: 'text-emerald-400',
                  pill: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
                },
                {
                  id: 'B',
                  nome: 'Classe B',
                  sub: 'Médio Giro',
                  valor: `R$ ${classeB.reduce((acc, i) => acc + i.faturamento, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                  badge: totalABC > 0 ? `${((classeB.reduce((acc, i) => acc + i.faturamento, 0) / totalABC) * 100).toFixed(1)}%` : '0%',
                  badgeColor: 'text-purple-400',
                  pill: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
                },
                {
                  id: 'C',
                  nome: 'Classe C',
                  sub: 'Estoque Residual',
                  valor: `R$ ${classeC.reduce((acc, i) => acc + i.faturamento, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                  badge: totalABC > 0 ? `${((classeC.reduce((acc, i) => acc + i.faturamento, 0) / totalABC) * 100).toFixed(1)}%` : '0%',
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
              <span className="text-emerald-400 font-bold">100% Operacional</span>
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
              {recentMovements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <Inbox className="w-6 h-6 text-slate-600" />
                      <span>Nenhuma movimentação de auditoria registrada ainda. Realize vendas ou entradas de estoque para visualizar o histórico.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                recentMovements.map((mov) => (
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </BentoCard>
    </div>
  );
};
