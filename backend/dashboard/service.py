import logging

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from database.models import Doacao, ONG, StatusDoacao, TipoUsuario, Urgencia, Usuario
from dashboard.schemas import (
    DashboardAdmin,
    DashboardDoador,
    DashboardONG,
    DoacaoResumo,
    TopDoador,
    TopOng,
)
from ml.demand_predictor import DemandPredictor

logger = logging.getLogger(__name__)

__all__ = [
    "get_doador_dashboard",
    "get_ong_dashboard",
    "get_admin_dashboard",
]


async def _tempo_medio_coleta(
    db: AsyncSession, where_clause
) -> float | None:
    result = await db.execute(
        select(Doacao.criado_em, Doacao.atualizado_em).where(where_clause)
    )
    horas = []
    for criado_em, atualizado_em in result.all():
        delta = (atualizado_em - criado_em).total_seconds() / 3600
        horas.append(delta)
    return round(sum(horas) / len(horas), 2) if horas else None


def _distribuicao_urgencia_base() -> dict[str, int]:
    return {
        Urgencia.baixa.value: 0,
        Urgencia.media.value: 0,
        Urgencia.alta.value: 0,
        Urgencia.critica.value: 0,
    }


async def _ultimas_doacoes(
    db: AsyncSession, where_clause
) -> list[DoacaoResumo]:
    result = await db.execute(
        select(
            Doacao.id,
            Doacao.tipo_alimento,
            Doacao.urgencia,
            Doacao.status,
            Doacao.criado_em,
        )
        .where(where_clause)
        .order_by(Doacao.criado_em.desc())
        .limit(5)
    )
    return [
        DoacaoResumo(
            id=r.id,
            tipo_alimento=r.tipo_alimento,
            urgencia=r.urgencia,
            status=r.status,
            criado_em=r.criado_em,
        )
        for r in result.all()
    ]


async def get_doador_dashboard(db: AsyncSession, user: Usuario) -> DashboardDoador:
    uid = user.id

    total_doacoes = await db.scalar(
        select(func.count()).select_from(Doacao).where(Doacao.doador_id == uid)
    ) or 0

    confirmadas = await db.scalar(
        select(func.count())
        .select_from(Doacao)
        .where(Doacao.doador_id == uid, Doacao.status == StatusDoacao.confirmado)
    ) or 0

    canceladas = await db.scalar(
        select(func.count())
        .select_from(Doacao)
        .where(Doacao.doador_id == uid, Doacao.status == StatusDoacao.cancelado)
    ) or 0

    taxa = round(confirmadas / total_doacoes, 4) if total_doacoes > 0 else 0.0

    tempo_medio = (
        await _tempo_medio_coleta(
            db,
            (Doacao.doador_id == uid) & (Doacao.status == StatusDoacao.confirmado),
        )
        if confirmadas > 0
        else None
    )

    urg_result = await db.execute(
        select(Doacao.urgencia, func.count())
        .where(Doacao.doador_id == uid)
        .group_by(Doacao.urgencia)
    )
    distribuicao = _distribuicao_urgencia_base()
    for urgencia, cnt in urg_result.all():
        distribuicao[urgencia.value] = cnt

    ultimas = await _ultimas_doacoes(db, Doacao.doador_id == uid)

    return DashboardDoador(
        total_doacoes=total_doacoes,
        doacoes_confirmadas=confirmadas,
        doacoes_canceladas=canceladas,
        taxa_aproveitamento=taxa,
        tempo_medio_coleta_horas=tempo_medio,
        distribuicao_urgencia=distribuicao,
        ultimas_doacoes=ultimas,
    )


async def get_ong_dashboard(db: AsyncSession, user: Usuario) -> DashboardONG:
    ong_id = user.ong.id if user.ong else 0

    recebidas = await db.scalar(
        select(func.count())
        .select_from(Doacao)
        .where(
            Doacao.ong_matched_id == ong_id,
            Doacao.status == StatusDoacao.confirmado,
        )
    ) or 0

    pendentes = await db.scalar(
        select(func.count())
        .select_from(Doacao)
        .where(
            Doacao.ong_matched_id == ong_id,
            Doacao.status == StatusDoacao.notificado,
        )
    ) or 0

    demanda_prevista = DemandPredictor.predict_demand(ong_id)

    media_qtd = await db.scalar(
        select(func.avg(Doacao.quantidade))
        .select_from(Doacao)
        .where(
            Doacao.ong_matched_id == ong_id,
            Doacao.status == StatusDoacao.confirmado,
        )
    )
    media_qtd = round(float(media_qtd), 2) if media_qtd else 0.0
    alerta = demanda_prevista > media_qtd * 1.3 if media_qtd > 0 else False

    cat_result = await db.execute(
        select(Doacao.categoria, func.count())
        .where(
            Doacao.ong_matched_id == ong_id,
            Doacao.status == StatusDoacao.confirmado,
        )
        .group_by(Doacao.categoria)
    )
    distribuicao_categorias = {r[0]: r[1] for r in cat_result.all()}

    ultimas = await _ultimas_doacoes(
        db,
        (Doacao.ong_matched_id == ong_id) & (Doacao.status == StatusDoacao.confirmado),
    )

    return DashboardONG(
        total_doacoes_recebidas=recebidas,
        demanda_prevista_proxima_semana=demanda_prevista,
        alerta_escassez=alerta,
        doacoes_pendentes=pendentes,
        distribuicao_categorias=distribuicao_categorias,
        ultimas_doacoes=ultimas,
    )


async def get_admin_dashboard(db: AsyncSession, user: Usuario) -> DashboardAdmin:
    total_usuarios = await db.scalar(
        select(func.count()).select_from(Usuario)
    ) or 0

    total_doacoes = await db.scalar(
        select(func.count()).select_from(Doacao)
    ) or 0

    total_ongs = await db.scalar(
        select(func.count()).select_from(ONG)
    ) or 0

    confirmadas = await db.scalar(
        select(func.count())
        .select_from(Doacao)
        .where(Doacao.status == StatusDoacao.confirmado)
    ) or 0

    taxa = round(confirmadas / total_doacoes, 4) if total_doacoes > 0 else 0.0

    tempo_medio = (
        await _tempo_medio_coleta(db, Doacao.status == StatusDoacao.confirmado)
        if confirmadas > 0
        else None
    )

    status_result = await db.execute(
        select(Doacao.status, func.count())
        .group_by(Doacao.status)
        .order_by(func.count().desc())
    )
    doacoes_por_status = {
        r[0].value: r[1]
        for r in status_result.all()
        if r[0] is not None
    }

    urg_result = await db.execute(
        select(Doacao.urgencia, func.count())
        .group_by(Doacao.urgencia)
    )
    doacoes_por_urgencia = {r[0].value: r[1] for r in urg_result.all() if r[0] is not None}

    top_doadores_result = await db.execute(
        select(
            Usuario.nome,
            func.count(Doacao.id).label("total"),
            func.sum(
                case((Doacao.status == StatusDoacao.confirmado, 1), else_=0)
            ).label("confirmadas"),
        )
        .join(Doacao, Usuario.id == Doacao.doador_id)
        .where(Usuario.tipo == TipoUsuario.doador)
        .group_by(Usuario.id)
        .order_by(func.count(Doacao.id).desc())
        .limit(5)
    )
    top_5_doadores = []
    for nome, total, conf in top_doadores_result.all():
        tx = round(conf / total, 4) if total > 0 else 0.0
        top_5_doadores.append(
            TopDoador(nome=nome, total_doacoes=total, taxa_aproveitamento=tx)
        )

    top_ongs_result = await db.execute(
        select(
            Usuario.nome,
            func.count(Doacao.id).label("total"),
            ONG.id.label("ong_id"),
        )
        .join(ONG, Usuario.id == ONG.usuario_id)
        .join(Doacao, ONG.id == Doacao.ong_matched_id)
        .where(Doacao.status == StatusDoacao.confirmado)
        .group_by(ONG.id)
        .order_by(func.count(Doacao.id).desc())
        .limit(5)
    )
    top_5_ongs = []
    for nome, total, oid in top_ongs_result.all():
        dp = DemandPredictor.predict_demand(oid)
        top_5_ongs.append(
            TopOng(nome=nome, total_recebido=total, demanda_prevista=dp)
        )

    return DashboardAdmin(
        total_usuarios=total_usuarios,
        total_doacoes=total_doacoes,
        total_ongs=total_ongs,
        taxa_aproveitamento_geral=taxa,
        tempo_medio_coleta_horas=tempo_medio,
        doacoes_por_status=doacoes_por_status,
        doacoes_por_urgencia=doacoes_por_urgencia,
        top_5_doadores=top_5_doadores,
        top_5_ongs=top_5_ongs,
    )
