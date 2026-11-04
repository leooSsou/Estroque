"""criar_tabela_planos_config

Revision ID: 0a1caaa86939
Revises: b8c9d0e1f2a3
Create Date: 2026-11-04 11:57:27.236278

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '0a1caaa86939'
down_revision: Union[str, Sequence[str], None] = 'b8c9d0e1f2a3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    planos_config_table = op.create_table(
        'planos_config',
        sa.Column('id', sa.String(length=20), primary_key=True),
        sa.Column('nome', sa.String(length=50), nullable=False),
        sa.Column('descricao', sa.String(length=100), nullable=False),
        sa.Column('preco_mensal', sa.Float(), nullable=False),
        sa.Column('limite_lojas', sa.Integer(), nullable=False),
        sa.Column('limite_usuarios', sa.Integer(), nullable=False),
        sa.Column('recursos', sa.JSON(), nullable=False),
        sa.Column('badge_variant', sa.String(length=20), nullable=False, server_default='neutral'),
        sa.Column('destaque', sa.Boolean(), nullable=False, server_default='false'),
    )

    op.bulk_insert(
        planos_config_table,
        [
            {
                'id': 'STARTER',
                'nome': 'Starter',
                'descricao': 'Pequenos comércios',
                'preco_mensal': 99.0,
                'limite_lojas': 1,
                'limite_usuarios': 2,
                'recursos': [
                    'Até 1 filial (loja matriz)',
                    'Até 2 colaboradores',
                    'PDV e Frente de Caixa',
                    'Gestão Básica de Produtos e Estoque',
                ],
                'badge_variant': 'neutral',
                'destaque': False,
            },
            {
                'id': 'PRO',
                'nome': 'Pro (Mais Popular)',
                'descricao': 'Empresas em expansão',
                'preco_mensal': 249.0,
                'limite_lojas': 5,
                'limite_usuarios': 10,
                'recursos': [
                    'Até 5 filiais integradas',
                    'Até 10 colaboradores',
                    'Transferências de Estoque entre lojas',
                    'Entrada e Importação de NF-e',
                    'Emissão de Vendas e PDV Avançado',
                ],
                'badge_variant': 'purple',
                'destaque': True,
            },
            {
                'id': 'ENTERPRISE',
                'nome': 'Enterprise',
                'descricao': 'Grandes redes e franquias',
                'preco_mensal': 799.0,
                'limite_lojas': 50,
                'limite_usuarios': 100,
                'recursos': [
                    'Até 50 filiais',
                    'Até 100 colaboradores',
                    'Curva ABC e Inteligência de Estoque',
                    'Auditorias físicas com Ledger em tempo real',
                    'Suporte prioritário e limites escaláveis',
                ],
                'badge_variant': 'emerald',
                'destaque': False,
            },
        ],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('planos_config')
