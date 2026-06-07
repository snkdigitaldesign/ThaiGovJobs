'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

export function AdSenseBlock({ slot, type }: { slot: string; type: 'banner' | 'sidebar' | 'inline' }) {
  if (type === 'banner') {
    return (
      <div className="w-full bg-slate-50 border border-dashed border-slate-300 rounded-3xl p-4 mb-4 flex flex-col items-center justify-center text-center relative overflow-hidden" id={`adsense-banner-${slot}`}>
        <div className="absolute top-2 right-3 text-[9px] uppercase font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">
          Google AdSense Top Banner
        </div>
        <div className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1.5 justify-center">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          พื้นที่ประชาสัมพันธ์เด่น (Google AdSense)
        </div>
        <div className="w-full max-w-2xl min-h-[50px] flex items-center justify-center p-2 bg-white rounded-2xl border border-slate-200 shadow-3xs mx-auto">
          <div className="text-center font-sans">
            <p className="text-xs font-bold text-slate-600 block">ยินดีต้อนรับผู้สนับสนุน สแกนข่าวสมัครสอบไม่มีสะดุด</p>
            <p className="text-[9px] font-mono text-slate-400">Position: Header Banner | Slot: {slot}</p>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'sidebar') {
    return (
      <div className="w-full bg-slate-50 border border-dashed border-slate-300 rounded-3xl p-5 flex flex-col gap-3 relative overflow-hidden" id={`adsense-sidebar-${slot}`}>
        <div className="absolute top-2 right-3 text-[9px] uppercase font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">
          Ad
        </div>
        <div className="text-xs font-bold text-slate-700 flex items-center gap-1">
          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
          เทคนิคเตรียมสอบ & ข้อมูลแนะแนวสำคัญ
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          คู่มือผ่านภาค ก. ความรอบรู้ กฎหมายลักษณะข้าราชการที่ดี และแนวข้อสอบภาษาอังกฤษสำหรับพิชิตตำแหน่งราชการ
        </p>
        <div className="min-h-[100px] border border-slate-200 bg-white rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-3xs">
          <span className="block text-xs font-bold text-slate-600 font-sans mt-1">ผู้สนับสนุนเว็บไซต์หลัก</span>
          <span className="block text-[9px] text-slate-400 font-mono mt-0.5">Slot: {slot}</span>
        </div>
      </div>
    );
  }

  // inline details
  return (
    <div className="w-full bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4 my-2 flex flex-col items-center justify-center text-center" id={`adsense-inline-${slot}`}>
      <div className="text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1.5 justify-center">
        <span>Google AdSense</span>
        <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
        <span>ช่องโฆษณาในหน้าเนื้อหาประกาศข่าว</span>
      </div>
      <div className="w-full max-w-md min-h-[50px] bg-white border border-slate-200 rounded-xl flex items-center justify-center p-2 mx-auto">
        <div className="text-center font-sans">
          <span className="text-xs font-bold text-slate-600 block">งานแนะแนวยกระดับความรู้ตำแหน่งที่เปิดรับ</span>
          <span className="text-[9px] text-slate-400 font-mono block">Slot: {slot}</span>
        </div>
      </div>
    </div>
  );
}
