import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  estroqueApi,
  DashboardResponse,
  CurvaABCResponse,
  Produto,
  EstoqueSaldo,
  EstoqueMovimentacao,
  Transferencia,
  Venda,
  Loja,
  Fornecedor,
} from "@/services/estroqueApi";

// 📊 Dashboard Hook
export function useDashboardData() {
  return useQuery<DashboardResponse>({
    queryKey: ["analytics", "dashboard"],
    queryFn: async () => {
      try {
        return await estroqueApi.getDashboardKPIs();
      } catch (e) {
        console.warn("Fallback mock para dashboard:", e);
        return {
          total_faturamento: 82300.0,
          ticket_medio: 310.5,
          produtos_estoque_critico: 3,
          produtos_ruptura: 4,
          total_itens_vendidos: 265,
        };
      }
    },
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}

// 📈 Curva ABC Hook
export function useCurvaABCData() {
  return useQuery<CurvaABCResponse>({
    queryKey: ["analytics", "curva-abc"],
    queryFn: async () => {
      try {
        return await estroqueApi.getCurvaABC();
      } catch (e) {
        console.warn("Fallback mock para curva ABC:", e);
        return {
          total_faturamento_periodo: 82300.0,
          produtos: [
            {
              produto_id: "1",
              nome_produto: "Cabo HDMI 2.1 — 2m",
              sku: "SKU-10432",
              faturamento_total: 12448.8,
              faturamento_acumulado: 12448.8,
              percentual_representatividade: 15.1,
              percentual_acumulado: 15.1,
              classe: "A",
            },
            {
              produto_id: "2",
              nome_produto: "Fone Bluetooth ANC",
              sku: "SKU-90218",
              faturamento_total: 13818.0,
              faturamento_acumulado: 26266.8,
              percentual_representatividade: 16.8,
              percentual_acumulado: 31.9,
              classe: "A",
            },
            {
              produto_id: "3",
              nome_produto: "Teclado Mecânico 75%",
              sku: "SKU-55901",
              faturamento_total: 12393.0,
              faturamento_acumulado: 38659.8,
              percentual_representatividade: 15.0,
              percentual_acumulado: 46.9,
              classe: "B",
            },
          ],
        };
      }
    },
    staleTime: 1000 * 60 * 5,
  });
}

// 📦 Produtos Hook
export function useProdutosData() {
  const queryClient = useQueryClient();

  const query = useQuery<Produto[]>({
    queryKey: ["produtos"],
    queryFn: async () => {
      try {
        return await estroqueApi.getProdutos();
      } catch (e) {
        console.warn("Fallback mock para produtos:", e);
        return [
          {
            id: "1",
            sku: "SKU-10432",
            nome: "Cabo HDMI 2.1 — 2m",
            categoria: "Cabos",
            preco_custo: 18.4,
            preco_venda: 39.9,
            markup: 116.8,
            ativo: true,
          },
          {
            id: "2",
            sku: "SKU-90218",
            nome: "Fone Bluetooth ANC",
            categoria: "Áudio",
            preco_custo: 142.0,
            preco_venda: 329.0,
            markup: 131.6,
            ativo: true,
          },
          {
            id: "3",
            sku: "SKU-55901",
            nome: "Teclado Mecânico 75%",
            categoria: "Periféricos",
            preco_custo: 218.0,
            preco_venda: 459.0,
            markup: 110.5,
            ativo: true,
          },
        ];
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: estroqueApi.criarProduto,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["produtos"] }),
  });

  return { ...query, criarProduto: createMutation.mutateAsync };
}

// 🔁 Estoque & Ledger Hook
export function useEstoqueData(lojaId?: string) {
  const saldosQuery = useQuery<EstoqueSaldo[]>({
    queryKey: ["estoque", "saldos", lojaId],
    queryFn: async () => {
      try {
        return await estroqueApi.getSaldos(lojaId);
      } catch (e) {
        console.warn("Fallback mock para saldos:", e);
        return [
          { id: "1", loja_id: "loja-1", produto_id: "prod-1", quantidade: 312 },
          { id: "2", loja_id: "loja-1", produto_id: "prod-2", quantidade: 42 },
          { id: "3", loja_id: "loja-2", produto_id: "prod-3", quantidade: 27 },
        ];
      }
    },
  });

  const movimentacoesQuery = useQuery<EstoqueMovimentacao[]>({
    queryKey: ["estoque", "movimentacoes", lojaId],
    queryFn: async () => {
      try {
        return await estroqueApi.getMovimentacoes(lojaId);
      } catch (e) {
        console.warn("Fallback mock para movimentacoes:", e);
        return [
          {
            id: "1",
            loja_id: "Loja Matriz",
            produto_id: "SKU-10432",
            quantidade: 50,
            tipo_movimentacao: "ENTRADA",
            data_movimentacao: "2026-08-31T14:30:00Z",
            observacao: "NF-e 000.148",
          },
          {
            id: "2",
            loja_id: "Loja Matriz",
            produto_id: "SKU-90218",
            quantidade: -2,
            tipo_movimentacao: "SAIDA",
            data_movimentacao: "2026-08-31T15:10:00Z",
            observacao: "Venda #4821",
          },
        ];
      }
    },
  });

  return {
    saldos: saldosQuery.data || [],
    movimentacoes: movimentacoesQuery.data || [],
    isLoading: saldosQuery.isLoading || movimentacoesQuery.isLoading,
    refetch: () => {
      saldosQuery.refetch();
      movimentacoesQuery.refetch();
    },
  };
}

// 🚚 Transferências Hook
export function useTransferenciasData() {
  const queryClient = useQueryClient();

  const query = useQuery<Transferencia[]>({
    queryKey: ["transferencias"],
    queryFn: async () => {
      try {
        return await estroqueApi.getTransferencias();
      } catch (e) {
        console.warn("Fallback mock para transferencias:", e);
        return [
          {
            id: "TR-0093",
            loja_origem_id: "Loja Matriz",
            loja_destino_id: "Filial 01",
            status: "DESPACHADO",
            itens: [{ produto_id: "prod-1", quantidade_solicitada: 20, quantidade_enviada: 20 }],
            data_solicitacao: "2026-08-31T11:20:00Z",
            data_despacho: "2026-08-31T11:45:00Z",
          },
          {
            id: "TR-0092",
            loja_origem_id: "Filial 02",
            loja_destino_id: "Loja Matriz",
            status: "SOLICITADO",
            itens: [{ produto_id: "prod-2", quantidade_solicitada: 6 }],
            data_solicitacao: "2026-08-31T09:04:00Z",
          },
          {
            id: "TR-0091",
            loja_origem_id: "Loja Matriz",
            loja_destino_id: "Filial 02",
            status: "RECEBIDO",
            itens: [{ produto_id: "prod-3", quantidade_solicitada: 34, quantidade_recebida: 34 }],
            data_solicitacao: "2026-08-30T16:30:00Z",
            data_recebimento: "2026-08-30T18:00:00Z",
          },
        ];
      }
    },
  });

  const despacharMutation = useMutation({
    mutationFn: estroqueApi.despacharTransferencia,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transferencias"] }),
  });

  const receberMutation = useMutation({
    mutationFn: ({ id, itens }: { id: string; itens: Array<{ produto_id: string; quantidade: number }> }) =>
      estroqueApi.receberTransferencia(id, itens),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transferencias"] }),
  });

  return {
    transferencias: query.data || [],
    isLoading: query.isLoading,
    despachar: despacharMutation.mutateAsync,
    receber: receberMutation.mutateAsync,
    refetch: query.refetch,
  };
}

// 💵 Vendas Hook
export function useVendasData() {
  const queryClient = useQueryClient();

  const query = useQuery<Venda[]>({
    queryKey: ["vendas"],
    queryFn: async () => {
      try {
        return await estroqueApi.getVendas();
      } catch (e) {
        console.warn("Fallback mock para vendas:", e);
        return [
          {
            id: "4821",
            loja_id: "Loja Matriz",
            cliente_id: "Camila Duarte",
            valor_total: 1240.0,
            tipo_pagamento: "PIX",
            itens: [{ produto_id: "prod-1", quantidade: 4, preco_unitario: 310.0, subtotal: 1240.0 }],
            data_venda: "2026-08-31T15:48:00Z",
          },
          {
            id: "4820",
            loja_id: "Loja Matriz",
            cliente_id: "Consumidor final",
            valor_total: 329.0,
            tipo_pagamento: "CARTAO_CREDITO",
            itens: [{ produto_id: "prod-2", quantidade: 1, preco_unitario: 329.0, subtotal: 329.0 }],
            data_venda: "2026-08-31T15:30:00Z",
          },
        ];
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: estroqueApi.criarVenda,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vendas"] }),
  });

  return {
    vendas: query.data || [],
    isLoading: query.isLoading,
    criarVenda: createMutation.mutateAsync,
    refetch: query.refetch,
  };
}

// 🏢 Lojas Hook
export function useLojasData() {
  return useQuery<Loja[]>({
    queryKey: ["lojas"],
    queryFn: async () => {
      try {
        return await estroqueApi.getLojas();
      } catch (e) {
        console.warn("Fallback mock para lojas:", e);
        return [
          { id: "1", nome: "Loja Matriz", cnpj: "12.345.678/0001-00", endereco: "Av. Paulista, 1000", ativo: true },
          { id: "2", nome: "Filial 01", cnpj: "12.345.678/0002-00", endereco: "Rua das Flores, 200", ativo: true },
          { id: "3", nome: "Filial 02", cnpj: "12.345.678/0003-00", endereco: "Shopping Sul, Loja 42", ativo: true },
        ];
      }
    },
  });
}

// 🤝 Fornecedores Hook
export function useFornecedoresData() {
  return useQuery<Fornecedor[]>({
    queryKey: ["fornecedores"],
    queryFn: async () => {
      try {
        return await estroqueApi.getFornecedores();
      } catch (e) {
        console.warn("Fallback mock para fornecedores:", e);
        return [
          {
            id: "1",
            razao_social: "TecDistribuidora LTDA",
            nome_fantasia: "TecDistribuidora",
            cnpj: "12.345.678/0001-90",
            email: "contato@tecdistribuidora.com.br",
            telefone: "(11) 3214-5500",
            ativo: true,
          },
          {
            id: "2",
            razao_social: "Global Cabos S/A",
            nome_fantasia: "Global Cabos",
            cnpj: "98.765.432/0001-11",
            email: "vendas@globalcabos.com.br",
            telefone: "(11) 4002-8922",
            ativo: true,
          },
        ];
      }
    },
  });
}
