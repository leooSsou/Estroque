"""adicionar_constraint_turno_aberto_caixa

Revision ID: e1f2a3b4c5d6
Revises: d7e8f9a0b1c2
Create Date: 2026-11-09 11:55:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'e1f2a3b4c5d6'
down_revision: Union[str, Sequence[str], None] = 'd7e8f9a0b1c2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # 1. SANEAMENTO PREVENTIVO (sem deletar nenhum registro):
    # Se existirem turnos que ficaram abertos duplicadamente no passado para a mesma loja,
    # fecha os mais antigos, mantendo apenas o mais recente ativo para não violar a constraint.
    if conn.dialect.name == "postgresql":
        conn.execute(sa.text("""
            UPDATE caixa_turnos 
            SET aberto = false, 
                observacao = COALESCE(observacao, '') || ' [Fechado por saneamento preventivo de concorrência]'
            WHERE aberto = true 
              AND id NOT IN (
                SELECT DISTINCT ON (loja_id) id 
                FROM caixa_turnos 
                WHERE aberto = true 
                ORDER BY loja_id, data_abertura DESC
              );
        """))

        # 2. CRIAÇÃO DO ÍNDICE ÚNICO PARCIAL:
        # Garante no motor do banco que cada loja física só possa ter NO MÁXIMO 1 turno com aberto = true.
        op.create_index(
            'uq_caixa_turno_aberto_por_loja',
            'caixa_turnos',
            ['loja_id'],
            unique=True,
            postgresql_where=sa.text('aberto = true')
        )
    else:
        # Fallback para SQLite em ambiente de teste
        try:
            op.create_index(
                'uq_caixa_turno_aberto_por_loja',
                'caixa_turnos',
                ['loja_id'],
                unique=True,
                sqlite_where=sa.text('aberto = 1')
            )
        except Exception:
            pass


def downgrade() -> None:
    op.drop_index('uq_caixa_turno_aberto_por_loja', table_name='caixa_turnos')
