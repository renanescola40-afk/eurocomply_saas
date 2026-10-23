import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { describe, it } from 'vitest';

type Element = { type: unknown; props: Record<string, any> };
const jsx = (type: unknown, props: Record<string, any>): Element => ({ type, props });
function elements(node: any): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== 'object') return [];
  return [node, ...elements(node.props?.children)];
}
function load(path: string, modules: Record<string, unknown>, globals: Record<string, unknown> = {}) {
  const source = readFileSync(join(process.cwd(), path), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } });
  const testModule = { exports: {} as Record<string, any> };
  vm.runInNewContext(output.outputText, { module: testModule, exports: testModule.exports,
    require: (name: string) => {
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
      assert.ok(name in modules, `Unexpected dependency: ${name}`);
      return modules[name];
    }, ...globals }, { filename: path });
  return testModule.exports;
}
const StepUpDialog = () => null;
const header = 'x-eurocomply-step-up-token';
function buttonFixture(response = new Response('{}', { headers: {
  'Content-Type': 'application/json',
  'Content-Disposition': 'attachment; filename="retention-review.json"',
} })) {
  const states: any[] = []; let cursor = 0;
  const requests: Array<{ endpoint: string; options: any }> = [];
  const downloads: string[] = []; const revoked: string[] = [];
  const component = load('src/components/reports/step-up-csv-export-button.tsx', {
    react: { useState: (initial: any) => {
      const index = cursor++; if (!(index in states)) states[index] = initial;
      return [states[index], (next: any) => { states[index] = next; }];
    } },
    '@/components/security/step-up-mfa-dialog': { STEP_UP_TOKEN_HEADER: header, StepUpMfaDialog: StepUpDialog },
  }, {
    fetch: async (endpoint: string, options: any) => { requests.push({ endpoint, options }); return response; },
    URL: { createObjectURL: () => 'blob:synthetic', revokeObjectURL: (url: string) => revoked.push(url) },
    document: { body: { appendChild: () => {} }, createElement: () => ({
      download: '', click() { downloads.push(this.download); }, remove() {},
    }) },
  }).StepUpCsvExportButton;
  const render = (props = {}) => { cursor = 0; return component({
    endpoint: '/api/retention-center/export', filename: 'fallback.json', label: 'Export retention review JSON', ...props,
  }); };
  return { render, requests, downloads, revoked };
}
describe('retention export uses the existing verified download flow', () => {
  for (const locale of ['en', 'pt']) it(`renders a step-up download instead of a direct API link (${locale})`, async () => {
    const DownloadButton = () => null;
    const page = load('src/app/[locale]/retention-center/page.tsx', {
      'lucide-react': new Proxy({}, { has: () => true, get: () => () => null }),
      'next/navigation': { notFound: () => { throw new Error('not found'); } },
      '@/components/dashboard/authenticated-product-shell': { AuthenticatedProductShell: () => null },
      '@/components/reports/step-up-csv-export-button': { StepUpCsvExportButton: DownloadButton },
      '@/lib/i18n/locales': { isSupportedLocale: (value: string) => ['en', 'pt'].includes(value) },
      '@/server/governance/retention-policy': { RETENTION_POLICIES: [], getRetentionSummary: () => ({ readinessScore: 0, totalPolicies: 0, nextActions: [] }) },
    }).default;
    const nodes = elements(await page({ params: Promise.resolve({ locale }) }));
    const download = nodes.find(node => node.type === DownloadButton);
    assert.ok(download, 'Retention page must render the MFA-capable export control');
    assert.equal(download.props.endpoint, '/api/retention-center/export');
    assert.equal(download.props.filename.endsWith('.json'), true);
    assert.equal(download.props.label, locale === 'en' ? 'Export retention review JSON' : 'Exportar revisão de retenção em JSON');
    assert.equal(nodes.some(node => node.props?.href === '/api/retention-center/export'), false);
  });
  it('opens export_data verification without issuing a download request', () => {
    const f = buttonFixture();
    elements(f.render()).find(node => node.type === 'button')!.props.onClick();
    const dialog = elements(f.render()).find(node => node.type === StepUpDialog)!;
    assert.equal(dialog.props.open, true); assert.equal(dialog.props.action, 'export_data');
    assert.equal(f.requests.length, 0);
    dialog.props.onCancel();
    assert.equal(elements(f.render()).find(node => node.type === StepUpDialog)!.props.open, false);
    assert.equal(f.requests.length, 0);
  });
  it('downloads JSON with the verified token and same-origin credentials', async () => {
    const f = buttonFixture();
    elements(f.render()).find(node => node.type === StepUpDialog)!.props.onToken('synthetic-verified-token');
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(f.requests.length, 1);
    assert.equal(f.requests[0].endpoint, '/api/retention-center/export');
    assert.equal(f.requests[0].options.method, 'GET');
    assert.equal(f.requests[0].options.credentials, 'same-origin');
    assert.equal(f.requests[0].options.headers[header], 'synthetic-verified-token');
    assert.deepEqual(f.downloads, ['retention-review.json']);
    assert.deepEqual(f.revoked, ['blob:synthetic']);
  });
  for (const status of [403, 503]) it(`does not create a download when the API rejects it (${status})`, async () => {
    const f = buttonFixture(new Response(JSON.stringify({ error: status === 403 ? 'step_up_required' : 'retention_policy_export_audit_unavailable' }), { status }));
    elements(f.render()).find(node => node.type === StepUpDialog)!.props.onToken('synthetic-verified-token');
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(f.downloads.length, 0);
    assert.ok(elements(f.render()).find(node => node.props?.role === 'status')!.props.children);
  });
  it('preserves CSV callers and their API-provided filename', async () => {
    const f = buttonFixture(new Response('column\nvalue', { headers: { 'Content-Disposition': 'attachment; filename="existing-report.csv"' } }));
    elements(f.render({ endpoint: '/api/reports/documents.csv', filename: 'fallback.csv' })).find(node => node.type === StepUpDialog)!.props.onToken('synthetic-verified-token');
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(f.requests[0].endpoint, '/api/reports/documents.csv');
    assert.deepEqual(f.downloads, ['existing-report.csv']);
  });
});
