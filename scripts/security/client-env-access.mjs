import ts from 'typescript';

/**
 * Identify non-public process environment access in client-boundary TS/JS.
 * Parsing the syntax tree prevents aliases and destructuring from evading a
 * process.env-only regex, without treating comments or string text as code.
 * A direct, statically named, approved NEXT_PUBLIC_* access is the only allowed
 * use of the global `process` object. This is source-level defense in depth;
 * emitted browser bundles and provider secrets need separate verification.
 */
const APPROVED_PUBLIC_ENV_NAMES = new Set([
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_KEY',
  'NEXT_PUBLIC_DATABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SENTRY_DSN',
  'NEXT_PUBLIC_POSTHOG_KEY',
  'NEXT_PUBLIC_POSTHOG_HOST',
  'NEXT_PUBLIC_POSTHOG_ASSET_HOST',
  'NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT',
  'NEXT_PUBLIC_POSTHOG_SESSION_REPLAY',
]);

function isIdentifier(node, value) {
  return ts.isIdentifier(node) && node.text === value;
}

function isDirectApprovedPublicAccess(processNode) {
  const envAccess = processNode.parent;
  if (!ts.isPropertyAccessExpression(envAccess) || envAccess.expression !== processNode ||
      !isIdentifier(envAccess.name, 'env') || envAccess.questionDotToken) return false;

  const publicAccess = envAccess.parent;
  return ts.isPropertyAccessExpression(publicAccess) &&
    publicAccess.expression === envAccess && !publicAccess.questionDotToken &&
    APPROVED_PUBLIC_ENV_NAMES.has(publicAccess.name.text);
}

function isGlobalProcessProperty(node) {
  const parent = node.parent;
  // "foo.process" can be an ordinary application-domain property. Only a
  // globalThis/window/self process property denotes the process global here.
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) {
    return ['globalThis', 'window', 'self'].some((name) => isIdentifier(parent.expression, name));
  }
  // Object keys and destructuring property names do not read the global.
  if (ts.isPropertyAssignment(parent) && parent.name === node) return false;
  if (ts.isBindingElement(parent) && parent.propertyName === node) {
    const declaration = parent.parent?.parent;
    return ts.isVariableDeclaration(declaration) &&
      ['globalThis', 'window', 'self'].some((name) => isIdentifier(declaration.initializer, name));
  }
  return true;
}

export function findUnsafeClientEnvReferences(source) {
  const syntaxTree = ts.createSourceFile('client-boundary.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const findings = [];
  function visit(node) {
    if (isIdentifier(node, 'process') && isGlobalProcessProperty(node) &&
        !isDirectApprovedPublicAccess(node)) {
      findings.push(node.getStart(syntaxTree));
    }
    // globalThis['process'], window["process"] and equivalent template keys
    // bypass direct identifier references, so explicitly reject them.
    if (ts.isElementAccessExpression(node) &&
        ['globalThis', 'window', 'self'].some((name) => isIdentifier(node.expression, name)) &&
        (ts.isStringLiteral(node.argumentExpression) || ts.isNoSubstitutionTemplateLiteral(node.argumentExpression)) &&
        node.argumentExpression.text === 'process') {
      findings.push(node.getStart(syntaxTree));
    }
    ts.forEachChild(node, visit);
  }
  visit(syntaxTree);
  return findings.sort((a, b) => a - b);
}
