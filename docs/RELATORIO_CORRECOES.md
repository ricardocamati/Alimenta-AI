# RELATÓRIO DE CORREÇÕES — Alimenta-AI

**Data:** 01/06/2026  
**Branch:** `AA-46-Integracao-com-API-axios-e-tratamento-de-erros-em-todas-as-telas`  
**Commits:** `66cd72a` → `5cc1758`

---

## ✅ Resumo por Categoria

### 🔴 CRÍTICO — TEST_MODE Retornava Admin para Todos
**Problema:** `get_current_user` em TEST_MODE sempre retornava `admin@teste.com`, independente do token.

**Fix:** `_get_test_overrides()` agora:
1. Extrai token do `Authorization` header via `Depends(oauth2_scheme)`
2. Decodifica JWT com `decode_access_token()`
3. Busca usuário real no banco pelo `sub` (user_id)
4. Só faz fallback para admin se token ausente/inválido

**Impacto:** Doador logado vê **seus próprios dados**, não do admin.

---

### 🔴 CRÍTICO — Auth Sync/Async Misturado
**Problema:** `register` e `login` usavam `get_db` (sync), enquanto `/me` usava `async_get_db` (async). Dois engines no SQLite = risco de lock.

**Fix:**
- `auth/service.py`: adicionado `register_async()` + `authenticate_async()`
- `auth/router.py`: `register` e `login` agora usam `async_get_db` + chamam versões async
- Versões sync (`register`, `authenticate`) mantidas como deprecated para compatibilidade

**Impacto:** Zero mistura sync/async. Tudo async puro.

---

### 🟡 MÉDIO — Ícones Sempre 🥬 (Verduras)
**Problema:** `getDonationPhoto()` fazia `FOOD_PHOTOS.find(p => p.id === 'vegetables')` hardcoded. Carne aparecia como 🥬.

**Fix:** Função agora infere `photoId` a partir de `tipo_alimento`:
| Tipo | Ícone |
|------|-------|
| carne, frango, peixe | 🥩 |
| pão, padaria, bolo | 🍞 |
| leite, laticínio, queijo | 🥛 |
| tomate | 🍅 |
| laranja, cítrico | 🍊 |
| verdura, legume, fruta | 🥬 |

---

### 🟡 MÉDIO — Identidade Hardcoded "Supermercado Central"
**Problema:** Fallback em `donor.tsx` mostrava `activeDonorName = 'Supermercado Central'` mesmo quando não logado.

**Fix:** Fallback agora é `user?.nome || 'Visitante'` e `activeDonorId = ''` (sem ID falso).

---

### 🟢 BAIXO — /health Database Error
**Problema:** `await result.fetchone()` causava `TypeError: object Row can't be used in 'await'`.

**Fix:** Removido `await` desnecessário. `row = result.fetchone()` (síncrono, já que `execute` foi awaited).

---

## 📊 Status dos 7 Problemas Originais

| # | Problema | Status | Commit |
|---|----------|--------|--------|
| 1 | TEST_MODE desabilita auth | ✅ **Corrigido** | `7a17d3e` |
| 2 | Auth sync/async misturado | ✅ **Corrigido** | `5cc1758` |
| 3 | Senha doador@teste.com errada | ✅ Corrigido (anterior) | `74584f7` |
| 4 | ML models inexistentes | ✅ Corrigido (anterior) | `74584f7` |
| 5 | Geocoding fallback (0,0) | ✅ Corrigido (anterior) | `74584f7` |
| 6 | Falta /health | ✅ Corrigido (anterior) | `74584f7` |
| 7 | Startup polui logs | 🔶 **Pendente** | — |

---

## 🚀 Próximos Passos Recomendados

1. **Testar login real** no frontend (doador@teste.com → deve ir para /donor com nome correto)
2. **Testar ícones** (criar doação de Carne → deve mostrar 🥩)
3. **Desabilitar TEST_MODE** quando for para produção (`TEST_MODE=false` no .env)
4. **Corrigir startup logs** (usuários de teste só criar se DB vazio)

---

*Gerado por Hermes Agent — 01/06/2026*
