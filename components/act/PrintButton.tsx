"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="min-h-11 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 print:hidden"
    >
      🖨 Печать / PDF
    </button>
  );
}
