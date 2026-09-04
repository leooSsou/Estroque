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
  FinanceiroLancamento,
  Cliente,
  ClienteCreateInput,
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
          itens: [],
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

  const auditarMutation = useMutation({
    mutationFn: estroqueApi.auditarEstoque,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estoque"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });

  return {
    saldos: saldosQuery.data || [],
    movimentacoes: movimentacoesQuery.data || [],
    isLoading: saldosQuery.isLoading || movimentacoesQuery.isLoading,
    isFetching: saldosQuery.isFetching || movimentacoesQuery.isFetching,
    auditarEstoque: auditarMutation.mutateAsync,
    isAuditing: auditarMutation.isPending,
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

  const createMutation = useMutation({
    mutationFn: estroqueApi.criarTransferencia,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transferencias"] });
      queryClient.invalidateQueries({ queryKey: ["estoque"] });
    },
  });

  const despacharMutation = useMutation({
    mutationFn: estroqueApi.despacharTransferencia,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transferencias"] });
      queryClient.invalidateQueries({ queryKey: ["estoque"] });
    },
  });

  const receberMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { quantidade_recebida: number; justificativa?: string | null } }) =>
      estroqueApi.receberTransferencia(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transferencias"] });
      queryClient.invalidateQueries({ queryKey: ["estoque"] });
    },
  });

  return {
    transferencias: query.data || [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    criarTransferencia: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    despachar: despacharMutation.mutateAsync,
    isDespachando: despacharMutation.isPending,
    receber: receberMutation.mutateAsync,
    isRecebendo: receberMutation.isPending,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendas"] });
      queryClient.invalidateQueries({ queryKey: ["estoque"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });

  return {
    vendas: query.data || [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    criarVenda: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    refetch: query.refetch,
  };
}

// 🏢 Lojas Hook
export function useLojasData() {
  const queryClient = useQueryClient();

  const query = useQuery<Loja[]>({
    queryKey: ["lojas"],
    queryFn: async () => {
      try {
        return await estroqueApi.getLojas();
      } catch {
        return [];
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: estroqueApi.criarLoja,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lojas"] }),
  });

  return {
    ...query,
    lojas: query.data || [],
    criarLoja: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
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

// 👤 Usuário Logado Hook
export function useUserData() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      try {
        return await estroqueApi.getMe();
      } catch {
        return null;
      }
    },
    staleTime: 1000 * 60 * 10,
  });
}

// 💰 Financeiro & Lançamentos Hook
export function useFinanceiroData(filters?: {
  loja_id?: string;
  tipo?: string;
  data_inicio?: string;
  data_fim?: string;
}) {
  const queryClient = useQueryClient();

  const query = useQuery<FinanceiroLancamento[]>({
    queryKey: ["financeiro", "lancamentos", filters],
    queryFn: async () => {
      try {
        return await estroqueApi.getLancamentosFinanceiros(filters);
      } catch {
        return [];
      }
    },
  });

  const registrarDespesaMutation = useMutation({
    mutationFn: estroqueApi.registrarDespesa,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financeiro"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });

  return {
    ...query,
    lancamentos: query.data || [],
    registrarDespesa: registrarDespesaMutation.mutateAsync,
    isRegistering: registrarDespesaMutation.isPending,
  };
}

// 👥 Clientes & Crediário Hook
export function useClientesData() {
  const queryClient = useQueryClient();

  const query = useQuery<Cliente[]>({
    queryKey: ["clientes"],
    queryFn: async () => {
      try {
        return await estroqueApi.getClientes();
      } catch {
        return [];
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: estroqueApi.criarCliente,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
  });

  return {
    ...query,
    clientes: query.data || [],
    criarCliente: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}
