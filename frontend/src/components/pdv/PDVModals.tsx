import React from 'react';
import {
  Produto,
  Cliente,
  Venda,
  CaixaTurno,
  Loja,
  User,
} from '../../types';
import { Modal } from '../common/Modal';
import { RelatorioVendasPDFModal } from './RelatorioVendasPDFModal';
import {
  DrawerStats,
  ItensDevolucaoMap,
  TipoResolucaoDevolucao,
} from './types';
import {
  PauseCircle,
  AlertTriangle,
  Loader2,
  RotateCcw,
  Wallet,
  Banknote,
  CalendarClock,
  ArrowDownRight,
  ArrowUpRight,
  Lock,
  Unlock,
  Printer,
} from 'lucide-react';

export interface PDVModalsProps {
  activeLoja: Loja | null;
  user: User | null;
  produtos: Produto[];
  clientes: Cliente[];
  vendasHistorico: Venda[];
  caixaTurno: CaixaTurno | null;
  drawerStats: DrawerStats;
  onSuccessToast: (msg: string) => void;
  addItemDirectlyToCart: (prod: Produto) => void;

  // 1. Pause Modal
  pauseModalOpen: boolean;
  setPauseModalOpen: (v: boolean) => void;
  pauseObservacao: string;
  setPauseObservacao: (v: string) => void;
  handleConfirmPauseSale: () => void;

  // 2. Estorno Modal
  estornoModalOpen: boolean;
  setEstornoModalOpen: (v: boolean) => void;
  vendaParaEstorno: Venda | null;
  isSubmittingEstorno: boolean;
  handleConfirmarEstorno: () => void;

  // 2.5 Variations Picker Modal
  variacoesPickerOpen: boolean;
  setVariacoesPickerOpen: (v: boolean) => void;
  selectedPaiForPicker: Produto | null;

  // 2.8 Devolucao / Troca Modal
  devolucaoModalOpen: boolean;
  setDevolucaoModalOpen: (v: boolean) => void;
  vendaParaDevolucao: Venda | null;
  itensDevolucaoSelecionados: ItensDevolucaoMap;
  setItensDevolucaoSelecionados: React.Dispatch<React.SetStateAction<ItensDevolucaoMap>>;
  tipoResolucao: TipoResolucaoDevolucao;
  setTipoResolucao: (v: TipoResolucaoDevolucao) => void;
  motivoDevolucao: string;
  setMotivoDevolucao: (v: string) => void;
  totalDevolucaoCalculado: number;
  isSubmittingDevolucao: boolean;
  handleConfirmarDevolucao: () => void;

  // 3. Sangria Modal
  sangriaModalOpen: boolean;
  setSangriaModalOpen: (v: boolean) => void;
  sangriaValor: number | '';
  setSangriaValor: (v: number | '') => void;
  sangriaMotivo: string;
  setSangriaMotivo: (v: string) => void;
  isSubmittingSangria: boolean;
  handleRegistrarSangria: (e: React.FormEvent) => void;

  // 4. Suprimento Modal
  suprimentoModalOpen: boolean;
  setSuprimentoModalOpen: (v: boolean) => void;
  suprimentoValor: number | '';
  setSuprimentoValor: (v: number | '') => void;
  suprimentoMotivo: string;
  setSuprimentoMotivo: (v: string) => void;
  isSubmittingSuprimento: boolean;
  handleRegistrarSuprimento: (e: React.FormEvent) => void;

  // 5. Fechamento Modal
  fechamentoModalOpen: boolean;
  setFechamentoModalOpen: (v: boolean) => void;
  saldoContado: number | '';
  setSaldoContado: (v: number | '') => void;
  fechamentoObservacao: string;
  setFechamentoObservacao: (v: string) => void;
  isSubmittingFechamento: boolean;
  handleFecharTurno: (e: React.FormEvent) => void;

  // 6. Abertura Modal
  aberturaModalOpen: boolean;
  setAberturaModalOpen: (v: boolean) => void;
  aberturaFundo: number | '';
  setAberturaFundo: (v: number | '') => void;
  isSubmittingAbertura: boolean;
  handleAbrirTurno: (e: React.FormEvent) => void;

  // 7. Receipt Modal
  receiptModalOpen: boolean;
  setReceiptModalOpen: (v: boolean) => void;
  receiptSale: Venda | null;
  getReceiptItemDetails: (it: {
    produto_id: string;
    produto_nome?: string;
    sku?: string;
  }) => { nome: string; sku: string; variacaoDesc: string };
  handlePrintReceipt: () => void;

  // 8. Relatório PDF Modal
  relatorioPDFModalOpen: boolean;
  setRelatorioPDFModalOpen: (v: boolean) => void;
  relatorioPDFMode: 'DIARIO' | 'MENSAL';
}

export const PDVModals: React.FC<PDVModalsProps> = ({
  activeLoja,
  user,
  produtos,
  clientes,
  vendasHistorico,
  caixaTurno,
  drawerStats,
  onSuccessToast,
  addItemDirectlyToCart,
  pauseModalOpen,
  setPauseModalOpen,
  pauseObservacao,
  setPauseObservacao,
  handleConfirmPauseSale,
  estornoModalOpen,
  setEstornoModalOpen,
  vendaParaEstorno,
  isSubmittingEstorno,
  handleConfirmarEstorno,
  variacoesPickerOpen,
  setVariacoesPickerOpen,
  selectedPaiForPicker,
  devolucaoModalOpen,
  setDevolucaoModalOpen,
  vendaParaDevolucao,
  itensDevolucaoSelecionados,
  setItensDevolucaoSelecionados,
  tipoResolucao,
  setTipoResolucao,
  motivoDevolucao,
  setMotivoDevolucao,
  totalDevolucaoCalculado,
  isSubmittingDevolucao,
  handleConfirmarDevolucao,
  sangriaModalOpen,
  setSangriaModalOpen,
  sangriaValor,
  setSangriaValor,
  sangriaMotivo,
  setSangriaMotivo,
  isSubmittingSangria,
  handleRegistrarSangria,
  suprimentoModalOpen,
  setSuprimentoModalOpen,
  suprimentoValor,
  setSuprimentoValor,
  suprimentoMotivo,
  setSuprimentoMotivo,
  isSubmittingSuprimento,
  handleRegistrarSuprimento,
  fechamentoModalOpen,
  setFechamentoModalOpen,
  saldoContado,
  setSaldoContado,
  fechamentoObservacao,
  setFechamentoObservacao,
  isSubmittingFechamento,
  handleFecharTurno,
  aberturaModalOpen,
  setAberturaModalOpen,
  aberturaFundo,
  setAberturaFundo,
  isSubmittingAbertura,
  handleAbrirTurno,
  receiptModalOpen,
  setReceiptModalOpen,
  receiptSale,
  getReceiptItemDetails,
  handlePrintReceipt,
  relatorioPDFModalOpen,
  setRelatorioPDFModalOpen,
  relatorioPDFMode,
}) => {
  return (
    <>
      {/* 1. Pause / Hold Sale Modal */}
      <Modal
        isOpen={pauseModalOpen}
        onClose={() => setPauseModalOpen(false)}
        title="Pausar Atendimento (Hold)"
        subtitle="Reter venda temporariamente para atender outro cliente"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            Os itens e o cliente atual serão salvos na aba <strong>"Vendas em Espera"</strong>. O caixa ficará imediatamente limpo e disponível para novas vendas.
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Observação ou Referência do Cliente (Opcional):</label>
            <input
              type="text"
              value={pauseObservacao}
              onChange={(e) => setPauseObservacao(e.target.value)}
              placeholder="Ex: Foi buscar o cartão no carro, aguardando aprovação..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#000000] border border-white/[0.16] text-sm text-white focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.16]">
            <button
              type="button"
              onClick={() => setPauseModalOpen(false)}
              className="h-10 px-4 rounded-xl bg-[#000000] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white border border-white/[0.16] transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmPauseSale}
              className="h-10 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold shadow-md shadow-amber-500/25 flex items-center gap-1.5 active:scale-95"
            >
              <PauseCircle className="w-4 h-4" />
              <span>Confirmar e Pausar</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* 2. Estorno Confirmation Modal */}
      <Modal
        isOpen={estornoModalOpen}
        onClose={() => setEstornoModalOpen(false)}
        title="Confirmar Estorno de Venda"
        subtitle={vendaParaEstorno ? `Cupom #${vendaParaEstorno.id.slice(0, 8)}` : ''}
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2 text-xs text-rose-300">
            <div className="flex items-center gap-2 font-bold text-rose-400 text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>Atenção: Ação com impacto em estoque e financeiro!</span>
            </div>
            <p>
              Ao confirmar o estorno desta venda:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Todos os itens vendidos serão automaticamente devolvidos ao estoque da loja.</li>
              <li>O valor da venda (<strong>R$ {vendaParaEstorno?.valor_total.toFixed(2)}</strong>) será compensado no financeiro.</li>
              {vendaParaEstorno?.forma_pagamento === 'CREDIARIO' && (
                <li>O saldo devedor do cliente será recomposto, liberando seu limite de crédito.</li>
              )}
            </ul>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.16]">
            <button
              onClick={() => setEstornoModalOpen(false)}
              className="h-10 px-4 rounded-xl bg-[#000000] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white border border-white/[0.16] transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmarEstorno}
              disabled={isSubmittingEstorno}
              className="h-10 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/25 flex items-center gap-1.5 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmittingEstorno ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Estornando...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  <span>Confirmar Estorno</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Seletor de Variações no PDV */}
      <Modal
        isOpen={variacoesPickerOpen}
        onClose={() => setVariacoesPickerOpen(false)}
        title={`Selecione a Variação: ${selectedPaiForPicker?.nome}`}
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            Escolha a especificação desejada (Tamanho, Cor, Voltagem) para adicionar ao carrinho:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
            {produtos
              .filter((p) => p.produto_pai_id === selectedPaiForPicker?.id && p.ativo)
              .map((v) => {
                const stock = activeLoja?.id
                  ? v.estoque_por_loja?.[activeLoja.id] ?? 0
                  : v.estoque_total ?? 0;
                const desc = v.variacoes
                  ? Object.entries(v.variacoes)
                      .map(([k, val]) => `${k}: ${val}`)
                      .join(' | ')
                  : v.nome;

                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={stock <= 0}
                    onClick={() => {
                      addItemDirectlyToCart(v);
                      setVariacoesPickerOpen(false);
                      onSuccessToast(`Adicionado: ${v.nome}`);
                    }}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      stock > 0
                        ? 'bg-[#000000] border-white/[0.16] hover:border-yellow-400 hover:bg-yellow-400/10 active:scale-95'
                        : 'bg-white/[0.02] border-white/[0.08] opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">{desc}</span>
                      <span className="font-mono text-[10px] text-slate-400">{v.sku}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/[0.08]">
                      <span className="text-xs font-bold text-yellow-400">
                        {v.preco_venda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      <span className={`text-[11px] font-bold ${stock > 0 ? 'text-slate-300' : 'text-rose-400'}`}>
                        {stock > 0 ? `${stock} un em estoque` : 'Esgotado'}
                      </span>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      </Modal>

      {/* 2.1 Modal Troca e Devolução Parcial */}
      <Modal
        isOpen={devolucaoModalOpen}
        onClose={() => setDevolucaoModalOpen(false)}
        title="Troca / Devolução de Itens da Venda"
        subtitle={vendaParaDevolucao ? `Cupom #${vendaParaDevolucao.id.slice(0, 8)} - ${vendaParaDevolucao.cliente_nome || 'Consumidor Final'}` : ''}
      >
        <div className="space-y-4">
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
            Selecione os produtos e quantidades a devolver. O estoque da filial será recomposto e a resolução financeira aplicada.
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            <span className="text-xs font-bold text-slate-300">Itens Comprados na Venda:</span>
            {vendaParaDevolucao?.itens?.map((item) => {
              const cfg = itensDevolucaoSelecionados[item.id] || {
                quantidade: 1,
                retornar_ao_estoque: true,
                condicao: 'PERFEITO',
                selecionado: false,
              };
              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border transition-all ${
                    cfg.selecionado
                      ? 'bg-white/[0.04] border-emerald-500/40'
                      : 'bg-[#000000] border-white/[0.12] opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={cfg.selecionado}
                        onChange={(e) =>
                          setItensDevolucaoSelecionados((prev) => ({
                            ...prev,
                            [item.id]: { ...cfg, selecionado: e.target.checked },
                          }))
                        }
                        className="rounded border-white/[0.2] text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-white">
                          {item.produto_nome || `Produto #${item.produto_id.slice(0, 8)}`}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Preço unitário: R$ {item.preco_unitario.toFixed(2)} (Comprado: {item.quantidade} un)
                        </div>
                      </div>
                    </label>

                    {cfg.selecionado && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <label className="text-[10px] text-slate-400 font-bold">Qtd:</label>
                          <input
                            type="number"
                            min={1}
                            max={item.quantidade}
                            value={cfg.quantidade}
                            onChange={(e) => {
                              const val = Math.max(1, Math.min(item.quantidade, parseInt(e.target.value) || 1));
                              setItensDevolucaoSelecionados((prev) => ({
                                ...prev,
                                [item.id]: { ...cfg, quantidade: val },
                              }));
                            }}
                            className="w-14 px-2 py-1 rounded-lg bg-[#000000] border border-white/[0.16] text-xs font-bold text-white text-center focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                        <span className="text-xs font-bold text-emerald-400 min-w-16 text-right">
                          R$ {(cfg.quantidade * item.preco_unitario).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>

                  {cfg.selecionado && (
                    <div className="mt-2.5 pt-2 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 select-none">
                        <input
                          type="checkbox"
                          checked={cfg.retornar_ao_estoque}
                          onChange={(e) =>
                            setItensDevolucaoSelecionados((prev) => ({
                              ...prev,
                              [item.id]: { ...cfg, retornar_ao_estoque: e.target.checked },
                            }))
                          }
                          className="rounded border-white/[0.2] text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>Retornar ao estoque vendável</span>
                      </label>

                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">Estado:</span>
                        <select
                          value={cfg.condicao}
                          onChange={(e) =>
                            setItensDevolucaoSelecionados((prev) => ({
                              ...prev,
                              [item.id]: { ...cfg, condicao: e.target.value as any },
                            }))
                          }
                          className="px-2 py-0.5 rounded-lg bg-[#000000] border border-white/[0.16] text-slate-300 text-[11px]"
                        >
                          <option value="PERFEITO">Perfeito</option>
                          <option value="AVARIADO">Avariado / Defeito</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-white/[0.12]">
            <label className="text-xs font-bold text-slate-300">Resolução Financeira da Devolução:</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTipoResolucao('CREDITO_LOJA')}
                disabled={!vendaParaDevolucao?.cliente_id}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  tipoResolucao === 'CREDITO_LOJA'
                    ? 'bg-purple-600/20 border-purple-500 text-white'
                    : 'bg-[#000000] border-white/[0.12] text-slate-400 hover:text-white'
                } ${!vendaParaDevolucao?.cliente_id ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-purple-400" />
                  <span>Vale-Crédito</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Crédito para o cliente em futuras compras</div>
              </button>

              <button
                type="button"
                onClick={() => setTipoResolucao('REEMBOLSO_CAIXA')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  tipoResolucao === 'REEMBOLSO_CAIXA'
                    ? 'bg-emerald-600/20 border-emerald-500 text-white'
                    : 'bg-[#000000] border-white/[0.12] text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Reembolso Caixa</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Devolução em dinheiro/saída do caixa</div>
              </button>

              <button
                type="button"
                onClick={() => setTipoResolucao('ABATIMENTO_CREDIARIO')}
                disabled={!vendaParaDevolucao?.cliente_id}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  tipoResolucao === 'ABATIMENTO_CREDIARIO'
                    ? 'bg-amber-600/20 border-amber-500 text-white'
                    : 'bg-[#000000] border-white/[0.12] text-slate-400 hover:text-white'
                } ${!vendaParaDevolucao?.cliente_id ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <CalendarClock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Abater Crediário</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Amortiza do fiado do cliente</div>
              </button>
            </div>
            {!vendaParaDevolucao?.cliente_id && (
              <p className="text-[10px] text-slate-400 italic">
                * Venda sem cliente identificado permite apenas Reembolso direto no Caixa.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Motivo da Troca / Devolução:</label>
            <input
              type="text"
              required
              value={motivoDevolucao}
              onChange={(e) => setMotivoDevolucao(e.target.value)}
              placeholder="Ex: Tamanho incorreto, produto com avaria no tecido, arrependimento..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#000000] border border-white/[0.16] text-xs text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.12] flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Total a Devolver/Creditar:</span>
            <span className="text-base font-bold text-emerald-400">
              R$ {totalDevolucaoCalculado.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.16]">
            <button
              type="button"
              onClick={() => setDevolucaoModalOpen(false)}
              className="h-10 px-4 rounded-xl bg-[#000000] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white border border-white/[0.16] transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSubmittingDevolucao || totalDevolucaoCalculado <= 0}
              onClick={handleConfirmarDevolucao}
              className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-600/25 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{isSubmittingDevolucao ? 'Processando...' : 'Confirmar Devolução'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* 3. Modal Sangria */}
      <Modal
        isOpen={sangriaModalOpen}
        onClose={() => setSangriaModalOpen(false)}
        title="Sangria de Caixa (Retirada)"
        subtitle="Retirada física de dinheiro da gaveta para o cofre ou despesa"
      >
        <form onSubmit={handleRegistrarSangria} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Valor da Retirada (R$):</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={sangriaValor}
              onChange={(e) => setSangriaValor(e.target.value === '' ? '' : parseFloat(e.target.value))}
              placeholder="0,00"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#000000] border border-white/[0.16] text-base font-bold text-white focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Motivo / Destino:</label>
            <input
              type="text"
              required
              value={sangriaMotivo}
              onChange={(e) => setSangriaMotivo(e.target.value)}
              placeholder="Ex: Recolhimento para cofre central"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#000000] border border-white/[0.16] text-sm text-white focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.16]">
            <button
              type="button"
              onClick={() => setSangriaModalOpen(false)}
              className="h-10 px-4 rounded-xl bg-[#000000] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white border border-white/[0.16] transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmittingSangria}
              className="h-10 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold shadow-md shadow-amber-500/25 flex items-center gap-1.5 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmittingSangria ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registrando...</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="w-4 h-4" />
                  <span>Registrar Sangria</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* 4. Modal Suprimento */}
      <Modal
        isOpen={suprimentoModalOpen}
        onClose={() => setSuprimentoModalOpen(false)}
        title="Suprimento de Caixa (Aporte)"
        subtitle="Entrada de dinheiro para troco na gaveta"
      >
        <form onSubmit={handleRegistrarSuprimento} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Valor do Aporte (R$):</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={suprimentoValor}
              onChange={(e) => setSuprimentoValor(e.target.value === '' ? '' : parseFloat(e.target.value))}
              placeholder="0,00"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#000000] border border-white/[0.16] text-base font-bold text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Motivo / Origem:</label>
            <input
              type="text"
              required
              value={suprimentoMotivo}
              onChange={(e) => setSuprimentoMotivo(e.target.value)}
              placeholder="Ex: Troco inicial extra em moedas e notas"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#000000] border border-white/[0.16] text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.16]">
            <button
              type="button"
              onClick={() => setSuprimentoModalOpen(false)}
              className="h-10 px-4 rounded-xl bg-[#000000] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white border border-white/[0.16] transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmittingSuprimento}
              className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/25 flex items-center gap-1.5 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmittingSuprimento ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registrando...</span>
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Registrar Suprimento</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* 5. Modal Fechamento de Caixa (Contagem Cega) */}
      <Modal
        isOpen={fechamentoModalOpen}
        onClose={() => setFechamentoModalOpen(false)}
        title="Fechamento de Caixa • Contagem Cega"
        subtitle="Auditoria e encerramento do turno de trabalho"
      >
        <form onSubmit={handleFecharTurno} className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-[#000000] border border-white/[0.16] space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Saldo Calculado pelo Sistema:</span>
              <span className="font-bold text-white">
                R$ {drawerStats.saldoEsperadoGaveta.toFixed(2)}
              </span>
            </div>
            {typeof saldoContado === 'number' && (
              <div className="flex justify-between border-t border-white/[0.16] pt-2 font-bold">
                <span className="text-slate-300">Conferência Física:</span>
                <span
                  className={`text-sm ${
                    Math.abs(saldoContado - drawerStats.saldoEsperadoGaveta) < 0.01
                      ? 'text-emerald-400 font-extrabold'
                      : saldoContado - drawerStats.saldoEsperadoGaveta < 0
                      ? 'text-rose-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {Math.abs(saldoContado - drawerStats.saldoEsperadoGaveta) < 0.01
                    ? '✓ Caixa Exato (R$ 0,00)'
                    : saldoContado - drawerStats.saldoEsperadoGaveta < 0
                    ? `Quebra de Caixa: -R$ ${Math.abs(saldoContado - drawerStats.saldoEsperadoGaveta).toFixed(2)}`
                    : `Sobra de Caixa: +R$ ${(saldoContado - drawerStats.saldoEsperadoGaveta).toFixed(2)}`}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Saldo Físico em Gaveta (Contagem Cega):
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={saldoContado}
              onChange={(e) => setSaldoContado(e.target.value === '' ? '' : parseFloat(e.target.value))}
              placeholder="Informe o total apurado em dinheiro"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#000000] border border-white/[0.16] text-base font-bold text-white focus:border-rose-400 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Observações do Fechamento:</label>
            <textarea
              rows={2}
              value={fechamentoObservacao}
              onChange={(e) => setFechamentoObservacao(e.target.value)}
              placeholder="Justificativa para divergência ou recados para o próximo turno..."
              className="w-full px-3.5 py-2 rounded-xl bg-[#000000] border border-white/[0.16] text-xs text-white focus:border-rose-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.16]">
            <button
              type="button"
              onClick={() => setFechamentoModalOpen(false)}
              className="h-10 px-4 rounded-xl bg-[#000000] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white border border-white/[0.16] transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmittingFechamento}
              className="h-10 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/25 flex items-center gap-1.5 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmittingFechamento ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Fechando...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Confirmar Fechamento</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* 6. Modal Abertura de Turno */}
      <Modal
        isOpen={aberturaModalOpen}
        onClose={() => setAberturaModalOpen(false)}
        title="Abrir Novo Turno de Caixa"
        subtitle="Informe o valor inicial disponibilizado para troco"
      >
        <form onSubmit={handleAbrirTurno} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Fundo Inicial de Troco (R$):</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={aberturaFundo}
              onChange={(e) => setAberturaFundo(e.target.value === '' ? '' : parseFloat(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#000000] border border-white/[0.16] text-base font-bold text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.16]">
            <button
              type="button"
              onClick={() => setAberturaModalOpen(false)}
              className="h-10 px-4 rounded-xl bg-[#000000] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white border border-white/[0.16] transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmittingAbertura}
              className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/25 flex items-center gap-1.5 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmittingAbertura ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Abrindo...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>Abrir Caixa</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* 7. Printable Receipt Modal (Cupom Não-Fiscal) */}
      <Modal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        title="Comprovante de Venda • Cupom Não-Fiscal"
        subtitle={`Transação #${receiptSale?.id.slice(0, 8)}`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div
            id="printable-receipt"
            className="p-5 sm:p-6 rounded-2xl bg-[#000000] border border-white/[0.16] text-xs space-y-3 font-mono print:bg-white print:border-none print:p-0 print:text-black"
          >
            <div className="text-center pb-2.5 border-b border-dashed border-white/[0.2] print:border-black receipt-dashed">
              <div className="text-sm font-bold text-white uppercase tracking-wider print:text-black">
                {activeLoja?.nome || 'Estroque Enterprise'}
              </div>
              <div className="text-[11px] text-slate-300 font-medium print:text-black">
                {activeLoja?.endereco || 'Matriz Central'}
              </div>
              <div className="text-[11px] text-slate-400 print:text-black font-semibold mt-0.5">
                {activeLoja?.cnpj ? `CNPJ: ${activeLoja.cnpj}` : 'CNPJ não informado'}
              </div>
              <div className="text-[11px] font-bold text-yellow-400 uppercase tracking-widest mt-2 pt-1 border-t border-dashed border-white/[0.16] print:border-black print:text-black">
                CUPOM NÃO-FISCAL
              </div>
            </div>

            <div className="text-[11px] space-y-1 text-slate-300 print:text-black py-1 border-b border-dashed border-white/[0.2] print:border-black receipt-dashed">
              <div className="flex justify-between">
                <span>Data/Hora:</span>
                <span className="font-semibold text-white print:text-black">
                  {receiptSale?.data_venda ? new Date(receiptSale.data_venda).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Cupom / Transação:</span>
                <span className="font-bold text-white print:text-black">
                  #{receiptSale?.id.slice(0, 8)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Operador:</span>
                <span className="text-white print:text-black">
                  {user?.nome || user?.email?.split('@')[0] || 'Operador de Caixa'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Cliente:</span>
                <span className="text-white print:text-black font-medium">
                  {(() => {
                    const c = clientes.find((cli) => cli.id === receiptSale?.cliente_id);
                    return receiptSale?.cliente_nome || c?.nome || 'Consumidor Final (Sem CPF)';
                  })()}
                </span>
              </div>
            </div>

            <div className="flex justify-between text-[11px] font-bold uppercase text-slate-400 print:text-black pt-1 border-b border-dashed border-white/[0.2] print:border-black pb-1">
              <span>Item / Descrição</span>
              <span>Total</span>
            </div>

            <div className="space-y-2 py-1">
              {receiptSale?.itens?.map((it, idx) => {
                const details = getReceiptItemDetails(it);
                const itemTotal = it.quantidade * it.preco_unitario;

                return (
                  <div key={it.id || idx} className="text-xs flex justify-between gap-3 text-white print:text-black">
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold print:font-bold">
                        {String(idx + 1).padStart(2, '0')}. {it.quantidade}x {details.nome}
                      </span>
                      {details.variacaoDesc && (
                        <span className="text-[11px] text-yellow-400 font-medium print:text-black print:font-semibold">
                          └ {details.variacaoDesc}
                        </span>
                      )}
                      {details.sku && (
                        <span className="text-[10px] text-slate-400 font-mono print:text-gray-700">
                          SKU: {details.sku}
                        </span>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-yellow-400 font-bold print:text-black print:font-bold">
                        R$ {itemTotal.toFixed(2)}
                      </div>
                      {it.quantidade > 1 && (
                        <div className="text-[10px] text-slate-400 print:text-gray-600">
                          ({it.quantidade}x {it.preco_unitario.toFixed(2)})
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-dashed border-white/[0.2] print:border-black pt-2 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-300 print:text-black">
                <span>Qtd. Total de Itens:</span>
                <span className="font-semibold text-white print:text-black">
                  {receiptSale?.itens?.reduce((acc, it) => acc + it.quantidade, 0) || 0} un
                </span>
              </div>

              <div className="flex justify-between text-slate-300 print:text-black">
                <span>Subtotal:</span>
                <span className="font-semibold text-white print:text-black">
                  R$ {((receiptSale?.valor_total || 0) + (receiptSale?.desconto || 0)).toFixed(2)}
                </span>
              </div>

              {receiptSale?.desconto ? (
                <div className="flex justify-between text-amber-400 font-medium print:text-black print:font-semibold">
                  <span>Desconto Concedido:</span>
                  <span>- R$ {receiptSale.desconto.toFixed(2)}</span>
                </div>
              ) : null}

              {receiptSale?.pagamentos && receiptSale.pagamentos.length > 1 ? (
                <div className="space-y-1 pt-1 border-t border-dashed border-white/[0.14] print:border-black">
                  <span className="text-[11px] font-bold text-slate-300 print:text-black">Pagamento Dividido:</span>
                  {receiptSale.pagamentos.map((p, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-white print:text-black">
                      <span className="text-slate-400 print:text-black">• {p.forma_pagamento}:</span>
                      <span className="font-semibold text-yellow-400 print:text-black">R$ {p.valor.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex justify-between text-slate-300 print:text-black">
                  <span>Forma de Pagamento:</span>
                  <span className="font-bold text-white print:text-black">{receiptSale?.forma_pagamento}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-bold text-white print:text-black pt-2 border-t-2 border-dashed border-white/[0.25] print:border-black">
                <span>TOTAL A PAGAR:</span>
                <span className="text-yellow-400 font-extrabold text-base print:text-black">
                  R$ {receiptSale?.valor_total.toFixed(2)}
                </span>
              </div>
            </div>

            {receiptSale?.forma_pagamento === 'CREDIARIO' && (
              <div className="p-2 rounded bg-white/[0.04] text-[10px] text-slate-300 text-center border border-white/[0.14] print:border-black print:text-black">
                Venda registrada no crediário da loja. Saldo devedor do cliente atualizado.
              </div>
            )}

            {receiptSale?.status === 'CANCELADA' && (
              <div className="p-2 rounded bg-rose-500/15 text-[10px] text-rose-400 text-center font-bold border border-rose-500/30 print:border-black print:text-black">
                ⚠️ VENDA CANCELADA / ESTORNADA NO SISTEMA
              </div>
            )}

            <div className="text-center text-[10px] text-slate-400 print:text-black pt-2 border-t border-dashed border-white/[0.16] print:border-black space-y-0.5">
              <p className="font-bold">*** NÃO É DOCUMENTO FISCAL ***</p>
              <p>Sistema Estroque PDV • Obrigado pela preferência!</p>
            </div>
          </div>

          <div className="no-print flex items-center justify-end gap-3 pt-4 border-t border-white/[0.16]">
            <button
              onClick={() => setReceiptModalOpen(false)}
              className="h-11 px-5 rounded-xl bg-[#000000] hover:bg-white/[0.08] text-sm font-semibold text-slate-300 hover:text-white border border-white/[0.16] active:scale-95 transition-all"
            >
              Fechar
            </button>
            <button
              onClick={handlePrintReceipt}
              className="h-11 px-6 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black text-sm font-extrabold shadow-md shadow-yellow-400/20 active:scale-95 transition-all flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Comprovante</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* 8. Relatório Executivo de Vendas em PDF (Fechamento Diário e Mensal) */}
      <RelatorioVendasPDFModal
        isOpen={relatorioPDFModalOpen}
        onClose={() => setRelatorioPDFModalOpen(false)}
        vendas={vendasHistorico}
        turnoCaixa={caixaTurno}
        lojaNome={activeLoja?.nome || 'Matriz Central'}
        tenantNome="Estroque Comércio & Gestão"
        usuarioNome={user?.nome || user?.email || 'Operador do Caixa'}
        initialMode={relatorioPDFMode}
      />
    </>
  );
};
