// Parser CSV RFC4180 puro (zero dependências) — server-only.
// Suporta campos entre aspas com vírgulas, quebras de linha e aspas escapadas
// (""), e terminadores CRLF, LF ou CR isolado. Necessário porque o export do
// Trading212 pode ter campos ("Notes", nomes) com vírgulas/aspas que um split
// ingénuo parte. Devolve uma matriz de linhas × campos, na ordem do ficheiro.
//
// Testes unitários em tests/unit/csv-parser.spec.ts.

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  let started = false; // marca que a linha corrente tem conteúdo/campos iniciados
  const n = text.length;
  let i = 0;

  const endField = () => {
    row.push(field);
    field = "";
    started = true;
  };
  const endRow = () => {
    row.push(field);
    field = "";
    rows.push(row);
    row = [];
    started = false;
  };

  while (i < n) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      started = true;
      i++;
      continue;
    }
    if (ch === ",") {
      endField();
      i++;
      continue;
    }
    if (ch === "\r") {
      if (text[i + 1] === "\n") i++;
      endRow();
      i++;
      continue;
    }
    if (ch === "\n") {
      endRow();
      i++;
      continue;
    }
    field += ch;
    started = true;
    i++;
  }

  // Última linha sem terminador final.
  if (started || field.length > 0 || row.length > 0) {
    endRow();
  }

  return rows;
}
