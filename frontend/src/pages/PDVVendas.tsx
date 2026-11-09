import React from 'react';
import { Badge } from '../components/common/Badge';
import { PDVModals } from '../components/pdv/PDVModals';
import { PDVFrenteCaixaTab } from '../components/pdv/PDVFrenteCaixaTab';
import { PDVVendasEsperaTab } from '../components/pdv/PDVVendasEsperaTab';
import { PDVHistoricoTab } from '../components/pdv/PDVHistoricoTab';
import { PDVOperacoesCaixaTab } from '../components/pdv/PDVOperacoesCaixaTab';
import { usePDVController } from '../components/pdv/usePDVController';
import { PDVTab } from '../components/pdv/types';
import {
  ShoppingCart,
  PauseCircle,
  Lock,
  Unlock,
  Wallet,
  FileText,
} from 'lucide-react';

export const PDVVendas: React.FC = () => {
  const ctrl = usePDVController();

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Ponto de Venda (PDV)
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Loja: <strong className="text-slate-200">{ctrl.activeLoja?.nome || 'Matriz'}</strong> • Operador: <strong className="text-slate-200">{ctrl.caixaTurno?.operador_nome || 'Operador'}</strong>
          </p>
        </div>

        {/* Status Pill of Cash Shift */}
        <div className="flex items-center gap-2">
          {ctrl.caixaTurno?.aberto ? (
            <Badge variant="emerald">
              <Unlock className="w-3.5 h-3.5 mr-1 inline" /> Caixa Aberto
            </Badge>
          ) : (
            <Badge variant="danger">
              <Lock className="w-3.5 h-3.5 mr-1 inline" /> Caixa Fechado
            </Badge>
          )}
        </div>
      </div>

      {/* 4-Tab Segmented Control Navigation */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#000000] border border-white/[0.16] shadow-bento-dark overflow-x-auto table-scrollbar">
        {[
          { id: 'CAIXA', label: 'Frente de Caixa', icon: ShoppingCart, count: ctrl.cart.reduce((a, b) => a + b.quantidade, 0) },
          { id: 'ESPERA', label: 'Vendas em Espera', icon: PauseCircle, count: ctrl.vendasEspera.length },
          { id: 'HISTORICO', label: 'Histórico do Turno', icon: FileText, count: ctrl.vendasHistorico.length },
          { id: 'OPERACAO_CAIXA', label: 'Operações de Caixa', icon: Wallet, count: ctrl.caixaTurno?.operacoes?.length || 0 },
        ].map((tab) => {
          const isActive = ctrl.activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => ctrl.setActiveTab(tab.id as PDVTab)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2.5 whitespace-nowrap active:scale-95 ${
                isActive
                  ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/25 scale-[1.02]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && tab.count > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-emerald-800 text-white'
                      : 'bg-[#000000] text-slate-300 border border-white/[0.16]'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {ctrl.activeTab === 'CAIXA' && (
        <PDVFrenteCaixaTab
          caixaTurno={ctrl.caixaTurno}
          setActiveTab={ctrl.setActiveTab}
          search={ctrl.search}
          setSearch={ctrl.setSearch}
          handleBarcodeOrSearchSubmit={ctrl.handleBarcodeOrSearchSubmit}
          counts={ctrl.counts}
          catalogFilter={ctrl.catalogFilter}
          setCatalogFilter={ctrl.setCatalogFilter}
          filteredProdutos={ctrl.filteredProdutos}
          produtos={ctrl.produtos}
          getProductDisplayStock={ctrl.getProductDisplayStock}
          handleAddToCart={ctrl.handleAddToCart}
          cart={ctrl.cart}
          setPauseModalOpen={ctrl.setPauseModalOpen}
          selectedClienteId={ctrl.selectedClienteId}
          setSelectedClienteId={ctrl.setSelectedClienteId}
          clientes={ctrl.clientes}
          selectedCliente={ctrl.selectedCliente}
          limiteDisponivel={ctrl.limiteDisponivel}
          updateQuantity={ctrl.updateQuantity}
          modoPagamento={ctrl.modoPagamento}
          setModoPagamento={ctrl.setModoPagamento}
          splitPagamentos={ctrl.splitPagamentos}
          valorTotal={ctrl.valorTotal}
          setNovoSplitValor={ctrl.setNovoSplitValor}
          formaPagamento={ctrl.formaPagamento}
          setFormaPagamento={ctrl.setFormaPagamento}
          novoSplitForma={ctrl.novoSplitForma}
          setNovoSplitForma={ctrl.setNovoSplitForma}
          restanteSplit={ctrl.restanteSplit}
          totalSplitPago={ctrl.totalSplitPago}
          handleRemoveSplitPayment={ctrl.handleRemoveSplitPayment}
          novoSplitValor={ctrl.novoSplitValor}
          handleAddSplitPayment={ctrl.handleAddSplitPayment}
          valorRecebido={ctrl.valorRecebido}
          setValorRecebido={ctrl.setValorRecebido}
          troco={ctrl.troco}
          dinheiroInsuficiente={ctrl.dinheiroInsuficiente}
          numValorRecebido={ctrl.numValorRecebido}
          crediarioExcedido={ctrl.crediarioExcedido}
          creditoLojaExcedido={ctrl.creditoLojaExcedido}
          splitCrediarioExcedido={ctrl.splitCrediarioExcedido}
          splitCreditoLojaExcedido={ctrl.splitCreditoLojaExcedido}
          subtotal={ctrl.subtotal}
          desconto={ctrl.desconto}
          setDesconto={ctrl.setDesconto}
          handleFinalizeSale={ctrl.handleFinalizeSale}
          isFinalizingSale={ctrl.isFinalizingSale}
        />
      )}

      {ctrl.activeTab === 'ESPERA' && (
        <PDVVendasEsperaTab
          vendasEspera={ctrl.vendasEspera}
          handleDescartarVendaEspera={ctrl.handleDescartarVendaEspera}
          handleRetomarVendaEspera={ctrl.handleRetomarVendaEspera}
        />
      )}

      {ctrl.activeTab === 'HISTORICO' && (
        <PDVHistoricoTab
          searchHistorico={ctrl.searchHistorico}
          setSearchHistorico={ctrl.setSearchHistorico}
          statusFilterHistorico={ctrl.statusFilterHistorico}
          setStatusFilterHistorico={ctrl.setStatusFilterHistorico}
          setRelatorioPDFMode={ctrl.setRelatorioPDFMode}
          setRelatorioPDFModalOpen={ctrl.setRelatorioPDFModalOpen}
          filteredHistorico={ctrl.filteredHistorico}
          setReceiptSale={ctrl.setReceiptSale}
          setReceiptModalOpen={ctrl.setReceiptModalOpen}
          abrirModalDevolucao={ctrl.abrirModalDevolucao}
          setVendaParaEstorno={ctrl.setVendaParaEstorno}
          setEstornoModalOpen={ctrl.setEstornoModalOpen}
        />
      )}

      {ctrl.activeTab === 'OPERACAO_CAIXA' && (
        <PDVOperacoesCaixaTab
          caixaTurno={ctrl.caixaTurno}
          setSuprimentoModalOpen={ctrl.setSuprimentoModalOpen}
          setSangriaModalOpen={ctrl.setSangriaModalOpen}
          setFechamentoModalOpen={ctrl.setFechamentoModalOpen}
          setAberturaModalOpen={ctrl.setAberturaModalOpen}
          setRelatorioPDFMode={ctrl.setRelatorioPDFMode}
          setRelatorioPDFModalOpen={ctrl.setRelatorioPDFModalOpen}
          drawerStats={ctrl.drawerStats}
          turnosHistorico={ctrl.turnosHistorico}
        />
      )}

      <PDVModals
        activeLoja={ctrl.activeLoja}
        user={ctrl.user}
        produtos={ctrl.produtos}
        clientes={ctrl.clientes}
        vendasHistorico={ctrl.vendasHistorico}
        caixaTurno={ctrl.caixaTurno}
        drawerStats={ctrl.drawerStats}
        onSuccessToast={(msg) => ctrl.toast.success(msg)}
        addItemDirectlyToCart={ctrl.addItemDirectlyToCart}
        pauseModalOpen={ctrl.pauseModalOpen}
        setPauseModalOpen={ctrl.setPauseModalOpen}
        pauseObservacao={ctrl.pauseObservacao}
        setPauseObservacao={ctrl.setPauseObservacao}
        handleConfirmPauseSale={ctrl.handleConfirmPauseSale}
        estornoModalOpen={ctrl.estornoModalOpen}
        setEstornoModalOpen={ctrl.setEstornoModalOpen}
        vendaParaEstorno={ctrl.vendaParaEstorno}
        isSubmittingEstorno={ctrl.isSubmittingEstorno}
        handleConfirmarEstorno={ctrl.handleConfirmarEstorno}
        variacoesPickerOpen={ctrl.variacoesPickerOpen}
        setVariacoesPickerOpen={ctrl.setVariacoesPickerOpen}
        selectedPaiForPicker={ctrl.selectedPaiForPicker}
        devolucaoModalOpen={ctrl.devolucaoModalOpen}
        setDevolucaoModalOpen={ctrl.setDevolucaoModalOpen}
        vendaParaDevolucao={ctrl.vendaParaDevolucao}
        itensDevolucaoSelecionados={ctrl.itensDevolucaoSelecionados}
        setItensDevolucaoSelecionados={ctrl.setItensDevolucaoSelecionados}
        tipoResolucao={ctrl.tipoResolucao}
        setTipoResolucao={ctrl.setTipoResolucao}
        motivoDevolucao={ctrl.motivoDevolucao}
        setMotivoDevolucao={ctrl.setMotivoDevolucao}
        totalDevolucaoCalculado={ctrl.totalDevolucaoCalculado}
        isSubmittingDevolucao={ctrl.isSubmittingDevolucao}
        handleConfirmarDevolucao={ctrl.handleConfirmarDevolucao}
        sangriaModalOpen={ctrl.sangriaModalOpen}
        setSangriaModalOpen={ctrl.setSangriaModalOpen}
        sangriaValor={ctrl.sangriaValor}
        setSangriaValor={ctrl.setSangriaValor}
        sangriaMotivo={ctrl.sangriaMotivo}
        setSangriaMotivo={ctrl.setSangriaMotivo}
        isSubmittingSangria={ctrl.isSubmittingSangria}
        handleRegistrarSangria={ctrl.handleRegistrarSangria}
        suprimentoModalOpen={ctrl.suprimentoModalOpen}
        setSuprimentoModalOpen={ctrl.setSuprimentoModalOpen}
        suprimentoValor={ctrl.suprimentoValor}
        setSuprimentoValor={ctrl.setSuprimentoValor}
        suprimentoMotivo={ctrl.suprimentoMotivo}
        setSuprimentoMotivo={ctrl.setSuprimentoMotivo}
        isSubmittingSuprimento={ctrl.isSubmittingSuprimento}
        handleRegistrarSuprimento={ctrl.handleRegistrarSuprimento}
        fechamentoModalOpen={ctrl.fechamentoModalOpen}
        setFechamentoModalOpen={ctrl.setFechamentoModalOpen}
        saldoContado={ctrl.saldoContado}
        setSaldoContado={ctrl.setSaldoContado}
        fechamentoObservacao={ctrl.fechamentoObservacao}
        setFechamentoObservacao={ctrl.setFechamentoObservacao}
        isSubmittingFechamento={ctrl.isSubmittingFechamento}
        handleFecharTurno={ctrl.handleFecharTurno}
        aberturaModalOpen={ctrl.aberturaModalOpen}
        setAberturaModalOpen={ctrl.setAberturaModalOpen}
        aberturaFundo={ctrl.aberturaFundo}
        setAberturaFundo={ctrl.setAberturaFundo}
        isSubmittingAbertura={ctrl.isSubmittingAbertura}
        handleAbrirTurno={ctrl.handleAbrirTurno}
        receiptModalOpen={ctrl.receiptModalOpen}
        setReceiptModalOpen={ctrl.setReceiptModalOpen}
        receiptSale={ctrl.receiptSale}
        getReceiptItemDetails={ctrl.getReceiptItemDetails}
        handlePrintReceipt={ctrl.handlePrintReceipt}
        relatorioPDFModalOpen={ctrl.relatorioPDFModalOpen}
        setRelatorioPDFModalOpen={ctrl.setRelatorioPDFModalOpen}
        relatorioPDFMode={ctrl.relatorioPDFMode}
      />
    </div>
  );
};
