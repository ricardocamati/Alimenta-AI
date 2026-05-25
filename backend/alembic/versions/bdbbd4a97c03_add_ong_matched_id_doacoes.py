"""add_ong_matched_id_doacoes

Revision ID: bdbbd4a97c03
Revises: 8c2a039c4901
Create Date: 2026-05-25 18:58:40.706241

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bdbbd4a97c03'
down_revision: Union[str, None] = '8c2a039c4901'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('doacoes') as batch_op:
        batch_op.add_column(
            sa.Column('ong_matched_id', sa.Integer(), nullable=True)
        )
        batch_op.create_foreign_key(
            'fk_doacoes_ong_matched',
            'ongs',
            ['ong_matched_id'],
            ['id'],
            ondelete='SET NULL',
        )


def downgrade() -> None:
    with op.batch_alter_table('doacoes') as batch_op:
        batch_op.drop_constraint('fk_doacoes_ong_matched', type_='foreignkey')
        batch_op.drop_column('ong_matched_id')
