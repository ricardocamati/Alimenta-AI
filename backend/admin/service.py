"""Servicos administrativos."""
import json
import logging
import subprocess
import sys
from datetime import datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from admin.schemas import (
    AuditLogResponse,
    OngAdminResponse,
    UserAdminResponse,
    WeightsResponse,
    WeightsUpdate,
)
from database.models import AppConfig, LogAFD, ONG, ONG as ONGModel, Usuario

logger = logging.getLogger(__name__)

WEIGHTS_KEY = "ml_weights"
RETRAINED_KEY = "ml_retrained_at"
DEFAULT_WEIGHTS = {"urgency": 0.45, "demand": 0.35, "distance": 0.20}


async def _get_config(db: AsyncSession, chave: str) -> str | None:
    result = await db.execute(select(AppConfig).where(AppConfig.chave == chave))
    row = result.scalar_one_or_none()
    return row.valor if row else None


async def _set_config(db: AsyncSession, chave: str, valor: str) -> None:
    result = await db.execute(select(AppConfig).where(AppConfig.chave == chave))
    row = result.scalar_one_or_none()
    if row is None:
        db.add(AppConfig(chave=chave, valor=valor))
    else:
        row.valor = valor
    await db.commit()


async def get_weights(db: AsyncSession) -> WeightsResponse:
    raw = await _get_config(db, WEIGHTS_KEY)
    if raw:
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            data = DEFAULT_WEIGHTS
    else:
        data = DEFAULT_WEIGHTS
    updated_at_raw = await _get_config(db, RETRAINED_KEY)
    updated_at = None
    if updated_at_raw:
        try:
            updated_at = datetime.fromisoformat(updated_at_raw)
        except ValueError:
            updated_at = None
    return WeightsResponse(
        urgency=float(data.get("urgency", DEFAULT_WEIGHTS["urgency"])),
        demand=float(data.get("demand", DEFAULT_WEIGHTS["demand"])),
        distance=float(data.get("distance", DEFAULT_WEIGHTS["distance"])),
        updated_at=updated_at,
    )


async def set_weights(db: AsyncSession, weights: WeightsUpdate) -> WeightsResponse:
    payload = {"urgency": weights.urgency, "demand": weights.demand, "distance": weights.distance}
    await _set_config(db, WEIGHTS_KEY, json.dumps(payload))
    return await get_weights(db)


async def trigger_retrain(db: AsyncSession) -> dict:
    """Roda os scripts de treino dos modelos ML e atualiza o timestamp."""
    backend_dir = Path(__file__).resolve().parent.parent
    scripts = ["ml.train_urgency_model", "ml.train_demand_model"]
    results: list[dict] = []
    for script in scripts:
        try:
            proc = subprocess.run(
                [sys.executable, "-m", script],
                cwd=backend_dir,
                capture_output=True,
                text=True,
                timeout=300,
            )
            results.append({
                "script": script,
                "returncode": proc.returncode,
                "stderr_tail": proc.stderr[-500:] if proc.stderr else "",
            })
        except Exception as e:
            logger.exception("Falha ao rodar %s", script)
            results.append({"script": script, "error": str(e)})

    now = datetime.utcnow().isoformat()
    await _set_config(db, RETRAINED_KEY, now)

    try:
        from ml.predictor import init_predictor
        from ml.demand_predictor import init_demand_predictor
        init_predictor()
        init_demand_predictor()
    except Exception:
        logger.exception("Falha ao reinicializar preditores apos retreino")

    return {"treinados_em": now, "scripts": results}


async def listar_usuarios(db: AsyncSession) -> list[UserAdminResponse]:
    result = await db.execute(
        select(Usuario).order_by(Usuario.criado_em.desc())
    )
    items: list[UserAdminResponse] = []
    for u in result.scalars().all():
        items.append(
            UserAdminResponse(
                id=u.id,
                nome=u.nome,
                email=u.email,
                tipo=u.tipo.value,
                cpf_cnpj=u.cpf_cnpj,
                criado_em=u.criado_em,
                ong_id=u.ong.id if u.ong else None,
            )
        )
    return items


async def listar_ongs(db: AsyncSession) -> list[OngAdminResponse]:
    result = await db.execute(
        select(ONG, Usuario.nome)
        .join(Usuario, Usuario.id == ONG.usuario_id)
        .order_by(ONG.id)
    )
    items: list[OngAdminResponse] = []
    for ong, nome in result.all():
        items.append(
            OngAdminResponse(
                id=ong.id,
                usuario_id=ong.usuario_id,
                cnpj=ong.cnpj,
                capacidade_atendimento=ong.capacidade_atendimento,
                latitude=ong.latitude,
                longitude=ong.longitude,
                pickup_radius=ong.pickup_radius,
                accepted_food_types=ong.accepted_food_types,
                pickup_schedule=ong.pickup_schedule,
                usuario_nome=nome,
            )
        )
    return items


async def listar_audit_logs(
    db: AsyncSession, limit: int = 50, offset: int = 0
) -> list[AuditLogResponse]:
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(LogAFD)
        .options(selectinload(LogAFD.doacao))
        .order_by(LogAFD.timestamp.desc())
        .offset(offset)
        .limit(limit)
    )
    items: list[AuditLogResponse] = []
    for log in result.scalars().all():
        items.append(
            AuditLogResponse(
                id=log.id,
                doacao_id=log.doacao_id,
                estado_anterior=log.estado_anterior,
                estado_novo=log.estado_novo,
                timestamp=log.timestamp,
                descricao=log.descricao,
                doacao_nome=log.doacao.tipo_alimento if log.doacao else None,
            )
        )
    return items
