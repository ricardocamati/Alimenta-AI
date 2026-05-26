# Alimenta.AI — Documentacao do Banco de Dados

Banco: **SQLite** (`alimenta.db`)  
ORM: **SQLAlchemy 2.x** (DeclarativeBase)  
Migrations: **Alembic**

---

## Diagrama Entidade-Relacionamento

```mermaid
erDiagram
    USUARIOS ||--o{ DOACOES : "doador_id (FK)"
    USUARIOS ||--o| ONGS : "usuario_id (FK, unique)"
    DOACOES ||--o{ LOGS_AFD : "doacao_id (FK)"
    DOACOES ||--o{ SCORES_MATCHING : "doacao_id (FK)"
    ONGS ||--o{ HISTORICO_ATENDIMENTO : "ong_id (FK)"
    ONGS ||--o{ SCORES_MATCHING : "ong_id (FK)"
    DOACOES }o--o| ONGS : "ong_matched_id (FK, nullable)"

    USUARIOS {
        int id PK
        string nome
        string email UK
        string senha_hash
        enum tipo "doador|ong|admin"
        string cpf_cnpj UK
        string endereco
        string telefone
        datetime criado_em
    }

    DOACOES {
        int id PK
        int doador_id FK
        int ong_matched_id FK
        string tipo_alimento
        string categoria
        float quantidade
        string foto_url
        date data_validade
        float latitude
        float longitude
        enum status "cadastrado|analisado|matched|notificado|coletado|confirmado|cancelado"
        enum urgencia "baixa|media|alta|critica"
        float score_matching
        datetime criado_em
        datetime atualizado_em
    }

    ONGS {
        int id PK
        int usuario_id FK_UK
        string cnpj UK
        int capacidade_atendimento
        float latitude
        float longitude
    }

    HISTORICO_ATENDIMENTO {
        int id PK
        int ong_id FK
        date semana
        int quantidade_atendida
    }

    LOGS_AFD {
        int id PK
        int doacao_id FK
        string estado_anterior
        string estado_novo
        datetime timestamp
        text descricao
    }

    SCORES_MATCHING {
        int id PK
        int doacao_id FK
        int ong_id FK
        float urgencia_peso
        float demanda_peso
        float distancia_peso
        float score_final
        datetime calculado_em
    }
```

---

## Tabelas

### 1. `usuarios`

Usuarios do sistema. Cada usuario pode ser doador, ONG ou admin.

| Coluna | Tipo SQLite | Restricoes | Descricao |
|--------|------------|------------|-----------|
| `id` | INTEGER | PK, AUTOINCREMENT | Identificador unico |
| `nome` | VARCHAR(200) | NOT NULL | Nome completo |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE, INDEX | Email (usado para login) |
| `senha_hash` | VARCHAR(255) | NOT NULL | Hash bcrypt da senha |
| `tipo` | VARCHAR(6) | NOT NULL | `doador`, `ong` ou `admin` |
| `cpf_cnpj` | VARCHAR(20) | UNIQUE, NULLABLE | CPF ou CNPJ formatado |
| `endereco` | VARCHAR(500) | NULLABLE | Endereco completo |
| `telefone` | VARCHAR(20) | NULLABLE | Telefone de contato |
| `criado_em` | DATETIME | NOT NULL, DEFAULT NOW | Data de criacao |

**Relacionamentos**:
- `doacoes` — lista de doacoes do usuario (se doador)
- `ong` — perfil da ONG vinculado (1:1, se tipo="ong")

### 2. `doacoes`

Doacoes de alimentos cadastradas pelos doadores.

| Coluna | Tipo SQLite | Restricoes | Descricao |
|--------|------------|------------|-----------|
| `id` | INTEGER | PK, AUTOINCREMENT | Identificador unico |
| `doador_id` | INTEGER | FK → usuarios.id, NOT NULL, INDEX, ON DELETE CASCADE | Doador que criou a doacao |
| `ong_matched_id` | INTEGER | FK → ongs.id, NULLABLE, ON DELETE SET NULL | ONG selecionada pelo matching |
| `tipo_alimento` | VARCHAR(100) | NOT NULL | Ex: `"arroz"`, `"alface"`, `"carne"` |
| `categoria` | VARCHAR(100) | NOT NULL | `perecivel_alto`, `perecivel_medio` ou `perecivel_baixo` |
| `quantidade` | FLOAT | NOT NULL | Quantidade em kg ou unidades |
| `foto_url` | VARCHAR(500) | NULLABLE | URL da foto do alimento |
| `data_validade` | DATE | NOT NULL | Data de validade |
| `latitude` | FLOAT | NULLABLE | Coordenada GPS (FA2: opcional) |
| `longitude` | FLOAT | NULLABLE | Coordenada GPS (FA2: opcional) |
| `status` | VARCHAR(10) | NOT NULL, INDEX, DEFAULT="cadastrado" | Estado atual no ciclo de vida |
| `urgencia` | VARCHAR(7) | NOT NULL, DEFAULT="baixa" | Nivel de urgencia predito pelo ML |
| `score_matching` | FLOAT | NULLABLE | Score da melhor ONG no matching |
| `criado_em` | DATETIME | NOT NULL, DEFAULT NOW | Data de criacao |
| `atualizado_em` | DATETIME | NOT NULL, ON UPDATE NOW | Data da ultima atualizacao |

**Relacionamentos**:
- `doador` → Usuario (via `doador_id`)
- `ong_matched` → ONG (via `ong_matched_id`, nullable)
- `logs` → lista de LogAFD
- `scores` → lista de ScoreMatching

### 3. `ongs`

Organizacoes receptoras de alimentos.

| Coluna | Tipo SQLite | Restricoes | Descricao |
|--------|------------|------------|-----------|
| `id` | INTEGER | PK, AUTOINCREMENT | Identificador unico |
| `usuario_id` | INTEGER | FK → usuarios.id, UNIQUE, NOT NULL, ON DELETE CASCADE | Usuario vinculado (1:1) |
| `cnpj` | VARCHAR(20) | UNIQUE, NOT NULL | CNPJ da ONG |
| `capacidade_atendimento` | INTEGER | NOT NULL | Pessoas atendidas por semana |
| `latitude` | FLOAT | NOT NULL | Coordenada geografica |
| `longitude` | FLOAT | NOT NULL | Coordenada geografica |

**Relacionamentos**:
- `usuario` → Usuario (via `usuario_id`, 1:1)
- `historico` → lista de HistoricoAtendimento
- `scores` → lista de ScoreMatching

### 4. `historico_atendimento`

Historico semanal de pessoas atendidas por cada ONG. Alimenta o modelo de previsao de demanda.

| Coluna | Tipo SQLite | Restricoes | Descricao |
|--------|------------|------------|-----------|
| `id` | INTEGER | PK, AUTOINCREMENT | Identificador unico |
| `ong_id` | INTEGER | FK → ongs.id, NOT NULL, INDEX, ON DELETE CASCADE | ONG |
| `semana` | DATE | NOT NULL | Segunda-feira da semana |
| `quantidade_atendida` | INTEGER | NOT NULL | Pessoas atendidas na semana |

### 5. `logs_afd`

Registro de auditoria de cada transicao de estado de uma doacao. Rastreabilidade completa do ciclo de vida.

| Coluna | Tipo SQLite | Restricoes | Descricao |
|--------|------------|------------|-----------|
| `id` | INTEGER | PK, AUTOINCREMENT | Identificador unico |
| `doacao_id` | INTEGER | FK → doacoes.id, NOT NULL, INDEX, ON DELETE CASCADE | Doacao rastreada |
| `estado_anterior` | VARCHAR(50) | NOT NULL | Estado antes da transicao |
| `estado_novo` | VARCHAR(50) | NOT NULL | Estado apos a transicao |
| `timestamp` | DATETIME | NOT NULL, DEFAULT NOW | Momento da transicao |
| `descricao` | TEXT | NULLABLE | Descricao da transicao |

### 6. `scores_matching`

Scores parciais e final do matching entre uma doacao e todas as ONGs disponiveis.

| Coluna | Tipo SQLite | Restricoes | Descricao |
|--------|------------|------------|-----------|
| `id` | INTEGER | PK, AUTOINCREMENT | Identificador unico |
| `doacao_id` | INTEGER | FK → doacoes.id, NOT NULL, ON DELETE CASCADE | Doacao avaliada |
| `ong_id` | INTEGER | FK → ongs.id, NOT NULL, ON DELETE CASCADE | ONG candidata |
| `urgencia_peso` | FLOAT | NOT NULL | Peso da urgencia (0.25, 0.50, 0.75 ou 1.0) |
| `demanda_peso` | FLOAT | NOT NULL | Peso normalizado da demanda prevista |
| `distancia_peso` | FLOAT | NOT NULL | Peso normalizado da distancia geografica |
| `score_final` | FLOAT | NOT NULL | Score composto: `0.4*u + 0.4*d - 0.2*dist` |
| `calculado_em` | DATETIME | NOT NULL, DEFAULT NOW | Momento do calculo |

---

## Enums

### TipoUsuario

| Valor | Descricao |
|-------|-----------|
| `doador` | Pessoa fisica ou empresa que doa alimentos |
| `ong` | Organizacao que recebe e redistribui alimentos |
| `admin` | Administrador do sistema |

### StatusDoacao

Ciclo de vida completo de uma doacao:

| Valor | Descricao |
|-------|-----------|
| `cadastrado` | Doacao registrada pelo doador |
| `analisado` | Urgencia calculada pelo motor de ML |
| `matched` | ONG selecionada com maior score |
| `notificado` | ONG notificada sobre a doacao |
| `coletado` | Alimento coletado pela ONG |
| `confirmado` | Entrega confirmada pelo receptor |
| `cancelado` | Doacao cancelada |

### Urgencia

Nivel de urgencia de consumo do alimento:

| Valor | Criterio |
|-------|----------|
| `baixa` | > 7 dias ate o vencimento |
| `media` | 4 a 7 dias ate o vencimento |
| `alta` | 2 a 3 dias ate o vencimento |
| `critica` | <= 1 dia ate o vencimento |

**Nota**: Carnes e laticinios sobem 1 nivel de urgencia (ex: 3 dias para carne = `"critica"` ao inves de `"alta"`).

---

## Indices

| Tabela | Coluna(s) | Proposito |
|--------|-----------|-----------|
| `usuarios` | `email` (UNIQUE) | Busca rapida por email no login |
| `doacoes` | `doador_id` | Listagem de doacoes por doador |
| `doacoes` | `status` | Filtro por estado no dashboard e matching |
| `historico_atendimento` | `ong_id` | Historico por ONG |
| `logs_afd` | `doacao_id` | Rastreabilidade de transicoes |
