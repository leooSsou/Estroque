import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Venda, CaixaTurno } from '../../types';
import {
  Printer,
  Calendar,
  CreditCard,
  Banknote,
  Receipt,
  TrendingUp,
} from 'lucide-react';

interface RelatorioVendasPDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendas: Venda[];
  turnoCaixa?: CaixaTurno | null;
  lojaNome?: string;
  tenantNome?: string;
  usuarioNome?: string;
  initialMode?: 'DIARIO' | 'MENSAL';
}

export const RelatorioVendasPDFModal: React.FC<RelatorioVendasPDFModalProps> = ({
  isOpen,
  onClose,
  vendas,
  turnoCaixa,
  lojaNome = 'Matriz Central',
  tenantNome = 'Estroque Comércio',
  usuarioNome = 'Operador do Caixa',
  initialMode = 'DIARIO',
}) => {
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const thisMonthStr = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const [mode, setMode] = useState<'DIARIO' | 'MENSAL'>(initialMode);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(thisMonthStr);

  // Sincroniza o modo com base no botão clicado do lado de fora (PDF do Dia ou PDF do Mês)
  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode, isOpen]);

  // Filtragem das vendas com base na data ou mês selecionado
  const filteredVendas = useMemo(() => {
    return vendas.filter((v) => {
      const vDate = v.data_venda ? v.data_venda.slice(0, 10) : '';
      if (mode === 'DIARIO') {
        return vDate === selectedDate;
      } else {
        const vMonth = vDate.slice(0, 7);
        return vMonth === selectedMonth;
      }
    });
  }, [vendas, mode, selectedDate, selectedMonth]);

  // Cálculos consolidados dos KPIs
  const kpis = useMemo(() => {
    let bruto = 0;
    let descontos = 0;
    let liquido = 0;
    let canceladasTotal = 0;
    let totalItens = 0;
    let concluidasCount = 0;
    let canceladasCount = 0;

    const porForma: Record<string, { total: number; count: number }> = {
      DINHEIRO: { total: 0, count: 0 },
      PIX: { total: 0, count: 0 },
      CARTAO_CREDITO: { total: 0, count: 0 },
      CARTAO_DEBITO: { total: 0, count: 0 },
      CREDIARIO: { total: 0, count: 0 },
      OUTROS: { total: 0, count: 0 },
    };

    const porDia: Record<string, { total: number; count: number }> = {};
    const porProduto: Record<string, { nome: string; quantidade: number; total: number }> = {};

    for (const v of filteredVendas) {
      const isConcluida = v.status === 'CONCLUIDA';
      if (isConcluida) {
        concluidasCount++;
        const desc = v.desconto || 0;
        descontos += desc;
        liquido += v.valor_total;
        bruto += v.valor_total + desc;

        const forma = (v.forma_pagamento || 'OUTROS').toUpperCase();
        if (!porForma[forma]) {
          porForma[forma] = { total: 0, count: 0 };
        }
        porForma[forma].total += v.valor_total;
        porForma[forma].count += 1;

        // Agrupamento por dia (para relatório mensal)
        const dia = v.data_venda ? v.data_venda.slice(0, 10) : 'Data N/D';
        if (!porDia[dia]) {
          porDia[dia] = { total: 0, count: 0 };
        }
        porDia[dia].total += v.valor_total;
        porDia[dia].count += 1;

        // Agrupamento por produto
        if (v.itens && Array.isArray(v.itens)) {
          for (const item of v.itens) {
            totalItens += item.quantidade;
            const pId = item.produto_id;
            const nome = item.produto_nome || item.sku || `Produto #${pId.slice(0, 6)}`;
            if (!porProduto[pId]) {
              porProduto[pId] = { nome, quantidade: 0, total: 0 };
            }
            porProduto[pId].quantidade += item.quantidade;
            porProduto[pId].total += item.quantidade * item.preco_unitario;
          }
        }
      } else {
        canceladasCount++;
        canceladasTotal += v.valor_total;
      }
    }

    const ticketMedio = concluidasCount > 0 ? liquido / concluidasCount : 0;

    // Ordenar top produtos por receita
    const topProdutos = Object.values(porProduto)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Ordenar dias
    const diasOrdenados = Object.entries(porDia).sort(([a], [b]) => a.localeCompare(b));

    return {
      bruto,
      descontos,
      liquido,
      canceladasTotal,
      totalItens,
      concluidasCount,
      canceladasCount,
      ticketMedio,
      porForma,
      topProdutos,
      diasOrdenados,
    };
  }, [filteredVendas]);

  // Cálculos de Caixa / Turno (para Diário)
  const caixaSummary = useMemo(() => {
    if (!turnoCaixa) return null;
    const abertura = turnoCaixa.fundo_inicial || 0;
    const suprimentos =
      turnoCaixa.operacoes
        ?.filter((op) => op.tipo === 'SUPRIMENTO')
        .reduce((acc, s) => acc + s.valor, 0) || 0;
    const sangrias =
      turnoCaixa.operacoes
        ?.filter((op) => op.tipo === 'SANGRIA')
        .reduce((acc, s) => acc + s.valor, 0) || 0;
    const vendasDinheiro = kpis.porForma['DINHEIRO']?.total || 0;
    const saldoEsperado = abertura + suprimentos + vendasDinheiro - sangrias;

    return {
      abertura,
      suprimentos,
      sangrias,
      vendasDinheiro,
      saldoEsperado,
      status: turnoCaixa.aberto ? 'ABERTO' : 'FECHADO',
    };
  }, [turnoCaixa, kpis]);

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDateDisplay = (isoStr: string) => {
    if (!isoStr) return '';
    const [y, m, d] = isoStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const formatMonthDisplay = (isoStr: string) => {
    if (!isoStr) return '';
    const [y, m] = isoStr.split('-');
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const mesNome = meses[parseInt(m, 10) - 1] || m;
    return `${mesNome} de ${y}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'DIARIO' ? 'Fechamento Diário de Vendas em PDF' : 'Consolidado Mensal de Vendas em PDF'}
      subtitle={
        mode === 'DIARIO'
          ? 'Emissão do fechamento de caixa diário pronto para impressão e salvamento em arquivo PDF'
          : 'Emissão do relatório consolidado mensal pronto para impressão e salvamento em arquivo PDF'
      }
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Controles de Configuração e Exportação (Ocultos na Impressão) */}
        <div className="no-print bg-[#070E0D] border border-[rgba(142,182,155,0.18)] rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {mode === 'DIARIO' ? (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#10B981]" />
                <span className="text-xs font-semibold text-[#DAF1DE]">Data do Fechamento:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 bg-[#142522] border border-[rgba(142,182,155,0.2)] rounded-xl text-xs font-mono text-[#F3FBF6] focus:outline-none focus:border-[#10B981]"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#10B981]" />
                <span className="text-xs font-semibold text-[#DAF1DE]">Mês de Referência:</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-2 bg-[#142522] border border-[rgba(142,182,155,0.2)] rounded-xl text-xs font-mono text-[#F3FBF6] focus:outline-none focus:border-[#10B981]"
                />
              </div>
            )}
          </div>

          <button
            onClick={handlePrint}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-[#070E0D] text-xs font-bold shadow-glow-emerald active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            title="Acionar diálogo de impressão / Salvar PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Salvar PDF / Imprimir</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* DOCUMENTO IMPRESSO / PRÉ-VISUALIZAÇÃO A4 (Classe .printable-report)         */}
        {/* ========================================================================= */}
        <div
          id="relatorio-vendas-pdf"
          className="printable-report bg-[#0A1614] border border-[rgba(142,182,155,0.2)] rounded-2xl p-6 sm:p-8 space-y-6 max-h-[70vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-0 print:border-none print:bg-white"
        >
          {/* Cabeçalho Oficial do Relatório */}
          <div className="border-b-2 border-[#10B981]/40 pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:border-gray-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#10B981]/20 text-[#10B981] font-mono text-[10px] font-bold uppercase tracking-wider print:border print:border-gray-400 print:text-black print:bg-gray-100">
                  Estroque SaaS ERP
                </span>
                <span className="text-xs font-mono text-[#8EB69B] print:text-gray-600">
                  Sistema de Gestão & PDV
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[#F3FBF6] mt-1 tracking-tight print:text-black">
                {mode === 'DIARIO'
                  ? 'FECHAMENTO DIÁRIO DE VENDAS'
                  : 'RELATÓRIO CONSOLIDADO MENSAL'}
              </h2>
              <p className="text-xs font-medium text-[#8EB69B] mt-0.5 print:text-gray-700">
                Empresa: <strong className="text-[#DAF1DE] print:text-black">{tenantNome}</strong> | Filial: <strong className="text-[#DAF1DE] print:text-black">{lojaNome}</strong>
              </p>
            </div>

            <div className="text-left sm:text-right text-xs font-mono space-y-1 text-[#8EB69B] print:text-gray-700">
              <p>
                <span className="font-semibold text-[#F3FBF6] print:text-black">Período:</span>{' '}
                {mode === 'DIARIO' ? formatDateDisplay(selectedDate) : formatMonthDisplay(selectedMonth)}
              </p>
              <p>
                <span className="font-semibold text-[#F3FBF6] print:text-black">Emissão:</span>{' '}
                {new Date().toLocaleString('pt-BR')}
              </p>
              <p>
                <span className="font-semibold text-[#F3FBF6] print:text-black">Operador:</span>{' '}
                {usuarioNome}
              </p>
            </div>
          </div>

          {/* Cards de Resumo Executivo / KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
            <div className="p-3.5 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.15)] print:border-gray-300 print:bg-gray-50">
              <span className="text-[10px] uppercase font-bold text-[#8EB69B] font-mono tracking-wider block print:text-gray-600">
                Faturamento Bruto
              </span>
              <span className="text-base sm:text-lg font-extrabold text-[#F3FBF6] font-mono mt-1 block print:text-black">
                {formatCurrency(kpis.bruto)}
              </span>
              <span className="text-[10px] text-[#5E756B] print:text-gray-500">
                Total sem descontos
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.15)] print:border-gray-300 print:bg-gray-50">
              <span className="text-[10px] uppercase font-bold text-[#8EB69B] font-mono tracking-wider block print:text-gray-600">
                Descontos Aplicados
              </span>
              <span className="text-base sm:text-lg font-extrabold text-[#F87171] font-mono mt-1 block print:text-black">
                - {formatCurrency(kpis.descontos)}
              </span>
              <span className="text-[10px] text-[#5E756B] print:text-gray-500">
                Benefícios concedidos
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#10B981]/15 to-[#070E0D] border border-[#10B981]/35 print:border-gray-300 print:bg-gray-100">
              <span className="text-[10px] uppercase font-bold text-[#10B981] font-mono tracking-wider block print:text-black">
                Faturamento Líquido
              </span>
              <span className="text-base sm:text-lg font-black text-[#10B981] font-mono mt-1 block print:text-black">
                {formatCurrency(kpis.liquido)}
              </span>
              <span className="text-[10px] text-[#8EB69B] print:text-gray-600">
                Receita real apurada
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.15)] print:border-gray-300 print:bg-gray-50">
              <span className="text-[10px] uppercase font-bold text-[#8EB69B] font-mono tracking-wider block print:text-gray-600">
                Ticket Médio
              </span>
              <span className="text-base sm:text-lg font-extrabold text-[#DAF1DE] font-mono mt-1 block print:text-black">
                {formatCurrency(kpis.ticketMedio)}
              </span>
              <span className="text-[10px] text-[#5E756B] print:text-gray-500">
                {kpis.concluidasCount} vendas concluídas
              </span>
            </div>
          </div>

          {/* Seção 2: Formas de Pagamento & Operações de Caixa */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
            {/* Tabela de Formas de Pagamento */}
            <div className="bg-[#070E0D] border border-[rgba(142,182,155,0.15)] rounded-xl p-4 print:border-gray-300 print:bg-transparent">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#A2B89B] mb-3 flex items-center gap-1.5 print:text-black">
                <CreditCard className="w-3.5 h-3.5 text-[#10B981] print:text-black" />
                <span>Desdobramento por Meio de Pagamento</span>
              </h4>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[rgba(142,182,155,0.12)] text-[#8EB69B] print:border-gray-400 print:text-black">
                    <th className="py-1.5 text-left whitespace-nowrap">Modalidade</th>
                    <th className="py-1.5 text-center whitespace-nowrap">Qtd</th>
                    <th className="py-1.5 text-right whitespace-nowrap">Total</th>
                    <th className="py-1.5 text-right whitespace-nowrap">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(142,182,155,0.06)] print:divide-gray-200">
                  {Object.entries(kpis.porForma).map(([forma, dados]) => {
                    const perc = kpis.liquido > 0 ? (dados.total / kpis.liquido) * 100 : 0;
                    if (dados.count === 0 && dados.total === 0) return null;
                    return (
                      <tr key={forma} className="whitespace-nowrap print:text-black">
                        <td className="py-2 text-[#DAF1DE] font-semibold whitespace-nowrap print:text-black">
                          {forma.replace('_', ' ')}
                        </td>
                        <td className="py-2 text-center font-mono text-[#8EB69B] whitespace-nowrap print:text-black">
                          {dados.count}
                        </td>
                        <td className="py-2 text-right font-mono font-bold text-[#F3FBF6] whitespace-nowrap print:text-black">
                          {formatCurrency(dados.total)}
                        </td>
                        <td className="py-2 text-right font-mono text-xs text-[#10B981] whitespace-nowrap print:text-black">
                          {perc.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                  {kpis.concluidasCount === 0 && (
                    <tr>
                      <td colSpan={4} className="py-3 text-center text-xs text-[#5E756B] print:text-gray-500">
                        Nenhum pagamento registrado no período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Turno / Caixa (Modo Diário) OU Top Produtos (Modo Mensal) */}
            {mode === 'DIARIO' ? (
              <div className="bg-[#070E0D] border border-[rgba(142,182,155,0.15)] rounded-xl p-4 print:border-gray-300 print:bg-transparent">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#A2B89B] mb-3 flex items-center gap-1.5 print:text-black">
                  <Banknote className="w-3.5 h-3.5 text-[#10B981] print:text-black" />
                  <span>Conferência de Caixa (Gaveta Física)</span>
                </h4>
                {caixaSummary ? (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-[rgba(142,182,155,0.08)] print:border-gray-200">
                      <span className="text-[#8EB69B] print:text-gray-700">Fundo de Abertura:</span>
                      <span className="font-mono font-bold text-[#F3FBF6] print:text-black">
                        {formatCurrency(caixaSummary.abertura)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-[rgba(142,182,155,0.08)] print:border-gray-200">
                      <span className="text-[#8EB69B] print:text-gray-700">(+) Suprimentos de Troco:</span>
                      <span className="font-mono font-bold text-[#10B981] print:text-black">
                        + {formatCurrency(caixaSummary.suprimentos)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-[rgba(142,182,155,0.08)] print:border-gray-200">
                      <span className="text-[#8EB69B] print:text-gray-700">(+) Vendas em Dinheiro:</span>
                      <span className="font-mono font-bold text-[#10B981] print:text-black">
                        + {formatCurrency(caixaSummary.vendasDinheiro)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-[rgba(142,182,155,0.08)] print:border-gray-200">
                      <span className="text-[#8EB69B] print:text-gray-700">(-) Sangrias Realizadas:</span>
                      <span className="font-mono font-bold text-[#F87171] print:text-black">
                        - {formatCurrency(caixaSummary.sangrias)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t-2 border-[rgba(142,182,155,0.2)] print:border-gray-400">
                      <span className="font-bold text-[#DAF1DE] print:text-black">Saldo Esperado na Gaveta:</span>
                      <span className="font-mono text-sm font-black text-[#10B981] print:text-black">
                        {formatCurrency(caixaSummary.saldoEsperado)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-[#5E756B] print:text-gray-500">
                    Nenhum turno de caixa aberto registrado nesta data.
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#070E0D] border border-[rgba(142,182,155,0.15)] rounded-xl p-4 print:border-gray-300 print:bg-transparent">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#A2B89B] mb-3 flex items-center gap-1.5 print:text-black">
                  <TrendingUp className="w-3.5 h-3.5 text-[#10B981] print:text-black" />
                  <span>Top Produtos Mais Vendidos no Mês</span>
                </h4>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[rgba(142,182,155,0.12)] text-[#8EB69B] print:border-gray-400 print:text-black">
                      <th className="py-1.5 text-left whitespace-nowrap">Produto</th>
                      <th className="py-1.5 text-center whitespace-nowrap">Qtd</th>
                      <th className="py-1.5 text-right whitespace-nowrap">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgba(142,182,155,0.06)] print:divide-gray-200">
                    {kpis.topProdutos.map((p) => (
                      <tr key={p.nome} className="whitespace-nowrap print:text-black">
                        <td className="py-2 text-[#DAF1DE] font-medium whitespace-nowrap truncate max-w-[180px] print:text-black">
                          {p.nome}
                        </td>
                        <td className="py-2 text-center font-mono text-[#8EB69B] whitespace-nowrap print:text-black">
                          {p.quantidade} un
                        </td>
                        <td className="py-2 text-right font-mono font-bold text-[#10B981] whitespace-nowrap print:text-black">
                          {formatCurrency(p.total)}
                        </td>
                      </tr>
                    ))}
                    {kpis.topProdutos.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-3 text-center text-xs text-[#5E756B] print:text-gray-500">
                          Nenhum produto vendido no mês.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Seção 3: Demonstrativo Analítico de Vendas */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#A2B89B] flex items-center justify-between print:text-black">
              <span className="flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-[#10B981] print:text-black" />
                <span>Relação Analítica de Transações ({filteredVendas.length})</span>
              </span>
              <span className="text-[10px] font-mono text-[#8EB69B] print:text-gray-600">
                Canceladas/Estornadas: {kpis.canceladasCount}
              </span>
            </h4>

            <div className="overflow-x-auto border border-[rgba(142,182,155,0.15)] rounded-xl print:border-gray-300">
              <table className="w-full text-left text-xs min-w-[700px] print:min-w-full">
                <thead className="bg-[#142522] border-b border-[rgba(142,182,155,0.18)] print:bg-gray-100 print:border-gray-300">
                  <tr className="text-[#A2B89B] uppercase font-bold text-[10px] tracking-wider print:text-black whitespace-nowrap">
                    <th className="py-2 px-3 whitespace-nowrap">Hora/Data</th>
                    <th className="py-2 px-3 whitespace-nowrap">Cupom</th>
                    <th className="py-2 px-3 whitespace-nowrap">Cliente</th>
                    <th className="py-2 px-3 whitespace-nowrap">Pagamento</th>
                    <th className="py-2 px-3 text-center whitespace-nowrap">Itens</th>
                    <th className="py-2 px-3 text-right whitespace-nowrap">Valor</th>
                    <th className="py-2 px-3 text-center whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(142,182,155,0.06)] print:divide-gray-200">
                  {filteredVendas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-[#5E756B] print:text-gray-500 whitespace-nowrap">
                        Nenhuma venda registrada para o período selecionado.
                      </td>
                    </tr>
                  ) : (
                    filteredVendas.map((v) => (
                      <tr
                        key={v.id}
                        className={`whitespace-nowrap hover:bg-[#142522]/30 print:hover:bg-transparent ${
                          v.status === 'CANCELADA' ? 'opacity-60 bg-red-950/10' : ''
                        }`}
                      >
                        <td className="py-2 px-3 font-mono text-[#8EB69B] whitespace-nowrap print:text-black">
                          {new Date(v.data_venda).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          {mode === 'MENSAL' && ` (${v.data_venda.slice(8, 10)}/${v.data_venda.slice(5, 7)})`}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-[#F3FBF6] whitespace-nowrap print:text-black">
                          #{v.id.slice(0, 8)}
                        </td>
                        <td className="py-2 px-3 text-[#DAF1DE] whitespace-nowrap print:text-black">
                          {v.cliente_nome || 'Consumidor Final'}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-[#070E0D] border border-[rgba(142,182,155,0.15)] font-mono text-[10px] text-[#8EB69B] print:border-gray-300 print:text-black print:bg-transparent">
                            {v.forma_pagamento}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-[#F3FBF6] whitespace-nowrap print:text-black">
                          {v.itens?.reduce((acc, it) => acc + it.quantidade, 0) || 0}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-[#10B981] whitespace-nowrap print:text-black">
                          {formatCurrency(v.valor_total)}
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          {v.status === 'CONCLUIDA' ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold text-[10px] print:border print:border-green-600 print:text-green-800">
                              Concluída
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-semibold text-[10px] print:border print:border-red-600 print:text-red-800">
                              Estornada
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rodapé e Assinaturas para Prestação de Contas */}
          <div className="pt-8 border-t border-[rgba(142,182,155,0.15)] grid grid-cols-2 gap-8 text-center text-xs text-[#8EB69B] print:border-gray-400 print:text-black print:mt-12">
            <div>
              <div className="border-t border-dashed border-[#5E756B] pt-2 w-3/4 mx-auto print:border-gray-500">
                <p className="font-semibold text-[#F3FBF6] print:text-black">{usuarioNome}</p>
                <p className="text-[10px] print:text-gray-600">Operador / Caixa</p>
              </div>
            </div>
            <div>
              <div className="border-t border-dashed border-[#5E756B] pt-2 w-3/4 mx-auto print:border-gray-500">
                <p className="font-semibold text-[#F3FBF6] print:text-black">Gerência / Supervisão</p>
                <p className="text-[10px] print:text-gray-600">Conferido e Homologado</p>
              </div>
            </div>
          </div>
        </div>

        {/* Botão de Fechamento do Modal no Rodapé (no-print) */}
        <div className="no-print flex items-center justify-between pt-3 border-t border-[rgba(142,182,155,0.12)]">
          <div className="text-xs text-[#8EB69B]">
            Dica: Ao clicar em <strong>"Salvar PDF / Imprimir"</strong>, selecione <em>"Salvar como PDF"</em> no destino da impressora.
          </div>
          <button
            onClick={onClose}
            className="h-10 px-5 rounded-xl bg-[#142522] hover:bg-[#1B332E] text-xs font-semibold text-[#94A89E] hover:text-[#F3FBF6] active:scale-95 transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
};
