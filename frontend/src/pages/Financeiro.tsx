import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { FinanceiroLancamento } from '../types';
import { BentoCard } from '../components/common/BentoCard';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  Mail,
  Send,
  Calendar,
  Clock,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';

export const Financeiro: React.FC = () => {
  const { activeLoja } = useAuth();
  const { toast } = useToast();
  const [lancamentos, setLancamentos] = useState<FinanceiroLancamento[]>([]);
  const [loading, setLoading] = useState(true);

  // New expense modal
  const [newExpenseModal, setNewExpenseModal] = useState(false);
  const [despesaValor, setDespesaValor] = useState(250.0);
  const [despesaCategoria, setDespesaCategoria] = useState('Manutenção Predial');
  const [despesaDescricao, setDespesaDescricao] = useState('');
  const [despesaStatus, setDespesaStatus] = useState<'PENDENTE' | 'PAGO'>('PAGO');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getFinanceiro();
      setLancamentos(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeLoja]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.registrarDespesa({
        loja_id: activeLoja?.id || '11111111-1111-1111-1111-111111111111',
        valor: despesaValor,
        categoria: despesaCategoria,
        status_pagamento: despesaStatus,
        descricao: despesaDescricao || despesaCategoria,
      });

      toast.success('Despesa operacional registrada com sucesso!');
      setNewExpenseModal(false);
      loadData();
    } catch {
      toast.error('Erro ao registrar despesa.');
    }
  };

  const handleResendDailyEmail = () => {
    toast.success('Disparo Celery executado! Relatório enviado para dono@estroque.com.br.');
  };

  const totalReceitas = lancamentos
    .filter((l) => l.tipo === 'RECEITA')
    .reduce((acc, l) => acc + l.valor, 0);

  const totalDespesas = lancamentos
    .filter((l) => l.tipo === 'DESPESA')
    .reduce((acc, l) => acc + l.valor, 0);

  const saldoLiquido = totalReceitas - totalDespesas;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F3FBF6] tracking-tight">
            Gestão Financeira & Fluxo de Caixa
          </h1>
          <p className="text-xs text-[#94A89E] mt-1">
            Controle de receitas do PDV, despesas operacionais e rotina de fechamento diário automatizada via Celery.
          </p>
        </div>

        <button
          onClick={() => setNewExpenseModal(true)}
          className="px-5 py-2.5 rounded-full bg-[#10B981] hover:bg-[#059669] text-[#070E0D] font-bold text-xs shadow-glow-emerald transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nova Despesa</span>
        </button>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Receitas Consolidadas"
          value={`R$ ${totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={ArrowDownRight}
          badge={{ text: '+18.2%', trend: 'up' }}
          subtitle="Vendas à vista & crediário"
        />

        <StatCard
          title="Despesas Operacionais"
          value={`R$ ${totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={ArrowUpRight}
          badge={{ text: 'Controlado', trend: 'neutral' }}
          subtitle="Contas fixas & fornecedores"
        />

        <StatCard
          title="Saldo Líquido em Caixa"
          value={`R$ ${saldoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          badge={{ text: saldoLiquido >= 0 ? '+ Superávit' : 'Déficit', trend: saldoLiquido >= 0 ? 'up' : 'warning' }}
          subtitle="Posição financeira em tempo real"
        />
      </div>

      {/* Main Grid: Entries Table & Celery Routine Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Entries Table (7 cols) */}
        <div className="lg:col-span-8">
          <BentoCard
            title="Lançamentos & Extrato Contábil"
            subtitle="Histórico de movimentações financeiras da filial"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[rgba(142,182,155,0.14)] text-[#94A89E]">
                    <th className="py-3 px-3 font-semibold">Data</th>
                    <th className="py-3 px-3 font-semibold">Tipo</th>
                    <th className="py-3 px-3 font-semibold">Descrição / Categoria</th>
                    <th className="py-3 px-3 font-semibold">Status</th>
                    <th className="py-3 px-3 font-semibold text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(142,182,155,0.06)]">
                  {lancamentos.map((l) => (
                    <tr key={l.id} className="hover:bg-[#142522]/40 transition-colors">
                      <td className="py-3.5 px-3 font-mono text-[#94A89E]">
                        {new Date(l.data_lancamento).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3.5 px-3">
                        <Badge variant={l.tipo === 'RECEITA' ? 'mint' : 'danger'}>
                          {l.tipo}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-[#F3FBF6]">{l.descricao || l.categoria}</div>
                        <div className="text-[10px] text-[#94A89E]">{l.categoria}</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <Badge variant={l.status_pagamento === 'PAGO' ? 'emerald' : 'warning'}>
                          {l.status_pagamento}
                        </Badge>
                      </td>
                      <td
                        className={`py-3.5 px-3 font-mono font-bold text-right ${
                          l.tipo === 'RECEITA' ? 'text-[#10B981]' : 'text-red-400'
                        }`}
                      >
                        {l.tipo === 'RECEITA' ? '+' : '-'} R$ {l.valor.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </BentoCard>
        </div>

        {/* Celery Automated Daily Close Widget (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <BentoCard
            title="Fechamento Diário Automatizado"
            subtitle="Tarefa agendada Celery / Redis executada às 23:59"
          >
            <div className="space-y-4 pt-1">
              <div className="p-4 rounded-2xl bg-[#070E0D] border border-[rgba(142,182,155,0.15)] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-[#10B981] font-semibold">
                    <Clock className="w-3.5 h-3.5" /> Próxima Execução
                  </span>
                  <span className="font-mono text-[#8EB69B]">Hoje às 23:59:00</span>
                </div>

                <div className="border-t border-[rgba(142,182,155,0.1)] pt-2.5 text-xs text-[#94A89E] space-y-1.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>Totalização de vendas por forma de pagamento</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>Cálculo de CMV e Lucro Bruto do dia</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>Alerta de itens em ruptura e estoque crítico</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>Disparo de e-mail executivo ao proprietário</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleResendDailyEmail}
                className="w-full py-2.5 px-4 rounded-full bg-[#142522] hover:bg-[#163832] border border-[#10B981]/30 text-xs font-semibold text-[#10B981] flex items-center justify-center gap-2 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Simular Envio de Relatório Agora</span>
              </button>
            </div>
          </BentoCard>
        </div>
      </div>

      {/* New Expense Modal */}
      <Modal
        isOpen={newExpenseModal}
        onClose={() => setNewExpenseModal(false)}
        title="Registrar Despesa Operacional"
        subtitle="Lançamento no contas a pagar da loja ativa"
      >
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#94A89E] mb-1">Categoria</label>
            <select
              value={despesaCategoria}
              onChange={(e) => setDespesaCategoria(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.18)] text-xs text-[#F3FBF6] focus:border-[#10B981] focus:outline-none"
            >
              <option value="Aluguel & Condomínio">Aluguel & Condomínio</option>
              <option value="Energia Elétrica & Internet">Energia Elétrica & Internet</option>
              <option value="Folha de Pagamento">Folha de Pagamento</option>
              <option value="Manutenção Predial">Manutenção Predial</option>
              <option value="Logística & Frete">Logística & Frete</option>
              <option value="Marketing & Anúncios">Marketing & Anúncios</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#94A89E] mb-1">Descrição / Detalhes</label>
            <input
              type="text"
              required
              value={despesaDescricao}
              onChange={(e) => setDespesaDescricao(e.target.value)}
              placeholder="Ex: Pagamento da fatura de energia CPFL"
              className="w-full px-3 py-2 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.18)] text-xs text-[#F3FBF6] focus:border-[#10B981] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#94A89E] mb-1">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={despesaValor}
                onChange={(e) => setDespesaValor(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.18)] text-xs font-mono text-[#F3FBF6] focus:border-[#10B981] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94A89E] mb-1">Status Pagamento</label>
              <select
                value={despesaStatus}
                onChange={(e) => setDespesaStatus(e.target.value as 'PENDENTE' | 'PAGO')}
                className="w-full px-3 py-2 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.18)] text-xs text-[#F3FBF6] focus:border-[#10B981] focus:outline-none"
              >
                <option value="PAGO">Liquidado (Pago)</option>
                <option value="PENDENTE">A Pagar (Pendente)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setNewExpenseModal(false)}
              className="px-4 py-2 rounded-full bg-[#142522] text-xs font-semibold text-[#94A89E]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-full bg-[#10B981] hover:bg-[#059669] text-[#070E0D] text-xs font-bold shadow-glow-emerald"
            >
              Lançar Despesa
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
