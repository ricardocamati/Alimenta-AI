import logging
import os

import joblib
import pandas as pd

logger = logging.getLogger(__name__)

_MODEL_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "models", "urgency_model.pkl"
)

_pipeline = None


def _load_pipeline() -> None:
    global _pipeline
    try:
        _pipeline = joblib.load(_MODEL_PATH)
        logger.info("UrgencyPredictor carregado: %s", _MODEL_PATH)
    except FileNotFoundError:
        logger.warning(
            "Modelo de urgência não encontrado em %s. "
            "Execute 'python ml/train_urgency_model.py' para treinar. "
            "Predições retornarão 'indefinida'.",
            _MODEL_PATH,
        )


class UrgencyPredictor:
    @staticmethod
    def predict(
        tipo_alimento: str,
        categoria: str,
        dias_ate_vencimento: int,
        temperatura_celsius: float = 25.0,
    ) -> str:
        if _pipeline is None:
            logger.warning("Predição ignorada — modelo não carregado.")
            return "indefinida"

        df = pd.DataFrame(
            [
                {
                    "tipo_alimento": tipo_alimento,
                    "categoria": categoria,
                    "dias_ate_vencimento": dias_ate_vencimento,
                    "temperatura_celsius": temperatura_celsius,
                }
            ]
        )
        result = _pipeline.predict(df)[0]
        logger.info(
            "Urgência predita: %s (alimento=%s, dias=%s, temp=%.1f)",
            result,
            tipo_alimento,
            dias_ate_vencimento,
            temperatura_celsius,
        )
        return result


def init_predictor() -> None:
    _load_pipeline()
