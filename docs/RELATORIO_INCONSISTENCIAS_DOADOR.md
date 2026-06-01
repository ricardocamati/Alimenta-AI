# RELATÓRIO — Portal do Doador
**Data:** 2026-06-01
**URL:** 192.168.68.104:8081/donor

## 🔴 CRÍTICA — Identidade do Usuário Errada
Loguei como `doador@teste.com` mas exibe "Supermercado Central".
Causa: TEST_MODE=true retorna usuário errado ou authStore stale.

## 🟡 MÉDIA — Ícones das Doações
Todas as 5 doações exibem 🥬. Esperado: 🥩 🥛 🍞 🍎 por categoria.

## 🟡 MÉDIA — Estatísticas Confusas
5 doações, 0 kg coletados, 5 em análise. Sem histórico de coleta.

## 🟡 MÉDIA — Escala de Score Inconsistente
Notificação: score 90 (escala 0-100) vs Doações: 0.3-0.6 (escala 0.0-1.0)

## 🟡 MÉDIA — Notificação vs Ícone
Notificação "Carne Bovina" mas ícone 🥬 em todas as doações.

## 💡 RECOMENDAÇÕES
1. Corrigir auth/TEST_MODE
2. Mapear ícones por tipo
3. Padronizar escala de score
