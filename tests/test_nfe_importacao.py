import pytest
import random
from io import BytesIO
from fastapi.testclient import TestClient
from src.domain.services.nfe_parser import NFeParserService
from src.use_cases.estoque.importar_nfe import ImportarEstoqueNFe, ImportarNFeInput
from src.infrastructure.database.repositorios_concrete import (
    RepositorioFornecedorSQLAlchemy,
    RepositorioProdutoSQLAlchemy,
    RepositorioEstoqueSaldoSQLAlchemy,
)

def gerar_cnpj_valido() -> str:
    base = [random.randint(0, 9) for _ in range(12)]
    pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    s1 = sum(base[i] * pesos1[i] for i in range(12))
    r1 = s1 % 11
    d1 = 0 if r1 < 2 else 11 - r1
    base.append(d1)
    pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    s2 = sum(base[i] * pesos2[i] for i in range(13))
    r2 = s2 % 11
    d2 = 0 if r2 < 2 else 11 - r2
    base.append(d2)
    return "".join(map(str, base))

# XML de exemplo para testes de NF-e v4.00
SAMPLE_NFE_XML = """<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe>
      <emit>
        <CNPJ>12345678000195</CNPJ>
        <xNome>Distribuidora de Roupas Alfa LTDA</xNome>
        <xFant>Distribuidora Alfa</xFant>
      </emit>
      <det n="1">
        <prod>
          <cProd>CAM-POLO-01</cProd>
          <cEAN>7891234567890</cEAN>
          <xProd>Camiseta Polo Algodao P</xProd>
          <qCom>10.0000</qCom>
          <vUnCom>40.0000</vUnCom>
          <vProd>400.00</vProd>
        </prod>
      </det>
      <det n="2">
        <prod>
          <cProd>CALCA-JEANS-02</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>Calca Jeans Masculina 42</xProd>
          <qCom>5.0000</qCom>
          <vUnCom>80.0000</vUnCom>
          <vProd>400.00</vProd>
        </prod>
      </det>
    </infNFe>
  </NFe>
</nfeProc>
"""


def test_parser_xml_nfe_valido():
    """
    Garante que o NFeParserService extraia corretamente o emitente e os itens do XML.
    """
    dados = NFeParserService.parse_xml(SAMPLE_NFE_XML)

    assert dados.emitente.cnpj == "12345678000195"
    assert dados.emitente.razao_social == "Distribuidora de Roupas Alfa LTDA"
    assert dados.emitente.nome_fantasia == "Distribuidora Alfa"
    assert len(dados.itens) == 2

    # Item 1
    assert dados.itens[0].codigo_produto == "CAM-POLO-01"
    assert dados.itens[0].codigo_barras == "7891234567890"
    assert dados.itens[0].nome == "Camiseta Polo Algodao P"
    assert dados.itens[0].quantidade == 10.0
    assert dados.itens[0].valor_unitario == 40.0

    # Item 2 (SEM GTIN deve resultar em codigo_barras None)
    assert dados.itens[1].codigo_produto == "CALCA-JEANS-02"
    assert dados.itens[1].codigo_barras is None
    assert dados.itens[1].quantidade == 5.0
    assert dados.itens[1].valor_unitario == 80.0


def test_importar_estoque_nfe_fluxo_completo(db_session):
    """
    Garante que o Caso de Uso ImportarEstoqueNFe cadastre o Fornecedor e os Produtos
    e atualize o Custo Médio Ponderado corretamente ao importar novamente.
    """
    from uuid import uuid4
    tenant_id = uuid4()

    fornecedor_repo = RepositorioFornecedorSQLAlchemy(db_session)
    produto_repo = RepositorioProdutoSQLAlchemy(db_session)
    saldo_repo = RepositorioEstoqueSaldoSQLAlchemy(db_session)
    from src.infrastructure.database.repositorios_concrete import RepositorioLojaSQLAlchemy, RepositorioEstoqueMovimentacaoSQLAlchemy
    loja_repo = RepositorioLojaSQLAlchemy(db_session)
    movimentacao_repo = RepositorioEstoqueMovimentacaoSQLAlchemy(db_session)
    use_case = ImportarEstoqueNFe(fornecedor_repo, produto_repo, saldo_repo, loja_repo, movimentacao_repo)

    # Primeia importação (produtos novos no catálogo)
    input_1 = ImportarNFeInput(
        xml_content=SAMPLE_NFE_XML,
        tenant_id=tenant_id,
        markup_padrao=1.0  # 100% de markup -> Preço Venda = Custo * 2
    )

    output_1 = use_case.executar(input_1)
    db_session.flush()

    assert output_1.fornecedor.cnpj == "12345678000195"
    assert len(output_1.itens_processados) == 2
    assert output_1.itens_processados[0].novo_produto_cadastrado is True

    prod_1 = output_1.itens_processados[0].produto
    assert prod_1.preco_custo == 40.0
    assert prod_1.preco_venda == 80.0  # 40 * (1 + 1.0)
    assert prod_1.codigo_barras == "7891234567890"

    # Criar 10 unidades de estoque com custo 40.0 para prod_1
    from src.domain.entities.estoque_saldo import EstoqueSaldo
    saldo_repo.salvar(EstoqueSaldo(
        loja_id=uuid4(),
        produto_id=prod_1.id,
        quantidade=10,
        tenant_id=tenant_id
    ))
    db_session.commit()

    # Segunda importação (mesmo produto com valor unitário diferente = 60.0)
    xml_segunda_compra = SAMPLE_NFE_XML.replace("<vUnCom>40.0000</vUnCom>", "<vUnCom>60.0000</vUnCom>")
    input_2 = ImportarNFeInput(
        xml_content=xml_segunda_compra,
        tenant_id=tenant_id
    )

    output_2 = use_case.executar(input_2)
    db_session.flush()

    prod_1_atualizado = output_2.itens_processados[0].produto
    assert output_2.itens_processados[0].novo_produto_cadastrado is False
    # Custo médio ponderado: ((10 * 40.0) + (10 * 60.0)) / (10 + 10) = 50.0
    assert prod_1_atualizado.preco_custo == 50.0
    # Novo preço de venda com base no markup 1.0: 50 * (1 + 1.0) = 100.0
    assert prod_1_atualizado.preco_venda == 100.0


def test_api_importar_xml_nfe_endpoint(client: TestClient):
    """
    Testa a rota HTTP POST /estoque/importar-xml de ponta a ponta.
    """
    # 1. Registrar e autenticar um usuário
    reg_res = client.post("/auth/register", json={
        "nome_fantasia": "Loja Teste NFe",
        "razao_social": "Loja Teste NFe LTDA",
        "cnpj": "12.345.678/0001-95",
        "dono_nome": "Gerente NFe",
        "dono_email": "gerente_nfe@teste.com",
        "dono_senha": "senha_segura_nfe"
    })
    assert reg_res.status_code == 201

    login_res = client.post("/auth/login", json={
        "email": "gerente_nfe@teste.com",
        "senha": "senha_segura_nfe"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Fazer upload do XML da NF-e
    file_bytes = SAMPLE_NFE_XML.encode("utf-8")
    response = client.post(
        "/estoque/importar-xml?markup_padrao=0.5",
        files={"file": ("nota_fiscal.xml", file_bytes, "text/xml")},
        headers=headers
    )

    assert response.status_code == 200
    json_data = response.json()
    assert json_data["fornecedor"]["cnpj"] == "12345678000195"
    assert len(json_data["itens_processados"]) == 2

    # Verifica os dados do produto 1
    prod_1 = json_data["itens_processados"][0]["produto"]
    assert prod_1["sku"] == "CAM-POLO-01"
    assert prod_1["codigo_barras"] == "7891234567890"
    assert prod_1["preco_custo"] == 40.0
    assert prod_1["preco_venda"] == 60.0  # 40 * (1 + 0.5)


def test_parser_xml_nfe_vulnerabilidade_xml_bomb():
    """
    Garante que o parser rejeita XMLs contendo definições de entidades ou DOCTYPEs.
    """
    xml_bomb = """<?xml version="1.0"?>
    <!DOCTYPE lolz [
     <!ENTITY lol "lol">
     <!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
    ]>
    <nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
      <NFe><infNFe><emit><CNPJ>12345678000195</CNPJ></emit></infNFe></NFe>
    </nfeProc>
    """
    with pytest.raises(ValueError, match="declarações DOCTYPE ou ENTITY não são permitidas"):
        NFeParserService.parse_xml(xml_bomb)


def test_parser_xml_nfe_vulnerabilidade_xml_bomb_evasao():
    """
    Garante que o parser rejeita XMLs mesmo com espaçamentos variados, tabs ou quebras de linha nas tags.
    """
    xml_evasao_doctype = """<?xml version="1.0"?>
    <!   \t\n   DOCTYPE lolz [
      <!ENTITY lol "lol">
    ]>
    <nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
      <NFe><infNFe><emit><CNPJ>12345678000195</CNPJ></emit></infNFe></NFe>
    </nfeProc>
    """
    with pytest.raises(ValueError, match="declarações DOCTYPE ou ENTITY não são permitidas"):
        NFeParserService.parse_xml(xml_evasao_doctype)

    xml_evasao_entity = """<?xml version="1.0"?>
    <nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
      <NFe><infNFe><emit>
        <!   \n   ENTITY lol "lol">
        <CNPJ>12345678000195</CNPJ>
      </emit></infNFe></NFe>
    </nfeProc>
    """
    with pytest.raises(ValueError, match="declarações DOCTYPE ou ENTITY não são permitidas"):
        NFeParserService.parse_xml(xml_evasao_entity)



def test_api_importar_xml_nfe_vulnerabilidade_xml_bomb(client: TestClient):
    """
    Garante que a rota HTTP rejeita o upload de XMLs maliciosos com Billion Laughs.
    """
    # 1. Registrar e autenticar um usuário
    cnpj_tenant = gerar_cnpj_valido()
    client.post("/auth/register", json={
        "nome_fantasia": "Loja NFe Segura",
        "razao_social": "Loja NFe Segura LTDA",
        "cnpj": cnpj_tenant,
        "dono_nome": "Gerente NFe",
        "dono_email": "gerentebomb@teste.com",
        "dono_senha": "senha_segura_nfe"
    })
    
    login_res = client.post("/auth/login", json={
        "email": "gerentebomb@teste.com",
        "senha": "senha_segura_nfe"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    xml_bomb = """<?xml version="1.0"?>
    <!DOCTYPE lolz [
     <!ENTITY lol "lol">
     <!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
    ]>
    <nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
      <NFe><infNFe><emit><CNPJ>12345678000195</CNPJ></emit></infNFe></NFe>
    </nfeProc>
    """
    response = client.post(
        "/estoque/importar-xml",
        files={"file": ("xml_bomb.xml", xml_bomb.encode("utf-8"), "text/xml")},
        headers=headers
    )
    assert response.status_code == 422
    assert "declarações DOCTYPE ou ENTITY não são permitidas" in response.json()["detail"]


def test_api_importar_xml_nfe_com_entrada_fisica_estoque(client: TestClient):
    """
    Garante que ao importar XML com loja_id, a API cadastra os produtos e gera os saldos e movimentações físicas no estoque.
    """
    # 1. Registrar e autenticar um usuário
    from uuid import uuid4
    suffix = uuid4().hex[:6]
    cnpj_tenant = gerar_cnpj_valido()
    
    client.post("/auth/register", json={
        "nome_fantasia": f"Loja NFe Fisica {suffix}",
        "razao_social": f"Loja NFe Fisica {suffix} LTDA",
        "cnpj": cnpj_tenant,
        "dono_nome": "Gerente Fisica",
        "dono_email": f"gerentefisica_{suffix}@teste.com",
        "dono_senha": "senha_segura_nfe"
    })
    
    login_res = client.post("/auth/login", json={
        "email": f"gerentefisica_{suffix}@teste.com",
        "senha": "senha_segura_nfe"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Criar uma Loja Física
    cnpj_loja = gerar_cnpj_valido()
    res_loja = client.post("/lojas/", json={
        "nome": "Filial NFe Entradas",
        "cnpj": cnpj_loja,
        "endereco": "Avenida NFe, 456"
    }, headers=headers)
    assert res_loja.status_code == 201
    loja_id = res_loja.json()["id"]

    # 3. Fazer o upload do XML passando loja_id
    response = client.post(
        f"/estoque/importar-xml?loja_id={loja_id}",
        files={"file": ("nfe.xml", SAMPLE_NFE_XML.encode("utf-8"), "text/xml")},
        headers=headers
    )
    assert response.status_code == 200

    # 4. Verificar os saldos físicos criados no estoque (10 para CAM-POLO-01, 5 para CALCA-JEANS-02)
    res_saldos = client.get("/estoque/saldos", headers=headers)
    assert res_saldos.status_code == 200
    saldos = res_saldos.json()
    assert len(saldos) == 2

    # Verifica se os saldos batem
    polo_saldo = [s for s in saldos if s["quantidade"] == 10][0]
    calca_saldo = [s for s in saldos if s["quantidade"] == 5][0]
    assert polo_saldo["loja_id"] == loja_id
    assert calca_saldo["loja_id"] == loja_id

    # 5. Verificar as movimentações registradas no ledger
    res_movs = client.get("/estoque/movimentacoes", headers=headers)
    assert res_movs.status_code == 200
    movs = res_movs.json()
    assert len(movs) == 2
    assert all(m["tipo"] == "ENTRADA" for m in movs)
    assert all("Importacao de NF-e" in m["motivo"] for m in movs)

