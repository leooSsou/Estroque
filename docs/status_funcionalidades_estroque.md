# 📦 Estroque — Mapa Geral de Funcionalidades & Checklist de Produção

Documento de alinhamento com o status atual de todas as funcionalidades do sistema (**Backend FastAPI/PostgreSQL** + **Frontend React/Vite**) e o levantamento do que falta para colocarmos o sistema em **operação real em uma loja**.

---

## 📊 1. Tabela Completa de Funcionalidades

**Legenda:**
* ✅ **Pronto**: Implementado e testado ponta a ponta (Backend + Frontend).
* 🟡 **Opcional / Evolução**: Funcionalidade complementar opcional para cenários específicos.

| Módulo | Funcionalidade | Descrição | Backend (API / BD) | Frontend (Tela) | Status para Operação em Loja |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **Segurança & SaaS** | **Isolamento Multi-Tenant** | Separação lógica por empresa (`tenant_id` injetado automaticamente via SQLAlchemy). | ✅ Pronto | ✅ Pronto | **100% Pronto** |
| **Segurança & SaaS** | **Autenticação JWT & Rate Limit** | Login com token JWT, senhas em `bcrypt` e proteção anti-força bruta (`SlowAPI` + Redis). | ✅ Pronto | ✅ Pronto | **100% Pronto** |
| **Segurança & SaaS** | **Cadastro de Empresa (Onboarding)** | Criação de novo Tenant + usuário `DONO` + Loja Matriz inicial (`POST /auth/register` + `POST /lojas/`). | ✅ Pronto | ✅ Pronto | **100% Pronto** (`Login.tsx`) |
| **Segurança & SaaS** | **Controle de Acesso & Equipe (RBAC)** | `DONO` acessa todas as lojas e cadastra `GERENTE` por filial (`GET/POST /auth/usuarios`). | ✅ Pronto | ✅ Pronto | **100% Pronto** (`TopBar.tsx`) |
| **Multi-Lojas** | **Gestão de Matriz e Filiais** | Cadastro de novas filiais pela TopBar (`+ Nova Filial`), listagem e seletor global no topo. | ✅ Pronto | ✅ Pronto | **100% Pronto** (`TopBar.tsx`) |
| **Catálogo** | **Cadastro e Edição de Produtos** | Nome, SKU único por tenant, Código de Barras (EAN), Categoria, Custo, Venda e Fornecedor. | ✅ Pronto | ✅ Pronto | **100% Pronto** |
| **Catálogo** | **Calculadora de Markup Inteligente** | Cálculo bidirecional: Custo + Markup (%) $\leftrightarrow$ Preço de Venda final. | ✅ Pronto | ✅ Pronto | **100% Pronto** |
| **Catálogo** | **Busca Global (`Ctrl+K`) e Filtros** | Pesquisa rápida por Nome, SKU ou Código de Barras e filtro por status de estoque. | ✅ Pronto | ✅ Pronto | **100% Pronto** |
| **Estoque** | **Saldos por Loja (Anti-Concorrência)** | Saldo separado por filial com lock pessimista (`SELECT FOR UPDATE`) sincronizado com `GET /estoque/saldos`. | ✅ Pronto | ✅ Pronto | **100% Pronto** |
| **Estoque** | **Movimentação Manual (Entrada/Saída)** | Lançamento avulso de entrada ou saída de mercadoria com motivo obrigatório. | ✅ Pronto | ✅ Pronto | **100% Pronto** |
| **Estoque** | **Ledger de Estoque Imutável** | Histórico fiscal inalterável de todas as movimentações (data, responsável, saldo antes/depois). | ✅ Pronto | ✅ Pronto | **100% Pronto** |
| **Fiscal / Entrada** | **Importação de XML de NF-e (v4.00)** | Upload real `.xml` (`multipart/form-data`), auto-cadastro de fornecedor/produtos, Custo Médio Ponderado e entrada no estoque. | ✅ Pronto | ✅ Pronto | **100% Pronto** (`NFeImport.tsx`) |
| **Logística** | **Transferências entre Filiais** | Máquina de estados (`SOLICITADO` $\rightarrow$ `DESPACHADO` $\rightarrow$ `RECEBIDO` / `DIVERGENTE`) com conferência cega. | ✅ Pronto | ✅ Pronto | **100% Pronto** |
| **Auditoria** | **Inventário / Balanço por Bipagem** | Contagem física cega com leitor de código de barras conectada à rota atômica `POST /estoque/auditar`. | ✅ Pronto | ✅ Pronto | **100% Pronto** (`Auditoria.tsx`) |
| **Frente de Caixa (PDV)** | **Venda de Balcão (Bipagem & Carrinho)** | Bipagem por EAN/SKU, controle de itens, desconto em R$ e baixa automática no estoque. | ✅ Pronto | ✅ Pronto | **100% Pronto** |
| **Frente de Caixa (PDV)** | **Meios de Pagamento & Troco** | PIX, Cartão de Crédito, Cartão de Débito, Dinheiro (com cálculo de troco) e Crediário. | ✅ Pronto | ✅ Pronto | **100% Pronto** |
| **Frente de Caixa (PDV)** | **Venda no Crediário (Fiado)** | Valida limite disponível do cliente antes de aprovar a venda e atualiza saldo devedor. | ✅ Pronto | ✅ Pronto | **100% Pronto** |
| **Frente de Caixa (PDV)** | **Estorno / Cancelamento de Venda** | Cancela a venda, devolve produtos ao estoque, abate saldo devedor do cliente e estorna o caixa. | ✅ Pronto | ✅ Pronto | **100% Pronto** |
| **Frente de Caixa (PDV)** | **Vendas em Espera (Hold)** | Pausa o carrinho de um cliente para atender o próximo da fila e retoma depois. | ✅ Local | ✅ Pronto | **100% Pronto** |
| **Frente de Caixa (PDV)** | **Operações de Turno de Caixa** | Abertura de caixa, Sangria, Suprimento e Fechamento sincronizados com o Financeiro no PostgreSQL. | ✅ Pronto | ✅ Pronto | **100% Pronto** |
| **Frente de Caixa (PDV)** | **Cupom Térmico 80mm e PDF** | Impressão de recibo não-fiscal pós-venda e relatórios Diário/Mensal em PDF. | N/A | ✅ Pronto | **100% Pronto** |
| **Contatos** | **Clientes e Fornecedores** | Cadastro, busca e edição com validação matemática de CPF e CNPJ. | ✅ Pronto | ✅ Pronto | **100% Pronto** |
| **Crediário** | **Baixa / Recebimento de Fiado** | Recebimento total ou parcial (`POST /clientes/{id}/receber-crediario`) com geração automática de receita `PAGO`. | ✅ Pronto | ✅ Pronto | **100% Pronto** (`Contatos.tsx`) |
| **Financeiro** | **Fluxo de Caixa & Baixa de Pendentes** | Receitas/despesas e botão **"Dar Baixa"** (`PATCH /financeiro/lancamentos/{id}/pagar`) para quitar pendentes. | ✅ Pronto | ✅ Pronto | **100% Pronto** (`Financeiro.tsx`) |
| **Analytics & BI** | **Dashboard Executivo & Margens** | Faturamento Bruto/Líquido, CMV, Lucro Líquido, Margem (%), Ticket Médio, Rupturas e Estoque Crítico. | ✅ Pronto | ✅ Pronto | **100% Pronto** |
| **Analytics & BI** | **Curva ABC de Pareto (80/15/5)** | Classificação automática dos produtos em Classe A (80%), B (15%) e C (5%). | ✅ Pronto | ✅ Pronto | **100% Pronto** |
| **Automação** | **Relatório Diário por E-mail (Celery)** | Worker agendado que consolida o fechamento do dia de cada tenant e envia ao dono. | ✅ Pronto | ✅ Pronto | 🔧 Configurar SMTP no `.env` de produção |

---

## 🛠️ 2. Checklist de Produção

### Etapa 1 — Integração 100% com o Banco Real (Concluída ✅ — PR #26)
- [x] **Saldos reais nos Produtos**: `getProdutos()` busca `GET /produtos/` e `GET /estoque/saldos` em paralelo.
- [x] **Upload real na tela de NF-e**: Seletor de arquivo `.xml` enviando `multipart/form-data` para `POST /estoque/importar-xml`.
- [x] **Auditoria conectada na rota oficial**: Conciliação de inventário conectada diretamente em `POST /estoque/auditar`.
- [x] **Erros reais de validação da API**: Mensagens de erro reais do backend exibidas nos toasts.
- [x] **Primeiro Acesso (Registro de Loja)**: Aba **"Cadastrar Minha Loja"** em `Login.tsx` (`POST /auth/register` + `POST /lojas/`).

### Etapa 2 — Operação Diária de Balcão & Financeiro (Concluída ✅ — PR #27)
- [x] **Baixa de Crediário**: Rota `POST /clientes/{id}/receber-crediario` e modal **"Receber Fiado"** em `Contatos.tsx`.
- [x] **Quitar Despesa Pendente**: Rota `PATCH /financeiro/lancamentos/{id}/pagar` e botão **"Dar Baixa"** em `Financeiro.tsx`.
- [x] **Cadastro de Nova Filial na TopBar**: Botão **"+ Nova Filial"** e modal no seletor de lojas da barra superior (`TopBar.tsx`).

### Etapa 3 — Gestão de Equipe & Sincronização de Caixa (Concluída ✅)
- [x] **Gestão de Usuários/Gerentes**: Rotas `GET /auth/usuarios` e `POST /auth/usuarios` e modal **"Equipe & Acessos"** em `TopBar.tsx`.
- [x] **Sincronização de Sangria, Suprimento e Quebra/Sobra de Caixa no PostgreSQL**: Rota `POST /financeiro/receitas` e integração automática das operações de turno do PDV com o banco de dados.

### Etapa 4 — Infraestrutura de Deploy (Na instalação física/nuvem da loja)
- [ ] **Variáveis `.env` de Produção**: Configurar `SECRET_KEY` forte, credenciais do PostgreSQL e SMTP para disparo de e-mails do Celery.
- [ ] **Rotina de Backup**: Agendar `pg_dump` diário automatizado do banco PostgreSQL.
