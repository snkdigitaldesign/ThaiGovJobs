'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import {
  Shield,
  Briefcase,
  Building2,
  Calendar,
  CircleDollarSign,
  GraduationCap,
  MapPin,
  ArrowLeft,
  Loader2,
  PlusCircle,
  FileText,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

export default function NewJobFormPage() {
  const router = useRouter();

  // Authentication checkpoints
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dbStatus, setDbStatus] = useState<any>(null);
  
  // Feedback
  const [errorOnSubmit, setErrorOnSubmit] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Fields State (Adhering to requested specs)
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [salary, setSalary] = useState('');
  const [officialUrl, setOfficialUrl] = useState(''); // source_url (ก.พ. ต้นทาง)
  
  const [category, setCategory] = useState('ข้าราชการ'); // ข้าราชการ/พนักงานราชการ/ลูกจ้าง/รัฐวิสาหกิจ
  const [educationLevel, setEducationLevel] = useState('ปริญญาตรี');
  const [region, setRegion] = useState('กรุงเทพมหานคร');
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [description, setDescription] = useState(''); // Textarea Markdown

  // Check auth status
  useEffect(() => {
    async function checkAuth() {
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
          setCheckingAuth(false);
          // Fetch database status diagnostic
          fetch('/api/admin/db-test')
            .then(r => r.json())
            .then(dbData => setDbStatus(dbData))
            .catch(err => console.error('Failed to load db status in new-job:', err));
        }
      } catch (err) {
        router.replace('/admin/login');
      }
    }
    checkAuth();
  }, [router]);

  // Handle submit and insert into Supabase jobs table
  const handleSubmitNewJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !department || !salary) {
      setErrorOnSubmit('กรุณากรอกข้อมูลสำคัญที่มีสัญลักษณ์ (*) ให้ครบถ้วน');
      return;
    }

    try {
      setSubmitting(true);
      setErrorOnSubmit(null);
      setSuccessMsg(null);

      const localToken = typeof window !== 'undefined' ? localStorage.getItem('admin_session_token') || '' : '';
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (localToken) {
        headers['Authorization'] = `Bearer ${localToken}`;
      }

      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title,
          department,
          salary,
          officialUrl,
          category,
          education_level: educationLevel,
          region,
          application_start_date: startDate || null,
          application_end_date: endDate || null,
          description // Markdown content
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'บันทึกประกาศงานไม่สำเร็จ');
      }

      const persisted = data.persistedInDb;
      if (persisted) {
        setSuccessMsg('✨ บันทึกประกาศงานราชการลงกองข้อมูล Supabase สำเร็จเรียบร้อยแล้วถาวร!');
      } else {
        setSuccessMsg('⚠️ บันทึกสำเร็จเสมือน (ลงหน่วยความจำชั่วคราว) เท่านั้น เนื่องจากตาราง Supabase ของท่านมีปัญหา/ขาดช่องคอลัมน์ "department" กรุณาไปแก้ไขโครงสร้างดีบีบนบอร์ดของท่านเพื่อให้คงอยู่ถาวร');
      }
      
      // Clear form inputs
      setTitle('');
      setDepartment('');
      setSalary('');
      setOfficialUrl('');
      setDescription('');
      
      // Transition back after delay (longer if fell back to memory so they can read the warning)
      setTimeout(() => {
        router.push('/admin/dashboard');
      }, persisted ? 2000 : 5000);

    } catch (err: any) {
      setErrorOnSubmit(err.message || 'บันทึกข้อมูลล้มเหลว กรุณาตรวจสอบสิทธิ์และฐานข้อมูลอีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
        <Loader2 size={36} className="animate-spin text-slate-800 mb-4" />
        <p className="text-slate-500 text-sm font-medium">กำลังยืนยันบัญชีแอดมินพิจารณา...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-3xl mx-auto px-4">
        {/* Navigation back to dashboard row */}
        <div className="mb-6">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft size={14} />
            กลับไปที่แดชบอร์ด
          </Link>
        </div>

        {/* Header form section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-slate-900 text-white rounded-xl">
              <PlusCircle size={18} className="text-emerald-400" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">เขียนบันทึกประกาศรับสมัครใหม่</h2>
          </div>
          <p className="text-xs text-slate-400 font-mono">CREATE MANUALLY IN SUPABASE JOBS TABLE</p>
        </div>

        {dbStatus && !dbStatus.success && (
          <div className="mb-6 bg-amber-50 border border-amber-200/60 p-4 rounded-2xl text-xs text-slate-800 space-y-2 shadow-xs">
            <div className="flex items-center gap-2 text-amber-850 font-bold">
              <AlertCircle size={15} className="text-amber-600 shrink-0" />
              <span>ตรวจพบโครงสร้างตารางในฐานข้อมูล Supabase ไม่สมบูรณ์:</span>
            </div>
            <p className="leading-relaxed font-sans">
              ตารางระบบหลัก <code>jobs</code> ของคุณมีการขาดคอลัมน์ที่จำเป็น (เช่น <code>department</code>) บันทึกใดๆ ที่ป้อนเข้ามาในช่วงเวลานี้จะถูกจัดเก็บไว้ใน <strong className="text-amber-900">หน่วยความจำสำรองแทนชั่วคราวเท่านั้น</strong> 
              เราแนะนำให้กลับไปจัดการแก้ไขเรื่องโครงสร้างตาราง DB ในหน้าหลักของควบคุมแผงผู้ดูแลระบบเสียก่อน
            </p>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 md:p-8"
        >
          <form onSubmit={handleSubmitNewJob} className="space-y-6">
            
            {/* 1. Title Input */}
            <div>
              <label htmlFor="job-title" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                ชื่อประกาศงานรับสมัครสอบ *
              </label>
              <input
                id="job-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น รับสมัครสอบแข่งขันเพื่อบรรจุและแต่งตั้งเข้ารับราชการ ตำแหน่ง..."
                className="w-full px-4 py-3 rounded-xl border border-slate-250 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm placeholder:text-slate-400 bg-slate-50/20"
                disabled={submitting}
              />
            </div>

            {/* 2. Department & Salary inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  หน่วยงานผู้จัดสอบ *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="เช่น กรมสรรพากร"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm placeholder:text-slate-400"
                    disabled={submitting}
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Building2 size={16} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  อัตราเงินเดือนเริ่มต้น *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    placeholder="เช่น 15,000 - 16,500 บาท"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm placeholder:text-slate-400"
                    disabled={submitting}
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <CircleDollarSign size={16} />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Category, Education, and Region selectors */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  หมวดหมู่งาน
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm bg-white"
                  disabled={submitting}
                >
                  <option value="ข้าราชการ">ข้าราชการ</option>
                  <option value="พนักงานราชการ">พนักงานราชการ</option>
                  <option value="ลูกจ้าง">ลูกจ้าง</option>
                  <option value="รัฐวิสาหกิจ">รัฐวิสาหกิจ</option>
                  <option value="ราชการส่วนท้องถิ่น">ราชการส่วนท้องถิ่น</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  วุฒิการศึกษาที่กำหนด
                </label>
                <div className="relative">
                  <select
                    value={educationLevel}
                    onChange={(e) => setEducationLevel(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm bg-white appearance-none"
                    disabled={submitting}
                  >
                    <option value="มัธยมศึกษาตอนปลาย">มัธยมศึกษาตอนปลาย</option>
                    <option value="ปวช. / ปวส.">ปวช. / ปวส. / อนุปริญญา</option>
                    <option value="ปริญญาตรี">ปริญญาตรี</option>
                    <option value="ปริญญาโท">ปริญญาโท</option>
                    <option value="ปริญญาเอก">ปริญญาเอก</option>
                    <option value="ไม่จำกัดวุฒิ">ไม่จำกัดวุฒิการศึกษา</option>
                  </select>
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <GraduationCap size={16} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  ภูมิภาค/พื้นที่ปฏิบัติงาน
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="เช่น กรุงเทพมหานคร"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm placeholder:text-slate-400"
                    disabled={submitting}
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <MapPin size={16} />
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Calendar date selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  วันเริ่มรับสมัครออนไลน์
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm text-slate-700 bg-white"
                    disabled={submitting}
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Calendar size={16} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  วันสิ้นสุดปิดรับสมัคร
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm text-slate-700 bg-white"
                    disabled={submitting}
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Calendar size={16} />
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Official URL Links */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                ลิงก์หน้าประกาศเว็บสมัครงานตัวจริง (ก.พ. หรือต้นสังกัด)
              </label>
              <input
                type="url"
                value={officialUrl}
                onChange={(e) => setOfficialUrl(e.target.value)}
                placeholder="เช่น https://job.ocsc.go.th/Jobs/..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm placeholder:text-slate-400"
                disabled={submitting}
              />
            </div>

            {/* 6. Content description textarea */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                รายละเอียดคุณสมบัติเกณฑ์คัดเลือกเพิ่มเติม (Markdown หรือข้อความยาว)
              </label>
              <div className="relative">
                <textarea
                  rows={8}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="พิมพ์รายละเอียดเพิ่มเติมตรงนี้ สามารถพิมรูปแบบสิริมงคลหรือสไตล์ความปลอดภัยแอนิมอล เช่น ข้อกำหนด วุฒิที่ต้องการ รายการหลักสูตรที่ใช้สอบ ฯลฯ"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm font-sans"
                  disabled={submitting}
                ></textarea>
              </div>
            </div>

            {/* Error notifications feedback */}
            {errorOnSubmit && (
              <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl text-xs flex items-start gap-2.5 animate-fade-in">
                <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
                <span>{errorOnSubmit}</span>
              </div>
            )}

            {/* Success message */}
            {successMsg && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl text-xs flex items-start gap-2.5 animate-fade-in">
                <CheckCircle size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Form actions btn */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <Link
                href="/admin/dashboard"
                className="px-6 py-3 rounded-2xl hover:bg-slate-50 text-slate-500 text-sm font-semibold transition"
              >
                ยกเลิก
              </Link>

              <button
                id="btn-save-job-submit"
                type="submit"
                disabled={submitting}
                className="px-8 py-3 rounded-2xl bg-slate-900 border border-slate-900 text-sm font-semibold text-white hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-md active:scale-[0.98] disabled:opacity-75"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-emerald-400" />
                    <span>กำลังบันทึกข้อมูลเข้าระบบ...</span>
                  </>
                ) : (
                  'บันทึกประกาศงาน'
                )}
              </button>
            </div>

          </form>
        </motion.div>
      </div>
    </div>
  );
}
