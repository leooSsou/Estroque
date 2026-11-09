import React from 'react';
import { CaixaTurno, TurnoFechadoHistorico } from '../../types';
import { BentoCard } from '../common/BentoCard';
import { Badge } from '../common/Badge';
import { DrawerStats } from './types';
import {
  ArrowUpRight,
  ArrowDownRight,
  Lock,
  Unlock,
  FileText,
  Clock,
} from 'lucide-react';

export interface PDVOperacoesCaixaTabProps {
  caixaTurno: CaixaTurno | null;
  setSuprimentoModalOpen: (v: boolean) => void;
  setSangriaModalOpen: (v: boolean) => void;
  setFechamentoModalOpen: (v: boolean) => void;
  setAberturaModalOpen: (v: boolean) => void;
  setRelatorioPDFMode: (m: 'DIARIO' | 'MENSAL') => void;
  setRelatorioPDFModalOpen: (v: boolean) => void;
  drawerStats: DrawerStats;
  turnosHistorico: TurnoFechadoHistorico[];
}

export const PDVOperacoesCaixaTab: React.FC<PDVOperacoesCaixaTabProps> = ({
  caixaTurno,
  setSuprimentoModalOpen,
  setSangriaModalOpen,
  setFechamentoModalOpen,
  setAberturaModalOpen,
  setRelatorioPDFMode,
  setRelatorioPDFModalOpen,
  drawerStats,
  turnosHistorico,
}) => {
  return (
    <div className="space-y-6">
      {/* Shift Status Banner & Action Buttons */}
      <div className="p-5 rounded-3xl bg-[#000000] border border-white/[0.16] shadow-bento-dark flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-white">Turno Atual de Caixa</span>
            {caixaTurno?.aberto ? (
              <Badge variant="emerald">Aberto</Badge>
            ) : (
              <Badge variant="danger">Fechado</Badge>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Aberto em: {caixaTurno?.data_abertura ? new Date(caixaTurno.data_abertura).toLocaleString('pt-BR') : '—'} • Responsável: <strong className="text-slate-200">{caixaTurno?.operador_nome || 'Operador'}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {caixaTurno?.aberto ? (
            <>
              <button
                onClick={() => setSuprimentoModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#000000] hover:bg-emerald-500/10 text-emerald-400 font-bold text-xs border border-emerald-500/30 flex items-center gap-1.5 active:scale-95"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Suprimento (+)</span>
              </button>

              <button
                onClick={() => setSangriaModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#000000] hover:bg-amber-400/10 text-amber-400 font-bold text-xs border border-amber-400/30 flex items-center gap-1.5 active:scale-95"
              >
                <ArrowDownRight className="w-4 h-4" />
                <span>Sangria (-)</span>
              </button>

              <button
                onClick={() => setFechamentoModalOpen(true)}
                className="px-5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 font-bold text-xs border border-rose-500/40 flex items-center gap-1.5 active:scale-95"
              >
                <Lock className="w-4 h-4" />
                <span>Fechar Caixa (Turno)</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setAberturaModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/25 flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>Abrir Novo Turno</span>
            </button>
          )}

          <button
            onClick={() => {
              setRelatorioPDFMode('DIARIO');
              setRelatorioPDFModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-[#000000] hover:bg-white/[0.08] text-slate-200 hover:text-white font-bold text-xs border border-white/[0.16] flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            title="Gerar e Imprimir Relatório em PDF do Fechamento de Caixa"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>PDF do Turno</span>
          </button>
        </div>
      </div>

      {/* StatCards of Drawer Balance */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3">
        <div className="p-4 rounded-2xl bg-[#000000] border border-white/[0.16] space-y-1">
          <span className="text-[11px] font-semibold text-slate-400">Fundo Inicial</span>
          <div className="text-lg font-bold text-white">
            R$ {drawerStats.fundo.toFixed(2)}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#000000] border border-white/[0.16] space-y-1">
          <span className="text-[11px] font-semibold text-slate-400">Vendas em Dinheiro</span>
          <div className="text-lg font-bold text-emerald-400">
            R$ {drawerStats.vendasDinheiro.toFixed(2)}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#000000] border border-white/[0.16] space-y-1">
          <span className="text-[11px] font-semibold text-slate-400">Cartão / PIX / Cred.</span>
          <div className="text-lg font-bold text-purple-400">
            R$ {drawerStats.vendasOutras.toFixed(2)}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#000000] border border-white/[0.16] space-y-1">
          <span className="text-[11px] font-semibold text-slate-400">Suprimentos (+)</span>
          <div className="text-lg font-bold text-emerald-400">
            R$ {drawerStats.suprimentos.toFixed(2)}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#000000] border border-white/[0.16] space-y-1">
          <span className="text-[11px] font-semibold text-slate-400">Sangrias (-)</span>
          <div className="text-lg font-bold text-amber-400">
            R$ {drawerStats.sangrias.toFixed(2)}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#000000] border border-emerald-500/40 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-emerald-400">Esperado na Gaveta</span>
          <div className="text-xl font-bold text-emerald-400">
            R$ {drawerStats.saldoEsperadoGaveta.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Drawer Operations Table */}
      <BentoCard>
        <div className="p-2 border-b border-white/[0.16] mb-3">
          <h4 className="text-sm font-bold text-white">Movimentações da Gaveta de Dinheiro</h4>
        </div>
        <div className="overflow-x-auto table-scrollbar pb-2">
          <table className="w-full text-left min-w-[900px]">
            <thead className="bg-[#000000] border-b border-white/[0.16]">
              <tr className="text-xs font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                <th className="py-3 px-4 whitespace-nowrap">Data / Horário</th>
                <th className="py-3 px-4 whitespace-nowrap">Tipo de Operação</th>
                <th className="py-3 px-4 whitespace-nowrap">Valor</th>
                <th className="py-3 px-4 whitespace-nowrap">Operador</th>
                <th className="py-3 px-4 whitespace-nowrap">Motivo / Justificativa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.14]">
              {(caixaTurno?.operacoes || []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-slate-500 whitespace-nowrap">
                    Nenhuma operação de caixa registrada neste turno.
                  </td>
                </tr>
              ) : (
                caixaTurno?.operacoes.map((op) => (
                  <tr key={op.id} className="hover:bg-white/[0.02] transition-colors whitespace-nowrap">
                    <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(op.data_hora).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {op.tipo === 'ABERTURA' && <Badge variant="emerald">Abertura</Badge>}
                      {op.tipo === 'SUPRIMENTO' && <Badge variant="emerald">Suprimento (+)</Badge>}
                      {op.tipo === 'SANGRIA' && <Badge variant="warning">Sangria (-)</Badge>}
                      {op.tipo === 'FECHAMENTO' && <Badge variant="neutral">Fechamento</Badge>}
                    </td>
                    <td className="py-3.5 px-4 text-sm font-bold text-white whitespace-nowrap">
                      R$ {op.valor.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-200 whitespace-nowrap">
                      {op.operador_nome}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-300 whitespace-nowrap">
                      {op.motivo}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </BentoCard>

      {/* Historical Closed Turns (Histórico dos PDV) */}
      <BentoCard>
        <div className="p-2 border-b border-white/[0.16] mb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              Histórico de Fechamentos de Caixa (Turnos Anteriores)
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Conferência de todos os turnos de PDV já encerrados com apuração de quebra ou sobra
            </p>
          </div>
          <Badge variant="neutral">{turnosHistorico.length} turnos arquivados</Badge>
        </div>
        <div className="overflow-x-auto table-scrollbar pb-2">
          <table className="w-full text-left min-w-[950px]">
            <thead className="bg-[#000000] border-b border-white/[0.16]">
              <tr className="text-xs font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                <th className="py-3 px-4">Abertura / Fechamento</th>
                <th className="py-3 px-4">Operador</th>
                <th className="py-3 px-4">Fundo Inicial</th>
                <th className="py-3 px-4">Vendas Dinheiro</th>
                <th className="py-3 px-4">Suprimentos / Sangrias</th>
                <th className="py-3 px-4">Saldo Esperado</th>
                <th className="py-3 px-4">Contado (Gaveta)</th>
                <th className="py-3 px-4">Diferença / Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.14]">
              {turnosHistorico.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-slate-500 whitespace-nowrap">
                    Nenhum turno anterior arquivado ainda. Os fechamentos aparecerão aqui após o encerramento do caixa.
                  </td>
                </tr>
              ) : (
                turnosHistorico.map((th) => (
                  <tr key={th.id} className="hover:bg-white/[0.02] transition-colors whitespace-nowrap text-xs">
                    <td className="py-3.5 px-4 text-slate-300">
                      <div>Aberto: {new Date(th.data_abertura).toLocaleString('pt-BR')}</div>
                      <div className="text-[11px] text-slate-500">Fechado: {new Date(th.data_fechamento).toLocaleString('pt-BR')}</div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {th.operador_nome}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      R$ {th.fundo_inicial.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-emerald-400 font-bold">
                      R$ {th.total_vendas_dinheiro.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      <span className="text-emerald-400">+{th.total_suprimentos.toFixed(2)}</span> /{' '}
                      <span className="text-amber-400">-{th.total_sangrias.toFixed(2)}</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white">
                      R$ {th.saldo_esperado.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white">
                      R$ {th.saldo_informado.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      {Math.abs(th.diferenca) < 0.01 ? (
                        <Badge variant="emerald">Exato (R$ 0,00)</Badge>
                      ) : th.diferenca < 0 ? (
                        <Badge variant="danger">Quebra -R$ {Math.abs(th.diferenca).toFixed(2)}</Badge>
                      ) : (
                        <Badge variant="emerald">Sobra +R$ {th.diferenca.toFixed(2)}</Badge>
                      )}
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
