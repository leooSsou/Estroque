import React from 'react';
import {
  Produto,
  Cliente,
  FormaPagamento,
  CaixaTurno,
} from '../../types';
import { Select } from '../common/Select';
import {
  CartItem,
  CatalogFilter,
  PDVTab,
  PaymentMode,
  SplitPaymentEntry,
} from './types';
import { isBotaoFinalizarDesabilitado } from './pdvBusinessRules';
import {
  AlertTriangle,
  Unlock,
  Barcode,
  X,
  Plus,
  Minus,
  ShoppingCart,
  PauseCircle,
  UserCheck,
  Wallet,
  QrCode,
  CreditCard,
  Banknote,
  CalendarClock,
  Trash2,
  Loader2,
  Lock,
  CheckCircle2,
} from 'lucide-react';

export interface PDVFrenteCaixaTabProps {
  caixaTurno: CaixaTurno | null;
  setActiveTab: (tab: PDVTab) => void;
  search: string;
  setSearch: (v: string) => void;
  handleBarcodeOrSearchSubmit: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  counts: { todos: number; disponivel: number; esgotado: number };
  catalogFilter: CatalogFilter;
  setCatalogFilter: (f: CatalogFilter) => void;
  filteredProdutos: Produto[];
  produtos: Produto[];
  getProductDisplayStock: (prod: Produto) => number;
  handleAddToCart: (prod: Produto) => void;
  cart: CartItem[];
  setPauseModalOpen: (v: boolean) => void;
  selectedClienteId: string;
  setSelectedClienteId: (v: string) => void;
  clientes: Cliente[];
  selectedCliente?: Cliente;
  limiteDisponivel: number;
  updateQuantity: (id: string, delta: number) => void;
  modoPagamento: PaymentMode;
  setModoPagamento: (m: PaymentMode) => void;
  splitPagamentos: SplitPaymentEntry[];
  valorTotal: number;
  setNovoSplitValor: (v: number | '') => void;
  formaPagamento: FormaPagamento;
  setFormaPagamento: (f: FormaPagamento) => void;
  novoSplitForma: FormaPagamento;
  setNovoSplitForma: (f: FormaPagamento) => void;
  restanteSplit: number;
  totalSplitPago: number;
  handleRemoveSplitPayment: (index: number) => void;
  novoSplitValor: number | '';
  handleAddSplitPayment: () => void;
  valorRecebido: number | '';
  setValorRecebido: (v: number | '') => void;
  troco: number;
  dinheiroInsuficiente: boolean;
  numValorRecebido: number;
  crediarioExcedido: boolean;
  creditoLojaExcedido?: boolean;
  splitCrediarioExcedido: boolean;
  splitCreditoLojaExcedido?: boolean;
  subtotal: number;
  desconto: number;
  setDesconto: (v: number) => void;
  handleFinalizeSale: () => void;
  isFinalizingSale: boolean;
}

export const PDVFrenteCaixaTab: React.FC<PDVFrenteCaixaTabProps> = ({
  caixaTurno,
  setActiveTab,
  search,
  setSearch,
  handleBarcodeOrSearchSubmit,
  counts,
  catalogFilter,
  setCatalogFilter,
  filteredProdutos,
  produtos,
  getProductDisplayStock,
  handleAddToCart,
  cart,
  setPauseModalOpen,
  selectedClienteId,
  setSelectedClienteId,
  clientes,
  selectedCliente,
  limiteDisponivel,
  updateQuantity,
  modoPagamento,
  setModoPagamento,
  splitPagamentos,
  valorTotal,
  setNovoSplitValor,
  formaPagamento,
  setFormaPagamento,
  novoSplitForma,
  setNovoSplitForma,
  restanteSplit,
  totalSplitPago,
  handleRemoveSplitPayment,
  novoSplitValor,
  handleAddSplitPayment,
  valorRecebido,
  setValorRecebido,
  troco,
  dinheiroInsuficiente,
  numValorRecebido,
  crediarioExcedido,
  creditoLojaExcedido,
  splitCrediarioExcedido,
  splitCreditoLojaExcedido,
  subtotal,
  desconto,
  setDesconto,
  handleFinalizeSale,
  isFinalizingSale,
}) => {
  return (
    <div className="space-y-4">
      {!caixaTurno?.aberto && (
        <div className="p-4 sm:p-5 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-bento-dark">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Turno de Caixa Fechado</h4>
              <p className="text-xs text-amber-200/80">
                O caixa precisa ser aberto na aba <strong>Operações de Caixa</strong> informando o fundo de troco antes de registrar vendas.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('OPERACAO_CAIXA')}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 active:scale-95 transition-all shadow-md shrink-0 cursor-pointer"
          >
            <Unlock className="w-4 h-4" />
            <span>Abrir Turno Agora</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6 items-start">
        {/* Left 60%: Product Selection & Scanner */}
        <div className="md:col-span-7 space-y-4">
          {/* Barcode Scanner & Search Bar */}
          <div className="p-4 rounded-3xl bg-[#000000] border border-white/[0.16] shadow-bento-dark space-y-3">
            <div className="relative group">
              <Barcode className="w-5 h-5 text-slate-400 group-focus-within:text-yellow-400 absolute left-4 top-3.5 transition-colors duration-200 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleBarcodeOrSearchSubmit}
                placeholder="Bipar leitor de código de barras ou pesquisar item..."
                className="w-full pl-12 pr-10 py-3 rounded-2xl bg-[#000000] border border-white/[0.16] text-sm font-medium text-white placeholder-slate-500 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 focus:outline-none transition-all duration-200"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white p-0.5 rounded-full hover:bg-white/[0.08] transition-all active:scale-90"
                  title="Limpar busca"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#000000] border border-white/[0.16] overflow-x-auto table-scrollbar">
              {[
                { id: 'TODOS', label: 'Todos os Itens', count: counts.todos },
                { id: 'DISPONIVEL', label: 'Em Estoque', count: counts.disponivel },
                { id: 'ESGOTADO', label: 'Esgotados', count: counts.esgotado },
              ].map((pill) => {
                const isActive = catalogFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    onClick={() => setCatalogFilter(pill.id as CatalogFilter)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap active:scale-95 ${
                      isActive
                        ? 'bg-emerald-600 text-white font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <span>{pill.label}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold transition-all ${
                        isActive
                          ? 'bg-emerald-800 text-white'
                          : 'bg-[#000000] text-slate-400 border border-white/[0.14]'
                      }`}
                    >
                      {pill.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
            {filteredProdutos.map((prod) => {
              const variacoes = produtos.filter((p) => p.produto_pai_id === prod.id && p.ativo);
              const hasVariacoes = variacoes.length > 0;
              const stock = getProductDisplayStock(prod);

              return (
                <div
                  key={prod.id}
                  onClick={() => handleAddToCart(prod)}
                  className={`bg-[#000000] border rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition-all duration-250 group btn-press hover-lift ${
                    stock === 0
                      ? 'opacity-40 border-rose-500/20 pointer-events-none'
                      : 'border-white/[0.16] hover:border-yellow-400/50 hover:bg-white/[0.04]'
                  }`}
                >
                  <div>
                    <div className="flex items-start gap-2.5 mb-2.5">
                      {prod.imagem_url && (
                        <img
                          src={prod.imagem_url}
                          alt={prod.nome}
                          className="w-10 h-10 rounded-lg object-cover border border-white/[0.16] bg-black flex-shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                          <span className="font-mono">{prod.sku}</span>
                          <div className="flex items-center gap-1.5">
                            {hasVariacoes && (
                              <span className="px-1.5 py-0.5 rounded-md bg-yellow-400/10 text-yellow-400 border border-yellow-400/25 text-[10px] font-bold">
                                {variacoes.length} {variacoes.length === 1 ? 'variação' : 'variações'}
                              </span>
                            )}
                            <span className={stock === 0 ? 'text-rose-400 font-bold' : 'text-slate-300 font-semibold'}>
                              {stock} un
                            </span>
                          </div>
                        </div>
                        <h4 className="text-sm font-bold text-white line-clamp-2 group-hover:text-yellow-400 transition-colors">
                          {prod.nome}
                        </h4>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.14]">
                    <span className="text-base font-bold text-yellow-400">
                      R$ {prod.preco_venda.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      aria-label="Adicionar item"
                      className="w-8 h-8 rounded-xl bg-[#000000] border border-white/[0.16] group-hover:bg-yellow-400 group-hover:text-black group-hover:border-yellow-400 flex items-center justify-center text-slate-300 font-bold transition-all group-hover:scale-110"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 40%: Active Cart & Checkout */}
        <div className="md:col-span-5 space-y-4">
          <div className="bg-[#000000] border border-white/[0.16] rounded-3xl p-5 shadow-bento-dark space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.16]">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Carrinho de Venda</h3>
              </div>
              <div className="flex items-center gap-2">
                {cart.length > 0 && (
                  <button
                    onClick={() => setPauseModalOpen(true)}
                    className="px-3 py-1 rounded-xl bg-[#000000] hover:bg-amber-400/10 text-amber-400 hover:text-amber-300 text-xs font-bold border border-amber-400/30 flex items-center gap-1.5 transition-all active:scale-95"
                    title="Pausar esta venda e liberar o caixa"
                  >
                    <PauseCircle className="w-3.5 h-3.5" />
                    <span>Pausar Venda</span>
                  </button>
                )}
                <span className="text-xs text-slate-300 font-bold bg-[#000000] px-2.5 py-1 rounded-full border border-white/[0.16]">
                  {cart.reduce((a, b) => a + b.quantidade, 0)} itens
                </span>
              </div>
            </div>

            {/* Customer Selector & Credit Limit Widget */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-[#000000] border border-white/[0.16]">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>Cliente / Titular do Crediário</span>
              </label>
              <Select
                value={selectedClienteId}
                onChange={(val) => setSelectedClienteId(val)}
                options={[
                  { value: '', label: 'Consumidor Final (Sem Crediário)' },
                  ...clientes.map((cli) => ({
                    value: cli.id,
                    label: cli.nome,
                    sublabel: `Doc: ${cli.documento} • Limite: R$ ${cli.limite_credito.toFixed(2)}`,
                  })),
                ]}
                placeholder="Selecione o cliente..."
              />

              {selectedCliente && (
                <div className="pt-2 border-t border-white/[0.14] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 font-medium">Limite Disponível:</span>
                    <div
                      className={`font-bold text-sm ${
                        limiteDisponivel <= 0 ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      R$ {limiteDisponivel.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 font-medium">Limite Total:</span>
                    <div className="text-sm font-bold text-white">
                      R$ {selectedCliente.limite_credito.toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Cart Items List */}
            <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1 divide-y divide-white/[0.14] table-scrollbar">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-500">
                  Nenhum item adicionado ao carrinho ainda.
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.produto.id} className="pt-2.5 flex items-center justify-between gap-3">
                    <div className="truncate flex-1">
                      <div className="text-sm font-bold text-white truncate">
                        {item.produto.nome}
                      </div>
                      <div className="text-xs text-slate-400 font-medium mt-0.5">
                        R$ {item.preco_unitario.toFixed(2)} un
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => updateQuantity(item.produto.id, -1)}
                        className="w-8 h-8 rounded-xl bg-[#000000] hover:bg-white/[0.08] flex items-center justify-center text-slate-200 border border-white/[0.16] btn-press"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-white">
                        {item.quantidade}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.produto.id, 1)}
                        className="w-8 h-8 rounded-xl bg-[#000000] hover:bg-emerald-500/15 flex items-center justify-center text-emerald-400 border border-white/[0.16] btn-press"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <span className="w-20 text-right font-bold text-sm md:text-base text-emerald-400">
                        R$ {(item.quantidade * item.preco_unitario).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Payment Methods Selector & Split Payment Toggle */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">Forma de Pagamento</label>
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#000000] border border-white/[0.16] text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setModoPagamento('SIMPLES')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      modoPagamento === 'SIMPLES'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Único
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModoPagamento('SPLIT');
                      if (splitPagamentos.length === 0 && valorTotal > 0) {
                        setNovoSplitValor(valorTotal);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      modoPagamento === 'SPLIT'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Dividir (Split)
                  </button>
                </div>
              </div>

              {selectedCliente && (selectedCliente.credito_loja || 0) > 0 && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span>Cliente possui <strong>R$ {selectedCliente.credito_loja?.toFixed(2)}</strong> em Vale-Crédito!</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (modoPagamento === 'SIMPLES') {
                        setFormaPagamento('CREDITO_LOJA');
                      } else {
                        setNovoSplitForma('CREDITO_LOJA');
                        setNovoSplitValor(Math.min(restanteSplit, selectedCliente.credito_loja || 0));
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] transition-all cursor-pointer shadow-sm"
                  >
                    Usar Crédito
                  </button>
                </div>
              )}

              {modoPagamento === 'SIMPLES' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-bold">
                  {[
                    { id: 'PIX', label: 'PIX', icon: QrCode },
                    { id: 'CARTAO_CREDITO', label: 'Crédito', icon: CreditCard },
                    { id: 'CARTAO_DEBITO', label: 'Débito', icon: CreditCard },
                    { id: 'DINHEIRO', label: 'Dinheiro', icon: Banknote },
                    { id: 'CREDIARIO', label: 'Crediário', icon: CalendarClock },
                    { id: 'CREDITO_LOJA', label: 'Vale-Crédito', icon: Wallet },
                  ].map((pm) => {
                    const Icon = pm.icon;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setFormaPagamento(pm.id as FormaPagamento)}
                        className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs font-bold btn-press ${
                          formaPagamento === pm.id
                            ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-500/20'
                            : 'bg-[#000000] text-slate-300 border border-white/[0.16] hover:bg-white/[0.06]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{pm.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Split Payment Management Panel */
                <div className="p-3.5 rounded-2xl bg-[#000000] border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-white/[0.14]">
                    <span className="font-semibold text-slate-300">Resumo da Divisão:</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400">
                        Pago: <strong className="text-white">R$ {totalSplitPago.toFixed(2)}</strong>
                      </span>
                      <span className={`font-bold ${restanteSplit > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {restanteSplit > 0 ? `Faltam: R$ ${restanteSplit.toFixed(2)}` : '✓ 100% Coberto'}
                      </span>
                    </div>
                  </div>

                  {splitPagamentos.length > 0 && (
                    <div className="space-y-1.5">
                      {splitPagamentos.map((p, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-xl bg-[#000000] border border-white/[0.12] text-xs"
                        >
                          <span className="font-bold text-white">{p.forma_pagamento}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-400">R$ {p.valor.toFixed(2)}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSplitPayment(idx)}
                              className="w-6 h-6 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 flex items-center justify-center transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {restanteSplit > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px] font-bold">
                        {[
                          { id: 'DINHEIRO', label: 'Dinheiro' },
                          { id: 'PIX', label: 'PIX' },
                          { id: 'CARTAO_CREDITO', label: 'Crédito' },
                          { id: 'CARTAO_DEBITO', label: 'Débito' },
                          { id: 'CREDIARIO', label: 'Crediário' },
                          { id: 'CREDITO_LOJA', label: 'Vale-Crédito' },
                        ].map((pm) => (
                          <button
                            key={pm.id}
                            type="button"
                            onClick={() => setNovoSplitForma(pm.id as FormaPagamento)}
                            className={`py-1.5 px-2 rounded-lg text-center transition-all ${
                              novoSplitForma === pm.id
                                ? 'bg-emerald-600 text-white font-bold'
                                : 'bg-[#000000] text-slate-300 border border-white/[0.14] hover:bg-white/[0.06]'
                            }`}
                          >
                            {pm.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">
                            R$
                          </span>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            max={restanteSplit}
                            value={novoSplitValor}
                            onChange={(e) =>
                              setNovoSplitValor(e.target.value === '' ? '' : parseFloat(e.target.value))
                            }
                            placeholder={restanteSplit.toFixed(2)}
                            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#000000] border border-white/[0.16] text-sm text-white font-bold focus:border-emerald-500 focus:outline-none"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleAddSplitPayment}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Adicionar</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dinheiro Change Calculator (Apenas em Modo Simples) */}
            {modoPagamento === 'SIMPLES' && formaPagamento === 'DINHEIRO' && (
              <div className="p-3.5 rounded-2xl bg-[#000000] border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-amber-400" />
                    <span>Valor Recebido em Espécie</span>
                  </label>
                  <div className="flex items-center gap-1 text-[11px] font-bold">
                    <span className="text-slate-400">R$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={valorRecebido}
                      onChange={(e) => setValorRecebido(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      placeholder={valorTotal.toFixed(2)}
                      className="w-24 px-2 py-1 rounded-lg bg-[#000000] border border-white/[0.16] text-right text-sm text-white font-bold focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto table-scrollbar">
                  {[valorTotal, 20, 50, 100, 200].map((sug, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setValorRecebido(sug)}
                      className="px-2.5 py-1 rounded-lg bg-[#000000] hover:bg-white/[0.08] text-[11px] font-semibold text-slate-300 border border-white/[0.16] active:scale-95"
                    >
                      {idx === 0 ? 'Exato' : `R$ ${sug}`}
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-white/[0.16] flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Troco a Devolver:</span>
                  <span className="text-base font-bold text-emerald-400">
                    R$ {troco.toFixed(2)}
                  </span>
                </div>

                {dinheiroInsuficiente && (
                  <div className="text-[11px] text-rose-400 font-medium">
                    ⚠️ Faltam R$ {(valorTotal - (numValorRecebido || 0)).toFixed(2)} para cobrir o total.
                  </div>
                )}
              </div>
            )}

            {/* Credit Limit Alert if Exceeded */}
            {(crediarioExcedido || splitCrediarioExcedido) && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400" />
                <span>
                  {selectedCliente
                    ? `Valor solicitado em crediário ultrapassa o limite disponível do cliente (R$ ${limiteDisponivel.toFixed(2)})!`
                    : 'Para vender no crediário é obrigatório selecionar um cliente cadastrado.'}
                </span>
              </div>
            )}

            {/* Totals & Final Action Button */}
            <div className="pt-3.5 border-t border-white/[0.16] space-y-3">
              <div className="p-3.5 rounded-2xl bg-[#000000] border border-white/[0.16] space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-300">Subtotal:</span>
                  <span className="text-base font-bold text-white">R$ {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-300">Desconto Aplicado:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">R$</span>
                    <input
                      type="number"
                      min="0"
                      value={desconto}
                      onChange={(e) => setDesconto(parseFloat(e.target.value) || 0)}
                      className="w-24 px-2.5 py-1 rounded-xl bg-[#000000] border border-white/[0.16] text-right text-sm text-white font-bold focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="pt-2.5 border-t border-white/[0.16] flex items-center justify-between text-base font-bold text-white">
                  <span>Total a Pagar:</span>
                  <span className="text-3xl font-bold text-emerald-400">
                    R$ {valorTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleFinalizeSale}
                disabled={isBotaoFinalizarDesabilitado({
                  isFinalizingSale,
                  caixaAberto: Boolean(caixaTurno?.aberto),
                  cartLength: cart.length,
                  modoPagamento,
                  crediarioExcedido,
                  creditoLojaExcedido,
                  dinheiroInsuficiente,
                  restanteSplit,
                  splitPagamentosLength: splitPagamentos.length,
                  splitCrediarioExcedido,
                  splitCreditoLojaExcedido,
                })}
                className={`w-full py-3.5 px-4 rounded-xl text-white text-base font-bold shadow-lg transition-all flex items-center justify-center gap-2 mt-2 btn-press hover-lift ${
                  !caixaTurno?.aberto
                    ? 'bg-amber-600/70 hover:bg-amber-600 text-amber-100 cursor-pointer shadow-amber-600/20'
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25 disabled:opacity-40 disabled:pointer-events-none'
                }`}
              >
                {isFinalizingSale ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processando Venda...</span>
                  </>
                ) : !caixaTurno?.aberto ? (
                  <>
                    <Lock className="w-5 h-5 text-amber-200" />
                    <span>Caixa Fechado (Clique para Abrir)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>
                      {modoPagamento === 'SPLIT'
                        ? `Finalizar Venda Dividida (${splitPagamentos.length} ${splitPagamentos.length === 1 ? 'pagamento' : 'pagamentos'})`
                        : 'Finalizar Venda & Emitir Cupom'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
