# 📦 Estroque — Mapa Geral de Funcionalidades & Checklist de Produção

Documento de alinhamento com o status atual de todas as funcionalidades do sistema (**Backend FastAPI/PostgreSQL** + **Frontend React/Vite**) e o levantamento do que falta para colocarmos o sistema em **operação real em uma loja**.

---

## 📊 1. Tabela Completa de Funcionalidades

**Legenda:**
* ✅ **Pronto**: Implementado e testado.
* 🟡 **Parcial / Simulado**: Já existe a base ou tela, mas falta conectar ponta a ponta ou finalizar detalhe.
* ❌ **Pendente**: Ainda não implementado no banco/API ou na interface.

| Módulo | Funcionalidade | Descrição | Backend (API / BD) | Frontend (Tela) | Status / O que falta para Loja |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **Segurança & SaaS** | **Isolamento Multi-Tenant** | Separação lógica por empresa (`tenant_id` injetado automaticamente via SQLAlchemy). | ✅ Pronto | ✅ Pronto | **100% Pronto** |
| **Segurança & SaaS** | **Autenticação JWT & Rate Limit** | Login com token JWT, senhas em `bcrypt` e proteção anti-força bruta (`SlowAPI` + Redis). | ✅ Pronto | ✅ Pronto | ⚠️ Remover fallback de login demo (`localStorage`) em produção |
| **Segurança & SaaS** | **Cadastro de Empresa (Onboarding)** | Criação de novo Tenant + usuário `DONO` inicial (`POST /auth/register`). | ✅ Pronto | ❌ Sem tela | 🔧 Criar tela de Registro ou script de Seed inicial |
| **Segurança & SaaS** | **Controle de Acesso (RBAC / BOLA)** | `DONO` acessa todas as lojas; `GERENTE` fica restrito à sua filial (`loja_atribuida_id`). | ✅ Pronto | ✅ Pronto | 🔧 Criar tela para o Dono cadastrar logins de funcionários/caixas |
| **Multi-Lojas** | **Gestão de Matriz e Filiais** | Cadastro, listagem e edição de lojas com validação de CNPJ e seletor global no topo. | ✅ Pronto | ✅ Pronto | **100% Pronto** |
| **Catálogo** | **Cadastro e Edição de Produtos** | Nome, SKU único por tenant, Código de Barras (EAN), Categoria, Custo, Venda e Fornecedor. | ✅ Pronto | ✅ Pronto | **100% Pronto** |
| **Catálogo** | **Calculadora de Markup Inteligente** | Cálculo bidirecional: Custo + Markup (%) $\leftrightarrow$ Preço de Venda final. | ✅ Pronto | ✅ Pronto | **100% Pronto** |
| **Catálogo** | **Busca Global (`Ctrl+K`) e Filtros** | Pesquisa rápida por Nome, SKU ou Código de Barras e filtro por status de estoque. | ✅ Pronto | ✅ Pronto | **100% Pronto** |
| **Estoque** | **Saldos por Loja (Anti-Concorrência)** | Saldo separado por filial com lock pessimista (`SELECT FOR UPDATE`) no PostgreSQL. | ✅ Pronto | 🟡 Parcial | 🔧 Unificar `GET /estoque/saldos` com `getProdutos()` no `api.ts` |
| **Estoque** | **Movimentação Manual (Entrada/Saída)** | Lançamento avulso de entrada ou saída de mercadoria com motivo obrigatório. | ✅ Pronto | ✅ Pronto | **100% Pronto** |
| **Estoque** | **Ledger de Estoque Imutável** | Histórico fiscal inalterável de todas as movimentações (data, responsável, saldo antes/depois). | ✅ Pronto | ✅ Pronto | **100% Pronto** |
| **Fiscal / Entrada** | **Importação de XML de NF-e (v4.00)** | Parser XML seguro, auto-cadastro de fornecedor/produtos, cálculo de Custo Médio Ponderado e entrada no estoque. | ✅ Pronto | 🟡 Simulado | 🔧 Trocar botão de simulação em `NFeImport.tsx` por upload real (`FormData` $\rightarrow$ `POST /estoque/importar-xml`) |
| **Logística** | **Transferências entre Filiais** | Máquina de estados (`SOLICITADO` $\rightarrow$ `DESPACHADO` $\rightarrow$ `RECEBIDO` / `DIVERGENTE`) com conferência cega. | ✅ Pronto | ✅ Pronto | **100% Pronto** |
| **Auditoria** | **Inventário / Balanço por Bipagem** | Contagem física cega com leitor de código de barras e ajuste de sobras/perdas. | ✅ Pronto | 🟡 Parcial | 🔧 Conectar botão de conciliação direto na rota `POST /estoque/auditar` |
| **Frente de Caixa (PDV)** | **Venda de Balcão (Bipagem & Carrinho)** | Bipagem por EAN/SKU, controle de itens, desconto em R$ e baixa automática no estoque. | ✅ Pronto | ✅ Pronto | **100% Pronto** |
| **Frente de Caixa (PDV)** | **Meios de Pagamento & Troco** | PIX, Cartão de Crédito, Cartão de Débito, Dinheiro (com cálculo de troco) e Crediário. | ✅ Pronto | ✅ Pronto | 🔧 *Opcional:* Suporte a pagamento misto (2 formas na mesma venda) |
| **Frente de Caixa (PDV)** | **Venda no Crediário (Fiado)** | Valida limite disponível do cliente antes de aprovar a venda e atualiza saldo devedor. | ✅ Pronto | ✅ Pronto | **100% Pronto** |
| **Frente de Caixa (PDV)** | **Estorno / Cancelamento de Venda** | Cancela a venda, devolve produtos ao estoque, abate saldo devedor do cliente e estorna o caixa. | ✅ Pronto | ✅ Pronto | **100% Pronto** |
| **Frente de Caixa (PDV)** | **Vendas em Espera (Hold)** | Pausa o carrinho de um cliente para atender o próximo da fila e retoma depois. | ❌ Só local | ✅ Pronto | 🔧 Salvo no `localStorage` (criar tabela no banco se quiser compartilhar entre terminais) |
| **Frente de Caixa (PDV)** | **Operações de Turno de Caixa** | Abertura de caixa (fundo de troco), Sangria, Suprimento e Fechamento Cego. | ❌ Só local | ✅ Pronto | 🔧 Criar tabela de turnos no PostgreSQL (hoje salva apenas no navegador) |
| **Frente de Caixa (PDV)** | **Cupom Térmico 80mm e PDF** | Impressão de recibo não-fiscal pós-venda e relatórios Diário/Mensal em PDF. | N/A | ✅ Pronto | **100% Pronto** *(Para cupom fiscal SEFAZ, requer integração NFC-e)* |
| **Contatos** | **Clientes e Fornecedores** | Cadastro, busca e edição com validação matemática de CPF e CNPJ. | ✅ Pronto | ✅ Pronto | **100% Pronto** |
| **Crediário** | **Baixa / Recebimento de Fiado** | Registrar pagamento (total ou parcial) quando o cliente vai à loja quitar o crediário. | 🟡 Parcial | ❌ Sem botão | 🔧 Criar modal/rota para dar baixa na dívida do cliente e gerar entrada no caixa |
| **Financeiro** | **Fluxo de Caixa (Receitas e Despesas)** | Receitas automáticas vindas do PDV e lançamento manual de despesas da loja. | ✅ Pronto | ✅ Pronto | 🔧 Adicionar botão para marcar uma despesa `PENDENTE` como `PAGO` |
| **Analytics & BI** | **Dashboard Executivo & Margens** | Faturamento Bruto/Líquido, CMV, Lucro Líquido, Margem (%), Ticket Médio, Rupturas e Estoque Crítico. | ✅ Pronto | ✅ Pronto | **100% Pronto** |
| **Analytics & BI** | **Curva ABC de Pareto (80/15/5)** | Classificação automática dos produtos em Classe A (80%), B (15%) e C (5%). | ✅ Pronto | ✅ Pronto | **100% Pronto** |
| **Automação** | **Relatório Diário por E-mail (Celery)** | Worker agendado que consolida o fechamento do dia de cada tenant e envia ao dono. | 🟡 Console | ✅ Pronto | 🔧 Configurar credenciais SMTP reais no `.env` |

---

## 🛠️ 2. Plano de Ação: O que falta para colocar na loja?

Dividido por etapas para irmos para produção da forma mais rápida e segura:

### Etapa 1 — Fechar Integração 100% com o Banco Real (Concluída ✅)
- [x] **Saldos reais nos Produtos**: Ajustar `getProdutos()` no `frontend/src/services/api.ts` para trazer os saldos reais da tabela `estoque_saldos` por loja.
- [x] **Upload real na tela de NF-e**: Substituir a simulação em `NFeImport.tsx` por `<input type="file" accept=".xml" />` enviando `multipart/form-data` para `POST /estoque/importar-xml`.
- [x] **Auditoria conectada na rota oficial**: Apontar a aprovação da tela `Auditoria.tsx` para `POST /estoque/auditar`.
- [x] **Erros reais de validação da API**: Garantir que erros de validação do backend sejam exibidos ao operador em vez de cair silenciosamente no `localStorage`.
- [x] **Primeiro Acesso (Seed / Registro)**: Aba **"Cadastrar Minha Loja"** em `Login.tsx` (`POST /auth/register` + `POST /lojas/`) para criar a conta real da loja no PostgreSQL.

### Etapa 2 — Operação Diária de Balcão & Caixa (Importante)
- [ ] **Baixa de Crediário**: Botão na tela de Clientes para receber pagamento de fiado (abatendo `saldo_devedor_crediario` e lançando entrada `PAGO` no financeiro).
- [ ] **Quitar Despesa Pendente**: Botão na tela Financeiro para alterar o status de uma despesa de `PENDENTE` para `PAGO`.
- [ ] **Persistência de Turno de Caixa no Banco**: Criar endpoints no backend para salvar Abertura, Sangria, Suprimento e Fechamento de Caixa no PostgreSQL.
- [ ] **Gestão de Usuários/Operadores**: Tela simples para o `DONO` criar usuários `GERENTE`/Operadores vinculados à loja.

### Etapa 3 — Infraestrutura & Evoluções Opcionais
- [ ] **Deploy & Backup**: Configurar variáveis `.env` de produção (`SECRET_KEY`, senhas do Postgres) e rotina automática de backup diário (`pg_dump`).
- [ ] **Pagamento Misto no PDV (Opcional)**: Permitir dividir o pagamento de uma venda em duas formas (ex.: Dinheiro + PIX).
- [ ] **Emissão Fiscal NFC-e (Opcional)**: Caso a loja precise emitir cupom fiscal SEFAZ além do recibo não-fiscal 80mm.
