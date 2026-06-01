# RELATORIO DE VALIDACAO DOS CALCULOS

## Data: 2026-06-01
## Branch: AA-46-Integracao-com-API-axios-e-tratamento-de-erros-em-todas-as-telas

---

## 1. RESUMO EXECUTIVO

Status: ⚠️ **PARCIALMENTE VALIDADO** - Problemas encontrados nos cálculos de distância e scoring

---

## 2. VALIDACAO DOS CÁLCULOS DE MATCHING

### 2.1 Fórmula Oficial
```
score = 0.4 * urgencia_peso + 0.4 * demanda_normalizada - 0.2 * distancia_normalizada
```

### 2.2 Pesos de Urgência
| Urgência | Peso |
|----------|------|
| baixa    | 0.25 |
| media    | 0.50 |
| alta     | 0.75 |
| critica  | 1.00 |

✅ **Validado:** Pesos corretos

### 2.3 Problemas Encontrados

#### ❌ PROBLEMA 1: Distância Incorreta
- **Doações**: #1, #2, #3, #4 (todas)
- **Distância salva**: 1.0 km
- **Distância real calculada**: **5669.70 km**
- **Análise**: As doações foram cadastradas sem latitude/longitude (ou com 0,0), mas a distância foi salva como 1.0 km
- **Impacto**: O scoring de matching está baseado em distância incorreta

#### ❌ PROBLEMA 2: Score Constante
- **Score de todas as doações**: 30.0
- **Análise**: Com apenas 1 ONG no sistema, a normalização de distância retorna [1.0] (tudo igual)
- **Fórmula aplicada**: 0.4 * 0.25 + 0.4 * 1.0 - 0.2 * 1.0 = 0.1 + 0.4 - 0.2 = 0.3
- **Score em escala 0-100**: 0.3 * 100 = **30.0** ✅ (cálculo matemático correto)

#### ⚠️ PROBLEMA 3: Coordenadas Geográficas
- **Doações**: lat=null, lon=null (ou 0,0)
- **ONG #1**: lat=-23.5505, lon=-46.6333 (São Paulo)
- **Distância real**: ~5669 km (considerando 0,0 como origem)
- **Recomendação**: O sistema de geocoding precisa ser acionado no cadastro

---

## 3. VALIDACAO DO DASHBOARD ONG

### 3.1 Campo total_kg_recebidos
- **Implementação**: ✅ OK
- **Fórmula**: SUM(quantidade) WHERE status='confirmado' AND unidade_medida='kg'
- **Resultado atual**: 0.0 kg (nenhuma doação confirmada ainda)
- **Status**: Funcionando, mas sem dados para validar

### 3.2 Demanda Prevista
- **Valor retornado**: 120.0 kg
- **Fonte**: Fallback do DemandPredictor (média global)
- **Análise**: Como o modelo foi treinado antes do reset do banco, a ONG #1 não está no cache
- **Recomendação**: Retreinar o modelo com dados atualizados

---

## 4. VALIDACAO DO ML (URGÊNCIA)

### 4.1 UrgencyPredictor
- **Modelo**: RandomForest treinado com 91% acurácia
- **Input**: tipo_alimento, categoria, dias_ate_vencimento
- **Output**: baixa, media, alta, critica

### 4.2 Resultados das Doações
| Doação | Tipo | Dias até Venc. | Urgência Calculada |
|--------|------|----------------|-------------------|
| #1 Arroz | nao_perecivel | 200+ | baixa ✅ |
| #2 Arroz | nao_perecivel | 200+ | baixa ✅ |
| #3 Feijão | nao_perecivel | 200+ | baixa ✅ |
| #4 Leite | perecivel_baixo | 15 | baixa ⚠️ |

**Análise**: Leite com 15 dias de validade deveria ter urgência maior. O modelo pode estar com feature engineering inadequado.

---

## 5. VALIDACAO DO FLUXO DE STATUS

### 5.1 Transições Automáticas
```
cadastrado → analisado (ML) → matched (scoring) → notificado (simulação)
```

✅ **Funcionando corretamente**

### 5.2 Transições Manuais (ONG)
```
notificado → reservado → coletado → confirmado
```

⚠️ **Não testado** - Requer interação manual no frontend

---

## 6. PROBLEMAS CRÍTICOS ENCONTRADOS

### 🔴 CRÍTICO 1: Geocoding Ausente
- **Impacto**: Todas as doações cadastradas via API não têm coordenadas
- **Consequência**: Distância de matching é irreais (5669 km)
- **Solução**: Ativar geocoding no cadastro ou exigir lat/lon no formulário

### 🟡 MÉDIO 2: Modelo de Demanda Desatualizado
- **Impacto**: Predição retorna fallback 120.0 kg para todas as ONGs
- **Consequência**: Matching pode não refletir demanda real
- **Solução**: Retreinar modelo com histórico atual

### 🟡 MÉDIO 3: Score Constante
- **Impacto**: Com 1 ONG, score sempre = 30.0
- **Consequência**: Não há diferenciação entre doações
- **Solução**: Cadastrar mais ONGs ou revisar fórmula

---

## 7. RECOMENDAÇÕES

1. **Corrigir cadastro de doações** para incluir latitude/longitude
2. **Retreinar modelo de demanda** após acumular histórico
3. **Cadastrar mais ONGs** para matching competitivo
4. **Revisar modelo de urgência** para perecíveis com validade curta
5. **Testar fluxo completo** de status via frontend

---

## 8. CONCLUSÃO

O sistema está **funcional** mas com **cálculos de matching comprometidos** devido à ausência de coordenadas geográficas. O ML de urgência funciona, mas o scoring de matching precisa de dados reais de localização para ser efetivo.

**Próximo passo recomendado**: Cadastrar doações com coordenadas reais e retreinar modelos.
