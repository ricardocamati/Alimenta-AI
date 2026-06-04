# RELATÓRIO — Portal da ONG
**Data:** 2026-06-01
**URL:** 192.168.68.104:8081/ngo

## 🔴 CRÍTICA — Redirecionamento para Admin
Login `ong@teste.com` redireciona para `/admin` em vez de `/ngo`.
Causa: TEST_MODE=true anula validação JWT.

## 🔴 CRÍTICA — Botões de Ação Incompletos
**Existentes (3):** Marcar Coletado, Confirmar Recebido, Cancelar
**Faltando (3):** 🔒 Reservar Doação, 📅 Agendar Coleta, 📨 Notificar Interesse

O fluxo pula de Matched → Coletado, ignorando Notificado.

## 🟡 MÉDIA — Total Confirmado: 0 kg (Sempre)
Nenhuma doação matched tem status "Confirmado" no store.

## 🟡 MÉDIA — Timeline Vazia
`donation.history` vazio. Nenhuma transição aparece preenchida.

## 🟡 MÉDIA — Falta Configuração de Recebimento
Não existe seção para ONG definir: tipos aceitos, horários, raio de coleta, capacidade.

## 🟡 MÉDIA — Score Sempre 0
`matchScore` não populado no store.

## 💡 RECOMENDAÇÕES
1. Corrigir auth/TEST_MODE
2. Botões condicionais por status
3. Popular mock com histórico
4. Criar card de Configuração de Recebimento
5. Popular matchScore do backend
