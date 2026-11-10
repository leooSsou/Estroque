import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { Produto, AtributoGrade } from '../types';
import { BentoCard } from '../components/common/BentoCard';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import {
  Package,
  Search,
  Plus,
  Barcode,
  Calculator,
  Save,
  X,
  Layers,
  ChevronDown,
  ChevronRight,
  Trash2,
  Image as ImageIcon,
  UploadCloud,
  Link as LinkIcon,
} from 'lucide-react';

export const Produtos: React.FC = () => {
  const { activeLoja, hasModulo } = useAuth();
  const { toast } = useToast();
  const gradeLiberada = hasModulo('grade');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'NORMAL' | 'BAIXO' | 'RUPTURA'>('TODOS');
  const [loading, setLoading] = useState(true);

  // Expanded parents in table
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

  // Smart Markup Modal State
  const [markupModalOpen, setMarkupModalOpen] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [markupPercent, setMarkupPercent] = useState<number>(50);
  const [sellingPrice, setSellingPrice] = useState<number>(0);

  // New Product Modal State
  const [newProductModalOpen, setNewProductModalOpen] = useState(false);
  const [tipoCadastro, setTipoCadastro] = useState<'SIMPLES' | 'GRADE'>('SIMPLES');
  const [newNome, setNewNome] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newBarcode, setNewBarcode] = useState('');
  const [newImagemUrl, setNewImagemUrl] = useState('');
  const [modoEntradaImagem, setModoEntradaImagem] = useState<'ARQUIVO' | 'URL'>('ARQUIVO');
  const [newCategoria, setNewCategoria] = useState('Geral');
  const [newCusto, setNewCusto] = useState(50.0);
  const [newMarkup, setNewMarkup] = useState(60.0);
  const [newEstoqueInicial, setNewEstoqueInicial] = useState(20);
  const [qtdTotalLote, setQtdTotalLote] = useState(100);
  const [modoDivisaoEstoque, setModoDivisaoEstoque] = useState<'POR_VARIACAO' | 'DIVIDIR_TOTAL'>('POR_VARIACAO');

  // Grade / Variations Builder State
  const [atributosGrade, setAtributosGrade] = useState<AtributoGrade[]>([
    { nome: 'Tamanho', valores: ['P', 'M', 'G'] },
    { nome: 'Cor', valores: ['Preto', 'Branco'] },
  ]);
  const [novoAtributoNome, setNovoAtributoNome] = useState('');
  const [novoValorInput, setNovoValorInput] = useState<Record<number, string>>({});

  // Add Single Variation Modal State
  const [addVariacaoModalOpen, setAddVariacaoModalOpen] = useState(false);
  const [selectedPaiParaVariacao, setSelectedPaiParaVariacao] = useState<Produto | null>(null);
  const [avulsaVariacoes, setAvulsaVariacoes] = useState<Record<string, string>>({});
  const [avulsaSku, setAvulsaSku] = useState('');
  const [avulsaBarcode, setAvulsaBarcode] = useState('');
  const [avulsaPreco, setAvulsaPreco] = useState<number>(0);

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

  // Group variations by parent
  const variacoesPorPai = useMemo(() => {
    const map: Record<string, Produto[]> = {};
    for (const p of produtos) {
      if (p.produto_pai_id) {
        if (!map[p.produto_pai_id]) map[p.produto_pai_id] = [];
        map[p.produto_pai_id].push(p);
      }
    }
    return map;
  }, [produtos]);

  const toggleExpand = (paiId: string) => {
    setExpandedParents((prev) => ({ ...prev, [paiId]: !prev[paiId] }));
  };

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
        nome: selectedProduto.nome,
        preco_custo: costPrice,
        markup: markupPercent,
        preco_venda: sellingPrice,
        codigo_barras: selectedProduto.codigo_barras,
        fornecedor_id: selectedProduto.fornecedor_id,
        ativo: selectedProduto.ativo,
      });
      toast.success(`Precificação de "${selectedProduto.nome}" atualizada!`);
      setMarkupModalOpen(false);
      fetchProdutos();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar atualização de markup.';
      toast.error(msg);
    }
  };

  // Helper for Product Image Selection with Client-side Compression
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem válido (PNG, JPG, WebP, etc.).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('A imagem selecionada excede 10MB. Escolha uma foto menor.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      if (!rawDataUrl) return;

      const img = new Image();
      img.onload = () => {
        const maxDimension = 800;
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.82);
          setNewImagemUrl(compressed);
        } else {
          setNewImagemUrl(rawDataUrl);
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Helper for Attribute Builder
  const handleAddAtributo = () => {
    if (!novoAtributoNome.trim()) return;
    setAtributosGrade((prev) => [...prev, { nome: novoAtributoNome.trim(), valores: [] }]);
    setNovoAtributoNome('');
  };

  const handleRemoveAtributo = (index: number) => {
    setAtributosGrade((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddValorAtributo = (attrIndex: number) => {
    const val = novoValorInput[attrIndex]?.trim();
    if (!val) return;
    setAtributosGrade((prev) => {
      const updated = [...prev];
      if (!updated[attrIndex].valores.includes(val)) {
        updated[attrIndex] = {
          ...updated[attrIndex],
          valores: [...updated[attrIndex].valores, val],
        };
      }
      return updated;
    });
    setNovoValorInput((prev) => ({ ...prev, [attrIndex]: '' }));
  };

  const handleRemoveValorAtributo = (attrIndex: number, valToRemove: string) => {
    setAtributosGrade((prev) => {
      const updated = [...prev];
      updated[attrIndex] = {
        ...updated[attrIndex],
        valores: updated[attrIndex].valores.filter((v) => v !== valToRemove),
      };
      return updated;
    });
  };

  // Preview combinations
  const previewCombinacoes = useMemo(() => {
    if (atributosGrade.length === 0) return [];
    const validos = atributosGrade.filter((a) => a.valores.length > 0);
    if (validos.length === 0) return [];

    let combos: Array<Record<string, string>> = [{}];
    for (const attr of validos) {
      const next: Array<Record<string, string>> = [];
      for (const c of combos) {
        for (const val of attr.valores) {
          next.push({ ...c, [attr.nome]: val });
        }
      }
      combos = next;
    }
    return combos.slice(0, 100);
  }, [atributosGrade]);

  // Sincroniza a divisão igualitária do estoque do lote sempre que as variações mudarem
  useEffect(() => {
    if (modoDivisaoEstoque === 'DIVIDIR_TOTAL') {
      const totalVars = previewCombinacoes.length || 1;
      setNewEstoqueInicial(Math.floor(qtdTotalLote / totalVars));
    }
  }, [previewCombinacoes.length, qtdTotalLote, modoDivisaoEstoque]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const precoVendaCalculado = Math.round(newCusto * (1 + newMarkup / 100) * 100) / 100;

      if (tipoCadastro === 'SIMPLES') {
        await api.createProduto({
          nome: newNome,
          sku: newSku.toUpperCase(),
          codigo_barras: newBarcode || null,
          imagem_url: newImagemUrl.trim() || null,
          categoria: newCategoria,
          preco_custo: newCusto,
          markup: newMarkup,
          preco_venda: precoVendaCalculado,
          ativo: true,
          loja_id: activeLoja?.id,
          estoque_inicial: newEstoqueInicial,
        });
        toast.success(`Produto "${newNome}" cadastrado com sucesso!`);
      } else {
        // Cadastro de Grade
        const validos = atributosGrade.filter((a) => a.valores.length > 0);
        if (validos.length === 0) {
          toast.error('Informe pelo menos um atributo com valores para a grade.');
          return;
        }

        const res = await api.createProdutoGrade({
          nome: newNome,
          sku_base: newSku.toUpperCase(),
          codigo_barras_base: newBarcode || null,
          imagem_url: newImagemUrl.trim() || null,
          categoria: newCategoria,
          preco_custo: newCusto,
          markup: newMarkup,
          preco_venda: precoVendaCalculado,
          loja_id: activeLoja?.id,
          estoque_inicial_por_variacao: newEstoqueInicial,
          atributos: validos,
        });

        toast.success(
          `Produto com grade "${newNome}" gerado com sucesso (${res.variacoes.length} variações)!`
        );
      }

      setNewProductModalOpen(false);
      // Reset form
      setNewNome('');
      setNewSku('');
      setNewBarcode('');
      setNewImagemUrl('');
      fetchProdutos();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao cadastrar produto.';
      toast.error(msg);
    }
  };

  // Open single variation add modal
  const openAddVariacaoModal = (pai: Produto) => {
    setSelectedPaiParaVariacao(pai);
    setAvulsaVariacoes({});
    setAvulsaSku('');
    setAvulsaBarcode('');
    setAvulsaPreco(pai.preco_venda);
    setAddVariacaoModalOpen(true);
  };

  const handleSaveVariacaoAvulsa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaiParaVariacao) return;

    try {
      await api.addVariacaoProduto(selectedPaiParaVariacao.id, {
        variacoes: avulsaVariacoes,
        sku: avulsaSku || undefined,
        codigo_barras: avulsaBarcode || undefined,
        preco_venda: avulsaPreco || selectedPaiParaVariacao.preco_venda,
        preco_custo: selectedPaiParaVariacao.preco_custo,
        markup: selectedPaiParaVariacao.markup,
      });

      toast.success('Nova variação adicionada com sucesso!');
      setAddVariacaoModalOpen(false);
      fetchProdutos();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao adicionar variação.';
      toast.error(msg);
    }
  };

  // Compute real-time status counts for filter pills
  const counts = useMemo(() => {
    let normal = 0;
    let baixo = 0;
    let ruptura = 0;
    for (const p of produtos) {
      const stock = activeLoja?.id ? p.estoque_por_loja?.[activeLoja.id] ?? 0 : p.estoque_total ?? 0;
      const minStock = p.estoque_minimo || 5;
      if (stock === 0) ruptura++;
      else if (stock <= minStock) baixo++;
      else normal++;
    }
    return {
      todos: produtos.length,
      normal,
      baixo,
      ruptura,
    };
  }, [produtos, activeLoja]);

  // Filtered Products: If no query, show base products (parents and simple); if searching, search across all
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return produtos.filter((p) => {
      // If not searching, only show root products (not children of a parent)
      if (!q && p.produto_pai_id) {
        return false;
      }

      const matchQuery =
        p.nome.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.codigo_barras && p.codigo_barras.includes(q)) ||
        (p.variacoes && Object.values(p.variacoes).some((v) => v.toLowerCase().includes(q)));

      const stock = activeLoja?.id ? p.estoque_por_loja?.[activeLoja.id] ?? 0 : p.estoque_total ?? 0;
      const minStock = p.estoque_minimo || 5;

      if (statusFilter === 'RUPTURA') return matchQuery && stock === 0;
      if (statusFilter === 'BAIXO') return matchQuery && stock > 0 && stock <= minStock;
      if (statusFilter === 'NORMAL') return matchQuery && stock > minStock;
      return matchQuery;
    });
  }, [produtos, search, statusFilter, activeLoja]);

  const precoVendaCalculado = Math.round(newCusto * (1 + newMarkup / 100) * 100) / 100;

  return (
    <div className="space-y-6">
      {/* Header Bento Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-6 rounded-2xl bg-[#000000] border border-white/[0.16] shadow-xl">
        <div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Catálogo & Precificação</h1>
            <Badge variant="emerald">Onda 2 Concluída</Badge>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => {
              setTipoCadastro('SIMPLES');
              setNewProductModalOpen(true);
            }}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Produto</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl bg-[#000000] border border-white/[0.16] shadow-lg">
        {/* Search Input */}
        <div className="relative flex-1 w-full lg:max-w-xl group">
          <Search className="w-5 h-5 text-slate-400 group-focus-within:text-emerald-400 absolute left-4 top-3.5 transition-colors duration-200 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por descrição, SKU, código de barras ou variação..."
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

        {/* Segmented Control */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-[#000000] border border-white/[0.16] overflow-x-auto table-scrollbar">
          {[
            { id: 'TODOS', label: 'Todos os Itens', count: counts.todos, color: 'emerald' },
            { id: 'NORMAL', label: 'Estoque Normal', count: counts.normal, color: 'emerald' },
            { id: 'BAIXO', label: 'Estoque Baixo', count: counts.baixo, color: 'amber' },
            { id: 'RUPTURA', label: 'Rupturas', count: counts.ruptura, color: 'rose' },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            const activeClass =
              tab.color === 'emerald'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 font-bold'
                : tab.color === 'amber'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/25 font-bold'
                : 'bg-rose-600 text-white shadow-md shadow-rose-600/25 font-bold';

            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 whitespace-nowrap active:scale-95 ${
                  isActive
                    ? `${activeClass} scale-[1.02]`
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-black/30 text-white'
                      : 'bg-[#000000] text-slate-300 border border-white/[0.16]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Products Data Table */}
      <BentoCard>
        <div className="overflow-x-auto table-scrollbar pb-2">
          <table className="w-full text-left min-w-[1100px]">
            <thead className="bg-[#000000] border-b border-white/[0.16]">
              <tr className="text-xs font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                <th className="py-3.5 px-4">Produto</th>
                <th className="py-3.5 px-4">SKU</th>
                <th className="py-3.5 px-4">Categoria</th>
                <th className="py-3.5 px-4">EAN-13</th>
                <th className="py-3.5 px-4">Custo</th>
                <th className="py-3.5 px-4">Markup</th>
                <th className="py-3.5 px-4">Preço Venda</th>
                <th className="py-3.5 px-4">Margem</th>
                <th className="py-3.5 px-4">Estoque ({activeLoja?.nome ? 'Loja' : 'Rede'})</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.14]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-xs text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="w-8 h-8 text-slate-600" />
                      <span>Nenhum produto cadastrado no catálogo. Clique em "Novo Produto" para começar.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((prod) => {
                  const stock = activeLoja?.id
                    ? prod.estoque_por_loja?.[activeLoja.id] ?? 0
                    : prod.estoque_total ?? 0;
                  const minStock = prod.estoque_minimo || 5;
                  const margemBruta =
                    prod.preco_venda > 0
                      ? ((prod.preco_venda - prod.preco_custo) / prod.preco_venda) * 100
                      : 0;

                  const filhos = variacoesPorPai[prod.id] || [];
                  const temGrade = filhos.length > 0;
                  const isExpanded = expandedParents[prod.id];

                  return (
                    <React.Fragment key={prod.id}>
                      <tr className="hover:bg-white/[0.04] transition-colors group whitespace-nowrap">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            {temGrade && (
                              <button
                                onClick={() => toggleExpand(prod.id)}
                                className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 hover:bg-purple-500/20 transition-all flex-shrink-0"
                                title={isExpanded ? 'Ocultar variações' : 'Ver variações'}
                              >
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                            )}
                            {prod.imagem_url ? (
                              <img
                                src={prod.imagem_url}
                                alt={prod.nome}
                                className="w-8 h-8 rounded-lg object-cover border border-white/[0.16] flex-shrink-0 bg-black"
                              />
                            ) : !temGrade ? (
                              <div className="w-8 h-8 rounded-lg bg-[#000000] border border-white/[0.16] flex items-center justify-center text-emerald-400 flex-shrink-0">
                                <Package className="w-4 h-4" />
                              </div>
                            ) : null}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors">
                                  {prod.nome}
                                </span>
                                {temGrade && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                    Grade ({filhos.length})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-slate-300 whitespace-nowrap">
                          {prod.sku}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap">
                          {prod.categoria || 'Geral'}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-slate-300 whitespace-nowrap">
                          {prod.codigo_barras ? (
                            <span className="flex items-center gap-1.5">
                              <Barcode className="w-4 h-4 text-slate-400" />
                              {prod.codigo_barras}
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-slate-300 whitespace-nowrap">
                          {prod.preco_custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-bold text-emerald-400 whitespace-nowrap">
                          +{prod.markup.toFixed(1)}%
                        </td>
                        <td className="py-3.5 px-4 text-sm font-bold text-emerald-400 whitespace-nowrap">
                          {prod.preco_venda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-slate-300 whitespace-nowrap">
                          {margemBruta.toFixed(1)}%
                        </td>
                        <td className="py-3.5 px-4 text-sm font-bold text-white whitespace-nowrap">
                          {stock} un
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {stock === 0 ? (
                            <Badge variant="danger">Ruptura</Badge>
                          ) : stock <= minStock ? (
                            <Badge variant="amber">Baixo</Badge>
                          ) : (
                            <Badge variant="emerald">Normal</Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {temGrade && (
                              <button
                                onClick={() => openAddVariacaoModal(prod)}
                                className="px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-all inline-flex items-center gap-1 active:scale-95"
                                title="Adicionar Variação Avulsa à Grade"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Variação</span>
                              </button>
                            )}
                            <button
                              onClick={() => openMarkupModal(prod)}
                              className="px-3 py-1.5 rounded-lg bg-[#000000] hover:bg-white/[0.08] text-slate-200 hover:text-white border border-white/[0.16] text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-sm whitespace-nowrap"
                              title="Simular e Ajustar Markup"
                            >
                              <Calculator className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Markup</span>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Variations Sub-rows */}
                      {temGrade && isExpanded && (
                        filhos.map((filho) => {
                          const filhoStock = activeLoja?.id
                            ? filho.estoque_por_loja?.[activeLoja.id] ?? 0
                            : filho.estoque_total ?? 0;
                          const descVariacao = filho.variacoes
                            ? Object.entries(filho.variacoes)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(' | ')
                            : 'Variação';

                          return (
                            <tr key={filho.id} className="bg-purple-950/15 border-b border-purple-900/20 text-xs">
                              <td className="py-2.5 pl-14 pr-4">
                                <div className="flex items-center gap-2">
                                  <Layers className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                                  <span className="font-semibold text-purple-200">
                                    {filho.nome}
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                                    {descVariacao}
                                  </span>
                                </div>
                              </td>
                              <td className="py-2.5 px-4 font-mono text-slate-300">{filho.sku}</td>
                              <td className="py-2.5 px-4 text-slate-400">{filho.categoria || 'Geral'}</td>
                              <td className="py-2.5 px-4 text-slate-300">
                                {filho.codigo_barras || <span className="text-slate-500">—</span>}
                              </td>
                              <td className="py-2.5 px-4 text-slate-300">
                                {filho.preco_custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </td>
                              <td className="py-2.5 px-4 text-emerald-400 font-bold">+{filho.markup.toFixed(1)}%</td>
                              <td className="py-2.5 px-4 text-emerald-400 font-bold">
                                {filho.preco_venda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </td>
                              <td className="py-2.5 px-4 text-slate-400">—</td>
                              <td className="py-2.5 px-4 font-bold text-white">{filhoStock} un</td>
                              <td className="py-2.5 px-4 text-center">
                                {filhoStock === 0 ? (
                                  <Badge variant="danger">Ruptura</Badge>
                                ) : filhoStock <= minStock ? (
                                  <Badge variant="amber">Baixo</Badge>
                                ) : (
                                  <Badge variant="emerald">Normal</Badge>
                                )}
                              </td>
                              <td className="py-2.5 px-4 text-right">
                                <button
                                  onClick={() => openMarkupModal(filho)}
                                  className="text-[11px] font-semibold text-purple-300 hover:text-white underline"
                                >
                                  Editar Preço
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </BentoCard>

      {/* Interactive Smart Markup Modal */}
      <Modal
        isOpen={markupModalOpen}
        onClose={() => setMarkupModalOpen(false)}
        title="Simulador de Markup Inteligente"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.14]">
            {selectedProduto?.imagem_url ? (
              <img
                src={selectedProduto.imagem_url}
                alt={selectedProduto.nome}
                className="w-12 h-12 rounded-lg object-cover border border-white/[0.2] bg-black flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-[#000000] border border-white/[0.16] flex items-center justify-center text-emerald-400 flex-shrink-0">
                <Package className="w-6 h-6" />
              </div>
            )}
            <div className="min-w-0">
              <span className="text-xs text-slate-400 block">Precificação do Item:</span>
              <strong className="text-sm font-bold text-white block truncate">{selectedProduto?.nome}</strong>
              <span className="text-[11px] font-mono text-slate-400">{selectedProduto?.sku}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Preço de Custo (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={costPrice}
                onChange={(e) => handleCostPriceChange(parseFloat(e.target.value) || 0)}
                className="w-full h-11 px-3.5 rounded-xl bg-[#000000] border border-white/[0.16] text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Markup (%)
                </label>
                <span className="text-sm font-bold text-emerald-400">+{markupPercent.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="300"
                step="1"
                value={markupPercent}
                onChange={(e) => handleMarkupChange(parseFloat(e.target.value) || 0)}
                className="w-full accent-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Preço de Venda Final (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={sellingPrice}
                onChange={(e) => handleSellingPriceChange(parseFloat(e.target.value) || 0)}
                className="w-full h-11 px-3.5 rounded-xl bg-[#000000] border border-white/[0.16] text-base font-bold text-emerald-400 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="sticky bottom-0 bg-[#000000] -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 px-5 sm:px-6 py-3.5 border-t border-white/[0.16] flex items-center justify-end gap-3 z-10">
            <button
              onClick={() => setMarkupModalOpen(false)}
              className="h-10 sm:h-11 px-4 sm:px-5 rounded-xl bg-[#000000] hover:bg-white/[0.08] text-xs sm:text-sm font-semibold text-slate-300 border border-white/[0.16]"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveMarkup}
              className="h-10 sm:h-11 px-5 sm:px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/25 flex items-center gap-2 active:scale-95 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Novo Preço</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* New Product Modal (Simple vs Grade) */}
      <Modal
        isOpen={newProductModalOpen}
        onClose={() => setNewProductModalOpen(false)}
        title="Cadastrar Novo Produto"
        subtitle={tipoCadastro === 'GRADE' ? 'Configuração de produto matriz com atributos e divisão de estoque' : 'Cadastro de item individual para catálogo'}
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateProduct} className="space-y-5">
          {/* Toggle Type */}
          <div className="flex rounded-xl bg-[#000000] border border-white/[0.16] p-1 gap-1">
            <button
              type="button"
              onClick={() => setTipoCadastro('SIMPLES')}
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                tipoCadastro === 'SIMPLES'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Package className="w-4 h-4" />
              Produto Simples
            </button>
            <button
              type="button"
              onClick={() => {
                if (!gradeLiberada) {
                  toast.error('O módulo de Grade e Variações não está habilitado para o seu plano.');
                  return;
                }
                setTipoCadastro('GRADE');
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                !gradeLiberada
                  ? 'opacity-50 cursor-not-allowed text-slate-500'
                  : tipoCadastro === 'GRADE'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Produto com Grade / Variações</span>
              {!gradeLiberada && <span className="text-[10px] bg-white/[0.1] px-1.5 py-0.5 rounded text-amber-300">Bloqueado</span>}
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              {tipoCadastro === 'GRADE' ? 'Nome do Produto Matriz (Ex: Camiseta Dry Fit)' : 'Nome do Produto'}
            </label>
            <input
              type="text"
              required
              value={newNome}
              onChange={(e) => setNewNome(e.target.value)}
              placeholder={tipoCadastro === 'GRADE' ? 'Ex: Camiseta Básica Algodão' : 'Ex: Teclado Sem Fio Bluetooth'}
              className="w-full h-11 px-3.5 rounded-xl bg-[#000000] border border-white/[0.16] text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                {tipoCadastro === 'GRADE' ? 'SKU Base (Prefixo das variações)' : 'SKU (Código Único)'}
              </label>
              <input
                type="text"
                required
                value={newSku}
                onChange={(e) => setNewSku(e.target.value)}
                placeholder={tipoCadastro === 'GRADE' ? 'Ex: CAM-BAS' : 'Ex: TEC-BLU-07'}
                className="w-full h-11 px-3.5 rounded-xl bg-[#000000] border border-white/[0.16] text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                {tipoCadastro === 'GRADE' ? 'Código de Barras Base (Opcional)' : 'Código de Barras (EAN-13)'}
              </label>
              <input
                type="text"
                value={newBarcode}
                onChange={(e) => setNewBarcode(e.target.value)}
                placeholder="Ex: 7891234560074"
                className="w-full h-11 px-3.5 rounded-xl bg-[#000000] border border-white/[0.16] text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Foto do Produto (Opcional) */}
          <div className="space-y-2 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.14]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>Foto do Produto</span>
                <span className="text-[10px] text-slate-400 font-normal normal-case">(opcional)</span>
              </label>

              <div className="flex rounded-lg bg-[#000000] border border-white/[0.14] p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setModoEntradaImagem('ARQUIVO')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    modoEntradaImagem === 'ARQUIVO'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Arquivo / Câmera
                </button>
                <button
                  type="button"
                  onClick={() => setModoEntradaImagem('URL')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    modoEntradaImagem === 'URL'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Link URL
                </button>
              </div>
            </div>

            {newImagemUrl ? (
              <div className="p-3 rounded-lg bg-[#000000] border border-white/[0.16] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={newImagemUrl}
                    alt="Prévia do Produto"
                    className="w-12 h-12 rounded-lg object-cover border border-white/[0.2] bg-black flex-shrink-0"
                  />
                  <div className="min-w-0 text-xs">
                    <span className="text-emerald-400 font-bold block truncate">Foto Adicionada</span>
                    <span className="text-[11px] text-slate-400 block truncate">
                      {newImagemUrl.startsWith('data:') ? 'Imagem pronta para o cadastro' : newImagemUrl}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNewImagemUrl('')}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 flex-shrink-0"
                  title="Remover foto"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Remover</span>
                </button>
              </div>
            ) : modoEntradaImagem === 'ARQUIVO' ? (
              <label className="flex flex-col items-center justify-center p-3.5 rounded-lg border border-dashed border-white/[0.2] hover:border-emerald-500/50 hover:bg-white/[0.02] cursor-pointer transition-all group">
                <UploadCloud className="w-6 h-6 text-slate-400 group-hover:text-emerald-400 transition-colors mb-1" />
                <span className="text-xs font-semibold text-slate-200 group-hover:text-white text-center">
                  Clique para anexar uma foto ou tirar foto pela câmera
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 text-center">
                  PNG, JPG ou WebP até 10MB (compressão automática). Não obrigatório.
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                  <input
                    type="url"
                    value={newImagemUrl}
                    onChange={(e) => setNewImagemUrl(e.target.value)}
                    placeholder="Cole o link da foto: https://exemplo.com/foto.jpg"
                    className="w-full h-10 pl-9 pr-3.5 rounded-lg bg-[#000000] border border-white/[0.16] text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                {newImagemUrl && (
                  <button
                    type="button"
                    onClick={() => setNewImagemUrl('')}
                    className="h-10 px-3 rounded-lg bg-[#000000] border border-white/[0.16] text-slate-400 hover:text-white text-xs"
                  >
                    Limpar
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Preço de Custo (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={newCusto}
                onChange={(e) => setNewCusto(parseFloat(e.target.value) || 0)}
                className="w-full h-11 px-3.5 rounded-xl bg-[#000000] border border-white/[0.16] text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Markup Desejado (%)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                required
                value={newMarkup}
                onChange={(e) => setNewMarkup(parseFloat(e.target.value) || 0)}
                className="w-full h-11 px-3.5 rounded-xl bg-[#000000] border border-white/[0.16] text-sm text-emerald-400 font-bold focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Venda Calculada (R$)
              </label>
              <div className="w-full h-11 px-3.5 rounded-xl bg-white/[0.04] border border-white/[0.16] text-sm font-bold text-white flex items-center justify-between">
                <span>R$ {precoVendaCalculado.toFixed(2)}</span>
                <span className="text-[10px] text-emerald-400 font-normal">automático</span>
              </div>
            </div>
          </div>

          {/* Configuração de Estoque Simples vs Grade */}
          {tipoCadastro === 'SIMPLES' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Estoque Inicial (unidades)
              </label>
              <input
                type="number"
                required
                min="0"
                value={newEstoqueInicial}
                onChange={(e) => setNewEstoqueInicial(parseInt(e.target.value) || 0)}
                className="w-full h-11 px-3.5 rounded-xl bg-[#000000] border border-white/[0.16] text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.16] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Distribuição de Estoque nas Variações
                </span>
                <div className="flex rounded-lg bg-[#000000] border border-white/[0.16] p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setModoDivisaoEstoque('POR_VARIACAO')}
                    className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                      modoDivisaoEstoque === 'POR_VARIACAO'
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Fixo por Variação
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModoDivisaoEstoque('DIVIDIR_TOTAL');
                      const totalVars = previewCombinacoes.length || 1;
                      setNewEstoqueInicial(Math.floor(qtdTotalLote / totalVars));
                    }}
                    className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                      modoDivisaoEstoque === 'DIVIDIR_TOTAL'
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Dividir Quantidade Total
                  </button>
                </div>
              </div>

              {modoDivisaoEstoque === 'DIVIDIR_TOTAL' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-purple-300 uppercase tracking-wider mb-1">
                      Quantidade Total do Lote (todas as peças)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={qtdTotalLote}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setQtdTotalLote(val);
                        const totalVars = previewCombinacoes.length || 1;
                        setNewEstoqueInicial(Math.floor(val / totalVars));
                      }}
                      className="w-full h-10 px-3 rounded-lg bg-[#000000] border border-purple-500/40 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div className="p-3 rounded-lg bg-purple-950/20 border border-purple-500/30 flex flex-col justify-center text-xs">
                    <span className="text-slate-300">
                      Resultado:{' '}
                      <strong className="text-emerald-400 text-sm">
                        {newEstoqueInicial} un
                      </strong>{' '}
                      para cada uma das {previewCombinacoes.length || 1} variações.
                    </span>
                    {previewCombinacoes.length > 0 && qtdTotalLote % previewCombinacoes.length > 0 && (
                      <span className="text-[10px] text-amber-300 mt-0.5">
                        Sobra de {qtdTotalLote % previewCombinacoes.length} un (distribuição inteira).
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Estoque Inicial por Variação (cada SKU receberá este saldo)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newEstoqueInicial}
                    onChange={(e) => setNewEstoqueInicial(parseInt(e.target.value) || 0)}
                    className="w-full h-10 px-3 rounded-lg bg-[#000000] border border-white/[0.16] text-sm text-white focus:outline-none"
                  />
                  <div className="text-[11px] text-slate-400 mt-1">
                    Total em estoque somando as {previewCombinacoes.length} variações:{' '}
                    <strong className="text-white">
                      {newEstoqueInicial * (previewCombinacoes.length || 1)} peças
                    </strong>.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Grade / Variations Attribute Builder */}
          {tipoCadastro === 'GRADE' && (
            <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-400" />
                  Atributos da Grade (Tamanho, Cor, Voltagem)
                </span>
                <span className="text-xs text-purple-400 font-bold">
                  {previewCombinacoes.length} combinações geradas
                </span>
              </div>

              {/* Attributes List */}
              <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                {atributosGrade.map((attr, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-[#000000] border border-white/[0.14] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{attr.nome}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAtributo(idx)}
                        className="text-slate-400 hover:text-rose-400 transition-colors"
                        title="Remover Atributo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {attr.valores.map((val) => (
                        <span
                          key={val}
                          className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-200 border border-purple-500/30 text-xs font-semibold flex items-center gap-1"
                        >
                          {val}
                          <button
                            type="button"
                            onClick={() => handleRemoveValorAtributo(idx, val)}
                            className="text-purple-400 hover:text-white"
                          >
                            ×
                          </button>
                        </span>
                      ))}

                      {/* Add Tag Input */}
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="Adicionar valor..."
                          value={novoValorInput[idx] || ''}
                          onChange={(e) => setNovoValorInput({ ...novoValorInput, [idx]: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddValorAtributo(idx);
                            }
                          }}
                          className="h-7 px-2 text-xs rounded bg-white/[0.05] border border-white/[0.14] text-white placeholder-slate-500 focus:outline-none w-28"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddValorAtributo(idx)}
                          className="h-7 px-2 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add New Attribute */}
              <div className="flex items-center gap-2 pt-2 border-t border-purple-500/20">
                <input
                  type="text"
                  placeholder="Novo Atributo (ex: Voltagem, Sabor)..."
                  value={novoAtributoNome}
                  onChange={(e) => setNovoAtributoNome(e.target.value)}
                  className="h-9 px-3 text-xs rounded-lg bg-[#000000] border border-white/[0.16] text-white flex-1 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddAtributo}
                  className="h-9 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Atributo</span>
                </button>
              </div>

              {/* Live Preview of SKUs */}
              {previewCombinacoes.length > 0 && (
                <div className="pt-2 text-xs text-slate-400 space-y-1">
                  <span className="font-semibold text-slate-300">Prévia das variações calculadas:</span>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                    {previewCombinacoes.map((c, i) => {
                      const desc = Object.values(c).join(' / ');
                      const slug = Object.values(c).map(v => v.toUpperCase().replace(/\s+/g, '')).join('-');
                      return (
                        <span key={i} className="px-2 py-0.5 rounded bg-black/40 border border-white/[0.1] text-[10px] text-slate-300 font-mono">
                          {newSku ? `${newSku.toUpperCase()}-${slug}` : desc}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-[#000000] border border-white/[0.16] flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Preço de Venda Gerado:</span>
            <span className="text-base font-bold text-emerald-400">
              R$ {(newCusto * (1 + newMarkup / 100)).toFixed(2)}
            </span>
          </div>

          <div className="sticky bottom-0 bg-[#000000] -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 px-5 sm:px-6 py-3.5 border-t border-white/[0.16] flex items-center justify-end gap-3 z-10">
            <button
              type="button"
              onClick={() => setNewProductModalOpen(false)}
              className="h-10 sm:h-11 px-4 sm:px-5 rounded-xl bg-[#000000] hover:bg-white/[0.08] text-xs sm:text-sm font-semibold text-slate-300 border border-white/[0.16]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`h-10 sm:h-11 px-5 sm:px-6 rounded-xl text-white text-xs sm:text-sm font-bold shadow-md active:scale-95 transition-all ${
                tipoCadastro === 'GRADE'
                  ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/25'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25'
              }`}
            >
              {tipoCadastro === 'GRADE'
                ? `Gerar Grade (${previewCombinacoes.length} Variações)`
                : 'Salvar Produto'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Single Variation Modal */}
      <Modal
        isOpen={addVariacaoModalOpen}
        onClose={() => setAddVariacaoModalOpen(false)}
        title={`Adicionar Variação a "${selectedPaiParaVariacao?.nome}"`}
      >
        <form onSubmit={handleSaveVariacaoAvulsa} className="space-y-4">
          <p className="text-xs text-slate-400">
            Adicione uma nova opção específica de tamanho, cor ou voltagem para a grade deste produto.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Variações (Atributo : Valor)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Nome do Atributo (ex: Tamanho)"
                  id="attr_name_input"
                  className="h-10 px-3 rounded-xl bg-[#000000] border border-white/[0.16] text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="Valor (ex: GG ou 44)"
                  id="attr_val_input"
                  className="h-10 px-3 rounded-xl bg-[#000000] border border-white/[0.16] text-xs text-white"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const n = (document.getElementById('attr_name_input') as HTMLInputElement)?.value;
                  const v = (document.getElementById('attr_val_input') as HTMLInputElement)?.value;
                  if (n && v) {
                    setAvulsaVariacoes((prev) => ({ ...prev, [n]: v }));
                    (document.getElementById('attr_name_input') as HTMLInputElement).value = '';
                    (document.getElementById('attr_val_input') as HTMLInputElement).value = '';
                  }
                }}
                className="mt-2 text-xs font-bold text-purple-400 hover:underline inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Atributo
              </button>

              {/* Added attributes chips */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {Object.entries(avulsaVariacoes).map(([k, v]) => (
                  <span
                    key={k}
                    className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-200 border border-purple-500/30 text-xs font-bold flex items-center gap-1"
                  >
                    {k}: {v}
                    <button
                      type="button"
                      onClick={() => {
                        const copy = { ...avulsaVariacoes };
                        delete copy[k];
                        setAvulsaVariacoes(copy);
                      }}
                      className="text-purple-400 hover:text-white"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  SKU Específico (Opcional)
                </label>
                <input
                  type="text"
                  value={avulsaSku}
                  onChange={(e) => setAvulsaSku(e.target.value)}
                  placeholder="Automático se vazio"
                  className="w-full h-10 px-3 rounded-xl bg-[#000000] border border-white/[0.16] text-xs text-white uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Preço de Venda (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={avulsaPreco}
                  onChange={(e) => setAvulsaPreco(parseFloat(e.target.value) || 0)}
                  className="w-full h-10 px-3 rounded-xl bg-[#000000] border border-white/[0.16] text-xs text-emerald-400 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Código de Barras (EAN-13)
              </label>
              <input
                type="text"
                value={avulsaBarcode}
                onChange={(e) => setAvulsaBarcode(e.target.value)}
                placeholder="Ex: 789123456789"
                className="w-full h-10 px-3 rounded-xl bg-[#000000] border border-white/[0.16] text-xs text-white"
              />
            </div>
          </div>

          <div className="sticky bottom-0 bg-[#000000] -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 px-5 sm:px-6 py-3.5 border-t border-white/[0.16] flex items-center justify-end gap-3 z-10">
            <button
              type="button"
              onClick={() => setAddVariacaoModalOpen(false)}
              className="h-10 px-4 rounded-xl bg-[#000000] text-xs font-semibold text-slate-300 border border-white/[0.16] hover:bg-white/[0.08]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="h-10 px-5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/25 active:scale-95 transition-all"
            >
              Salvar Variação
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
