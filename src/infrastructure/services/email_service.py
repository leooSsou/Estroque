import logging
from abc import ABC, abstractmethod

logger = logging.getLogger("email_service")

class EmailService(ABC):
    """
    Contrato para envio de e-mails do sistema.
    """
    @abstractmethod
    def enviar_email(self, destinatario: str, assunto: str, html_content: str) -> bool:
        pass

class ConsoleEmailService(EmailService):
    """
    Serviço de e-mail mock/console para desenvolvimento e suíte de testes.
    """
    emails_enviados = []

    def enviar_email(self, destinatario: str, assunto: str, html_content: str) -> bool:
        logger.info(f"[EmailService] E-mail enviado para: {destinatario} | Assunto: {assunto}")
        self.emails_enviados.append({
            "destinatario": destinatario,
            "assunto": assunto,
            "html_content": html_content
        })
        return True
