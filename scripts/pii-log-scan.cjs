/**
 * OL-230 log guard. Finds console.* / logger.* calls whose arguments reference user-entered
 * inquiry, tour, concierge or search fields (name, email, phone, resident name, care needs,
 * message, notes, free-text search query…) or the objects that carry them (request body,
 * form state, payload…).
 *
 * In API route files it also flags raw error objects (and their .message/.stack/.errors):
 * Prisma validation errors and Zod errors can echo the submitted values. Route handlers
 * must log errorSummary(err) from src/lib/log-safe.ts instead.
 *
 * OL-231, stricter rule for auth / signup code (AUTH_SCOPE): a log call there may print only
 * fixed text — string / number / boolean literals and errorSummary(err) — i.e. an outcome code.
 * No email, user id, name, IP, token, URL or any other runtime value.
 *
 * Used by __tests__/pii-log-guard.unit.test.ts and __tests__/auth-log-guard.unit.test.ts.
 * CLI: node scripts/pii-log-scan.cjs
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

/** Client pages/components and the API routes they post to. */
const SCOPE = [
  'src/app/homes',
  'src/components/tours',
  'src/app/concierge',
  'src/app/search',
  'src/app/api/inquiries',
  'src/app/api/family/tours',
  'src/app/api/tours',
  'src/app/api/concierge',
  'src/app/api/discharge-planner/concierge',
  'src/app/api/care-concierge',
  'src/app/api/leads',
  'src/app/api/search',
  'src/app/api/analytics',
];

/** Field names whose values are user-entered (or identify the user). */
const USER_FIELDS = new Set([
  'name', 'fullName', 'firstName', 'lastName', 'contactName', 'residentName', 'familyName',
  'email', 'contactEmail', 'phone', 'contactPhone', 'phoneNumber',
  'careNeeded', 'careNeeds', 'careNeed', 'medicalConditions', 'conditions', 'diagnosis',
  'message', 'notes', 'familyNotes', 'additionalNotes', 'comments', 'details',
  'q', 'query', 'naturalQuery', 'searchQuery', 'searchTerm', 'searchParams', 'url', 'href', 'search',
]);

/** Objects that hold a whole submission; logging them (or spreading them) leaks every field. */
const CONTAINERS = new Set([
  'inquiryForm', 'formData', 'form', 'values', 'payload', 'body', 'rawBody', 'requestBody',
  'data', 'validatedData', 'parsed', 'input', 'tourData', 'inquiryData', 'requestData', 'fields',
  'answers', 'screener', 'contact',
]);

/** Objects whose `.name` etc. are public listing facts, not user input. */
const PUBLIC_OBJECTS = /^(home|realHome|h|inactiveMatch|listing|facility|operator|op|provider|file|cookie|constructor)$/;
const ERROR_LIKE = /^(e|err|error|\w*Err|\w*Error)$/;
const ERROR_PROPS = new Set(['message', 'stack', 'errors', 'meta', 'issues', 'cause']);
const LOG_CALLEE = /^(console|logger|log)\.(log|info|warn|error|debug|trace)$/;

function lastSegment(node) {
  if (ts.isIdentifier(node)) return node.text;
  if (ts.isPropertyAccessExpression(node)) return node.name.text;
  if (ts.isNonNullExpression(node) || ts.isParenthesizedExpression(node)) return lastSegment(node.expression);
  if (ts.isAsExpression(node)) return lastSegment(node.expression);
  return '';
}

function inSafeWrapper(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isCallExpression(p) && /^(errorSummary)$/.test(p.expression.getText())) return true;
    if (ts.isCallExpression(p) && LOG_CALLEE.test(p.expression.getText())) return false;
  }
  return false;
}

/** Why a single log call is unsafe, or null. */
function reasonFor(call, isRoute) {
  const reasons = [];
  const visit = (n) => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return;
    if (ts.isTemplateExpression(n)) { n.templateSpans.forEach((s) => visit(s.expression)); return; }
    if (ts.isPropertyAssignment(n)) { visit(n.initializer); return; }
    if (ts.isShorthandPropertyAssignment(n)) {
      const k = n.name.text;
      if (USER_FIELDS.has(k) || CONTAINERS.has(k)) reasons.push(k);
      return;
    }
    if (ts.isPropertyAccessExpression(n)) {
      const prop = n.name.text;
      const obj = lastSegment(n.expression);
      if (ERROR_LIKE.test(obj)) {
        // err.name / err.code are safe; the message, stack and Zod issues can echo input.
        if (ERROR_PROPS.has(prop) && isRoute && !inSafeWrapper(n)) reasons.push(`${obj}.${prop}`);
        return;
      }
      if (USER_FIELDS.has(prop) && !PUBLIC_OBJECTS.test(obj)) reasons.push(`${n.expression.getText()}.${prop}`);
      // A user field read through a method (searchParams.get('q'), email.trim()) still prints it.
      else if (ts.isIdentifier(n.expression) && USER_FIELDS.has(obj) && prop !== 'length') reasons.push(`${obj}.${prop}`);
      // Don't flag the container itself when only a non-user field is read (body.homeId).
      if (!ts.isIdentifier(n.expression)) visit(n.expression);
      return;
    }
    if (ts.isIdentifier(n)) {
      const id = n.text;
      if (USER_FIELDS.has(id) || CONTAINERS.has(id)) reasons.push(id);
      else if (isRoute && ERROR_LIKE.test(id) && !inSafeWrapper(n)) reasons.push(`${id} (raw error)`);
      return;
    }
    if (ts.isCallExpression(n) && n.expression.getText() === 'errorSummary') return;
    // `err instanceof Error` only tests the type; nothing from err is printed.
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword) return;
    ts.forEachChild(n, visit);
  };
  call.arguments.forEach(visit);
  return reasons.length ? Array.from(new Set(reasons)) : null;
}

function scanSource(file, text) {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const isRoute = /\/app\/api\//.test(file.replace(/\\/g, '/'));
  const hits = [];
  const walk = (n) => {
    if (ts.isCallExpression(n) && LOG_CALLEE.test(n.expression.getText())) {
      const reasons = reasonFor(n, isRoute);
      if (reasons) {
        const { line } = sf.getLineAndCharacterOfPosition(n.getStart());
        hits.push({ file, line: line + 1, start: n.getStart(), end: n.getEnd(), reasons, text: n.getText().slice(0, 160) });
      }
    }
    ts.forEachChild(n, walk);
  };
  walk(sf);
  return hits;
}

function filesInScope(root = process.cwd()) {
  const out = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== '__tests__') walk(p); }
      else if (/\.(tsx?|jsx?)$/.test(e.name) && !/\.test\./.test(e.name)) out.push(p);
    }
  };
  SCOPE.forEach((d) => walk(path.join(root, d)));
  return out;
}

function scanAll(root = process.cwd()) {
  return filesInScope(root).flatMap((f) => scanSource(path.relative(root, f), fs.readFileSync(f, 'utf8')));
}

/** Auth / signup code: logs may carry only fixed outcome text (OL-231). */
const AUTH_SCOPE = [
  'src/lib/auth.ts',
  'src/lib/auth-db-simple.ts',
  'src/lib/auth-utils.ts',
  'src/app/api/auth',
  'src/app/auth',
];

function literalOnly(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isNumericLiteral(node)) return true;
  if (node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword || node.kind === ts.SyntaxKind.NullKeyword) return true;
  if (ts.isCallExpression(node) && node.expression.getText() === 'errorSummary') return true;
  if (ts.isParenthesizedExpression(node)) return literalOnly(node.expression);
  return false;
}

/** Log calls whose arguments are anything but fixed text / errorSummary(). */
function scanStrictSource(file, text, range) {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const hits = [];
  const walk = (n) => {
    if (ts.isCallExpression(n) && LOG_CALLEE.test(n.expression.getText()) && (!range || (n.getStart() >= range[0] && n.getEnd() <= range[1]))) {
      const bad = n.arguments.filter((a) => !literalOnly(a)).map((a) => a.getText().slice(0, 60));
      if (bad.length) {
        const { line } = sf.getLineAndCharacterOfPosition(n.getStart());
        hits.push({ file, line: line + 1, start: n.getStart(), end: n.getEnd(), reasons: bad, text: n.getText().slice(0, 160) });
      }
    }
    ts.forEachChild(n, walk);
  };
  walk(sf);
  return hits;
}

function authFiles(root = process.cwd()) {
  const out = [];
  const walk = (p) => {
    if (!fs.existsSync(p)) return;
    if (fs.statSync(p).isFile()) { if (/\.(tsx?|jsx?)$/.test(p) && !/\.test\./.test(p)) out.push(p); return; }
    for (const e of fs.readdirSync(p, { withFileTypes: true })) if (e.name !== '__tests__') walk(path.join(p, e.name));
  };
  AUTH_SCOPE.forEach((d) => walk(path.join(root, d)));
  return out;
}

function scanAuth(root = process.cwd()) {
  return authFiles(root).flatMap((f) => scanStrictSource(path.relative(root, f), fs.readFileSync(f, 'utf8')));
}

module.exports = { SCOPE, AUTH_SCOPE, USER_FIELDS, CONTAINERS, scanSource, scanStrictSource, filesInScope, authFiles, scanAll, scanAuth };

if (require.main === module) {
  const hits = [...scanAll(), ...scanAuth()];
  for (const h of hits) console.log(`${h.file}:${h.line}  [${h.reasons.join(', ')}]  ${h.text.replace(/\s+/g, ' ')}`);
  console.log(`${hits.length} unsafe log call(s)`);
  process.exitCode = hits.length ? 1 : 0;
}
