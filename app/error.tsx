'use client';

import React, { useEffect } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled runtime error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans" id="error-boundary-page">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col items-center">
        <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-6 text-rose-500 scale-110 shadow-xs border border-rose-100">
          <AlertTriangle size={28} />
        </div>

        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
          เกิดข้อผิดพลาดในการโหลดระบบ
        </h1>
        
        <p className="text-slate-500 text-xs leading-relaxed mb-8 font-mono bg-slate-50/80 p-3 rounded-xl border border-slate-100 text-left w-full break-all max-h-32 overflow-y-auto">
          {error?.message || 'Unknown application runtime crash'}
        </p>

        <button
          onClick={() => reset()}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-900 text-sm font-medium text-white hover:bg-slate-800 transition-all shadow-md focus:ring-4 focus:ring-slate-900/10 active:scale-[0.98]"
          id="error-reset-btn"
        >
          <RefreshCw size={16} />
          โหลดหน้าใหม่อีกครั้ง
        </button>
      </div>
    </div>
  );
}
