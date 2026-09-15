import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { Produto } from '../types';
import { BentoCard } from '../components/common/BentoCard';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import {
  Package,
  Search,
  Plus,
  Sliders,
  Barcode,
  ArrowUpDown,
  Calculator,
  Save,
  Tag,
  Boxes,
  X,
} from 'lucide-react';

export const Produtos: React.FC = () => {
  const { activeLoja } = useAuth();
  const { toast } = useToast();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'NORMAL' | 'BAIXO' | 'RUPTURA'>('TODOS');
  const [loading, setLoading] = useState(true);

  // Smart Markup Modal State
  const [markupModalOpen, setMarkupModalOpen] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [markupPercent, setMarkupPercent] = useState<number>(50);
  const [sellingPrice, setSellingPrice] = useState<number>(0);

  // New Product Modal State
  const [newProductModalOpen, setNewProductModalOpen] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newBarcode, setNewBarcode] = useState('');
  const [newCategoria, setNewCategoria] = useState('Geral');
  const [newCusto, setNewCusto] = useState(50.0);
  const [newMarkup, setNewMarkup] = useState(60.0);
  const [newEstoqueInicial, setNewEstoqueInicial] = useState(20);

  const fetchProdutos = async () => {
    setLoading(true);
    try {
      const data = await api.getProdutos(activeLoja?.id);
      setProdutos(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProdutos();
  }, [activeLoja]);

  // Recalculate selling price from markup
  const handleMarkupChange = (newMarkupVal: number) => {
    setMarkupPercent(newMarkupVal);
    const calculated = costPrice * (1 + newMarkupVal / 100);
    setSellingPrice(Math.round(calculated * 100) / 100);
  };

  // Recalculate markup from selling price
  const handleSellingPriceChange = (newSellPrice: number) => {
    setSellingPrice(newSellPrice);
    if (costPrice > 0) {
      const calcMarkup = ((newSellPrice - costPrice) / costPrice) * 100;
      setMarkupPercent(Math.round(calcMarkup * 10) / 10);
    }
  };

  const handleCostPriceChange = (newCost: number) => {
    setCostPrice(newCost);
    const calculated = newCost * (1 + markupPercent / 100);
    setSellingPrice(Math.round(calculated * 100) / 100);
  };

  const openMarkupModal = (prod: Produto) => {
    setSelectedProduto(prod);
    setCostPrice(prod.preco_custo);
    setMarkupPercent(prod.markup);
    setSellingPrice(prod.preco_venda);
    setMarkupModalOpen(true);
  };

  const handleSaveMarkup = async () => {
    if (!selectedProduto) return;
    try {
      await api.updateProduto(selectedProduto.id, {
        preco_custo: costPrice,
        markup: markupPercent,
        preco_venda: sellingPrice,
      });
      toast.success(`Precificação de "${selectedProduto.nome}" atualizada!`);
      setMarkupModalOpen(false);
      fetchProdutos();
    } catch {
      toast.error('Erro ao salvar atualização de markup.');
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const precoVendaCalculado = Math.round(newCusto * (1 + newMarkup / 100) * 100) / 100;
      await api.createProduto({
        nome: newNome,
        sku: newSku.toUpperCase(),
        codigo_barras: newBarcode || null,
        categoria: newCategoria,
        preco_custo: newCusto,
        markup: newMarkup,
        preco_venda: precoVendaCalculado,
        ativo: true,
        loja_id: activeLoja?.id,
        estoque_inicial: newEstoqueInicial,
      });

      toast.success(`Produto "${newNome}" cadastrado com sucesso!`);
      setNewProductModalOpen(false);
      // Reset form
      setNewNome('');
      setNewSku('');
      setNewBarcode('');
      fetchProdutos();
    } catch {
      toast.error('Erro ao cadastrar produto.');
    }
  };

  // Filtered Products
  const filtered = produtos.filter((p) => {
    const q = search.toLowerCase();
    const matchQuery =
      p.nome.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.codigo_barras && p.codigo_barras.includes(q));

    const stock = activeLoja?.id ? p.estoque_por_loja?.[activeLoja.id] ?? 0 : p.estoque_total ?? 0;
    const minStock = p.estoque_minimo || 5;

    if (statusFilter === 'RUPTURA') return matchQuery && stock === 0;
    if (statusFilter === 'BAIXO') return matchQuery && stock > 0 && stock <= minStock;
    if (statusFilter === 'NORMAL') return matchQuery && stock > minStock;
    return matchQuery;
  });

  // Status counts for real-time operational feedback
  const counts = {
    TODOS: produtos.length,
    NORMAL: produtos.filter((p) => {
      const s = activeLoja?.id ? p.estoque_por_loja?.[activeLoja.id] ?? 0 : p.estoque_total ?? 0;
      return s > (p.estoque_minimo || 5);
    }).length,
    BAIXO: produtos.filter((p) => {
      const s = activeLoja?.id ? p.estoque_por_loja?.[activeLoja.id] ?? 0 : p.estoque_total ?? 0;
      return s > 0 && s <= (p.estoque_minimo || 5);
    }).length,
    RUPTURA: produtos.filter((p) => {
      const s = activeLoja?.id ? p.estoque_por_loja?.[activeLoja.id] ?? 0 : p.estoque_total ?? 0;
      return s === 0;
    }).length,
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F3FBF6] tracking-tight">
            Catálogo de Produtos
          </h1>
        </div>

        <button
          onClick={() => setNewProductModalOpen(true)}
          className="relative group overflow-hidden px-5 py-2.5 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-[#070E0D] font-extrabold text-sm shadow-glow-emerald hover:shadow-[0_0_28px_rgba(16,185,129,0.5)] transition-all duration-200 flex items-center justify-center gap-2.5 active:scale-95 cursor-pointer select-none"
        >
          <span className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300 flex-shrink-0" />
          <span>Novo Produto</span>
        </button>
      </div>

      {/* Filter and Search Bar - High-Resolution Segmented Control */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-3.5 md:p-4 rounded-3xl bg-[#0D1917] border border-[rgba(142,182,155,0.18)] shadow-bento-dark">
        {/* Search Input */}
        <div className="relative flex-1 max-w-full lg:max-w-md">
          <Search className="w-4 h-4 text-[#10B981] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por descrição, SKU ou código de barras..."
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

        {/* Filter Pills - Segmented Track */}
        <div className="p-1 rounded-2xl bg-[#070E0D] border border-[rgba(142,182,155,0.18)] flex items-center gap-1.5 overflow-x-auto table-scrollbar">
          {(
            [
              { key: 'TODOS', label: 'Todos os Itens', count: counts.TODOS },
              { key: 'NORMAL', label: 'Estoque Normal', count: counts.NORMAL },
              { key: 'BAIXO', label: 'Estoque Baixo', count: counts.BAIXO },
              { key: 'RUPTURA', label: 'Rupturas', count: counts.RUPTURA },
            ] as const
          ).map((item) => {
            const isActive = statusFilter === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setStatusFilter(item.key)}
                className={`px-3.5 py-2 rounded-xl text-xs md:text-sm font-bold transition-all duration-200 flex items-center gap-2 whitespace-nowrap btn-press cursor-pointer select-none ${
                  isActive
                    ? item.key === 'RUPTURA'
                      ? 'bg-red-500 text-white shadow-[0_2px_12px_rgba(239,68,68,0.4)]'
                      : item.key === 'BAIXO'
                      ? 'bg-amber-400 text-[#070E0D] shadow-[0_2px_12px_rgba(251,191,36,0.4)]'
                      : 'bg-[#10B981] text-[#070E0D] shadow-glow-emerald'
                    : 'text-[#94A89E] hover:text-[#F3FBF6] hover:bg-[#142522]/80 border border-transparent'
                }`}
              >
                <span>{item.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold transition-all ${
                    isActive
                      ? 'bg-black/20 text-current'
                      : item.key === 'RUPTURA' && item.count > 0
                      ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                      : item.key === 'BAIXO' && item.count > 0
                      ? 'bg-amber-400/15 text-amber-400 border border-amber-400/30'
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

      {/* Products Data Table (Bento Style) */}
      <BentoCard>
        <div className="overflow-x-auto table-scrollbar pb-2">
          <table className="w-full text-left min-w-[1020px]">
            <thead className="bg-[#0A1614] border-b border-[rgba(142,182,155,0.18)]">
              <tr className="text-xs font-bold uppercase tracking-wider text-[#A2B89B]">
                <th className="py-4 px-4">Produto / Descrição</th>
                <th className="py-4 px-4">EAN-13</th>
                <th className="py-4 px-4">Custo</th>
                <th className="py-4 px-4">Markup</th>
                <th className="py-4 px-4">Preço Venda</th>
                <th className="py-4 px-4">Margem</th>
                <th className="py-4 px-4">Estoque ({activeLoja?.nome ? 'Loja' : 'Rede'})</th>
                <th className="py-4 px-4 text-center">Status</th>
                <th className="py-4 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(142,182,155,0.08)]">
              {filtered.map((prod) => {
                const stock = activeLoja?.id
                  ? prod.estoque_por_loja?.[activeLoja.id] ?? 0
                  : prod.estoque_total ?? 0;
                const minStock = prod.estoque_minimo || 5;
                const margemBruta =
                  prod.preco_venda > 0
                    ? ((prod.preco_venda - prod.preco_custo) / prod.preco_venda) * 100
                    : 0;

                return (
                  <tr key={prod.id} className="hover:bg-[#142522]/50 transition-colors group">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#142522] border border-[rgba(142,182,155,0.2)] flex items-center justify-center text-[#10B981] flex-shrink-0">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-sm md:text-base text-[#F3FBF6] group-hover:text-[#10B981] transition-colors">
                            {prod.nome}
                          </div>
                          <div className="text-xs text-[#A2B89B] font-mono mt-0.5">
                            SKU: {prod.sku} • {prod.categoria || 'Geral'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono text-xs font-semibold text-[#DAF1DE]">
                      {prod.codigo_barras ? (
                        <span className="flex items-center gap-1.5">
                          <Barcode className="w-4 h-4 text-[#8EB69B]" />
                          {prod.codigo_barras}
                        </span>
                      ) : (
                        <span className="text-[#5E756B]">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4 font-mono text-sm font-semibold text-[#C1D7C8]">
                      R$ {prod.preco_custo.toFixed(2)}
                    </td>
                    <td className="py-4 px-4 font-mono text-sm font-bold text-[#34D399]">
                      +{prod.markup.toFixed(1)}%
                    </td>
                    <td className="py-4 px-4 font-mono text-base font-extrabold text-[#10B981]">
                      R$ {prod.preco_venda.toFixed(2)}
                    </td>
                    <td className="py-4 px-4 font-mono text-sm font-semibold text-[#DAF1DE]">
                      {margemBruta.toFixed(1)}%
                    </td>
                    <td className="py-4 px-4 font-mono text-base font-extrabold text-[#F3FBF6]">
                      {stock} un
                    </td>
                    <td className="py-4 px-4 text-center">
                      {stock === 0 ? (
                        <Badge variant="danger">Ruptura</Badge>
                      ) : stock <= minStock ? (
                        <Badge variant="warning">Baixo</Badge>
                      ) : (
                        <Badge variant="mint">Normal</Badge>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => openMarkupModal(prod)}
                        className="px-3.5 py-2 rounded-xl bg-[#142522] hover:bg-[#163832] text-[#DAF1DE] hover:text-white border border-[rgba(142,182,155,0.25)] text-xs font-bold transition-all inline-flex items-center gap-1.5 btn-press shadow-sm"
                        title="Simular e Ajustar Markup"
                      >
                        <Calculator className="w-3.5 h-3.5 text-[#10B981]" />
                        <span>Markup</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </BentoCard>

      {/* Interactive Smart Markup Modal / Drawer */}
      <Modal
        isOpen={markupModalOpen}
        onClose={() => setMarkupModalOpen(false)}
        title="Formação de Preço (Markup)"
        subtitle={selectedProduto?.nome}
      >
        <div className="space-y-6">
          {/* Formula preview */}
          <div className="p-3.5 rounded-2xl bg-[#0D1917] border border-[rgba(142,182,155,0.15)] flex items-center justify-between text-xs font-mono">
            <span className="text-[#94A89E]">Preço de Venda = Custo × (1 + Markup%)</span>
            <span className="text-[#10B981] font-semibold">Cálculo Automático</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#94A89E] mb-1.5">
                Preço de Custo (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={costPrice}
                onChange={(e) => handleCostPriceChange(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.18)] text-sm font-mono text-[#F3FBF6] focus:border-[#10B981] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94A89E] mb-1.5">
                Markup Aplicado (%)
              </label>
              <input
                type="number"
                step="0.5"
                value={markupPercent}
                onChange={(e) => handleMarkupChange(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.18)] text-sm font-mono text-[#10B981] font-bold focus:border-[#10B981] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94A89E] mb-1.5">
                Preço de Venda (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={sellingPrice}
                onChange={(e) => handleSellingPriceChange(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.18)] text-sm font-mono text-[#F3FBF6] font-bold focus:border-[#10B981] focus:outline-none"
              />
            </div>
          </div>

          {/* Interactive Range Slider */}
          <div>
            <div className="flex items-center justify-between text-xs text-[#94A89E] mb-2">
              <span>Deslize para calibrar o Markup</span>
              <span className="font-mono text-[#10B981] font-bold">{markupPercent}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              step="1"
              value={markupPercent}
              onChange={(e) => handleMarkupChange(parseFloat(e.target.value))}
              className="w-full accent-[#10B981] cursor-pointer"
            />
          </div>

          {/* Dynamic Gross Profit Card */}
          <div className="p-4 rounded-2xl bg-[#0D1917] border border-[rgba(142,182,155,0.18)] flex items-center justify-between">
            <div>
              <span className="text-xs text-[#94A89E]">Lucro Bruto Unitário Estimado</span>
              <div className="text-xl font-bold text-[#10B981] font-mono">
                R$ {(sellingPrice - costPrice).toFixed(2)}
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-[#94A89E]">Margem Bruta</span>
              <div className="text-xl font-bold text-[#DAF1DE] font-mono">
                {sellingPrice > 0
                  ? (((sellingPrice - costPrice) / sellingPrice) * 100).toFixed(1)
                  : '0.0'}
                %
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setMarkupModalOpen(false)}
              className="px-4 py-2 rounded-full bg-[#142522] hover:bg-[#163832] text-xs font-semibold text-[#94A89E]"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveMarkup}
              className="px-6 py-2 rounded-full bg-[#10B981] hover:bg-[#059669] text-[#070E0D] text-xs font-bold shadow-glow-emerald flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Novo Preço</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* New Product Modal */}
      <Modal
        isOpen={newProductModalOpen}
        onClose={() => setNewProductModalOpen(false)}
        title="Cadastrar Novo Produto"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#A2B89B] uppercase tracking-wider mb-1.5">
              Nome do Produto
            </label>
            <input
              type="text"
              required
              value={newNome}
              onChange={(e) => setNewNome(e.target.value)}
              placeholder="Ex: Teclado Sem Fio Bluetooth"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.22)] text-sm font-medium text-[#F3FBF6] placeholder-[#7A9988] focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 focus:outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#A2B89B] uppercase tracking-wider mb-1.5">
                SKU (Código Interno)
              </label>
              <input
                type="text"
                required
                value={newSku}
                onChange={(e) => setNewSku(e.target.value)}
                placeholder="Ex: TEC-BLU-07"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.22)] text-sm font-mono text-[#F3FBF6] placeholder-[#7A9988] focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 focus:outline-none uppercase transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#A2B89B] uppercase tracking-wider mb-1.5">
                Código de Barras (EAN-13)
              </label>
              <input
                type="text"
                value={newBarcode}
                onChange={(e) => setNewBarcode(e.target.value)}
                placeholder="Ex: 7891234560074"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.22)] text-sm font-mono text-[#F3FBF6] placeholder-[#7A9988] focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#A2B89B] uppercase tracking-wider mb-1.5">
                Preço de Custo (R$)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={newCusto}
                onChange={(e) => setNewCusto(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.22)] text-sm font-mono text-[#F3FBF6] focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#A2B89B] uppercase tracking-wider mb-1.5">
                Markup (%)
              </label>
              <input
                type="number"
                step="1"
                required
                value={newMarkup}
                onChange={(e) => setNewMarkup(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.22)] text-sm font-mono text-[#10B981] font-bold focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#A2B89B] uppercase tracking-wider mb-1.5">
                Estoque Inicial (un)
              </label>
              <input
                type="number"
                required
                value={newEstoqueInicial}
                onChange={(e) => setNewEstoqueInicial(parseInt(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.22)] text-sm font-mono text-[#F3FBF6] focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#070E0D] border border-[rgba(142,182,155,0.18)] flex items-center justify-between text-xs">
            <span className="text-[#94A89E] font-medium">Preço de Venda Gerado:</span>
            <span className="text-base font-extrabold text-[#10B981] font-mono">
              R$ {(newCusto * (1 + newMarkup / 100)).toFixed(2)}
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setNewProductModalOpen(false)}
              className="px-5 py-2.5 rounded-xl bg-[#142522] hover:bg-[#163832] border border-[rgba(142,182,155,0.2)] text-sm font-semibold text-[#94A89E] hover:text-[#F3FBF6] transition-all btn-press cursor-pointer active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-[#070E0D] text-sm font-extrabold shadow-glow-emerald transition-all btn-press cursor-pointer active:scale-95 flex items-center gap-2"
            >
              <span>Salvar Produto</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
