from typing import Any

CATALOGO_MODULOS: dict[str, dict[str, Any]] = {
    "pdv": {
        "nome": "Frente de Caixa (PDV)",
        "descricao": "Abertura e fechamento de turnos, vendas balcão, split payment, sangria e suprimento.",
        "icone": "ShoppingCart",
        "rota": "/pdv",
    },
    "nfe": {
        "nome": "Entrada & Importação NF-e",
        "descricao": "Importação de arquivos XML de notas fiscais, manifesto e cadastro automático de estoque.",
        "icone": "FileSpreadsheet",
        "rota": "/nfe",
    },
    "financeiro": {
        "nome": "Gestão Financeira",
        "descricao": "Fluxo de caixa, despesas a pagar, receitas, conciliação e baixa de lançamentos.",
        "icone": "Wallet",
        "rota": "/financeiro",
    },
    "transferencias": {
        "nome": "Transferências de Estoque",
        "descricao": "Despacho e recebimento de mercadorias entre filiais e loja matriz com rastreabilidade.",
        "icone": "ArrowLeftRight",
        "rota": "/transferencias",
    },
    "auditoria": {
        "nome": "Auditoria & Ledger",
        "descricao": "Contagem física de inventário, conciliação de divergências e livro-razão imutável.",
        "icone": "ScrollText",
        "rota": "/ledger",
    },
    "contatos": {
        "nome": "Contatos & Crediário",
        "descricao": "Gestão de clientes, fornecedores, controle de limite de crédito e recebimento de fiado.",
        "icone": "Users",
        "rota": "/contatos",
    },
    "analytics": {
        "nome": "Curva ABC & Analytics",
        "descricao": "Relatórios gerenciais, inteligência de giro de produtos e classificação ABC de estoque.",
        "icone": "BarChart3",
        "rota": "/analytics",
    },
    "grade": {
        "nome": "Grade & Variações",
        "descricao": "Criação de produtos com matriz de atributos (tamanho, cor, voltagem) e estoque por variação.",
        "icone": "Boxes",
        "rota": "/produtos",
    },
}

MODULOS_PADRAO_POR_PLANO: dict[str, list[str]] = {
    "STARTER": ["pdv", "contatos"],
    "PRO": ["pdv", "contatos", "financeiro", "grade", "nfe", "transferencias", "auditoria", "analytics"],
    "ENTERPRISE": ["pdv", "nfe", "financeiro", "transferencias", "auditoria", "contatos", "analytics", "grade"],
}


def calcular_modulos_tenant(plano: str, modulos_customizados: dict[str, bool] | None) -> list[dict[str, Any]]:
    """
    Calcula o status de cada módulo para um tenant, combinando os módulos padrão
    do plano com eventuais customizações (bônus ou bloqueios) concedidas pelo SuperAdmin.
    """
    plano_upper = plano.upper() if plano else "PRO"
    padroes_plano = set(MODULOS_PADRAO_POR_PLANO.get(plano_upper, MODULOS_PADRAO_POR_PLANO["PRO"]))
    custom = modulos_customizados or {}

    detalhes: list[dict[str, Any]] = []
    for chave, meta in CATALOGO_MODULOS.items():
        incluso_no_plano = chave in padroes_plano
        if chave in custom:
            ativo = bool(custom[chave])
            if ativo and not incluso_no_plano:
                origem = "BONUS"
            elif not ativo and incluso_no_plano:
                origem = "BLOQUEADO"
            elif ativo and incluso_no_plano:
                origem = "PLANO"
            else:
                origem = "DESATIVADO"
        else:
            ativo = incluso_no_plano
            origem = "PLANO" if incluso_no_plano else "DESATIVADO"

        detalhes.append({
            "chave": chave,
            "nome": meta["nome"],
            "descricao": meta["descricao"],
            "icone": meta["icone"],
            "rota": meta["rota"],
            "ativo": ativo,
            "incluso_no_plano": incluso_no_plano,
            "origem": origem,  # 'PLANO' | 'BONUS' | 'BLOQUEADO' | 'DESATIVADO'
        })

    return detalhes


def obter_modulos_ativos_map(plano: str, modulos_customizados: dict[str, bool] | None) -> dict[str, bool]:
    """
    Retorna apenas o dicionário booleano {'pdv': True, 'nfe': False, ...} para checagens rápidas.
    """
    detalhes = calcular_modulos_tenant(plano, modulos_customizados)
    return {d["chave"]: d["ativo"] for d in detalhes}
