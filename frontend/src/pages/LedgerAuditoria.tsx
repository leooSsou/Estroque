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

  const filtered = ledger.filter((m) => {
    const prod = produtos[m.produto_id];
    const matchSearch =
      (prod?.nome || '').toLowerCase().includes(search.toLowerCase()) ||
      (prod?.sku || '').toLowerCase().includes(search.toLowerCase()) ||
      m.motivo.toLowerCase().includes(search.toLowerCase());

    if (tipoFilter !== 'TODOS' && m.tipo !== tipoFilter) return false;
    return matchSearch;
  });

  const counts = {
    TODOS: ledger.length,
    ENTRADA: ledger.filter((m) => m.tipo === 'ENTRADA').length,
    SAIDA: ledger.filter((m) => m.tipo === 'SAIDA').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F3FBF6] tracking-tight">
            Livro-Razão & Auditoria
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="group px-4 py-2.5 rounded-2xl bg-[#142522] hover:bg-[#163832] border border-[rgba(142,182,155,0.25)] hover:border-[#10B981]/50 text-xs font-bold text-[#DAF1DE] hover:text-white transition-all duration-200 flex items-center gap-2 active:scale-95 cursor-pointer select-none"
          >
            <Download className="w-4 h-4 text-[#8EB69B] group-hover:text-[#10B981] group-hover:-translate-y-0.5 transition-transform duration-200" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={() => navigate('/auditoria')}
            className="relative group overflow-hidden px-5 py-2.5 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-[#070E0D] text-xs font-extrabold shadow-glow-emerald hover:shadow-[0_0_28px_rgba(16,185,129,0.5)] transition-all duration-200 flex items-center gap-2 active:scale-95 cursor-pointer select-none"
          >
            <span className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
            <ClipboardList className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
            <span>Auditoria Física Cega</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar - High-Resolution Segmented Control */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-3.5 md:p-4 rounded-3xl bg-[#0D1917] border border-[rgba(142,182,155,0.18)] shadow-bento-dark">
        <div className="relative flex-1 max-w-full sm:max-w-md">
          <Search className="w-4 h-4 text-[#10B981] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por produto, SKU ou motivo..."
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-[#070E0D] border border-[rgba(142,182,155,0.22)] text-sm font-medium text-[#F3FBF6] placeholder-[#7A9988] focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 focus:outline-none transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-[#7A9988] hover:text-[#F3FBF6] hover:bg-[#142522] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Segmented Filter Pills */}
        <div className="p-1 rounded-2xl bg-[#070E0D] border border-[rgba(142,182,155,0.18)] flex items-center gap-1.5 overflow-x-auto table-scrollbar">
          {(
            [
              { key: 'TODOS', label: 'Todas as Operações', count: counts.TODOS },
              { key: 'ENTRADA', label: 'Entradas', count: counts.ENTRADA },
              { key: 'SAIDA', label: 'Saídas', count: counts.SAIDA },
            ] as const
          ).map((item) => {
            const isActive = tipoFilter === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setTipoFilter(item.key)}
                className={`px-3.5 py-2 rounded-xl text-xs md:text-sm font-bold transition-all duration-200 flex items-center gap-2 whitespace-nowrap btn-press cursor-pointer select-none ${
                  isActive
                    ? item.key === 'SAIDA'
                      ? 'bg-red-500 text-white shadow-[0_2px_12px_rgba(239,68,68,0.4)]'
                      : 'bg-[#10B981] text-[#070E0D] shadow-glow-emerald'
                    : 'text-[#94A89E] hover:text-[#F3FBF6] hover:bg-[#142522]/80 border border-transparent'
                }`}
              >
                <span>{item.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold transition-all ${
                    isActive
                      ? 'bg-black/20 text-current'
                      : 'bg-[#142522] text-[#8EB69B] border border-[rgba(142,182,155,0.15)]'
                  }`}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ledger Table */}
      <BentoCard>
        <div className="overflow-x-auto table-scrollbar pb-2">
          <table className="w-full text-left min-w-[1050px]">
            <thead className="bg-[#0A1614] border-b border-[rgba(142,182,155,0.18)]">
              <tr className="text-xs font-bold uppercase tracking-wider text-[#A2B89B]">
                <th className="py-4 px-4">Data / Hora</th>
                <th className="py-4 px-4 text-center">Tipo</th>
                <th className="py-4 px-4">SKU & Item</th>
                <th className="py-4 px-4">Qtd Movimentada</th>
                <th className="py-4 px-4">Saldo Anterior</th>
                <th className="py-4 px-4">Saldo Resultante</th>
                <th className="py-4 px-4">Responsável</th>
                <th className="py-4 px-4">Motivo / Documento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(142,182,155,0.08)]">
              {filtered.map((mov) => {
                const prod = produtos[mov.produto_id];
                return (
                  <tr key={mov.id} className="hover:bg-[#142522]/50 transition-colors group">
                    <td className="py-4 px-4 font-mono text-xs font-semibold text-[#A2B89B]">
                      {new Date(mov.data_movimentacao).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Badge variant={mov.tipo === 'ENTRADA' ? 'mint' : 'danger'}>
                        {mov.tipo === 'ENTRADA' ? (
                          <span className="flex items-center gap-1.5 font-bold">
                            <ArrowDownRight className="w-4 h-4 text-[#10B981]" /> ENTRADA
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 font-bold">
                            <ArrowUpRight className="w-4 h-4 text-red-400" /> SAÍDA
                          </span>
                        )}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-sm md:text-base text-[#F3FBF6] group-hover:text-[#10B981] transition-colors">
                        {prod?.nome || 'Item do Catálogo'}
                      </div>
                      <div className="text-xs text-[#A2B89B] font-mono mt-0.5">
                        SKU: {prod?.sku || mov.produto_id.slice(0, 8)}
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono text-base font-extrabold">
                      <span className={mov.tipo === 'ENTRADA' ? 'text-[#10B981]' : 'text-red-400'}>
                        {mov.tipo === 'ENTRADA' ? `+${mov.quantidade}` : `-${mov.quantidade}`} un
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono text-sm font-semibold text-[#A2B89B]">
                      {mov.saldo_anterior ?? '—'} un
                    </td>
                    <td className="py-4 px-4 font-mono text-base font-extrabold text-[#F3FBF6]">
                      {mov.saldo_resultante ?? '—'} un
                    </td>
                    <td className="py-4 px-4 text-sm font-semibold text-[#DAF1DE]">
                      {mov.responsavel || 'Operador'}
                    </td>
                    <td className="py-4 px-4 text-xs font-medium text-[#C1D7C8] max-w-xs">
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
