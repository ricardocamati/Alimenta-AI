"""add_notificacoes_ong_prefs_app_config

Revision ID: a1b2c3d4e5f6
Revises: f6db5939b74b
Create Date: 2026-06-08 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'f6db5939b74b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ongs: preferencias de coleta
    op.add_column('ongs', sa.Column('pickup_radius', sa.Float(), nullable=True))
    op.add_column('ongs', sa.Column('accepted_food_types', sa.Text(), nullable=True))
    op.add_column('ongs', sa.Column('pickup_schedule', sa.String(length=200), nullable=True))

    # app_config: persistencia chave/valor (pesos ML, data de retreinamento)
    op.create_table(
        'app_config',
        sa.Column('chave', sa.String(length=100), nullable=False),
        sa.Column('valor', sa.Text(), nullable=True),
        sa.Column('atualizado_em', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.PrimaryKeyConstraint('chave'),
    )

    # notificacoes
    op.create_table(
        'notificacoes',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.String(length=50), nullable=False),
        sa.Column('user_type', sa.Enum('doador', 'ong', 'admin', name='notif_user_type_enum'), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('category', sa.Enum('expiry', 'scarcity', 'status', 'system', name='notif_category_enum'), nullable=False),
        sa.Column('related_donation_id', sa.Integer(), nullable=True),
        sa.Column('read', sa.Boolean(), server_default=sa.text('0'), nullable=False),
        sa.Column('timestamp', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['related_donation_id'], ['doacoes.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_notificacoes_user_id'), 'notificacoes', ['user_id'], unique=False)
    op.create_index(op.f('ix_notificacoes_read'), 'notificacoes', ['read'], unique=False)
    op.create_index(op.f('ix_notificacoes_related_donation_id'), 'notificacoes', ['related_donation_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_notificacoes_related_donation_id'), table_name='notificacoes')
    op.drop_index(op.f('ix_notificacoes_read'), table_name='notificacoes')
    op.drop_index(op.f('ix_notificacoes_user_id'), table_name='notificacoes')
    op.drop_table('notificacoes')
    op.drop_table('app_config')
    op.drop_column('ongs', 'pickup_schedule')
    op.drop_column('ongs', 'accepted_food_types')
    op.drop_column('ongs', 'pickup_radius')
