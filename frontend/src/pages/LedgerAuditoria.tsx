import React, { useState, useEffect, useMemo } from 'react';
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
  X,
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

  // Compute counts for entry and exit transactions
  const counts = useMemo(() => {
    let entradas = 0;
    let saidas = 0;
    for (const m of ledger) {
      if (m.tipo === 'ENTRADA') entradas++;
      else if (m.tipo === 'SAIDA') saidas++;
    }
    return {
      todos: ledger.length,
      entradas,
      saidas,
    };
  }, [ledger]);

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
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Livro-Razão & Auditoria
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Registro imutável de movimentações, trilha de auditoria e conciliação de saldos
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-full bg-[#000000] hover:bg-white/[0.08] border border-white/[0.16] text-xs font-semibold text-slate-200 hover:text-white transition-all flex items-center gap-2 active:scale-95"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={() => navigate('/auditoria')}
            className="px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/25 transition-all flex items-center gap-2 active:scale-95"
          >
            <ClipboardList className="w-4 h-4" />
            <span>Auditoria Física Cega</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar in High Definition */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-2xl bg-[#000000] border border-white/[0.16] shadow-lg">
        {/* Search Input */}
        <div className="relative flex-1 max-w-xl group">
          <Search className="w-5 h-5 text-slate-400 group-focus-within:text-emerald-400 absolute left-4 top-3.5 transition-colors duration-200 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por produto, SKU ou motivo de movimentação..."
            className="w-full pl-12 pr-10 py-3 rounded-xl bg-[#000000] border border-white/[0.16] text-sm font-medium text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all duration-200"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white p-0.5 rounded-full hover:bg-white/[0.1] transition-all active:scale-90"
              title="Limpar busca"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* High-Resolution Segmented Control */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-[#000000] border border-white/[0.16] overflow-x-auto table-scrollbar">
          <button
            onClick={() => setTipoFilter('TODOS')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 whitespace-nowrap active:scale-95 ${
              tipoFilter === 'TODOS'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 font-bold scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <span>Todas as Operações</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold transition-all ${
                tipoFilter === 'TODOS'
                  ? 'bg-black/30 text-white'
                  : 'bg-[#000000] text-slate-300 border border-white/[0.16]'
              }`}
            >
              {counts.todos}
            </span>
          </button>

          <button
            onClick={() => setTipoFilter('ENTRADA')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 whitespace-nowrap active:scale-95 ${
              tipoFilter === 'ENTRADA'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 font-bold scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-emerald-300" />
            <span>Entradas</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold transition-all ${
                tipoFilter === 'ENTRADA'
                  ? 'bg-black/30 text-white'
                  : 'bg-[#000000] text-slate-300 border border-white/[0.16]'
              }`}
            >
              {counts.entradas}
            </span>
          </button>

          <button
            onClick={() => setTipoFilter('SAIDA')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 whitespace-nowrap active:scale-95 ${
              tipoFilter === 'SAIDA'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25 font-bold scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <ArrowDownRight className="w-4 h-4 text-rose-300" />
            <span>Saídas</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold transition-all ${
                tipoFilter === 'SAIDA'
                  ? 'bg-black/30 text-white'
                  : 'bg-[#000000] text-slate-300 border border-white/[0.16]'
              }`}
            >
              {counts.saidas}
            </span>
          </button>
        </div>
      </div>

      {/* Ledger Table */}
      <BentoCard>
        <div className="overflow-x-auto table-scrollbar pb-2">
          <table className="w-full text-left min-w-[1050px]">
            <thead className="bg-[#000000] border-b border-white/[0.16]">
              <tr className="text-xs font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                <th className="py-3.5 px-4">Data / Hora</th>
                <th className="py-3.5 px-4 text-center">Tipo</th>
                <th className="py-3.5 px-4">Produto</th>
                <th className="py-3.5 px-4">SKU</th>
                <th className="py-3.5 px-4">Qtd Movimentada</th>
                <th className="py-3.5 px-4">Saldo Anterior</th>
                <th className="py-3.5 px-4">Saldo Resultante</th>
                <th className="py-3.5 px-4">Responsável</th>
                <th className="py-3.5 px-4">Motivo / Documento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.14]">
              {filtered.map((mov) => {
                const prod = produtos[mov.produto_id];
                return (
                  <tr key={mov.id} className="hover:bg-white/[0.04] transition-colors group whitespace-nowrap">
                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-400 whitespace-nowrap">
                      {new Date(mov.data_movimentacao).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <Badge variant={mov.tipo === 'ENTRADA' ? 'emerald' : 'danger'}>
                        {mov.tipo === 'ENTRADA' ? (
                          <span className="flex items-center gap-1.5 font-bold">
                            <ArrowDownRight className="w-4 h-4 text-emerald-400" /> ENTRADA
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 font-bold">
                            <ArrowUpRight className="w-4 h-4 text-rose-400" /> SAÍDA
                          </span>
                        )}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-sm text-white group-hover:text-emerald-400 transition-colors whitespace-nowrap">
                      {prod?.nome || 'Item do Catálogo'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap">
                      {prod?.sku || mov.produto_id.slice(0, 8)}
                    </td>
                    <td className="py-3.5 px-4 text-sm font-bold whitespace-nowrap">
                      <span className={mov.tipo === 'ENTRADA' ? 'text-emerald-400' : 'text-rose-400'}>
                        {mov.tipo === 'ENTRADA' ? `+${mov.quantidade}` : `-${mov.quantidade}`} un
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-400 whitespace-nowrap">
                      {mov.saldo_anterior ?? '—'} un
                    </td>
                    <td className="py-3.5 px-4 text-sm font-bold text-white whitespace-nowrap">
                      {mov.saldo_resultante ?? '—'} un
                    </td>
                    <td className="py-3.5 px-4 text-sm font-semibold text-slate-300 whitespace-nowrap">
                      {mov.responsavel || 'Operador'}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-400 whitespace-nowrap">
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
