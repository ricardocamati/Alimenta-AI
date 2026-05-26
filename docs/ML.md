# Alimenta.AI — Documentacao dos Modelos de Machine Learning

O Alimenta.AI utiliza dois modelos de Machine Learning que operam em paralelo:

1. **Modelo de Urgencia** — Classifica o risco de vencimento de alimentos (Random Forest)
2. **Modelo de Demanda** — Preve a demanda futura de ONGs (Series Temporais com statsforecast)

O cruzamento dessas previsoes gera um **score de prioridade** que determina automaticamente qual doador deve ser conectado a qual receptor, maximizando o aproveitamento dos alimentos antes do vencimento.

---

## 1. Modelo de Urgencia de Pereciveis

### Problema

Classificacao multiclasse: dado um alimento com tipo, categoria, dias ate o vencimento e temperatura ambiente, qual o nivel de urgencia de consumo?

### Label (variavel alvo)

| Classe | Criterio |
|--------|----------|
| `baixa` | > 7 dias ate o vencimento |
| `media` | 4 a 7 dias ate o vencimento |
| `alta` | 2 a 3 dias ate o vencimento |
| `critica` | <= 1 dia ate o vencimento |

Regra especial: **carnes e laticinios sobem 1 nivel** de urgencia (sao mais pereciveis).

### Features

| Feature | Tipo | Valores / Intervalo | Descricao |
|---------|------|---------------------|-----------|
| `tipo_alimento` | Categorica | `fruta`, `verdura`, `laticinios`, `carne`, `padaria`, `bebida` | Tipo do alimento |
| `categoria` | Categorica | `perecivel_alto`, `perecivel_medio`, `perecivel_baixo` | Nivel de perecibilidade |
| `dias_ate_vencimento` | Numerica | 0 a 30 | Dias restantes ate a data de validade |
| `temperatura_celsius` | Numerica | 2.0 a 35.0 | Temperatura ambiente no local de armazenamento |

### Dataset Sintetico

Gerado pelo script `ml/train_urgency_model.py`:

- 500 amostras (parametro `MIN_SAMPLES`)
- Distribuicao uniforme dos tipos de alimento e categorias
- `dias_ate_vencimento`: aleatorio entre 0 e 30
- `temperatura_celsius`: aleatorio entre 2.0 e 35.0
- Label calculada pela funcao `_label_urgencia()` conforme regras acima
- `random_state=42` para reprodutibilidade

### Pipeline

```
OneHotEncoder("tipo_alimento", "categoria")
    +
RandomForestClassifier(n_estimators=100, class_weight="balanced")
```

O `OneHotEncoder` transforma as 2 features categoricas em 6 + 3 colunas binarias. As features numericas passam direto (`remainder="passthrough"`). Total de features apos encoding: **11**.

### Metricas

| Metrica | Valor |
|---------|-------|
| Acurácia | ~91% |
| Precisao `baixa` | ~100% |
| Precisao `media` | ~97% |
| Precisao `alta` | ~55% |
| Precisao `critica` | ~73% |

A feature mais importante e `dias_ate_vencimento` (~60% da importancia total), seguida por `carne` (8%) e `laticinios` (7%).

### Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `ml/train_urgency_model.py` | Script de treinamento offline |
| `models/urgency_model.pkl` | Pipeline serializado (joblib) |
| `ml/predictor.py` | Singleton `UrgencyPredictor` para inferencia |

### Como Retreinar

```bash
cd backend
python ml/train_urgency_model.py
```

O script sobrescreve `models/urgency_model.pkl`. O servidor precisa ser reiniciado para carregar o novo modelo (carregado uma vez no startup via `lifespan`).

### Inferencia em Producao

```python
from ml.predictor import UrgencyPredictor

urgencia = UrgencyPredictor.predict(
    tipo_alimento="carne",
    categoria="perecivel_alto",
    dias_ate_vencimento=2,
    temperatura_celsius=25.0,
)
# Retorna: "critica"
```

**Fallback**: Se o modelo nao for encontrado no disco, retorna `"indefinida"` e o sistema usa `Urgencia.baixa` como padrao.

---

## 2. Modelo de Previsao de Demanda

### Problema

Series temporais: dado o historico semanal de atendimentos de cada ONG, prever quantas pessoas serao atendidas nas proximas semanas.

### Formato dos Dados

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `unique_id` | string | ID da ONG (ex: `"1"`, `"2"`, ...) |
| `ds` | date | Segunda-feira da semana |
| `y` | float | Quantidade de pessoas atendidas |

### Dataset Sintetico

Gerado pelo script `ml/train_demand_model.py`:

- 10 ONGs ficticias (IDs 1 a 10)
- 104 semanas de historico por ONG (2 anos)
- Cada ONG tem uma `base_demand` aleatoria entre 50 e 200
- Sazonalidade semanal:
  - Semanas 1-8 e 45-52 do ano: **+40%** (periodos de maior necessidade)
  - Semanas 20-30 do ano: **-20%** (periodos de menor necessidade)
- Ruido multiplicativo de ±15%
- `random_state=42` para reprodutibilidade

### Modelo

**AutoETS** da biblioteca [statsforecast (Nixtla)](https://github.com/Nixtla/statsforecast) com `season_length=52` (sazonalidade anual em dados semanais).

O AutoETS seleciona automaticamente a melhor combinacao de:
- **E** (Erro): aditivo ou multiplicativo
- **T** (Tendencia): nenhuma, aditiva ou multiplicativa
- **S** (Sazonalidade): nenhuma, aditiva ou multiplicativa

### Metricas

| Metrica | Valor |
|---------|-------|
| MAE global | ~11.7 |
| MAPE global | ~7.7% |
| Horizonte | 4 semanas |

### Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `ml/train_demand_model.py` | Script de treinamento offline |
| `models/demand_model.pkl` | Objeto StatsForecast serializado (joblib) |
| `ml/demand_predictor.py` | Singleton `DemandPredictor` para inferencia |

### Como Retreinar

```bash
cd backend
python ml/train_demand_model.py
```

O script sobrescreve `models/demand_model.pkl`. O servidor precisa ser reiniciado para carregar o novo modelo.

### Inferencia em Producao

```python
from ml.demand_predictor import DemandPredictor

demanda = DemandPredictor.predict_demand(ong_id=1)
# Retorna: 91.0 (previsao para a proxima semana da ONG 1)
```

**Cache**: No startup, o `DemandPredictor` chama `sf.predict(h=1)`, extrai a primeira previsao de cada ONG e armazena em cache (`dict[str, float]`). Em producao, as consultas sao O(1).

**Fallback**: Se a ONG nao estiver no cache (ID desconhecido pelo modelo), retorna a media global das previsoes como fallback (~120-167 dependendo do treinamento).

---

## 3. Score de Matching

O score de matching combina as saidas dos dois modelos para decidir qual ONG recebe cada doacao.

### Formula

```
Score = w1 × Urgencia_Peso + w2 × Demanda_Normalizada − w3 × Distancia_Normalizada
```

### Pesos

| Peso | Valor | Descricao |
|------|-------|-----------|
| `w1` | 0.4 | Peso da urgencia do alimento |
| `w2` | 0.4 | Peso da demanda prevista da ONG |
| `w3` | 0.2 | Peso da distancia geografica (penalizacao) |

### Componentes do Score

#### Urgencia_Peso

Mapeamento direto da classe de urgencia para um valor numerico:

| Urgencia | Peso |
|----------|------|
| `baixa` | 0.25 |
| `media` | 0.50 |
| `alta` | 0.75 |
| `critica` | 1.00 |

#### Demanda_Normalizada

A demanda prevista de cada ONG e normalizada no intervalo [0, 1] entre todas as ONGs disponiveis:

```
demanda_norm[i] = (demanda[i] - min_demanda) / (max_demanda - min_demanda)
```

ONGs com maior demanda recebem peso maior (prioridade para quem mais precisa).

#### Distancia_Normalizada

Calculada via formula de Haversine (distancia geodesica entre dois pontos GPS). Normalizada no intervalo [0, 1]:

```
distancia_norm[i] = (distancia[i] - min_distancia) / (max_distancia - min_distancia)
```

ONGs mais proximas recebem penalizacao menor (o termo e subtraido).

### Exemplo de Calculo

Doacao de `carne` com `urgencia = "critica"` (peso = 1.0) em Sao Paulo (-23.55, -46.63):

| ONG | Demanda Prevista | Distancia (km) | Demanda Norm | Dist Norm | Score |
|-----|-----------------|----------------|-------------|-----------|-------|
| ONG A | 200 | 5.0 | 1.00 | 0.00 | 0.4×1.0 + 0.4×1.00 − 0.2×0.00 = **0.80** |
| ONG B | 120 | 2.5 | 0.00 | 0.50 | 0.4×1.0 + 0.4×0.00 − 0.2×0.50 = **0.30** |
| ONG C | 150 | 10.0 | 0.38 | 1.00 | 0.4×1.0 + 0.4×0.38 − 0.2×1.00 = **0.35** |

**Resultado**: ONG A selecionada (maior score = 0.80).

### Persistencia

Todos os scores sao persistidos na tabela `scores_matching` para auditoria:

```sql
SELECT * FROM scores_matching WHERE doacao_id = 42;
```

Cada linha contem `urgencia_peso`, `demanda_peso`, `distancia_peso` e `score_final`.

---

## Dependencias ML

```txt
scikit-learn>=1.5
pandas>=2.0
numpy>=1.24
joblib>=1.4
statsforecast>=2.0
```

Instalacao:

```bash
pip install scikit-learn pandas numpy joblib statsforecast
```
