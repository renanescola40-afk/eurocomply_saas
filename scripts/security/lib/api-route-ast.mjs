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

function isCallableNode(node) {
  return ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node);
}

function callableBody(node) {
  return isCallableNode(node) ? node.body : undefined;
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

function staticBoolean(expression) {
  if (!expression) return null;
  if (expression.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (expression.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isParenthesizedExpression(expression)) return staticBoolean(expression.expression);
  if (ts.isPrefixUnaryExpression(expression) && expression.operator === ts.SyntaxKind.ExclamationToken) {
    const value = staticBoolean(expression.operand);
    return value === null ? null : !value;
  }
  return null;
}

function calleeNames(expression, sourceFile) {
  if (ts.isIdentifier(expression)) return [expression.text];
  if (ts.isPropertyAccessExpression(expression)) {
    return [expression.name.text, expression.getText(sourceFile)];
  }
  return [];
}

function collectReachableUsage(rootNode, callables, sourceFile) {
  const identifiers = new Set();
  const calls = new Set();
  const visitedCallables = new Set();

  function recordIdentifier(node) {
    if (ts.isIdentifier(node)) identifiers.add(node.text);
    if (ts.isPropertyAccessExpression(node)) {
      identifiers.add(node.name.text);
      identifiers.add(node.getText(sourceFile));
    }
  }

  function visitCallable(node) {
    const body = callableBody(node);
    if (!body) return;
    if (ts.isBlock(body)) {
      for (const statement of body.statements) visitStatement(statement);
    } else {
      visitExpression(body);
    }
  }

  function visitExpression(expression) {
    if (!expression) return;
    recordIdentifier(expression);

    if (ts.isParenthesizedExpression(expression)) {
      visitExpression(expression.expression);
      return;
    }

    if (ts.isCallExpression(expression)) {
      for (const name of calleeNames(expression.expression, sourceFile)) calls.add(name);

      if (ts.isIdentifier(expression.expression)) {
        const localCallable = callables.get(expression.expression.text);
        if (localCallable && !visitedCallables.has(expression.expression.text)) {
          visitedCallables.add(expression.expression.text);
          visitCallable(localCallable);
        }
      } else if (ts.isArrowFunction(expression.expression) || ts.isFunctionExpression(expression.expression)) {
        visitCallable(expression.expression);
      } else {
        visitNode(expression.expression);
      }

      for (const argument of expression.arguments) {
        if (ts.isArrowFunction(argument) || ts.isFunctionExpression(argument)) continue;
        visitNode(argument);
      }
      return;
    }

    if (ts.isArrowFunction(expression) || ts.isFunctionExpression(expression)) return;

    if (ts.isConditionalExpression(expression)) {
      visitExpression(expression.condition);
      const value = staticBoolean(expression.condition);
      if (value === true) visitExpression(expression.whenTrue);
      else if (value === false) visitExpression(expression.whenFalse);
      else {
        visitExpression(expression.whenTrue);
        visitExpression(expression.whenFalse);
      }
      return;
    }

    if (ts.isBinaryExpression(expression)) {
      visitExpression(expression.left);
      const leftValue = staticBoolean(expression.left);
      if (expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && leftValue === false) return;
      if (expression.operatorToken.kind === ts.SyntaxKind.BarBarToken && leftValue === true) return;
      visitExpression(expression.right);
      return;
    }

    ts.forEachChild(expression, visitNode);
  }

  function visitStatement(statement) {
    if (ts.isFunctionDeclaration(statement)) return;

    if (ts.isBlock(statement)) {
      for (const nested of statement.statements) visitStatement(nested);
      return;
    }

    if (ts.isIfStatement(statement)) {
      visitExpression(statement.expression);
      const value = staticBoolean(statement.expression);
      if (value === true) visitStatement(statement.thenStatement);
      else if (value === false) {
        if (statement.elseStatement) visitStatement(statement.elseStatement);
      } else {
        visitStatement(statement.thenStatement);
        if (statement.elseStatement) visitStatement(statement.elseStatement);
      }
      return;
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        recordIdentifier(declaration.name);
        const initializer = declaration.initializer;
        if (!initializer || ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) continue;
        visitExpression(initializer);
      }
      return;
    }

    if (ts.isExpressionStatement(statement)) {
      visitExpression(statement.expression);
      return;
    }

    if (ts.isReturnStatement(statement) || ts.isThrowStatement(statement)) {
      if (statement.expression) visitExpression(statement.expression);
      return;
    }

    ts.forEachChild(statement, visitNode);
  }

  function visitNode(node) {
    recordIdentifier(node);
    if (isCallableNode(node) && node !== rootNode) return;

    if (
      ts.isCallExpression(node)
      || ts.isParenthesizedExpression(node)
      || ts.isConditionalExpression(node)
      || ts.isBinaryExpression(node)
      || ts.isArrowFunction(node)
      || ts.isFunctionExpression(node)
    ) {
      visitExpression(node);
      return;
    }

    if (
      ts.isBlock(node)
      || ts.isIfStatement(node)
      || ts.isVariableStatement(node)
      || ts.isExpressionStatement(node)
      || ts.isReturnStatement(node)
      || ts.isThrowStatement(node)
      || ts.isFunctionDeclaration(node)
    ) {
      visitStatement(node);
      return;
    }

    ts.forEachChild(node, visitNode);
  }

  if (isCallableNode(rootNode)) visitCallable(rootNode);
  else visitNode(rootNode);

  return { identifiers, calls };
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

  return [...handlers.entries()].map(([method, node]) => {
    const usage = collectReachableUsage(node, callables, sourceFile);
    return {
      method,
      identifiers: usage.identifiers,
      calls: usage.calls,
      source: node.getText(sourceFile),
    };
  });
}

export function exportedRouteMethods(source, fileName = 'route.ts') {
  return analyzeExportedRouteHandlers(source, fileName).map((handler) => handler.method);
}
