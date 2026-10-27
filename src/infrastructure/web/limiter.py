import os

from slowapi import Limiter
from slowapi.util import get_remote_address

# Detecta se estamos rodando na suíte de testes unitários ou integração
is_testing = os.getenv("TESTING", "False").lower() in ("true", "1")

if is_testing:
    storage_uri = "memory://"
else:
    redis_url = os.getenv("REDIS_URL")
    if redis_url:
        storage_uri = redis_url
    else:
        default_host = "memory" if os.getenv("RENDER") else "redis"
        redis_host = os.getenv("REDIS_HOST", default_host)
        redis_port = os.getenv("REDIS_PORT", "6379")
        if redis_host in ("memory", "none", ""):
            storage_uri = "memory://"
        else:
            storage_uri = f"redis://{redis_host}:{redis_port}"

# Instanciação do limitador global
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=storage_uri,
    storage_options={"socket_connect_timeout": 2},
    enabled=not is_testing,
)
