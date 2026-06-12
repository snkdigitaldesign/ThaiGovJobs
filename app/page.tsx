'use client';

import { useState, useEffect, Fragment } from 'react';
import Logo from '@/components/Logo';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { getCountdownText } from '@/lib/utils';
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
  ChevronRight,
  Award,
  CheckCircle2,
  HelpCircle,
  Clock,
  BriefcaseBusiness,
  Eye
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
  views?: number;

  category?: string;
  education_level?: string;
  region?: string;
  application_start_date?: string;
  application_end_date?: string;
  logo_url?: string;
  pdf_url?: string;
  total_positions?: number;
}

function checkIfRequiresPartA(job: JobItem): boolean {
  const text = (
    (job.title || '') + ' ' + 
    (job.requirements || '') + ' ' + 
    (job.description || '')
  ).toLowerCase();
  
  if (
    text.includes('ไม่ต้องผ่าน ภาค ก') ||
    text.includes('ไม่ต้องผ่านภาค ก') ||
    text.includes('ไม่ต้องมีภาค ก') ||
    text.includes('ไม่ต้องมี ภาค ก') ||
    text.includes('ไม่ต้องใช้ ภาค ก') ||
    text.includes('ไม่ต้องใช้ภาค ก') ||
    text.includes('ยกเว้น ภาค ก') ||
    text.includes('ยกเว้นภาค ก') ||
    text.includes('ไม่ต้องสอบผ่านภาค ก') ||
    text.includes('ไม่ต้องสอบผ่าน ภาค ก')
  ) {
    return false;
  }
  
  if (
    text.includes('ผ่านการวัดความรู้ความสามารถทั่วไป') ||
    text.includes('ผ่าน ภาค ก') ||
    text.includes('ผ่านภาค ก') ||
    text.includes('ต้องผ่านภาค ก') ||
    text.includes('ต้องผ่าน ภาค ก') ||
    text.includes('ต้องสอบผ่าน ภาค ก') ||
    text.includes('ก.พ. ภาค ก') ||
    text.includes('ภาค ก. ของ') ||
    text.includes('ภาค ก ของ')
  ) {
    return true;
  }
  
  if (job.category === 'ข้าราชการ') {
    return true;
  }
  
  return false;
}

function isRecentJob(createdAtString: string): boolean {
  if (!createdAtString) return false;
  try {
    const createdDate = new Date(createdAtString);
    const now = new Date();
    // 7 days in milliseconds
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    return (now.getTime() - createdDate.getTime()) < oneWeek;
  } catch (e) {
    return false;
  }
}

export default function Home() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected Filters
  const [selectedEducation, setSelectedEducation] = useState('ทั้งหมด');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  const [selectedRegion, setSelectedRegion] = useState('ทั้งหมด');
  const [selectedPartA, setSelectedPartA] = useState<'all' | 'requires' | 'exempt'>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'agency' | 'latest' | 'requires_part_a' | 'no_part_a'>('all');

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

  const [thaiDateInLocale, setThaiDateInLocale] = useState<string>('');

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
    setThaiDateInLocale(new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }));
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
      (job.description && job.description.toLowerCase().includes(normalizedQuery)) ||
      (job.region && job.region.toLowerCase().includes(normalizedQuery));

    // 2. Education filter comparison
    let matchesEducation = true;
    if (selectedEducation !== 'ทั้งหมด') {
      if (selectedEducation === 'ปวช. / ปวส.') {
        matchesEducation = !!(job.education_level && (job.education_level.includes('ปวช') || job.education_level.includes('ปวส'))) || 
                           !!(job.requirements && (job.requirements.includes('ปวช') || job.requirements.includes('ปวส')));
      } else if (selectedEducation === 'ปวช.') {
        matchesEducation = !!(job.education_level && job.education_level.includes('ปวช')) || !!(job.requirements && job.requirements.includes('ปวช'));
      } else if (selectedEducation === 'ปวส.') {
        matchesEducation = !!(job.education_level && job.education_level.includes('ปวส')) || !!(job.requirements && job.requirements.includes('ปวส'));
      } else if (selectedEducation === 'ปริญญาตรี') {
        matchesEducation = !!(job.education_level && job.education_level.includes('ปริญญาตรี')) || !!(job.requirements && job.requirements.includes('ปริญญาตรี'));
      } else if (selectedEducation === 'ปริญญาโท') {
        matchesEducation = !!(job.education_level && job.education_level.includes('ปริญญาโท')) || !!(job.requirements && job.requirements.includes('ปริญญาโท'));
      } else if (selectedEducation === 'ปริญญาเอก') {
        matchesEducation = !!(job.education_level && job.education_level.includes('ปริญญาเอก')) || !!(job.requirements && job.requirements.includes('ปริญญาเอก'));
      } else if (selectedEducation === 'ไม่จำกัดวุฒิ') {
        matchesEducation = !job.education_level || job.education_level === 'ไม่จำกัดวุฒิ' || job.education_level.includes('ไม่จำกัด') || !!(job.requirements && job.requirements.includes('ไม่จำกัด'));
      } else {
        matchesEducation = !!(job.education_level && job.education_level.includes(selectedEducation)) || !!(job.requirements && job.requirements.includes(selectedEducation));
      }
    }

    // 3. Category filter comparison
    const matchesCategory = selectedCategory === 'ทั้งหมด' ||
      (job.category && job.category === selectedCategory) ||
      (job.requirements && job.requirements.includes(selectedCategory));

    // 4. Region filter comparison
    const matchesRegion = selectedRegion === 'ทั้งหมด' ||
      (job.region && job.region === selectedRegion);

    // 5. Part A (ก.พ.) filter comparison
    const isPartARequired = checkIfRequiresPartA(job);
    let matchesPartA = true;
    if (selectedPartA === 'requires') {
      matchesPartA = isPartARequired;
    } else if (selectedPartA === 'exempt') {
      matchesPartA = !isPartARequired;
    }

    return matchesSearch && matchesEducation && matchesCategory && matchesRegion && matchesPartA;
  });

  // Sort display list (Always sort descending by default, especially relevant for 'latest')
  const displayJobs = [...filteredJobs].sort((a, b) => {
    try {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    } catch (e) {
      return 0;
    }
  });

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedEducation('ทั้งหมด');
    setSelectedCategory('ทั้งหมด');
    setSelectedRegion('ทั้งหมด');
    setSelectedPartA('all');
    setActiveTab('all');
  };

  // Get distinct regions dynamically
  const distinctRegions = Array.from(
    new Set(activeJobs.map(j => j.region || 'ทั่วประเทศ'))
  ).filter(Boolean);

  // Dynamic calculations for agencies based on active jobs list
  const departmentsWithCount = Array.from(new Set(activeJobs.map(j => j.department))).map(dept => {
    return {
      name: dept,
      count: activeJobs.filter(j => j.department === dept).length
    };
  }).sort((a, b) => b.count - a.count);

  return (
    <div className="min-h-screen bg-[#fafbfc] text-slate-800 font-sans selection:bg-blue-600 selection:text-white">
      
      {/* 1. Header Bar with Category Navigation links */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.02)] backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 md:py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Logo Brand using the beautiful JobGovEasy component */}
          <div className="flex items-center gap-3 justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={handleResetFilters}>
              <Logo size={46} />
            </div>
          </div>

          {/* Main Menu Links Navigation row */}
          <nav className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 max-w-full -mx-4 px-4 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden scrollbar-none">
            {[
              { id: 'all', label: 'หน้าหลัก', action: () => { handleResetFilters(); } },
              { id: 'agency', label: 'แยกตามหน่วยงาน', action: () => { setActiveTab('agency'); setTimeout(() => document.getElementById('filters-container')?.scrollIntoView({ behavior: 'smooth' }), 100); } },
              { id: 'latest', label: 'ล่าสุด', action: () => { setActiveTab('latest'); setSelectedPartA('all'); } },
              { id: 'requires_part_a', label: 'ต้องผ่าน ภาค ก', action: () => { setActiveTab('requires_part_a'); setSelectedPartA('requires'); } },
              { id: 'no_part_a', label: 'ไม่ต้องผ่าน ภาค ก', action: () => { setActiveTab('no_part_a'); setSelectedPartA('exempt'); } }
            ].map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  className={`text-xs px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 shadow-xs border border-blue-100/50'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Secure Admin Portal Link */}
          <button
            id="btn-staff-portal"
            onClick={() => router.push('/admin/dashboard')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-950 hover:bg-slate-50 rounded-xl transition border border-slate-100 hover:border-slate-200 self-end lg:self-auto"
          >
            <Lock size={12} className="text-blue-500" />
            <span>เข้าสู่ระบบเจ้าหน้าที่</span>
          </button>
        </div>
      </header>
      
      {/* 2. Hero Section */}
      <section className="bg-slate-950 text-white py-16 md:py-20 relative overflow-hidden">
        {/* Abstract decorative elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(19,112,176,0.15),transparent)] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#fafbfc] to-transparent pointer-events-none"></div>

        <div className="max-w-4xl mx-auto px-4 text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/10">
            <TrendingUp size={12} fill="currentColor" />
            <span>อัปเดตงานสอบแบบเรียลไทม์ ตรวจสอบความถูกต้องอัตโนมัติ</span>
          </div>

          <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white leading-tight font-sans">
            ศูนย์รวมประกาศสมัครงานราชการ <br />
            <span className="bg-gradient-to-r from-blue-400 to-sky-300 bg-clip-text text-transparent">ที่ยังไม่หมดเขตรับสมัคร</span> 🇹🇭
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
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Calendar size={18} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-700">ระบบปกป้องข้อมูลหมดอายุทำงานอยู่</h3>
              <p className="text-[10px] text-slate-400 font-sans">
                คัดกรองเฉพาะหัวข้อที่มีวันปิดรับสมัคร ตั้งแต่ <strong className="text-blue-600 font-bold">{thaiDateInLocale || '...'}</strong> เป็นต้นไป เท่านั้น
              </p>
            </div>
          </div>
          <div className="text-xs font-semibold bg-blue-50 text-blue-800 px-3 py-1.5 rounded-full w-fit">
            พบงานเปิดรับสมัคร {displayJobs.length} ตำแหน่ง
          </div>
        </div>

        {/* Filters Panel Panel */}
        <section id="filters-container" className="bg-white rounded-3xl border border-slate-100 shadow-[0_10px_35px_rgba(0,0,0,0.03)] p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4 flex-wrap gap-2">
            <h3 className="font-bold text-slate-900 text-sm md:text-base flex items-center gap-2">
              <Filter size={16} className="text-slate-400" />
              ระบบสอบหาและคัดกรองงานราชการอัจฉริยะ (Search & Filter)
            </h3>
            {(selectedEducation !== 'ทั้งหมด' || selectedCategory !== 'ทั้งหมด' || searchQuery !== '' || selectedRegion !== 'ทั้งหมด' || selectedPartA !== 'all') && (
              <button
                id="btn-reset-filters"
                onClick={handleResetFilters}
                className="text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1 transition cursor-pointer"
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
                  placeholder="เช่น กรมสรรพากร, บัญชี, วิศวกร..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-xs transition placeholder:text-slate-400 bg-slate-50/20"
                />
              </div>
            </div>

            {/* 2. Region / Province selector */}
            <div className="space-y-2">
              <label htmlFor="region-select" className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                จังหวัด/สถานที่ปฏิบัติงาน
              </label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  id="region-select"
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-xs bg-white text-slate-700 font-medium"
                >
                  <option value="ทั้งหมด">จังหวัด/สถานที่ปฏิบัติงานทั้งหมด</option>
                  {distinctRegions.map((region) => (
                    <option key={region} value={region}>
                      {region}
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
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-xs bg-white text-slate-700 font-medium"
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

          {/* New row for Education Pill Selection & OCSC Part A Choice */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            
            {/* OCSC Part A (ก.พ.) 3-way toggle switch */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                เงื่อนไขการทดสอบ ภาค ก (ก.พ.)
              </label>
              <div className="grid grid-cols-3 gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                {[
                  { id: 'all', label: 'ทั้งหมด' },
                  { id: 'exempt', label: 'ไม่ต้องผ่าน ภาค ก' },
                  { id: 'requires', label: 'ต้องผ่าน ภาค ก' }
                ].map((opt) => {
                  const isSelected = selectedPartA === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setSelectedPartA(opt.id as any);
                        if (opt.id === 'all') {
                          if (activeTab === 'requires_part_a' || activeTab === 'no_part_a') {
                            setActiveTab('all');
                          }
                        } else if (opt.id === 'requires') {
                          setActiveTab('requires_part_a');
                        } else {
                          setActiveTab('no_part_a');
                        }
                      }}
                      className={`py-2 rounded-xl text-xs font-bold text-center cursor-pointer transition ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-xs border border-blue-500'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Clickable Education Selection pills */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                แยกตามวุฒิการศึกษา (ปวช./ปวส./ปริญญาตรี)
              </label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['ทั้งหมด', 'ปวช. / ปวส.', 'ปวช.', 'ปวส.', 'ปริญญาตรี', 'ปริญญาโท', 'ไม่จำกัดวุฒิ'].map((edu) => {
                  const isSelected = selectedEducation === edu;
                  return (
                    <button
                      key={edu}
                      onClick={() => setSelectedEducation(edu)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-100'
                      }`}
                    >
                      {edu === 'ทั้งหมด' ? 'วุฒิทั้งหมด' : edu}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </section>



        {/* Dynamic Agency Grid Panel when activeTab is "agency" */}
        {activeTab === 'agency' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-slate-100 p-6 shadow-[0_10px_35px_rgba(0,0,0,0.015)] space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-xs font-bold text-slate-700 tracking-wider uppercase flex items-center gap-2">
                <Building2 size={14} className="text-blue-600" />
                แยกตามหน่วยงานที่เปิดสอบ ({departmentsWithCount.length} หน่วยงาน)
              </h4>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-[10px] font-bold text-slate-400 hover:text-blue-600 transition"
                >
                  ล้างการเลือก
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
              {departmentsWithCount.map((dept) => {
                const isSelected = searchQuery.toLowerCase() === dept.name.toLowerCase();
                return (
                  <button
                    key={dept.name}
                    onClick={() => setSearchQuery(isSelected ? '' : dept.name)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100'
                    }`}
                  >
                    <span>{dept.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                      isSelected ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {dept.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* 4. Filtered Results Display Grid */}
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <h3 className="font-bold text-slate-800 text-sm md:text-base">
              รายการสอบสมัครงานราชการเปิดรับสมัครอยู่ ({displayJobs.length} ตำแหน่ง)
            </h3>
          </div>

          <AnimatePresence mode="popLayout">
            {loading ? (
              <div id="loading-block" className="py-24 text-center bg-white rounded-3xl border border-slate-100 shadow-xs">
                <RefreshCw size={36} className="animate-spin mx-auto text-blue-600 mb-4" />
                <p className="text-xs font-semibold text-slate-500">กำลังตรวจสอบสารบัตรรวมงานราชการด่วน...</p>
              </div>
            ) : displayJobs.length === 0 ? (
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
              <div id="jobs-grid" className="flex flex-col gap-4">
                {displayJobs.map((job, idx) => {
                  const countdown = getCountdownText(job.application_end_date);
                  return (
                    <Fragment key={job.id}>
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.3, delay: Math.min(idx * 0.04, 1.2) }}
                        onClick={() => router.push(`/jobs/${job.id}`)}
                        className="bg-white border border-slate-100 hover:border-blue-500/20 rounded-3xl p-5 md:p-6 transition-all duration-300 hover:shadow-[0_12px_30px_rgba(19,112,176,0.06)] flex flex-col justify-between group cursor-pointer relative overflow-hidden pl-7 md:pl-8"
                      >
                        {/* Accent color left strip */}
                        <div className="absolute top-0 bottom-0 left-0 w-[4px] bg-slate-100 group-hover:bg-gradient-to-b group-hover:from-blue-600 group-hover:to-sky-500 transition-all duration-300"></div>

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-8 w-full">
                          {/* Left & Middle grouping */}
                          <div className="flex flex-col sm:flex-row items-start gap-4 flex-1 min-w-0">
                            {job.logo_url && (
                              <div className="w-24 h-24 md:w-28 md:h-28 bg-white border border-slate-200/90 rounded-2xl md:rounded-[22px] shadow-sm overflow-hidden flex items-center justify-center p-1 shrink-0 self-start sm:self-center select-none">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={job.logo_url}
                                  alt={job.department}
                                  className="w-full h-full object-contain scale-[1.35] md:scale-[1.4] transition-transform duration-300 group-hover:scale-[1.45]"
                                />
                              </div>
                            )}
                            <div className="space-y-2 flex-1 min-w-0">
                              {/* Badges & Meta */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold tracking-tight border border-blue-100/50">
                                  {job.category || job.requirements?.split('|')?.[2]?.replace('หมวดหมู่:', '')?.trim() || 'ข้าราชการ'}
                                </span>
                                
                                {job.createdAt && isRecentJob(job.createdAt) && (
                                  <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-700 text-[9px] font-bold tracking-wide uppercase border border-orange-200 flex items-center gap-0.5">
                                    <Sparkles size={10} className="text-orange-600 shrink-0" />
                                    ล่าสุด
                                  </span>
                                )}
                                
                                <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-bold border flex items-center gap-1 leading-none ${countdown.className}`}>
                                  {countdown.text}
                                </span>

                                <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 bg-slate-50 border border-slate-100/70 px-2 py-0.5 rounded-md shrink-0 leading-none">
                                  <Eye size={12} className="text-slate-400 shrink-0" />
                                  <span>{job.views !== undefined ? job.views.toLocaleString() : '1'} ครั้ง</span>
                                </span>
                              </div>

                              {/* Position job Title (No truncation now!) */}
                              <h4 className="font-bold text-slate-800 group-hover:text-blue-700 transition duration-155 text-sm md:text-base leading-snug font-sans break-words whitespace-normal">
                                {job.title}
                              </h4>

                              {/* Core Details Spec List (Flex on desktop/screen size, clean flow) */}
                              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-y-2 gap-x-4 text-xs text-slate-500 pt-1">
                                <div className="flex items-center gap-2 shrink-0">
                                  <Building2 size={13} className="text-slate-400 shrink-0" />
                                  <span className="font-semibold text-slate-705">{job.department}</span>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <Calendar size={13} className="text-slate-400 shrink-0" />
                                  <span className="text-slate-600">{job.period}</span>
                                </div>

                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold shrink-0">
                                    วุฒิที่ระบุ
                                  </span>
                                  <span className="text-slate-600 truncate">
                                    {job.education_level || job.requirements?.split('|')?.[0]?.trim() || 'ปริญญาตรีขึ้นไป'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Right grouping - Salary and buttons */}
                          <div className="pt-4 md:pt-0 mt-2 md:mt-0 border-t md:border-t-0 border-slate-50 flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 shrink-0 w-full md:w-auto">
                            {job.total_positions && (
                              <div className="bg-orange-550 bg-gradient-to-r from-orange-500 to-amber-550 text-white font-extrabold px-3 py-1.5 md:py-2 rounded-2xl flex items-center gap-2 shadow-[0_4px_12px_rgba(249,115,22,0.3)] transition-all duration-150 shrink-0 border border-orange-400 select-none">
                                <span className="text-[10px] font-bold tracking-wider text-orange-100">ด่วน! เปิดรับ</span>
                                <span className="text-xl md:text-2xl font-black font-mono leading-none">{job.total_positions}</span>
                                <span className="text-xs font-bold text-orange-100">อัตรา</span>
                              </div>
                            )}

                            <div className="flex items-center gap-1.5 text-slate-700 text-xs font-semibold">
                              <CircleDollarSign size={15} className="text-blue-600 shrink-0" />
                              <span className="text-slate-900 font-bold md:text-sm">{job.salary}</span>
                            </div>

                            <span className="text-blue-600 font-bold text-xs flex items-center gap-1 group-hover:translate-x-1.5 transition-all bg-blue-50/60 group-hover:bg-blue-50 px-4 py-2 rounded-xl">
                              อ่านต่อและแชร์
                              <ArrowRight size={14} />
                            </span>
                          </div>
                        </div>
                      </motion.div>


                    </Fragment>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </section>

      </main>

      {/* 5. Elegant Footer */}
      <footer className="py-16 border-t border-slate-100 bg-white mt-24 text-center text-slate-400 text-xs shadow-[0_-2px_15px_-4px_rgba(0,0,0,0.015)]">
        <div className="max-w-4xl mx-auto px-4 space-y-4 flex flex-col items-center">
          <Logo size={40} showText={true} className="mb-2" />
          <p className="font-semibold text-slate-600 font-sans">เว็บบอร์ดปฏิทินข่าวสารการสอบแข่งขัน เพื่อการเตรียมตัวสอบราชการอย่างง่ายดาย</p>
          <p className="text-[10px] font-mono tracking-widest text-slate-400">ALL DATA SECURED & VERIFIED • JobGovEasy © 2026</p>
        </div>
      </footer>

    </div>
  );
}
