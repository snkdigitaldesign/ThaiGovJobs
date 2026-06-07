'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, 
  MapPin, 
  GraduationCap, 
  Coins, 
  Calendar, 
  Clock, 
  ExternalLink, 
  ArrowLeft,
  Facebook,
  Database,
  Sparkles,
  Share2
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  DEFAULT_JOBS, 
  parseSalaryFromContent, 
  extractAgencyFromTitle 
} from '@/lib/constants';
import { AdSenseBlock } from '@/components/AdSenseBlock';

export default function JobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  
  const [job, setJob] = useState<any | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    // Load jobs from localStorage, falling back to pre-seeded array
    const storedJobs = localStorage.getItem('gov_sim_jobs');
    let loadedJobs = DEFAULT_JOBS;
    
    if (storedJobs) {
      try {
        loadedJobs = JSON.parse(storedJobs);
      } catch (e) {
        console.error("Failed to parse stored jobs", e);
      }
    }

    const foundJob = loadedJobs.find((j: any) => j.id === id);
    setTimeout(() => {
      if (foundJob) {
        setJob(foundJob);
      }
      setHasHydrated(true);
    }, 0);
  }, [id]);

  // Handle Facebook share popup
  const handleFacebookShare = () => {
    if (typeof window !== 'undefined') {
      const shareUrl = encodeURIComponent(window.location.href);
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
        'facebook-share-dialog',
        'width=626,height=436,scrollbars=no,resizable=yes'
      );
    }
  };

  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-[#060b13] text-slate-100 flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4 text-center p-6">
          <Database className="w-8 h-8 text-amber-500 animate-pulse" />
          <h1 className="text-xl font-black text-white tracking-tight">กำลังตรวจสอบข้อมูลประกาศและดึงโครงสร้าง...</h1>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-[#060b13] text-slate-100 flex flex-col items-center justify-center font-sans">
        <div className="bg-slate-900/60 border border-slate-800 p-8.5 rounded-3xl text-center max-w-sm flex flex-col items-center gap-4 shadow-xl">
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-2xl border border-rose-500/20">
            <Database className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-white">ไม่พบประกาศจัดจ้างงานนี้</h2>
          <p className="text-xs text-slate-400">
            ประกาศงานราชการรหัสนี้ไม่มีอยู่ในระบบประมวลผล หรือถูกยกเลิกแล้วในฐานข้อมูล Supabase
          </p>
          <Link 
            href="/"
            className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 px-5 rounded-xl text-xs transition-transform duration-300 hover:scale-103 shadow-md"
          >
            ← ย้อนกลับไปยังหน้าแรก
          </Link>
        </div>
      </div>
    );
  }

  // Parse details
  const agencyName = extractAgencyFromTitle(job.title);
  const salaryText = parseSalaryFromContent(job.content);

  // Live Countdown calculated against static fake date (Jun 7, 2026) or standard dates
  const todayVal = new Date('2026-06-07');
  const endVal = new Date(job.application_end_date);
  const diffTime = endVal.getTime() - todayVal.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));

  return (
    <div className="min-h-screen bg-[#060b13] text-slate-100 font-sans leading-relaxed flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      
      {/* Brand Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-xl py-4.5 px-6 sticky top-0 z-40 shadow-xl shadow-slate-950/20">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="bg-slate-800 hover:bg-slate-700/85 text-slate-200 p-2.5 rounded-2xl transition-colors shrink-0 flex items-center justify-center border border-slate-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <span className="bg-blue-500/10 text-blue-400 text-[10px] tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border border-blue-500/20 uppercase">
                Thai Government Recruits
              </span>
              <h2 className="text-base font-black text-white mt-0.5">ระบบสืบค้นข้อมูลปฐมภูมิพิทักษ์ประชา</h2>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Link 
              href="/"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all"
            >
              ดูงานทั้งหมด
            </Link>
            <Link 
              href="/admin"
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all"
            >
              คุมระบบหลังบ้าน
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 flex flex-col gap-5">
        
        {/* Navigation Breadcrumb & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link href="/" className="hover:text-blue-400 transition-colors">หน้าแรก</Link>
            <span>/</span>
            <span className="text-slate-300 truncate max-w-[200px]">{job.title}</span>
          </div>
          
          {/* Share Block Area */}
          <button
            onClick={handleFacebookShare}
            className="bg-[#1877F2] hover:bg-[#166FE5] text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-blue-600/10 transition-all flex items-center gap-2 cursor-pointer scale-100 hover:scale-102"
          >
            <Facebook className="w-4 h-4 fill-current" />
            แชร์ประกาศลง Facebook
          </button>
        </div>

        {/* 1. Google AdSense - บนสุดของเนื้อหา */}
        <AdSenseBlock slot="adsense-job-detail-top-banner" type="banner" />

        {/* Main Job Detail Sheet */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="bg-white text-slate-900 rounded-3xl shadow-xl border border-slate-200 overflow-hidden"
        >
          {/* Banner Banner / Category identifier */}
          <div className="p-6 bg-gradient-to-r from-blue-50/50 via-indigo-50/20 to-white border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-3.5 rounded-2xl shadow-sm leading-none ${job.category === 'ข้าราชการ' ? 'bg-blue-600 text-white' : job.category === 'พนักงานราชการ' ? 'bg-amber-500 text-slate-950' : 'bg-indigo-600 text-white'}`}>
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[9px] uppercase font-mono tracking-widest font-bold text-blue-600 block">ประกาศสอบแข่งขันทางการ</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="bg-slate-100 text-slate-700 text-[11px] font-black px-2.5 py-0.5 rounded-md">
                    {job.category}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                  <span className="text-slate-500 text-xs font-bold flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    จังหวัด {job.region}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col text-xs md:items-end">
              <span className="text-slate-400 font-bold text-[10px] uppercase">รหัสประกาศกำกับ:</span>
              <span className="font-mono font-bold text-[#0f172a]">OCSC-{job.id}</span>
            </div>
          </div>

          <div className="p-6 md:p-8 flex flex-col gap-6.5">
            {/* Title Block */}
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-black text-[#0f172a] leading-tight tracking-tight">
                {job.title}
              </h1>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                นำเข้าระบบเมื่อ: {job.created_at || '7 มิถุนายน 2026'}
              </p>
            </div>

            {/* 2. Highlight Stats Grid (Education & Salaries & Authority) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex items-center gap-4.5 shadow-2xs">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">ระดับวุฒิการศึกษาที่ยอมรับ</span>
                  <span className="text-sm font-black text-slate-800">{job.education_level || 'ปริญญาตรีขึ้นไป'}</span>
                </div>
              </div>

              <div className="bg-amber-500/5 border border-amber-500/10 p-5 rounded-2xl flex items-center gap-4.5 shadow-2xs">
                <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl animate-pulse">
                  <Coins className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">อัตราค่าจ้าง / เงินเดือนเริ่มต้น</span>
                  <span className="text-sm font-black text-amber-700">{salaryText}</span>
                </div>
              </div>
            </div>

            {/* 3. Date Highlights Card - ทำเป็นกล่องไฮไลท์สีเด่นๆ */}
            <div className="bg-gradient-to-br from-amber-500 to-rose-600 text-white rounded-2xl p-6.5 shadow-xl shadow-amber-500/10 border border-white/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 transform translate-x-3 -translate-y-3 opacity-5 pointer-events-none">
                <Calendar className="w-36 h-36" />
              </div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 z-10 relative">
                <div className="space-y-1.5 flex-1">
                  <span className="bg-white/15 text-[10px] uppercase tracking-widest px-3 py-0.5 rounded-full font-black border border-white/20 inline-block text-white">
                    กำหนดช่วงวันเปิดและปิดยื่นความจำนงค์
                  </span>
                  <p className="text-lg md:text-xl font-black tracking-tight flex items-center gap-2 text-white">
                    <Calendar className="w-6 h-6 text-amber-300" />
                    {job.application_start_date} ถึง {job.application_end_date}
                  </p>
                  <p className="text-xs text-amber-50 font-medium">
                    * สมัครสอบผ่านทางออนไลน์หลักของส่วนงานราชการ ได้ตลอด 24 ชั่วโมง (ไม่เว้นวันหยุดราชการ)
                  </p>
                </div>
                
                {/* Countdown counter badge */}
                {(() => {
                  if (diffDays > 0) {
                    return (
                      <div className="bg-white text-slate-900 px-5 py-3 rounded-2xl shadow-xl border border-white/30 shrink-0 text-center flex flex-col justify-center">
                        <span className="text-[9.5px] uppercase font-black text-rose-500 tracking-wider">ระยะเวลาคงเหลือ</span>
                        <span className="text-lg font-black text-rose-600">{diffDays} วันถ้วน</span>
                      </div>
                    );
                  } else if (diffDays === 0) {
                    return (
                      <div className="bg-amber-400 text-slate-950 px-5 py-3 rounded-2xl font-black shrink-0 shadow-lg text-center animate-bounce">
                        ⚠️ ปิดรับวันนี้!
                      </div>
                    );
                  } else {
                    return (
                      <div className="bg-slate-900/60 text-slate-300 px-5 py-3 rounded-2xl border border-white/10 shrink-0 font-bold text-sm">
                        🔒 ปิดรับสมัครแล้ว
                      </div>
                    );
                  }
                })()}
              </div>
            </div>

            {/* 4. Deep content details Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">รายละเอียดลักษณะงาน และ คิวรีความสามารถพิเศษ</h3>
              </div>
              <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-6 shadow-3xs text-slate-700 text-sm whitespace-pre-wrap leading-relaxed font-sans font-medium">
                {job.content}
              </div>
            </div>

            {/* Exam Date reminder card */}
            <div className="bg-emerald-550/5 border border-emerald-500/10 p-5 rounded-2xl flex items-center gap-4 shadow-3xs">
              <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl leading-none">
                <Clock className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <span className="text-[10px] text-emerald-600 font-bold block uppercase tracking-wider">กำหนดการสอบภาคความรู้เฉพาะตำแหน่ง (ภาค ข เเละ ค)</span>
                <span className="text-xs font-bold text-slate-800 mt-0.5 block">{job.exam_date || 'ประกาศรายชื่อสิทธิ์สอบและตารางความก้าวหน้าภายในวันที่สิ้นสุดปิดกล่องพ้นใบสมัคร'}</span>
              </div>
            </div>

            {/* Job Source Action Block */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-5">
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-amber-400 flex items-center gap-1.5 justify-center md:justify-start">
                  <Sparkles className="w-4 h-4" /> ประสานงานผ่านเว็บไซต์ทางการ
                </h4>
                <p className="text-xs text-slate-400 text-center md:text-left">
                  กรุณาตรวจสอบเอกสารแนบท้าย PDF ราชกิจจานุเบกษา และยื่นใบแจ้งสิทธิ์โดยตรงที่หน่วยงานสำนักงาน ก.พ.
                </p>
              </div>
              
              <a
                href={job.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs px-6 py-3.5 rounded-xl transition-all shadow-md shadow-blue-500/15 text-center flex items-center justify-center gap-1.5 cursor-pointer scale-100 hover:scale-102 shrink-0"
              >
                สมัครงาน / ไปยังเว็บไซต์ต้นทาง <ExternalLink className="w-4 h-4 text-amber-300" />
              </a>
            </div>

          </div>
        </motion.div>

        {/* 5. Google AdSense - ล่างสุดของเนื้อหา */}
        <AdSenseBlock slot="adsense-job-detail-bottom-banner" type="banner" />

        {/* Floating Back Buttons */}
        <div className="flex justify-center mt-2 pb-6">
          <Link 
            href="/"
            className="px-6 py-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer text-slate-300"
          >
            ← ย้อนกลับไปหน้าหลักค้นหาตำแหน่งงาน
          </Link>
        </div>

      </main>
    </div>
  );
}
