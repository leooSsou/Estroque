import os
from datetime import datetime, timedelta, timezone
from typing import Any

from dotenv import load_dotenv
from jose import JWTError, jwt
from jose.exceptions import ExpiredSignatureError

load_dotenv()

# Carrega variáveis de ambiente ou falha fechado por segurança
ENVIRONMENT = os.getenv("ENVIRONMENT", os.getenv("ENV", "development")).lower()
is_production = ENVIRONMENT in {"production", "prod"}

INSECURE_DEV_SECRETS = {
    "saas_super_secret_dev_key_12345!",
    "sua_chave_secreta_super_segura_local_12345",
}

_secret = os.getenv("JWT_SECRET_KEY") or os.getenv("JWT_SECRET")

# Falhar fechado: JWT_SECRET_KEY é obrigatória em qualquer ambiente
if not _secret:
    raise RuntimeError(
        "CRITICAL: JWT_SECRET_KEY não foi informada nas variáveis de ambiente. "
        "A aplicação recusa iniciar sem uma chave secreta definida."
    )

if is_production and _secret in INSECURE_DEV_SECRETS:
    raise RuntimeError(
        "CRITICAL: JWT_SECRET_KEY de desenvolvimento não pode ser usada em produção."
    )

SECRET_KEY = _secret
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

def criar_token_acesso(
    sub: str,
    tenant_id: str,
    role: str,
    tempo_expiracao: timedelta | None = None,
    claims_extras: dict[str, Any] | None = None,
) -> str:
    """
    Gera um token de acesso JWT tipado contendo sub, tenant_id e role.
    
    Args:
        sub (str): Identificação única do usuário (geralmente e-mail ou UUID).
        tenant_id (str): Identificador do inquilino (tenant) associado.
        role (str): Papel/Função de permissão do usuário.
        tempo_expiracao (timedelta, optional): Tempo customizado para expiração.
        claims_extras (dict[str, Any], optional): Claims adicionais personalizadas.
        
    Returns:
        str: Token JWT codificado.
    """
    agora = datetime.now(timezone.utc)
    
    if tempo_expiracao:
        expiracao = agora + tempo_expiracao
    else:
        expiracao = agora + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
    payload = {
        "sub": sub,
        "tenant_id": tenant_id,
        "role": role,
        "iat": agora,
        "exp": expiracao
    }
    
    if claims_extras:
        payload.update(claims_extras)
        
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decodificar_token_acesso(token: str) -> dict[str, Any]:
    """
    Decodifica e valida o token JWT de acesso.
    
    Args:
        token (str): O token JWT recebido no header de autorização.
        
    Returns:
        dict[str, Any]: O payload decodificado contendo as claims.
        
    Raises:
        ValueError: Caso o token seja inválido, expirado ou esteja com formato incorreto.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Validação de claims obrigatórias para o SaaS
        if "tenant_id" not in payload:
            raise ValueError("O token não possui a claim obrigatória 'tenant_id'.")
        if "role" not in payload:
            raise ValueError("O token não possui a claim obrigatória 'role'.")
            
        return payload
    except ExpiredSignatureError:
        raise ValueError("O token de acesso expirou.")
    except JWTError as e:
        raise ValueError(f"Token inválido: {e!s}")
