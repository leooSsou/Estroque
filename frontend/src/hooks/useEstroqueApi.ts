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
      } catch {
        return {
          total_faturamento: 0,
          ticket_medio: 0,
          produtos_estoque_critico: 0,
          produtos_ruptura: 0,
          total_itens_vendidos: 0,
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
      } catch {
        return {
          total_faturamento_periodo: 0,
          produtos: [],
        };
      }
    },
    staleTime: 1000 * 60 * 5,
  });
}

// 📦 Produtos Hook
export function useProdutosData(busca?: string) {
  const queryClient = useQueryClient();

  const query = useQuery<Produto[]>({
    queryKey: ["produtos", busca],
    queryFn: async () => {
      try {
        return await estroqueApi.getProdutos(busca);
      } catch {
        return [];
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: estroqueApi.criarProduto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });

  return {
    ...query,
    produtos: query.data || [],
    criarProduto: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}

// 🔁 Estoque & Ledger Hook
export function useEstoqueData(lojaId?: string) {
  const saldosQuery = useQuery<EstoqueSaldo[]>({
    queryKey: ["estoque", "saldos", lojaId],
    queryFn: async () => {
      try {
        return await estroqueApi.getSaldos(lojaId);
      } catch {
        return [];
      }
    },
  });

  const movimentacoesQuery = useQuery<EstoqueMovimentacao[]>({
    queryKey: ["estoque", "movimentacoes", lojaId],
    queryFn: async () => {
      try {
        return await estroqueApi.getMovimentacoes(lojaId);
      } catch {
        return [];
      }
    },
  });

  return {
    saldos: saldosQuery.data || [],
    movimentacoes: movimentacoesQuery.data || [],
    isLoading: saldosQuery.isLoading || movimentacoesQuery.isLoading,
    isFetching: saldosQuery.isFetching || movimentacoesQuery.isFetching,
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
      } catch {
        return [];
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
    isFetching: query.isFetching,
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
      } catch {
        return [];
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
    isFetching: query.isFetching,
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
      } catch {
        return [];
      }
    },
  });
}

// 🤝 Fornecedores Hook
export function useFornecedoresData() {
  const queryClient = useQueryClient();

  const query = useQuery<Fornecedor[]>({
    queryKey: ["fornecedores"],
    queryFn: async () => {
      try {
        return await estroqueApi.getFornecedores();
      } catch {
        return [];
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: estroqueApi.criarFornecedor,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fornecedores"] }),
  });

  return {
    ...query,
    fornecedores: query.data || [],
    criarFornecedor: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}
