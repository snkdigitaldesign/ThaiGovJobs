'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Database, 
  ShieldCheck, 
  Search, 
  MapPin, 
  GraduationCap, 
  Calendar, 
  Clock, 
  Briefcase, 
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Tag,
  Building2,
  BookOpen
} from 'lucide-react';
import { motion } from 'motion/react';
import { DEFAULT_JOBS } from '@/lib/constants';
import { AdSenseBlock } from '@/components/AdSenseBlock';

export default function HomePage() {
  const [simJobs, setSimJobs] = useState<any[]>(DEFAULT_JOBS);
  const [hasHydrated, setHasHydrated] = useState<boolean>(false);

  // Filter states
  const [publicSelectedCategory, setPublicSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEdu, setSelectedEdu] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');

  // Load from localStorage to match admin modifications cleanly
  useEffect(() => {
    const storedJobs = localStorage.getItem('gov_sim_jobs');
    let loadedJobs = DEFAULT_JOBS;
    if (storedJobs) {
      try {
        loadedJobs = JSON.parse(storedJobs);
      } catch (e) {
        console.error("Failed to load stored jobs", e);
      }
    }
    setTimeout(() => {
      setSimJobs(loadedJobs);
      setHasHydrated(true);
    }, 0);
  }, []);

  // Filter logic
  // Get active published jobs (excluding draft and expired ones)
  const activePublishedJobs = simJobs.filter(job => {
    if (job.status !== 'published') return false;

    if (job.application_end_date) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      if (job.application_end_date < todayStr) {
        return false;
      }
    }

    return true;
  });

  const filteredJobs = activePublishedJobs.filter(job => {
    // Category Filter
    if (publicSelectedCategory !== 'all' && job.category !== publicSelectedCategory) {
      return false;
    }

    // Education level Filter
    if (selectedEdu !== 'all' && !job.education_level?.includes(selectedEdu)) {
      return false;
    }

    // Region Filter
    if (selectedRegion !== 'all' && !job.region?.includes(selectedRegion)) {
      return false;
    }

    // Search query Filter (match title, content & region)
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchTitle = job.title?.toLowerCase().includes(q);
      const matchContent = job.content?.toLowerCase().includes(q);
      const matchRegion = job.region?.toLowerCase().includes(q);
      if (!matchTitle && !matchContent && !matchRegion) {
        return false;
      }
    }

    return true;
  });

  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-[#060b13] text-slate-100 flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4 text-center p-6">
          <Database className="w-8 h-8 text-amber-500 animate-pulse" />
          <h1 className="text-xl font-black text-white tracking-tight">กำลังดาวน์โหลดสรรพคุณคลังตำแหน่งงาน...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060b13] text-slate-100 font-sans leading-relaxed flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      
      {/* Brand Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-xl py-4.5 px-6 sticky top-0 z-40 shadow-xl shadow-slate-950/20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-500 text-slate-950 p-3 rounded-2xl shadow-lg flex items-center justify-center border border-indigo-300/30">
              <Building2 className="w-7 h-7 text-indigo-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-blue-500/10 text-blue-400 text-[10px] tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border border-blue-500/20 uppercase">
                  Thai Government Recruits
                </span>
                <span className="text-slate-400 text-xs flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/30 animate-pulse"></span>
                  ระบบนำทางและสแกนสอบแบบแยกหน้าเพจ
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight mt-1">
                ประตูสู่ประกาศสอบและงานราชการไทย
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-950/40 p-1.5 rounded-2xl border border-slate-800/80">
            <Link
              href="/"
              className="px-4 py-2 rounded-xl font-bold text-xs tracking-wide transition-all duration-350 flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-650 text-white shadow-md shadow-blue-500/10 scale-[1.02]"
            >
              <Briefcase className="w-4 h-4" />
              มุมมองผู้สมัครทั่วไป (Public View)
            </Link>
            <Link
              href="/admin"
              className="px-4 py-2 rounded-xl font-bold text-xs tracking-wide transition-all duration-350 flex items-center gap-2 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
            >
              <ShieldCheck className="w-4 h-4" />
              แผงควบคุมระบบ (Admin Panel)
            </Link>
          </div>
        </div>
      </header>

      {/* Main Layout Grid */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* RIGHT SIDEBAR / STATS FILTER SETTINGS (4 cols across) */}
        <div id="sidebar-filter-panel" className="lg:col-span-4 flex flex-col gap-5 order-2 lg:order-1">
          
          {/* Public Integrity Seal */}
          <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl p-5.5 border border-slate-800/95 shadow-lg flex flex-col gap-4">
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-450" />
              หลักการสืบค้นข้อมูลปฐมภูมิผู้สมัคร
            </h3>
            <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10 flex flex-col gap-2 text-xs text-emerald-300">
              <p className="font-bold flex items-center gap-1.5 text-[12px] text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-md"></span>
                สแกนตรงระบบ OCSC ก.พ. 2569
              </p>
              <p className="leading-relaxed text-[11px] text-slate-400">
                ข้อมูลบอร์ดข่าวราชการนี้จะได้รับการกรอกและเรียบเรียงฉบับจริงโดยแอดมิน เพื่อความแม่นยำในการคัดกรอง วุฒิวิชาความสามารถ อัตราค่าจ้าง และตารางสอบแข่งขันอย่างยุติธรรม
              </p>
            </div>
          </div>

          {/* Category counters buttons filter selection */}
          <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl p-5.5 border border-slate-800/95 shadow-lg flex flex-col gap-4">
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-400" />
              หมวดหมู่เกณฑ์งานราชการ
            </h3>
            
            <div className="flex flex-col gap-2 text-xs">
              <button 
                onClick={() => setPublicSelectedCategory('all')} 
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 text-left cursor-pointer ${publicSelectedCategory === 'all' ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white font-extrabold border-transparent shadow-md shadow-sky-500/10 scale-[1.02]' : 'bg-slate-950/80 hover:bg-slate-850 border-slate-800/60 text-slate-300'}`}
              >
                <span className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  ทุกประเภทประกาศสอบ
                </span>
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${publicSelectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  {activePublishedJobs.length} งาน
                </span>
              </button>

              <button 
                onClick={() => setPublicSelectedCategory('ข้าราชการ')} 
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 text-left cursor-pointer ${publicSelectedCategory === 'ข้าราชการ' ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white font-extrabold border-transparent shadow-md shadow-blue-500/10 scale-[1.02]' : 'bg-slate-950/80 hover:bg-slate-850 border-slate-800/60 text-slate-300'}`}
              >
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                  ข้าราชการพลเรือนสามัญ
                </span>
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${publicSelectedCategory === 'ข้าราชการ' ? 'bg-white/20 text-white' : 'bg-blue-500/10 text-blue-400 border border-blue-500/15'}`}>
                  {activePublishedJobs.filter(j => j.category === 'ข้าราชการ').length} งาน
                </span>
              </button>

              <button 
                onClick={() => setPublicSelectedCategory('พนักงานราชการ')} 
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 text-left cursor-pointer ${publicSelectedCategory === 'พนักงานราชการ' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-extrabold border-transparent shadow-md shadow-amber-500/10 scale-[1.02]' : 'bg-slate-950/80 hover:bg-slate-850 border-slate-800/60 text-slate-300'}`}
              >
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  พนักงานราชการทั่วไป
                </span>
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${publicSelectedCategory === 'พนักงานราชการ' ? 'bg-slate-950/60 text-slate-800 font-extrabold' : 'bg-amber-500/10 text-amber-400 border border-amber-500/15'}`}>
                  {activePublishedJobs.filter(j => j.category === 'พนักงานราชการ').length} งาน
                </span>
              </button>

              <button 
                onClick={() => setPublicSelectedCategory('ลูกจ้าง')} 
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 text-left cursor-pointer ${publicSelectedCategory === 'ลูกจ้าง' ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-extrabold border-transparent shadow-md shadow-indigo-500/10 scale-[1.02]' : 'bg-slate-950/80 hover:bg-slate-850 border-slate-800/60 text-slate-300'}`}
              >
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                  ลูกจ้างชั่วคราว / พนักงานจ้าง
                </span>
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${publicSelectedCategory === 'ลูกจ้าง' ? 'bg-white/20 text-white font-extrabold' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/15'}`}>
                  {activePublishedJobs.filter(j => j.category === 'ลูกจ้าง').length} งาน
                </span>
              </button>
            </div>
          </div>

          {/* AdSense Sidebar Slot */}
          <AdSenseBlock slot="adsense-sidebar" type="sidebar" />
        </div>

        {/* LEFT WORKSPACE / MAIN WORKFLOW AREA (8 cols across) */}
        <div id="main-view-workspace" className="lg:col-span-8 flex flex-col gap-5 order-1 lg:order-2">
          
          <div className="bg-white text-slate-900 p-6 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col gap-2.5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-50 rounded-full blur-2xl opacity-70 pointer-events-none"></div>
            <span className="bg-blue-50 text-blue-800 text-[10px] font-extrabold px-3 py-0.5 rounded-full border border-blue-150 w-max uppercase tracking-wider">
              Thai Citizens Recruitment Portal
            </span>
            <h2 className="text-xl md:text-2xl font-black text-[#0f172a] tracking-tight">คลังข่าวสารรับสมัครงานและสอบราชการ</h2>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              ศูนย์สถิติปูพรมระบบสแกนเอกสารแนบท้ายราชกิจจานุเบกษา รักษาสิทธิประโยชน์ของผู้สมัครงานราชการไทย นำเสนอวุฒิการศึกษาที่ยอมรับ อัตราผลจ้าง และกรอบวันที่อย่างเข้มข้นตรงตามข้อเท็จจริง
            </p>
          </div>

          {/* Real-time filters and search widget */}
          <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-3xl border border-slate-800/80 shadow-lg flex flex-col gap-4">
            
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-950 rounded-xl border border-slate-800/60 shadow-inner">
              <Search className="w-4.5 h-4.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs bg-transparent focus:outline-none placeholder-slate-500 font-medium text-slate-200"
                placeholder="สืบค้นด่วน: ชื่อตำแหน่ง, แผนกงานกรมกระทรวง, จังหวัด หรือคุณวุฒิความสามารถ..."
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-slate-500 hover:text-white"
                >
                  ล้างคำค้น
                </button>
              )}
            </div>

            {/* Quick selectivity grids */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Region Selector */}
              <div className="flex items-center gap-2.5 bg-slate-950 py-2 px-3 rounded-xl border border-slate-800/55">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                <div className="flex-1">
                  <select 
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    className="w-full bg-transparent border-0 text-xs text-slate-300 focus:outline-none text-[11px] font-bold cursor-pointer"
                  >
                    <option value="all" className="bg-slate-900 text-slate-300">ทุกพื้นที่ปฏิบัติงาน (จังหวัด)</option>
                    <option value="กรุงเทพมหานคร" className="bg-slate-900 text-slate-300">กรุงเทพมหานคร</option>
                    <option value="ภาคกลาง" className="bg-slate-900 text-slate-300">ภาคกลาง</option>
                    <option value="ภาคเหนือ" className="bg-slate-900 text-slate-300">ภาคเหนือ</option>
                    <option value="ภาคใต้" className="bg-slate-900 text-slate-300">ภาคใต้</option>
                    <option value="ภาคตะวันออกเฉียงเหนือ" className="bg-slate-900 text-slate-300">ภาคตะวันออกเฉียงเหนือ</option>
                    <option value="ทั่วประเทศ" className="bg-slate-900 text-slate-300">ทั่วประเทศ / หลากหลายจังหวัด</option>
                  </select>
                </div>
              </div>

              {/* Education Level Selector */}
              <div className="flex items-center gap-2.5 bg-slate-950 py-2 px-3 rounded-xl border border-slate-800/55">
                <GraduationCap className="w-4 h-4 text-indigo-500 shrink-0" />
                <div className="flex-1">
                  <select
                    value={selectedEdu}
                    onChange={(e) => setSelectedEdu(e.target.value)}
                    className="w-full bg-transparent border-0 text-xs text-slate-300 focus:outline-none text-[11px] font-bold cursor-pointer"
                  >
                    <option value="all" className="bg-slate-900 text-slate-300">ทุกวุฒิชำนาญการ (Education)</option>
                    <option value="ปริญญาตรี" className="bg-slate-900 text-slate-300">ปริญญาตรีขึ้นไป</option>
                    <option value="ปริญญาโท" className="bg-slate-900 text-slate-300">ปริญญาโทขึ้นไป</option>
                    <option value="ปวส." className="bg-slate-900 text-slate-300">ปวส.</option>
                    <option value="ปวช." className="bg-slate-900 text-slate-300">ปวช. / ม.6</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Filter result badge indicator */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 border-t border-slate-800 pt-2 font-mono">
              <span>ผลลัพธ์คัดกรอง: {filteredJobs.length} ตำแหน่งที่พร้อมรับสมัครตอนนี้</span>
              {(searchQuery || selectedEdu !== 'all' || selectedRegion !== 'all' || publicSelectedCategory !== 'all') && (
                <button
                  onClick={() => {
                    setPublicSelectedCategory('all');
                    setSelectedEdu('all');
                    setSelectedRegion('all');
                    setSearchQuery('');
                  }}
                  className="text-amber-500 hover:underline"
                >
                  ล้างตัวกรองทั้งหมด
                </button>
              )}
            </div>

          </div>

          {/* List of Job cards linking directly to the details route page */}
          <div className="flex flex-col gap-4">
            {filteredJobs.length === 0 ? (
              <div className="bg-slate-900/10 border border-slate-800 border-dashed rounded-3xl p-16 text-center text-slate-500 text-xs flex flex-col items-center gap-3">
                <BookOpen className="w-10 h-10 text-slate-600 animate-pulse" />
                <p className="font-bold">น่าเสียดาย! ไม่พบบันทึกตรงตามเงื่อนไขที่ระบุ</p>
                <p className="text-[10px] text-slate-600">กรุณาลองปรับเปลี่ยนเงื่อนไขสืบค้นหรือเปลี่ยนหมวดหลักที่ใช้สืบค้น</p>
              </div>
            ) : (
              filteredJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="bg-white border border-slate-200 border-b-3 hover:border-blue-500/30 hover:-translate-y-0.5 transition-all duration-300 rounded-3xl p-5 md:p-6 shadow-2xs hover:shadow-lg cursor-pointer flex flex-col gap-4 group/card text-slate-900"
                >
                  
                  {/* Card Header metadata */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5 font-sans">
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-blue-100/60 leading-none shadow-3xs ${job.category === 'ข้าราชการ' ? 'bg-blue-50 text-blue-700' : job.category === 'พนักงานราชการ' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-50 text-indigo-700'}`}>
                          {job.category}
                        </span>
                        <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" />
                          จังหวัด {job.region}
                        </span>
                        <span className="bg-slate-50 text-slate-600 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5 text-[#5850ec]" />
                          วุฒิ {job.education_level || 'ปริญญาตรี'}
                        </span>
                      </div>
                      
                      <h3 className="font-extrabold text-[#0f172a] text-base md:text-lg leading-snug mt-2 group-hover/card:text-blue-600 transition-colors duration-250">
                        {job.title}
                      </h3>
                    </div>

                    <div className="flex flex-col text-[11px] text-slate-400 text-left sm:text-right font-medium shrink-0">
                      <span className="font-sans font-bold text-[10px]">สิ้นสุดรับสมัครสิทธิ์</span>
                      <span className="text-rose-650 font-bold flex items-center gap-1 bg-rose-50 px-2.5 py-1 rounded-full text-[10px] mt-1.5 pr-3 w-max sm:ml-auto border border-rose-100 uppercase tracking-tight">
                        <Calendar className="w-3.5 h-3.5 text-rose-500" />
                        {job.application_end_date}
                      </span>
                    </div>
                  </div>

                  {/* Card Description Snippet with line truncations */}
                  <p className="text-xs text-slate-600 leading-relaxed font-sans font-medium line-clamp-3">
                    {job.content}
                  </p>

                  {/* Card footer details */}
                  <div className="bg-slate-50/80 rounded-2xl p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-100 text-xs mt-1">
                    <div className="space-y-1">
                      <p className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">
                        ข้อมูลการสอบคัดเลือก / วันสำคัญ
                      </p>
                      <p className="font-extrabold text-slate-800 flex items-center gap-1.5 leading-none">
                        <Clock className="w-4 h-4 text-emerald-600" />
                        {job.exam_date || 'ตามรายละเอียดกฎสมรรถนะของส่วนงานราชการ'}
                      </p>
                    </div>

                    <span 
                      className="bg-[#0f172a] group-hover/card:bg-blue-650 group-hover/card:shadow-blue-650/10 text-white font-black py-2.5 px-4.5 rounded-xl text-center shadow transition-all shrink-0 flex items-center justify-center gap-1.5 text-xs inline-flex"
                    >
                      ดูรายละเอียดงานและแชร์ข่าว <ArrowRight className="w-4 h-4 text-amber-400" />
                    </span>
                  </div>

                </Link>
              ))
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
