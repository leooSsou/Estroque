const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const compactCurrencyFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formata um valor numérico para o formato de moeda brasileiro (R$ X.XXX,XX).
 */
export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return 'R$ 0,00';
  }
  return currencyFormatter.format(value);
}

/**
 * Retorna apenas o valor numérico formatado com 2 casas decimais (X.XXX,XX), sem o símbolo R$.
 */
export function formatNumberBR(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0,00';
  }
  return compactCurrencyFormatter.format(value);
}

/**
 * Formata data e hora para o padrão pt-BR (DD/MM/AAAA HH:MM:SS ou HH:MM).
 */
export function formatDateTime(date: string | number | Date | undefined | null): string {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('pt-BR');
  } catch {
    return '—';
  }
}

/**
 * Formata apenas a data para o padrão pt-BR (DD/MM/AAAA).
 */
export function formatDate(date: string | number | Date | undefined | null): string {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('pt-BR');
  } catch {
    return '—';
  }
}
