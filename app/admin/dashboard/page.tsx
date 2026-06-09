'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Briefcase,
  Building2,
  Calendar,
  CircleDollarSign,
  GraduationCap,
  MapPin,
  Plus,
  Search,
  Trash2,
  Edit,
  LogOut,
  Sparkles,
  AlertTriangle,
  X,
  ExternalLink,
  Shield,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileDown,
  UploadCloud,
  Image as ImageIcon
} from 'lucide-react';
import Link from 'next/link';

interface JobItem {
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

  // Raw Supabase fields
  category?: string;
  education_level?: string;
  region?: string;
  application_start_date?: string;
  application_end_date?: string;
  source_url?: string;
  logo_url?: string;
  pdf_url?: string;
}

function formatThaiDate(dateString: string): string {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = d.getDate();
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const month = months[d.getMonth()];
    const year = d.getFullYear() + 543;
    return `${day} ${month} ${year}`;
  } catch (e) {
    return dateString;
  }
}

export default function AdminDashboard() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [adminUser, setAdminUser] = useState<any>(null);

  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSupabase, setIsSupabase] = useState(false);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Editing state
  const [editingJob, setEditingJob] = useState<JobItem | null>(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [logoUploadProgress, setLogoUploadProgress] = useState(0);
  const [pdfUploadProgress, setPdfUploadProgress] = useState(0);
  const [dragActiveLogo, setDragActiveLogo] = useState(false);
  const [dragActivePdf, setDragActivePdf] = useState(false);

  // Custom premium non-blocking dialog confirmation states
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<{ id: string; title: string } | null>(null);

  // Authenticate Admin Session
  useEffect(() => {
    async function verifySession() {
      try {
        const localToken = typeof window !== 'undefined' ? localStorage.getItem('admin_session_token') || '' : '';
        const headers: HeadersInit = {};
        if (localToken) {
          headers['Authorization'] = `Bearer ${localToken}`;
        }
        const res = await fetch('/api/admin/auth/status', { headers });
        const data = await res.json();
        if (!data.authenticated) {
          router.replace('/admin/login');
        } else {
          setAdminUser(data.user);
          setCheckingAuth(false);
        }
      } catch (err) {
        router.replace('/admin/login');
      }
    }
    verifySession();
  }, [router]);

  // Fetch Jobs List with retry support
  const fetchJobsList = async (retryCount = 3, delayMs = 1500) => {
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
        setIsSupabase(data.isSupabase || false);
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
        await fetchJobsList(retryCount - 1, delayMs * 1.5);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!checkingAuth) {
      fetchJobsList();
      fetch('/api/admin/db-test')
        .then(res => res.json())
        .then(data => setDbStatus(data))
        .catch(err => console.error('DB Status load failed:', err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkingAuth]);

  // Handle Logout (delegated to custom modal)
  const executeLogout = async () => {
    try {
      await fetch('/api/admin/auth', { method: 'DELETE' });
      localStorage.removeItem('admin_session_token');
      router.replace('/');
    } catch (err) {
      console.error('Log out failed:', err);
    }
  };

  // Handle Delete (delegated to custom modal)
  const executeDeleteJob = async () => {
    if (!jobToDelete) return;
    const { id } = jobToDelete;
    try {
      const localToken = typeof window !== 'undefined' ? localStorage.getItem('admin_session_token') || '' : '';
      const headers: HeadersInit = {};
      if (localToken) {
        headers['Authorization'] = `Bearer ${localToken}`;
      }

      const res = await fetch(`/api/jobs/${id}`, {
        method: 'DELETE',
        headers
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showFeedback('success', '🗑️ ลบประกาศสำเร็จเรียบร้อย');
        setJobs(prev => prev.filter(j => j.id !== id));
      } else {
        throw new Error(data.error || 'ลบประกาศไม่สำเร็จ');
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'ลบข้อมูลขัดข้องทางเทคนิค');
    } finally {
      setJobToDelete(null);
    }
  };

  // Open Edit Form Modal
  const handleOpenEdit = (job: JobItem) => {
    // Fill up Supabase raw properties if undefined by matching structures
    setEditingJob({
      ...job,
      category: job.category || 'ข้าราชการ',
      education_level: job.education_level || job.requirements?.split('|')[0]?.trim() || 'ปริญญาตรี',
      region: job.region || job.requirements?.split('|')[1]?.replace('พื้นที่:', '')?.trim() || 'กรุงเทพมหานคร',
      application_start_date: job.application_start_date || '',
      application_end_date: job.application_end_date || '',
      logo_url: job.logo_url || '',
      pdf_url: job.pdf_url || ''
    });
  };

  // Handle Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob) return;

    try {
      setSubmittingEdit(true);
      const localToken = typeof window !== 'undefined' ? localStorage.getItem('admin_session_token') || '' : '';
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (localToken) {
        headers['Authorization'] = `Bearer ${localToken}`;
      }

      const res = await fetch(`/api/jobs/${editingJob.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          title: editingJob.title,
          department: editingJob.department,
          salary: editingJob.salary,
          category: editingJob.category,
          education_level: editingJob.education_level,
          region: editingJob.region,
          application_start_date: editingJob.application_start_date || null,
          application_end_date: editingJob.application_end_date || null,
          source_url: editingJob.officialUrl || editingJob.source_url || '',
          content: editingJob.description,
          logo_url: editingJob.logo_url || null,
          pdf_url: editingJob.pdf_url || null
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'แก้ไขประกาศมีข้อผิดพลาด');
      }

      showFeedback('success', 'แก้ไขข้อมูลงานราชการสำเร็จระนาบเดียวกันแล้ว');
      setEditingJob(null);
      fetchJobsList(); // Reload feed
    } catch (err: any) {
      showFeedback('error', err.message || 'บันทึกแก้ไขไม่สำเร็จ');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const uploadFileWithProgressEdit = async (file: File, isPdf: boolean) => {
    if (!editingJob) return;

    if (isPdf) {
      if (file.type !== 'application/pdf') {
        alert('กรุณาอัปโหลดเฉพาะไฟล์ PDF เท่านั้น');
        return;
      }
      setUploadingPdf(true);
      setPdfUploadProgress(5);
    } else {
      if (!file.type.startsWith('image/')) {
        alert('กรุณาอัปโหลดไฟล์รูปภาพที่ถูกต้อง');
        return;
      }
      setUploadingLogo(true);
      setLogoUploadProgress(5);
    }

    let progress = 5;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 5;
      if (progress > 93) progress = 93;
      if (isPdf) {
        setPdfUploadProgress(progress);
      } else {
        setLogoUploadProgress(progress);
      }
    }, 120);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', isPdf ? 'pdfs' : 'logos');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'อัปโหลดล้มเหลว');
      }

      clearInterval(interval);
      if (isPdf) {
        setPdfUploadProgress(100);
        setEditingJob({ ...editingJob, pdf_url: data.url });
        setTimeout(() => setPdfUploadProgress(0), 800);
      } else {
        setLogoUploadProgress(100);
        setEditingJob({ ...editingJob, logo_url: data.url });
        setTimeout(() => setLogoUploadProgress(0), 800);
      }
    } catch (err: any) {
      clearInterval(interval);
      if (isPdf) {
        setPdfUploadProgress(0);
      } else {
        setLogoUploadProgress(0);
      }
      alert(`ไม่สามารถอัปโหลดไฟล์ได้: ${err.message}`);
    } finally {
      if (isPdf) {
        setUploadingPdf(false);
      } else {
        setUploadingLogo(false);
      }
    }
  };

  const handleUploadFileEdit = async (e: React.ChangeEvent<HTMLInputElement>, isPdf: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFileWithProgressEdit(file, isPdf);
    }
  };

  const handleDragOverEdit = (e: React.DragEvent, isPdf: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPdf) {
      setDragActivePdf(true);
    } else {
      setDragActiveLogo(true);
    }
  };

  const handleDragLeaveEdit = (e: React.DragEvent, isPdf: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPdf) {
      setDragActivePdf(false);
    } else {
      setDragActiveLogo(false);
    }
  };

  const handleDropEdit = async (e: React.DragEvent, isPdf: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPdf) {
      setDragActivePdf(false);
    } else {
      setDragActiveLogo(false);
    }
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      await uploadFileWithProgressEdit(file, isPdf);
    }
  };

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  // Filter List based on Search Query
  const filteredJobs = jobs.filter(job =>
    job.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
        <Loader2 size={36} className="animate-spin text-slate-800 mb-4" />
        <p className="text-slate-500 text-sm font-medium">กำลังยืนยันความปลอดภัยข้อมูล...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header controls bar */}
      <header className="bg-white border-b border-slate-100 shadow-xs sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 text-white rounded-xl shadow-md">
              <Shield size={18} className="text-emerald-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-800">แผงควบคุมผู้ดูแลระบบ</h1>
              <p className="text-[10px] text-slate-400 font-mono">SUPABASE DREBOARD CONTROL</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden md:inline-block text-xs font-medium text-slate-500 font-mono bg-slate-100 px-3 py-1 rounded-full">
              {adminUser?.email}
            </span>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="p-2 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-xl transition-all flex items-center gap-2 group text-xs font-semibold border border-transparent hover:border-rose-100"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-10 flex-1 w-full space-y-6">
        {/* Welcome Block */}
        <section className="bg-slate-950 text-white p-6 md:p-8 rounded-3xl relative overflow-hidden shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.1),transparent)] pointer-events-none"></div>
          <div>
            <div className="flex items-center gap-2 mb-2 text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full w-fit text-xs font-mono">
              <Sparkles size={14} />
              <span>ก.พ. Live Feed Database Connected</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold">ยินดีต้อนรับแอดมิน, จัดการปฏิทินงานราชการ</h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              สามารถแก้ไขข้อมูลที่บันทึกไว้ คุมนโยบายความเข้ากันได้ และป้อนข้อมูลประกาศใหม่ที่ได้รับแจ้งมาอย่างรวดเร็ว
            </p>
          </div>

          <Link
            id="btn-add-new-job"
            href="/admin/new-job"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm transition-all shadow-md hover:shadow-lg active:scale-95 shrink-0"
          >
            <Plus size={16} />
            เพิ่มประกาศงานใหม่
          </Link>
        </section>

        {/* Supabase status check banner */}
        <div className="space-y-3">
          <div className={`p-4 rounded-2xl text-xs flex items-center justify-between border ${
            isSupabase && (!dbStatus || dbStatus.success)
              ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
              : 'bg-amber-50 border-amber-100 text-amber-900'
          }`}>
            <div className="flex items-center gap-2.5">
              {isSupabase && (!dbStatus || dbStatus.success) ? (
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              ) : (
                <AlertTriangle size={16} className="text-amber-500 shrink-0" />
              )}
              <span>
                <strong>สถานะหน่วยจัดเก็บ:</strong>{' '}
                {isSupabase && (!dbStatus || dbStatus.success)
                  ? 'ตาราง jobs ในฐานข้อมูล Supabase ทำงานได้ปกติ ปรากฏคอลัมน์ครบถ้วนแชริ่งลงเว็บใช้งานจริงถาวรแล้ว'
                  : dbStatus?.schema?.error
                    ? `ตาราง "jobs" ใน Supabase ขาดบางคอลัมน์และอาจส่งผลให้เซฟงานไม่สำเร็จ: ${dbStatus.schema.error}`
                    : 'กำลังใช้ระบบสำรองข้อมูลในหน่วยความจำชั่วคราว (กรุณากรอกข้อมูล Supabase คีย์ และติดตั้ง SQL ให้ถูกต้องเพื่อให้ใช้ได้ถาวร)'}
              </span>
            </div>
            {(!isSupabase || (dbStatus && !dbStatus.success)) && (
              <span className="font-mono text-[10px] bg-amber-100 text-amber-850 px-2 py-0.5 rounded font-bold">SQL SCHEMA REQ</span>
            )}
          </div>

          {dbStatus && !dbStatus.success && dbStatus.advice?.length > 0 && (
            <div className="bg-amber-50/70 border border-amber-200/60 p-5 rounded-2xl space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-amber-850 font-bold text-xs uppercase tracking-wide">
                <AlertCircle size={16} className="text-amber-600" />
                <span>คำแนะนำการแก้ไขโครงสร้างคอลัมน์ที่ไม่สอดคล้องกัน (เช่น ฟิลด์ &quot;department&quot;) เพื่อกู้คืนระบบบันทึกถาวร:</span>
              </div>
              {dbStatus.advice.map((adviceText: string, idx: number) => (
                <div key={idx} className="text-xs text-slate-800 space-y-2 whitespace-pre-wrap leading-relaxed bg-white border border-amber-150 p-4 rounded-xl shadow-xs font-mono select-all select-text">
                  {adviceText}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Feed Notification feedback */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`p-4 rounded-2xl text-sm flex items-start gap-3 border ${
                feedback.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
              )}
              <span className="font-medium leading-normal">{feedback.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Secondary Navigation Search Row */}
        <section className="bg-white rounded-3xl border border-slate-100 shadow-xs p-6 flex flex-col md:flex-row gap-4 justify-between items-center">
          <h3 className="font-bold text-slate-800 text-sm md:text-base shrink-0 flex items-center gap-2">
            <Briefcase size={16} className="text-slate-400" />
            รายการสารบัตรรวมทั้งหมด ({filteredJobs.length} ฉบับ)
          </h3>

          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="พิมพ์ชื่อค้นหา ตำแหน่ง หรือ หน่วยงาน..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-red-500 text-xs transition-all placeholder:text-slate-400"
            />
          </div>
        </section>

        {/* Jobs tabular/list container */}
        <section className="relative">
          {loading ? (
            <div className="py-24 text-center bg-white rounded-3xl border border-slate-100">
              <Loader2 size={36} className="animate-spin mx-auto text-slate-800 mb-4" />
              <p className="text-xs font-semibold text-slate-500">กำลังประมวลตารางงานระบบ...</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-16 text-center text-slate-500">
              <AlertCircle size={32} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-semibold">ไม่พบเอกสารงานราชการ</p>
              <p className="text-xs text-slate-400 mt-1">แอดมินสามารถกด &quot;เพิ่มประกาศงานใหม่&quot; หรือสกัดผ่านเครื่องมือขูดข่าวด่วนหน้าหลักได้ทันที</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white border border-slate-100 rounded-3xl p-5 md:p-6 shadow-subtle hover:shadow-md transition flex flex-col md:flex-row justify-between md:items-center gap-4 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[10px] font-bold">
                        {job.category || job.requirements?.split('|')?.[2]?.replace('หมวดหมู่:', '')?.trim() || 'ข้าราชการ'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">• {formatThaiDate(job.createdAt || '') || 'เพิ่งสร้าง'}</span>
                    </div>

                    <h4 className="font-bold text-slate-800 text-sm md:text-base leading-snug">
                      {job.title}
                    </h4>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Building2 size={13} className="text-slate-400" />
                        {job.department}
                      </span>
                      <span className="flex items-center gap-1">
                        <CircleDollarSign size={13} className="text-slate-400" />
                        {job.salary}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border-t md:border-t-0 pt-4 md:pt-0 shrink-0 justify-end">
                    <a
                      href={job.officialUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-700 rounded-xl transition border border-slate-100"
                      title="เปิดลิงก์สมัครจริง"
                    >
                      <ExternalLink size={16} />
                    </a>
                    
                    <button
                      onClick={() => handleOpenEdit(job)}
                      className="p-2 bg-slate-50 hover:bg-slate-900 hover:text-white text-slate-700 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold"
                    >
                      <Edit size={14} />
                      <span>แก้ไข</span>
                    </button>

                    <button
                      onClick={() => setJobToDelete({ id: job.id, title: job.title })}
                      className="p-2 hover:bg-rose-50 border border-transparent hover:border-rose-100 text-slate-400 hover:text-rose-600 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold"
                    >
                      <Trash2 size={14} />
                      <span>ลบ</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Editing dialog modal sheet */}
      <AnimatePresence>
        {editingJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-3xl w-full max-h-[90vh] overflow-y-auto flex flex-col"
            >
              {/* Modal header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-slate-900 text-white rounded-xl">
                    <Edit size={16} className="text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm md:text-base">แก้ไขประกาศระแบบปฏิทินงาน</h3>
                    <p className="text-[10px] text-slate-400 uppercase font-mono">EDIT ACTIVE GOV APPLICANT</p>
                  </div>
                </div>

                <button
                  onClick={() => setEditingJob(null)}
                  className="p-1 px-2 hover:bg-slate-50 text-slate-400 hover:text-slate-800 rounded-lg transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal content Form */}
              <form onSubmit={handleSaveEdit} className="p-6 md:p-8 space-y-6 flex-1">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">ชื่อประกาศรับสมัคร *</label>
                    <input
                      type="text"
                      required
                      value={editingJob.title}
                      onChange={(e) => setEditingJob({ ...editingJob, title: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">หน่วยงาน *</label>
                      <input
                        type="text"
                        required
                        value={editingJob.department}
                        onChange={(e) => setEditingJob({ ...editingJob, department: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">อัตราเงินเดือน *</label>
                      <input
                        type="text"
                        required
                        value={editingJob.salary}
                        onChange={(e) => setEditingJob({ ...editingJob, salary: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">หมวดหมู่งาน</label>
                      <select
                        value={editingJob.category}
                        onChange={(e) => setEditingJob({ ...editingJob, category: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm"
                      >
                        <option value="ข้าราชการ">ข้าราชการ</option>
                        <option value="พนักงานราชการ">พนักงานราชการ</option>
                        <option value="ลูกจ้าง">ลูกจ้าง</option>
                        <option value="รัฐวิสาหกิจ">รัฐวิสาหกิจ</option>
                        <option value="ราชการส่วนท้องถิ่น">ราชการส่วนท้องถิ่น</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">ระดับวุฒิการศึกษา</label>
                      <select
                        value={editingJob.education_level}
                        onChange={(e) => setEditingJob({ ...editingJob, education_level: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm"
                      >
                        <option value="ปวช. / ปวส.">ปวช. / ปวส.</option>
                        <option value="ปริญญาตรี">ปริญญาตรี</option>
                        <option value="ปริญญาโท">ปริญญาโท</option>
                        <option value="ปริญญาเอก">ปริญญาเอก</option>
                        <option value="ไม่จำกัดวุฒิ">ไม่จำกัดวุฒิ</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">ภูมิภาค/พื้นที่ปฏิบัติงาน</label>
                      <input
                        type="text"
                        value={editingJob.region}
                        onChange={(e) => setEditingJob({ ...editingJob, region: e.target.value })}
                        placeholder="เช่น กรุงเทพมหานคร, ทั่วประเทศ"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">วันเริ่มเปิดรับสมัคร</label>
                      <input
                        type="date"
                        value={editingJob.application_start_date ? editingJob.application_start_date.split('T')[0] : ''}
                        onChange={(e) => setEditingJob({ ...editingJob, application_start_date: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-7500 uppercase mb-1.5">วันสิ้นสุดการรับสมัคร</label>
                      <input
                        type="date"
                        value={editingJob.application_end_date ? editingJob.application_end_date.split('T')[0] : ''}
                        onChange={(e) => setEditingJob({ ...editingJob, application_end_date: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">ลิงก์ต้นทางสมัครสอบ (ก.พ.)</label>
                    <input
                      type="url"
                      value={editingJob.officialUrl || editingJob.source_url}
                      onChange={(e) => setEditingJob({ ...editingJob, officialUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm"
                    />
                  </div>

                  {/* File Uploads Section (ตราสัญลักษณ์หน่วยงาน & ไฟล์ PDF ประกาศ) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    
                    {/* Logo Edit */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center justify-between">
                        <span>ตราสัญลักษณ์หน่วยงาน (Logo)</span>
                        {uploadingLogo && <span className="text-[10px] text-emerald-600 font-semibold animate-pulse">กำลังอัปโหลด...</span>}
                      </label>
                      {editingJob.logo_url ? (
                        <div className="relative border border-slate-200 bg-white p-2.5 rounded-xl flex items-center gap-2 flex-wrap shadow-xs">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={editingJob.logo_url}
                            alt="Agency Logo"
                            className="w-10 h-10 object-contain bg-slate-50 p-1 rounded-lg border border-slate-100 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 size={10} /> อัปโหลดสำเร็จ
                            </p>
                            <span className="text-[9px] text-slate-400 break-all truncate block">{editingJob.logo_url}</span>
                            <button
                              type="button"
                              onClick={() => setEditingJob({ ...editingJob, logo_url: '' })}
                              className="text-[10px] text-rose-500 font-bold hover:underline flex items-center gap-0.5 mt-1"
                            >
                              <Trash2 size={9} /> ลบออก
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          onDragOver={(e) => handleDragOverEdit(e, false)}
                          onDragLeave={(e) => handleDragLeaveEdit(e, false)}
                          onDrop={(e) => handleDropEdit(e, false)}
                          className={`relative border border-dashed transition-all duration-200 rounded-xl p-3 text-center cursor-pointer ${
                            dragActiveLogo 
                              ? "border-emerald-500 bg-emerald-50/20 shadow-xs scale-[1.01]" 
                              : "border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/5"
                          }`}
                        >
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleUploadFileEdit(e, false)}
                            disabled={uploadingLogo}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <div className="space-y-0.5">
                            {uploadingLogo ? (
                              <div className="flex flex-col items-center gap-1 py-1">
                                <Loader2 size={16} className="animate-spin text-emerald-500" />
                                <span className="text-[10px] text-slate-500">อัปโหลด... {logoUploadProgress}%</span>
                                <div className="w-full max-w-[100px] bg-slate-100 rounded-full h-1 overflow-hidden mt-0.5">
                                  <div 
                                    className="bg-emerald-500 h-full rounded-full transition-all duration-150"
                                    style={{ width: `${logoUploadProgress}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <>
                                <ImageIcon size={18} className="text-slate-400 mx-auto" />
                                <p className="text-[11px] font-semibold text-slate-700">ลากรูปภาพมาวาง หรือคลิกอัปโหลด</p>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* PDF Edit */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center justify-between">
                        <span>ไฟล์ PDF ประกาศฉบับเต็ม</span>
                        {uploadingPdf && <span className="text-[10px] text-emerald-600 font-semibold animate-pulse">กำลังอัปโหลด...</span>}
                      </label>
                      {editingJob.pdf_url ? (
                        <div className="relative border border-slate-200 bg-white p-2.5 rounded-xl flex items-center gap-2 flex-wrap shadow-xs">
                          <div className="p-1 rounded bg-red-50 text-red-600 shrink-0">
                            <FileDown size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 size={10} /> อัปโหลดสำเร็จ
                            </p>
                            <span className="text-[9px] text-slate-400 break-all truncate block">{editingJob.pdf_url}</span>
                            <button
                              type="button"
                              onClick={() => setEditingJob({ ...editingJob, pdf_url: '' })}
                              className="text-[10px] text-rose-500 font-bold hover:underline flex items-center gap-0.5 mt-1"
                            >
                              <Trash2 size={9} /> ลบออก
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          onDragOver={(e) => handleDragOverEdit(e, true)}
                          onDragLeave={(e) => handleDragLeaveEdit(e, true)}
                          onDrop={(e) => handleDropEdit(e, true)}
                          className={`relative border border-dashed transition-all duration-200 rounded-xl p-3 text-center cursor-pointer ${
                            dragActivePdf 
                              ? "border-emerald-500 bg-emerald-50/20 shadow-xs scale-[1.01]" 
                              : "border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/5"
                          }`}
                        >
                          <input
                            type="file"
                            accept="application/pdf"
                            onChange={(e) => handleUploadFileEdit(e, true)}
                            disabled={uploadingPdf}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <div className="space-y-0.5">
                            {uploadingPdf ? (
                              <div className="flex flex-col items-center gap-1 py-1">
                                <Loader2 size={16} className="animate-spin text-emerald-500" />
                                <span className="text-[10px] text-slate-500">อัปโหลด... {pdfUploadProgress}%</span>
                                <div className="w-full max-w-[100px] bg-slate-100 rounded-full h-1 overflow-hidden mt-0.5">
                                  <div 
                                    className="bg-emerald-500 h-full rounded-full transition-all duration-150"
                                    style={{ width: `${pdfUploadProgress}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <>
                                <UploadCloud size={18} className="text-slate-400 mx-auto" />
                                <p className="text-[11px] font-semibold text-slate-700">ลากไฟล์ PDF มาวาง หรือคลิกอัปโหลด</p>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">รายละเอียดคุณสมบัติเพิ่มเติม (รองรับ Markdown)</label>
                    <textarea
                      rows={6}
                      value={editingJob.description}
                      onChange={(e) => setEditingJob({ ...editingJob, description: e.target.value })}
                      placeholder="ระบุคุณสมบัติ รายละเอียดเนื้อหาประกาศงาน และช่องทางการสมัครเพิ่มเติม..."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm font-sans"
                    ></textarea>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3 sticky bottom-0 bg-white">
                  <button
                    type="button"
                    onClick={() => setEditingJob(null)}
                    className="px-5 py-2.5 rounded-xl hover:bg-slate-100 text-slate-500 text-xs font-semibold"
                  >
                    ยกเลิก
                  </button>
                  <button
                    id="btn-admin-edit-submit"
                    type="submit"
                    disabled={submittingEdit || uploadingLogo || uploadingPdf}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-900 hover:bg-slate-800 disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center gap-2"
                  >
                    {submittingEdit ? (
                      <>
                        <Loader2 className="animate-spin text-emerald-400" size={14} />
                        <span>กำลังอัปเดตข้อมูล...</span>
                      </>
                    ) : uploadingLogo || uploadingPdf ? (
                      <>
                        <Loader2 className="animate-spin text-emerald-400" size={14} />
                        <span>กำลังอัปโหลดไฟล์...</span>
                      </>
                    ) : (
                      'บันทึกการแก้ไข'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Custom Logout Confirmation Modal */}
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-sm w-full p-6 text-center"
            >
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-rose-50 text-rose-600 mb-4">
                <LogOut size={22} />
              </div>
              <h3 className="text-base font-bold text-slate-950 mb-2">คุณต้องการออกจากระบบใช่หรือไม่?</h3>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                ระบบจะลบข้อมูลเซสชันความปลอดภัยของคุณ หากต้องการใช้งานหน้าควบคุมนี้อีกจะต้องลงชื่อเข้าสู่ระบบใหม่
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="w-1/2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 text-xs transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={executeLogout}
                  className="w-1/2 px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-colors"
                >
                  ใช่, ออกจากระบบ
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Custom Delete Confirmation Modal */}
        {jobToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6"
            >
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-50 text-amber-600 mb-4">
                <AlertTriangle size={22} />
              </div>
              <h3 className="text-base font-bold text-slate-950 text-center mb-1">คุณต้องการลบประกาศงานนี้?</h3>
              <p className="text-xs text-slate-500 text-center mb-5 leading-relaxed">
                การดำเนินการนี้ไม่สามารถย้อนกลับได้ ระบบจะลบรายการ <span className="font-semibold text-slate-800">{jobToDelete.title}</span> ออกจากคลังข้อมูลถาวร
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setJobToDelete(null)}
                  className="w-1/2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 text-xs transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={executeDeleteJob}
                  className="w-1/2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/15 transition-colors"
                >
                  ใช่, ลบประกาศออก
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
