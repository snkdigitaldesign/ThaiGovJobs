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
  AlertCircle,
  Image as ImageIcon,
  UploadCloud,
  Trash2,
  FileDown
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
  const [logoUrl, setLogoUrl] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [logoUploadProgress, setLogoUploadProgress] = useState(0);
  const [pdfUploadProgress, setPdfUploadProgress] = useState(0);
  const [dragActiveLogo, setDragActiveLogo] = useState(false);
  const [dragActivePdf, setDragActivePdf] = useState(false);
  
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

  // Unified File Upload with Progress simulation
  const uploadFileWithProgress = async (file: File, isPdf: boolean) => {
    // Check file size (Vercel serverless functions limit payload to 4.5MB)
    if (file.size > 4 * 1024 * 1024) {
      alert(`ขนาดไฟล์ของท่านคือ ${(file.size / (1024 * 1024)).toFixed(2)}MB ซึ่งมีขนาดใหญ่เกินกว่ากำหนด (จำกัดไม่เกิน 4.0MB)\nกรุณาลดขนาดไฟล์ลงก่อนอัปโหลด เพื่อให้เข้ากันได้กับขีดจำกัดเซิร์ฟเวอร์คลาวด์ Vercel ครับ`);
      return;
    }

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

      let data: any;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const rawText = await res.text();
        console.error('Upload failed with server response:', rawText.substring(0, 500));
        throw new Error('เซิร์ฟเวอร์ตอบกลับไม่ถูกต้องระหว่างการอัปโหลดไฟล์ กรุณาลองใหม่อีกครั้ง');
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'อัปโหลดล้มเหลว');
      }

      clearInterval(interval);
      if (isPdf) {
        setPdfUploadProgress(100);
        setPdfUrl(data.url);
        setTimeout(() => setPdfUploadProgress(0), 800);
      } else {
        setLogoUploadProgress(100);
        setLogoUrl(data.url);
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

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>, isPdf: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFileWithProgress(file, isPdf);
    }
  };

  const handleDragOver = (e: React.DragEvent, isPdf: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPdf) {
      setDragActivePdf(true);
    } else {
      setDragActiveLogo(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent, isPdf: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPdf) {
      setDragActivePdf(false);
    } else {
      setDragActiveLogo(false);
    }
  };

  const handleDrop = async (e: React.DragEvent, isPdf: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPdf) {
      setDragActivePdf(false);
    } else {
      setDragActiveLogo(false);
    }
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      await uploadFileWithProgress(file, isPdf);
    }
  };

  const handleRemoveFile = (isPdf: boolean) => {
    if (isPdf) {
      setPdfUrl('');
    } else {
      setLogoUrl('');
    }
  };

  // Handle submit and insert into Supabase jobs table
  const handleSubmitNewJob = async (e: React.FormEvent) => {
    e.preventDefault();
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
          description, // Markdown content
          logo_url: logoUrl || null,
          pdf_url: pdfUrl || null
        }),
      });

      let data: any;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const rawText = await res.text();
        console.error('Server returned non-JSON:', rawText.substring(0, 500));
        throw new Error('เซิร์ฟเวอร์ยังไม่พร้อมใช้งานหรือเกิดข้อผิดพลาดในการประมวลผล (ได้รับรูปแบบ HTML) กรุณารอสักครู่ (2-3 วินาที) แล้วกดบันทึกใหม่อีกครั้งครับ');
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'บันทึกประกาศงานไม่สำเร็จ');
      }

      const persisted = data.persistedInDb;
      if (persisted) {
        setSuccessMsg('✨ บันทึกประกาศงานราชการลงกองข้อมูล Supabase สำเร็จเรียบร้อยแล้วถาวร!');
      } else {
        const dbErrString = data.dbError ? `\n\n[ข้อผิดพลาดฐานข้อมูล]: ${data.dbError}` : '';
        setSuccessMsg(`⚠️ บันทึกสำเร็จสแตนด์อโลน (ลงหน่วยความจำชั่วคราวเท่านั้น) เนื่องจากไม่สามารถเซฟเข้าฐานข้อมูล Supabase ทันทีได้${dbErrString}\n\nกรุณาตรวจสอบว่ามีคอลัมน์ชื่อตรงตามไฟล์ supabase-schema.sql หรือตั้งค่าแวดล้อมแอดมินหรือยังครับ`);
      }
      
      // Clear form inputs
      setTitle('');
      setDepartment('');
      setSalary('');
      setOfficialUrl('');
      setDescription('');
      setLogoUrl('');
      setPdfUrl('');
      
      // Transition back after delay
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
              <PlusCircle size={18} className="text-blue-500" />
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
              ตารางระบบหลัก <code>jobs</code> ของคุณมีการขาดคอลัมน์ที่จำเป็น (เช่น <code>logo_url</code> หรือ <code>pdf_url</code>) บันทึกใดๆ ที่ป้อนเข้ามาในช่วงเวลานี้จะถูกจัดเก็บไว้ใน <strong className="text-amber-900">หน่วยความจำสำรองแทนชั่วคราวเท่านั้น</strong> 
              เราแนะนำให้ปรับปรุงโครงสร้างตาราง โดยรันสคริปต์ SQL ในหน้าควบคุมแผงผู้ดูแลระบบ
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
                className="w-full px-4 py-3 rounded-xl border border-slate-250 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-sm placeholder:text-slate-400 bg-slate-50/20"
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
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-sm placeholder:text-slate-400"
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
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-sm placeholder:text-slate-400"
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
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-sm bg-white"
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
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-sm bg-white appearance-none"
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
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-sm placeholder:text-slate-400"
                    disabled={submitting}
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <MapPin size={16} />
                  </div>
                </div>
              </div>
            </div>

            {/* File Uploads Section (ตราสัญลักษณ์หน่วยงาน & ไฟล์ PDF ประกาศ) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              
              {/* Logo Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>ตราสัญลักษณ์หน่วยงาน (Logo)</span>
                  {uploadingLogo && <span className="text-[10px] text-blue-600 font-semibold animate-pulse">กำลังส่งไฟล์เข้าคลัง Storage...</span>}
                </label>
                {logoUrl ? (
                  <div className="relative border border-slate-200 bg-white p-3 rounded-xl flex items-center gap-3 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoUrl}
                      alt="Agency Logo"
                      className="w-12 h-12 object-contain bg-slate-50 p-1 rounded-lg border border-slate-100"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                        <CheckCircle size={12} /> อัปโหลดและเชื่อมโยงเรียบร้อยแล้ว
                      </p>
                      <span className="text-[10px] text-slate-400 break-all truncate block mt-0.5">{logoUrl}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(false)}
                        className="text-[10px] text-rose-500 font-bold hover:underline flex items-center gap-1 mt-1.5"
                      >
                        <Trash2 size={10} /> ลบรูปภาพ
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onDragOver={(e) => handleDragOver(e, false)}
                    onDragLeave={(e) => handleDragLeave(e, false)}
                    onDrop={(e) => handleDrop(e, false)}
                    className={`relative border-2 border-dashed transition-all duration-200 rounded-xl p-5 text-center cursor-pointer ${
                      dragActiveLogo 
                        ? "border-blue-500 bg-blue-50/20 shadow-md animate-pulse scale-[1.01]" 
                        : "border-slate-200 hover:border-blue-400 hover:bg-blue-50/5"
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUploadFile(e, false)}
                      disabled={uploadingLogo}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="space-y-1">
                      {uploadingLogo ? (
                        <div className="flex flex-col items-center gap-1.5 py-1">
                          <Loader2 size={24} className="animate-spin text-blue-500" />
                          <span className="text-xs font-semibold text-blue-600">กำลังอัปโหลดอัตโนมัติเข้าระบบ... {logoUploadProgress}%</span>
                          <div className="w-full max-w-[150px] bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                            <div 
                              className="bg-blue-500 h-full rounded-full transition-all duration-150"
                              style={{ width: `${logoUploadProgress}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <ImageIcon size={26} className="text-slate-400 mx-auto" />
                          <p className="text-xs font-semibold text-slate-705 text-slate-700">ลากไฟล์มาวางตรงนี้ หรือคลิกเพื่อค้นหารูปภาพ/ตราตราสัญลักษณ์</p>
                          <p className="text-[10px] text-slate-400">ขนาดแนะนำ: สี่เหลี่ยมจัตุรัส png, jpg, webp หรือ svg</p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* PDF Announcement Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>ไฟล์ PDF ประกาศฉบับเต็ม</span>
                  {uploadingPdf && <span className="text-[10px] text-blue-600 font-semibold animate-pulse">กำลังอัปโหลดเอกสาร...</span>}
                </label>
                {pdfUrl ? (
                  <div className="relative border border-slate-200 bg-white p-3 rounded-xl flex items-center gap-3 shadow-sm">
                    <div className="p-2.5 rounded-lg bg-red-50 text-red-600 shrink-0">
                      <FileDown size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                        <CheckCircle size={12} /> อัปโหลดเข้าสู่คลัง PDF เรียบร้อยแล้ว
                      </p>
                      <span className="text-[10px] text-slate-400 break-all truncate block mt-0.5">{pdfUrl}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(true)}
                        className="text-[10px] text-rose-500 font-bold hover:underline flex items-center gap-1 mt-1.5"
                      >
                        <Trash2 size={10} /> ลบไฟล์ PDF
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onDragOver={(e) => handleDragOver(e, true)}
                    onDragLeave={(e) => handleDragLeave(e, true)}
                    onDrop={(e) => handleDrop(e, true)}
                    className={`relative border-2 border-dashed transition-all duration-200 rounded-xl p-5 text-center cursor-pointer ${
                      dragActivePdf 
                        ? "border-blue-500 bg-blue-50/20 shadow-md animate-pulse scale-[1.01]" 
                        : "border-slate-200 hover:border-blue-400 hover:bg-blue-50/5"
                    }`}
                  >
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => handleUploadFile(e, true)}
                      disabled={uploadingPdf}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="space-y-1">
                      {uploadingPdf ? (
                        <div className="flex flex-col items-center gap-1.5 py-1">
                          <Loader2 size={24} className="animate-spin text-blue-500" />
                          <span className="text-xs font-semibold text-blue-600">กำลังโอนถ่ายไฟล์ PDF สำเร็จ... {pdfUploadProgress}%</span>
                          <div className="w-full max-w-[150px] bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                            <div 
                              className="bg-blue-500 h-full rounded-full transition-all duration-150"
                              style={{ width: `${pdfUploadProgress}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <UploadCloud size={26} className="text-slate-400 mx-auto" />
                          <p className="text-xs font-semibold text-slate-700">ลากและวางเอกสาร PDF ตรงนี้ หรือคลิกเลือกไฟล์ประกาศ</p>
                          <p className="text-[10px] text-slate-400">รองรับระบบเอกสารประวัติจัดซื้อ/ประกาศสอบ .pdf เท่านั้น</p>
                        </>
                      )}
                    </div>
                  </div>
                )}
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
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-sm text-slate-700 bg-white"
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
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-sm text-slate-700 bg-white"
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
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-sm placeholder:text-slate-400"
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
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-sm font-sans"
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
              <div className="p-4 bg-blue-50 border border-blue-100 text-blue-800 rounded-2xl text-xs flex items-start gap-2.5 animate-fade-in">
                <CheckCircle size={18} className="text-blue-500 shrink-0 mt-0.5" />
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
                disabled={submitting || uploadingLogo || uploadingPdf}
                className="px-8 py-3 rounded-2xl bg-slate-900 border border-slate-900 text-sm font-semibold text-white hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-md active:scale-[0.98] disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-blue-400" />
                    <span>กำลังบันทึกข้อมูลเข้าระบบ...</span>
                  </>
                ) : uploadingLogo || uploadingPdf ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-blue-400" />
                    <span>กำลังอัปโหลดไฟล์...</span>
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
