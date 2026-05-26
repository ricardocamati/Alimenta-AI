# Alimenta.AI — Documentacao da API

Base URL: `http://localhost:8000`

Autenticacao: Bearer JWT (exceto endpoints publicos marcados como "Publico").

---

## POST /auth/register

Cadastra um novo usuario (doador ou ONG).

- **Autenticacao**: Publico
- **Content-Type**: `application/json`

### Request Body

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|:-----------:|-----------|
| `nome` | string | Sim | Nome completo |
| `email` | string | Sim | Email valido (unico) |
| `senha` | string | Sim | Minimo 6 caracteres |
| `tipo` | string | Sim | `"doador"` ou `"ong"` |
| `cpf_cnpj` | string | Nao | CPF (`000.000.000-00`) ou CNPJ (`00.000.000/0000-00`) |
| `endereco` | string | Nao | Endereco completo |
| `telefone` | string | Nao | Telefone de contato |
| `ong` | object | Condicional | Obrigatorio se `tipo="ong"` (ver subcampos) |

#### Subcampos de `ong`

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|:-----------:|-----------|
| `cnpj` | string | Sim | CNPJ da ONG |
| `capacidade_atendimento` | int | Sim | Pessoas atendidas por semana |
| `latitude` | float | Sim | Coordenada geografica |
| `longitude` | float | Sim | Coordenada geografica |

### Exemplo — Cadastro de Doador

```json
POST /auth/register
{
  "nome": "Maria Silva",
  "email": "maria@exemplo.com",
  "senha": "minhaSenha123",
  "tipo": "doador",
  "cpf_cnpj": "123.456.789-00",
  "endereco": "Rua das Flores, 100, Sao Paulo - SP",
  "telefone": "11999998888"
}
```

**Response (201)**:

```json
{
  "id": 1,
  "nome": "Maria Silva",
  "email": "maria@exemplo.com",
  "tipo": "doador",
  "cpf_cnpj": "123.456.789-00",
  "endereco": "Rua das Flores, 100, Sao Paulo - SP",
  "telefone": "11999998888",
  "criado_em": "2026-05-25T12:00:00",
  "ong": null
}
```

### Exemplo — Cadastro de ONG

```json
POST /auth/register
{
  "nome": "Banco de Alimentos SP",
  "email": "contato@bancosp.org.br",
  "senha": "senhaForte456",
  "tipo": "ong",
  "cpf_cnpj": "12.345.678/0001-99",
  "endereco": "Av. Paulista, 1000, Sao Paulo - SP",
  "telefone": "1133334444",
  "ong": {
    "cnpj": "12.345.678/0001-99",
    "capacidade_atendimento": 200,
    "latitude": -23.5629,
    "longitude": -46.6544
  }
}
```

**Response (201)**:

```json
{
  "id": 2,
  "nome": "Banco de Alimentos SP",
  "email": "contato@bancosp.org.br",
  "tipo": "ong",
  "cpf_cnpj": "12.345.678/0001-99",
  "endereco": "Av. Paulista, 1000, Sao Paulo - SP",
  "telefone": "1133334444",
  "criado_em": "2026-05-25T12:01:00",
  "ong": {
    "id": 1,
    "cnpj": "12.345.678/0001-99",
    "capacidade_atendimento": 200,
    "latitude": -23.5629,
    "longitude": -46.6544
  }
}
```

### Codigos HTTP

| Codigo | Significado |
|--------|------------|
| `201` | Usuario criado com sucesso |
| `409` | Email ou CPF/CNPJ ja cadastrado |
| `422` | Erro de validacao (CPF/CNPJ invalido, senha curta, ONG sem campo `ong`) |

---

## POST /auth/login

Autentica um usuario e retorna token JWT.

- **Autenticacao**: Publico

### Request Body

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|:-----------:|-----------|
| `email` | string | Sim | Email cadastrado |
| `senha` | string | Sim | Senha |

### Exemplo

```json
POST /auth/login
{
  "email": "maria@exemplo.com",
  "senha": "minhaSenha123"
}
```

**Response (200)**:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Codigos HTTP

| Codigo | Significado |
|--------|------------|
| `200` | Login bem-sucedido |
| `401` | Email ou senha invalidos |

---

## GET /auth/me

Retorna os dados do usuario autenticado.

- **Autenticacao**: Bearer JWT

### Headers

```
Authorization: Bearer <access_token>
```

### Exemplo

```
GET /auth/me
```

**Response (200)**:

```json
{
  "id": 1,
  "nome": "Maria Silva",
  "email": "maria@exemplo.com",
  "tipo": "doador",
  "cpf_cnpj": "123.456.789-00",
  "endereco": "Rua das Flores, 100, Sao Paulo - SP",
  "telefone": "11999998888",
  "criado_em": "2026-05-25T12:00:00",
  "ong": null
}
```

### Codigos HTTP

| Codigo | Significado |
|--------|------------|
| `200` | Dados do usuario |
| `401` | Token invalido, expirado ou ausente |

---

## POST /doacoes

Cria uma nova doacao de alimento. Apos persistir, dispara analise de urgencia (sincrona) e matching (BackgroundTask).

- **Autenticacao**: Bearer JWT (apenas perfil `doador`)

### Request Body

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|:-----------:|-----------|
| `tipo_alimento` | string | Sim | Ex: `"macarrao"`, `"arroz"`, `"banana"` |
| `categoria` | string | Sim | `"perecivel_alto"`, `"perecivel_medio"` ou `"perecivel_baixo"` |
| `quantidade` | float | Sim | Quantidade em kg ou unidades (> 0) |
| `data_validade` | date | Sim | Data futura (formato `YYYY-MM-DD`) |
| `foto_url` | string | Nao | URL da foto do alimento |
| `latitude` | float | Nao | Coordenada GPS do local da doacao |
| `longitude` | float | Nao | Coordenada GPS do local da doacao |

### Exemplo

```json
POST /doacoes
Authorization: Bearer <token>

{
  "tipo_alimento": "macarrao",
  "categoria": "perecivel_baixo",
  "quantidade": 25.0,
  "data_validade": "2026-08-15",
  "foto_url": "https://img.exemplo.com/macarrao.jpg",
  "latitude": -23.5505,
  "longitude": -46.6333
}
```

**Response (201)**:

```json
{
  "id": 1,
  "doador_id": 1,
  "tipo_alimento": "macarrao",
  "categoria": "perecivel_baixo",
  "quantidade": 25.0,
  "foto_url": "https://img.exemplo.com/macarrao.jpg",
  "data_validade": "2026-08-15",
  "latitude": -23.5505,
  "longitude": -46.6333,
  "status": "analisado",
  "urgencia": "baixa",
  "score_matching": null,
  "criado_em": "2026-05-25T12:05:00",
  "atualizado_em": "2026-05-25T12:05:00"
}
```

**Nota**: O status final da resposta vem como `"analisado"` com `urgencia` ja preenchida. A transicao para `"matched"` e `"notificado"` ocorre via BackgroundTask apos a resposta ser enviada ao cliente.

### Exemplo — Sem GPS (FA2)

```json
POST /doacoes
Authorization: Bearer <token>

{
  "tipo_alimento": "alface",
  "categoria": "perecivel_alto",
  "quantidade": 3.0,
  "data_validade": "2026-05-28"
}
```

**Response (201)**: `latitude` e `longitude` retornam `null`. O sistema usa `(0.0, 0.0)` como fallback no matching e emite um log de aviso.

### Codigos HTTP

| Codigo | Significado |
|--------|------------|
| `201` | Doacao criada e analisada com sucesso |
| `401` | Token invalido ou ausente |
| `403` | Usuario nao e doador (ONG ou admin) |
| `422` | Data de validade passada (`FA1`), quantidade <= 0, ou campos obrigatorios ausentes |

---

## GET /doacoes

Lista as doacoes do doador autenticado com paginacao.

- **Autenticacao**: Bearer JWT (apenas perfil `doador`)

### Query Parameters

| Parametro | Tipo | Padrao | Min | Max | Descricao |
|-----------|------|--------|-----|-----|-----------|
| `limit` | int | 20 | 1 | 100 | Itens por pagina |
| `offset` | int | 0 | 0 | — | Deslocamento (pagina) |

### Exemplo

```
GET /doacoes/?limit=5&offset=0
Authorization: Bearer <token>
```

**Response (200)**:

```json
[
  {
    "id": 3,
    "doador_id": 1,
    "tipo_alimento": "alface",
    "categoria": "perecivel_alto",
    "quantidade": 3.0,
    "foto_url": null,
    "data_validade": "2026-05-28",
    "latitude": null,
    "longitude": null,
    "status": "notificado",
    "urgencia": "critica",
    "score_matching": 0.3,
    "criado_em": "2026-05-25T12:06:00",
    "atualizado_em": "2026-05-25T12:06:01"
  }
]
```

### Codigos HTTP

| Codigo | Significado |
|--------|------------|
| `200` | Lista de doacoes (array, pode estar vazio) |
| `401` | Token invalido ou ausente |
| `403` | Usuario nao e doador |

---

## GET /doacoes/{id}

Retorna detalhes completos de uma doacao, incluindo o historico de transicoes.

- **Autenticacao**: Bearer JWT (apenas perfil `doador`, apenas doacoes proprias)

### Path Parameters

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | int | ID da doacao |

### Exemplo

```
GET /doacoes/3
Authorization: Bearer <token>
```

**Response (200)**:

```json
{
  "id": 3,
  "doador_id": 1,
  "tipo_alimento": "alface",
  "categoria": "perecivel_alto",
  "quantidade": 3.0,
  "foto_url": null,
  "data_validade": "2026-05-28",
  "latitude": null,
  "longitude": null,
  "status": "notificado",
  "urgencia": "critica",
  "score_matching": 0.3,
  "criado_em": "2026-05-25T12:06:00",
  "atualizado_em": "2026-05-25T12:06:01",
  "logs": [
    {
      "id": 10,
      "estado_anterior": "",
      "estado_novo": "cadastrado",
      "timestamp": "2026-05-25T12:06:00",
      "descricao": "Doacao cadastrada pelo doador"
    },
    {
      "id": 11,
      "estado_anterior": "cadastrado",
      "estado_novo": "analisado",
      "timestamp": "2026-05-25T12:06:00",
      "descricao": "Analise de urgencia realizada pelo motor de ML"
    },
    {
      "id": 12,
      "estado_anterior": "analisado",
      "estado_novo": "matched",
      "timestamp": "2026-05-25T12:06:01",
      "descricao": "Matching calculado: ONG 1 selecionada (score=0.3000)"
    },
    {
      "id": 13,
      "estado_anterior": "matched",
      "estado_novo": "notificado",
      "timestamp": "2026-05-25T12:06:01",
      "descricao": "ONG 1 notificada (simulacao)"
    }
  ]
}
```

### Codigos HTTP

| Codigo | Significado |
|--------|------------|
| `200` | Detalhes completos com logs |
| `401` | Token invalido ou ausente |
| `403` | Usuario nao e doador |
| `404` | Doacao nao encontrada ou pertence a outro doador |

---

## GET /dashboard

Retorna metricas agregadas conforme o perfil do usuario autenticado. A resposta varia de acordo com o `tipo` do usuario (doador, ong ou admin).

- **Autenticacao**: Bearer JWT (qualquer perfil)

### Perfil: Doador

**Response (200)**:

```json
{
  "perfil": "doador",
  "total_doacoes": 3,
  "doacoes_confirmadas": 0,
  "doacoes_canceladas": 0,
  "taxa_aproveitamento": 0.0,
  "tempo_medio_coleta_horas": null,
  "distribuicao_urgencia": {
    "baixa": 1,
    "media": 0,
    "alta": 0,
    "critica": 2
  },
  "ultimas_doacoes": [
    {
      "id": 3,
      "tipo_alimento": "alface",
      "urgencia": "critica",
      "status": "notificado",
      "criado_em": "2026-05-25T12:06:00"
    }
  ]
}
```

### Perfil: ONG

| Campo | Descricao |
|-------|-----------|
| `total_doacoes_recebidas` | Doacoes com status `"confirmado"` atribuidas a esta ONG |
| `demanda_prevista_proxima_semana` | Previsao do modelo `DemandPredictor` (statsforecast) |
| `alerta_escassez` | `true` se `demanda_prevista > media_historica * 1.3` |
| `doacoes_pendentes` | Doacoes com status `"notificado"` aguardando coleta |
| `distribuicao_categorias` | Contagem por categoria dos itens recebidos |

**Response (200)**:

```json
{
  "perfil": "ong",
  "total_doacoes_recebidas": 0,
  "demanda_prevista_proxima_semana": 120.0,
  "alerta_escassez": false,
  "doacoes_pendentes": 1,
  "distribuicao_categorias": {},
  "ultimas_doacoes": []
}
```

### Perfil: Admin

| Campo | Descricao |
|-------|-----------|
| `total_usuarios` | Total de usuarios cadastrados |
| `total_doacoes` | Total de doacoes no sistema |
| `total_ongs` | Total de ONGs cadastradas |
| `taxa_aproveitamento_geral` | `confirmadas / total` global |
| `doacoes_por_status` | Contagem de cada status (AFD) |
| `doacoes_por_urgencia` | Contagem por nivel de urgencia |
| `top_5_doadores` | Top doadores por volume de doacoes |
| `top_5_ongs` | Top ONGs por volume de doacoes recebidas |

**Response (200)**:

```json
{
  "perfil": "admin",
  "total_usuarios": 5,
  "total_doacoes": 3,
  "total_ongs": 1,
  "taxa_aproveitamento_geral": 0.0,
  "tempo_medio_coleta_horas": null,
  "doacoes_por_status": {
    "analisado": 2,
    "notificado": 1
  },
  "doacoes_por_urgencia": {
    "baixa": 1,
    "critica": 2
  },
  "top_5_doadores": [
    {
      "nome": "Maria Silva",
      "total_doacoes": 3,
      "taxa_aproveitamento": 0.0
    }
  ],
  "top_5_ongs": []
}
```

### Codigos HTTP

| Codigo | Significado |
|--------|------------|
| `200` | Dashboard com metricas do perfil |
| `401` | Token invalido ou ausente |
