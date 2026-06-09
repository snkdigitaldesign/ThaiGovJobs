'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Filter,
  Calendar,
  Building2,
  CircleDollarSign,
  GraduationCap,
  MapPin,
  ArrowRight,
  TrendingUp,
  Sparkles,
  AlertCircle,
  Briefcase,
  Layers,
  X,
  RefreshCw,
  Lock,
  ChevronRight
} from 'lucide-react';

export interface JobItem {
  id: string;
  title: string;
  department: string;
  salary: string;
  vacancies: string;
  period: string;
  requirements: string;
  description: string;
  officialUrl: string;
  isQuickScrape?: boolean;
  createdAt: string;

  category?: string;
  education_level?: string;
  region?: string;
  application_start_date?: string;
  application_end_date?: string;
  logo_url?: string;
  pdf_url?: string;
}

export default function Home() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected Filters
  const [selectedEducation, setSelectedEducation] = useState('ทั้งหมด');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');

  // List of distinct filter options
  const educationOptions = [
    'ทั้งหมด',
    'มัธยมศึกษาตอนปลาย',
    'ปวช. / ปวส.',
    'ปริญญาตรี',
    'ปริญญาโท',
    'ปริญญาเอก',
    'ไม่จำกัดวุฒิ'
  ];

  const categoryOptions = [
    'ทั้งหมด',
    'ข้าราชการ',
    'พนักงานราชการ',
    'ลูกจ้าง',
    'รัฐวิสาหกิจ',
    'ราชการส่วนท้องถิ่น'
  ];

  // Fetch all jobs with retry support
  const fetchJobs = async (retryCount = 3, delayMs = 1500) => {
    try {
      setLoading(true);
      const res = await fetch('/api/jobs', {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }
      const data = await res.json();
      if (data.success && data.list) {
        setJobs(data.list);
        setLoading(false);
        return;
      } else {
        throw new Error(data.error || 'Server response false success status');
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
      if (retryCount > 0) {
        console.log(`Retrying fetch jobs... (${retryCount} retries remaining)`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        await fetchJobs(retryCount - 1, delayMs * 1.5);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Today's date logic for expiration screening
  const getTodayDate = () => {
    // Return midnight today's Date local context in UTC string 2026-06-08
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const today = getTodayDate();

  // Automatic filtration mechanism: Keep only those jobs where application_end_date >= today
  // Or if no application_end_date is specified (like default fallback or unspecified jobs), display them.
  const activeJobs = jobs.filter(job => {
    if (!job.application_end_date) {
      // Mock data/fallback jobs without specific end date are shown
      return true;
    }
    try {
      const endDate = new Date(job.application_end_date);
      endDate.setHours(23, 59, 59, 999); // Inclusive of full last day
      return endDate >= today;
    } catch (e) {
      return true;
    }
  });

  // Client-side Filter & Search Logic
  const filteredJobs = activeJobs.filter(job => {
    // 1. Text Search Map (Title, Department, Requirements)
    const normalizedQuery = searchQuery.toLowerCase().trim();
    const matchesSearch = normalizedQuery === '' || 
      job.title.toLowerCase().includes(normalizedQuery) ||
      job.department.toLowerCase().includes(normalizedQuery) ||
      (job.requirements && job.requirements.toLowerCase().includes(normalizedQuery)) ||
      (job.description && job.description.toLowerCase().includes(normalizedQuery));

    // 2. Education filter comparison
    // Matches if education level represents the selected tag OR listed in requirement string
    const matchesEducation = selectedEducation === 'ทั้งหมด' ||
      (job.education_level && job.education_level.includes(selectedEducation)) ||
      (job.requirements && job.requirements.includes(selectedEducation)) ||
      (selectedEducation === 'ปวช. / ปวส.' && job.requirements?.includes('ปวช')) ||
      (selectedEducation === 'ไม่จำกัดวุฒิ' && (job.education_level === 'ไม่จำกัดวุฒิ' || job.education_level?.includes('ไม่จำกัด')));

    // 3. Category filter comparison
    const matchesCategory = selectedCategory === 'ทั้งหมด' ||
      (job.category && job.category === selectedCategory) ||
      (job.requirements && job.requirements.includes(selectedCategory));

    return matchesSearch && matchesEducation && matchesCategory;
  });

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedEducation('ทั้งหมด');
    setSelectedCategory('ทั้งหมด');
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] text-slate-800 font-sans selection:bg-emerald-500 selection:text-white">
      
      {/* 1. Header Bar */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.02)] backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-emerald-600 to-teal-500 text-white rounded-xl shadow-md shadow-emerald-500/10">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <div>
              <h1 id="brand-logo" className="text-base md:text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
                หางานราชการง่ายๆ
              </h1>
              <p className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">ACTIVE OFFICIAL TELEPORT</p>
            </div>
          </div>

          {/* Secure Admin Portal Link */}
          <button
            id="btn-staff-portal"
            onClick={() => router.push('/admin/dashboard')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-950 hover:bg-slate-50 rounded-xl transition border border-slate-100 hover:border-slate-200"
          >
            <Lock size={12} className="text-emerald-500" />
            <span>เข้าสู่ระบบเจ้าหน้าที่</span>
          </button>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="bg-slate-950 text-white py-16 md:py-20 relative overflow-hidden">
        {/* Abstract decorative elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent)] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#fafbfc] to-transparent pointer-events-none"></div>

        <div className="max-w-4xl mx-auto px-4 text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/10">
            <TrendingUp size={12} fill="currentColor" />
            <span>อัปเดตงานสอบแบบเรียลไทม์ ตรวจสอบความถูกต้องอัตโนมัติ</span>
          </div>

          <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
            ศูนย์รวมประกาศสมัครงานราชการ <br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">ที่ยังไม่หมดเขตรับสมัคร</span> 🇹🇭
          </h2>

          <p className="text-xs md:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            เรารวบรวมข้อมูลสมัครสอบแข่งขัน ข้าราชการ พนักงานราชการ และรัฐวิสาหกิจ 
            พร้อมระบบคัดกรองอัจฉริยะลบประกาศหมดอายุให้อัตโนมัติ เพื่อทุกโอกาสที่สดใหม่และใช้สมัครได้จริง!
          </p>
        </div>
      </section>

      {/* 3. Main Dashboard Board */}
      <main className="max-w-6xl mx-auto px-4 md:px-8 py-8 -mt-8 relative z-20 space-y-8">
        
        {/* Dynamic Status Counter and Screening Warning Banner */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.02)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Calendar size={18} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-700">ระบบปกป้องข้อมูลหมดอายุทำงานอยู่</h3>
              <p className="text-[10px] text-slate-400 font-sans">
                คัดกรองเฉพาะหัวข้อที่มีวันปิดรับสมัคร ตั้งแต่ <strong className="text-emerald-600 font-bold">{new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</strong> เป็นต้นไป เท่านั้น
              </p>
            </div>
          </div>
          <div className="text-xs font-semibold bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-full w-fit">
            พบงานเปิดรับสมัคร {filteredJobs.length} ตำแหน่ง
          </div>
        </div>

        {/* Filters Panel Panel */}
        <section id="filters-container" className="bg-white rounded-3xl border border-slate-100 shadow-[0_10px_35px_rgba(0,0,0,0.03)] p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4 flex-wrap gap-2">
            <h3 className="font-bold text-slate-900 text-sm md:text-base flex items-center gap-2">
              <Filter size={16} className="text-slate-400" />
              กล่องคัดกรองตำแหน่งงานสอบราชการ
            </h3>
            {(selectedEducation !== 'ทั้งหมด' || selectedCategory !== 'ทั้งหมด' || searchQuery !== '') && (
              <button
                id="btn-reset-filters"
                onClick={handleResetFilters}
                className="text-xs font-bold text-slate-500 hover:text-emerald-600 flex items-center gap-1 transition"
              >
                <X size={14} />
                ล้างตัวกรองทั้งหมด
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 1. Search text bar input */}
            <div className="space-y-2">
              <label htmlFor="search-input" className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                ค้นหาคำสำคัญ (ตำแหน่ง/หน่วยงาน)
              </label>
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="เช่น กรมสรรพากร, บัญชี, ปวช..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-xs transition placeholder:text-slate-400 bg-slate-50/20"
                />
              </div>
            </div>

            {/* 2. Education level selector */}
            <div className="space-y-2">
              <label htmlFor="education-select" className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                วุฒิการศึกษาที่สมัครสอบ
              </label>
              <div className="relative">
                <GraduationCap size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  id="education-select"
                  value={selectedEducation}
                  onChange={(e) => setSelectedEducation(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-xs bg-white text-slate-700 font-medium"
                >
                  {educationOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt === 'ทั้งหมด' ? 'วุฒิการศึกษาทั้งหมด' : opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 3. Job category selector */}
            <div className="space-y-2">
              <label htmlFor="category-select" className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                ประเภทหมวดหมู่งาน
              </label>
              <div className="relative">
                <Briefcase size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  id="category-select"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-xs bg-white text-slate-700 font-medium"
                >
                  {categoryOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt === 'ทั้งหมด' ? 'ประเภทงานทั้งหมด' : opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

          </div>
        </section>

        {/* 4. Filtered Results Display Grid */}
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <h3 className="font-bold text-slate-800 text-sm md:text-base">
              รายการสอบสมัครงานราชการเปิดรับสมัครอยู่ ({filteredJobs.length} ตำแหน่ง)
            </h3>
          </div>

          <AnimatePresence mode="popLayout">
            {loading ? (
              <div id="loading-block" className="py-24 text-center bg-white rounded-3xl border border-slate-100 shadow-xs">
                <RefreshCw size={36} className="animate-spin mx-auto text-emerald-600 mb-4" />
                <p className="text-xs font-semibold text-slate-500">กำลังตรวจสอบสารบัตรรวมงานราชการด่วน...</p>
              </div>
            ) : filteredJobs.length === 0 ? (
              <motion.div
                id="no-jobs-container"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-slate-100 rounded-3xl p-16 text-center shadow-xs"
              >
                <AlertCircle size={32} className="mx-auto text-slate-300 mb-3" />
                <h4 className="font-bold text-slate-800 text-sm mb-1">ไม่เจอประกาศแข่งขันตามเงื่อนไขดังกล่าว</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed mt-2">
                  ขณะนี้อาจไม่มีเปิดรับสำหรับตัวกรองที่คุณเลือก หรือหมดเขตรับสมัครสอบแข่งขันเรียบร้อยแล้ว
                </p>
                <button
                  onClick={handleResetFilters}
                  className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
                >
                  <RefreshCw size={12} />
                  แสดงข้อมูลดั้งเดิม
                </button>
              </motion.div>
            ) : (
              <div id="jobs-grid" className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredJobs.map((job, idx) => {
                  return (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.3, delay: Math.min(idx * 0.04, 1.2) }}
                      onClick={() => router.push(`/jobs/${job.id}`)}
                      className="bg-white border border-slate-100 hover:border-emerald-500/20 rounded-3xl p-6 transition-all duration-300 hover:shadow-[0_12px_30px_rgba(16,185,129,0.06)] flex flex-col justify-between group cursor-pointer relative overflow-hidden"
                    >
                      {/* Accent color strip */}
                      <div className="absolute top-0 left-0 right-0 h-[3px] bg-slate-100 group-hover:bg-gradient-to-r group-hover:from-emerald-500 group-hover:to-teal-500 transition-colors"></div>

                      <div className="flex gap-4 items-start">
                        {job.logo_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={job.logo_url}
                            alt={job.department}
                            className="w-12 h-12 md:w-14 md:h-14 object-contain bg-slate-50 p-1.5 rounded-xl border border-slate-100 shrink-0 self-start"
                          />
                        )}
                        <div className="space-y-4 flex-1 min-w-0">
                          {/* Upper Badges & Meta */}
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-bold tracking-tight border border-emerald-100/50">
                              {job.category || job.requirements?.split('|')?.[2]?.replace('หมวดหมู่:', '')?.trim() || 'ข้าราชการ'}
                            </span>
                            
                            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              มีผลสมัครได้อยู่
                            </span>
                          </div>

                          {/* Position job Title */}
                          <h4 className="font-bold text-slate-800 group-hover:text-emerald-700 transition duration-150 text-sm md:text-base leading-snug line-clamp-2">
                            {job.title}
                          </h4>

                          {/* Core Details Spec List */}
                          <div className="space-y-2 text-xs text-slate-500">
                            {/* Department info */}
                            <div className="flex items-center gap-2.5">
                              <Building2 size={14} className="text-slate-400 shrink-0" />
                              <span className="font-semibold text-slate-700">{job.department}</span>
                            </div>

                            {/* Period duration info */}
                            <div className="flex items-center gap-2.5">
                              <Calendar size={14} className="text-slate-400 shrink-0" />
                              <span className="text-slate-600 line-clamp-1">{job.period}</span>
                            </div>

                            {/* Level criteria display */}
                            <div className="flex items-start gap-2.5">
                              <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold shrink-0 mt-0.5">
                                วุฒิที่ระบุ
                              </span>
                              <span className="text-slate-500 line-clamp-1">
                                {job.education_level || job.requirements?.split('|')?.[0]?.trim() || 'ปริญญาตรีขึ้นไป'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Lower controls section */}
                      <div className="pt-4 mt-6 border-t border-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-slate-700 text-xs font-semibold">
                          <CircleDollarSign size={14} className="text-emerald-600 shrink-0" />
                          <span className="text-slate-800">{job.salary}</span>
                        </div>

                        <span className="text-emerald-600 font-bold text-xs flex items-center gap-1 group-hover:translate-x-1.5 transition-all">
                          อ่านต่อและแชร์
                          <ArrowRight size={14} />
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </section>

      </main>

      {/* 5. Elegant Footer */}
      <footer className="py-12 border-t border-slate-100 bg-white mt-24 text-center text-slate-400 text-xs">
        <div className="max-w-4xl mx-auto px-4 space-y-2">
          <p className="font-semibold text-slate-600">หางานราชการง่ายๆ • เว็บบอร์ดปฏิทินข่าวสารการสอบแข่งขัน</p>
          <p className="text-[10px] font-mono">ALL DATA IS REAL-TIME AUTOMATICALLY VERIFIED & SECURED BY SUB-SYSTEMS</p>
        </div>
      </footer>

    </div>
  );
}
