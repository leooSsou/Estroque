import re
from dataclasses import dataclass

from src.domain.entities.tenant import Tenant
from src.domain.entities.usuario import Usuario
from src.domain.exceptions.business import CnpjEmUsoException, EmailEmUsoException
from src.domain.repositories.tenant_repository import TenantRepository
from src.domain.repositories.usuario_repository import UsuarioRepository
from src.use_cases.autenticacao.autenticar_usuario import ServicoCriptografia


@dataclass(frozen=True)
class CriarTenantInput:
    nome_fantasia: str
    razao_social: str
    dono_nome: str
    dono_email: str
    dono_senha_plana: str  # Senha em texto plano, para ser criptografada no Caso de Uso
    cnpj: str | None = None


@dataclass(frozen=True)
class CriarTenantOutput:
    tenant: Tenant
    usuario: Usuario


class CriarTenant:
    """
    Caso de Uso: Criar um novo Tenant (empresa/filial principal) e cadastrar seu respectivo Dono.
    """
    def __init__(
        self,
        tenant_repo: TenantRepository,
        usuario_repo: UsuarioRepository,
        servico_cripto: ServicoCriptografia
    ) -> None:
        self.tenant_repo = tenant_repo
        self.usuario_repo = usuario_repo
        self.servico_cripto = servico_cripto

    def executar(self, input_data: CriarTenantInput) -> CriarTenantOutput:
        # 1. Normaliza e valida se o CNPJ já está cadastrado (se informado)
        if input_data.cnpj and str(input_data.cnpj).strip():
            cnpj_limpo = re.sub(r"\D", "", str(input_data.cnpj))
            if cnpj_limpo and self.tenant_repo.obter_por_cnpj(cnpj_limpo):
                raise CnpjEmUsoException(cnpj_limpo)

        # 2. Valida se o e-mail do proprietário já está em uso (e-mail normalizado)
        email_normalizado = input_data.dono_email.strip().lower()
        if self.usuario_repo.obter_por_email(email_normalizado):
            raise EmailEmUsoException(email_normalizado)

        # 3. Cria a entidade pura Tenant (a própria entidade validará o CNPJ matematicamente se fornecido)
        tenant = Tenant(
            nome_fantasia=input_data.nome_fantasia,
            razao_social=input_data.razao_social,
            cnpj=input_data.cnpj
        )
        tenant_salvo = self.tenant_repo.salvar(tenant)

        # Criptografa a senha do dono utilizando a interface de segurança
        senha_hash = self.servico_cripto.gerar_hash(input_data.dono_senha_plana)

        # 4. Cria a entidade pura Usuario vinculada ao Tenant como DONO
        usuario = Usuario(
            nome=input_data.dono_nome,
            email=input_data.dono_email,
            senha_hash=senha_hash,
            role="DONO",
            tenant_id=tenant_salvo.id
        )
        usuario_salvo = self.usuario_repo.salvar(usuario)

        return CriarTenantOutput(tenant=tenant_salvo, usuario=usuario_salvo)

