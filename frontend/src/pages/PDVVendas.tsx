import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { Produto, Cliente, FormaPagamento, Venda } from '../types';
import { BentoCard } from '../components/common/BentoCard';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import {
  ShoppingCart,
  Search,
  Barcode,
  CreditCard,
  Banknote,
  QrCode,
  CalendarClock,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Plus,
  Minus,
  Printer,
  Package,
} from 'lucide-react';

interface CartItem {
  produto: Produto;
  quantidade: number;
  preco_unitario: number;
}

export const PDVVendas: React.FC = () => {
  const { activeLoja } = useAuth();
  const { toast } = useToast();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState('');
  const [selectedClienteId, setSelectedClienteId] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('PIX');
  const [desconto, setDesconto] = useState(0);

  // Receipt Modal State
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<Venda | null>(null);

  useEffect(() => {
    const init = async () => {
      const [prods, clis] = await Promise.all([
        api.getProdutos(activeLoja?.id),
        api.getClientes(),
      ]);
      setProdutos(prods);
      setClientes(clis);
    };
    init();
  }, [activeLoja]);

  const selectedCliente = clientes.find((c) => c.id === selectedClienteId);
  const limiteDisponivel = selectedCliente
    ? Math.max(0, selectedCliente.limite_credito - selectedCliente.saldo_devedor_crediario)
    : 0;

  const handleAddToCart = (prod: Produto) => {
    const stock = activeLoja?.id ? prod.estoque_por_loja?.[activeLoja.id] ?? 0 : prod.estoque_total ?? 0;
    if (stock <= 0) {
      toast.error(`Produto "${prod.nome}" sem estoque disponível na loja!`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.produto.id === prod.id);
      if (existing) {
        if (existing.quantidade + 1 > stock) {
          toast.warning(`Limite de estoque atingido (${stock} un).`);
          return prev;
        }
        return prev.map((item) =>
          item.produto.id === prod.id
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        );
      }
      return [...prev, { produto: prod, quantidade: 1, preco_unitario: prod.preco_venda }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.produto.id === id) {
            const newQty = item.quantidade + delta;
            return newQty > 0 ? { ...item, quantidade: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const subtotal = cart.reduce((acc, item) => acc + item.quantidade * item.preco_unitario, 0);
  const valorTotal = Math.max(0, subtotal - desconto);

  // Credit limit validation check
  const crediarioExcedido =
    formaPagamento === 'CREDIARIO' && (!selectedCliente || valorTotal > limiteDisponivel);

  const handleFinalizeSale = async () => {
    if (cart.length === 0) {
      toast.error('O carrinho de compras está vazio.');
      return;
    }

    if (formaPagamento === 'CREDIARIO') {
      if (!selectedCliente) {
        toast.error('Selecione um cliente para prosseguir com venda no Crediário.');
        return;
      }
      if (crediarioExcedido) {
        toast.error('Limite de crediário do cliente excedido! Venda bloqueada.');
        return;
      }
    }

    try {
      const sale = await api.registrarVenda({
        loja_id: activeLoja?.id || '11111111-1111-1111-1111-111111111111',
        cliente_id: selectedClienteId || null,
        forma_pagamento: formaPagamento,
        desconto,
        itens: cart.map((c) => ({
          produto_id: c.produto.id,
          produto_nome: c.produto.nome,
          sku: c.produto.sku,
          quantidade: c.quantidade,
          preco_unitario: c.preco_unitario,
        })),
      });

      setCompletedSale(sale);
      setReceiptModalOpen(true);
      setCart([]);
      setDesconto(0);
      toast.success('Venda concluída com sucesso! Baixa no estoque efetuada.');

      // Refresh products and clients
      const [prods, clis] = await Promise.all([
        api.getProdutos(activeLoja?.id),
        api.getClientes(),
      ]);
      setProdutos(prods);
      setClientes(clis);
    } catch {
      toast.error('Erro ao registrar venda.');
    }
  };

  const filteredProdutos = produtos.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.nome.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.codigo_barras && p.codigo_barras.includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* POS Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F3FBF6] tracking-tight">
            Frente de Caixa (PDV)
          </h1>
        </div>
      </div>

      {/* POS Bento Grid: Left 65% Catalog + Right 35% Active Cart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 65%: Product Selection */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-3.5 rounded-2xl bg-[#0D1917] border border-[rgba(142,182,155,0.14)]">
            <div className="relative">
              <Search className="w-4 h-4 text-[#8EB69B] absolute left-3.5 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Bipar leitor de código de barras ou pesquisar item..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.18)] text-xs text-[#F3FBF6] placeholder-[#5E756B] focus:border-[#10B981] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredProdutos.map((prod) => {
              const stock = activeLoja?.id
                ? prod.estoque_por_loja?.[activeLoja.id] ?? 0
                : prod.estoque_total ?? 0;

              return (
                <div
                  key={prod.id}
                  onClick={() => handleAddToCart(prod)}
                  className={`bg-[#0D1917] border rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition-all duration-250 hover:border-[#10B981]/50 group btn-press hover-lift ${
                    stock === 0
                      ? 'opacity-40 border-red-500/20 pointer-events-none'
                      : 'border-[rgba(142,182,155,0.18)] hover:bg-[#142522]/50 hover:shadow-glow-emerald'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-[#A2B89B] mb-1.5 font-mono">
                      <span>{prod.sku}</span>
                      <span className={stock === 0 ? 'text-red-400 font-extrabold' : 'text-[#DAF1DE] font-semibold'}>
                        {stock} un
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-[#F3FBF6] line-clamp-2 mb-2.5 group-hover:text-[#10B981] transition-colors">
                      {prod.nome}
                    </h4>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-[rgba(142,182,155,0.1)]">
                    <span className="text-base font-extrabold text-[#10B981] font-mono">
                      R$ {prod.preco_venda.toFixed(2)}
                    </span>
                    <button className="w-8 h-8 rounded-xl bg-[#142522] group-hover:bg-[#10B981] group-hover:text-[#070E0D] flex items-center justify-center text-[#DAF1DE] transition-transform group-hover:scale-110">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 35%: Active Cart & Checkout */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#0D1917] border border-[rgba(142,182,155,0.18)] rounded-3xl p-5 shadow-bento-dark space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[rgba(142,182,155,0.12)]">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#10B981]" />
                <h3 className="text-base font-bold text-[#F3FBF6]">Carrinho de Venda</h3>
              </div>
              <span className="text-xs text-[#DAF1DE] font-mono font-bold bg-[#142522] px-2.5 py-1 rounded-full border border-[rgba(142,182,155,0.2)]">
                {cart.reduce((a, b) => a + b.quantidade, 0)} itens
              </span>
            </div>

            {/* Customer Selector & Real-Time Credit Limit Widget */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-[#070E0D] border border-[rgba(142,182,155,0.14)]">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#DAF1DE]">
                <UserCheck className="w-4 h-4 text-[#10B981]" />
                <span>Cliente / Titular do Crediário</span>
              </label>
              <select
                value={selectedClienteId}
                onChange={(e) => setSelectedClienteId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0D1917] border border-[rgba(142,182,155,0.2)] text-sm text-[#F3FBF6] focus:border-[#10B981] focus:outline-none font-medium"
              >
                <option value="">Consumidor Final (Sem Crediário)</option>
                {clientes.map((cli) => (
                  <option key={cli.id} value={cli.id}>
                    {cli.nome} ({cli.documento})
                  </option>
                ))}
              </select>

              {selectedCliente && (
                <div className="pt-2 border-t border-[rgba(142,182,155,0.1)] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[#A2B89B] font-medium">Limite Disponível:</span>
                    <div
                      className={`font-mono font-extrabold text-sm ${
                        limiteDisponivel <= 0 ? 'text-red-400' : 'text-[#10B981]'
                      }`}
                    >
                      R$ {limiteDisponivel.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[#A2B89B] font-medium">Limite Total:</span>
                    <div className="font-mono text-sm font-bold text-[#DAF1DE]">
                      R$ {selectedCliente.limite_credito.toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Cart Items List */}
            <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1 divide-y divide-[rgba(142,182,155,0.08)]">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-sm text-[#5E756B]">
                  Nenhum item adicionado ao carrinho ainda.
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.produto.id} className="pt-2.5 flex items-center justify-between gap-3">
                    <div className="truncate flex-1">
                      <div className="text-sm font-bold text-[#F3FBF6] truncate">
                        {item.produto.nome}
                      </div>
                      <div className="text-xs text-[#A2B89B] font-mono mt-0.5">
                        R$ {item.preco_unitario.toFixed(2)} un
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => updateQuantity(item.produto.id, -1)}
                        className="w-8 h-8 rounded-xl bg-[#142522] hover:bg-[#163832] flex items-center justify-center text-[#F3FBF6] border border-[rgba(142,182,155,0.2)] hover:border-[#10B981]/40 active:scale-90 cursor-pointer select-none transition-all"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center text-sm font-mono font-extrabold text-[#F3FBF6]">
                        {item.quantidade}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.produto.id, 1)}
                        className="w-8 h-8 rounded-xl bg-[#142522] hover:bg-[#163832] flex items-center justify-center text-[#10B981] border border-[rgba(142,182,155,0.2)] hover:border-[#10B981]/50 active:scale-90 cursor-pointer select-none transition-all"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <span className="w-20 text-right font-mono font-extrabold text-sm md:text-base text-[#10B981]">
                        R$ {(item.quantidade * item.preco_unitario).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Payment Methods Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#DAF1DE]">Forma de Pagamento</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-bold">
                {[
                  { id: 'PIX', label: 'PIX', icon: QrCode },
                  { id: 'CARTAO_CREDITO', label: 'Crédito', icon: CreditCard },
                  { id: 'CARTAO_DEBITO', label: 'Débito', icon: CreditCard },
                  { id: 'DINHEIRO', label: 'Dinheiro', icon: Banknote },
                  { id: 'CREDIARIO', label: 'Crediário', icon: CalendarClock },
                ].map((pm) => {
                  const Icon = pm.icon;
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setFormaPagamento(pm.id as FormaPagamento)}
                      className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs font-bold active:scale-95 cursor-pointer select-none ${
                        formaPagamento === pm.id
                          ? 'bg-[#10B981] text-[#070E0D] shadow-glow-emerald font-extrabold'
                          : 'bg-[#070E0D] text-[#DAF1DE] border border-[rgba(142,182,155,0.18)] hover:bg-[#142522] hover:border-[#10B981]/40'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{pm.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Credit Limit Alert if Exceeded */}
            {crediarioExcedido && (
              <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-xs text-red-300">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-400" />
                <span>
                  {selectedCliente
                    ? `Valor total (R$ ${valorTotal.toFixed(2)}) ultrapassa o limite disponível do cliente (R$ ${limiteDisponivel.toFixed(2)})!`
                    : 'Para vender no crediário é obrigatório selecionar um cliente cadastrado.'}
                </span>
              </div>
            )}

            {/* Totals & Final Action Button */}
            <div className="pt-3 border-t border-[rgba(142,182,155,0.12)] space-y-2.5">
              <div className="flex items-center justify-between text-sm text-[#A2B89B]">
                <span>Subtotal:</span>
                <span className="font-mono font-semibold text-[#DAF1DE]">R$ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-[#A2B89B]">
                <span>Desconto Aplicado:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">R$</span>
                  <input
                    type="number"
                    min="0"
                    value={desconto}
                    onChange={(e) => setDesconto(parseFloat(e.target.value) || 0)}
                    className="w-24 px-2.5 py-1 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.2)] font-mono text-right text-sm text-[#F3FBF6] font-bold focus:border-[#10B981] focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-base font-bold text-[#F3FBF6] pt-1">
                <span>Total a Pagar:</span>
                <span className="text-3xl font-mono font-extrabold text-[#10B981]">
                  R$ {valorTotal.toFixed(2)}
                </span>
              </div>

              <button
                onClick={handleFinalizeSale}
                disabled={cart.length === 0 || crediarioExcedido}
                className="relative group overflow-hidden w-full py-4 px-5 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-[#070E0D] text-sm md:text-base font-extrabold shadow-glow-emerald hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all duration-200 flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:pointer-events-none mt-2 active:scale-95 cursor-pointer select-none"
              >
                <span className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
                <CheckCircle2 className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                <span>Finalizar Venda & Emitir Cupom</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      <Modal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        title="Comprovante de Venda • Cupom Não-Fiscal"
        subtitle={`Transação #${completedSale?.id.slice(0, 8)}`}
      >
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-[#070E0D] border border-[rgba(142,182,155,0.15)] font-mono text-xs space-y-3">
            <div className="text-center border-b border-[rgba(142,182,155,0.1)] pb-3">
              <div className="text-sm font-extrabold text-[#F3FBF6]">ESTROQUE ENTERPRISE</div>
              <div className="text-[11px] text-[#94A89E]">{activeLoja?.nome || 'Loja Matriz'}</div>
              <div className="text-[10px] text-[#5E756B]">{activeLoja?.cnpj || '12.345.678/0001-90'}</div>
            </div>

            <div className="space-y-1 divide-y divide-[rgba(142,182,155,0.06)]">
              {completedSale?.itens.map((it) => (
                <div key={it.id} className="pt-1.5 flex justify-between">
                  <span>
                    {it.quantidade}x {it.produto_nome || it.sku}
                  </span>
                  <span className="text-[#10B981]">
                    R$ {(it.quantidade * it.preco_unitario).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-[rgba(142,182,155,0.1)] pt-2 space-y-1">
              <div className="flex justify-between">
                <span>Forma de Pagamento:</span>
                <span className="font-bold text-[#DAF1DE]">{completedSale?.forma_pagamento}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-[#F3FBF6]">
                <span>TOTAL:</span>
                <span className="text-[#10B981]">
                  R$ {completedSale?.valor_total.toFixed(2)}
                </span>
              </div>
            </div>

            {completedSale?.forma_pagamento === 'CREDIARIO' && (
              <div className="p-2 rounded bg-[#142522] text-[10px] text-[#DAF1DE] text-center">
                Venda registrada no crediário da loja. Saldo devedor do cliente atualizado.
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setReceiptModalOpen(false)}
              className="px-5 py-2.5 rounded-2xl bg-[#142522] hover:bg-[#163832] text-xs font-bold text-[#94A89E] hover:text-[#F3FBF6] border border-[rgba(142,182,155,0.2)] transition-all active:scale-95 cursor-pointer select-none"
            >
              Fechar
            </button>
            <button
              onClick={() => {
                window.print();
              }}
              className="relative group overflow-hidden px-6 py-2.5 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-[#070E0D] text-xs font-extrabold shadow-glow-emerald hover:shadow-[0_0_24px_rgba(16,185,129,0.5)] transition-all duration-200 flex items-center gap-2 active:scale-95 cursor-pointer select-none"
            >
              <span className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
              <Printer className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
              <span>Imprimir Comprovante</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
