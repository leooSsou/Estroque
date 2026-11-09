"""habilitar_rls_postgresql_neon

Revision ID: d7e8f9a0b1c2
Revises: c1a2b3d4e5f6
Create Date: 2026-11-09 11:20:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'd7e8f9a0b1c2'
down_revision: Union[str, Sequence[str], None] = 'c1a2b3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABELAS_COM_TENANT_ID = [
    'usuarios',
    'lojas',
    'produtos',
    'clientes',
    'fornecedores',
    'estoque_saldos',
    'estoque_movimentacoes',
    'transferencias_estoque',
    'auditorias_fisicas',
    'vendas',
    'pagamentos_venda',
    'itens_venda',
    'financeiro_lancamentos',
    'devolucoes',
    'itens_devolucao',
    'caixa_turnos',
    'caixa_operacoes',
]


def upgrade() -> None:
    """
    SEC-07: Habilita Row Level Security (RLS) nativo no PostgreSQL/Neon
    com políticas restritivas por tenant e bypass para SuperAdmin.
    """
    bind = op.get_bind()
    if bind.dialect.name != 'postgresql':
        return

    # 1. Habilita RLS na tabela de tenants
    op.execute("ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;")
    op.execute("DROP POLICY IF EXISTS tenant_self_isolation_policy ON tenants;")
    op.execute("""
        CREATE POLICY tenant_self_isolation_policy ON tenants
        AS PERMISSIVE
        FOR ALL
        USING (
            current_setting('app.is_admin_saas', true) = 'true'
            OR id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        )
        WITH CHECK (
            current_setting('app.is_admin_saas', true) = 'true'
            OR id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        );
    """)

    # 2. Habilita RLS em todas as tabelas com tenant_id
    for tabela in TABELAS_COM_TENANT_ID:
        op.execute(f"ALTER TABLE {tabela} ENABLE ROW LEVEL SECURITY;")
        op.execute(f"DROP POLICY IF EXISTS {tabela}_tenant_isolation_policy ON {tabela};")
        op.execute(f"""
            CREATE POLICY {tabela}_tenant_isolation_policy ON {tabela}
            AS PERMISSIVE
            FOR ALL
            USING (
                current_setting('app.is_admin_saas', true) = 'true'
                OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
            )
            WITH CHECK (
                current_setting('app.is_admin_saas', true) = 'true'
                OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
            );
        """)


def downgrade() -> None:
    """Desabilita Row Level Security."""
    bind = op.get_bind()
    if bind.dialect.name != 'postgresql':
        return

    for tabela in TABELAS_COM_TENANT_ID:
        op.execute(f"DROP POLICY IF EXISTS {tabela}_tenant_isolation_policy ON {tabela};")
        op.execute(f"ALTER TABLE {tabela} DISABLE ROW LEVEL SECURITY;")

    op.execute("DROP POLICY IF EXISTS tenant_self_isolation_policy ON tenants;")
    op.execute("ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;")
