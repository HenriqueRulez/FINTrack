// Guard do auto-heal do lockfile (item A4 do TODO).
//
// Contexto: o passo "Instalar deps" do ci.yml cai para `npm install` quando o
// `npm ci` falha pela divergência crónica do lockfile Windows×Linux (optional
// deps wasm — ver TODO secção 1b). Esse fallback reconcilia o package-lock.json
// neste run e aceitava ATÉ AGORA qualquer divergência — se o lockfile
// dessincronizasse por outra razão (dep adulterada, versão nova não commitada),
// o CI curava em silêncio e ficava verde com deps diferentes das versionadas.
//
// Este guard corre DEPOIS do `npm install` do fallback e:
//   - compara o mapa `packages` do lockfile commitado (HEAD) com o do disco
//     (já reconciliado pelo npm install), entrada a entrada;
//   - extrai o nome real de cada pacote alterado (último segmento após o
//     derradeiro `node_modules/`, para apanhar entradas aninhadas);
//   - se TODA a divergência for de pacotes da allowlist wasm conhecida →
//     verde com warning (comportamento actual preservado);
//   - se QUALQUER pacote fora da allowlist mudou → job VERMELHO com o diff
//     no log (supply chain > conveniência).
//
// Sem dependências externas: só Node + git. Corre no fallback, não no npm ci OK.

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

// Allowlist: pacotes que legitimamente divergem por OS no caso wasm crónico.
// `@emnapi/*` cobre core, runtime e wasi-threads (topo e aninhados).
const ALLOW_EXACT = new Set([
  '@tailwindcss/oxide-wasm32-wasi',
  '@img/sharp-wasm32',
  '@unrs/resolver-binding-wasm32-wasi',
]);
const isAllowed = (name) =>
  name.startsWith('@emnapi/') || ALLOW_EXACT.has(name);

// Nome real do pacote a partir da chave do mapa `packages`.
// "node_modules/@a/b/node_modules/@emnapi/core" -> "@emnapi/core"
// ""  (entrada raiz do projecto) -> "(root)" (nunca na allowlist).
const MARKER = 'node_modules/';
const pkgName = (key) => {
  if (key === '') return '(root)';
  const i = key.lastIndexOf(MARKER);
  return i === -1 ? key : key.slice(i + MARKER.length);
};

const head = JSON.parse(
  execFileSync('git', ['show', 'HEAD:package-lock.json'], { encoding: 'utf8' }),
);
const disk = JSON.parse(readFileSync('package-lock.json', 'utf8'));

const before = head.packages ?? {};
const after = disk.packages ?? {};
const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

const changedKeys = [];
for (const k of keys) {
  if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) changedKeys.push(k);
}

if (changedKeys.length === 0) {
  console.log(
    'Guard OK: `npm install` não alterou nenhuma entrada de packages no lockfile.',
  );
  process.exit(0);
}

const changedNames = [...new Set(changedKeys.map(pkgName))].sort();
const offenders = changedNames.filter((n) => !isAllowed(n));
const allowed = changedNames.filter(isAllowed);

console.log(
  `Guard: ${changedKeys.length} entrada(s) do lockfile reconciliadas pelo auto-heal.`,
);
if (allowed.length) {
  console.log(`  Drift permitido (wasm cross-platform): ${allowed.join(', ')}`);
}

if (offenders.length > 0) {
  console.log(
    `::error::Auto-heal do lockfile tocou pacote(s) FORA da allowlist wasm: ${offenders.join(', ')}`,
  );
  console.log(
    'Isto NÃO é o drift wasm cross-platform esperado. Possível dep adulterada, ' +
      'versão nova não commitada, ou lockfile desactualizado. Diff completo abaixo:',
  );
  try {
    console.log(
      execFileSync('git', ['--no-pager', 'diff', '--', 'package-lock.json'], {
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      }),
    );
  } catch {
    /* diff é informativo; a falha do guard já está decidida */
  }
  process.exit(1);
}

console.log(
  '::warning::npm ci falhou; auto-heal via npm install curou APENAS drift wasm ' +
    'cross-platform (dentro da allowlist). Nenhum outro pacote divergiu.',
);
process.exit(0);
