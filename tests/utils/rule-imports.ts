import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';

const forbidden = /^(?:node:)?fs(?:\/|$)|^commander(?:\/|$)/;

/** Inspect runtime import closure: a pure-looking wrapper must not hide I/O in a helper. */
export function assertPureRuleImports(entry: string, read = (path: string) => readFileSync(path, 'utf8')) {
  const seen = new Set<string>();
  const visit = (path: string) => {
    if (seen.has(path)) return;
    seen.add(path);
    const source = ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true);
    const inspect = (node: ts.Node) => {
      let specifier: string | undefined;
      let runtime = true;
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        runtime = !node.importClause?.isTypeOnly;
        specifier = node.moduleSpecifier.text;
      } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        runtime = !node.isTypeOnly;
        specifier = node.moduleSpecifier.text;
      } else if (ts.isCallExpression(node) && node.arguments[0] && ts.isStringLiteral(node.arguments[0]) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
        specifier = node.arguments[0].text;
      }
      if (specifier) {
        assert.equal(forbidden.test(specifier), false, `rule import ${specifier} is not pure (${path})`);
        if (runtime && specifier.startsWith('.')) visit(resolve(dirname(path), specifier.replace(/\.js$/, '.ts')));
      }
      ts.forEachChild(node, inspect);
    };
    inspect(source);
  };
  visit(resolve(entry));
}
