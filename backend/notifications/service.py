"""Servico de notificacoes.

Substitui o triggerExpiryAlerts do frontend: deduplica por
(related_donation_id, user_type, category='expiry').
"""
import logging
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.models import (
    CategoriaNotificacao,
    Doacao,
    Notificacao,
    StatusDoacao,
    TipoUsuario,
    Usuario,
)

logger = logging.getLogger(__name__)


async def listar_notificacoes_usuario(
    db: AsyncSession,
    user_id: str,
    user_type: TipoUsuario,
    unread_only: bool = False,
    category: CategoriaNotificacao | None = None,
) -> list[Notificacao]:
    stmt = select(Notificacao).where(
        Notificacao.user_id == user_id,
        Notificacao.user_type == user_type,
    )
    if unread_only:
        stmt = stmt.where(Notificacao.read == False)  # noqa: E712
    if category is not None:
        stmt = stmt.where(Notificacao.category == category)
    stmt = stmt.order_by(Notificacao.timestamp.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def contar_nao_lidas(
    db: AsyncSession,
    user_id: str,
    user_type: TipoUsuario,
) -> int:
    from sqlalchemy import func
    result = await db.execute(
        select(func.count())
        .select_from(Notificacao)
        .where(
            Notificacao.user_id == user_id,
            Notificacao.user_type == user_type,
            Notificacao.read == False,  # noqa: E712
        )
    )
    return int(result.scalar() or 0)


async def marcar_lida(db: AsyncSession, notif_id: int) -> Notificacao | None:
    result = await db.execute(
        select(Notificacao).where(Notificacao.id == notif_id)
    )
    n = result.scalar_one_or_none()
    if n is None:
        return None
    n.read = True
    await db.commit()
    await db.refresh(n)
    return n


async def marcar_todas_lidas(
    db: AsyncSession,
    user_id: str,
    user_type: TipoUsuario,
) -> int:
    from sqlalchemy import update
    result = await db.execute(
        update(Notificacao)
        .where(
            Notificacao.user_id == user_id,
            Notificacao.user_type == user_type,
            Notificacao.read == False,  # noqa: E712
        )
        .values(read=True)
        .execution_options(synchronize_session=False)
    )
    await db.commit()
    return int(result.rowcount or 0)


async def _ja_existe_expiry(
    db: AsyncSession,
    doacao_id: int,
    user_type: TipoUsuario,
) -> bool:
    """True se ja existe uma notif de expiry para esta doacao+user_type."""
    result = await db.execute(
        select(Notificacao.id).where(
            Notificacao.related_donation_id == doacao_id,
            Notificacao.user_type == user_type,
            Notificacao.category == CategoriaNotificacao.expiry,
        )
    )
    return result.scalar_one_or_none() is not None


async def _resolver_user_id(
    db: AsyncSession,
    doacao: Doacao,
    user_type: TipoUsuario,
) -> str | None:
    """Retorna o user_id (str) do destinatario.

    Para 'ngo' usa o id da ONG (string) e para 'doador' usa o doador_id
    (string). Para 'admin' usa 'admin'.
    """
    if user_type == TipoUsuario.doador:
        return str(doacao.doador_id)
    if user_type == TipoUsuario.ong:
        return str(doacao.ong_matched_id) if doacao.ong_matched_id else None
    if user_type == TipoUsuario.admin:
        return "admin"
    return None


async def trigger_expiry_alerts(db: AsyncSession) -> int:
    """Varre doacoes proximas do vencimento (3 dias) e gera notificacoes.

    Deduplica por (doacao_id, user_type, category=expiry).
    Nao gera notif para doacoes canceladas.
    Retorna o numero de notificacoes criadas.
    """
    hoje = date.today()
    result = await db.execute(
        select(Doacao).where(
            Doacao.data_validade.isnot(None),
            Doacao.status != StatusDoacao.cancelado,
        )
    )
    doacoes = list(result.scalars().all())
    criadas = 0

    for d in doacoes:
        diff = (d.data_validade - hoje).days
        if diff > 3:
            continue

        urgencia_label = (
            "vence HOJE" if diff <= 0
            else "vence em 1 dia" if diff == 1
            else f"vence em {diff} dias"
        )
        severity = (
            "CRÍTICO" if diff <= 0
            else "ALTO" if diff <= 2
            else "MÉDIO"
        )

        for user_type in (TipoUsuario.ong, TipoUsuario.doador):
            if await _ja_existe_expiry(db, d.id, user_type):
                continue
            user_id = await _resolver_user_id(db, d, user_type)
            if not user_id:
                continue

            if user_type == TipoUsuario.ong:
                title = f"[{severity}] Alerta de Vencimento - {d.tipo_alimento}"
                msg = (
                    f"Doação de {d.tipo_alimento} ({d.quantidade} "
                    f"{d.unidade_medida or 'kg'}) {urgencia_label}. "
                    "Prioridade máxima de coleta."
                )
            else:
                title = f"[{severity}] Sua doação está vencendo - {d.tipo_alimento}"
                msg = (
                    f"Sua doação de {d.tipo_alimento} ({d.quantidade} "
                    f"{d.unidade_medida or 'kg'}) {urgencia_label}. "
                    "Entre em contato com a ONG para agilizar a coleta."
                )

            db.add(
                Notificacao(
                    user_id=user_id,
                    user_type=user_type,
                    title=title,
                    message=msg,
                    category=CategoriaNotificacao.expiry,
                    related_donation_id=d.id,
                    read=False,
                )
            )
            criadas += 1

    if criadas:
        await db.commit()
    logger.info("trigger_expiry_alerts: %d notificacao(oes) criada(s)", criadas)
    return criadas
