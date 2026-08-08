# TD-4: Branch protection em main (A1)

## Descrição

Único passo em falta da Fase 1 do CI (TODO.md, A1): configurar branch protection/ruleset em `main` com required status check = "Deterministic gate". Sem isto o CI é informativo — vermelho não bloqueia merge nem push. Acção manual do utilizador (GitHub UI ou `gh api` com credenciais de admin).

## Acceptance Criteria

- [ ] `main` exige o check "Deterministic gate" verde para merge
- [ ] "Require a pull request before merging" activo (bloqueia push directo)
- [ ] Prova de que morde: PR com check vermelho não permite merge; com verde permite

## Notas técnicas

- Nota: a protecção GH013 já foi observada em pushes directos (memória do projecto) — confirmar na UI que o required check está seleccionado, não apenas a exigência de PR
