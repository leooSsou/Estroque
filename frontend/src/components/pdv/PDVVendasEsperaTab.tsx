import React from 'react';
import { VendaEmEspera } from '../../types';
import { BentoCard } from '../common/BentoCard';
import { Badge } from '../common/Badge';
import { PauseCircle, Clock, Trash2, PlayCircle } from 'lucide-react';

export interface PDVVendasEsperaTabProps {
  vendasEspera: VendaEmEspera[];
  handleDescartarVendaEspera: (id: string, codigo: string) => void;
  handleRetomarVendaEspera: (espera: VendaEmEspera) => void;
}

export const PDVVendasEsperaTab: React.FC<PDVVendasEsperaTabProps> = ({
  vendasEspera,
  handleDescartarVendaEspera,
  handleRetomarVendaEspera,
}) => {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-3xl bg-[#000000] border border-white/[0.16] shadow-bento-dark flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <PauseCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Fila de Vendas em Espera (Hold)</h3>
            <p className="text-xs text-slate-400">
              Atendimentos pausados para liberar o caixa. Retome a qualquer instante.
            </p>
          </div>
        </div>

        <Badge variant="warning">
          {vendasEspera.length} {vendasEspera.length === 1 ? 'venda retida' : 'vendas retidas'}
        </Badge>
      </div>

      {vendasEspera.length === 0 ? (
        <BentoCard>
          <div className="text-center py-12 space-y-3">
            <Clock className="w-10 h-10 text-slate-500 mx-auto" />
            <h4 className="text-base font-bold text-white">Nenhuma venda em espera no momento</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Para pausar um atendimento em andamento e liberar o caixa para outro cliente, clique no botão <strong>"Pausar Venda"</strong> no carrinho.
            </p>
          </div>
        </BentoCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendasEspera.map((esp) => (
            <div
              key={esp.id}
              className="bg-[#000000] border border-white/[0.16] rounded-3xl p-5 shadow-bento-dark space-y-4 flex flex-col justify-between hover:border-white/[0.24] transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/30">
                    {esp.codigo}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(esp.criado_em).toLocaleTimeString('pt-BR')}
                  </span>
                </div>

                <div>
                  <div className="text-xs text-slate-400">Cliente:</div>
                  <div className="text-sm font-bold text-white">
                    {esp.cliente_nome || 'Consumidor Final'}
                  </div>
                </div>

                {esp.observacao && (
                  <div className="p-2.5 rounded-xl bg-[#000000] border border-white/[0.16] text-xs text-slate-300 italic">
                    "{esp.observacao}"
                  </div>
                )}

                <div className="space-y-1 pt-2 border-t border-white/[0.14]">
                  <div className="text-xs font-semibold text-slate-300">Itens no Pedido:</div>
                  <div className="text-xs text-slate-400 space-y-0.5 max-h-24 overflow-y-auto table-scrollbar">
                    {esp.itens.map((it, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span className="truncate pr-2">
                          {it.quantidade}x {it.produto.nome}
                        </span>
                        <span className="text-slate-200 font-semibold">
                          R$ {(it.quantidade * it.preco_unitario).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.16] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Valor Total:</span>
                  <span className="text-xl font-bold text-emerald-400">
                    R$ {esp.valor_total.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDescartarVendaEspera(esp.id, esp.codigo)}
                    className="px-3 py-2.5 rounded-xl bg-[#000000] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-white/[0.16] hover:border-rose-400/40 text-xs font-bold transition-all active:scale-95"
                    title="Descartar venda"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleRetomarVendaEspera(esp)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <PlayCircle className="w-4 h-4" />
                    <span>Retomar no Caixa</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
