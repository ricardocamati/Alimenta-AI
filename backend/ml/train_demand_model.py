import os

import joblib
import numpy as np
import pandas as pd
from statsforecast import StatsForecast
from statsforecast.models import AutoETS

RANDOM_STATE = 42
N_ONGS = 10
N_WEEKS = 104
PREDICTION_HORIZON = 4
MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
MODEL_PATH = os.path.join(MODELS_DIR, "demand_model.pkl")

rng = np.random.default_rng(RANDOM_STATE)


def gerar_dataset() -> pd.DataFrame:
    base_demands = rng.integers(50, 201, size=N_ONGS)
    datas = pd.date_range("2024-01-01", periods=N_WEEKS, freq="W-MON")
    registros = []

    for ong_id in range(1, N_ONGS + 1):
        base = base_demands[ong_id - 1]
        ong_rng = np.random.default_rng(RANDOM_STATE * ong_id)
        for semana in datas:
            week_num = semana.isocalendar().week
            mult = 1.0
            if 1 <= week_num <= 8 or 45 <= week_num <= 52:
                mult = 1.4
            elif 20 <= week_num <= 30:
                mult = 0.8
            noise = ong_rng.uniform(-0.15, 0.15)
            qtd = max(1, int(base * mult * (1 + noise)))
            registros.append(
                {
                    "unique_id": str(ong_id),
                    "ds": semana,
                    "y": qtd,
                }
            )

    return pd.DataFrame(registros)


def _merge_posicional(
    df_test: pd.DataFrame, forecast: pd.DataFrame
) -> pd.DataFrame:
    test = df_test.sort_values(["unique_id", "ds"]).reset_index(drop=True)
    fc = forecast.sort_values(["unique_id", "ds"]).reset_index(drop=True)
    test["pos"] = test.groupby("unique_id").cumcount()
    fc["pos"] = fc.groupby("unique_id").cumcount()
    merged = test.rename(columns={"y": "real"}).merge(
        fc[["unique_id", "pos", "AutoETS"]].rename(
            columns={"AutoETS": "predito"}
        ),
        on=["unique_id", "pos"],
    )
    return merged


def treinar_e_salvar() -> None:
    print("=== Treinamento do Modelo de Previsao de Demanda ===\n")

    df = gerar_dataset()
    print(
        f"Dataset gerado: {len(df)} amostras "
        f"({N_ONGS} ONGs x {N_WEEKS} semanas)"
    )

    df_train = df.groupby("unique_id").head(N_WEEKS - PREDICTION_HORIZON)
    df_test = df.groupby("unique_id").tail(PREDICTION_HORIZON)
    print(f"Treino: {len(df_train)} | Teste: {len(df_test)}\n")

    model = AutoETS(season_length=52)
    sf = StatsForecast(models=[model], freq="W", n_jobs=1)

    sf.fit(df_train)
    print("Modelo AutoETS treinado.\n")

    forecast = sf.predict(h=PREDICTION_HORIZON, level=[80])

    merged = _merge_posicional(df_test, forecast)
    merged["ae"] = (merged["real"] - merged["predito"]).abs()
    merged["ape"] = merged["ae"] / merged["real"] * 100

    print("Previsoes (proximas 4 semanas):")
    for uid in sorted(merged["unique_id"].unique(), key=int):
        ong_data = merged[merged["unique_id"] == uid]
        preds = ong_data["predito"].round(1).tolist()
        reais = ong_data["real"].tolist()
        print(f"  ONG {uid:>2}: previsto={preds}  real={reais}")

    resultados = (
        merged.groupby("unique_id")
        .agg(MAE=("ae", "mean"), MAPE=("ape", "mean"))
        .reset_index()
    )
    resultados["MAE"] = resultados["MAE"].round(2)
    resultados["MAPE"] = resultados["MAPE"].round(2)

    print("\nAvaliacao por ONG:")
    for _, row in resultados.iterrows():
        print(
            f"  ONG {row['unique_id']:>2}: "
            f"MAE={row['MAE']:>6.1f}  MAPE={row['MAPE']:>6.1f}%"
        )
    print(
        f"\n  Media global: "
        f"MAE={resultados['MAE'].mean():.1f}  "
        f"MAPE={resultados['MAPE'].mean():.1f}%"
    )

    os.makedirs(MODELS_DIR, exist_ok=True)
    joblib.dump(sf, MODEL_PATH)
    print(f"\nModelo salvo em: {MODEL_PATH}")


if __name__ == "__main__":
    treinar_e_salvar()
