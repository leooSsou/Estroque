from abc import ABC, abstractmethod
from uuid import UUID

from src.domain.entities.usuario import Usuario


class UsuarioRepository(ABC):
    """
    Interface/Contrato abstrato para persistência de Usuários.
    """
    
    @abstractmethod
    def salvar(self, usuario: Usuario) -> Usuario:
        """
        Salva ou atualiza um Usuário na persistência.
        Retorna a entidade salva (com ID se aplicável).
        """

    @abstractmethod
    def obter_por_email(self, email: str) -> Usuario | None:
        """
        Busca um Usuário cadastrado pelo e-mail.
        """

    @abstractmethod
    def obter_por_id(self, id: UUID) -> Usuario | None:
        """
        Busca um Usuário cadastrado pelo ID.
        """
