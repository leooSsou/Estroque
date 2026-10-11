import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { BentoCard } from '../components/common/BentoCard';
import { Badge } from '../components/common/Badge';
import {
  UploadCloud,
  CheckCircle2,
  Copy,
  Sparkles,
  FileCode2,
  Percent,
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
  match_existente?: boolean;
}

interface ParsedNFeHeader {
  numero: string;
  serie: string;
  chaveAcesso: string;
  fornecedor: string;
  cnpjFornecedor: string;
  dataEmissao: string;
  valorTotal: number;
}

const SAMPLE_SEFAZ_XML = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe35260912345678000195550010004189921008492019" versao="4.00">
      <ide>
        <nNF>418992</nNF>
        <serie>1</serie>
        <dhEmi>2026-10-11T10:45:00-03:00</dhEmi>
      </ide>
      <emit>
        <CNPJ>12345678000195</CNPJ>
        <xNome>TechDistribuidora de Eletronicos Ltda</xNome>
        <xFant>TechDistribuidora Brasil</xFant>
      </emit>
      <det nItem="1">
        <prod>
          <cProd>TEC-MEC-01</cProd>
          <cEAN>7891234560012</cEAN>
          <xProd>Teclado Mecanico RGB Pro Wireless</xProd>
          <NCM>84716052</NCM>
          <qCom>25.0000</qCom>
          <vUnCom>140.0000</vUnCom>
          <vProd>3500.00</vProd>
        </prod>
      </det>
      <det nItem="2">
        <prod>
          <cProd>MOU-GAM-02</cProd>
          <cEAN>7891234560029</cEAN>
          <xProd>Mouse Gamer Optico 16000 DPI Sensor PixArt</xProd>
          <NCM>84716053</NCM>
          <qCom>20.0000</qCom>
          <vUnCom>75.0000</vUnCom>
          <vProd>1500.00</vProd>
        </prod>
      </det>
      <det nItem="3">
        <prod>
          <cProd>SUP-MON-ART</cProd>
          <cEAN>7891234560098</cEAN>
          <xProd>Suporte Articulado a Gas para 2 Monitores</xProd>
          <NCM>83025000</NCM>
          <qCom>15.0000</qCom>
          <vUnCom>190.0000</vUnCom>
          <vProd>2850.00</vProd>
        </prod>
      </det>
    </infNFe>
  </NFe>
</nfeProc>`;

export const NFeImport: React.FC = () => {
  const { activeLoja } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [markupPadrao, setMarkupPadrao] = useState<number>(50);
  const [parsed, setParsed] = useState(false);
  const [loading, setLoading] = useState(false);

  const [nfeHeader, setNfeHeader] = useState<ParsedNFeHeader>({
    numero: '000.418.992',
    serie: '1',
    chaveAcesso: '35260912345678000195550010004189921008492019',
    fornecedor: 'TechDistribuidora de Eletrônicos Ltda',
    cnpjFornecedor: '12.345.678/0001-95',
    dataEmissao: new Date().toLocaleDateString('pt-BR'),
    valorTotal: 7850.0,
  });

  const [nfeItens, setNfeItens] = useState<ParsedNFeItem[]>([]);

  const parseXmlFilePreview = async (file: File) => {
    setLoading(true);
    try {
      const text = await file.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');

      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        throw new Error('O arquivo selecionado não é um XML válido.');
      }

      const getTagText = (parent: Element | Document, tag: string): string => {
        const el =
          parent.getElementsByTagName(tag)[0] ||
          parent.getElementsByTagNameNS('*', tag)[0];
        return el?.textContent?.trim() || '';
      };

      const infNFe =
        xmlDoc.getElementsByTagName('infNFe')[0] ||
        xmlDoc.getElementsByTagNameNS('*', 'infNFe')[0];

      if (!infNFe) {
        throw new Error('Tag <infNFe> não encontrada no XML.');
      }

      const rawId = infNFe.getAttribute('Id') || '';
      const chave = rawId.replace(/^NFe/i, '') || '35260912345678000195550010004189921008492019';
      const nNF = getTagText(infNFe, 'nNF') || '000.001';
      const serie = getTagText(infNFe, 'serie') || '1';
      const dhEmi = getTagText(infNFe, 'dhEmi') || getTagText(infNFe, 'dEmi');

      const emit =
        infNFe.getElementsByTagName('emit')[0] ||
        infNFe.getElementsByTagNameNS('*', 'emit')[0];
      const cnpj = emit ? getTagText(emit, 'CNPJ') : '';
      const xNome = emit ? getTagText(emit, 'xNome') : 'Fornecedor NF-e';

      const detNodes = Array.from(
        infNFe.getElementsByTagName('det').length > 0
          ? infNFe.getElementsByTagName('det')
          : infNFe.getElementsByTagNameNS('*', 'det')
      );

      if (detNodes.length === 0) {
        throw new Error('Nenhum item (<det>) encontrado no XML da NF-e.');
      }

      const existingProdutos = await api.getProdutos(activeLoja?.id);

      let somaTotal = 0;
      const itensExtraidos: ParsedNFeItem[] = detNodes.map((det, idx) => {
        const cProd = getTagText(det, 'cProd') || `ITEM-${idx + 1}`;
        const cEAN = getTagText(det, 'cEAN') || 'SEM GTIN';
        const xProd = getTagText(det, 'xProd') || `Produto ${cProd}`;
        const ncm = getTagText(det, 'NCM') || '0000.00.00';
        const qCom = parseFloat(getTagText(det, 'qCom') || '0') || 1;
        const vUnCom = parseFloat(getTagText(det, 'vUnCom') || '0') || 0;
        const subtotal = qCom * vUnCom;
        somaTotal += subtotal;

        const jaExiste = existingProdutos.some(
          (p) =>
            p.sku.toLowerCase() === cProd.toLowerCase() ||
            (cEAN !== 'SEM GTIN' && p.codigo_barras === cEAN)
        );

        return {
          id: `item-${idx + 1}`,
          codigo_fornecedor: cProd,
          descricao: xProd,
          ean: cEAN,
          ncm,
          quantidade: qCom,
          valor_unitario: vUnCom,
          valor_total: subtotal,
          match_existente: jaExiste,
        };
      });

      setNfeHeader({
        numero: nNF,
        serie,
        chaveAcesso: chave,
        fornecedor: xNome,
        cnpjFornecedor: cnpj,
        dataEmissao: dhEmi
          ? new Date(dhEmi).toLocaleString('pt-BR')
          : new Date().toLocaleString('pt-BR'),
        valorTotal: somaTotal,
      });
      setNfeItens(itensExtraidos);
      setSelectedFile(file);
      setParsed(true);
      toast.success(`XML "${file.name}" lido com sucesso (${itensExtraidos.length} itens)!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao ler o arquivo XML.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseXmlFilePreview(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      parseXmlFilePreview(file);
    }
  };

  const handleLoadSampleXml = () => {
    const blob = new Blob([SAMPLE_SEFAZ_XML], { type: 'text/xml' });
    const sampleFile = new File([blob], 'nfe_sefaz_v400_exemplo.xml', { type: 'text/xml' });
    parseXmlFilePreview(sampleFile);
  };

  const handleCopyChave = () => {
    navigator.clipboard.writeText(nfeHeader.chaveAcesso);
    toast.info('Chave de acesso copiada para a área de transferência!');
  };

  const handleConfirmImport = async () => {
    if (!selectedFile) return;
    setLoading(true);
    try {
      const lojaId = activeLoja?.id;
      const result = await api.importarXmlNfe(selectedFile, lojaId, markupPadrao);

      const novosCount = result.itens_processados.filter((i) => i.novo_produto_cadastrado).length;
      const atualizadosCount = result.itens_processados.length - novosCount;

      // Registra despesa / contas a pagar no financeiro
      if (lojaId) {
        await api.registrarDespesa({
          loja_id: lojaId,
          valor: nfeHeader.valorTotal,
          categoria: 'Fornecedores (NF-e Entrada)',
          status_pagamento: 'PENDENTE',
          descricao: `NF-e #${nfeHeader.numero} - ${result.fornecedor.nome_fantasia}`,
        });
      }

      toast.success(
        `NF-e importada no banco! ${novosCount} produto(s) auto-cadastrado(s) e ${atualizadosCount} custo(s) médio(s) atualizado(s).`
      );
      setParsed(false);
      setSelectedFile(null);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Erro ao processar importação da nota no servidor.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden Real File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xml,text/xml,application/xml"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Importação de NF-e
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Entrada automática de notas fiscais via XML SEFAZ v4.00 com cálculo de Custo Médio Ponderado
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#000000] border border-white/[0.16]">
            <Percent className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-slate-300 font-medium">Markup Novos Itens:</span>
            <input
              type="number"
              min="0"
              max="500"
              value={markupPadrao}
              onChange={(e) => setMarkupPadrao(Math.max(0, Number(e.target.value)))}
              className="w-14 bg-transparent text-xs font-bold text-emerald-400 text-center focus:outline-none border-b border-white/20 focus:border-emerald-400"
            />
            <span className="text-xs text-slate-400">%</span>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-all flex items-center gap-2 shadow-md shadow-emerald-600/20"
          >
            <FileCode2 className="w-4 h-4" />
            <span>Selecionar Arquivo .XML</span>
          </button>

          <button
            type="button"
            onClick={handleLoadSampleXml}
            className="px-4 py-2 rounded-full bg-[#000000] hover:bg-white/[0.08] border border-white/[0.16] text-xs font-semibold text-slate-200 hover:text-white transition-all flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Carregar XML Exemplo</span>
          </button>
        </div>
      </div>

      {!parsed ? (
        /* Drag & Drop Upload Zone */
        <BentoCard>
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-white/[0.15] hover:border-emerald-500 rounded-2xl p-12 text-center cursor-pointer transition-all hover:bg-white/[0.02] flex flex-col items-center justify-center gap-4 group"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#000000] border border-white/[0.16] flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-semibold text-white">
                Arraste o arquivo XML da NF-e aqui ou clique para selecionar do computador
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Suporta arquivos <code className="text-emerald-400">.xml</code> no padrão nacional SEFAZ NF-e v4.00
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
                <span className="text-[11px] text-slate-400">Fornecedor (Emitente)</span>
                <div className="text-sm font-semibold text-white truncate mt-0.5">
                  {nfeHeader.fornecedor}
                </div>
                <div className="text-[10px] text-slate-400">CNPJ: {nfeHeader.cnpjFornecedor}</div>
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
                  {nfeHeader.valorTotal.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
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
          <BentoCard title="Conciliação de Itens do XML">
            <div className="overflow-x-auto table-scrollbar pb-2">
              <table className="w-full text-left min-w-[950px]">
                <thead className="bg-[#000000] border-b border-white/[0.16]">
                  <tr className="text-xs font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                    <th className="py-3.5 px-4">SKU / Código</th>
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
                    <tr
                      key={item.id}
                      className="hover:bg-white/[0.04] transition-colors group whitespace-nowrap"
                    >
                      <td className="py-3.5 px-4 text-xs font-bold text-slate-300 whitespace-nowrap">
                        {item.codigo_fornecedor}
                      </td>
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
                        {item.valor_unitario.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-sm font-bold text-emerald-400 whitespace-nowrap">
                        {item.valor_total.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {item.match_existente ? (
                          <Badge variant="emerald">Atualizar Custo Médio</Badge>
                        ) : (
                          <Badge variant="emerald">+ Auto-cadastro ({markupPadrao}%)</Badge>
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
                onClick={() => {
                  setParsed(false);
                  setSelectedFile(null);
                }}
                className="px-4 py-2 rounded-full bg-[#000000] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white border border-white/[0.16]"
              >
                Cancelar e Trocar XML
              </button>

              <button
                onClick={handleConfirmImport}
                disabled={loading}
                className="px-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/25 flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {loading
                    ? 'Processando XML no Servidor...'
                    : `Confirmar Entrada em ${activeLoja?.nome || 'Estoque'} & Lançar Financeiro`}
                </span>
              </button>
            </div>
          </BentoCard>
        </div>
      )}
    </div>
  );
};
