# 🎨 Guia Mestre de Engenharia de Prompt & Especificação UX/UI
## Sistema Estroque — Gestão de Estoque Inteligente

> **Documento Oficial de Especificação de Interface & Prompts de IA para UX/UI**  
> **Arquitetura Visual:** Bento Grid Moderno / SaaS Clean (Inspirado no estilo *Coinest*)  
> **Público-Alvo:** Designers de UI/UX, Engenheiros de Prompt, Desenvolvedores Frontend (React + Tailwind CSS), e IAs Geradoras de Interface (v0.dev, Lovable, Claude Artifacts, Figma AI).

---

## 🌿 1. Identidade Visual & Design System

### 🏷️ Marca & Logotipo
* **Nome do Sistema:** `ESTROQUE`
* **Assinatura / Slogan:** `GESTÃO DE ESTOQUE INTELIGENTE`
* **Ícone / Isotipo:** Letra **E** tridimensional isométrica estilizada, composta por três planos dobrados em degradê verde esmeralda com sombra de profundidade.
* **Tipografia da Marca:** Sans-serif geométrica, bold, caixa alta, com alto contraste e legibilidade.

---

### 🎨 Paleta de Cores Oficial (Design Tokens)

| Token CSS / Tailwind | Código HEX | Nome | Função / Aplicação na Interface |
| :--- | :--- | :--- | :--- |
| `estroque-darkest` | `#051F20` | **Deep Forest** | Textos principais (`h1`, `h2`), contraste máximo, rodapés escuros. |
| `estroque-emerald` | `#0B2B26` | **Deep Emerald** | Cards escuros de destaque (Featured Action Card), Sidebar ativa, Botões primários. |
| `estroque-pine` | `#163832` | **Pine Green** | Gradientes de fundo, estados de hover em botões escuros. |
| `estroque-forest` | `#235347` | **Forest Green** | Gráficos principais (barras de faturamento), ícones ativos, botões secundários. |
| `estroque-sage` | `#8EB69B` | **Sage Green / Mint** | Barras secundárias de gráficos (custos/despesas), badges informativos, bordas sutis. |
| `estroque-mint` | `#DAF1DE` | **Soft Light Mint** | Fundo de itens ativos na sidebar, badges de status "Concluído", cards claros de destaque. |
| `estroque-canvas` | `#F4F9F5` | **Off-White Canvas** | Cor de fundo geral da página / canvas da aplicação. |
| `estroque-card` | `#FFFFFF` | **Pure White** | Fundo dos cards Bento, tabelas, modais, formulários e dropdowns. |

---

### 📐 Geometria, Espaçamento & Componentes (Estilo Coinest)
* **Layout Base:** Bento Grid com distribuição em 12 colunas e gap de `20px` a `24px`.
* **Arredondamento de Cantos (`border-radius`):**
  * Containers & Cards Bento: `20px` a `24px` (`rounded-2xl` / `rounded-3xl`).
  * Botões de Ação e Badges de Status: `9999px` (`rounded-full` estilo pill).
  * Campos de Input e Busca: `12px` (`rounded-xl`).
* **Elevação & Sombras:** `box-shadow: 0 4px 20px -2px rgba(11, 43, 38, 0.04)` para efeito flutuante sutil e elegante.
* **Linhas e Divisórias:** Bordas ultrafinas (`1px solid #E5EFE7`) ou sem bordas (apenas contraste entre `#FFFFFF` e `#F4F9F5`).

---

## 💻 2. Configuração de Tema (Tailwind CSS)

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        estroque: {
          darkest: '#051F20',
          emerald: '#0B2B26',
          pine: '#163832',
          forest: '#235347',
          sage: '#8EB69B',
          mint: '#DAF1DE',
          canvas: '#F4F9F5',
          card: '#FFFFFF',
        }
      },
      borderRadius: {
        'bento': '20px',
        'card': '24px',
      },
      boxShadow: {
        'bento': '0 4px 20px -2px rgba(11, 43, 38, 0.05)',
      }
    }
  }
}
```

---

## 🚀 3. Prompt Mestre Global (System Prompt para IAs de UI)

Copie e use este prompt como instrução inicial para qualquer gerador de interface (v0, Lovable, Claude, Cursor):

```text
You are an expert Principal UX/UI Designer and Frontend Architect specializing in modern SaaS platforms.
You are designing the web interface for "ESTROQUE - Gestão de Estoque Inteligente", a premium multi-tenant, multi-store inventory and retail ERP SaaS.

DESIGN SYSTEM GUIDELINES:
- Layout Style: Ultra-clean, modern Bento Grid inspired by contemporary fintech & analytics dashboards (Coinest style). Generous white space, highly readable data hierarchy.
- Color Palette:
  * Deep Forest (#051F20) for primary headings and strong text contrast.
  * Deep Emerald (#0B2B26) for primary call-to-action buttons, dark featured action cards, and active menu states.
  * Pine & Forest Green (#163832, #235347) for gradients, chart bars, and secondary visual accents.
  * Sage Green (#8EB69B) and Soft Light Mint (#DAF1DE) for secondary metric bars, pill badges, and active tab highlights.
  * Off-white Canvas (#F4F9F5) as the main page background.
  * Pure White (#FFFFFF) for elevated Bento cards.
- Geometry & Components:
  * 20px-24px rounded corners on all cards and containers.
  * Pill-shaped badges and action triggers.
  * Dual-tone data visualizations (Deep Emerald + Sage Green).
  * Subtle elevation with soft diffuse shadows.
- Navigation Shell:
  * Left collapsible sidebar featuring the 3D green isometric "ESTROQUE" logo at the top and a bottom "Estroque Pro / Advanced Analytics" banner.
  * Top bar featuring a store-switcher dropdown (multi-store support), global Cmd+K search bar, quick notifications bell, and user avatar.

Generate modular, responsive, accessible and beautifully crafted components adhering to these exact specifications.
```

---

## 📱 4. Especificação e Prompts Detalhados por Tela / Módulo

---

### Tela 01: Autenticação, Onboarding & Seleção de Loja

#### 📋 Especificação Funcional
* Login com validação e proteção contra rate-limiting / DDoS.
* Identificação automática do inquilino (`tenant_id`) e papéis (`DONO`, `GERENTE`, `ADMIN_SAAS`).
* Seletor de Loja Ativa (Loja Matriz vs Filiais) com switcher rápido.

#### 🪄 Prompt para IA (v0 / Lovable / Figma)
```text
Create a modern, elegant authentication and tenant/store selection screen for "Estroque - Gestão de Estoque Inteligente".
Layout: Split-screen desktop layout (50/50).
Left side: Deep emerald gradient background (#0B2B26 to #163832) with a prominent 3D isometric green folding 'E' logo, bold white typography "ESTROQUE", subtitle "Gestão de Estoque Inteligente", and a card highlighting key features (Real-time Ledger, Smart Markup Pricing, Multi-store Sync).
Right side: Clean white card on #F4F9F5 canvas with email and password inputs (with soft borders and inner icon badges), "Remember my store" checkbox, and a full-width pill button in #0B2B26 reading "Acessar Plataforma".
Include a Store Selection dropdown preview for multi-store users ("Loja Matriz - São Paulo", "Filial 01 - Campinas").
```

---

### Tela 02: Dashboard Executivo & Business Intelligence

#### 📋 Especificação Funcional
* **Action Card Escuro:** Saldo consolidado e botões de ação rápida (`+ Nova Venda`, `📥 Importar NF-e`, `🚚 Transferir`, `📋 Auditoria`).
* **KPIs no Topo:** Faturamento Total, Ticket Médio, Rupturas de Estoque (estoque = 0) e Estoque Crítico (abaixo do ponto de reposição).
* **Gráfico Principal:** Fluxo de Caixa / Vendas vs CMV com barras verticais bicolores (`#0B2B26` e `#8EB69B`).
* **Gráfico Donut:** Distribuição percentual da Curva ABC (Classe A 80%, B 15%, C 5%).
* **Feed de Atividades Recentes:** Timeline com avatares de operadores e carimbos de data/hora.

#### 🪄 Prompt para IA (v0 / Lovable / Figma)
```text
Design the Executive SaaS Dashboard for "Estroque".
Style: Coinest-inspired Bento Grid layout with rounded 24px cards, soft shadows, canvas #F4F9F5.
Header: Top bar with store selector ("Loja Matriz"), search input with shortcut badge "⌘K", notifications, and user profile "Andrew Forbist".
Grid Composition:
1. Top-Left Featured Card (Dark #0B2B26): Displays "Consolidated Balance: R$ 148.500,00" with 4 quick action pill buttons (+ Nova Venda, Importar XML, Transferência, Auditoria).
2. KPI Cards Row: 
   - Faturamento Mensal (R$ 82.300,00 | +12.4% badge in #DAF1DE)
   - Ticket Médio (R$ 310,50 | +5.2%)
   - Rupturas de Estoque (4 itens zerados | Red warning pill)
   - Margem Bruta Média (43.8% | Sage green badge)
3. Central Chart Card: Dual-tone bar chart "Fluxo de Vendas & Despesas" comparing monthly inflows (#0B2B26) and outflows (#8EB69B) with period selector pills.
4. Right Column Top: Donut chart "Classificação Curva ABC" with legend (A: 80%, B: 15%, C: 5%).
5. Right Column Bottom: "Atividades Recentes" feed showing recent sales, XML imports, and stock transfer events with user avatars.
```

---

### Tela 03: Catálogo de Produtos & Precificação por Markup

#### 📋 Especificação Funcional
* Listagem de produtos com busca rápida, leitor de código de barras e filtros por status.
* Calculadora de Markup inteligente integrada: Preço de Venda = Custo × (1 + Markup%).
* Visualização de dados fiscais (NCM, Código de Barras, Fornecedor Padrão).

#### 🪄 Prompt para IA (v0 / Lovable / Figma)
```text
Design the "Product Catalog & Smart Markup Pricing" module for Estroque SaaS.
Components:
1. Header Actions: Search bar with barcode scanner icon, category filter pills, and "+ Novo Produto" pill button in #0B2B26.
2. Smart Markup Calculator Drawer/Modal: Floating side panel for product creation. Includes Cost Price input (e.g. R$ 50,00), interactive Markup slider (e.g. 80%), which dynamically calculates Selling Price (R$ 90,00) with a gross profit margin badge (44.4%).
3. Product Data Table (Bento Style): Clean rounded white container. Columns: Product (Image thumbnail + Title + SKU), Barcode (EAN-13), Supplier, Cost Price, Selling Price, Total Stock across stores, and Status Pill (Green "Normal", Yellow "Estoque Baixo", Red "Ruptura").
```

---

### Tela 04: Controle de Estoque & Ledger Imutável

#### 📋 Especificação Funcional
* Visão consolidada de saldo por loja (físico, reservado e disponível).
* Extrato imutável de movimentações (Ledger de auditoria fiscal e contábil).
* Garantia de rastreabilidade completa por operador e carimbo de data/hora.

#### 🪄 Prompt para IA (v0 / Lovable / Figma)
```text
Design the "Inventory Balances & Immutable Stock Ledger" screen for Estroque SaaS.
Layout:
1. Top Cards: Multi-store balance summary cards showing Available Units, In-Transit Stock, and Total Inventory Valuation in BRL.
2. Ledger History Table: Highly legible immutable audit table. Columns: Timestamp, Store, SKU/Product Name, Movement Type (Pill badges: "ENTRADA" in Soft Mint #DAF1DE, "SAÍDA" in Soft Red, "TRANSFERÊNCIA" in Soft Blue, "AUDITORIA" in Sage #8EB69B), Quantity (+/-), Previous Balance, Resulting Balance, Responsible User, and Reason note.
3. Quick Stock Adjustment modal with reason dropdown (Avaria, Perda, Ajuste de Inventário, Bonificação).
```

---

### Tela 05: Importação Inteligente de NF-e (XML v4.00)

#### 📋 Especificação Funcional
* Upload Drag & Drop de arquivo XML de nota fiscal com proteção contra XML Bomb / XXE.
* Parser inteligente com mapeamento automático de fornecedores e produtos novos.
* Recálculo automático de Custo Médio Ponderado dos itens.

#### 🪄 Prompt para IA (v0 / Lovable / Figma)
```text
Design an "Intelligent NF-e XML Invoice Importer" screen for Estroque.
Visual elements:
1. Upload Zone: Large dashed rounded box with invoice upload illustration, "Arraste o XML da NF-e aqui ou clique para buscar", supporting XML v4.00, and a "Segurança DefusedXML Ativa" badge.
2. XML Parse Preview Card: Card showing parsed Invoice Header (Número NF-e, Chave de Acesso 44 dígitos com botão copiar, Razão Social do Fornecedor, CNPJ, Valor Total da Nota R$ 14.280,00).
3. Item Conciliation Table: List of products extracted from the XML. Shows XML Product Description vs Matched Catalog Item, Quantity, Unit Cost, and badges: Green pill "Produto Existente (Atualizará Custo Médio)" or Sage pill "+ Novo Produto (Auto-cadastro)".
4. Primary Action: Pill button in #0B2B26 "Confirmar Entrada no Estoque & Conciliar Financeiro".
```

---

### Tela 06: Logística & Transferências Entre Lojas

#### 📋 Especificação Funcional
* Fluxo de estados em 4 etapas: `SOLICITADO` ➔ `DESPACHADO` ➔ `RECEBIDO` / `DIVERGENTE`.
* Bloqueio de estoque com lock pessimista para evitar furo de estoque durante o trânsito.
* Modo de conferência cega no recebimento.

#### 🪄 Prompt para IA (v0 / Lovable / Figma)
```text
Design an "Inter-Store Logistics & Stock Transfer" management screen for Estroque SaaS.
Components:
1. Stepper / Status Pipeline at the top: Solicitado (1) -> Despachado / Em Trânsito (2) -> Recebido (3) -> Divergente (4).
2. Transfer Manifest Cards: Bento cards showing Origin Store (Matriz) -> Destination Store (Filial Centro), vehicle/tracking tag, item count, and current status pill.
3. Blind Receiving Audit Modal: Delivery verification view for branch manager to scan incoming items with a barcode reader, comparing scanned vs manifest quantities with immediate visual difference alerts if a shortage/surplus occurs.
```

---

### Tela 07: Auditoria Física & Inventário Rotativo

#### 📋 Especificação Funcional
* Sessões de contagem cega de inventário rotativo por loja ou setor.
* Comparativo entre `Estoque Sistema` vs `Estoque Contado` e cálculo de sobras/perdas.
* Conciliação financeira e lançamento automático de ajustes no ledger.

#### 🪄 Prompt para IA (v0 / Lovable / Figma)
```text
Design a "Physical Inventory Audit & Blind Count" interface for Estroque SaaS.
Optimized for Desktop & Tablet view.
Features:
1. Active Audit Header: Store name, Session #204, Circular Progress indicator (85% scanned), and timer.
2. Rapid Barcode Scanner Panel: High-contrast large barcode input field with instant audio/visual confirmation and quick quantity adder buttons (+1, +5, +10).
3. Discrepancy Reconciliation Bento Card: Comparison table showing SKU, System Quantity, Counted Quantity, Variance (+/- units), and Total Financial Impact (R$). Action button in #0B2B26 "Aprovar Ajuste e Conciliar no Ledger".
```

---

### Tela 08: Frente de Caixa (PDV) & Venda com Crediário

#### 📋 Especificação Funcional
* Interface ágil de ponto de venda para operadores de caixa e vendedores.
* Validador de limite de crediário do cliente em tempo real (bloqueio automático em caso de estouro).
* Baixa instantânea no estoque e conciliação automática com o financeiro.

#### 🪄 Prompt para IA (v0 / Lovable / Figma)
```text
Design a modern Point of Sale (POS) & Store Credit Sale screen for Estroque SaaS.
Layout (Bento Grid POS):
1. Left 65%: Product grid with barcode search bar, category filter pills, and quick product cards (Thumbnail, Name, Price R$, Stock Available).
2. Right 35%: Active Order / Cart Card (Pure White #FFFFFF with rounded 24px border). Shows itemized list, quantity steppers, item discounts, Subtotal, and Large Total Value in #051F20.
3. Customer & Credit Limit Section: Customer selector with real-time Credit Widget showing "Limite Disponível: R$ 650,00 de R$ 1.200,00". If cart exceeds available limit, show a warning badge "Limite Excedido - Requer Autorização do Dono".
4. Payment Method Buttons: Clean pill buttons for Dinheiro, PIX, Cartão de Crédito/Débito, and Crediário da Loja (A Prazo).
```

---

### Tela 09: Gestão Financeira & Fechamento Diário Automatizado

#### 📋 Especificação Funcional
* Lançamento e controle de despesas operacionais e receitas de vendas.
* Visualização do relatório de Fechamento Diário gerado automaticamente pelas tarefas Celery às 23:59.
* Indicadores de liquidez e conciliação bancária/caixa.

#### 🪄 Prompt para IA (v0 / Lovable / Figma)
```text
Design a "Financial Cash Flow & Automated Daily Close" dashboard for Estroque.
Components:
1. Financial KPI Cards: Contas a Receber (Vendas / Crediário), Contas a Pagar (Despesas / Fornecedores), Saldo Líquido do Dia (+R$ 6.420,00 in #DAF1DE badge).
2. Cashflow Bar Chart: Monthly bar chart comparing revenues (#0B2B26) vs operating expenses (#8EB69B).
3. "Fechamento Diário Automatizado (Celery Routine)" Widget: Interactive preview of the automated email sent to the store owner with daily summary, sales breakdown, expense ledger, and next-day low stock alerts. Includes a "Reenviar E-mail" button.
4. Expense Entry Modal: Quick popup to register operational costs (Aluguel, Luz, Logística) with category dropdown and receipt upload.
```

---

### Tela 10: Algoritmo de Curva ABC (Pareto) & Diagnóstico de Estoque

#### 📋 Especificação Funcional
* Classificação matemática dos produtos por faturamento acumulado (Pareto 80/15/5).
* Ações recomendadas: alerta de recompra para Classe A e sugestão de liquidação para Classe C.
* Gráfico de curva acumulada interativo.

#### 🪄 Prompt para IA (v0 / Lovable / Figma)
```text
Design an advanced "ABC Curve Analysis & Inventory Diagnostics" screen for Estroque.
Visual Hierarchy:
1. ABC Category Cards:
   - Classe A (Deep Emerald #0B2B26): 18 Produtos | 80.1% do Faturamento | Badge "Alta Prioridade / Nunca Falhar"
   - Classe B (Forest Green #235347): 42 Produtos | 15.0% do Faturamento | Badge "Giro Moderado"
   - Classe C (Soft Sage #8EB69B): 110 Produtos | 4.9% do Faturamento | Badge "Baixo Giro / Avaliar Desconto"
2. Pareto Cumulative Curve Chart: Combined vertical bar chart (product revenue) overlaid with a smooth cumulative percentage curve leading up to 100%.
3. Inventory Action Triggers Table: Products sorted by revenue with ABC badges, current stock turnover speed, days of stock left, and recommended action buttons ("Comprar com Fornecedor", "Criar Promoção").
```

---

## 🎯 5. Checklist de Verificação de Qualidade UX/UI

Ao gerar ou revisar qualquer tela do sistema **Estroque**, valide se os seguintes critérios foram cumpridos:
- [ ] O logotipo **ESTROQUE** (com o isotipo 3D 'E' em degradê verde) está visível no topo da navegação.
- [ ] As cores seguem rigorosamente a paleta de verdes (`#051F20`, `#0B2B26`, `#163832`, `#235347`, `#8EB69B`, `#DAF1DE`).
- [ ] O fundo geral utiliza o canvas off-white (`#F4F9F5`) e os cards são brancos (`#FFFFFF`) com cantos de `20px` a `24px`.
- [ ] Os botões de ação e status possuem formato pill (`rounded-full`).
- [ ] Há suporte explícito para seleção de loja (multi-store switcher).
- [ ] Telas com dados densos (Ledger, NF-e, Auditoria) possuem espaçamento respirável e filtros rápidos.
