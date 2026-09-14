import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { MovimentacaoEstoque, Produto } from '../types';
import { BentoCard } from '../components/common/BentoCard';
import { Badge } from '../components/common/Badge';
import {
  ScrollText,
  ShieldCheck,
  ArrowDownRight,
  ArrowUpRight,
  Download,
  ClipboardList,
  Search,
  Filter,
} from 'lucide-react';

export const LedgerAuditoria: React.FC = () => {
  const { activeLoja } = useAuth();
  const navigate = useNavigate();
  const [ledger, setLedger] = useState<MovimentacaoEstoque[]>([]);
  const [produtos, setProdutos] = useState<Record<string, Produto>>({});
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState<'TODOS' | 'ENTRADA' | 'SAIDA'>('TODOS');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [ledgerData, prodsData] = await Promise.all([
          api.getLedger(),
          api.getProdutos(),
        ]);
        setLedger(ledgerData);
        const map: Record<string, Produto> = {};
        for (const p of prodsData) map[p.id] = p;
        setProdutos(map);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeLoja]);

  const handleExportCSV = () => {
    const headers = ['Data', 'Tipo', 'Produto', 'SKU', 'Quantidade', 'Saldo Anterior', 'Saldo Final', 'Responsavel', 'Motivo'];
    const rows = ledger.map((m) => [
      m.data_movimentacao,
      m.tipo,
      `"${produtos[m.produto_id]?.nome || m.produto_id}"`,
      `"${produtos[m.produto_id]?.sku || ''}"`,
      m.quantidade,
      m.saldo_anterior ?? '',
      m.saldo_resultante ?? '',
      `"${m.responsavel || 'Operador'}"`,
      `"${m.motivo}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `estroque_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = ledger.filter((m) => {
    const prod = produtos[m.produto_id];
    const matchSearch =
      (prod?.nome || '').toLowerCase().includes(search.toLowerCase()) ||
      (prod?.sku || '').toLowerCase().includes(search.toLowerCase()) ||
      m.motivo.toLowerCase().includes(search.toLowerCase());

    if (tipoFilter !== 'TODOS' && m.tipo !== tipoFilter) return false;
    return matchSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#F3FBF6] tracking-tight">
              Ledger Imutável & Auditoria Contábil
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#163832] text-[#10B981] border border-[#10B981]/30 text-xs font-mono font-semibold">
              Rastreabilidade 100%
            </span>
          </div>
          <p className="text-xs text-[#94A89E] mt-1">
            Registro cronológico append-only de todas as transações de inventário. Nenhum registro pode ser apagado ou alterado.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-full bg-[#142522] hover:bg-[#163832] border border-[rgba(142,182,155,0.2)] text-xs font-semibold text-[#DAF1DE] transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-[#8EB69B]" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={() => navigate('/auditoria')}
            className="px-4 py-2.5 rounded-full bg-[#10B981] hover:bg-[#059669] text-[#070E0D] text-xs font-bold shadow-glow-emerald transition-all flex items-center gap-2"
          >
            <ClipboardList className="w-4 h-4" />
            <span>Auditoria Física Cega</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#0D1917] border border-[rgba(142,182,155,0.12)]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#8EB69B] absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por produto, SKU ou motivo..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.18)] text-xs text-[#F3FBF6] placeholder-[#5E756B] focus:border-[#10B981] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#8EB69B]" />
          <button
            onClick={() => setTipoFilter('TODOS')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              tipoFilter === 'TODOS'
                ? 'bg-[#10B981] text-[#070E0D] font-bold'
                : 'bg-[#142522] text-[#94A89E] hover:text-[#F3FBF6]'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setTipoFilter('ENTRADA')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              tipoFilter === 'ENTRADA'
                ? 'bg-[#10B981] text-[#070E0D] font-bold'
                : 'bg-[#142522] text-[#94A89E] hover:text-[#F3FBF6]'
            }`}
          >
            Entradas
          </button>
          <button
            onClick={() => setTipoFilter('SAIDA')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              tipoFilter === 'SAIDA'
                ? 'bg-red-500 text-white font-bold'
                : 'bg-[#142522] text-[#94A89E] hover:text-[#F3FBF6]'
            }`}
          >
            Saídas
          </button>
        </div>
      </div>

      {/* Ledger Table */}
      <BentoCard>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[rgba(142,182,155,0.14)] text-[#94A89E]">
                <th className="py-3 px-3 font-semibold">Data / Hora</th>
                <th className="py-3 px-3 font-semibold">Tipo</th>
                <th className="py-3 px-3 font-semibold">SKU & Item</th>
                <th className="py-3 px-3 font-semibold">Qtd Movimentada</th>
                <th className="py-3 px-3 font-semibold">Saldo Anterior</th>
                <th className="py-3 px-3 font-semibold">Saldo Resultante</th>
                <th className="py-3 px-3 font-semibold">Responsável</th>
                <th className="py-3 px-3 font-semibold">Motivo Fiscal / Razão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(142,182,155,0.06)]">
              {filtered.map((mov) => {
                const prod = produtos[mov.produto_id];
                return (
                  <tr key={mov.id} className="hover:bg-[#142522]/40 transition-colors">
                    <td className="py-3.5 px-3 font-mono text-[#94A89E]">
                      {new Date(mov.data_movimentacao).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3.5 px-3">
                      <Badge variant={mov.tipo === 'ENTRADA' ? 'mint' : 'danger'}>
                        {mov.tipo === 'ENTRADA' ? (
                          <span className="flex items-center gap-1">
                            <ArrowDownRight className="w-3.5 h-3.5 text-[#10B981]" /> ENTRADA
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <ArrowUpRight className="w-3.5 h-3.5 text-red-400" /> SAÍDA
                          </span>
                        )}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-[#F3FBF6]">{prod?.nome || 'Item do Catálogo'}</div>
                      <div className="text-[10px] text-[#94A89E] font-mono">
                        SKU: {prod?.sku || mov.produto_id.slice(0, 8)}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-[#F3FBF6]">
                      {mov.tipo === 'ENTRADA' ? `+${mov.quantidade}` : `-${mov.quantidade}`} un
                    </td>
                    <td className="py-3.5 px-3 font-mono text-[#94A89E]">
                      {mov.saldo_anterior ?? '—'} un
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-[#10B981]">
                      {mov.saldo_resultante ?? '—'} un
                    </td>
                    <td className="py-3.5 px-3 text-[#DAF1DE]">
                      {mov.responsavel || 'Operador'}
                    </td>
                    <td className="py-3.5 px-3 text-[#94A89E] max-w-xs truncate">
                      {mov.motivo}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </BentoCard>
    </div>
  );
};
