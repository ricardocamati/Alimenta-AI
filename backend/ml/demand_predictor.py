import logging
import os

import joblib
import pandas as pd
from statsforecast import StatsForecast

logger = logging.getLogger(__name__)

_MODEL_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "models", "demand_model.pkl"
)

_sf: StatsForecast | None = None
_demand_cache: dict[str, float] = {}
_fallback_mean: float = 120.0


def _load_and_cache() -> None:
    global _sf, _demand_cache, _fallback_mean
    try:
        _sf = joblib.load(_MODEL_PATH)
        logger.info("DemandPredictor carregado: %s", _MODEL_PATH)

        forecast = _sf.predict(h=1)
        _demand_cache = {}

        for _, row in forecast.iterrows():
            uid = str(row["unique_id"])
            val = round(float(row["AutoETS"]), 1)
            _demand_cache[uid] = val

        if _demand_cache:
            _fallback_mean = sum(_demand_cache.values()) / len(_demand_cache)

        logger.info(
            "DemandPredictor cache: %d ONGs, fallback=%.1f",
            len(_demand_cache),
            _fallback_mean,
        )
    except FileNotFoundError:
        logger.warning(
            "Modelo de demanda nao encontrado em %s. "
            "Execute 'python ml/train_demand_model.py' para treinar. "
            "Predicoes retornarao o valor medio padrao (%.1f).",
            _MODEL_PATH,
            _fallback_mean,
        )
    except Exception:
        logger.exception(
            "Erro ao carregar modelo de demanda de %s", _MODEL_PATH
        )


class DemandPredictor:
    """Singleton de inferencia do modelo de demanda (statsforecast).

    O cache e preenchido no startup e nao e invalidado em runtime.
    Novas ONGs recebem o valor medio global como fallback.
    Para atualizar, reinicie o servidor apos re-treinar o modelo.
    """

    @staticmethod
    def predict_demand(ong_id: int, db_session=None) -> float:
        """Retorna demanda prevista para a ONG.
        
        Prioridade:
        1. Se db_session fornecido e houver historico real (>=2 semanas), usa media movel.
        2. Cache do modelo treinado (demand_model.pkl).
        3. Fallback global medio.
        """
        key = str(ong_id)
        
        # 1. Tentar historico real do banco
        if db_session is not None:
            try:
                from sqlalchemy import select, func
                from database.models import HistoricoAtendimento
                result = db_session.execute(
                    select(HistoricoAtendimento.quantidade_atendida)
                    .where(HistoricoAtendimento.ong_id == ong_id)
                    .order_by(HistoricoAtendimento.semana.desc())
                    .limit(4)
                )
                valores = [r[0] for r in result.all()]
                if len(valores) >= 2:
                    media = sum(valores) / len(valores)
                    logger.info("Demanda ONG %s: %.1f (historico real, n=%d)", ong_id, media, len(valores))
                    return media
            except Exception:
                pass  # Falha silenciosa, segue para cache

        # 2. Cache do modelo
        if key in _demand_cache:
            val = _demand_cache[key]
            logger.info("Demanda ONG %s: %.1f (cache modelo)", ong_id, val)
            return val

        # 3. Fallback
        logger.info(
            "Demanda ONG %s: %.1f (fallback, ONG nao encontrada no modelo)",
            ong_id,
            _fallback_mean,
        )
        return _fallback_mean


def init_demand_predictor() -> None:
    _load_and_cache()
