from dataclasses import replace

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from src.domain.constants.modulos import CATALOGO_MODULOS, obter_modulos_ativos_map
from src.domain.entities.usuario import Usuario
from src.domain.exceptions.business import (
    CnpjEmUsoException,
    CredenciaisInvalidasException,
    EmailEmUsoException,
    LimitePlanoAtingidoException,
    LojaNaoEncontradaException,
    TenantSuspensoException,
)
from src.infrastructure.database.repositorios_concrete import (
    RepositorioLojaSQLAlchemy,
    RepositorioTenantSQLAlchemy,
    RepositorioUsuarioSQLAlchemy,
)
from src.infrastructure.database.session import get_db
from src.infrastructure.security.jwt_handler import criar_token_acesso
from src.infrastructure.security.password import BcryptServicoCriptografia
from src.infrastructure.web.dependencies import get_current_user
from src.infrastructure.web.limiter import limiter
from src.infrastructure.web.schemas import (
    AlterarSenhaRequest,
    LoginRequest,
    LoginResponse,
    MensagemResponse,
    RegisterRequest,
    RegisterResponse,
    UserResponse,
    UsuarioCreateRequest,
)
from src.use_cases.autenticacao.autenticar_usuario import (
    AutenticarUsuario,
    AutenticarUsuarioInput,
)
from src.use_cases.autenticacao.criar_tenant import CriarTenant, CriarTenantInput

router = APIRouter(prefix="/auth", tags=["Autenticação"])

@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def register(request: Request, data: RegisterRequest, db: Session = Depends(get_db)) -> RegisterResponse:
    """
    Registra um novo inquilino (Tenant) e cria o respectivo usuário administrador (DONO).
    """
    try:
        # Ignora o filtro de tenant para permitir o cadastro inicial do tenant e seu primeiro usuário
        db.info["ignore_tenant_filter"] = True

        tenant_repo = RepositorioTenantSQLAlchemy(db)
        usuario_repo = RepositorioUsuarioSQLAlchemy(db)
        servico_cripto = BcryptServicoCriptografia()
        use_case = CriarTenant(tenant_repo, usuario_repo, servico_cripto)

        input_data = CriarTenantInput(
            nome_fantasia=data.nome_fantasia,
            razao_social=data.razao_social,
            cnpj=data.cnpj,
            dono_nome=data.dono_nome,
            dono_email=str(data.dono_email),
            dono_senha_plana=data.dono_senha
        )

        try:
            output = use_case.executar(input_data)
            return RegisterResponse(
                tenant_id=output.tenant.id,
                nome_fantasia=output.tenant.nome_fantasia,
                dono_id=output.usuario.id,
                dono_email=output.usuario.email
            )
        except CnpjEmUsoException as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"O CNPJ '{e.cnpj}' já está cadastrado no sistema."
            )
        except EmailEmUsoException as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"O e-mail '{e.email}' já está em uso por outro usuário."
            )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(e)
            )
    finally:
        db.info.pop("ignore_tenant_filter", None)


@router.post("/login", response_model=LoginResponse)
@limiter.limit("5/minute")
def login(request: Request, data: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    """
    Autentica um usuário e retorna um token de acesso JWT.
    """
    try:
        # Ignora o filtro de tenant durante a autenticação para permitir a busca do usuário pelo e-mail
        db.info["ignore_tenant_filter"] = True

        tenant_repo = RepositorioTenantSQLAlchemy(db)
        usuario_repo = RepositorioUsuarioSQLAlchemy(db)
        servico_cripto = BcryptServicoCriptografia()
        use_case = AutenticarUsuario(usuario_repo, tenant_repo, servico_cripto)

        input_data = AutenticarUsuarioInput(
            email=str(data.email),
            senha_plana=data.senha
        )

        try:
            output = use_case.executar(input_data)
            
            # Gera o token de acesso injetando tenant_id e role obrigatórios
            access_token = criar_token_acesso(
                sub=str(output.usuario.id),
                tenant_id=str(output.usuario.tenant_id),
                role=output.usuario.role
            )
            
            return LoginResponse(access_token=access_token)
        except CredenciaisInvalidasException:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="E-mail ou senha incorretos."
            )
        except TenantSuspensoException as err:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=str(err)
            )
        except HTTPException:
            raise
        except Exception as err:
            err_str = str(err).lower()
            if any(term in err_str for term in ("does not exist", "undefinedcolumn", "no such column")):
                try:
                    from src.infrastructure.web.main import auto_heal_schema

                    auto_heal_schema()
                    db.rollback()
                    db.info["ignore_tenant_filter"] = True
                    output = use_case.executar(input_data)
                    access_token = criar_token_acesso(
                        sub=str(output.usuario.id),
                        tenant_id=str(output.usuario.tenant_id),
                        role=output.usuario.role
                    )
                    return LoginResponse(access_token=access_token)
                except Exception as retry_err:
                    print(f"Falha no auto-heal retry login: {retry_err}")

            import traceback
            traceback.print_exc()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro interno de autenticação: {err}"
            )
    finally:
        db.info.pop("ignore_tenant_filter", None)


@router.get("/me", response_model=UserResponse)
def get_me(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> UserResponse:
    """
    Retorna as informações do usuário autenticado no momento, incluindo módulos ativos e plano.
    """
    if current_user.role == "ADMIN_SAAS":
        plano = "ENTERPRISE"
        modulos_ativos = {k: True for k in CATALOGO_MODULOS}
    else:
        tenant_repo = RepositorioTenantSQLAlchemy(db)
        tenant = tenant_repo.obter_por_id(current_user.tenant_id)
        plano = tenant.plano if tenant else "PRO"
        modulos_custom = tenant.modulos_customizados if tenant and isinstance(tenant.modulos_customizados, dict) else {}
        modulos_ativos = obter_modulos_ativos_map(plano, modulos_custom)

    return UserResponse(
        id=current_user.id,
        nome=current_user.nome,
        email=current_user.email,
        role=current_user.role,
        tenant_id=current_user.tenant_id,
        loja_atribuida_id=current_user.loja_atribuida_id,
        plano=plano,
        modulos_ativos=modulos_ativos,
    )


@router.post("/alterar-senha", response_model=MensagemResponse)
@limiter.limit("5/minute")
def alterar_senha(
    request: Request,
    data: AlterarSenhaRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> MensagemResponse:
    """
    Permite ao usuário autenticado alterar sua própria senha de acesso.
    Valida a senha atual e assegura a complexidade da nova senha.
    """
    servico_cripto = BcryptServicoCriptografia()

    # Valida senha atual
    if not servico_cripto.verificar_senha(data.senha_atual, current_user.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A senha atual informada está incorreta.",
        )

    # Impede repetição imediata da mesma senha
    if data.senha_atual == data.nova_senha:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A nova senha deve ser diferente da senha atual.",
        )

    usuario_repo = RepositorioUsuarioSQLAlchemy(db)
    novo_hash = servico_cripto.gerar_hash(data.nova_senha)

    usuario_atualizado = replace(current_user, senha_hash=novo_hash)
    usuario_repo.salvar(usuario_atualizado)
    db.commit()

    return MensagemResponse(mensagem="Senha alterada com sucesso.")


@router.get("/usuarios", response_model=list[UserResponse])
def listar_usuarios(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> list[UserResponse]:
    """
    Lista todos os colaboradores/gerentes do Tenant do usuário logado.
    """
    usuario_repo = RepositorioUsuarioSQLAlchemy(db)
    usuarios = usuario_repo.listar_por_tenant(current_user.tenant_id)
    return [UserResponse.model_validate(u) for u in usuarios]


@router.post("/usuarios", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def criar_usuario_equipe(
    data: UsuarioCreateRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> UserResponse:
    """
    Permite ao DONO cadastrar novos GERENTES (vinculados a uma filial específica)
    ou co-administradores (DONO) no Tenant.
    """
    if current_user.role not in {"DONO", "ADMIN_SAAS"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas o proprietário (DONO) pode cadastrar novos colaboradores.",
        )

    if data.role == "ADMIN_SAAS" and current_user.role != "ADMIN_SAAS":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas super-administradores da plataforma podem conceder o perfil ADMIN_SAAS.",
        )

    loja_repo = RepositorioLojaSQLAlchemy(db)
    usuario_repo = RepositorioUsuarioSQLAlchemy(db)
    tenant_repo = RepositorioTenantSQLAlchemy(db)
    servico_cripto = BcryptServicoCriptografia()

    tenant = tenant_repo.obter_por_id(current_user.tenant_id)
    if tenant:
        total_usuarios = len(usuario_repo.listar_por_tenant(current_user.tenant_id))
        if total_usuarios >= tenant.limite_usuarios:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(LimitePlanoAtingidoException("usuários", tenant.limite_usuarios)),
            )

    if data.role == "GERENTE":
        if not data.loja_atribuida_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Usuários com perfil de GERENTE devem estar vinculados a uma loja física.",
            )
        loja = loja_repo.obter_por_id(data.loja_atribuida_id, current_user.tenant_id)
        if not loja:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(LojaNaoEncontradaException(str(data.loja_atribuida_id))),
            )

    try:
        db.info["ignore_tenant_filter"] = True
        email_normalizado = str(data.email).strip().lower()
        existente = usuario_repo.obter_por_email(email_normalizado)
        if existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"O e-mail '{email_normalizado}' já está em uso por outro usuário.",
            )

        novo_usuario = Usuario(
            nome=data.nome,
            email=email_normalizado,
            senha_hash=servico_cripto.gerar_hash(data.senha),
            role=data.role,
            tenant_id=current_user.tenant_id,
            loja_atribuida_id=data.loja_atribuida_id if data.role == "GERENTE" else None,
        )
        salvo = usuario_repo.salvar(novo_usuario)
        return UserResponse.model_validate(salvo)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )
    finally:
        db.info.pop("ignore_tenant_filter", None)

