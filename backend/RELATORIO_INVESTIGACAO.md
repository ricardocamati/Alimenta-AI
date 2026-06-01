
# RELATÓRIO DE INVESTIGAÇÃO — Backend Alimenta-AI

**Data:** 01/06/2026  
**Versão do código:** último commit (AA-50)  
**Branch:** main

---

## 1. VISÃO GERAL

Backend FastAPI modular com 4 domínios principais:
- `auth/` — registro, login JWT, guardas de rota
- `doacoes/` — CRUD de doações + trigger de matching
- `dashboard/` — resumos por perfil (doador/ONG/admin)
- `ml/` — predição de urgência + demanda + matching geoespacial

---

## 2. ✅ O QUE ESTÁ FUNCIONANDO

### 2.1 API REST
| Rota | Método | Status |
|------|--------|--------|
| `/auth/register` | POST | ✅ Funciona |
| `/auth/login` | POST | ✅ Retorna JWT |
| `/auth/me` | GET | ✅ Retorna usuário autenticado |
| `/doacoes/` | POST/GET | ✅ Protegido por doador |
| `/doacoes/{id}` | GET | ✅ Detalhe da doação |
| `/dashboard/` | GET | ✅ Retorna dados reais |
| `/` | GET | ✅ Health básico |

### 2.2 Banco de Dados
- **SQLite** com 16 usuários, 6 doações, 8 ONGs
- Async SQLAlchemy (`aiosqlite`) para queries
- Sincrono (`sqlite3`) para auth (register/login)
- Alembic com 4 migrations aplicadas

### 2.3 CORS
- Configurado com `allow_origins=["*"]`
- Preflight OPTIONS responde corretamente
- Headers permitidos: todos

### 2.4 Teste de Login (via curl)
```bash
curl -X POST http://192.168.68.201:8002/auth/login   -H "Content-Type: application/json"   -d '{"email":"admin@teste.com","senha":"teste123"}'
# ✅ Retorna access_token JWT
```

---

## 3. ⚠️ PROBLEMAS ENCONTRADOS

### 🚨 CRÍTICO — Modo Teste Desabilita Segurança
**Arquivo:** `main.py`, linhas 30-34, 83-114

`TEST_MODE=true` no `.env` faz:
- Override de **TODAS** as dependências de autenticação
- `get_current_user` → sempre retorna admin
- `require_doador` → sempre retorna doador mockado
- `oauth2_scheme` → aceita qualquer token

**Impacto:** QUALQUER token funciona em QUALQUER rota. Não é seguro.

**Fix recomendado:** Desabilitar `TEST_MODE` em produção ou criar flag separada.

---

### 🚨 CRÍTICO — Mistura Sync/Async no Auth
**Arquivo:** `auth/router.py`

```python
# register/login usam sync get_db (SessionLocal)
@router.post("/register")
def register_endpoint(payload: UsuarioCreate, db=Depends(get_db)):
    ...

# /me usa async get_current_user_with_ong
@router.get("/me")
async def me_endpoint(current_user: Usuario = Depends(get_current_user_with_ong)):
    ...
```

**Impacto:** Dois engines de DB diferentes (sync vs async) podem causar:
- Locks no SQLite
- Dados inconsistentes entre threads
- Deadlocks em alta carga

**Fix recomendado:** Padronizar tudo para async.

---

### 🔴 ALTO — Senha do `doador@teste.com` Incorreta
**Banco:** `alimenta.db`, usuário id=1

- Criado em **24/05** (antes do modo teste ser ativado)
- Hash não corresponde a "teste123"
- Verificação: `verify_password('teste123', hash)` → `False`

**Usuários que funcionam:**
| Email | Senha | Status |
|-------|-------|--------|
| admin@teste.com | teste123 | ✅ OK |
| ong@teste.com | teste123 | ✅ OK |
| doador@teste.com | ??? | ❌ Errada |

---

### 🔴 ALTO — ML Models Não Treinados
**Arquivos:** `ml/predictor.py`, `ml/demand_predictor.py`

- `urgency_model.pkl` → **não existe**
- `demand_model.pkl` → **não existe**
- Preditor retorna `"indefinida"` sempre

**Impacto:** Urgência nunca é calculada automaticamente. Dashboard mostra:
- 3 doações "crítica" (provavelmente mockadas)
- 3 doações "baixa"

**Fix recomendado:** Rodar `python ml/train_urgency_model.py` e `train_demand_model.py`.

---

### 🟡 MÉDIO — Geocoding Falha Silenciosamente
**Arquivo:** `auth/service.py`, linhas 28-63

```python
if result is None:
    lat, lon = 0.0, 0.0  # GPS nulo!
```

**Impacto:** ONGs sem GPS explícito ficam em (0.0, 0.0), impossibilitando matching geoespacial.

**Fix recomendado:** Retornar erro 422 em vez de aceitar (0.0, 0.0).

---

### 🟡 MÉDIO — Falta Rota de Health Check
Atualmente só `/` retorna `{"message": "Alimenta.AI API"}`.
Ideal ter `/health` verificando:
- Conexão com DB
- ML models carregados
- Espaço em disco

---

### 🟢 BAIXO — Teste Overwrite Cria Usuários no Startup
**Arquivo:** `main.py`, `_setup_test_mode()`

Cria 3 usuários a cada startup (idempotente, mas polui logs).
Poderia usar `insert().on_conflict_do_nothing()`.

---

## 4. RESUMO DAS CORREÇÕES SUGERIDAS

| # | Problema | Prioridade | Arquivo(s) |
|---|----------|------------|------------|
| 1 | TEST_MODE desabilita auth | 🔴 CRÍTICO | `.env`, `main.py` |
| 2 | Auth sync/async misturado | 🔴 CRÍTICO | `auth/router.py`, `auth/service.py` |
| 3 | Senha doador@teste.com errada | 🔴 ALTO | DB manual ou script |
| 4 | ML models inexistentes | 🔴 ALTO | `ml/*.py`, rodar treino |
| 5 | Geocoding fallback (0,0) | 🟡 MÉDIO | `auth/service.py` |
| 6 | Falta /health | 🟡 MÉDIO | `main.py` |
| 7 | Startup polui logs | 🟢 BAIXO | `main.py` |

---

## 5. TESTES REALIZADOS

### 5.1 Login Admin
```bash
curl -X POST http://192.168.68.201:8002/auth/login   -d '{"email":"admin@teste.com","senha":"teste123"}'
# ✅ 200 OK — access_token retornado
```

### 5.2 Dashboard Admin
```bash
curl -H "Authorization: Bearer <token>"   http://192.168.68.201:8002/dashboard/
# ✅ 200 OK — 16 usuários, 6 doações, 8 ONGs
```

### 5.3 Listar Doações
```bash
curl -H "Authorization: Bearer <token>"   http://192.168.68.201:8002/doacoes/
# ✅ 200 OK — 6 doações retornadas
```

### 5.4 Login Doador (FALHA)
```bash
curl -X POST http://192.168.68.201:8002/auth/login   -d '{"email":"doador@teste.com","senha":"teste123"}'
# ❌ 401 — "Email ou senha invalidos"
```

### 5.5 CORS Preflight
```bash
curl -X OPTIONS http://192.168.68.201:8002/auth/login   -H "Origin: http://192.168.68.201:8081"
# ✅ 200 — access-control-allow-origin retornado
```

---

## 6. RECOMENDAÇÃO

**Antes de testar o frontend real:**
1. Corrigir a senha do `doador@teste.com`
2. Rodar scripts de treino dos modelos ML
3. Verificar se `TEST_MODE=true` é intencional para testes locais
4. Considerar desabilitar `TEST_MODE` quando for usar backend com frontend real

**Se quiser que eu aplique as correções:**
- Dizer quais prioridades (crítico, alto, médio, todos)
- Eu preparo os patches e aplico

---
*Gerado por Hermes Agent — 01/06/2026 01:07 BRT*
