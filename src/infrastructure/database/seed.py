"""
Script idempotente para popular dados iniciais do ambiente de desenvolvimento.
Cria o Tenant Matriz, Loja principal e os usuários padrão de demonstração.
"""
import sys
from uuid import uuid4

from src.infrastructure.database.models import LojaModel, TenantModel, UsuarioModel
from src.infrastructure.database.session import SessionLocal
from src.infrastructure.security.password import gerar_hash_senha


def seed() -> None:
    session = SessionLocal()
    try:
        # Permite operações globais de bootstrapping
        session.info["ignore_tenant_filter"] = True

        # 1. Tenant padrão
        tenant_cnpj = "12345678000199"
        tenant = session.query(TenantModel).filter_by(cnpj=tenant_cnpj).first()
        if not tenant:
            tenant = TenantModel(
                id=uuid4(),
                nome_fantasia="Estroque Matriz",
                razao_social="Estroque Tecnologia Ltda",
                cnpj=tenant_cnpj,
            )
            session.add(tenant)
            session.flush()
            print(f"✓ Tenant criado: {tenant.nome_fantasia} ({tenant.id})")
        else:
            print(f"• Tenant já existente: {tenant.nome_fantasia} ({tenant.id})")

        # Configura tenant_id para as entidades vinculadas
        session.info["tenant_id"] = tenant.id

        # 2. Loja principal
        loja_cnpj = "12345678000199"
        loja = session.query(LojaModel).filter_by(cnpj=loja_cnpj).first()
        if not loja:
            loja = LojaModel(
                id=uuid4(),
                tenant_id=tenant.id,
                nome="Matriz Central",
                cnpj=loja_cnpj,
                endereco="Av. Paulista, 1000 - São Paulo, SP",
                ativo=True,
            )
            session.add(loja)
            session.flush()
            print(f"✓ Loja criada: {loja.nome} ({loja.id})")
        else:
            print(f"• Loja já existente: {loja.nome} ({loja.id})")

        # 3. Usuários demo
        usuarios_padrao = [
            {
                "email": "dono@estroque.com.br",
                "nome": "Dono Demo",
                "senha": "senha123",
                "role": "DONO",
            },
            {
                "email": "admin@estroque.app",
                "nome": "Administrador Demo",
                "senha": "admin123",
                "role": "ADMIN",
            },
        ]

        for u in usuarios_padrao:
            user = session.query(UsuarioModel).filter_by(email=u["email"]).first()
            if not user:
                user = UsuarioModel(
                    id=uuid4(),
                    tenant_id=tenant.id,
                    nome=u["nome"],
                    email=u["email"],
                    senha_hash=gerar_hash_senha(u["senha"]),
                    role=u["role"],
                    loja_atribuida_id=loja.id,
                )
                session.add(user)
                session.flush()
                print(f"✓ Usuário criado: {u['email']} (role: {u['role']})")
            else:
                print(f"• Usuário já existente: {u['email']}")

        session.commit()
        print("\n🎉 Seed concluído com sucesso!")
    except Exception as exc:
        session.rollback()
        print(f"❌ Erro durante o seed: {exc}", file=sys.stderr)
        raise
    finally:
        session.close()


if __name__ == "__main__":
    seed()
