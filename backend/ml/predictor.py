import logging
import os

import joblib
import pandas as pd

logger = logging.getLogger(__name__)

_MODEL_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "models", "urgency_model.pkl"
)

_pipeline: object | None = None


def _load_pipeline() -> None:
    global _pipeline
    try:
        _pipeline = joblib.load(_MODEL_PATH)
        logger.info("UrgencyPredictor carregado: %s", _MODEL_PATH)
    except FileNotFoundError:
        logger.warning(
            "Modelo de urgencia nao encontrado em %s. "
            "Execute 'python ml/train_urgency_model.py' para treinar. "
            "Predicoes retornarao 'indefinida'.",
            _MODEL_PATH,
        )
    except Exception:
        logger.exception(
            "Erro ao carregar modelo de urgencia de %s", _MODEL_PATH
        )


class UrgencyPredictor:
    """Singleton de inferencia do modelo de urgencia.

    Mantido como classe para permitir injecao de dependencia futura
    e documentacao clara da interface publica.
    """

    @staticmethod
    def predict(
        tipo_alimento: str,
        categoria: str,
        dias_ate_vencimento: int,
        temperatura_celsius: float = 25.0,
    ) -> str:
        if _pipeline is None:
            logger.warning("Predicao ignorada — modelo nao carregado.")
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
            "Urgencia predita: %s (alimento=%s, dias=%s, temp=%.1f)",
            result,
            tipo_alimento,
            dias_ate_vencimento,
            temperatura_celsius,
        )
        return result


def init_predictor() -> None:
    _load_pipeline()
