# Task: Maquina de Estados AFD - classe DoacaoAFD com validacao de transicoes

## 1. Objetivo

Implementar uma classe de dominio chamada `DoacaoAFD` para controlar e validar as mudancas de estado de uma doacao, garantindo que somente transicoes permitidas acontecam.

A solucao deve:

- centralizar as regras de transicao em um unico lugar;
- impedir transicoes invalidas com erro explicito;
- registrar transicoes validas em `logs_afd`;
- facilitar manutencao e testes unitarios.

## 2. Contexto do projeto

Hoje o projeto ja possui:

- enum de status em `StatusDoacao` (modelos do banco);
- historico de transicoes em `LogAFD`;
- transicoes distribuidas entre servicos de doacoes e matching.

Estados atuais no sistema:

1. `cadastrado`
2. `analisado`
3. `matched`
4. `notificado`
5. `coletado`
6. `confirmado`
7. `cancelado`

## 3. Resultado esperado da task

Ao final da task, qualquer alteracao em `Doacao.status` deve passar por `DoacaoAFD`, com validacao deterministica.

Exemplo esperado:

- permitido: `cadastrado -> analisado`
- permitido: `analisado -> matched`
- permitido: `matched -> notificado`
- permitido: `notificado -> coletado`
- permitido: `coletado -> confirmado`
- permitido: cancelamento a partir de estados nao finais
- proibido: `confirmado -> qualquer outro`
- proibido: `cancelado -> qualquer outro`

## 4. Especificacao formal do AFD

### 4.1 Conjunto de estados (Q)

Q = {
`cadastrado`, `analisado`, `matched`, `notificado`, `coletado`, `confirmado`, `cancelado`
}

### 4.2 Estado inicial (q0)

q0 = `cadastrado`

### 4.3 Estados finais (F)

F = { `confirmado`, `cancelado` }

### 4.4 Funcao de transicao (delta)

Transicoes validas recomendadas:

- `cadastrado -> analisado`
- `cadastrado -> cancelado`
- `analisado -> matched`
- `analisado -> cancelado`
- `matched -> notificado`
- `matched -> cancelado`
- `notificado -> coletado`
- `notificado -> cancelado`
- `coletado -> confirmado`
- `coletado -> cancelado`

Observacoes:

- `confirmado` e `cancelado` sao terminais (sem saida).
- `matched -> coletado` nao deve ser permitido sem passar por `notificado`.
- Se houver requisito de negocio para cancelar apos `coletado`, manter permitido como acima.

## 5. Requisitos tecnicos

## 5.1 Criar modulo de AFD

Criar arquivo sugerido:

- `backend/doacoes/afd.py`

Conteudo minimo:

- classe `TransicaoInvalidaError(Exception)`
- classe `DoacaoAFD`
- mapa de transicoes permitidas por estado
- metodo para validar transicao
- metodo para executar transicao e gerar `LogAFD`

Interface sugerida:

```python
class DoacaoAFD:
    @staticmethod
    def pode_transicionar(de: StatusDoacao, para: StatusDoacao) -> bool: ...

    @staticmethod
    def validar_transicao(de: StatusDoacao, para: StatusDoacao) -> None: ...

    @staticmethod
    def transicionar(
        *,
        doacao: Doacao,
        novo_status: StatusDoacao,
        db: AsyncSession,
        descricao: str | None = None,
    ) -> None: ...
```

## 5.2 Integrar nos servicos

Substituir atribuicoes diretas de status por `DoacaoAFD.transicionar(...)` nos pontos principais:

- `backend/doacoes/service.py`
  - `cadastrado -> analisado`
- `backend/matching/service.py`
  - `analisado -> matched`
  - `matched -> notificado`

Se existirem endpoints de coleta/confirmacao/cancelamento, integrar tambem.

## 5.3 Garantir log padrao

Cada transicao valida deve inserir um registro em `LogAFD` com:

- `doacao_id`
- `estado_anterior`
- `estado_novo`
- `descricao` (quando fornecida)

## 5.4 Tratamento de erro

Quando transicao for invalida:

- lancar `TransicaoInvalidaError` com mensagem clara;
- na camada de API, retornar HTTP 409 (`Conflict`) para tentativa de mudanca invalida de estado.

## 6. Criterios de aceitacao (Definition of Done)

1. Existe classe `DoacaoAFD` com regras centralizadas.
2. Nao ha mais mudanca de status critica por atribuicao direta nos fluxos principais.
3. Toda transicao valida gera `LogAFD` automaticamente.
4. Transicoes invalidas sao bloqueadas com erro padronizado.
5. Testes unitarios do AFD criados e passando.
6. Fluxo atual de criacao + matching continua funcional.

## 7. Plano de implementacao sugerido

1. Criar `backend/doacoes/afd.py` com mapa de transicoes e excecao customizada.
2. Refatorar `backend/doacoes/service.py` para usar `DoacaoAFD`.
3. Refatorar `backend/matching/service.py` para usar `DoacaoAFD`.
4. Revisar tratamento de erro nos routers (409 para transicao invalida).
5. Criar testes unitarios da classe AFD.
6. Executar testes e validar logs no banco.

## 8. Casos de teste minimos

- deve permitir `cadastrado -> analisado`
- deve permitir `analisado -> matched`
- deve bloquear `analisado -> confirmado`
- deve bloquear `confirmado -> analisado`
- deve bloquear `cancelado -> matched`
- deve gerar `LogAFD` em transicao valida
- deve manter estado original quando transicao invalida

## 9. Riscos e cuidados

- evitar transicoes manuais fora da classe (quebra de consistencia);
- manter sincronia entre enum `StatusDoacao` e mapa de transicoes;
- evitar duplicidade de logs ao refatorar codigo ja existente;
- garantir que operacoes assincronas de matching nao ignorem erro de transicao.

## 10. Entregaveis da task

- novo modulo de AFD em `backend/doacoes/afd.py`
- servicos refatorados para usar a classe
- ajustes de tratamento de erro na API (se aplicavel)
- testes unitarios de transicao
- breve nota em documentacao tecnica sobre o novo fluxo

## 11. Mensagem de commit sugerida

`feat(afd): adiciona DoacaoAFD para validar e registrar transicoes de status`
