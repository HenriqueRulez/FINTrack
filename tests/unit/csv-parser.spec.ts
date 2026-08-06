// Testes unitários do parser CSV RFC4180 (src/lib/import/csv.ts).
// Funções puras, sem browser nem banco.
// Correr com: npx playwright test -c playwright.unit.config.ts

import { expect, test } from "@playwright/test";
import { parseCsv } from "../../src/lib/import/csv";

test("campos simples separados por vírgula", () => {
  expect(parseCsv("a,b,c")).toEqual([["a", "b", "c"]]);
});

test("múltiplas linhas com LF", () => {
  expect(parseCsv("a,b\nc,d")).toEqual([
    ["a", "b"],
    ["c", "d"],
  ]);
});

test("terminador CRLF", () => {
  expect(parseCsv("a,b\r\nc,d\r\n")).toEqual([
    ["a", "b"],
    ["c", "d"],
  ]);
});

test("CR isolado como terminador", () => {
  expect(parseCsv("a,b\rc,d")).toEqual([
    ["a", "b"],
    ["c", "d"],
  ]);
});

test("campo entre aspas com vírgula interna", () => {
  expect(parseCsv('a,"b,c",d')).toEqual([["a", "b,c", "d"]]);
});

test("quebra de linha dentro de aspas", () => {
  expect(parseCsv('a,"line1\nline2",c')).toEqual([["a", "line1\nline2", "c"]]);
});

test("aspas escapadas ('')", () => {
  expect(parseCsv('a,"say ""hi""",c')).toEqual([["a", 'say "hi"', "c"]]);
});

test("campo vazio preservado", () => {
  expect(parseCsv("a,,c")).toEqual([["a", "", "c"]]);
});

test("linha final sem newline", () => {
  expect(parseCsv("a,b\nc,d")).toEqual([
    ["a", "b"],
    ["c", "d"],
  ]);
});

test("newline final não gera linha fantasma", () => {
  expect(parseCsv("a,b\n")).toEqual([["a", "b"]]);
});

test("string vazia devolve zero linhas", () => {
  expect(parseCsv("")).toEqual([]);
});

test("campo entre aspas com CRLF interno", () => {
  expect(parseCsv('"a\r\nb",c')).toEqual([["a\r\nb", "c"]]);
});

test("mistura de campos com e sem aspas", () => {
  const input = 'Deposit,2026-05-15,"Transaction ID: TXVVKW7J4QFLC7F6",500.00,"EUR"';
  expect(parseCsv(input)).toEqual([
    ["Deposit", "2026-05-15", "Transaction ID: TXVVKW7J4QFLC7F6", "500.00", "EUR"],
  ]);
});
