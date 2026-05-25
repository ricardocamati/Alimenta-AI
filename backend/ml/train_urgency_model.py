import os
import numpy as np
import pandas as pd
import joblib
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

RANDOM_STATE = 42
MIN_SAMPLES = 500
TIPOS_ALIMENTO = ["fruta", "verdura", "laticinios", "carne", "padaria", "bebida"]
CATEGORIAS = ["perecivel_alto", "perecivel_medio", "perecivel_baixo"]
MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
MODEL_PATH = os.path.join(MODELS_DIR, "urgency_model.pkl")

np.random.seed(RANDOM_STATE)


def _label_urgencia(row: pd.Series) -> str:
    dias = row["dias_ate_vencimento"]
    nivel = 0

    if dias <= 1:
        nivel = 3
    elif dias <= 3:
        nivel = 2
    elif dias <= 7:
        nivel = 1
    else:
        nivel = 0

    if row["tipo_alimento"] in ("laticinios", "carne"):
        nivel = min(nivel + 1, 3)

    niveis = {0: "baixa", 1: "media", 2: "alta", 3: "critica"}
    return niveis[nivel]


def gerar_dataset(n_samples: int = 700) -> pd.DataFrame:
    data = {
        "tipo_alimento": np.random.choice(TIPOS_ALIMENTO, size=n_samples),
        "categoria": np.random.choice(CATEGORIAS, size=n_samples),
        "dias_ate_vencimento": np.random.randint(0, 31, size=n_samples),
        "temperatura_celsius": np.round(np.random.uniform(2.0, 35.0, size=n_samples), 1),
    }
    df = pd.DataFrame(data)
    df["urgencia"] = df.apply(_label_urgencia, axis=1)
    return df


def treinar_e_salvar() -> None:
    print("=== Treinamento do Modelo de Urgência de Perecíveis ===\n")

    df = gerar_dataset(MIN_SAMPLES)
    print(f"Dataset gerado: {len(df)} amostras")
    print(f"Distribuição das labels:\n{df['urgencia'].value_counts().to_string()}\n")

    X = df[["tipo_alimento", "categoria", "dias_ate_vencimento", "temperatura_celsius"]]
    y = df["urgencia"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
    )
    print(f"Treino: {len(X_train)} | Teste: {len(X_test)}\n")

    ohe_features = ["tipo_alimento", "categoria"]
    numeric_features = ["dias_ate_vencimento", "temperatura_celsius"]

    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore"), ohe_features),
        ],
        remainder="passthrough",
    )

    pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            (
                "classifier",
                RandomForestClassifier(
                    n_estimators=100,
                    random_state=RANDOM_STATE,
                    class_weight="balanced",
                ),
            ),
        ]
    )

    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    acc = accuracy_score(y_test, y_pred)

    print(f"Acurácia: {acc:.4f} ({acc*100:.2f}%)")
    print("\nRelatório de Classificação:")
    print(classification_report(y_test, y_pred))

    os.makedirs(MODELS_DIR, exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)
    print(f"\nModelo salvo em: {MODEL_PATH}")

    feature_names = pipeline.named_steps["preprocessor"].get_feature_names_out()
    importances = pipeline.named_steps["classifier"].feature_importances_
    print("\nTop 10 features por importância:")
    sorted_idx = np.argsort(importances)[::-1]
    for idx in sorted_idx[:10]:
        print(f"  {feature_names[idx]:<45s} {importances[idx]:.4f}")


if __name__ == "__main__":
    treinar_e_salvar()
