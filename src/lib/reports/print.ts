export function printCurrentPage() {
  if (typeof window === 'undefined') return;
  window.print();
}

export function downloadTextReport(params: { filename: string; content: string }) {
  if (typeof window === 'undefined') return;
  const blob = new Blob([params.content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = params.filename;
  link.click();
  URL.revokeObjectURL(url);
}

export const printableReportStyles = `
  @media print {
    @page {
      size: A4;
      margin: 18mm;
    }

    html,
    body {
      background: #ffffff !important;
      color: #0f172a !important;
    }

    body * {
      visibility: hidden;
    }

    [data-print-root],
    [data-print-root] * {
      visibility: visible;
    }

    [data-print-root] {
      position: absolute;
      inset: 0;
      width: 100%;
      background: #ffffff !important;
      color: #0f172a !important;
    }

    [data-print-hide] {
      display: none !important;
    }

    [data-print-card] {
      break-inside: avoid;
      border: 1px solid #e2e8f0 !important;
      background: #ffffff !important;
      color: #0f172a !important;
      box-shadow: none !important;
    }

    [data-print-muted] {
      color: #475569 !important;
    }
  }
`;
