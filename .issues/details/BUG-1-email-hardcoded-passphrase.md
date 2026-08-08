# BUG-1: Email owner@fintrack.local hardcoded no bundle do browser

## Descrição

Achado M-01 do SECURITY_FINDINGS.md (aberto desde 2026-05-23, único MÉDIO): `src/app/(auth)/passphrase/page.tsx:21` tem o email `owner@fintrack.local` hardcoded num Client Component — vai para o bundle do browser e reduz o ataque à password apenas (o atacante já conhece o identificador da conta).

## Acceptance Criteria

- [ ] O email não aparece no bundle do browser (mover para env server-side ou trocar o fluxo de auth)
- [ ] Login por passphrase continua funcional (smoke E2E verde)
- [ ] M-01 marcado Resolvido no SECURITY_FINDINGS.md

## Notas técnicas

- O login usa `signInWithPassword` com email fixo + passphrase; qualquer solução tem de manter o fluxo single-user
