import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("DataContext normalizes financial rows before add or update", () => {
  const source = read("src/context/DataContext.jsx");
  assert.match(source, /isFinancialCollection\(collection\)/);
  assert.match(source, /normalizeTransactionRow\(collection, safeRow/);
  assert.match(source, /normalizeTransactionRow\(collection, \{ \.\.\.target, \.\.\.safePatch \}/);
});

test("financial forms prevent zero-value transactions in normal UI flows", () => {
  for (const path of ["src/pages/Deposits.jsx", "src/pages/Expenses.jsx", "src/pages/MarketCosts.jsx"]) {
    const source = read(path);
    assert.match(source, /type="number" min="0\.01" step="0\.01" value=\{form\.amount\}/);
  }
});
