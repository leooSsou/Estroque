import React from 'react';
import { Venda } from '../../types';
import { BentoCard } from '../common/BentoCard';
import { Badge } from '../common/Badge';
import { StatusFilterHistorico } from './types';
import { Search, X, FileText, Printer, RotateCcw } from 'lucide-react';

export interface PDVHistoricoTabProps {
  searchHistorico: string;
  setSearchHistorico: (v: string) => void;
  statusFilterHistorico: StatusFilterHistorico;
  setStatusFilterHistorico: (st: StatusFilterHistorico) => void;
  setRelatorioPDFMode: (m: 'DIARIO' | 'MENSAL') => void;
  setRelatorioPDFModalOpen: (v: boolean) => void;
  filteredHistorico: Venda[];
  setReceiptSale: (v: Venda | null) => void;
  setReceiptModalOpen: (v: boolean) => void;
  abrirModalDevolucao: (v: Venda) => void;
  setVendaParaEstorno: (v: Venda | null) => void;
  setEstornoModalOpen: (v: boolean) => void;
}

export const PDVHistoricoTab: React.FC<PDVHistoricoTabProps> = ({
  searchHistorico,
  setSearchHistorico,
  statusFilterHistorico,
  setStatusFilterHistorico,
  setRelatorioPDFMode,
  setRelatorioPDFModalOpen,
  filteredHistorico,
  setReceiptSale,
  setReceiptModalOpen,
  abrirModalDevolucao,
  setVendaParaEstorno,
  setEstornoModalOpen,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-3xl bg-[#000000] border border-white/[0.16] shadow-bento-dark">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
          <input
            type="text"
            value={searchHistorico}
            onChange={(e) => setSearchHistorico(e.target.value)}
            placeholder="Buscar venda por código, cliente ou forma de pagamento..."
            className="w-full pl-12 pr-10 py-3 rounded-2xl bg-[#000000] border border-white/[0.16] text-sm font-medium text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all duration-200"
          />
          {searchHistorico && (
            <button
              onClick={() => setSearchHistorico('')}
              className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#000000] border border-white/[0.16] overflow-x-auto table-scrollbar">
          {(['TODAS', 'CONCLUIDA', 'CANCELADA'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilterHistorico(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 whitespace-nowrap ${
                statusFilterHistorico === st
                  ? 'bg-emerald-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {st === 'TODAS' ? 'Todas' : st === 'CONCLUIDA' ? 'Concluídas' : 'Estornadas'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2">
          <button
            onClick={() => {
              setRelatorioPDFMode('DIARIO');
              setRelatorioPDFModalOpen(true);
            }}
            className="h-10 px-4 rounded-xl bg-[#000000] hover:bg-white/[0.08] border border-white/[0.16] text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-2 active:scale-95 transition-all shadow-sm cursor-pointer"
            title="Gerar PDF com Fechamento Diário de Vendas"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span>PDF do Dia</span>
          </button>

          <button
            onClick={() => {
              setRelatorioPDFMode('MENSAL');
              setRelatorioPDFModalOpen(true);
            }}
            className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
            title="Gerar PDF com Relatório Consolidado Mensal de Vendas"
          >
            <FileText className="w-3.5 h-3.5 text-white" />
            <span>PDF do Mês</span>
          </button>
        </div>
      </div>

      <BentoCard>
        <div className="overflow-x-auto table-scrollbar pb-2">
          <table className="w-full text-left min-w-[1100px]">
            <thead className="bg-[#000000] border-b border-white/[0.16]">
              <tr className="text-xs font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                <th className="py-3.5 px-4 whitespace-nowrap">Código / Cupom</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Data / Hora</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Cliente</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Pagamento</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-center">Itens</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Total</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-center">Status</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.14]">
              {filteredHistorico.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-slate-500 whitespace-nowrap">
                    Nenhuma venda encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredHistorico.map((v) => (
                  <tr key={v.id} className="hover:bg-white/[0.02] transition-colors group whitespace-nowrap">
                    <td className="py-3.5 px-4 text-xs font-bold text-white group-hover:text-emerald-400 whitespace-nowrap">
                      #{v.id.slice(0, 8)}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(v.data_venda).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3.5 px-4 text-sm font-semibold text-slate-200 whitespace-nowrap">
                      {v.cliente_nome || 'Consumidor Final'}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-lg bg-[#000000] border border-white/[0.16] text-xs text-slate-300">
                        {v.forma_pagamento}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-white text-center whitespace-nowrap">
                      {v.itens?.reduce((acc, it) => acc + it.quantidade, 0) || 0} un
                    </td>
                    <td className="py-3.5 px-4 text-sm font-bold text-emerald-400 whitespace-nowrap">
                      R$ {v.valor_total.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {v.status === 'CONCLUIDA' || v.status === 'PAGO' ? (
                        <Badge variant="emerald">Concluída</Badge>
                      ) : v.status === 'PARCIALMENTE_DEVOLVIDA' ? (
                        <Badge variant="warning">Devolução Parcial</Badge>
                      ) : v.status === 'DEVOLVIDA' ? (
                        <Badge variant="purple">Devolvida</Badge>
                      ) : v.status === 'PENDENTE' ? (
                        <Badge variant="warning">Fiado (Pendente)</Badge>
                      ) : (
                        <Badge variant="danger">Cancelada</Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setReceiptSale(v);
                            setReceiptModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-[#000000] hover:bg-white/[0.08] text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-1 border border-white/[0.16] active:scale-95"
                          title="Reimprimir Comprovante"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Cupom</span>
                        </button>

                        {v.status !== 'CANCELADA' && v.status !== 'DEVOLVIDA' && (
                          <button
                            onClick={() => abrirModalDevolucao(v)}
                            className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-xs font-semibold text-amber-400 flex items-center gap-1 border border-amber-500/30 active:scale-95"
                            title="Troca ou Devolução Parcial de Itens"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Troca/Devolução</span>
                          </button>
                        )}

                        {(v.status === 'CONCLUIDA' || v.status === 'PAGO' || v.status === 'PENDENTE') && (
                          <button
                            onClick={() => {
                              setVendaParaEstorno(v);
                              setEstornoModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-400 flex items-center gap-1 border border-rose-500/30 active:scale-95"
                            title="Estornar Venda e Devolver Itens ao Estoque"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Estornar</span>
                          </button>
                        )}
                      </div>
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
