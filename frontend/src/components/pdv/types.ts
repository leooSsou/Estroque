import { Produto, FormaPagamento } from '../../types';

export interface CartItem {
  produto: Produto;
  quantidade: number;
  preco_unitario: number;
}

export type PDVTab = 'CAIXA' | 'ESPERA' | 'HISTORICO' | 'OPERACAO_CAIXA';

export type CatalogFilter = 'TODOS' | 'DISPONIVEL' | 'ESGOTADO';

export type PaymentMode = 'SIMPLES' | 'SPLIT';

export type StatusFilterHistorico = 'TODAS' | 'CONCLUIDA' | 'CANCELADA';

export type TipoDevolucao = 'DEVOLUCAO' | 'TROCA';

export type TipoResolucaoDevolucao =
  | 'CREDITO_LOJA'
  | 'REEMBOLSO_CAIXA'
  | 'ABATIMENTO_CREDIARIO';

export interface DevolucaoItemConfig {
  quantidade: number;
  retornar_ao_estoque: boolean;
  condicao: 'PERFEITO' | 'AVARIADO';
  selecionado: boolean;
}

export type ItensDevolucaoMap = {
  [itemVendaId: string]: DevolucaoItemConfig;
};

export interface SplitPaymentEntry {
  forma_pagamento: FormaPagamento;
  valor: number;
}

export interface DrawerStats {
  fundo: number;
  vendasDinheiro: number;
  vendasOutras: number;
  suprimentos: number;
  sangrias: number;
  saldoEsperadoGaveta: number;
}
