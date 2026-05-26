# Alimenta.AI — Documentacao do Backend

API REST do sistema preditivo de redistribuicao inteligente de alimentos.

## Visao Geral da Arquitetura

```
┌──────────────────────────────────────────────────────────────────┐
│                        App Mobile/Web                             │
└──────────────────────────────┬───────────────────────────────────┘
                               │ HTTP (JSON + JWT)
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                     FastAPI (Uvicorn)                             │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐        │
│  │  /auth   │  │ /doacoes │  │ /matching│  │/dashboard │        │
│  │ registro │  │ CRUD     │  │  score   │  │ agregados │        │
│  │ login    │  │ urgencia │  │ matching │  │ por perfil│        │
│  │ JWT      │  │ AFD      │  │ haversine│  │           │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬─────┘        │
│       │              │             │               │              │
│       └──────────────┼─────────────┼───────────────┘              │
│                      │             │                              │
│                      ▼             ▼                              │
│              ┌────────────┐ ┌──────────────┐                      │
│              │ SQLAlchemy │ │ ML Pipeline  │                      │
│              │ (ORM 2.x)  │ │ (singletons) │                      │
│              └─────┬──────┘ └──────┬───────┘                      │
│                    │               │                              │
└────────────────────┼───────────────┼──────────────────────────────┘
                     │               │
                     ▼               ▼
              ┌────────────┐ ┌─────────────────┐
              │   SQLite   │ │ urgency_model   │
              │ alimenta.db│ │ demand_model    │
              └────────────┘ │ (.pkl via joblib)│
                             └─────────────────┘
```

## Stack Tecnologica

| Componente | Biblioteca | Versao |
|-----------|-----------|--------|
| API Framework | FastAPI | >= 0.115 |
| Servidor ASGI | Uvicorn | >= 0.34 |
| ORM | SQLAlchemy | >= 2.0 (async) |
| Migrations | Alembic | >= 1.13 |
| Autenticacao | python-jose (JWT) + passlib (bcrypt) | >= 3.3 / >= 1.7 |
| Validacao | Pydantic v2 + email-validator | >= 2.0 |
| ML - Classificacao | scikit-learn | >= 1.5 |
| ML - Series Temporais | statsforecast (Nixtla) | >= 2.0 |
| Serializacao ML | joblib | >= 1.4 |
| Banco de Dados | SQLite + aiosqlite | >= 0.20 |
| HTTP Client (interno) | httpx | >= 0.28 |

## Estrutura de Diretorios

```
backend/
├── main.py                    # App FastAPI, CORS, lifespan, routers
├── config.py                  # Settings via pydantic-settings (.env)
├── requirements.txt           # Dependencias Python
├── Dockerfile                 # python:3.11-slim
├── .env.example               # Template de variaveis de ambiente
├── models/                    # Modelos ML serializados
│   ├── urgency_model.pkl      # RandomForest + OneHotEncoder
│   └── demand_model.pkl       # StatsForecast (AutoETS)
├── ml/                        # Motor de Machine Learning
│   ├── predictor.py           # UrgencyPredictor singleton
│   ├── demand_predictor.py    # DemandPredictor singleton
│   ├── train_urgency_model.py # Script de treinamento offline
│   └── train_demand_model.py  # Script de treinamento offline
├── database/                  # Camada de persistencia
│   ├── connection.py          # Engine sync + async, SessionLocal, Base
│   └── models.py              # 6 modelos ORM + 3 enums
├── auth/                      # Autenticacao e autorizacao
│   ├── router.py              # Endpoints + get_current_user
│   ├── service.py             # register(), authenticate()
│   ├── schemas.py             # Pydantic request/response
│   └── utils.py               # bcrypt + JWT
├── doacoes/                   # CRUD de doacoes
│   ├── router.py              # Endpoints (apenas doadores)
│   ├── service.py             # criar_doacao() com urgencia in-process
│   └── schemas.py             # DoacaoCreate, DoacaoResponse
├── matching/                  # Motor de matching
│   └── service.py             # calcular_matching() + haversine
├── dashboard/                 # Endpoint de agregados
│   ├── router.py              # GET /dashboard (dispatch por perfil)
│   ├── service.py             # 3 funcoes assincronas de agregacao
│   └── schemas.py             # Union discriminada por Literal
└── alembic/                   # Migrations SQL
    ├── env.py
    └── versions/               # 3 migrations
```

## Como Rodar Localmente

### Pre-requisitos

- Python 3.11
- pip

### Passos

```bash
cd backend

python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # Linux/Mac

pip install -r requirements.txt

cp .env.example .env
# Edite .env com uma SECRET_KEY segura se necessario

python ml/train_urgency_model.py   # Treina modelo de urgencia
python ml/train_demand_model.py    # Treina modelo de demanda

alembic upgrade head               # Aplica migrations no SQLite

uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Acesse http://localhost:8000/docs para o Swagger UI interativo.

## Como Rodar com Docker

```bash
cd backend

docker build -t alimenta-ai-backend .
docker run -p 8000:8000 --env-file .env alimenta-ai-backend
```

### Nota para Docker

O Dockerfile usa `python:3.11-slim`. Como os modelos `.pkl` sao copiados no build, nao e necessario treina-los dentro do container. Se os modelos nao existirem no momento do build, o servidor inicia sem eles e loga um warning (predicoes retornam fallback).

## Variaveis de Ambiente

| Variavel | Descricao | Padrao |
|----------|-----------|--------|
| `SECRET_KEY` | Chave usada para assinar tokens JWT (HS256) | `change-me...` (trocar em producao!) |
| `ALGORITHM` | Algoritmo de assinatura JWT | `HS256` |
| `ACCESS_TOKEN_EXPIRE_HOURS` | Duracao do token JWT em horas | `24` |
| `DATABASE_URL` | URL de conexao com o banco de dados | `sqlite:///./alimenta.db` |

### Gerar uma SECRET_KEY segura

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

## Como Treinar os Modelos ML

### Modelo de Urgencia

```bash
cd backend
python ml/train_urgency_model.py
```

Gera um dataset sintetico de 500 amostras, treina um `RandomForestClassifier` com `OneHotEncoder`, avalia com acuracia ~91%, e salva o pipeline em `models/urgency_model.pkl`.

### Modelo de Demanda

```bash
cd backend
python ml/train_demand_model.py
```

Gera 10 ONGs ficticias com 104 semanas cada, treina `AutoETS(season_length=52)` do statsforecast, avalia com MAE e MAPE (~7.7%), e salva em `models/demand_model.pkl`.

Ambos os scripts sao executaveis offline (`if __name__ == "__main__"`).

## Fluxe Principal do Sistema

```
1. Doador se registra   → POST /auth/register
2. Doador faz login     → POST /auth/login (recebe JWT)
3. Doador cria doacao   → POST /doacoes
   ├── Persiste doacao com status="cadastrado"
   ├── UrgencyPredictor analisa em < 2s
   ├── Transicao: cadastrado → analisado
   └── BackgroundTask: calcular_matching()
       ├── DemandPredictor preve demanda de cada ONG
       ├── Haversine calcula distancia
       ├── Score = 0.4*u + 0.4*d - 0.2*dist
       ├── Persiste ScoreMatching para cada ONG
       ├── Seleciona melhor ONG
       └── Transicao: analisado → matched → notificado
4. Doador consulta       → GET /dashboard
   └── Metricas do perfil "doador"
```
