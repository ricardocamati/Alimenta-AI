import logging
import os

import joblib
import pandas as pd

logger = logging.getLogger(__name__)

_MODEL_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "models", "demand_model.pkl"
)

_sf = None
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


class DemandPredictor:
    @staticmethod
    def predict_demand(ong_id: int) -> float:
        key = str(ong_id)
        if key in _demand_cache:
            val = _demand_cache[key]
            logger.info("Demanda ONG %s: %.1f (cache)", ong_id, val)
            return val

        logger.info(
            "Demanda ONG %s: %.1f (fallback, ONG nao encontrada no modelo)",
            ong_id,
            _fallback_mean,
        )
        return _fallback_mean


def init_demand_predictor() -> None:
    _load_and_cache()
