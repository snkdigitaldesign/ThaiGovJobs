'use client';

import React from 'react';
import Link from 'next/link';
import { Home, AlertTriangle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans" id="not-found-page">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col items-center">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-6 text-amber-500 scale-110 shadow-xs border border-amber-100">
          <AlertTriangle size={28} />
        </div>

        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          ไม่พบหน้าเว็บ (404)
        </h1>
        
        <p className="text-slate-500 text-sm leading-relaxed mb-8">
          ไม่พบข้อมูลหรือหน้าที่ท่านเรียกหาในระบบประกาศงานราชการนี้
          กรุณาตรวจสอบ URL อีกครั้ง หรือกลับไปยังหน้าแรกของเรา
        </p>

        <Link
          href="/"
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-900 text-sm font-medium text-white hover:bg-slate-800 transition-all shadow-md focus:ring-4 focus:ring-slate-900/10 active:scale-[0.98]"
          id="not-found-home-btn"
        >
          <Home size={16} />
          กลับสู่หน้าหลัก
        </Link>
      </div>
    </div>
  );
}
