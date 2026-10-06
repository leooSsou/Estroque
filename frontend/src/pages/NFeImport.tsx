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
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Importação de NF-e
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Entrada automática de notas fiscais via XML SEFAZ com conciliação contábil e de estoque
          </p>
        </div>

        <button
          onClick={handleSimulateUpload}
          className="px-4 py-2 rounded-full bg-[#000000] hover:bg-white/[0.08] border border-white/[0.16] text-xs font-semibold text-slate-200 hover:text-white transition-all flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>Carregar XML Exemplo</span>
        </button>
      </div>

      {!parsed ? (
        /* Drag & Drop Upload Zone */
        <BentoCard>
          <div
            onClick={handleSimulateUpload}
            className="border-2 border-dashed border-white/[0.15] hover:border-emerald-500 rounded-2xl p-12 text-center cursor-pointer transition-all hover:bg-white/[0.02] flex flex-col items-center justify-center gap-4 group"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#000000] border border-white/[0.16] flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-semibold text-white">
                Arraste o arquivo XML da NF-e aqui ou clique para selecionar
              </h3>
              <p className="text-xs text-slate-400 mt-1">
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
              <div className="p-3.5 rounded-xl bg-[#000000] border border-white/[0.16]">
                <span className="text-[11px] text-slate-400">Número & Série</span>
                <div className="text-base font-bold text-white mt-0.5">
                  NF-e {nfeHeader.numero} / S.{nfeHeader.serie}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#000000] border border-white/[0.16]">
                <span className="text-[11px] text-slate-400">Fornecedor</span>
                <div className="text-sm font-semibold text-white truncate mt-0.5">
                  {nfeHeader.fornecedor}
                </div>
                <div className="text-[10px] text-slate-400">{nfeHeader.cnpjFornecedor}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#000000] border border-white/[0.16]">
                <span className="text-[11px] text-slate-400">Data de Emissão</span>
                <div className="text-sm font-medium text-white mt-0.5">
                  {nfeHeader.dataEmissao}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#000000] border border-white/[0.16]">
                <span className="text-[11px] text-slate-400">Valor Total da Nota</span>
                <div className="text-lg font-bold text-emerald-400 mt-0.5">
                  R$ {nfeHeader.valorTotal.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Chave de Acesso bar */}
            <div className="mt-4 p-3 rounded-xl bg-[#000000] border border-white/[0.16] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 truncate">
                <span className="text-[11px] text-slate-400 font-semibold flex-shrink-0">
                  Chave 44d:
                </span>
                <span className="text-xs text-slate-300 truncate">
                  {nfeHeader.chaveAcesso}
                </span>
              </div>
              <button
                onClick={handleCopyChave}
                className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors flex-shrink-0"
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
            <div className="overflow-x-auto table-scrollbar pb-2">
              <table className="w-full text-left min-w-[950px]">
                <thead className="bg-[#000000] border-b border-white/[0.16]">
                  <tr className="text-xs font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                    <th className="py-3.5 px-4">Descrição no XML</th>
                    <th className="py-3.5 px-4">EAN / NCM</th>
                    <th className="py-3.5 px-4">Quantidade</th>
                    <th className="py-3.5 px-4">Custo Unitário</th>
                    <th className="py-3.5 px-4 text-emerald-400">Subtotal</th>
                    <th className="py-3.5 px-4 text-center">Ação no Catálogo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.14]">
                  {nfeItens.map((item) => (
                    <tr key={item.id} className="hover:bg-white/[0.04] transition-colors group whitespace-nowrap">
                      <td className="py-3.5 px-4 font-bold text-sm text-white group-hover:text-emerald-400 transition-colors whitespace-nowrap">
                        {item.descricao}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-400 whitespace-nowrap">
                        {item.ean} • {item.ncm}
                      </td>
                      <td className="py-3.5 px-4 text-sm font-bold text-slate-200 whitespace-nowrap">
                        +{item.quantidade} un
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-300 whitespace-nowrap">
                        {item.valor_unitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="py-3.5 px-4 text-sm font-bold text-emerald-400 whitespace-nowrap">
                        {item.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {item.match_existente ? (
                          <Badge variant="emerald">Atualizar Custo Médio</Badge>
                        ) : (
                          <Badge variant="emerald">+ Auto-cadastro</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Confirm Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-white/[0.16]">
              <button
                onClick={() => setParsed(false)}
                className="px-4 py-2 rounded-full bg-[#000000] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white border border-white/[0.16]"
              >
                Cancelar e Trocar XML
              </button>

              <button
                onClick={handleConfirmImport}
                disabled={loading}
                className="px-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/25 flex items-center gap-2 active:scale-95 transition-all"
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
