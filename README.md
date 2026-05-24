# 🍃 Alimenta-AI

> Sistema preditivo de redistribuição inteligente de alimentos com Machine Learning

***

## 📋 Sobre o Projeto

O **Alimenta.AI** é uma aplicação web e mobile que combate o desperdício de alimentos e a insegurança alimentar no Brasil por meio de inteligência artificial preditiva. Enquanto aproximadamente **64 milhões de brasileiros** convivem com algum grau de insegurança alimentar, toneladas de alimentos são desperdiçadas anualmente por estabelecimentos comerciais, restaurantes e feiras.

Ao contrário de sistemas tradicionais que apenas reagem a doações já publicadas, o Alimenta.AI **prediz necessidades com antecedência** — conectando automaticamente doadores ao receptor certo, no momento certo.

***

## 🎯 Objetivo

Desenvolver uma plataforma que utiliza **dois modelos de Machine Learning em paralelo**:

1. **Modelo de Urgência de Perecíveis** — Estima o risco de vencimento de um alimento com base no tipo, categoria, temperatura e prazo de validade (Random Forest / Gradient Boosting).
2. **Modelo de Demanda de ONGs** — Prevê a demanda futura de bancos de alimentos e ONGs com base no histórico semanal de atendimentos e sazonalidade (statsforecast – Nixtla).

O cruzamento dessas previsões gera um **score de prioridade** que determina automaticamente qual doador deve ser conectado a qual receptor, maximizando o aproveitamento dos alimentos antes do vencimento.

***

## 🧩 Funcionalidades

- 📱 **App Mobile** — cadastro simplificado de doações via câmera, GPS e data de validade
- 🤖 **Predição de urgência** — triagem automatizada de perecíveis em tempo real
- 📈 **Previsão de demanda** — alertas preditivos de escassez nas organizações receptoras
- 🗺️ **Matching geográfico** — score ponderado por urgência, demanda e distância
- 🔁 **Rastreabilidade via AFD** — fluxo da doação modelado como Autômato Finito Determinístico
- 🔔 **Alertas proativos** — notificações antes de períodos críticos de escassez

***

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    Alimenta.AI                          │
├─────────────────┬───────────────────────────────────────┤
│   App Mobile    │           Backend / API               │
│  (Doadores e    ├──────────────┬────────────────────────┤
│   Receptores)   │  ML - Oferta │  ML - Demanda          │
│                 │  Random Forest│  statsforecast         │
│  • Câmera       │  Gradient    │  AutoETS / AutoARIMA   │
│  • GPS          │  Boosting    │  Histórico de ONGs     │
│  • Validade     ├──────────────┴────────────────────────┤
│                 │       Score de Matching               │
│                 │  (urgência + demanda + distância)     │
└─────────────────┴───────────────────────────────────────┘
```

O fluxo completo da doação — desde o cadastro do alimento até a confirmação da coleta — é representado como um **Autômato Finito Determinístico (AFD)**, garantindo rastreabilidade de estados e consistência de transições.

***

## 🛠️ Tecnologias

| Camada | Tecnologias |
|--------|-------------|
| **Mobile** | React Native / Flutter |
| **Backend** | Python, FastAPI |
| **ML - Oferta** | Scikit-learn (Random Forest, Gradient Boosting) |
| **ML - Demanda** | statsforecast — Nixtla (AutoETS, AutoARIMA, AutoTheta) |
| **Banco de Dados** | SQLite |
| **Gerenciamento** | Jira |
| **Versionamento** | Git / GitHub |

***

## 📈 Previsão de Demanda com statsforecast

O eixo de demanda utiliza a biblioteca **statsforecast (Nixtla)**, que oferece modelos estatísticos de séries temporais otimizados para **velocidade e simplicidade**, sem necessidade de configuração complexa de redes neurais.

### Por que statsforecast?

- ⚡ Muito mais rápido que Prophet e LSTM para dados semanais
- 🔧 API simples — previsão funcional em poucas linhas de código
- 🔄 `AutoETS` e `AutoARIMA` selecionam automaticamente o melhor modelo para cada ONG
- 📊 Lida nativamente com sazonalidade semanal/mensal e dados esparsos
- 🏋️ Leve — sem dependência de TensorFlow ou PyTorch

### Exemplo de uso

```python
from statsforecast import StatsForecast
from statsforecast.models import AutoETS, AutoARIMA

models = [AutoETS(season_length=52), AutoARIMA(season_length=52)]

sf = StatsForecast(models=models, freq='W')  # série semanal
sf.fit(df)  # df com colunas 'unique_id', 'ds' e 'y'

forecast = sf.predict(h=8)  # previsão para as próximas 8 semanas
```

***

## 📐 Modelagem Formal (Teoria da Computação)

O fluxo de uma doação é modelado como um **AFD** com os seguintes estados:

```
[CADASTRADO] → [ANALISADO] → [MATCHED] → [NOTIFICADO] → [COLETADO] → [CONFIRMADO]
                                                               ↓
                                                          [CANCELADO]
```

Cada transição é acionada por eventos do sistema (análise do ML, aceite da ONG, confirmação de coleta), garantindo consistência e rastreabilidade completa do processo.

***

## 📊 Resultados Esperados

- ⬇️ Redução do tempo médio entre disponibilização e aproveitamento de perecíveis
- ⬆️ Aumento do volume de doações efetivadas
- 🔮 Antecipação de períodos de maior necessidade nas ONGs
- 📉 Redução de desperdícios por vencimento
- 🤝 Ampliação da base de doadores via app simplificado

***

## 👥 Equipe

| RA | Nome |
|----|------|
| 26005799-2 | Paulo Henrique Basso Bessa |
| 22014446-2 | Ricardo Camati |
| 23217378-2 | Cauã Cesar da Silva de Oliveira |

***

## 🎓 Contexto Acadêmico

Projeto desenvolvido para a **AEP 2026.1** do curso de **Engenharia de Software** (7º semestre) na **Universidade Cesumar – UniCesumar**, integrando as disciplinas:

- 🤖 Inteligência Artificial
- 📱 Programação para Dispositivos Móveis
- 🧮 Teoria da Computação
- 💼 Experiência Profissional

Alinhado à **ODS 2 da ONU** — Fome Zero e Agricultura Sustentável (meta: erradicar a fome até 2030).

***
