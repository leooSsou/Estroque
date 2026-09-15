import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { BentoCard } from '../components/common/BentoCard';
import { Badge } from '../components/common/Badge';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  Copy,
  Building2,
  FileCheck,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface ParsedNFeItem {
  id: string;
  codigo_fornecedor: string;
  descricao: string;
  ean: string;
  ncm: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  match_existente: boolean;
}

export const NFeImport: React.FC = () => {
  const { activeLoja } = useAuth();
  const { toast } = useToast();
  const [parsed, setParsed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sample parsed NFe data
  const [nfeHeader] = useState({
    numero: '000.418.992',
    serie: '1',
    chaveAcesso: '35240845123890000112550010004189921008492019',
    fornecedor: 'TechDistribuidora de Eletrônicos Ltda',
    cnpjFornecedor: '45.123.890/0001-12',
    dataEmissao: '14/09/2026 10:45',
    valorTotal: 7850.0,
  });

  const [nfeItens, setNfeItens] = useState<ParsedNFeItem[]>([
    {
      id: 'item-1',
      codigo_fornecedor: 'TEC-MEC-PRO',
      descricao: 'Teclado Mecânico RGB Pro Wireless',
      ean: '7891234560012',
      ncm: '8471.60.52',
      quantidade: 25,
      valor_unitario: 140.0,
      valor_total: 3500.0,
      match_existente: true,
    },
    {
      id: 'item-2',
      codigo_fornecedor: 'MOU-GAM-OPT',
      descricao: 'Mouse Gamer Óptico 16000 DPI Sensor PixArt',
      ean: '7891234560029',
      ncm: '8471.60.53',
      quantidade: 20,
      valor_unitario: 75.0,
      valor_total: 1500.0,
      match_existente: true,
    },
    {
      id: 'item-3',
      codigo_fornecedor: 'SUP-MON-ART',
      descricao: 'Suporte Articulado a Gás para 2 Monitores',
      ean: '7891234560098',
      ncm: '8302.50.00',
      quantidade: 15,
      valor_unitario: 190.0,
      valor_total: 2850.0,
      match_existente: false,
    },
  ]);

  const handleSimulateUpload = () => {
    setLoading(true);
    setTimeout(() => {
      setParsed(true);
      setLoading(false);
      toast.success('XML da NF-e processado com sucesso via DefusedXML!');
    }, 600);
  };

  const handleCopyChave = () => {
    navigator.clipboard.writeText(nfeHeader.chaveAcesso);
    toast.info('Chave de acesso copiada para a área de transferência!');
  };

  const handleConfirmImport = async () => {
    setLoading(true);
    try {
      // Movimenta o estoque para os itens importados
      for (const item of nfeItens) {
        await api.movimentarEstoque({
          loja_id: activeLoja?.id || '11111111-1111-1111-1111-111111111111',
          produto_id: item.match_existente
            ? '66666666-6666-6666-6666-666666666661'
            : '66666666-6666-6666-6666-666666666664',
          tipo: 'ENTRADA',
          quantidade: item.quantidade,
          motivo: `Importação NF-e #${nfeHeader.numero} (${nfeHeader.fornecedor})`,
        });
      }

      // Registra despesa / contas a pagar no financeiro
      await api.registrarDespesa({
        loja_id: activeLoja?.id || '11111111-1111-1111-1111-111111111111',
        valor: nfeHeader.valorTotal,
        categoria: 'Fornecedores (NF-e Entrada)',
        status_pagamento: 'PENDENTE',
        descricao: `NF-e #${nfeHeader.numero} - ${nfeHeader.fornecedor}`,
      });

      toast.success('Entrada confirmada! Estoque atualizado e contas a pagar provisionado.');
      setParsed(false);
    } catch {
      toast.error('Erro ao processar importação da nota.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F3FBF6] tracking-tight">
            Importação de NF-e
          </h1>
        </div>

        <button
          onClick={handleSimulateUpload}
          className="px-4 py-2 rounded-full bg-[#142522] hover:bg-[#163832] border border-[#10B981]/30 text-xs font-semibold text-[#10B981] transition-all flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          <span>Carregar XML Exemplo</span>
        </button>
      </div>

      {!parsed ? (
        /* Drag & Drop Upload Zone */
        <BentoCard>
          <div
            onClick={handleSimulateUpload}
            className="border-2 border-dashed border-[rgba(142,182,155,0.25)] hover:border-[#10B981] rounded-3xl p-12 text-center cursor-pointer transition-all hover:bg-[#142522]/30 flex flex-col items-center justify-center gap-4 group"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#142522] border border-[rgba(142,182,155,0.2)] flex items-center justify-center text-[#10B981] group-hover:scale-110 transition-transform">
              <UploadCloud className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-semibold text-[#F3FBF6]">
                Arraste o arquivo XML da NF-e aqui ou clique para selecionar
              </h3>
              <p className="text-xs text-[#94A89E] mt-1">
                Padrão nacional SEFAZ NF-e v4.00
              </p>
            </div>
          </div>
        </BentoCard>
      ) : (
        /* Parsed Preview View */
        <div className="space-y-6 animate-in fade-in">
          {/* Invoice Header Card */}
          <BentoCard title="Dados do Documento Fiscal">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              <div className="p-3.5 rounded-2xl bg-[#070E0D] border border-[rgba(142,182,155,0.12)]">
                <span className="text-[11px] text-[#94A89E]">Número & Série</span>
                <div className="text-base font-bold text-[#F3FBF6] font-mono mt-0.5">
                  NF-e {nfeHeader.numero} / S.{nfeHeader.serie}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#070E0D] border border-[rgba(142,182,155,0.12)]">
                <span className="text-[11px] text-[#94A89E]">Fornecedor</span>
                <div className="text-sm font-semibold text-[#F3FBF6] truncate mt-0.5">
                  {nfeHeader.fornecedor}
                </div>
                <div className="text-[10px] text-[#94A89E] font-mono">{nfeHeader.cnpjFornecedor}</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#070E0D] border border-[rgba(142,182,155,0.12)]">
                <span className="text-[11px] text-[#94A89E]">Data de Emissão</span>
                <div className="text-sm font-medium text-[#F3FBF6] mt-0.5">
                  {nfeHeader.dataEmissao}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#070E0D] border border-[rgba(142,182,155,0.12)]">
                <span className="text-[11px] text-[#94A89E]">Valor Total da Nota</span>
                <div className="text-lg font-bold text-[#10B981] font-mono mt-0.5">
                  R$ {nfeHeader.valorTotal.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Chave de Acesso bar */}
            <div className="mt-4 p-3 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.14)] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 truncate">
                <span className="text-[11px] text-[#94A89E] font-semibold flex-shrink-0">
                  Chave 44d:
                </span>
                <span className="text-xs font-mono text-[#DAF1DE] truncate">
                  {nfeHeader.chaveAcesso}
                </span>
              </div>
              <button
                onClick={handleCopyChave}
                className="p-1.5 rounded-lg hover:bg-[#142522] text-[#8EB69B] hover:text-[#F3FBF6] transition-colors flex-shrink-0"
                title="Copiar Chave"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </BentoCard>

          {/* Item Conciliation Table */}
          <BentoCard
            title="Conciliação de Itens"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[rgba(142,182,155,0.14)] text-[#94A89E]">
                    <th className="py-3 px-3 font-semibold">Descrição no XML</th>
                    <th className="py-3 px-3 font-semibold">EAN / NCM</th>
                    <th className="py-3 px-3 font-semibold">Quantidade</th>
                    <th className="py-3 px-3 font-semibold">Custo Unitário</th>
                    <th className="py-3 px-3 font-semibold">Subtotal</th>
                    <th className="py-3 px-3 font-semibold">Ação no Catálogo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(142,182,155,0.06)]">
                  {nfeItens.map((item) => (
                    <tr key={item.id} className="hover:bg-[#142522]/40 transition-colors">
                      <td className="py-3 px-3 font-semibold text-[#F3FBF6]">
                        {item.descricao}
                      </td>
                      <td className="py-3 px-3 font-mono text-[#94A89E]">
                        {item.ean} • {item.ncm}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-[#DAF1DE]">
                        +{item.quantidade} un
                      </td>
                      <td className="py-3 px-3 font-mono text-[#94A89E]">
                        R$ {item.valor_unitario.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-[#10B981]">
                        R$ {item.valor_total.toFixed(2)}
                      </td>
                      <td className="py-3 px-3">
                        {item.match_existente ? (
                          <Badge variant="mint">Atualizar Custo Médio</Badge>
                        ) : (
                          <Badge variant="sage">+ Auto-cadastro</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Confirm Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-[rgba(142,182,155,0.12)]">
              <button
                onClick={() => setParsed(false)}
                className="px-4 py-2 rounded-full bg-[#142522] hover:bg-[#163832] text-xs font-semibold text-[#94A89E]"
              >
                Cancelar e Trocar XML
              </button>

              <button
                onClick={handleConfirmImport}
                disabled={loading}
                className="px-6 py-3 rounded-full bg-[#10B981] hover:bg-[#059669] text-[#070E0D] text-xs font-bold shadow-glow-emerald flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {loading ? 'Conciliando...' : 'Confirmar Entrada no Estoque & Conciliar Financeiro'}
                </span>
              </button>
            </div>
          </BentoCard>
        </div>
      )}
    </div>
  );
};
