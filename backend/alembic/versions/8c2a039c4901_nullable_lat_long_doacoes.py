"""nullable_lat_long_doacoes

Revision ID: 8c2a039c4901
Revises: 8597d83fe709
Create Date: 2026-05-24 20:06:21.254811

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8c2a039c4901'
down_revision: Union[str, None] = '8597d83fe709'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('doacoes') as batch_op:
        batch_op.alter_column('latitude',
                              existing_type=sa.FLOAT(),
                              nullable=True)
        batch_op.alter_column('longitude',
                              existing_type=sa.FLOAT(),
                              nullable=True)


def downgrade() -> None:
    with op.batch_alter_table('doacoes') as batch_op:
        batch_op.alter_column('longitude',
                              existing_type=sa.FLOAT(),
                              nullable=False)
        batch_op.alter_column('latitude',
                              existing_type=sa.FLOAT(),
                              nullable=False)
