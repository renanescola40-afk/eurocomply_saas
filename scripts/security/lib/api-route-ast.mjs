import * as ts from 'typescript';

export const HTTP_ROUTE_METHODS = Object.freeze([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
]);

const HTTP_ROUTE_METHOD_SET = new Set(HTTP_ROUTE_METHODS);

function hasExportModifier(node) {
  return Boolean(
    ts.canHaveModifiers(node)
      && ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword),
  );
}

function callableInitializer(node) {
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) return node;
  return null;
}

function buildTopLevelCallables(sourceFile) {
  const callables = new Map();

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name && statement.body) {
      callables.set(statement.name.text, statement);
      continue;
    }

    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
      const callable = callableInitializer(declaration.initializer);
      if (callable) callables.set(declaration.name.text, callable);
    }
  }

  return callables;
}

function resolveHandlerNode(initializer, callables) {
  const direct = callableInitializer(initializer);
  if (direct) return direct;
  if (ts.isIdentifier(initializer)) return callables.get(initializer.text) ?? initializer;
  return initializer;
}

function collectExportedHandlers(sourceFile, callables) {
  const handlers = new Map();

  for (const statement of sourceFile.statements) {
    if (
      ts.isFunctionDeclaration(statement)
      && statement.name
      && statement.body
      && hasExportModifier(statement)
      && HTTP_ROUTE_METHOD_SET.has(statement.name.text)
    ) {
      handlers.set(statement.name.text, statement);
      continue;
    }

    if (ts.isVariableStatement(statement) && hasExportModifier(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (
          ts.isIdentifier(declaration.name)
          && HTTP_ROUTE_METHOD_SET.has(declaration.name.text)
          && declaration.initializer
        ) {
          handlers.set(
            declaration.name.text,
            resolveHandlerNode(declaration.initializer, callables),
          );
        }
      }
      continue;
    }

    if (
      ts.isExportDeclaration(statement)
      && !statement.moduleSpecifier
      && statement.exportClause
      && ts.isNamedExports(statement.exportClause)
    ) {
      for (const element of statement.exportClause.elements) {
        const exportedName = element.name.text;
        if (!HTTP_ROUTE_METHOD_SET.has(exportedName)) continue;
        const localName = element.propertyName?.text ?? exportedName;
        const callable = callables.get(localName);
        if (callable) handlers.set(exportedName, callable);
      }
    }
  }

  return handlers;
}

function referencedLocalCallableNames(node, callables) {
  const names = new Set();

  function visit(current) {
    if (ts.isIdentifier(current) && callables.has(current.text)) {
      names.add(current.text);
    }
    ts.forEachChild(current, visit);
  }

  visit(node);
  return names;
}

function collectReachableIdentifiers(rootNode, callables) {
  const identifiers = new Set();
  const visitedCallables = new Set();

  function visitNode(node) {
    function visit(current) {
      if (ts.isIdentifier(current)) identifiers.add(current.text);
      if (ts.isPropertyAccessExpression(current)) {
        identifiers.add(current.name.text);
        identifiers.add(current.getText());
      }
      ts.forEachChild(current, visit);
    }

    visit(node);

    for (const name of referencedLocalCallableNames(node, callables)) {
      if (visitedCallables.has(name)) continue;
      visitedCallables.add(name);
      const callable = callables.get(name);
      if (callable) visitNode(callable);
    }
  }

  visitNode(rootNode);
  return identifiers;
}

export function analyzeExportedRouteHandlers(source, fileName = 'route.ts') {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const callables = buildTopLevelCallables(sourceFile);
  const handlers = collectExportedHandlers(sourceFile, callables);

  return [...handlers.entries()].map(([method, node]) => ({
    method,
    identifiers: collectReachableIdentifiers(node, callables),
    source: node.getText(sourceFile),
  }));
}

export function exportedRouteMethods(source, fileName = 'route.ts') {
  return analyzeExportedRouteHandlers(source, fileName).map((handler) => handler.method);
}
