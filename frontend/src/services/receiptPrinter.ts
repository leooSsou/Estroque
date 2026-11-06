export interface ReceiptItemPrint {
  nome: string;
  variacaoDesc?: string;
  sku?: string;
  quantidade: number;
  precoUnitario: number;
  total: number;
}

export interface ReceiptPaymentPrint {
  forma: string;
  valor: number;
}

export interface ThermalReceiptData {
  lojaNome: string;
  lojaEndereco?: string;
  lojaCnpj?: string;
  dataHora: string;
  cupomId: string;
  operadorNome: string;
  clienteNome: string;
  itens: ReceiptItemPrint[];
  totalItens: number;
  subtotal: number;
  desconto: number;
  totalPagar: number;
  formaPagamento: string;
  pagamentos?: ReceiptPaymentPrint[];
  status?: string;
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function generateThermalReceiptHTML(data: ThermalReceiptData): string {
  const itensHtml = data.itens
    .map((item, idx) => {
      const num = String(idx + 1).padStart(2, '0');
      const varLinha = item.variacaoDesc
        ? `<div class="item-var">└ ${escapeHtml(item.variacaoDesc)}</div>`
        : '';
      const skuLinha = item.sku
        ? `<div class="item-sku">SKU: ${escapeHtml(item.sku)}</div>`
        : '';
      const unitLinha =
        item.quantidade > 1
          ? `<div class="item-sku">(${item.quantidade} x R$ ${item.precoUnitario.toFixed(2)})</div>`
          : '';

      return `
        <tr>
          <td class="text-left font-bold" style="vertical-align: top;">${item.quantidade}x</td>
          <td style="vertical-align: top; padding-right: 4px;">
            <div class="item-desc">${num}. ${escapeHtml(item.nome)}</div>
            ${varLinha}
            ${skuLinha}
            ${unitLinha}
          </td>
          <td class="text-right font-bold" style="vertical-align: top; white-space: nowrap;">
            R$ ${item.total.toFixed(2)}
          </td>
        </tr>
      `;
    })
    .join('');

  const pagamentosHtml =
    data.pagamentos && data.pagamentos.length > 1
      ? data.pagamentos
          .map(
            (p) => `
          <div class="flex-between">
            <span>• ${escapeHtml(p.forma)}:</span>
            <span class="font-bold">R$ ${p.valor.toFixed(2)}</span>
          </div>
        `
          )
          .join('')
      : `
        <div class="flex-between">
          <span>Forma:</span>
          <span class="font-bold">${escapeHtml(data.formaPagamento)}</span>
        </div>
      `;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Cupom #${escapeHtml(data.cupomId.slice(0, 8))}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0mm;
    }
    @media print {
      html, body {
        width: 80mm !important;
        margin: 0 !important;
        padding: 4mm 3mm !important;
      }
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Courier New', Courier, monospace, monospace;
      color: #000000 !important;
      background: #ffffff !important;
    }
    body {
      width: 80mm;
      max-width: 80mm;
      margin: 0 auto;
      padding: 4mm 3mm;
      font-size: 11px;
      line-height: 1.35;
      -webkit-font-smoothing: antialiased;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-bold { font-weight: bold; }
    .uppercase { text-transform: uppercase; }

    .header {
      text-align: center;
      margin-bottom: 6px;
    }
    .store-name {
      font-size: 13px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .store-info {
      font-size: 10px;
      line-height: 1.25;
    }

    .divider {
      border-top: 1px dashed #000000;
      margin: 6px 0;
      width: 100%;
    }
    .divider-double {
      border-top: 2px dashed #000000;
      margin: 8px 0;
      width: 100%;
    }

    .title-coupon {
      font-size: 12px;
      font-weight: 900;
      text-align: center;
      letter-spacing: 1px;
      margin: 4px 0;
    }

    .meta-table {
      width: 100%;
      font-size: 10.5px;
      margin-bottom: 4px;
    }
    .meta-table td {
      padding: 1.5px 0;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
      margin: 4px 0;
    }
    .items-table th {
      border-top: 1px dashed #000000;
      border-bottom: 1px dashed #000000;
      padding: 3px 0;
      font-size: 10px;
      text-transform: uppercase;
      font-weight: bold;
    }
    .items-table td {
      padding: 3px 0;
    }
    .item-desc {
      font-weight: bold;
      font-size: 11px;
    }
    .item-var {
      font-size: 10px;
      padding-left: 6px;
    }
    .item-sku {
      font-size: 9.5px;
      color: #333333;
    }

    .totals-table {
      width: 100%;
      font-size: 11px;
      margin: 4px 0;
    }
    .totals-table td {
      padding: 1.5px 0;
    }
    .total-highlight {
      font-size: 13.5px;
      font-weight: 900;
    }

    .payments-box {
      margin-top: 4px;
      padding-top: 4px;
      border-top: 1px dashed #000000;
      font-size: 10.5px;
    }
    .flex-between {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
    }

    .footer {
      text-align: center;
      margin-top: 10px;
      font-size: 9.5px;
      line-height: 1.35;
    }
    .footer-alert {
      font-weight: 900;
      font-size: 10.5px;
      margin-bottom: 3px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="store-name">${escapeHtml(data.lojaNome)}</div>
    ${data.lojaEndereco ? `<div class="store-info">${escapeHtml(data.lojaEndereco)}</div>` : ''}
    <div class="store-info font-bold">${escapeHtml(data.lojaCnpj || 'CNPJ: 00.000.000/0001-00')}</div>
  </div>

  <div class="divider"></div>
  <div class="title-coupon">CUPOM NÃO-FISCAL</div>
  <div class="divider"></div>

  <table class="meta-table">
    <tr>
      <td><strong>Data/Hora:</strong> ${escapeHtml(data.dataHora)}</td>
      <td class="text-right"><strong>Cupom:</strong> #${escapeHtml(data.cupomId.slice(0, 8))}</td>
    </tr>
    <tr>
      <td colspan="2"><strong>Operador:</strong> ${escapeHtml(data.operadorNome)}</td>
    </tr>
    <tr>
      <td colspan="2"><strong>Consumidor:</strong> ${escapeHtml(data.clienteNome)}</td>
    </tr>
  </table>

  <table class="items-table">
    <thead>
      <tr>
        <th class="text-left" style="width: 12%;">QTD</th>
        <th class="text-left" style="width: 58%;">DESCRIÇÃO</th>
        <th class="text-right" style="width: 30%;">TOTAL (R$)</th>
      </tr>
    </thead>
    <tbody>
      ${itensHtml}
    </tbody>
  </table>

  <div class="divider"></div>

  <table class="totals-table">
    <tr>
      <td>Qtd. Total de Itens:</td>
      <td class="text-right font-bold">${data.totalItens} un</td>
    </tr>
    <tr>
      <td>Subtotal:</td>
      <td class="text-right">R$ ${data.subtotal.toFixed(2)}</td>
    </tr>
    ${
      data.desconto > 0
        ? `
    <tr>
      <td>Desconto Concedido:</td>
      <td class="text-right font-bold">- R$ ${data.desconto.toFixed(2)}</td>
    </tr>
    `
        : ''
    }
    <tr class="total-highlight">
      <td style="border-top: 1px dashed #000; padding-top: 4px;">TOTAL A PAGAR:</td>
      <td class="text-right" style="border-top: 1px dashed #000; padding-top: 4px;">R$ ${data.totalPagar.toFixed(2)}</td>
    </tr>
  </table>

  <div class="payments-box">
    <div class="font-bold" style="margin-bottom: 3px;">FORMA(S) DE PAGAMENTO:</div>
    ${pagamentosHtml}
  </div>

  ${
    data.status === 'CANCELADA'
      ? `
  <div class="divider"></div>
  <div class="text-center font-bold" style="font-size: 11px;">*** VENDA CANCELADA / ESTORNADA ***</div>
  `
      : ''
  }

  <div class="divider-double"></div>

  <div class="footer">
    <div class="footer-alert">*** NÃO É DOCUMENTO FISCAL ***</div>
    <div class="font-bold">OBRIGADO PELA PREFERÊNCIA! VOLTE SEMPRE!</div>
    <div style="margin-top: 4px; font-size: 8.5px; color: #555555;">Estroque SaaS ERP • Sistema de Gestão & PDV</div>
  </div>
</body>
</html>`;
}

/**
 * Dispara a impressão do cupom térmico padrão (80mm) via iframe isolado,
 * garantindo compatibilidade total com impressoras de bobina (Epson, Bematech, Elgin)
 * e salvamento em PDF sem cortes de altura ou interferência do layout da página/modal.
 */
export function printThermalReceipt(data: ThermalReceiptData): void {
  // Remove qualquer iframe remanescente
  const existingFrame = document.getElementById('thermal-receipt-iframe');
  if (existingFrame) {
    existingFrame.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'thermal-receipt-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  const html = generateThermalReceiptHTML(data);
  doc.open();
  doc.write(html);
  doc.close();

  // Aguarda renderização dos estilos no iframe antes de acionar o diálogo de impressão
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error('Erro ao acionar impressão de cupom térmico:', err);
    }
  }, 200);
}
