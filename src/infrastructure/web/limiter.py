import os
import socket

from slowapi import Limiter
from slowapi.util import get_remote_address

is_testing = os.getenv("TESTING", "False").lower() in ("true", "1")
redis_url = os.getenv("REDIS_URL", "")
redis_host = os.getenv("REDIS_HOST", "")
redis_port = os.getenv("REDIS_PORT", "6379")

storage_uri = "memory://"

if not is_testing:
    if redis_url and not redis_url.startswith("memory:"):
        storage_uri = redis_url
    elif redis_host and redis_host != "memory":
        try:
            socket.gethostbyname(redis_host)
            storage_uri = f"redis://{redis_host}:{redis_port}"
        except OSError:
            storage_uri = "memory://"

# Instanciação do limitador global com fallback transparente para memória
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=storage_uri,
    storage_options={"socket_connect_timeout": 2},
    enabled=True,
)
