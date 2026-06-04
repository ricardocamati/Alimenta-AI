# Relatório de Validação Final — Alimenta-AI

## Data: 2026-06-01
## Branch: AA-46

---

## 1. Status Geral

| Componente | Status | IP/Porta |
|---|---|---|
| Backend FastAPI | ✅ Rodando | 192.168.68.201:8002 |
| Frontend Expo Web | ✅ Rodando | 192.168.68.104:8081 |
| ML Modelo Urgência | ✅ Carregado | 91% acurácia |
| ML Modelo Demanda | ✅ Carregado | fallback 120 kg |
| Banco SQLite | ✅ OK | alimenta.db |
| Git local | ✅ Commit 9efec62 pronto | push pendente |

---

## 2. Bugs Corrigidos Agora

### 🔴 Bug 1: MissingGreenlet em `GET /doacoes/` (listar e detalhar)
- **Sintoma:** Endpoints 500 com `greenlet_spawn has not been called`
- **Causa:** `selectinload(Doacao.doador)` faltava nas queries async
- **Fix:** Adicionado em `doacoes/service.py` (2 lugares: `listar_doacoes` e `buscar_doacao_por_id`)
- **Status:** ✅ Testado — retorna 200 com array JSON

---

## 3. Cadastro de ONGs Adicionais (Competição de Matching)

Cadastradas **4 ONGs** com coordenadas diferentes em São Paulo:

| ID | Nome | Lat | Lon | Capacidade |
|---|---|---|---|---|
| 1 | ONG Teste | -23.5505 | -46.6333 | 150 |
| 2 | Mesa Brasil SESC | -23.5701 | -46.6398 | 200 |
| 3 | Banco de Alimentos SP | -23.6235 | -46.6983 | 300 |
| 4 | GariComida | -23.5523 | -46.6582 | 80 |

---

## 4. Matching Competitivo Validado

### Doação 5 (nova — criada com 4 ONGs ativas)
**Arroz 25kg, urgência=baixa**

| Rank | ONG | Score | Distância | Dist_norm | Demanda |
|---|---|---|---|---|---|
| 🥇 1 | Mesa Brasil SESC | **50.0** | ~1.4 km | 0.00 (mais próxima) | 1.00 |
| 🥈 2 | GariComida | 32.6 | ~1.8 km | 0.03 | 0.58 |
| 🥉 3 | Banco de Alimentos SP | 17.8 | ~5.6 km | 1.00 (mais longe) | 0.69 |
| 4 | ONG Teste | 6.7 | ~1.9 km | 0.17 | 0.00 |

**Vencedor:** ONG 2 (Mesa Brasil SESC) — menor distância do doador

### Doações antigas (1–4) — criadas com 1 ONG apenas
- Score fixo: **30.0** para todas
- ONG matched: sempre ONG 1
- Por quê: com 1 ONG, normalização min-max retorna 1.0 constante

---

## 5. Frontend Validado (3 roles)

| Tela | Login | Status |
|---|---|---|
| Portal Doador | doador@teste.com/teste123 | ✅ OK |
| Portal ONG | ong@teste.com/teste123 | ✅ OK |
| Admin | admin@teste.com/teste123 | ✅ OK |

---

## 6. Próximos Passos

1. **Push do commit** pelo notebook (git push bloqueado no Pi)
2. **Desativar TEST_MODE** para validar JWT real
3. **Criar endpoint GET /ongs/** para o frontend listar ONGs
4. **Coletar histórico semanal** e retreinar modelo de demanda

