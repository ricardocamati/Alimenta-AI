# Alimenta-IA — Backend

API do sistema preditivo de redistribuicao inteligente de alimentos.

Stack: **FastAPI + SQLAlchemy + SQLite + statsforecast + scikit-learn**

---

## Inicio rapido (modo de teste)

Ideal para desenvolvimento local, AEP e demos. Usa SQLite local e desativa
a checagem de `SECRET_KEY`.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Sobe a API em 0.0.0.0:8000 (tambem serve o frontend web buildado)
TEST_MODE=true uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

> **Dica**: o mesmo `uvicorn` serve o backend E o frontend web (Expo static
> export). Abra `http://localhost:8000/donor`, `/ngo` ou `/admin` no
> navegador — o SPA e roteado client-side.

A documentacao interativa fica em:

- Swagger UI → `http://localhost:8000/docs`
- ReDoc      → `http://localhost:8000/redoc`

### O que o `TEST_MODE=true` muda

- **`SECRET_KEY`**: na producao e obrigatorio via `.env`; em modo de teste usa um
  sentinel embutido (nao seguro, mas pratico para dev).
- **Banco**: padrao e `sqlite:///./alimenta.db` (criado no primeiro start, junto
  com o seed de 5 usuarios + 2 ONGs + 8 doacoes de exemplo).
- **CEP (ViaCEP)**: funciona igual em qualquer modo.
- **Predicao ML (statsforecast)**: identica nos dois modos.
- **SQLite `PRAGMA foreign_keys=ON`**: ativado por padrao no engine para que
  `ON DELETE CASCADE` funcione (veja `database/connection.py`).

> Aviso: nunca use `TEST_MODE=true` em producao. O `SECRET_KEY` e o mesmo
> para todos os installs de teste, entao qualquer um pode forjar tokens JWT.

### Variaveis de ambiente uteis

```bash
# .env (opcional)
TEST_MODE=true
DATABASE_URL=sqlite:///./alimenta.db

# Gere com: python -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=cole_aqui_o_token_gerado
```

---

## Usuarios seed (modo de teste)

Quando o banco e criado pela primeira vez em `TEST_MODE`, **5 contas** ficam
disponiveis para teste:

| Tipo | Email | Senha | Notas |
|---|---|---|---|
| Doador | `doador@teste.com` | `teste123` | Doador Teste (4 doacoes, SP centro) |
| Doador | `doador2@teste.com` | `teste123` | Maria Silva (4 doacoes, Vila Olimpia) |
| ONG | `ong@teste.com` | `teste123` | ONG Teste (CNPJ 00.000.000/0001-00) |
| ONG | `ong2@teste.com` | `teste123` | Abrigo Esperanca (CNPJ 11.222.333/0001-44) |
| Admin | `admin@teste.com` | `teste123` | Admin Teste (acesso ao dashboard admin) |

> Atencao: as senhas sao apenas para o seed automatico; altere em producao.

---

## Endpoints principais

| Metodo | Rota | Descricao | Auth |
|---|---|---|---|
| `GET`  | `/` | Index / health basico | nao |
| `GET`  | `/openapi.json` | Schema OpenAPI completo | nao |
| `POST` | `/auth/login` | Login (retorna JWT) | nao |
| `GET`  | `/auth/me` | Usuario logado | sim |
| `GET`  | `/users/me` | Perfil do usuario | sim |
| `GET`  | `/dashboard/?perfil=doador\|ong\|admin` | Dashboard do perfil | sim |
| `GET`  | `/doacoes/` | Lista doacoes (filtros: `limit`, `offset`) | sim |
| `POST` | `/doacoes/` | Cadastra doacao (pipeline automatico: cadastrado→analisado→matched→notificado) | sim |
| `GET`  | `/doacoes/{id}` | Detalhes de uma doacao | sim |
| `DELETE` | `/doacoes/{id}` | Remove doacao (hard delete + remove foto) | sim |
| `PATCH` | `/doacoes/{id}/status` | Atualiza status (reservar, coletar) | sim |
| `POST` | `/doacoes/upload-foto` | Upload de foto (multipart) | sim |
| `GET`  | `/doacoes/ongs/me/doacoes` | Doacoes recebidas pela ONG | sim (ong) |
| `GET`  | `/ongs/me` | Perfil da ONG logada | sim (ong) |
| `GET`  | `/historico/me` | Historico de atendimento semanal | sim (ong) |
| `POST` | `/historico/` | Registra quantidade atendida (upsert por semana) | sim (ong) |
| `GET`  | `/notifications/` | Lista notificacoes (`?unread_only=true`, `?category=...`) | sim |
| `PATCH`| `/notifications/{id}/read` | Marca notificacao como lida | sim |
| `POST` | `/notifications/trigger-expiry` | Dispara alertas de validade expirando | sim |

Para a lista completa: `http://localhost:8000/openapi.json`

---

## Testando a API

### 1. Login (gera token JWT)

```bash
curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"doador@teste.com","senha":"teste123"}'
```

Resposta:

```json
{
  "access_token": "eyJhbGciOiJIUzI1...",
  "token_type": "bearer"
}
```

Guarde o token em uma variavel de shell:

```bash
# Apos o login acima, o access_token vem no JSON. Capture com:
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"doador@teste.com","senha":"teste123"}' \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['access_token'])")
echo "$TOKEN"   # mostra o JWT
```

### 2. Endpoint autenticado (minhas doacoes)

```bash
curl -s http://localhost:8000/doacoes/ \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Listar notificacoes nao lidas

```bash
curl -s "http://localhost:8000/notifications/?unread_only=true" \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Dashboard do doador

```bash
curl -s "http://localhost:8000/dashboard/?perfil=doador" \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Auto-fill de CEP (publico, ViaCEP)

```bash
curl -s -X POST http://localhost:8000/auth/cep/01310100
```

Resposta:

```json
{
  "cep": "01310-100",
  "logradouro": "Avenida Paulista",
  "bairro": "Bela Vista",
  "cidade": "Sao Paulo",
  "uf": "SP",
  "latitude": -23.561414,
  "longitude": -46.655881
}
```

CEP invalido → **HTTP 404** com `{"detail": "CEP nao encontrado"}`.

### 6. Upload + cadastro de doacao (fluxo completo)

```bash
# 1. Upload da foto
curl -s -X POST http://localhost:8000/doacoes/upload-foto \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@./minha_foto.jpg"

# Resposta: {"url": "http://localhost:8000/uploads/fotos_doacoes/abc123.jpg"}

# 2. Cadastra a doacao (pipeline roda automaticamente)
curl -s -X POST http://localhost:8000/doacoes/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo_alimento": "Tomates Italianos",
    "categoria": "Vegetais",
    "quantidade": 3.0,
    "unidade_medida": "kg",
    "data_validade": "2026-12-31",
    "urgencia": "media",
    "foto_url": "http://localhost:8000/uploads/fotos_doacoes/abc123.jpg"
  }'
```

O `POST /doacoes/` dispara automaticamente:
- ML de urgencia (se ainda nao calculada)
- Matching com ONGs proximas (score: urgencia + demanda + distancia)
- Notificacao para o doador quando a ONG reserva (`status=notificado`)
- Notificacao quando a ONG coleta (`status=coletado`)

### 7. Listar todos os endpoints

```bash
curl -s http://localhost:8000/openapi.json | python3 -m json.tool | head -40
```

---

## Estrutura

```
backend/
├── main.py              # entrypoint FastAPI + serve SPA
├── config.py            # Settings (TEST_MODE, DATABASE_URL, SECRET_KEY)
├── create_db.py         # script de init do banco
├── auth/                # login, cadastro, JWT, CEP (ViaCEP)
├── doacoes/             # CRUD de doacoes + matching + notifications
├── matching/            # algoritmo de matching + geocoding
├── ml/                  # modelo de demanda (statsforecast) + urgencia
├── dashboard/           # agregacoes para os portais (doador/ong/admin)
├── historico/           # registro de atendimento semanal da ONG
├── notifications/       # in-app notifications (status, expiry, scarcity, system)
├── database/            # sessao SQLAlchemy + modelos
├── models/              # artefatos .pkl (ignorados pelo git)
├── uploads/             # fotos das doacoes (criado em runtime)
├── alembic/             # migracoes
├── alimenta.db          # banco SQLite (gitignored)
├── requirements.txt
└── README.md
```

---

## Frontend buildado (Expo Web)

O mesmo uvicorn serve o frontend estatico do Expo. Apos rodar
`npx expo export -p web` no diretorio `frontend/Alimenta-AI/`, copie o
`dist/` para `backend/static/` e o backend passa a servir:

- `GET /`            → index.html do SPA
- `GET /donor`       → roteamento client-side (redireciona via JS)
- `GET /ngo`         → idem
- `GET /admin`       → idem
- `GET /_expo/static/*` → JS/CSS/assets do bundle
- `GET /uploads/*`   → fotos das doacoes

Vantagem: 1 unico processo, sem CORS, mesma porta.

---

## Modo producao (resumo)

```bash
# 1. Gerar SECRET_KEY
export SECRET_KEY=$(python -c "import secrets; print(secrets.token_hex(32))")

# 2. Definir banco (PostgreSQL recomendado)
export DATABASE_URL="postgresql://usuario:senha@host:5432/alimenta"

# 3. Rodar migracoes
alembic upgrade head

# 4. Subir com workers
unset TEST_MODE
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## Problemas comuns

- **`ValueError: SECRET_KEY nao configurada...`** → Defina `SECRET_KEY` ou rode com `TEST_MODE=true`.
- **`Address already in use` na porta 8000** → `lsof -i :8000` (ou `netstat -tlnp | grep 8000` no Linux), mate o PID, ou use outra porta (`--port 8001`).
- **`alimenta.db` lockado** → Pare todos os processos uvicorn e apague `alimenta.db-journal`.
- **`ModuleNotFoundError: fastapi`** → Ative a venv: `source .venv/bin/activate` (Linux/macOS) ou `.venv\Scripts\activate` (Windows).
- **Frontend carrega mas login retorna 401** → Confirme o email/senha. O banco de seed tem `doador@teste.com` / `teste123`. Se digitou errado, nao ha retry automatico.
- **Deleção de doacao deixa logs orfaos** → Garanta que `database/connection.py` tem o `PRAGMA foreign_keys=ON` (ja incluido por padrao).
- **Frontend 404 em `/ngo`, `/donor`, etc** → O bundle Expo nao foi copiado para `backend/static/`, ou a rota foi acessada direto na porta errada. Use a URL do backend (`http://localhost:8000/donor`), nao de um servidor de SPA separado.
- **ML nao roda (`statsforecast` pesado)** → Normal no primeiro start, demora ~10-20s. Modelos treinados sao cacheados em `models/`.

---

## Licenca

AEP — Academico (uso educacional).
