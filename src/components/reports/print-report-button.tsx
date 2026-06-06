'use client';

export function PrintReportButton() {
  function handlePrint() {
    window.requestAnimationFrame(() => {
      window.print();
    });
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
    >
      Print / save as PDF
    </button>
  );
}
